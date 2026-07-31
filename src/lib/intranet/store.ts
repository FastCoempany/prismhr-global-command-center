// The Intranet's only door to the database. Every loader degrades to empty
// rather than throwing: the tables land via docs/intranet-tables.sql, and until
// the founder runs it the room must render as an empty brain rather than a
// stack trace.
//
// READS ONLY, plus writes into the Intranet's own tables. This module never
// touches AccountNote, Todo, Touch or DashCard except to read them for the
// mirror — the room is not an editor (I.2), and the import-graph test in
// tests/intranet.test.ts holds that boundary.

import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import type { Claim, DocRef, Topic } from "./types";
import type { ClaimKind, Confidence } from "./doctrine";
import {
  archiveRollup,
  chicagoDay,
  countryTallies,
  type ArchiveMonth,
  type CountryRow,
  type LedgerEntry,
  type StoredCitation,
} from "./ledger";

const EMPTY_TOPICS: Topic[] = [];

export function storeAvailable(): boolean {
  return hasDatabaseEnv();
}

function iso(d: Date | string | null | undefined): string {
  if (!d) return "";
  return typeof d === "string" ? d : d.toISOString();
}

// ── topics ──────────────────────────────────────────────────────────────────
export async function loadTopics(): Promise<Topic[]> {
  if (!hasDatabaseEnv()) return EMPTY_TOPICS;
  try {
    const rows = await getPrisma().intranetTopic.findMany({
      orderBy: { claimCount: "desc" },
      take: 400,
    });
    return rows.map((t) => ({
      id: t.id,
      label: t.label,
      parentId: t.parentId,
      summary: t.summary,
      status: (["pending", "live", "merged"] as const).includes(
        t.status as "pending" | "live" | "merged",
      )
        ? (t.status as Topic["status"])
        : "pending",
      mergedInto: t.mergedInto,
      docCount: t.docCount,
      claimCount: t.claimCount,
      firstSeen: iso(t.firstSeen),
      lastSeen: iso(t.lastSeen),
    }));
  } catch {
    return EMPTY_TOPICS;
  }
}

// ── claims ──────────────────────────────────────────────────────────────────
type ClaimRow = {
  id: string;
  docId: string;
  text: string;
  speaker: string;
  saidAt: Date;
  kind: string;
  confidence: string;
  entities: string[];
  topicIds: string[];
  askShape: string;
  offsetStart: number;
  offsetEnd: number;
  supersededBy: string;
  disputedWith: string[];
};

function toClaim(c: ClaimRow): Claim {
  return {
    id: c.id,
    docId: c.docId,
    text: c.text,
    speaker: c.speaker,
    saidAt: iso(c.saidAt),
    kind: c.kind as ClaimKind,
    confidence: c.confidence as Confidence,
    entities: c.entities ?? [],
    topicIds: c.topicIds ?? [],
    askShape: c.askShape ?? "",
    offsetStart: c.offsetStart ?? 0,
    offsetEnd: c.offsetEnd ?? 0,
    supersededBy: c.supersededBy ?? "",
    disputedWith: c.disputedWith ?? [],
  };
}

/** Road 1 · topic. Every claim in the planned topics and their descendants. */
export async function claimsByTopics(topicIds: string[], take = 200): Promise<Claim[]> {
  if (!hasDatabaseEnv() || topicIds.length === 0) return [];
  try {
    const rows = await getPrisma().intranetClaim.findMany({
      where: { topicIds: { hasSome: topicIds } },
      orderBy: { saidAt: "desc" },
      take,
    });
    return rows.map(toClaim);
  } catch {
    return [];
  }
}

/** Road 2 · entity. Catches material sitting in topics the planner missed. */
export async function claimsByEntities(entities: string[], take = 200): Promise<Claim[]> {
  if (!hasDatabaseEnv() || entities.length === 0) return [];
  try {
    const rows = await getPrisma().intranetClaim.findMany({
      where: { entities: { hasSome: entities } },
      orderBy: { saidAt: "desc" },
      take,
    });
    return rows.map(toClaim);
  } catch {
    return [];
  }
}

/** Road 3 · lexical. The floor that works with no model at all — which is what
 *  keeps the room useful when the API key is missing. */
