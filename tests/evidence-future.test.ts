// The meter reads the record for evidence a stage is further along than the
// board says. Only one of its six rules checked whether the evidence had
// happened yet.
//
// A Salesforce task due next week is ordinary text to a regex. Trend Personnel
// Services carries exactly such a row — a self-set reminder dated 10/2 while
// the day was 9/23 — and the same future-dated read had already had the room
// chasing a reply to it (fixed in touch.ts, 2026-09-23). The meter kept the
// hole: "proposal sent" on a calendar reminder would march it to Proposal on
// work nobody has done.
//
// Five of the six rules point at a gate worded as a thing already done —
// delivered, sent, briefed, cleared. The sixth asks which countries they hire
// in, and a country named is named whatever date the reminder carries.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { suggestChecks } from "@/lib/intel/evidence";
import type { CorpusDoc } from "@/lib/intel/extract";

const NOW = new Date("2026-09-23T12:00:00Z");
const day = (d: string): string => `${d}T12:00:00Z`;
const doc = (text: string, at: string, src = "sf-activity"): CorpusDoc => ({
  text,
  at,
  src,
});
const empty = { checks: {} };
const run = (docs: CorpusDoc[]) => suggestChecks(docs, empty, new Set(), NOW);
const nodes = (docs: CorpusDoc[]) => run(docs).map((s) => s.node);

// One phrase per rule, lifted from each rule's own pattern, with the gate each
// points at. Everything but the last asserts an event.
const EVENT_RULES = [
  { id: "demo-delivered", node: "demo", text: "Demo delivered, recap sent." },
  { id: "contracts-out", node: "contract", text: "Contracts sent for signature." },
  { id: "proposal-delivered", node: "proposal", text: "Proposal sent to the client." },
  { id: "partner-briefed", node: "first_meeting", text: "Partner briefed on it." },
  { id: "cleared-approach", node: "first_meeting", text: "Cleared to engage the client." },
] as const;

describe("evidence dated after today has not happened", () => {
  test("a proposal 'sent' on next week's task does not move the meter", () => {
    // The shape the Trend row carries: a self-set reminder, dated forward.
    const future = doc("Follow up with TrendHR — proposal sent, check back", day("2026-10-02"));
    assert.deepEqual(nodes([future]), []);
  });

  test("the same words, dated in the past, are evidence", () => {
    const past = doc("Proposal sent to the client.", day("2026-07-20"));
    assert.deepEqual(nodes([past]), ["proposal"]);
  });

  test("every event rule is gated, not just the demo one", () => {
    // demo-delivered carried the only date check. The other four were open.
    for (const r of EVENT_RULES) {
      assert.deepEqual(
        nodes([doc(r.text, day("2026-10-02"))]),
        [],
        `${r.id} still reads a future-dated document as evidence`,
      );
      assert.deepEqual(
        nodes([doc(r.text, day("2026-07-20"))]),
        [r.node],
        `${r.id} stopped reading real past evidence`,
      );
    }
  });

  test("a future-dated row does not hide the real one behind it", () => {
    // The corpus arrives newest-first, so the reminder is scanned before the
    // send it is reminding about. Skipping it must not end the search.
    const docs = [
      doc("Follow up — proposal sent?", day("2026-10-02")),
      doc("Sent the Philippines pricing attached, thanks.", day("2026-07-20")),
    ];
    const hit = run(docs).find((s) => s.node === "proposal");
    assert.ok(hit, "the real 7/20 send was lost with the reminder");
    assert.equal(hit.srcAt, day("2026-07-20"));
  });

  test("today's own traffic is not the future", () => {
    const today = doc("Proposal sent this morning.", "2026-09-23T09:00:00Z");
    assert.deepEqual(nodes([today]), ["proposal"]);
  });

  test("a date the parser cannot read is not a future date", () => {
    // Dropping real evidence over an unparseable timestamp is the worse fail.
    const odd = doc("Proposal sent to the client.", "not-a-date");
    assert.deepEqual(nodes([odd]), ["proposal"]);
  });
});

describe("a fact is not an event", () => {
  test("a country named on a future-dated row still counts as named", () => {
    // The gate asks which countries they hire in. The reminder's due date
    // does not un-name Brazil.
    const future = doc("Ask about their workers in Brazil", day("2026-10-02"));
    assert.deepEqual(nodes([future]), ["needs_analysis"]);
  });

  test("the countries rule still needs a real country in the text", () => {
    const vague = doc("Which countries are they in?", day("2026-07-20"));
    assert.deepEqual(nodes([vague]), []);
  });
});

describe("the gate is the default, the exemption is deliberate", () => {
  const src = readFileSync(join(cwd(), "src/lib/intel/evidence.ts"), "utf8");

  test("no rule opts into the date check one at a time", () => {
    // pastOnly made the safe read the thing you had to remember. A rule added
    // next year gets it without knowing the rule exists.
    assert.ok(!src.includes("pastOnly"), "a rule still opts in by hand");
  });

  test("exactly one rule claims to read a standing fact", () => {
    assert.equal(
      src.split("standingFact: true").length - 1,
      1,
      "a second rule exempted itself from the date gate",
    );
  });
});
