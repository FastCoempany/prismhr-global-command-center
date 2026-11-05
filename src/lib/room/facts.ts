// The HomeRoom row's facts as the F26 face says them (ship order 2026-11-04;
// docs/mockups/homeroom-f-decks-2026-11-04.html): one sentence per deal, the
// countries on the map, and the people in the deal as a deck. Pure, so the
// suite pins it and the client can import it: the page hands in the read's
// intel, its docs and the book's contacts; nothing here reads a store.
//
// Every fact carries the record line it stands on (the click-depth law), and
// a fact the record has never mentioned says so in plain words instead of
// being left blank. A fact the operator set by hand is marked as theirs, and
// ↺ puts back what the record says (the facts: store, below).

import type { DealIntel, ProductKey, SourcedFact } from "@/lib/intel/types";
import { COMMERCIAL_TERMS, COUNTRY_NAME } from "@/lib/intel/lexicon";
import {
  isClientKey,
  isPartnerKey,
  type ClientKey,
  type PartnerKey,
} from "@/lib/room/ladders";

// ── the products, in the words the sentence uses ───────────────────────────
// The five doors are employer of record, global payroll, contractor
// management, contractor of record and talent (the Playbook face, 2026-09-15).
// The reader's own keys map onto them; MPEX and time and labor are read too
// and keep their own names.
export const PRODUCT_SAY: Record<ProductKey, string> = {
  eor: "employer of record",
  payroll: "global payroll",
  contractor: "contractor management",
  contractor_plus: "contractor of record",
  mpex: "MPEX",
  tlm: "time and labor",
};

/** Some countries take "the" in a sentence. */
const TAKES_THE = new Set(["ph", "gb", "nl", "bs"]);
export const inCountry = (code: string): string =>
  `${TAKES_THE.has(code) ? "the " : ""}${COUNTRY_NAME[code] ?? code.toUpperCase()}`;

// ── the operator's own hand: the facts: store ──────────────────────────────
// One AccountNote per account under facts:<accountId>, newest wins, the way
// pipeline: and actdraft: keep their overlays. It holds reseller or referral,
// the client's name, and the countries added or removed by hand. A namespaced
// account id, so it stays out of every account view and the intranet mirror
// by construction (isNamespacedAccountId).
export const FACTS_NS = "facts:";
const HEAD = "✎ ROW FACTS";

export type Chair = "resale" | "referral" | "none";
export type HandFacts = {
  chair?: Chair;
  client?: string;
  add: string[];
  remove: string[];
  /** A stage set by hand on the partner ladder or the client ladder. */
  partner?: PartnerKey;
  stage?: ClientKey;
  /** The Chicago day each hand fact was set, by field. */
  day: Partial<
    Record<"chair" | "client" | "add" | "remove" | "partner" | "stage", string>
  >;
};
export const NO_HAND: HandFacts = { add: [], remove: [], day: {} };

const CODE = /^[a-z]{2}$/;
const codes = (v: string): string[] =>
  [
    ...new Set(
      v
        .split(",")
        .map((c) => c.trim().toLowerCase())
        .filter((c) => CODE.test(c) && COUNTRY_NAME[c]),
    ),
  ].slice(0, 30);

export function renderHandFacts(h: HandFacts): string {
  const lines = [HEAD];
  const put = (k: string, v: string, field: keyof HandFacts["day"]) =>
    lines.push(`${k}\t${v}\t${h.day[field] ?? ""}`);
  if (h.chair) put("chair", h.chair, "chair");
  if (h.client) put("client", h.client.replace(/[\t\n]+/g, " ").slice(0, 120), "client");
  if (h.add.length) put("add", h.add.join(","), "add");
  if (h.remove.length) put("remove", h.remove.join(","), "remove");
  if (h.partner) put("partner", h.partner, "partner");
  if (h.stage) put("stage", h.stage, "stage");
  return lines.join("\n");
}

