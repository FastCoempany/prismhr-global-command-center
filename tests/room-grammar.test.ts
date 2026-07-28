import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { nextRemindIso, parseLogInput } from "@/lib/room/bind";
import { buildStageRail } from "@/lib/room/stages-view";
import { DASH_NODES } from "@/lib/dashboard/stages";

// ADVERSARIAL — the composer's grammar and the stage rail assembly.

describe("parseLogInput — grammar under abuse", () => {
  test("plain text is a note; empties and junk are null", () => {
    assert.deepEqual(parseLogInput("Kristen wants the recap"), {
      kind: "note",
      body: "Kristen wants the recap",
    });
    assert.equal(parseLogInput(""), null);
    assert.equal(parseLogInput("   \n "), null);
    assert.equal(parseLogInput(null), null);
    assert.equal(parseLogInput(77 as unknown as string), null);
  });
  test("▢ and [] make actions; a bare marker is nothing", () => {
    assert.deepEqual(parseLogInput("▢ chase the signature"), {
      kind: "action",
      body: "chase the signature",
    });
    assert.deepEqual(parseLogInput("[] send the one-pager"), {
      kind: "action",
      body: "send the one-pager",
    });
    assert.equal(parseLogInput("▢   "), null);
  });
  test("⏲ with a real day schedules; with junk it stays an honest note", () => {
    const r = parseLogInput("⏲ wed send the entity one-pager");
    assert.equal(r?.kind, "scheduled");
    if (r?.kind === "scheduled") {
      assert.equal(r.remindDay, "wed");
      assert.equal(r.body, "send the entity one-pager");
    }
    const junk = parseLogInput("⏲ notaday do the thing");
    assert.equal(junk?.kind, "note"); // never guess a date
    assert.ok(junk?.kind === "note" && junk.body.includes("notaday"));
  });
  test("grammar markers inside the body stay text; money is redacted", () => {
    const r = parseLogInput("note about ▢ boxes and a $385 quote");
    assert.equal(r?.kind, "note");
    assert.ok(r && !/385/.test(r.body));
  });
});

describe("nextRemindIso — day math at the edges", () => {
  const wed = new Date("2026-07-29T16:00:00Z"); // Wednesday in Chicago
  test("same-named day rolls a full week, never today", () => {
    const iso = nextRemindIso("wed", wed);
    assert.equal(iso.slice(0, 10), "2026-08-05");
  });
  test("today stays today; tomorrow is tomorrow", () => {
    assert.equal(nextRemindIso("today", wed).slice(0, 10), "2026-07-29");
    assert.equal(nextRemindIso("tomorrow", wed).slice(0, 10), "2026-07-30");
  });
  test("every day token produces a valid future-or-today instant", () => {
    for (const d of ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const) {
      const iso = nextRemindIso(d, wed);
      assert.ok(!Number.isNaN(Date.parse(iso)), d);
      assert.ok(Date.parse(iso) > wed.getTime(), d);
    }
  });
});

describe("buildStageRail — the old board's nodes, bounds held", () => {
  const blank = { states: {}, checks: {}, checkNotes: {}, notes: {} };
  test("garbage cards degrade to a full all-todo rail, never throw", () => {
    const rail = buildStageRail(blank, {});
    assert.equal(rail.length, DASH_NODES.length);
    assert.ok(rail.every((s) => s.state === "todo"));
    const hostile = buildStageRail(
      {
        states: { demo: "exploded" as never },
        checks: { demo: "yes" as unknown as boolean[] },
        checkNotes: null as never,
        notes: { demo: 42 as unknown as string },
      },
      {},
    );
    assert.equal(hostile.length, DASH_NODES.length);
    assert.ok(!hostile.some((s) => s.judgment === "42"));
  });
  test("exactly one node can be cur, and it's the FIRST active", () => {
    const rail = buildStageRail(
      {
        states: {
          investigate: "done",
          first_meeting: "active",
          needs_analysis: "active",
        },
        checks: {},
        checkNotes: {},
        notes: {},
      },
      {},
    );
    assert.equal(rail.filter((s) => s.state === "cur").length, 1);
    assert.equal(rail.find((s) => s.state === "cur")?.key, "first_meeting");
  });
  test("item notes cap and align to their index under sparse data", () => {
    const rail = buildStageRail(
      {
        states: { demo: "active" },
        checks: { demo: [true] },
        checkNotes: { demo: { 2: "x".repeat(5000) } },
        notes: {},
      },
      {},
    );
    const demo = rail.find((s) => s.key === "demo")!;
    assert.equal(demo.items[0].checked, true);
    assert.equal(demo.items[1]?.checked ?? false, false);
    assert.ok((demo.items[2]?.note.length ?? 0) <= 300);
  });
});
