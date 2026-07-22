// The day-as-a-ledger — pure helpers. A "chase" only exists while something
// NAMED is owed; the ask rides inside Touch.detail as a marker (no schema
// change, degrades gracefully), so a due check-in with no ask renders as a
// quiet check row, never a chase.
//
//   detail: "7 of 7 teed up ⊙owes: yes/no on the 5 flagged accounts"

import { ROUNDUP_CADENCE_DAYS, type Touch } from "./follow-ups";
import { sameUserDay } from "@/lib/tz";

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

// True when two instants fall on the same calendar day AT THE USER'S DESK —
// the server runs UTC, so bare Date fields would flip days at 7pm Chicago.
export function sameLocalDayIso(iso: string, now: Date): boolean {
  return sameUserDay(iso, now);
}

// Where a past ledger row's words actually live, so the row can be edited or
// deleted in place. "acct"/"partner" = a note row's id; "todo" = a sheet note;
// "touchLog" = one entry (keyed by its timestamp) inside Touch.log.
export type LedgerSrc = {
  store: "acct" | "partner" | "todo" | "touchLog";
  id: string; // note/todo id, or the touch's subjectKey for touchLog
  at?: string; // touchLog only: the entry's ISO timestamp within the log
  body: string; // the full editable body behind the row's truncated text
};

// A past-tense ledger entry — something that happened today, above the
// now-line. Assembled server-side from every store that timestamps activity.
export type LedgerEvent = {
  at: string; // ISO
  text: string;
  kind: "note" | "send" | "done";
  src?: LedgerSrc; // present = the row is editable/deletable in place
};

export function sortEvents(events: LedgerEvent[]): LedgerEvent[] {
  return [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

// The hidden bin's disposition key for a ledger source — ✕ hides (parks the
// item in the Archive), it never deletes.
export function hideKeyFor(src: Pick<LedgerSrc, "store" | "id" | "at">): string {
  const at = src.store === "touchLog" && src.at ? `|${src.at}` : "";
  return `hide:${src.store}:${src.id}${at}`;
}
