// Phase 6, refounded by V.1 · THE LIBERAL READ.
//
// A document is handed to Claude with one instruction: organize it topically
// against the bank, file it, and write a brief — what you received, what you
// did with it, where each piece went, and why. The reply structure below is
// the minimum filing requires; nothing in it the API can refuse.
//
// Two rules survive from the first build because they are the room's honor:
//
//   · ATTRIBUTION IS SACRED. A statement belongs to the person whose message
//     it appears in — quoted material to its original author, always.
//   · Filing is TEXT-ONLY (V.2). The model names topics in words; the app
//     resolves the words. No ids, no codes, no numbers in any prompt.

import Anthropic from "@anthropic-ai/sdk";
import {
  CLAIM_KINDS,
  MODEL_EXTRACT_LIGHT,
  MODEL_EXTRACT_RICH,
  PROMPT_VERSION,
  type ClaimKind,
} from "./doctrine";
import { bankPrompt } from "./bank";

export function extractAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Opus or better, always (founder-decreed 2026-07-31). Both roster slots
 *  point at the parent brain now; the split survives only so a future decree
 *  can raise the rich side without touching the callers. */
export function modelForOrigin(origin: string): string {
  return origin === "teams" || origin === "meeting" || origin === "demo"
    ? MODEL_EXTRACT_RICH
    : MODEL_EXTRACT_LIGHT;
}

