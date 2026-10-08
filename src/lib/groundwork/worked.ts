// Whether a move is worked, read from the stores that say so. Pure, so the
// suite can pin it; the page and the take-back action call these.

import { userDayKey } from "@/lib/tz";
import {
  CHANNELS,
  SENDBOOK_NS,
  sendbookNoteBody,
  type Channel,
} from "@/lib/sendbook/read";

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

// ── The day's stamps, the live queue, and the pre-answer ────────────────────

/** The day's worked stamps, oldest first: the left wing's whole content (the
 *  winged stage, 2026-08-10). A stamp's key carries its Chicago day, so
 *  yesterday's stamps never reach today's wing. `mk` is the move key the
 *  take-back hands to unWork. */
export function todaysStamps(
  stamps: ReadonlyMap<string, string>,
  dayKey: string,
): { accountId: string; ruleKey: string; mk: string; at: string }[] {
  const out: { accountId: string; ruleKey: string; mk: string; at: string }[] = [];
  const prefix = `groundwork:${dayKey}:`;
  for (const [key, at] of stamps) {
    if (!key.startsWith(prefix)) continue;
    const mk = key.slice(prefix.length);
    const colon = mk.indexOf(":");
    if (colon <= 0 || colon === mk.length - 1) continue;
    out.push({ accountId: mk.slice(0, colon), ruleKey: mk.slice(colon + 1), mk, at });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

/** The moves still live today: a move stamped today leaves the queue for the
 *  left wing, and the take-back deletes the stamp, so the move returns (the
 *  Sendbook's take-back, 2026-08-19). */
export function liveMoves<T extends { accountId: string; ruleId: string }>(
  ranked: readonly T[],
  stamps: { has(key: string): boolean },
  dayKey: string,
): T[] {
  return ranked.filter(
    (q) => !stamps.has(`groundwork:${dayKey}:${q.accountId}:${q.ruleId}`),
  );
}

/** Today's touches per account, read from the Sendbook's merged lines (newest
 *  first). `newest` is the line the wing's stamp subtext leads with (D27);
 *  `recordSent` holds the accounts whose outbound the record already holds
 *  today, and for those the Channel Ask never opens: the pre-answer rule
 *  (decreed 2026-08-19) answers it before it asks. A tap answers nothing,
 *  because a tap IS the answer the ask collects. */
export function todaysSends<L extends { accountId: string; at: string; from: string }>(
  lines: readonly L[],
  dayKey: string,
): { newest: Map<string, L>; recordSent: Set<string> } {
  const newest = new Map<string, L>();
  const recordSent = new Set<string>();
  for (const l of lines) {
    const t = Date.parse(l.at);
    if (Number.isNaN(t) || userDayKey(new Date(t)) !== dayKey) continue;
    if (!newest.has(l.accountId)) newest.set(l.accountId, l);
    if (l.from === "record") recordSent.add(l.accountId);
  }
  return { newest, recordSent };
}

// ── The Channel Ask's taps on the drumbeat ──────────────────────────────────

/** The Channel Ask's taps as the queue's drumbeat reads them: each tap is a
 *  logged outreach touch awaiting a reply, at the tap's own moment.
 *  Synthesized at read time and never written to the touch log (the
 *  Sendbook, 2026-08-19): the tap note under sendbook:<account> is the only
 *  store, and this is a view of it. */
export function tapTouches(
  tapsById: ReadonlyMap<string, readonly { createdAt: string }[]>,
): {
  subjectKey: string;
  label: string;
  contactedAt: string;
  followUpAt: string;
  status: string;
  log: { at: string; body: string }[];
}[] {
  return [...tapsById.entries()].flatMap(([id, notes]) =>
    notes.map((n) => ({
      subjectKey: `outreach:${id}`,
      label: "",
      contactedAt: n.createdAt,
      followUpAt: "",
      status: "awaiting",
      log: [],
    })),
  );
}

// ── The writes, behind a writer the action hands in ─────────────────────────
// The actions own the session check and the database; what they write, and
// what they never write, lives here so the suite can hold it.

/** What working a move may write: the tap note and the stamp. There is no
 *  touch writer on purpose: a tap is synthesized into the drumbeat at read
 *  time and never lands in the touch log (A10.11). */
export type WorkWriter = {
  note(row: {
    accountId: string;
    body: string;
    door: "hand";
    lane: "background";
    source: "sendbook";
    at: Date;
  }): Promise<void>;
  stamp(key: string, at: Date): Promise<void>;
};

/** The Channel Ask's landing: a channel tap files a sendbook:<account> note
 *  and the stamp at one moment, so the take-back finds the move's own tap
 *  (pass 8 G8). A channel the register does not know files no note and
 *  stamps the move all the same. A lost note never costs the stamp. */
export async function workChannel(
  w: WorkWriter,
  input: {
    mk: string;
    accountId: string;
    channel: string;
    contact: string;
    clause: string;
  },
  at: Date,
): Promise<void> {
  if ((CHANNELS as readonly string[]).includes(input.channel)) {
    const body = sendbookNoteBody(
      input.channel as Channel,
      input.contact.slice(0, 60),
      input.clause.slice(0, 160),
    );
    try {
      await w.note({
        accountId: `${SENDBOOK_NS}${input.accountId}`,
        body,
        door: "hand",
        lane: "background",
        source: "sendbook",
        at,
      });
    } catch {
      // the stamp still lands below
    }
  }
  await w.stamp(`groundwork:${userDayKey(at)}:${input.mk}`, at);
}

/** What the take-back may touch: today's stamp, and the taps under the
 *  account's sendbook: key. Nothing here reaches the account's own record
 *  (A10.21): a filed email is a fact, not a stamp. */
export type TakeBackStore = {
  stampAt(key: string): Promise<Date | null>;
  deleteStamp(key: string): Promise<void>;
  tapsBetween(
    sendbookKey: string,
    from: Date,
    to: Date,
  ): Promise<{ id: string; createdAt: Date }[]>;
  deleteTap(id: string): Promise<void>;
};

/** The take-back (founder-decreed 2026-08-19): the stamp goes, so the move
 *  returns to the queue, and the tap that stamp filed goes with it, never
 *  another move's tap from earlier in the day (pass 8 G8). */
export async function takeBack(
  s: TakeBackStore,
  mk: string,
  accountId: string,
  now: Date,
): Promise<void> {
  const key = `groundwork:${userDayKey(now)}:${mk}`;
  const doneAt = await s.stampAt(key);
  await s.deleteStamp(key);
  if (!doneAt || !accountId) return;
  const taps = await s.tapsBetween(
    `${SENDBOOK_NS}${accountId}`,
    new Date(doneAt.getTime() - TAP_PAIR_MS),
    doneAt,
  );
  const own = tapOfStamp(taps, doneAt);
  if (own) await s.deleteTap(own.id);
}
