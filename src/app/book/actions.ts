"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PeoApproach, PeoIntent, PeoStage } from "@/generated/prisma/client";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

const stageValues = new Set<string>(Object.values(PeoStage));
const approachValues = new Set<string>(Object.values(PeoApproach));
const intentValues = new Set<string>(Object.values(PeoIntent));

function str(fd: FormData, key: string, max = 4000) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function backTo(fd: FormData, peoId: string, extra?: Record<string, string>) {
  const raw = str(fd, "returnTo", 200);
  const base = raw.startsWith("/") && !raw.startsWith("//") ? raw.split("?")[0] : "/book";
  const params = new URLSearchParams();
  if (peoId) params.set("peo", peoId);
  for (const [k, v] of Object.entries(extra ?? {})) params.set(k, v);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

async function requireWrite() {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function savePeo(formData: FormData) {
  const peoId = str(formData, "peoId", 40);
  if (!(await requireWrite()) || !peoId) {
    redirect(backTo(formData, peoId, { error: "1" }));
  }

  const stageRaw = str(formData, "stage", 40);
  const stage = stageValues.has(stageRaw) ? (stageRaw as PeoStage) : PeoStage.NOT_TOUCHED;
  const approachRaw = str(formData, "approach", 40);
  const approach = approachValues.has(approachRaw)
    ? (approachRaw as PeoApproach)
    : PeoApproach.NEEDS_CSM;
  const intentRaw = str(formData, "intent", 40);
  const intent = intentValues.has(intentRaw) ? (intentRaw as PeoIntent) : PeoIntent.UNKNOWN;
  const nextAction = str(formData, "nextAction", 400) || null;
  const nextActionDate = parseDate(str(formData, "nextActionDate", 10));
  const notes = str(formData, "notes", 8000) || null;
  const activity = str(formData, "activity", 1000);

  const prisma = getPrisma();
  const data = { stage, approach, intent, nextAction, nextActionDate, notes };
  await prisma.peoState.upsert({
    where: { peoId },
    create: { peoId, ...data },
    update: data,
  });
  if (activity) {
    await prisma.peoActivity.create({ data: { peoId, body: activity } });
  }

  revalidatePath("/");
  revalidatePath("/book");
  revalidatePath("/pipeline");
  redirect(backTo(formData, peoId, { saved: "1" }));
}
