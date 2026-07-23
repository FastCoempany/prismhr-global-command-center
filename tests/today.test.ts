import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DASH_NODES, type DashNodeKey, type NodeState } from "@/lib/dashboard/stages";
import type { DashCardRow } from "@/lib/dashboard/data";
import {
  accountIntel,
  aleksLineGuidance,
  applyValidations,
  armPartnersGuidance,
  cardNextStep,
  commitmentsFromCards,
  dayStamp,
  firstNameOf,
  funnelOf,
  chipTone,
  partnerOutreachKey,
  morningDoneKey,
  weekStamp,
  isParked,
  isStrongSignal,
  isTrusted,
  isWeekKickoff,
  movedThisWeek,
  narrative,
  outreachGuidance,
  partitionSignals,
  partnerAngle,
  partnerKickoff,
  partnerMessage,
  partnerWeekMessage,
  roundupBullet,
  roundupBullets,
  roundupFrame,
  signals,
  stateOfPlay,
  triageGuidance,
  voiceOfBaseGuidance,
  type AccountIntel,
  type Snooze,
  type Validation,
} from "@/lib/today/build";
import {
  asFollowUpWhen,
  dayGroupLabel,
  daysUntilIso,
  followUpMessage,
  groupUpcomingByDay,
  isDue,
  nextCheckIn,
  outreachSubjectKey,
  partitionFollowUps,
  type Touch,
} from "@/lib/today/follow-ups";
import { isRealSfId, sfAccountUrl, sfLogCallUrl, sfNewOppUrl } from "@/lib/salesforce";
import { askToJoinMessage, EMPTY_ENGAGEMENT, engagementGates } from "@/lib/engagement";
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
    for (const ind of [
      "Petrochemical",
      "Hydro Services",
      "Throughput Corp",
      "Chrome Retail",
    ]) {
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
      intel({
        researched: true,
        demand: DEMAND_GATE + 5,
        play: "displacement",
        tier: "high",
        funnel: "hcm",
      }),
      intel({
        researched: true,
        demand: DEMAND_GATE,
        play: "greenfield",
        tier: "medium",
      }),
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
      intel({
        id: "a",
        desk: 50,
        demand: 20,
        score: 32,
        play: null,
        competitors: [],
        confidence: "high",
      }),
      intel({ id: "b", desk: 50, demand: 50, score: 50 }),
    ];
    const v = new Map<string, Validation>([
      ["a", { status: "adjusted", adjustedDemand: 90 }],
    ]);
    const out = applyValidations(rows, v);
    // a: high-conf, so demandAdj = 90; composite = round(0.4*50 + 0.6*90) = 74 → now first
    assert.equal(out[0].id, "a");
    assert.equal(out[0].demand, 90);
    assert.equal(out[0].score, 74);
    assert.equal(out[0].play, "greenfield"); // re-gated above 30, no competitor
  });

  test("adjusting below the gate drops the play", () => {
    const rows = [intel({ id: "a", desk: 40, demand: 60, play: "greenfield" })];
    const v = new Map<string, Validation>([
      ["a", { status: "adjusted", adjustedDemand: 10 }],
    ]);
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

// --- narrative → action guidance ---------------------------------------------

describe("aleksLineGuidance / armPartnersGuidance / voiceOfBaseGuidance", () => {
  const nar = narrative([
    intel({ researched: true, demand: 58, confidence: "high", play: "displacement" }),
    intel({ researched: true, demand: 45, confidence: "medium", play: "greenfield" }),
    intel({ researched: true, demand: 35, confidence: "medium" }), // emerging
    intel({ researched: false }),
  ]);

  test("every guidance has do + steps + editable say + caveat", () => {
    const gs = [
      aleksLineGuidance(nar, intel({ name: "Acme", play: "displacement" })),
      armPartnersGuidance(nar),
      voiceOfBaseGuidance(),
    ];
    for (const g of gs) {
      assert.ok(g.do.length > 0);
      assert.ok(g.how.length >= 3);
      assert.ok(g.say && g.say.length > 0);
      assert.ok(g.consider && g.consider.length > 0);
    }
  });

  test("aleks line names the account being converted and cites the honest numbers", () => {
    const g = aleksLineGuidance(
      nar,
      intel({ id: "z", name: "Zephyr Co", play: "greenfield" }),
    );
    assert.match(g.do, /Zephyr Co/);
    assert.match(g.say!, /Zephyr Co/);
    // strong (2) and emerging (1) both surfaced as bullets, not rounded away
    assert.match(g.say!, /Strong global-hiring signal: 2/);
    assert.match(g.say!, /Emerging[^\n]*: 1/);
    assert.match(g.say!, /1 displacement \/ 1 greenfield/);
  });

  test("aleks line degrades gracefully when nothing is teed up", () => {
    const g = aleksLineGuidance(nar, null);
    assert.doesNotMatch(g.do, /built around/);
    assert.match(g.say!, /working hardest/);
  });

  test("arm-partners reflects the count of live partner conversations (strong + emerging)", () => {
    const g = armPartnersGuidance(nar);
    assert.match(g.say!, /3 accounts across the base become real partner conversations/);
  });
});

// --- snooze / parking --------------------------------------------------------

describe("partitionSignals & isParked", () => {
  const now = 100 * 86_400_000;
  test("indefinite park (null until) stays parked", () => {
    assert.equal(isParked({ reason: "x", snoozedUntil: null }, now), true);
  });
  test("future until parks; past until resurfaces", () => {
    assert.equal(
      isParked(
        { reason: "x", snoozedUntil: new Date(now + 86_400_000).toISOString() },
        now,
      ),
      true,
    );
    assert.equal(
      isParked(
        { reason: "x", snoozedUntil: new Date(now - 86_400_000).toISOString() },
        now,
      ),
      false,
    );
  });
  test("splits active from parked signals", () => {
    const rows = [intel({ id: "a" }), intel({ id: "b" }), intel({ id: "c" })];
    const snoozes = new Map<string, Snooze>([
      ["b", { reason: "later", snoozedUntil: null }],
      [
        "c",
        { reason: "expired", snoozedUntil: new Date(now - 86_400_000).toISOString() },
      ], // resurfaced
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
  function card(
    id: string,
    opts: {
      active?: DashNodeKey[];
      activated?: Partial<Record<DashNodeKey, string>>;
      archived?: boolean;
    },
  ): DashCardRow {
    const states = {} as Record<DashNodeKey, NodeState>;
    for (const n of DASH_NODES)
      states[n.key] = (opts.active ?? []).includes(n.key) ? "active" : "todo";
    const activated = {} as Record<DashNodeKey, string>;
    for (const n of DASH_NODES) activated[n.key] = opts.activated?.[n.key] ?? "";
    return {
      id,
      name: id,
      subtitle: null,
      position: 0,
      archived: opts.archived ?? false,
      states,
      notes: {} as Record<DashNodeKey, string>,
      checks: {} as Record<DashNodeKey, boolean[]>,
      checkNotes: {} as Record<DashNodeKey, Record<number, string>>,
      activated,
      dealSize: "",
      stakeholders: [],
    };
  }
  test("counts nodes activated within the last 7 days, skipping archived", () => {
    const c1 = card("c1", {
      activated: {
        discovery: new Date(now - 2 * DAY).toISOString(),
        demo: new Date(now - 20 * DAY).toISOString(),
      },
    });
    const c2 = card("c2", {
      archived: true,
      activated: { demo: new Date(now - 1 * DAY).toISOString() },
    });
    assert.equal(movedThisWeek([c1, c2], now), 1);
  });
  test("state of play: open loops, past-window commitments, untriaged, moved", () => {
    const c = card("Acme", {
      active: ["demo"],
      activated: { demo: new Date(now - 6 * DAY).toISOString() },
    });
    const commitments = commitmentsFromCards([c], {}, now); // demo active 6d → all past window
    const activeSignals = [intel({ name: "New Co" }), intel({ name: "Acme" })];
    const sop = stateOfPlay({
      cards: [c],
      commitments,
      activeSignals,
      onBoard: new Set(["Acme"]),
      now,
    });
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
  test("displacement message frames consolidation, names the incumbent, asks about renewal", () => {
    const m = partnerMessage(
      intel({
        name: "Infiniti HR",
        csm: "Anika Steenstra",
        play: "displacement",
        competitors: ["Globalization Partners"],
      }),
    );
    assert.match(m, /Anika/);
    assert.match(m, /Globalization Partners/);
    assert.match(m, /renewal/i);
    // Consolidation onto the existing PrismHR platform — explicitly not a win-back.
    assert.match(m, /consolidation/i);
    assert.match(m, /already run their domestic PEO on PrismHR/);
    assert.match(m, /isn't a fresh sale or a win-back/);
  });
  test("greenfield message asks about entities/contractors, no incumbent", () => {
    const m = partnerMessage(
      intel({ name: "MAU", csm: "Lesha Cyphers", play: "greenfield" }),
    );
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
  test("morning key resets by day; partner-outreach key is stable per partner", () => {
    assert.equal(
      morningDoneKey("acct:X", Date.parse("2026-07-06T00:00:00Z")),
      "morning:2026-07-06:acct:X",
    );
    // No date component — the sent mark persists (standing tracker, not weekly).
    assert.equal(partnerOutreachKey("Anika"), "partner-outreach:Anika");
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
      intel({
        id: "a1",
        name: "Acme",
        csm: "Anika",
        play: "displacement",
        competitors: ["Deel"],
        score: 70,
      }),
      intel({ id: "a2", name: "Beta", csm: "Anika", play: null, score: 60 }),
      intel({ id: "a3", name: "Gamma", csm: "Anika", play: null, score: 40 }),
      intel({ id: "b1", name: "Delta", csm: "Whitney", play: null, score: 55 }), // no play — Whitney still included
      intel({
        id: "u1",
        name: "Nobody",
        csm: "Unassigned",
        play: "greenfield",
        score: 99,
      }), // excluded
      intel({ id: "p1", name: "Parked", csm: "Anika", play: "greenfield", score: 90 }),
    ];
    const out = partnerKickoff(rows, new Set(["p1"]), 5);
    assert.equal(out.length, 2); // Anika and Whitney; Unassigned dropped
    assert.equal(out[0].partner, "Anika"); // strongest lead account first
    // parked p1 excluded even though it has the top score
    assert.deepEqual(
      out[0].accounts.map((a) => a.id),
      ["a1", "a2", "a3"],
    );
    assert.equal(out[1].partner, "Whitney");
    assert.deepEqual(
      out[1].accounts.map((a) => a.id),
      ["b1"],
    );
  });

  test("caps at N per partner", () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      intel({
        id: `x${i}`,
        csm: "Anika",
        play: i === 0 ? "greenfield" : null,
        score: 100 - i,
      }),
    );
    const out = partnerKickoff(rows, new Set(), 5);
    assert.equal(out[0].accounts.length, 5);
  });

  test("chipTone: neutral until first interaction; then green <24h, yellow 24-48h, red 48h+", () => {
    const now = Date.parse("2026-07-09T12:00:00Z");
    const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();
    // The clock only starts once something official happens — no color before.
    assert.equal(chipTone(null, now), "none");
    assert.equal(chipTone("not-a-date", now), "none");
    assert.equal(chipTone(hoursAgo(1), now), "fresh");
    assert.equal(chipTone(hoursAgo(23.9), now), "fresh");
    assert.equal(chipTone(hoursAgo(24.1), now), "stale");
    assert.equal(chipTone(hoursAgo(47.9), now), "stale");
    assert.equal(chipTone(hoursAgo(48.1), now), "cold");
  });

  test("a roundup pin extends its partner's card past the top-N (never displaces)", () => {
    const PIN = "001F000000w389qIAA"; // My HR Pros (fka Southern Personnel) — Lesha's pin
    const rows = [
      ...Array.from({ length: 5 }, (_, i) =>
        intel({ id: `L${i}`, csm: "Lesha Cyphers", score: 49 - i }),
      ), // L0..L4 score 49..45
      intel({ id: PIN, csm: "Lesha Cyphers", score: 46 }),
    ];
    const out = partnerKickoff(rows, new Set(), 5);
    const ids = out[0].accounts.map((a) => a.id);
    // Top-5 on merit ALL stay; the pin rides along as a 6th slot.
    assert.equal(ids.length, 6);
    assert.ok(ids.includes(PIN), "pinned account is present");
    assert.ok(ids.includes("L4"), "no auto-pick is displaced by a pin");
    // Presented by score: L0 first, the 46-scoring pin near the bottom.
    assert.equal(ids[0], "L0");
  });

  test("a custom roundup bullet replaces the play template for a live thread", () => {
    const msg = partnerWeekMessage("Lesha Cyphers", [
      intel({
        id: "001F000000w38BOIAY",
        name: "Simploy",
        csm: "Lesha Cyphers",
        play: "greenfield",
        score: 77,
      }),
    ]);
    assert.match(msg, /• Simploy — Already in motion/);
    assert.match(msg, /8\/6/);
    assert.match(msg, /Chassie/);
    // The generic greenfield template must NOT appear for an overridden account.
    assert.ok(!msg.includes("clean introduction rather than a switch"));
  });

  test("roundup message lists accounts as descriptive bullets and asks for a read", () => {
    const msg = partnerWeekMessage("Anika Steenstra", [
      intel({
        name: "Infiniti HR",
        play: "displacement",
        competitors: ["Globalization Partners"],
      }),
      intel({ name: "MAU", play: "greenfield" }),
    ]);
    assert.match(msg, /Anika/);
    assert.match(msg, /yes \/ no \/ not yet/);
    // Each account is its own bullet line...
    assert.match(msg, /• Infiniti HR — /);
    assert.match(msg, /• MAU — /);
    // ...and the reason names the incumbent and hunts the renewal window.
    assert.match(msg, /Globalization Partners/);
    assert.match(msg, /renewal/);
    // Displacement is framed as bringing the global layer home to the platform
    // they already run, not a "win-back" (they've never left).
    assert.match(msg, /already run their domestic PEO on PrismHR/);
  });

  test("every template bullet is conversational and ends on a question", () => {
    // Enough same-play accounts to exercise every variant of each template.
    const gauges = Array.from({ length: 6 }, (_, i) =>
      intel({ id: `q-g${i}`, name: `G${i}`, play: null }),
    );
    const greens = Array.from({ length: 4 }, (_, i) =>
      intel({ id: `q-n${i}`, name: `N${i}`, play: "greenfield" }),
    );
    const disps = Array.from({ length: 4 }, (_, i) =>
      intel({
        id: `q-d${i}`,
        name: `D${i}`,
        play: "displacement",
        competitors: ["Deel"],
      }),
    );
    for (const b of roundupBullets([...gauges, ...greens, ...disps])) {
      assert.ok(b.trim().endsWith("?"), `bullet should end with a question: ${b}`);
    }
  });

  test("the message is exactly frame + bullets, so the client composer can rebuild it", () => {
    const accounts = [
      intel({ id: "a1", name: "Infiniti HR", play: "displacement" }),
      intel({ id: "a2", name: "MAU", play: "greenfield" }),
    ];
    const { opener, closer } = roundupFrame("Anika Steenstra");
    const stitched = `${opener}\n\n${accounts.map((a) => roundupBullet(a)).join("\n")}\n\n${closer}`;
    assert.equal(partnerWeekMessage("Anika Steenstra", accounts), stitched);
    // Dropping an account (the composer's uncheck) removes exactly its bullet.
    const without = partnerWeekMessage("Anika Steenstra", [accounts[0]]);
    assert.ok(!without.includes("• MAU"));
    assert.match(without, /• Infiniti HR — /);
  });

  test("same-play accounts never repeat a line within one roundup", () => {
    // Four no-signal accounts (the Kathryn/Whitney case) — every bullet body
    // must be unique, not the gauge template four times.
    const accounts = ["Alpha Co", "Beta Co", "Gamma Co", "Delta Co"].map((name, i) =>
      intel({ id: `g${i}`, name, play: null }),
    );
    const bullets = roundupBullets(accounts);
    const bodies = bullets.map((b) => b.split(" — ").slice(1).join(" — "));
    assert.equal(new Set(bodies).size, accounts.length);
    // Same for repeated displacement accounts (competitor interpolation aside).
    const disp = ["D1", "D2", "D3"].map((name, i) =>
      intel({ id: `d${i}`, name, play: "displacement", competitors: ["Deel"] }),
    );
    const dispBodies = roundupBullets(disp).map((b) =>
      b.split(" — ").slice(1).join(" — "),
    );
    assert.equal(new Set(dispBodies).size, disp.length);
    // Custom (hand-written) bullets don't consume a rotation slot: the two
    // template accounts around one still get variants 0 and 1.
    const withCustom = [
      intel({ id: "g10", name: "Plain One", play: null }),
      intel({ id: "001F000000w38BOIAY", name: "Simploy", play: "greenfield" }),
      intel({ id: "g11", name: "Plain Two", play: null }),
    ];
    const mixed = roundupBullets(withCustom);
    assert.match(mixed[1], /Already in motion/);
    assert.notEqual(
      mixed[0].split(" — ").slice(1).join(" — "),
      mixed[2].split(" — ").slice(1).join(" — "),
    );
  });
});

// --- follow-up cadence -------------------------------------------------------

function touch(p: Partial<Touch>): Touch {
  return {
    subjectKey: p.subjectKey ?? "k",
    kind: p.kind ?? "partner",
    label: p.label ?? "Anika Steenstra",
    detail: p.detail ?? "5 accounts teed up",
    message: p.message ?? "",
    contactedAt: p.contactedAt ?? new Date(0).toISOString(),
    followUpAt: p.followUpAt ?? new Date(0).toISOString(),
    intervalDays: p.intervalDays ?? 2,
    status: p.status ?? "awaiting",
    log: p.log ?? [],
  };
}

describe("follow-ups", () => {
  const now = 100 * DAY;

  test("isDue: awaiting + past follow-up is due; future isn't; replied never is", () => {
    assert.equal(
      isDue(touch({ followUpAt: new Date(now - DAY).toISOString() }), now),
      true,
    );
    assert.equal(
      isDue(touch({ followUpAt: new Date(now + DAY).toISOString() }), now),
      false,
    );
    assert.equal(
      isDue(
        touch({ status: "replied", followUpAt: new Date(now - DAY).toISOString() }),
        now,
      ),
      false,
    );
  });

  test("partition splits due / upcoming / replied; due is most-overdue first", () => {
    const a = touch({
      subjectKey: "a",
      followUpAt: new Date(now - 3 * DAY).toISOString(),
    });
    const b = touch({ subjectKey: "b", followUpAt: new Date(now - DAY).toISOString() });
    const c = touch({
      subjectKey: "c",
      followUpAt: new Date(now + 2 * DAY).toISOString(),
    });
    const d = touch({ subjectKey: "d", status: "replied" });
    const r = partitionFollowUps([b, a, c, d], now);
    assert.deepEqual(
      r.due.map((t) => t.subjectKey),
      ["a", "b"],
    );
    assert.deepEqual(
      r.upcoming.map((t) => t.subjectKey),
      ["c"],
    );
    assert.deepEqual(
      r.replied.map((t) => t.subjectKey),
      ["d"],
    );
  });

  test("nextCheckIn: later today = +4h, tomorrow = +24h, weekends never included", () => {
    const wed = Date.parse("2026-07-08T15:00:00Z"); // Wednesday
    assert.equal(nextCheckIn(wed, "today").toISOString(), "2026-07-08T19:00:00.000Z");
    assert.equal(nextCheckIn(wed, "tomorrow").toISOString(), "2026-07-09T15:00:00.000Z");
    // Friday + tomorrow would be Saturday → rolls to Monday, same time.
    const fri = Date.parse("2026-07-10T15:00:00Z"); // Friday
    assert.equal(nextCheckIn(fri, "tomorrow").toISOString(), "2026-07-13T15:00:00.000Z");
    // Friday evening + "later today" would cross into Saturday → Monday.
    const friNight = Date.parse("2026-07-10T22:00:00Z");
    assert.equal(
      nextCheckIn(friNight, "today").toISOString(),
      "2026-07-13T02:00:00.000Z",
    );
    // Saturday itself always lands on Monday.
    const sat = Date.parse("2026-07-11T10:00:00Z");
    assert.equal(nextCheckIn(sat, "today").getUTCDay(), 1);
    assert.equal(nextCheckIn(sat, "tomorrow").getUTCDay(), 1);
  });

  test("asFollowUpWhen only admits the two options, defaulting to tomorrow", () => {
    assert.equal(asFollowUpWhen("today"), "today");
    assert.equal(asFollowUpWhen("tomorrow"), "tomorrow");
    assert.equal(asFollowUpWhen("2"), "tomorrow");
    assert.equal(asFollowUpWhen(""), "tomorrow");
  });

  test("groupUpcomingByDay groups by due day with Today/Tomorrow labels, day order kept", () => {
    const mk = (key: string, at: string) => touch({ subjectKey: key, followUpAt: at });
    const base = Date.parse("2026-07-08T09:00:00Z"); // Wednesday
    const { upcoming } = partitionFollowUps(
      [
        mk("a", "2026-07-08T18:00:00Z"), // later today
        mk("b", "2026-07-09T10:00:00Z"), // tomorrow
        mk("c", "2026-07-09T15:00:00Z"), // tomorrow
        mk("d", "2026-07-13T09:00:00Z"), // Monday
      ],
      base,
    );
    const groups = groupUpcomingByDay(upcoming, base);
    assert.deepEqual(
      groups.map((g) => g.label),
      ["Today", "Tomorrow", "Monday · Jul 13"],
    );
    assert.deepEqual(
      groups[1].items.map((t) => t.subjectKey),
      ["b", "c"],
    );
    assert.equal(dayGroupLabel("2026-07-09T15:00:00Z", base), "Tomorrow");
  });

  test("daysUntilIso ceils, and past instants floor at zero (due, not negative)", () => {
    assert.equal(daysUntilIso(new Date(now + 2 * DAY).toISOString(), now), 2);
    assert.equal(daysUntilIso(new Date(now - DAY).toISOString(), now), 0);
  });

  test("partner nudge names the partner, the teed-up accounts, and how long it's been", () => {
    const m = followUpMessage(
      touch({
        label: "Anika Steenstra",
        detail: "5 accounts teed up",
        contactedAt: new Date(now - 2 * DAY).toISOString(),
      }),
      now,
    );
    assert.match(m, /Anika/);
    assert.match(m, /5 accounts teed up/);
    assert.match(m, /2 days ago/);
  });

  test("outreachSubjectKey is stable per account", () => {
    assert.equal(outreachSubjectKey("001X"), "outreach:001X");
  });

  test("custom follow-ups return your own words (not a partner nudge) and still bucket", () => {
    const c = touch({
      subjectKey: "manual:x",
      kind: "custom",
      label: "Prep pricing deck for Aleks",
      message: "",
      followUpAt: new Date(now - DAY).toISOString(),
    });
    // no partner-nudge phrasing — falls back to the label
    assert.equal(followUpMessage(c, now), "Prep pricing deck for Aleks");
    assert.doesNotMatch(followUpMessage(c, now), /circling back|following up on/);
    // still flows through the due/upcoming machinery
    assert.deepEqual(
      partitionFollowUps([c], now).due.map((t) => t.subjectKey),
      ["manual:x"],
    );
  });
});

// --- Salesforce checkpoint ---------------------------------------------------

describe("salesforce helpers", () => {
  test("isRealSfId accepts 15/18-char 001 account ids, rejects synthetic ones", () => {
    assert.equal(isRealSfId("001F000000w38OIIAY"), true); // 18-char
    assert.equal(isRealSfId("001F000000w38OI"), true); // 15-char
    assert.equal(isRealSfId("ADVOCATEPAY000001"), false); // synthetic
    assert.equal(isRealSfId("003F000000w38OIIAY"), false); // not an Account prefix
  });

  test("sfAccountUrl deep-links real ids via the default instance, honors env override, skips synthetic", () => {
    delete process.env.NEXT_PUBLIC_SF_BASE_URL;
    assert.equal(
      sfAccountUrl("001F000000w38OIIAY"),
      "https://prismhr.lightning.force.com/lightning/r/Account/001F000000w38OIIAY/view",
    );
    // Advocate Pay was added manually but has a real SF record — the override
    // map resolves its synthetic id to the live 18-digit id.
    assert.equal(
      sfAccountUrl("ADVOCATEPAY000001"),
      "https://prismhr.lightning.force.com/lightning/r/Account/001Pb00003esmqHIAQ/view",
    );
    assert.equal(sfAccountUrl("MERIDIANPAY000001"), null); // synthetic, no record → no link
    process.env.NEXT_PUBLIC_SF_BASE_URL = "https://other.my.salesforce.com/";
    assert.equal(
      sfAccountUrl("001F000000w38OIIAY"),
      "https://other.my.salesforce.com/lightning/r/Account/001F000000w38OIIAY/view",
    );
    delete process.env.NEXT_PUBLIC_SF_BASE_URL;
  });

  test("pre-filled write links: New Opportunity + log-a-call encode fields, skip synthetic", () => {
    delete process.env.NEXT_PUBLIC_SF_BASE_URL;
    assert.equal(
      sfNewOppUrl("001F000000w38OIIAY", { name: "Acme — Global Payroll" }),
      "https://prismhr.lightning.force.com/lightning/o/Opportunity/new?defaultFieldValues=" +
        "AccountId=001F000000w38OIIAY,Name=Acme%20%E2%80%94%20Global%20Payroll",
    );
    assert.equal(
      sfLogCallUrl("001F000000w38OIIAY", { subject: "Call — Acme, intro" }),
      "https://prismhr.lightning.force.com/lightning/o/Task/new?defaultFieldValues=" +
        "WhatId=001F000000w38OIIAY,Subject=Call%20%E2%80%94%20Acme%2C%20intro",
    );
    assert.equal(sfNewOppUrl("MERIDIANPAY000001", { name: "x" }), null);
    assert.equal(sfLogCallUrl("MERIDIANPAY000001", { subject: "x" }), null);
  });

  test("outreach + triage guidance require a Salesforce check step", () => {
    const a = intel({ name: "Acme", csm: "Anika", demand: 55, play: "greenfield" });
    assert.match(outreachGuidance(a).how.join(" "), /Salesforce/);
    assert.match(triageGuidance(a).how.join(" "), /Salesforce/);
  });
});

// --- CSM engagement ----------------------------------------------------------

describe("engagement", () => {
  test("gates count SF / notes / health independently; done only at 3/3", () => {
    assert.deepEqual(
      { ...engagementGates(EMPTY_ENGAGEMENT) },
      {
        sf: false,
        notes: false,
        health: false,
        count: 0,
        done: false,
      },
    );
    const g = engagementGates({
      ...EMPTY_ENGAGEMENT,
      sfChecked: true,
      csmNotes: "spoke Tuesday",
      clientHealth: "green",
    });
    assert.equal(g.count, 3);
    assert.equal(g.done, true);
    // whitespace-only notes don't count
    assert.equal(engagementGates({ ...EMPTY_ENGAGEMENT, csmNotes: "   " }).notes, false);
  });

  test("ask-to-join names the CSM + account and reflects the cadence when set", () => {
    const withCadence = askToJoinMessage("Anika Steenstra", "XcelHR", {
      ...EMPTY_ENGAGEMENT,
      cadence: "Biweekly",
      meetingDay: "Thursday",
    });
    assert.match(withCadence, /Anika/);
    assert.match(withCadence, /XcelHR/);
    assert.match(withCadence, /Biweekly \(Thursday\)/);
    // falls back gracefully with no cadence
    assert.match(
      askToJoinMessage("Lesha Cyphers", "MAU", EMPTY_ENGAGEMENT),
      /next check-in with MAU/,
    );
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
