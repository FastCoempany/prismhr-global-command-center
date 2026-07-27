import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { briefText, weeklyBrief } from "@/lib/intel/narrative";
import { liveLookInto } from "@/lib/look-into/live";
import { EMPTY_INTEL, type DealIntel } from "@/lib/intel/types";

const NOW = new Date("2026-07-27T15:00:00Z");

const intel = (over: Partial<DealIntel> = {}): DealIntel => ({
  ...structuredClone(EMPTY_INTEL),
  ...over,
});

describe("weeklyBrief", () => {
  const base = {
    now: NOW,
    cards: [
      {
        name: "Advocate Pay",
        states: { contract: "active" },
        activated: { contract: "2026-07-24T12:00:00Z", demo: "2026-06-01T00:00:00Z" },
      },
    ],
    partnerNotes: [
      {
        partner: "Bryce",
        body: "we chose referral — the $12,500 deposit stands",
        createdAt: "2026-07-25T00:00:00Z",
      },
      { partner: "Old", body: "ancient news", createdAt: "2026-06-01T00:00:00Z" },
    ],
    filed: [
      { account: "Advocate Pay", at: "2026-07-24T00:00:00Z" },
      { account: "Advocate Pay", at: "2026-07-25T00:00:00Z" },
      { account: "Advocate Pay", at: "2026-06-01T00:00:00Z" },
    ],
    openAsks: [{ text: "need the Canada quote", sinceIso: "2026-07-20T00:00:00Z" }],
    staleBriefRows: ["you owe Bryce: the one-pager"],
    deadlines: [
      { account: "Simploy", phrase: "leadership review", dateIso: "2026-08-06" },
      { account: "Advocate Pay", phrase: "go-live", dateIso: "2026-09-01" }, // >14d out
    ],
    upcoming: [{ label: "follow up — XCEL", at: "2026-07-29T15:00:00Z" }],
  };

  test("all five sections, windowed correctly", () => {
    const { sections } = weeklyBrief(base);
    const titles = sections.map((s) => s.title);
    assert.deepEqual(titles, [
      "Moved",
      "Heard",
      "Sent / Filed",
      "Blocked / Owed",
      "Next week",
    ]);
    const by = (t: string) => sections.find((s) => s.title === t)!.bullets;
    assert.equal(by("Moved").length, 1); // only the 7/24 transition, not 6/1
    assert.match(by("Moved")[0], /Advocate Pay → Contract/);
    assert.equal(by("Heard").length, 1); // old note windowed out
    assert.ok(!by("Heard")[0].includes("$12,500")); // money redacted
    assert.match(by("Sent / Filed")[0], /Advocate Pay — 2 touches/);
    assert.equal(by("Blocked / Owed").length, 2);
    assert.equal(by("Next week").length, 2); // 8/6 deadline + 7/29 follow-up; 9/1 out
    assert.ok(!by("Next week").some((b) => b.includes("go-live")));
  });

  test("briefText is plain text, no markdown syntax", () => {
    const txt = briefText(weeklyBrief(base).sections);
    assert.match(txt, /^Moved:\n• /);
    assert.ok(!/[#*_`]/.test(txt.replace(/\*/g, "*")) || !txt.includes("#"));
    assert.ok(txt.includes("Next week:"));
  });

  test("empty inputs → no sections", () => {
    const { sections } = weeklyBrief({
      now: NOW,
      cards: [],
      partnerNotes: [],
      filed: [],
      openAsks: [],
      staleBriefRows: [],
      deadlines: [],
      upcoming: [],
    });
    assert.deepEqual(sections, []);
  });
});

describe("liveLookInto", () => {
  test("research gap, stale contradiction, aged ask — sorted high first", () => {
    const items = liveLookInto({
      now: NOW,
      cards: [{ id: "c1", name: "Acme", states: { needs_analysis: "active" } }],
      intelByCard: {
        c1: intel({
          countries: [{ value: "mx", src: "note", at: "2026-07-01T00:00:00Z" }],
        }),
      },
      suggByCard: {
        c1: [
          {
            node: "demo",
            itemIdx: 3,
            reason: "demo evidence · note 7/7",
            srcAt: "2026-07-07T00:00:00Z", // 20 days stale
          },
        ],
      },
      captureNotes: [
        {
          id: "n1",
          kind: "ask",
          body: "need pricing explainer",
          createdAt: "2026-07-20T00:00:00Z",
        },
        {
          id: "n2",
          kind: "voice",
          body: "not an ask",
          createdAt: "2026-07-01T00:00:00Z",
        },
        { id: "n3", kind: "gap", body: "too fresh", createdAt: "2026-07-27T00:00:00Z" },
      ],
    });
    const ids = items.map((i) => i.id);
    assert.ok(ids.includes("li-live:research:c1"));
    assert.ok(ids.includes("li-live:contradiction:c1"));
    assert.ok(ids.includes("li-live:ask:n1"));
    assert.ok(!ids.includes("li-live:ask:n2")); // voice never surfaces
    assert.ok(!ids.includes("li-live:ask:n3")); // younger than 2 days
    // high before medium
    const weights = items.map((i) => i.weight);
    assert.deepEqual(weights.slice().sort(), [...weights].sort());
    assert.equal(weights[0], "high");
    const research = items.find((i) => i.id === "li-live:research:c1")!;
    assert.match(research.prompt ?? "", /PrismHR Global deal/);
    assert.match(research.title, /Mexico/);
  });

  test("idle cards and demo-done cards stay quiet on research", () => {
    const items = liveLookInto({
      now: NOW,
      cards: [
        { id: "c1", name: "Idle", states: {} },
        { id: "c2", name: "Demoed", states: { demo: "done", proposal: "active" } },
      ],
      intelByCard: {
        c1: intel({
          countries: [{ value: "mx", src: "n", at: "2026-07-01T00:00:00Z" }],
        }),
        c2: intel({
          countries: [{ value: "mx", src: "n", at: "2026-07-01T00:00:00Z" }],
        }),
      },
      suggByCard: {},
      captureNotes: [],
    });
    assert.ok(!items.some((i) => i.kind === "research"));
  });
});