export function parseHandFacts(body: string | undefined): HandFacts {
  const out: HandFacts = { add: [], remove: [], day: {} };
  const lines = (body ?? "").split("\n");
  if (lines[0]?.trim() !== HEAD) return out;
  for (const line of lines.slice(1)) {
    const [k, v = "", day = ""] = line.split("\t");
    if (k === "chair" && (v === "resale" || v === "referral" || v === "none")) {
      out.chair = v;
      out.day.chair = day;
    } else if (k === "client" && v.trim()) {
      out.client = v.trim().slice(0, 120);
      out.day.client = day;
    } else if (k === "add") {
      out.add = codes(v);
      out.day.add = day;
    } else if (k === "remove") {
      out.remove = codes(v);
      out.day.remove = day;
    } else if (k === "partner" && isPartnerKey(v) && v !== "live") {
      out.partner = v;
      out.day.partner = day;
    } else if (k === "stage" && isClientKey(v)) {
      out.stage = v;
      out.day.stage = day;
    }
  }
  return out;
}

/** The hand facts for one account, from the rows the store holds. */
export const handFactsFrom = (rows: readonly { body: string }[] | undefined): HandFacts =>
  parseHandFacts(rows?.[0]?.body);

// ── what a headcount counts (release three) ────────────────────────────────
export type HeadKind = "employee" | "contractor" | null;
const CONTRACTOR_RE = /\b(?:contractors?|freelancers?|1099s?|consultants?|contingent)\b/i;
const EMPLOYEE_RE =
  /\b(?:employees?|w-?2s?|staff|full[- ]time|hires?|headcount|on (?:their|the) payroll)\b/i;

/** Whether a count on a line counts employees or contractors: the words just
 *  after the figure first, then the whole line when it names only one kind.
 *  Null when the line does not say. */
export function headKind(line: string, n: number): HeadKind {
  const text = line ?? "";
  const at = text.search(new RegExp(`(?<![\\d.,])${n}(?![\\d.,]\\d)`));
  if (at >= 0) {
    const near = text.slice(at, at + 48);
    if (CONTRACTOR_RE.test(near)) return "contractor";
    if (EMPLOYEE_RE.test(near)) return "employee";
  }
  const c = CONTRACTOR_RE.test(text);
  const e = EMPLOYEE_RE.test(text);
  return c && !e ? "contractor" : e && !c ? "employee" : null;
}

/** The word a count takes: employees, contractors, or people when the kinds
 *  are unsaid or mixed. */
export function headWord(kinds: readonly HeadKind[], n: number): string {
  const k = kinds.length && kinds.every((x) => x === kinds[0]) ? kinds[0] : null;
  if (k === "employee") return n === 1 ? "employee" : "employees";
  if (k === "contractor") return n === 1 ? "contractor" : "contractors";
  return n === 1 ? "person" : "people";
}

// ── the sentence's facts ───────────────────────────────────────────────────
export type FactLine = { day: string; line: string };
export type RowFacts = {
  products: ({ key: ProductKey; word: string } & FactLine)[];
  chair: { v: Chair; hand: boolean } & FactLine;
  client: {
    name: string | null;
    hand: boolean;
    day: string;
    /** From the model's read (release three): the line it stands on, how
     *  sure the record is, and how many entries named it. */
    line?: string;
    sure?: "sure" | "likely" | "unsure";
    seen?: number;
  };
  countries: ({ code: string; name: string; hand: boolean } & FactLine)[];
  /** Codes the record names that the operator took off the deal by hand. */
  removed: string[];
  /** Each stated count, with what the people are when the line says so. */
  heads: ({ n: number; country: string | null; kind: HeadKind } & FactLine)[];
  /** The client's date, when the record names one with its words. */
  date: ({ iso: string | null; phrase: string } & FactLine) | null;
};

type Doc = { text: string; at: string; src: string };

