// The intra-day clock the record already holds. Outlook entries file at the
// noon-UTC day anchor — a calendar fact, deliberately never timezone-shifted —
// but their heads carry the real clock: "✉ OL Today 10:39 AM — …". On
// 2026-09-02 the operator wrote Trend at 9:44 AM and Adam answered at 10:39
// AM; both filed at the same noon stamp, the strict newer-than compare broke
// the tie toward the outbound, and the room said "Wait on Melanie" while
// Adam's answer sat unread on the row. The record outranks every seed — and
// it holds a finer clock than the readers were reading (the Ted doctrine).
//
// The shift is ORDINAL, not a wall-clock claim: entries move around their own
// noon anchor by their head clock, so same-day entries order correctly and
// nothing ever leaves its day. Notes without the OL head, without a clock, or
// filed with a real timestamp are untouched.

const OL_HEAD = /^✉ OL /;
const CLOCK = /(\d{1,2}):(\d{2})\s*(AM|PM)/i;
const NOON_MIN = 12 * 60;
const MIN_MS = 60_000;

/** The head's own clock, in minutes of its day — null when the first line is
 *  not an OL head or carries no clock BEFORE the subject. The subject rides
 *  after the em dash and may name times of its own ("Re: call at 3:30 PM");
 *  only the head's slot, left of the dash, ever counts. */
export function headClockMinutes(body: string): number | null {
  const head = (body ?? "").split("\n")[0] ?? "";
  if (!OL_HEAD.test(head)) return null;
  const slot = head.split("—")[0] ?? "";
  const m = CLOCK.exec(slot);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 1 || h > 12 || min > 59) return null;
  const pm = m[3].toUpperCase() === "PM";
  return ((h % 12) + (pm ? 12 : 0)) * 60 + min;
}

/** True only for the noon-UTC day-anchor convention — a note filed with a
 *  real moment keeps it, clock in the head or not. */
function isNoonAnchor(ms: number): boolean {
  const d = new Date(ms);
  return (
    d.getUTCHours() === 12 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}

/** The note's effective moment: its stored stamp, refined by the head's own
 *  clock when (and only when) the stamp is the noon day-anchor. */
export function effectiveAt(createdAt: string, body?: string): string {
  const ms = Date.parse(createdAt);
  if (Number.isNaN(ms) || !isNoonAnchor(ms)) return createdAt;
  const clock = headClockMinutes(body ?? "");
  if (clock == null) return createdAt;
  return new Date(ms + (clock - NOON_MIN) * MIN_MS).toISOString();
}
