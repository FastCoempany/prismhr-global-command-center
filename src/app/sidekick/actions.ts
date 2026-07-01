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

function lines(formData: FormData, key: string): string[] {
  const v = formData.get(key);
  if (typeof v !== "string") return [];
  return v
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);
}

// --- Playbooks ---------------------------------------------------------------

export async function createPlaybook(formData: FormData) {
  const accountId = str(formData, "accountId", 200);
  const screenId = str(formData, "screenId", 40);
  const name = str(formData, "name", 120);
  if (!(await requireWrite()) || !accountId || !name) {
    redirect(target(accountId, screenId, { error: "playbook" }));
  }
  const pb = await getPrisma().demoPlaybook.create({
    data: { accountId, name },
    select: { id: true },
  });
  revalidatePath("/sidekick");
  redirect(target(accountId, screenId, { pb: pb.id }));
}

export async function deletePlaybook(formData: FormData) {
  const playbookId = str(formData, "playbookId", 200);
  const accountId = str(formData, "accountId", 200);
  const screenId = str(formData, "screenId", 40);
  if (await requireWrite()) {
    await getPrisma()
      .demoPlaybook.delete({ where: { id: playbookId } })
      .catch(() => undefined);
  }
  revalidatePath("/sidekick");
  redirect(target(accountId, screenId));
}

export async function addToPlaybook(formData: FormData) {
  const playbookId = str(formData, "playbookId", 200);
  const screenId = str(formData, "screenId", 40);
  const accountId = str(formData, "accountId", 200);
  if ((await requireWrite()) && playbookId && screenId) {
    const prisma = getPrisma();
    const exists = await prisma.demoPlaybookItem.findFirst({
      where: { playbookId, screenId },
      select: { id: true },
    });
    if (!exists) {
      const count = await prisma.demoPlaybookItem.count({ where: { playbookId } });
      await prisma.demoPlaybookItem.create({
        data: { playbookId, screenId, position: count },
      });
    }
  }
  revalidatePath("/sidekick");
  redirect(target(accountId, screenId, { pb: playbookId }));
}

export async function removePlaybookItem(formData: FormData) {
  const itemId = str(formData, "itemId", 200);
  const playbookId = str(formData, "playbookId", 200);
  const accountId = str(formData, "accountId", 200);
  const screenId = str(formData, "screenId", 40);
  if (await requireWrite()) {
    await getPrisma()
      .demoPlaybookItem.delete({ where: { id: itemId } })
      .catch(() => undefined);
  }
  revalidatePath("/sidekick");
  redirect(target(accountId, screenId, { pb: playbookId }));
}

export async function movePlaybookItem(formData: FormData) {
  const itemId = str(formData, "itemId", 200);
  const direction = str(formData, "direction", 4);
  const playbookId = str(formData, "playbookId", 200);
  const accountId = str(formData, "accountId", 200);
  const screenId = str(formData, "screenId", 40);
  if ((await requireWrite()) && itemId && playbookId) {
    const prisma = getPrisma();
    const items = await prisma.demoPlaybookItem.findMany({
      where: { playbookId },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    });
    const idx = items.findIndex((i) => i.id === itemId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx >= 0 && swapIdx >= 0 && swapIdx < items.length) {
      const a = items[idx];
      const b = items[swapIdx];
      await prisma.$transaction([
        prisma.demoPlaybookItem.update({ where: { id: a.id }, data: { position: b.position } }),
        prisma.demoPlaybookItem.update({ where: { id: b.id }, data: { position: a.position } }),
      ]);
    }
  }
  revalidatePath("/sidekick");
  redirect(target(accountId, screenId, { pb: playbookId }));
}

// --- Editable scripts (global overrides) -------------------------------------

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
  revalidatePath("/sidekick");
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
  revalidatePath("/sidekick");
  redirect(target(accountId, screenId, { reset: "1" }));
}
