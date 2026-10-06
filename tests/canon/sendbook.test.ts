// The Sendbook's decrees, pinned as behavior (CLAUDE.md "The Sendbook",
// :331-354, the closer rule :407-423, the Ted doctrine's machinery clause
// :399-400, and the 2026-09-25 rulings R6 and R7). Every test calls
// buildSendbook and checks its lines and lanes; none reads a source file.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  acceptanceDates,
  buildSendbook,
  docsFromRows,
  inboundDates,
  warmDates,
  type NoteLike,
} from "../../src/lib/sendbook/read";
import { readAccount, type RecordNote } from "../../src/lib/record/read";
import { csms } from "../../src/lib/book";
import type { SecondRecord } from "../../src/lib/activity/read";

const NOW = new Date("2026-09-25T18:00:00.000Z");
// The noon-UTC day anchor every Outlook entry files at.
const NOON = "2026-09-02T12:00:00.000Z";

const send = (clock: string, createdAt = NOON) => ({
  body: `✉ OL ${clock} — Re: Canada · Antaeus Coe → Adam Reyes\nSending the model now.`,
  source: "outlook-ai",
  createdAt,
  actors: "Antaeus Coe → Adam Reyes",
});
const reply = (clock: string, text: string, createdAt = NOON, from = "Adam Reyes") => ({
  body: `✉ OL ${clock} — Re: Canada · ${from} → Antaeus Coe\n${text}`,
  source: "outlook-ai",
  createdAt,
  actors: `${from} → Antaeus Coe`,
});

// Every fixture the file builds a register from, kept for the parity pin at
// the foot: the register built from the read equals the one built from rows.
const FIXTURES: NoteLike[][] = [];
const book = (notes: ReturnType<typeof send>[]) => {
  FIXTURES.push(notes);
  return buildSendbook({
    readsById: new Map([["A1", { docs: docsFromRows(notes), secondRecord: null }]]),
    tapsById: new Map(),
    now: NOW,
  });
};

// ── E5 · "Replies annotate from the record only (↩ REPLIED)" (:348-349) read
// on the record's own clock (the Ted doctrine: the record holds a finer clock)
describe("the Sendbook reads effectiveAt (CLAUDE.md:348-349, :389)", () => {
  test("a 9:44 AM send and a 10:39 AM reply at one noon anchor: the reply annotates", () => {
    const { lines } = book([
      send("9:44 AM"),
      reply("10:39 AM", "We are in. Send the contract over when you can."),
    ]);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].at, "2026-09-02T09:44:00.000Z");
    assert.equal(lines[0].repliedAt, "2026-09-02T10:39:00.000Z");
  });

  test("the same two entries the other way round: a morning reply never answers an afternoon send", () => {
    const { lines } = book([
      send("2:15 PM"),
      reply("10:39 AM", "We are in. Send the contract over when you can."),
    ]);
    assert.equal(lines[0].at, "2026-09-02T14:15:00.000Z");
    assert.equal(lines[0].repliedAt, "");
  });
});

// ── C4 · the closer rule (:411-417) against the Sendbook (:346-349; ruled R6)
describe("↩ REPLIED needs a substantive inbound; a closer warms and sets no annotation", () => {
  test("a Thanks! after a send warms the lane and annotates nothing", () => {
    const { lines, laneById } = book([send("9:44 AM"), reply("10:39 AM", "Thanks!")]);
    assert.equal(laneById.get("A1"), "gone-cold");
    assert.equal(lines[0].repliedAt, "");
  });

  test("a substantive reply annotates the send", () => {
    const { lines, laneById } = book([
      send("9:44 AM"),
      reply("10:39 AM", "Honestly, I'd have to ask them. Can we talk Monday?"),
    ]);
    assert.equal(laneById.get("A1"), "gone-cold");
    assert.equal(lines[0].repliedAt, "2026-09-02T10:39:00.000Z");
  });

  test("a closer resets the drum all the same — their voice is still their voice", () => {
    const { lines } = book([
      send("9:44 AM", "2026-09-01T12:00:00.000Z"),
      reply("10:39 AM", "Sounds good", "2026-09-02T12:00:00.000Z"),
      send("9:00 AM", "2026-09-03T12:00:00.000Z"),
    ]);
    const steps = new Map(lines.map((l) => [l.at.slice(0, 10), l.step]));
    assert.equal(steps.get("2026-09-01"), 1);
    assert.equal(steps.get("2026-09-03"), 1);
  });
});

