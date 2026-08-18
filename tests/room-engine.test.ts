import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { climbFraction, daysBetween, meterRead, readDeal } from "@/lib/room/engine";

// ADVERSARIAL PASS 2 — the room's read. The engine must stay honest under
// missing, malformed, and extreme inputs: no invented moves, no NaN leaking
// into copy, no forbidden words, bounds that hold.

const NOW = new Date("2026-07-28T17:00:00Z");

const base = {
  accountName: "Advocate Pay",
  step: null,
  timing: null,
  lastTouch: null,
  lastRecordAt: "",
  now: NOW,
};

describe("readDeal — honesty under missing data", () => {
  test("no step, no record, no thread → thin read, quiet health, no fabrication", () => {
    const r = readDeal({ ...base });
    assert.equal(r.thin, true);
    assert.equal(r.health, "quiet");
    assert.match(r.move, /Not enough signal/);
    assert.equal(r.court.tone, "none");
  });
  test("garbage dates never leak NaN into copy", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "not-a-date", awaitingReply: true, who: "Bryce" },
    });
    assert.ok(!/NaN|undefined|null/.test(r.move + r.court.line));
  });
  test("future-dated touches clamp to zero quiet days", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2027-01-01T00:00:00Z", awaitingReply: true, who: "Bryce" },
    });
    assert.equal(r.quietDays, 0);
  });
});

describe("readDeal — the loud cases stay loud and legal", () => {
  const step = {
    nodeKey: "contract",
    nodeLabel: "Contract",
    item: "Signature tracked",
    ageDays: 7,
  };
  test("quiet week against a date → red, chase sentence names the person and the clock", () => {
    const r = readDeal({
      ...base,
      step,
      timing: { phrase: "Sept 1 target", dateIso: "2026-09-01" },
      lastTouch: { at: "2026-07-21T15:00:00Z", awaitingReply: true, who: "Bryce" },
    });
    assert.equal(r.health, "red");
    assert.match(r.move, /Chase Bryce/);
    assert.match(r.move, /Sept 1 target/);
    assert.match(r.court.line, /THEIR MOVE · BRYCE · QUIET \d DAYS/);
  });
  test("fresh step, no thread → your move, green-or-amber, sentence uses the item", () => {
    const r = readDeal({ ...base, step: { ...step, ageDays: 0 } });
    assert.equal(r.court.tone, "you");
    assert.match(r.move, /signature tracked/i);
    assert.ok(r.health === "green" || r.health === "amber");
  });
  test("the word 'steps' never appears in any generated copy", () => {
    for (const age of [null, 0, 3, 7, 400]) {
      const r = readDeal({
        ...base,
        step: { ...step, ageDays: age },
        lastTouch: { at: "2026-07-27T15:00:00Z", awaitingReply: true, who: "" },
      });
      assert.ok(!/\bsteps?\b/i.test(r.move), r.move);
    }
  });
  test("hostile who-strings are capped and case-normalized in the court line", () => {
    const r = readDeal({
      ...base,
      lastTouch: {
        at: "2026-07-20T15:00:00Z",
        awaitingReply: true,
        who: "x".repeat(500),
      },
    });
    assert.ok(r.court.line.length < 60);
  });
});

describe("readDeal — every gate closed, nothing stamped", () => {
  test("all gates done → stamp move, green health, your court, never thin", () => {
    const r = readDeal({ ...base, allGatesDone: true });
    assert.equal(r.thin, false);
    assert.equal(r.health, "green");
    assert.match(r.move, /Stamp the outcome/);
    assert.equal(r.court.tone, "you");
    assert.match(r.court.line, /STAMP THE OUTCOME/);
  });
});

