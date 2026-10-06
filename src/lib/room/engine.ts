// The Operating Room's per-deal read — pure and deterministic. Everything the
// row asserts (the next move, the climb, the health cap) derives from state
// the app already holds; nothing here guesses. When there isn't enough signal
// to call a move, it says so instead of inventing one. Whose move it is comes
// from the single account read (src/lib/record/whose-move.ts, §2.2): the
// engine reads the verdict's rung and writes the sentence; it compares no
// clocks of its own. The court line is retired in full (ruled 2026-09-25,
// D25) — the move already says who and when.

import { DASH_NODES, DASH_NODE_KEYS } from "@/lib/dashboard/stages";
import { redactMoney } from "@/lib/intel/lexicon";
import { whoseMoveFrom, type WhoseMove } from "@/lib/record/whose-move";
import { chicagoDay } from "@/lib/tz";
import { splitFallback } from "./deliverables";
import { clip, moveFromCommitment, pickOwed } from "./move-line";
import { dayBlown } from "./owed";

export type Health = "red" | "amber" | "green" | "quiet";

/** One promise still open on their side, as the read's list carries it
 *  (src/lib/record/read.ts, theirPromises): a loop the read filed (D10), a
 *  line of the cleaner's Owed block, or the newest inbound's own words. The
 *  read's TheirPromise satisfies it as it stands. */
export type PromiseIn = {
  /** Who owes it, as the record names them; "" when it cannot say. */
  who: string;
  /** What they promised; "" when the record holds only that they did. */
  text: string;
  /** When it was made or filed: the clock a promise with no day runs on. */
  at: string;
  /** The day they named, yyyy-mm-dd; absent when they named none. */
  day?: string;
  /** The day ended with a hearer on record: PROMISED needs a hearer (D28). */
  promised?: boolean;
  /** Who heard it, as the record names them; absent when it names nobody. */
  hearer?: string;
  kind?: "loop" | "owed" | "inbound";
  /** The filed entry it came from, with its rung of the evidence ladder. */
  entry?: { at: string; rung: "tape" | "thread" | "notes" } | null;
};

type RoomInputs = {
  // The account as a person says it ("Simploy", never "Simploy, Inc."): the
  // move names it when the record cannot say who owes a promise.
  accountName: string;
  // the current stage step (null = nothing active on the card)
  step: {
    nodeKey: string;
    nodeLabel: string;
    item: string;
    ageDays: number | null;
  } | null;
  timing: { phrase: string; dateIso: string } | null;
  // Whose move it is, from the read (field 4). The rung decides which
  // sentence is written: a reply newer than our send is ours to answer, a
  // fresh meeting puts the recap on us, an acceptance books the meeting. A
  // caller holding the facts and no read may leave it out: the same rungs
  // run over the facts below through the one spelling (whoseMoveFrom).
  whoseMove?: WhoseMove | null;
  // last outbound touch on the account thread (null = no thread yet)
  lastTouch: { at: string; awaitingReply: boolean; who: string } | null;
  // newest INBOUND evidence in the record (a pasted client reply) — who wrote
  // and whether it was their promise; the read's lastInbound.
  lastInbound?: { at: string; who: string; promise?: boolean } | null;
  // newest MEETING record — who we met and when; the read's lastMeeting.
  lastMeeting?: { at: string; who: string } | null;
  // What THEY left the meeting owing — the record's own Owed line, client's
  // side (the Simploy call, 2026-09-03: the call ended with her invoices
  // gating the pricing, and the row said only "send the recap"), or a loop
  // on their side the read filed (D10). Read by the meeting move alone;
  // their reply landing flips the court and retires it. A loop carries the
  // day they named, and `promised` when that day ended with a hearer on
  // record — PROMISED needs a hearer (D28); a blown day with none is a wall.
  theirBall?: { who: string; text: string; day?: string; promised?: boolean } | null;
  // Every promise still open on their side, from the read (field 14's list).
  // Their promises show on the move line and nowhere else: TODAY stays the
  // operator's own list and THEIRS the second record's line (the face
  // approved with its ship order on 2026-10-06). A caller with no read may
  // leave it out; the newest inbound's own promise then stands alone, as the
  // engine's own suites hand it in.
  theirPromises?: readonly PromiseIn[];
  // The newest invitation ACCEPTANCE in the record. It is machinery, so it
  // never opens a reply-owed — but it is proof the meeting exists, and a row
  // that says "wait on Melanie" while Melanie has already accepted is telling
  // the operator to wait for a thing that arrived (HR Hawaii, 2026-09-04).
  // The read's lastAccepted.
  lastAccepted?: { at: string; who: string } | null;
  // most recent record entry of ANY kind ("" = empty record)
  lastRecordAt: string;
  // every gate on every stage is checked but no outcome is stamped — the deal
  // is finished work waiting on the operator's call, never "not enough signal"
  allGatesDone?: boolean;
  // OPEN OBLIGATIONS on this account — the register's live action items and
  // the record's owed-to-you lines, newest-first. A thing owed always beats a
  // thing wondered: the stage answers "what do we owe them, or they us",
  // never "what don't we know yet" (founder-decreed 2026-08-29).
  // Each carries what ranks it: a blown wall outranks a date, a date
  // outranks position in the store (founder-decreed 2026-09-03 — the row's
  // instruction used to be whichever item the sheet happened to list first).
  openOwed?: { text: string; wall?: boolean; due?: string }[];
  now: Date;
};

