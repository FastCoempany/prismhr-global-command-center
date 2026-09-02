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
  test("call/call-ai sources are meetings whatever the words", () => {
    assert.ok(isMeetingNote({ body: "quick notes", source: "call" }));
    assert.ok(isMeetingNote({ body: "read of the call", source: "call-ai" }));
  });
  test("a transcript-source note is a meeting only when it reads like a call", () => {
    // The room's zero-entry fallback labels typed one-liners "transcript" —
    // the exact Axcet notes that lit a false "You met today."
    assert.ok(
      !isMeetingNote({
        body: "☰ transcript — filed from the room\ni did not meet with them today",
        source: "transcript",
      }),
    );
    assert.ok(
      !isMeetingNote({
        body: "☰ transcript — filed from the room\ni answered yes today to anika that i'd like to attend the sept 10 meeting",
        source: "transcript",
      }),
    );
    // Real archives pass: the room's archive head, the VTT pipeline head,
    // and any body with two speaker-labeled voices.
    assert.ok(
      isMeetingNote({
        body: "☰ Call transcript — XcelHR demo · 3 voices · full text under the fold\nBill: hi\nAntaeus: hey",
        source: "transcript",
      }),
    );
    assert.ok(
      isMeetingNote({
        body: "CALL TRANSCRIPT — dropped file demo.vtt\nTom: morning\nAntaeus: morning",
        source: "transcript",
      }),
    );
    assert.ok(
      isMeetingNote({
        body: "☰ transcript — filed from the room\nTom: we want Ireland\nAntaeus: let's scope it",
        source: "transcript",
      }),
    );
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

// ── a note ABOUT a meeting is not a meeting (the Axcet read, 2026-09-02) ────
// "✔ Follow-up with Anika — week of Aug 31 meeting", body "Awaiting word on
// whether the meeting actually took place", filed at today's date, read as
// "You met today" and the row demanded a recap of a meeting nobody can
// confirm happened.

test("chasing, scheduling, and doubting a meeting never read as one held", () => {
  const not = (body: string) =>
    assert.equal(isMeetingNote({ body, source: "sf-ai" }), false, body.slice(0, 60));
  not(
    "✔ SF activity — Follow-up with Anika — week of Aug 31 meeting · Antaeus Coe → Anika\nAwaiting word from Anika on whether the meeting scheduled for the week of Aug 31 actually took place.",
  );
  not("✔ SF activity — Schedule the quarterly meeting · Antaeus Coe → Anika\nGet it on the calendar.");
  not("✔ SF activity — Prep for Thursday demo · Antaeus Coe → Anika\nPull the deck together.");
  not("✉ SF 8/18 — Re: rescheduling our call with Marcus\nCan we move it?");
  // The real things still read as meetings.
  const yes = (body: string, source = "sf-ai") =>
    assert.equal(isMeetingNote({ body, source }), true, body.slice(0, 60));
  yes("✔ SF activity — Meeting — quarterly business review · Anika → Antaeus Coe\nCovered the roadmap.");
  yes("✉ SF 8/18 — met with Darlene on BE resolutions\nGood session.");
  yes("☰ CALL TRANSCRIPT — Aug 27\nA: hello\nB: hi there", "transcript");
});