// ── C5 · "an auto-reply is machinery, never the client writing" (:399-400;
// ruled R7: machinery never warms and never replies) ──────────────────────
describe("machinery never warms and never replies (CLAUDE.md:399-400)", () => {
  const cases: [string, ReturnType<typeof send>][] = [
    [
      "a calendar acceptance",
      {
        body: "✉ OL 10:00 AM — Accepted: Initial Chat | Intro to PrismHR Global · Adam Reyes → Antaeus Coe\n",
        source: "outlook-ai",
        createdAt: NOON,
        actors: "Adam Reyes → Antaeus Coe",
      },
    ],
    [
      "a bounce",
      {
        body: "✉ OL 10:00 AM — Undeliverable: Re: Canada · Mail Delivery System → Antaeus Coe\nYour message could not be delivered.",
        source: "outlook-ai",
        createdAt: NOON,
        actors: "Mail Delivery System → Antaeus Coe",
      },
    ],
    [
      "a campaign alert",
      {
        body: "✉ OL 10:00 AM — 📣 New Website or Campaign Response Lead · Marketing → Antaeus Coe\nA lead was routed to you.",
        source: "outlook-ai",
        createdAt: NOON,
        actors: "Marketing → Antaeus Coe",
      },
    ],
    [
      "an out-of-office",
      {
        body: "✉ OL 10:00 AM — Automatic reply: Re: Canada · Adam Reyes → Antaeus Coe\nI am out until Monday.",
        source: "outlook-ai",
        createdAt: NOON,
        actors: "Adam Reyes → Antaeus Coe",
      },
    ],
  ];

  for (const [label, note] of cases) {
    test(`${label} neither warms the lane nor annotates the send`, () => {
      assert.deepEqual(warmDates([note]), [], label);
      assert.deepEqual(inboundDates([note]), [], label);
      const { lines, laneById } = book([send("9:44 AM"), note]);
      assert.equal(laneById.get("A1"), "never-met", label);
      assert.equal(lines[0].repliedAt, "", label);
    });
  }

  test("a person's own reply, for contrast, does both", () => {
    const note = reply("10:39 AM", "We are in. Send the contract over.");
    assert.equal(warmDates([note]).length, 1);
    assert.equal(inboundDates([note]).length, 1);
  });
});

// ── BOOKED (decided 2026-10-06; the plan's §5 item 9) ──────────────────────
// A send their calendar answered carries BOOKED. The acceptance is machinery
// (C5), so it says what happened and nothing more: no warmth, no reply, no
// fresh drum.
describe("a send their calendar accepted carries BOOKED, and BOOKED is never a reply", () => {
  const accepted = (clock: string, createdAt = NOON, from = "Adam Reyes") => ({
    body: `✉ OL ${clock} — Accepted: Global intro · ${from} → Antaeus Coe\n`,
    source: "outlook-ai",
    createdAt,
    actors: `${from} → Antaeus Coe`,
  });

  test("their acceptance after a send books it, and the lane stays NEVER MET", () => {
    const { lines, laneById } = book([send("9:44 AM"), accepted("11:02 AM")]);
    assert.equal(lines[0].bookedAt, "2026-09-02T11:02:00.000Z");
    assert.equal(lines[0].repliedAt, "");
    assert.equal(laneById.get("A1"), "never-met");
  });

  test("the drum keeps counting across an acceptance", () => {
    const { lines } = book([
      send("9:44 AM", "2026-09-01T12:00:00.000Z"),
      accepted("11:02 AM", "2026-09-01T12:00:00.000Z"),
      send("9:44 AM", "2026-09-03T12:00:00.000Z"),
    ]);
    const [newer, older] = lines;
    assert.equal(older.bookedAt, "2026-09-01T11:02:00.000Z");
    assert.equal(newer.step, 2);
    assert.equal(newer.bookedAt, "");
  });

  test("our own side accepting books nothing", () => {
    assert.deepEqual(acceptanceDates([accepted("11:02 AM", NOON, "Antaeus Coe")]), []);
    const { lines } = book([send("9:44 AM"), accepted("11:02 AM", NOON, "Antaeus Coe")]);
    assert.equal(lines[0].bookedAt, "");
  });

  test("an acceptance before the send answers nothing; a decline books nothing", () => {
    assert.equal(book([send("2:15 PM"), accepted("11:02 AM")]).lines[0].bookedAt, "");
    const declined = {
      ...accepted("11:02 AM"),
      body: "✉ OL 11:02 AM — Declined: Global intro · Adam Reyes → Antaeus Coe\n",
    };
    assert.deepEqual(acceptanceDates([declined]), []);
  });

  test("a reply and an acceptance both annotate the send", () => {
    const { lines } = book([
      send("9:44 AM"),
      reply("10:39 AM", "Tuesday works. Sending an invite."),
      accepted("11:02 AM"),
    ]);
    assert.equal(lines[0].repliedAt, "2026-09-02T10:39:00.000Z");
    assert.equal(lines[0].bookedAt, "2026-09-02T11:02:00.000Z");
  });
});

