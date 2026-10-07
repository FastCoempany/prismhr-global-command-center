// Whether a move is worked, read from the stores that say so. Pure, so the
// suite can pin it; the page and the take-back action call these.

/** A worked stamp's key: `groundwork:<Chicago day>:<account>:<rule>`
 *  (groundworkDoneKey, ./file.ts). */
const STAMP_RE = /^groundwork:\d{4}-\d{2}-\d{2}:(.+):([a-z-]+)$/;

/** A seat rides until worked, taken back, or the record shows the outbound
 *  after it (the Act Lane decree, 2026-08-21). Worked is the operator's own
 *  stamp on the seated move after the seat was filed, by a Channel Ask tap or
 *  by Copy, on any day since: the stamp's key carries its day, but working
 *  the seat retires it for good, so yesterday's stamp still holds it off the
 *  wing (pass 8 G2). The take-back deletes the stamp and the seat returns. A
 *  seat filed after the stamp is a new seat. The record's send after the seat
 *  retires it too, read from the account read's docs so a ✕-parked send
 *  retires nothing. */
export function seatWorked(
  accountId: string,
  seatAt: string,
  stamps: ReadonlyMap<string, string>,
  sends: readonly { at: string }[],
): boolean {
  const seatT = Date.parse(seatAt);
  if (Number.isNaN(seatT)) return false;
  for (const [key, doneAt] of stamps) {
    const m = STAMP_RE.exec(key);
    if (!m || m[1] !== accountId || m[2] !== "seated") continue;
    if (Date.parse(doneAt) >= seatT) return true;
  }
  return sends.some((s) => Date.parse(s.at) > seatT);
}

/** How long before its stamp a tap can have been filed and still be the
 *  stamp's own. workedChannel files both at one moment now; a tap filed
 *  before they shared a clock lands a breath before its stamp. */
export const TAP_PAIR_MS = 60_000;

/** The tap a stamp filed with it, so the take-back withdraws the move's own
 *  touch and never another move's from earlier in the day (pass 8 G8). A
 *  stamp written by Copy filed no tap and takes none back. */
export function tapOfStamp<T extends { createdAt: string | Date }>(
  taps: readonly T[],
  doneAt: string | Date,
): T | null {
  const doneT = new Date(doneAt).getTime();
  if (Number.isNaN(doneT)) return null;
  let best: T | null = null;
  let bestT = -Infinity;
  for (const t of taps) {
    const at = new Date(t.createdAt).getTime();
    if (Number.isNaN(at) || at > doneT || doneT - at > TAP_PAIR_MS) continue;
    if (at > bestT) {
      best = t;
      bestT = at;
    }
  }
  return best;
}
