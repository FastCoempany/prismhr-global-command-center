// Canon pins for the Spring (CLAUDE.md "The Spring", ruling of 2026-09-25:
// D25 — the court line is retired in full; the move line says who and when).
// These drive the room engine with minimal inputs and read the move line's
// own who-and-when, never a chip.

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { readDeal } from "../../src/lib/room/engine";

const NOW = new Date("2026-09-02T20:00:00Z"); // 3:00p Chicago

const base = {
  accountName: "Trend Personnel Services",
  step: null,
  timing: null,
  lastRecordAt: "2026-09-02T15:39:00Z",
  now: NOW,
};

describe("the move line carries who and when (D25)", () => {
  test("their reply after our send: the move names them and says today", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-09-02T14:44:00Z", awaitingReply: true, who: "Melanie" },
      lastInbound: { at: "2026-09-02T15:39:00Z", who: "Adam" },
    });
    assert.equal(r.move, "Answer Adam. They wrote today.");
    assert.equal(r.thin, false);
  });

  test("their reply two days back: the move counts the days", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-08-30T14:44:00Z", awaitingReply: true, who: "Melanie" },
      lastInbound: { at: "2026-08-31T15:39:00Z", who: "Adam" },
    });
    assert.equal(r.move, "Answer Adam. They wrote 2 days ago.");
  });

  test("our send today with nothing back: the move names who we wait on and when we wrote", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-09-02T16:02:00Z", awaitingReply: true, who: "Melanie" },
      lastInbound: null,
    });
    assert.equal(r.move, "Wait on Melanie. You wrote today.");
  });

  test("a meeting today: the move names who we met and when", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-09-01T14:44:00Z", awaitingReply: true, who: "Melanie" },
      lastInbound: null,
      lastMeeting: { at: "2026-09-02T15:00:00Z", who: "Melanie" },
    });
    assert.equal(r.move, "Send Melanie the recap. You met today.");
  });

  test("an acceptance after our send: the move names who accepted", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-09-01T14:44:00Z", awaitingReply: true, who: "Melanie" },
      lastInbound: null,
      lastAccepted: { at: "2026-09-02T15:00:00Z", who: "Melanie" },
    });
    assert.equal(r.move, "Wait for the meeting. Melanie accepted.");
  });

  test("their promise holds the await and says when it was made", () => {
    const r = readDeal({
      ...base,
      lastTouch: { at: "2026-08-30T14:44:00Z", awaitingReply: true, who: "Melanie" },
      lastInbound: { at: "2026-09-01T15:39:00Z", who: "Adam", promise: true },
    });
    assert.equal(r.move, "Hold for their follow-up. Promised yesterday.");
  });
});
