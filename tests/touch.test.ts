// The touch clock: the record's outbound entries outrank the touch log.
// Born 2026-08-14, the day the room said "Answer Chassie. The reply is
// owed." over a record holding the operator's own Aug 5 nudge.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { lastTouchRead, newestOutbound } from "../src/lib/room/touch";

const note = (actors: string, createdAt: string) => ({ actors, createdAt });

test("nothing anywhere reads as no touch", () => {
  assert.equal(lastTouchRead([], null), null);
});

test("the touch log alone passes through with its own semantics", () => {
  const r = lastTouchRead([], {
    contactedAt: "2026-08-01T12:00:00Z",
    awaitingReply: false,
    who: "Chassie",
  });
  assert.equal(r?.source, "log");
  assert.equal(r?.awaitingReply, false);
  assert.equal(r?.who, "Chassie");
});

test("a filed outbound newer than the log wins, and the ball is theirs", () => {
  const r = lastTouchRead(
    [
      note("Chassie Smith → Antaeus Coe", "2026-07-21T12:00:00Z"),
      note("Antaeus Coe → Chassie Smith", "2026-08-05T12:00:00Z"),
    ],
    { contactedAt: "2026-07-13T12:00:00Z", awaitingReply: true, who: "Chassie" },
  );
  assert.equal(r?.source, "record");
  assert.equal(r?.at, "2026-08-05T12:00:00Z");
  assert.equal(r?.who, "Chassie Smith");
  assert.equal(r?.awaitingReply, true);
});

test("a log entry newer than any filed outbound keeps the log's read", () => {
  const r = lastTouchRead([note("Antaeus Coe → Bill Laffey", "2026-08-01T12:00:00Z")], {
    contactedAt: "2026-08-10T12:00:00Z",
    awaitingReply: true,
    who: "Bill",
  });
  assert.equal(r?.source, "log");
  assert.equal(r?.at, "2026-08-10T12:00:00Z");
});

test("inbound traffic and unattributed notes never count as touches", () => {
  assert.equal(
    newestOutbound([
      note("Chassie Smith → Antaeus Coe", "2026-08-12T12:00:00Z"),
      note("", "2026-08-13T12:00:00Z"),
    ]),
    null,
  );
});

test("the +n recipient tail strips from who", () => {
  const r = lastTouchRead(
    [note("Antaeus Coe → Bill Laffey +6", "2026-08-13T02:00:00Z")],
    null,
  );
  assert.equal(r?.who, "Bill Laffey");
});

describe("a meeting is a thing that happened, never a send awaiting a reply", () => {
  // The Staff Leasing 1:00 PM (8/18): a filed meeting carried the operator's
  // name in its actors and the row read "Wait on Tom." The clock must skip it.
  test("a logged meeting with my name in the actors is not an outbound", () => {
    const notes = [
      {
        actors: "Antaeus Coe → Tom +3",
        createdAt: "2026-08-18T17:00:00Z",
        body: "✔ SF Today 1:00 PM — Staff Leasing meeting — Ireland/UK opportunity · Antaeus Coe → Tom +3\nTom talked Ireland.",
        source: "sf-ai",
      },
      {
        actors: "Antaeus Coe → Tom Boell",
        createdAt: "2026-08-12T19:32:00Z",
        body: "☎ TM Aug 12 2:32 PM — SMS — reschedule to Tuesday Aug 18 · Antaeus Coe → Tom Boell\nAntaeus asked to move.",
        source: "teams-ai",
      },
    ];
    const out = newestOutbound(notes);
    assert.ok(out);
    assert.equal(out?.createdAt, "2026-08-12T19:32:00Z");
  });
  test("call sources are meetings whatever the body says", () => {
    const out = newestOutbound([
      {
        actors: "Antaeus Coe → Chassie",
        createdAt: "2026-08-18T16:00:00Z",
        body: "notes from the call",
        source: "call",
      },
    ]);
    assert.equal(out, null);
  });
  test("a typed note mislabeled 'transcript' still counts as the send it is", () => {
    const out = newestOutbound([
      {
        actors: "Antaeus Coe → Anika",
        createdAt: "2026-08-18T16:00:00Z",
        body: "☰ transcript — filed from the room\nconfirmed sept 10 with anika",
        source: "transcript",
      },
    ]);
    assert.ok(out);
  });
});
