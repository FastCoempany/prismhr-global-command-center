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

  // Court — whose move it is, in one mono line.
  let court: RoomRead["court"];
  if (i.lastTouch && i.lastTouch.awaitingReply) {
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

  // Health — worst applicable condition wins.
  let health: Health = "green";
  const stale = i.step?.ageDays != null && i.step.ageDays >= AGE_RED_DAYS;
  const quietLong = quietDays != null && quietDays >= QUIET_RED_DAYS;
  if ((quietLong && i.timing) || (stale && quietLong)) health = "red";
  else if (
    quietLong ||
    stale ||
    (i.step && i.step.ageDays != null && i.step.ageDays >= 3)
  )
    health = "amber";
  if (!i.step && !i.lastTouch) health = "quiet";

  // The move — one plain sentence built from what's actually known.
  let move: string;
  let thin = false;
  if (i.step) {
    const item = i.step.item.trim() || "the open item";
    if (quietLong && i.lastTouch) {
      const who = i.lastTouch.who || "them";
      move = i.timing
        ? `Chase ${who} on “${item.toLowerCase()}” — quiet ${quietDays} days against ${i.timing.phrase}.`
        : `Chase ${who} on “${item.toLowerCase()}” — quiet ${quietDays} days.`;
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
