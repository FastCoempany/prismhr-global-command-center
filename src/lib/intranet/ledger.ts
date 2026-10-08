// IV.8 · THE LEDGER — the room as a running record.
//
// Everything the brain does becomes one dated stream: a question answered, a
// paste read. Both are already persisted rows (IntranetAsk, IntranetCapture),
// so the record is REBUILT from the database, not remembered by a browser tab —
// close the room, come back tomorrow, the record is still there. C6 applied to
// the surface: entries fold, they never disappear.
//
// Three pieces live here, pure and testable:
//   · day grouping in the operator's own timezone
//   · the calendarized archive rollup
//   · the country lens — a country is a standing filter over entities, never a
//     copy of the record (C1: one brain)

import { COUNTRY_NAME } from "@/lib/intel/lexicon";
import { chicagoDay } from "@/lib/tz";

export type StoredCitation = {
  n: number;
  claimId: string;
  text: string;
  speaker: string;
  saidAt: string;
  kind: string;
  docTitle: string;
  origin: string;
  originGone: string;
};

// ── the digest's doors (pass 10, the click-depth law) ───────────────────────
// A Send-it digest counted what a paste carried ("Inside it I found 3
// commitments people made …") and which index rows grew ("The index grew:
// Pricing picked up 6 …"), and neither count opened. The digest keeps, beside
// its words, each count's door: the claims a kind counts, by id, and each
// grown row's topic id. Additive on the capture's meta; a digest from before
// carries none and reads as words.

export type DigestKind = { kind: string; word: string; n: number; claimIds: string[] };
export type DigestTopic = { id: string; label: string; n: number; fresh: boolean };
export type DigestDoors = {
  found?: { line: string; kinds: DigestKind[] };
  grew?: { line: string; topics: DigestTopic[] };
};

/** What each claim kind is called in the digest, in the order it is said. */
export const KIND_WORD: Record<string, string> = {
  fact: "facts",
  decision: "decisions",
  commitment: "commitments people made",
  process: "notes on how we do things",
  question: "open questions",
  opinion: "opinions",
  "prospect-question": "questions buyers asked",
};

/** "a, b, and c", the way a person lists things (IV.9). */
export function sayList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** How a kind is said: its count and its word. */
export const kindWords = (k: Pick<DigestKind, "n" | "word">): string =>
  `${k.n} ${k.word}`;

/** How a grown index row is said. */
export const topicWords = (t: Pick<DigestTopic, "label" | "n" | "fresh">): string =>
  t.fresh ? `"${t.label}" is brand new` : `${t.label} picked up ${t.n}`;

/** The most claim ids a kind's door keeps on the capture. */
export const DOOR_CLAIM_CAP = 200;

/** The "Inside it I found …" line and its doors, from the paste's claims. */
export function foundDoor(
  claims: readonly { id: string; kind: string }[],
): DigestDoors["found"] {
  const kinds: DigestKind[] = [];
  for (const [kind, word] of Object.entries(KIND_WORD)) {
    const ids = claims.filter((c) => c.kind === kind).map((c) => c.id);
    if (ids.length)
      kinds.push({ kind, word, n: ids.length, claimIds: ids.slice(0, DOOR_CLAIM_CAP) });
  }
  if (!kinds.length) return undefined;
  return { line: `Inside it I found ${sayList(kinds.map(kindWords))}.`, kinds };
}

/** The "The index grew: …" line and its doors, from the rows that grew. */
export function grewDoor(topics: readonly DigestTopic[]): DigestDoors["grew"] {
  if (!topics.length) return undefined;
  const ordered = [...topics.filter((t) => !t.fresh), ...topics.filter((t) => t.fresh)];
  return {
    line: `The index grew: ${sayList(ordered.map(topicWords))}.`,
    topics: ordered,
  };
}

/** The doors a stored capture's meta carries, read defensively: anything
 *  malformed reads as no door, and the line stays words. */
export function doorsOf(meta: unknown): DigestDoors | undefined {
  const d = (meta as { doors?: DigestDoors } | null)?.doors;
  if (!d || typeof d !== "object") return undefined;
  const found =
    d.found &&
    typeof d.found.line === "string" &&
    Array.isArray(d.found.kinds) &&
    d.found.kinds.every(
      (k) =>
        typeof k?.word === "string" &&
        typeof k?.n === "number" &&
        Array.isArray(k?.claimIds),
    )
      ? d.found
      : undefined;
  const grew =
    d.grew &&
    typeof d.grew.line === "string" &&
    Array.isArray(d.grew.topics) &&
    d.grew.topics.every((t) => typeof t?.id === "string" && typeof t?.label === "string")
      ? d.grew
      : undefined;
  return found || grew ? { found, grew } : undefined;
}

