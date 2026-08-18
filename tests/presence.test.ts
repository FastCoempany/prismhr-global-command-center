import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVE_GRACE_MS,
  CLOCK_FREEZE_MS,
  PASSIVE_STOP_MS,
  fmtDesk,
  parsePresenceReason,
  presenceDayKey,
  presenceOf,
  presenceReason,
} from "@/lib/presence";

// The desk ladder (ActivTrak semantics, decreed 2026-08-18): two quiet
// minutes stay ACTIVE, fifteen end PASSIVE, past that the meter is INACTIVE
// and stopped. Boundaries are where trackers lie — test them exactly.

describe("presenceOf — the three registers at their exact walls", () => {
  test("input now, and every second inside the two-minute grace, is active", () => {
    assert.equal(presenceOf(0), "active");
    assert.equal(presenceOf(ACTIVE_GRACE_MS), "active");
  });
  test("one tick past the grace is passive; the fifteenth minute still is", () => {
    assert.equal(presenceOf(ACTIVE_GRACE_MS + 1), "passive");
    assert.equal(presenceOf(PASSIVE_STOP_MS), "passive");
  });
  test("past fifteen minutes the desk is inactive — tracking stopped", () => {
    assert.equal(presenceOf(PASSIVE_STOP_MS + 1), "inactive");
    assert.equal(presenceOf(Number.MAX_SAFE_INTEGER), "inactive");
  });
  test("junk gaps read as inactive, never a crash", () => {
    assert.equal(presenceOf(-5), "inactive");
    assert.equal(presenceOf(NaN), "inactive");
  });
  test("the clock's own freeze sits between the walls", () => {
    assert.ok(CLOCK_FREEZE_MS > ACTIVE_GRACE_MS && CLOCK_FREEZE_MS < PASSIVE_STOP_MS);
  });
});

describe("the day row's counters survive the round trip", () => {
  test("reason encodes and decodes; junk decodes to zero", () => {
    assert.deepEqual(parsePresenceReason(presenceReason(7284, 1320)), {
      a: 7284,
      p: 1320,
    });
    assert.deepEqual(parsePresenceReason("not json"), { a: 0, p: 0 });
    assert.deepEqual(parsePresenceReason('{"a":"x","p":-9}'), { a: 0, p: 0 });
  });
  test("a day holds at most a day", () => {
    assert.deepEqual(parsePresenceReason(presenceReason(9e9, 9e9)), {
      a: 86_400,
      p: 86_400,
    });
  });
  test("the capsule read: hours lead, minutes alone stay minutes", () => {
    assert.equal(fmtDesk(2 * 3600 + 14 * 60 + 59), "2h 14m");
    assert.equal(fmtDesk(840), "14m");
    assert.equal(fmtDesk(0), "0m");
    assert.equal(fmtDesk(-30), "0m");
  });
  test("the meter's day is Chicago's day", () => {
    // 04:30 UTC on Aug 15 is still Aug 14 in Chicago (CDT, UTC-5).
    assert.equal(presenceDayKey(new Date("2026-08-15T04:30:00Z")), "2026-08-14");
    assert.equal(presenceDayKey(new Date("2026-08-15T05:30:00Z")), "2026-08-15");
  });
});
