"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { asFieldNoteKind } from "@/lib/field-notes/data";
import { asFollowUpWhen, nextCheckIn, type TouchLogEntry } from "@/lib/today/follow-ups";
import { accountIntel } from "@/lib/today/build";
import { hideKeyFor, withAsk, type LedgerSrc } from "@/lib/today/ledger";
import { mirrorNoteToSheet } from "@/lib/today/mirror";
import {
  NO_TAGS,
  splitMarker,
  splitTags,
  withMarker,
  withTags,
  type NoteTags,
} from "@/lib/today/route-notes";
import { routeSheetNote } from "./sheet-actions";

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

// --- Roundup list membership ---------------------------------------------
// Some partners don't need the standing roundup cadence. Muting removes the
// partner from the Roundups panel and the rail's roundup rows until restored
// from the panel's "hidden" reveal. Stored as a namespaced AccountDisposition
// row (accountId "roundup-mute:<partner>") — no new table, degrades the same.
const ROUNDUP_MUTE_PREFIX = "roundup-mute:";

export async function muteRoundupPartner(formData: FormData) {
  const partner = str(formData, "partner", 120);
  if (!(await requireWrite()) || !partner) done();
  await safeWrite(async () => {
    const accountId = `${ROUNDUP_MUTE_PREFIX}${partner}`;
    await getPrisma().accountDisposition.upsert({
      where: { accountId },
      create: { accountId, status: "parked", reason: "roundup muted" },
      update: { status: "parked", reason: "roundup muted" },
    });
  });
  done();
}

export async function unmuteRoundupPartner(formData: FormData) {
  const partner = str(formData, "partner", 120);
  if (!(await requireWrite()) || !partner) done();
  await safeWrite(async () => {
    await getPrisma().accountDisposition.deleteMany({
      where: { accountId: `${ROUNDUP_MUTE_PREFIX}${partner}` },
    });
  });
  done();
}

// --- Partner attention lights ----------------------------------------------
// The literal light switches in the Roundups gutter: flip one up and that
// partner's row glows until you flip it back — a manual "tend to something
// here" flag, orthogonal to the cadence dots. Same namespaced-disposition
// storage as the mute list (accountId "partner-light:<partner>").
const PARTNER_LIGHT_PREFIX = "partner-light:";

export async function setPartnerLight(formData: FormData) {
  const partner = str(formData, "partner", 120);
  const on = str(formData, "on", 4) === "1";
  if (!(await requireWrite()) || !partner) done();
  await safeWrite(async () => {
    const accountId = `${PARTNER_LIGHT_PREFIX}${partner}`;
    if (on) {
      await getPrisma().accountDisposition.upsert({
        where: { accountId },
        create: { accountId, status: "motion", reason: "attention light on" },
        update: { status: "motion", reason: "attention light on" },
      });
    } else {
      await getPrisma().accountDisposition.deleteMany({ where: { accountId } });
    }
  });
  done();
}

// --- Ledger row lifecycle ---------------------------------------------------
// Delay-with-a-reason works on ANY open ledger row via a namespaced
// disposition (accountId "row-delay:<rowKey>"). A delay only counts for the
// day it was set (updatedAt) — tomorrow the row is simply open again.
const ROW_DELAY_PREFIX = "row-delay:";

export async function delayLedgerRow(formData: FormData) {
  const key = str(formData, "key", 180);
  const reason = str(formData, "reason", 300) || str(formData, "quick", 300);
  if (!(await requireWrite()) || !key || !reason) done();
  await safeWrite(async () => {
    const accountId = `${ROW_DELAY_PREFIX}${key}`;
    await getPrisma().accountDisposition.upsert({
      where: { accountId },
      create: { accountId, status: "parked", reason },
      update: { status: "parked", reason },
    });
  });
  done();
}

export async function resumeLedgerRow(formData: FormData) {
  const key = str(formData, "key", 180);
  if (!(await requireWrite()) || !key) done();
  await safeWrite(async () => {
    await getPrisma().accountDisposition.deleteMany({
      where: { accountId: `${ROW_DELAY_PREFIX}${key}` },
    });
  });
  done();
}

