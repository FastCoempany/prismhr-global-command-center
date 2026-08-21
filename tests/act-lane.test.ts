// The Act Lane (Version C, decreed 2026-08-21): the grammars round-trip, and
// the seated rule leads Groundwork's queue — rank 95, three seats at most in
// the leading order, and a seat counts as the account's own move so no
// vehicle rule swallows it.

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
  parseActDraftBody,
  parseSeatBody,
  renderActDraftBody,
  renderSeatBody,
} from "../src/lib/act/lane";
import { buildQueue, SEAT_SLOT_CAP } from "../src/lib/groundwork/day";
import type { Peo } from "../src/lib/book";

describe("the act lane grammars", () => {
  test("a draft renders and parses back whole", () => {
    const d = {
      term: "PHR STALL",
      to: "Russ Jones",
      subject: "Hatton follow-up",
      body: "Russ — the thread went quiet.\n\nWhat came of it?",
    };
    assert.deepEqual(parseActDraftBody(renderActDraftBody(d)), d);
  });

  test("a termless draft keeps its emptiness", () => {
    const d = { term: "", to: "Pat", subject: "Hello", body: "" };
    assert.deepEqual(parseActDraftBody(renderActDraftBody(d)), d);
  });

  test("a seat renders and parses back whole", () => {
    const s = { act: "Ask Russ about the follow-up.", term: "PHR STALL", day: "2026-08-21" };
    assert.deepEqual(parseSeatBody(renderSeatBody(s)), s);
  });

  test("junk is refused, never half-read", () => {
    assert.equal(parseActDraftBody("✉ not a draft"), null);
    assert.equal(parseSeatBody("⚑ malformed"), null);
  });
});

const peo = (id: string, name: string): Peo =>
  ({
    id,
    name,
    industry: "PEO",
    sizeBucket: "",
    size: 0,
    city: "",
    state: "",
    csm: "",
    cloud: "",
    website: "",
    contactName: "",
    contactEmail: "",
    fit: 50,
  }) as unknown as Peo;

describe("the seated rule", () => {
  const now = new Date("2026-08-21T15:00:00Z");
  const accounts = [
    peo("A1", "Alpha"),
    peo("A2", "Beta"),
    peo("A3", "Gamma"),
    peo("A4", "Delta"),
  ];

  test("a seat leads the queue at 95 with the act as the action line", () => {
    const { all } = buildQueue({
      accounts,
      intelById: new Map(),
      notesById: new Map(),
      touches: [],
      contactCountById: () => 1,
      seats: new Map([
        ["A1", { act: "Ask Russ about the follow-up.", term: "PHR STALL", day: "2026-08-20" }],
      ]),
      now,
    });
    const seat = all.find((q) => q.ruleId === "seated");
    assert.ok(seat, "the seat fired");
    assert.equal(seat.accountId, "A1");
    assert.equal(seat.weight, 95);
    assert.equal(seat.action, "Ask Russ about the follow-up.");
    assert.match(seat.reason, /^Seated August 20 from the sheet\.$/);
    assert.equal(all[0].ruleId, "seated");
  });

  test("at most three seats lead; the fourth sinks, never lost", () => {
    const seats = new Map(
      ["A1", "A2", "A3", "A4"].map((id, i) => [
        id,
        { act: `Move ${i + 1}.`, term: "T", day: "2026-08-21" },
      ]),
    );
    const { all } = buildQueue({
      accounts,
      intelById: new Map(),
      notesById: new Map(),
      touches: [],
      contactCountById: () => 1,
      seats,
      now,
    });
    const seated = all.filter((q) => q.ruleId === "seated");
    assert.equal(seated.length, 4, "no seat is dropped");
    assert.equal(SEAT_SLOT_CAP, 3);
    const leadingSeats = all.slice(0, 3).filter((q) => q.ruleId === "seated");
    assert.equal(leadingSeats.length, 3, "three seats lead");
    // The fourth seat sinks below the leading order — with no other rule
    // firing in this fixture it simply trails, kept and ranked.
    assert.equal(all[all.length - 1].action, "Move 4.");
  });

  test("a seat for an unknown account is ignored, not a crash", () => {
    const { all } = buildQueue({
      accounts,
      intelById: new Map(),
      notesById: new Map(),
      touches: [],
      contactCountById: () => 1,
      seats: new Map([["ZZ", { act: "Ghost move.", term: "", day: "2026-08-21" }]]),
      now,
    });
    assert.equal(all.some((q) => q.ruleId === "seated"), false);
  });
});
