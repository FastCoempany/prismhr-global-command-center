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
const TZ = "America/Chicago";

/** "2026-07-30" — the day an instant belongs to, in the operator's timezone. */
export function chicagoDay(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-CA", { timeZone: TZ });
}

/** The divider's words: "Today — Wednesday, Jul 30", then "Yesterday — …",
 *  then just the date. */
export function dayLabel(dayKey: string, nowIso: string): string {
  const named = new Date(`${dayKey}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const today = chicagoDay(nowIso);
  if (dayKey === today) return `Today — ${named}`;
  const yesterday = chicagoDay(new Date(Date.parse(nowIso) - 86_400_000).toISOString());
  if (dayKey === yesterday) return `Yesterday — ${named}`;
  return named;
}

export type LedgerDay = { key: string; label: string; entries: LedgerEntry[] };

/** The record, grouped under day dividers, newest day first, newest entry
 *  first within a day. */
export function groupByDay(entries: LedgerEntry[], nowIso: string): LedgerDay[] {
  const sorted = [...entries].sort((a, b) => b.at.localeCompare(a.at));
  const out: LedgerDay[] = [];
  for (const e of sorted) {
    const key = chicagoDay(e.at);
    if (!key) continue;
    const last = out[out.length - 1];
    if (last && last.key === key) last.entries.push(e);
    else out.push({ key, label: dayLabel(key, nowIso), entries: [e] });
  }
  return out;
}

// ── the archive ─────────────────────────────────────────────────────────────
export type ArchiveDay = { key: string; label: string; asks: number; pastes: number };
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
