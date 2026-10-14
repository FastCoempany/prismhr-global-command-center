// Sales Navigator people and intent signals (2026-10-14): the accounts
// list's intent cell and its "Recently hired" lead badge, the change in a
// reading since an earlier day's grab, the Home tab's alerts feed, and the
// two Groundwork rules they feed (post-trigger, new-in-seat). The row and
// alert shapes are the ones in the operator's own instance (the
// salesnavscreenshots release, 2026-07-30).

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
  cleanName,
  grabKind,
  intentFor,
  intentReadDue,
  intentRise,
  parseAlerts,
  parseIntent,
  parseRecentlyHired,
  peopleSignalsFor,
  relativeDays,
} from "../src/lib/groundwork/signals";
import { buildQueue } from "../src/lib/groundwork/day";
import { composeFor } from "../src/lib/groundwork/compose";
import { stampSubtext } from "../src/lib/groundwork/stamp";
import { planGrab } from "../src/lib/ingest/grab";
import type { Peo } from "../src/lib/book";
import type { DealIntel } from "../src/lib/intel/types";

const NOW = new Date("2026-10-14T15:00:00Z"); // 10:00a Chicago, a Wednesday
const day = (d: string) => `${d}T14:00:00Z`;

const acct = (over: Partial<Peo>): Peo => ({
  id: "TEST0000000000001",
  name: "Test Partner",
  cloud: "TST",
  csm: "Unassigned",
  contactName: "Pat Example",
  contactEmail: "pat@example.com",
  size: 500,
  sizeBucket: "Small",
  industry: "PEO/ASO",
  city: "Chicago",
  state: "IL",
  website: "example.com",
  lastActivity: "2026-07-01",
  fit: 40,
  fitTier: "low",
  ...over,
});

const note = (body: string, createdAt: string) => ({
  body,
  source: "salesnav",
  createdAt,
});

// One accounts-list row as the grab reads it, in the screenshot's columns:
// company, opportunity, connection paths, buyer intent, category intent,
// alerts, notes, lead recommendation.
const ARMHR_ROW = [
  "SALESNAV ACCOUNTS - captured 10/14/2026, 9:05:00 AM - 118 rows collected",
  "",
  "Armhr",
  "CRM",
  "Human Resources Services",
  "7/31/2026",
  "ArmHR- Empower",
  "16",
  "of 41",
  "High",
  "1 activity",
  "None",
  "None",
  "Add note",
  "Deborah Dhuy",
  "· 3rd",
  "! CRM",
  "Director of Project Services",
  "Account has high buyer intent",
  "Recently hired",
  "1+",
].join("\n");

const ALERTS = [
  "SALESNAV ALERTS - captured 10/14/2026, 9:20:00 AM - 3 alerts",
  "",
  "Lead: Allie Menz shared a post",
  "AlphaStaffHCM · Head of Client Operations",
  "2 days",
  "Clients keep asking how to hire in Mexico without an entity…",
  "",
  "----",
  "",
  "Gordon J. Maier & Company, LLP posted a new photo.",
  "Accounting · 80 employees on LinkedIn",
  "1 day",
  "",
  "----",
  "",
  "Suggested account: Rivian is preparing for growth, job openings have accelerated in the past 90 days.",
  "Motor Vehicle Manufacturing · 12K+ employees on LinkedIn",
  "2 days",
].join("\n");

describe("the intent cell", () => {
  test("the level on its own line, the activity count beneath it", () => {
    assert.deepEqual(parseIntent("Amplify HR Management\nHigh\n11 activities"), {
      level: "high",
      activities: 11,
    });
    assert.deepEqual(parseIntent("AscendHR\nModerate\n2 activities"), {
      level: "moderate",
      activities: 2,
    });
  });

  test("a Neutral or Low cell is a reading of no intent, whatever a badge says", () => {
    assert.equal(parseIntent("Anthros Inc.\nNeutral\n0 activities"), null);
    assert.equal(
      parseIntent("X\nLow\n0 activities\nSomeone\nAccount has high buyer intent"),
      null,
    );
  });

  test("Sales Navigator's own sentence still reads where no cell exists", () => {
    assert.deepEqual(
      parseIntent("My HR Pros is now expressing High buyer intent in your company."),
      { level: "high", activities: null },
    );
  });
});

