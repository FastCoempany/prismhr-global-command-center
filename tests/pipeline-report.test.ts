// The Pipeline Status record's own rules (founder-decreed 2026-09-08). The
// report is read aloud when someone asks where the pipeline is, and three of
// its rules exist nowhere else in the app: another team's handoff is not his
// next step, an outcome is a decision rather than a topic, and the second
// record's traffic at an account rides an FYI line instead of a field.
//
// The Simploy row is the case that produced all three. "Connect Chassie with
// PrismHR's recruitment specialist," opened 8/25, held the next-step slot on
// 9/8 while the three commitments he actually made on the 9/2 call sat behind
// it — and its outcomes read as one clause off a call that settled five things.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isOtherTeamWork,
  outcomesFrom,
  fyiFromSupport,
  gatedByThem,
  ownersFrom,
  ownerClause,
} from "../src/lib/pipeline/report";
import { buildPipelineReport } from "../src/lib/pipeline/build";
import { readAccount, type RecordNote } from "../src/lib/record/read";
import { NO_TAGS, withTags } from "../src/lib/today/route-notes";

describe("another team's work is not his next step", () => {
  test("the real Simploy handoff is caught", () => {
    assert.equal(
      isOtherTeamWork("Connect Chassie with PrismHR's recruitment specialist"),
      true,
    );
    assert.equal(
      isOtherTeamWork(
        "Connect Chassie with PrismHR's recruitment specialist for international hiring support",
      ),
      true,
    );
  });
  test("his own send is his, whatever desk it names", () => {
    // Both halves must read true — naming a team is not handing work to it.
    assert.equal(isOtherTeamWork("Send the recruitment pricing sheet"), false);
    assert.equal(isOtherTeamWork("Answer the support case myself"), false);
  });
  test("an ordinary commitment is untouched", () => {
    assert.equal(
      isOtherTeamWork("Send the reseller agreement and the PEO-to-client agreement"),
      false,
    );
    assert.equal(
      isOtherTeamWork("Build ballpark India pricing for 4–5 EOR workers"),
      false,
    );
  });
});

describe("outcomes are decisions and stances, never topics", () => {
  // The real 9/2 Simploy call read, head line and all.
  const CALL = [
    "☎ CT Today 1:01 PM — Reseller path + GP-incumbent India client · Antaeus Coe → Chassie Smith",
    "Wants the reseller route with own markup (we supply a suggested markup). Target client: moving company, ~1 yr on Globalization Partners, ~4–5 India admin workers, likely EOR; GP delivered via a third party — separate site and invoices. Suspected month-to-month; client shared its GP invoices. Open to a slight premium for consolidation. Owed: invoices + EOR confirm — @Chassie.",
  ].join("\n");

  test("a call that settled several things yields several outcomes", () => {
    const got = outcomesFrom(CALL);
    assert.ok(got.length >= 3, `expected 3+, got ${got.length}: ${JSON.stringify(got)}`);
    assert.ok(got.some((s) => /reseller route with own markup/.test(s)));
    assert.ok(got.some((s) => /month-to-month/.test(s)));
    assert.ok(got.some((s) => /slight premium/.test(s)));
  });
  test("the head line is not an outcome, and neither is the Owed line", () => {
    const got = outcomesFrom(CALL);
    assert.ok(!got.some((s) => /Today 1:01 PM/.test(s)), "the head line is provenance");
    assert.ok(
      !got.some((s) => /^Owed:/i.test(s)),
      "the Owed line is the ledger, not a finding",
    );
  });
  test("a topic is not an outcome", () => {
    const got = outcomesFrom(
      "head\nWe discussed pricing and reviewed the platform. We walked through the demo.",
    );
    assert.deepEqual(got, []);
  });
  test("a semicolon is a real boundary, not decoration", () => {
    const got = outcomesFrom("head\nSuspected month-to-month; open to a slight premium.");
    assert.equal(got.length, 2);
  });
  test("nothing concluded returns nothing, so the report can say so honestly", () => {
    assert.deepEqual(outcomesFrom(""), []);
    assert.deepEqual(outcomesFrom("head\nIntroduced myself and covered the agenda."), []);
  });
});

describe("waiting on them", () => {});

