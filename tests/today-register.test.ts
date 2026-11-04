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
import { roomClient, roomRow } from "./helpers/room-render";

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

// H4 (pass 8): "Filing or composing anything springs TODAY open so receipts
// never land behind a fold" (the Spring). The F26 face (ship order
// 2026-11-04) retired TODAY; the same state now opens "Latest email and
// Chute", where the receipts and the composer's lines land, so the pins
// below hold the same doors. A Chute filing, a note promoted from
// the record fold and an owed item accepted all added to TODAY and left it
// folded, so nothing visibly landed.
const room = await roomClient();

describe("whatever lands in TODAY springs it open (H4)", () => {
  const client = readFileSync(join(cwd(), "src/app/room/room-client.tsx"), "utf8");
  /** One handler's body: from its declaration to the next one at its depth. */
  const handler = (name: string): string => {
    const at = client.indexOf(`  const ${name} = `);
    assert.ok(at >= 0, `${name} is gone`);
    const next = client.indexOf("\n  const ", at + 1);
    return client.slice(at, next < 0 ? undefined : next);
  };

  test("a Chute filing's to-do arriving on the next paint is a landing", () => {
    // The Chute holds no row state: its filing reaches the row only when the
    // page re-derives, and the row compares what its register holds.
    const before = room.todayLines(roomRow());
    const after = room.todayLines(
      roomRow({
        sheetOpen: [
          { id: "todo-9", body: "Send the Canada numbers." },
          { id: "todo-1", body: "Send the model." },
        ],
      }),
    );
    assert.equal(room.landedSince(before, after), true);
  });

  test("an owed line the filing found is a landing too", () => {
    const before = room.todayLines(roomRow());
    const after = room.todayLines(
      roomRow({
        owed: [{ noteId: "n9", key: "owed-1", text: "the invoices", src: "9/25" }],
      }),
    );
    assert.equal(room.landedSince(before, after), true);
  });

  test("a line moving between zones, or leaving, lands nothing", () => {
    const before = room.todayLines(roomRow());
    // todo-1 delayed to tomorrow: the same ids, held instead of open.
    const moved = room.todayLines(
      roomRow({
        sheetOpen: [],
        sheetDelayed: [
          { id: "todo-1", body: "Send the model.", when: "THU" },
          { id: "todo-2", body: "Call the CSM.", when: "tomorrow" },
        ],
      }),
    );
    assert.equal(room.landedSince(before, moved), false);
    const left = room.todayLines(roomRow({ sheetOpen: [] }));
    assert.equal(room.landedSince(before, left), false);
  });

  test("every fresh line enters through one door, and the door springs TODAY", () => {
    const land = handler("landToday");
    assert.ok(land.includes('setSpring("today")'), "landToday springs TODAY");
    assert.equal(
      client.split("setFreshCaps((f) => [").length - 1,
      1,
      "a fresh line is added outside landToday",
    );
  });

  test("the record fold's promote and the composer land through it", () => {
    assert.ok(handler("promoteNote").includes("landToday("), "promoteNote");
    assert.ok(handler("submitCompose").includes("landToday("), "submitCompose");
  });

  // Pass 10 (A6.3): a Mark-it-done close, a Closed Won or Lost stamp, a
  // retire and a mint each added a receipt to TODAY and left it folded.
  // Every receipt now enters through one of two doors, and both spring.
  test("every receipt enters through a door, and both doors spring TODAY", () => {
    for (const door of ["addReceipt", "addInfo"])
      assert.ok(handler(door).includes('setSpring("today")'), `${door} springs TODAY`);
    const adds = client.split("setFreshInfo((f) => [").length - 1;
    assert.equal(adds, 2, "a receipt is added outside addReceipt and addInfo");
  });

  test("every path that files or composes lands through a door", () => {
    // Each write a row makes that leaves something in TODAY, by its handler.
    const paths: Record<string, RegExp> = {
      submitCompose: /landToday\(|filePaste\(/,
      promoteNote: /landToday\(/,
      filePaste: /addReceipt\(/,
      fileText: /addReceipt\(/,
      unfileHeld: /addReceipt\(/,
      archiveFiles: /addReceipt\(/,
      confirmClose: /addInfo\(/,
      retireRow: /addInfo\(/,
      submitClose: /addInfo\(/,
    };
    for (const [name, door] of Object.entries(paths))
      assert.match(handler(name), door, `${name} lands behind the fold`);
  });

  test("the row springs TODAY when the next paint holds a line it did not", () => {
    assert.ok(
      /if \(landedSince\(seenLines, lines\)\) setSpring\("today"\);/.test(client),
      "the row compares its register across paints",
    );
  });
});
