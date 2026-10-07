import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { climbFraction, readDeal } from "@/lib/room/engine";
import { DASH_NODE_KEYS } from "@/lib/dashboard/stages";
import { peopleFor } from "@/lib/intel/people";
import { liveMotionIds } from "@/lib/groundwork/day";
import { readAccount, type RecordNote } from "@/lib/record/read";
import { buildAccountSheet } from "@/lib/room/sheet-view";
import {
  filedWarmth,
  offBoardCandidates,
  ownRecordMotion,
} from "../src/app/room/room-reads";

// ADVERSARIAL PASS 3 — row assembly at the boundaries: every stage key the
// board can produce, health flips at exact thresholds, and the stakeholder
// hover under weird repository data.

const NOW = new Date("2026-07-28T17:00:00Z");

describe("climb — every real stage key lands inside the bar", () => {
  test("all seven stages produce ascending, in-bounds fractions", () => {
    let prev = -1;
    for (const key of DASH_NODE_KEYS) {
      const f = climbFraction(key, 0, 4);
      assert.ok(f >= 0 && f <= 1, key);
      assert.ok(f > prev, `${key} should climb past the stage before it`);
      prev = f;
    }
  });
  test("a fully-checked final stage caps at exactly 1", () => {
    const last = DASH_NODE_KEYS[DASH_NODE_KEYS.length - 1];
    assert.equal(climbFraction(last, 3, 3), 1);
  });
});

describe("health thresholds — flips happen at the boundary, not near it", () => {
  const step = { nodeKey: "demo", nodeLabel: "Demo", item: "Demo delivered", ageDays: 0 };
  const touchAt = (daysAgo: number) =>
    new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString();

  test("4 quiet days is amber territory at worst; 5 with a date is red", () => {
    const at4 = readDeal({
      accountName: "ESC",
      step,
      timing: { phrase: "Thursday demo", dateIso: "2026-07-31" },
      lastTouch: { at: touchAt(4), awaitingReply: true, who: "Kristen" },
      lastRecordAt: touchAt(1),
      now: NOW,
    });
    assert.notEqual(at4.health, "red");
    const at5 = readDeal({
      accountName: "ESC",
      step,
      timing: { phrase: "Thursday demo", dateIso: "2026-07-31" },
      lastTouch: { at: touchAt(5), awaitingReply: true, who: "Kristen" },
      lastRecordAt: touchAt(1),
      now: NOW,
    });
    assert.equal(at5.health, "red");
  });
  test("a replied thread is never 'their move'", () => {
    const r = readDeal({
      accountName: "ESC",
      step,
      timing: null,
      lastTouch: { at: touchAt(10), awaitingReply: false, who: "Kristen" },
      lastRecordAt: touchAt(1),
      now: NOW,
    });
    // The court line is retired (ruled 2026-09-25, D25): the move line says
    // who and when. A thread they answered never reads "Wait on"; the open
    // gate is ours to chase, and the line names the person and the quiet.
    assert.ok(!/^Wait on/.test(r.move), r.move);
    assert.equal(r.move, "Chase Kristen on “demo delivered”. Quiet 10 days.");
  });
});

describe("stakeholder hover — weird repository data stays presentable", () => {
  test("empty actors, self-mentions, and shared inboxes never become people", () => {
    const people = peopleFor(
      [
        {
          actors: "",
          lane: "mine",
          body: "✎ note with no actors",
          createdAt: "2026-07-01T00:00:00Z",
        },
        {
          actors: "Antaeus Coe → customersupport@prismhr.com",
          lane: "mine",
          body: "✉ SF Jul 1 — case ping · Antaeus Coe → customersupport@prismhr.com",
          createdAt: "2026-07-01T00:00:00Z",
        },
        {
          actors: "no-reply@prismhr.com → Kristen Wolasz",
          lane: "background",
          body: "✉ SF Jul 2 — auto · no-reply@prismhr.com → Kristen Wolasz",
          createdAt: "2026-07-02T00:00:00Z",
        },
      ],
      [],
    );
    assert.ok(!people.some((p) => /antaeus|customersupport|no-?reply/i.test(p.name)));
    assert.ok(people.some((p) => p.name === "Kristen Wolasz"));
  });
  test("a flood of actors is capped, sorted, and stable", () => {
    const notes = Array.from({ length: 200 }, (_, i) => ({
      actors: `Person ${i % 40} → Person ${(i + 1) % 40}`,
      lane: (i % 2 ? "mine" : "background") as "mine" | "background",
      body: `✉ SF Jul 1 — thread ${i} · Person ${i % 40} → Person ${(i + 1) % 40}`,
      createdAt: `2026-07-${String((i % 27) + 1).padStart(2, "0")}T00:00:00Z`,
    }));
    const people = peopleFor(notes, [], 12);
    assert.ok(people.length <= 12);
    for (let i = 1; i < people.length; i++)
      assert.ok(people[i - 1].count >= people[i].count);
  });
});

