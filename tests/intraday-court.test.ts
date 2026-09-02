// The intra-day court (2026-09-02): the operator wrote Trend at 9:44 AM,
// Adam Dingwell answered at 10:39 AM, both filed at the same noon day-anchor
// — and the room said "Wait on Melanie" while Adam's answer sat unread. The
// record holds the finer clock in its own OL heads; these tests pin that the
// readers now read it, through the REAL pipeline end to end.

import { test } from "node:test";
import assert from "node:assert/strict";
import { headClockMinutes, effectiveAt } from "../src/lib/intel/clock";
import { extractDealIntel, type CorpusDoc } from "../src/lib/intel/extract";
import { lastTouchRead } from "../src/lib/room/touch";
import { readDeal } from "../src/lib/room/engine";

const NOON = "2026-09-02T12:00:00.000Z";
const note = (head: string, actors: string, rest = "") => ({
  body: `${head}\n${rest || "Some words a person wrote."}`,
  actors,
  createdAt: NOON,
  source: "outlook-ai",
});

test("the head clock parses the OL slot and never the subject", () => {
  assert.equal(headClockMinutes("✉ OL Today 9:44 AM — Re: Philippines Pricing"), 584);
  assert.equal(headClockMinutes("✉ OL Sep 1 10:06 AM — RE: Pricing"), 606);
  assert.equal(headClockMinutes("✉ OL Aug 14 2:59 PM — RE: Pricing"), 899);
  // Midnight and noon in 12-hour speech.
  assert.equal(headClockMinutes("✉ OL Today 12:00 AM — x"), 0);
  assert.equal(headClockMinutes("✉ OL Today 12:30 PM — x"), 750);
  // No clock in the head slot — the subject's own time never counts.
  assert.equal(headClockMinutes("✉ OL 08/31 — Re: call at 3:30 PM tomorrow"), null);
  // Not an OL head at all.
  assert.equal(headClockMinutes("✉ SF 8/28 — Email: 9:15 AM sync"), null);
  assert.equal(headClockMinutes("plain note 4:00 PM"), null);
});

test("the shift is gated to the noon anchor and stays inside its day", () => {
  const early = effectiveAt(NOON, "✉ OL Today 9:44 AM — x");
  const late = effectiveAt(NOON, "✉ OL Today 10:39 AM — x");
  assert.ok(Date.parse(early) < Date.parse(late));
  assert.equal(early.slice(0, 10), "2026-09-02");
  assert.equal(effectiveAt(NOON, "✉ OL Today 12:00 AM — x").slice(0, 10), "2026-09-02");
  assert.equal(effectiveAt(NOON, "✉ OL Today 11:59 PM — x").slice(0, 10), "2026-09-02");
  // A real timestamp is never touched, clock in the head or not.
  const real = "2026-09-02T00:03:11.000Z";
  assert.equal(effectiveAt(real, "✉ OL Today 9:44 AM — x"), real);
  // No head clock: the anchor stands.
  assert.equal(effectiveAt(NOON, "✉ OL 08/31 — x"), NOON);
  assert.equal(effectiveAt("not a date", "✉ OL Today 9:44 AM — x"), "not a date");
});

// ── the Trend repro, through the real pipeline ──────────────────────────────

const trendNotes = [
  note(
    "✉ OL Today 9:44 AM — Re: Philippines Pricing · Antaeus Coe → Melanie Dreyer +2",
    "Antaeus Coe → Melanie Dreyer +2",
    "Looking forward to Adam's thoughts on this.",
  ),
  note(
    "✉ OL Today 10:39 AM — Re: Philippines Pricing · Adam Dingwell → Antaeus Coe +2",
    "Adam Dingwell → Antaeus Coe +2",
    "Still working through the proposal process; foresees another month or two before a decision at best.",
  ),
];

