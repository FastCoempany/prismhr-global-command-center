// The touch clock: when the operator last reached this deal, read from the
// LATEST of two stores — the outreach touch log AND the record's own outbound
// entries. A filed email is as real a touch as a logged send; the room must
// never demand an answer the record proves was already given (the Simploy
// Aug 5 nudge, caught 2026-08-14). Pure — testable.

export type TouchSource = {
  contactedAt: string; // ISO
  awaitingReply: boolean;
  who: string;
};

export type NoteForTouch = {
  actors: string; // "Sender → Target [+n]" — "" when unattributed
  createdAt: string; // ISO, activity's own moment
};

export type TouchRead = {
  at: string;
  who: string; // the person reached — "" when unknown
  awaitingReply: boolean;
  source: "log" | "record";
};

const OPERATOR = /^\s*antaeus\b/i;

// The record's newest outbound: an entry whose actors name the operator as
// the sender. Inbound traffic and unattributed notes never count.
export function newestOutbound(notes: NoteForTouch[]): NoteForTouch | null {
  let best: NoteForTouch | null = null;
  for (const n of notes) {
    const arrow = (n.actors ?? "").indexOf("→");
    if (arrow < 0) continue;
    const sender = n.actors.slice(0, arrow);
    if (!OPERATOR.test(sender)) continue;
    const t = Date.parse(n.createdAt);
    if (Number.isNaN(t)) continue;
    if (!best || t > Date.parse(best.createdAt)) best = n;
  }
  return best;
}

function targetOf(actors: string): string {
  const arrow = actors.indexOf("→");
  if (arrow < 0) return "";
  return actors
    .slice(arrow + 1)
    .replace(/\+\d+\s*$/, "")
    .trim();
}

export function lastTouchRead(
  notes: NoteForTouch[],
  touch: TouchSource | null,
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
      who: targetOf(out!.actors),
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
