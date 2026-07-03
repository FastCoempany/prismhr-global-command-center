import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DASH_NODES, type DashNodeKey, type NodeState } from "@/lib/dashboard/stages";
import type { DashCardRow } from "@/lib/dashboard/data";
import {
  accountIntel,
  debtsFromCards,
  funnelOf,
  isStrongSignal,
  narrative,
  partnerAngle,
  signals,
  type AccountIntel,
} from "@/lib/today/build";
import { DEMAND_GATE } from "@/lib/book/research";

// --- factories ---------------------------------------------------------------

function intel(partial: Partial<AccountIntel>): AccountIntel {
  return {
    id: partial.id ?? "ID",
    name: partial.name ?? "Acme",
    csm: partial.csm ?? "Jamie Doe",
    industry: partial.industry ?? "PEO/ASO",
    funnel: partial.funnel ?? "peo",
    score: partial.score ?? 50,
    tier: partial.tier ?? "medium",
    demand: partial.demand ?? null,
    confidence: partial.confidence ?? "low",
    researched: partial.researched ?? false,
    play: partial.play ?? null,
    competitors: partial.competitors ?? [],
    countries: partial.countries ?? [],
    summary: partial.summary ?? "",
  };
}

function emptyByNode<T>(make: () => T): Record<DashNodeKey, T> {
  const out = {} as Record<DashNodeKey, T>;
  for (const n of DASH_NODES) out[n.key] = make();
  return out;
}

function card(partial: {
  id: string;
  name?: string;
  archived?: boolean;
  states?: Partial<Record<DashNodeKey, NodeState>>;
  checks?: Partial<Record<DashNodeKey, boolean[]>>;
  activated?: Partial<Record<DashNodeKey, string>>;
}): DashCardRow {
  const states = emptyByNode<NodeState>(() => "todo");
  const checks = emptyByNode<boolean[]>(() => []);
  const activated = emptyByNode<string>(() => "");
  Object.assign(states, partial.states ?? {});
  Object.assign(checks, partial.checks ?? {});
  Object.assign(activated, partial.activated ?? {});
  return {
    id: partial.id,
    name: partial.name ?? partial.id,
    subtitle: null,
    position: 0,
    archived: partial.archived ?? false,
    states,
    notes: emptyByNode<string>(() => ""),
    checks,
    checkNotes: emptyByNode<Record<number, string>>(() => ({})),
    activated,
  };
}

const DAY = 86_400_000;

// --- funnel ------------------------------------------------------------------

describe("funnelOf", () => {
  test("routes Eric Ronci's accounts through the HCM funnel", () => {
    assert.equal(funnelOf("Eric Ronci", "PEO/ASO"), "hcm");
  });
  test("routes HRaaS/HRO models through the HCM funnel regardless of partner", () => {
    assert.equal(funnelOf("Jamie Doe", "HRaaS"), "hcm");
    assert.equal(funnelOf("Jamie Doe", "HRO Services"), "hcm");
  });
  test("routes ordinary CSM-owned PEOs through the PEO channel", () => {
    assert.equal(funnelOf("Jamie Doe", "PEO/ASO"), "peo");
  });
  test("does not mis-tag industries that merely contain the letters h-r-o", () => {
    // Word-boundary guard: none of these should read as HCM.
    for (const ind of ["Petrochemical", "Hydro Services", "Throughput Corp", "Chrome Retail"]) {
      assert.equal(funnelOf("Jamie Doe", ind), "peo", `${ind} should be PEO`);
    }
  });
});

// --- strong vs emerging signals ---------------------------------------------

describe("isStrongSignal", () => {
  test("requires both high-enough demand and non-low confidence", () => {
    assert.equal(isStrongSignal({ demand: 58, confidence: "high" }), true);
    assert.equal(isStrongSignal({ demand: 45, confidence: "medium" }), true);
    assert.equal(isStrongSignal({ demand: 39, confidence: "high" }), false); // demand too low
    assert.equal(isStrongSignal({ demand: 55, confidence: "low" }), false); // confidence too low
    assert.equal(isStrongSignal({ demand: null, confidence: "high" }), false);
  });
});

// --- signals -----------------------------------------------------------------

describe("signals", () => {
  test("surfaces only accounts at or above the demand gate, highest first", () => {
    const rows = [
      intel({ id: "a", demand: DEMAND_GATE - 1, researched: true }),
      intel({ id: "b", demand: DEMAND_GATE + 20, researched: true }),
      intel({ id: "c", demand: DEMAND_GATE, researched: true }),
    ];
    const out = signals(rows);
    assert.deepEqual(
      out.map((r) => r.id),
      ["b", "c"],
    );
  });

  test("falls back to researched accounts when nothing clears the gate", () => {
    const rows = [
      intel({ id: "a", demand: 10, researched: true }),
      intel({ id: "b", demand: null, researched: false }),
    ];
    const out = signals(rows);
    assert.deepEqual(
      out.map((r) => r.id),
      ["a"],
    );
  });
});

// --- debts -------------------------------------------------------------------

