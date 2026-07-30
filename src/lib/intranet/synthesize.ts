// Phase 10 · SYNTHESIZE — the written answer.
//
// This is the product. Everything before it exists to put the right claims in
// front of this call, and everything after it exists to let the operator check
// its work.
//
// Two failures are guarded harder than the rest, because a fluent answer hides
// them best:
//
//   F11 · quote-dumping. An "answer" that is four pasted paragraphs is a search
//         box with extra latency. The verbatim ceiling is measured, not trusted.
//   F12 · confident nonsense. The prompt says three separate times that the
//         room answers from THIS corpus and never fills a gap from what the
//         model happens to know about payroll.

import Anthropic from "@anthropic-ai/sdk";
import {
  ANSWER_SENTENCES,
  CANDIDATE_CAP,
  MODEL_SYNTH,
  MODEL_SYNTH_HARD,
  VERBATIM_MAX_WORDS,
} from "./doctrine";
import { disputeCount } from "./time";
import type { Answer, Candidate, QueryPlan } from "./types";

export const NOTHING_IN_RECORD = "Nothing in the record speaks to this.";

export const EMPTY_ANSWER: Answer = {
  answer: "",
  citations: [],
  reasoning: "",
  setAside: [],
  confidence: "thin",
  gaps: [],
};

export function synthAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// ── escalation (I.4.2) ──────────────────────────────────────────────────────
/** Which brain answers. Opus 5 by default; Fable 5 when the record is large,
 *  contradicts itself, or the question is comparative or counterfactual. */
export function modelFor(cands: Candidate[], plan: QueryPlan): string {
  if (cands.length > CANDIDATE_CAP) return MODEL_SYNTH_HARD;
  if (disputeCount(cands.map((c) => c.claim)) >= 2) return MODEL_SYNTH_HARD;
  if (plan.intent === "comparative" || plan.intent === "counterfactual")
    return MODEL_SYNTH_HARD;
  if (plan.hardness === "hard" && cands.length > 30) return MODEL_SYNTH_HARD;
  return MODEL_SYNTH;
}

export function escalationReason(cands: Candidate[], plan: QueryPlan): string {
  if (cands.length > CANDIDATE_CAP) return `${cands.length} claims — over the cap`;
  const d = disputeCount(cands.map((c) => c.claim));
  if (d >= 2) return `${d} disputed pairs in the evidence`;
  if (plan.intent === "comparative") return "a comparative question";
  if (plan.intent === "counterfactual") return "a counterfactual question";
  if (plan.hardness === "hard" && cands.length > 30)
    return "a hard question, widely sourced";
  return "";
}

// ── confidence (10.4) ───────────────────────────────────────────────────────
/** Thin is not a failure to hide. It is the most useful thing the room can tell
 *  an operator who is about to repeat something to a prospect. */
export function readConfidence(cands: Candidate[], nowIso: string): Answer["confidence"] {
  if (cands.length < 3) return "thin";
  const strong = cands.filter((c) => c.claim.confidence === "stated");
  if (strong.length === 0) return "thin";
  const yearAgo = Date.parse(nowIso) - 365 * 86_400_000;
  const recent = cands.filter((c) => Date.parse(c.claim.saidAt) > yearAgo);
  if (recent.length === 0) return "thin";
  if (disputeCount(cands.map((c) => c.claim)) > 0) return "mixed";
  return "firm";
}

/** The line shown above a thin answer, naming why it is thin. */
export function thinLine(cands: Candidate[]): string {
  const newest = cands
    .map((c) => Date.parse(c.claim.saidAt))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => b - a)[0];
  const when = newest
    ? new Date(newest).toLocaleDateString("en-US", {
        month: "long",
        timeZone: "America/Chicago",
      })
    : "";
  const n = cands.length;
  return `Thin — ${n} claim${n === 1 ? "" : "s"}${when ? `, none newer than ${when}` : ""}.`;
}

// ── the verbatim ceiling (F11) ──────────────────────────────────────────────
/** The longest run of consecutive words the answer shares with any candidate.
 *  Measured rather than trusted: a prompt clause alone does not stop a model
 *  that has decided quoting is easier than composing. */
