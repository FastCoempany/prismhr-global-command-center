// Groundwork — the pure builders under test. Fixtures only, no DB: the rules
// engine, the signal decay, the nudge, the wire matching, the lint, and the
// one-builder guarantee between the readout and the file's To-Russ tab.

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { createElement } from "react";
import {
  buildQueue,
  currentBand,
  heatOf,
  ledgerExclusions,
  moveKey,
  QUEUE_CAP,
  researchInputs,
  type QueueItem,
} from "../src/lib/groundwork/day";
import { klaxonReading } from "../src/lib/groundwork/klaxon";
import { ownPassesFrom, researchBody } from "../src/lib/intel/deep-research";
import { stampSubtext } from "../src/lib/groundwork/stamp";
import {
  chipGems,
  collisionCite,
  csmPrepRows,
  prepKicker,
  spikeCites,
} from "../src/lib/groundwork/chips";
import { seatWorked, tapOfStamp, todaysStamps } from "../src/lib/groundwork/worked";
import { readAccount, type RecordNote } from "../src/lib/record/read";
import type { Gem } from "../src/lib/activity/stores";
import type { StagedRow } from "../src/lib/activity/types";
import type { SecondRecord } from "../src/lib/activity/read";
import type { Rollup } from "../src/lib/activity/rollup";
import {
  businessDaysBetween,
  intentFor,
  intentReadDue,
  parseIntent,
  ridingLaneDate,
} from "../src/lib/groundwork/signals";
import {
  proximityBand,
  proximityMark,
  proximityRank,
} from "../src/lib/groundwork/proximity";
import {
  matchAccounts,
  orderWire,
  parseWireBody,
  sweepDue,
  urlHash,
  wireNoteBody,
  type WireItem,
} from "../src/lib/groundwork/wire";
import { lint, paragraphFor, buildReadout } from "../src/lib/groundwork/readout";
import { buildFile } from "../src/lib/groundwork/file";
import { composeFor, WIDENING_LINE } from "../src/lib/groundwork/compose";
import {
  institutionCard,
  instNoteBody,
  parseInstBody,
} from "../src/lib/groundwork/institutions";
import { peos, type Peo } from "../src/lib/book";
import { compositeScore } from "../src/lib/book/scoring";
import { accountIntel } from "../src/lib/today/build";
import { EMPTY_INTEL, type DealIntel } from "../src/lib/intel/types";

const NOW = new Date("2026-07-30T15:00:00Z"); // 10:00a Chicago, a Thursday

const acct = (over: Partial<Peo>): Peo => ({
  id: "TEST0000000000001",
  name: "Test Partner",
  cloud: "TST",
  csm: "Lesha Cyphers",
  contactName: "Pat Example",
  contactEmail: "pat@example.com",
  size: 5000,
  sizeBucket: "Large (5,000 - 9,999)",
  industry: "PEO/ASO",
  city: "St. Louis",
  state: "MO",
  website: "example.com",
  lastActivity: "2026-07-01",
  fit: 95,
  fitTier: "high",
  ...over,
});

const intelWith = (over: Partial<DealIntel>): DealIntel => ({
  ...EMPTY_INTEL,
  ...over,
});

const salesnavNote = (body: string, iso: string) => ({
  body,
  source: "salesnav-ai",
  createdAt: iso,
});

describe("groundwork signals", () => {
  test("parses High intent with an activity count", () => {
    const s = parseIntent("Account has high buyer intent · 11 activities");
    assert.equal(s?.level, "high");
    assert.equal(s?.activities, 11);
  });

  test("a reading decays after 7 days and ranks as nothing", () => {
    const fresh = intentFor(
      [salesnavNote("High buyer intent", "2026-07-28T12:00:00Z")],
      NOW,
    );
    const stale = intentFor(
      [salesnavNote("High buyer intent", "2026-07-20T12:00:00Z")],
      NOW,
    );
    assert.equal(fresh?.level, "high");
    assert.equal(stale, null);
  });

  test("the nudge fires only when the newest read is over a business day old", () => {
    const freshMap = new Map([
      ["a", [salesnavNote("High intent", "2026-07-30T13:00:00Z")]],
    ]);
    const staleMap = new Map([
      ["a", [salesnavNote("High intent", "2026-07-28T12:00:00Z")]],
    ]);
    assert.equal(intentReadDue(freshMap, NOW), false);
    assert.equal(intentReadDue(staleMap, NOW), true);
    assert.equal(intentReadDue(new Map(), NOW), true);
  });

  test("weekend days don't count against the read", () => {
    // A Friday-evening read is still fresh Monday morning (the weekend never
    // counts); by Tuesday morning one full business day has passed and the
    // nudge may fire.
    const fri = "2026-07-24T22:00:00Z";
    assert.equal(businessDaysBetween(fri, new Date("2026-07-27T14:00:00Z")), 0);
    assert.equal(businessDaysBetween(fri, new Date("2026-07-28T14:00:00Z")), 1);
  });

  test("riding-lane finds a near CRM date in a pasted row and ignores far ones", () => {
    const near = ridingLaneDate(
      [salesnavNote("Amplify: ClearCo 7/31/2026", "2026-07-30T12:00:00Z")],
      NOW,
    );
    const far = ridingLaneDate(
      [salesnavNote("American Benefits - Comm Hub 10/21/2026", "2026-07-30T12:00:00Z")],
      NOW,
    );
    assert.equal(near, "2026-07-31");
    assert.equal(far, null);
  });
});

describe("groundwork proximity", () => {
  test("bands and the metro-only mark", () => {
    assert.equal(proximityBand({ city: "Northbrook", state: "IL" }), "metro");
    assert.equal(proximityBand({ city: "Indianapolis", state: "IN" }), "daydrive");
    assert.equal(proximityBand({ city: "St. Louis", state: "MO" }), "flight");
    assert.equal(proximityBand({ city: "Miami", state: "FL" }), "far");
    assert.equal(proximityMark({ city: "Westchester", state: "IL" }), "your metro");
    assert.equal(proximityMark({ city: "Indianapolis", state: "IN" }), null);
    assert.ok(
      proximityRank({ city: "Northbrook", state: "IL" }) <
        proximityRank({ city: "Miami", state: "FL" }),
    );
  });
});

describe("groundwork queue", () => {
  const base = {
    touches: [],
    contactCountById: () => 5,
    now: NOW,
  };

  test("a fresh wire hit outranks a fresh intent reading on the same book", () => {
    const a = acct({ id: "A0000000000000001", name: "Newsmaker" });
    const b = acct({ id: "B0000000000000001", name: "Warm" });
    const { items } = buildQueue({
      ...base,
      accounts: [a, b],
      intelById: new Map(),
      notesById: new Map([
        [
          b.id,
          [salesnavNote("high buyer intent · 11 activities", "2026-07-29T12:00:00Z")],
        ],
      ]),
      wireAtById: new Map([[a.id, "2026-07-29T12:00:00Z"]]),
    });
    assert.equal(items[0].name, "Newsmaker");
    assert.equal(items[0].ruleId, "wire-trigger");
    assert.equal(items[0].band, "now");
    const warm = items.find((i) => i.name === "Warm");
    assert.equal(warm?.ruleId, "intent-warm");
    assert.equal(warm?.band, "eleven");
  });

  test("strongest evidence per account wins — no account appears twice", () => {
    const a = acct({ id: "A0000000000000002", name: "Busy" });
    const { items } = buildQueue({
      ...base,
      accounts: [a],
      intelById: new Map(),
      notesById: new Map([
        [a.id, [salesnavNote("high buyer intent", "2026-07-29T12:00:00Z")]],
      ]),
      wireAtById: new Map([[a.id, "2026-07-29T12:00:00Z"]]),
    });
    assert.equal(items.filter((i) => i.accountId === a.id).length, 1);
    assert.equal(items[0].ruleId, "wire-trigger");
  });

  test("an excluded account never stages, whatever its evidence", () => {
    const a = acct({ id: "X0000000000000001", name: "Closing Deal" });
    const { items, all } = buildQueue({
      ...base,
      accounts: [a],
      intelById: new Map(),
      notesById: new Map(),
      wireAtById: new Map([[a.id, "2026-07-29T12:00:00Z"]]),
      excludedIds: new Set([a.id]),
    });
    assert.equal(items.length, 0);
    assert.equal(all.length, 0);
  });

  test("one rule holds at most two leading slots; the rest sink below other rules", () => {
    // Three real book ids with demand above the gate, each with its OWN stale
    // research pass; a fourth account carries a different, lower-weight rule.
    // Rewritten in pass 9 (G7): the research age is the newer of the account's
    // own pass and the sweep, so the day sits past the sweep's 90 days too;
    // on 7/30 the sweep (7/2) still held these accounts fresh.
    const s1 = acct({ id: "001F000000w38ItIAI", name: "Stale One", csm: "Unassigned" });
    const s2 = acct({ id: "001F000000w38OIIAY", name: "Stale Two", csm: "Unassigned" });
    const s3 = acct({ id: "001F000000w38BOIAY", name: "Stale Three", csm: "Unassigned" });
    const gap = acct({ id: "G0000000000000001", name: "Thin Book", csm: "Unassigned" });
    const { all } = buildQueue({
      ...base,
      now: new Date("2026-10-15T15:00:00Z"),
      contactCountById: (id: string) => (id === gap.id ? 1 : 5),
      accounts: [s1, s2, s3, gap],
      intelById: new Map(),
      notesById: new Map([
        [gap.id, [{ body: "note", source: "room", createdAt: "2026-10-14T12:00:00Z" }]],
      ]),
      researchAtById: new Map([
        [s1.id, "2026-04-01T12:00:00Z"],
        [s2.id, "2026-04-01T12:00:00Z"],
        [s3.id, "2026-04-01T12:00:00Z"],
      ]),
    });
    const rules = all.map((q) => q.ruleId);
    assert.deepEqual(rules.slice(0, 3), [
      "stale-above-gate",
      "stale-above-gate",
      "stakeholder-gap",
    ]);
    assert.equal(rules[3], "stale-above-gate");
  });

  test("a stale book-wide stamp collapses to one research-pass move", () => {
    const a = acct({ id: "001F000000w38ItIAI", name: "Big Demand", csm: "Unassigned" });
    const b = acct({ id: "001F000000w38OIIAY", name: "Also Demand", csm: "Unassigned" });
    // A quarter past the book sweep — research holds for 90 days before the
    // queue puts pressure out front. Both accounts carry a plain note so
    // neither fires a move of its own: a vehicle never collides (D22), so the
    // stamp only ever rides a free account.
    const plain = [{ body: "note", source: "room", createdAt: "2026-10-14T12:00:00Z" }];
    const { all } = buildQueue({
      ...base,
      now: new Date("2026-10-15T15:00:00Z"),
      accounts: [a, b],
      intelById: new Map(),
      notesById: new Map([
        [a.id, plain],
        [b.id, plain],
      ]),
    });
    const stale = all.filter((q) => q.ruleId === "stale-above-gate");
    assert.equal(stale.length, 1);
    assert.equal(stale[0].action, "Run the research pass.");
    assert.match(stale[0].reason, /^Book research \d+ days old\.$/);
    // The strongest demand carries it.
    assert.equal(stale[0].name, "Big Demand");
  });

  test("research inside the 90-day hold puts no pressure out front", () => {
    const a = acct({ id: "001F000000w38ItIAI", name: "Fresh Enough", csm: "Unassigned" });
    const { all } = buildQueue({
      ...base,
      accounts: [a],
      intelById: new Map(),
      notesById: new Map(),
      researchAtById: new Map([[a.id, "2026-06-01T12:00:00Z"]]),
    });
    assert.equal(
      all.some((q) => q.ruleId === "stale-above-gate"),
      false,
    );
  });

  test("a stale wire hit ranks as nothing — the trigger is perishable", () => {
    const a = acct({ id: "A0000000000000003", name: "Old News" });
    const { items } = buildQueue({
      ...base,
      accounts: [a],
      intelById: new Map(),
      notesById: new Map(),
      wireAtById: new Map([[a.id, "2026-07-20T12:00:00Z"]]),
    });
    assert.equal(
      items.some((i) => i.ruleId === "wire-trigger"),
      false,
    );
  });

  test("proximity breaks ties only — same evidence, closer account first", () => {
    const near = acct({
      id: "N0000000000000001",
      name: "Near",
      city: "Northbrook",
      state: "IL",
    });
    const far = acct({
      id: "F0000000000000001",
      name: "Far",
      city: "Miami",
      state: "FL",
    });
    const notes = () => [salesnavNote("high buyer intent", "2026-07-29T12:00:00Z")];
    const { items } = buildQueue({
      ...base,
      accounts: [far, near],
      intelById: new Map(),
      notesById: new Map([
        [near.id, notes()],
        [far.id, notes()],
      ]),
    });
    const names = items.filter((i) => i.ruleId === "intent-warm").map((i) => i.name);
    assert.deepEqual(names, ["Near", "Far"]);
  });

  test("the cap holds and overflow is honest", () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      acct({
        id: `M${String(i).padStart(16, "0")}`,
        name: `Warm ${i}`,
        city: "",
        state: "",
      }),
    );
    const notesById = new Map(
      many.map((p) => [
        p.id,
        [salesnavNote("high buyer intent", "2026-07-29T12:00:00Z")],
      ]),
    );
    const { items, overflow } = buildQueue({
      ...base,
      accounts: many,
      intelById: new Map(),
      notesById,
    });
    assert.equal(items.length, QUEUE_CAP);
    assert.equal(overflow, 4);
  });

  test("yesterday's unworked move returns carried; a stamped one does not", () => {
    const p = acct({ id: "Y0000000000000001", name: "Yesterday" });
    const inp = {
      ...base,
      accounts: [p],
      intelById: new Map<string, DealIntel>(),
      notesById: new Map([
        [p.id, [salesnavNote("high buyer intent", "2026-07-28T12:00:00Z")]],
      ]),
    };
    const un = buildQueue({ ...inp, doneKeys: new Set<string>() });
    assert.equal(un.items[0].ruleId, "intent-warm");
    assert.equal(un.items[0].carried, true);
    const mk = moveKey(un.items[0]);
    const done = buildQueue({
      ...inp,
      doneKeys: new Set([`groundwork:2026-07-29:${mk}`]),
    });
    assert.equal(done.items[0].carried, false);
  });

  test("the clock bands: 10a is sends, 12p is people, 3p is filing", () => {
    assert.equal(currentBand(new Date("2026-07-30T15:00:00Z")), "now"); // 10a CT
    assert.equal(currentBand(new Date("2026-07-30T17:30:00Z")), "eleven"); // 12:30p CT
    assert.equal(currentBand(new Date("2026-07-30T20:00:00Z")), "two"); // 3p CT
  });
});

