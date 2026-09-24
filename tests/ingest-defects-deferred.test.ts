// Ingest defects from audit pass 1 that are FIX IN REFACTOR: they sit in
// code the coming Chute refactor replaces (the two handleFiles forks, the
// picker, the Drop's file loop), so they are reproduced here and left red.
// This file runs by hand only — it is deliberately outside package.json's
// test script, never behind a skip. Each test names the refactor that closes
// it; when that refactor lands, move the test into ingest-defects.test.ts.
//
// Map: docs/architecture/chute-architecture-map.md (audit branch), §4 and
// closer 3.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

const root = cwd();
const client = readFileSync(join(root, "src/app/room/room-client.tsx"), "utf8");
const chute = readFileSync(join(root, "src/app/room/chute.tsx"), "utf8");

describe("bug 1 — the Chute picker's mismatch fall-through", () => {
  // Closed by: the shared verdict component for both doors (map closer 3,
  // candidate 9). fileTo patches a guard-rejected auto-route to "mismatch"
  // without its text (chute.tsx fileTo); text is patched only on the "pick"
  // branch; the picker's select then falls through `if (a && it.text)` to
  // vaultTo, so the readable text is vaulted under the picked account and
  // never filed. Interim one-line fix if wanted: carry `text` on the
  // mismatch patch.
  test("a guard-rejected auto-route keeps its text for the pick", () => {
    assert.match(chute, /patch\(key, \{ state: "mismatch"[^}]*\btext\b/);
  });
});

describe("bug 2 — the Drop files the first readable file only", () => {
  // Closed by: the shared handleFiles / vault hook (map closer 3, candidate
  // 6), which replaces the Drop's file loop. Today handleFiles picks the
  // FIRST file with a readable extension and vaults every other file
  // unread, so two .eml files dropped on a row file one and lose the other
  // to the record.
  test("every readable file in a drop is read, not just the first", () => {
    assert.ok(!/const f = files\.find\(/.test(client), "the Drop reads one file per drop");
  });
});
