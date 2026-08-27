// The touch clock: when the operator last reached this deal, read from the
// LATEST of two stores — the outreach touch log AND the record's own outbound
// entries. A filed email is as real a touch as a logged send; the room must
// never demand an answer the record proves was already given (the Simploy
// Aug 5 nudge, caught 2026-08-14). Pure — testable.

import { MINE_RE } from "@/lib/intel/provenance";
import { isMeetingNote } from "@/lib/intel/meeting";

export type TouchSource = {
  contactedAt: string; // ISO
  awaitingReply: boolean;
  who: string;
};

export type NoteForTouch = {
  actors: string; // "Sender → Target [+n]" — "" when unattributed
  createdAt: string; // ISO, activity's own moment
  // Optional but load-bearing: a meeting RECORD carries the operator's name
  // in its actors, yet it is a thing that happened, never a send awaiting a
  // reply — the discriminator needs the body head and source to see that.
  body?: string;
  source?: string;
};

export type TouchRead = {
  at: string;
  who: string; // the person reached — "" when unknown
  awaitingReply: boolean;
  source: "log" | "record";
};

// The record's newest outbound: an entry whose actors name the operator as
// the sender. Inbound traffic and unattributed notes never count. MINE_RE is
// the app's one spelling of the operator — a private narrower regex here
// would miss "acoe@prismhr" renderings and resurrect the very bug this file
// exists to kill.
export function newestOutbound(notes: NoteForTouch[]): NoteForTouch | null {
  let best: NoteForTouch | null = null;
  for (const n of notes) {
    const arrow = (n.actors ?? "").indexOf("→");
    if (arrow < 0) continue;
    const sender = n.actors.slice(0, arrow);
    if (!MINE_RE.test(sender)) continue;
    // A meeting record is not correspondence — nobody awaits a reply to a
    // meeting that already happened (the Staff Leasing 1:00 PM, 2026-08-18).
    if (isMeetingNote(n)) continue;
    const t = Date.parse(n.createdAt);
    if (Number.isNaN(t)) continue;
    if (!best || t > Date.parse(best.createdAt)) best = n;
  }
  return best;
}

// The person a send was addressed to. The capture collapses a recipient list
// to one name plus a count ("Antaeus Coe → Lesha Cyphers +2"), so position one
// is whoever happened to lead the To line — and on an intro thread that is our
// own CSM. When the named target is our own side AND the +n says other
// recipients were folded away, the account's people are in that remainder and
// their name is the one worth having: return "" so the caller falls back to the
// relationship contact. A send addressed ONLY to a colleague keeps their name —
// waiting on a teammate is a real coordination move (the Regis row, 2026-08-27).
export function targetOf(actors: string, isHomeSide?: (name: string) => boolean): string {
  const arrow = actors.indexOf("→");
  if (arrow < 0) return "";
  const tail = actors.slice(arrow + 1);
  const collapsed = /\+\d+\s*$/.test(tail);
  const name = tail.replace(/\+\d+\s*$/, "").trim();
  if (collapsed && name && isHomeSide?.(name)) return "";
  return name;
}

export function lastTouchRead(
  notes: NoteForTouch[],
  touch: TouchSource | null,
  isHomeSide?: (name: string) => boolean,
): TouchRead | null {
  const out = newestOutbound(notes);
  const outAt = out ? Date.parse(out.createdAt) : NaN;
  const logAt = touch ? Date.parse(touch.contactedAt) : NaN;
  const hasOut = !Number.isNaN(outAt);
  const hasLog = !Number.isNaN(logAt);
  if (!hasOut && !hasLog) return null;
  if (hasOut && (!hasLog || outAt > logAt)) {
    // A filed outbound puts the ball with them until they write back.
    return {
      at: out!.createdAt,
      who: targetOf(out!.actors, isHomeSide),
      awaitingReply: true,
      source: "record",
    };
  }
  return {
    at: touch!.contactedAt,
    who: touch!.who,
    awaitingReply: touch!.awaitingReply,
    source: "log",
  };
}
