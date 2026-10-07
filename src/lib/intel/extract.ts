// The Deal Intel engine — Phase 1. Pure, deterministic: given one account's
// docs (the single account read's, src/lib/record/read.ts: notes, filed
// activities, sheet lines, the touch log, plus the digest seed), emit
// DealIntel. Derived at render, never stored — always exactly as fresh as the
// latest paste. The read builds the docs (src/lib/record/docs.ts); the corpus
// assembler that used to live here, corpusFor, retired with its last caller
// (pass 8 housekeeping).

import {
  COMMERCIAL_TERMS,
  HEADCOUNT,
  INCUMBENTS,
  PRODUCT_TERMS,
  URGENCY,
  countriesIn,
  countryNear,
} from "./lexicon";
import type { DigestEntry } from "./digest";
import {
  EMPTY_INTEL,
  type DealIntel,
  type EntryFacts,
  type ProductKey,
  type SourcedFact,
  type TapedFact,
} from "./types";

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

// Deadlines bias FORWARD (unlike sf-timeline's past-biased resolveDay):
// "by August 6" seen on July 25 means THIS Aug 6; seen in September it means
// next year's.
function futureDay(mon: string, day: number, ref: Date): string | undefined {
  const m = MONTHS[mon.slice(0, 3).toLowerCase()];
  if (!m || day < 1 || day > 31) return undefined;
  let y = ref.getUTCFullYear();
  const candidate = Date.UTC(y, m - 1, day);
  if (candidate < ref.getTime() - 86_400_000) y += 1;
  return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// The sentence an urgency phrase sits in, and the date that sentence states.
// A record is written in paragraphs and line-broken notes, so a "sentence"
// ends at .!? OR a newline — without the newline rule a bulleted note is one
// sentence from top to bottom and the containment check buys nothing.
const SENT_EDGE = /[.!?\n]/;
export function dateNear(text: string, at: number, ref: Date): string | undefined {
  const s = text ?? "";
  let from = at;
  while (from > 0 && !SENT_EDGE.test(s[from - 1]!)) from--;
  let to = at;
  while (to < s.length && !SENT_EDGE.test(s[to]!)) to++;
  const sentence = s.slice(from, to);
  // "by August 6", "August 6th", "Aug 6" — the preposition is optional, the
  // ordinal suffix is noise.
  const m =
    /\b(?:by\s+)?(?:early |late |end of )?([A-Z][a-z]{2,8})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/.exec(
      sentence,
    );
  return m ? futureDay(m[1], Number(m[2]), ref) : undefined;
}

export type CorpusDoc = {
  text: string;
  at: string; // ISO
  src: string; // "sf-activity 7/21" | "note 7/24" | …
  direction?: "in" | "out";
  people?: string[];
  /** Who wrote it, as the actors column names them (RecordDoc's own field);
   *  read only off an inbound doc, so it is always theirs here. */
  sender?: string;
  /** A raw call transcript. The tape is every voice in the room at once,
   *  including our own demo narration, so a fact appearing ONLY there is
   *  speech rather than a deal fact — the same line the outcomes reader
   *  already draws between the tape and the read's distillation of it. */
  tape?: boolean;
  /** The deal facts the row's Filing stated, when the read handed them; the
   *  regex is not run on a row the model already read (§2.1). */
  facts?: EntryFacts | null;
};

// ── countries, products, headcounts: one reader (pass 9 seam, S-20) ────────
// The deal facts gave three answers for countries and two for products across
// surfaces (pass 8 X3): the extractor ranked the tape behind the reads for
// countries and headcounts but counted it for products; the account read's
// field 18 carried the tape flagged and the seed last; the meter's
// countries-known rule re-scanned any doc, tape included; the drawer filtered
// to rows whose source was not a transcript. One reader now, and every
// surface reads it through the account read: dealFacts states every fact the
// record holds with the tape flag (field 18), and factAnswer is the one tape
// rule — the facts the reads state, the seed among them, and the tape's only
// when no read states one. A country spoken only on a demo is usually our own
// product narration (XCEL HR's Brazil and the Netherlands, Infiniti HR's
// Canada, 2026-09-08), and a number said out loud is as often a hypothetical
// as a fact (Infiniti HR's "50 workers" was Javier walking through an if,
// where the reads hold one worker in Puerto Rico and about three in Mexico);
// a product named on a demo is the suite being walked through. The tape
// still speaks when nothing else does, ranked behind, never dropped. The record outranks the seed (the Ted doctrine), so
// the seed's facts come after every doc's.

/** The product key a Playbook product name reads as, through the lexicon:
 *  "contractor plus" before "contractor", as the docs' own scan orders them. */
function productKeyOf(name: string): ProductKey | null {
  for (const key of Object.keys(PRODUCT_TERMS) as ProductKey[]) {
    if (key === "contractor" && PRODUCT_TERMS.contractor_plus.test(name)) continue;
    if (PRODUCT_TERMS[key].test(name)) return key;
  }
  return null;
}

function pushFact<T>(
  list: TapedFact<T>[],
  value: T,
  doc: { src: string; at: string },
  tape: boolean,
  eq: (a: T, b: T) => boolean,
): void {
  if (!list.some((f) => eq(f.value, value)))
    list.push({ value, src: doc.src, at: doc.at, tape });
}

const sameHc = (a: { n: number; country?: string }, b: { n: number; country?: string }) =>
  a.n === b.n && a.country === b.country;
const same = <T>(a: T, b: T) => a === b;

export type DealFacts = {
  countries: TapedFact<string>[];
  products: TapedFact<ProductKey>[];
  headcounts: TapedFact<{ n: number; country?: string }>[];
};

/** Every country, product and headcount the docs state, with the tape flag:
 *  a row's Filing facts when it has them, the lexicon's regex otherwise, the
 *  reads first and the tape after (so a fact both state is credited to the
 *  read), then the seed. Docs run newest first. */
export function dealFacts(
  docs: readonly CorpusDoc[],
  seed?: Partial<Pick<DealIntel, "countries" | "products" | "headcounts">> | null,
): DealFacts {
  const countries: DealFacts["countries"] = [];
  const products: DealFacts["products"] = [];
  const headcounts: DealFacts["headcounts"] = [];
  const ordered = [...docs.filter((d) => !d.tape), ...docs.filter((d) => d.tape)];
  for (const doc of ordered) {
    const tape = !!doc.tape;
    if (doc.facts) {
      // The Filing's own facts: the model named them per entry and the
      // sanitizer clamped them to the lexicon (§2.1). The model's read of an
      // entry is a read, never raw speech, whichever row carries it.
      for (const name of doc.facts.countries ?? [])
        for (const c of countriesIn(name)) pushFact(countries, c, doc, false, same);
      for (const name of doc.facts.products ?? []) {
        const key = productKeyOf(name);
        if (key) pushFact(products, key, doc, false, same);
      }
      for (const hc of doc.facts.headcounts ?? []) {
        const country = countryNear(hc.what, 0) || undefined;
        pushFact(headcounts, { n: hc.count, country }, doc, false, sameHc);
      }
      continue;
    }
    for (const c of countriesIn(doc.text)) pushFact(countries, c, doc, tape, same);
    // Every headcount in the doc, each bound to the country NEAREST it. The
    // first-match read filed XCEL HR's ten Canadian workers against Mexico,
    // whose headcount the record says is unknown, and lost every count after
    // the first (2026-09-08).
    for (const hc of doc.text.matchAll(new RegExp(HEADCOUNT.source, "gi")))
      pushFact(
        headcounts,
        { n: Number(hc[1]), country: countryNear(doc.text, hc.index ?? 0) },
        doc,
        tape,
        sameHc,
      );
    // Every product the doc names — "contractor plus" before "contractor".
    for (const k of Object.keys(PRODUCT_TERMS) as ProductKey[]) {
      if (k === "contractor" && PRODUCT_TERMS.contractor_plus.test(doc.text)) continue;
      if (PRODUCT_TERMS[k].test(doc.text)) pushFact(products, k, doc, tape, same);
    }
  }
  // The seed fills what no doc decided — a fallback, never a lock.
  for (const f of seed?.countries ?? []) pushFact(countries, f.value, f, false, same);
  for (const f of seed?.products ?? []) pushFact(products, f.value, f, false, same);
  for (const f of seed?.headcounts ?? []) pushFact(headcounts, f.value, f, false, sameHc);
  return { countries, products, headcounts };
}

/** The one tape rule: the facts the reads (and the seed) state, and the
 *  tape's only when none does. Every surface's countries, products and
 *  headcounts are this, over the account read's field 18. */
export function factAnswer<T>(facts: readonly TapedFact<T>[]): TapedFact<T>[] {
  const read = facts.filter((f) => !f.tape);
  return read.length ? read : [...facts];
}

/** A fact without its flag, as DealIntel carries it. */
const sourced = <T>(f: TapedFact<T>): SourcedFact<T> => ({
  value: f.value,
  src: f.src,
  at: f.at,
});

// The relayed-or-direct shapes of "they owe you the next move". Exported for
// the single read (src/lib/record/read.ts), which names the promise's own
// sentence beside the extractor's flag.
export const THEIR_PROMISE_RE =
  /\b(?:will|going to|gonna|she'?ll|he'?ll|they'?ll|i'?ll)\s+(?:be in touch|reach out|get back|follow up|circle back|send|call you|contact you)|owes?\s+(?:you|us|antaeus)\b|\bOwed:.*—\s*@/i;

export function extractDealIntel(docs: CorpusDoc[], seedEntry?: DigestEntry): DealIntel {
  const intel: DealIntel = structuredClone(EMPTY_INTEL);
  const seed = seedEntry?.intelSeed;
  if (seed) {
    // The thread roster seeds up front (pushes dedupe). The SINGLE-VALUE facts
    // — chair, incumbent, timing — seed AFTER the doc loop instead: the seed
    // is a research-time snapshot, and a fresher pasted doc must be able to
    // revise it. Seeding first made those facts immutable forever. The
    // countries, products and headcounts take the seed last, in dealFacts.
    intel.threads = seed.threads
      ? { ...seed.threads, people: [...seed.threads.people] }
      : intel.threads;
  }

  // Countries, products and headcounts: the one reader and the one tape rule
  // (S-20), so the account read's field 18 and this answer agree by
  // construction.
  const facts = dealFacts(docs, seed);
  intel.countries = factAnswer(facts.countries).map(sourced);
  intel.products = factAnswer(facts.products).map(sourced);
  intel.headcounts = factAnswer(facts.headcounts).map(sourced);

  for (const doc of docs) {
    // commercial chair — docs run newest-first, so first hit = newest doc
    if (intel.chair === "undecided") {
      const ref = COMMERCIAL_TERMS.referral.test(doc.text);
      const res = COMMERCIAL_TERMS.resale.test(doc.text);
      if (ref && !res) intel.chair = "referral";
      else if (res && !ref) intel.chair = "resale";
    }
    // incumbent
    if (!intel.incumbent) {
      const hit = INCUMBENTS.find((i) => i.re.test(doc.text));
      if (hit) intel.incumbent = { value: hit.name, src: doc.src, at: doc.at };
    }
    // timing — newest urgency phrase wins, and the date must belong to it
    //
    // The date used to be scanned out of the WHOLE document, independently of
    // where the urgency phrase sat. On Simploy's 7/29 note the two landed 1,100
    // characters apart, in unrelated paragraphs:
    //
    //   …the August 6th date is Chassie's internal deadline to recommend a
    //   vendor to leadership…                                   ← the urgency
    //   …Antaeus is sending a pre-recorded version instead, by July 30th at
    //   the latest…                                             ← the date taken
    //
    // so the operator's own errand — chasing a demo recording — became the
    // deal's close date, while the decision date stated in the matching
    // sentence was never read. A date belongs to an urgency phrase only when
    // it shares a sentence with it, and a date stated plainly ("August 6th")
    // counts as much as one introduced by "by".
    if (!intel.timing) {
      const u = URGENCY.exec(doc.text);
      if (u) {
        const dateIso = dateNear(doc.text, u.index, new Date(doc.at));
        intel.timing = {
          value: { phrase: u[0], dateIso },
          src: doc.src,
          at: doc.at,
        };
      }
    }
    // threads
    for (const p of doc.people ?? [])
      if (!intel.threads.people.includes(p) && !/antaeus/i.test(p))
        intel.threads.people.push(p);
    // inbound/outbound stamps
    if (doc.direction === "in" && (!intel.lastInbound || doc.at > intel.lastInbound)) {
      intel.lastInbound = doc.at;
      // Who actually wrote — the doc's own sender, never a rollup guess.
      intel.lastInboundWho = doc.sender ?? "";
      // Their promise is an await, never a reply owed: "will be in touch",
      // "owes you information" (the closer rule's case table, 2026-08-22).
      intel.lastInboundPromise = THEIR_PROMISE_RE.test(doc.text);
    }
    if (doc.direction === "out" && (!intel.lastOutbound || doc.at > intel.lastOutbound))
      intel.lastOutbound = doc.at;
  }

  // The seed fills what no doc decided — a fallback, never a lock.
  if (seed) {
    if (intel.chair === "undecided" && seed.chair) intel.chair = seed.chair;
    if (!intel.incumbent && seed.incumbent) intel.incumbent = seed.incumbent;
    if (!intel.timing && seed.timing) intel.timing = seed.timing;
  }

  // direction (the likely product line) — derived last, from what was seen
  const has = (k: ProductKey) => intel.products.some((p) => p.value === k);
  const sources = new Set(intel.products.map((p) => p.src.split(" ")[0]));
  const conf: "high" | "medium" | "low" =
    sources.size >= 2 ? "high" : sources.size === 1 ? "medium" : "low";
  if (has("mpex"))
    intel.direction = {
      line: "MPEX licensing — they want to operate payroll",
      confidence: conf,
    };
  else if (has("eor"))
    intel.direction = {
      line: has("contractor")
        ? "EOR-led with contractor payments alongside"
        : "EOR — convert workers to employees",
      confidence: conf,
    };
  else if (has("contractor_plus"))
    intel.direction = {
      line: "Contractor Plus — agent of record with classification cover",
      confidence: conf,
    };
  else if (has("contractor"))
    intel.direction = { line: "Contractor payments", confidence: conf };
  else if (has("payroll"))
    intel.direction = { line: "Global payroll", confidence: "low" };

  return intel;
}