describe("meterRead — position and the why bubble", () => {
  const step = {
    nodeKey: "needs_analysis",
    nodeLabel: "Needs Analysis",
    item: "Legal entities where they're hiring? (which countries — or none)",
  };
  const base = {
    outcome: null,
    step,
    doneInStage: 2,
    totalInStage: 8,
    allGatesDone: false,
    evidence: [],
  };
  test("board position states the stage, the count, and the next gate", () => {
    const m = meterRead(base);
    assert.match(m.label, /NEEDS ANALYSIS · 2 OF 8/);
    assert.ok(m.frac > 0.28 && m.frac < 0.35);
    assert.match(m.why[0], /Needs Analysis: 2 of 8 gates checked/);
    assert.match(m.why[1], /Next gate: Legal entities/);
  });
  test("record evidence ahead of the board moves the meter and says why", () => {
    const m = meterRead({
      ...base,
      evidence: [{ nodeKey: "proposal", why: "pricing/proposal sent · outlook" }],
    });
    // proposal is stage 6 of 7 — the meter sits at its start, past the board.
    assert.ok(m.frac > 5 / 7);
    assert.ok(m.why.some((w) => /Proposal evidence: pricing\/proposal sent/.test(w)));
    assert.ok(m.why.some((w) => /Confirm it in the stage drawer/.test(w)));
  });
  test("evidence behind the board never drags the meter back", () => {
    const m = meterRead({
      ...base,
      evidence: [{ nodeKey: "investigate", why: "trigger named · sf" }],
    });
    assert.ok(m.frac > 0.28);
    assert.ok(!m.why.some((w) => /Investigate evidence/.test(w)));
  });
  test("no board position but record evidence → RECORD SAYS label", () => {
    const m = meterRead({
      ...base,
      step: null,
      doneInStage: 0,
      totalInStage: 0,
      evidence: [{ nodeKey: "demo", why: "demo evidence · outlook" }],
    });
    assert.match(m.label, /RECORD SAYS DEMO/);
    assert.ok(m.frac > 0.4);
    assert.match(m.why[0], /No stage is active on the board/);
  });
  test("nothing anywhere → honest zero with the way to move it", () => {
    const m = meterRead({
      ...base,
      step: null,
      doneInStage: 0,
      totalInStage: 0,
    });
    assert.equal(m.frac, 0);
    assert.equal(m.label, "NOTHING IN FLIGHT");
    assert.ok(m.why.some((w) => /Check a gate or file a paste/.test(w)));
  });
  test("every gate closed → full meter asking for the stamp", () => {
    const m = meterRead({
      ...base,
      step: null,
      doneInStage: 0,
      totalInStage: 0,
      allGatesDone: true,
    });
    assert.equal(m.frac, 1);
    assert.equal(m.label, "EVERY GATE CLOSED");
    assert.ok(m.why.some((w) => /Stamp Closed Won or Closed Lost/.test(w)));
  });
  test("a stamped outcome fills the meter and says so", () => {
    const m = meterRead({ ...base, outcome: { status: "won" } });
    assert.equal(m.frac, 1);
    assert.equal(m.label, "CLOSED WON");
    assert.match(m.why[0], /Stamped Closed Won/);
  });
});

describe("bounds — climb and day math", () => {
  test("climbFraction clamps everything", () => {
    assert.equal(climbFraction(null, 0, 0), 0);
    assert.equal(climbFraction("nonsense", 5, 3), 0);
    assert.ok(climbFraction("contract", 99, 3) <= 1);
    assert.ok(climbFraction("investigate", -5, 3) >= 0);
    assert.ok(climbFraction("contract", 3, 3) <= 1);
  });
  test("daysBetween rejects junk and never goes negative", () => {
    assert.equal(daysBetween("garbage", NOW), null);
    assert.equal(daysBetween("2027-01-01T00:00:00Z", NOW), 0);
    assert.equal(daysBetween("2026-07-21T15:00:00Z", NOW), 7);
  });
});

describe("the recap rule — a fresh meeting puts the follow-up on the operator", () => {
  const NOW = new Date("2026-08-18T21:00:00Z");
  const base = {
    accountName: "Staff Leasing",
    step: null,
    timing: null,
    lastRecordAt: "2026-08-18T17:00:00Z",
    now: NOW,
  };
  test("a meeting today beats 'wait' — the recap is the move", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-08-12T19:32:00Z", awaitingReply: true, who: "Tom" },
      lastMeeting: { at: "2026-08-18T17:00:00Z", who: "Tom" },
    });
    assert.match(r.move, /^Send Tom the recap\. You met today\./);
    assert.equal(r.court.tone, "you");
    assert.match(r.court.line, /MET TOM TODAY/);
  });
  test("an inbound after the meeting still outranks the recap", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-08-12T19:32:00Z", awaitingReply: true, who: "Tom" },
      lastMeeting: { at: "2026-08-18T17:00:00Z", who: "Tom" },
      lastInbound: { at: "2026-08-18T19:00:00Z", who: "Tom" },
    });
    assert.match(r.move, /^Answer Tom\./);
  });
  test("an outbound sent after the meeting retires the recap — back to waiting", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-08-18T18:00:00Z", awaitingReply: true, who: "Tom" },
      lastMeeting: { at: "2026-08-18T17:00:00Z", who: "Tom" },
    });
    assert.match(r.move, /^Wait on Tom\./);
  });
  test("a stale meeting (past the recap window) falls back to ordinary rules", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-08-01T12:00:00Z", awaitingReply: true, who: "Tom" },
      lastMeeting: { at: "2026-08-05T12:00:00Z", who: "Tom" },
    });
    assert.ok(!/recap/i.test(r.move), r.move);
  });
  test("a meeting with an open stage item carries the item along", () => {
    const r = readDeal({
      ...base,
      step: { nodeKey: "demo", nodeLabel: "Demo", item: "Book the demo", ageDays: 1 },
      lastTouch: null,
      lastMeeting: { at: "2026-08-18T17:00:00Z", who: "Tom" },
    });
    assert.match(
      r.move,
      /^Send Tom the recap\. You met today\. Then close “book the demo”\./,
    );
  });
});
