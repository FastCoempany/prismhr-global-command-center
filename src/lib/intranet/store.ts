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