// Rewrite a sheet-action todo's lifecycle tags in place, preserving the text,
// any routing marker, and every tag not being changed.
async function patchTodoTags(id: string, patch: Partial<NoteTags>) {
  const prisma = getPrisma();
  const t = await prisma.todo.findUnique({ where: { id } });
  if (!t) return null;
  const { text, refs, label } = splitMarker(t.body);
  const { text: plain, tags } = splitTags(text);
  const tagged = withTags(plain, { ...tags, ...patch });
  const body = refs ? withMarker(tagged, refs, label) : tagged;
  await prisma.todo.update({ where: { id }, data: { body } });
  return t;
}

// ✓ on a ledger action — done, stamped with the moment, stays above the line.
export async function doneSheetAction(formData: FormData) {
  const id = str(formData, "id", 40);
  if (!(await requireWrite()) || !id) done();
  await safeWrite(async () => {
    await patchTodoTags(id, { doneAt: String(Date.now()), delay: "" });
    await getPrisma().todo.update({ where: { id }, data: { done: true } });
    await getPrisma()
      .accountDisposition.deleteMany({
        where: { accountId: `${ROW_DELAY_PREFIX}todo:${id}` },
      })
      .catch(() => null);
  });
  done();
}

// ⇠ back to sheet — the action becomes a plain note again (undone, untagged).
export async function sheetActionBack(formData: FormData) {
  const id = str(formData, "id", 40);
  if (!(await requireWrite()) || !id) done();
  await safeWrite(async () => {
    await patchTodoTags(id, { kind: "", delay: "", doneAt: "" });
    await getPrisma().todo.update({ where: { id }, data: { done: false } });
  });
  done();
}

// Set (or clear) the country a ledger action / note is tied to.
export async function setRowCountry(formData: FormData) {
  const id = str(formData, "id", 40);
  const code = str(formData, "code", 2).toLowerCase();
  if (!(await requireWrite()) || !id) done();
  await safeWrite(async () => {
    await patchTodoTags(id, { country: /^[a-z]{2}$/.test(code) ? code : "" });
  });
  done();
}

// ✕ on a ledger action — HIDES it (form flavor of hideTodoNote): the action
// parks in the Archive's hidden bin, restorable if the click was an accident.
export async function removeSheetAction(formData: FormData) {
  const id = str(formData, "id", 40);
  if (!(await requireWrite()) || !id) done();
  await safeWrite(async () => {
    const prisma = getPrisma();
    const t = await prisma.todo.findUnique({ where: { id } });
    if (!t) return;
    const key = `hide:todo:${id}`.slice(0, 191);
    const snippet = splitTags(splitMarker(t.body).text).text.slice(0, 300);
    await prisma.accountDisposition.upsert({
      where: { accountId: key },
      create: { accountId: key, status: "parked", reason: snippet },
      update: { status: "parked", reason: snippet },
    });
  });
  revalidatePath("/archive");
  done();
}

// File a DONE ledger action to an account and/or partner — the routing tech,
// now living on the ledger and offered after the ✓.
export async function fileDoneAction(formData: FormData) {
  const id = str(formData, "id", 40);
  const accountId = str(formData, "accountId", 60);
  const partner = str(formData, "partner", 120);
  if (!(await requireWrite()) || !id || (!accountId && !partner)) done();
  await safeWrite(async () => {
    await routeSheetNote(id, { accountId, partner });
  });
  done();
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
    const n = await getPrisma().accountNote.create({
      data: { accountId, partner: str(formData, "partner", 120), kind, body },
    });
    // Every note lands on the Day Sheet too — pre-routed, undo-able.
    const name = accountIntel().find((a) => a.id === accountId)?.name ?? "account";
    await mirrorNoteToSheet(body, { accountNoteIds: [n.id], partnerNoteIds: [] }, name);
  });
  revalidatePath("/accounts");
  done();
}

// Delete one account note (from the chip popover's Notes list).
export async function deleteAccountNote(formData: FormData) {
  const id = str(formData, "id", 40);
  if (!(await requireWrite()) || !id) doneTo(formData);
  await safeWrite(async () => {
    await getPrisma().accountNote.deleteMany({ where: { id } });
  });
  revalidatePath("/accounts");
  doneTo(formData);
}

