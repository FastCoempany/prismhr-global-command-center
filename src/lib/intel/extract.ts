// The Deal Intel engine — Phase 1. Pure, deterministic: given one account's
// full corpus (notes, partner notes, filed SF activities, sheet notes, touch
// log, plus the digest seed), emit DealIntel. Derived at render, never
// stored — always exactly as fresh as the latest paste.

import {
  COMMERCIAL_TERMS,
  HEADCOUNT,
  INCUMBENTS,
  PRODUCT_TERMS,
  URGENCY,
  countriesIn,
} from "./lexicon";
import { digestFor, digestForCardName, type DigestEntry } from "./digest";
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

export type CorpusDoc = {
  text: string;
  at: string; // ISO
  src: string; // "sf-activity 7/21" | "note 7/24" | …
  direction?: "in" | "out";
  people?: string[];
};

const short = (iso: string) => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};

// Assemble every store the app holds for one account into a doc list.
// Loaders' shapes are the app's own (overlay.ts): keep this signature loose
// so callers can pass exactly what they loaded.
export function corpusFor(
  accountId: string,
  accountName: string,
  stores: {
    acctNotes?: { id: string; body: string; createdAt: string; kind: string }[];
    partnerNotes?: { id: string; body: string; createdAt: string }[];
    todos?: { id: string; body: string; createdAt: string }[]; // pre-filtered to this account
    touches?: {
      subjectKey: string;
      label: string;
      contactedAt: string;
      message?: string;
      log: { at: string; body: string }[];
    }[];
  },
): CorpusDoc[] {
  const docs: CorpusDoc[] = [];
  for (const n of stores.acctNotes ?? []) {
    const isSf = /^[✉✔☎☰] /.test(n.body);
    docs.push({
      text: n.body,
      at: n.createdAt,
      src: `${isSf ? "sf-activity" : "note"} ${short(n.createdAt)}`,
      direction:
        isSf && /—\s*Antaeus/i.test(n.body.split("\n")[0] ?? "")
          ? "out"
          : isSf
            ? "in"
            : undefined,
      people: peopleIn(n.body),
    });
  }
  for (const n of stores.partnerNotes ?? [])
    docs.push({
      text: n.body,
      at: n.createdAt,
      src: `partner-note ${short(n.createdAt)}`,
    });
  for (const t of stores.todos ?? [])
    docs.push({ text: t.body, at: t.createdAt, src: `sheet ${short(t.createdAt)}` });
  for (const t of stores.touches ?? []) {
    if (t.message)
      docs.push({
        text: t.message,
        at: t.contactedAt,
        src: `touch ${short(t.contactedAt)}`,
        direction: "out",
      });
    for (const e of t.log)
      docs.push({ text: e.body, at: e.at, src: `touch-log ${short(e.at)}` });
  }
  // Digest seed rides as docs too (facts are searchable) — matched by id,
  // falling back to name alias.
  const dig = digestFor(accountId) ?? digestForCardName(accountName);
  if (dig)
    for (const f of dig.facts)
      docs.push({
        text: f,
        at: `${dig.asOf}T00:00:00Z`,
        src: `digest ${dig.asOf.slice(5)}`,
      });
  return docs.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

// "Name → Name" / "From: Name" headers inside filed activities.
function peopleIn(text: string): string[] {
  const out: string[] = [];
  const head = text.split("\n")[0] ?? "";
  const m =
    /·\s*([A-Z][\w.'-]+(?: [A-Z][\w.'-]+)+)\s*→\s*([A-Z][\w.'-]+(?: [A-Z][\w.'-]+)+)/.exec(
      head,
    );
  if (m) out.push(m[1], m[2]);
  return out;
}

function push<T>(
  list: SourcedFact<T>[],
  value: T,
  doc: CorpusDoc,
  eq: (a: T, b: T) => boolean,
) {
  if (!list.some((f) => eq(f.value, value)))
    list.push({ value, src: doc.src, at: doc.at });
}

export function extractDealIntel(docs: CorpusDoc[], seedEntry?: DigestEntry): DealIntel {
  const intel: DealIntel = structuredClone(EMPTY_INTEL);
  const seed = seedEntry?.intelSeed;
  if (seed) {
    intel.countries = [...(seed.countries ?? [])];
    intel.headcounts = [...(seed.headcounts ?? [])];
    intel.products = [...(seed.products ?? [])];
    intel.chair = seed.chair ?? "undecided";
    intel.incumbent = seed.incumbent ?? null;
    intel.timing = seed.timing ?? null;
    intel.threads = seed.threads
      ? { ...seed.threads, people: [...seed.threads.people] }
      : intel.threads;
  }

  for (const doc of docs) {
    // countries
    for (const c of countriesIn(doc.text))
      push(intel.countries, c, doc, (a, b) => a === b);
    // headcounts (first match per doc keeps noise down)
    const hc = HEADCOUNT.exec(doc.text);
    if (hc) {
      const country = countriesIn(doc.text)[0];
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
    // commercial chair — newest doc wins only if not already decided by seed
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
    // timing — newest urgency phrase wins
    if (!intel.timing) {
      const u = URGENCY.exec(doc.text);
      if (u) {
        const m = /\bby ((?:early |late |end of )?[A-Z][a-z]+(?: \d{1,2})?)/.exec(
          doc.text,
        );
        let dateIso: string | undefined;
        if (m) {
          const md = /([A-Z][a-z]{2,})[a-z]* (\d{1,2})/.exec(m[1]);
          if (md) dateIso = futureDay(md[1], Number(md[2]), new Date(doc.at));
        }
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
    if (doc.direction === "in" && (!intel.lastInbound || doc.at > intel.lastInbound))
      intel.lastInbound = doc.at;
    if (doc.direction === "out" && (!intel.lastOutbound || doc.at > intel.lastOutbound))
      intel.lastOutbound = doc.at;
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

// One call for surfaces: corpus + seed → intel.
export function dealIntelFor(
  accountId: string,
  accountName: string,
  stores: Parameters<typeof corpusFor>[2],
): DealIntel {
  const dig = digestFor(accountId) ?? digestForCardName(accountName);
  return extractDealIntel(corpusFor(accountId, accountName, stores), dig);
}
