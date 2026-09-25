import { test } from "node:test";
import assert from "node:assert/strict";
import { sortEvents, splitAsk, withAsk } from "@/lib/today/ledger";

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
