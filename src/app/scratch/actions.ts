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
import { SCRATCH_GONE_NS, SCRATCH_NS } from "@/lib/scratch";
import { intranetAsk } from "@/app/intranet/actions";
import { extractPending } from "@/app/intranet/runners";
import { askLinks, type AskLink } from "@/lib/ask/links";
import { liveReadFor } from "@/lib/ask/live";
import { priceDeskDisplay } from "@/lib/pricing/quote";
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
  // The paper keeps figures (founder-decreed 2026-08-21): the pad routes
  // nowhere by construction — no account view, no mirror, no brain — so the
  // money doctrine's boundary holds at the pad's edge. The ask door still
  // redacts; asks leave the paper.
  const text = (body ?? "").trim().slice(0, 500);
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
  // The honest line behind an empty answer: "read N lines, couldn't answer"
  // is not "nothing on file", and a reading backlog names itself.
  note: string;
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

async function unreadDocs(): Promise<number> {
  try {
    return await getPrisma().intranetDoc.count({
      where: { extractedAt: null, originGone: null },
    });
  } catch {
    return 0;
  }
}

// The honest empty-state line. An answer that read material and abstained is
// a different fact from a record that held nothing, and a reading backlog
// names itself instead of hiding behind either.
function emptyNote(considered: number, backlog: number): string {
  const read =
    considered > 0
      ? `Read ${considered} lines; couldn't build an answer from them.`
      : "The record held nothing on this.";
  const behind =
    backlog > 0
      ? ` The brain is ${backlog} docs behind on reading — ask again in a minute.`
      : "";
  return `${read}${behind}`;
}

// Ask the app. Self-healing first (founder-decreed 2026-08-18): an ask that
// finds an unread backlog chews a bounded bite of it before answering, so
// every ask leaves the brain smarter. Then the live read derives the named
// account's own state — the same waiting-on/next-move layer the room shows —
// and rides into synthesis beside the mirrored claims. The ledger row is
// written by the brain itself; the pad adds nothing to store.
export async function padAsk(question: string): Promise<{
  ok: boolean;
  entry?: PadAskEntry;
  reason?: string;
}> {
  const access = await padAccess();
  if (access !== "write") return { ok: false, reason: "Read-only session." };
  const q = redactMoney((question ?? "").trim()).slice(0, 300);
  if (!q) return { ok: false, reason: "Ask something first." };

  if ((await unreadDocs()) > 0)
    await extractPending(10, { deadlineMs: 30_000 }).catch(() => null);

  const live = await liveReadFor(q).catch(() => null);
  const r = await intranetAsk(q, live);
  if (!r.ok) return { ok: false, reason: r.reason ?? "The answer didn't come back." };
  const backlog = await unreadDocs();
  return {
    ok: true,
    entry: {
      id: `live-${Date.parse(new Date().toISOString())}`,
      question: r.question,
      answer: r.answer.answer,
      world: r.world,
      confidence: r.answer.confidence,
      gaps: r.answer.gaps ?? [],
      links: r.priced
        ? [
            { href: "/pricing", label: "The Pricing page →" },
            ...linksFrom(r.question, r.citations, r.accounts),
          ]
        : linksFrom(r.question, r.citations, r.accounts),
      at: new Date().toISOString(),
      note: !r.answer.answer && !r.world ? emptyNote(r.considered, backlog) : "",
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
          world: true,
          citations: true,
          candidateIds: true,
          askedAt: true,
          model: true,
        },
      }),
      prisma.taskDone.findUnique({ where: { key: ASKPAD_READ_KEY } }).catch(() => null),
    ]);
    const readAt = stamp?.doneAt ? stamp.doneAt.getTime() : 0;
    const entries = rows.map((r) => {
      const cites = Array.isArray(r.citations) ? (r.citations as StoredCite[]) : [];
      const considered = Array.isArray(r.candidateIds) ? r.candidateIds.length : 0;
      return {
        id: r.id,
        question: r.question,
        // The price desk's stored twin is redacted; the figures re-derive
        // from the Pricing page at render time, every time.
        answer:
          r.model === "price-desk" ? priceDeskDisplay(r.question, r.answer) : r.answer,
        world: r.world,
        confidence: "",
        gaps: [],
        links:
          r.model === "price-desk"
            ? [
                { href: "/pricing", label: "The Pricing page →" },
                ...linksFrom(r.question, cites, []),
              ]
            : linksFrom(r.question, cites, []),
        at: r.askedAt.toISOString(),
        note:
          !r.answer && !r.world
            ? considered > 0
              ? `Read ${considered} lines; couldn't build an answer from them.`
              : "The record held nothing when this was asked."
            : "",
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

// Edit in place (founder-decreed 2026-08-21): the visible text changes, the
// line keeps its seat and its timestamp — the same ✎ gesture the room's
// sheet lines carry. Money is redacted on the rewrite like on the write.
export async function scratchEdit(
  id: string,
  body: string,
): Promise<{ ok: boolean; body?: string; reason?: string }> {
  const access = await padAccess();
  if (access !== "write") return { ok: false, reason: "Read-only session." };
  const clean = (id ?? "").trim().slice(0, 40);
  // Figures survive here too — the paper's pact, not the record's.
  const text = (body ?? "").trim().slice(0, 500);
  if (!clean) return { ok: false, reason: "Nothing to edit." };
  if (!text) return { ok: false, reason: "Write something first. ✕ crosses out." };
  try {
    const r = await getPrisma().accountNote.updateMany({
      where: { id: clean, accountId: SCRATCH_NS },
      data: { body: text },
    });
    if (r.count === 0) return { ok: false, reason: "That line isn't on the paper." };
    return { ok: true, body: text };
  } catch {
    return { ok: false, reason: "The edit didn't keep. Try again." };
  }
}

// Cross-out archives (founder-decreed 2026-08-19): the line leaves the paper
// and lands in the struck history — nothing dies. Restore is the way back.
export async function scratchDelete(
  id: string,
): Promise<{ ok: boolean; reason?: string }> {
  const access = await padAccess();
  if (access !== "write") return { ok: false, reason: "Read-only session." };
  const clean = (id ?? "").trim().slice(0, 40);
  if (!clean) return { ok: false, reason: "Nothing to cross out." };
  try {
    await getPrisma().accountNote.updateMany({
      where: { id: clean, accountId: SCRATCH_NS },
      data: { accountId: SCRATCH_GONE_NS },
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "The cross-out didn't take. Try again." };
  }
}

export async function scratchStruckList(): Promise<{
  ok: boolean;
  lines: ScratchLine[];
  reason?: string;
}> {
  const access = await padAccess();
  if (access === "none")
    return { ok: false, lines: [], reason: "The pad needs a signed-in session." };
  try {
    const rows = await getPrisma().accountNote.findMany({
      where: { accountId: SCRATCH_GONE_NS },
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
    return { ok: false, lines: [], reason: "The history didn't load. Try again." };
  }
}

export async function scratchRestore(
  id: string,
): Promise<{ ok: boolean; reason?: string }> {
  const access = await padAccess();
  if (access !== "write") return { ok: false, reason: "Read-only session." };
  const clean = (id ?? "").trim().slice(0, 40);
  if (!clean) return { ok: false, reason: "Nothing to bring back." };
  try {
    await getPrisma().accountNote.updateMany({
      where: { id: clean, accountId: SCRATCH_GONE_NS },
      data: { accountId: SCRATCH_NS },
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "The restore didn't take. Try again." };
  }
}
