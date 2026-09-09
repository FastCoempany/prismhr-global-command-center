// The column's budget, and the boundary it must never cross.
//
// The clip exists because a 290px column exists. The Word file has a page and
// Copy has a clipboard, so neither has a column — and both read the record
// itself. The last suite here is the one that matters: it fails the moment
// someone "tidies up" by pushing the clip down into the record, which would
// have the pane silently deciding what a readout contains.
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { VALUE_BUDGET, clipValue, joinEntries } from "@/lib/pipeline/density";
import { recordToText } from "@/lib/pipeline/plain";
import { reportSection } from "@/lib/pipeline/docx";
import type { PipelineRecord } from "@/lib/pipeline/build";

const LONG =
  "What commercial structure does Simploy expect for the reseller arrangement (margin, revenue share, who holds the client contract)?";
const FYI =
  "75 support cases 6/29–8/27, mostly update provided (46); spike 9 in a day on 8/17. Mike Paschal is handling it.";

describe("the column's budget", () => {
  it("leaves a value inside the budget alone", () => {
    const r = clipValue("Globalization Partners holds the work today.");
    assert.equal(r.cut, false);
    assert.equal(r.text, "Globalization Partners holds the work today.");
  });

  it("cuts a long value to the budget and says it cut", () => {
    const r = clipValue(LONG);
    assert.equal(r.cut, true);
    assert.ok(r.text.length <= VALUE_BUDGET);
    assert.ok(r.text.endsWith("…"));
  });

  it("never cuts mid-word", () => {
    const r = clipValue(LONG);
    const body = r.text.slice(0, -1);
    assert.ok(LONG.startsWith(body), "the kept text is a prefix of the original");
    // The character after what we kept is a boundary, not the middle of a word.
    assert.ok(/[\s,;:.]/.test(LONG[body.length] ?? " "));
  });

  it("does not leave a period against the ellipsis", () => {
    const r = clipValue(FYI);
    assert.equal(r.cut, true);
    assert.ok(!r.text.includes(".…"), `reads as a typo: ${r.text}`);
  });

  it("hard-cuts the one case with no boundary to find", () => {
    const r = clipValue("x".repeat(200));
    assert.equal(r.cut, true);
    assert.ok(r.text.length <= VALUE_BUDGET);
  });

  it("collapses whitespace before measuring, so a wrapped paste is not over", () => {
    assert.equal(clipValue("  Reseller\n  route  ").text, "Reseller route");
  });

  it("joins short entries into one run", () => {
    assert.equal(
      joinEntries(["Brazil · EOR · 10 workers", "Germany · EOR · 50 workers"]),
      "Brazil · EOR · 10 workers, Germany · EOR · 50 workers",
    );
  });

  it("drops empty entries rather than leaving a dangling comma", () => {
    assert.equal(joinEntries(["Mexico · EOR", "", "Canada · EOR"]), "Mexico · EOR, Canada · EOR");
  });
});

const record = (): PipelineRecord =>
  ({
    id: "a1",
    account: "Simploy",
    csm: "Lesha Cyphers",
    lastTouch: { date: "2026-09-02", kind: "Call", room: [] },
    events: [],
    model: { v: "Reseller", src: "record" },
    incumbent: null,
    opportunities: [],
    products: [],
    outcomes: [],
    outcomesSrc: "",
    theirWords: [],
    ourNext: [{ text: LONG, opened: "2026-09-02", urgent: false }],
    doneRecently: [],
    theirSide: [],
    gated: false,
    handoffs: [],
    unknowns: [LONG],
    stage: null,
    closeDate: null,
    risks: [],
    quietDays: null,
    contacts: [],
    fyi: FYI,
    fyiWho: "",
    owners: [],
  }) as unknown as PipelineRecord;

describe("the clip never reaches the deliverable", () => {
  it("Copy carries the whole value, not the column's version", () => {
    const text = recordToText(record(), {});
    assert.ok(text.includes(LONG), "the full unknown is in the clipboard text");
    assert.ok(text.includes(FYI), "the full FYI line is in the clipboard text");
    assert.ok(!text.includes("…"), "nothing in the clipboard text was clipped");
  });

  it("the Word file carries the whole value", () => {
    const runs = JSON.stringify(reportSection([record()], {}, "Wed 9/9"));
    // The document is built from the record, so the long lines survive whole.
    assert.ok(runs.includes("who holds the client contract"), "the unknown is whole");
    assert.ok(runs.includes("Mike Paschal is handling it"), "the FYI line is whole");
  });

  it("nothing outside the drawer imports the budget", async () => {
    const { readFileSync, readdirSync } = await import("node:fs");
    const offenders: string[] = [];
    for (const f of readdirSync("src/lib/pipeline")) {
      if (f === "density.ts") continue;
      if (readFileSync(`src/lib/pipeline/${f}`, "utf8").includes("pipeline/density"))
        offenders.push(f);
    }
    assert.deepEqual(
      offenders,
      [],
      "the clip is a render concern; the record's own modules must not import it",
    );
  });
});
