"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { mirrorNoteToSheet } from "@/lib/today/mirror";

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
    const n = await getPrisma().partnerNote.create({
      data: { partner, body, source: str(formData, "source", 40) || "partner-room" },
    });
    // Every note lands on the Day Sheet too — pre-routed, undo-able.
    await mirrorNoteToSheet(
      body,
      { accountNoteIds: [], partnerNoteIds: [n.id] },
      partner.split(" ")[0] || partner,
    );
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

// --- The Claude drafting desk ------------------------------------------------
// Programmatic actions (no redirect — the desk is a live client panel).
// getFollowUpPrompt assembles everything the app knows into one prompt;
// draftFollowUp additionally sends it to the Anthropic API when a key is
// configured. With no key, the desk falls back to copy-prompt + claude.ai.

import { accountIntel, partnerKickoff, partnerOutreachKey } from "@/lib/today/build";
import { partnerRole } from "@/lib/book/partners";
import {
  loadAccountNotes,
  loadDispositions,
  loadPartnerNotes,
  loadTouches,
} from "@/lib/today/overlay";
import { buildFollowUpPrompt, type DraftRecipient } from "@/lib/claude/prompt";

export async function getFollowUpPrompt(
  partner: string,
  recipient: DraftRecipient,
  pastedContext: string,
): Promise<string> {
  const p = (partner ?? "").slice(0, 120);
  const [touches, accountNotes, partnerNotes, dispositions] = await Promise.all([
    loadTouches(),
    loadAccountNotes(),
    loadPartnerNotes(),
    loadDispositions(),
  ]);
  const kickoff = partnerKickoff(
    accountIntel().filter((a) => dispositions.get(a.id)?.status !== "not-mine"),
    new Set(),
  );
  const accounts = kickoff.find((k) => k.partner === p)?.accounts ?? [];
  const thread = touches.find((t) => t.subjectKey === partnerOutreachKey(p)) ?? null;
  return buildFollowUpPrompt({
    partner: p,
    partnerRole: partnerRole(p),
    recipient: {
      name: (recipient?.name ?? "").slice(0, 120) || p,
      role: (recipient?.role ?? "").slice(0, 200) || "partner",
    },
    thread,
    accounts,
    accountNotes,
    partnerNotes: partnerNotes.get(p) ?? [],
    pastedContext: (pastedContext ?? "").slice(0, 100_000),
  });
}

export type DraftResult =
  | { ok: true; draft: string }
  | { ok: false; reason: "no-key" | "error"; detail?: string };

export async function draftFollowUp(
  partner: string,
  recipient: DraftRecipient,
  pastedContext: string,
): Promise<DraftResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, reason: "no-key" };
  const prompt = await getFollowUpPrompt(partner, recipient, pastedContext);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return { ok: false, reason: "error", detail: `API ${res.status}` };
    const j = (await res.json()) as { content?: { type: string; text?: string }[] };
    const draft = (j.content ?? [])
      .map((c) => (c.type === "text" ? (c.text ?? "") : ""))
      .join("")
      .trim();
    if (!draft) return { ok: false, reason: "error", detail: "empty response" };
    return { ok: true, draft };
  } catch (e) {
    return {
      ok: false,
      reason: "error",
      detail: e instanceof Error ? e.message : "fetch failed",
    };
  }
}
