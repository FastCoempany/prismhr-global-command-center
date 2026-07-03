"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

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
  revalidatePath("/accounts");
  revalidatePath("/today");
  redirect("/accounts");
}

// The CSM/owner trust layer over an AI-researched score. confirmed = it stands,
// flagged = looks wrong (visibly distrusted downstream), adjusted = override the
// demand (flows into the composite). Retires the "scores aren't validated" seam.
export async function validateScore(formData: FormData) {
  const accountId = str(formData, "accountId", 40);
  const raw = str(formData, "status", 12);
  const status = raw === "flagged" || raw === "adjusted" ? raw : "confirmed";
  const note = str(formData, "note", 500) || null;
  const adj = parseInt(str(formData, "adjustedDemand", 4), 10);
  const adjustedDemand =
    status === "adjusted" && Number.isFinite(adj) ? Math.max(0, Math.min(100, adj)) : null;
  if (!(await requireWrite()) || !accountId) done();
  await getPrisma().scoreValidation.upsert({
    where: { accountId },
    create: { accountId, status, note, adjustedDemand },
    update: { status, note, adjustedDemand },
  });
  done();
}

export async function clearValidation(formData: FormData) {
  const accountId = str(formData, "accountId", 40);
  if (!(await requireWrite()) || !accountId) done();
  await getPrisma().scoreValidation.deleteMany({ where: { accountId } });
  done();
}
