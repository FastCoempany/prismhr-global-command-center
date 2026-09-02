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

// A note ABOUT a meeting is not a meeting. "✔ Follow-up with Anika — week of
// Aug 31 meeting" whose body says "awaiting word on whether the meeting
// actually took place" read as "You met today" and the row demanded a recap
// of a meeting nobody can confirm happened (the Axcet read, 2026-09-02). The
// head-word branches only count when nothing in the same window says the
// meeting is chased, scheduled, or in doubt; the transcript/call sources
// skip this veto — an archived call is a thing that happened by definition.
const NOT_HELD_RE =
  /\b(follow[- ]?up|awaiting|whether|no confirmation|not confirmed|did not (?:take place|happen|meet)|didn't (?:take place|happen|meet)|(?:re)?schedul\w*|upcoming|prep(?:are|ping)? for)\b/i;

// A real call archive announces itself — the VTT pipeline heads its bodies
// CALL TRANSCRIPT and the room's archive writes "☰ Call transcript — …".
const TRANSCRIPT_HEAD_RE = /^\s*(?:☰\s*)?call transcript\b/i;
const SPEAKER_LINE_RE = /^([^:\n]{2,30}):\s\S/;

export function isMeetingNote(n: { body?: string; source?: string }): boolean {
  const body = n.body ?? "";
  const src = n.source ?? "";
  if (src === "call" || src === "call-ai") return true;
  if (src === "transcript") {
    // The room's zero-entry fallback files ANY unstructured paste under
    // source "transcript" — a typed one-liner is not a call (the Axcet
    // "i did not meet with them today" read, caught 2026-08-18). Source
    // alone proves nothing; the body has to read like a call: a transcript
    // header, or two-plus speaker-labeled voices.
    const lines = body.split("\n", 40);
    if (lines.some((l) => TRANSCRIPT_HEAD_RE.test(l))) return true;
    const speakers = new Set(
      lines.map((l) => SPEAKER_LINE_RE.exec(l)?.[1]?.trim()).filter(Boolean),
    );
    if (speakers.size >= 2) return true;
  }
  const head = body.slice(0, 200);
  if (NOT_HELD_RE.test(head)) return false;
  return MEETING_RE.test(head) || LOGGED_ACTIVITY_RE.test(head);
}
