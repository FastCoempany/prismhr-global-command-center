"use server";

// The scenario is a per-account fact, so it persists like every other one: a
// namespaced disposition row whose reason carries the scenario id. Status must
// be "parked" — the loader drops any row with a status it doesn't recognize.

import { revalidatePath } from "next/cache";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import { SCENARIOS } from "@/lib/intel/scenarios";

export async function setScenario(
  accountId: string,
  scenarioId: string,
): Promise<{ ok: boolean }> {
  if (!hasDatabaseEnv()) return { ok: false };
  const access = await getAppAccess();
  if (access.status !== "active" || !access.canWrite) return { ok: false };
  const bound = peos.find((p) => p.id === accountId);
  if (!bound) return { ok: false };
  const id = SCENARIOS.some((s) => s.id === scenarioId) ? scenarioId : "";
  const key = `scenario:${bound.id}`.slice(0, 191);
  try {
    const prisma = getPrisma();
    if (!id) await prisma.accountDisposition.deleteMany({ where: { accountId: key } });
    else
      await prisma.accountDisposition.upsert({
        where: { accountId: key },
        create: { accountId: key, status: "parked", reason: id },
        update: { status: "parked", reason: id },
      });
    revalidatePath("/playbook");
    revalidatePath("/room");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ── The second record's draft queue (5.5, shipped 2026-08-20) ───────────────
// Support themes crossing the threshold become DRAFT market facts in a review
// queue. Nothing auto-publishes: approve files through the playbook's own
// write path; ✕ parks the draft's key so it never re-proposes.

export async function approveSecondDraft(formData: FormData): Promise<void> {
  const access = await getAppAccess();
  if (access.status !== "active" || !access.canWrite || !hasDatabaseEnv()) return;
  const text = String(formData.get("text") ?? "").slice(0, 400);
  const accountId = String(formData.get("accountId") ?? "");
  const accountName = String(formData.get("accountName") ?? "").slice(0, 80);
  if (text.trim().length < 12) return;
  const { filePlaybook, knowledgeKey, readPlaybook } =
    await import("@/lib/playbook/store");
  const { loadAccountNotes } = await import("@/lib/today/overlay");
  const notes = await loadAccountNotes();
  const known = new Set(readPlaybook(notes).market.map((m) => knowledgeKey(m.text)));
  await filePlaybook({
    kind: "market",
    items: [{ text }],
    accountId,
    accountName,
    known,
  });
  revalidatePath("/playbook");
}

export async function dismissSecondDraft(formData: FormData): Promise<void> {
  const access = await getAppAccess();
  if (access.status !== "active" || !access.canWrite || !hasDatabaseEnv()) return;
  const key = String(formData.get("key") ?? "").slice(0, 80);
  if (!key) return;
  try {
    const prisma = getPrisma();
    await prisma.accountDisposition.upsert({
      where: { accountId: `srdraft:${key}`.slice(0, 191) },
      create: {
        accountId: `srdraft:${key}`.slice(0, 191),
        status: "parked",
        reason: "second-record draft dismissed",
      },
      update: { status: "parked", reason: "second-record draft dismissed" },
    });
  } catch {
    // a dismiss that doesn't stick re-proposes next load — annoying, never wrong
  }
  revalidatePath("/playbook");
}
