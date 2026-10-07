// Their promise on the HomeRoom row's move line (slice 18b of the Chute
// brains refactor; the face approved with its ship order on 2026-10-06).
// Their promises show on the move line and nowhere else. While one stands
// and the operator owes nothing else, the move says to wait and names the
// day; on the day it says "Due today"; once the day passes it is the
// operator's chase, PROMISED with its date when someone heard the day (the
// closer rule) and a plain wall when nobody did (D28). A promise with no day
// keeps the await window. Either way it ranks under everything the operator
// owes and over every wait; a blown one also jumps a nudge, which one that
// stands yields to. The line is a door: one click opens every open
// promise, one line each, and "+N" says how many more are open.
//
// The engine is pure and these pins drive it by hand; the read's list is
// pinned through readAccount on the same fixtures, and the room's door
// rendering through the client's first paint.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { join } from "node:path";
import { cwd } from "node:process";
import { promiseStands, readDeal, type PromiseIn } from "../src/lib/room/engine";
import { readAccount, type RecordNote } from "../src/lib/record/read";
import { evidenceRung } from "../src/lib/record/docs";
import { NO_TAGS, withTags } from "../src/lib/today/route-notes";
import { render, roomClient, roomRow, textOf } from "./helpers/room-render";

// 2026-10-06 is a Tuesday; 2026-10-09 the Friday after it.
const TUE = new Date("2026-10-06T17:00:00Z");
const FRI = new Date("2026-10-09T17:00:00Z");
const MON = new Date("2026-10-12T17:00:00Z");

const base = {
  accountName: "Simploy",
  step: null,
  timing: null,
  lastTouch: null,
  lastRecordAt: "2026-10-06T14:00:00Z",
};

const CENSUS = "Send the census for the Mexico hires";

const adam = (over: Partial<PromiseIn> = {}): PromiseIn => ({
  who: "Adam Bell",
  text: CENSUS,
  at: "2026-10-06T14:00:00Z",
  day: "2026-10-09",
  hearer: "Antaeus Coe",
  kind: "loop",
  entry: { at: "2026-10-06T14:00:00Z", rung: "thread" },
  ...over,
});

const startDates: PromiseIn = {
  who: "",
  text: "Confirm the Mexico start dates",
  at: "2026-10-02T15:00:00Z",
  day: "2026-10-14",
  hearer: "Antaeus Coe",
  kind: "loop",
  entry: { at: "2026-10-02T15:00:00Z", rung: "notes" },
};

const broker: PromiseIn = {
  who: "Lesha Cyphers",
  text: "Their benefits broker will send the plan summary.",
  at: "2026-10-03T15:00:00Z",
  kind: "owed",
  entry: { at: "2026-10-03T15:00:00Z", rung: "thread" },
};

/** Every sentence of a move line: six words or fewer, no dash aside, no
 *  parenthetical (the writing canon, rules 5 and 6). */
