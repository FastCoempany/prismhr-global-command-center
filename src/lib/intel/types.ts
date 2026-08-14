// Shared intel types — the DealIntel contract every surface consumes.
// Derived at render by extract.ts (Phase 1); seeded per-account by digest.ts.

export type SourcedFact<T> = {
  value: T;
  src: string; // "sf-activity 7/21" | "note 7/24" | "digest 7/27" | "touch 7/25"
  at: string; // ISO date of the underlying doc
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
  lastOutbound: "",
};
