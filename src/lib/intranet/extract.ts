// Phase 6 · EXTRACT — documents become claims.
//
// This phase determines the room's ceiling. A weak extraction cannot be rescued
// by clever retrieval or eloquent synthesis; the answer will be fluent and
// wrong. Everything downstream is arithmetic on what happens here.
//
// Two guards carry most of the weight:
//
//   · ATTRIBUTION. This app has been burned once already — the operator's own
//     line about a deposit at Remote was credited to a colleague because it sat
//     in a thread that colleague had replied to most recently. The rubric below
//     is explicit, and tests/intranet.test.ts holds fixtures for it forever.
//
//   · THE QUOTE CHECK. Every claim must carry a verbatim span from the source.
//     A claim whose quote cannot be located is dropped, not stored — which is a
//     cheap, deterministic catch for the hallucination that would otherwise
//     look exactly like a good claim.

import Anthropic from "@anthropic-ai/sdk";
import {
  ASK_SHAPES,
  CLAIM_KINDS,
  CONFIDENCES,
  MODEL_EXTRACT_LIGHT,
  MODEL_EXTRACT_RICH,
  PROMPT_VERSION,
  type AskShape,
  type ClaimKind,
  type Confidence,
} from "./doctrine";
import type { DraftClaim, ExtractResult, Topic } from "./types";

export const MAX_CLAIMS = 24;
const MAX_TOPIC_MATCHES = 6;
const MAX_PROPOSALS = 3;
const MAX_LINK_REFS = 6;
/** Above this share of unlocatable quotes, the whole extraction is rejected. */
export const QUOTE_FAILURE_LIMIT = 0.2;

export function extractAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Rich documents get the parent brain; app rows are short and already
 *  half-parsed, so they take the light one. */
export function modelForOrigin(origin: string): string {
  return origin === "teams" || origin === "meeting" || origin === "demo"
    ? MODEL_EXTRACT_RICH
    : MODEL_EXTRACT_LIGHT;
}