describe("the gate — their turn precedes ours", () => {
  test("the Simploy case: one call set both sides, so theirs runs first", () => {
    // "you've still missed what Chassie owes us — it's the thing that precedes
    // us sending her anything at all."
    assert.equal(
      gatedByThem(
        [{ at: "2026-09-02" }],
        [{ opened: "2026-09-02" }, { opened: "2026-09-02" }],
      ),
      true,
    );
  });
  test("a promise he made AFTER their turn is his to run", () => {
    assert.equal(gatedByThem([{ at: "2026-09-02" }], [{ opened: "2026-09-05" }]), false);
  });
  test("their turn with nothing owed by him is still their turn", () => {
    assert.equal(gatedByThem([{ at: "2026-09-01" }], []), true);
  });
  test("nothing owed by them gates nothing", () => {
    assert.equal(gatedByThem([], [{ opened: "2026-09-02" }]), false);
  });
});

describe("who on our side is handling it", () => {
  // Simploy's real actor tally, as fetchSecondRecords() hands it over.
  const ACTORS = [
    { name: "Nihar Kulkarni", kind: "account", lane: "support", n: 41 },
    { name: "Janaki Streibig", kind: "account", lane: "support", n: 19 },
    { name: "Mike Paschal", kind: "colleague", lane: "support", n: 13 },
    { name: "Lesha Cyphers", kind: "colleague", lane: "csm", n: 22 },
    { name: "Someone Else", kind: "colleague", lane: "human", n: 90 },
  ];

  test("our people are named, busiest first", () => {
    const got = ownersFrom(ACTORS);
    assert.equal(got.length, 2);
    assert.equal(got[0].name, "Lesha Cyphers");
    assert.equal(got[0].n, 22);
    assert.equal(got[1].name, "Mike Paschal");
  });
  test("the client's own people are not named here", () => {
    // This line answers "who on our side," not "who called."
    const got = ownersFrom(ACTORS, ["support"], 5);
    assert.deepEqual(
      got.map((o) => o.name),
      ["Mike Paschal"],
    );
    assert.ok(!got.some((o) => o.name === "Nihar Kulkarni"));
  });
  test("a lane nobody asked about is not read", () => {
    // The human lane is his own deal — never FYI.
    assert.deepEqual(
      ownersFrom(ACTORS, ["support", "csm"], 9).map((o) => o.name),
      ["Lesha Cyphers", "Mike Paschal"],
    );
  });
  test("the operator is never FYI to himself", () => {
    // He is on his own accounts' CSM lane constantly; this line is about work
    // that is not his.
    const withMe = [
      ...ACTORS,
      { name: "Antaeus Coe", kind: "colleague", lane: "csm", n: 20 },
    ];
    assert.ok(ownersFrom(withMe, ["csm"], 5).some((o) => o.name === "Antaeus Coe"));
    assert.ok(
      !ownersFrom(withMe, ["csm"], 5, "Antaeus Coe").some(
        (o) => o.name === "Antaeus Coe",
      ),
    );
  });
  test("the clause reads as a sentence, one name or several", () => {
    assert.equal(
      ownerClause([{ name: "Mike Paschal", lane: "support", n: 13 }]),
      "Mike Paschal is handling it",
    );
    assert.equal(
      ownerClause([
        { name: "Mike Paschal", lane: "support", n: 13 },
        { name: "Lesha Cyphers", lane: "csm", n: 22 },
      ]),
      "Mike Paschal and Lesha Cyphers are handling it",
    );
  });
  test("nobody named is nobody named, never a guess", () => {
    assert.equal(ownerClause([]), "");
    assert.deepEqual(ownersFrom([]), []);
    assert.deepEqual(
      ownersFrom([{ name: "Someone", kind: "account", lane: "support", n: 4 }]),
      [],
    );
  });
});

describe("the FYI line speaks the way a person speaks", () => {
  const SUPPORT = {
    total: 75,
    spike: { day: "2026-08-17", n: 9 },
    themes: [
      { label: "Update Provided", n: 46, firstDay: "2026-06-29", lastDay: "2026-08-27" },
      {
        label: "Suggested Solution",
        n: 12,
        firstDay: "2026-07-02",
        lastDay: "2026-08-11",
      },
    ],
  };

  test("the biggest theme carries the line, with its own window", () => {
    assert.equal(
      fyiFromSupport(SUPPORT),
      "75 support cases 6/29–8/27, mostly update provided (46); spike 9 in a day on 8/17.",
    );
  });
  test("no machine words reach a line read to leadership", () => {
    const line = fyiFromSupport(SUPPORT);
    assert.ok(!/dropSha/.test(line), "no checksum");
    assert.ok(!/cases in window/.test(line), "no store dialect");
  });
  test("cases with no themes still say how many", () => {
    assert.equal(
      fyiFromSupport({ total: 12, spike: null, themes: [] }),
      "12 support cases in the window.",
    );
  });
  test("nothing there renders nothing rather than an empty sentence", () => {
    assert.equal(fyiFromSupport(null), "");
    assert.equal(fyiFromSupport({ total: 0, spike: null, themes: [] }), "");
  });
});

