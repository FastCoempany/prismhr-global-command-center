// The verification of the verifiers (§8.3): five deliberately corrupt gem
// candidates go into the mechanical gauntlet and ALL FIVE must die — a
// harness that cannot catch planted faults fails the build. Plus the
// coverage invariant's arithmetic and the mortality flag.

import { test } from "node:test";
import assert from "node:assert/strict";
import { coverageGaps, mechanicalKill, mortalityFlag } from "../src/lib/activity/harness";
import type { GemCandidate } from "../src/lib/activity/distill";

const rows = new Map([
  [
    "row-human",
    {
      d: "2026-08-19",
      lane: "human",
      fl: "",
      s: "Re: Partner Introduction ~ Zayzoon",
      c: "Natalie Borland wrote back",
      a: "Anika Steenstra",
    },
  ],
  [
    "row-older",
    {
      d: "2026-08-12",
      lane: "human",
      fl: "",
      s: "Partner Introduction ~ Zayzoon",
      c: "",
      a: "Anika Steenstra",
    },
  ],
  [
    "row-blast",
    {
      d: "2026-08-13",
      lane: "intent",
      fl: "",
      s: "Opened A Smarter Way to Benchmark Pay",
      c: "",
      a: "Colleague One",
    },
  ],
  [
    "row-receipt",
    {
      d: "2026-08-18",
      lane: "csm",
      fl: "r",
      s: "[Seismic] [Session] Rachael Brown viewed the deck",
      c: "",
      a: "Lesha Cyphers",
    },
  ],
]);

const colleagues = new Set(["Anika Steenstra", "Lesha Cyphers", "Jordan Cross"]);
const accountPeople = new Set(["Natalie Borland", "William Ackman", "Jordan Cross"]);

const clean: GemCandidate = {
  who: ["Natalie Borland"],
  whoKind: "account",
  what: "Zayzoon partner thread, active replies",
  whenDay: "2026-08-19",
  signal: "actively partnering while the proposal sits",
  term: "PARTNER MOTION",
  act: "Reach Natalie today.",
  reason: "Their partner thread is live.",
  citedRowKeys: ["row-human", "row-older"],
};

test("a clean candidate survives the gauntlet", () => {
  assert.equal(mechanicalKill(clean, rows, colleagues, accountPeople), "");
});

test("⚔ seeded fault 1: a date not the newest cited dies", () => {
  const kill = mechanicalKill(
    { ...clean, whenDay: "2026-08-12" },
    rows,
    colleagues,
    accountPeople,
  );
  assert.match(kill, /whenDay/);
});

test("⚔ seeded fault 2: a machinery citation dies", () => {
  const kill = mechanicalKill(
    { ...clean, citedRowKeys: ["row-human", "row-blast"], whenDay: "2026-08-19" },
    rows,
    colleagues,
    accountPeople,
  );
  assert.equal(kill, "cites machinery");
});

test("⚔ seeded fault 3: an unresolved actor dies", () => {
  const kill = mechanicalKill(
    { ...clean, who: ["Jordan Cross"] },
    rows,
    colleagues,
    accountPeople,
  );
  assert.match(kill, /unresolved/);
});

test("⚔ seeded fault 4: a hedged act dies", () => {
  const kill = mechanicalKill(
    { ...clean, act: "It may be worth reaching Natalie." },
    rows,
    colleagues,
    accountPeople,
  );
  assert.match(kill, /^act:/);
});

test("⚔ seeded fault 5: a citation not in staging dies", () => {
  const kill = mechanicalKill(
    { ...clean, citedRowKeys: ["row-human", "row-imaginary"] },
    rows,
    colleagues,
    accountPeople,
  );
  assert.equal(kill, "a cited row is not in staging");
});

test("standing only on receipts dies; receipts beside a human row survive", () => {
  assert.equal(
    mechanicalKill(
      {
        ...clean,
        citedRowKeys: ["row-receipt"],
        whenDay: "2026-08-18",
        who: ["Natalie Borland"],
      },
      rows,
      colleagues,
      accountPeople,
    ),
    "stands only on receipts",
  );
  assert.equal(
    mechanicalKill(
      { ...clean, citedRowKeys: ["row-human", "row-receipt"], whenDay: "2026-08-19" },
      rows,
      colleagues,
      accountPeople,
    ),
    "",
  );
});

test("a name found nowhere dies; a name only in the cited text survives", () => {
  assert.match(
    mechanicalKill(
      { ...clean, who: ["Totally Unknown"] },
      rows,
      colleagues,
      accountPeople,
    ),
    /appears nowhere/,
  );
  // "Natalie Borland" appears in row-human's comment even if she were absent
  // from the roster — citations ground the who.
  assert.equal(
    mechanicalKill({ ...clean, who: ["Natalie Borland"] }, rows, new Set(), new Set()),
    "",
  );
});

// ── ⚔ 1 · the coverage invariant's arithmetic (§3.7) ────────────────────────

test("coverage: gaps are accounts with human rows, no coverage, no prior rollup", () => {
  const accounts = [
    { id: "a", name: "Alpha", humanRows: 5 },
    { id: "b", name: "Bravo", humanRows: 3 },
    { id: "c", name: "Charlie", humanRows: 0 }, // blasts only — a verdict is not owed
    { id: "d", name: "Delta", humanRows: 2 },
  ];
  const covered = { a: "gems" };
  const gaps = coverageGaps(accounts, covered, (id) => id === "d");
  assert.deepEqual(gaps, ["Bravo"]);
  // 100% only when every owed account is covered one way or the other.
  assert.deepEqual(
    coverageGaps(accounts, { a: "gems", b: "verdict" }, (id) => id === "d"),
    [],
  );
});

test("a hold over an empty store is a coverage gap, not coverage", () => {
  // 2026-08-31, live: a take-back cleared every gem, the re-drop ran with a
  // dead key, and all 124 accounts came back "held". The run reported
  // "Coverage: 100% — every active account holds a gem or an honest verdict"
  // over a store with zero gems in it.
  const accounts = [
    { id: "a", name: "Alpha", humanRows: 5 },
    { id: "b", name: "Bravo", humanRows: 3 },
  ];
  const allHeld = { a: "held", b: "held" };
  // Nothing to fall back on: both are gaps and the run must fail coverage.
  assert.deepEqual(
    coverageGaps(accounts, allHeld, () => false, () => false),
    ["Alpha", "Bravo"],
  );
  // A hold that points at a real gem IS coverage — that is what a hold means.
  assert.deepEqual(
    coverageGaps(accounts, allHeld, () => false, () => true),
    [],
  );
  // One of each: only the empty one is a gap.
  assert.deepEqual(
    coverageGaps(accounts, allHeld, () => false, (id) => id === "a"),
    ["Bravo"],
  );
  // A prior rollup never rescues a hold — a rollup is arithmetic, not a gem.
  assert.deepEqual(
    coverageGaps(accounts, allHeld, () => true, () => false),
    ["Alpha", "Bravo"],
  );
  // Judged accounts are unaffected by the gem store either way.
  assert.deepEqual(
    coverageGaps(accounts, { a: "gems", b: "verdict" }, () => false, () => false),
    [],
  );
});

test("the mortality flag trips past half", () => {
  assert.equal(mortalityFlag(10, 6), true);
  assert.equal(mortalityFlag(10, 5), false);
  assert.equal(mortalityFlag(0, 0), false);
});