export async function claimsByPhrases(
  phrases: string[],
  take = 200,
): Promise<{ claim: Claim; rank: number }[]> {
  if (!hasDatabaseEnv() || phrases.length === 0) return [];
  try {
    const rows = await getPrisma().intranetClaim.findMany({
      where: { OR: phrases.map((p) => ({ text: { contains: p, mode: "insensitive" } })) },
      orderBy: { saidAt: "desc" },
      take,
    });
    // Rank by how many of the planned phrases a claim actually carries — cheap,
    // and good enough until the corpus earns a real full-text index.
    return rows.map((r) => {
      const hay = r.text.toLowerCase();
      const hits = phrases.filter((p) => hay.includes(p.toLowerCase())).length;
      return { claim: toClaim(r), rank: hits / Math.max(1, phrases.length) };
    });
  } catch {
    return [];
  }
}

export async function claimsByIds(ids: string[]): Promise<Claim[]> {
  if (!hasDatabaseEnv() || ids.length === 0) return [];
  try {
    const rows = await getPrisma().intranetClaim.findMany({ where: { id: { in: ids } } });
    return rows.map(toClaim);
  } catch {
    return [];
  }
}

export async function claimsInTopic(topicId: string, take = 400): Promise<Claim[]> {
  if (!hasDatabaseEnv() || !topicId) return [];
  try {
    const rows = await getPrisma().intranetClaim.findMany({
      where: { topicIds: { has: topicId } },
      orderBy: { saidAt: "desc" },
      take,
    });
    return rows.map(toClaim);
  } catch {
    return [];
  }
}

// ── documents ───────────────────────────────────────────────────────────────
export async function docsByIds(ids: string[]): Promise<Map<string, DocRef>> {
  const out = new Map<string, DocRef>();
  if (!hasDatabaseEnv() || ids.length === 0) return out;
  try {
    const rows = await getPrisma().intranetDoc.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        origin: true,
        originRef: true,
        space: true,
        title: true,
        accountId: true,
        occurredAt: true,
        originGone: true,
      },
    });
    for (const d of rows) {
      out.set(d.id, {
        id: d.id,
        origin: d.origin,
        originRef: d.originRef,
        space: d.space,
        title: d.title,
        accountId: d.accountId,
        occurredAt: iso(d.occurredAt),
        originGone: iso(d.originGone),
      });
    }
  } catch {
    // tables not migrated yet — an empty map renders an empty room
  }
  return out;
}

/** The whole document, for Level-3 drilldown. */
export async function docBody(
  id: string,
): Promise<{ body: string; links: unknown; speakers: string[] } | null> {
  if (!hasDatabaseEnv() || !id) return null;
  try {
    const d = await getPrisma().intranetDoc.findUnique({
      where: { id },
      select: { body: true, links: true, speakers: true },
    });
    return d ? { body: d.body, links: d.links, speakers: d.speakers } : null;
  } catch {
    return null;
  }
}

// ── the corpus's own vital signs ────────────────────────────────────────────
export type BrainStats = {
  docs: number;
  claims: number;
  topics: number;
  lastCaptureAt: string;
  prospectQuestions: number;
};

export async function brainStats(): Promise<BrainStats> {
  const empty: BrainStats = {
    docs: 0,
    claims: 0,
    topics: 0,
    lastCaptureAt: "",
    prospectQuestions: 0,
  };
  if (!hasDatabaseEnv()) return empty;
  try {
    const p = getPrisma();
    const [docs, claims, topics, latest, pq] = await Promise.all([
      p.intranetDoc.count(),
      p.intranetClaim.count(),
      p.intranetTopic.count({ where: { status: "live" } }),
      p.intranetDoc.findFirst({
        orderBy: { capturedAt: "desc" },
        select: { capturedAt: true },
      }),
      p.intranetClaim.count({ where: { kind: "prospect-question" } }),
    ]);
    return {
      docs,
      claims,
      topics,
      lastCaptureAt: iso(latest?.capturedAt),
      prospectQuestions: pq,
    };
  } catch {
    return empty;
  }
}

/** The entity vocabulary the planner is given — most common first, so the model
 *  sees what the corpus actually talks about rather than a random slice. */