// Set (or clear) what a thread is actually waiting on — the named ask that
// makes a due check-in a CHASE. Rides inside Touch.detail as a marker.
export async function updateTouchAsk(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  const ask = str(formData, "ask", 300);
  if (!(await requireWrite()) || !subjectKey) done();
  await safeWrite(async () => {
    const prisma = getPrisma();
    const t = await prisma.touch.findUnique({ where: { subjectKey } });
    if (!t) return;
    await prisma.touch.update({
      where: { subjectKey },
      data: { detail: withAsk(t.detail ?? "", ask) },
    });
  });
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
    const n = await prisma.accountNote.create({
      data: { accountId, partner: "", kind: "account", body: `⚡ ${body}` },
    });
    const name = accountIntel().find((a) => a.id === accountId)?.name ?? "account";
    await mirrorNoteToSheet(
      `⚡ ${body}`,
      { accountNoteIds: [n.id], partnerNoteIds: [] },
      name,
    );
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
    // The ✓ lands the note on Today's ledger (its "done" event) — refresh the
    // server-rendered tab so it bops up without a manual reload.
    revalidatePath("/today");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function deleteTodoNote(id: string): Promise<{ ok: boolean }> {
  if (!(await requireWrite()) || !id) return { ok: false };
  try {
    await getPrisma().todo.deleteMany({ where: { id } });
    revalidatePath("/today");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// --- Ledger row edit/delete ---------------------------------------------
// Past ledger rows are assembled from four stores; each editable row carries a
// LedgerSrc pointing at where its words live. These two actions are called
// programmatically from the row (no reload), so they return values.

export async function saveLedgerNote(
  src: LedgerSrc,
  body: string,
): Promise<{ ok: boolean }> {
  const text = (body ?? "").trim().slice(0, 20000);
  if (!(await requireWrite()) || !src?.id || !text) return { ok: false };
  const prisma = getPrisma();
  try {
    if (src.store === "acct") {
      await prisma.accountNote.update({ where: { id: src.id }, data: { body: text } });
    } else if (src.store === "partner") {
      await prisma.partnerNote.update({ where: { id: src.id }, data: { body: text } });
    } else if (src.store === "todo") {
      // Sheet notes carry routing markers + tags in the body — preserve both.
      const t = await prisma.todo.findUnique({ where: { id: src.id } });
      if (!t) return { ok: false };
      const { text: old, refs, label } = splitMarker(t.body);
      const { tags } = splitTags(old);
      const clean = withTags(text, tags);
      await prisma.todo.update({
        where: { id: src.id },
        data: { body: refs ? withMarker(clean, refs, label) : clean },
      });
    } else {
      // touchLog: replace one entry's body inside the touch's timeline.
      const t = await prisma.touch.findUnique({ where: { subjectKey: src.id } });
      if (!t) return { ok: false };
      const log = touchLog(t.log).map((e) =>
        e.at === src.at ? { ...e, body: text } : e,
      );
      await prisma.touch.update({ where: { subjectKey: src.id }, data: { log } });
    }
    revalidatePath("/today");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function deleteLedgerNote(src: LedgerSrc): Promise<{ ok: boolean }> {
  if (!(await requireWrite()) || !src?.id) return { ok: false };
  const prisma = getPrisma();
  try {
    if (src.store === "acct") {
      await prisma.accountNote.deleteMany({ where: { id: src.id } });
    } else if (src.store === "partner") {
      await prisma.partnerNote.deleteMany({ where: { id: src.id } });
    } else if (src.store === "todo") {
      await prisma.todo.deleteMany({ where: { id: src.id } });
    } else {
      const t = await prisma.touch.findUnique({ where: { subjectKey: src.id } });
      if (!t) return { ok: false };
      const log = touchLog(t.log).filter((e) => e.at !== src.at);
      await prisma.touch.update({ where: { subjectKey: src.id }, data: { log } });
    }
    revalidatePath("/today");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// --- The hidden bin ---------------------------------------------------------
// ✕ anywhere is HIDE, not delete — a namespaced disposition parks the item in
// the Archive's hidden bin, restorable any time. The reason field carries a
// text snippet so the archive can show what's in the bin without joins.
const HIDE_PREFIX = "hide:";

// ("use server" files may only export async functions — the key builder lives
// in @/lib/today/ledger as hideKeyFor.)

export async function hideLedgerNote(src: LedgerSrc): Promise<{ ok: boolean }> {
  if (!(await requireWrite()) || !src?.id) return { ok: false };
  try {
    const key = hideKeyFor(src).slice(0, 191);
    await getPrisma().accountDisposition.upsert({
      where: { accountId: key },
      create: {
        accountId: key,
        status: "parked",
        reason: (src.body ?? "").slice(0, 300),
      },
      update: { status: "parked", reason: (src.body ?? "").slice(0, 300) },
    });
    revalidatePath("/today");
    revalidatePath("/archive");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// Sheet flavor — hides a todo note by id (fetches its text for the snippet).
export async function hideTodoNote(id: string): Promise<{ ok: boolean }> {
  if (!(await requireWrite()) || !id) return { ok: false };
  try {
    const prisma = getPrisma();
    const t = await prisma.todo.findUnique({ where: { id } });
    if (!t) return { ok: false };
    const key = `${HIDE_PREFIX}todo:${id}`.slice(0, 191);
    const snippet = splitTags(splitMarker(t.body).text).text.slice(0, 300);
    await prisma.accountDisposition.upsert({
      where: { accountId: key },
      create: { accountId: key, status: "parked", reason: snippet },
      update: { status: "parked", reason: snippet },
    });
    revalidatePath("/today");
    revalidatePath("/archive");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ↩ on a done ledger row (todo-sourced) — undo the ✓; the note reopens on the
// Day Sheet exactly as it was.
export async function reopenLedgerNote(src: LedgerSrc): Promise<{ ok: boolean }> {
  if (!(await requireWrite()) || !src?.id || src.store !== "todo") return { ok: false };
  try {
    await patchTodoTags(src.id, { doneAt: "" });
    await getPrisma().todo.update({ where: { id: src.id }, data: { done: false } });
    revalidatePath("/today");
    revalidatePath("/archive");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ✕ on a src-less ledger row (checked moves, sent stamps) — hide by raw key
// into the Archive's bin, restorable like everything else.
export async function hideLedgerKey(
  key: string,
  snippet: string,
): Promise<{ ok: boolean }> {
  const k = (key ?? "").slice(0, 191);
  if (!(await requireWrite()) || !k.startsWith(HIDE_PREFIX)) return { ok: false };
  try {
    const reason = (snippet ?? "").slice(0, 300);
    await getPrisma().accountDisposition.upsert({
      where: { accountId: k },
      create: { accountId: k, status: "parked", reason },
      update: { status: "parked", reason },
    });
    revalidatePath("/today");
    revalidatePath("/archive");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ↩ on a checked-move ledger row — un-check it; the move drops back below the
// now-line as open work. (Presence of the TaskDone key = done, so delete it.)
export async function undoTaskDone(key: string): Promise<{ ok: boolean }> {
  const k = (key ?? "").slice(0, 160);
  if (!(await requireWrite()) || !k) return { ok: false };
  try {
    await getPrisma().taskDone.deleteMany({ where: { key: k } });
    revalidatePath("/today");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// Miscapture escape hatch — turn any ledger NOTE into an open ACTION. A
// todo-sourced row simply retags in place (keeps its identity and undoes an
// accidental ✓); notes living in other stores become a fresh action todo and
// the original entry is removed, so nothing double-reports.
export async function makeLedgerAction(src: LedgerSrc): Promise<{ ok: boolean }> {
  if (!(await requireWrite()) || !src?.id) return { ok: false };
  const prisma = getPrisma();
  try {
    if (src.store === "todo") {
      const t = await prisma.todo.findUnique({ where: { id: src.id } });
      if (!t) return { ok: false };
      const { text, refs, label } = splitMarker(t.body);
      const { text: plain, tags } = splitTags(text);
      const tagged = withTags(plain, { ...tags, kind: "action", doneAt: "", delay: "" });
      await prisma.todo.update({
        where: { id: src.id },
        data: { body: refs ? withMarker(tagged, refs, label) : tagged, done: false },
      });
    } else {
      const body = (src.body ?? "").trim().slice(0, 20000);
      if (!body) return { ok: false };
      const top = await prisma.todo.findFirst({
        orderBy: { position: "desc" },
        select: { position: true },
      });
      await prisma.todo.create({
        data: {
          body: withTags(body, { ...NO_TAGS, kind: "action" }),
          position: (top?.position ?? -1) + 1,
        },
      });
      if (src.store === "acct") {
        await prisma.accountNote.deleteMany({ where: { id: src.id } });
      } else if (src.store === "partner") {
        await prisma.partnerNote.deleteMany({ where: { id: src.id } });
      } else {
        const t = await prisma.touch.findUnique({ where: { subjectKey: src.id } });
        if (!t) return { ok: false };
        const log = touchLog(t.log).filter((e) => e.at !== src.at);
        await prisma.touch.update({ where: { subjectKey: src.id }, data: { log } });
      }
    }
    revalidatePath("/today");
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
