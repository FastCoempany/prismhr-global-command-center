// The Operating Room's per-deal read — pure and deterministic. Everything the
// row asserts (the next move, the climb, the health cap, whose court it is)
// derives from state the app already holds; nothing here guesses. When there
// isn't enough signal to call a move, it says so instead of inventing one.

import { DASH_NODE_KEYS } from "@/lib/dashboard/stages";

export type Health = "red" | "amber" | "green" | "quiet";

export type RoomInputs = {
  accountName: string;
  // the current stage step (null = nothing active on the card)
  step: {
    nodeKey: string;
    nodeLabel: string;
    item: string;
    ageDays: number | null;
  } | null;
  timing: { phrase: string; dateIso: string } | null;
  // last outbound touch on the account thread (null = no thread yet)
  lastTouch: { at: string; awaitingReply: boolean; who: string } | null;
  // newest INBOUND evidence in the record (a pasted client reply) — when it
  // postdates the last outbound touch, the court flips: you owe the answer.
  lastInbound?: { at: string; who: string } | null;
  // most recent record entry of ANY kind ("" = empty record)
  lastRecordAt: string;
  now: Date;
};

export type RoomRead = {
  move: string; // plain sentence — "" never happens; thin reads are sentences too
  thin: boolean; // true = not-enough-signal read
  health: Health;
  court: { line: string; tone: "you" | "them" | "quiet" | "none" };
  quietDays: number | null;
};

const DAY = 86_400_000;

export function daysBetween(iso: string, now: Date): number | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now.getTime() - t) / DAY));
}

// Climb: fraction of the whole pipeline covered — full stages behind the
// current one plus progress inside it. Clamped hard; bad input can't overflow.
export function climbFraction(
  nodeKey: string | null,
  doneInStage: number,
  totalInStage: number,
): number {
  const stages = DASH_NODE_KEYS.length || 1;
  const idx = nodeKey ? DASH_NODE_KEYS.indexOf(nodeKey as never) : -1;
  if (idx < 0) return 0;
  const total = totalInStage > 0 ? totalInStage : 1;
  const inner = Math.min(1, Math.max(0, doneInStage / total));
  return Math.min(1, Math.max(0, (idx + inner) / stages));
}

const QUIET_RED_DAYS = 5;
const AGE_RED_DAYS = 7;

