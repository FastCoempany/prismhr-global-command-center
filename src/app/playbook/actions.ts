"use server";

// The binding feature is retired (founder-decreed 2026-08-22): the card is
// account-less. Old scenario:<id> rows stay readable where the room shows
// them; nothing writes new ones.

import { revalidatePath } from "next/cache";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

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
