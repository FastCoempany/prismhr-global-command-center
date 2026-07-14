"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { asFieldNoteKind } from "@/lib/field-notes/data";
import { asFollowUpWhen, nextCheckIn, type TouchLogEntry } from "@/lib/today/follow-ups";

function str(fd: FormData, key: string, max = 4000) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

async function requireWrite() {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

function done() {
  revalidatePath("/today");
  redirect("/today");
}

// Run a DB write, but never let a missing/newer table 500 the page. If the
// relevant table from docs/dashboard-tables.sql hasn't been created yet, the
// action degrades to a no-op (the change just doesn't persist) instead of
// crashing the Server Component render. `redirect()` throws a NEXT_REDIRECT
// control-flow signal, so `done()` stays OUTSIDE the try/catch.
async function safeWrite(work: () => Promise<void>) {
  try {
    await work();
  } catch {
    // Table not migrated yet — swallow so the page reloads cleanly.
  }
}

export async function addFieldNote(formData: FormData) {
  const body = str(formData, "body", 2000);
  if (!(await requireWrite()) || !body) done();
  await safeWrite(async () => {
    await getPrisma().fieldNote.create({
      data: { kind: asFieldNoteKind(str(formData, "kind", 12)), body },
    });
  });
  done();
}

// Resolve = clear it off the running list (it's been carried to Aleks / closed).
export async function resolveFieldNote(formData: FormData) {
  const id = str(formData, "id", 40);
  if (!(await requireWrite()) || !id) done();
  await safeWrite(async () => {
    await getPrisma().fieldNote.update({ where: { id }, data: { resolved: true } });
  });
  done();
}

// Park a signal ("Not now, here's why"). Optional days → auto-resurfaces then;
// no days → parked until manually un-parked. It never vanishes — it moves to the
// Parked list on Today.
export async function snoozeSignal(formData: FormData) {
  const accountId = str(formData, "accountId", 40);
  const reason = str(formData, "reason", 300) || "Parked";
  const days = parseInt(str(formData, "days", 4), 10);
  if (!(await requireWrite()) || !accountId) done();
  const snoozedUntil =
    Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 86_400_000) : null;
  await safeWrite(async () => {
    await getPrisma().signalSnooze.upsert({
      where: { accountId },
      create: { accountId, reason, snoozedUntil },
      update: { reason, snoozedUntil },
    });
  });
  done();
}

export async function unsnoozeSignal(formData: FormData) {
  const accountId = str(formData, "accountId", 40);
  if (!(await requireWrite()) || !accountId) done();
  await safeWrite(async () => {
    await getPrisma().signalSnooze.deleteMany({ where: { accountId } });
  });
  done();
}

// Toggle a task's done-mark. The key already encodes the period (day/week), so
// presence = done for that period; toggling flips it.
export async function toggleTaskDone(formData: FormData) {
  const key = str(formData, "key", 160);
  if (!(await requireWrite()) || !key) done();
  await safeWrite(async () => {
    const prisma = getPrisma();
    const existing = await prisma.taskDone.findUnique({ where: { key } });
    if (existing) await prisma.taskDone.delete({ where: { key } });
    else await prisma.taskDone.create({ data: { key } });
  });
  done();
}

// --- Contacts + follow-up cadence -------------------------------------------
// Log a contact ("touch") and arm the next check-in — later today or tomorrow,
// never on a weekend. Re-logging the same subjectKey starts a fresh outreach but
// keeps the thread's history: the previous contact is archived into the touch's
// log, so the by-partner timeline (Partner Room) never loses an outreach.

function clipForLog(s: string, max = 240): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function touchLog(v: unknown): TouchLogEntry[] {
  return Array.isArray(v) ? (v as TouchLogEntry[]) : [];
}

