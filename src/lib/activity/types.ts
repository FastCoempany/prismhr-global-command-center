// Shared shapes for the Second Record — what the browser stages and what the
// server verifies are the same types, so the two halves can never drift.
// The browser does the cheap 81% (blast rows collapse to tallies and are
// never uploaded); the server does the smart 19% (the staged slices).

import type { ActivityLane } from "./classify";

/** One staged non-blast row — the citation source. Field names are short on
 *  purpose: the whole slice serializes into one bounded note body. */
export type StagedRow = {
  /** activityRowKey — dedupe identity and the gem citation handle. */
  k: string;
  /** Day key, YYYY-MM-DD — a calendar fact, never timezone-shifted. */
  d: string;
  /** Subject, verbatim (thread tokens strip at render, never here). */
  s: string;
  /** Assigned — who LOGGED it. Never read as who wrote it: on a captured
   *  email this is whose record the row hangs on, and a CC is enough. */
  a: string;
  /** Who WROTE it, read out of the email's own signature — "" when the body
   *  does not say plainly. Outranks `a` everywhere a person is named. */
  w?: string;
  lane: ActivityLane;
  /** Task Subtype / Record Type / Call Type, verbatim. */
  sub: string;
  rt: string;
  ct: string;
  /** Compact flags: "a" automated · "i" inbound call · "e" event · "r" receipt. */
  fl: string;
  /** Full Comments — money-redacted, trimmed to budget. Optional: trimming to
   *  the slice cap drops comments before it drops rows. */
  c?: string;
  /** How many rows this ONE email arrived as. Salesforce logs a send once per
   *  Contact it touches, so five recipients at an account make five rows
   *  identical in every exported column. Absent means one. */
  n?: number;
  /** The people on a logged email — the To/CC/BCC addresses, lowercased and
   *  semicolon-joined. The Assigned column names the LOGGER on these rows;
   *  this names the correspondents. Absent on rows with no scaffold. */
  p?: string;
};

/** Account-level columns the export repeats on every row — read once per
 *  account, first non-empty wins, never aggregated as if per-row (§2.3.5). */
export type SliceMeta = {
  primaryContact: string;
  /** The primary contact's address when the export carries it — "" otherwise.
   *  Seeds a draft's TO line and resolves correspondents to a name. */
  primaryContactEmail: string;
  primaryContactTitle: string;
  lastContact: string;
  /** CRM roster metadata — can be ancient (2017). Never activity data. */
  contactedDate: string;
  /** Sortable datetime keys (Chicago wall-clock), "" when absent. */
  lastEmailSentKey: string;
  lastEmailReceivedKey: string;
  gbc: string;
};

/** Blast receipts, collapsed client-side. The raw rows never upload. */
export type IntentTally = {
  /** dayKey → counts. */
  days: Record<string, { s: number; o: number; c: number }>;
  /** campaign → counts + last open day. Bounded; overflow folds into "~other". */
  camps: Record<string, { s: number; o: number; c: number; lastOpen: string }>;
  /** Engagement receipts (Seismic sessions, submitted forms, automated
   *  sends) — machinery in a human lane's clothes, counted here. */
  receipts: number;
};

export type AccountSlice = {
  id: string;
  name: string;
  meta: SliceMeta;
  /** Newest-first, capped (SLICE_ROW_CAP); dropped counts what the cap cut. */
  rows: StagedRow[];
  dropped: number;
  tally: IntentTally;
  /** Rows as the file holds them — the export's own truth. */
  laneCounts: Record<ActivityLane, number>;
  /** DISTINCT emails behind those rows. On the 2026-08-29 export the CSM lane
   *  read 49% high and the human lane 46% because one send logged as a dozen
   *  rows counted as a dozen activities (2026-08-31). */
  laneEmails: Record<ActivityLane, number>;
  rowsSum: string;
  tallySum: string;
};

export const SLICE_ROW_CAP = 300;
export const SLICE_BODY_CAP = 120_000;
export const COMMENT_CAP = 500;
export const BATCH_BYTE_CAP = 512_000;
export const CAMPAIGN_KEY_CAP = 60;

export type ManifestAccount = {
  id: string;
  name: string;
  rowsSum: string;
  tallySum: string;
  rows: number;
  humanRows: number;
};

export type DropManifest = {
  dropSha: string;
  /** Chicago day the drop happened. */
  dropDay: string;
  fileName: string;
  fileBytes: number;
  rowCount: number;
  /** Rows carrying text in Full Comments — what the drop could actually read.
   *  Zero against a large rowCount means the file came in blank. */
  textRows: number;
  dupes: number;
  window: { from: string; to: string };
  laneTotals: Record<ActivityLane, number>;
  receiptRows: number;
  accounts: ManifestAccount[];
  /** Rows whose 18 Digit ID matched no book account — counted AND named. */
  unmatched: { name: string; id18: string; rows: number }[];
  /** The colleague roster this drop derived (Appendix C). */
  colleagues: string[];
  /** Primary-contact names colliding with colleague names — UNRESOLVED. */
  collisions: string[];
  headerDiff: { missing: string[]; extra: string[] };
  totalBatches: number;
};

/** One staging post: whole account slices only — an account never splits
 *  across batches, so a lost batch loses whole accounts the manifest will
 *  name, never half a slice that could masquerade as complete. */
export type StageBatch = {
  dropSha: string;
  batchIndex: number;
  totalBatches: number;
  slices: AccountSlice[];
  /** Rides on the LAST batch only; its arrival triggers verification. */
  manifest?: DropManifest;
};

export type StageReply = {
  ok: boolean;
  reason?: string;
  /** Final batch only: the verification verdict. */
  verified?: boolean;
  missingBatches?: number[];
  mismatched?: string[];
  /** Nothing changed against the prior drop — zero writes, zero model calls. */
  unchanged?: boolean;
  /** Accounts queued for distillation / intent-only arithmetic update. */
  queued?: { distill: number; intentOnly: number };
};
