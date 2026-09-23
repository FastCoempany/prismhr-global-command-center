// One company, two ids. The fold is read-time, so stored rows keep the id they
// were filed under — and anything that pins accountId to a single value reads
// half the account.
//
// The loaders fold as they build their maps. loadAccountNotes did; loadTodos
// did not, and two live [k:a] action todos about the Global overview sat
// invisible on the merged account (myhrpros (SPMI), found 2026-09-23). The
// second record's context pack had the same hole from the other side: it reads
// notes and todos straight out of Prisma, so the gems for a merged account
// stood on one note where the record held eleven.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { ALIASES, canonicalAccountId, storedIdsFor } from "@/lib/book/merge";

const DUPE = "0013k00002dGqODAA0";
const CANON = "001F000000w389qIAA";

describe("every id the account is stored under", () => {
  test("the canonical id leads, the duplicate follows", () => {
    const ids = storedIdsFor(CANON);
    assert.equal(ids[0], CANON, "the canonical id must lead");
    assert.ok(ids.includes(DUPE), "the shell the record landed in was dropped");
  });

  test("asking by the duplicate returns the same set", () => {
    // A caller holding either id gets the whole account.
    assert.deepEqual(storedIdsFor(DUPE), storedIdsFor(CANON));
  });

  test("a namespace rides through onto every id", () => {
    // The twenty gaps are filed under gaps:<shell>, not gaps:<canonical>.
    const ids = storedIdsFor(`gaps:${CANON}`);
    assert.deepEqual(ids, [`gaps:${CANON}`, `gaps:${DUPE}`]);
  });

  test("a deep namespace keeps all of its colons", () => {
    assert.deepEqual(storedIdsFor(`activity:stage:${CANON}`), [
      `activity:stage:${CANON}`,
      `activity:stage:${DUPE}`,
    ]);
  });

  test("an account with no duplicate is just itself", () => {
    const solo = "001F000000w38NUIAY"; // Trend Personnel Services
    assert.deepEqual(storedIdsFor(solo), [solo]);
  });

  test("a key that is not an account comes back untouched", () => {
    assert.deepEqual(storedIdsFor("scratch:pad"), ["scratch:pad"]);
    assert.deepEqual(storedIdsFor("playbook:market"), ["playbook:market"]);
  });

  test("nothing in, nothing out", () => {
    assert.deepEqual(storedIdsFor(""), []);
    assert.deepEqual(storedIdsFor("   "), []);
  });

  test("the set never repeats an id", () => {
    for (const id of [CANON, DUPE, `gaps:${CANON}`]) {
      const ids = storedIdsFor(id);
      assert.equal(new Set(ids).size, ids.length, `${id} expanded with a repeat`);
    }
  });

  test("every alias in the table is reachable from its canonical id", () => {
    // A pair added later is covered without touching this test.
    for (const [dupe, real] of Object.entries(ALIASES))
      assert.ok(
        storedIdsFor(real).includes(dupe),
        `${dupe} is folded into ${real} but not read back from it`,
      );
  });

  test("it agrees with the fold it is built on", () => {
    for (const id of [CANON, DUPE, `gaps:${DUPE}`])
      assert.equal(storedIdsFor(id)[0], canonicalAccountId(id));
  });
});

describe("the readers that pin an account id", () => {
  const overlay = readFileSync(join(cwd(), "src/lib/today/overlay.ts"), "utf8");
  const activity = readFileSync(join(cwd(), "src/lib/activity/run.ts"), "utf8");

  test("loadTodos folds, the way loadAccountNotes always did", () => {
    const body = overlay.slice(overlay.indexOf("export async function loadTodos"));
    assert.ok(
      body.includes("canonicalAccountId(r.accountId ?? \"\")"),
      "a todo still reports the id it was filed under",
    );
  });

  test("the context pack reads the whole account, notes and commitments", () => {
    // Both queries, not just the one that is easy to spot.
    assert.equal(
      activity.split("storedIdsFor(accountId)").length - 1,
      2,
      "the gem pack still reads one id for its notes or its todos",
    );
  });
});