describe("three grabs, one source", () => {
  test("the head tells them apart; a headless note is an accounts read", () => {
    assert.equal(grabKind(ARMHR_ROW), "accounts");
    assert.equal(grabKind(ALERTS), "alerts");
    assert.equal(
      grabKind("SALESNAV PEOPLE - captured 10/14/2026 - Armhr - 4 people"),
      "people",
    );
    assert.equal(grabKind("High buyer intent"), "accounts");
  });

  test("a newer alerts note never kills the intent reading", () => {
    const notes = [
      note(ALERTS, day("2026-10-14")),
      note("Amplify\nHigh\n11 activities", day("2026-10-13")),
    ];
    assert.equal(intentFor(notes, NOW)?.level, "high");
  });

  test("only an accounts grab quiets the daily nudge", () => {
    const alertsOnly = new Map([["A", [note(ALERTS, day("2026-10-14"))]]]);
    assert.equal(intentReadDue(alertsOnly, NOW), true);
  });
});

describe("the change in a reading", () => {
  test("Moderate yesterday, High today: a rise", () => {
    const rise = intentRise(
      [
        note("A\nHigh\n4 activities", day("2026-10-14")),
        note("A\nModerate\n3 activities", day("2026-10-13")),
      ],
      NOW,
    );
    assert.equal(rise?.from, "moderate");
    assert.equal(rise?.to, "high");
  });

  test("the same level with three or more new activities: a rise", () => {
    const rise = intentRise(
      [
        note("A\nHigh\n11 activities", day("2026-10-14")),
        note("A\nHigh\n3 activities", day("2026-10-13")),
      ],
      NOW,
    );
    assert.equal(rise?.toActivities, 11);
  });

  test("a standing High, a same-day re-copy, or a month-old comparison: no rise", () => {
    assert.equal(
      intentRise(
        [
          note("A\nHigh\n4 activities", day("2026-10-14")),
          note("A\nHigh\n3 activities", day("2026-10-13")),
        ],
        NOW,
      ),
      null,
    );
    assert.equal(
      intentRise(
        [
          note("A\nHigh\n9 activities", day("2026-10-14")),
          note("A\nModerate\n1 activity", "2026-10-14T13:00:00Z"),
        ],
        NOW,
      ),
      null,
    );
    assert.equal(
      intentRise(
        [
          note("A\nHigh\n9 activities", day("2026-10-14")),
          note("A\nNeutral\n0 activities", day("2026-09-10")),
        ],
        NOW,
      ),
      null,
    );
  });
});

describe("the Recently hired badge", () => {
  test("names the lead above the badge and the title beneath the name", () => {
    assert.deepEqual(parseRecentlyHired(ARMHR_ROW), {
      name: "Deborah Dhuy",
      title: "Director of Project Services",
    });
  });

  test("reads a degree on the name's own line too", () => {
    assert.deepEqual(
      parseRecentlyHired(
        "Deborah Dhuy · 3rd\nCRM\nDirector of Project Services\nRecently hired",
      ),
      { name: "Deborah Dhuy", title: "Director of Project Services" },
    );
  });

  test("no badge, no reading", () => {
    assert.equal(
      parseRecentlyHired("Allie Menz\n· 3rd\nCRM\nHead of Client Operations"),
      null,
    );
  });

  test("names are used as given, cleaned only of credentials and truncation", () => {
    assert.equal(cleanName("Andrea R. Vest, SHRM-SCP, SPHR,..."), "Andrea R. Vest");
    assert.equal(cleanName("Rebecca Stone"), "Rebecca Stone");
    assert.equal(cleanName("Human Resources Services"), "Human Resources Services");
    assert.equal(cleanName("None"), "");
  });
});

