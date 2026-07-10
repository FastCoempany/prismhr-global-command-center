"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DemoAudience } from "@/generated/prisma/client";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { V3_PLAYBOOK_PREFIX, v3MasterFlow, v3ScreenIds } from "@/lib/sidekick-v3";

const audienceValues = new Set<string>(Object.values(DemoAudience));

function target(accountId?: string, screenId?: string, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  if (accountId) params.set("account", accountId);
  if (screenId) params.set("screen", screenId);
  for (const [k, v] of Object.entries(extra ?? {})) params.set(k, v);
  const qs = params.toString();
  return qs ? `/sidekick-v3?${qs}` : "/sidekick-v3";
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

// v3 mutations only ever touch v3-namespaced playbooks — a legacy /sidekick
// playbook id passed here is a no-op.
async function isV3Playbook(playbookId: string): Promise<boolean> {
  if (!playbookId) return false;
  const pb = await getPrisma().demoPlaybook.findUnique({
    where: { id: playbookId },
    select: { name: true },
  });
  return Boolean(pb?.name.startsWith(V3_PLAYBOOK_PREFIX));
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

  revalidatePath("/sidekick-v3");
  redirect(target(account.id));
}

export async function saveNote(formData: FormData) {
  const accountId = str(formData, "accountId", 200);
  const screenId = str(formData, "screenId", 80);
  if (!(await requireWrite()) || !accountId || !v3ScreenIds.has(screenId)) {
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

  revalidatePath("/sidekick-v3");
  redirect(target(accountId, screenId, { saved: "1" }));
}

// --- Playbooks (a playbook is a forked flow) ----------------------------------

// Fork the master flow into an account playbook: same screens, same order,
// ready to reorder/trim per prospect.
export async function forkMasterFlow(formData: FormData) {
  const accountId = str(formData, "accountId", 200);
  const screenId = str(formData, "screenId", 80);
  if (!(await requireWrite()) || !accountId) {
    redirect(target(accountId, screenId, { error: "playbook" }));
  }
  const prisma = getPrisma();
  const pb = await prisma.demoPlaybook.create({
    data: { accountId, name: `${V3_PLAYBOOK_PREFIX}${v3MasterFlow.title} (fork)` },
    select: { id: true },
  });
  await prisma.demoPlaybookItem.createMany({
    data: v3MasterFlow.screenIds.map((sid, i) => ({
      playbookId: pb.id,
      screenId: sid,
      position: i,
    })),
  });
  revalidatePath("/sidekick-v3");
  redirect(target(accountId, screenId, { pb: pb.id }));
}

export async function createPlaybook(formData: FormData) {
  const accountId = str(formData, "accountId", 200);
  const screenId = str(formData, "screenId", 80);
  const name = str(formData, "name", 120);
  if (!(await requireWrite()) || !accountId || !name) {
    redirect(target(accountId, screenId, { error: "playbook" }));
  }
  const pb = await getPrisma().demoPlaybook.create({
    data: { accountId, name: `${V3_PLAYBOOK_PREFIX}${name}` },
    select: { id: true },
  });
  revalidatePath("/sidekick-v3");
  redirect(target(accountId, screenId, { pb: pb.id }));
}

export async function deletePlaybook(formData: FormData) {
  const playbookId = str(formData, "playbookId", 200);
  const accountId = str(formData, "accountId", 200);
  const screenId = str(formData, "screenId", 80);
  if ((await requireWrite()) && (await isV3Playbook(playbookId))) {
    await getPrisma()
      .demoPlaybook.delete({ where: { id: playbookId } })
      .catch(() => undefined);
  }
  revalidatePath("/sidekick-v3");
  redirect(target(accountId, screenId));
}

export async function addToPlaybook(formData: FormData) {
  const playbookId = str(formData, "playbookId", 200);
  const screenId = str(formData, "screenId", 80);
  const accountId = str(formData, "accountId", 200);
  if (
    (await requireWrite()) &&
    v3ScreenIds.has(screenId) &&
    (await isV3Playbook(playbookId))
  ) {
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
  revalidatePath("/sidekick-v3");
  redirect(target(accountId, screenId, { pb: playbookId }));
}

export async function removePlaybookItem(formData: FormData) {
  const itemId = str(formData, "itemId", 200);
  const playbookId = str(formData, "playbookId", 200);
  const accountId = str(formData, "accountId", 200);
  const screenId = str(formData, "screenId", 80);
  if ((await requireWrite()) && (await isV3Playbook(playbookId))) {
    await getPrisma()
      .demoPlaybookItem.deleteMany({ where: { id: itemId, playbookId } })
      .catch(() => undefined);
  }
  revalidatePath("/sidekick-v3");
  redirect(target(accountId, screenId, { pb: playbookId }));
}

export async function movePlaybookItem(formData: FormData) {
  const itemId = str(formData, "itemId", 200);
  const direction = str(formData, "direction", 4);
  const playbookId = str(formData, "playbookId", 200);
  const accountId = str(formData, "accountId", 200);
  const screenId = str(formData, "screenId", 80);
  if ((await requireWrite()) && itemId && (await isV3Playbook(playbookId))) {
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
        prisma.demoPlaybookItem.update({
          where: { id: a.id },
          data: { position: b.position },
        }),
        prisma.demoPlaybookItem.update({
          where: { id: b.id },
          data: { position: a.position },
        }),
      ]);
    }
  }
  revalidatePath("/sidekick-v3");
  redirect(target(accountId, screenId, { pb: playbookId }));
}

// --- Editable scripts (global overrides, v3-namespaced ids) -------------------

export async function saveScreenScript(formData: FormData) {
  const screenId = str(formData, "screenId", 80);
  const accountId = str(formData, "accountId", 200);
  if (!(await requireWrite()) || !v3ScreenIds.has(screenId)) {
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
  revalidatePath("/sidekick-v3");
  redirect(target(accountId, screenId, { saved: "1" }));
}

export async function resetScreenScript(formData: FormData) {
  const screenId = str(formData, "screenId", 80);
  const accountId = str(formData, "accountId", 200);
  if (await requireWrite()) {
    await getPrisma()
      .demoScreenOverride.delete({ where: { screenId } })
      .catch(() => undefined);
  }
  revalidatePath("/sidekick-v3");
  redirect(target(accountId, screenId, { reset: "1" }));
}