// ── slice 13 · the register reads the single account read (§2.2) ───────────
// The rows door and the read build one register: a row goes through the same
// docOf the read uses, so warmth, ↩ REPLIED and the steps come out the same
// whichever door the record came in by.
describe("the register built from the read equals the register built from rows", () => {
  const rowsOf = (notes: NoteLike[]): RecordNote[] =>
    notes.map((n, i) => ({
      id: `r${i + 1}`,
      accountId: "A1",
      partner: "",
      kind: "account",
      lane: "mine",
      actors: n.actors ?? "",
      source: n.source,
      recipients: "",
      body: n.body,
      createdAt: n.createdAt,
    }));
  const readOf = (notes: NoteLike[], secondRecord: SecondRecord | null = null) =>
    readAccount({
      account: { id: "A1", name: "Canon Fixture Co" },
      notes: rowsOf(notes),
      touches: [],
      todos: [],
      dispositions: new Map(),
      secondRecord,
      homeSide: csms,
      now: NOW,
    });
  const fromRows = (notes: NoteLike[]) =>
    buildSendbook({
      readsById: new Map([["A1", { docs: docsFromRows(notes), secondRecord: null }]]),
      tapsById: new Map(),
      now: NOW,
    });
  const fromRead = (notes: NoteLike[]) =>
    buildSendbook({ readsById: new Map([["A1", readOf(notes)]]), tapsById: new Map(), now: NOW });

  test("on every fixture this file holds", () => {
    assert.ok(FIXTURES.length >= 8, `fixtures collected: ${FIXTURES.length}`);
    for (const notes of FIXTURES) {
      const a = fromRows(notes);
      const b = fromRead(notes);
      assert.deepEqual(b.lines, a.lines);
      assert.deepEqual([...b.laneById], [...a.laneById]);
    }
  });

  test("the lane and the annotation come off the doc's flags, not a second reading of the row", () => {
    const notes = [send("9:44 AM"), reply("10:39 AM", "We are in. Send the contract over.")];
    const read = readOf(notes);
    const [inDoc] = read.docs.filter((d) => d.direction === "in");
    assert.equal(inDoc.senderIsHome, false);
    assert.equal(inDoc.machinery, false);
    assert.equal(inDoc.closer, false);
    assert.deepEqual(warmDates(read.docs), [inDoc.at]);
    assert.deepEqual(inboundDates(read.docs), [inDoc.at]);
    assert.equal(read.warmth.lastReplyAt, inDoc.at, "the read's own warmth agrees");
  });
});

// ── slice 13 · the two pages build one register (pass 4 G4) ─────────────────
// Groundwork and /sendbook each used to build the register from their own
// projection of the rows, and only /sendbook poured the second record in. Both
// now hand the same read, so an account whose reply landed in a colleague's
// inbox reads GONE COLD on the Tallyfoot and on /sendbook alike — and only an
// attributed inbound body is that reply (D19).
describe("Groundwork's and /sendbook's registers agree on an account with an org inbound", () => {
  const theirs = (over: Partial<NonNullable<SecondRecord["rollup"]>>): SecondRecord => ({
    rollup: {
      dropSha: "d1",
      dropDay: "2026-09-24",
      window: { from: "2026-06-24", to: "2026-09-24" },
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
    },
    gems: [],
    support: null,
    intent: null,
  });
  const notes = [send("9:44 AM")];
  const rows: RecordNote[] = notes.map((n, i) => ({
    id: `s${i + 1}`,
    accountId: "A1",
    partner: "",
    kind: "account",
    lane: "mine",
    actors: n.actors,
    source: n.source,
    recipients: "",
    body: n.body,
    createdAt: n.createdAt,
  }));
  const sr = theirs({
    lastTheirs: { day: "2026-09-10", who: "Adam Reyes", subject: "Re: Canada" },
    lastOrgInbound: "2026-09-10 09:12",
  });
  const register = (touches: Parameters<typeof readAccount>[0]["touches"]) =>
    buildSendbook({
      readsById: new Map([
        [
          "A1",
          readAccount({
            account: { id: "A1", name: "Canon Fixture Co" },
            notes: rows,
            touches,
            todos: [],
            dispositions: new Map(),
            secondRecord: sr,
            homeSide: csms,
            now: NOW,
          }),
        ],
      ]),
      tapsById: new Map(),
      now: NOW,
    });

  test("the same read on both pages: one lane, one annotation, from the attributed inbound", () => {
    // /sendbook's assembly and Groundwork's, which also carries the touch log.
    const plain = register([]);
    const withLog = register([
      {
        subjectKey: "outreach:A1",
        label: "",
        contactedAt: "2026-09-03T15:00:00.000Z",
        status: "awaiting",
        log: [],
      },
    ]);
    assert.deepEqual(withLog.lines, plain.lines);
    assert.deepEqual([...withLog.laneById], [...plain.laneById]);
    assert.equal(plain.laneById.get("A1"), "gone-cold");
    assert.equal(plain.lines[0].repliedAt, "2026-09-10T12:00:00.000Z");
  });

  test("the account-level datetime alone sets neither (D19)", () => {
    const datetimeOnly = theirs({ lastOrgInbound: "2026-09-10 09:12" });
    const { lines, laneById } = buildSendbook({
      readsById: new Map([["A1", { docs: docsFromRows(notes), secondRecord: datetimeOnly }]]),
      tapsById: new Map(),
      now: NOW,
    });
    assert.equal(laneById.get("A1"), "never-met");
    assert.equal(lines[0].repliedAt, "");
  });
});
