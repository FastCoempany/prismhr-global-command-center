// The move line (founder-decreed 2026-09-03). The Regis row read:
//
//   "Hold 11:00a–1:45p Tue/Wed/Thu next week for Regis global overview
//    call; confirm slot once Regis…"
//
// Two faults a line apart: the stage printed the register's commitment
// verbatim as the row's instruction, and the "first sentence" splitter knew
// only . ! ? — so a clause chain never split and a character cap landed
// wherever it landed. A commitment is a record of a thing owed; a move is
// what to do today.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { clip, moveFromCommitment, pickOwed, MOVE_BUDGET } from "../src/lib/room/move-line";
import { meterRead, readDeal } from "../src/lib/room/engine";
import { buildAccountSheet, OPEN_SHOWN } from "../src/lib/room/sheet-view";

// The stored body, verbatim from the live Todo row that produced the screenshot.
const REGIS =
  "Hold 11:00a–1:45p Tue/Wed/Thu next week for Regis global overview call; confirm slot once Regis replies ↯ if no reply, follow up with Lesha Cyphers to nudge the Regis team · from 8/26 paste";

describe("the reported line", () => {
  test("the Regis commitment now renders whole, with no ellipsis at all", () => {
    const built = moveFromCommitment(
      "Hold 11:00a–1:45p Tue/Wed/Thu next week for Regis global overview call; confirm slot once Regis replies",
    );
    assert.equal(
      built.line,
      "Hold 11:00a–1:45p Tue/Wed/Thu next week for Regis global overview call.",
    );
    assert.ok(!built.line.includes("…"));
    // The tail is not lost — it is one click down.
    assert.ok(built.cut);
    assert.ok(built.full.includes("confirm slot once Regis replies"));
  });
  test("the fallback and the provenance tail are never the instruction", () => {
    const built = moveFromCommitment(REGIS.slice(0, REGIS.indexOf(" ↯ ")));
    assert.ok(!built.line.includes("↯"));
    assert.ok(!/from 8\/26 paste/.test(built.line));
  });
});

describe("clip — a word boundary, never mid-word", () => {
  test("it cuts between words and marks the cut", () => {
    const r = clip("alpha bravo charlie delta echo foxtrot", 20);
    assert.ok(r.cut);
    assert.ok(r.text.endsWith("…"));
    // Whatever survives is whole words.
    for (const w of r.text.replace("…", "").trim().split(" "))
      assert.ok("alpha bravo charlie delta echo foxtrot".split(" ").includes(w), w);
  });
  test("a line inside the budget is untouched and unmarked", () => {
    const r = clip("Send the recap.", 96);
    assert.equal(r.text, "Send the recap.");
    assert.equal(r.cut, false);
  });
  test("no dangling punctuation before the ellipsis", () => {
    assert.ok(!/[\s,;:—-]…$/.test(clip("alpha bravo, charlie delta", 15).text));
  });
  test("adversarial: one unbroken word longer than the budget still ends", () => {
    const r = clip("x".repeat(200), 40);
    assert.equal(r.text.length, 40);
    assert.ok(r.cut);
  });
  test("adversarial: junk in, no throw", () => {
    assert.equal(clip("", 20).text, "");
    assert.equal(clip(null as unknown as string, 20).text, "");
  });
});

describe("moveFromCommitment — built, not sliced", () => {
  test("a clause chain gives its first link as the instruction", () => {
    const b = moveFromCommitment("Send the pricing; then book the review call");
    assert.equal(b.line, "Send the pricing.");
    assert.ok(b.cut);
  });
  test("a parenthetical aside is dropped before any trimming", () => {
    const b = moveFromCommitment(
      "Provide the two draft documents (Global T&Cs annex + SMB template contract) to Advocate Pay for review",
    );
    assert.ok(!b.line.includes("("), b.line);
    assert.ok(!b.line.includes("…"), b.line);
    assert.ok(b.line.startsWith("Provide the two draft documents to Advocate Pay"));
  });
  test("a short commitment passes through whole and is not a door", () => {
    const b = moveFromCommitment("Send Chassie the reseller agreement");
    assert.equal(b.line, "Send Chassie the reseller agreement.");
    assert.equal(b.cut, false);
  });
  test("terminal punctuation is never doubled", () => {
    assert.equal(moveFromCommitment("Send the recap.").line, "Send the recap.");
    assert.equal(moveFromCommitment("Send the recap?").line, "Send the recap?");
  });
  test("the full text always survives beside the line", () => {
    const b = moveFromCommitment("a".repeat(300));
    assert.equal(b.full.length, 300);
    assert.ok(b.line.length <= MOVE_BUDGET);
  });
});