describe("the alerts feed", () => {
  test("a lead's post reads with company, title, the day it happened and its opening words", () => {
    const [post, ...rest] = parseAlerts(ALERTS, day("2026-10-14"));
    assert.equal(rest.length, 0, "company alerts name no person");
    assert.equal(post?.kind, "posted");
    assert.equal(post?.name, "Allie Menz");
    assert.equal(post?.company, "AlphaStaffHCM");
    assert.equal(post?.title, "Head of Client Operations");
    assert.equal(post?.at.slice(0, 10), "2026-10-12");
    assert.match(post?.snippet ?? "", /^Clients keep asking how to hire in Mexico/);
  });

  test("a job alert reads as new in seat", () => {
    const [s] = parseAlerts(
      "SALESNAV ALERTS - x\n\nJordan Ellis started a new position as VP of Operations at Armhr\n3 days",
      day("2026-10-14"),
    );
    assert.equal(s?.kind, "new-in-seat");
    assert.equal(s?.title, "VP of Operations");
    assert.equal(s?.company, "Armhr");
  });

  test("relative times", () => {
    assert.equal(relativeDays("2 days"), 2);
    assert.equal(relativeDays("1w"), 7);
    assert.equal(relativeDays("5h"), 0);
    assert.equal(relativeDays("Head of Client Operations"), null);
  });

  test("an alerts grab splits to the accounts its items name", () => {
    const roster = [
      { id: "A1", name: "AlphaStaffHCM", emails: [], domains: [] },
      { id: "A2", name: "Armhr", emails: [], domains: [] },
    ];
    const plan = planGrab(ALERTS, roster, NOW);
    assert.deepEqual(
      plan.filings.map((f) => f.account.name),
      ["AlphaStaffHCM"],
    );
    assert.match(plan.filings[0]!.body, /^SALESNAV ALERTS/);
    assert.equal(plan.missed.length, 2);
  });
});

describe("the people grab", () => {
  const PEOPLE = [
    "SALESNAV PEOPLE - captured 10/14/2026, 10:23:08 AM - AlphaStaffHCM - 2 people",
    "",
    "Account: AlphaStaffHCM\nAllie Menz 3rdCRM\nHead of Client Operations",
    "",
    "----",
    "",
    "Account: AlphaStaffHCM\nAylin Pardo 3rd! Update CRM\nChief Human Resources Officer",
  ].join("\n");

  test("every card files on the account the page names, as one note", () => {
    const roster = [
      { id: "A1", name: "AlphaStaffHCM", emails: [], domains: [] },
      { id: "A2", name: "Armhr", emails: [], domains: [] },
    ];
    const plan = planGrab(PEOPLE, roster, NOW);
    assert.equal(plan.filings.length, 1);
    assert.equal(plan.filings[0]!.account.id, "A1");
    assert.match(plan.filings[0]!.body, /Aylin Pardo/);
    assert.equal(plan.missed.length, 0);
  });

  test("a people note is never an intent reading and never stages a move", () => {
    const notes = [note(PEOPLE, day("2026-10-14"))];
    assert.equal(intentFor(notes, NOW), null);
    assert.deepEqual(peopleSignalsFor(notes, NOW), []);
  });
});

describe("people signals: freshness", () => {
  test("a post past five days and a stale accounts read speak no more", () => {
    const old = peopleSignalsFor(
      [note(ALERTS, day("2026-10-07")), note(ARMHR_ROW, day("2026-10-05"))],
      NOW,
    );
    assert.deepEqual(old, []);
  });

  test("the badge and the post, fresh", () => {
    const kinds = peopleSignalsFor(
      [note(ALERTS, day("2026-10-14")), note(ARMHR_ROW, day("2026-10-14"))],
      NOW,
    ).map((s) => s.kind);
    assert.deepEqual(kinds.sort(), ["new-in-seat", "posted"]);
  });
});