// ── the health page's meters (pass 10, the click-depth law) ───────────────
// Every meter on the brain's vital signs opens what it counts: the documents,
// the claims, the questions buyers asked, the live and the proposed topics,
// what still waits to be read, and today's reads and questions.

export const HEALTH_LISTS = [
  "docs",
  "claims",
  "prospect",
  "topics",
  "pending",
  "proposed",
  "todayDocs",
  "todayAsks",
] as const;
export type HealthList = (typeof HEALTH_LISTS)[number];
/** One row a meter opens to: what it is, and where and when it came from. */
export type HealthRow = { text: string; meta: string };

export type LedgerEntry =
  | {
      kind: "ask";
      id: string;
      at: string;
      question: string;
      answer: string;
      reasoning: string;
      model: string;
      citations: StoredCitation[];
    }
  | {
      kind: "fed";
      id: string;
      at: string;
      space: string;
      title: string;
      /** Where the paste came from — "teams" | "meeting" | "demo" | "paste". */
      origin: string;
      lines: string[];
      /** V.8 — what Claude wrote about what it received and did. The product. */
      briefs: string[];
      /** V.6 — the excessively-detailed version behind the one word "failed". */
      detail: string[];
      /** The digest's doors: each count opens what it counts (pass 10). */
      doors?: DigestDoors;
    };

/** V.6 applied to REPLAYED history: digests stored by earlier builds carried
 *  failure language and even raw backend JSON. The decree covers the whole
 *  record — so the replay layer launders what old code wrote: failure lines
 *  collapse to the one word, and the original text moves behind the detail
 *  fold where it belongs. New-style digests pass through untouched. */
