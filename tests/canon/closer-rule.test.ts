// Canon pins for the closer rule (CLAUDE.md "The closer rule", ruling of
// 2026-09-25: D28 — PROMISED needs a hearer). The classifier's own three
// pins (a closer, a question, a name) already live in tests/closer.test.ts
// and are not repeated here.

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { buildAccountSheet } from "../../src/lib/room/sheet-view";
import { NO_TAGS, withTags } from "../../src/lib/today/route-notes";

describe("PROMISED needs a hearer; a typed date is a wall (D28)", () => {
  const now = new Date("2026-08-22T18:00:00Z");
  const row = (id: string, body: string, date: string) => ({
    id,
    body: withTags(body, { ...NO_TAGS, kind: "action" as const, date }),
    done: false,
    accountId: "ACCT01",
    remindAt: "",
    createdAt: "2026-08-20T12:00:00Z",
    updatedAt: "2026-08-20T12:00:00Z",
  });
  const sheetOf = (todos: ReturnType<typeof row>[]) =>
    buildAccountSheet(todos, "ACCT01", new Set(), new Map(), now);

  test("a hand-typed dated action past its day reads as a plain wall, never PROMISED", () => {
    const sheet = sheetOf([row("t1", "Book the demo", "2026-08-21")]);
    assert.equal(sheet.open.length, 1);
    assert.equal(sheet.open[0].wall, "8/21", "the date passed, so it is a wall");
    assert.equal(sheet.open[0].promised, undefined, "no hearer, no promise");
  });

  test("a paste-provenance row with a blown date reads PROMISED — the hearer is built in", () => {
    const sheet = sheetOf([
      row("t2", "Send Chassie the information · from 8/20 paste", "2026-08-21"),
    ]);
    assert.equal(sheet.open.length, 1);
    assert.equal(sheet.open[0].wall, "8/21");
    assert.equal(sheet.open[0].promised, true);
  });

  test("a date still ahead is neither a wall nor a promise, whatever the provenance", () => {
    const sheet = sheetOf([
      row("t3", "Send Chassie the information · from 8/20 paste", "2026-08-30"),
      row("t4", "Book the demo", "2026-08-30"),
    ]);
    assert.equal(sheet.open.length, 2);
    for (const o of sheet.open) {
      assert.equal(o.wall, undefined);
      assert.equal(o.promised, undefined);
      assert.equal(o.due, "2026-08-30");
    }
  });
});
