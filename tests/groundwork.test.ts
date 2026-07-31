// Groundwork — the pure builders under test. Fixtures only, no DB: the rules
// engine, the signal decay, the nudge, the wire matching, the lint, and the
// one-builder guarantee between the readout and the file's To-Russ tab.

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { buildQueue, currentBand, moveKey, QUEUE_CAP } from "../src/lib/groundwork/day";
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
    todos: [],
    contactCountById: () => 5,
    now: NOW,
  };

  test("a dated decision outranks a fresh intent reading on the same book", () => {
    const a = acct({ id: "A0000000000000001", name: "Decider" });
    const b = acct({ id: "B0000000000000001", name: "Warm" });
    const { items } = buildQueue({
      ...base,
      accounts: [a, b],
      intelById: new Map([
        [
          a.id,
          intelWith({
            timing: {
              value: { phrase: "decision", dateIso: "2026-08-04" },
              src: "t",
              at: "2026-07-28",
            },
          }),
        ],
      ]),
      notesById: new Map([
        [a.id, [{ body: "x", source: "sf", createdAt: "2026-07-28T12:00:00Z" }]],
        [
          b.id,
          [salesnavNote("high buyer intent · 11 activities", "2026-07-29T12:00:00Z")],
        ],
      ]),
    });
    assert.equal(items[0].name, "Decider");
    assert.equal(items[0].ruleId, "decision-window");
    const warm = items.find((i) => i.name === "Warm");
    assert.equal(warm?.ruleId, "intent-warm");
    assert.equal(warm?.band, "eleven");
  });

  test("strongest evidence per account wins — no account appears twice", () => {
    const a = acct({ id: "A0000000000000002", name: "Busy" });
    const { items } = buildQueue({
      ...base,
      accounts: [a],
      intelById: new Map([
        [
          a.id,
          intelWith({
            timing: {
              value: { phrase: "decision", dateIso: "2026-08-03" },
              src: "t",
              at: "2026-07-28",
            },
            lastInbound: "2026-07-29T12:00:00Z",
          }),
        ],
      ]),
      notesById: new Map([
        [a.id, [salesnavNote("high buyer intent", "2026-07-29T12:00:00Z")]],
      ]),
    });
    assert.equal(items.filter((i) => i.accountId === a.id).length, 1);
    assert.equal(items[0].ruleId, "decision-window");
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
      todos: [],
      contactCountById: () => 5,
      now: NOW,
    });
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
    assert.ok(file.russ.includes("August 6"));
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
      "decision-window",
      "reply-owed",
      "meeting-prep",
      "intent-warm",
      "riding-lane",
      "roundup-slot",
      "stale-above-gate",
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
    todos: [] as {
      accountId?: string | null;
      remindAt?: string | null;
      done?: boolean;
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
      ruleId: "decision-window",
      account: bare,
      intel: intelWith({}),
      intent: null,
      contactName: "",
      laneDate: null,
    });
    assert.ok(draft.to.includes("add before sending"));
    assert.ok(draft.payload.includes("Hi —"));
    const relay = composeFor({
      ruleId: "roundup-slot",
      account: bare,
      intel: intelWith({}),
      intent: null,
      contactName: "",
      laneDate: null,
    });
    assert.ok(relay.to.includes("route it with Aleks"));
  });

  test("an archived thread or a done reminder never asks for meeting prep", () => {
    const p = acct({ id: "P0000000000000001", name: "Prepped" });
    const closed = buildQueue({
      ...base,
      accounts: [p],
      touches: [
        {
          subjectKey: `outreach:${p.id}`,
          contactedAt: "2026-07-28T12:00:00Z",
          followUpAt: "2026-07-31T15:00:00Z",
          status: "archived",
        },
      ],
      todos: [{ accountId: p.id, remindAt: "2026-07-31T15:00:00Z", done: true }],
    });
    assert.equal(
      closed.items.some((i) => i.ruleId === "meeting-prep"),
      false,
    );
    const live = buildQueue({
      ...base,
      accounts: [p],
      touches: [
        {
          subjectKey: `outreach:${p.id}`,
          contactedAt: "2026-07-28T12:00:00Z",
          followUpAt: "2026-07-31T15:00:00Z",
          status: "awaiting",
        },
      ],
    });
    assert.equal(
      live.items.some((i) => i.ruleId === "meeting-prep"),
      true,
    );
  });

  test("a live partner thread suppresses the roundup slot; an archived stale one opens it", () => {
    const p = acct({ id: "P0000000000000002", name: "Rounder", csm: "Kim Bartolotti" });
    const live = buildQueue({
      ...base,
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
        ruleId: "reply-owed",
        weight: 90,
        band: "now",
        situation: "their message is the newest thing between you — answer first",
        owed: "reply owed",
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
          situation: "the book knows one person here",
          owed: "recipe ready",
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
