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

// Every label's rendered width in the drawer's rail type — JetBrains Mono at
// 8.5px, 0.08em tracking, uppercase — measured in a browser, not estimated.
// A label wider than the rail overflows its grid cell and the value paints
// over the top of it. That shipped twice: labels wrapped at an 80px rail, then
// three of them bled at 92px, worst on the gated Next-step row at 116px.
const RAIL = 104;
const MEASURED: Record<string, number> = {
  Products: 47,
  Countries: 53,
  Contacts: 47,
  Model: 29,
  Competitor: 58,
  Stage: 29,
  "Close date": 58,
  "Last meeting": 70,
  "Their move": 58,
  "Next step": 53,
  "Waiting on": 58,
  Outcomes: 47,
  "Their words": 64,
  Unknowns: 47,
  Risk: 24,
  "FYI · other teams": 99,
  "FYI · elsewhere": 87,
};

describe("no label can outgrow the rail", () => {
  it("every label the drawer renders has been measured and fits", async () => {
    const { readFileSync } = await import("node:fs");
    const tab = readFileSync("src/app/room/pipeline-tab.tsx", "utf8");
    // The Field/Rows prop only — `aria-label` is a different thing that never
    // reaches the rail.
    const labels = [...tab.matchAll(/(?<![\w-])label="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(labels.length >= 15, `only found ${labels.length} labels — did the prop change?`);
    for (const l of labels) {
      const px = MEASURED[l];
      assert.ok(
        px !== undefined,
        `"${l}" has never been measured. Render it at 8.5px JetBrains Mono, ` +
          `0.08em tracking, uppercase, and add the width here.`,
      );
      assert.ok(px <= RAIL, `"${l}" is ${px}px in a ${RAIL}px rail — it will bleed`);
    }
  });

  it("the rail in the stylesheet is the one these widths were checked against", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync("src/app/room/room.module.css", "utf8");
    assert.ok(
      css.includes(`grid-template-columns: ${RAIL}px minmax(0, 1fr) auto;`),
      `the rail moved away from ${RAIL}px — re-measure the labels before changing it`,
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
