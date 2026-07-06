"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { asFieldNoteKind } from "@/lib/field-notes/data";
import { FOLLOWUP_DAYS } from "@/lib/today/follow-ups";

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
// Log a contact ("touch") and arm an automatic follow-up `intervalDays` out.
// Re-logging the same subjectKey resets the thread (fresh contact, fresh
// follow-up). The message is what was actually sent (captured from the box).
function followUpDate(now: number, days: number) {
  return new Date(now + days * 86_400_000);
}

export async function logTouch(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  const label = str(formData, "label", 160);
  if (!(await requireWrite()) || !subjectKey || !label) done();
  const kind = str(formData, "kind", 12) === "account" ? "account" : "partner";
  const detail = str(formData, "detail", 200);
  const message = str(formData, "message", 4000);
  await safeWrite(async () => {
    const now = Date.now();
    const followUpAt = followUpDate(now, FOLLOWUP_DAYS);
    await getPrisma().touch.upsert({
      where: { subjectKey },
      create: {
        subjectKey,
        kind,
        label,
        detail: detail || null,
        message: message || null,
        contactedAt: new Date(now),
        followUpAt,
        intervalDays: FOLLOWUP_DAYS,
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
        status: "awaiting",
        log: [],
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

// Close the loop — they replied; stop the cadence.
export async function markReplied(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  if (!(await requireWrite()) || !subjectKey) done();
  await safeWrite(async () => {
    await getPrisma().touch.updateMany({ where: { subjectKey }, data: { status: "replied" } });
  });
  done();
}

// Push the next check-in out one more interval (still no reply).
export async function snoozeFollowUp(formData: FormData) {
  const subjectKey = str(formData, "subjectKey", 200);
  if (!(await requireWrite()) || !subjectKey) done();
  await safeWrite(async () => {
    const prisma = getPrisma();
    const t = await prisma.touch.findUnique({ where: { subjectKey } });
    if (!t) return;
    await prisma.touch.update({
      where: { subjectKey },
      data: { followUpAt: followUpDate(Date.now(), t.intervalDays), status: "awaiting" },
    });
  });
  done();
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
    const log: Record<string, string>[] = Array.isArray(t.log)
      ? (t.log as Record<string, string>[])
      : [];
    log.push({ at: new Date().toISOString(), body });
    await prisma.touch.update({
      where: { subjectKey },
      data: { log, followUpAt: followUpDate(Date.now(), t.intervalDays), status: "awaiting" },
    });
  });
  done();
}
