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
  nextStepFrom,
  waitingOn,
  theirTurnFrom,
  gatedByThem,
} from "../src/lib/pipeline/report";

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
    assert.equal(isOtherTeamWork("Send the reseller agreement and the PEO-to-client agreement"), false);
    assert.equal(isOtherTeamWork("Build ballpark India pricing for 4–5 EOR workers"), false);
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
    assert.ok(!got.some((s) => /^Owed:/i.test(s)), "the Owed line is the ledger, not a finding");
  });
  test("a topic is not an outcome", () => {
    const got = outcomesFrom("head\nWe discussed pricing and reviewed the platform. We walked through the demo.");
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

describe("the next step is his, ranked by what he owes soonest", () => {
  const open = [
    { edit: "Connect Chassie with PrismHR's recruitment specialist", due: "2026-08-25" },
    { edit: "Send the reseller agreement and the PEO-to-client agreement", due: "2026-09-02" },
    { edit: "Build ballpark India pricing", wall: "2026-09-02", due: "2026-09-02" },
  ];
  test("the handoff never takes the slot, and is named separately", () => {
    const got = nextStepFrom(open);
    assert.ok(!/recruitment specialist/.test(got.text));
    assert.equal(got.handoffs.length, 1);
    assert.match(got.handoffs[0], /recruitment specialist/);
  });
  test("a blown wall outranks a plain date", () => {
    assert.match(nextStepFrom(open).text, /^Build ballpark India pricing/);
  });
  test("a settled commitment is done, whatever the register still says", () => {
    const got = nextStepFrom([
      { edit: "Send the calendar invite", due: "2026-08-31", settled: "she accepted 9/1" },
      { edit: "Send the agreements", due: "2026-09-02" },
    ]);
    assert.match(got.text, /^Send the agreements/);
  });
  test("no step left is a finding, not a crash", () => {
    const got = nextStepFrom([
      { edit: "Connect Chassie with PrismHR's recruitment specialist", due: "2026-08-25" },
    ]);
    assert.equal(got.text, "");
    assert.equal(got.handoffs.length, 1);
  });
  test("an empty register says nothing rather than guessing", () => {
    assert.deepEqual(nextStepFrom([]), { text: "", full: "", handoffs: [] });
  });
});

describe("waiting on them", () => {
  test("the counterparty's turn reads as a sentence", () => {
    assert.equal(
      waitingOn([{ who: "Chassie", text: "invoices + EOR confirm" }]),
      "Chassie owes invoices + EOR confirm",
    );
  });
  test("nothing owed says nothing", () => {
    assert.equal(waitingOn([]), "");
  });
});

describe("their turn, where no Owed line names them", () => {
  const isHome = (n: string) => /antaeus|lesha|anika/i.test(n);
  // Trend Personnel, 9/1 — the real line. The ball has been theirs since, and
  // the report said "None set."
  const TREND = [
    {
      createdAt: "2026-09-01T14:00:00Z",
      actors: "Melanie Dreyer → Antaeus Coe",
      source: "outlook-ai",
      body: "Good morning Antaeus – I will check with our Sales Director as this piece of the proposal is not what is holding up the process.",
    },
  ];
  test("an inbound promise is read as their turn", () => {
    const got = theirTurnFrom(TREND, isHome);
    assert.equal(got.length, 1);
    assert.equal(got[0].who, "Melanie");
    // The promise is the first clause; the rest is explanation.
    assert.equal(got[0].text, "check with our Sales Director");
    assert.equal(got[0].at, "2026-09-01");
  });
  test("our own promise is never their turn", () => {
    const ours = [
      {
        createdAt: "2026-09-02T14:00:00Z",
        actors: "Antaeus Coe → Chassie Smith",
        source: "outlook-ai",
        body: "I will send the reseller agreement this week.",
      },
    ];
    assert.deepEqual(theirTurnFrom(ours, isHome), []);
  });
  test("a transcript is every voice at once, so it is not attributed here", () => {
    const tape = [
      {
        createdAt: "2026-08-13T14:00:00Z",
        actors: "Bill Laffey → Antaeus Coe",
        source: "transcript",
        body: "Bill Laffey: I will call the client to size Mexico.",
      },
    ];
    assert.deepEqual(theirTurnFrom(tape, isHome), []);
  });
  test("machinery never makes a promise", () => {
    const auto = [
      {
        createdAt: "2026-09-01T14:00:00Z",
        actors: "Melanie Dreyer → Antaeus Coe",
        source: "outlook-ai",
        body: "Out of office. I will get back to you when I return.",
      },
    ];
    assert.deepEqual(theirTurnFrom(auto, isHome), []);
  });
  test("a courtesy offer is not a turn", () => {
    // Infiniti, 9/3 — read as a commitment until the conditional ruled it out.
    // "Reach out if you need anything" hands the next move back to us.
    const offer = [
      {
        createdAt: "2026-09-03T14:00:00Z",
        actors: "Raphael Kalu → Antaeus Coe",
        source: "outlook-ai",
        body: "Thanks for the deck. We will reach out if they need additional information, particularly on Puerto Rico.",
      },
    ];
    assert.deepEqual(theirTurnFrom(offer, isHome), []);
  });
  test("one promise on file twice is one promise", () => {
    // The raw capture and the read's distillation of the same message.
    const twice = [
      {
        createdAt: "2026-09-01T15:00:00Z",
        actors: "Melanie Dreyer → Antaeus Coe",
        source: "outlook-ai",
        body: "Will check with their Sales Director — this piece of the proposal is not what is holding up the process.",
      },
      {
        createdAt: "2026-09-01T14:00:00Z",
        actors: "Melanie Dreyer → Antaeus Coe",
        source: "outlook",
        body: "I will check with our Sales Director as this piece of the proposal is not what is holding up the process.",
      },
    ];
    assert.equal(theirTurnFrom(twice, isHome).length, 1);
  });
  test("a promise read aloud never ends mid-word", () => {
    const long = [
      {
        createdAt: "2026-09-01T14:00:00Z",
        actors: "Melanie Dreyer → Antaeus Coe",
        source: "outlook-ai",
        body: "I will check with our Sales Director about the pricing structure and the contract terms and the implementation timeline and everything else outstanding.",
      },
    ];
    const got = theirTurnFrom(long, isHome);
    assert.equal(got.length, 1);
    assert.ok(got[0].text.length <= 92);
    assert.ok(!/\s$/.test(got[0].text) && !/[a-z]-$/.test(got[0].text));
  });
  test("the Owed line is the other rung's job, not this one's", () => {
    const owed = [
      {
        createdAt: "2026-09-02T14:00:00Z",
        actors: "Chassie Smith → Antaeus Coe",
        source: "call-ai",
        body: "Owed: invoices + EOR confirm — @Chassie; agreements — @Antaeus.",
      },
    ];
    assert.deepEqual(theirTurnFrom(owed, isHome), []);
  });
});

describe("the gate — their turn precedes ours", () => {
  test("the Simploy case: one call set both sides, so theirs runs first", () => {
    // "you've still missed what Chassie owes us — it's the thing that precedes
    // us sending her anything at all."
    assert.equal(
      gatedByThem([{ at: "2026-09-02" }], [{ opened: "2026-09-02" }, { opened: "2026-09-02" }]),
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

describe("the FYI line speaks the way a person speaks", () => {
  const STORE = [
    "SUPPORT · 75 cases in window · spike 2026-08-17 (9 in a day) · dropSha 3f9a1c",
    "THEME · 46 · 2026-06-29→2026-08-27 · Update Provided · cases 12,14,19",
    "THEME · 12 · 2026-07-02→2026-08-11 · Suggested Solution · cases 3,7",
  ].join("\n");

  test("the machine words never reach a line read to leadership", () => {
    const line = fyiFromSupport(STORE);
    assert.ok(!/dropSha/.test(line), "no checksum");
    assert.ok(!/cases in window/.test(line), "no store dialect");
  });
  test("the biggest theme carries the line, with its own window", () => {
    assert.equal(
      fyiFromSupport(STORE),
      "75 support cases 6/29–8/27, mostly update provided (46); spike 9 in a day on 8/17.",
    );
  });
  test("an empty store renders nothing rather than an empty sentence", () => {
    assert.equal(fyiFromSupport(""), "");
    assert.equal(fyiFromSupport("SUPPORT · nothing here"), "");
  });
});
