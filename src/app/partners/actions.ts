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

// Where to land after a write. Notes are added from the Partner Room and from
// Today's partner cards, so both revalidate.
function done(target = "/partners") {
  revalidatePath("/partners");
  revalidatePath("/today");
  redirect(target);
}

// Never let a missing PartnerNote table 500 the page (same contract as Today's
// actions — the write degrades to a no-op until the SQL runs).
async function safeWrite(work: () => Promise<void>) {
  try {
    await work();
  } catch {
    // Table not migrated yet.
  }
}

export async function addPartnerNote(formData: FormData) {
  const partner = str(formData, "partner", 120);
  const body = str(formData, "body", 4000);
  const target = str(formData, "returnTo", 200) || "/partners";
  if (!(await requireWrite()) || !partner || !body) done(target);
  await safeWrite(async () => {
    await getPrisma().partnerNote.create({
      data: { partner, body, source: str(formData, "source", 40) || "partner-room" },
    });
  });
  done(target);
}

export async function deletePartnerNote(formData: FormData) {
  const id = str(formData, "id", 40);
  const target = str(formData, "returnTo", 200) || "/partners";
  if (!(await requireWrite()) || !id) done(target);
  await safeWrite(async () => {
    await getPrisma().partnerNote.deleteMany({ where: { id } });
  });
  done(target);
}
