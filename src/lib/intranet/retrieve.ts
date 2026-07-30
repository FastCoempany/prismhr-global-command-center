// Phase 9 · RETRIEVE — finding the claims that actually bear on a question.
//
// Keyword search fails on the questions that matter, because the operator's
// words and the corpus's words differ. "What do we tell people about how long
// implementation takes?" contains none of the corpus's vocabulary — the claims
// say "signature to first payroll", "four to six weeks", "go-live".
//
// So the model plans BEFORE the database searches. Claude decides what to look
// for; the database does the looking. That belongs at the front of retrieval,
// not the back where it would only re-rank whatever keywords happened to hit.
//
// The ranking formula below references recency, kind, confidence, corroboration
// and how many roads agreed. It does NOT reference origin. That is C1, in
// arithmetic rather than in prose.

import Anthropic from "@anthropic-ai/sdk";
import {
  CANDIDATE_CAP,
  CONFIDENCE_WEIGHT,
  KIND_WEIGHT,
  MODEL_PLAN,
  RANK,
  RECENCY_HALF_LIFE_DAYS,
} from "./doctrine";
import type { Candidate, Claim, QueryPlan, Road, Topic } from "./types";

const DAY = 86_400_000;

export const EMPTY_PLAN: QueryPlan = {
  intent: "lookup",
  topicIds: [],
  entities: [],
  phrases: [],
  timeframe: null,
  originHint: null,
  needsRecent: false,
  hardness: "routine",
};

// ── the planner ─────────────────────────────────────────────────────────────
const PLAN_SYSTEM = `You plan a search over an internal corpus. You do not answer the question — you decide what to look for.

The corpus is one brain. It holds internal chat, meeting and demo transcripts, the app's own notes and actions, and a sales playbook, all mixed together. NEVER narrow by where something came from unless the operator's own words demand it ("what did the channels say", "in the playbook"). If they did not ask for a source, originHint must be null.

The most valuable field you produce is "phrases". Translate the question into THE CORPUS'S OWN VOCABULARY, not the asker's. If the question says "how long does setup take", good phrases are "signature to first payroll", "go-live", "implementation timeline", "four to six weeks" — not "how long" and "setup".

intent:
- "lookup" — a fact or position is being asked for
- "comparative" — two things are being weighed, or a change over time
- "counterfactual" — what would happen / what would we do
- "status" — where something stands right now
- "enumerate" — a list is wanted

needsRecent: true when the question wants the current position ("what's the latest", "where are we now").
hardness: "hard" for comparative, counterfactual, or anything requiring reconciliation across several sources.`;

const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "intent",
    "topicIds",
    "entities",
    "phrases",
    "timeframe",
    "originHint",
    "needsRecent",
    "hardness",
  ],
  properties: {
    intent: {
      type: "string",
      enum: ["lookup", "comparative", "counterfactual", "status", "enumerate"],
    },
    topicIds: { type: "array", maxItems: 6, items: { type: "string" } },
    entities: { type: "array", maxItems: 10, items: { type: "string" } },
    phrases: { type: "array", maxItems: 8, items: { type: "string" } },
    timeframe: {
      type: ["object", "null"],
      additionalProperties: false,
      required: ["from", "to"],
      properties: { from: { type: "string" }, to: { type: "string" } },
    },
    originHint: { type: ["array", "null"], items: { type: "string" } },
    needsRecent: { type: "boolean" },
    hardness: { type: "string", enum: ["routine", "hard"] },
  },
} as const;

export function planAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function sanitizePlan(raw: unknown, liveTopicIds: Set<string>): QueryPlan {
  const r = (raw ?? {}) as Record<string, unknown>;
  const arr = (v: unknown, max: number, len = 120): string[] =>
    (Array.isArray(v) ? v : [])
      .map((x) => (typeof x === "string" ? x.trim().slice(0, len) : ""))
      .filter(Boolean)
      .slice(0, max);

  const intents = ["lookup", "comparative", "counterfactual", "status", "enumerate"];
  const tf = r.timeframe as Record<string, unknown> | null | undefined;

  return {
    intent: intents.includes(r.intent as string)
      ? (r.intent as QueryPlan["intent"])
      : "lookup",
    // A hallucinated topic id would silently retrieve nothing; drop anything
    // that isn't actually in the index.
    topicIds: arr(r.topicIds, 6, 60).filter((id) => liveTopicIds.has(id)),
    entities: arr(r.entities, 10, 80),
    phrases: arr(r.phrases, 8, 120),
    timeframe:
      tf && typeof tf.from === "string" && typeof tf.to === "string"
        ? { from: tf.from.slice(0, 40), to: tf.to.slice(0, 40) }
        : null,
    originHint: Array.isArray(r.originHint) ? arr(r.originHint, 6, 40) : null,
    needsRecent: r.needsRecent === true,
    hardness: r.hardness === "hard" ? "hard" : "routine",
  };
}

