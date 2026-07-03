"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { LOOK_INTO } from "@/lib/look-into";

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
  revalidatePath("/look-into");
  redirect("/look-into");
}

export async function toggleLookInto(formData: FormData) {
  const itemId = str(formData, "itemId", 60);
  const resolved = str(formData, "resolved", 6) === "true";
  if (!(await requireWrite()) || !LOOK_INTO.some((i) => i.id === itemId)) done();
  await getPrisma().lookIntoStatus.upsert({
    where: { itemId },
    create: { itemId, resolved },
    update: { resolved },
  });
  done();
}
