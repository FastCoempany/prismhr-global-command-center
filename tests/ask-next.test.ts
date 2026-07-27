import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { askNextFor, gapsFor, stageOf } from "@/lib/intel/ask-next";
import { researchPrompt } from "@/lib/intel/research";
import { EMPTY_INTEL, type DealIntel } from "@/lib/intel/types";

const intel = (over: Partial<DealIntel> = {}): DealIntel => ({
  ...structuredClone(EMPTY_INTEL),
  ...over,
});

describe("gapsFor", () => {
  test("cold intel gaps everything gap-able", () => {
    const g = gapsFor(intel());
    for (const c of ["footprint", "timing", "commercial", "incumbent"])
      assert.ok(g.includes(c as never), c);
  });
  test("known facts close their gaps", () => {
    const g = gapsFor(
      intel({
        countries: [{ value: "bg", src: "digest", at: "2026-07-07T00:00:00Z" }],
        chair: "referral",
        incumbent: { value: "G-P", src: "digest", at: "2026-07-07T00:00:00Z" },
        timing: {
          value: { phrase: "Sept 1" },
          src: "digest",
          at: "2026-07-07T00:00:00Z",
        },
        threads: { people: ["A", "B"], execSeen: true, opsSeen: true },
      }),
    );
    assert.deepEqual(g, []);
  });
});

describe("stageOf", () => {
  test("first active node wins; last done falls back; investigate default", () => {
    assert.equal(stageOf({ needs_analysis: "active", demo: "active" }), "needs_analysis");
    assert.equal(
      stageOf({ investigate: "done", first_meeting: "done" }),
      "first_meeting",
    );
    assert.equal(stageOf({}), "investigate");
  });
});

describe("askNextFor", () => {
  test("caps at 3, substitutes countries, honors done keys", () => {
    const i = intel({
      countries: [{ value: "mx", src: "note", at: "2026-07-01T00:00:00Z" }],
    });
    const qs = askNextFor({
      intel: i,
      states: { needs_analysis: "active" },
      accountId: "A1",
      doneKeys: new Set(),
    });
    assert.ok(qs.length > 0 && qs.length <= 3);
    const withCountry = qs.find((q) => q.question.includes("{countries}"));
    assert.equal(withCountry, undefined); // placeholder always substituted
    const retired = askNextFor({
      intel: i,
      states: { needs_analysis: "active" },
      accountId: "A1",
      doneKeys: new Set([`asknext-done:A1:${qs[0].id}`]),
    });
    assert.ok(!retired.some((q) => q.id === qs[0].id));
  });
});

describe("researchPrompt", () => {
  test("canonical shape, money never rides along", () => {
    const p = researchPrompt("incumbent", {
      account: "Advocate Pay",
      countries: ["Bulgaria", "India"],
      known: ["incumbent: G-P", "budget approved at $12,000 for setup"],
      question: "Where does a G-P switch typically bite?",
    });
    assert.match(p, /^You are researching for a PrismHR Global deal\./);
    assert.match(p, /Account: Advocate Pay/);
    assert.match(p, /Bulgaria, India/);
    assert.match(p, /Where does a G-P switch typically bite\?/);
    assert.match(p, /Return bullet facts with sources/);
    assert.ok(!p.includes("$12,000"));
  });
});
