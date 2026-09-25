"use server";

// The HomeRoom's ledger actions: the follow-up, touch, triage, roundup, snooze
// and disposition writes that used to live in Today's actions file. Today
// retired 2026-09-25 (dead-code ledger, section C); the fourteen actions the
// room imports, the one Accounts imports and the five the shared client kit
// imports moved here unchanged. Every form lands on the room.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { randomUUID } from "node:crypto";
import { asFollowUpWhen, nextCheckIn, type TouchLogEntry } from "@/lib/today/follow-ups";
import {
  isManual,
  readFollowUp,
  routedIds,
  sameOrg,
  wavedNames,
  withMarkers,
} from "@/lib/today/followup-brain";
import { csms, peos } from "@/lib/book";
import { EXTRA_PARTNERS } from "@/lib/book/partners";
import { knownPeople } from "@/lib/book/contacts";
import { roomCompose } from "./actions";
import { triageDoneKey } from "@/lib/today/build";
import { createAccountNoteRow } from "@/lib/notes/write";
import { mirrorNoteToSheet } from "@/lib/today/mirror";

function str(fd: FormData, key: string, max = 4000) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

async function requireWrite() {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

// Where a form lands after a write. returnTo once chose between Today and the
// room; Today retired 2026-09-25, so the room is the only landing left.
function done(fd?: FormData) {
  revalidatePath("/room");
  const raw = fd?.get("returnTo");
  redirect(raw === "/room" ? raw : "/room");
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
  if (!(await requireWrite()) || !partner) done(formData);
  await safeWrite(async () => {
    const accountId = `${ROUNDUP_MUTE_PREFIX}${partner}`;
    await getPrisma().accountDisposition.upsert({
      where: { accountId },
      create: { accountId, status: "parked", reason: "roundup muted" },
      update: { status: "parked", reason: "roundup muted" },
    });
  });
  done(formData);
}

export async function unmuteRoundupPartner(formData: FormData) {
  const partner = str(formData, "partner", 120);
  if (!(await requireWrite()) || !partner) done(formData);
  await safeWrite(async () => {
    await getPrisma().accountDisposition.deleteMany({
      where: { accountId: `${ROUNDUP_MUTE_PREFIX}${partner}` },
    });
  });
  done(formData);
}

// Park a signal ("Not now, here's why"). Optional days → auto-resurfaces then;
// no days → parked until manually un-parked. It never vanishes — it moves to the
// Parked list on Today.
export async function snoozeSignal(formData: FormData) {
  const accountId = str(formData, "accountId", 40);
  const reason = str(formData, "reason", 300) || "Parked";
  const days = parseInt(str(formData, "days", 4), 10);
  if (!(await requireWrite()) || !accountId) done(formData);
  const snoozedUntil =
    Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 86_400_000) : null;
  await safeWrite(async () => {
    await getPrisma().signalSnooze.upsert({
      where: { accountId },
      create: { accountId, reason, snoozedUntil },
      update: { reason, snoozedUntil },
    });
  });
  done(formData);
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
  if (!(await requireWrite()) || !subjectKey || !label) done(formData);
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
            body: `Outreach sent${prev.message ? `: “${clipForLog(prev.message)}”` : ""}${
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
    // Account outreach also files on the account's own ledger — the send is a
    // worked action, and the account tab should remember it without a trip
    // through Today's history.
    if (kind === "account" && subjectKey.startsWith("outreach:")) {
      await createAccountNoteRow({
        accountId: subjectKey.slice("outreach:".length),
        kind: "account",
        body: `✉ Outreach sent${message ? `: “${clipForLog(message)}”` : ""}`,
        lane: "mine",
        source: "touch",
      });
    }
  });
  done(formData);
}

// Undo — remove the logged contact entirely.
export async function deleteTouch(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  if (!(await requireWrite()) || !subjectKey) done(formData);
  await safeWrite(async () => {
    await getPrisma().touch.deleteMany({ where: { subjectKey } });
  });
  done(formData);
}

// Close the loop — they replied; stop the cadence. The reply is stamped into the
// thread history so the Partner Room timeline shows when the loop closed.
export async function markReplied(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  if (!(await requireWrite()) || !subjectKey) done(formData);
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
  done(formData);
}

// You answered their reply — ball back in their court; the check-in cadence
// re-arms for the next business day and the exchange is stamped into history.
export async function markResponded(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  if (!(await requireWrite()) || !subjectKey) done(formData);
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
  done(formData);
}

// Close the thread. History stays on the row (Partner Room timeline); the
// partner card resets to a fresh roundup generated from current research.
export async function archiveThread(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  if (!(await requireWrite()) || !subjectKey) done(formData);
  await safeWrite(async () => {
    const prisma = getPrisma();
    const t = await prisma.touch.findUnique({ where: { subjectKey } });
    if (!t) return;
    const log = [
      ...touchLog(t.log),
      {
        at: new Date().toISOString(),
        body: `Thread archived ✓${t.message ? `. Closed: “${clipForLog(t.message, 160)}”` : ""}`,
      },
    ];
    await prisma.touch.update({
      where: { subjectKey },
      data: { status: "archived", log },
    });
  });
  done(formData);
}

// Delay the check-in — later today or tomorrow (never a weekend). That's the
// whole menu; there is no multi-day snooze.
export async function delayFollowUp(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  if (!(await requireWrite()) || !subjectKey) done(formData);
  const when = asFollowUpWhen(str(formData, "when", 12));
  await safeWrite(async () => {
    await getPrisma().touch.updateMany({
      where: { subjectKey },
      data: { followUpAt: nextCheckIn(Date.now(), when), status: "awaiting" },
    });
  });
  done(formData);
}

// Arm a follow-up in your own words. There is no "when": a chase you write down
// is a thing to do now, so it lands due on the spot and stays in the follow-up
// list until you tick it off. It never joins the check-in cadence — those are
// threads waiting on somebody else, and these are waiting on you.
//
// The brain runs at arm time. A chase that names a book account files itself
// against that account — a note on the record and an action in its right-hand
// panel — so a name you wrote once doesn't have to be written again. A name the
// book has never heard of is NOT acted on: it becomes a question in the list,
// and only a click puts a new row on the board.
export async function addFollowUp(formData: FormData) {
  const label = str(formData, "label", 200);
  if (!(await requireWrite()) || !label) done(formData);
  const read = readFollowUp(
    label,
    peos.map((p) => ({ id: p.id, name: p.name })),
    [...csms, ...EXTRA_PARTNERS, ...knownPeople()],
  );
  await safeWrite(async () => {
    const now = Date.now();
    const routed = await fileFollowUpToAccounts(label, read.accounts);
    await getPrisma().touch.create({
      data: {
        subjectKey: `manual:${randomUUID()}`,
        kind: "custom",
        label,
        detail: withMarkers(str(formData, "detail", 400), routed, []) || null,
        message: null,
        contactedAt: new Date(now),
        // Due now — the list is the whole cadence.
        followUpAt: new Date(now),
        intervalDays: 0,
        status: "awaiting",
        log: [],
      },
    });
  });
  done(formData);
}

// File a chase against the accounts it named: one note on the record (so it
// reaches the account's history on Accounts) and one action in the right-hand
// panel (so it reaches the deal's own list of open work). Returns the ids that
// actually took, so the follow-up can remember and never double-file.
async function fileFollowUpToAccounts(
  label: string,
  hits: { id: string; name: string }[],
): Promise<string[]> {
  const filed: string[] = [];
  for (const h of hits.slice(0, 3)) {
    const r = await roomCompose(h.id, label, { kind: "action", urgency: "med" }).catch(
      () => null,
    );
    if (!r?.ok) continue;
    // The action is the work; the note is the memory. Without this line the
    // chase never reaches the account's history on Accounts.
    await createAccountNoteRow({
      accountId: h.id,
      kind: "account",
      body: `⏲ Follow-up armed: ${label}`,
      lane: "mine",
      source: "followup",
    }).catch(() => null);
    filed.push(h.id);
  }
  return filed;
}

// Tick a follow-up off. Done is done — the row leaves the list and the badge.
export async function followUpDone(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  if (!(await requireWrite()) || !subjectKey || !isManual(subjectKey)) done(formData);
  await safeWrite(async () => {
    await getPrisma().touch.updateMany({
      where: { subjectKey },
      data: { status: "archived" },
    });
  });
  done(formData);
}

// Drop a follow-up outright — armed by mistake, or overtaken by events.
export async function followUpDrop(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  if (!(await requireWrite()) || !subjectKey || !isManual(subjectKey)) done(formData);
  await safeWrite(async () => {
    await getPrisma().touch.deleteMany({ where: { subjectKey } });
  });
  done(formData);
}

// "Acme isn't on the board — add it?" — yes. The row joins the board carrying
// the chase that introduced it, and the follow-up remembers so it stops asking.
export async function followUpAddBoard(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  const name = str(formData, "name", 120);
  if (!(await requireWrite()) || !subjectKey || !name) done(formData);
  await safeWrite(async () => {
    const prisma = getPrisma();
    const t = await prisma.touch.findUnique({ where: { subjectKey } });

    // Never create a second row for a deal that already exists. The board is
    // checked first, then the book: if the account is in the book under its own
    // spelling, the card takes THAT name so every intel path binds to it —
    // notes, research, the meter. A near-miss spelling would strand the row.
    const existing = await prisma.dashCard.findMany({ select: { id: true, name: true } });
    const already = existing.find((c) => sameOrg(c.name, name));
    const inBook = peos.find((p) => sameOrg(p.name, name));
    if (!already) {
      const top = await prisma.dashCard.findFirst({
        orderBy: { position: "desc" },
        select: { position: true },
      });
      await prisma.dashCard.create({
        data: {
          name: inBook?.name ?? name,
          subtitle: null,
          position: (top?.position ?? -1) + 1,
          states: {},
          notes: t ? { discovery: `Came in on a follow-up: ${t.label}` } : {},
        },
      });
    }
    if (t) {
      await prisma.touch.update({
        where: { subjectKey },
        data: {
          detail: withMarkers(t.detail ?? "", routedIds(t.detail ?? ""), [
            ...wavedNames(t.detail ?? ""),
            name,
          ]),
        },
      });
    }
  });
  done(formData);
}

// "Acme isn't on the board — add it?" — no. The question retires for good on
// this follow-up; the name stays in the sentence, it just stops being a prompt.
export async function followUpWaveOff(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  const name = str(formData, "name", 120);
  if (!(await requireWrite()) || !subjectKey || !name) done(formData);
  await safeWrite(async () => {
    const prisma = getPrisma();
    const t = await prisma.touch.findUnique({ where: { subjectKey } });
    if (!t) return;
    await prisma.touch.update({
      where: { subjectKey },
      data: {
        detail: withMarkers(t.detail ?? "", routedIds(t.detail ?? ""), [
          ...wavedNames(t.detail ?? ""),
          name,
        ]),
      },
    });
  });
  done(formData);
}

// --- Off-structure dispositions ----------------------------------------------
// Real life moves accounts off the structured path: a thread is already live
// before the roundup went out ("motion"), an account turns out to belong to
// another rep ("not-mine"), or you shelve one on purpose ("parked"). Each change
// also drops a dated account note so the account's own history says what
// happened and why — the disposition is state, the note is the record.

// Where a disposition form lands: the page it came from, else the room (Today,
// the old default, retired 2026-09-25).
function doneTo(fd: FormData) {
  const target = str(fd, "returnTo", 200) || "/room";
  revalidatePath("/accounts");
  redirect(target);
}

export async function clearDisposition(formData: FormData) {
  const accountId = str(formData, "accountId", 40);
  if (!(await requireWrite()) || !accountId) doneTo(formData);
  await safeWrite(async () => {
    const prisma = getPrisma();
    await prisma.accountDisposition.deleteMany({ where: { accountId } });
    await createAccountNoteRow({
      accountId,
      kind: "account",
      body: "↩ Returned to active",
      lane: "mine",
      source: "disposition",
    });
  });
  doneTo(formData);
}

// --- Triage dismissal --------------------------------------------------------
// "Mark done" on a triage signal writes an undated key that permanently retires
// the signal from the morning list, and drops a ✓ note on the account, so the
// account's own ledger remembers what was decided.

export async function dismissTriage(formData: FormData) {
  const accountId = str(formData, "accountId", 40);
  const name = str(formData, "name", 160);
  if (!(await requireWrite()) || !accountId) done(formData);
  await safeWrite(async () => {
    const prisma = getPrisma();
    const key = triageDoneKey(accountId);
    const existing = await prisma.taskDone.findUnique({ where: { key } });
    if (!existing) await prisma.taskDone.create({ data: { key } });
    const body = "✓ Decided: not now. Dismissed from Today's triage.";
    const n = await createAccountNoteRow({
      accountId,
      kind: "account",
      body,
      lane: "mine",
      source: "move",
    });
    await mirrorNoteToSheet(
      body,
      { accountNoteIds: [n.id], partnerNoteIds: [] },
      name || "account",
    );
  });
  revalidatePath("/accounts");
  done(formData);
}
