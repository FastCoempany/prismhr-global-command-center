import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  actorsLine,
  inferActors,
  inferLane,
  inferSubject,
  laneFor,
} from "@/lib/intel/provenance";
import { peopleFor } from "@/lib/intel/people";

describe("laneFor", () => {
  test("my name or address anywhere → mine", () => {
    assert.equal(laneFor("Antaeus Coe → Kim Bartolotti", "hello"), "mine");
    assert.equal(laneFor("Kim → Lesha", "cc antaeus.coe@prismhr.com on this"), "mine");
  });
  test("case traffic with no trace of me → background", () => {
    assert.equal(
      laneFor(
        "customersupport@prismhr.com → Kristen Wolasz",
        "A zero dollar posted payroll voucher represents an entire posted configuration.",
      ),
      "background",
    );
  });
  test("global-scent promote: team traffic about my product line → mine", () => {
    assert.equal(
      laneFor("Lesha Cyphers → Kim Bartolotti", "Recap of the PrismHR Global demo"),
      "mine",
    );
    assert.equal(
      laneFor("A → B", "they asked about employer of record coverage in Mexico"),
      "mine",
    );
  });
});

describe("actors round trip", () => {
  test("actorsLine builds, inferActors recovers from a filed head", () => {
    const actors = actorsLine("Kim Bartolotti", "Lesha Cyphers", 2);
    assert.equal(actors, "Kim Bartolotti → Lesha Cyphers +2");
    const body = `✉ SF Jul 22 4:11 PM — RE: PrismOne · ${actors}\nWed at 9:30 works.`;
    assert.equal(inferActors(body), actors);
    assert.equal(inferSubject(body), "RE: PrismOne");
  });
  test("hand-written notes have no actors", () => {
    assert.equal(inferActors("✓ Closed: send the recap"), "");
  });
});

describe("inferLane (legacy rows)", () => {
  test("chip kinds are always mine", () => {
    assert.equal(inferLane("mine", "whatever", ""), "mine");
    assert.equal(inferLane("partner", "case #123 support", ""), "mine");
  });
  test("app-written account notes (✓/⚡/☰) are mine", () => {
    assert.equal(inferLane("account", "✓ Closed: demo step", ""), "mine");
    assert.equal(
      inferLane("account", "☰ transcript — filed from Intake\nhi", ""),
      "mine",
    );
  });
  test("SF-filed case traffic is background; my threads stay mine", () => {
    assert.equal(
      inferLane(
        "account",
        "✉ SF 5:27 PM Today — Case 00685421 · customersupport@prismhr.com → Kristen Wolasz\nvoucher details",
        "customersupport@prismhr.com → Kristen Wolasz",
      ),
      "background",
    );
    assert.equal(
      inferLane(
        "account",
        "✉ SF Jul 22 — RE: intro · Kim Bartolotti → Antaeus Coe\nthanks!",
        "Kim Bartolotti → Antaeus Coe",
      ),
      "mine",
    );
  });
});

describe("peopleFor", () => {
  const notes = [
    {
      actors: "Kristen Wolasz → customersupport@prismhr.com",
      lane: "background" as const,
      body: "✉ SF 4:18 PM — Re: Case 00685421 · Kristen Wolasz → customersupport@prismhr.com\nnever paid",
      createdAt: "2026-07-27T21:18:00Z",
    },
    {
      actors: "Kim Bartolotti → Lesha Cyphers",
      lane: "mine" as const,
      body: "✉ SF Jul 22 — RE: PrismOne · Kim Bartolotti → Lesha Cyphers\nWed works",
      createdAt: "2026-07-22T21:11:00Z",
    },
    {
      actors: "Kristen Wolasz → Antaeus Coe",
      lane: "mine" as const,
      body: "✉ SF Jul 25 — Global payroll question · Kristen Wolasz → Antaeus Coe\nCanada?",
      createdAt: "2026-07-25T15:00:00Z",
    },
  ];
  const contacts = [
    {
      first: "Kristen",
      last: "Wolasz",
      title: "Benefits Manager",
      email: "kwolasz@myesc.com",
    },
  ];

  test("rolls up appearances across both lanes, joins the roster, skips me", () => {
    const people = peopleFor(notes, contacts);
    const kristen = people.find((p) => p.name === "Kristen Wolasz");
    assert.ok(kristen);
    assert.equal(kristen!.count, 2);
    assert.equal(kristen!.title, "Benefits Manager");
    assert.equal(kristen!.inMine, true);
    assert.equal(kristen!.inBackground, true);
    assert.equal(kristen!.lastContext, "Re: Case 00685421");
    assert.ok(!people.some((p) => /antaeus|customersupport/i.test(p.name)));
    assert.ok(people.some((p) => p.name === "Kim Bartolotti"));
  });
});
