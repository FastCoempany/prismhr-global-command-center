// The shapes the Intranet passes around. Kept separate from the Prisma models
// so the pure libs (normalize, segment, rank, time) can be unit-tested without
// a database anywhere near them.

import type { AskShape, ClaimKind, Confidence, Origin } from "./doctrine";

/** One message inside a captured conversation, after normalization. */
export type Msg = {
  speaker: string;
  /** ISO instant. Empty when the capture could not resolve one. */
  at: string;
  /** True when the timestamp was inferred rather than read (Phase 2.3c). */
  atInferred: boolean;
  body: string;
};

/** A link seen in a capture. `url` is null when Teams rendered a preview card
 *  and no href was reachable — the label is still worth keeping (I.6). */
export type CapturedLink = {
  label: string;
  url: string | null;
  seenAt: string;
};

/** What the grab reports about its own completeness (Phase 2.3d). */
export type CaptureReport = {
  messages: number;
  scrolled: number;
  oldest: string;
  /** True when scrolling stopped at the pass ceiling rather than the top. */
  ceilingHit: boolean;
};

/** A capture, normalized and ready to segment. */
export type NormalizedCapture = {
  origin: Origin;
  space: string;
  title: string;
  /** Post-redaction body. The pre-redaction text is never persisted. */
  body: string;
  msgs: Msg[];
  links: CapturedLink[];
  report: CaptureReport | null;
  checksum: string;
};

/** A coherent stretch of conversation — becomes one IntranetDoc. */
export type Segment = {
  /** Stable across re-captures: derived from the first message's identity. */
  key: string;
  msgs: Msg[];
  /** ISO instant of the first message. */
  occurredAt: string;
  speakers: string[];
  body: string;
};

/** A claim as the extractor returns it, before it reaches the database. */
export type DraftClaim = {
  text: string;
  speaker: string;
  kind: ClaimKind;
  confidence: Confidence;
  entities: string[];
  /** Prospect questions only (C7). */
  askShape: AskShape | "";
  /** What prompted the buyer to ask — prospect questions only (C7). */
  prompted: string;
  /** The exact source span. A claim whose quote can't be found is dropped. */
  quote: string;
};

export type ExtractResult = {
  summary: string;
  claims: DraftClaim[];
  topicMatches: string[];
  topicProposals: { label: string; why: string }[];
  linkRefs: { label: string; why: string }[];
};

/** A claim with everything retrieval and synthesis need. */
export type Claim = {
  id: string;
  docId: string;
  text: string;
  speaker: string;
  saidAt: string;
  kind: ClaimKind;
  confidence: Confidence;
  entities: string[];
  topicIds: string[];
  askShape: string;
  offsetStart: number;
  offsetEnd: number;
  supersededBy: string;
  disputedWith: string[];
};

/** A topic node. `parentId` empty = top level; depth is uncapped. */
export type Topic = {
  id: string;
  label: string;
  parentId: string;
  summary: string;
  status: "pending" | "live" | "merged";
  mergedInto: string;
  docCount: number;
  claimCount: number;
  firstSeen: string;
  lastSeen: string;
};

/** The document a claim came from, as citations need it. */
export type DocRef = {
  id: string;
  origin: Origin | string;
  originRef: string;
  space: string;
  title: string;
  accountId: string;
  occurredAt: string;
  /** C6 — the app row went away; the memory did not. */
  originGone: string;
};

/** What the planner decided to look for (Phase 9.3). */
export type QueryPlan = {
  intent: "lookup" | "comparative" | "counterfactual" | "status" | "enumerate";
  topicIds: string[];
  entities: string[];
  /** Probes in the CORPUS's language, not the operator's. */
  phrases: string[];
  timeframe: { from: string; to: string } | null;
  /** Null unless the operator explicitly asked for a source (C1). */
  originHint: string[] | null;
  needsRecent: boolean;
  hardness: "routine" | "hard";
};

/** Which road found a candidate — shown in the fold (Phase 9.7). */
export type Road = "topic" | "entity" | "lexical" | "semantic";

export type Candidate = {
  claim: Claim;
  roads: Road[];
  lexicalRank: number;
  /** How many DISTINCT documents carry the same assertion. */
  corroboration: number;
  score: number;
};

export type Coverage = {
  claims: number;
  docs: number;
  from: string;
  to: string;
  origins: string[];
};

export type Answer = {
  answer: string;
  citations: number[];
  reasoning: string;
  setAside: { n: number; why: string }[];
  confidence: "firm" | "mixed" | "thin";
  gaps: string[];
};