const mmdd = (iso: string): string => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "numeric",
    day: "numeric",
  });
};

/** The first line of the record entry a fact stands on, or its source name. */
function lineOf(f: { src: string; at: string }, docs: readonly Doc[]): FactLine {
  const doc = docs.find((d) => d.src === f.src && d.at === f.at);
  const line =
    doc?.text
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean) ?? f.src;
  return { day: mmdd(f.at), line: line.slice(0, 160) };
}

export function buildRowFacts(args: {
  intel: DealIntel;
  docs: readonly Doc[];
  hand: HandFacts;
  todayMd: string;
  /** The client the model's read names most often (src/lib/room/client-read.ts). */
  readClient?: {
    name: string;
    sure: "sure" | "likely" | "unsure";
    seen: number;
    day: string;
    line: string;
  } | null;
}): RowFacts {
  const { intel, docs, hand } = args;
  const products = intel.products.map((f) => ({
    key: f.value,
    word: PRODUCT_SAY[f.value] ?? f.value,
    ...lineOf(f, docs),
  }));

  // The read carries the chair with no source, so the line it stands on is
  // found the way the read found it: the newest entry that names exactly one.
  let chairLine: FactLine = { day: "", line: "" };
  if (intel.chair !== "undecided") {
    const want =
      intel.chair === "resale" ? COMMERCIAL_TERMS.resale : COMMERCIAL_TERMS.referral;
    const doc = [...docs]
      .sort((a, b) => b.at.localeCompare(a.at))
      .find((d) => want.test(d.text));
    if (doc) chairLine = lineOf(doc, docs);
  }
  const readChair: Chair = intel.chair === "undecided" ? "none" : intel.chair;
  const chair = hand.chair
    ? { v: hand.chair, hand: true, day: hand.day.chair ?? args.todayMd, line: "" }
    : { v: readChair, hand: false, ...chairLine };

  const removed = hand.remove.filter((c) => intel.countries.some((f) => f.value === c));
  const countries = [
    ...intel.countries
      .filter((f) => !hand.remove.includes(f.value))
      .map((f) => ({
        code: f.value,
        name: COUNTRY_NAME[f.value] ?? f.value.toUpperCase(),
        hand: false,
        ...lineOf(f, docs),
      })),
    ...hand.add
      .filter((c) => !intel.countries.some((f) => f.value === c))
      .map((c) => ({
        code: c,
        name: COUNTRY_NAME[c] ?? c.toUpperCase(),
        hand: true,
        day: hand.day.add ?? args.todayMd,
        line: "",
      })),
  ];

  const heads = intel.headcounts.map(
    (f: SourcedFact<{ n: number; country?: string }>) => {
      const at = lineOf(f, docs);
      return {
        n: f.value.n,
        country: f.value.country ?? null,
        kind: headKind(at.line, f.value.n),
        ...at,
      };
    },
  );

  const t = intel.timing;
  const date = t
    ? { iso: t.value.dateIso ?? null, phrase: t.value.phrase, ...lineOf(t, docs) }
    : null;

  return {
    products,
    chair,
    client: hand.client
      ? { name: hand.client, hand: true, day: hand.day.client ?? args.todayMd }
      : args.readClient
        ? {
            name: args.readClient.name,
            hand: false,
            day: args.readClient.day,
            line: args.readClient.line,
            sure: args.readClient.sure,
            seen: args.readClient.seen,
          }
        : { name: null, hand: false, day: "" },
    countries,
    removed,
    heads,
    date,
  };
}

