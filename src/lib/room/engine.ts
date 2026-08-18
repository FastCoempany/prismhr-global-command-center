// The Operating Room's per-deal read — pure and deterministic. Everything the
// row asserts (the next move, the climb, the health cap, whose court it is)
// derives from state the app already holds; nothing here guesses. When there
// isn't enough signal to call a move, it says so instead of inventing one.

import { DASH_NODES, DASH_NODE_KEYS } from "@/lib/dashboard/stages";

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
  // newest MEETING record — a meeting newer than any outbound puts the
  // follow-up on the operator: the recap is owed, never a "wait".
  lastMeeting?: { at: string; who: string } | null;
  // most recent record entry of ANY kind ("" = empty record)
  lastRecordAt: string;
  // every gate on every stage is checked but no outcome is stamped — the deal
  // is finished work waiting on the operator's call, never "not enough signal"
  allGatesDone?: boolean;
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

// ── The meter's own read ─────────────────────────────────────────────────────
// Where the deal sits and why, stated for the hover bubble. Position is the
// further of two truths: the board (checked gates) and the record (evidence
// the suggestion rules found for stages the board hasn't confirmed yet).
// Evidence sits the meter at the START of the evidenced stage — proof the
// stage is in play, never proof it's done.

export type MeterEvidence = { nodeKey: string; why: string };

export type MeterRead = {
  frac: number; // 0..1 meter position
  label: string; // the mono line under the bar
  why: string[]; // the hover bubble, line by line
};

const stageName = (key: string, labels?: Record<string, string>): string =>
  labels?.[key] ?? DASH_NODES.find((n) => n.key === key)?.label ?? key;

export function meterRead(i: {
  outcome: { status: "won" | "lost" } | null;
  step: { nodeKey: string; nodeLabel: string; item: string } | null;
  doneInStage: number;
  totalInStage: number;
  allGatesDone: boolean;
  evidence: MeterEvidence[];
  labels?: Record<string, string>;
}): MeterRead {
  const stages = DASH_NODE_KEYS.length || 1;
  if (i.outcome) {
    const word = i.outcome.status === "won" ? "Won" : "Lost";
    return {
      frac: 1,
      label: `CLOSED ${word.toUpperCase()}`,
      why: [`Stamped Closed ${word}. The meter is full.`],
    };
  }
  if (!i.step && i.allGatesDone) {
    return {
      frac: 1,
      label: "EVERY GATE CLOSED",
      why: ["Every gate on every stage is checked.", "Stamp Closed Won or Closed Lost."],
    };
  }

  const boardIdx = i.step ? DASH_NODE_KEYS.indexOf(i.step.nodeKey as never) : -1;
  const evIdx = i.evidence.reduce(
    (m, e) => Math.max(m, DASH_NODE_KEYS.indexOf(e.nodeKey as never)),
    -1,
  );
  const why: string[] = [];
  if (i.step) {
    why.push(
      `${i.step.nodeLabel}: ${i.doneInStage} of ${i.totalInStage} gates checked.`,
      `Next gate: ${i.step.item.slice(0, 90)}${i.step.item.length > 90 ? "…" : ""}`,
    );
  } else {
    why.push("No stage is active on the board.");
  }
  const ahead = i.evidence.filter(
    (e) => DASH_NODE_KEYS.indexOf(e.nodeKey as never) > boardIdx,
  );
  for (const e of ahead.slice(0, 2))
    why.push(`The record shows ${stageName(e.nodeKey, i.labels)} evidence: ${e.why}.`);
  if (ahead.length > 0) why.push("Confirm it in the stage drawer. The meter moves.");
  if (!i.step && i.evidence.length === 0)
    why.push("Check a gate or file a paste. The meter moves on evidence.");

  const boardFrac = climbFraction(i.step?.nodeKey ?? null, i.doneInStage, i.totalInStage);
  const evFrac = evIdx >= 0 ? Math.min(1, (evIdx + 0.15) / stages) : 0;
  const label = i.step
    ? `${i.step.nodeLabel.toUpperCase().slice(0, 16)} · ${i.doneInStage} OF ${i.totalInStage}`
    : evIdx >= 0
      ? `RECORD SAYS ${stageName(DASH_NODE_KEYS[evIdx], i.labels).toUpperCase().slice(0, 16)}`
      : "NOTHING IN FLIGHT";
  return { frac: Math.max(boardFrac, evFrac), label, why };
}