export type RoomRead = {
  move: string; // plain sentence — "" never happens; thin reads are sentences too
  // The whole commitment the move was built from, when the line holds
  // anything back. Every compression is a door (the click-depth law): the
  // row renders this behind the move, one click deep. "" when the line IS
  // the whole thing. A promise line's door is one line per open promise,
  // newline-joined: who, what, who heard it, the day, and the filed entry.
  moveFull?: string;
  thin: boolean; // true = not-enough-signal read
  health: Health;
  quietDays: number | null;
};

const DAY = 86_400_000;

// Day grammar (founder-decreed 2026-08-22): one day back is "yesterday",
// never "1 days ago"; a one-day quiet is "Quiet 1 day."
const daysAgo = (n: number): string => (n === 1 ? "yesterday" : `${n} days ago`);
const nDays = (n: number): string => `${n} day${n === 1 ? "" : "s"}`;

// A promised day as the reason line says it: "today", a weekday inside the
// coming week ("Friday"), else the date ("10/17"). Chicago days throughout.
const md = (dayIso: string): string =>
  new Date(`${dayIso}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "numeric",
    day: "numeric",
  });
const dayWord = (dayIso: string, now: Date): string => {
  const today = chicagoDay(now);
  if (dayIso === today) return "today";
  const ahead = Math.round(
    (Date.parse(`${dayIso}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / DAY,
  );
  if (ahead > 0 && ahead < 7)
    return new Date(`${dayIso}T12:00:00Z`).toLocaleDateString("en-US", {
      timeZone: "UTC",
      weekday: "long",
    });
  return md(dayIso);
};

// The loop's reason, after the meeting move names what they owe: the day
// they named while it stands; PROMISED with its date once it ended with a
// hearer on record; a plain wall when it ended with none (D28).
const loopReason = (ball: { day?: string; promised?: boolean }, now: Date): string => {
  const day = ball.day ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  if (day >= chicagoDay(now)) return ` Promised ${dayWord(day, now)}.`;
  return ball.promised ? ` PROMISED ${md(day)}.` : ` The ${md(day)} wall passed.`;
};

// Their promise holds an await this long before the chase resumes — a
// "will be in touch" is theirs to keep for a week, then it's yours to chase
// (the closer rule's case table, founder-decreed 2026-08-22). It is the
// clock of every promise that named no day.
const PROMISE_AWAIT_DAYS = 7;

