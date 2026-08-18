// The record's live motion excludes an account from Groundwork — born
// 2026-08-14, the day Infiniti HR kept staging for prospecting two days
// after its record filed the leadership meeting.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { liveMotionIds } from "../src/lib/groundwork/day";
import { isMeetingNote } from "../src/lib/intel/meeting";

const NOW = new Date("2026-08-14T12:00:00Z");
const note = (body: string, source: string, createdAt: string) => ({
  body,
  source,
  createdAt,
});

test("a recent inbound puts the account in motion", () => {
  const ids = liveMotionIds(
    new Map(),
    new Map([["a1", { lastInbound: "2026-08-01T12:00:00Z" }]]),
    NOW,
  );
  assert.ok(ids.has("a1"));
});

test("an old inbound alone does not", () => {
  const ids = liveMotionIds(
    new Map(),
    new Map([["a1", { lastInbound: "2026-07-14T12:00:00Z" }]]),
    NOW,
  );
  assert.ok(!ids.has("a1"));
});

test("a fresh meeting note puts the account in motion — the Infiniti case", () => {
  const ids = liveMotionIds(
    new Map([
      [
        "inf",
        [
          note(
            "✎ Met with Infiniti HR yesterday afternoon 8/11/26",
            "room",
            "2026-08-12T15:03:00Z",
          ),
        ],
      ],
    ]),
    new Map([["inf", { lastInbound: "2026-07-14T16:26:00Z" }]]),
    NOW,
  );
  assert.ok(ids.has("inf"));
});

test("a fresh filed transcript puts the account in motion", () => {
  const ids = liveMotionIds(
    new Map([
      [
        "x",
        [
          note(
            "☰ Call transcript — dropped file demo.vtt",
            "transcript",
            "2026-08-13T02:16:00Z",
          ),
        ],
      ],
    ]),
    new Map(),
    NOW,
  );
  assert.ok(ids.has("x"));
});

test("a stale meeting note does not", () => {
  const ids = liveMotionIds(
    new Map([
      ["a1", [note("✎ Met with them at the booth", "room", "2026-07-20T12:00:00Z")]],
    ]),
    new Map(),
    NOW,
  );
  assert.ok(!ids.has("a1"));
});

test("the operator's own fresh outbound never excludes — the drumbeat needs it", () => {
  const ids = liveMotionIds(
    new Map([
      [
        "a1",
        [
          note(
            "✉ OL Aug 13 — intro note · Antaeus Coe → Dana Reyes",
            "outlook-ai",
            "2026-08-13T12:00:00Z",
          ),
        ],
      ],
    ]),
    new Map([["a1", { lastInbound: "" }]]),
    NOW,
  );
  assert.ok(!ids.has("a1"));
});

describe("isMeetingNote — the one shared spelling", () => {
  test("logged activities naming a meeting/call/demo are meetings", () => {
    assert.ok(
      isMeetingNote({ body: "✔ SF Today 1:00 PM — Staff Leasing meeting — Ireland/UK" }),
    );
    assert.ok(
      isMeetingNote({ body: "✔ TM Today 2:00 PM — Call with Tom Boell — 2:00 PM" }),
    );
  });
  test("sources call/call-ai/transcript are meetings whatever the words", () => {
    assert.ok(isMeetingNote({ body: "raw vtt", source: "transcript" }));
  });
  test("plain sends and tasks are not meetings", () => {
    assert.ok(
      !isMeetingNote({
        body: "✉ OL Aug 17 — Re: Prism Global payroll demo · Antaeus Coe → Bill",
      }),
    );
    assert.ok(
      !isMeetingNote({ body: "✔ SF Jul 3 — Task completed: send the entity list" }),
    );
    assert.ok(
      !isMeetingNote({
        body: "☎ TM Aug 12 2:32 PM — SMS — reschedule · Antaeus Coe → Tom Boell",
      }),
    );
  });
});