describe("groundwork wire", () => {
  const item: WireItem = {
    headline: "Globalization Partners raises platform fees",
    source: "HR Dive",
    url: "https://example.com/gp-fees",
    at: "2026-07-30T12:00:00Z",
    keywords: ["PEO"],
    accountIds: [],
    read: "Two live conversations lean on this provider today.",
  };

  test("note body round-trips through the envelope", () => {
    const parsed = parseWireBody(wireNoteBody(item));
    assert.equal(parsed?.headline, item.headline);
    assert.equal(parsed?.url, item.url);
  });

  test("url hash is stable and hex", () => {
    assert.equal(urlHash(item.url), urlHash(item.url));
    assert.match(urlHash(item.url), /^[0-9a-f]+$/);
  });

  test("account matching hits real book names on word boundaries", () => {
    const simploy = peos.find((p) => p.name === "Simploy");
    if (simploy) {
      const hits = matchAccounts("Simploy picks a global partner");
      assert.ok(hits.includes(simploy.id));
    }
    assert.equal(matchAccounts("nothing about anyone").length, 0);
  });

  test("account-matched items rank first; staleness is 12 hours", () => {
    const matched = {
      ...item,
      url: "https://example.com/2",
      accountIds: ["X"],
      at: "2026-07-29T00:00:00Z",
    };
    const ordered = orderWire([item, matched]);
    assert.equal(ordered[0].url, matched.url);
    assert.equal(sweepDue([item], new Date("2026-07-30T18:00:00Z")), false);
    assert.equal(sweepDue([item], new Date("2026-07-31T12:00:01Z")), true);
    assert.equal(sweepDue([], NOW), true);
  });
});

describe("groundwork readout and lint", () => {
  test("the file's To-Russ paragraph IS the readout's paragraph (one builder)", () => {
    const p = acct({ id: "R0000000000000001", name: "Readable" });
    const intel = intelWith({
      timing: {
        value: { phrase: "decision", dateIso: "2026-08-06" },
        src: "t",
        at: "2026-07-28",
      },
      incumbent: { value: "Globalization Partners", src: "t", at: "2026-07-28" },
    });
    const notes = [
      {
        body: "✉ SF Jul 21 — intro · Pat",
        source: "sf",
        createdAt: "2026-07-21T12:00:00Z",
      },
    ];
    const { items } = buildQueue({
      accounts: [p],
      intelById: new Map([[p.id, intel]]),
      notesById: new Map([[p.id, notes]]),
      touches: [],
      contactCountById: () => 5,
      wireAtById: new Map([[p.id, "2026-07-29T12:00:00Z"]]),
      now: NOW,
    });
    assert.equal(items[0].ruleId, "wire-trigger");
    const file = buildFile(p, {
      queueItem: items[0],
      intel,
      intent: null,
      notes,
      touches: [],
      wire: [],
      contacts: [],
      now: NOW,
    });
    const direct = paragraphFor(p, { intel, intent: null, queueItem: items[0] });
    assert.equal(file.russ, direct);
    assert.ok(file.russ.includes("made the wire"));
    assert.ok(file.russ.includes("Globalization Partners"));
  });

  test("readout numbers carry denominators and sections are honest", () => {
    const p = acct({ id: "R0000000000000002", name: "Only One" });
    const r = buildReadout({
      accounts: [p],
      queue: [],
      intelById: new Map(),
      intentById: new Map(),
      outreachAccountIds: new Set(),
      partnerUpdatesSent: 0,
      partnerUpdatesReplied: 0,
      now: NOW,
    });
    const book = r.sections.find((s) => s.title === "The rest of the book");
    assert.ok(book);
    assert.ok(book.paragraphs[0].text.includes("0 of the 1"));
    assert.equal(
      r.sections.some((s) => s.title.startsWith("Warming")),
      false,
    );
  });

  test("the lint catches banned words, bare dates, and money", () => {
    assert.equal(lint("A plain sentence about August 6th.").length, 0);
    assert.ok(lint("A greenfield pursuit decides 8/6.").length >= 3);
    assert.ok(lint("Costs $500 a month").some((i) => i.kind === "money"));
  });

  test("every composed payload survives the lint's money check", () => {
    const p = acct({ id: "C0000000000000001", name: "Composed" });
    const rules = [
      "wire-trigger",
      "intent-warm",
      "riding-lane",
      "silence-bump",
      "roundup-slot",
      "stale-above-gate",
      "cold-revival",
      "stakeholder-gap",
      "never-touched-incumbent",
    ] as const;
    for (const ruleId of rules) {
      const c = composeFor({
        ruleId,
        account: p,
        intel: intelWith({}),
        intent: { level: "high", activities: 11, at: NOW.toISOString() },
        contactName: p.contactName,
        laneDate: "2026-07-31",
      });
      assert.ok(c.payload.length > 40, `${ruleId} composes real words`);
      assert.equal(
        lint(c.payload).filter((i) => i.kind === "money").length,
        0,
        `${ruleId} carries no figures`,
      );
      assert.ok(c.to.length > 0, `${ruleId} is addressed`);
      assert.ok(!/\bsteps?\b/i.test(c.payload), `${ruleId} never says "steps"`);
    }
  });
});