// ── their promises on the move line (the face approved 2026-10-06) ────────
// While a promise stands and the operator owes nothing else, the move says
// to wait and names the day. Once the day passes it is the operator's move:
// chase, with PROMISED and its date when someone heard the day (the closer
// rule), a plain wall when nobody did (D28). A promise with no day keeps
// the await window. "Hold for their follow-up" and "Chase the follow-up"
// retired into these lines, so one fact has one wording.

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const firstOf = (name: string): string => (name ?? "").trim().split(/\s+/)[0] ?? "";

// The evidence ladder's own cite words (CLAUDE.md, the playbook authoring
// canon, item 14), as the door says them in a sentence.
const RUNG_WORD = {
  tape: "On tape",
  thread: "Filed thread",
  notes: "Call notes",
} as const;

type Pressed = {
  p: PromiseIn;
  // 0 PROMISED, 1 a wall, 2 a dayless chase, 3 due today, 4 a day ahead,
  // 5 a dayless wait: the operator's chases first, then the nearest wait.
  tier: number;
  clock: number;
  line: string;
  // The day passed: the move is the operator's chase, no longer a wait.
  yours: boolean;
};

function pressOf(p: PromiseIn, now: Date, fallback: string): Pressed {
  const who = firstOf(p.who) || fallback;
  const day = ISO_DAY.test(p.day ?? "") ? (p.day as string) : "";
  if (day) {
    const clock = Date.parse(`${day}T12:00:00Z`);
    if (dayBlown(day, now))
      return p.promised
        ? { p, tier: 0, clock, line: `Chase ${who}. PROMISED ${md(day)}.`, yours: true }
        : {
            p,
            tier: 1,
            clock,
            line: `Chase ${who}. The ${md(day)} wall passed.`,
            yours: true,
          };
    if (day === chicagoDay(now))
      return { p, tier: 3, clock, line: `Wait on ${who}. Due today.`, yours: false };
    return {
      p,
      tier: 4,
      clock,
      line: `Wait on ${who}. Promised ${dayWord(day, now)}.`,
      yours: false,
    };
  }
  const days = daysBetween(p.at, now);
  const ago = days != null && days > 0 ? daysAgo(days) : "today";
  const at = Date.parse(p.at);
  const clock = Number.isNaN(at) ? Number.MAX_SAFE_INTEGER : at;
  return days != null && days > PROMISE_AWAIT_DAYS
    ? { p, tier: 2, clock, line: `Chase ${who}. Promised ${ago}.`, yours: true }
    : { p, tier: 5, clock, line: `Wait on ${who}. Promised ${ago}.`, yours: false };
}

/** One line of the door: who owes it, what, who heard it, the day, and the
 *  filed entry it came from with its rung. Money never renders. */
function doorLine(p: PromiseIn, now: Date, fallback: string): string {
  const parts = [(p.who ?? "").trim() || fallback];
  const what = (p.text ?? "").replace(/\s+/g, " ").trim();
  if (what) parts.push(/[.!?…]$/.test(what) ? what : `${what}.`);
  const hearer = (p.hearer ?? "").trim();
  const day = ISO_DAY.test(p.day ?? "") ? (p.day as string) : "";
  if (day) {
    const word = dayWord(day, now);
    const when = dayBlown(day, now)
      ? md(day)
      : day === chicagoDay(now)
        ? `Today ${md(day)}`
        : word === md(day)
          ? word
          : `${word} ${md(day)}`;
    if (hearer) parts.push(`Promised to ${hearer}`, when);
    else parts.push(`Due ${when}`, "no hearer on record");
  } else {
    if (hearer) parts.push(`Promised to ${hearer}`);
    parts.push("No day given");
  }
  const filed = p.entry ? chicagoDay(p.entry.at) : "";
  if (p.entry && filed) parts.push(`${RUNG_WORD[p.entry.rung]} ${md(filed)}`);
  return redactMoney(parts.join(" · "));
}

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

type MeterEvidence = { nodeKey: string; why: string };