export async function commonEntities(limit = 300): Promise<string[]> {
  if (!hasDatabaseEnv()) return [];
  try {
    const rows = await getPrisma().intranetClaim.findMany({
      select: { entities: true },
      take: 4000,
      orderBy: { saidAt: "desc" },
    });
    const count = new Map<string, number>();
    for (const r of rows)
      for (const e of r.entities ?? []) count.set(e, (count.get(e) ?? 0) + 1);
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([e]) => e);
  } catch {
    return [];
  }
}

/** What the room has spent today, for the ceilings (Phase 13.4). Counted from
 *  the rows themselves rather than a running total, so a restart never resets
 *  the day. */
export async function todayCounts(now = new Date()): Promise<{
  docs: number;
  asks: number;
}> {
  if (!hasDatabaseEnv()) return { docs: 0, asks: 0 };
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  try {
    const p = getPrisma();
    const [docs, asks] = await Promise.all([
      p.intranetDoc.count({ where: { extractedAt: { gte: start } } }),
      p.intranetAsk.count({ where: { askedAt: { gte: start } } }),
    ]);
    return { docs, asks };
  } catch {
    return { docs: 0, asks: 0 };
  }
}

/** Every prospect question in the corpus, with the document context the bridges
 *  need (C7). This is the material the harvest and the gap carousel run on. */
export async function prospectAsks(limit = 400) {
  if (!hasDatabaseEnv()) return [];
  try {
    const p = getPrisma();
    const rows = await p.intranetClaim.findMany({
      where: { kind: "prospect-question" },
      orderBy: { saidAt: "desc" },
      take: limit,
      select: {
        id: true,
        docId: true,
        text: true,
        askShape: true,
        entities: true,
        saidAt: true,
      },
    });
    if (rows.length === 0) return [];
    const docs = await docsByIds([...new Set(rows.map((r) => r.docId))]);
    return rows.map((r) => {
      const d = docs.get(r.docId);
      return {
        claimId: r.id,
        text: r.text,
        shape: r.askShape ?? "",
        entities: r.entities ?? [],
        saidAt: iso(r.saidAt),
        docId: r.docId,
        accountId: d?.accountId ?? "",
        space: d?.space ?? "",
      };
    });
  } catch {
    return [];
  }
}

// ── the ledger (IV.8) ───────────────────────────────────────────────────────
// The record is rebuilt from the rows the room already keeps — an ask is an
// IntranetAsk, a paste is an IntranetCapture with its digest saved in meta.

/** The running record: asks and pastes as one dated stream, newest first.
 *  Pass a day ("2026-07-30", operator's timezone) to read one archive slice. */
export async function ledgerEntries(opts?: {
  day?: string;
  limit?: number;
}): Promise<LedgerEntry[]> {
  if (!hasDatabaseEnv()) return [];
  const limit = opts?.limit ?? 40;
  try {
    const p = getPrisma();
    const [asks, captures] = await Promise.all([
      p.intranetAsk.findMany({
        orderBy: { askedAt: "desc" },
        take: 500,
        select: {
          id: true,
          question: true,
          answer: true,
          reasoning: true,
          model: true,
          askedAt: true,
          citations: true,
        },
      }),
      p.intranetCapture.findMany({
        orderBy: { capturedAt: "desc" },
        take: 500,
        select: { id: true, title: true, origin: true, capturedAt: true, meta: true },
      }),
    ]);

    const entries: LedgerEntry[] = [];
    for (const a of asks) {
      entries.push({
        kind: "ask",
        id: a.id,
        at: iso(a.askedAt),
        question: a.question,
        answer: a.answer,
        reasoning: a.reasoning,
        model: a.model,
        citations: (Array.isArray(a.citations)
          ? a.citations
          : []) as unknown as StoredCitation[],
      });
    }
    for (const c of captures) {
      const meta = (c.meta ?? {}) as {
        space?: string;
        digest?: string[];
        briefs?: string[];
        detail?: string[];
        report?: { messages?: number };
      };
      // A capture from before digests were stored still deserves a sentence —
      // rebuilt from what its meta remembers, never a bare placeholder.
      const fallback = meta.report?.messages
        ? [
            `Got it — ${meta.report.messages} messages${meta.space ? ` from ${meta.space}` : ""}.`,
          ]
        : c.title || meta.space
          ? [`Got it — ${c.title || meta.space}.`]
          : ["Sent to the brain."];
      entries.push({
        kind: "fed",
        id: c.id,
        at: iso(c.capturedAt),
        space: meta.space ?? "",
        title: c.title,
        origin: c.origin,
        lines:
          Array.isArray(meta.digest) && meta.digest.length
            ? meta.digest.slice(0, 12)
            : fallback,
        briefs: Array.isArray(meta.briefs) ? meta.briefs.slice(0, 6) : [],
        detail: Array.isArray(meta.detail) ? meta.detail.slice(0, 12) : [],
      });
    }

    const filtered = opts?.day
      ? entries.filter((e) => chicagoDay(e.at) === opts.day)
      : entries;
    return filtered.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  } catch {
    return [];
  }
}