export function readDeal(i: RoomInputs): RoomRead {
  const quietDays = i.lastTouch ? daysBetween(i.lastTouch.at, i.now) : null;
  const hasRecord = !!i.lastRecordAt && !Number.isNaN(Date.parse(i.lastRecordAt));

  // A pasted client reply newer than the last outbound flips the court: the
  // "quiet Nd, chase them" story is a lie once they've answered — you owe.
  const inboundAt = i.lastInbound?.at ?? "";
  const inboundNewest =
    !!inboundAt &&
    !Number.isNaN(Date.parse(inboundAt)) &&
    (!i.lastTouch || Date.parse(inboundAt) > Date.parse(i.lastTouch.at));
  const inboundDays = inboundNewest ? daysBetween(inboundAt, i.now) : null;
  const inboundWho = (i.lastInbound?.who || "").trim();

  // A dated wall is a real calendar fact — expire and escalate it.
  const wallMs = i.timing?.dateIso ? Date.parse(i.timing.dateIso) : NaN;
  const wallDaysPast = Number.isNaN(wallMs)
    ? null
    : Math.floor((i.now.getTime() - wallMs) / DAY);
  const wallOverdue = wallDaysPast != null && wallDaysPast > 0;

  // Court — whose move it is, in one mono line.
  let court: RoomRead["court"];
  if (inboundNewest) {
    const who = (inboundWho || "they").toUpperCase().slice(0, 24);
    court = {
      line: `YOUR MOVE — ${who} WROTE · ${inboundDays ?? 0}D AGO`,
      tone: "you",
    };
  } else if (i.lastTouch && i.lastTouch.awaitingReply) {
    const who = (i.lastTouch.who || "them").toUpperCase().slice(0, 24);
    const q = quietDays ?? 0;
    court =
      q >= QUIET_RED_DAYS
        ? { line: `THEIR MOVE — ${who} · QUIET ${q}D`, tone: "quiet" }
        : { line: `THEIR MOVE — ${who} · ${q}D`, tone: "them" };
  } else if (i.step) {
    court = { line: "YOUR MOVE", tone: "you" };
  } else {
    court = { line: "NO THREAD OPEN YET", tone: "none" };
  }

  // Not enough signal — an honest read, never a fabricated move.
  if (!i.step && !hasRecord && !i.lastTouch) {
    return {
      move: "Not enough signal yet to call a move — file a paste or a note and the room will call it.",
      thin: true,
      health: "quiet",
      court,
      quietDays,
    };
  }

  // Health — worst applicable condition wins. An inbound reply suppresses the
  // quiet-driven alarms (the deal is alive; the ball is simply yours), but an
  // expired wall is red regardless of who owes.
  let health: Health = "green";
  const stale = i.step?.ageDays != null && i.step.ageDays >= AGE_RED_DAYS;
  const quietLong = !inboundNewest && quietDays != null && quietDays >= QUIET_RED_DAYS;
  if (wallOverdue || (quietLong && i.timing) || (stale && quietLong)) health = "red";
  else if (
    quietLong ||
    stale ||
    (i.step && i.step.ageDays != null && i.step.ageDays >= 3)
  )
    health = "amber";
  if (!i.step && !i.lastTouch && !inboundNewest) health = "quiet";

  // The move — one plain sentence built from what's actually known.
  let move: string;
  let thin = false;
  // Timing phrases read differently by kind: a dated anchor ("Sept 1 target")
  // is a wall to race; a bare descriptor ("time-sensitive") is the ask's nature.
  const clock = i.timing
    ? wallOverdue
      ? `— the ${i.timing.phrase} wall passed ${wallDaysPast}d ago`
      : /\d/.test(i.timing.phrase)
        ? `against ${i.timing.phrase}`
        : `on a ${i.timing.phrase.toLowerCase()} ask`
    : "";
  if (inboundNewest && i.step) {
    const item = i.step.item.trim() || "the open item";
    const who = inboundWho || "they";
    const ago = inboundDays != null && inboundDays > 0 ? `${inboundDays}d ago` : "today";
    move = wallOverdue
      ? `Answer ${who} — they wrote ${ago} ${clock}. Then close “${item.toLowerCase()}”.`
      : `Answer ${who} — they wrote ${ago} and the reply is owed. Then close “${item.toLowerCase()}”.`;
  } else if (inboundNewest) {
    const who = inboundWho || "they";
    move = `Answer ${who} — their message from ${
      inboundDays != null && inboundDays > 0 ? `${inboundDays}d ago` : "today"
    } is waiting on you.`;
  } else if (i.step) {
    const item = i.step.item.trim() || "the open item";
    if (quietLong && i.lastTouch) {
      const who = i.lastTouch.who || "them";
      move = clock
        ? `Chase ${who} on “${item.toLowerCase()}” — quiet ${quietDays} days ${clock}.`
        : `Chase ${who} on “${item.toLowerCase()}” — quiet ${quietDays} days.`;
    } else if (i.timing && wallOverdue) {
      move = `Close “${item.toLowerCase()}” ${clock} — decide whether the date moved or the deal did.`;
    } else if (i.timing) {
      move = `Close “${item.toLowerCase()}” — ${i.timing.phrase} is the clock it's on.`;
    } else {
      move = `Close “${item.toLowerCase()}” — it's the one thing this stage still needs.`;
    }
  } else if (i.lastTouch && i.lastTouch.awaitingReply) {
    move = quietLong
      ? `Nudge ${i.lastTouch.who || "the thread"} — quiet ${quietDays} days with nothing owed on your side.`
      : `Waiting on ${i.lastTouch.who || "their reply"} — nothing owed on your side today.`;
  } else {
    move =
      "Not enough signal yet to call a move — file a paste or a note and the room will call it.";
    thin = true;
    health = "quiet";
  }

  return { move, thin, health, court, quietDays };
}