export async function logTouch(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  const label = str(formData, "label", 160);
  if (!(await requireWrite()) || !subjectKey || !label) done();
  const kind = str(formData, "kind", 12) === "account" ? "account" : "partner";
  const detail = str(formData, "detail", 200);
  const message = str(formData, "message", 4000);
  const when = asFollowUpWhen(str(formData, "when", 12));
  await safeWrite(async () => {
    const prisma = getPrisma();
    const now = Date.now();
    const followUpAt = nextCheckIn(now, when);
    const prev = await prisma.touch.findUnique({ where: { subjectKey } });
    // Archive the outgoing contact into the thread history before overwriting.
    const log = prev
      ? [
          ...touchLog(prev.log),
          {
            at: prev.contactedAt.toISOString(),
            body: `Outreach sent${prev.message ? ` — “${clipForLog(prev.message)}”` : ""}${
              prev.status === "replied" ? " · replied" : ""
            }`,
          },
        ]
      : [];
    await prisma.touch.upsert({
      where: { subjectKey },
      create: {
        subjectKey,
        kind,
        label,
        detail: detail || null,
        message: message || null,
        contactedAt: new Date(now),
        followUpAt,
        intervalDays: when === "today" ? 0 : 1,
        status: "awaiting",
        log: [],
      },
      update: {
        kind,
        label,
        detail: detail || null,
        message: message || null,
        contactedAt: new Date(now),
        followUpAt,
        intervalDays: when === "today" ? 0 : 1,
        status: "awaiting",
        log,
      },
    });
  });
  done();
}

// Undo — remove the logged contact entirely.
export async function deleteTouch(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  if (!(await requireWrite()) || !subjectKey) done();
  await safeWrite(async () => {
    await getPrisma().touch.deleteMany({ where: { subjectKey } });
  });
  done();
}

// Close the loop — they replied; stop the cadence. The reply is stamped into the
// thread history so the Partner Room timeline shows when the loop closed.
export async function markReplied(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  if (!(await requireWrite()) || !subjectKey) done();
  await safeWrite(async () => {
    const prisma = getPrisma();
    const t = await prisma.touch.findUnique({ where: { subjectKey } });
    if (!t) return;
    const log = [
      ...touchLog(t.log),
      { at: new Date().toISOString(), body: "Reply received ✓" },
    ];
    await prisma.touch.update({
      where: { subjectKey },
      data: { status: "replied", log },
    });
  });
  done();
}

// You answered their reply — ball back in their court; the check-in cadence
// re-arms for the next business day and the exchange is stamped into history.
export async function markResponded(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  if (!(await requireWrite()) || !subjectKey) done();
  await safeWrite(async () => {
    const prisma = getPrisma();
    const t = await prisma.touch.findUnique({ where: { subjectKey } });
    if (!t) return;
    const log = [
      ...touchLog(t.log),
      { at: new Date().toISOString(), body: "You replied ✓" },
    ];
    await prisma.touch.update({
      where: { subjectKey },
      data: { status: "responded", followUpAt: nextCheckIn(Date.now(), "tomorrow"), log },
    });
  });
  done();
}

// Close the thread. History stays on the row (Partner Room timeline); the
// partner card resets to a fresh roundup generated from current research.
export async function archiveThread(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  if (!(await requireWrite()) || !subjectKey) done();
  await safeWrite(async () => {
    const prisma = getPrisma();
    const t = await prisma.touch.findUnique({ where: { subjectKey } });
    if (!t) return;
    const log = [
      ...touchLog(t.log),
      {
        at: new Date().toISOString(),
        body: `Thread archived ✓${t.message ? ` — closed: “${clipForLog(t.message, 160)}”` : ""}`,
      },
    ];
    await prisma.touch.update({
      where: { subjectKey },
      data: { status: "archived", log },
    });
  });
  done();
}

// Bring a not-yet-due check-in forward to now, so it surfaces in the due list
// today (the inverse of snooze).
export async function bringFollowUpDue(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  if (!(await requireWrite()) || !subjectKey) done();
  await safeWrite(async () => {
    await getPrisma().touch.updateMany({
      where: { subjectKey },
      data: { followUpAt: new Date(), status: "awaiting" },
    });
  });
  done();
}

// Delay the check-in — later today or tomorrow (never a weekend). That's the
// whole menu; there is no multi-day snooze.
export async function delayFollowUp(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  if (!(await requireWrite()) || !subjectKey) done();
  const when = asFollowUpWhen(str(formData, "when", 12));
  await safeWrite(async () => {
    await getPrisma().touch.updateMany({
      where: { subjectKey },
      data: { followUpAt: nextCheckIn(Date.now(), when), status: "awaiting" },
    });
  });
  done();
}

