// The Scratchpaper's grammar, proven: day labels fold to TODAY/YESTERDAY in
// Chicago time, older lines carry their dated kicker, stamps read short.

import { test } from "node:test";
import assert from "node:assert/strict";
import { SCRATCH_NS, dayLabelFor, timeLabelFor } from "@/lib/scratch";

const NOW = new Date("2026-08-12T20:00:00Z"); // 3:00p Chicago, Wed Aug 12

test("the namespace keeps the pad out of account views", () => {
  assert.ok(SCRATCH_NS.includes(":"));
});

test("today and yesterday fold to their words, Chicago time", () => {
  assert.equal(dayLabelFor("2026-08-12T14:41:00-05:00", NOW), "TODAY");
  assert.equal(dayLabelFor("2026-08-11T21:55:00-05:00", NOW), "YESTERDAY");
});

test("a UTC stamp after Chicago midnight still counts as today", () => {
  // 2026-08-13T02:00Z is 9:00p Aug 12 in Chicago.
  assert.equal(dayLabelFor("2026-08-13T02:00:00Z", NOW), "TODAY");
});

test("older lines carry the dated kicker", () => {
  assert.equal(dayLabelFor("2026-08-10T15:00:00-05:00", NOW), "MON · AUG 10");
});

test("stamps read short", () => {
  assert.equal(timeLabelFor("2026-08-12T14:41:00-05:00"), "2:41p");
  assert.equal(timeLabelFor("2026-08-12T09:05:00-05:00"), "9:05a");
});

test("garbage dates never leak into labels", () => {
  assert.equal(dayLabelFor("not-a-date", NOW), "");
  assert.equal(timeLabelFor("not-a-date"), "");
});