export async function runPlan(
  question: string,
  topics: Pick<Topic, "id" | "label" | "summary">[],
  entities: string[],
): Promise<QueryPlan> {
  if (!planAvailable()) return EMPTY_PLAN;
  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });
  const list = topics
    .slice(0, 120)
    .map((t) => `${t.id} · ${t.label}${t.summary ? ` — ${t.summary}` : ""}`)
    .join("\n");

  const res = await client.messages.create({
    model: MODEL_PLAN,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    system: [{ type: "text", text: PLAN_SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: {
      format: {
        type: "json_schema",
        schema: PLAN_SCHEMA as unknown as Record<string, unknown>,
      },
    },
    messages: [
      {
        role: "user",
        content: `TOPICS IN THE INDEX\n${list || "(empty)"}\n\nCOMMON ENTITIES\n${entities
          .slice(0, 300)
          .join(", ")}\n\nQUESTION\n${question}`,
      },
    ],
  } as Anthropic.MessageCreateParamsNonStreaming);

  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  try {
    return sanitizePlan(JSON.parse(text), new Set(topics.map((t) => t.id)));
  } catch {
    return EMPTY_PLAN;
  }
}

/** The floor: a plan built with no model at all, so retrieval still works when
 *  the API key is missing or the call fails. Lexical only, from the question's
 *  own words — worse than a planned search, and honest about being so. */
export function fallbackPlan(question: string): QueryPlan {
  const words = (question ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
  return { ...EMPTY_PLAN, phrases: [...new Set(words)].slice(0, 8) };
}

// ── fusion and ranking ──────────────────────────────────────────────────────
export type RoadHit = { claim: Claim; road: Road; lexicalRank?: number };

/** Exponential decay on age. Halved half-life when the question wants what is
 *  current, so "where are we now" stops treating a March line as equal. */
export function recencyWeight(
  saidAt: string,
  nowIso: string,
  needsRecent: boolean,
): number {
  const t = Date.parse(saidAt);
  const n = Date.parse(nowIso);
  if (Number.isNaN(t) || Number.isNaN(n)) return 0.5;
  const days = Math.max(0, (n - t) / DAY);
  const half = needsRecent ? RECENCY_HALF_LIFE_DAYS / 2 : RECENCY_HALF_LIFE_DAYS;
  return Math.pow(0.5, days / half);
}

/** Two claims say the same thing when their significant words mostly overlap.
 *  Used for corroboration counting and near-duplicate collapse — deliberately
 *  crude, because the cost of a false merge is low and the cost of a missed one
 *  is a corpus that sounds more certain than it is. */
export function sameAssertion(a: string, b: string): boolean {
  const words = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
  const x = words(a);
  const y = words(b);
  if (x.size === 0 || y.size === 0) return false;
  let shared = 0;
  for (const w of y) if (x.has(w)) shared += 1;
  return shared / Math.min(x.size, y.size) >= 0.75;
}

/** Merge the roads' results, count corroboration across DOCUMENTS (never
 *  claims — one loud thread must not be able to manufacture consensus), score,
 *  sort, and cap. */
export function fuse(
  hits: RoadHit[],
  opts: { nowIso: string; needsRecent: boolean; cap?: number },
): Candidate[] {
  const byId = new Map<string, Candidate>();

  for (const h of hits) {
    const found = byId.get(h.claim.id);
    if (found) {
      if (!found.roads.includes(h.road)) found.roads.push(h.road);
      found.lexicalRank = Math.max(found.lexicalRank, h.lexicalRank ?? 0);
      continue;
    }
    byId.set(h.claim.id, {
      claim: h.claim,
      roads: [h.road],
      lexicalRank: h.lexicalRank ?? 0,
      corroboration: 0,
      score: 0,
    });
  }

  const all = [...byId.values()];

  // Corroboration: how many distinct documents carry this same assertion.
  for (const c of all) {
    const docs = new Set<string>([c.claim.docId]);
    for (const other of all) {
      if (other.claim.id === c.claim.id) continue;
      if (other.claim.docId === c.claim.docId) continue;
      if (sameAssertion(c.claim.text, other.claim.text)) docs.add(other.claim.docId);
    }
    c.corroboration = docs.size - 1;
  }

  for (const c of all) {
    const roadAgreement = Math.min(1, c.roads.length / 3);
    c.score =
      RANK.roadAgreement * roadAgreement +
      RANK.lexical * Math.min(1, c.lexicalRank) +
      RANK.recency * recencyWeight(c.claim.saidAt, opts.nowIso, opts.needsRecent) +
      RANK.kind * (KIND_WEIGHT[c.claim.kind] ?? 0.5) +
      RANK.confidence * (CONFIDENCE_WEIGHT[c.claim.confidence] ?? 0.7) +
      RANK.corroboration * Math.min(1, c.corroboration / 3);
  }

  all.sort((a, b) => b.score - a.score);

  // Collapse near-identical claims, keeping the earliest as the origin — the
  // corroborators are already counted in its score, so nothing is lost.
  const kept: Candidate[] = [];
  for (const c of all) {
    const dupe = kept.find((k) => sameAssertion(k.claim.text, c.claim.text));
    if (dupe) continue;
    kept.push(c);
  }

  return kept.slice(0, opts.cap ?? CANDIDATE_CAP);
}

/** What the operator is told about the shape of the evidence. Thin coverage is
 *  not a failure to hide — it is the most useful thing the room can say to
 *  someone about to repeat this to a prospect. */
export function coverageOf(
  cands: Candidate[],
  docOrigin: Map<string, string>,
): { claims: number; docs: number; from: string; to: string; origins: string[] } {
  const docs = new Set(cands.map((c) => c.claim.docId));
  const dates = cands
    .map((c) => Date.parse(c.claim.saidAt))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
  const origins = [...new Set(cands.map((c) => docOrigin.get(c.claim.docId) ?? ""))]
    .filter(Boolean)
    .sort();
  return {
    claims: cands.length,
    docs: docs.size,
    from: dates.length ? new Date(dates[0]).toISOString() : "",
    to: dates.length ? new Date(dates[dates.length - 1]).toISOString() : "",
    origins,
  };
}
