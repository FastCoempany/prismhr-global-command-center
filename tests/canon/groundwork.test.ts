// Canon pins for the Groundwork face (CLAUDE.md "Groundwork face", the
// rulings of 2026-09-25: C6 as amended 2026-10-05, C7, C8, C9, D22, D26,
// D27). Every test drives a pure builder with an input and asserts what comes
// back — never a string in a source file.

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
  bandAt,
  buildQueue,
  currentBand,
  liveMotionIds,
  QUEUE_RULE_IDS,
  RULE_SLOT_CAP,
  SEAT_SLOT_CAP,
  secondOnlyMotionIds,
} from "../../src/lib/groundwork/day";
import { stampSubtext, wingStamp } from "../../src/lib/groundwork/stamp";
import { readAccount } from "../../src/lib/record/read";
import type { Peo } from "../../src/lib/book";
import { EMPTY_INTEL, type DealIntel } from "../../src/lib/intel/types";

const NOW = new Date("2026-07-30T15:00:00Z"); // 10:00a Chicago, a Thursday
// A quarter past the book sweep — the book-wide research stamp is stale.
const STALE_BOOK = new Date("2026-10-15T15:00:00Z");

const acct = (over: Partial<Peo>): Peo => ({
  id: "TEST0000000000001",
  name: "Test Partner",
  cloud: "TST",
  csm: "Unassigned",
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

// Two real book ids whose demand clears the gate: the first is the stronger.
const STRONG = "001F000000w38ItIAI";
const WEAKER = "001F000000w38OIIAY";

const plainNote = { body: "note", source: "room", createdAt: "2026-07-29T12:00:00Z" };
const wireHit = "2026-07-29T12:00:00Z";
const seatOf = (act: string) => ({ act, term: "T", day: "2026-08-21" });

const base = {
  intelById: new Map<string, DealIntel>(),
  notesById: new Map<string, (typeof plainNote)[]>(),
  touches: [],
  contactCountById: () => 5,
  now: NOW,
};

describe("the two-slot cap governs rules; seats keep their own cap of three (C7)", () => {
  test("four seats: SEAT_SLOT_CAP lead, the fourth sinks below the next rule's hit", () => {
    const seatsIds = [
      "S0000000000000001",
      "S0000000000000002",
      "S0000000000000003",
      "S0000000000000004",
    ];
    const wire = acct({ id: "W0000000000000001", name: "Newsmaker" });
    const { all } = buildQueue({
      ...base,
      accounts: [...seatsIds.map((id, i) => acct({ id, name: `Seat ${i + 1}` })), wire],
      wireAtById: new Map([[wire.id, wireHit]]),
      seats: new Map(seatsIds.map((id, i) => [id, seatOf(`Move ${i + 1}.`)])),
    });
    const leading = all.slice(0, SEAT_SLOT_CAP);
    assert.ok(
      leading.every((q) => q.ruleId === "seated"),
      "the seats lead",
    );
    // The fourth seat sinks below the wire hit; it is kept, never dropped.
    assert.equal(all[SEAT_SLOT_CAP].ruleId, "wire-trigger");
    assert.equal(all[SEAT_SLOT_CAP + 1].ruleId, "seated");
    assert.equal(all.filter((q) => q.ruleId === "seated").length, 4);
  });

  test("three hits of one rule: RULE_SLOT_CAP lead, the third sinks below another rule", () => {
    const wires = ["W0000000000000001", "W0000000000000002", "W0000000000000003"].map(
      (id, i) => acct({ id, name: `News ${i + 1}` }),
    );
    const warm = acct({ id: "I0000000000000001", name: "Warm" });
    const { all } = buildQueue({
      ...base,
      accounts: [...wires, warm],
      notesById: new Map([
        [
          warm.id,
          [
            {
              body: "high buyer intent",
              source: "salesnav-ai",
              createdAt: "2026-07-29T12:00:00Z",
            },
          ],
        ],
      ]),
      wireAtById: new Map(wires.map((w) => [w.id, wireHit])),
    });
    const leadingWires = all.slice(0, RULE_SLOT_CAP);
    assert.ok(leadingWires.every((q) => q.ruleId === "wire-trigger"));
    assert.equal(all[RULE_SLOT_CAP].ruleId, "intent-warm");
    assert.equal(all[RULE_SLOT_CAP + 1].ruleId, "wire-trigger");
  });
});

describe("the exclusion reads both records (C6, amended 2026-10-05): a reply that landed org-side leaves the queue", () => {
  const id = "O0000000000000001";
  const org = acct({ id, name: "Answered Elsewhere" });
  const NOW_SEP = new Date("2026-09-25T15:00:00Z"); // 10:00a Chicago
  // Every rule's fuel, so "no item under any rule" means every rule: a seat,
  // a wire hit, a touch awaiting its bump, a High intent grab, an outreach gem.
  const everything = {
    ...base,
    now: NOW_SEP,
    accounts: [org],
    seats: new Map([[id, seatOf("Send the model.")]]),
    wireAtById: new Map([[id, "2026-09-24T12:00:00Z"]]),
    touches: [
      {
        subjectKey: `outreach:${id}`,
        contactedAt: "2026-09-10T12:00:00Z",
        followUpAt: "",
        status: "awaiting",
      },
    ],
    notesById: new Map([
      [
        id,
        [
          {
            body: "SALESNAV ACCOUNTS - captured 9/24 - 1 rows collected\nhigh buyer intent",
            source: "salesnav-ai",
            createdAt: "2026-09-24T12:00:00Z",
          },
        ],
      ],
    ]),
    secondById: new Map([
      [
        id,
        {
          rollup: null,
          support: null,
          intent: null,
          gems: [
            {
              dropSha: "d942e0f2",
              verdict: "CONFIRMED" as const,
              createdDay: "2026-09-24",
              actedDay: "",
              who: ["Tom Harrison"],
              whoKind: "account" as const,
              term: "CANADA ASK",
              what: "Tom asked about Canada",
              whenDay: "2026-09-22",
              signal: "asked",
              act: "Send the Canada one-pager.",
              reason: "Sep 22 reply asks about Canada.",
              cites: [],
            },
          ],
        },
      ],
    ]),
  };

  test("the fuel alone stages the account — the pin below is the exclusion's, not an empty queue's", () => {
    const { all } = buildQueue(everything);
    assert.ok(all.some((q) => q.accountId === id));
  });

  test("their mail to a colleague's inbox is a real inbound on the first record: excluded, no item under any rule", () => {
    const read = readAccount({
      account: { id, name: org.name, contacts: [] },
      notes: [
        {
          id: "m1",
          accountId: id,
          partner: "",
          kind: "account",
          lane: "mine",
          body: "✉ OL Sep 20 — Re: Canada · Tom Harrison → Anika Steenstra\nCan we talk about Canada next week?",
          actors: "Tom Harrison → Anika Steenstra",
          source: "outlook-ai",
          recipients: "Anika Steenstra",
          createdAt: "2026-09-20T15:00:00Z",
        },
      ],
      touches: [],
      todos: [],
      dispositions: new Map(),
      homeSide: ["Anika Steenstra"],
      now: NOW_SEP,
    });
    assert.equal(read.intel.lastInboundWho, "Tom Harrison", "the reply reached us");
    const excludedIds = liveMotionIds(new Map(), new Map([[id, read.intel]]), NOW_SEP);
    assert.ok(excludedIds.has(id), "in motion: excluded");
    const { all } = buildQueue({ ...everything, excludedIds });
    assert.deepEqual(
      all.filter((q) => q.accountId === id),
      [],
    );
    assert.equal(
      all.some((q) => /what they said|org-side/i.test(`${q.action} ${q.reason}`)),
      false,
      "no coordination move anywhere",
    );
  });

  test("the export's attributed inbound row is the same fact on the second record", () => {
    const second = new Map([
      [
        id,
        {
          rollup: {
            lastTheirs: { day: "2026-09-20", who: "Tom Harrison", subject: "Re: Canada" },
          },
        },
      ],
    ]);
    const excludedIds = liveMotionIds(new Map(), new Map(), NOW_SEP, second);
    assert.ok(excludedIds.has(id));
    const { all } = buildQueue({ ...everything, excludedIds });
    assert.deepEqual(
      all.filter((q) => q.accountId === id),
      [],
    );
    // The account-level datetime alone is not that fact (D19).
    const datetimeOnly = new Map([[id, { rollup: { lastTheirs: null } }]]);
    assert.equal(
      liveMotionIds(new Map(), new Map(), NOW_SEP, datetimeOnly).has(id),
      false,
    );
  });
});

describe("a seat follows its account (E6 + C8): an excluded account's seat leaves Groundwork", () => {
  test("a seat whose account is in excludedIds never seats", () => {
    const gone = acct({ id: "X0000000000000001", name: "Closing Deal" });
    const stays = acct({ id: "X0000000000000002", name: "Prospect" });
    const { all } = buildQueue({
      ...base,
      accounts: [gone, stays],
      seats: new Map([
        [gone.id, seatOf("Ask Russ about the follow-up.")],
        [stays.id, seatOf("Send the model.")],
      ]),
      excludedIds: new Set([gone.id]),
    });
    assert.equal(
      all.some((q) => q.accountId === gone.id),
      false,
      "nothing stages for the excluded account",
    );
    assert.equal(
      all
        .filter((q) => q.ruleId === "seated")
        .map((q) => q.accountId)
        .join(),
      stays.id,
    );
  });
});

describe("a seat on an account excluded only by the second record stays on the wing (C8 with pass 8 call 1)", () => {
  // The HomeRoom takes a row only for an exclusion resting on the operator's
  // own record; an exclusion resting only on the export's org-side inbound
  // adds no row (C6). A seat sent there would show nowhere, so it stays here.
  const NOW_SEP = new Date("2026-09-25T15:00:00Z");
  const id = "S0000000000000001";
  const org = acct({ id, name: "Answered In The Export" });
  const second = new Map([
    [
      id,
      {
        rollup: {
          lastTheirs: { day: "2026-09-20", who: "Tom Harrison", subject: "Re: Canada" },
        },
      },
    ],
  ]);

  test("the export alone excludes it, and only the export", () => {
    const only = secondOnlyMotionIds(new Map(), new Map(), NOW_SEP, second);
    assert.deepEqual([...only], [id]);
    // The same reply on the first record is the operator's own record: not second-only.
    const intel = new Map([[id, { lastInbound: "2026-09-20T15:00:00Z" }]]);
    assert.deepEqual([...secondOnlyMotionIds(new Map(), intel, NOW_SEP, second)], []);
  });

  test("the seat stays and leads; the account's rules stay out", () => {
    const { all } = buildQueue({
      ...base,
      now: NOW_SEP,
      accounts: [org],
      seats: new Map([[id, seatOf("Send the model.")]]),
      wireAtById: new Map([[id, "2026-09-24T12:00:00Z"]]),
      excludedIds: new Set([id]),
      seatStaysIds: new Set([id]),
    });
    assert.deepEqual(
      all.filter((q) => q.accountId === id).map((q) => q.ruleId),
      ["seated"],
    );
  });

  test("an exclusion the HomeRoom takes still sends the seat there", () => {
    const { all } = buildQueue({
      ...base,
      now: NOW_SEP,
      accounts: [org],
      seats: new Map([[id, seatOf("Send the model.")]]),
      excludedIds: new Set([id]),
    });
    assert.deepEqual(
      all.filter((q) => q.accountId === id),
      [],
    );
  });
});

// The fixture's accounts are on the platform and high-fit, so an account
// with no record fires never-touched-incumbent on its own. A plain note
// silences that; the contact count then decides whether the account is FREE
// (five names, no rule fires) or BUSY (one name: stakeholder-gap, 55 — weaker
// than either vehicle, so a collision would swallow it).
const busyIds = new Set<string>();
const withNote = (...ids: string[]) => new Map(ids.map((id) => [id, [plainNote]]));
const contacts = (id: string) => (busyIds.has(id) ? 1 : 5);

describe("a vehicle never collides (D22)", () => {
  test("the research stamp drops for the day when every eligible account has its own move", () => {
    busyIds.clear();
    busyIds.add(STRONG).add(WEAKER);
    const { all } = buildQueue({
      ...base,
      now: STALE_BOOK,
      contactCountById: contacts,
      notesById: withNote(STRONG, WEAKER),
      accounts: [
        acct({ id: STRONG, name: "Big Demand" }),
        acct({ id: WEAKER, name: "Also Demand" }),
      ],
    });
    assert.equal(
      all.some((q) => q.action === "Run the research pass."),
      false,
      "no research vehicle rides an occupied account",
    );
    assert.deepEqual(
      all.map((q) => q.ruleId),
      ["stakeholder-gap", "stakeholder-gap"],
    );
  });

  test("the roundup slot rides the one free account on the roster, never an occupied one", () => {
    const busy = acct({ id: "R0000000000000001", name: "Busy", csm: "Kim Bartolotti" });
    const free = acct({ id: "R0000000000000002", name: "Free", csm: "Kim Bartolotti" });
    busyIds.clear();
    busyIds.add(busy.id);
    const { all } = buildQueue({
      ...base,
      contactCountById: contacts,
      notesById: withNote(busy.id, free.id),
      accounts: [busy, free],
    });
    const slot = all.find((q) => q.ruleId === "roundup-slot");
    assert.equal(slot?.accountId, free.id);
    assert.equal(all.find((q) => q.accountId === busy.id)?.ruleId, "stakeholder-gap");
  });

  test("the roundup slot drops for the day when the whole roster is occupied", () => {
    const busy = acct({ id: "R0000000000000001", name: "Busy", csm: "Kim Bartolotti" });
    busyIds.clear();
    busyIds.add(busy.id);
    const { all } = buildQueue({
      ...base,
      contactCountById: contacts,
      notesById: withNote(busy.id),
      accounts: [busy],
    });
    assert.equal(
      all.some((q) => q.ruleId === "roundup-slot"),
      false,
    );
    assert.deepEqual(
      all.map((q) => q.ruleId),
      ["stakeholder-gap"],
    );
  });

  test("a seated account is never the research bearer — the bearer is chosen after the seats", () => {
    busyIds.clear();
    const { all } = buildQueue({
      ...base,
      now: STALE_BOOK,
      contactCountById: contacts,
      notesById: withNote(STRONG, WEAKER),
      accounts: [
        acct({ id: STRONG, name: "Big Demand" }),
        acct({ id: WEAKER, name: "Also Demand" }),
      ],
      seats: new Map([[STRONG, seatOf("Ask Russ about the follow-up.")]]),
    });
    const research = all.find((q) => q.action === "Run the research pass.");
    assert.equal(research?.accountId, WEAKER, "the stamp rides the free account");
    assert.equal(all.find((q) => q.accountId === STRONG)?.ruleId, "seated");
  });
});

describe("the research bearer is the strongest above-gate account with no candidate of its own (C9)", () => {
  test("the strongest account has its own move; the stamp rides the weaker free one", () => {
    busyIds.clear();
    busyIds.add(STRONG);
    const { all } = buildQueue({
      ...base,
      now: STALE_BOOK,
      contactCountById: contacts,
      notesById: withNote(STRONG, WEAKER),
      accounts: [
        acct({ id: STRONG, name: "Big Demand" }),
        acct({ id: WEAKER, name: "Also Demand" }),
      ],
    });
    const research = all.filter((q) => q.action === "Run the research pass.");
    assert.equal(research.length, 1, "one move for the whole book");
    assert.equal(research[0].accountId, WEAKER);
    assert.equal(all.find((q) => q.accountId === STRONG)?.ruleId, "stakeholder-gap");
  });

  test("with every bearer free, the strongest carries it", () => {
    busyIds.clear();
    const { all } = buildQueue({
      ...base,
      now: STALE_BOOK,
      contactCountById: contacts,
      notesById: withNote(STRONG, WEAKER),
      accounts: [
        acct({ id: WEAKER, name: "Also Demand" }),
        acct({ id: STRONG, name: "Big Demand" }),
      ],
    });
    const research = all.filter((q) => q.action === "Run the research pass.");
    assert.equal(research.length, 1);
    assert.equal(research[0].accountId, STRONG);
  });
});

describe("one band table (D26): sends 9–11, people 11–14, research from 14, Chicago", () => {
  test("8:00 Chicago is not the live send band; 10:00 is sends; 12:30 is people; 15:00 is research", () => {
    // 2026-07-30 is CDT (UTC-5).
    assert.equal(currentBand(new Date("2026-07-30T13:00:00Z")), null); // 8:00a CT
    assert.equal(currentBand(new Date("2026-07-30T15:00:00Z")), "now"); // 10:00a CT
    assert.equal(currentBand(new Date("2026-07-30T17:30:00Z")), "eleven"); // 12:30p CT
    assert.equal(currentBand(new Date("2026-07-30T20:00:00Z")), "two"); // 3:00p CT
  });

  test("the band edges, minute by minute", () => {
    assert.equal(bandAt(8 * 60 + 59), null);
    assert.equal(bandAt(9 * 60), "now");
    assert.equal(bandAt(10 * 60 + 59), "now");
    assert.equal(bandAt(11 * 60), "eleven");
    assert.equal(bandAt(13 * 60 + 59), "eleven");
    assert.equal(bandAt(14 * 60), "two");
    // Research and filing runs from 14:00 on — the evening is still that band.
    assert.equal(bandAt(18 * 60), "two");
  });

  test("winter time reads the same wall clock (CST)", () => {
    // 2026-01-15 is CST (UTC-6): 8:30a CT is 14:30Z, 9:30a CT is 15:30Z.
    assert.equal(currentBand(new Date("2026-01-15T14:30:00Z")), null);
    assert.equal(currentBand(new Date("2026-01-15T15:30:00Z")), "now");
  });
});

describe("no rule stamps with an empty label (D27)", () => {
  test("every rule the queue can fire has a non-empty subtext with nothing specific to say", () => {
    for (const id of QUEUE_RULE_IDS) {
      const sub = stampSubtext(id, {});
      assert.ok(sub.trim().length > 0, `${id} stamps mutely`);
    }
  });

  test("the three once-silent rules say what was done: the seat, the gem, the first conversation", () => {
    // Decided 2026-10-06: past tense, then the specific, like every stamp.
    assert.equal(
      stampSubtext("seated", { seatDay: "2026-08-20" }),
      "WORKED THE MOVE FROM THE SHEET · SEATED 8/20",
    );
    assert.equal(stampSubtext("seated", {}), "WORKED THE MOVE FROM THE SHEET");
    assert.equal(
      stampSubtext("second-record-gem", { gemTerm: "phr stall", gemWho: "Adam Bell" }),
      "ACTED ON ADAM’S PHR STALL",
    );
    assert.equal(
      stampSubtext("second-record-gem", { gemTerm: "phr stall" }),
      "ACTED ON THEIR PHR STALL",
    );
    assert.equal(stampSubtext("second-record-gem", {}), "ACTED ON THEIR LATEST ACTIVITY");
    assert.equal(
      stampSubtext("engaged-never-introduced", { supportCases: 14 }),
      "OPENED THE FIRST CONVERSATION · 14 SUPPORT CASES",
    );
    assert.equal(
      stampSubtext("engaged-never-introduced", {}),
      "OPENED THE FIRST CONVERSATION",
    );
  });

  test("no stamp is a bare noun: each opens on what the operator did", () => {
    const VERB =
      /^(SENT|NUDGED|REVIVED|BRIEFED|REFRESHED|RAN|DUG|ASKED|WORKED|ACTED|OPENED)\b/;
    for (const id of QUEUE_RULE_IDS) {
      const sub = stampSubtext(id, {});
      assert.match(sub, VERB, `${id} stamps ${sub}`);
    }
  });

  test("a rule the table does not know still speaks its own label", () => {
    assert.equal(stampSubtext("some-new-rule", {}), "SOME NEW RULE");
    assert.ok(stampSubtext("", {}).length > 0);
  });
});

// The stamp words' own clause (ship order 2026-10-06): "A filed touch's
// channel line (EMAIL · STEP 1 · CRISTINA B., the Sendbook) still leads the
// stamp when there is one." The choice lived in page code with no pin.
describe("a filed touch's channel line leads the stamp; else the rule's words (D27)", () => {
  test("a channel line leads, whatever the rule would say", () => {
    assert.equal(
      wingStamp({ channel: "EMAIL", step: 1, contact: "Cristina Bell" }, "silence-bump", {
        threadSubject: "Mexico census",
      }),
      "EMAIL · STEP 1 · CRISTINA B.",
    );
    assert.equal(
      wingStamp({ channel: "CALL", step: 2, contact: "" }, "seated", {
        seatDay: "2026-10-06",
      }),
      "CALL · STEP 2",
    );
  });

  test("no filed touch: the rule's own stamp speaks", () => {
    assert.equal(
      wingStamp(undefined, "seated", { seatDay: "2026-10-06" }),
      "WORKED THE MOVE FROM THE SHEET · SEATED 10/6",
    );
    assert.equal(wingStamp(null, "some-new-rule", {}), "SOME NEW RULE");
  });

  test("the rule's facts are read only when the channel line is silent", () => {
    let read = 0;
    const ctx = () => {
      read += 1;
      return { seatDay: "2026-10-06" };
    };
    wingStamp({ channel: "EMAIL", step: 1, contact: "Cristina Bell" }, "seated", ctx);
    assert.equal(read, 0);
    assert.equal(
      wingStamp(undefined, "seated", ctx),
      "WORKED THE MOVE FROM THE SHEET · SEATED 10/6",
    );
    assert.equal(read, 1);
  });
});

// ── A9.10 · Groundwork is outbound only (CLAUDE.md "Groundwork face") ──────
// "Groundwork is outbound only — activities the operator initiates today to
// build pipeline; reactive account motion (replies owed, decision windows,
// meeting prep) belongs to the HomeRoom." Every rule the queue can fire is
// fired below, one account per rule, and each move it stages is checked; then
// each kind of reactive motion is handed in and shown to stage nothing.
describe("Groundwork is outbound only: no rule stages a reactive move (A9.10)", () => {
  // The action line is the move; the reason may name our own unanswered send
  // ("No reply since …"), which is the drumbeat's trigger and outbound.
  const REACTIVE =
    /\b(reply|replies|respond|answer|prep|prepare|recap|decision|decide|meeting)\b/i;
  // The verbs the rules' own lines open on: each starts motion the operator
  // initiates. A seat's line is the operator's own act from the sheet, and a
  // gem's line is the verified act the harness filed; both pass through.
  const OUTBOUND = /^(Send|Open|Ask|Revive|Refresh|Run|Find|Brief)\b/;
  const ids = {
    seat: "R0000000000000001",
    wire: "R0000000000000002",
    intent: "R0000000000000003",
    gem: "R0000000000000004",
    lane: "R0000000000000005",
    bump: "R0000000000000006",
    cold: "R0000000000000007",
    gap: "R0000000000000008",
    eni: "R0000000000000009",
    fresh: "R0000000000000010",
    roster: "R0000000000000011",
  };
  const AT = STALE_BOOK; // 2026-10-15, a quarter past the book sweep
  const day = (d: string) => `${d}T12:00:00Z`;
  const touch = (id: string, contactedAt: string, status: string) => ({
    subjectKey: `outreach:${id}`,
    contactedAt,
    followUpAt: "",
    status,
  });
  const gem = {
    dropSha: "d942e0f2",
    verdict: "CONFIRMED" as const,
    createdDay: "2026-10-13",
    actedDay: "",
    who: ["Tom Harrison"],
    whoKind: "account" as const,
    term: "CANADA ASK",
    what: "Tom asked about Canada",
    whenDay: "2026-09-10",
    signal: "asked",
    act: "Send the Canada one-pager.",
    reason: "Sep 10 note asks about Canada.",
    cites: [],
  };
  const fuel = {
    intelById: new Map<string, DealIntel>(),
    contactCountById: (id: string) => (id === ids.gap ? 1 : 5),
    now: AT,
    accounts: [
      ...Object.values(ids).map((id) =>
        acct({
          id,
          name: `Rule ${id.slice(-2)}`,
          // Only the free roster account is a high-fit incumbent with no
          // record, so never-touched-incumbent fires there and nowhere else.
          fitTier: id === ids.fresh ? "high" : "low",
          csm: id === ids.roster ? "Lesha Cyphers" : "Unassigned",
        }),
      ),
      acct({ id: STRONG, name: "Strong Demand", fitTier: "low" }),
      acct({ id: WEAKER, name: "Weaker Demand", fitTier: "low" }),
    ],
    seats: new Map([[ids.seat, seatOf("Send the model.")]]),
    wireAtById: new Map([[ids.wire, day("2026-10-14")]]),
    // STRONG's own pass is older than the sweep, so its age reads from the
    // sweep and is stale; WEAKER has no pass of its own and bears the book.
    researchAtById: new Map([[STRONG, day("2026-04-01")]]),
    researchSignalsById: new Map([[STRONG, 2]]),
    notesById: new Map([
      [
        ids.intent,
        [
          {
            body: "high buyer intent · 11 activities",
            source: "salesnav-ai",
            createdAt: day("2026-10-14"),
          },
        ],
      ],
      [
        ids.lane,
        [
          {
            body: "Amplify: ClearCo 10/20/2026",
            source: "salesnav-ai",
            createdAt: day("2026-10-14"),
          },
        ],
      ],
      [ids.gap, [{ body: "note", source: "room", createdAt: day("2026-10-01") }]],
      [STRONG, [{ body: "note", source: "room", createdAt: day("2026-10-01") }]],
      [WEAKER, [{ body: "note", source: "room", createdAt: day("2026-10-01") }]],
    ]),
    touches: [
      touch(ids.bump, day("2026-10-05"), "awaiting"),
      touch(ids.cold, day("2026-07-01"), "archived"),
    ],
    secondById: new Map([
      [ids.gem, { rollup: null, support: null, intent: null, gems: [gem] }],
      [
        ids.eni,
        {
          rollup: null,
          gems: [],
          intent: null,
          support: {
            dropSha: "x",
            total: 40,
            spike: null,
            themes: [
              {
                label: "Update Provided",
                n: 20,
                firstDay: "2026-09-01",
                lastDay: "2026-10-12",
                examples: [],
              },
            ],
          },
        },
      ],
    ]),
  };

  test("every rule fires on the fixture, and each move it stages is outbound", () => {
    const { all } = buildQueue(fuel as never);
    const fired = new Set(all.map((q) => q.ruleId));
    for (const r of QUEUE_RULE_IDS) assert.ok(fired.has(r), `${r} never fired`);
    for (const q of all) {
      assert.doesNotMatch(q.action, REACTIVE, `${q.ruleId}: ${q.action}`);
      if (q.ruleId === "seated" || q.ruleId === "second-record-gem") continue;
      assert.match(q.action, OUTBOUND, `${q.ruleId}: ${q.action}`);
    }
  });

  // The writing canon, rules 2, 5 and 6 (pass 10, A12.2 and A12.6 on the
  // queue): every rule's action and reason line, as the stage paints them,
  // keeps each sentence to six words or fewer, carries no dash aside and no
  // parenthetical, and the action names no deadline.
  test("every rule's action and reason line: six words a sentence, no aside, no deadline in the action", () => {
    const { all } = buildQueue(fuel as never);
    const sentences = (t: string) =>
      t
        .split(/(?<=[.?!])\s+/)
        .map((x) => x.trim())
        .filter(Boolean);
    for (const q of all)
      for (const [which, line] of [
        ["action", q.action],
        ["reason", q.reason],
      ] as const) {
        assert.ok(line.trim().length > 0, `${q.ruleId}: an empty ${which}`);
        for (const x of sentences(line))
          assert.ok(
            x.split(/\s+/).length <= 6,
            `${q.ruleId}: ${which} over six words: "${x}"`,
          );
        assert.doesNotMatch(line, / — |\(/, `${q.ruleId}: ${which} aside: "${line}"`);
        if (which === "action")
          assert.doesNotMatch(
            line,
            /\b(by|before|until)\s+(mon|tue|wed|thu|fri|sat|sun|today|tomorrow|end of|\d)/i,
            `${q.ruleId}: a deadline in the action: "${line}"`,
          );
      }
  });

  test("a reply owed stages nothing: the account leaves the queue, and the drumbeat falls silent", () => {
    const id = ids.bump;
    // Their reply after our send: the read says it is our move.
    const intel = {
      ...EMPTY_INTEL,
      lastInbound: day("2026-10-12"),
      lastInboundWho: "Tom Harrison",
    };
    const excludedIds = liveMotionIds(new Map(), new Map([[id, intel]]), AT);
    assert.ok(excludedIds.has(id));
    const { all } = buildQueue({ ...fuel, excludedIds } as never);
    assert.deepEqual(
      all.filter((q) => q.accountId === id),
      [],
    );
    // And with the board lagging and no exclusion handed in, the answered
    // thread still bumps nothing: the reply is the HomeRoom's motion.
    const unexcluded = buildQueue({
      ...fuel,
      intelById: new Map([[id, intel]]),
      moveById: new Map([
        [
          id,
          { whose: "you", since: day("2026-10-12"), who: "Tom Harrison", rung: "reply" },
        ],
      ]),
    } as never).all.filter((q) => q.accountId === id);
    assert.deepEqual(
      unexcluded.filter(
        (q) => q.ruleId === "silence-bump" || q.ruleId === "cold-revival",
      ),
      [],
    );
    for (const q of unexcluded) assert.doesNotMatch(q.action, REACTIVE);
  });

  test("a decision window changes nothing on the queue: no rule reads it", () => {
    const id = ids.fresh;
    const plain = buildQueue(fuel as never).all;
    const dated = buildQueue({
      ...fuel,
      intelById: new Map([
        [
          id,
          {
            ...EMPTY_INTEL,
            timing: {
              value: { phrase: "deciding next Friday", dateIso: "2026-10-23" },
              src: "note 10/12",
              at: day("2026-10-12"),
            },
          },
        ],
      ]),
    } as never).all;
    assert.deepEqual(dated, plain);
  });

  test("a meeting held leaves the queue; a meeting booked bumps nothing and stages no prep", () => {
    const id = ids.bump;
    const met = new Map([
      [
        id,
        [
          {
            body: "Met with Tom Harrison about Canada.",
            source: "room",
            createdAt: day("2026-10-12"),
          },
        ],
      ],
    ]);
    assert.ok(
      liveMotionIds(met, new Map(), AT).has(id),
      "a meeting filed inside 14 days excludes",
    );
    const booked = buildQueue({
      ...fuel,
      moveById: new Map([
        [
          id,
          {
            whose: "booked",
            since: day("2026-10-13"),
            who: "Tom Harrison",
            rung: "acceptance",
          },
        ],
      ]),
    } as never).all.filter((q) => q.accountId === id);
    assert.deepEqual(
      booked.filter((q) => q.ruleId === "silence-bump"),
      [],
    );
    for (const q of booked) assert.doesNotMatch(q.action, REACTIVE);
  });
});
