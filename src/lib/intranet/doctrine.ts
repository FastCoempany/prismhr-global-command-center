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
// Claude is the parent brain. Opus 5 carries every judgment; Fable 5 escalates
// when the record is large or contradicts itself. OPUS OR BETTER, ALWAYS —
// founder-decreed 2026-07-31: Haiku is never a model this room uses, and
// neither is Sonnet. A later "cost saving" that quietly downgrades the room
// fails the doctrine test. This is the ONE roster app-wide (canonized
// 2026-09-25 — CLAUDE.md, Other standing decrees :592-595): every caller
// that reaches a model reads its slot here, and no module carries a model
// id of its own.
const OPUS = "claude-opus-5";
const FABLE = "claude-fable-5";

// The Intranet's own slots.
export const MODEL_EXTRACT = OPUS;
export const MODEL_PLAN = OPUS;
export const MODEL_SYNTH = OPUS;
export const MODEL_SYNTH_HARD = FABLE;
export const MODEL_TOPIC = OPUS;
export const MODEL_SEGMENT = OPUS;

// The rest of the app's callers, one slot each.
/** The paste read — aiCleanTimeline (src/lib/intel/ai-clean.ts). */
export const MODEL_READ = OPUS;
/** The Chute's PDF and image transcriber (src/app/room/actions.ts). */
export const MODEL_TRANSCRIBE = OPUS;
/** The Act Lane's draft desk (src/app/accounts/draft-actions.ts). */
export const MODEL_DRAFT = OPUS;
/** The on-demand deep research pass (src/lib/intel/deep-research.ts). */
export const MODEL_RESEARCH = OPUS;
/** The ask minter (src/lib/intel/ask-mint.ts). */
export const MODEL_ASKS = OPUS;
/** The second record's distillation and its refuter (src/lib/activity/distill.ts). */
export const MODEL_DISTILL = OPUS;
export const MODEL_REFUTE = OPUS;
/** The wire sweep (src/lib/groundwork/wire.ts). */
export const MODEL_WIRE = OPUS;
/** The partner room's follow-up draft (src/app/partners/actions.ts). */
export const MODEL_PARTNER_DRAFT = OPUS;

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
  // the second record's digests — rollup + gems, never staged bodies
  "activity",
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