describe("debtsFromCards", () => {
  const now = 100 * DAY;

  test("emits unchecked items only for in-flight (active) nodes", () => {
    const demoLen = DASH_NODES.find((n) => n.key === "demo")!.checklist.length;
    const c = card({
      id: "c1",
      states: { demo: "active", interested: "done", discovery: "todo" },
      checks: { demo: [true, ...Array(demoLen - 1).fill(false)] },
      activated: { demo: new Date(now - 3 * DAY).toISOString() },
    });
    const debts = debtsFromCards([c], {}, now);
    // demo has demoLen items, one checked → demoLen-1 debts; done/todo nodes emit none.
    assert.equal(debts.length, demoLen - 1);
    assert.ok(debts.every((d) => d.nodeKey === "demo"));
    assert.equal(debts[0].ageDays, 3);
  });

  test("skips archived cards", () => {
    const c = card({
      id: "c1",
      archived: true,
      states: { demo: "active" },
      activated: { demo: new Date(now - 3 * DAY).toISOString() },
    });
    assert.equal(debtsFromCards([c], {}, now).length, 0);
  });

  test("sorts oldest debts first; unstamped sort last", () => {
    const young = card({
      id: "young",
      states: { demo: "active" },
      activated: { demo: new Date(now - 1 * DAY).toISOString() },
    });
    const old = card({
      id: "old",
      states: { demo: "active" },
      activated: { demo: new Date(now - 9 * DAY).toISOString() },
    });
    const unstamped = card({ id: "unstamped", states: { demo: "active" } });
    const debts = debtsFromCards([young, old, unstamped], {}, now);
    assert.equal(debts[0].cardId, "old");
    assert.equal(debts[debts.length - 1].ageDays, null);
  });

  test("uses custom node labels when provided", () => {
    const c = card({
      id: "c1",
      states: { demo: "active" },
      activated: { demo: new Date(now).toISOString() },
    });
    const debts = debtsFromCards([c], { demo: "Show & tell" }, now);
    assert.ok(debts.every((d) => d.nodeLabel === "Show & tell"));
  });
});

// --- partner angle -----------------------------------------------------------

describe("partnerAngle", () => {
  test("names the incumbent competitor on a displacement play", () => {
    const line = partnerAngle(
      intel({ name: "Acme", csm: "Jamie", play: "displacement", competitors: ["Deel"] }),
    );
    assert.match(line, /Deel/);
    assert.match(line, /renewal/i);
  });
  test("frames greenfield around entities and contractors", () => {
    const line = partnerAngle(intel({ play: "greenfield" }));
    assert.match(line, /entit/i);
    assert.match(line, /contractor/i);
  });
  test("falls back to a discovery prompt with no play", () => {
    const line = partnerAngle(intel({ csm: "Jamie", name: "Acme", play: null }));
    assert.match(line, /footprint/i);
  });
});

// --- narrative ---------------------------------------------------------------

describe("narrative", () => {
  test("counts research coverage, demand, plays, and funnel honestly", () => {
    const rows = [
      intel({ researched: true, demand: DEMAND_GATE + 5, play: "displacement", tier: "high", funnel: "hcm" }),
      intel({ researched: true, demand: DEMAND_GATE, play: "greenfield", tier: "medium" }),
      intel({ researched: true, demand: DEMAND_GATE - 5, tier: "low" }),
      intel({ researched: false }),
    ];
    const n = narrative(rows);
    assert.equal(n.total, 4);
    assert.equal(n.researched, 3);
    assert.equal(n.realDemand, 2);
    assert.equal(n.displacement, 1);
    assert.equal(n.greenfield, 1);
    assert.equal(n.highFit, 1);
    assert.equal(n.hcmFunnel, 1);
  });

  test("splits real demand into strong vs emerging without double-counting", () => {
    const rows = [
      intel({ researched: true, demand: 58, confidence: "high" }), // strong
      intel({ researched: true, demand: 45, confidence: "medium" }), // strong
      intel({ researched: true, demand: 33, confidence: "low" }), // emerging (low conf)
      intel({ researched: true, demand: 35, confidence: "medium" }), // emerging (< 40)
      intel({ researched: true, demand: 20, confidence: "high" }), // below gate — not counted
    ];
    const n = narrative(rows);
    assert.equal(n.realDemand, 4);
    assert.equal(n.strongDemand, 2);
    assert.equal(n.emerging, 2);
    assert.equal(n.strongDemand + n.emerging, n.realDemand);
  });

  test("aggregates and ranks countries across the base", () => {
    const rows = [
      intel({ countries: ["Canada", "Mexico"] }),
      intel({ countries: ["Canada"] }),
    ];
    const n = narrative(rows);
    assert.equal(n.topCountries[0].name, "Canada");
    assert.equal(n.topCountries[0].count, 2);
  });
});

// --- real data smoke ---------------------------------------------------------

describe("accountIntel (real book)", () => {
  test("scores every account and returns them highest-fit first", () => {
    const rows = accountIntel();
    assert.ok(rows.length > 100);
    for (let i = 1; i < rows.length; i++) {
      assert.ok(rows[i - 1].score >= rows[i].score);
    }
  });
});