describe("groundwork adversarial regressions", () => {
  const base = {
    intelById: new Map<string, DealIntel>(),
    notesById: new Map<string, { body: string; source: string; createdAt: string }[]>(),
    touches: [] as {
      subjectKey: string;
      contactedAt: string;
      followUpAt: string;
      status: string;
    }[],
    contactCountById: () => 5,
    now: NOW,
  };

  test("a newer grab with no intent kills an older High — superseded, not dormant", () => {
    const sup = intentFor(
      [
        salesnavNote(
          "SALESNAV ACCOUNTS - captured Jul 30 - 118 rows",
          "2026-07-30T12:00:00Z",
        ),
        salesnavNote("High buyer intent", "2026-07-28T12:00:00Z"),
      ],
      NOW,
    );
    assert.equal(sup, null);
  });

  test("the grab's own furniture never reads as a riding lane", () => {
    const header = ridingLaneDate(
      [
        salesnavNote(
          "SALESNAV ACCOUNTS - captured 7/31/2026 - 118 rows collected",
          "2026-07-30T12:00:00Z",
        ),
      ],
      NOW,
    );
    const ownDay = ridingLaneDate(
      [salesnavNote("Comm Hub 7/30/2026", "2026-07-30T12:00:00Z")],
      NOW,
    );
    assert.equal(header, null);
    assert.equal(ownDay, null);
  });

  test("wire matching survives corporate suffixes and refuses partial words", () => {
    const nextep = peos.find((p) => p.name === "Nextep, Inc.");
    if (nextep) {
      assert.ok(
        matchAccounts("Nextep announces European expansion").includes(nextep.id),
        "a headline without the ', Inc.' tail still matches the book name",
      );
    }
    const simploy = peos.find((p) => p.name === "Simploy");
    if (simploy) {
      assert.ok(
        !matchAccounts("Simploys are trending this quarter").includes(simploy.id),
        "a longer word never matches a shorter book name inside it",
      );
    }
  });

  test("composers say plainly when the book has no name to address", () => {
    const bare = acct({
      id: "B4RE000000000001",
      name: "Bare Book",
      contactName: "",
      csm: "Unassigned",
    });
    const draft = composeFor({
      ruleId: "wire-trigger",
      account: bare,
      intel: intelWith({}),
      intent: null,
      contactName: "",
      laneDate: null,
    });
    assert.ok(draft.to.includes("Add the name before sending"));
    assert.ok(draft.payload.includes("Hi —"));
    const relay = composeFor({
      ruleId: "roundup-slot",
      account: bare,
      intel: intelWith({}),
      intent: null,
      contactName: "",
      laneDate: null,
    });
    assert.ok(relay.to.includes("Route it with Aleks"));
  });

  test("the drumbeat: quiet awaiting threads bump, cold ones revive, fresh ones wait", () => {
    const p = acct({ id: "P0000000000000001", name: "Bumped", csm: "Unassigned" });
    const touch = (contactedAt: string, status: string) => [
      {
        subjectKey: `outreach:${p.id}`,
        contactedAt,
        followUpAt: "",
        status,
      },
    ];
    const bump = buildQueue({
      ...base,
      accounts: [p],
      touches: touch("2026-07-21T12:00:00Z", "awaiting"), // quiet 9 days
    });
    assert.equal(bump.items[0]?.ruleId, "silence-bump");
    const fresh = buildQueue({
      ...base,
      accounts: [p],
      touches: touch("2026-07-28T12:00:00Z", "awaiting"), // quiet 2 days
    });
    assert.equal(
      fresh.items.some((i) => i.ruleId === "silence-bump" || i.ruleId === "cold-revival"),
      false,
    );
    const cold = buildQueue({
      ...base,
      accounts: [p],
      touches: touch("2026-06-01T12:00:00Z", "archived"), // quiet 59 days
    });
    assert.equal(cold.items[0]?.ruleId, "cold-revival");
  });

  test("a live partner thread suppresses the roundup slot; an archived stale one opens it", () => {
    const p = acct({ id: "P0000000000000002", name: "Rounder", csm: "Kim Bartolotti" });
    // A plain note keeps the account free of a move of its own — the slot
    // rides a vehicle, and a vehicle never collides (D22).
    const notesById = new Map([
      [p.id, [{ body: "note", source: "room", createdAt: "2026-07-29T12:00:00Z" }]],
    ]);
    const live = buildQueue({
      ...base,
      notesById,
      accounts: [p],
      touches: [
        {
          subjectKey: "partner-outreach:Kim Bartolotti",
          contactedAt: "2026-07-29T12:00:00Z",
          followUpAt: "2026-08-05T12:00:00Z",
          status: "awaiting",
        },
      ],
    });
    assert.equal(
      live.items.some((i) => i.ruleId === "roundup-slot"),
      false,
    );
    const due = buildQueue({
      ...base,
      notesById,
      accounts: [p],
      touches: [
        {
          subjectKey: "partner-outreach:Kim Bartolotti",
          contactedAt: "2026-07-25T12:00:00Z",
          followUpAt: "2026-07-27T12:00:00Z",
          status: "archived",
        },
      ],
    });
    assert.equal(
      due.items.some((i) => i.ruleId === "roundup-slot"),
      true,
    );
  });

  test("one thread appends the widening question inside the composed text", () => {
    const p = acct({ id: "W0000000000000001", name: "Narrow" });
    const intel = intelWith({
      threads: { people: ["Pat Example"], execSeen: false, opsSeen: false },
      lastInbound: "2026-07-29T12:00:00Z",
    });
    const file = buildFile(p, {
      queueItem: {
        accountId: p.id,
        name: p.name,
        ruleId: "silence-bump",
        weight: 72,
        band: "now",
        action: "Send the second touch.",
        reason: "No reply since July 21.",
        owed: "draft composed",
        carried: false,
        intent: null,
      },
      intel,
      intent: null,
      notes: [],
      touches: [],
      wire: [],
      contacts: [],
      now: NOW,
    });
    assert.equal(file.threadCount, 1);
    assert.equal(file.singleThread, true);
    assert.ok(file.composed.payload.endsWith(WIDENING_LINE));
    assert.equal(file.contactEmail, "pat@example.com");
  });

  test("the readout's ranked tail lands under 'Also in front of me today'", () => {
    const p = acct({ id: "T0000000000000001", name: "Tail" });
    const r = buildReadout({
      accounts: [p],
      queue: [
        {
          accountId: p.id,
          name: p.name,
          ruleId: "stakeholder-gap",
          weight: 55,
          band: "two",
          action: "Find a second name.",
          reason: "One person carries everything.",
          owed: "recipe ready",
          carried: false,
          intent: null,
        },
      ],
      intelById: new Map(),
      intentById: new Map(),
      outreachAccountIds: new Set(),
      partnerUpdatesSent: 0,
      partnerUpdatesReplied: 0,
      nextSevenDays: ["Tail — dated follow-up August 4"],
      now: NOW,
    });
    const also = r.sections.find((s) => s.title === "Also in front of me today");
    assert.ok(also && also.paragraphs.length === 1);
    const week = r.sections.find((s) => s.title === "Next seven days");
    assert.ok(week && week.paragraphs[0].text.includes("August 4"));
  });
});

describe("groundwork institutions", () => {
  test("round-trip and the near-event pick", () => {
    const inst = {
      slug: "global-chamber-chicago",
      name: "Global Chamber, Chicago chapter",
      kind: "client-world" as const,
      rung: "verify" as const,
      nextEventIso: "2026-08-05",
      note: "Verification runs this week.",
    };
    const parsed = parseInstBody(instNoteBody(inst));
    assert.equal(parsed?.name, inst.name);
    const card = institutionCard([inst], NOW);
    assert.equal(card?.eventSoon, true);
    assert.equal(institutionCard([], NOW), null);
  });
});

describe("groundwork moveKey", () => {
  test("is stable per account and rule", () => {
    assert.equal(moveKey({ accountId: "A1", ruleId: "intent-warm" }), "A1:intent-warm");
  });
});

// ═══ Pass 9: the fixes pass 8 found (docs/architecture/pass-8-rewalk.md §3) ═══
// Every block below pins one row of the re-walk or one of the fourteen calls.
// Each failed on main at 03872cc before the fix that follows it landed.

const P9 = acct({ id: "P9000000000000001", name: "Pass Nine", csm: "Unassigned" });

const recordRow = (
  o: Partial<RecordNote> & { id: string; body: string },
): RecordNote => ({
  accountId: P9.id,
  partner: "",
  kind: "account",
  lane: "mine",
  actors: "",
  source: "",
  recipients: "",
  createdAt: "2026-07-20T12:00:00Z",
  ...o,
});

const touchRow = (contactedAt: string, status = "awaiting") => ({
  subjectKey: `outreach:${P9.id}`,
  label: "",
  contactedAt,
  followUpAt: "",
  status,
  log: [] as { at: string; body: string }[],
});

/** The page's call: one read per account, built from the same rows the
 *  queue's notes come from. */
const p9Read = (notes: RecordNote[], touches: ReturnType<typeof touchRow>[] = []) =>
  readAccount({
    account: { id: P9.id, name: P9.name, contacts: [] },
    notes,
    touches,
    todos: [],
    dispositions: new Map(),
    homeSide: ["Anika Steenstra"],
    now: NOW,
  });

// A self-assigned Salesforce task: the operator addressed it to themselves.
const SELF_TASK = recordRow({
  id: "self1",
  body: "✔ SF Jul 28 — Follow up with Pass Nine · Antaeus Coe → Antaeus Coe",
  actors: "Antaeus Coe → Antaeus Coe",
  source: "sf",
  createdAt: "2026-07-28T12:00:00Z",
});

const gemOf = (over: Partial<Gem>): Gem => ({
  dropSha: "037742a0",
  verdict: "CONFIRMED",
  createdDay: "2026-07-29",
  actedDay: "",
  who: ["Dana Ellis"],
  whoKind: "account",
  term: "CANADA ASK",
  what: "Dana asked about Canada",
  whenDay: "2026-07-28",
  signal: "asked",
  act: "Send the Canada one-pager.",
  reason: "Jul 28 reply asks about Canada.",
  cites: [{ k: "k-dana", day: "2026-07-28", who: "Dana Ellis", subject: "Re: Canada" }],
  ...over,
});

const stagedOf = (over: Partial<StagedRow> & { k: string }): StagedRow => ({
  d: "2026-07-28",
  s: "Re: Global",
  a: "",
  lane: "human",
  sub: "Email",
  rt: "",
  ct: "",
  fl: "",
  ...over,
});

const rollupOf = (over: Partial<Rollup>): Rollup => ({
  dropSha: "037742a0",
  dropDay: "2026-07-29",
  window: { from: "2026-05-01", to: "2026-07-29" },
  lanes: { human: 0, csm: 0, support: 0, intent: 0, machinery: 0 },
  emails: { human: 0, csm: 0, support: 0, intent: 0, machinery: 0 },
  intent: { s: 0, o: 0, c: 0 },
  receipts: 0,
  lastHuman: null,
  lastOrgInbound: "",
  lastTheirs: null,
  actors: [],
  threads: [],
  verdict: "",
  ...over,
});

const srOf = (over: Partial<SecondRecord>): SecondRecord => ({
  rollup: null,
  gems: [],
  support: null,
  intent: null,
  ...over,
});

const ENI_FUEL = srOf({
  support: {
    dropSha: "x",
    total: 40,
    spike: null,
    themes: [
      {
        label: "Update Provided",
        n: 20,
        firstDay: "2026-07-01",
        lastDay: "2026-07-28",
        examples: [],
      },
    ],
  },
});

describe("G1 · a colleague's gem reaches nothing under the stage (C6 as amended)", () => {
  test("the chip row's gems leave out a colleague's gem and an acted one", () => {
    const colleague = gemOf({
      who: ["Anika Steenstra"],
      whoKind: "colleague",
      term: "HANDOFF",
      act: "Ask Anika what they said.",
    });
    const acted = gemOf({ term: "OLD ASK", actedDay: "2026-07-29" });
    const theirs = gemOf({});
    assert.deepEqual(
      chipGems([colleague, acted, theirs]).map((g) => g.term),
      ["CANADA ASK"],
    );
    assert.deepEqual(chipGems([colleague]), [], "a colleague's gem alone shows no chip");
  });
});