// Write in your own follow-up (not tied to a logged contact). Surfaces in the
// same due/upcoming buckets; kind "custom" so the card shows your words instead
// of a partner nudge.
export async function addFollowUp(formData: FormData) {
  const label = str(formData, "label", 200);
  if (!(await requireWrite()) || !label) done();
  const when = asFollowUpWhen(str(formData, "when", 12));
  await safeWrite(async () => {
    const now = Date.now();
    await getPrisma().touch.create({
      data: {
        subjectKey: `manual:${randomUUID()}`,
        kind: "custom",
        label,
        detail: str(formData, "detail", 400) || null,
        message: null,
        contactedAt: new Date(now),
        followUpAt: nextCheckIn(now, when),
        intervalDays: when === "today" ? 0 : 1,
        status: "awaiting",
        log: [],
      },
    });
  });
  done();
}

// --- Account notes (from the partner-outreach chips) -------------------------
// A dated, time-stamped note pinned to a book account: your own words ("mine")
// or what the partner told you ("partner"). Lands on the Account Room's detail
// panel — deliberately NOT the Notes/Follow-ups tabs — and refreshes the chip's
// green/yellow/red freshness clock.
export async function addAccountNote(formData: FormData) {
  const accountId = str(formData, "accountId", 40);
  const body = str(formData, "body", 2000);
  if (!(await requireWrite()) || !accountId || !body) done();
  const raw = str(formData, "kind", 12);
  // "mine" = your words, "partner" = what the partner said, "account" = a plain
  // unattributed note on the account itself. All three refresh the chip clock.
  const kind = raw === "partner" ? "partner" : raw === "account" ? "account" : "mine";
  await safeWrite(async () => {
    await getPrisma().accountNote.create({
      data: { accountId, partner: str(formData, "partner", 120), kind, body },
    });
  });
  revalidatePath("/accounts");
  done();
}

// --- Off-structure dispositions ----------------------------------------------
// Real life moves accounts off the structured path: a thread is already live
// before the roundup went out ("motion"), an account turns out to belong to
// another rep ("not-mine"), or you shelve one on purpose ("parked"). Each change
// also drops a dated account note so the account's own history says what
// happened and why — the disposition is state, the note is the record.

function asDisposition(v: string): "motion" | "not-mine" | "parked" | null {
  return v === "motion" || v === "not-mine" || v === "parked" ? v : null;
}

const DISPOSITION_LABEL = {
  motion: "⚡ Marked in motion",
  "not-mine": "🚫 Marked not mine — excluded from my book",
  parked: "⏸ Parked",
} as const;

function doneTo(fd: FormData) {
  const target = str(fd, "returnTo", 200) || "/today";
  revalidatePath("/today");
  revalidatePath("/accounts");
  redirect(target);
}

export async function setDisposition(formData: FormData) {
  const accountId = str(formData, "accountId", 40);
  const status = asDisposition(str(formData, "status", 12));
  if (!(await requireWrite()) || !accountId || !status) doneTo(formData);
  const reason = str(formData, "reason", 400);
  await safeWrite(async () => {
    const prisma = getPrisma();
    await prisma.accountDisposition.upsert({
      where: { accountId },
      create: { accountId, status: status!, reason },
      update: { status: status!, reason },
    });
    await prisma.accountNote.create({
      data: {
        accountId,
        partner: str(formData, "partner", 120),
        kind: "account",
        body: `${DISPOSITION_LABEL[status!]}${reason ? ` — ${reason}` : ""}`,
      },
    });
  });
  doneTo(formData);
}

export async function clearDisposition(formData: FormData) {
  const accountId = str(formData, "accountId", 40);
  if (!(await requireWrite()) || !accountId) doneTo(formData);
  await safeWrite(async () => {
    const prisma = getPrisma();
    await prisma.accountDisposition.deleteMany({ where: { accountId } });
    await prisma.accountNote.create({
      data: { accountId, partner: "", kind: "account", body: "↩ Returned to active" },
    });
  });
  doneTo(formData);
}

// The curveball logger — "something happened" in one capture: what happened is
// stamped as a dated account note, and the optional consequence flips the
// disposition in the same write, so every surface reconciles from one entry.
export async function logHappening(formData: FormData) {
  const accountId = str(formData, "accountId", 40);
  const body = str(formData, "body", 2000);
  if (!(await requireWrite()) || !accountId || !body) done();
  const consequence = asDisposition(str(formData, "consequence", 12));
  await safeWrite(async () => {
    const prisma = getPrisma();
    await prisma.accountNote.create({
      data: { accountId, partner: "", kind: "account", body: `⚡ ${body}` },
    });
    if (consequence) {
      await prisma.accountDisposition.upsert({
        where: { accountId },
        create: { accountId, status: consequence, reason: body.slice(0, 400) },
        update: { status: consequence, reason: body.slice(0, 400) },
      });
    }
  });
  revalidatePath("/accounts");
  done();
}