// ── the rubric ──────────────────────────────────────────────────────────────
export const SYSTEM = `You read one document from an internal corpus and pull out the assertions worth finding again months from now.

WHAT A CLAIM IS
- One assertion, readable entirely on its own. "He said four to six weeks" is NOT a claim. "Implementation from signature to first payroll is quoted at four to six weeks" IS.
- Extract what someone would want to find later. Not pleasantries, not scheduling logistics, not reactions, not "sounds good".
- Prefer fewer, better claims. The cap is ${MAX_CLAIMS}; most documents should yield three to eight.
- Never merge two people's statements into one claim.

ATTRIBUTION IS SACRED
- A claim belongs to the person whose message it appears in. Full stop.
- Quoted or forwarded material belongs to its ORIGINAL author, never to whoever pasted or replied to it.
- The operator is Antaeus Coe. He writes from his own account and previously worked at Remote.com — so market knowledge inside HIS message is HIS own, not a colleague's and not a prospect's.
- If attribution genuinely cannot be determined, use "unknown". Guessing is worse than admitting.

KIND
- "decision"  — a choice was made ("we're going EOR first")
- "commitment" — someone owes something ("I'll have the SOW over by Friday")
- "fact" — a state of the world ("13th salary pays in two instalments")
- "process" — how something is done ("sell a deal, email implementation with SOW and handover, then drop the SOW in SharePoint")
- "opinion" — a view, not a decision
- "question" — an open question nobody answered; the organisation's known unknowns
- "prospect-question" — a question a BUYER asked, in a demo or a customer call. Never merge these with "question": an internal unknown and a buyer's probe are different animals.

PROSPECT QUESTIONS ARE THE WINDOW TO WINNING DEALS
When the speaker is a prospect or customer asking something, use kind "prospect-question" and fill:
- askShape: definitional (they don't know what a thing is) | commercial (price, terms, structure) | risk (exposure, compliance, liability) | technical (integration, data, platform) | process (how it works day to day) | timeline (how long, when)
- prompted: what in the conversation provoked the question — the claim, the slide, the moment. A definitional question right after the EOR explanation means the framing failed, and that is the intelligence.

CONFIDENCE
- "stated" — said plainly, first-hand
- "hedged" — "I think", "probably", "we might"
- "secondhand" — "X told me", "I heard"

ENTITIES
Organizations, countries, products, systems, named artifacts (a SOW, a handover doc).
NEVER people. A person's name inside a claim's text is fine — that is prose. Do not list people as entities.

TOPICS
Match against the topic list you are given, always, first. Propose a new topic ONLY when the document genuinely does not fit anything on the list, and say why in one line.

QUOTE
Every claim carries "quote": the exact, verbatim span from the document that the claim is drawn from. Copy it character for character. If you cannot quote it, do not make the claim.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "claims", "topicMatches", "topicProposals", "linkRefs"],
  properties: {
    summary: { type: "string", description: "Two sentences: what this document is." },
    claims: {
      type: "array",
      maxItems: MAX_CLAIMS,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "text",
          "speaker",
          "kind",
          "confidence",
          "entities",
          "askShape",
          "prompted",
          "quote",
        ],
        properties: {
          text: { type: "string" },
          speaker: { type: "string" },
          kind: { type: "string", enum: [...CLAIM_KINDS] },
          confidence: { type: "string", enum: [...CONFIDENCES] },
          entities: { type: "array", maxItems: 10, items: { type: "string" } },
          askShape: { type: "string", enum: ["", ...ASK_SHAPES] },
          prompted: { type: "string" },
          quote: { type: "string" },
        },
      },
    },
    topicMatches: {
      type: "array",
      maxItems: MAX_TOPIC_MATCHES,
      items: { type: "string" },
    },
    topicProposals: {
      type: "array",
      maxItems: MAX_PROPOSALS,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "why"],
        properties: { label: { type: "string" }, why: { type: "string" } },
      },
    },
    linkRefs: {
      type: "array",
      maxItems: MAX_LINK_REFS,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "why"],
        properties: { label: { type: "string" }, why: { type: "string" } },
      },
    },
  },
} as const;

export const EMPTY_EXTRACT: ExtractResult = {
  summary: "",
  claims: [],
  topicMatches: [],
  topicProposals: [],
  linkRefs: [],
};

// ── the quote check (F2) ────────────────────────────────────────────────────
/** Whitespace-tolerant search for a quote inside the body. Returns the span, or
 *  null when the quote is not there — which is the strongest hallucination
 *  signal available and costs nothing. */
export function locateQuote(
  body: string,
  quote: string,
): { start: number; end: number } | null {
  const q = (quote ?? "").trim();
  if (q.length < 8) return null;
  const direct = body.indexOf(q);
  if (direct >= 0) return { start: direct, end: direct + q.length };

  // Whitespace-normalised comparison, mapping back to original offsets.
  const norm = (s: string) => s.replace(/\s+/g, " ");
  const flatBody = norm(body);
  const flatQ = norm(q);
  const at = flatBody.indexOf(flatQ);
  if (at < 0) return null;

  // Walk the original, counting normalised characters, to recover real offsets.
  let seen = 0;
  let start = -1;
  let end = -1;
  for (let i = 0; i < body.length; i += 1) {
    const isWs = /\s/.test(body[i]);
    const prevWs = i > 0 && /\s/.test(body[i - 1]);
    if (isWs && prevWs) continue; // collapsed run
    if (seen === at && start < 0) start = i;
    seen += 1;
    if (seen === at + flatQ.length) {
      end = i + 1;
      break;
    }
  }
  if (start < 0) return null;
  return { start, end: end > start ? end : Math.min(body.length, start + q.length) };
}

// ── sanitising ──────────────────────────────────────────────────────────────
function str(v: unknown, max = 600): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function asKind(v: unknown): ClaimKind {
  return (CLAIM_KINDS as readonly string[]).includes(v as string)
    ? (v as ClaimKind)
    : "fact";
}

function asConfidence(v: unknown): Confidence {
  return (CONFIDENCES as readonly string[]).includes(v as string)
    ? (v as Confidence)
    : "stated";
}

function asShape(v: unknown): AskShape | "" {
  return (ASK_SHAPES as readonly string[]).includes(v as string) ? (v as AskShape) : "";
}

/** Coerce whatever came back into the shape the rest of the build expects, then
 *  drop every claim whose quote cannot be found in the body. */
export function sanitizeExtract(
  raw: unknown,
  body: string,
): ExtractResult & { located: { start: number; end: number }[]; dropped: number } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const claimsIn = Array.isArray(r.claims) ? r.claims : [];

  const claims: DraftClaim[] = [];
  const located: { start: number; end: number }[] = [];
  let dropped = 0;

  for (const c of claimsIn.slice(0, MAX_CLAIMS)) {
    const o = (c ?? {}) as Record<string, unknown>;
    const text = str(o.text, 600);
    if (!text) continue;
    const span = locateQuote(body, str(o.quote, 900));
    if (!span) {
      dropped += 1;
      continue;
    }
    const kind = asKind(o.kind);
    claims.push({
      text,
      speaker: str(o.speaker, 120) || "unknown",
      kind,
      confidence: asConfidence(o.confidence),
      entities: (Array.isArray(o.entities) ? o.entities : [])
        .map((e) => str(e, 80))
        .filter(Boolean)
        .slice(0, 10),
      askShape: kind === "prospect-question" ? asShape(o.askShape) : "",
      prompted: kind === "prospect-question" ? str(o.prompted, 300) : "",
      quote: str(o.quote, 900),
      offsetStart: span.start,
      offsetEnd: span.end,
    });
    located.push(span);
  }

  return {
    summary: str(r.summary, 500),
    claims,
    topicMatches: (Array.isArray(r.topicMatches) ? r.topicMatches : [])
      .map((t) => str(t, 60))
      .filter(Boolean)
      .slice(0, MAX_TOPIC_MATCHES),
    topicProposals: (Array.isArray(r.topicProposals) ? r.topicProposals : [])
      .map((p) => {
        const o = (p ?? {}) as Record<string, unknown>;
        return { label: str(o.label, 80), why: str(o.why, 200) };
      })
      .filter((p) => p.label)
      .slice(0, MAX_PROPOSALS),
    linkRefs: (Array.isArray(r.linkRefs) ? r.linkRefs : [])
      .map((p) => {
        const o = (p ?? {}) as Record<string, unknown>;
        return { label: str(o.label, 200), why: str(o.why, 200) };
      })
      .filter((p) => p.label)
      .slice(0, MAX_LINK_REFS),
    located,
    dropped,
  };
}

/** Whether an extraction should be thrown away entirely (Phase 6.6). */
export function extractionRejected(kept: number, dropped: number): boolean {
  const total = kept + dropped;
  if (total === 0) return false;
  return dropped / total > QUOTE_FAILURE_LIMIT;
}

// ── the call ────────────────────────────────────────────────────────────────
export type ExtractInput = {
  body: string;
  origin: string;
  /** The room it was said in — disambiguation only, never a partition (I.7). */
  space: string;
  occurredAt: string;
  accountName?: string;
  /** The LIVE topic list, so the model matches rather than invents vocabulary. */
  topics: Pick<Topic, "id" | "label" | "summary">[];
};

function topicLines(topics: ExtractInput["topics"]): string {
  if (!topics.length) return "(the index is empty — propose what this document is about)";
  return topics
    .slice(0, 120)
    .map((t) => `${t.id} · ${t.label}${t.summary ? ` — ${t.summary}` : ""}`)
    .join("\n");
}

export async function runExtract(input: ExtractInput): Promise<ExtractResult> {
  if (!extractAvailable()) throw new Error("No API key configured — extraction is off.");
  const client = new Anthropic({ timeout: 120_000, maxRetries: 1 });

  const user = `Document from ${input.space || "an internal source"}${
    input.accountName ? ` (about the account ${input.accountName})` : ""
  }, said on ${input.occurredAt.slice(0, 10)}.

TOPICS ALREADY IN THE INDEX — match these before proposing anything new:
${topicLines(input.topics)}

DOCUMENT
${input.body}`;

  const res = await client.messages.create({
    model: modelForOrigin(input.origin),
    max_tokens: 8192,
    thinking: { type: "adaptive" },
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: {
      format: {
        type: "json_schema",
        schema: SCHEMA as unknown as Record<string, unknown>,
      },
    },
    messages: [{ role: "user", content: user }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    return EMPTY_EXTRACT;
  }
  const clean = sanitizeExtract(parsed, input.body);
  if (extractionRejected(clean.claims.length, clean.dropped)) return EMPTY_EXTRACT;
  return {
    summary: clean.summary,
    claims: clean.claims,
    topicMatches: clean.topicMatches,
    topicProposals: clean.topicProposals,
    linkRefs: clean.linkRefs,
  };
}

export { PROMPT_VERSION };
