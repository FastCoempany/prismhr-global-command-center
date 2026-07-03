"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { asFieldNoteKind } from "@/lib/field-notes/data";

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

export async function addFieldNote(formData: FormData) {
  const body = str(formData, "body", 2000);
  if (!(await requireWrite()) || !body) done();
  await getPrisma().fieldNote.create({
    data: { kind: asFieldNoteKind(str(formData, "kind", 12)), body },
  });
  done();
}

// Resolve = clear it off the running list (it's been carried to Aleks / closed).
export async function resolveFieldNote(formData: FormData) {
  const id = str(formData, "id", 40);
  if (!(await requireWrite()) || !id) done();
  await getPrisma().fieldNote.update({ where: { id }, data: { resolved: true } });
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
  await getPrisma().signalSnooze.upsert({
    where: { accountId },
    create: { accountId, reason, snoozedUntil },
    update: { reason, snoozedUntil },
  });
  done();
}

export async function unsnoozeSignal(formData: FormData) {
  const accountId = str(formData, "accountId", 40);
  if (!(await requireWrite()) || !accountId) done();
  await getPrisma().signalSnooze.deleteMany({ where: { accountId } });
  done();
}