// Manual thread-state override — for when reality skipped steps. Sets the
// lifecycle state directly and stamps the override into the thread history;
// awaiting/responded re-arm the next business-day check-in.
export async function setThreadStatus(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  const status = str(formData, "status", 12);
  const ok = ["awaiting", "replied", "responded", "archived", "open"].includes(status);
  if (!(await requireWrite()) || !subjectKey || !ok) done();
  await safeWrite(async () => {
    const prisma = getPrisma();
    const t = await prisma.touch.findUnique({ where: { subjectKey } });
    if (!t || t.status === status) return;
    const log = [
      ...touchLog(t.log),
      {
        at: new Date().toISOString(),
        body:
          status === "open"
            ? "Marked open-ended — not waiting on a reply; cadence off"
            : `State set manually → ${status}`,
      },
    ];
    await prisma.touch.update({
      where: { subjectKey },
      data: {
        status,
        log,
        ...(status === "awaiting" || status === "responded"
          ? { followUpAt: nextCheckIn(Date.now(), "tomorrow") }
          : {}),
      },
    });
  });
  done();
}

// --- Notes / to-dos (the notetaker, right column) ---------------------------
// Called programmatically from the client (autosave), so they RETURN a value
// instead of redirecting — live typing never triggers a page reload. Each write
// is column-safe so a note's body always persists even before the notetaker
// columns are migrated.

export async function createTodoNote(): Promise<{ id: string } | null> {
  if (!(await requireWrite())) return null;
  try {
    const prisma = getPrisma();
    const top = await prisma.todo.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const position = (top?.position ?? -1) + 1;
    // Notes are auto-dated to today — 99% are about the day they're written.
    // Column-safe: if remindAt isn't migrated yet, fall back to a bare create.
    const t = await prisma.todo
      .create({ data: { body: "", position, remindAt: new Date() } })
      .catch(() => prisma.todo.create({ data: { body: "", position } }));
    return { id: t.id };
  } catch {
    return null;
  }
}

export async function saveTodoNote(
  id: string,
  body: string,
  accountId: string,
  remindAt: string,
): Promise<{ ok: boolean }> {
  if (!(await requireWrite()) || !id) return { ok: false };
  const b = typeof body === "string" ? body.slice(0, 20000) : "";
  const acct = accountId ? accountId.slice(0, 40) : null;
  const when =
    remindAt && !Number.isNaN(Date.parse(remindAt)) ? new Date(remindAt) : null;
  const prisma = getPrisma();
  try {
    await prisma.todo.update({
      where: { id },
      data: { body: b, accountId: acct, remindAt: when },
    });
    return { ok: true };
  } catch {
    // Notetaker columns not migrated yet — still persist the body so the note is
    // never lost; the account link + date save once the ALTER runs.
    try {
      await prisma.todo.update({ where: { id }, data: { body: b } });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }
}

export async function setTodoDone(id: string, done: boolean): Promise<{ ok: boolean }> {
  if (!(await requireWrite()) || !id) return { ok: false };
  try {
    await getPrisma().todo.update({ where: { id }, data: { done: !!done } });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function deleteTodoNote(id: string): Promise<{ ok: boolean }> {
  if (!(await requireWrite()) || !id) return { ok: false };
  try {
    await getPrisma().todo.deleteMany({ where: { id } });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// Log what happened on a touch (append to its timeline) and re-arm the next
// check-in from now, so the cadence keeps going until a reply is marked.
export async function addTouchNote(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  const body = str(formData, "body", 2000);
  if (!(await requireWrite()) || !subjectKey || !body) done();
  await safeWrite(async () => {
    const prisma = getPrisma();
    const t = await prisma.touch.findUnique({ where: { subjectKey } });
    if (!t) return;
    const log = [...touchLog(t.log), { at: new Date().toISOString(), body }];
    await prisma.touch.update({
      where: { subjectKey },
      data: { log, followUpAt: nextCheckIn(Date.now(), "tomorrow"), status: "awaiting" },
    });
  });
  done();
}
