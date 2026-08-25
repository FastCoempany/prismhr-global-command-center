// The distillation layer — the ONLY place the second record meets a model,
// and the model never gets the last word: every candidate it produces faces
// the refuter (a separate call that defaults to refute), and mechanical canon
// checks run in code before either call spends a token. Numbers never come
// from here — the schemas hold no numeric fields except citation dates, so
// every count the app renders traces to the rollup's arithmetic (§7.2).

import Anthropic from "@anthropic-ai/sdk";
import { claudeClient, claudeAvailable } from "@/lib/claude/health";
import { redactMoney } from "@/lib/intel/lexicon";
import type { Gem, GemCite } from "./stores";
import type { StagedRow } from "./types";
import { stripThreadTokens } from "./parse";

export const MODEL_DISTILL_RICH = "claude-opus-5";
export const MODEL_DISTILL_LIGHT = "claude-opus-5";
export const MODEL_REFUTE = "claude-opus-5";

export function distillAvailable(): boolean {
  return claudeAvailable();
}

// ── shared context ──────────────────────────────────────────────────────────

/** The first-record context pack, assembled server-side (run.ts) — what makes
 *  an act composable against the live relationship instead of contradicting
 *  it. Plain prose lines; both the distiller and the refuter read the same
 *  pack, so a gem can never pass on context the refuter did not see. */
export type ContextPack = {
  accountName: string;
  lines: string[];
};

const packText = (pack: ContextPack): string =>
  pack.lines.length
    ? pack.lines.map((l) => `- ${l}`).join("\n")
    : "- the first record holds nothing yet for this account";

const rowsText = (rows: StagedRow[]): string =>
  rows
    .map(
      (r) =>
        `[${r.k}] ${r.d} · ${r.lane}${r.fl ? ` (${r.fl})` : ""} · logged by ${r.a || "?"} · ${r.s}${
          r.c ? `\n    ${redactMoney(r.c).slice(0, 400)}` : ""
        }`,
    )
    .join("\n");

// ── the distiller ───────────────────────────────────────────────────────────

export type GemCandidate = {
  who: string[];
  whoKind: "colleague" | "account" | "mixed";
  what: string;
  whenDay: string;
  signal: string;
  term: string;
  act: string;
  reason: string;
  citedRowKeys: string[];
};

export type DistillResult = { gems: GemCandidate[]; whyNone: string };

const DISTILL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["gems", "whyNone"],
  properties: {
    // NOTE: the structured-output validator rejects minItems/maxItems on
    // arrays (measured 2026-08-20 — a 400 on every call). Caps live in code:
    // gems slice to three, empty citations die in the mechanical gauntlet.
    gems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "who",
          "whoKind",
          "what",
          "whenDay",
          "signal",
          "term",
          "act",
          "reason",
          "citedRowKeys",
        ],
        properties: {
          who: { type: "array", items: { type: "string" } },
          whoKind: { type: "string", enum: ["colleague", "account", "mixed"] },
          what: { type: "string" },
          whenDay: { type: "string", description: "YYYY-MM-DD, the max cited row date" },
          signal: { type: "string" },
          term: { type: "string", description: "at most two words, a label" },
          act: { type: "string", description: "imperative, six words or fewer" },
          reason: { type: "string", description: "the trigger, eight words or fewer" },
          citedRowKeys: { type: "array", items: { type: "string" } },
        },
      },
    },
    whyNone: { type: "string" },
  },
} as const;

const DISTILL_SYSTEM = `You distill a PEO account's Salesforce activity slice into at most three GEMS — findings the operator should act on today — for a command center whose writing rules are law.

THE LAWS:
- Every gem cites the row keys it stands on (the [key] markers). A claim without citations does not exist.
- whenDay is the newest cited row's date, exactly. Never a date outside the citations.
- Machinery is never a person: rows flagged (r) are engagement receipts (Seismic sessions, submitted forms, automated sends); rows flagged (a) are automated sequences. Neither is a person writing, and neither may anchor a gem alone.
- A COLLEAGUE's motion (internal people who log activities) produces a coordination act — ask, loop in, compare notes with that colleague. An ACCOUNT PERSON's motion produces an outreach act — reach them directly. Mixed threads pick the door the operator can act on.
- The act line: imperative mood, six words or fewer, no deadline, no hedging ("consider", "may be worth" are banned), no em-dash asides. The reason line carries the trigger — a date, a thread, a promise — eight words or fewer.
- term: at most two words, uppercase-friendly, a label that opens to the evidence.
- Never contradict the FIRST RECORD lines provided: if the operator already answered, met, or wrote, the act must build on that, not re-ask it. Weave the first record in where it sharpens the reason.
- Money figures never appear anywhere in your output.
- A need is either internal (the PEO's own) or a client's — never "their own book". Nothing is "X-shaped".
- Never name the operator themself as a person to reach or coordinate with — their motion IS the first record.
- If nothing clears the bar, return zero gems and say precisely why in whyNone (one sentence). An honest empty beats a stretched find.`;

