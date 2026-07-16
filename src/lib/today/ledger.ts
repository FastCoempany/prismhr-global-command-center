// The day-as-a-ledger — pure helpers. A "chase" only exists while something
// NAMED is owed; the ask rides inside Touch.detail as a marker (no schema
// change, degrades gracefully), so a due check-in with no ask renders as a
// quiet check row, never a chase.
//
//   detail: "7 of 7 teed up ⊙owes: yes/no on the 5 flagged accounts"

import { ROUNDUP_CADENCE_DAYS, type Touch } from "./follow-ups";

const ASK = "⊙owes:";

// Split a stored detail into the display detail and the named ask (if any).
export function splitAsk(detail: string): { detail: string; ask: string } {
  const i = detail.indexOf(ASK);
  if (i < 0) return { detail: detail.trim(), ask: "" };
  return {
    detail: detail.slice(0, i).trim(),
    ask: detail.slice(i + ASK.length).trim(),
  };
}

// Set (or clear, with "") the ask on a detail string. Re-setting replaces.
export function withAsk(detail: string, ask: string): string {
  const base = splitAsk(detail).detail;
  const clean = ask.trim();
  return clean ? `${base ? `${base} ` : ""}${ASK} ${clean}` : base;
}

// When the next roundup window opens for a partner whose thread is closed —
// the dimmed "upcoming" ledger row. "" when there's no future window (live
// thread, or never contacted = due right now, not upcoming).
export function nextRoundupDueIso(touch: Touch | undefined): string {
  if (!touch || touch.status !== "archived") return "";
  const t = Date.parse(touch.contactedAt);
  if (Number.isNaN(t)) return "";
  return new Date(t + ROUNDUP_CADENCE_DAYS * 86_400_000).toISOString();
}

// True when two ISO instants fall on the same local calendar day.
export function sameLocalDayIso(iso: string, now: Date): boolean {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  const d = new Date(t);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// A past-tense ledger entry — something that happened today, above the
// now-line. Assembled server-side from every store that timestamps activity.
export type LedgerEvent = {
  at: string; // ISO
  text: string;
  kind: "note" | "send" | "done";
};

export function sortEvents(events: LedgerEvent[]): LedgerEvent[] {
  return [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}