describe("the people rules on the queue", () => {
  const post = acct({ id: "P0000000000000001", name: "AlphaStaffHCM" });
  const hire = acct({ id: "H0000000000000001", name: "Armhr" });
  const input = (excluded?: Set<string>) => ({
    accounts: [post, hire],
    intelById: new Map<string, DealIntel>(),
    notesById: new Map([
      [post.id, [note(ALERTS, day("2026-10-14"))]],
      [hire.id, [note(ARMHR_ROW, day("2026-10-14"))]],
    ]),
    touches: [],
    contactCountById: () => 5,
    excludedIds: excluded,
    now: NOW,
  });

  test("a lead's post stages a message in the send band; a new hire stages a meeting", () => {
    const { all } = buildQueue(input());
    const p = all.find((q) => q.ruleId === "post-trigger");
    const h = all.find((q) => q.ruleId === "new-in-seat");
    assert.equal(p?.action, "Message Allie Menz.");
    assert.equal(p?.reason, "Posted October 12.");
    assert.equal(p?.band, "now");
    assert.equal(h?.action, "Meet Deborah Dhuy.");
    assert.equal(h?.reason, "New in seat, seen October 14.");
    assert.equal(h?.person?.title, "Director of Project Services");
  });

  test("an account in live motion stages neither: it is the HomeRoom's", () => {
    const { all } = buildQueue(input(new Set([post.id, hire.id])));
    assert.equal(all.length, 0);
  });

  test("the stamp names who the move named", () => {
    assert.equal(
      stampSubtext("post-trigger", { personName: "Allie Menz" }),
      "WROTE TO ALLIE MENZ ABOUT THE POST",
    );
    assert.equal(
      stampSubtext("new-in-seat", { personName: "Deborah Dhuy" }),
      "WROTE TO DEBORAH DHUY · NEW IN SEAT",
    );
  });
});

describe("the drafts", () => {
  const a = acct({ name: "Armhr" });

  test("the intent note never claims what was read or quotes the count back", () => {
    const c = composeFor({
      ruleId: "intent-warm",
      account: a,
      intent: { level: "high", activities: 11, at: day("2026-10-14") },
      contactName: "Pat Example",
    });
    assert.doesNotMatch(c.payload, /Global material|engagement|reading|11/i);
  });

  test("the post note goes to the person who posted and quotes only the opening words", () => {
    const c = composeFor({
      ruleId: "post-trigger",
      account: a,
      intent: null,
      contactName: "Pat Example",
      person: {
        kind: "posted",
        name: "Allie Menz",
        title: "Head of Client Operations",
        company: "AlphaStaffHCM",
        snippet: "Clients keep asking how to hire in Mexico",
        at: day("2026-10-12"),
      },
    });
    assert.match(c.payload, /^To: Allie Menz/);
    assert.match(c.payload, /Hi Allie —/);
    assert.match(c.payload, /"Clients keep asking how to hire in Mexico"/);
    assert.doesNotMatch(c.payload, /Pat/);
    assert.doesNotMatch(c.payload, /Sales Nav/i);
  });

  test("the new-in-seat note welcomes them by name and never says how we know", () => {
    const c = composeFor({
      ruleId: "new-in-seat",
      account: a,
      intent: null,
      contactName: "Pat Example",
      person: {
        kind: "new-in-seat",
        name: "Deborah Dhuy",
        title: "Director of Project Services",
        company: "",
        snippet: "",
        at: day("2026-10-14"),
      },
    });
    assert.match(
      c.payload,
      /Hi Deborah — congrats on the new role as Director of Project Services at Armhr\./,
    );
    assert.doesNotMatch(c.payload, /Sales Nav|LinkedIn told|badge/i);
  });
});