const QUIET_RED_DAYS = 5;
const AGE_RED_DAYS = 7;
// A meeting's recap stays the move for this long; past it the meeting is
// history and the ordinary rules speak again.
const RECAP_DAYS = 5;

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

  // A meeting newer than any outbound (and not yet answered by an inbound)
  // puts the follow-up on the operator — the recap is owed, never a "wait"
  // (the Staff Leasing 1:00 PM read, founder-decreed 2026-08-18). A recap
  // left unsent goes stale after RECAP_DAYS and the ordinary rules resume.
  const meetingAt = i.lastMeeting?.at ?? "";
  const meetingDays = meetingAt ? daysBetween(meetingAt, i.now) : null;
  const meetingNewest =
    !!meetingAt &&
    !Number.isNaN(Date.parse(meetingAt)) &&
    !inboundNewest &&
    (!i.lastTouch || Date.parse(meetingAt) >= Date.parse(i.lastTouch.at)) &&
    meetingDays != null &&
    meetingDays <= RECAP_DAYS;
  const meetingWho = (i.lastMeeting?.who || "").trim();
  const meetingAgo =
    meetingDays != null && meetingDays > 0 ? `${meetingDays} days ago` : "today";

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
      line: `YOUR MOVE · ${who} WROTE ${inboundDays ?? 0} DAYS AGO`,
      tone: "you",
    };
  } else if (meetingNewest) {
    const who = (meetingWho || "them").toUpperCase().slice(0, 24);
    court = {
      line: `YOUR MOVE · MET ${who} ${meetingDays === 0 ? "TODAY" : `${meetingDays}D AGO`}`,
      tone: "you",
    };
  } else if (i.lastTouch && i.lastTouch.awaitingReply) {
    const who = (i.lastTouch.who || "them").toUpperCase().slice(0, 24);
    const q = quietDays ?? 0;
    court =
      q >= QUIET_RED_DAYS
        ? { line: `THEIR MOVE · ${who} · QUIET ${q} DAYS`, tone: "quiet" }
        : { line: `THEIR MOVE · ${who} · ${q} DAYS`, tone: "them" };
  } else if (i.step) {
    court = { line: "YOUR MOVE", tone: "you" };
  } else if (i.allGatesDone) {
    court = { line: "YOUR MOVE · STAMP THE OUTCOME", tone: "you" };
  } else {
    court = { line: "NO THREAD OPEN YET", tone: "none" };
  }

  // Not enough signal — an honest read, never a fabricated move.
  if (!i.step && !hasRecord && !i.lastTouch && !i.allGatesDone) {
    return {
      move: "File a paste or a note. Not enough signal yet.",
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
  if (!i.step && !i.lastTouch && !inboundNewest && !i.allGatesDone) health = "quiet";

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
    // The board gate rides the row as its own chip — the move never says a
    // thing twice, and "close" the jargon is retired (decreed 2026-08-18).
    const who = inboundWho || "they";
    const ago =
      inboundDays != null && inboundDays > 0 ? `${inboundDays} days ago` : "today";
    move = wallOverdue
      ? `Answer ${who}. They wrote ${ago}. The ${i.timing!.phrase} wall passed.`
      : `Answer ${who}. They wrote ${ago}.`;
  } else if (inboundNewest) {
    const who = inboundWho || "they";
    move = `Answer ${who}. They wrote ${
      inboundDays != null && inboundDays > 0 ? `${inboundDays} days ago` : "today"
    }. The reply is owed.`;
  } else if (meetingNewest) {
    move = `Send ${meetingWho || "them"} the recap. You met ${meetingAgo}.`;
  } else if (i.step) {
    // The gate item is already an imperative ("Book the demo") — say it
    // plainly; never "close" it (decreed 2026-08-18).
    const raw = i.step.item.trim() || "Work the open item";
    const item = raw.charAt(0).toUpperCase() + raw.slice(1).replace(/\.+$/, "");
    if (quietLong && i.lastTouch) {
      const who = i.lastTouch.who || "them";
      move = clock
        ? `Chase ${who} on “${raw.toLowerCase()}”. Quiet ${quietDays} days. ${i.timing!.phrase} is the wall.`
        : `Chase ${who} on “${raw.toLowerCase()}”. Quiet ${quietDays} days.`;
    } else if (i.timing && wallOverdue) {
      move = `${item}. The ${i.timing.phrase} wall passed ${wallDaysPast} days ago. Decide whether the date moved or the deal did.`;
    } else if (i.timing) {
      move = `${item}. ${i.timing.phrase} is the clock.`;
    } else {
      move = `${item}. The stage asks nothing else.`;
    }
  } else if (i.allGatesDone) {
    // The whole board is checked and nothing is stamped — the row stays loud
    // until the operator calls it, never a hollow "not enough signal".
    move = "Stamp the outcome. Every gate is closed.";
  } else if (i.lastTouch && i.lastTouch.awaitingReply) {
    move = quietLong
      ? `Nudge ${i.lastTouch.who || "the thread"}. Quiet ${quietDays} days.`
      : `Wait on ${i.lastTouch.who || "their reply"}. Nothing owed on your side today.`;
  } else {
    move = "File a paste or a note. Not enough signal yet.";
    thin = true;
    health = "quiet";
  }

  return { move, thin, health, court, quietDays };
}
