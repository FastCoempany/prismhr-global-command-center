import { test } from "node:test";
import assert from "node:assert/strict";
import { nextRoundupDueIso, sortEvents, splitAsk, withAsk } from "@/lib/today/ledger";
import type { Touch } from "@/lib/today/follow-ups";

test("ask marker", async (t) => {
  await t.test("withAsk → splitAsk round-trips", () => {
    const d = withAsk("7 of 7 teed up", "yes/no on the 5 flagged accounts");
    const { detail, ask } = splitAsk(d);
    assert.equal(detail, "7 of 7 teed up");
    assert.equal(ask, "yes/no on the 5 flagged accounts");
  });

  await t.test("no ask → detail unchanged, ask empty", () => {
    assert.deepEqual(splitAsk("7 of 7 teed up"), {
      detail: "7 of 7 teed up",
      ask: "",
    });
  });

  await t.test("clearing the ask restores the plain detail", () => {
    const d = withAsk("base", "something owed");
    assert.equal(withAsk(d, ""), "base");
  });

  await t.test("re-setting replaces instead of stacking", () => {
    const once = withAsk("base", "first ask");
    const twice = withAsk(once, "second ask");
    assert.deepEqual(splitAsk(twice), { detail: "base", ask: "second ask" });
    assert.equal(twice.split("⊙").length, 2);
  });

  await t.test("empty detail with an ask still works", () => {
    const d = withAsk("", "the answer");
    assert.deepEqual(splitAsk(d), { detail: "", ask: "the answer" });
  });
});

test("roundup window", async (t) => {
  const base: Touch = {
    subjectKey: "k",
    kind: "partner",
    label: "Anika Steenstra",
    detail: "",
    message: "",
    contactedAt: "2026-07-14T12:00:00.000Z",
    followUpAt: "2026-07-15T12:00:00.000Z",
    intervalDays: 2,
    status: "archived",
    log: [],
  };

  await t.test("archived thread → window opens 2 days after send", () => {
    assert.equal(nextRoundupDueIso(base), "2026-07-16T12:00:00.000Z");
  });

  await t.test("live thread → no upcoming window", () => {
    assert.equal(nextRoundupDueIso({ ...base, status: "awaiting" }), "");
  });

  await t.test("never contacted → due now, not upcoming", () => {
    assert.equal(nextRoundupDueIso(undefined), "");
  });
});

test("event ordering is chronological", () => {
  const out = sortEvents([
    { at: "2026-07-16T15:00:00Z", text: "b", kind: "done" },
    { at: "2026-07-16T13:00:00Z", text: "a", kind: "note" },
  ]);
  assert.deepEqual(
    out.map((e) => e.text),
    ["a", "b"],
  );
});