function assertCanon(move: string): void {
  assert.ok(!/[—–(]/.test(move), `a dash aside or a parenthetical: ${move}`);
  for (const s of move.split(/(?<=\.)\s+/)) {
    const words = s.trim().split(/\s+/).filter(Boolean);
    assert.ok(words.length <= 6, `more than six words: "${s}" in ${move}`);
  }
}

// ── the five states of the face ────────────────────────────────────────────

describe("the five states give the approved lines", () => {
  test("waiting: the promise stands, so the move waits and names the day", () => {
    const r = readDeal({ ...base, theirPromises: [adam()], now: TUE });
    assert.equal(r.move, "Wait on Adam. Promised Friday.");
    assert.equal(
      r.moveFull,
      "Adam Bell · Send the census for the Mexico hires. · Promised to Antaeus Coe" +
        " · Friday 10/9 · Filed thread 10/6",
    );
  });

  test("due today: still theirs to send, and the line says so", () => {
    const r = readDeal({ ...base, theirPromises: [adam()], now: FRI });
    assert.equal(r.move, "Wait on Adam. Due today.");
    assert.equal(
      r.moveFull,
      "Adam Bell · Send the census for the Mexico hires. · Promised to Antaeus Coe" +
        " · Today 10/9 · Filed thread 10/6",
    );
  });

  test("the day passed with a hearer: the chase is the operator's, PROMISED with the date", () => {
    const r = readDeal({ ...base, theirPromises: [adam({ promised: true })], now: MON });
    assert.equal(r.move, "Chase Adam. PROMISED 10/9.");
    assert.equal(
      r.moveFull,
      "Adam Bell · Send the census for the Mexico hires. · Promised to Antaeus Coe" +
        " · 10/9 · Filed thread 10/6",
    );
  });

  test("the day passed with no hearer: a plain wall, never PROMISED (D28)", () => {
    const r = readDeal({
      ...base,
      theirPromises: [adam({ hearer: undefined, promised: false })],
      now: MON,
    });
    assert.equal(r.move, "Chase Adam. The 10/9 wall passed.");
    assert.ok(!/PROMISED/.test(r.move));
    assert.equal(
      r.moveFull,
      "Adam Bell · Send the census for the Mexico hires. · Due 10/9 · no hearer on record" +
        " · Filed thread 10/6",
    );
  });

  test("three open: the most pressing leads, +2 opens the rest, the door lists all three", () => {
    const r = readDeal({
      ...base,
      theirPromises: [broker, startDates, adam()],
      now: TUE,
    });
    assert.equal(r.move, "Wait on Adam. Promised Friday. +2");
    assert.deepEqual(r.moveFull?.split("\n"), [
      "Adam Bell · Send the census for the Mexico hires. · Promised to Antaeus Coe" +
        " · Friday 10/9 · Filed thread 10/6",
      "Simploy · Confirm the Mexico start dates. · Promised to Antaeus Coe · 10/14" +
        " · Call notes 10/2",
      "Lesha Cyphers · Their benefits broker will send the plan summary. · No day given" +
        " · Filed thread 10/3",
    ]);
  });
});

// ── the lines' grammar ─────────────────────────────────────────────────────

describe("PROMISED needs a hearer; a promise with no day keeps the await window", () => {
  test("a blown promise with a hearer reads PROMISED; one without reads as a wall", () => {
    const heard = readDeal({
      ...base,
      theirPromises: [adam({ promised: true })],
      now: MON,
    });
    const unheard = readDeal({
      ...base,
      theirPromises: [adam({ hearer: "", promised: false })],
      now: MON,
    });
    assert.match(heard.move, /^Chase Adam\. PROMISED 10\/9\.$/);
    assert.match(unheard.move, /^Chase Adam\. The 10\/9 wall passed\.$/);
  });

  test("a day ahead past the coming week says the date", () => {
    const r = readDeal({
      ...base,
      theirPromises: [adam({ day: "2026-10-20" })],
      now: TUE,
    });
    assert.equal(r.move, "Wait on Adam. Promised 10/20.");
    assert.match(r.moveFull ?? "", / · Promised to Antaeus Coe · 10\/20 · /);
  });

  test("a dayless promise waits inside the window and turns to the chase past it", () => {
    const at = (days: number) =>
      new Date(TUE.getTime() - days * 86_400_000).toISOString();
    const loop = { ...adam(), day: undefined };
    const fresh = readDeal({
      ...base,
      theirPromises: [{ ...loop, at: at(3) }],
      now: TUE,
    });
    assert.equal(fresh.move, "Wait on Adam. Promise made 3 days ago.");
    const edge = readDeal({ ...base, theirPromises: [{ ...loop, at: at(7) }], now: TUE });
    assert.equal(edge.move, "Wait on Adam. Promise made 7 days ago.");
    const late = readDeal({ ...base, theirPromises: [{ ...loop, at: at(8) }], now: TUE });
    assert.equal(late.move, "Chase Adam. Promise made 8 days ago.");
    assert.match(late.moveFull ?? "", / · Promised to Antaeus Coe · No day given · /);
  });

  test("a dayless promise says when it was made, never a due day (pass 8 G9)", () => {
    // "Promised yesterday" sat in the same shape as the dated "Promised
    // Friday" and read as a day that had passed. The dayless line names the
    // promise made, so it cannot be read as the day it is due.
    const loop = { ...adam(), day: undefined };
    const day = (n: number) => new Date(TUE.getTime() - n * 86_400_000).toISOString();
    const dayless = [0, 1, 3, 9].map(
      (n) =>
        readDeal({ ...base, theirPromises: [{ ...loop, at: day(n) }], now: TUE }).move,
    );
    assert.deepEqual(dayless, [
      "Wait on Adam. Promise made today.",
      "Wait on Adam. Promise made yesterday.",
      "Wait on Adam. Promise made 3 days ago.",
      "Chase Adam. Promise made 9 days ago.",
    ]);
    const dated = readDeal({ ...base, theirPromises: [adam()], now: TUE }).move;
    assert.equal(dated, "Wait on Adam. Promised Friday.");
    for (const move of dayless) {
      assert.ok(!/\bPromised\b/.test(move), `a due day's word: ${move}`);
      assertCanon(move);
    }
  });

  test("who owes it is the record's first name, else the account as a person says it", () => {
    const r = readDeal({ ...base, theirPromises: [startDates], now: TUE });
    assert.equal(r.move, "Wait on Simploy. Promised 10/14.");
  });

  test("the inbound's own promise, with no list, still waits on the person who wrote", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-10-01T14:00:00Z", awaitingReply: true, who: "Chassie" },
      lastInbound: { at: "2026-10-05T15:00:00Z", who: "Lesha", promise: true },
      now: TUE,
    });
    assert.equal(r.move, "Wait on Lesha. Promise made yesterday.");
    assert.equal(r.moveFull, "Lesha · No day given");
  });

  test("a blown promise among standing ones leads, and the door keeps the pressing order", () => {
    const blown = adam({ who: "Dana Ruiz", day: "2026-10-02", promised: true });
    const r = readDeal({ ...base, theirPromises: [adam(), broker, blown], now: TUE });
    assert.equal(r.move, "Chase Dana. PROMISED 10/2. +2");
    const lines = r.moveFull?.split("\n") ?? [];
    assert.equal(lines.length, 3);
    assert.match(lines[0], /^Dana Ruiz · /);
    assert.match(lines[1], /^Adam Bell · /);
    assert.match(lines[2], /^Lesha Cyphers · /);
  });
});

// ── the rank ───────────────────────────────────────────────────────────────

