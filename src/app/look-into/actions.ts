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
  revalidatePath("/today");
  redirect("/today");
}

// Resolve a LIVE look-into item (synthetic li-live:* ids). The item set is
// derived at render, so validation is the id shape — the table is shared with
// the retired curated list, which never used this prefix.
export async function resolveLiveLookInto(formData: FormData) {
  const itemId = str(formData, "itemId", 120);
  if (!(await requireWrite()) || !itemId.startsWith("li-live:")) done();
  try {
    await getPrisma().lookIntoStatus.upsert({
      where: { itemId },
      create: { itemId, resolved: true },
      update: { resolved: true },
    });
  } catch {
    // table not migrated — degrade quietly
  }
  done();
}
