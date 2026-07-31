// The Intranet's doctrine, as code. Every constant the build reads lives here,
// so a change of mind is one line rather than a hunt — and so a test can assert
// the room still is what the founder asked for.
//
// The full reasoning is in docs/intranet-research-room.md. The short version:
//
//   C1  source is provenance, never partition
//   C2  the answer is written, not surfaced
//   C3  the app's own record is in the brain, whole
//   C4  people are never entities — speakers are provenance only
//   C5  short and decisive, with the reasoning behind a fold
//   C6  nothing ever leaves the brain
//   C7  prospect questions are first-class intelligence

// ── the model roster ────────────────────────────────────────────────────────
// Claude is the parent brain. Opus 5 carries every judgment that matters;
// Fable 5 escalates when the record is large or contradicts itself; Haiku does
// only mechanical work. A later "cost saving" that quietly downgrades the room
// fails the doctrine test.
export const MODEL_EXTRACT_RICH = "claude-opus-5";
export const MODEL_EXTRACT_LIGHT = "claude-haiku-4-5";
export const MODEL_PLAN = "claude-opus-5";
export const MODEL_SYNTH = "claude-opus-5";
export const MODEL_SYNTH_HARD = "claude-fable-5";
export const MODEL_TOPIC = "claude-opus-5";
export const MODEL_SEGMENT = "claude-haiku-4-5";

// ── the thresholds ──────────────────────────────────────────────────────────
/** Documents that must want a proposed topic before it joins the rail. */
export const TOPIC_PROMOTE_AT = 3;
/** Claims in a topic before a split is even considered. */
export const TOPIC_SPLIT_AT = 40;
/** Smallest group that earns its own child topic. */
export const TOPIC_CHILD_MIN = 5;
/** Most children one split may produce — more means the split was wrong. */
export const TOPIC_CHILD_MAX = 6;
/** Claims into synthesis before the answer escalates to the harder brain. */
export const CANDIDATE_CAP = 60;
/** The decisive range, in sentences. */
export const ANSWER_SENTENCES: readonly [number, number] = [3, 6];
/** Longest verbatim run allowed in an answer without being marked a quotation. */
export const VERBATIM_MAX_WORDS = 25;
/** Messages before a chat segment is forced to break. */
export const SEGMENT_MSG_CAP = 60;
/** Minutes of silence that open a new conversation. */
export const SEGMENT_GAP_MINUTES = 90;
/** Claim pairs must be at least this far apart to be a contradiction. */
export const CONTRADICTION_MIN_DAYS = 14;

/** C6 — nothing is ever deleted. Asserted by the doctrine test. */
export const NOTHING_DELETED = true;

// ── the vocabulary ──────────────────────────────────────────────────────────
export const CLAIM_KINDS = [
  "fact",
  "decision",
  "commitment",
  "opinion",
  "question",
  "process",
  "prospect-question",
] as const;
export type ClaimKind = (typeof CLAIM_KINDS)[number];

export const CONFIDENCES = ["stated", "hedged", "secondhand"] as const;
export type Confidence = (typeof CONFIDENCES)[number];

/** The shape of a prospect's ask (C7) — what kind of window it opens. */
export const ASK_SHAPES = [
  "definitional",
  "commercial",
  "risk",
  "technical",
  "process",
  "timeline",
] as const;
export type AskShape = (typeof ASK_SHAPES)[number];

export const ORIGINS = [
  // captured from outside
  "teams",
  "meeting",
  "demo",
  "paste",
  // mirrored from the app itself (C3)
  "account-note",
  "todo",
  "touch",
  "partner-note",
  "card",
  "playbook",
  "research",
  "gap",
] as const;
export type Origin = (typeof ORIGINS)[number];

/** The one topic the index is allowed to start with (C7). */
export const PROSPECT_TOPIC_LABEL = "What prospects ask";

/** The catch-up run lock's sentinel checksum. One catch-up at a time: a hard
 *  refresh mid-run must WATCH the running pass, never stack a second one on
 *  top of it — overlapping runs double-read the same entries and starve the
 *  page of connections. The sentinel row is invisible on every surface. */
export const RUN_LOCK_CHECKSUM = "brain-run-lock";

// ── ranking weights (Phase 9) ───────────────────────────────────────────────
// Nothing here references origin. That is C1, in arithmetic.
export const RANK = {
  roadAgreement: 0.34,
  lexical: 0.22,
  recency: 0.16,
  kind: 0.12,
  confidence: 0.1,
  corroboration: 0.06,
} as const;

export const KIND_WEIGHT: Record<ClaimKind, number> = {
  decision: 1,
  commitment: 0.9,
  fact: 0.85,
  "prospect-question": 0.85,
  process: 0.8,
  opinion: 0.5,
  question: 0.5,
};

export const CONFIDENCE_WEIGHT: Record<Confidence, number> = {
  stated: 1,
  hedged: 0.7,
  secondhand: 0.5,
};

/** Recency half-life in days; halved when the question wants what's latest. */
export const RECENCY_HALF_LIFE_DAYS = 120;

// ── aging (Phase 12) ────────────────────────────────────────────────────────
// Per kind, because a commitment goes stale in a month and a fact does not.
// A prospect question never ages: what a buyer asked in March is still what
// they asked.
export const AGE_DAYS: Record<ClaimKind, number> = {
  commitment: 30,
  process: 180,
  decision: 270,
  fact: 365,
  opinion: 180,
  question: 365,
  "prospect-question": Number.POSITIVE_INFINITY,
};

/** Bumped whenever the reading rubric changes; drives the full re-read. "v2"
 *  is the refounding (Part V): the liberal read against the seeded bank —
 *  everything filed under v1 gets read again onto the strong floor. */
export const PROMPT_VERSION = "v2";