export function launderDigest(stored: string[]): { lines: string[]; detail: string[] } {
  const lines: string[] = [];
  const detail: string[] = [];
  let failed = 0;
  let anyRaw = false;
  for (const l of stored) {
    const counted = /^(\d+) couldn't be read\b/.exec(l);
    const raw =
      /\{"type"\s*:\s*"error"/.test(l) ||
      /invalid_request_error/.test(l) ||
      /"message"\s*:/.test(l) ||
      /^The reading (pass )?failed\b/.test(l) ||
      /couldn't be read\b/.test(l);
    if (counted || raw) {
      if (counted) failed += Number(counted[1]);
      else anyRaw = true;
      detail.push(l);
      continue;
    }
    lines.push(l);
  }
  if (failed > 0) lines.push(`${failed} failed.`);
  else if (anyRaw) lines.push("failed.");
  return { lines, detail };
}

/** The sent stamp's provenance (V.4): where a paste came from, in words. */
export function sentFrom(space: string, origin: string): string {
  if (space) return `from ${space}`;
  if (origin === "teams") return "from a Teams grab";
  if (origin === "meeting") return "from a meeting transcript";
  if (origin === "demo") return "from a demo transcript";
  return "pasted by hand";
}

// ── days, in the operator's clock ───────────────────────────────────────────
/** "2026-07-30" — the day an instant belongs to, in the operator's timezone:
 *  the one Chicago day app-wide (src/lib/tz.ts), re-exported for the readers
 *  that take it from here. */
export { chicagoDay };

/** The divider's words: "Today · Wednesday, Jul 30", then "Yesterday · …",
 *  then just the date. */
export function dayLabel(dayKey: string, nowIso: string): string {
  const named = new Date(`${dayKey}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const today = chicagoDay(nowIso);
  if (dayKey === today) return `Today · ${named}`;
  const yesterday = chicagoDay(new Date(Date.parse(nowIso) - 86_400_000).toISOString());
  if (dayKey === yesterday) return `Yesterday · ${named}`;
  return named;
}

// ── the archive ─────────────────────────────────────────────────────────────
type ArchiveDay = { key: string; label: string; asks: number; pastes: number };
export type ArchiveMonth = { month: string; days: ArchiveDay[] };

/** The record calendarized: months, then days, each day carrying its counts.
 *  Every day the record touched is here — the archive never thins (C6). */
export function archiveRollup(
  stamps: { at: string; kind: "ask" | "fed" }[],
): ArchiveMonth[] {
  const byDay = new Map<string, { asks: number; pastes: number }>();
  for (const s of stamps) {
    const key = chicagoDay(s.at);
    if (!key) continue;
    const d = byDay.get(key) ?? { asks: 0, pastes: 0 };
    if (s.kind === "ask") d.asks += 1;
    else d.pastes += 1;
    byDay.set(key, d);
  }
  const days = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const out: ArchiveMonth[] = [];
  for (const [key, counts] of days) {
    const month = new Date(`${key}T12:00:00`).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const label = new Date(`${key}T12:00:00`).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const day: ArchiveDay = { key, label, asks: counts.asks, pastes: counts.pastes };
    const last = out[out.length - 1];
    if (last && last.month === month) last.days.push(day);
    else out.push({ month, days: [day] });
  }
  return out;
}

/** "3 asks · 2 pastes" for a day row. */
export function archiveDayMeta(d: ArchiveDay): string {
  const bits: string[] = [];
  if (d.asks > 0) bits.push(`${d.asks} ask${d.asks === 1 ? "" : "s"}`);
  if (d.pastes > 0) bits.push(`${d.pastes} paste${d.pastes === 1 ? "" : "s"}`);
  return bits.join(" · ");
}

// ── the country lens ────────────────────────────────────────────────────────
// A country row is a standing filter over entities — the same claims, read
// through one place. Nothing is duplicated, which is C1 holding: one brain.

const NAME_TO_CODE = new Map<string, string>(
  Object.entries(COUNTRY_NAME).map(([code, name]) => [name.toLowerCase(), code]),
);
const CODES = new Set(Object.keys(COUNTRY_NAME));

/** Which country an entity names, if any. Exact name or ISO code — never a
 *  substring, so "brazil nut allergy" stays a curiosity, not a lens. */
export function countryOf(entity: string): { code: string; name: string } | null {
  const e = (entity ?? "").trim().toLowerCase();
  if (!e) return null;
  const byName = NAME_TO_CODE.get(e);
  if (byName) return { code: byName, name: COUNTRY_NAME[byName] };
  if (e.length === 2 && CODES.has(e)) return { code: e, name: COUNTRY_NAME[e] };
  return null;
}

export type CountryRow = {
  code: string;
  name: string;
  total: number;
  /** The lens sub-rows (V.4): concrete SUBJECTS the record holds for this
   *  country — the same subject-matter heads as the index rail, never vague
   *  kind-words. Each carries the parent topic id so a click opens it. */
  lenses: { label: string; n: number; topicId: string }[];
};

/** Tally the record by country. One claim counts once per country it names,
 *  however many times the extractor repeated the entity. Sub-rows are the
 *  index's subject parents, resolved from each claim's filed topics. */
export function countryTallies(
  claims: { entities: string[]; topicIds: string[] }[],
  subjectOf: (topicId: string) => { id: string; label: string } | null,
): CountryRow[] {
  const rows = new Map<
    string,
    { name: string; total: number; subjects: Map<string, { label: string; n: number }> }
  >();
  for (const c of claims) {
    const seen = new Set<string>();
    const subjects = new Map<string, string>();
    for (const t of c.topicIds ?? []) {
      const s = subjectOf(t);
      if (s) subjects.set(s.id, s.label);
    }
    for (const e of c.entities ?? []) {
      const hit = countryOf(e);
      if (!hit || seen.has(hit.code)) continue;
      seen.add(hit.code);
      const row = rows.get(hit.code) ?? {
        name: hit.name,
        total: 0,
        subjects: new Map<string, { label: string; n: number }>(),
      };
      row.total += 1;
      for (const [id, label] of subjects) {
        const s = row.subjects.get(id) ?? { label, n: 0 };
        s.n += 1;
        row.subjects.set(id, s);
      }
      rows.set(hit.code, row);
    }
  }
  return [...rows.entries()]
    .map(([code, r]) => ({
      code,
      name: r.name,
      total: r.total,
      lenses: [...r.subjects.entries()]
        .map(([topicId, s]) => ({ label: s.label, n: s.n, topicId }))
        .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)),
    }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

/** The flag image for a country row — a real colored flag, never emoji, which
 *  Windows renders as bare letter pairs (IV.9). Hidden on load failure rather
 *  than broken. */
export function flagSrc(code: string): string {
  return `https://flagcdn.com/w20/${code}.png`;
}
export function flagSrc2x(code: string): string {
  return `https://flagcdn.com/w40/${code}.png`;
}
