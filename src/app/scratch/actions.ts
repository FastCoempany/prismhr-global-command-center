"use server";

// The Scratchpaper's three verbs — list, keep, cross out — plus the ask door
// (founder-decreed 2026-08-18): the pad can ask the app anything, the brain
// answers from the whole record, and the floater pulses when the answer lands.
// The asks live in the ONE ask ledger the intranet already keeps (Ted
// doctrine: one store, never a private second one); the pad's pact still
// holds for the paper itself — scratch lines route nowhere.

import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { createAccountNoteRow } from "@/lib/notes/write";
import { redactMoney } from "@/lib/intel/lexicon";
import { SCRATCH_NS } from "@/lib/scratch";
import { intranetAsk } from "@/app/intranet/actions";
import { askLinks, type AskLink } from "@/lib/ask/links";
import { getPeo } from "@/lib/book";

const ASKPAD_READ_KEY = "askpad:read";

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

// ── The ask door ────────────────────────────────────────────────────────────

export type PadAskEntry = {
  id: string;
  question: string;
  answer: string;
  world: string;
  confidence: string;
  gaps: string[];
  links: AskLink[];
  at: string;
};

type StoredCite = {
  origin?: string;
  originRef?: string;
  accountId?: string;
  docTitle?: string;
};

const nameOf = (id: string) => getPeo(id)?.name ?? "";

function linksFrom(
  question: string,
  cites: StoredCite[],
  accounts: { id: string; name: string }[],
): AskLink[] {
  return askLinks(
    {
      question,
      accounts,
      citations: cites.map((c) => ({
        origin: c?.origin ?? "",
        originRef: c?.originRef ?? "",
        accountId: c?.accountId ?? "",
        docTitle: c?.docTitle ?? "",
      })),
    },
    nameOf,
  );
}

// Ask the app. Runs the intranet's whole brain — plan, three retrieval roads,
// synthesis — and returns the answer with doors that land pre-loaded. The
// ledger row is written by the brain itself; the pad adds nothing to store.
export async function padAsk(question: string): Promise<{
  ok: boolean;
  entry?: PadAskEntry;
  reason?: string;
}> {
  const access = await padAccess();
  if (access !== "write") return { ok: false, reason: "Read-only session." };
  const q = redactMoney((question ?? "").trim()).slice(0, 300);
  if (!q) return { ok: false, reason: "Ask something first." };
  const r = await intranetAsk(q);
  if (!r.ok) return { ok: false, reason: r.reason ?? "The answer didn't come back." };
  return {
    ok: true,
    entry: {
      id: `live-${Date.parse(new Date().toISOString())}`,
      question: r.question,
      answer: r.answer.answer,
      world: r.world,
      confidence: r.answer.confidence,
      gaps: r.answer.gaps ?? [],
      links: linksFrom(r.question, r.citations, r.accounts),
      at: new Date().toISOString(),
    },
  };
}

// The pad's view of the ask ledger, newest first, plus whether anything landed
// since the register was last opened — that bit is what the floater's pulse
// reads.
export async function padAskFeed(): Promise<{
  ok: boolean;
  entries: PadAskEntry[];
  unread: boolean;
}> {
  const access = await padAccess();
  if (access === "none") return { ok: false, entries: [], unread: false };
  try {
    const prisma = getPrisma();
    const [rows, stamp] = await Promise.all([
      prisma.intranetAsk.findMany({
        orderBy: { askedAt: "desc" },
        take: 8,
        select: {
          id: true,
          question: true,
          answer: true,
          citations: true,
          askedAt: true,
        },
      }),
      prisma.taskDone.findUnique({ where: { key: ASKPAD_READ_KEY } }).catch(() => null),
    ]);
    const readAt = stamp?.doneAt ? stamp.doneAt.getTime() : 0;
    const entries = rows.map((r) => {
      const cites = Array.isArray(r.citations) ? (r.citations as StoredCite[]) : [];
      return {
        id: r.id,
        question: r.question,
        answer: r.answer,
        world: "",
        confidence: "",
        gaps: [],
        links: linksFrom(r.question, cites, []),
        at: r.askedAt.toISOString(),
      };
    });
    return {
      ok: true,
      entries,
      unread: rows.length > 0 && rows[0].askedAt.getTime() > readAt,
    };
  } catch {
    return { ok: false, entries: [], unread: false };
  }
}

// Opening the ask register stamps it read; the pulse goes out.
export async function padAskRead(): Promise<void> {
  if ((await padAccess()) === "none") return;
  try {
    await getPrisma().taskDone.upsert({
      where: { key: ASKPAD_READ_KEY },
      create: { key: ASKPAD_READ_KEY },
      update: { doneAt: new Date() },
    });
  } catch {
    // an unstamped read costs one extra pulse, never the answer
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
