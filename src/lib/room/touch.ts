// The touch clock: when the operator last reached this deal, read from the
// LATEST of two stores — the outreach touch log AND the record's own outbound
// entries. A filed email is as real a touch as a logged send; the room must
// never demand an answer the record proves was already given (the Simploy
// Aug 5 nudge, caught 2026-08-14). Pure — testable.

import { MINE_RE } from "@/lib/intel/provenance";
import { isMeetingNote } from "@/lib/intel/meeting";
import { effectiveAt } from "@/lib/intel/clock";

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
export function newestOutbound(
  notes: NoteForTouch[],
  opts: {
    /** Today. Omitted, the future check sits out and the read is unchanged —
     *  the function stays pure for callers that hand it no clock. */
    now?: Date;
  } = {},
): NoteForTouch | null {
  let best: NoteForTouch | null = null;
  for (const n of notes) {
    const arrow = (n.actors ?? "").indexOf("→");
    if (arrow < 0) continue;
    const sender = n.actors.slice(0, arrow);
    if (!MINE_RE.test(sender)) continue;
    // A note the operator addressed to nobody but themselves never reached
    // the account, so nothing is owed back and there is no one to wait on.
    // Salesforce files a self-assigned task exactly this way — "Follow up
    // with TrendHR · Antaeus Coe → Antaeus Coe" — and the row read it as a
    // send (Trend Personnel Services, 2026-09-23).
    if (selfAddressed(n.actors)) continue;
    // A meeting record is not correspondence — nobody awaits a reply to a
    // meeting that already happened (the Staff Leasing 1:00 PM, 2026-08-18).
    if (isMeetingNote(n)) continue;
    // The OL head's clock refines the noon day-anchor — an outbound is
    // compared (and returned) at the moment it actually went, or the same-day
    // inbound after it can never win the court (2026-09-02).
    const t = Date.parse(effectiveAt(n.createdAt, n.body));
    if (Number.isNaN(t)) continue;
    // A send dated ahead of today has not happened yet. A scheduled task is
    // filed the moment it is created, and daysBetween clamps a future stamp
    // to zero — so the same Trend row announced "You wrote today" about a
    // reminder set for the following week. It is a real appointment; it is
    // not a touch, and it is not in the past.
    if (opts.now && t > opts.now.getTime()) continue;
    if (!best || t > Date.parse(effectiveAt(best.createdAt, best.body))) best = n;
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
  // The operator is never the person the operator is waiting on, whether or
  // not the line collapsed. A COLLEAGUE still can be — a send addressed only
  // to Anika leaves the ball with Anika, and that read is deliberate — but
  // nobody waits on themselves (Trend Personnel Services, 2026-09-23).
  if (name && MINE_RE.test(name)) return "";
  if (collapsed && name && isHomeSide?.(name)) return "";
  return name;
}

/** A send whose only named recipient is the operator. Collapsed lines are
 *  excluded: a "+2" means other people were on it, and one of them is very
 *  likely the account. */
function selfAddressed(actors: string): boolean {
  const arrow = (actors ?? "").indexOf("→");
  if (arrow < 0) return false;
  const tail = actors.slice(arrow + 1);
  if (/\+\d+\s*$/.test(tail)) return false;
  const name = tail.trim();
  return !!name && MINE_RE.test(name);
}

export function lastTouchRead(
  notes: NoteForTouch[],
  touch: TouchSource | null,
  isHomeSide?: (name: string) => boolean,
  now?: Date,
): TouchRead | null {
  const out = newestOutbound(notes, { now });
  const outAt = out ? Date.parse(effectiveAt(out.createdAt, out.body)) : NaN;
  const logAt = touch ? Date.parse(touch.contactedAt) : NaN;
  const hasOut = !Number.isNaN(outAt);
  const hasLog = !Number.isNaN(logAt);
  if (!hasOut && !hasLog) return null;
  if (hasOut && (!hasLog || outAt > logAt)) {
    // A filed outbound puts the ball with them until they write back.
    return {
      at: effectiveAt(out!.createdAt, out!.body),
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
