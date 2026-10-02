// Ingest defects from audit pass 1 that are FIX IN REFACTOR: they sit in
// code the coming Chute refactor replaces, so they are reproduced here as
// behavior and left red. This file runs by hand only — it is deliberately
// outside package.json's test script, never behind a skip. Each test names
// the refactor that closes it; when that refactor lands, move the test into
// ingest-defects.test.ts.
//
// Bug 1 (the Chute picker's mismatch fall-through) left this file on
// 2026-10-02: the C20 scaffold put the text on the row before the read
// (chute.tsx fileTo), so a disputed auto-route keeps its text for the pick,
// and tests/canon/chute.test.ts pins the ledger half ("a mismatch row keeps
// its text and its state too"). The old pin here was a regex over the source
// and read red after the fix moved the text to an earlier patch.
//
// Map: docs/architecture/chute-architecture-map.md, §4 and closer 3; the
// plan: docs/plans/chute-brains-refactor-2026-09-25.md, slice 8.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { splitDrop } from "../src/lib/room/drop-plan";
import { DROP_ACCEPT } from "../src/lib/paste-files";

describe("bug 2 — the Drop files the first readable file only", () => {
  // Closed by: the shared handleFiles hook (plan slice 8), which replaces the
  // Drop's split. Today splitDrop hands the reader ONE readable file and
  // sends every other file to the vault unread, so two .eml files dropped on
  // a row file one and lose the other to the record.
  test("every readable file in a drop is read, not just the first", () => {
    const a = new File(["From: a@x.com\nSubject: one\n\nbody one"], "one.eml");
    const b = new File(["From: b@x.com\nSubject: two\n\nbody two"], "two.eml");
    const split = splitDrop([a, b], DROP_ACCEPT);
    const unreadReadable = split.unreadable.filter((f) => /\.eml$/i.test(f.name));
    assert.deepEqual(
      unreadReadable.map((f) => f.name),
      [],
      "a readable file went to the vault unread",
    );
  });
});
