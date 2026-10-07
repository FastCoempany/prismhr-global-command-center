// Groundwork — the pure builders under test. Fixtures only, no DB: the rules
// engine, the signal decay, the nudge, the wire matching, the lint, and the
// one-builder guarantee between the readout and the file's To-Russ tab.

import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { createElement } from "react";
import { buildQueue, currentBand, moveKey, QUEUE_CAP } from "../src/lib/groundwork/day";
import { stampSubtext } from "../src/lib/groundwork/stamp";
import {
  chipGems,
  collisionCite,
  csmPrepRows,
  prepKicker,
  spikeCites,
} from "../src/lib/groundwork/chips";
import { seatWorked, tapOfStamp } from "../src/lib/groundwork/worked";
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
      csmPrepRows(rows, "Lesha Cyphers").map((c) => c.k),
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
    const page = readFileSync("src/app/groundwork/page.tsx", "utf8");
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
