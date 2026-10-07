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
import { EMPTY_INTEL, type DealIntel, type ProductKey, type SourcedFact } from "./types";

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
};

function push<T>(
  list: SourcedFact<T>[],
  value: T,
  doc: CorpusDoc,
  eq: (a: T, b: T) => boolean,
) {
  if (!list.some((f) => eq(f.value, value)))
    list.push({ value, src: doc.src, at: doc.at });
}

// The relayed-or-direct shapes of "they owe you the next move". Exported for
// the single read (src/lib/record/read.ts), which names the promise's own
// sentence beside the extractor's flag.
export const THEIR_PROMISE_RE =
  /\b(?:will|going to|gonna|she'?ll|he'?ll|they'?ll|i'?ll)\s+(?:be in touch|reach out|get back|follow up|circle back|send|call you|contact you)|owes?\s+(?:you|us|antaeus)\b|\bOwed:.*—\s*@/i;

export function extractDealIntel(docs: CorpusDoc[], seedEntry?: DigestEntry): DealIntel {
  const intel: DealIntel = structuredClone(EMPTY_INTEL);
  const seed = seedEntry?.intelSeed;
  if (seed) {
    // Additive facts seed up front (pushes dedupe). The SINGLE-VALUE facts —
    // chair, incumbent, timing — seed AFTER the doc loop instead: the seed is
    // a research-time snapshot, and a fresher pasted doc must be able to
    // revise it. Seeding first made those facts immutable forever.
    intel.countries = [...(seed.countries ?? [])];
    intel.headcounts = [...(seed.headcounts ?? [])];
    intel.products = [...(seed.products ?? [])];
    intel.threads = seed.threads
      ? { ...seed.threads, people: [...seed.threads.people] }
      : intel.threads;
  }

  // Countries the READS name — the distilled entries, filed mail, sheet lines
  // and notes. A country that appears only in a raw transcript is speech, and
  // on a demo call it is usually OUR OWN product narration: XCEL HR's report
  // carried Brazil and the Netherlands because Shane walked them through the
  // platform ("here's the Netherlands is going to show all the public
  // holidays"), and Infiniti HR carried Canada off "if I go in here to Nina in
  // Canada". Meanwhile Spain, which the read flags as the next country, was
  // nowhere (2026-09-08). The tape still speaks when nothing else does — it is
  // ranked behind, never dropped.
  const spokenOnly: CorpusDoc[] = [];
  for (const doc of docs) {
    // countries
    if (doc.tape) spokenOnly.push(doc);
    else
      for (const c of countriesIn(doc.text))
        push(intel.countries, c, doc, (a, b) => a === b);
    // headcounts — every one in the doc, each bound to the country NEAREST it
    //
    // This used to read the FIRST headcount in a document and the FIRST country
    // in that same document, two independent scans bolted together. On XCEL
    // HR's 8/13 read both countries share one sentence:
    //
    //   Immediate: Mexico (headcount TBD, must call client) and Canada —
    //   10 workers already live on payroll…
    //
    // so Canada's ten workers were filed against Mexico, whose headcount the
    // record says outright is unknown (2026-09-08). Reading only the first
    // match also lost every count after it: Infiniti HR names Puerto Rico,
    // Germany, Brazil and Mexico in one line apiece.
    // …and, like countries, only from the READS. A number said out loud on a
    // call is as often a hypothetical as a fact: Infiniti HR's Mexico row read
    // "50 workers" off Javier walking through a scenario — "if the client
    // comes in, has 50 employees in the US, 20 in Mexico" — where the fifty
    // are in the US and the whole sentence is an if. The reads hold the real
    // numbers: one worker in Puerto Rico, about three in Mexico (2026-09-08).
    if (!doc.tape)
      for (const hc of doc.text.matchAll(new RegExp(HEADCOUNT.source, "gi"))) {
        const country = countryNear(doc.text, hc.index ?? 0);
        push(
          intel.headcounts,
          { n: Number(hc[1]), country },
          doc,
          (a, b) => a.n === b.n && a.country === b.country,
        );
      }
    // products — contractor_plus checked before contractor (lexicon order)
    for (const key of Object.keys(PRODUCT_TERMS) as ProductKey[]) {
      if (key === "contractor" && PRODUCT_TERMS.contractor_plus.test(doc.text)) continue;
      if (PRODUCT_TERMS[key].test(doc.text))
        push(intel.products, key, doc, (a, b) => a === b);
    }
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

  // Nothing but the tape ever named these here, so the tape stands — a record
  // with only a transcript is still a record. This sits OUTSIDE the seed
  // branch: an account with no digest entry is exactly the one most likely to
  // have nothing but a transcript.
  if (!intel.countries.length)
    for (const doc of spokenOnly)
      for (const c of countriesIn(doc.text))
        push(intel.countries, c, doc, (a, b) => a === b);
  if (!intel.headcounts.length)
    for (const doc of spokenOnly)
      for (const hc of doc.text.matchAll(new RegExp(HEADCOUNT.source, "gi")))
        push(
          intel.headcounts,
          { n: Number(hc[1]), country: countryNear(doc.text, hc.index ?? 0) },
          doc,
          (a, b) => a.n === b.n && a.country === b.country,
        );

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
