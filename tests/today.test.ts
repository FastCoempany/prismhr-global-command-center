import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DASH_NODES, type DashNodeKey, type NodeState } from "@/lib/dashboard/stages";
import type { DashCardRow } from "@/lib/dashboard/data";
import {
  accountIntel,
  applyValidations,
  cardNextStep,
  commitmentsFromCards,
  dayStamp,
  firstNameOf,
  funnelOf,
  kickoffDoneKey,
  morningDoneKey,
  weekStamp,
  isParked,
  isStrongSignal,
  isTrusted,
  isWeekKickoff,
  movedThisWeek,
  narrative,
  partitionSignals,
  partnerAngle,
  partnerKickoff,
  partnerMessage,
  partnerWeekMessage,
  signals,
  stateOfPlay,
  type AccountIntel,
  type Snooze,
  type Validation,
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
    desk: partial.desk ?? 50,
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
    dealSize: "",
    stakeholders: [],
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

// --- commitments -------------------------------------------------------------------

describe("commitmentsFromCards", () => {
  const now = 100 * DAY;

  test("emits unchecked items only for in-flight (active) nodes", () => {
    const demoLen = DASH_NODES.find((n) => n.key === "demo")!.checklist.length;
    const c = card({
      id: "c1",
      states: { demo: "active", interested: "done", discovery: "todo" },
      checks: { demo: [true, ...Array(demoLen - 1).fill(false)] },
      activated: { demo: new Date(now - 3 * DAY).toISOString() },
    });
    const commitments = commitmentsFromCards([c], {}, now);
    // demo has demoLen items, one checked → demoLen-1 commitments; done/todo nodes emit none.
    assert.equal(commitments.length, demoLen - 1);
    assert.ok(commitments.every((d) => d.nodeKey === "demo"));
    assert.equal(commitments[0].ageDays, 3);
  });

  test("skips archived cards", () => {
    const c = card({
      id: "c1",
      archived: true,
      states: { demo: "active" },
      activated: { demo: new Date(now - 3 * DAY).toISOString() },
    });
    assert.equal(commitmentsFromCards([c], {}, now).length, 0);
  });

  test("sorts oldest commitments first; unstamped sort last", () => {
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
    const commitments = commitmentsFromCards([young, old, unstamped], {}, now);
    assert.equal(commitments[0].cardId, "old");
    assert.equal(commitments[commitments.length - 1].ageDays, null);
  });

  test("uses custom node labels when provided", () => {
    const c = card({
      id: "c1",
      states: { demo: "active" },
      activated: { demo: new Date(now).toISOString() },
    });
    const commitments = commitmentsFromCards([c], { demo: "Show & tell" }, now);
    assert.ok(commitments.every((d) => d.nodeLabel === "Show & tell"));
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

// --- validation overlay ------------------------------------------------------

describe("applyValidations", () => {
  test("confirmed/flagged annotate without changing the score", () => {
    const rows = [intel({ id: "a", demand: 55, score: 60 })];
    const v = new Map<string, Validation>([["a", { status: "flagged", note: "wrong" }]]);
    const out = applyValidations(rows, v);
    assert.equal(out[0].score, 60);
    assert.equal(out[0].validation?.status, "flagged");
    assert.equal(isTrusted(out[0]), false);
  });

  test("adjusted overrides demand and reflows composite + play, then re-sorts", () => {
    const rows = [
      intel({ id: "a", desk: 50, demand: 20, score: 32, play: null, competitors: [], confidence: "high" }),
      intel({ id: "b", desk: 50, demand: 50, score: 50 }),
    ];
    const v = new Map<string, Validation>([["a", { status: "adjusted", adjustedDemand: 90 }]]);
    const out = applyValidations(rows, v);
    // a: high-conf, so demandAdj = 90; composite = round(0.4*50 + 0.6*90) = 74 → now first
    assert.equal(out[0].id, "a");
    assert.equal(out[0].demand, 90);
    assert.equal(out[0].score, 74);
    assert.equal(out[0].play, "greenfield"); // re-gated above 30, no competitor
  });

  test("adjusting below the gate drops the play", () => {
    const rows = [intel({ id: "a", desk: 40, demand: 60, play: "greenfield" })];
    const v = new Map<string, Validation>([["a", { status: "adjusted", adjustedDemand: 10 }]]);
    const out = applyValidations(rows, v);
    assert.equal(out[0].play, null);
  });

  test("isTrusted excludes flagged from strong-demand narrative", () => {
    const rows = applyValidations(
      [
        intel({ researched: true, demand: 58, confidence: "high" }),
        intel({ id: "f", researched: true, demand: 58, confidence: "high" }),
      ],
      new Map([["f", { status: "flagged" }]]),
    );
    assert.equal(narrative(rows).strongDemand, 1);
  });
});

// --- snooze / parking --------------------------------------------------------

describe("partitionSignals & isParked", () => {
  const now = 100 * 86_400_000;
  test("indefinite park (null until) stays parked", () => {
    assert.equal(isParked({ reason: "x", snoozedUntil: null }, now), true);
  });
  test("future until parks; past until resurfaces", () => {
    assert.equal(isParked({ reason: "x", snoozedUntil: new Date(now + 86_400_000).toISOString() }, now), true);
    assert.equal(isParked({ reason: "x", snoozedUntil: new Date(now - 86_400_000).toISOString() }, now), false);
  });
  test("splits active from parked signals", () => {
    const rows = [intel({ id: "a" }), intel({ id: "b" }), intel({ id: "c" })];
    const snoozes = new Map<string, Snooze>([
      ["b", { reason: "later", snoozedUntil: null }],
      ["c", { reason: "expired", snoozedUntil: new Date(now - 86_400_000).toISOString() }], // resurfaced
    ]);
    const { active, parked } = partitionSignals(rows, snoozes, now);
    assert.deepEqual(active.map((a) => a.id).sort(), ["a", "c"]);
    assert.equal(parked.length, 1);
    assert.equal(parked[0].intel.id, "b");
  });
});

// --- momentum & state of play ------------------------------------------------

describe("movedThisWeek & stateOfPlay", () => {
  const now = 100 * 86_400_000;
  const DAY = 86_400_000;
  function card(id: string, opts: { active?: DashNodeKey[]; activated?: Partial<Record<DashNodeKey, string>>; archived?: boolean }): DashCardRow {
    const states = {} as Record<DashNodeKey, NodeState>;
    for (const n of DASH_NODES) states[n.key] = (opts.active ?? []).includes(n.key) ? "active" : "todo";
    const activated = {} as Record<DashNodeKey, string>;
    for (const n of DASH_NODES) activated[n.key] = opts.activated?.[n.key] ?? "";
    return {
      id, name: id, subtitle: null, position: 0, archived: opts.archived ?? false, states,
      notes: {} as Record<DashNodeKey, string>, checks: {} as Record<DashNodeKey, boolean[]>,
      checkNotes: {} as Record<DashNodeKey, Record<number, string>>, activated,
      dealSize: "", stakeholders: [],
    };
  }
  test("counts nodes activated within the last 7 days, skipping archived", () => {
    const c1 = card("c1", { activated: { discovery: new Date(now - 2 * DAY).toISOString(), demo: new Date(now - 20 * DAY).toISOString() } });
    const c2 = card("c2", { archived: true, activated: { demo: new Date(now - 1 * DAY).toISOString() } });
    assert.equal(movedThisWeek([c1, c2], now), 1);
  });
  test("state of play: open loops, past-window commitments, untriaged, moved", () => {
    const c = card("Acme", { active: ["demo"], activated: { demo: new Date(now - 6 * DAY).toISOString() } });
    const commitments = commitmentsFromCards([c], {}, now); // demo active 6d → all past window
    const activeSignals = [intel({ name: "New Co" }), intel({ name: "Acme" })];
    const sop = stateOfPlay({ cards: [c], commitments, activeSignals, onBoard: new Set(["Acme"]), now });
    assert.equal(sop.openLoops, 1);
    assert.ok(sop.commitmentsPastWindow > 0);
    assert.equal(sop.untriaged, 1); // "New Co" not on board; "Acme" is
    assert.equal(sop.moved, 1);
  });
});

// --- morning composition -----------------------------------------------------

describe("firstNameOf & partnerMessage", () => {
  test("first name is the leading token; empty falls back", () => {
    assert.equal(firstNameOf("Anika Steenstra"), "Anika");
    assert.equal(firstNameOf(""), "there");
  });
  test("displacement message names the incumbent and asks about renewal", () => {
    const m = partnerMessage(
      intel({ name: "Infiniti HR", csm: "Anika Steenstra", play: "displacement", competitors: ["Globalization Partners"] }),
    );
    assert.match(m, /Anika/);
    assert.match(m, /Globalization Partners/);
    assert.match(m, /renewal/i);
  });
  test("greenfield message asks about entities/contractors, no incumbent", () => {
    const m = partnerMessage(intel({ name: "MAU", csm: "Lesha Cyphers", play: "greenfield" }));
    assert.match(m, /entity|contractor/i);
    assert.doesNotMatch(m, /renewal/i);
  });
});

describe("cardNextStep", () => {
  const now = 100 * DAY;
  test("returns the first unchecked item on the first active node, with age", () => {
    const demoLen = DASH_NODES.find((n) => n.key === "demo")!.checklist.length;
    const c = card({
      id: "c1",
      name: "Nextep",
      states: { demo: "active" },
      checks: { demo: [true, ...Array(demoLen - 1).fill(false)] },
      activated: { demo: new Date(now - 4 * DAY).toISOString() },
    });
    const step = cardNextStep(c, {}, now);
    assert.ok(step);
    assert.equal(step!.cardName, "Nextep");
    assert.equal(step!.index, 1);
    assert.equal(step!.ageDays, 4);
  });
  test("returns null when nothing is active", () => {
    assert.equal(cardNextStep(card({ id: "c1" }), {}, now), null);
  });
});

// --- completion keys ---------------------------------------------------------

describe("dayStamp / weekStamp / done keys", () => {
  test("dayStamp is UTC yyyy-mm-dd", () => {
    assert.equal(dayStamp(Date.parse("2026-07-06T09:30:00Z")), "2026-07-06");
  });
  test("weekStamp is ISO year-week", () => {
    assert.equal(weekStamp(Date.parse("2026-07-06T12:00:00Z")), "2026-W28"); // Mon of ISO week 28
    assert.equal(weekStamp(Date.parse("2024-01-01T12:00:00Z")), "2024-W01");
  });
  test("morning key resets by day, kickoff key by week", () => {
    assert.equal(
      morningDoneKey("acct:X", Date.parse("2026-07-06T00:00:00Z")),
      "morning:2026-07-06:acct:X",
    );
    assert.equal(
      kickoffDoneKey("Anika", Date.parse("2026-07-06T00:00:00Z")),
      "kickoff:2026-W28:Anika",
    );
  });
});

// --- week kickoff ------------------------------------------------------------

describe("isWeekKickoff", () => {
  test("true on Sunday and Monday (UTC), false midweek", () => {
    assert.equal(isWeekKickoff(Date.parse("2024-01-01T12:00:00Z")), true); // Monday
    assert.equal(isWeekKickoff(Date.parse("2023-12-31T12:00:00Z")), true); // Sunday
    assert.equal(isWeekKickoff(Date.parse("2024-01-03T12:00:00Z")), false); // Wednesday
  });
});

describe("partnerKickoff & partnerWeekMessage", () => {
  test("includes every partner (except Unassigned); top-N by score, parked excluded", () => {
    const rows = [
      intel({ id: "a1", name: "Acme", csm: "Anika", play: "displacement", competitors: ["Deel"], score: 70 }),
      intel({ id: "a2", name: "Beta", csm: "Anika", play: null, score: 60 }),
      intel({ id: "a3", name: "Gamma", csm: "Anika", play: null, score: 40 }),
      intel({ id: "b1", name: "Delta", csm: "Cody", play: null, score: 55 }), // no play — Cody still included
      intel({ id: "u1", name: "Nobody", csm: "Unassigned", play: "greenfield", score: 99 }), // excluded
      intel({ id: "p1", name: "Parked", csm: "Anika", play: "greenfield", score: 90 }),
    ];
    const out = partnerKickoff(rows, new Set(["p1"]), 5);
    assert.equal(out.length, 2); // Anika and Cody; Unassigned dropped
    assert.equal(out[0].partner, "Anika"); // strongest lead account first
    // parked p1 excluded even though it has the top score
    assert.deepEqual(out[0].accounts.map((a) => a.id), ["a1", "a2", "a3"]);
    assert.equal(out[1].partner, "Cody");
    assert.deepEqual(out[1].accounts.map((a) => a.id), ["b1"]);
  });

  test("caps at N per partner", () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      intel({ id: `x${i}`, csm: "Anika", play: i === 0 ? "greenfield" : null, score: 100 - i }),
    );
    const out = partnerKickoff(rows, new Set(), 5);
    assert.equal(out[0].accounts.length, 5);
  });

  test("week message names accounts and asks for time", () => {
    const msg = partnerWeekMessage("Anika Steenstra", [
      intel({ name: "Infiniti HR", play: "displacement", competitors: ["Globalization Partners"] }),
      intel({ name: "MAU", play: "greenfield" }),
    ]);
    assert.match(msg, /Anika/);
    assert.match(msg, /Infiniti HR/);
    assert.match(msg, /MAU/);
    assert.match(msg, /15 minutes/);
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
