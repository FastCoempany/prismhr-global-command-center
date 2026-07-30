// Sales Navigator intent signals — read, never pulled. LinkedIn has no intent
// API and none is wanted (founder decree): readings arrive only through the
// operator's ▤ grab pasted into the app, which the paste reader files as
// AccountNotes with a "salesnav" source. This module turns those notes into
// the queue's warm signals, and decides when the room may nag for a new read.
//
// Decay doctrine (plan §8 D8): a reading older than DECAY_DAYS ranks as
// nothing — a stale "High" is a guess wearing a badge.

export const DECAY_DAYS = 7;

export type IntentLevel = "high" | "moderate";

export type IntentSignal = {
  level: IntentLevel;
  activities: number | null; // engagement count when the row carried one
  at: string; // ISO of the note that carried the reading
};

type NoteLike = { body: string; source: string; createdAt: string };

const isSalesNav = (n: NoteLike) => (n.source ?? "").startsWith("salesnav");

// "High buyer intent", "expressing High buyer intent", "High · 11 activities",
// "11 activities" — the grab ships Sales Navigator's own words, so the parse
// stays close to them and refuses to invent a level it can't see.
export function parseIntent(body: string): Omit<IntentSignal, "at"> | null {
  const high = /\bhigh\b[^.\n]{0,40}\bintent\b|\bintent\b[^.\n]{0,40}\bhigh\b/i.test(
    body,
  );
  const moderate =
    /\bmoderate\b[^.\n]{0,40}\bintent\b|\bintent\b[^.\n]{0,40}\bmoderate\b/i.test(body);
  if (!high && !moderate) return null;
  const acts = /(\d{1,3})\s*activit/i.exec(body);
  return {
    level: high ? "high" : "moderate",
    activities: acts ? Number(acts[1]) : null,
  };
}

// The freshest un-decayed reading on one account's notes (newest-first input,
// the shape loadAccountNotes returns).
export function intentFor(notes: NoteLike[] | undefined, now: Date): IntentSignal | null {
  for (const n of notes ?? []) {
    if (!isSalesNav(n)) continue;
    const ageDays = (now.getTime() - Date.parse(n.createdAt)) / 86_400_000;
    if (!(ageDays <= DECAY_DAYS)) continue;
    const parsed = parseIntent(n.body);
    if (parsed) return { ...parsed, at: n.createdAt };
  }
  return null;
}

// The newest salesnav-sourced note anywhere in the book — the fact the nudge
// runs on, whatever account it landed against.
export function newestReadIso(notesByAccount: Map<string, NoteLike[]>): string | null {
  let newest: string | null = null;
  for (const notes of notesByAccount.values()) {
    for (const n of notes) {
      if (!isSalesNav(n)) continue;
      if (!newest || n.createdAt > newest) newest = n.createdAt;
    }
  }
  return newest;
}

// Weekday count between two instants (UTC-day granularity, endpoints open) —
// the same shape the morning brief uses, kept local so this module stays pure.
export function businessDaysBetween(fromIso: string, to: Date): number {
  const from = Date.parse(fromIso);
  if (Number.isNaN(from) || from >= to.getTime()) return 0;
  let n = 0;
  for (let t = from + 86_400_000; t <= to.getTime(); t += 86_400_000) {
    const dow = new Date(t).getUTCDay();
    if (dow !== 0 && dow !== 6) n++;
  }
  return n;
}

// The nudge renders ONLY when a read is due (founder decree: silence when
// fresh; the one quiet line when due). Due = no read ever, or the newest is
// more than one business day old.
export function intentReadDue(
  notesByAccount: Map<string, NoteLike[]>,
  now: Date,
): boolean {
  const newest = newestReadIso(notesByAccount);
  if (!newest) return true;
  return businessDaysBetween(newest, now) >= 1;
}

// A CRM opportunity date riding in a pasted Sales Nav row ("8/21/2026",
// "10/21/2026") — the riding-lane rule's evidence. Only parses the grab's own
// notes, and only dates that land in a plausible window.
export function ridingLaneDate(
  notes: NoteLike[] | undefined,
  now: Date,
  windowDays = 14,
): string | null {
  for (const n of notes ?? []) {
    if (!isSalesNav(n)) continue;
    for (const m of n.body.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) {
      const t = Date.parse(
        `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}T12:00:00Z`,
      );
      if (Number.isNaN(t)) continue;
      const days = (t - now.getTime()) / 86_400_000;
      if (days >= -1 && days <= windowDays) return new Date(t).toISOString().slice(0, 10);
    }
  }
  return null;
}