describe("G2 · a worked seat retires until taken back (the Act Lane decree)", () => {
  const SEAT_AT = "2026-07-28T15:00:00.000Z";
  test("a tap or a Copy stamp from yesterday worked the seat", () => {
    const stamps = new Map([
      [`groundwork:2026-07-29:${P9.id}:seated`, "2026-07-29T16:00:00.000Z"],
    ]);
    assert.equal(seatWorked(P9.id, SEAT_AT, stamps, []), true);
  });
  test("taken back, the stamp is gone and the seat leads again", () => {
    assert.equal(seatWorked(P9.id, SEAT_AT, new Map(), []), false);
  });
  test("a seat filed after the stamp is a new seat", () => {
    const stamps = new Map([
      [`groundwork:2026-07-27:${P9.id}:seated`, "2026-07-27T16:00:00.000Z"],
    ]);
    assert.equal(seatWorked(P9.id, SEAT_AT, stamps, []), false);
  });
  test("another move's stamp on the account does not work the seat", () => {
    const stamps = new Map([
      [`groundwork:2026-07-29:${P9.id}:wire-trigger`, "2026-07-29T16:00:00.000Z"],
      [`groundwork:2026-07-29:X${P9.id}:seated`, "2026-07-29T16:00:00.000Z"],
    ]);
    assert.equal(seatWorked(P9.id, SEAT_AT, stamps, []), false);
  });
  test("the record's send after the seat still retires it", () => {
    assert.equal(
      seatWorked(P9.id, SEAT_AT, new Map(), [{ at: "2026-07-29T14:00:00Z" }]),
      true,
    );
    assert.equal(
      seatWorked(P9.id, SEAT_AT, new Map(), [{ at: "2026-07-27T14:00:00Z" }]),
      false,
    );
  });
});

describe("G3 · the drumbeat, the carry and the readout read the read's own last send", () => {
  test("a self-assigned task never resets No reply since", () => {
    const touches = [touchRow("2026-07-15T12:00:00Z")];
    const read = p9Read([SELF_TASK], touches);
    assert.equal(read.lastOutbound, null, "the read: no send");
    const { all } = buildQueue({
      accounts: [P9],
      intelById: new Map([[P9.id, read.intel]]),
      moveById: new Map([[P9.id, read.whoseMove]]),
      readById: new Map([[P9.id, read]]),
      notesById: new Map([[P9.id, [SELF_TASK]]]),
      touches,
      contactCountById: () => 5,
      now: NOW,
    });
    const bump = all.find((q) => q.accountId === P9.id);
    assert.equal(bump?.ruleId, "silence-bump");
    assert.equal(bump?.reason, "No reply since July 15.");
  });

  test("a self-assigned task filed today never clears yesterday's carry", () => {
    const grab = {
      ...salesnavNote("high buyer intent", "2026-07-28T12:00:00Z"),
      id: "sn1",
      accountId: P9.id,
      partner: "",
      kind: "account" as const,
      lane: "mine" as const,
      actors: "",
      recipients: "",
    };
    const today = { ...SELF_TASK, createdAt: "2026-07-30T13:00:00Z" };
    const read = p9Read([today, grab]);
    const { items } = buildQueue({
      accounts: [P9],
      intelById: new Map([[P9.id, read.intel]]),
      readById: new Map([[P9.id, read]]),
      notesById: new Map([[P9.id, [today, grab]]]),
      touches: [],
      contactCountById: () => 5,
      doneKeys: new Set<string>(),
      now: NOW,
    });
    assert.equal(items[0]?.ruleId, "intent-warm");
    assert.equal(items[0]?.carried, true, "nothing was sent: it carries");
  });

  test("the readout says they wrote last when only a self-task followed their mail", () => {
    const inbound = recordRow({
      id: "in1",
      body: "✉ OL Jul 20 — Re: Canada · Dana Ellis → Antaeus Coe\nCan you walk us through Canada?",
      actors: "Dana Ellis → Antaeus Coe",
      recipients: "Antaeus Coe",
      source: "outlook",
    });
    const read = p9Read([SELF_TASK, inbound]);
    const intent = {
      level: "high" as const,
      activities: null,
      at: "2026-07-29T12:00:00Z",
    };
    const r = buildReadout({
      accounts: [P9],
      queue: [],
      intelById: new Map([[P9.id, read.intel]]),
      readById: new Map([[P9.id, read]]),
      intentById: new Map([[P9.id, intent]]),
      outreachAccountIds: new Set(),
      partnerUpdatesSent: 0,
      partnerUpdatesReplied: 0,
      now: NOW,
    });
    const para = r.sections
      .flatMap((s) => s.paragraphs)
      .find((p) => p.accountId === P9.id);
    assert.match(para?.text ?? "", /wrote to us last, on July 20/);
  });
});

describe("G4 · engaged-never-introduced reads the read's conversationExists", () => {
  const second = new Map([[P9.id, ENI_FUEL]]);
  test("a glyph row with no direction is no conversation, as Accounts reads it", () => {
    // A thread between two of their own people, which we were copied on.
    const theirs = recordRow({
      id: "th1",
      body: "✉ OL Jul 20 — Re: payroll · Dana Ellis → Sam Ortiz",
      actors: "Dana Ellis → Sam Ortiz",
      recipients: "Sam Ortiz",
      source: "outlook",
    });
    const read = p9Read([theirs]);
    assert.equal(read.conversationExists, false);
    const { all } = buildQueue({
      accounts: [P9],
      intelById: new Map([[P9.id, read.intel]]),
      readById: new Map([[P9.id, read]]),
      notesById: new Map([[P9.id, [theirs]]]),
      touches: [],
      contactCountById: () => 5,
      secondById: second,
      now: NOW,
    });
    assert.ok(all.some((q) => q.ruleId === "engaged-never-introduced"));
  });

  test("a send of ours is a conversation, and the rule stays quiet", () => {
    const sent = recordRow({
      id: "s1",
      body: "✉ OL Jul 21 — Global · Antaeus Coe → Dana Ellis",
      actors: "Antaeus Coe → Dana Ellis",
      recipients: "Dana Ellis",
      source: "outlook",
      createdAt: "2026-07-21T12:00:00Z",
    });
    const read = p9Read([sent]);
    assert.equal(read.conversationExists, true);
    const { all } = buildQueue({
      accounts: [P9],
      intelById: new Map([[P9.id, read.intel]]),
      readById: new Map([[P9.id, read]]),
      notesById: new Map([[P9.id, [sent]]]),
      touches: [],
      contactCountById: () => 5,
      secondById: second,
      now: NOW,
    });
    assert.equal(
      all.some((q) => q.ruleId === "engaged-never-introduced"),
      false,
    );
  });
});

