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
import { readDeal, type PromiseIn } from "../src/lib/room/engine";
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
    assert.equal(fresh.move, "Wait on Adam. Promised 3 days ago.");
    const edge = readDeal({ ...base, theirPromises: [{ ...loop, at: at(7) }], now: TUE });
    assert.equal(edge.move, "Wait on Adam. Promised 7 days ago.");
    const late = readDeal({ ...base, theirPromises: [{ ...loop, at: at(8) }], now: TUE });
    assert.equal(late.move, "Chase Adam. Promised 8 days ago.");
    assert.match(late.moveFull ?? "", / · Promised to Antaeus Coe · No day given · /);
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
    assert.equal(r.move, "Wait on Lesha. Promised yesterday.");
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
