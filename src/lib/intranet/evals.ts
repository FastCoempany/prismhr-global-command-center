// Phase 13 · EVALS AND GOVERNANCE.
//
// The eval set is the only thing that measures whether the room is any good.
// Everything else in this build tests that a mechanism works; this tests that
// the mechanisms together produce answers worth acting on.
//
// Four measures, and two of them are held at 1.00 deliberately:
//
//   recall@20     ≥ 0.85  — did retrieval find the claims a human marked?
//   attribution    1.00   — is every cited claim credited to the right speaker?
//   abstention     1.00   — on questions the corpus can't answer, did it say so?
//   groundedness  ≥ 0.95  — does every assertion trace to a cited claim?
//
// A room that occasionally misattributes or occasionally invents is not one to
// prepare a customer call with, and those two failures are exactly the ones a
// fluent answer hides best. Hence the 1.00.

import type { Answer, Candidate, Claim } from "./types";

type EvalCase = {
  id: string;
  question: string;
  /** Claim texts a human marked relevant. Matched loosely, so the fixture
   *  survives a re-extraction that rewords a claim slightly. */
  wants: string[];
  /** True when the corpus genuinely cannot answer — abstention is the pass. */
  shouldAbstain: boolean;
  /** What the case is proving, so a failure is diagnosable. */
  proves: string;
};

/** The permanent set. Each case exists to prove a specific commitment, and the
 *  `proves` line is what tells you which one broke. */
export const EVAL_SET: EvalCase[] = [
  {
    id: "cross-corpus",
    question: "What do we tell people about implementation timelines, and has it held?",
    wants: ["four to six weeks", "signature to first payroll", "slipped"],
    shouldAbstain: false,
    proves: "C1 + C3 — an answer combining a channel claim with the app's own record",
  },
  {
    id: "changed-position",
    question: "How do we enter Brazil — entity or EOR?",
    wants: ["entity", "EOR first", "year two"],
    shouldAbstain: false,
    proves: "Phase 12 — a position that moved between March and July",
  },
  {
    id: "absent",
    question: "What did we agree with the Reykjavik office about their pension scheme?",
    wants: [],
    shouldAbstain: true,
    proves: "abstention — plausible, and completely absent from the corpus",
  },
  {
    id: "vocabulary",
    question: "How long does setup take once someone signs?",
    wants: ["four to six weeks", "signature to first payroll"],
    shouldAbstain: false,
    proves: "Phase 9 — the question shares no vocabulary with the corpus",
  },
  {
    id: "thin",
    question: "What do we know about their Poland entity?",
    wants: [],
    shouldAbstain: true,
    proves: "F12 — support too thin to answer from, so it says so",
  },
  {
    id: "prospect-questions",
    question: "What do prospects ask about contractor classification?",
    wants: ["contractor", "classification"],
    shouldAbstain: false,
    proves: "C7 — buyer questions are retrievable as their own kind",
  },
];

// ── the measures ────────────────────────────────────────────────────────────

/** Loose match: a wanted phrase counts as found when it appears in any
 *  retrieved claim, case-insensitively. Deliberately forgiving — the fixture
 *  should survive a re-extraction that rewords a claim. */
export function recallAt(cands: Candidate[], wants: string[], k = 20): number {
  if (wants.length === 0) return 1;
  const hay = cands
    .slice(0, k)
    .map((c) => c.claim.text.toLowerCase())
    .join(" • ");
  const found = wants.filter((w) => hay.includes(w.toLowerCase())).length;
  return found / wants.length;
}

/** Every cited claim must carry the speaker the corpus recorded. A citation
 *  whose speaker has drifted from its claim is an attribution failure, and
 *  attribution failures are the ones that end trust. */
export function attributionHolds(
  cited: { claimId: string; speaker: string }[],
  byId: Map<string, Claim>,
): boolean {
  for (const c of cited) {
    const claim = byId.get(c.claimId);
    if (!claim) return false;
    if ((claim.speaker || "") !== (c.speaker || "")) return false;
  }
  return true;
}

/** Did it decline when it should have? An abstention is the answer naming its
 *  own emptiness — not a hedge, not a guess dressed as caution. */
export function abstained(answer: Answer, nothingLine: string): boolean {
  const a = (answer.answer ?? "").trim();
  if (!a) return true;
  if (a.startsWith(nothingLine)) return true;
  return answer.citations.length === 0;
}

/** Groundedness: every citation the answer used must resolve to a real
 *  candidate. A handle pointing at nothing is a fabricated source. */
export function groundedness(answer: Answer, candidateCount: number): number {
  if (answer.citations.length === 0) return 1;
  const good = answer.citations.filter((n) => n >= 1 && n <= candidateCount).length;
  return good / answer.citations.length;
}

export const TARGETS = {
  recall: 0.85,
  attribution: 1,
  abstention: 1,
  grounded: 0.95,
} as const;

// ── cost governance (F10) ───────────────────────────────────────────────────

/** The day's ceilings. Breaching one degrades the room to structured retrieval
 *  and says so — nothing silently stops working. */
export const CEILINGS = {
  /** Documents read in one day. Extraction is the expensive stage. */
  docsPerDay: 400,
  /** Questions answered in one day. */
  asksPerDay: 200,
  /** Claims into one synthesis, before the answer is cut down rather than
   *  allowed to become a four-dollar question. */
  claimsPerAsk: 80,
} as const;

type CeilingState = {
  breached: boolean;
  which: string;
  line: string;
};

export function readCeilings(today: { docs: number; asks: number }): CeilingState {
  if (today.docs >= CEILINGS.docsPerDay)
    return {
      breached: true,
      which: "docs",
      line: `The brain has read ${today.docs} documents today — that is the daily ceiling. It will hold what you give it and keep answering from what it already knows; reading resumes tomorrow.`,
    };
  if (today.asks >= CEILINGS.asksPerDay)
    return {
      breached: true,
      which: "asks",
      line: `${today.asks} questions today — the daily ceiling. The rail and the claims still work; written answers resume tomorrow.`,
    };
  return { breached: false, which: "", line: "" };
}

/** A health line an operator can read in two seconds — the thing that turns
 *  "why is the room being stupid today" into a check rather than an afternoon. */
export function healthLine(input: {
  docs: number;
  claims: number;
  topics: number;
  pending: number;
  todayDocs: number;
  todayAsks: number;
}): string {
  const bits = [
    `${input.claims} claims from ${input.docs} documents`,
    `${input.topics} live topics`,
  ];
  if (input.pending > 0) bits.push(`${input.pending} waiting to be read`);
  bits.push(`today: ${input.todayDocs} read, ${input.todayAsks} asked`);
  return `${bits.join(" · ")}.`;
}