// ── the instruction ─────────────────────────────────────────────────────────
export const SYSTEM = `You are the reading half of an internal knowledge index. You receive one document — a chat thread, a transcript, a note, anything — and you organize what it contains.

ORGANIZE TOPICALLY, AGAINST THE BANK
You are given the index's subject bank: parents and their subtopics. File every statement worth keeping under the best-fitting subtopic. Check the bank FIRST. Only when something genuinely fits no existing subtopic, file it under the right parent with a new, concrete subtopic name — a label that answers "what's in here" before anyone clicks it. Never invent a new parent.

WHAT TO KEEP
Statements someone would want to find again: facts, decisions, commitments, how things are done, open questions, and questions buyers asked (keep those verbatim — file them under "Buyer questions"). Skip pleasantries, scheduling chatter, and reactions. Each statement must read entirely on its own, no pronouns pointing outside it.

ATTRIBUTION IS SACRED
A statement belongs to the person whose message it appears in. Quoted or forwarded material belongs to its ORIGINAL author, never to whoever pasted it. The operator is Antaeus Coe; market knowledge inside HIS messages is his own. If attribution genuinely cannot be determined, write "unknown" — guessing is worse. NEVER people as tags: a person's name inside a statement's text is fine, but tag statements only with countries.

THE BRIEF
Write "brief" as a detailed report addressed to the operator: what this document was, what you did with it, where each piece went, and WHY you organized it that way. Name the subtopics you used and what went into each. Where content clearly concerns a specific customer account or belongs in the Playbook, say so in the brief — you file nothing outside the index; the operator does. Plain confident prose, a real read — not a list of counts.

For each statement also give:
- kind: fact | decision | commitment | process | opinion | question | buyer-question
- countries: any countries the statement is about (empty if none)
- quote: the exact source span it came from, when one exists`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["brief", "filings"],
  properties: {
    brief: { type: "string" },
    filings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["topic", "subtopic", "statements"],
        properties: {
          topic: { type: "string" },
          subtopic: { type: "string" },
          statements: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["text", "speaker", "kind", "countries", "quote"],
              properties: {
                text: { type: "string" },
                speaker: { type: "string" },
                kind: { type: "string" },
                countries: { type: "array", items: { type: "string" } },
                quote: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;

// ── shapes ──────────────────────────────────────────────────────────────────
export type Statement = {
  text: string;
  speaker: string;
  kind: ClaimKind;
  countries: string[];
  quote: string;
  offsetStart: number;
  offsetEnd: number;
};

export type Filing = { topic: string; subtopic: string; statements: Statement[] };

export type LiberalRead = { brief: string; filings: Filing[] };

export const EMPTY_READ: LiberalRead = { brief: "", filings: [] };

// ── the quote check (kept — costless honesty) ───────────────────────────────
/** Whitespace-tolerant search for a quote inside the body. Null = not there. */
export function locateQuote(
  body: string,
  quote: string,
): { start: number; end: number } | null {
  const q = (quote ?? "").trim();
  if (q.length < 8) return null;
  const direct = body.indexOf(q);
  if (direct >= 0) return { start: direct, end: direct + q.length };

  const norm = (s: string) => s.replace(/\s+/g, " ");
  const flatBody = norm(body);
  const flatQ = norm(q);
  const at = flatBody.indexOf(flatQ);
  if (at < 0) return null;

  let seen = 0;
  let start = -1;
  let end = -1;
  for (let i = 0; i < body.length; i += 1) {
    const isWs = /\s/.test(body[i]);
    const prevWs = i > 0 && /\s/.test(body[i - 1]);
    if (isWs && prevWs) continue;
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

// ── coercion ────────────────────────────────────────────────────────────────
function str(v: unknown, max = 800): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Loose words to the doctrine's kinds. Liberal in, canonical out. */
export function asKind(v: unknown): ClaimKind {
  const s = str(v, 40).toLowerCase().replace(/\s+/g, "-");
  if ((CLAIM_KINDS as readonly string[]).includes(s)) return s as ClaimKind;
  if (s.includes("buyer") || s.includes("prospect")) return "prospect-question";
  if (s.includes("decision") || s.includes("decide")) return "decision";
  if (s.includes("commit") || s.includes("promise")) return "commitment";
  if (s.includes("process") || s.includes("how")) return "process";
  if (s.includes("opinion") || s.includes("view")) return "opinion";
  if (s.includes("question") || s.includes("ask")) return "question";
  return "fact";
}

/** Coerce whatever came back. Liberal (V.1): a statement without a locatable
 *  quote is KEPT — offsets stay zero and drilldown opens the document's top.
 *  The quote check still runs so located statements drill precisely. */
export function sanitizeRead(raw: unknown, body: string): LiberalRead {
  const r = (raw ?? {}) as Record<string, unknown>;
  const filingsIn = Array.isArray(r.filings) ? r.filings : [];
  const filings: Filing[] = [];

  for (const f of filingsIn.slice(0, 40)) {
    const o = (f ?? {}) as Record<string, unknown>;
    const topic = str(o.topic, 80);
    const subtopic = str(o.subtopic, 80);
    if (!topic || !subtopic) continue;
    const stIn = Array.isArray(o.statements) ? o.statements : [];
    const statements: Statement[] = [];
    for (const st of stIn.slice(0, 80)) {
      const so = (st ?? {}) as Record<string, unknown>;
      const text = str(so.text, 700);
      if (!text) continue;
      const quote = str(so.quote, 900);
      const span = quote ? locateQuote(body, quote) : null;
      statements.push({
        text,
        speaker: str(so.speaker, 120) || "unknown",
        kind: asKind(so.kind),
        countries: (Array.isArray(so.countries) ? so.countries : [])
          .map((c) => str(c, 60))
          .filter(Boolean)
          .slice(0, 8),
        quote,
        offsetStart: span?.start ?? 0,
        offsetEnd: span?.end ?? 0,
      });
    }
    if (statements.length) filings.push({ topic, subtopic, statements });
  }

  return { brief: str(r.brief, 6000), filings };
}

// ── the call ────────────────────────────────────────────────────────────────
export type ReadInput = {
  body: string;
  origin: string;
  space: string;
  occurredAt: string;
  accountName?: string;
  /** Subtopics the index has grown beyond the bank, so the model files into
   *  them rather than re-inventing them. Labels only (V.2). */
  grown: { parent: string; label: string }[];
};

export async function runRead(input: ReadInput): Promise<LiberalRead> {
  if (!extractAvailable()) throw new Error("No API key configured — reading is off.");
  const client = new Anthropic({ timeout: 120_000, maxRetries: 1 });

  const user = `THE BANK — file against this first:
${bankPrompt(input.grown)}

DOCUMENT — from ${input.space || "an internal source"}${
    input.accountName ? `, about the account ${input.accountName}` : ""
  }, pasted ${input.occurredAt.slice(0, 10)}:

${input.body}`;

  const res = await client.messages.create({
    model: modelForOrigin(input.origin),
    max_tokens: 16384,
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
  try {
    return sanitizeRead(JSON.parse(text), input.body);
  } catch {
    return EMPTY_READ;
  }
}

export { PROMPT_VERSION };
