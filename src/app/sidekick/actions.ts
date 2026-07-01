"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DemoAudience } from "@/generated/prisma/client";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

const audienceValues = new Set<string>(Object.values(DemoAudience));

function target(accountId?: string, screenId?: string, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  if (accountId) params.set("account", accountId);
  if (screenId) params.set("screen", screenId);
  for (const [k, v] of Object.entries(extra ?? {})) params.set(k, v);
  const qs = params.toString();
  return qs ? `/sidekick?${qs}` : "/sidekick";
}

function str(formData: FormData, key: string, max = 2000) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

async function requireWrite(): Promise<boolean> {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

export async function createDemoAccount(formData: FormData) {
  if (!(await requireWrite())) redirect(target(undefined, undefined, { error: "auth" }));

  const name = str(formData, "name", 200);
  if (!name) redirect(target(undefined, undefined, { error: "name" }));

  const audienceRaw = str(formData, "defaultAudience", 40);
  const defaultAudience = audienceValues.has(audienceRaw)
    ? (audienceRaw as DemoAudience)
    : DemoAudience.BOTH;

  const account = await getPrisma().demoAccount.create({
    data: {
      name,
      company: str(formData, "company", 200) || null,
      personaLabel: str(formData, "personaLabel", 120) || null,
      defaultAudience,
    },
    select: { id: true },
  });

  revalidatePath("/sidekick");
  redirect(target(account.id));
}

export async function saveNote(formData: FormData) {
  const accountId = str(formData, "accountId", 200);
  const screenId = str(formData, "screenId", 40);
  if (!(await requireWrite()) || !accountId || !screenId) {
    redirect(target(accountId, screenId, { error: "save" }));
  }

  const body = str(formData, "body", 8000);
  const prisma = getPrisma();

  if (body) {
    await prisma.demoNote.upsert({
      where: { accountId_screenId: { accountId, screenId } },
      create: { accountId, screenId, body },
      update: { body },
    });
  } else {
    await prisma.demoNote
      .delete({ where: { accountId_screenId: { accountId, screenId } } })
      .catch(() => undefined);
  }

  revalidatePath("/sidekick");
  redirect(target(accountId, screenId, { saved: "1" }));
}

export async function togglePin(formData: FormData) {
  const accountId = str(formData, "accountId", 200);
  const screenId = str(formData, "screenId", 40);
  if (!(await requireWrite()) || !accountId || !screenId) {
    redirect(target(accountId, screenId, { error: "pin" }));
  }

  const prisma = getPrisma();
  const existing = await prisma.demoPin.findUnique({
    where: { accountId_screenId: { accountId, screenId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.demoPin.delete({ where: { id: existing.id } });
  } else {
    const count = await prisma.demoPin.count({ where: { accountId } });
    await prisma.demoPin.create({ data: { accountId, screenId, position: count } });
  }

  revalidatePath("/sidekick");
  redirect(target(accountId, screenId));
}
