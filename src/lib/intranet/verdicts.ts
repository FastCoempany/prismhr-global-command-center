// Phase 12's model half — deciding whether two claims are actually about the
// same point, and which of them the record now stands behind.
//
// The mechanical pair proposal in time.ts has already cut the field from
// quadratic to a few dozen. This is what arbitrates what survives that cut.
//
// The bias is toward "unrelated", and hard. A false contradiction is worse than
// a missed one: it makes the room look confused about something the operator
// understands perfectly, and that costs more trust than silence does.

import Anthropic from "@anthropic-ai/sdk";
import { MODEL_TOPIC } from "./doctrine";
import type { Claim } from "./types";

export type Verdict = {
  aId: string;
  bId: string;
  verdict: "supersedes" | "disputes" | "unrelated";
  why: string;
  onSamePoint: string;
};

const SYSTEM = `You compare pairs of claims from an internal record and decide how they relate.

For each pair, one of:
- "supersedes" — they are about the SAME point, and the later one replaces the earlier. The record moved on.
- "disputes" — they are about the SAME point and they disagree, with neither clearly the successor.
- "unrelated" — anything else.

DEFAULT TO "unrelated". Two claims about different countries, different products, different accounts or different stages of the same process are NOT in conflict. They are simply both true. A false contradiction makes the record look confused about something the reader understands perfectly, which is worse than missing a real one.

"why" MUST quote both claims. If you cannot quote both to justify the verdict, the verdict is "unrelated".
"onSamePoint" names, in a few words, the exact thing they are both about. For "unrelated" it is empty.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["pairs"],
  properties: {
    pairs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["aId", "bId", "verdict", "why", "onSamePoint"],
        properties: {
          aId: { type: "string" },
          bId: { type: "string" },
          verdict: { type: "string", enum: ["supersedes", "disputes", "unrelated"] },
          why: { type: "string" },
          onSamePoint: { type: "string" },
        },
      },
    },
  },
} as const;

/** Coerce, then throw away anything that cannot justify itself. A verdict whose
 *  "why" does not quote both claims is discarded — that is the guard against a
 *  model asserting a relationship it cannot show. */
export function sanitizeVerdicts(raw: unknown, byId: Map<string, Claim>): Verdict[] {
  const r = (raw ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(r.pairs) ? r.pairs : [];
  const out: Verdict[] = [];

  for (const p of rows.slice(0, 60)) {
    const o = (p ?? {}) as Record<string, unknown>;
    const aId = typeof o.aId === "string" ? o.aId : "";
    const bId = typeof o.bId === "string" ? o.bId : "";
    const a = byId.get(aId);
    const b = byId.get(bId);
    if (!a || !b || aId === bId) continue;

    const verdict = (["supersedes", "disputes", "unrelated"] as const).includes(
      o.verdict as "supersedes" | "disputes" | "unrelated",
    )
      ? (o.verdict as Verdict["verdict"])
      : "unrelated";
    const why = typeof o.why === "string" ? o.why.trim().slice(0, 400) : "";

    if (verdict !== "unrelated" && !quotesBoth(why, a, b)) continue;

    out.push({
      aId,
      bId,
      verdict,
      why,
      onSamePoint:
        typeof o.onSamePoint === "string" ? o.onSamePoint.trim().slice(0, 120) : "",
    });
  }
  return out;
}

/** Does the justification actually reference both claims? Checked on a run of
 *  significant words rather than exact quotation, because a model will
 *  reasonably trim a long claim when quoting it. */
export function quotesBoth(why: string, a: Claim, b: Claim): boolean {
  const words = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3);
  const hay = new Set(words(why));
  const covered = (c: Claim) => {
    const ws = words(c.text);
    if (ws.length === 0) return false;
    const hits = ws.filter((w) => hay.has(w)).length;
    return hits >= Math.min(4, Math.ceil(ws.length * 0.3));
  };
  return covered(a) && covered(b);
}

/** Which of a pair supersedes the other: the later one, always. Sameness of
 *  point has already been decided; this is only about direction. */
export function supersessionDirection(
  a: Claim,
  b: Claim,
): { older: Claim; newer: Claim } {
  return Date.parse(a.saidAt) <= Date.parse(b.saidAt)
    ? { older: a, newer: b }
    : { older: b, newer: a };
}

export async function runVerdicts(pairs: [Claim, Claim][]): Promise<Verdict[]> {
  if (!process.env.ANTHROPIC_API_KEY || pairs.length === 0) return [];
  const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });

  const rendered = pairs
    .map(
      ([a, b], i) =>
        `PAIR ${i + 1}\n  A (${a.id}) [${a.kind}, ${a.saidAt.slice(0, 10)}] "${a.text}"\n  B (${b.id}) [${b.kind}, ${b.saidAt.slice(0, 10)}] "${b.text}"`,
    )
    .join("\n\n");

  const res = await client.messages.create({
    model: MODEL_TOPIC,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: {
      format: {
        type: "json_schema",
        schema: SCHEMA as unknown as Record<string, unknown>,
      },
    },
    messages: [{ role: "user", content: rendered }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  const byId = new Map<string, Claim>();
  for (const [a, b] of pairs) {
    byId.set(a.id, a);
    byId.set(b.id, b);
  }
  try {
    return sanitizeVerdicts(JSON.parse(text), byId);
  } catch {
    return [];
  }
}

// ── topic summaries ─────────────────────────────────────────────────────────
/** A topic's one-line summary, regenerated when it has grown enough to have
 *  changed meaning. It is what the operator reads on hover and what the query
 *  planner reads when deciding where a question points — so a stale one
 *  misdirects retrieval, not just the eye. */
export async function runTopicSummary(label: string, claims: Claim[]): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY || claims.length === 0) return "";
  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });
  const res = await client.messages.create({
    model: MODEL_TOPIC,
    max_tokens: 300,
    system:
      "Write ONE sentence describing what a topic in an index covers, so someone scanning a list knows whether their question belongs here. Plain, concrete, no preamble. Do not start with 'This topic'.",
    messages: [
      {
        role: "user",
        content: `TOPIC: ${label}\n\nCLAIMS\n${claims
          .slice(0, 40)
          .map((c) => `- ${c.text}`)
          .join("\n")}`,
      },
    ],
  } as Anthropic.MessageCreateParamsNonStreaming);
  return res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim()
    .slice(0, 240);
}

/** Whether a topic's summary has drifted far enough from its material to be
 *  worth regenerating: a quarter more claims than when it was last written. */
export function summaryStale(claimCount: number, countAtLastSummary: number): boolean {
  if (!countAtLastSummary) return claimCount > 0;
  return claimCount >= countAtLastSummary * 1.25;
}
