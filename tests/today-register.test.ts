// The Trend Personnel Services row of 2026-09-23 rendered:
//
//   TODAY  0   TrendHR follow-up
//
// A count of nothing beside a thing. The numeral summed the sheet's open
// commitments and whatever the display cap held back; the trailing text fell
// through to the record's owed lines when the sheet had none. Two derivations
// for one line, so they could disagree — and on a row with an owed line and no
// todo, they did.
//
// The owed lines were never missing from the register. Springing it open
// renders them at the top, above the commitments. Only the numeral could not
// see them.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { todayRegister } from "@/lib/room/springs";

describe("the TODAY register counts what it shows", () => {
  test("the Trend row: an owed line and no commitment counts as one", () => {
    const r = todayRegister({ owed: ["TrendHR follow-up"], open: [], restCount: 0 });
    assert.equal(r.top, "TrendHR follow-up");
    assert.equal(r.count, 1, "the line it trails off with must be in the count");
  });

  test("a count is never zero while a line is shown", () => {
    // The invariant the row broke, stated directly.
    const cases = [
      { owed: ["owed a thing"], open: [], restCount: 0 },
      { owed: [], open: ["send the model"], restCount: 0 },
      { owed: ["owed a thing"], open: ["send the model"], restCount: 3 },
    ];
    for (const c of cases) {
      const r = todayRegister(c);
      assert.ok(r.top, "a case with entries showed no text");
      assert.ok(r.count > 0, `showed "${r.top}" with a count of ${r.count}`);
    }
  });

  test("nothing open reads as nothing, and the caller renders its own words", () => {
    const r = todayRegister({ owed: [], open: [], restCount: 0 });
    assert.equal(r.count, 0);
    assert.equal(r.top, "");
  });

  test("a commitment leads, the owed line stands in behind it", () => {
    // Unchanged precedence — the text was always right; the count was not.
    const r = todayRegister({
      owed: ["the record says you owe a recap"],
      open: ["send the calendar invite"],
      restCount: 0,
    });
    assert.equal(r.top, "send the calendar invite");
  });

  test("everything the register shows is summed, held-back included", () => {
    const r = todayRegister({
      owed: ["a", "b"],
      open: ["c", "d", "e"],
      restCount: 4,
    });
    assert.equal(r.count, 9);
  });

  test("blank entries are not counted as things", () => {
    const r = todayRegister({ owed: ["", "  "], open: [""], restCount: 0 });
    assert.equal(r.count, 0);
    assert.equal(r.top, "");
  });

  test("a nonsense rest count cannot push the numeral below the truth", () => {
    assert.equal(todayRegister({ owed: ["a"], open: [], restCount: -5 }).count, 1);
    assert.equal(todayRegister({ owed: ["a"], open: [], restCount: 1.7 }).count, 2);
  });
});

describe("the row reads one derivation, not two", () => {
  const client = readFileSync(join(cwd(), "src/app/room/room-client.tsx"), "utf8");

  test("neither render site does its own arithmetic", () => {
    // The folded summary and the sprung header both print the numeral. They
    // drifted apart once already; the shared value is what stops it twice.
    assert.ok(
      !client.includes("liveOpen.length + restCount"),
      "a render site is still summing the count itself",
    );
    assert.equal(client.split("{today.count}").length - 1, 2, "both sites read today.count");
  });

  test("the text comes from the same call as the count", () => {
    assert.ok(client.includes("const topToday = today.top;"));
    assert.ok(!/const topToday = liveOpen\[0\]/.test(client));
  });
});
