// The Pipeline column's rules, and the boundary the drawer must never cross.
//
// One line per field. A value too wide scrolls sideways — nothing is cut, so
// unlike the first cut there is no truncation to leak into a deliverable. What
// the drawer still does is collapse a multi-entry field to its top entry, and
// the last suite here holds the line that matters: Copy and the Word file read
// the record, so they carry every entry however few the pane shows.
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { joinEntries, oneLine } from "@/lib/pipeline/density";
import { recordToText } from "@/lib/pipeline/plain";
import { reportSection } from "@/lib/pipeline/docx";
import type { PipelineRecord } from "@/lib/pipeline/build";

const UNKNOWNS = [
  "Does XcelHR want to remain the client-facing brand (private label) or refer clients out?",
  "Which countries is Genesis HR Solutions hiring in without a legal entity?",
  "What work will the Mexico workers actually perform?",
];
const NEXT = [
  "Send EOR and Payroll pricing collateral for Canada and Mexico.",
  "Send broken-out payroll and EOR pricing for Canada and Mexico.",
  "Send the top qualifying questions XLHR needs to answer to get pricing.",
];

describe("the column's rules", () => {
  it("joins short entries into one run", () => {
    assert.equal(
      joinEntries(["Brazil · EOR · 10 workers", "Germany · EOR · 50 workers"]),
      "Brazil · EOR · 10 workers, Germany · EOR · 50 workers",
    );
  });

  it("drops empty entries rather than leaving a dangling comma", () => {
    assert.equal(
      joinEntries(["Mexico · EOR", "", "Canada · EOR"]),
      "Mexico · EOR, Canada · EOR",
    );
  });

  it("flattens a pasted value so it cannot become a second line", () => {
    assert.equal(oneLine("  Reseller\n  route  "), "Reseller route");
    assert.equal(oneLine("a\t\tb\n\nc"), "a b c");
  });

  it("leaves a value that is already one line alone", () => {
    assert.equal(oneLine("Globalization Partners"), "Globalization Partners");
  });

  it("never shortens a value — length is the column's problem, not the text's", () => {
    const long = UNKNOWNS[0];
    assert.equal(oneLine(long), long);
    assert.ok(!oneLine(long).includes("…"));
  });
});

const record = (): PipelineRecord =>
  ({
    id: "a1",
    account: "XCEL HR",
    csm: "Anika Steenstra",
    lastTouch: { date: "2026-08-13", kind: "Call", room: [] },
    events: [],
    model: { v: "Reseller", src: "the default" },
    incumbent: null,
    opportunities: [],
    products: [],
    outcomes: [],
    outcomesSrc: "",
    theirWords: [],
    ourNext: NEXT.map((text) => ({ text, opened: "2026-08-18", urgent: false })),
    doneRecently: [],
    theirSide: [],
    gated: false,
    handoffs: [],
    unknowns: UNKNOWNS,
    stage: null,
    closeDate: null,
    risks: [],
    quietDays: null,
    contacts: [],
    fyi: "",
    fyiWho: "",
    owners: [],
  }) as unknown as PipelineRecord;

describe("the pane's collapse never reaches the deliverable", () => {
  it("Copy carries every entry, not just the one on the line", () => {
    const text = recordToText(record(), {});
    for (const u of UNKNOWNS) assert.ok(text.includes(u), `missing unknown: ${u}`);
    for (const n of NEXT) assert.ok(text.includes(n), `missing next step: ${n}`);
    assert.ok(!text.includes("…"), "nothing in the clipboard text was shortened");
    assert.ok(!/\+\d+ more/i.test(text), "the door is a control, never text");
  });

  it("the Word file carries every entry", () => {
    const runs = JSON.stringify(reportSection([record()], {}, "Wed 9/9"));
    for (const u of UNKNOWNS) assert.ok(runs.includes(u), `missing unknown: ${u}`);
    for (const n of NEXT) assert.ok(runs.includes(n), `missing next step: ${n}`);
  });

  it("nothing under the record imports the drawer's presentation", async () => {
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
      "how the pane renders is the pane's business; the record must not know",
    );
  });
});

describe("the source subtext is retired", () => {
  it("the drawer renders no provenance chip", async () => {
    const { readFileSync } = await import("node:fs");
    const tab = readFileSync("src/app/room/pipeline-tab.tsx", "utf8");
    for (const gone of ["srcChip", "pipeSrcInline", "deal intel", "gap ledger"])
      assert.ok(!tab.includes(gone), `the readout still carries "${gone}"`);
    // "opened 8/18" rode the next-step line and went with the rest.
    assert.ok(!/opened \$\{md\(/.test(tab), "the opened-date chip is still rendered");
  });
});