/** Every day the record touched, calendarized with its counts. */
export async function archiveDays(): Promise<ArchiveMonth[]> {
  if (!hasDatabaseEnv()) return [];
  try {
    const p = getPrisma();
    const [asks, captures] = await Promise.all([
      p.intranetAsk.findMany({
        orderBy: { askedAt: "desc" },
        take: 1500,
        select: { askedAt: true },
      }),
      p.intranetCapture.findMany({
        orderBy: { capturedAt: "desc" },
        take: 1500,
        select: { capturedAt: true },
      }),
    ]);
    return archiveRollup([
      ...asks.map((a) => ({ at: iso(a.askedAt), kind: "ask" as const })),
      ...captures.map((c) => ({ at: iso(c.capturedAt), kind: "fed" as const })),
    ]);
  } catch {
    return [];
  }
}

/** The by-country lens (IV.8): the same record, tallied by the countries it
 *  names. Never a copy — a country row is a standing filter over entities, and
 *  its sub-rows are the index's own subject parents (V.4), never vague words. */
export async function countryIndex(): Promise<CountryRow[]> {
  if (!hasDatabaseEnv()) return [];
  try {
    const p = getPrisma();
    const [rows, topics] = await Promise.all([
      p.intranetClaim.findMany({
        select: { entities: true, topicIds: true },
        orderBy: { saidAt: "desc" },
        take: 4000,
      }),
      p.intranetTopic.findMany({
        where: { status: "live" },
        select: { id: true, label: true, parentId: true },
      }),
    ]);
    const byId = new Map(topics.map((t) => [t.id, t]));
    const subjectOf = (topicId: string) => {
      const t = byId.get(topicId);
      if (!t) return null;
      const top = t.parentId ? byId.get(t.parentId) : t;
      return top ? { id: top.id, label: top.label } : null;
    };
    return countryTallies(rows, subjectOf);
  } catch {
    return [];
  }
}

/** V.7 · every paste the room has ever received, raw and whole. Read-only —
 *  the hidden archive renders these verbatim, nothing is rewritten. */
export async function allCaptures(limit = 300): Promise<
  {
    id: string;
    origin: string;
    title: string;
    space: string;
    at: string;
    chars: number;
    raw: string;
  }[]
> {
  if (!hasDatabaseEnv()) return [];
  try {
    const rows = await getPrisma().intranetCapture.findMany({
      orderBy: { capturedAt: "desc" },
      take: limit,
      select: {
        id: true,
        origin: true,
        title: true,
        capturedAt: true,
        meta: true,
        raw: true,
      },
    });
    return rows.map((c) => ({
      id: c.id,
      origin: c.origin,
      title: c.title,
      space: ((c.meta ?? {}) as { space?: string }).space ?? "",
      at: iso(c.capturedAt),
      chars: c.raw.length,
      raw: c.raw.slice(0, 30_000),
    }));
  } catch {
    return [];
  }
}

/** Recent asks, for the health view and for repeating a question. */
export async function recentAsks(limit = 10) {
  if (!hasDatabaseEnv()) return [];
  try {
    return await getPrisma().intranetAsk.findMany({
      orderBy: { askedAt: "desc" },
      take: limit,
      select: {
        id: true,
        question: true,
        answer: true,
        model: true,
        ms: true,
        askedAt: true,
        coverage: true,
      },
    });
  } catch {
    return [];
  }
}
