// The app's ONE spelling of "this note records a meeting" (Ted doctrine: a
// shared predicate, never a private copy per surface — a second spelling is
// how the touch clock came to mistake the Staff Leasing 1:00 PM meeting for
// a letter awaiting Tom's reply, 2026-08-18). Three signals, any one enough:
// the source is a call/transcript reader; the head is a logged activity
// (✔ …) naming a meeting, call, demo, or visit — a record of a thing that
// HAPPENED, never a send; or the head reads as a meeting in words.

export const MEETING_SOURCE = new Set(["call", "call-ai", "transcript"]);

export const MEETING_RE =
  /\b(met with|meeting with|call with|demo(?:'d)? (?:with|for|to)|walked (?:them|him|her) through)\b/i;

const LOGGED_ACTIVITY_RE = /^\s*✔[^\n]*\b(meeting|call|demo|visit)\b/i;

export function isMeetingNote(n: { body?: string; source?: string }): boolean {
  if (MEETING_SOURCE.has(n.source ?? "")) return true;
  const head = (n.body ?? "").slice(0, 200);
  return MEETING_RE.test(head) || LOGGED_ACTIVITY_RE.test(head);
}