describe("the rank: their promise leads only when nothing is owed, a chase over every wait", () => {
  const standing = [adam()];
  const blown = [adam({ promised: true })];

  test("an unbroken promise never outranks a reply the operator owes", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-10-05T14:00:00Z", awaitingReply: true, who: "Chassie" },
      lastInbound: { at: "2026-10-06T15:00:00Z", who: "Chassie" },
      theirPromises: standing,
      now: TUE,
    });
    assert.equal(r.move, "Answer Chassie. They wrote today.");
    assert.equal(r.moveFull, undefined);
  });

  test("an unbroken promise never outranks a recap the operator owes", () => {
    const r = readDeal({
      ...base,
      lastMeeting: { at: "2026-10-06T15:00:00Z", who: "Tom" },
      theirPromises: standing,
      now: TUE,
    });
    assert.equal(r.move, "Send Tom the recap. You met today.");
  });

  test("an unbroken promise never outranks a thing the operator owes", () => {
    const r = readDeal({
      ...base,
      openOwed: [{ text: "Send the Mexico cost sheet." }],
      theirPromises: standing,
      now: TUE,
    });
    assert.equal(r.move, "Send the Mexico cost sheet.");
  });

  test("a blown promise still yields to a reply and a recap owed", () => {
    const reply = readDeal({
      ...base,
      lastTouch: { at: "2026-10-10T14:00:00Z", awaitingReply: true, who: "Chassie" },
      lastInbound: { at: "2026-10-12T15:00:00Z", who: "Chassie" },
      theirPromises: blown,
      now: MON,
    });
    assert.equal(reply.move, "Answer Chassie. They wrote today.");
    const recap = readDeal({
      ...base,
      lastMeeting: { at: "2026-10-12T15:00:00Z", who: "Tom" },
      theirPromises: blown,
      now: MON,
    });
    assert.equal(recap.move, "Send Tom the recap. You met today.");
  });

  test("a blown promise outranks a plain wait", () => {
    const send = readDeal({
      ...base,
      lastTouch: { at: "2026-10-10T14:00:00Z", awaitingReply: true, who: "Chassie" },
      theirPromises: blown,
      now: MON,
    });
    assert.equal(send.move, "Chase Adam. PROMISED 10/9.");
    const booked = readDeal({
      ...base,
      lastTouch: { at: "2026-10-10T14:00:00Z", awaitingReply: true, who: "Chassie" },
      lastAccepted: { at: "2026-10-11T14:00:00Z", who: "Chassie" },
      theirPromises: blown,
      now: MON,
    });
    assert.equal(booked.move, "Chase Adam. PROMISED 10/9.");
    const quiet = readDeal({
      ...base,
      step: {
        nodeKey: "discovery",
        nodeLabel: "Discovery",
        item: "Pay method",
        ageDays: 1,
      },
      theirPromises: blown,
      now: MON,
    });
    assert.equal(quiet.move, "Chase Adam. PROMISED 10/9.");
  });

  test("a thing the operator owes leads over a blown promise of theirs", () => {
    // Chasing their slip never jumps ahead of something we owe (ruled for
    // slice 18b on 2026-10-06): a register item leads.
    const owed = readDeal({
      ...base,
      openOwed: [{ text: "Send the Mexico cost sheet." }],
      theirPromises: blown,
      now: MON,
    });
    assert.equal(owed.move, "Send the Mexico cost sheet.");
  });

  test("a blown promise outranks a nudge: a promise heard beats a clock", () => {
    // A nudge is the operator's cadence on a quiet send, not a thing owed
    // (ruled for slice 18b on 2026-10-06).
    const nudge = readDeal({
      ...base,
      lastTouch: { at: "2026-10-05T14:00:00Z", awaitingReply: true, who: "Chassie" },
      theirPromises: blown,
      now: MON,
    });
    assert.equal(nudge.move, "Chase Adam. PROMISED 10/9.");
  });

  test("a promise that stands is the wait when nothing is owed", () => {
    const send = readDeal({
      ...base,
      lastTouch: { at: "2026-10-04T14:00:00Z", awaitingReply: true, who: "Chassie" },
      theirPromises: standing,
      now: TUE,
    });
    assert.equal(send.move, "Wait on Adam. Promised Friday.");
    const gate = readDeal({
      ...base,
      step: {
        nodeKey: "discovery",
        nodeLabel: "Discovery",
        item: "Pay method",
        ageDays: 1,
      },
      theirPromises: standing,
      now: TUE,
    });
    assert.equal(gate.move, "Wait on Adam. Promised Friday.");
  });

  test("a nudge outranks a promise that stands; only a blown one jumps it", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-09-29T14:00:00Z", awaitingReply: true, who: "Chassie" },
      theirPromises: standing,
      now: TUE,
    });
    assert.equal(r.move, "Nudge Chassie. Quiet 7 days.");
  });

  test("today's send to the person who owes it is the chase, and the row says so", () => {
    const chased = readDeal({
      ...base,
      lastTouch: { at: "2026-10-12T15:00:00Z", awaitingReply: true, who: "Adam" },
      theirPromises: blown,
      now: MON,
    });
    assert.equal(chased.move, "Wait on Adam. You wrote today.");
    const other = readDeal({
      ...base,
      lastTouch: { at: "2026-10-12T15:00:00Z", awaitingReply: true, who: "Chassie" },
      theirPromises: blown,
      now: MON,
    });
    assert.equal(other.move, "Chase Adam. PROMISED 10/9.");
  });
});

// ── the meeting branch is unchanged ────────────────────────────────────────

describe("the meeting branch keeps its own line", () => {
  test("the recap still says what they owe and when, with no door added", () => {
    const r = readDeal({
      ...base,
      lastMeeting: { at: "2026-10-05T17:00:00Z", who: "Tom" },
      theirBall: { who: "Adam", text: "the pricing model", day: "2026-10-09" },
      theirPromises: [adam(), broker],
      now: new Date("2026-10-05T18:00:00Z"),
    });
    assert.equal(
      r.move,
      "Send Tom the recap. Adam owes the pricing model. Promised Friday.",
    );
    assert.equal(r.moveFull, undefined);
    const blown = readDeal({
      ...base,
      lastMeeting: { at: "2026-10-12T17:00:00Z", who: "Tom" },
      theirBall: {
        who: "Adam",
        text: "the pricing model",
        day: "2026-10-09",
        promised: true,
      },
      theirPromises: [adam({ promised: true })],
      now: MON,
    });
    assert.equal(
      blown.move,
      "Send Tom the recap. Adam owes the pricing model. PROMISED 10/9.",
    );
  });

  test("the recap says the day as the move line does: Due today on the day", () => {
    // One fact, one wording (CLAUDE.md, "Their promise rides the move
    // line"): the recap's tail said "Promised today." where the move line
    // says "Due today." for the same promise on the same day.
    const meeting = (now: Date, day: string, promised?: boolean) =>
      readDeal({
        ...base,
        lastMeeting: { at: new Date(now.getTime() - 3_600_000).toISOString(), who: "Tom" },
        lastRecordAt: now.toISOString(),
        theirBall: { who: "Adam", text: "the pricing model", day, ...(promised ? { promised } : {}) },
        now,
      }).move;
    assert.equal(
      meeting(FRI, "2026-10-09"),
      "Send Tom the recap. Adam owes the pricing model. Due today.",
    );
    // Every state reads what promiseStands reads for the move line.
    for (const [now, day, promised] of [
      [TUE, "2026-10-09", false],
      [FRI, "2026-10-09", false],
      [MON, "2026-10-09", true],
      [MON, "2026-10-09", false],
      [TUE, "2026-10-20", false],
    ] as const) {
      const stands = promiseStands(adam({ day, promised }), now);
      assert.ok(meeting(now, day, promised).endsWith(` ${stands}.`), `${day} at ${now.toISOString()}`);
    }
  });
});

