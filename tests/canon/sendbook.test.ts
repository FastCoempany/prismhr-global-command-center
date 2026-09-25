// The Sendbook's decrees, pinned as behavior (CLAUDE.md "The Sendbook",
// :309-332, the closer rule :377-393, the Ted doctrine's machinery clause
// :373-374, and the 2026-09-25 rulings R6 and R7). Every test calls
// buildSendbook and checks its lines and lanes; none reads a source file.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildSendbook, inboundDates, warmDates } from "../../src/lib/sendbook/read";

const NOW = new Date("2026-09-25T18:00:00.000Z");
// The noon-UTC day anchor every Outlook entry files at.
const NOON = "2026-09-02T12:00:00.000Z";

const send = (clock: string, createdAt = NOON) => ({
  body: `✉ OL ${clock} — Re: Canada · Antaeus Coe → Adam Reyes\nSending the model now.`,
  source: "outlook-ai",
  createdAt,
  actors: "Antaeus Coe → Adam Reyes",
});
const reply = (clock: string, text: string, createdAt = NOON, from = "Adam Reyes") => ({
  body: `✉ OL ${clock} — Re: Canada · ${from} → Antaeus Coe\n${text}`,
  source: "outlook-ai",
  createdAt,
  actors: `${from} → Antaeus Coe`,
});

const book = (notes: ReturnType<typeof send>[]) =>
  buildSendbook({ notesById: new Map([["A1", notes]]), tapsById: new Map(), now: NOW });

// ── E5 · "Replies annotate from the record only (↩ REPLIED)" (:326-327) read
// on the record's own clock (the Ted doctrine: the record holds a finer clock)
describe("the Sendbook reads effectiveAt (CLAUDE.md:326-327, :363)", () => {
  test("a 9:44 AM send and a 10:39 AM reply at one noon anchor: the reply annotates", () => {
    const { lines } = book([
      send("9:44 AM"),
      reply("10:39 AM", "We are in. Send the contract over when you can."),
    ]);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].at, "2026-09-02T09:44:00.000Z");
    assert.equal(lines[0].repliedAt, "2026-09-02T10:39:00.000Z");
  });

  test("the same two entries the other way round: a morning reply never answers an afternoon send", () => {
    const { lines } = book([
      send("2:15 PM"),
      reply("10:39 AM", "We are in. Send the contract over when you can."),
    ]);
    assert.equal(lines[0].at, "2026-09-02T14:15:00.000Z");
    assert.equal(lines[0].repliedAt, "");
  });
});

// ── C4 · the closer rule (:381-387) against the Sendbook (:324-327; ruled R6)
describe("↩ REPLIED needs a substantive inbound; a closer warms and sets no annotation", () => {
  test("a Thanks! after a send warms the lane and annotates nothing", () => {
    const { lines, laneById } = book([send("9:44 AM"), reply("10:39 AM", "Thanks!")]);
    assert.equal(laneById.get("A1"), "gone-cold");
    assert.equal(lines[0].repliedAt, "");
  });

  test("a substantive reply annotates the send", () => {
    const { lines, laneById } = book([
      send("9:44 AM"),
      reply("10:39 AM", "Honestly, I'd have to ask them. Can we talk Monday?"),
    ]);
    assert.equal(laneById.get("A1"), "gone-cold");
    assert.equal(lines[0].repliedAt, "2026-09-02T10:39:00.000Z");
  });

  test("a closer resets the drum all the same — their voice is still their voice", () => {
    const { lines } = book([
      send("9:44 AM", "2026-09-01T12:00:00.000Z"),
      reply("10:39 AM", "Sounds good", "2026-09-02T12:00:00.000Z"),
      send("9:00 AM", "2026-09-03T12:00:00.000Z"),
    ]);
    const steps = new Map(lines.map((l) => [l.at.slice(0, 10), l.step]));
    assert.equal(steps.get("2026-09-01"), 1);
    assert.equal(steps.get("2026-09-03"), 1);
  });
});

// ── C5 · "an auto-reply is machinery, never the client writing" (:373-374;
// ruled R7: machinery never warms and never replies) ──────────────────────
describe("machinery never warms and never replies (CLAUDE.md:373-374)", () => {
  const cases: [string, ReturnType<typeof send>][] = [
    [
      "a calendar acceptance",
      {
        body: "✉ OL 10:00 AM — Accepted: Initial Chat | Intro to PrismHR Global · Adam Reyes → Antaeus Coe\n",
        source: "outlook-ai",
        createdAt: NOON,
        actors: "Adam Reyes → Antaeus Coe",
      },
    ],
    [
      "a bounce",
      {
        body: "✉ OL 10:00 AM — Undeliverable: Re: Canada · Mail Delivery System → Antaeus Coe\nYour message could not be delivered.",
        source: "outlook-ai",
        createdAt: NOON,
        actors: "Mail Delivery System → Antaeus Coe",
      },
    ],
    [
      "a campaign alert",
      {
        body: "✉ OL 10:00 AM — 📣 New Website or Campaign Response Lead · Marketing → Antaeus Coe\nA lead was routed to you.",
        source: "outlook-ai",
        createdAt: NOON,
        actors: "Marketing → Antaeus Coe",
      },
    ],
    [
      "an out-of-office",
      {
        body: "✉ OL 10:00 AM — Automatic reply: Re: Canada · Adam Reyes → Antaeus Coe\nI am out until Monday.",
        source: "outlook-ai",
        createdAt: NOON,
        actors: "Adam Reyes → Antaeus Coe",
      },
    ],
  ];

  for (const [label, note] of cases) {
    test(`${label} neither warms the lane nor annotates the send`, () => {
      assert.deepEqual(warmDates([note]), [], label);
      assert.deepEqual(inboundDates([note]), [], label);
      const { lines, laneById } = book([send("9:44 AM"), note]);
      assert.equal(laneById.get("A1"), "never-met", label);
      assert.equal(lines[0].repliedAt, "", label);
    });
  }

  test("a person's own reply, for contrast, does both", () => {
    const note = reply("10:39 AM", "We are in. Send the contract over.");
    assert.equal(warmDates([note]).length, 1);
    assert.equal(inboundDates([note]).length, 1);
  });
});
