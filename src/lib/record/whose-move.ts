// Whose move it is, spelled once (the Chute brains refactor plan, §2.2;
// pass 2 E, field 4). Five readers spelled this five ways — the room's
// engine, Groundwork's drumbeat, the Sendbook's reply loop, the drawer and
// the readout — and never agreed on who wrote, whether a meeting counts, or
// what time it is. This is the room engine's court, read over the docs the
// single read builds; the engine, day.ts and the others migrate onto it in
// slices 11a to 14, and until then the record-read suite pins that the two
// answer alike.
//
// The rungs, strongest first, exactly the engine's (src/lib/room/engine.ts):
// their reply newer than our last send is OUR move; a meeting newer than our
// last send, inside the recap window, is our move (the recap is owed, never a
// "wait"); an acceptance newer than our last send BOOKS the meeting; a send
// awaiting a reply leaves the move with them; and a record with none of that
// has no thread open. Machinery and sign-offs never open a reply-owed: a doc
// reads as inbound only when its flags say a person wrote to us (the closer
// rule; src/lib/record/docs.ts). The board's own rungs — an open gate, every
// gate closed — are not the record's and stay with the engine.

import { isAcceptance } from "@/lib/intel/closer";
import { meetingRead } from "@/lib/intel/meeting";
import { MINE_RE } from "@/lib/intel/provenance";
import { owedByThem } from "@/lib/room/owed";
import { lastTouchRead } from "@/lib/room/touch";
import type { RecordDoc } from "./docs";

export type WhoseMove = {
  whose: "you" | "them" | "booked" | "none";
  /** The moment that decided it: their reply, the meeting, the acceptance,
   *  our send, their promise. "" when nothing did. */
  since: string;
  /** The person on the other end — who wrote, who we met, who accepted, who
   *  we wait on. "" when the record names nobody. */
  who: string;
};

/** The outreach touch log's entry for the account, when the log holds one. */
export type TouchForMove = {
  contactedAt: string;
  awaitingReply: boolean;
  who: string;
};

export type WhoseMoveOptions = {
  /** The touch log is the operator's own hand and merges with the record's
   *  outbound by latest (ruled 2026-09-25, C3). The docs cannot carry it: a
   *  logged touch with no message is not a doc. */
  touch?: TouchForMove | null;
  /** Who is ours by name, for the person we wait on and the person we met.
   *  Without it only the operator reads as ours. */
  isHomeSide?: (name: string) => boolean;
};

const DAY = 86_400_000;

/** A meeting's recap stays the move this long; past it the meeting is history
 *  and the ordinary rungs speak again. The engine's own copy folds onto this
 *  one in slice 14. */
export const RECAP_DAYS = 5;

const daysBetween = (iso: string, now: Date): number | null => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / DAY));
};

const ms = (iso: string): number => Date.parse(iso);

/** The doc's row as the shared readers take it. The doc's `at` is already
 *  the effective moment, and effectiveAt leaves an effective moment alone, so
 *  handing it back as the stamp costs nothing. */
const rowOf = (d: RecordDoc) => ({
  id: d.noteId,
  actors: d.actors,
  createdAt: d.at,
  body: d.text,
  source: d.source,
});

export function whoseMove(
  docs: readonly RecordDoc[],
  todos: readonly { id: string; body: string; createdAt: string; done?: boolean }[],
  now: Date,
  opts: WhoseMoveOptions = {},
): WhoseMove {
  const live = docs.filter((d) => !d.hidden);
  const rows = live.filter((d) => d.noteId).map(rowOf);
  const isHome = (n: string): boolean => MINE_RE.test(n) || !!opts.isHomeSide?.(n);

  // Our last send: the record's newest outbound merged with the touch log by
  // latest — a filed email is as real a touch as a logged send (the Simploy
  // Aug 5 nudge, 2026-08-14), and a send dated ahead of today has not
  // happened yet (Trend Personnel Services, 2026-09-23).
  const lastTouch = lastTouchRead(rows, opts.touch ?? null, opts.isHomeSide, now);

  // Their newest word to us. Docs run newest first, so the first inbound is
  // the newest, and the flags have already read through machinery and
  // sign-offs to the last substantive message.
  const inbound = live.find((d) => d.direction === "in");

  // The newest meeting, and who it was with, as the shared reader says it.
  const meeting = meetingRead(rows, isHome);

  // The newest invitation acceptance: machinery, so it never opens a
  // reply-owed, but proof the meeting exists (HR Hawaii, 2026-09-04).
  const accepted = live.find((d) => d.noteId && isAcceptance(d.text));

  const touchAt = lastTouch ? ms(lastTouch.at) : NaN;
  const after = (iso: string, strict: boolean): boolean => {
    const t = ms(iso);
    if (Number.isNaN(t)) return false;
    if (Number.isNaN(touchAt)) return true;
    return strict ? t > touchAt : t >= touchAt;
  };

  if (inbound && after(inbound.at, true))
    return { whose: "you", since: inbound.at, who: inbound.sender };

  if (meeting && after(meeting.at, false)) {
    const days = daysBetween(meeting.at, now);
    if (days != null && days <= RECAP_DAYS)
      return { whose: "you", since: meeting.at, who: meeting.who };
  }

  if (accepted && after(accepted.at, false))
    return {
      whose: "booked",
      since: accepted.at,
      who: accepted.senderIsHome ? "" : accepted.sender,
    };

  if (lastTouch?.awaitingReply)
    return { whose: "them", since: lastTouch.at, who: lastTouch.who };

  // No thread decides it. A loop still open on their side — a thing they
  // said they would do, filed by the read (D10) or written on an Owed line —
  // leaves the move with them until it lands.
  const loop = owedByThem(rows, now, todos)[0];
  if (loop) return { whose: "them", since: loop.at, who: loop.who };

  return { whose: "none", since: "", who: "" };
}
