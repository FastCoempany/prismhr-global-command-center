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

// ── who was actually met (founder-decreed 2026-09-04) ───────────────────────
// A dropped recording files TWICE: the read's ☎ CT entry, which names the
// people, and the ☰ transcript archive, which holds the whole conversation
// and carries no actors line at all. Both are the same meeting and both
// stamp the same day, so whichever the sort happens to hand back first wins
// — and when that is the archive, the recap has nobody to address and falls
// through to the relationship rollup. On 2026-09-03 that put Leilani
// Gonzalez on a recap the record says was with Elise Munoz.
//
// The record outranks every seed (the Ted doctrine), and the record holds
// three statements of who was in the room, strongest first: the meeting's
// own actors line; a sibling meeting note from the same day that has one;
// and the transcript's own speaker labels. The rollup is the last resort it
// was always meant to be.

const HOME_SPEAKER_CAP = 40;

// A transcript's speaker label, strictly. The loose "anything before a colon"
// pattern above exists to COUNT voices; borrowing it to NAME a person read
// "Recorded:", "TO DO:" and a bare mailbox token as people (swept 2026-09-04).
// A wrong name is a wrong move, so this demands the shape of a real name —
// two-plus capitalized words, never an all-caps label — and refuses the
// metadata keys a transcript head carries.
const SPEAKER_NAME_RE = /^([A-Z][A-Za-z'’.-]+(?:\s+[A-Z][A-Za-z'’.-]+){1,3}):\s\S/;
const NOT_A_SPEAKER = new Set([
  "recorded",
  "speakers",
  "topic",
  "subject",
  "from",
  "to",
  "cc",
  "bcc",
  "sent",
  "date",
  "when",
  "where",
  "location",
  "attendees",
  "invitees",
  "organizer",
  "passcode",
  "note",
  "notes",
  "owed",
  "action items",
  "next steps",
  "to do",
  "todo",
  "agenda",
  "summary",
  "call transcript",
  "meeting id",
  "join zoom meeting",
]);

export type MeetingRead = { at: string; who: string; note: { id?: string } };

const otherSide = (actors: string, isHome: (n: string) => boolean): string => {
  const i = (actors ?? "").indexOf("→");
  const sides = i >= 0 ? [actors.slice(0, i), actors.slice(i + 1)] : [];
  return (
    sides.map((x) => x.replace(/\+\d+\s*$/, "").trim()).find((x) => x && !isHome(x)) ?? ""
  );
};

/** The speakers a transcript labels, in the order they first speak, minus
 *  our own side. The archive's body is the record's own witness list. */
export function speakersIn(body: string, isHome: (n: string) => boolean): string[] {
  const out: string[] = [];
  for (const l of (body ?? "").split("\n", 400)) {
    const name = SPEAKER_NAME_RE.exec(l)?.[1]?.trim();
    if (!name || name.length > HOME_SPEAKER_CAP) continue;
    // An all-caps label ("TO DO", "ACTION ITEMS") is never somebody's name.
    if (name === name.toUpperCase()) continue;
    if (NOT_A_SPEAKER.has(name.toLowerCase())) continue;
    if (isHome(name) || out.includes(name)) continue;
    out.push(name);
  }
  return out;
}

/** The newest meeting in the record and who it was with — "" when the record
 *  genuinely never names anyone, so the caller can fall back knowingly. */
export function meetingRead(
  notes: readonly {
    id?: string;
    body?: string;
    source?: string;
    actors?: string;
    createdAt: string;
  }[],
  isHome: (n: string) => boolean,
  /** Is this name a known contact of THIS account? Rung 3 requires it.
   *  A transcript's voices include our own colleagues who are on no CSM
   *  roster — Shane Jacobs sets our proposal terms and appears on an
   *  Advocate Pay tape, and reading him as the person we met would name our
   *  own side as the client (swept 2026-09-04). A name the book cannot place
   *  on this account leaves the read blank, and blank falls back honestly. */
  isCounterpart?: (n: string) => boolean,
): MeetingRead | null {
  const meetings = (notes ?? []).filter((n) => isMeetingNote(n));
  const first = meetings[0];
  if (!first) return null;
  const day = (iso: string) => (iso ?? "").slice(0, 10);
  // 1 — this meeting's own actors.
  let who = otherSide(first.actors ?? "", isHome);
  // 2 — a sibling note for the same meeting that does carry actors. The
  //     archive and the read's entry are one call filed twice.
  if (!who)
    for (const m of meetings) {
      if (day(m.createdAt) !== day(first.createdAt)) break;
      who = otherSide(m.actors ?? "", isHome);
      if (who) break;
    }
  // 3 — the transcript's own voices, and only those the book places on this
  //     account. An unplaceable voice is not evidence of who we met.
  if (!who) {
    const voices = speakersIn(first.body ?? "", isHome);
    who = (isCounterpart ? voices.filter((v) => isCounterpart(v)) : voices)[0] ?? "";
  }
  return { at: first.createdAt, who, note: { id: first.id } };
}