type MeterRead = {
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
      `Next gate: ${clip(i.step.item, 90).text}`,
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

export function readDeal(i: RoomInputs): RoomRead {
  const quietDays = i.lastTouch ? daysBetween(i.lastTouch.at, i.now) : null;
  const hasRecord = !!i.lastRecordAt && !Number.isNaN(Date.parse(i.lastRecordAt));

  // Whose move: the read's verdict, or the same rungs over the facts in hand.
  // The engine writes the sentence the rung calls for and compares no clocks
  // of its own (§2.2, the fifth migration).
  const verdict =
    i.whoseMove ??
    whoseMoveFrom(
      {
        lastTouch: i.lastTouch,
        inbound: i.lastInbound ? { at: i.lastInbound.at, who: i.lastInbound.who } : null,
        meeting: i.lastMeeting ?? null,
        accepted: i.lastAccepted ?? null,
        loop: null,
      },
      i.now,
    );

  // A pasted client reply newer than the last outbound: the "quiet Nd, chase
  // them" story is a lie once they've answered — you owe.
  const inboundNewest = verdict.rung === "reply";
  const inboundDays = inboundNewest ? daysBetween(i.lastInbound?.at ?? "", i.now) : null;
  const inboundWho = (i.lastInbound?.who || "").trim();

  // The newest inbound is THEIR promise, relayed or direct: nothing is owed
  // from this side, so it is never "Answer" the person who made it. It
  // counts while it is the newest thing; once we write after it, the send
  // rung speaks, as it always has.
  const inboundPromise = inboundNewest && !!i.lastInbound?.promise;
  const answerOwed = inboundNewest && !inboundPromise;

  // Their open promises, the most pressing first. The read's list carries
  // the inbound's promise beside the loops, already one line per promise; a
  // caller with no list has only the inbound's.
  const promises: readonly PromiseIn[] = i.theirPromises
    ? i.theirPromises.filter((p) => p.kind !== "inbound" || inboundPromise)
    : inboundPromise
      ? [{ who: inboundWho, text: "", at: i.lastInbound?.at ?? "", kind: "inbound" }]
      : [];
  const fallbackWho = i.accountName.trim() || "them";
  const pressed = promises
    .map((p) => pressOf(p, i.now, fallbackWho))
    .sort((a, b) => a.tier - b.tier || a.clock - b.clock);
  const lead = pressed[0] ?? null;

  // A meeting newer than any outbound (and not yet answered by an inbound)
  // puts the follow-up on the operator — the recap is owed, never a "wait"
  // (the Staff Leasing 1:00 PM read, founder-decreed 2026-08-18). A recap
  // left unsent goes stale after the recap window and the ordinary rules
  // resume; the window is the rung's (src/lib/record/whose-move.ts).
  const meetingNewest = verdict.rung === "meeting";
  const meetingDays = meetingNewest ? daysBetween(i.lastMeeting?.at ?? "", i.now) : null;
  const meetingWho = (i.lastMeeting?.who || "").trim();
  const meetingAgo =
    meetingDays != null && meetingDays > 0 ? daysAgo(meetingDays) : "today";

  // The meeting is on the books: an acceptance newer than our last send, and
  // no real reply or meeting after it.
  const acceptedNewest = verdict.rung === "acceptance";
  const acceptedWho = (i.lastAccepted?.who || "").trim();

  // A dated wall is a real calendar fact — expire and escalate it.
  const wallMs = i.timing?.dateIso ? Date.parse(i.timing.dateIso) : NaN;
  const wallDaysPast = Number.isNaN(wallMs)
    ? null
    : Math.floor((i.now.getTime() - wallMs) / DAY);
  const wallOverdue = wallDaysPast != null && wallDaysPast > 0;

  // Not enough signal — an honest read, never a fabricated move.
  if (!i.step && !hasRecord && !i.lastTouch && !i.allGatesDone && !lead) {
    return {
      move: "File a paste or a note. Not enough signal yet.",
      thin: true,
      health: "quiet",
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

  // The newest open obligation, as the stage carries it: the commitment ONLY.
  // An action body is `text ↯ fallback · from 7/29 paste` — the fallback is
  // the contingency for when the wall blows and the tail is provenance, and
  // neither is the thing owed. Carrying the raw body ran the stage into its
  // own character cap and ellipsed a sentence mid-word (2026-08-29).
  // The move a commitment becomes. The stored body is
  // `text ↯ fallback · from 7/29 paste` — the fallback is the contingency for
  // when the wall blows and the tail is provenance, and neither is the thing
  // owed. What survives is the INSTRUCTION, built clause-first and trimmed
  // only on a word boundary; the whole commitment rides beside it for the
  // door (src/lib/room/move-line.ts).
  const owedPick = pickOwed(i.openOwed ?? []);
  const owedBuilt = owedPick
    ? moveFromCommitment(splitFallback(owedPick.text).text)
    : { line: "", full: "", cut: false };
  const owedNow = owedBuilt.line;

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
  // The operator already moved today: a filed send or a logged touch puts
  // the ball with them until tomorrow (the Infiniti demo-times drop,
  // founder-decreed 2026-08-19). Never on a reply newer than that send.
  const wroteToday =
    !!i.lastTouch &&
    i.lastTouch.awaitingReply &&
    quietDays === 0 &&
    !i.allGatesDone &&
    !inboundNewest;
  // Their promise, standing or blown, leads only when the operator owes
  // nothing else: a thing owed, a late gate and the stamp all outrank it,
  // and a reply and a recap are taken before it ever gets here. Chasing
  // their slip never jumps ahead of something we owe; the closer rule makes
  // our own blown promise the strongest thing on a row (ruled for slice 18b
  // on 2026-10-06).
  const owesElse =
    !!owedNow ||
    (!!i.step && (quietLong || (wallOverdue && wallDaysPast != null))) ||
    !!i.allGatesDone;
  // A nudge is the operator's own cadence on a quiet send, not a thing
  // owed: its reason is a clock. A blown promise's reason is a promise
  // someone heard, and a promise made outranks recency (the writing canon),
  // so only a blown promise jumps a nudge; one that stands yields to it
  // (ruled for slice 18b on 2026-10-06).
  const nudgeDue = !!i.lastTouch?.awaitingReply && quietLong;
  // A blown promise is the operator's chase, over every wait. The one wait
  // it yields to is the chase itself: a send to the person who owes it,
  // today, so the row acknowledges the send it just read, and the chase
  // carries tomorrow.
  const chasedToday =
    !!lead &&
    lead.yours &&
    wroteToday &&
    firstOf(lead.p.who) !== "" &&
    firstOf(lead.p.who).toLowerCase() === firstOf(i.lastTouch?.who ?? "").toLowerCase();
  let door = "";
  if (answerOwed && i.step) {
    // The board gate rides the row as its own chip — the move never says a
    // thing twice, and "close" the jargon is retired (decreed 2026-08-18).
    const who = inboundWho || "they";
    const ago = inboundDays != null && inboundDays > 0 ? daysAgo(inboundDays) : "today";
    move = wallOverdue
      ? `Answer ${who}. They wrote ${ago}. The ${i.timing!.phrase} wall passed.`
      : `Answer ${who}. They wrote ${ago}.`;
  } else if (answerOwed) {
    const who = inboundWho || "they";
    // "Answer" already says the reply is owed — the reason is just the
    // trigger (founder-decreed 2026-08-22).
    move = `Answer ${who}. They wrote ${
      inboundDays != null && inboundDays > 0 ? daysAgo(inboundDays) : "today"
    }.`;
  } else if (meetingNewest) {
    const ball = (i.theirBall?.text ?? "").trim();
    if (ball) {
      // The meeting ended with a deliverable on THEIR side. The recap is
      // still the operator's send, and the second sentence says what the
      // room is waiting on.
      const owner = (i.theirBall?.who ?? "").split(/\s+/)[0];
      const who = owner && owner !== (meetingWho.split(/\s+/)[0] ?? "") ? owner : "They";
      const verb = who === "They" ? "owe" : "owes";
      const thing = clip(ball, 64).text;
      move = `Send ${meetingWho || "them"} the recap. ${who} ${verb} ${thing}.${loopReason(i.theirBall ?? {}, i.now)}`;
    } else {
      move = `Send ${meetingWho || "them"} the recap. You met ${meetingAgo}.`;
    }
  } else if (lead && !owesElse && (lead.yours ? !chasedToday : !nudgeDue)) {
    // Their promise, on the move line and nowhere else. A blown one is the
    // operator's chase and ranks under everything the operator owes, over a
    // nudge and every wait; one that stands is the wait itself. With more open, the most
    // pressing leads and the reason ends in "+N"; the door opens them all,
    // one line each.
    const more = pressed.length - 1;
    move = more > 0 ? `${lead.line} +${more}` : lead.line;
    door = pressed.map((x) => doorLine(x.p, i.now, fallbackWho)).join("\n");
  } else if (acceptedNewest && !owedNow) {
    // Nothing is owed either way — the invitation was accepted and the next
    // real event is the meeting itself.
    move = `Wait for the meeting. ${acceptedWho || "They"} accepted.`;
  } else if (wroteToday && i.lastTouch) {
    // The open gate rides its own chip; the row must acknowledge the send
    // it just read.
    move = `Wait on ${i.lastTouch.who || "their reply"}. You wrote today.`;
  } else if (owedNow) {
    // A thing owed. The register carries the rest; the stage carries the one.
    move = clock && wallOverdue ? `${owedNow} ${clock.replace(/^— /, "")}.` : owedNow;
  } else if (i.step && (quietLong || (wallOverdue && wallDaysPast != null))) {
    // A gate is only ever a MOVE when someone is late on it — then it is a
    // chase (they owe an answer) or a blown date (a commitment passed), both
    // obligations. The bare "here is what we don't know" case is not a move
    // at all: it rides UNKNOWN and the row's own chip, and the stage would
    // only be saying the register's line twice (founder-decreed 2026-08-29).
    const raw = i.step.item.trim() || "the open item";
    if (quietLong && i.lastTouch) {
      const who = i.lastTouch.who || "them";
      move = clock
        ? `Chase ${who} on “${raw.toLowerCase()}”. Quiet ${nDays(quietDays)}. ${i.timing!.phrase} is the wall.`
        : `Chase ${who} on “${raw.toLowerCase()}”. Quiet ${nDays(quietDays)}.`;
    } else {
      move = `The ${i.timing!.phrase} wall passed ${daysAgo(wallDaysPast ?? 0)}. Decide whether the date moved or the deal did.`;
    }
  } else if (i.allGatesDone) {
    // The whole board is checked and nothing is stamped — the row stays loud
    // until the operator calls it, never a hollow "not enough signal".
    move = "Stamp the outcome. Every gate is closed.";
  } else if (i.lastTouch && i.lastTouch.awaitingReply) {
    move = quietLong
      ? `Nudge ${i.lastTouch.who || "the thread"}. Quiet ${nDays(quietDays)}.`
      : `Wait on ${i.lastTouch.who || "their reply"}. Nothing owed on your side today.`;
  } else if (i.step) {
    // Nothing is owed in either direction and the board still has an open
    // gate. Say that plainly and point at where the questions live, rather
    // than reprinting one of them as if it were work owed.
    move = "Nothing owed either way. The open gates are in UNKNOWN.";
  } else {
    move = "File a paste or a note. Not enough signal yet.";
    thin = true;
    health = "quiet";
  }

  // The door: a promise line always opens to what was promised; an owed
  // line only when the printed line really is shorter than the thing.
  const moveFull =
    door ||
    (owedNow && move.includes(owedNow.replace(/\.$/, "")) && owedBuilt.cut
      ? owedBuilt.full
      : "");
  return { move, thin, health, quietDays, ...(moveFull ? { moveFull } : {}) };
}
