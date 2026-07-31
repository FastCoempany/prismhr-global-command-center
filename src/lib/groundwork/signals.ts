// Sales Navigator intent signals — read, never pulled. LinkedIn has no intent
// API and none is wanted (founder decree): readings arrive only through the
// operator's ▤ grab pasted into the app, which the paste reader files as
// AccountNotes with a "salesnav" source. This module turns those notes into
// the queue's warm signals, and decides when the room may nag for a new read.
//
// Decay doctrine (plan §8 D8): a reading older than DECAY_DAYS ranks as
// nothing — a stale "High" is a guess wearing a badge. And only the NEWEST
// pasted reading counts: if the latest grab shows no intent, an older High is
// dead, not dormant.

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

// The newest salesnav reading on one account decides — and only if it is
// fresh. A newer grab with no intent kills an older High (superseded, not
// dormant); a reading past DECAY_DAYS ranks as nothing.
export function intentFor(notes: NoteLike[] | undefined, now: Date): IntentSignal | null {
  const newest = (notes ?? []).find(isSalesNav);
  if (!newest) return null;
  const ageDays = (now.getTime() - Date.parse(newest.createdAt)) / 86_400_000;
  if (!(ageDays <= DECAY_DAYS)) return null;
  const parsed = parseIntent(newest.body);
  return parsed ? { ...parsed, at: newest.createdAt } : null;
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
// "10/21/2026") — the riding-lane rule's evidence. Guards against the grab's
// own furniture: the capture-header line is skipped, and a date that merely
// restates the day the paste landed is the paste's clock, not a deal.
export function ridingLaneDate(
  notes: NoteLike[] | undefined,
  now: Date,
  windowDays = 14,
): string | null {
  for (const n of notes ?? []) {
    if (!isSalesNav(n)) continue;
    const noteDay = n.createdAt.slice(0, 10);
    const lines = n.body
      .split("\n")
      .filter((l) => !/SALESNAV ACCOUNTS\s*-\s*captured/i.test(l));
    for (const line of lines) {
      for (const m of line.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) {
        const iso = `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
        if (iso === noteDay) continue; // the paste's own clock line
        const t = Date.parse(`${iso}T12:00:00Z`);
        if (Number.isNaN(t)) continue;
        const days = (t - now.getTime()) / 86_400_000;
        if (days >= -1 && days <= windowDays) return iso;
      }
    }
  }
  return null;
}