export async function runDistill(inp: {
  accountName: string;
  rows: StagedRow[];
  rollupText: string;
  pack: ContextPack;
  rich: boolean;
  /** Set on the one retry (§3.7.2): the named failure of the first pass. */
  retryNote?: string;
}): Promise<DistillResult> {
  if (!distillAvailable()) throw new Error("No API key configured.");
  const client = claudeClient({ timeout: 120_000, maxRetries: 1 });
  const user = `ACCOUNT: ${inp.accountName}

THE ROLLUP (arithmetic, already verified):
${inp.rollupText}

THE FIRST RECORD (the operator's own, newest first):
${packText(inp.pack)}

THE SLICE (each row leads with its citation key):
${rowsText(inp.rows)}${inp.retryNote ? `\n\nRETRY: ${inp.retryNote}` : ""}`;

  const res = await client.messages.create({
    model: inp.rich ? MODEL_DISTILL_RICH : MODEL_DISTILL_LIGHT,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: [
      { type: "text", text: DISTILL_SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    output_config: {
      format: {
        type: "json_schema",
        schema: DISTILL_SCHEMA as unknown as Record<string, unknown>,
      },
    },
    messages: [{ role: "user", content: user }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  try {
    const raw = JSON.parse(text) as DistillResult;
    return {
      gems: Array.isArray(raw.gems)
        ? raw.gems.slice(0, 3).map((g) => ({
            ...g,
            who: Array.isArray(g.who) ? g.who.slice(0, 4) : [],
            citedRowKeys: Array.isArray(g.citedRowKeys) ? g.citedRowKeys : [],
          }))
        : [],
      whyNone: String(raw.whyNone ?? ""),
    };
  } catch {
    return { gems: [], whyNone: "the distiller's answer did not parse" };
  }
}

// ── the refuter ─────────────────────────────────────────────────────────────

export type RefuteResult = {
  refuted: boolean;
  failedCheck: string;
  why: string;
  verifiedDates: string[];
};

const REFUTE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["refuted", "failedCheck", "why", "verifiedDates"],
  properties: {
    refuted: { type: "boolean" },
    failedCheck: {
      type: "string",
      enum: [
        "",
        "who-real",
        "when-true",
        "not-machinery",
        "act-grounded",
        "door-correct",
      ],
    },
    why: { type: "string" },
    verifiedDates: { type: "array", items: { type: "string" } },
  },
} as const;

const REFUTE_SYSTEM = `You are the refuter. A distiller proposed a "gem" — an actionable finding on a PEO account — and your job is to KILL it unless it survives every check. Default to refuted when uncertain.

THE CHECKS (fail any one → refuted, name it in failedCheck):
1. who-real — every named person appears in the cited rows' text or the roster provided, on the side the gem claims (colleague vs account person). An unresolved or wrong-side name kills it.
2. when-true — the gem's date equals the newest cited row's date. A date not present in the citations kills it.
3. not-machinery — no cited row is a blast receipt, an engagement receipt (flag r), an automated sequence row (flag a), or machinery-assigned. "They engaged!" standing on an automated receipt alone kills it.
4. act-grounded — the act follows from the cited rows PLUS the first-record lines. An act the first record already answered (the reply landed, the meeting happened, the operator already wrote today about this) kills it.
5. door-correct — a coordination act names colleagues; an outreach act names account people; a mixed thread's act picks a door the operator can actually walk through.

Echo the citation dates you verified into verifiedDates. Keep why to one sentence.`;

export async function runRefute(inp: {
  accountName: string;
  gem: GemCandidate;
  citedRows: StagedRow[];
  pack: ContextPack;
  colleagues: string[];
  accountPeople: string[];
}): Promise<RefuteResult> {
  if (!distillAvailable()) throw new Error("No API key configured.");
  const client = claudeClient({ timeout: 120_000, maxRetries: 1 });
  const user = `ACCOUNT: ${inp.accountName}

THE GEM CANDIDATE:
${JSON.stringify(inp.gem, null, 2)}

THE CITED ROWS (verbatim from staging):
${rowsText(inp.citedRows)}

THE FIRST RECORD:
${packText(inp.pack)}

ROSTER — colleagues: ${inp.colleagues.join("; ") || "none named"}
ROSTER — account people: ${inp.accountPeople.join("; ") || "none named"}`;

  const res = await client.messages.create({
    model: MODEL_REFUTE,
    max_tokens: 2048,
    thinking: { type: "adaptive" },
    system: [{ type: "text", text: REFUTE_SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: {
      format: {
        type: "json_schema",
        schema: REFUTE_SCHEMA as unknown as Record<string, unknown>,
      },
    },
    messages: [{ role: "user", content: user }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  try {
    const raw = JSON.parse(text) as RefuteResult;
    return {
      refuted: Boolean(raw.refuted),
      failedCheck: String(raw.failedCheck ?? ""),
      why: String(raw.why ?? ""),
      verifiedDates: Array.isArray(raw.verifiedDates)
        ? raw.verifiedDates.map(String)
        : [],
    };
  } catch {
    // An unparseable refutation is a refutation — the default is death.
    return {
      refuted: true,
      failedCheck: "",
      why: "the refuter's answer did not parse",
      verifiedDates: [],
    };
  }
}

/** A surviving candidate becomes a stored Gem, cites resolved from staging. */
export function gemFromCandidate(inp: {
  cand: GemCandidate;
  rowsByKey: Map<string, StagedRow>;
  dropSha: string;
  createdDay: string;
}): Gem {
  const cites: GemCite[] = inp.cand.citedRowKeys
    .map((k) => inp.rowsByKey.get(k))
    .filter((r): r is StagedRow => Boolean(r))
    .map((r) => ({
      k: r.k,
      day: r.d,
      who: r.a,
      subject: stripThreadTokens(r.s),
    }));
  return {
    dropSha: inp.dropSha,
    verdict: "CONFIRMED",
    createdDay: inp.createdDay,
    actedDay: "",
    who: inp.cand.who,
    whoKind: inp.cand.whoKind,
    term: inp.cand.term,
    what: inp.cand.what,
    whenDay: inp.cand.whenDay,
    signal: inp.cand.signal,
    act: inp.cand.act,
    reason: inp.cand.reason,
    cites,
  };
}