// A promise of theirs retires when they speak again. His own commitments have
// had a settle rule since 2026-09-04 (src/lib/room/settled.ts); theirs had
// none and was carried forever.
describe("their promise closes by delivery or release, never because they wrote again", () => {
  // The drawer used to retire a promise of theirs on any later message over
  // forty characters (pass 8 H12). Trend Personnel, verbatim: Melanie
  // promised on 9/1 and the read filed it as a loop on their side; Adam
  // wrote on 9/2 that the proposal is still in process, which delivers
  // nothing and releases nothing. The drawer lists the read's own open
  // promises (ruled 2026-10-07, pass 8 call 6), so the loop stands until the
  // record shows it kept or let go.
  const isHome = ["Antaeus Coe", "Lesha Cyphers", "Anika Steenstra"];
  const row = (
    o: Partial<RecordNote> & { id: string; body: string; createdAt: string },
  ) =>
    ({
      accountId: "TREND",
      partner: "",
      kind: "account",
      lane: "mine",
      actors: "",
      source: "outlook-ai",
      recipients: "",
      ...o,
    }) as RecordNote;
  const MELANIE = row({
    id: "mel",
    createdAt: "2026-09-01T15:06:00Z",
    actors: "Melanie Dreyer → Antaeus Coe",
    body: "✉ OL Sep 1 10:06 AM — Re: proposal · Melanie Dreyer → Antaeus Coe\nWill check with their Sales Director — this piece of the proposal is not what is holding up the process.",
  });
  const ADAM = row({
    id: "adam",
    createdAt: "2026-09-02T15:39:00Z",
    actors: "Adam Dingwell → Antaeus Coe",
    body: "✉ OL Sep 2 10:39 AM — Re: proposal · Adam Dingwell → Antaeus Coe\nStill working through the proposal process; foresees another month or two before a decision at best.",
  });
  const LOOP = {
    id: "t1",
    body: withTags("Check with the Sales Director", {
      ...NO_TAGS,
      owner: "them",
      by: "Melanie Dreyer",
      hearer: "Antaeus Coe",
    }),
    done: false,
    accountId: "TREND",
    createdAt: "2026-09-01T15:10:00Z",
  };
  const drawer = (todos: (typeof LOOP)[]) => {
    const now = new Date("2026-09-08T17:00:00Z");
    const notes = [ADAM, MELANIE];
    const read = readAccount({
      account: { id: "TREND", name: "Trend Personnel Services" },
      notes,
      touches: [],
      todos,
      dispositions: new Map(),
      homeSide: isHome,
      now,
    });
    return buildPipelineReport({
      accounts: [
        {
          id: "TREND",
          name: "Trend Personnel Services",
          csm: "Anika Steenstra",
          stageLabel: "",
          notes: notes.map((n) => ({
            id: n.id,
            createdAt: n.createdAt,
            body: n.body,
            lane: "mine" as const,
            actors: n.actors,
            source: n.source,
          })),
          todos: todos.map((t) => ({ ...t, remindAt: "", updatedAt: t.createdAt })),
          gaps: [],
          support: null,
          actors: [],
          read,
        },
      ],
      csms: isHome,
      me: "Antaeus Coe",
      now,
    })[0];
  };

  test("a later message of theirs that delivers nothing leaves the promise standing", () => {
    const r = drawer([LOOP]);
    assert.ok(
      r.theirSide.some((t) => /Sales Director/.test(t.text)),
      JSON.stringify(r.theirSide),
    );
  });
  test("the loop closed on the record is gone", () => {
    const r = drawer([{ ...LOOP, done: true }]);
    assert.ok(!r.theirSide.some((t) => /Sales Director/.test(t.text)));
  });
});
