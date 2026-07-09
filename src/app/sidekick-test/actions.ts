"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DemoAudience } from "@/generated/prisma/client";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

// Actions for the new (test) Sidekick. Same Demo* tables as the original, but
// every write is keyed by a demo screen id, so it stays isolated — and every
// redirect returns here to /sidekick-test, not /sidekick.

const audienceValues = new Set<string>(Object.values(DemoAudience));

function target(accountId?: string, screenId?: string, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  if (accountId) params.set("account", accountId);
  if (screenId) params.set("screen", screenId);
  for (const [k, v] of Object.entries(extra ?? {})) params.set(k, v);
  const qs = params.toString();
  return qs ? `/sidekick-test?${qs}` : "/sidekick-test";
}

function str(formData: FormData, key: string, max = 2000) {
  const v = formData.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function lines(formData: FormData, key: string): string[] {
  const v = formData.get(key);
  if (typeof v !== "string") return [];
  return v
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);
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

  revalidatePath("/sidekick-test");
  redirect(target(account.id, str(formData, "screenId", 40) || undefined));
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
  revalidatePath("/sidekick-test");
  redirect(target(accountId, screenId, { saved: "1" }));
}

export async function saveScreenScript(formData: FormData) {
  const screenId = str(formData, "screenId", 40);
  const accountId = str(formData, "accountId", 200);
  if (!(await requireWrite()) || !screenId) {
    redirect(target(accountId, screenId, { error: "edit" }));
  }
  const say = str(formData, "say", 8000);
  const what = str(formData, "what", 4000);
  const data = {
    say: say || null,
    what: what || null,
    capabilities: lines(formData, "capabilities"),
    sp: lines(formData, "sp"),
    de: lines(formData, "de"),
    branching: lines(formData, "branching"),
  };
  await getPrisma().demoScreenOverride.upsert({
    where: { screenId },
    create: { screenId, ...data },
    update: data,
  });
  revalidatePath("/sidekick-test");
  redirect(target(accountId, screenId, { saved: "1" }));
}

export async function resetScreenScript(formData: FormData) {
  const screenId = str(formData, "screenId", 40);
  const accountId = str(formData, "accountId", 200);
  if (await requireWrite()) {
    await getPrisma()
      .demoScreenOverride.delete({ where: { screenId } })
      .catch(() => undefined);
  }
  revalidatePath("/sidekick-test");
  redirect(target(accountId, screenId, { reset: "1" }));
}