// Pass 8 call 1 (ruled 2026-10-07): the HomeRoom takes what Groundwork hands
// it. An off-board account excluded for live motion on the operator's own
// record gets a row until the exclusion lifts, read by the same read and
// engine as every row, and a seat on it reads there as its action (C8). An
// exclusion resting only on a colleague's inbox adds no row (C6).
describe("an off-board account in live motion takes a HomeRoom row (pass 8 call 1)", () => {
  const NOW_OCT = new Date("2026-10-07T17:00:00Z");
  const row = (o: Partial<RecordNote> & { id: string; body: string }): RecordNote => ({
    accountId: "G1",
    partner: "",
    kind: "account",
    lane: "mine",
    actors: "",
    source: "",
    recipients: "",
    createdAt: "2026-10-01T15:00:00Z",
    ...o,
  });
  const readOf = (notes: RecordNote[]) =>
    readAccount({
      account: { id: "G1", name: "Gulf Coast PEO" },
      notes,
      touches: [],
      todos: [],
      dispositions: new Map(),
      homeSide: ["Lesha Cyphers"],
      now: NOW_OCT,
    });
  const inbound = row({
    id: "in1",
    body: "✉ OL Oct 1 — Re: Canada · Tom Harrison → Antaeus Coe\nCan you send the Canada numbers?",
    actors: "Tom Harrison → Antaeus Coe",
    recipients: "Antaeus Coe",
    source: "outlook-ai",
  });

  test("the candidates: no live card, a record to read, nothing the ledger holds back", () => {
    const accounts = ["A", "B", "C", "D", "E", "F", "G"].map((id) => ({ id, name: id }));
    const got = offBoardCandidates({
      accounts,
      onBoard: new Set(["A"]),
      closed: new Set(["B"]),
      dispositions: new Map([
        ["C", { status: "not-mine" }],
        ["D", { status: "parked" }],
        ["G", { status: "motion" }],
      ]),
      snoozes: new Map([["E", {}]]),
      notesById: new Map(
        ["A", "B", "C", "D", "E", "G"].map((id) => [id, [{ id: `${id}1` }]] as const),
      ),
    });
    // A has its board row; B was closed and retired; C, D and E are held by
    // the ledger's hand; F has nothing on file.
    assert.deepEqual(
      got.map((p) => p.id),
      ["G"],
    );
  });

  test("a real inbound on the operator's own record makes the row", () => {
    const read = readOf([inbound]);
    assert.ok(ownRecordMotion("G1", [inbound], read.intel, NOW_OCT));
  });

  test("a call transcript filed fresh makes the row", () => {
    const tape = row({
      id: "t1",
      body: "☰ Call transcript — dropped file kickoff.vtt",
      source: "transcript",
      createdAt: "2026-10-03T15:00:00Z",
    });
    const read = readOf([tape]);
    assert.ok(ownRecordMotion("G1", [tape], read.intel, NOW_OCT));
  });

  test("an exclusion resting only on a colleague's inbox adds no row (C6)", () => {
    // The operator's own send is the whole first record: it never excludes.
    const send = row({
      id: "out1",
      body: "✉ OL Sep 30 — Canada · Antaeus Coe → Tom Harrison\nHere is the overview.",
      actors: "Antaeus Coe → Tom Harrison",
      recipients: "Tom Harrison",
      source: "outlook-ai",
      createdAt: "2026-09-30T15:00:00Z",
    });
    const read = readOf([send]);
    const second = new Map([
      ["G1", { rollup: { lastTheirs: { day: "2026-10-02" } } }],
    ]);
    // Groundwork excludes the account on the export's attributed row...
    assert.ok(liveMotionIds(new Map(), new Map([["G1", read.intel]]), NOW_OCT, second).has("G1"));
    // ...and the HomeRoom gives it no row.
    assert.equal(ownRecordMotion("G1", [send], read.intel, NOW_OCT), false);
  });

  test("the row lifts with the exclusion: an inbound past the window makes none", () => {
    const old = { ...inbound, createdAt: "2026-09-01T15:00:00Z" };
    const read = readOf([old]);
    assert.equal(ownRecordMotion("G1", [old], read.intel, NOW_OCT), false);
  });

  test("a seat on the account reads on the row's TODAY as its action (C8)", () => {
    const read = readOf([inbound]);
    const excluded = ownRecordMotion("G1", [inbound], read.intel, NOW_OCT);
    const seat = {
      id: "seat1",
      body: "⚑ Send the Canada numbers · — · seated 2026-10-06",
      createdAt: "2026-10-06T15:00:00Z",
    };
    const sheet = buildAccountSheet([], "G1", new Set(["in1"]), new Map(), NOW_OCT, [inbound], {
      rows: [seat],
      excluded,
      workedToday: false,
    });
    assert.deepEqual(
      sheet.open.map((o) => o.body),
      ["Send the Canada numbers"],
    );
  });
});

// X1, the HomeRoom's part: hidden is hidden. A ✕-parked row warms nothing in
// the eye.
describe("the eye reads the visible record (X1)", () => {
  const NOW_OCT = new Date("2026-10-07T17:00:00Z");
  const scent = {
    id: "w1",
    body: "✎ They asked about employer of record in Mexico.",
    createdAt: "2026-10-05T15:00:00Z",
  };
  test("a fresh row with the global scent warms the eye", () => {
    assert.equal(filedWarmth([scent], new Map(), NOW_OCT)?.id, "w1");
  });
  test("the same row ✕-parked warms nothing", () => {
    assert.equal(filedWarmth([scent], new Map([["hide:note:w1", {}]]), NOW_OCT), null);
  });
  test("a parked row never hides a visible one behind it", () => {
    const older = { ...scent, id: "w0", createdAt: "2026-10-02T15:00:00Z" };
    assert.equal(
      filedWarmth([scent, older], new Map([["hide:note:w1", {}]]), NOW_OCT)?.id,
      "w0",
    );
  });
});