describe("the review's cases (2026-10-14)", () => {
  const badge = (createdAt: string) => note(ARMHR_ROW, createdAt);

  test("a badge is dated by the first grab that showed it, and ages out", () => {
    const run = [
      badge(day("2026-11-20")),
      badge(day("2026-11-19")),
      badge(day("2026-10-25")),
    ];
    // An unbroken run back to October 25 would date it there; here the run
    // is unbroken, so November 20 is 26 days past the first sighting.
    assert.deepEqual(
      peopleSignalsFor(run, new Date("2026-11-20T18:00:00Z")).filter(
        (s) => s.kind === "new-in-seat",
      ),
      [],
    );
    const s = peopleSignalsFor(
      [badge(day("2026-10-14")), badge(day("2026-10-13"))],
      NOW,
    ).find((x) => x.kind === "new-in-seat");
    assert.equal(s?.at.slice(0, 10), "2026-10-13");
    assert.equal(s?.seen, true);
  });

  test("a grab without the badge breaks the run", () => {
    const plain = note(ARMHR_ROW.replace("Recently hired\n", ""), day("2026-10-12"));
    const s = peopleSignalsFor(
      [badge(day("2026-10-14")), plain, badge(day("2026-10-01"))],
      NOW,
    ).find((x) => x.kind === "new-in-seat");
    assert.equal(s?.at.slice(0, 10), "2026-10-14");
  });

  test("a falling level with more activities is no rise", () => {
    assert.equal(
      intentRise(
        [
          note("A\nModerate\n9 activities", day("2026-10-14")),
          note("A\nHigh\n5 activities", day("2026-10-13")),
        ],
        NOW,
      ),
      null,
    );
  });

  const hire = acct({ id: "H0000000000000002", name: "Armhr" });
  const base = (doneKeys?: Set<string>) => ({
    accounts: [hire],
    intelById: new Map<string, DealIntel>(),
    notesById: new Map([[hire.id, [badge(day("2026-10-14"))]]]),
    touches: [],
    contactCountById: () => 5,
    doneKeys,
    now: NOW,
  });

  test("a people move is not carried on its first day", () => {
    const { all } = buildQueue(base());
    const h = all.find((q) => q.ruleId === "new-in-seat");
    assert.ok(h);
    assert.equal(h.carried, false);
  });

  test("once worked, a people move stays worked while its signal holds", () => {
    const { all } = buildQueue({
      ...base(new Set([`groundwork:2026-10-14:${hire.id}:new-in-seat`])),
      now: new Date("2026-10-16T15:00:00Z"),
      notesById: new Map([
        [
          hire.id,
          [badge(day("2026-10-16")), badge(day("2026-10-15")), badge(day("2026-10-14"))],
        ],
      ]),
    });
    assert.equal(
      all.find((q) => q.ruleId === "new-in-seat"),
      undefined,
    );
  });

  test("a long name is never cut", () => {
    const long = acct({ id: "L0000000000000001", name: "AlphaStaffHCM" });
    const alerts = ALERTS.replace("Allie Menz", "Maria de la Cruz");
    const { all } = buildQueue({
      accounts: [long],
      intelById: new Map<string, DealIntel>(),
      notesById: new Map([[long.id, [note(alerts, day("2026-10-14"))]]]),
      touches: [],
      contactCountById: () => 5,
      now: NOW,
    });
    const p = all.find((q) => q.ruleId === "post-trigger");
    assert.equal(p?.action, "Message Maria de la Cruz.");
    assert.equal(p?.person?.name, "Maria de la Cruz");
    const seat = buildQueue({
      ...base(),
      notesById: new Map([
        [
          hire.id,
          [badge(day("2026-10-14")).body.replace("Deborah Dhuy", "Maria de la Cruz")].map(
            (b) => note(b, day("2026-10-14")),
          ),
        ],
      ]),
    }).all.find((q) => q.ruleId === "new-in-seat");
    assert.equal(seat?.action, "Meet Maria de la Cruz.");
  });

  test("a job alert naming another company speaks nothing on this account", () => {
    const moved =
      "SALESNAV ALERTS - x\n\nJordan Ellis started a new position as VP of Operations at Nextep\n2 days";
    assert.deepEqual(
      peopleSignalsFor([note(moved, day("2026-10-14"))], NOW, "Armhr"),
      [],
    );
    assert.equal(
      peopleSignalsFor([note(moved, day("2026-10-14"))], NOW, "Nextep, Inc.")[0]?.kind,
      "new-in-seat",
    );
  });

  test("the post message quotes at most twelve words, cut at a word", () => {
    const c = composeFor({
      ruleId: "post-trigger",
      account: acct({ name: "AlphaStaffHCM" }),
      intent: null,
      contactName: "",
      person: {
        kind: "posted",
        name: "Allie Menz",
        title: "",
        company: "",
        snippet:
          "Clients keep asking how to hire in Mexico without an entity and we need a better answer",
        at: day("2026-10-12"),
      },
    });
    assert.match(
      c.payload,
      /"Clients keep asking how to hire in Mexico without an entity and…"/,
    );
    assert.match(c.to, /LinkedIn message/);
  });
});