// ── how near the client's date is ──────────────────────────────────────────
// Red at 14 days or less (and once it has passed), amber within 30 or when
// the record says how urgent with no date, plain further out or unsaid.
export type DateTone = "hot" | "warm" | "cool" | "none";
const DAY = 86_400_000;
export function daysTo(iso: string, todayIso: string): number {
  return Math.round(
    (Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${todayIso}T12:00:00Z`)) / DAY,
  );
}
export function dateTone(date: RowFacts["date"], todayIso: string): DateTone {
  if (!date) return "none";
  if (!date.iso) return "warm";
  const n = daysTo(date.iso, todayIso);
  return n <= 14 ? "hot" : n <= 30 ? "warm" : "cool";
}

// ── the map's index: each country, its deals, its nearest date ─────────────
export type MapDeal = { key: string; name: string; facts: RowFacts; live: boolean };
export type MapCountry = {
  code: string;
  deals: { key: string; name: string; n: number | null }[];
  people: number;
  /** What the counted people are, one per counted deal. */
  kinds: HeadKind[];
  unsaid: number;
  tone: DateTone;
  days: number | null;
};
const TONE_RANK: Record<DateTone, number> = { hot: 3, warm: 2, cool: 1, none: 0 };

export function mapIndex(deals: readonly MapDeal[], todayIso: string): MapCountry[] {
  const by = new Map<string, MapCountry>();
  for (const d of deals) {
    if (!d.live) continue;
    const tone = dateTone(d.facts.date, todayIso);
    const days = d.facts.date?.iso ? daysTo(d.facts.date.iso, todayIso) : null;
    for (const c of d.facts.countries) {
      let e = by.get(c.code);
      if (!e) {
        e = {
          code: c.code,
          deals: [],
          people: 0,
          kinds: [],
          unsaid: 0,
          tone: "none",
          days: null,
        };
        by.set(c.code, e);
      }
      const hs = d.facts.heads.filter((h) => h.country === c.code);
      const n = hs.length ? hs.reduce((s, h) => s + h.n, 0) : null;
      e.deals.push({ key: d.key, name: d.name, n });
      if (n == null) e.unsaid++;
      else {
        e.people += n;
        e.kinds.push(...hs.map((h) => h.kind));
      }
      const nearer = tone === e.tone && days != null && (e.days == null || days < e.days);
      if (TONE_RANK[tone] > TONE_RANK[e.tone] || nearer) {
        e.tone = tone;
        e.days = days;
      }
    }
  }
  return [...by.values()].sort(
    (a, b) =>
      TONE_RANK[b.tone] - TONE_RANK[a.tone] ||
      (a.days ?? 9999) - (b.days ?? 9999) ||
      (COUNTRY_NAME[a.code] ?? a.code).localeCompare(COUNTRY_NAME[b.code] ?? b.code),
  );
}

// ── the people in the deal, as the deck holds them ─────────────────────────
export type Touch = {
  at: string;
  kind: "email" | "call" | "meeting";
  dir: "in" | "out" | "both";
};
export type DeckPerson = {
  name: string;
  title: string;
  email: string;
  phone: string;
  mobile: string;
  city: string;
  /** A LinkedIn page: the one the operator set, else a Sales Navigator
   *  alert's lead link, else null. */
  linkedin: string | null;
  /** Where the LinkedIn page came from, when there is one. */
  liFrom: "hand" | "salesnav" | null;
  /** Added to the deal by the operator's hand; the record has not named them. */
  hand: boolean;
  touches: Touch[];
};

const nameKey = (name: string): string => {
  const w = (name ?? "")
    .toLowerCase()
    .replace(/[^a-z\s'-]+/g, " ")
    .split(/\s+/)
    .filter((x) => x.length > 1);
  return w.length < 2 ? (w[0] ?? "") : `${w[0]} ${w[w.length - 1]}`;
};

type DeckDoc = {
  text: string;
  at: string;
  sender: string;
  senderIsHome: boolean;
  machinery: boolean;
  tape: boolean;
  people?: string[];
  recipients: string[];
};
type DeckContact = {
  first: string;
  last: string;
  title: string;
  email: string;
  phone: string;
  mobile: string;
  city: string;
  state: string;
};

function kindOf(text: string, tape: boolean): Touch["kind"] {
  const head = (text ?? "").split("\n").find((l) => l.trim()) ?? "";
  if (/meeting held|^\s*✔/i.test(head)) return "meeting";
  if (tape || /CALL TRANSCRIPT|☎|\bcall\b/i.test(head)) return "call";
  return "email";
}

/** Every exchange the record holds with one person, newest last. */
export function touchesFor(
  person: { name: string; email: string },
  docs: readonly DeckDoc[],
): Touch[] {
  const key = nameKey(person.name);
  const mail = (person.email ?? "").toLowerCase();
  const names = (xs: readonly string[] | undefined) =>
    (xs ?? []).some(
      (x) => (key && nameKey(x) === key) || (mail && x.toLowerCase().includes(mail)),
    );
  const out: Touch[] = [];
  for (const d of docs) {
    if (d.machinery) continue;
    const kind = kindOf(d.text, d.tape);
    const sent = !!key && nameKey(d.sender) === key;
    const there = names(d.recipients) || names(d.people);
    if (kind !== "email" && (sent || there)) out.push({ at: d.at, kind, dir: "both" });
    else if (sent && !d.senderIsHome) out.push({ at: d.at, kind, dir: "in" });
    else if (there && d.senderIsHome) out.push({ at: d.at, kind, dir: "out" });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at)).slice(-40);
}

/** The deck: the record's people, joined to the book's contact card, then
 *  anyone the operator added by hand whom the record has not named yet (the
 *  record outranks every seed). A LinkedIn page set by hand outranks the one a
 *  Sales Navigator alert carried. */
export function buildDeck(args: {
  people: readonly { name: string; title: string; email: string }[];
  contacts: readonly DeckContact[];
  docs: readonly DeckDoc[];
  added?: readonly { name: string; title: string; email: string; phone: string }[];
  links?: Readonly<Record<string, string>>;
  salesNav?: ReadonlyMap<string, string>;
  cap?: number;
}): DeckPerson[] {
  const byKey = new Map(args.contacts.map((c) => [nameKey(`${c.first} ${c.last}`), c]));
  const li = (name: string): Pick<DeckPerson, "linkedin" | "liFrom"> => {
    const k = nameKey(name);
    const hand = k ? args.links?.[k] : undefined;
    if (hand) return { linkedin: hand, liFrom: "hand" };
    const nav = k ? args.salesNav?.get(k) : undefined;
    return nav ? { linkedin: nav, liFrom: "salesnav" } : { linkedin: null, liFrom: null };
  };
  const cap = args.cap ?? 8;
  const fromRecord = args.people.slice(0, cap).map((p) => {
    const c = byKey.get(nameKey(p.name));
    const city = c ? [c.city, c.state].filter(Boolean).join(", ") : "";
    return {
      name: p.name,
      title: (p.title || c?.title || "").trim(),
      email: (p.email || c?.email || "").trim(),
      phone: (c?.phone ?? "").trim(),
      mobile: (c?.mobile ?? "").trim(),
      city,
      ...li(p.name),
      hand: false,
      touches: touchesFor({ name: p.name, email: p.email || c?.email || "" }, args.docs),
    };
  });
  const seen = new Set(fromRecord.map((p) => nameKey(p.name)));
  const fromHand: DeckPerson[] = [];
  for (const a of args.added ?? []) {
    const k = nameKey(a.name);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    const c = byKey.get(k);
    fromHand.push({
      name: a.name,
      title: (a.title || c?.title || "").trim(),
      email: (a.email || c?.email || "").trim(),
      phone: (a.phone || c?.phone || "").trim(),
      mobile: (c?.mobile ?? "").trim(),
      city: c ? [c.city, c.state].filter(Boolean).join(", ") : "",
      ...li(a.name),
      hand: true,
      touches: touchesFor({ name: a.name, email: a.email || c?.email || "" }, args.docs),
    });
  }
  return [...fromRecord, ...fromHand.slice(0, 6)];
}