export function longestVerbatimRun(answer: string, sources: string[]): number {
  const words = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  const a = words(answer);
  if (a.length === 0) return 0;
  let best = 0;
  for (const src of sources) {
    const b = words(src);
    if (b.length === 0) continue;
    // Longest common substring, two rows at a time. The texts here are short
    // enough that O(n·m) is fine and a clear implementation beats a clever one.
    let prev = new Array<number>(b.length + 1).fill(0);
    let cur = new Array<number>(b.length + 1).fill(0);
    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : 0;
        if (cur[j] > best) best = cur[j];
      }
      const swap = prev;
      prev = cur;
      cur = swap;
      cur.fill(0);
    }
  }
  return best;
}

/** True when the answer leans on pasted language beyond the ceiling without
 *  presenting it as a quotation. */
export function violatesVerbatim(answer: string, sources: string[]): boolean {
  if (/[“"]/.test(answer)) {
    // Quoted material is allowed — measure only what sits outside quotes.
    const unquoted = answer.replace(/[“"][^”"]*[”"]/g, " ");
    return longestVerbatimRun(unquoted, sources) > VERBATIM_MAX_WORDS;
  }
  return longestVerbatimRun(answer, sources) > VERBATIM_MAX_WORDS;
}

// ── the contract ────────────────────────────────────────────────────────────
export const SYSTEM = `You answer a question using ONLY the numbered claims you are given. Each claim carries who said it, when, and what kind of statement it is.

COMPOSE, NEVER DUMP
Write ${ANSWER_SENTENCES[0]} to ${ANSWER_SENTENCES[1]} sentences in one voice, explaining a position. Do not stitch other people's sentences together. Never reproduce more than ${VERBATIM_MAX_WORDS} consecutive words from a claim unless you present it as a quotation with its speaker.

COMMIT
State the position in the first sentence. "It depends" is acceptable ONLY when the record holds a genuine unresolved split — and then name the split: "The record splits — the 2024 study said entity, every deal since has gone EOR first."

DISTINGUISH
A decision outranks an opinion, and say which you are leaning on. Never present a hedged or secondhand claim as established. Where two claims conflict, name both and say which is later or better supported.

ANSWER FROM THIS RECORD ONLY
You know things about payroll, EOR, contractor management and international employment. NONE of that belongs in this answer. If the claims do not support an answer, say "${NOTHING_IN_RECORD}" and use "gaps" to name what is missing. Filling a gap from your own knowledge is the single worst thing you can do here — it is invisible to the reader and it destroys the room's usefulness. Answer from this record only.

CITE
Every substantive assertion carries a bracketed handle from the claims you were given, e.g. [7]. "citations" lists the handles you used. Never invent a handle.

REASONING
"reasoning" is the fold the operator opens: which claims you weighed and why, in plain sentences. "setAside" names claims you retrieved but did not use, with the reason.

Say again: answer from this record only.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "citations", "reasoning", "setAside", "confidence", "gaps"],
  properties: {
    answer: { type: "string" },
    citations: { type: "array", maxItems: 20, items: { type: "integer" } },
    reasoning: { type: "string" },
    setAside: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["n", "why"],
        properties: { n: { type: "integer" }, why: { type: "string" } },
      },
    },
    confidence: { type: "string", enum: ["firm", "mixed", "thin"] },
    gaps: { type: "array", maxItems: 3, items: { type: "string" } },
  },
} as const;

/** Candidates as the model sees them — numbered, with everything it needs to
 *  weigh one against another. */
export function renderCandidates(
  cands: Candidate[],
  docLabel: Map<string, string>,
): string {
  return cands
    .map((c, i) => {
      const d = docLabel.get(c.claim.docId) ?? "";
      const when = c.claim.saidAt.slice(0, 10);
      return `[${i + 1}] "${c.claim.text}"\n    — ${c.claim.speaker || "unknown"}${
        d ? ` · ${d}` : ""
      } · ${when} · ${c.claim.kind} · ${c.claim.confidence}`;
    })
    .join("\n");
}

export function sanitizeAnswer(raw: unknown, maxHandle: number): Answer {
  const r = (raw ?? {}) as Record<string, unknown>;
  const s = (v: unknown, max: number) =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  const handles = (Array.isArray(r.citations) ? r.citations : [])
    .map((n) => (typeof n === "number" ? Math.trunc(n) : 0))
    // A handle outside the supplied range is a fabrication, not a citation.
    .filter((n) => n >= 1 && n <= maxHandle)
    .slice(0, 20);
  const conf = ["firm", "mixed", "thin"].includes(r.confidence as string)
    ? (r.confidence as Answer["confidence"])
    : "thin";
  return {
    answer: s(r.answer, 4000),
    citations: [...new Set(handles)],
    reasoning: s(r.reasoning, 4000),
    setAside: (Array.isArray(r.setAside) ? r.setAside : [])
      .map((x) => {
        const o = (x ?? {}) as Record<string, unknown>;
        const n = typeof o.n === "number" ? Math.trunc(o.n) : 0;
        return { n, why: s(o.why, 240) };
      })
      .filter((x) => x.n >= 1 && x.n <= maxHandle && x.why)
      .slice(0, 10),
    confidence: conf,
    gaps: (Array.isArray(r.gaps) ? r.gaps : [])
      .map((g) => s(g, 200))
      .filter(Boolean)
      .slice(0, 3),
  };
}

export async function runSynthesis(input: {
  question: string;
  candidates: Candidate[];
  docLabel: Map<string, string>;
  plan: QueryPlan;
  priorContext?: { question: string; answer: string } | null;
}): Promise<{ answer: Answer; model: string }> {
  if (!synthAvailable()) throw new Error("No API key configured — the answer is off.");
  if (input.candidates.length === 0)
    return { answer: { ...EMPTY_ANSWER, answer: NOTHING_IN_RECORD }, model: "" };

  const client = new Anthropic({ timeout: 120_000, maxRetries: 1 });
  const model = modelFor(input.candidates, input.plan);
  const rendered = renderCandidates(input.candidates, input.docLabel);

  // A follow-up may carry the previous exchange to interpret the new question —
  // never as evidence for the new answer (I.2, "not a chat").
  const prior = input.priorContext
    ? `\n\nPRIOR CONTEXT (for interpreting the question only — NOT evidence)\nQ: ${input.priorContext.question}\nA: ${input.priorContext.answer}\n`
    : "";

  const call = () =>
    client.messages.create({
      model,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      output_config: {
        format: {
          type: "json_schema",
          schema: SCHEMA as unknown as Record<string, unknown>,
        },
      },
      messages: [
        {
          role: "user",
          content: `CLAIMS\n${rendered}${prior}\n\nQUESTION\n${input.question}`,
        },
      ],
    } as Anthropic.MessageCreateParamsNonStreaming);

  const read = (res: Anthropic.Message) =>
    res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

  let parsed: unknown = {};
  try {
    parsed = JSON.parse(read(await call()));
  } catch {
    return { answer: EMPTY_ANSWER, model };
  }
  let answer = sanitizeAnswer(parsed, input.candidates.length);

  // One regeneration when the answer leaned on pasted language (F11).
  const sources = input.candidates.map((c) => c.claim.text);
  if (answer.answer && violatesVerbatim(answer.answer, sources)) {
    try {
      const res2 = await client.messages.create({
        model,
        max_tokens: 4096,
        thinking: { type: "adaptive" },
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        output_config: {
          format: {
            type: "json_schema",
            schema: SCHEMA as unknown as Record<string, unknown>,
          },
        },
        messages: [
          {
            role: "user",
            content: `CLAIMS\n${rendered}${prior}\n\nQUESTION\n${input.question}\n\nYour previous attempt reproduced more than ${VERBATIM_MAX_WORDS} consecutive words from a claim without quoting it. Write the answer in your own words this time.`,
          },
        ],
      } as Anthropic.MessageCreateParamsNonStreaming);
      answer = sanitizeAnswer(JSON.parse(read(res2)), input.candidates.length);
    } catch {
      // keep the first answer rather than losing it
    }
  }

  // An answer with no resolvable citation is not an answer (C2).
  if (answer.answer && answer.citations.length === 0)
    return {
      answer: { ...answer, answer: NOTHING_IN_RECORD, confidence: "thin" },
      model,
    };

  return { answer, model };
}
