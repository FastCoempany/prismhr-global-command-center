// Shared intel types — the DealIntel contract every surface consumes.
// Derived at render by extract.ts (Phase 1); seeded per-account by digest.ts.

import type { EntryHeadcount } from "@/lib/sf-timeline";

export type SourcedFact<T> = {
  value: T;
  src: string; // "sf-activity 7/21" | "note 7/24" | "digest 7/27" | "touch 7/25"
  at: string; // ISO date of the underlying doc
};

/** A fact with the doc it stands on and whether that doc is the tape, so a
 *  consumer can rank or exclude the tape without re-scanning (E18). */
export type TapedFact<T> = SourcedFact<T> & { tape: boolean };

/** The deal facts a Filing's read states on one entry (src/lib/sf-timeline.ts,
 *  TimelineEntry; slice 4). A row that carries them was read by the model,
 *  and its facts are taken over the regex (§2.1, §7 item 13). */
export type EntryFacts = {
  countries?: readonly string[];
  products?: readonly string[];
  headcounts?: readonly EntryHeadcount[];
};

export type ProductKey =
  | "eor"
  | "contractor"
  | "contractor_plus"
  | "payroll"
  | "mpex"
  | "wallet"
  | "tlm";

export type DealIntel = {
  countries: SourcedFact<string>[]; // iso2, deduped, newest-first
  headcounts: SourcedFact<{ n: number; country?: string }>[];
  products: SourcedFact<ProductKey>[];
  direction: { line: string; confidence: "high" | "medium" | "low" } | null;
  timing: SourcedFact<{ phrase: string; dateIso?: string }> | null;
  chair: "resale" | "referral" | "undecided";
  incumbent: SourcedFact<string> | null;
  threads: { people: string[]; execSeen: boolean; opsSeen: boolean };
  lastInbound: string;
  lastInboundWho: string; // the newest inbound doc's own author ("" unknown)
  // The newest inbound reads as THEIR promise ("will be in touch", "owes
  // you…") — an await, never a reply owed (the closer rule, 2026-08-22).
  lastInboundPromise: boolean;
  lastOutbound: string;
};

export const EMPTY_INTEL: DealIntel = {
  countries: [],
  headcounts: [],
  products: [],
  direction: null,
  timing: null,
  chair: "undecided",
  incumbent: null,
  threads: { people: [], execSeen: false, opsSeen: false },
  lastInbound: "",
  lastInboundWho: "",
  lastInboundPromise: false,
  lastOutbound: "",
};