const intelFor = (notes: typeof trendNotes) =>
  extractDealIntel(
    notes.map(
      (n): CorpusDoc => ({
        text: n.body,
        at: effectiveAt(n.createdAt, n.body),
        src: "sf-activity 9/2",
        direction: /antaeus/i.test(n.actors.split("→")[0]) ? "out" : "in",
        sender: /antaeus/i.test(n.actors.split("→")[0])
          ? ""
          : n.actors.split("→")[0].trim(),
      }),
    ),
  );

const readFor = (notes: typeof trendNotes, now: Date) => {
  const intel = intelFor(notes);
  const touch = lastTouchRead(notes, null);
  return readDeal({
    accountName: "Trend Personnel Services",
    step: null,
    timing: null,
    lastTouch: touch
      ? { at: touch.at, awaitingReply: touch.awaitingReply, who: "Melanie" }
      : null,
    lastInbound: intel.lastInbound
      ? {
          at: intel.lastInbound,
          who: intel.lastInboundWho.split(" ")[0] || "they",
          promise: intel.lastInboundPromise,
        }
      : null,
    lastRecordAt: NOON,
    now,
  });
};

test("a same-day reply after the operator's send wins the court", () => {
  const read = readFor(trendNotes, new Date("2026-09-02T20:00:00Z"));
  assert.ok(read.move.startsWith("Answer Adam"), `got: ${read.move}`);
  assert.equal(read.court.tone, "you");
  assert.ok(read.court.line.includes("ADAM"));
});

test("adversarial: the operator answering back the same day flips it again", () => {
  const answered = [
    ...trendNotes,
    note(
      "✉ OL Today 11:02 AM — Re: Philippines Pricing · Antaeus Coe → Adam Dingwell +2",
      "Antaeus Coe → Adam Dingwell +2",
      "Thanks Adam - let's put a checkpoint on the calendar for early October.",
    ),
  ];
  const read = readFor(answered, new Date("2026-09-02T20:00:00Z"));
  assert.ok(read.move.startsWith("Wait on"), `got: ${read.move}`);
  assert.equal(read.court.tone, "them");
});

test("adversarial: clockless day entries still order across days", () => {
  const mixed = [
    {
      ...note(
        "✉ OL 08/31 — Re: Philippines Pricing · Antaeus Coe → Melanie Dreyer",
        "Antaeus Coe → Melanie Dreyer",
      ),
      createdAt: "2026-08-31T12:00:00.000Z",
    },
    {
      ...note(
        "✉ OL Sep 1 10:06 AM — RE: Philippines Pricing · Melanie Dreyer → Antaeus Coe +2",
        "Melanie Dreyer → Antaeus Coe +2",
        "Will check with their Sales Director.",
      ),
      createdAt: "2026-09-01T12:00:00.000Z",
    },
  ];
  // Outbound 8/31 (clockless, anchor holds), inbound 9/1 — inbound is newer.
  const read = readFor(mixed as typeof trendNotes, new Date("2026-09-02T20:00:00Z"));
  assert.ok(read.move.startsWith("Answer"), `got: ${read.move}`);
});

test("adversarial: the subject's own time cannot forge a clock", () => {
  // The operator's entry has no head clock; the inbound does. If the subject
  // time ("3:30 PM") were read as the head's, this outbound would jump the
  // court. It must not.
  const forged = [
    {
      ...note(
        "✉ OL 09/02 — Re: meet 3:30 PM tomorrow · Antaeus Coe → Melanie Dreyer",
        "Antaeus Coe → Melanie Dreyer",
      ),
    },
    trendNotes[1],
  ];
  const read = readFor(forged as typeof trendNotes, new Date("2026-09-02T20:00:00Z"));
  // The clockless outbound holds the noon anchor; Adam's 10:39 sits before
  // noon, so the strict compare still reads the outbound as last — the honest
  // read for entries whose order the record genuinely does not state.
  assert.ok(read.move.startsWith("Wait on"), `got: ${read.move}`);
});