describe("G5 · every chip drills to row-level evidence (the meat law)", () => {
  const rows = [
    stagedOf({
      k: "k-sup1",
      d: "2026-07-22",
      s: "PrismHR Case 01234567: W-2 reprint",
      a: "Pat Lee",
      lane: "support",
    }),
    stagedOf({
      k: "k-sup2",
      d: "2026-07-22",
      s: "PrismHR Case 01234568: login",
      a: "Pat Lee",
      lane: "support",
    }),
    stagedOf({
      k: "k-sup3",
      d: "2026-07-21",
      s: "PrismHR Case 01234569: tax",
      a: "Pat Lee",
      lane: "support",
    }),
    stagedOf({
      k: "k-anika",
      d: "2026-07-28",
      s: "Re: Global intro",
      a: "Anika Steenstra",
      lane: "csm",
    }),
    stagedOf({
      k: "k-lesha",
      d: "2026-07-27",
      s: "Quarterly check-in",
      a: "Lesha Cyphers",
      lane: "csm",
    }),
    stagedOf({
      k: "k-lesha2",
      d: "2026-07-20",
      s: "Benefits renewal",
      a: "Lesha Cyphers",
      lane: "csm",
    }),
  ];

  test("the collision chip's colleague names the row it stands on", () => {
    const cite = collisionCite(rows, { who: "Anika Steenstra", day: "2026-07-28" });
    assert.equal(cite?.k, "k-anika");
    assert.equal(cite?.who, "Anika Steenstra");
    assert.equal(collisionCite(rows, null), null);
  });

  test("SPIKE's day opens to that day's support rows", () => {
    assert.deepEqual(
      spikeCites(rows, "2026-07-22").map((c) => c.k),
      ["k-sup1", "k-sup2"],
    );
  });

  test("the CSM prep lines carry their row keys", () => {
    assert.deepEqual(
      csmPrepRows(rows, "Lesha Cyphers", "2026-07-30").map((c) => c.k),
      ["k-lesha", "k-lesha2"],
    );
  });

  test("SPIKE is its own door on the chip row", async () => {
    const { render, textOf } = await import("./helpers/room-render");
    const { default: EvidenceChips } =
      await import("../src/app/groundwork/evidence-chips");
    const html = await render(
      createElement(EvidenceChips, {
        accountId: P9.id,
        support: {
          total: 14,
          spikeDay: "2026-07-22",
          spikeN: 2,
          spikeCites: spikeCites(rows, "2026-07-22"),
        },
        intent: null,
        collision: null,
        gems: [],
      }),
    );
    const buttons = [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map((m) =>
      textOf(m[1]),
    );
    assert.ok(
      buttons.some((b) => /^SPIKE 07\/22\b/.test(b)),
      `no SPIKE door in ${JSON.stringify(buttons)}`,
    );
    assert.ok(buttons.some((b) => /SUPPORT 14$/.test(b)));
  });

  test("a cited row renders as a door to its excerpt", async () => {
    const { render, textOf } = await import("./helpers/room-render");
    const { CiteRows } = await import("../src/app/groundwork/evidence-chips");
    const html = await render(
      createElement(CiteRows, {
        accountId: P9.id,
        rows: [collisionCite(rows, { who: "Anika Steenstra", day: "2026-07-28" })!],
      }),
    );
    const buttons = [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map((m) =>
      textOf(m[1]),
    );
    assert.deepEqual(buttons, ["07/28 · Anika Steenstra · Re: Global intro ▸ read it"]);
  });
});

describe("G6 · the CSM prep kicker says the real count", () => {
  test("two to four rows are counted, one is a row, five are five", () => {
    assert.equal(prepKicker(1), "THE CSM’S OWN LAST ROW · SHARPEN THE ASK");
    assert.equal(prepKicker(3), "THE CSM’S OWN LAST 3 ROWS · SHARPEN THE ASK");
    assert.equal(prepKicker(5), "THE CSM’S OWN LAST 5 ROWS · SHARPEN THE ASK");
  });
});

describe("G7 · the queue's demand reads the latest of both research stores", () => {
  // research.json scores this account 18, under the gate, as of the sweep (7/2).
  const LOW = acct({ id: "001F000000w38PPIAY", name: "Low Sweep", csm: "Unassigned" });
  const OCT = new Date("2026-10-15T15:00:00Z");
  const run = (at: string, signals: number) =>
    buildQueue({
      accounts: [LOW],
      intelById: new Map(),
      notesById: new Map([[LOW.id, [{ body: "note", source: "room", createdAt: at }]]]),
      touches: [],
      contactCountById: () => 5,
      researchAtById: new Map([[LOW.id, at]]),
      researchSignalsById: new Map([[LOW.id, signals]]),
      now: OCT,
    }).all.filter((q) => q.accountId === LOW.id);

  test("the account's own later pass that found demand clears the gate", () => {
    const [hit] = run("2026-07-10T12:00:00Z", 2);
    assert.equal(hit?.ruleId, "stale-above-gate");
    assert.equal(hit?.action, "Refresh the account research.");
    assert.equal(hit?.reason, "Real demand. Research 97 days old.");
  });

  test("a later pass that found nothing is silent, and the sweep's score stands", () => {
    assert.deepEqual(run("2026-07-10T12:00:00Z", 0), []);
  });

  test("a pass older than the sweep yields to the sweep", () => {
    assert.deepEqual(run("2026-06-01T12:00:00Z", 2), []);
  });

  test("the room's account intel reads demand the way the queue does (S-12)", () => {
    // accountIntel feeds /partners and the room's signal bands; it read the
    // sweep alone, so an account the queue called real demand stayed below
    // the gate there. One reading now (researchDemand), case by case.
    const intelOf = (at: string, signals: number) =>
      accountIntel(new Map([[LOW.id, { at, signals }]])).find((a) => a.id === LOW.id)!;
    assert.equal(accountIntel().find((a) => a.id === LOW.id)?.realDemand, false);
    for (const [at, signals] of [
      ["2026-07-10T12:00:00Z", 2],
      ["2026-07-10T12:00:00Z", 0],
      ["2026-06-01T12:00:00Z", 2],
    ] as const) {
      const queueSaysReal = run(at, signals).some((q) => q.ruleId === "stale-above-gate");
      assert.equal(intelOf(at, signals).realDemand, queueSaysReal, `${at} · ${signals}`);
    }
    // The later pass overturned the sweep's 18: the composite rests on the
    // desk alone, as the queue's does, and the sweep's number stays for prose.
    const real = intelOf("2026-07-10T12:00:00Z", 2);
    assert.equal(real.score, compositeScore(real.desk, null, real.confidence).score);
    assert.equal(real.demand, 18);
    assert.equal(real.researched, true);
  });

  test("the research age is the newer of the two passes, as the Spring's chip reads it", () => {
    // The account's own pass is 120 days old, but the sweep read it on 7/2.
    const big = acct({ id: "001F000000w38ItIAI", name: "Big Demand", csm: "Unassigned" });
    const { all } = buildQueue({
      accounts: [big],
      intelById: new Map(),
      notesById: new Map([
        [big.id, [{ body: "note", source: "room", createdAt: "2026-07-29T12:00:00Z" }]],
      ]),
      touches: [],
      contactCountById: () => 5,
      researchAtById: new Map([[big.id, "2026-04-01T12:00:00Z"]]),
      now: NOW,
    });
    assert.equal(
      all.some((q) => q.ruleId === "stale-above-gate"),
      false,
    );
  });
});

describe("G8 · the take-back withdraws the move's own tap", () => {
  const taps = [
    { id: "tap-wire", createdAt: "2026-07-30T16:00:00.000Z" },
    { id: "tap-early", createdAt: "2026-07-30T14:00:00.000Z" },
  ];
  test("a stamp takes back the tap filed with it, not today's newest", () => {
    assert.equal(tapOfStamp(taps, "2026-07-30T14:00:00.000Z")?.id, "tap-early");
    assert.equal(tapOfStamp(taps, "2026-07-30T16:00:00.000Z")?.id, "tap-wire");
  });
  test("a Copy stamp filed no tap, and takes none back", () => {
    assert.equal(tapOfStamp(taps, "2026-07-30T16:30:00.000Z"), null);
  });
});

describe("pass 8 call 4 · only an attributed inbound row quiets the drumbeat", () => {
  const touches = [touchRow("2026-07-15T12:00:00Z")];
  const run = (rollup: Rollup) =>
    buildQueue({
      accounts: [P9],
      intelById: new Map(),
      notesById: new Map(),
      touches,
      contactCountById: () => 5,
      secondById: new Map([[P9.id, srOf({ rollup })]]),
      now: NOW,
    }).all.find((q) => q.accountId === P9.id);

  test("the account-level Last Email Received alone leaves the bump standing", () => {
    const hit = run(rollupOf({ lastOrgInbound: "2026-07-25 09:00" }));
    assert.equal(hit?.ruleId, "silence-bump");
  });

  test("their attributed reply after our send answers the thread", () => {
    const hit = run(
      rollupOf({
        lastOrgInbound: "2026-07-25 09:00",
        lastTheirs: { day: "2026-07-25", who: "Dana Ellis", subject: "Re: Global" },
      }),
    );
    assert.equal(hit, undefined);
  });
});

describe("pass 8 call 11 · the burn bar turns red and pulses in the last five minutes", () => {
  const css = readFileSync("src/app/groundwork/groundwork.module.css", "utf8");
  // The body of every `@media (prefers-reduced-motion: no-preference)` block.
  const motionBlocks: string[] = [];
  let outside = css;
  for (const m of css.matchAll(/@media \(prefers-reduced-motion: no-preference\) \{/g)) {
    let depth = 1;
    let i = (m.index ?? 0) + m[0].length;
    const start = i;
    while (depth > 0 && i < css.length) {
      if (css[i] === "{") depth += 1;
      if (css[i] === "}") depth -= 1;
      i += 1;
    }
    motionBlocks.push(css.slice(start, i - 1));
    outside = outside.replace(css.slice(m.index ?? 0, i), "");
  }
  test("the bar is red whatever the motion setting", () => {
    assert.match(outside, /\.kxLate \.kxBurn i\s*\{[^}]*background:\s*var\(--ds-red\)/);
  });
  test("the bar pulses with the count only where motion is welcome", () => {
    const pulse = motionBlocks.join("\n");
    assert.match(pulse, /\.kxLate \.kxBurn i[^{]*\{[^}]*animation:\s*kxThrob/);
    assert.match(pulse, /\.kxLate \.kxCount[^{]*\{[^}]*animation:\s*kxThrob/);
    assert.equal(/\.kxBurn i[^{]*\{[^}]*animation/.test(outside), false);
  });
});

describe("the nudge's business days are Chicago days (all days are Chicago days)", () => {
  test("a Friday 10 PM read is still fresh Monday morning", () => {
    // 03:00 UTC Saturday is 10:00 PM Friday in Chicago.
    assert.equal(
      businessDaysBetween("2026-07-25T03:00:00Z", new Date("2026-07-27T14:00:00Z")),
      0,
    );
    assert.equal(
      businessDaysBetween("2026-07-25T03:00:00Z", new Date("2026-07-28T14:00:00Z")),
      1,
    );
  });

  test("a grab pasted at 8 PM never reads its own Chicago date as a riding lane", () => {
    // 01:00 UTC on 7/31 is 8:00 PM on 7/30 in Chicago, the day the row names.
    const late = salesnavNote("Amplify: ClearCo 7/30/2026", "2026-07-31T01:00:00Z");
    assert.equal(ridingLaneDate([late], new Date("2026-07-31T02:00:00Z")), null);
  });
});

describe("the stamp words are plain (the plain-speech law; the stamp words, 2026-10-06)", () => {
  test("the intent note and the colleague's deal say what was done, flat", () => {
    for (const ctx of [{}, { intentActivities: 11 }, { ridingLaneCloses: "August 20" }]) {
      for (const id of ["intent-warm", "riding-lane"]) {
        const s = stampSubtext(id, ctx);
        assert.equal(/READING-US|ASKED INTO/.test(s), false, s);
      }
    }
    assert.equal(
      stampSubtext("intent-warm", { intentActivities: 11 }),
      "SENT THEM A NOTE · 11 SALES NAV READS",
    );
    assert.equal(
      stampSubtext("riding-lane", { ridingLaneCloses: "August 20" }),
      "ASKED THE COLLEAGUE ON THE DEAL TO BRING US IN · CLOSES AUGUST 20",
    );
  });

  test("the intent move's own line says it plainly too", () => {
    const { all } = buildQueue({
      accounts: [P9],
      intelById: new Map(),
      notesById: new Map([
        [P9.id, [salesnavNote("high buyer intent", "2026-07-29T12:00:00Z")]],
      ]),
      touches: [],
      contactCountById: () => 5,
      now: NOW,
    });
    const hit = all.find((q) => q.ruleId === "intent-warm");
    assert.equal(hit?.action, "Send them a note.");
  });

  test("no title on the Groundwork page hangs an aside on an em-dash", () => {
    // The page's markup lives in the page and in its face (face.tsx and the
    // Channel Ask, split out in pass 10); every one of them is read.
    const page = ["page.tsx", "face.tsx", "channel-ask.tsx"]
      .map((f) => readFileSync(`src/app/groundwork/${f}`, "utf8"))
      .join("\n");
    const titles = [...page.matchAll(/title="([^"]*)"/g)].map((m) => m[1]);
    assert.ok(titles.length > 5);
    assert.deepEqual(
      titles.filter((t) => t.includes("—")),
      [],
    );
  });
});

describe("D15 reaches every action (pass 8 call 2): Groundwork's actions refresh Groundwork only", () => {
  test("no action revalidates another surface", () => {
    const actions = readFileSync("src/app/groundwork/actions.ts", "utf8");
    const paths = [...actions.matchAll(/revalidatePath\(\s*"([^"]*)"/g)].map((m) => m[1]);
    assert.ok(paths.length > 0);
    assert.deepEqual([...new Set(paths)], ["/groundwork"]);
    assert.equal(/revalidateTag\(/.test(actions), false);
  });
});

// The wiring of D27's channel-line clause: the wing's stamps go through the
// one pure choice (wingStamp, src/lib/groundwork/stamp.ts, behavior-pinned in
// tests/canon/groundwork.test.ts), never an inline second spelling.
describe("the wing stamps through the one choice (D27, ship order 2026-10-06)", () => {
  test("the page's stamp subtext is wingStamp's", () => {
    const page = readFileSync("src/app/groundwork/page.tsx", "utf8");
    assert.match(page, /sub: wingStamp\(/);
    assert.ok(!/subFor\(m\[1\]\) \|\|/.test(page), "the inline choice is gone");
  });
});

// ── A9.12 · the backbone inputs (CLAUDE.md "Groundwork face") ──────────────
// "The accounts page's stores and the deep-research notes (research:<account>)
// are backbone inputs to the queue brain." The page hands the queue what
// researchInputs reads from the research:<account> notes and what
// ledgerExclusions reads from the disposition ledger and the snoozes; the
// book and its roster go in as the accounts and their contact counts.
describe("A9.12 · the research notes and the Accounts stores feed the queue brain", () => {
  const LOW = acct({ id: "001F000000w38PPIAY", name: "Low Sweep", csm: "Unassigned" });
  const OCT = new Date("2026-10-15T15:00:00Z");
  const pass = (signals: string[], at: string) => ({
    body: researchBody(
      {
        summary: "A PEO in Ohio.",
        signals,
        countries: [],
        people: [],
        asks: [],
        sources: [],
      },
      new Date(at),
    ),
    source: "research",
    createdAt: at,
  });
  const queueFrom = (notesMap: Map<string, { body: string; createdAt: string }[]>) => {
    const research = researchInputs(notesMap);
    return buildQueue({
      accounts: [LOW],
      intelById: new Map(),
      notesById: new Map([
        [LOW.id, [{ body: "note", source: "room", createdAt: "2026-10-01T12:00:00Z" }]],
      ]),
      touches: [],
      contactCountById: () => 5,
      researchAtById: new Map([...research].map(([id, r]) => [id, r.at])),
      researchSignalsById: new Map([...research].map(([id, r]) => [id, r.signals])),
      now: OCT,
    }).all.filter((q) => q.accountId === LOW.id);
  };

  test("the newest research:<account> note is the account's live research read", () => {
    const notesMap = new Map([
      [
        `research:${LOW.id}`,
        [
          pass(["Hiring in Poland", "Opened a Mexico office"], "2026-07-10T12:00:00Z"),
          pass([], "2026-05-01T12:00:00Z"),
        ],
      ],
      [LOW.id, [{ body: "not research", createdAt: "2026-07-11T12:00:00Z" }]],
      ["research:", [pass(["x"], "2026-07-12T12:00:00Z")]],
    ]);
    const read = researchInputs(notesMap);
    assert.deepEqual([...read.keys()], [LOW.id]);
    assert.equal(read.get(LOW.id)?.at, "2026-07-10T12:00:00Z");
    assert.equal(read.get(LOW.id)?.signals, 2);
    assert.match(read.get(LOW.id)?.line ?? "", /^⌕ Research/);
    // The room's own reader says the same of the same notes: one reader.
    const room = ownPassesFrom(notesMap).get(LOW.id);
    assert.deepEqual(
      { at: room?.at, signals: room?.signals },
      { at: read.get(LOW.id)?.at, signals: read.get(LOW.id)?.signals },
    );
  });

  test("the note's own finding moves the queue: demand found stages the refresh, none stays silent", () => {
    const found = queueFrom(
      new Map([
        [
          `research:${LOW.id}`,
          [pass(["Hiring in Poland", "Opened a Mexico office"], "2026-07-10T12:00:00Z")],
        ],
      ]),
    );
    assert.equal(found[0]?.ruleId, "stale-above-gate");
    assert.equal(found[0]?.reason, "Real demand. Research 97 days old.");
    const none = queueFrom(
      new Map([[`research:${LOW.id}`, [pass([], "2026-07-10T12:00:00Z")]]]),
    );
    assert.deepEqual(
      none.filter((q) => q.ruleId === "stale-above-gate"),
      [],
    );
  });

  test("the disposition ledger and the snoozes keep their accounts off the queue", () => {
    const ids = [
      "L0000000000000001",
      "L0000000000000002",
      "L0000000000000003",
      "L0000000000000004",
    ];
    const excluded = ledgerExclusions(
      new Map([
        [ids[0], { status: "not-mine" }],
        [ids[1], { status: "parked" }],
        [ids[3], { status: "active" }],
        [`hide:${ids[3]}`, { status: "parked" }],
      ]),
      [ids[2], `seat:${ids[3]}`],
    );
    assert.deepEqual([...excluded].sort(), [ids[0], ids[1], ids[2]]);
    const { all } = buildQueue({
      accounts: ids.map((id) => acct({ id, name: id })),
      intelById: new Map(),
      notesById: new Map(),
      touches: [],
      contactCountById: () => 5,
      excludedIds: excluded,
      now: NOW,
    });
    assert.deepEqual([...new Set(all.map((q) => q.accountId))], [ids[3]]);
  });

  test("the book's fit and its roster are read: an untouched incumbent opens, a thin roster asks for a name", () => {
    const fresh = acct({ id: "F0000000000000001", name: "Fresh", csm: "Unassigned" });
    const lone = acct({
      id: "F0000000000000002",
      name: "Lone",
      csm: "Unassigned",
      fitTier: "low",
    });
    const { all } = buildQueue({
      accounts: [fresh, lone],
      intelById: new Map(),
      notesById: new Map([
        [lone.id, [{ body: "note", source: "room", createdAt: "2026-07-29T12:00:00Z" }]],
      ]),
      touches: [],
      contactCountById: (id) => (id === lone.id ? 0 : 5),
      now: NOW,
    });
    assert.equal(
      all.find((q) => q.accountId === fresh.id)?.ruleId,
      "never-touched-incumbent",
    );
    const gap = all.find((q) => q.accountId === lone.id);
    assert.equal(gap?.ruleId, "stakeholder-gap");
    assert.equal(gap?.reason, "The book knows no one.");
  });
});

// ═══ Pass 10: the face, rendered (A9.1 to A9.9, A9.20) ═════════════════════
// The page derives; src/app/groundwork/face.tsx and the Klaxon paint. These
// render what the server sends on first paint and read the markup. Type,
// colour, motion and placement inside the grid are the stylesheet's and stay
// outside a render's reach.

const faceItem = (over: Partial<QueueItem> = {}): QueueItem => ({
  accountId: "S0000000000000001",
  name: "On Stage",
  ruleId: "wire-trigger",
  weight: 88,
  band: "now",
  action: "Send the note about the news.",
  reason: "They made the wire July 29.",
  owed: "draft composed",
  carried: false,
  intent: null,
  ...over,
});
const faceWeek = {
  total: 0,
  byChannel: [],
  accounts: 0,
  replied: 0,
  neverMet: 0,
  goneCold: 0,
};
const faceDeck = {
  canWrite: true,
  wire: [] as WireItem[],
  wireCount: 0,
  wireAll: false,
  wireHref: "/groundwork?wire=all",
  wireAvailable: false,
  wireIsDue: false,
  inst: null,
  readout: {
    sections: [
      { title: "Where it stands", paragraphs: [{ text: "Six accounts are in motion." }] },
    ],
  },
  readoutPayload: "Six accounts are in motion.",
  lintIssues: [],
  readoutReadAt: undefined,
  idToName: (id: string) => id,
  wireWhen: () => "",
  monthDay: () => "",
};
const faceOf = async (over: Record<string, unknown> = {}) => {
  const { render } = await import("./helpers/room-render");
  const { GroundworkFace } = await import("../src/app/groundwork/face");
  return render(
    createElement(GroundworkFace, {
      nudge: false,
      done: [
        {
          name: "Worked One",
          at: "9:10 AM",
          sub: "EMAIL · STEP 1 · PAT E.",
          mk: "W1:wire-trigger",
          accountId: "W1",
        },
      ],
      canWrite: true,
      stage: { item: faceItem(), prox: "", body: null },
      waiting: [
        faceItem({
          accountId: "S2",
          name: "Behind",
          ruleId: "stakeholder-gap",
          action: "Find a second name.",
          reason: "One person carries everything.",
        }),
      ],
      rest: [],
      hrefOf: (q: { accountId: string }) => `/groundwork?focus=${q.accountId}`,
      deck: faceDeck,
      foot: { week: faceWeek, staleDropDays: null },
      ...over,
    }),
  );
};
/** The order the face's landmarks arrive in, by class. */
const landmarks = (html: string) =>
  [
    ...html.matchAll(
      /class="(klaxon[^"]*|wings|wing wingL|stage|wing wingR|ldeck|tallyfoot)"/g,
    ),
  ].map((m) => m[1].replace(/ kxLate|\s+$/g, ""));

describe("A9.20 · the winged stage under the Klaxon", () => {
  test("the Klaxon is the masthead; then the wings: done, the stage, waiting; then the deck and the foot", async () => {
    const html = await faceOf();
    assert.match(html, /^<main class="wrap"><div class="klaxon/);
    assert.deepEqual(landmarks(html), [
      "klaxon",
      "wings",
      "wing wingL",
      "stage",
      "wing wingR",
      "ldeck",
      "tallyfoot",
    ]);
  });
});

describe("A9.1 · one account center stage with an action line and a reason line", () => {
  test("the stage holds one account, its action line, then its reason line", async () => {
    const html = await faceOf();
    const stage = /<section class="stage">([\s\S]*?)<\/section>/.exec(html)?.[1] ?? "";
    const { textOf } = await import("./helpers/room-render");
    assert.equal((html.match(/<h1/g) ?? []).length, 1, "one action line on the page");
    assert.equal((stage.match(/class="stgName"/g) ?? []).length, 1, "one account");
    assert.match(stage, /href="\/accounts\?focus=S0000000000000001">On Stage<\/a>/);
    assert.match(
      stage,
      /<h1 class="stgAct">Send the note about the news\.<\/h1><p class="stgWhy">They made the wire July 29\.<\/p>/,
    );
    assert.doesNotMatch(textOf(stage), /Behind|Worked One/, "the wings keep their own");
  });

  test("a clear queue says so and stages no line", async () => {
    const html = await faceOf({ stage: null });
    assert.equal((html.match(/<h1/g) ?? []).length, 0);
    assert.match(html, /The queue is clear\./);
  });

  test("a carried move says it was left from yesterday", async () => {
    const html = await faceOf({
      stage: { item: faceItem({ carried: true }), prox: "", body: null },
    });
    assert.match(html, /left from yesterday[\s\S]*class="stgName"/);
  });
});

describe("A9.2 · a left wing holding the day's worked stamps", () => {
  test("today's stamps only, oldest first; yesterday's and the readout's stamp never reach the wing", () => {
    const stamps = new Map([
      ["groundwork:2026-07-30:A1:wire-trigger", "2026-07-30T16:00:00.000Z"],
      ["groundwork:2026-07-29:A2:seated", "2026-07-29T15:00:00.000Z"],
      ["groundwork:2026-07-30:A3:silence-bump", "2026-07-30T14:05:00.000Z"],
      ["groundwork:readout-read", "2026-07-30T13:00:00.000Z"],
      ["groundwork:2026-07-30:A4", "2026-07-30T13:30:00.000Z"],
    ]);
    assert.deepEqual(todaysStamps(stamps, "2026-07-30"), [
      {
        accountId: "A3",
        ruleKey: "silence-bump",
        mk: "A3:silence-bump",
        at: "2026-07-30T14:05:00.000Z",
      },
      {
        accountId: "A1",
        ruleKey: "wire-trigger",
        mk: "A1:wire-trigger",
        at: "2026-07-30T16:00:00.000Z",
      },
    ]);
  });

  test("the left wing paints every stamp with its name, time and subtext, and says so when empty", async () => {
    const { textOf } = await import("./helpers/room-render");
    const html = await faceOf();
    const wing =
      /<aside class="wing wingL"[^>]*>([\s\S]*?)<\/aside>/.exec(html)?.[1] ?? "";
    assert.match(
      textOf(wing),
      /^Done today ✓ Worked One 9:10 AM ↺ EMAIL · STEP 1 · PAT E\.$/,
    );
    const empty = await faceOf({ done: [] });
    const none =
      /<aside class="wing wingL"[^>]*>([\s\S]*?)<\/aside>/.exec(empty)?.[1] ?? "";
    assert.equal(textOf(none), "Done today Nothing worked yet.");
  });
});

describe("A9.3, A9.4 · the waiting wing, heat-mapped, each trigger beneath its name", () => {
  const waiting = [
    faceItem({
      accountId: "H1",
      name: "Burns",
      ruleId: "wire-trigger",
      reason: "They made the wire July 29.",
    }),
    faceItem({
      accountId: "H2",
      name: "Dated",
      ruleId: "silence-bump",
      reason: "No reply since July 20.",
    }),
    faceItem({
      accountId: "H3",
      name: "Keeps",
      ruleId: "stakeholder-gap",
      reason: "One person carries everything.",
    }),
    faceItem({
      accountId: "H4",
      name: "Carried",
      ruleId: "stakeholder-gap",
      reason: "The book knows no one.",
      carried: true,
    }),
  ];
  const wingOf = async () => {
    const { render } = await import("./helpers/room-render");
    const { WaitingWing } = await import("../src/app/groundwork/face");
    return render(
      createElement(WaitingWing, {
        waiting,
        rest: [
          faceItem({
            accountId: "R1",
            name: "Rest One",
            ruleId: "stakeholder-gap",
            reason: "The book knows no one.",
          }),
          faceItem({
            accountId: "R2",
            name: "Rest Two",
            ruleId: "stakeholder-gap",
            reason: "The book knows no one.",
          }),
        ],
        hrefOf: (q: { accountId: string }) => `/groundwork?focus=${q.accountId}`,
      }),
    );
  };

  test("the heat ladder: perishable signals burn, dated moves are this week, the rest keep; a carried move burns", () => {
    const heat = Object.fromEntries(
      (
        [
          "seated",
          "wire-trigger",
          "second-record-gem",
          "intent-warm",
          "riding-lane",
          "silence-bump",
          "roundup-slot",
          "engaged-never-introduced",
          "stale-above-gate",
          "cold-revival",
          "stakeholder-gap",
          "never-touched-incumbent",
        ] as const
      ).map((r) => [r, heatOf({ ruleId: r, carried: false })]),
    );
    assert.deepEqual(heat, {
      seated: 3,
      "wire-trigger": 3,
      "second-record-gem": 3,
      "intent-warm": 3,
      "riding-lane": 2,
      "silence-bump": 2,
      "roundup-slot": 2,
      "engaged-never-introduced": 2,
      "stale-above-gate": 1,
      "cold-revival": 1,
      "stakeholder-gap": 1,
      "never-touched-incumbent": 1,
    });
    assert.equal(heatOf({ ruleId: "stakeholder-gap", carried: true }), 3);
  });

  test("each name wears its heat on the name and the tick beside it", async () => {
    // The visible wing; the rest waits behind its fold (pinned below).
    const html = (await wingOf()).split("<details")[0];
    const rows = [
      ...html.matchAll(
        /<span class="wingNm (h\d)">([^<]*)<\/span><span class="tickHeat (tick\d)">/g,
      ),
    ].map((m) => [m[2], m[1], m[3]]);
    assert.deepEqual(rows, [
      ["Burns", "h3", "tick3"],
      ["Dated", "h2", "tick2"],
      ["Keeps", "h1", "tick1"],
      ["Carried", "h3", "tick3"],
    ]);
  });

  test("each name carries its trigger beneath it, and every row opens to the stage", async () => {
    const full = await wingOf();
    const html = full.split("<details")[0];
    const rows = [
      ...html.matchAll(/<a class="wingItem"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g),
    ];
    assert.equal(rows.length, 4);
    for (const [i, m] of rows.entries()) {
      assert.equal(m[1], `/groundwork?focus=${waiting[i].accountId}`);
      const body = m[2];
      assert.ok(body.indexOf(waiting[i].name) < body.indexOf('class="wingWhy"'), body);
      assert.match(
        body,
        new RegExp(
          `<span class="wingWhy">${waiting[i].reason.replace(/\./g, "\\.")}</span>$`,
        ),
      );
    }
    assert.match(full, /And 2 more that can wait\./);
  });

  test("And N more that can wait opens the rest in place, each a door to its stage (pass 10, the click-depth law)", async () => {
    const html = await wingOf();
    const fold =
      /<details class="wingMore"><summary class="wingFoot">And 2 more that can wait\.<\/summary>([\s\S]*)<\/details>/.exec(
        html,
      );
    assert.ok(fold, "the count opens nothing");
    const rest = [
      ...fold[1].matchAll(
        /<a class="wingItem"[^>]*href="([^"]*)"[^>]*>[\s\S]*?<span class="wingNm h1">([^<]*)<\/span>/g,
      ),
    ].map((m) => [m[1], m[2]]);
    assert.deepEqual(rest, [
      ["/groundwork?focus=R1", "Rest One"],
      ["/groundwork?focus=R2", "Rest Two"],
    ]);
    assert.ok(!/<details[^>]* open/.test(html), "the rest surfaced uninvited");
  });
});

describe("A9.5 to A9.8 · the Klaxon: the masthead, the burn bar, the last five minutes, the capsule", () => {
  // 15:00Z on 7/30 is 10:00 Chicago (CDT), the send band's midpoint.
  const at = (hhmm: string) => new Date(`2026-07-30T${hhmm}:00-05:00`);
  const paint = async (now: Date | null, wx = "") => {
    const { render } = await import("./helpers/room-render");
    const { KlaxonFace } = await import("../src/app/groundwork/instrument");
    return render(createElement(KlaxonFace, { reading: klaxonReading(now), wx }));
  };

  test("A9.5 · the band's serif verb leads the masthead and the count follows it", async () => {
    const html = await paint(at("10:00"));
    assert.match(
      html,
      /<div class="kxTop"><span class="kxVerb">Send\.<\/span><span class="kxCount">1:00:00<\/span><\/div>/,
    );
    assert.equal(klaxonReading(at("12:00")).verb, "Get on the phone.");
    assert.equal(klaxonReading(at("15:00")).verb, "Research and file.");
    assert.equal(klaxonReading(at("17:30")).verb, "The day is worked.");
  });

  test("A9.6 · the burn bar drains as the window empties, and waits full before the day", async () => {
    assert.equal(klaxonReading(at("09:00")).burnPct, 100);
    assert.equal(klaxonReading(at("10:00")).burnPct, 50);
    assert.equal(klaxonReading(at("10:59")).burnPct, 1);
    assert.equal(klaxonReading(at("12:30")).burnPct, 50);
    assert.equal(klaxonReading(at("08:00")).burnPct, 100);
    assert.match(
      await paint(at("10:00")),
      /<div class="kxBurn"><i style="width:50%"><\/i><\/div>/,
    );
  });

  test("A9.7 · inside the last five minutes the instrument turns late; never before the day or after it", async () => {
    assert.equal(klaxonReading(at("10:54")).late, false);
    assert.equal(klaxonReading(at("10:55")).late, true);
    assert.equal(klaxonReading(at("13:58")).late, true);
    assert.equal(
      klaxonReading(at("08:57")).late,
      false,
      "before the day the send band is next",
    );
    assert.equal(klaxonReading(at("17:30")).late, false);
    assert.match(await paint(at("10:56")), /^<div class="klaxon kxLate"/);
    assert.match(await paint(at("10:00")), /^<div class="klaxon "/);
  });

  test("A9.8 · the capsule facts ride the sub-row: Chicago clock, date, weather; no reading, no sky", async () => {
    const sub = (html: string) =>
      /<div class="kxSub">([\s\S]*?)<\/div>/.exec(html)?.[1] ?? "";
    const { textOf } = await import("./helpers/room-render");
    assert.equal(
      textOf(sub(await paint(at("10:56"), "71° fair"))),
      "THE SEND WINDOW · CLOSES 11:00 NEXT · THE PEOPLE WINDOW · 11:00–14:00 10:56:00 · AMERICA/CHICAGO · THU · JUL 30 · 71° FAIR",
    );
    assert.match(
      textOf(sub(await paint(at("10:56")))),
      /10:56:00 · AMERICA\/CHICAGO · THU · JUL 30$/,
    );
    assert.equal(
      textOf(sub(await paint(at("08:00")))),
      "NEXT · THE SEND WINDOW · OPENS 9:00 8:00:00 · AMERICA/CHICAGO · THU · JUL 30",
    );
    // The server's first paint has no clock: dashes, never a guessed time.
    assert.match(textOf(sub(await paint(null))), /—:——:—— · AMERICA\/CHICAGO · —$/);
  });
});

describe("A9.9 · the room keeps the lower deck: the wire, the institutions, State of play", () => {
  test("the three ribbons, in order, each over its own content", async () => {
    const { render, textOf } = await import("./helpers/room-render");
    const { LowerDeck } = await import("../src/app/groundwork/face");
    const html = await render(createElement(LowerDeck, faceDeck));
    const labels = [...html.matchAll(/<span class="ribbonLabel">([^<]*)<\/span>/g)].map(
      (m) => m[1],
    );
    assert.deepEqual(labels, ["Outside · the wire", "The institutions", "Standing by"]);
    const text = textOf(html);
    assert.match(text, /no sweep yet The wire watches the outside/);
    assert.match(text, /The institutions standing No institution on the calendar yet/);
    assert.match(
      text,
      /State of play ▾[\s\S]*Where it stands Six accounts are in motion\./,
    );
  });
});

// ── The MULTI count reads the widest source (the Ted doctrine; coordinator,
// pass 10) ──────────────────────────────────────────────────────────────────
// The HomeRoom row counts the larger of the record's filed people and the
// digest's thread roster (src/app/room/page.tsx). Groundwork's file counted
// the digest alone, so a room the record had filed and the digest never saw
// read as one person on Groundwork and as three on the HomeRoom.
describe("the working file's MULTI count is the HomeRoom's: filed people or the digest, whichever is larger", () => {
  const p = acct({ id: "M0000000000000001", name: "Many Hands" });
  const fileWith = (digest: string[], filed: string[]) =>
    buildFile(p, {
      queueItem: {
        accountId: p.id,
        name: p.name,
        ruleId: "silence-bump",
        weight: 72,
        band: "now",
        action: "Send the second touch.",
        reason: "No reply since July 21.",
        owed: "draft composed",
        carried: false,
        intent: null,
      },
      intel: intelWith({ threads: { people: digest, execSeen: false, opsSeen: false } }),
      intent: null,
      notes: [],
      touches: [],
      wire: [],
      contacts: [],
      filedPeople: filed.map((name) => ({ name })),
      now: NOW,
    });
  // The HomeRoom's rule, as src/app/room/page.tsx spells it.
  const roomCount = (digest: string[], filed: string[]) =>
    Math.max(filed.slice(0, 6).length, digest.length);

  test("three filed people and a digest of one: three, and no widening line", () => {
    const f = fileWith(["Pat Example"], ["Pat Example", "Dana Ellis", "Tom Harrison"]);
    assert.equal(f.threadCount, 3);
    assert.equal(f.singleThread, false);
    assert.ok(!f.composed.payload.endsWith(WIDENING_LINE));
  });

  test("a record-quiet deal with a known room reads the digest", () => {
    assert.equal(fileWith(["Pat Example", "Dana Ellis"], []).threadCount, 2);
  });

  test("the two surfaces agree on every case", () => {
    const cases: [string[], string[]][] = [
      [[], []],
      [["A"], []],
      [[], ["A"]],
      [["A"], ["A", "B"]],
      [["A", "B", "C"], ["A"]],
      [["A"], ["A", "B", "C", "D"]],
    ];
    for (const [digest, filed] of cases)
      assert.equal(
        fileWith(digest, filed).threadCount,
        roomCount(digest, filed),
        `${digest} · ${filed}`,
      );
  });
});

// ── pass 10: every count on Groundwork opens (the click-depth law) ─────────
// The wire's "N on file", "N flags for the reader", a stamp's count and the
// stale second record each open what they count, one click deep, and nothing
// deep surfaces uninvited.
describe("every count on Groundwork's face opens what it counts (pass 10, the click-depth law)", () => {
  const wireItem = (i: number): WireItem =>
    ({
      url: `https://news.example/${i}`,
      source: "Wire",
      at: `2026-07-2${i}T12:00:00Z`,
      headline: `Headline ${i}`,
      read: `Read ${i}.`,
      accountIds: [],
    }) as unknown as WireItem;
  const wire = [1, 2, 3, 4, 5].map(wireItem);

  test("the wire's count is a door: three show, the link opens every item and folds them back", async () => {
    const { render } = await import("./helpers/room-render");
    const { LowerDeck } = await import("../src/app/groundwork/face");
    const shut = await render(
      createElement(LowerDeck, {
        ...faceDeck,
        wire,
        wireCount: 5,
        wireHref: "/groundwork?wire=all",
      }),
    );
    assert.match(shut, /<a[^>]*href="\/groundwork\?wire=all"[^>]*>5 on file ▾<\/a>/);
    assert.equal([...shut.matchAll(/class="wireHead"/g)].length, 3);
    const open = await render(
      createElement(LowerDeck, {
        ...faceDeck,
        wire,
        wireCount: 5,
        wireAll: true,
        wireHref: "/groundwork",
      }),
    );
    assert.match(open, /<a[^>]*href="\/groundwork"[^>]*>5 on file ▴<\/a>/);
    assert.equal([...open.matchAll(/class="wireHead"/g)].length, 5);
    // Three or fewer is everything: no door to nothing.
    const few = await render(
      createElement(LowerDeck, { ...faceDeck, wire: wire.slice(0, 3), wireCount: 3 }),
    );
    assert.ok(!/on file ▾/.test(few));
    const page = readFileSync("src/app/groundwork/page.tsx", "utf8");
    assert.match(page, /const wireAll = wireParam === "all";/);
  });

  test("the flags for the reader open to each flag, said plainly, and money names no figure", async () => {
    const { render, textOf } = await import("./helpers/room-render");
    const { LowerDeck } = await import("../src/app/groundwork/face");
    const html = await render(
      createElement(LowerDeck, {
        ...faceDeck,
        lintIssues: [
          { kind: "banned-word", detail: "ICP" },
          { kind: "money", detail: "$40,000" },
        ],
      }),
    );
    assert.match(
      html,
      /<details class="ribbonCount flagFold"><summary>2 flags for the reader/,
    );
    assert.ok(!/<details[^>]* open/.test(html), "the flags surfaced uninvited");
    const text = textOf(html);
    assert.ok(text.includes('Trade shorthand: "ICP". Say it plainly.'));
    assert.ok(text.includes("A dollar figure. Take it out."));
    assert.ok(!text.includes("40,000"), "a figure rendered");
    const clean = await render(createElement(LowerDeck, faceDeck));
    assert.ok(!clean.includes("flags for the reader"));
    const page = readFileSync("src/app/groundwork/page.tsx", "utf8");
    assert.match(page, /const lintIssues = lint\(readoutPayload\);/);
  });

  test("a stamp's count opens its rows, folded on arrival; a stamp with nothing behind it is words", async () => {
    const { render, textOf } = await import("./helpers/room-render");
    const { DoneWing } = await import("../src/app/groundwork/face");
    const html = await render(
      createElement(DoneWing, {
        canWrite: false,
        done: [
          {
            name: "Opened One",
            at: "9:10 AM",
            sub: "OPENED THE FIRST CONVERSATION · 14 SUPPORT CASES",
            mk: "O1:engaged-never-introduced",
            accountId: "O1",
            opens: { lines: ["Payroll tax question", "W-2 reprint"] },
          },
          {
            name: "Plain One",
            at: "9:20 AM",
            sub: "EMAIL · STEP 1 · PAT E.",
            mk: "P1:wire-trigger",
            accountId: "P1",
          },
        ],
      }),
    );
    assert.match(
      html,
      /<details class="stampFold"><summary class="wingSub">OPENED THE FIRST CONVERSATION · 14 SUPPORT CASES ▸<\/summary>/,
    );
    assert.ok(textOf(html).includes("Payroll tax question"));
    assert.ok(!/<details[^>]* open/.test(html));
    assert.match(html, /<span class="wingSub">EMAIL · STEP 1 · PAT E\.<\/span>/);
  });

  test("the support count's door holds the account's support rows, newest first", async () => {
    const { supportCites } = await import("../src/lib/groundwork/chips");
    const rows = [
      stagedOf({ k: "s1", lane: "support", d: "2026-07-28", s: "Payroll tax question" }),
      stagedOf({ k: "h1", lane: "human", d: "2026-07-27", s: "Re: renewal" }),
      stagedOf({ k: "s2", lane: "support", d: "2026-07-20", s: "W-2 reprint" }),
    ];
    assert.deepEqual(
      supportCites(rows).map((c) => c.k),
      ["s1", "s2"],
    );
  });

  test("a stale second record is its own door, to the drop's receipt on the Intranet", async () => {
    const { render, textOf } = await import("./helpers/room-render");
    const { Tallyfoot } = await import("../src/app/groundwork/face");
    const html = await render(
      createElement(Tallyfoot, { week: faceWeek, staleDropDays: 9.4 }),
    );
    assert.match(
      html,
      /<a class="staleFoot" title="[^"]*" href="\/intranet#second-record">SECOND RECORD · 9 DAYS OLD/,
    );
    assert.match(html, /<a class="tallyDoor"[^>]*href="\/sendbook">/);
    assert.ok(
      textOf(html).startsWith("SECOND RECORD · 9 DAYS OLD · DROP THE FRESH EXPORT"),
    );
    // The anchor is the dock's own (a server face cannot import the client
    // module's constant, so the two are pinned equal here).
    const dock = readFileSync("src/app/activity/dock.tsx", "utf8");
    assert.match(dock, /export const DOCK_ANCHOR = "second-record";/);
    const fresh = await render(
      createElement(Tallyfoot, { week: faceWeek, staleDropDays: null }),
    );
    assert.ok(!fresh.includes("SECOND RECORD"));
  });
});

// ── pass 10: "verified cold on both records" reads both (the second record,
// C1; the Ted doctrine) ────────────────────────────────────────────────────
describe("the readout's verified cold is cold on both records (pass 10)", () => {
  test("an export-cold account with warmth on the operator's record is not counted cold", async () => {
    const { secondRecordStats } = await import("../src/lib/groundwork/readout");
    const cold = srOf({ rollup: rollupOf({}) });
    const warmByExport = srOf({
      rollup: rollupOf({
        lastHuman: {
          day: "2026-07-20",
          how: "Email",
          who: "Pat",
          kind: "account",
          subject: "Re: x",
        },
      }),
    });
    const second = new Map<string, SecondRecord>([
      ["A", cold],
      ["B", cold],
      ["C", warmByExport],
    ]);
    const reads = new Map([
      ["A", { warmth: { lastWarmAt: "" } }],
      ["B", { warmth: { lastWarmAt: "2026-07-25T15:00:00Z" } }],
    ]) as unknown as Parameters<typeof secondRecordStats>[2];
    assert.deepEqual(secondRecordStats(["A", "B", "C", "D"], second, reads, NOW), {
      active30: 1,
      verifiedCold: 1,
      activeIds: ["C"],
      coldIds: ["A"],
    });
    assert.equal(secondRecordStats(["A"], new Map(), reads, NOW), null);
    // The sentence says it flat, in two sentences.
    const src = readFileSync("src/lib/groundwork/readout.ts", "utf8");
    assert.match(
      src,
      /in the last thirty days\. \$\{inp\.secondRecord\.verifiedCold\} are verified cold on both records\./,
    );
  });
});

// ── pass 12 · A4.27: every count in the readout's book paragraph opens ─────
describe("the readout's counts open what they count (A4.27, the meat law)", () => {
  test("each count the sentence says carries a door to its names or its page; the words stay plain", () => {
    const a = acct({ id: "R1", name: "Alpha HR" });
    const b = acct({ id: "R2", name: "Bravo PEO" });
    const r = buildReadout({
      accounts: [a, b],
      queue: [],
      intelById: new Map(),
      intentById: new Map(),
      outreachAccountIds: new Set(["R2"]),
      partnerUpdatesSent: 2,
      partnerUpdatesReplied: 1,
      partnerUpdatesWho: [
        { name: "Lesha Cyphers", replied: true },
        { name: "Anika Steenstra", replied: false },
      ],
      secondRecord: { active30: 1, verifiedCold: 1, activeIds: ["R2"], coldIds: ["R1"] },
      now: NOW,
    });
    const book = r.sections.find((s) => s.title === "The rest of the book")!
      .paragraphs[0];
    const doors = Object.fromEntries(
      (book.doors ?? []).map((d) => [d.phrase, d.href ?? d.lines]),
    );
    const pm = /(\d+) of the (\d+) partner managers/.exec(book.text)!;
    assert.deepEqual(doors, {
      "2 PrismHR and PrismHCM customer accounts": "/accounts",
      "1 of the 2 have an open conversation": ["Bravo PEO"],
      [pm[0]]: ["Lesha Cyphers", "Anika Steenstra"],
      "1 replied": ["Lesha Cyphers"],
      "1 of the 2 saw human motion": ["Bravo PEO"],
      "1 are verified cold": ["Alpha HR"],
    });
    for (const d of book.doors ?? []) assert.ok(book.text.includes(d.phrase), d.phrase);
    // The text read to Russ carries no door markup.
    assert.ok(!/[<>]/.test(book.text));
  });

  test("a count with nothing behind it opens nothing", () => {
    const r = buildReadout({
      accounts: [acct({ id: "R1", name: "Alpha HR" })],
      queue: [],
      intelById: new Map(),
      intentById: new Map(),
      outreachAccountIds: new Set(),
      partnerUpdatesSent: 0,
      partnerUpdatesReplied: 0,
      now: NOW,
    });
    const book = r.sections.find((s) => s.title === "The rest of the book")!
      .paragraphs[0];
    assert.deepEqual(
      (book.doors ?? []).map((d) => d.phrase),
      ["1 PrismHR and PrismHCM customer accounts"],
    );
  });
});
