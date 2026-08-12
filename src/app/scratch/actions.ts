"use server";

// The Scratchpaper's three verbs — list, keep, cross out. The pad is one
// namespaced note store; nothing here routes, files, opens actions, or
// revalidates another room. Literal scratchpaper.

import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { createAccountNoteRow } from "@/lib/notes/write";
import { redactMoney } from "@/lib/intel/lexicon";
import { SCRATCH_NS } from "@/lib/scratch";

export type ScratchLine = { id: string; body: string; at: string };

async function padAccess(): Promise<"write" | "read" | "none"> {
  if (!hasDatabaseEnv()) return "none";
  const access = await getAppAccess();
  if (access.status !== "active") return "none";
  return access.canWrite ? "write" : "read";
}

export async function scratchList(): Promise<{
  ok: boolean;
  lines: ScratchLine[];
  reason?: string;
}> {
  const access = await padAccess();
  if (access === "none")
    return { ok: false, lines: [], reason: "The pad needs a signed-in session." };
  try {
    const rows = await getPrisma().accountNote.findMany({
      where: { accountId: SCRATCH_NS },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { id: true, body: true, createdAt: true },
    });
    return {
      ok: true,
      lines: rows.map((r) => ({
        id: r.id,
        body: r.body,
        at: r.createdAt.toISOString(),
      })),
    };
  } catch {
    return { ok: false, lines: [], reason: "The pad didn't load. Try again." };
  }
}

export async function scratchAdd(
  body: string,
): Promise<{ ok: boolean; line?: ScratchLine; reason?: string }> {
  const access = await padAccess();
  if (access !== "write") return { ok: false, reason: "Read-only session." };
  const text = redactMoney((body ?? "").trim()).slice(0, 500);
  if (!text) return { ok: false, reason: "Write something first." };
  try {
    const at = new Date();
    const n = await createAccountNoteRow({
      accountId: SCRATCH_NS,
      kind: "mine",
      body: text,
      lane: "mine",
      source: "scratch",
      at,
    });
    return { ok: true, line: { id: n.id, body: text, at: at.toISOString() } };
  } catch {
    return { ok: false, reason: "The line didn't keep. Try again." };
  }
}

export async function scratchDelete(
  id: string,
): Promise<{ ok: boolean; reason?: string }> {
  const access = await padAccess();
  if (access !== "write") return { ok: false, reason: "Read-only session." };
  const clean = (id ?? "").trim().slice(0, 40);
  if (!clean) return { ok: false, reason: "Nothing to cross out." };
  try {
    await getPrisma().accountNote.deleteMany({
      where: { id: clean, accountId: SCRATCH_NS },
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "The cross-out didn't take. Try again." };
  }
}