// ── the writing canon ──────────────────────────────────────────────────────

describe("every promise line obeys the writing canon", () => {
  test("six words or fewer per sentence, no dash aside, no parenthetical", () => {
    const at = (days: number) =>
      new Date(TUE.getTime() - days * 86_400_000).toISOString();
    const cases: [PromiseIn[], Date][] = [
      [[adam()], TUE],
      [[adam()], FRI],
      [[adam({ promised: true })], MON],
      [[adam({ hearer: "" })], MON],
      [[broker, startDates, adam()], TUE],
      [[{ ...adam(), day: undefined, at: at(2) }], TUE],
      [[{ ...adam(), day: undefined, at: at(9) }], TUE],
      [[startDates], TUE],
      [[adam({ day: "2026-10-20" })], TUE],
    ];
    for (const [theirPromises, now] of cases) {
      const r = readDeal({ ...base, theirPromises, now });
      assertCanon(r.move);
      assert.ok(!/follow-up/.test(r.move), `a retired sentence: ${r.move}`);
      for (const line of (r.moveFull ?? "").split("\n"))
        assert.ok(!/[—(]/.test(line), `a dash aside in the door: ${line}`);
    }
  });

  test("money never renders in the door", () => {
    const r = readDeal({
      ...base,
      theirPromises: [adam({ text: "Wire the $25k deposit" })],
      now: TUE,
    });
    assert.ok(!/\$\s?25/.test(r.moveFull ?? ""), r.moveFull);
  });
});

// ── the read's list ────────────────────────────────────────────────────────

const note = (o: Partial<RecordNote> & { id: string; body: string }): RecordNote => ({
  accountId: "A1",
  partner: "",
  kind: "account",
  lane: "mine",
  actors: "",
  source: "",
  recipients: "",
  createdAt: "2026-10-06T14:10:00Z",
  ...o,
});

const loopTodo = (
  id: string,
  text: string,
  tags: Partial<typeof NO_TAGS>,
  over = {},
) => ({
  id,
  body: withTags(text, { ...NO_TAGS, owner: "them", ...tags }),
  done: false,
  accountId: "A1",
  createdAt: "2026-10-06T14:11:00Z",
  ...over,
});

const ADAM_MAIL = note({
  id: "n1",
  body:
    "✉ OL Oct 6 9:10 AM — Mexico census · Adam Bell → Antaeus Coe\n" +
    "I'll send the census for the Mexico hires by Friday.",
  actors: "Adam Bell → Antaeus Coe",
  source: "outlook-ai",
  createdAt: "2026-10-06T14:10:00Z",
  filingId: "f1",
});

const CALL_NOTES = note({
  id: "n2",
  body: "☎ SF Oct 2 — Kickoff call · Antaeus Coe → Chassie Smith\nOwed: invoices + EOR confirm — @Chassie.",
  actors: "Antaeus Coe → Chassie Smith",
  source: "typed",
  createdAt: "2026-10-02T15:00:00Z",
});

const readOf = (notes: RecordNote[], todos: ReturnType<typeof loopTodo>[], now: Date) =>
  readAccount({
    account: { id: "A1", name: "Simploy" },
    notes,
    touches: [],
    todos,
    dispositions: new Map(),
    homeSide: [],
    now,
  });

/** The room page's own hand-off, the fields the promise line reads. */
const moveOf = (acct: ReturnType<typeof readOf>, now: Date) =>
  readDeal({
    accountName: "Simploy",
    whoseMove: acct.whoseMove,
    step: null,
    timing: null,
    lastTouch: acct.lastTouch
      ? {
          at: acct.lastTouch.at,
          awaitingReply: acct.lastTouch.awaitingReply,
          who: "Adam",
        }
      : null,
    lastInbound: acct.lastInbound
      ? { at: acct.lastInbound.at, who: "Adam", promise: acct.lastInbound.promise }
      : null,
    theirPromises: acct.theirPromises,
    lastRecordAt: acct.lastRecordAt,
    now,
  });

describe("the read hands the engine every open promise, each citing its entry", () => {
  const census = loopTodo(
    "t1",
    CENSUS,
    { date: "2026-10-09", hearer: "Antaeus Coe", by: "Adam Bell" },
    { filingId: "f1" },
  );

  test("a loop cites the filing's own entry, and the inbound it came from is one line", () => {
    const acct = readOf([ADAM_MAIL], [census], TUE);
    assert.equal(acct.lastInbound?.promise, true);
    assert.equal(
      acct.theirPromises.length,
      1,
      "the loop and its own inbound are one promise",
    );
    assert.deepEqual(acct.theirPromises[0], {
      who: "Adam Bell",
      text: CENSUS,
      at: "2026-10-06T14:11:00Z",
      day: "2026-10-09",
      hearer: "Antaeus Coe",
      kind: "loop",
      entry: { at: "2026-10-06T14:10:00Z", noteId: "n1", rung: "thread" },
    });
    // The head keeps the shape the drawer and the meeting move read.
    assert.deepEqual(acct.theirPromise, {
      who: "Adam Bell",
      text: CENSUS,
      at: "2026-10-06T14:11:00Z",
      day: "2026-10-09",
    });
    const r = moveOf(acct, TUE);
    assert.equal(r.move, "Wait on Adam. Promised Friday.");
    assert.equal(
      r.moveFull,
      "Adam Bell · Send the census for the Mexico hires. · Promised to Antaeus Coe" +
        " · Friday 10/9 · Filed thread 10/6",
    );
  });

  test("once the day passes the read's PROMISED turns the move to the chase", () => {
    const acct = readOf([ADAM_MAIL], [census], MON);
    assert.equal(acct.theirPromises[0]?.promised, true);
    assert.equal(moveOf(acct, MON).move, "Chase Adam. PROMISED 10/9.");
  });

  test("a loop with no hearer reads as a wall once its day passes (D28)", () => {
    const unheard = loopTodo(
      "t1",
      CENSUS,
      { date: "2026-10-09", by: "Adam Bell" },
      { filingId: "f1" },
    );
    const acct = readOf([ADAM_MAIL], [unheard], MON);
    assert.equal(acct.theirPromises[0]?.promised, undefined);
    const r = moveOf(acct, MON);
    assert.equal(r.move, "Chase Adam. The 10/9 wall passed.");
    assert.match(
      r.moveFull ?? "",
      / · Due 10\/9 · no hearer on record · Filed thread 10\/6$/,
    );
  });

  test("the three kinds each carry who heard it and the entry they came from", () => {
    const lesha = note({
      id: "n3",
      body:
        "✉ OL Oct 5 2:00 PM — Plan summary · Lesha Cyphers → Antaeus Coe\n" +
        "Their broker will send the plan summary next week.",
      actors: "Lesha Cyphers → Antaeus Coe",
      source: "outlook",
      createdAt: "2026-10-05T19:00:00Z",
    });
    const unlinked = loopTodo("t2", "Confirm the Mexico start dates", {
      date: "2026-10-14",
      hearer: "Antaeus Coe",
    });
    const acct = readOf([lesha, CALL_NOTES], [unlinked], TUE);
    const byKind = new Map(acct.theirPromises.map((p) => [p.kind, p]));
    assert.deepEqual(
      byKind.get("loop")?.entry,
      null,
      "no filing, no cite, never a guess",
    );
    assert.equal(byKind.get("loop")?.who, "");
    assert.deepEqual(byKind.get("owed")?.entry, {
      at: "2026-10-02T15:00:00Z",
      noteId: "n2",
      rung: "notes",
    });
    assert.equal(byKind.get("owed")?.who, "Chassie");
    assert.equal(byKind.get("inbound")?.who, "Lesha Cyphers");
    assert.equal(byKind.get("inbound")?.hearer, "Antaeus Coe");
    assert.equal(byKind.get("inbound")?.entry?.rung, "thread");
    // Newest first, as theirPromise has always read it.
    assert.deepEqual(
      acct.theirPromises.map((p) => p.kind),
      ["loop", "inbound", "owed"],
    );
  });

  test("the evidence ladder's rungs: the tape, a filed thread, call notes", () => {
    const doc = (text: string, source: string, tape = false) => ({ text, source, tape });
    assert.equal(evidenceRung(doc("CALL TRANSCRIPT\nA: hi", "transcript", true)), "tape");
    assert.equal(evidenceRung(doc("☎ CT Oct 2 — Kickoff · A → B", "call-ai")), "tape");
    assert.equal(evidenceRung(doc("✉ SF Oct 2 — Re: model · A → B", "sf")), "thread");
    assert.equal(evidenceRung(doc("TEAMS THREAD\nA: hi", "teams")), "thread");
    assert.equal(evidenceRung(doc("☎ SF Oct 2 — Call · A → B", "sf")), "notes");
    assert.equal(evidenceRung(doc("TYPED NOTE\nThey will send it.", "typed")), "notes");
  });

  test("the room hands the read's list to the engine", () => {
    const page = readFileSync(join(cwd(), "src/app/room/page.tsx"), "utf8");
    assert.match(page, /theirPromises: acct\.theirPromises/);
  });
});

// ── the door on the row ────────────────────────────────────────────────────

describe("the move line is a door on the row", () => {
  test("a promise line paints as the door, every promise one click under it", async () => {
    const room = await roomClient();
    const door =
      "Adam Bell · Send the census. · Friday 10/9\nSimploy · Confirm the dates. · 10/14";
    const html = await render(
      createElement(room.RoomClient, {
        rows: [roomRow({ move: "Wait on Adam. Promised Friday. +1", moveFull: door })],
        cadence: [],
        checkins: [],
        followUps: [],
        warming: [],
        later: [],
        canWrite: true,
        dbUnavailable: false,
        boardNames: [],
        pipeline: [],
        pipelineDay: "",
        pipelineStale: "",
      }),
    );
    assert.match(textOf(html), /Wait on Adam\. Promised Friday\. \+1/);
    assert.ok(html.includes(`title="${door}"`), "the door carries every promise");
    assert.ok(
      !textOf(html).includes("Confirm the dates"),
      "nothing deep surfaces uninvited",
    );
  });
});

// ── the row's health: their promise keeps it live (founder, 2026-10-06) ─────

describe("a row whose open item is their promise is never quiet", () => {
  test("with nothing else on the row, no promise reads quiet", () => {
    const r = readDeal({ ...base, theirPromises: [], now: TUE });
    assert.equal(r.health, "quiet");
  });

  test("a promise that stands reads green and sorts with the live rows", () => {
    assert.equal(readDeal({ ...base, theirPromises: [adam()], now: TUE }).health, "green");
    assert.equal(readDeal({ ...base, theirPromises: [adam()], now: FRI }).health, "green");
  });

  test("a blown promise reads amber, heard or not", () => {
    const heard = readDeal({ ...base, theirPromises: [adam({ promised: true })], now: MON });
    assert.equal(heard.move, "Chase Adam. PROMISED 10/9.");
    assert.equal(heard.health, "amber");
    const wall = readDeal({ ...base, theirPromises: [adam()], now: MON });
    assert.equal(wall.move, "Chase Adam. The 10/9 wall passed.");
    assert.equal(wall.health, "amber");
  });

  test("a dayless promise past its window reads amber; inside it, green", () => {
    const fresh = readDeal({ ...base, theirPromises: [broker], now: TUE });
    assert.equal(fresh.health, "green");
    const late = readDeal({
      ...base,
      theirPromises: [{ ...broker, at: "2026-09-25T15:00:00Z" }],
      now: TUE,
    });
    assert.ok(late.move.startsWith("Chase Lesha."), late.move);
    assert.equal(late.health, "amber");
  });
});


// ── a promise relayed through a colleague (the founder, 2026-10-06) ─────────
// A promise of theirs that reached us through a colleague is marked as
// relayed, read from the record with no model call: the entry it came from
// was sent by someone on our side, or the record names a colleague as the
// promiser. The move chases the client and never the colleague, because the
// ask-your-colleague move is retired (C6 as amended 2026-10-05) and going
// through the CSM stays the operator's own choice (the direct doctrine). The
// colleague shows one click deep on the door; the move keeps its six words.
// A dated relay was heard, by the colleague, so it reads PROMISED once its
// day passes (D28); a dayless one keeps the await window.

/** No move line ever sends the operator to the colleague. */
function assertNoColleague(move: string): void {
  assert.ok(
    !/\b(Ask|Chase|Wait on|Answer|Nudge) Lesha\b/.test(move),
    `the colleague staged: ${move}`,
  );
  assert.ok(!/Lesha/.test(move), `the colleague on the move line: ${move}`);
}

describe("a relayed promise on the move line and its door", () => {
  const relayedDates: PromiseIn = {
    ...startDates,
    via: "Lesha Cyphers",
    entry: { at: "2026-10-03T15:00:00Z", rung: "thread" },
  };

  test("the door line carries via and the colleague's first name after what was promised", () => {
    const r = readDeal({ ...base, theirPromises: [relayedDates], now: TUE });
    assert.equal(r.move, "Wait on Simploy. Promised 10/14.");
    assert.equal(
      r.moveFull,
      "Simploy · Confirm the Mexico start dates. · via Lesha · Promised to Antaeus Coe" +
        " · 10/14 · Filed thread 10/3",
    );
    assertNoColleague(r.move);
  });

  test("the move names the account person the record names as owing it", () => {
    const r = readDeal({
      ...base,
      theirPromises: [adam({ via: "Lesha Cyphers" })],
      now: TUE,
    });
    assert.equal(r.move, "Wait on Adam. Promised Friday.");
    assert.equal(
      r.moveFull,
      "Adam Bell · Send the census for the Mexico hires. · via Lesha" +
        " · Promised to Antaeus Coe · Friday 10/9 · Filed thread 10/6",
    );
  });

  test("a colleague handed in as the owner falls back to the account, on the move and the door", () => {
    for (const who of ["Lesha Cyphers", "Lesha"]) {
      const r = readDeal({
        ...base,
        theirPromises: [{ ...relayedDates, who }],
        now: TUE,
      });
      assert.equal(r.move, "Wait on Simploy. Promised 10/14.", who);
      assert.match(
        r.moveFull ?? "",
        /^Simploy · Confirm the Mexico start dates\. · via Lesha · /,
      );
      assertNoColleague(r.move);
    }
  });

  test("a dated relay past its day reads PROMISED: the colleague heard it (D28)", () => {
    const named = readDeal({
      ...base,
      theirPromises: [
        adam({ via: "Lesha Cyphers", hearer: undefined, promised: undefined }),
      ],
      now: MON,
    });
    assert.equal(named.move, "Chase Adam. PROMISED 10/9.");
    assert.equal(
      named.moveFull,
      "Adam Bell · Send the census for the Mexico hires. · via Lesha" +
        " · Promised to Lesha Cyphers · 10/9 · Filed thread 10/6",
    );
    const account = readDeal({
      ...base,
      theirPromises: [{ ...relayedDates, hearer: undefined }],
      now: new Date("2026-10-16T17:00:00Z"),
    });
    assert.equal(account.move, "Chase Simploy. PROMISED 10/14.");
    assertNoColleague(account.move);
    // The same promise unrelayed and unheard is a plain wall, as it was.
    const unrelayed = readDeal({
      ...base,
      theirPromises: [adam({ hearer: undefined, promised: undefined })],
      now: MON,
    });
    assert.equal(unrelayed.move, "Chase Adam. The 10/9 wall passed.");
  });

  test("a dayless relay keeps the await window, then turns to the chase, never PROMISED", () => {
    const at = (days: number) =>
      new Date(TUE.getTime() - days * 86_400_000).toISOString();
    const relay: PromiseIn = {
      who: "",
      text: "Send the plan summary",
      at: at(3),
      via: "Lesha Cyphers",
      kind: "owed",
      entry: { at: at(3), rung: "thread" },
    };
    const fresh = readDeal({ ...base, theirPromises: [relay], now: TUE });
    assert.equal(fresh.move, "Wait on Simploy. Promise made 3 days ago.");
    assert.equal(
      fresh.moveFull,
      "Simploy · Send the plan summary. · via Lesha · Promised to Lesha Cyphers" +
        " · No day given · Filed thread 10/3",
    );
    const edge = readDeal({ ...base, theirPromises: [{ ...relay, at: at(7) }], now: TUE });
    assert.equal(edge.move, "Wait on Simploy. Promise made 7 days ago.");
    const late = readDeal({ ...base, theirPromises: [{ ...relay, at: at(8) }], now: TUE });
    assert.equal(late.move, "Chase Simploy. Promise made 8 days ago.");
    for (const r of [fresh, edge, late]) {
      assert.ok(!/PROMISED/.test(r.move), r.move);
      assertNoColleague(r.move);
    }
  });

  test("a send to the colleague today is not the chase; a send to the client is", () => {
    const blownRelay = [adam({ via: "Lesha Cyphers", promised: true })];
    const toLesha = readDeal({
      ...base,
      lastTouch: { at: "2026-10-12T15:00:00Z", awaitingReply: true, who: "Lesha" },
      theirPromises: blownRelay,
      now: MON,
    });
    assert.equal(toLesha.move, "Chase Adam. PROMISED 10/9.");
    const toAdam = readDeal({
      ...base,
      lastTouch: { at: "2026-10-12T15:00:00Z", awaitingReply: true, who: "Adam" },
      theirPromises: blownRelay,
      now: MON,
    });
    assert.equal(toAdam.move, "Wait on Adam. You wrote today.");
  });

  test("relay lines obey the writing canon and money never renders in the door", () => {
    const cases: [PromiseIn[], Date][] = [
      [[relayedDates], TUE],
      [[relayedDates], new Date("2026-10-16T17:00:00Z")],
      [[adam({ via: "Lesha Cyphers" })], MON],
      [[adam({ via: "Lesha Cyphers" }), broker, relayedDates], TUE],
    ];
    for (const [theirPromises, now] of cases) {
      const r = readDeal({ ...base, theirPromises, now });
      assertCanon(r.move);
      assertNoColleague(r.move);
      for (const line of (r.moveFull ?? "").split("\n"))
        assert.ok(!/[—(]/.test(line), `a dash aside in the door: ${line}`);
    }
    const money = readDeal({
      ...base,
      theirPromises: [adam({ via: "Lesha Cyphers", text: "Wire the $25k deposit" })],
      now: TUE,
    });
    assert.ok(!/\$\s?25/.test(money.moveFull ?? ""), money.moveFull);
  });
});

describe("the read marks a relay from the record, with no model call", () => {
  const ROSTER = ["Lesha Cyphers"];

  const readWith = (
    notes: RecordNote[],
    todos: ReturnType<typeof loopTodo>[],
    now: Date,
    homeSide: string[],
  ) =>
    readAccount({
      account: { id: "A1", name: "Simploy" },
      notes,
      touches: [],
      todos,
      dispositions: new Map(),
      homeSide,
      now,
    });

  // Lesha relays what Adam said; the read filed Adam's promise as a loop off
  // Lesha's mail (D10), so the loop cites that entry.
  const LESHA_RELAY = note({
    id: "n4",
    body:
      "✉ OL Oct 3 10:00 AM — Mexico census · Lesha Cyphers → Antaeus Coe\n" +
      "Talked to Adam. Adam will send the census for the Mexico hires by Friday.",
    actors: "Lesha Cyphers → Antaeus Coe",
    recipients: "Antaeus Coe",
    source: "outlook-ai",
    createdAt: "2026-10-03T15:00:00Z",
    filingId: "f2",
  });

  // Lesha writes the Owed line and names Lesha as the one who owes it: the
  // Owed line names the debtor ("— @Chassie"), so this is Lesha's own work.
  const LESHA_OWED = note({
    id: "n5",
    body:
      "✉ OL Oct 3 10:00 AM — Start dates · Lesha Cyphers → Antaeus Coe\n" +
      "Owed: confirm the Mexico start dates — @Lesha.",
    actors: "Lesha Cyphers → Antaeus Coe",
    recipients: "Antaeus Coe",
    source: "outlook",
    createdAt: "2026-10-03T15:00:00Z",
  });

  const relayedCensus = (tags: Partial<typeof NO_TAGS> = {}) =>
    loopTodo(
      "t3",
      CENSUS,
      { date: "2026-10-09", hearer: "Antaeus Coe", by: "Adam Bell", ...tags },
      { filingId: "f2" },
    );

  test("a promise whose source entry a colleague sent reads as relayed, via set", () => {
    const acct = readWith([LESHA_RELAY], [relayedCensus()], TUE, ROSTER);
    assert.equal(acct.lastInbound, null, "a colleague's mail is never inbound");
    assert.equal(acct.theirPromises.length, 1);
    assert.deepEqual(acct.theirPromises[0], {
      who: "Adam Bell",
      text: CENSUS,
      at: "2026-10-06T14:11:00Z",
      day: "2026-10-09",
      hearer: "Antaeus Coe",
      via: "Lesha Cyphers",
      kind: "loop",
      entry: { at: "2026-10-03T15:00:00Z", noteId: "n4", rung: "thread" },
    });
    const r = moveOf(acct, TUE);
    assert.equal(r.move, "Wait on Adam. Promised Friday.");
    assert.equal(
      r.moveFull,
      "Adam Bell · Send the census for the Mexico hires. · via Lesha" +
        " · Promised to Antaeus Coe · Friday 10/9 · Filed thread 10/3",
    );
  });

  test("the record names no one on their side: the move names the account, never the colleague", () => {
    const acct = readWith([LESHA_RELAY], [relayedCensus({ by: "" })], TUE, ROSTER);
    assert.equal(acct.theirPromises.length, 1);
    assert.equal(acct.theirPromises[0]?.who, "");
    assert.equal(acct.theirPromises[0]?.via, "Lesha Cyphers");
    const r = moveOf(acct, TUE);
    assert.equal(r.move, "Wait on Simploy. Promised Friday.");
    assert.equal(
      r.moveFull,
      "Simploy · Send the census for the Mexico hires. · via Lesha" +
        " · Promised to Antaeus Coe · Friday 10/9 · Filed thread 10/3",
    );
    assertNoColleague(r.move);
  });

  test("an Owed line in a colleague's mail naming their person is relayed", () => {
    const owed = note({
      id: "n6",
      body:
        "✉ OL Oct 3 10:00 AM — Start dates · Lesha Cyphers → Antaeus Coe\n" +
        "Owed: confirm the Mexico start dates — @Adam Bell.",
      actors: "Lesha Cyphers → Antaeus Coe",
      recipients: "Antaeus Coe",
      source: "outlook",
      createdAt: "2026-10-03T15:00:00Z",
    });
    const acct = readWith([owed], [], TUE, ROSTER);
    assert.deepEqual(acct.theirPromises[0], {
      who: "Adam Bell",
      text: "confirm the Mexico start dates",
      at: "2026-10-03T15:00:00Z",
      via: "Lesha Cyphers",
      kind: "owed",
      entry: { at: "2026-10-03T15:00:00Z", noteId: "n6", rung: "thread" },
    });
    assert.equal(moveOf(acct, TUE).move, "Wait on Adam. Promise made 3 days ago.");
  });

  test("an Owed line naming a colleague is the colleague's own work, never theirs", () => {
    // Lesha names Lesha in Lesha's own mail, by first name.
    assert.equal(readWith([LESHA_OWED], [], TUE, ROSTER).theirPromises.length, 0);
    // The operator's own note names the colleague in full.
    const typed = note({
      id: "n7",
      body: "Owed: send the SOW — @Lesha Cyphers; the census — @Adam Bell.",
      source: "typed",
      createdAt: "2026-10-03T15:00:00Z",
    });
    const acct = readWith([typed], [], TUE, ROSTER);
    assert.deepEqual(
      acct.theirPromises.map((p) => [p.who, p.text]),
      [["Adam Bell", "the census"]],
    );
    assert.equal(moveOf(acct, TUE).move, "Wait on Adam. Promise made 3 days ago.");
  });

  test("a colleague named as the promiser is the via, and the owner falls back", () => {
    // A loop whose `by` is a colleague on the roster, with no filing to cite.
    const loop = loopTodo("t4", "Send the plan summary", {
      date: "2026-10-09",
      hearer: "Antaeus Coe",
      by: "Lesha Cyphers",
    });
    const acct = readWith([], [loop], TUE, ROSTER);
    assert.equal(acct.theirPromises[0]?.who, "");
    assert.equal(acct.theirPromises[0]?.via, "Lesha Cyphers");
    assert.equal(acct.theirPromises[0]?.entry, null);
    const r = moveOf(acct, TUE);
    assert.equal(r.move, "Wait on Simploy. Promised Friday.");
    assert.equal(
      r.moveFull,
      "Simploy · Send the plan summary. · via Lesha · Promised to Antaeus Coe" +
        " · Friday 10/9",
    );
    // Before the relay ruling this loop was dropped as the home side's; the
    // operator is still never the one who owes a promise of theirs.
    const mine = loopTodo("t5", "Send the plan summary", { by: "Antaeus Coe" });
    assert.equal(readWith([], [mine], TUE, ROSTER).theirPromises.length, 0);
  });

  test("a dated relay past its day reads PROMISED, heard by the colleague (D28)", () => {
    const unheard = relayedCensus({ hearer: "" });
    const acct = readWith([LESHA_RELAY], [unheard], MON, ROSTER);
    assert.equal(acct.theirPromises[0]?.hearer, undefined);
    assert.equal(acct.theirPromises[0]?.promised, true);
    const r = moveOf(acct, MON);
    assert.equal(r.move, "Chase Adam. PROMISED 10/9.");
    assert.match(r.moveFull ?? "", / · via Lesha · Promised to Lesha Cyphers · 10\/9 · /);
  });

  test("a dayless relay keeps the await window", () => {
    const dayless = relayedCensus({ date: "", hearer: "" });
    const acct = readWith([LESHA_RELAY], [dayless], TUE, ROSTER);
    assert.equal(acct.theirPromises[0]?.via, "Lesha Cyphers");
    assert.equal(acct.theirPromises[0]?.promised, undefined);
    assert.equal(moveOf(acct, TUE).move, "Wait on Adam. Promise made today.");
    const later = new Date("2026-10-15T17:00:00Z");
    const late = moveOf(readWith([LESHA_RELAY], [dayless], later, ROSTER), later);
    assert.equal(late.move, "Chase Adam. Promise made 9 days ago.");
  });

  test("a promise the client sent directly carries no via", () => {
    const census = loopTodo(
      "t1",
      CENSUS,
      { date: "2026-10-09", hearer: "Antaeus Coe", by: "Adam Bell" },
      { filingId: "f1" },
    );
    const acct = readWith([ADAM_MAIL, LESHA_RELAY], [census], TUE, ROSTER);
    const direct = acct.theirPromises.find((p) => p.entry?.noteId === "n1");
    assert.ok(direct, "the client's own promise is on the list");
    assert.equal("via" in direct, false);
    assert.ok(!/ · via /.test(moveOf(acct, TUE).moveFull ?? ""));
  });

  test("with an empty roster nothing is relayed", () => {
    const empty = readWith(
      [LESHA_RELAY, LESHA_OWED],
      [relayedCensus({ hearer: "" })],
      MON,
      [],
    );
    assert.ok(empty.theirPromises.length > 0);
    for (const p of empty.theirPromises)
      assert.equal("via" in p, false, JSON.stringify(p));
    const r = moveOf(empty, MON);
    assert.ok(!/ · via /.test(r.moveFull ?? ""), r.moveFull);
    // Unrelayed and unheard, the census is a plain wall, never PROMISED.
    const census = empty.theirPromises.find((p) => p.kind === "loop");
    assert.equal(census?.promised, undefined);
  });
});