describe("pickOwed — the most urgent thing owed, never the first in the store", () => {
  test("a blown wall outranks everything", () => {
    const p = pickOwed([
      { text: "no date" },
      { text: "due later", due: "2026-12-01" },
      { text: "wall blown", wall: true, due: "2026-08-01" },
    ]);
    assert.equal(p?.text, "wall blown");
  });
  test("a date outranks a dateless item, soonest first", () => {
    const p = pickOwed([
      { text: "no date at all" },
      { text: "later", due: "2026-12-01" },
      { text: "sooner", due: "2026-09-10" },
    ]);
    assert.equal(p?.text, "sooner");
  });
  test("empties and blanks are skipped", () => {
    assert.equal(pickOwed([]), null);
    assert.equal(pickOwed([{ text: "   " }]), null);
  });
});

describe("the engine renders the built line and opens the door", () => {
  const base = {
    accountName: "Regis HR Group",
    step: null,
    timing: null,
    lastTouch: null,
    lastRecordAt: "2026-09-02T12:00:00Z",
    now: new Date("2026-09-03T20:00:00Z"),
  };
  test("the row's move is the instruction, and moveFull carries the rest", () => {
    const r = readDeal({
      ...base,
      openOwed: [
        {
          text: "Hold 11:00a–1:45p Tue/Wed/Thu next week for Regis global overview call; confirm slot once Regis replies ↯ if no reply, follow up with Lesha Cyphers · from 8/26 paste",
        },
      ],
    });
    assert.equal(
      r.move,
      "Hold 11:00a–1:45p Tue/Wed/Thu next week for Regis global overview call.",
    );
    assert.ok(r.moveFull?.includes("confirm slot once Regis replies"));
    assert.ok(!r.move.includes("…"));
  });
  test("a whole line opens no door", () => {
    const r = readDeal({ ...base, openOwed: [{ text: "Send Chassie the agreements" }] });
    assert.equal(r.move, "Send Chassie the agreements.");
    assert.equal(r.moveFull, undefined);
  });
  test("the engine ranks the owed list before it builds", () => {
    const r = readDeal({
      ...base,
      openOwed: [
        { text: "First in the store, no date" },
        { text: "The blown promise", wall: true, due: "2026-08-20" },
      ],
    });
    assert.equal(r.move, "The blown promise.");
  });
  test("adversarial: the meter bubble no longer chops mid-word", () => {
    const m = meterRead({
      outcome: null,
      step: {
        nodeKey: "demo",
        nodeLabel: "Demo",
        item: "Confirm the right attendees including the decision maker and the person feeling the operational pain today",
        },
      doneInStage: 1,
      totalInStage: 3,
      allGatesDone: false,
      evidence: [],
    });
    const gate = m.why.find((w) => w.startsWith("Next gate:")) ?? "";
    assert.ok(gate.includes("…"));
    const words = gate.replace("Next gate: ", "").replace("…", "").trim().split(" ");
    assert.ok(
      "Confirm the right attendees including the decision maker and the person feeling the operational pain today".includes(
        words[words.length - 1],
      ),
    );
  });
});

// ── the register's cap (2026-09-03) ─────────────────────────────────────────
// It sliced eight in store order and dropped the rest silently: nine open
// commitments across three accounts — Simploy's newest five among them — were
// invisible on their own rows. The cap now ranks before it cuts and hands
// back what it held.

describe("the register's cap ranks, and never drops silently", () => {
  const mk = (id: string, text: string, tags = "k:a") => ({
    id,
    body: `${text}\n⚑[${tags}]`,
    done: false,
    accountId: "A",
    remindAt: null,
    updatedAt: "2026-09-03T12:00:00Z",
  });
  test("a blown wall is kept and the overflow is handed back, not lost", () => {
    const many = Array.from({ length: 12 }, (_, i) => mk(`t${i}`, `Commitment number ${i}`));
    // The blown wall sits LAST in store order — exactly where the old cap
    // would have thrown it away.
    many.push(mk("wall", "Send the thing you promised", "d:2026-08-01,k:a"));
    const sheet = buildAccountSheet(
      many as never,
      "A",
      new Set<string>(),
      new Map(),
      new Date("2026-09-03T20:00:00Z"),
    );
    assert.equal(sheet.open.length, OPEN_SHOWN);
    assert.equal(sheet.open[0].id, "wall", "the blown wall leads");
    assert.equal(sheet.openMore, 5);
    assert.equal(sheet.rest?.length, 5);
    // Nothing vanished: shown + held back is everything open.
    assert.equal(sheet.open.length + (sheet.rest?.length ?? 0), 13);
  });
  test("under the cap there is no door and nothing is held", () => {
    const sheet = buildAccountSheet(
      [mk("a", "One thing"), mk("b", "Another thing")] as never,
      "A",
      new Set<string>(),
      new Map(),
      new Date(),
    );
    assert.equal(sheet.openMore, 0);
    assert.equal(sheet.rest?.length, 0);
  });
});
