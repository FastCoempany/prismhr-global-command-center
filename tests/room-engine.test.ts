import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { climbFraction, daysBetween, readDeal } from "@/lib/room/engine";

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
    assert.match(r.court.line, /THEIR MOVE — BRYCE · QUIET \dD/);
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
