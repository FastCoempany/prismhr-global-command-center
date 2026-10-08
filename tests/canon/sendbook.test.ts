// The Sendbook's decrees, pinned as behavior (CLAUDE.md "The Sendbook",
// :331-354, the closer rule :407-423, the Ted doctrine's machinery clause
// :399-400, and the 2026-09-25 rulings R6 and R7). Every test calls
// buildSendbook and checks its lines and lanes, or renders the marks the page
// paints; the one exception reads the register's stylesheet, because the
// palette has no other reader (pass 8 S1).

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { createElement } from "react";
import { render, textOf } from "../helpers/room-render";
import {
  acceptanceDates,
  buildSendbook,
  CHANNELS,
  docsFromRows,
  inboundDates,
  parseSendbookBody,
  sendbookNoteBody,
  warmDates,
  weekStats,
  type Channel,
  type NoteLike,
} from "../../src/lib/sendbook/read";
import {
  ASK_IDLE,
  ASK_MORE,
  ASK_PRIMARY,
  askStep,
  type AskEvent,
  type AskState,
} from "../../src/lib/sendbook/ask";
import {
  liveMoves,
  takeBack,
  tapTouches,
  todaysSends,
  workChannel,
  type TakeBackStore,
  type WorkWriter,
} from "../../src/lib/groundwork/worked";
import { buildQueue } from "../../src/lib/groundwork/day";
import { WAYFINDER_ROUTES, pageFileFor } from "../../src/components/wayfinder-routes";
import { dayLabelFor } from "../../src/lib/scratch";
import type { Peo } from "../../src/lib/book";
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
    buildSendbook({
      readsById: new Map([["A1", readOf(notes)]]),
      tapsById: new Map(),
      now: NOW,
    });

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
    const notes = [
      send("9:44 AM"),
      reply("10:39 AM", "We are in. Send the contract over."),
    ];
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
    // The door opens to the export's own row: its writer and subject. The
    // body never uploaded, so there is none to show (D21; pass 8 S2).
    assert.deepEqual(plain.lines[0].reply, {
      at: "2026-09-10T12:00:00.000Z",
      who: "Adam Reyes",
      head: "Re: Canada",
      excerpt: "",
      from: "export",
    });
  });

  test("the account-level datetime alone sets neither (D19)", () => {
    const datetimeOnly = theirs({ lastOrgInbound: "2026-09-10 09:12" });
    const { lines, laneById } = buildSendbook({
      readsById: new Map([
        ["A1", { docs: docsFromRows(notes), secondRecord: datetimeOnly }],
      ]),
      tapsById: new Map(),
      now: NOW,
    });
    assert.equal(laneById.get("A1"), "never-met");
    assert.equal(lines[0].repliedAt, "");
  });
});

// ── pass 8 S2 · ↩ REPLIED and BOOKED are doors (the click-depth law) ───────
// An annotation is a compression of a message. One click opens it in place:
// who wrote it, its subject and day, and the words when the record holds
// them. The read carries the message behind each mark; the page's marks
// render it behind a <details>, with no page and no link.
describe("↩ REPLIED and BOOKED open to the message they report (pass 8 S2)", () => {
  const accepted = (clock: string) => ({
    body: `✉ OL ${clock} — Accepted: Global intro · Adam Reyes → Antaeus Coe\n`,
    source: "outlook-ai",
    createdAt: NOON,
    actors: "Adam Reyes → Antaeus Coe",
  });
  const marks = () => import("../../src/app/sendbook/marks");

  test("the line carries the reply and the acceptance behind its marks", () => {
    const { lines } = book([
      send("9:44 AM"),
      reply("10:39 AM", "Tuesday works. Sending an invite."),
      accepted("11:02 AM"),
    ]);
    assert.deepEqual(lines[0].reply, {
      at: "2026-09-02T10:39:00.000Z",
      who: "Adam Reyes",
      head: "Re: Canada",
      excerpt: "Tuesday works. Sending an invite.",
      from: "record",
    });
    assert.deepEqual(lines[0].booking, {
      at: "2026-09-02T11:02:00.000Z",
      who: "Adam Reyes",
      head: "Accepted: Global intro",
      excerpt: "",
      from: "record",
    });
  });

  test("a line with no annotation carries no message", () => {
    const { lines } = book([send("9:44 AM")]);
    assert.equal(lines[0].reply, null);
    assert.equal(lines[0].booking, null);
  });

  test("the message is rendered, so money never reaches it", () => {
    const { lines } = book([
      send("9:44 AM"),
      reply("10:39 AM", "We can do $12,000 a month if the Canada piece lands."),
    ]);
    assert.ok(lines[0].reply);
    assert.doesNotMatch(lines[0].reply.excerpt, /12,000/);
  });

  test("each mark opens in place to its message: one click, no link", async () => {
    const { lines } = book([
      send("9:44 AM"),
      reply("10:39 AM", "Tuesday works. Sending an invite."),
      accepted("11:02 AM"),
    ]);
    const { SendMarks } = await marks();
    const html = await render(
      createElement(SendMarks, {
        mktg: false,
        cold: false,
        reply: lines[0].reply,
        booking: lines[0].booking,
      }),
    );
    assert.equal((html.match(/<details/g) ?? []).length, 2, "two marks, two doors");
    assert.equal((html.match(/<summary/g) ?? []).length, 2);
    assert.doesNotMatch(html, /<a\s/, "the door is in place, never a link");
    const text = textOf(html);
    assert.match(text, /↩ REPLIED 9\/2/);
    assert.match(text, /BOOKED 9\/2/);
    assert.match(text, /Re: Canada/);
    assert.match(text, /Tuesday works\. Sending an invite\./);
    assert.match(text, /Accepted: Global intro/);
    assert.match(text, /Adam Reyes/);
  });
});

// ── pass 8 S1 · the marks speak plainly, in the brand's palette ────────────
describe("the Sendbook's marks speak plainly and wear the brand palette (pass 8 S1)", () => {
  test("no mark's title is balanced on an antithesis or hangs an em-dash aside", async () => {
    const { MARK_TITLES } = await import("../../src/app/sendbook/marks");
    for (const t of Object.values(MARK_TITLES)) {
      assert.doesNotMatch(t, /—/, t);
      assert.doesNotMatch(t, /,\s*not an?\s+\w+\.?$/i, t);
      assert.doesNotMatch(t, /it informs; it never blocks/i, t);
    }
  });

  // Rewritten in pass 10: the two marks were hover titles only, a dead end
  // on touch (the click-depth law). Each is now a door whose fold carries
  // the same words, after the evidence it stands on.
  test("GONE COLD and MKTG LIVE open, one click deep, to their evidence and those words", async () => {
    const { MARK_TITLES, SendMarks } = await import("../../src/app/sendbook/marks");
    const html = await render(
      createElement(SendMarks, {
        mktg: true,
        cold: true,
        coldSince: "2026-08-14T15:00:00.000Z",
        mktgSends: 3,
        reply: null,
        booking: null,
      }),
    );
    const doors = [
      ...html.matchAll(
        /<details class="door"><summary class="(\w+)">([^<]*)<\/summary><div class="answer">([\s\S]*?)<\/div><\/details>/g,
      ),
    ].map((m) => [m[1], m[2], textOf(m[3])]);
    assert.deepEqual(doors, [
      [
        "mktgLive",
        "MKTG LIVE",
        `Marketing sent 3 emails here in the last seven days. ${MARK_TITLES.mktg}`,
      ],
      ["cold", "GONE COLD", `Last warm 8/14. ${MARK_TITLES.cold}`],
    ]);
    assert.ok(!/<details[^>]* open/.test(html), "a fold opened on arrival");
    assert.doesNotMatch(html, /re-open, not an introduction/);
    // With no evidence on file, the door still opens to the plain words.
    const bare = await render(
      createElement(SendMarks, { mktg: true, cold: true, reply: null, booking: null }),
    );
    assert.ok(textOf(bare).includes(MARK_TITLES.cold));
    assert.ok(!textOf(bare).includes("Last warm"));
    // The page hands each line its evidence from both records.
    const page = readFileSync(join(cwd(), "src/app/sendbook/page.tsx"), "utf8");
    assert.match(page, /\[read\.warmth\.lastWarmAt, org\.theirsAt\]/);
    assert.match(page, /coldSince: lastWarm\.get\(l\.accountId\)/);
    assert.match(page, /mktgSends: mktgSends\.get\(l\.accountId\)/);
  });

  test("every color the register's stylesheet names is the brand's", () => {
    // The palette, never an ad-hoc hue (the design canon): navy ink, the
    // field, white, and the five role accents.
    const BRAND = new Set([
      "0a1c40",
      "f5f7fb",
      "ffffff",
      "e6701e",
      "2563eb",
      "22c55e",
      "f59e0b",
      "ef4444",
    ]);
    const css = readFileSync(join(cwd(), "src/app/sendbook/sendbook.module.css"), "utf8");
    const off: string[] = [];
    for (const m of css.matchAll(/#([0-9a-f]{3,8})\b/gi)) {
      const h = m[1].toLowerCase();
      const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h.slice(0, 6);
      if (!BRAND.has(full)) off.push(m[0]);
    }
    for (const m of css.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
      const full = [m[1], m[2], m[3]]
        .map((n) => Number(n).toString(16).padStart(2, "0"))
        .join("");
      if (!BRAND.has(full)) off.push(m[0]);
    }
    assert.deepEqual(off, []);
  });
});

// ═══ Pass 10: the Sendbook's honor rows, pinned (CLAUDE.md "The Sendbook") ═══
// A10.1 to A10.3 render the register, its door and the wayfinder; A10.6,
// A10.18 and A10.22 walk the Channel Ask's steps and paint each one; A10.9,
// A10.11, A10.20 and A10.21 call the reads and the writes the page and the
// actions run, through a recording writer in place of the database.

type El = { type: unknown; props: Record<string, unknown> };
/** Every element in a tree a component returned, depth first. */
const elementsOf = (node: unknown): El[] => {
  if (Array.isArray(node)) return node.flatMap(elementsOf);
  if (node && typeof node === "object" && "props" in node) {
    const el = node as El;
    return [el, ...elementsOf(el.props.children)];
  }
  return [];
};
/** A writer or store that records every method called on it, by name. */
const recorder = <T extends object>(impl: T) => {
  const calls: { name: string; args: unknown[] }[] = [];
  const proxy = new Proxy(impl, {
    get(target, name) {
      return async (...args: unknown[]) => {
        calls.push({ name: String(name), args });
        const fn = (target as Record<string | symbol, unknown>)[name];
        return typeof fn === "function" ? fn(...args) : undefined;
      };
    },
  }) as T;
  return { proxy, calls };
};
const peoFixture: Peo = {
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
  fit: 40,
  fitTier: "low",
};
const tapNote = (createdAt: string, channel = "CALL") => ({
  body: sendbookNoteBody(channel as Channel, "Adam Reyes", "Send the model."),
  source: "sendbook",
  createdAt,
});

describe("A10.1 · the outreach register lives at /sendbook", () => {
  test("the route is a page, and the page paints the register: week head, day kickers, every touch", async () => {
    assert.ok(existsSync(join(cwd(), pageFileFor("/sendbook"))));
    const { lines, laneById } = buildSendbook({
      readsById: new Map([
        ["A1", { docs: docsFromRows([send("9:44 AM")]), secondRecord: null }],
      ]),
      tapsById: new Map([["A1", [tapNote("2026-09-25T15:00:00.000Z")]]]),
      now: NOW,
    });
    const { SendbookRegister } = await import("../../src/app/sendbook/register");
    const html = await render(
      createElement(SendbookRegister, {
        week: weekStats({ lines, laneById }, NOW),
        channelsPresent: [...new Set(lines.map((l) => l.channel))],
        filter: "",
        lines: lines.map((l) => ({
          ...l,
          name: "Canon Fixture Co",
          day: dayLabelFor(l.at, NOW),
          mktg: false,
          cold: laneById.get(l.accountId) === "gone-cold",
        })),
        total: lines.length,
        allHref: "/sendbook?all=1",
      }),
    );
    const text = textOf(html);
    assert.match(html, /<h1 class="masthead">The Sendbook<\/h1>/);
    assert.match(text, /1 touch this week/);
    assert.match(
      text,
      /TODAY CALL Canon Fixture Co STEP 2 Send the model\. · Adam Reyes/,
    );
    assert.match(text, /SEP 2 EMAIL Canon Fixture Co STEP 1 Re: Canada · Adam Reyes/);
    assert.match(html, /href="\/accounts\?focus=A1"/);
  });
});

describe("A10.2 · doored from Groundwork's page-foot Tallyfoot line", () => {
  test("the Tallyfoot is a door to /sendbook that reads THIS WEEK · N WORKED · …", async () => {
    const { Tallyfoot } = await import("../../src/app/groundwork/face");
    const week = {
      total: 3,
      byChannel: [
        ["EMAIL", 2],
        ["CALL", 1],
      ] as [Channel, number][],
      accounts: 2,
      replied: 1,
      neverMet: 2,
      goneCold: 0,
    };
    const html = await render(createElement(Tallyfoot, { week, staleDropDays: null }));
    assert.match(
      html,
      /^<div class="tallyfoot"><a class="tallyDoor"[^>]*href="\/sendbook">/,
    );
    assert.equal(
      textOf(html),
      "THIS WEEK · 3 WORKED · 2 EMAIL · 1 CALL · 2 ACCOUNTS · 1 REPLIED · THE SENDBOOK →",
    );
    const quiet = await render(
      createElement(Tallyfoot, {
        week: { ...week, total: 0, byChannel: [], accounts: 0, replied: 0 },
        staleDropDays: null,
      }),
    );
    assert.equal(textOf(quiet), "THIS WEEK · NOTHING WORKED YET · THE SENDBOOK →");
  });

  test("the Tallyfoot is the face's last landmark: the page foot", async () => {
    const { GroundworkFace } = await import("../../src/app/groundwork/face");
    const html = await render(
      createElement(GroundworkFace, {
        nudge: false,
        done: [],
        canWrite: false,
        stage: null,
        waiting: [],
        rest: [],
        hrefOf: () => "",
        deck: {
          canWrite: false,
          wire: [],
          wireCount: 0,
          wireAll: false,
          wireHref: "/groundwork?wire=all",
          wireAvailable: false,
          wireIsDue: false,
          inst: null,
          readout: { sections: [] },
          readoutPayload: "",
          lintIssues: [],
          readoutReadAt: undefined,
          idToName: (id: string) => id,
          wireWhen: () => "",
          monthDay: () => "",
        },
        foot: {
          week: {
            total: 0,
            byChannel: [],
            accounts: 0,
            replied: 0,
            neverMet: 0,
            goneCold: 0,
          },
          staleDropDays: null,
        },
      }),
    );
    assert.match(
      html,
      /<div class="tallyfoot"><a class="tallyDoor"[^>]*href="\/sendbook">[^<]*<\/a><\/div><\/main>$/,
    );
  });
});

describe("A10.3 · /sendbook is never in the top wayfinder", () => {
  test("the route table holds no /sendbook row", () => {
    assert.equal(
      WAYFINDER_ROUTES.some((r) => r.href.startsWith("/sendbook")),
      false,
    );
  });

  test("the wayfinder paints no door to it on any page, the Sendbook's own included", async () => {
    const { AppWayfinder } = await import("../../src/components/app-wayfinder");
    const currents = [...new Set(WAYFINDER_ROUTES.flatMap((r) => r.pages))];
    assert.ok(currents.includes("Groundwork"), "the Sendbook mounts it as Groundwork");
    for (const current of currents) {
      const html = await render(await AppWayfinder({ current, trail: "The record" }));
      assert.match(html, /href="\/groundwork"/, current);
      assert.doesNotMatch(html, /\/sendbook|Sendbook/i, current);
    }
  });
});

describe("A10.6 · the Channel Ask: Worked-it springs a chip row and files a sendbook:<account> note", () => {
  const paint = async (state: AskState, contacts: string[] = []) => {
    const { AskRow } = await import("../../src/app/groundwork/channel-ask");
    return render(
      createElement(AskRow, {
        state,
        contacts,
        pending: false,
        accent: true,
        send: () => {},
      }),
    );
  };
  const chips = (html: string) =>
    [...html.matchAll(/<button[^>]*>([^<]*)<\/button>/g)].map((m) => m[1]);

  test("the chips are the decree's channels in its order, and every channel the register knows has one", () => {
    assert.deepEqual(ASK_PRIMARY, [
      "EMAIL",
      "CALL",
      "VOICEMAIL",
      "TEXT",
      "LINKEDIN",
      "INMAIL",
    ]);
    assert.deepEqual(ASK_MORE, [
      "ENGAGED",
      "CONNECT",
      "VIDEO",
      "EVENT",
      "MAILER",
      "INTRO",
      "CSM RELAY",
    ]);
    assert.deepEqual([...ASK_PRIMARY, ...ASK_MORE], [...CHANNELS]);
  });

  test("Worked-it springs the row; ··· opens the rest", async () => {
    assert.deepEqual(chips(await paint(ASK_IDLE)), ["Worked it"]);
    const open = askStep(ASK_IDLE, { kind: "open" }, []).state;
    assert.deepEqual(chips(await paint(open)), [...ASK_PRIMARY, "···", "✕"]);
    const more = askStep(open, { kind: "more" }, []).state;
    assert.deepEqual(chips(await paint(more)), [...ASK_PRIMARY, ...ASK_MORE, "✕"]);
  });

  test("one tap files when the merged names hold one; the who row asks when they hold more", () => {
    const open = askStep(ASK_IDLE, { kind: "open" }, []).state;
    assert.deepEqual(
      askStep(open, { kind: "pick", channel: "CALL" }, ["Adam Reyes"]).file,
      {
        channel: "CALL",
        who: "Adam Reyes",
      },
    );
    assert.deepEqual(askStep(open, { kind: "pick", channel: "CALL" }, []).file, {
      channel: "CALL",
      who: "",
    });
    const asked = askStep(open, { kind: "pick", channel: "TEXT" }, [
      "Adam Reyes",
      "Dana Ellis",
    ]);
    assert.equal(asked.file, null);
    assert.equal(asked.state.stage, "contact");
    assert.deepEqual(askStep(asked.state, { kind: "who", name: "Dana Ellis" }, []).file, {
      channel: "TEXT",
      who: "Dana Ellis",
    });
    assert.deepEqual(askStep(asked.state, { kind: "skip" }, []).file, {
      channel: "TEXT",
      who: "",
    });
  });

  test("the tap files one sendbook:<account> note and the stamp, at one moment", async () => {
    const at = new Date("2026-09-25T15:00:00.000Z");
    const { proxy, calls } = recorder<WorkWriter>({} as WorkWriter);
    await workChannel(
      proxy,
      {
        mk: "A1:silence-bump",
        accountId: "A1",
        channel: "CALL",
        contact: "Adam Reyes",
        clause: "Send the second touch.",
      },
      at,
    );
    assert.deepEqual(
      calls.map((c) => c.name),
      ["note", "stamp"],
    );
    const note = calls[0].args[0] as {
      accountId: string;
      body: string;
      at: Date;
      source: string;
    };
    assert.equal(note.accountId, "sendbook:A1");
    assert.equal(note.source, "sendbook");
    assert.equal(note.at, at);
    assert.deepEqual(parseSendbookBody(note.body), {
      channel: "CALL",
      contact: "Adam Reyes",
      clause: "Send the second touch.",
    });
    assert.deepEqual(calls[1].args, ["groundwork:2026-09-25:A1:silence-bump", at]);
  });

  test("a channel the register does not know files no note and still stamps; a lost note never costs the stamp", async () => {
    const at = new Date("2026-09-25T15:00:00.000Z");
    const odd = recorder<WorkWriter>({} as WorkWriter);
    await workChannel(
      odd.proxy,
      { mk: "A1:x", accountId: "A1", channel: "FAX", contact: "", clause: "" },
      at,
    );
    assert.deepEqual(
      odd.calls.map((c) => c.name),
      ["stamp"],
    );
    const stamps: string[] = [];
    await workChannel(
      {
        note: async () => {
          throw new Error("down");
        },
        stamp: async (key) => {
          stamps.push(key);
        },
      },
      { mk: "A1:x", accountId: "A1", channel: "CALL", contact: "", clause: "" },
      at,
    );
    assert.deepEqual(stamps, ["groundwork:2026-09-25:A1:x"]);
  });
});

describe("A10.9 · the pre-answer rule: an outbound the record holds today answers the ask before it opens", () => {
  const line = (accountId: string, at: string, from: "record" | "tap") => ({
    accountId,
    at,
    from,
  });

  test("a record send today pre-answers; a tap, or yesterday's send, does not", () => {
    const { recordSent, newest } = todaysSends(
      [
        line("A1", "2026-09-25T16:00:00.000Z", "record"),
        line("A2", "2026-09-25T15:00:00.000Z", "tap"),
        // 02:00Z on the 25th is 9 PM on the 24th in Chicago.
        line("A3", "2026-09-25T02:00:00.000Z", "record"),
      ],
      "2026-09-25",
    );
    assert.deepEqual([...recordSent], ["A1"]);
    assert.deepEqual([...newest.keys()], ["A1", "A2"]);
  });

  test("the record's own send from the register reaches the rule", () => {
    const { lines } = buildSendbook({
      readsById: new Map([
        [
          "A1",
          {
            docs: docsFromRows([send("9:44 AM", "2026-09-25T12:00:00.000Z")]),
            secondRecord: null,
          },
        ],
      ]),
      tapsById: new Map(),
      now: NOW,
    });
    assert.deepEqual([...todaysSends(lines, "2026-09-25").recordSent], ["A1"]);
  });

  test("pre-answered, Worked-it is a plain stamp with no chip row; otherwise the ask opens", async () => {
    const { WorkedControl } = await import("../../src/app/groundwork/face");
    const props = {
      mk: "A1:wire-trigger",
      accountId: "A1",
      contacts: [],
      clause: "Send the note.",
      accent: true,
    };
    const pre = await render(
      createElement(WorkedControl, { ...props, preAnswered: true }),
    );
    assert.match(
      pre,
      /^<form[^>]*><button[^>]*type="submit" title="The record already holds today&#x27;s send\. This stamps the move worked\.">Worked it<\/button><\/form>/,
    );
    const forms = elementsOf(WorkedControl({ ...props, preAnswered: true })).filter(
      (e) => e.type === "form",
    );
    assert.equal((forms[0]?.props.action as { name?: string })?.name, "bound markWorked");
    const asked = await render(
      createElement(WorkedControl, { ...props, preAnswered: false }),
    );
    assert.doesNotMatch(asked, /<form/);
    assert.match(asked, /^<button type="button"[^>]*>Worked it<\/button>$/);
  });
});

describe("A10.11 · tapped touches are synthesized into the drumbeat at read time, never written to the touch log", () => {
  test("each tap reads as an awaiting outreach touch at its own moment", () => {
    assert.deepEqual(
      tapTouches(
        new Map([
          [
            "A1",
            [tapNote("2026-09-14T15:00:00.000Z"), tapNote("2026-09-10T15:00:00.000Z")],
          ],
        ]),
      ),
      [
        {
          subjectKey: "outreach:A1",
          label: "",
          contactedAt: "2026-09-14T15:00:00.000Z",
          followUpAt: "",
          status: "awaiting",
          log: [],
        },
        {
          subjectKey: "outreach:A1",
          label: "",
          contactedAt: "2026-09-10T15:00:00.000Z",
          followUpAt: "",
          status: "awaiting",
          log: [],
        },
      ],
    );
  });

  test("the drumbeat runs on the synthesized taps: a tap left unanswered a week bumps", () => {
    const run = (taps: ReturnType<typeof tapNote>[]) =>
      buildQueue({
        accounts: [peoFixture],
        intelById: new Map(),
        notesById: new Map(),
        touches: tapTouches(new Map([[peoFixture.id, taps]])),
        contactCountById: () => 5,
        now: NOW,
      }).all.find((q) => q.accountId === peoFixture.id);
    assert.equal(run([tapNote("2026-09-14T15:00:00.000Z")])?.ruleId, "silence-bump");
    assert.notEqual(run([tapNote("2026-09-23T15:00:00.000Z")])?.ruleId, "silence-bump");
  });

  test("working a move writes the tap note and the stamp, and nothing to the touch log", async () => {
    const { proxy, calls } = recorder<WorkWriter>({} as WorkWriter);
    for (const channel of CHANNELS)
      await workChannel(
        proxy,
        { mk: "A1:seated", accountId: "A1", channel, contact: "", clause: "" },
        new Date(NOW),
      );
    assert.deepEqual([...new Set(calls.map((c) => c.name))].sort(), ["note", "stamp"]);
    for (const c of calls.filter((x) => x.name === "note"))
      assert.match((c.args[0] as { accountId: string }).accountId, /^sendbook:/);
  });
});

describe("A10.18 · outcomes are never asked", () => {
  // Every state the Channel Ask can reach, from every event, for no name, one
  // name and two names.
  const reachable = () => {
    const events: AskEvent[] = [
      { kind: "open" },
      { kind: "more" },
      { kind: "pick", channel: "CALL" },
      { kind: "who", name: "Dana Ellis" },
      { kind: "skip" },
      { kind: "close" },
    ];
    const out: { state: AskState; contacts: string[]; files: unknown[] }[] = [];
    for (const contacts of [[], ["Adam Reyes"], ["Adam Reyes", "Dana Ellis"]]) {
      const seen = new Map<string, AskState>([[JSON.stringify(ASK_IDLE), ASK_IDLE]]);
      const files: unknown[] = [];
      const queue = [ASK_IDLE];
      while (queue.length) {
        const s = queue.shift()!;
        for (const e of events) {
          const r = askStep(s, e, contacts);
          if (r.file) files.push(r.file);
          const k = JSON.stringify(r.state);
          if (!seen.has(k)) {
            seen.set(k, r.state);
            queue.push(r.state);
          }
        }
      }
      for (const state of seen.values()) out.push({ state, contacts, files });
    }
    return out;
  };

  test("the ask's only steps are the button, the channel and the who; a tap files a channel and a person", () => {
    for (const { state, files } of reachable()) {
      assert.ok(["idle", "channel", "contact"].includes(state.stage));
      for (const f of files)
        assert.deepEqual(Object.keys(f as object).sort(), ["channel", "who"]);
    }
  });

  test("no painted step asks how it went", async () => {
    const { AskRow } = await import("../../src/app/groundwork/channel-ask");
    for (const { state, contacts } of reachable()) {
      const text = textOf(
        await render(
          createElement(AskRow, {
            state,
            contacts,
            pending: false,
            accent: true,
            send: () => {},
          }),
        ),
      );
      assert.doesNotMatch(
        text,
        /\?|\b(outcome|result|replied|reply|answer|answered|booked|interested|no answer|went|meeting)\b/i,
        text,
      );
    }
  });
});

describe("A10.19 · the register tells what happened; what is due next stays Groundwork's", () => {
  test("a register line holds what happened and its annotations, and nothing ahead", () => {
    const { lines } = book([send("9:44 AM"), reply("10:39 AM", "Tuesday works.")]);
    assert.deepEqual(Object.keys(lines[0]).sort(), [
      "accountId",
      "at",
      "bookedAt",
      "booking",
      "channel",
      "clause",
      "contact",
      "from",
      "repliedAt",
      "reply",
      "step",
    ]);
  });

  test("the painted register carries no move and no form; its one word of what is due points at Groundwork", async () => {
    const { lines, laneById } = book([
      send("9:44 AM"),
      reply("10:39 AM", "Tuesday works."),
    ]);
    const { SendbookRegister } = await import("../../src/app/sendbook/register");
    const html = await render(
      createElement(SendbookRegister, {
        week: weekStats({ lines, laneById }, NOW),
        channelsPresent: ["EMAIL"],
        filter: "",
        lines: lines.map((l) => ({
          ...l,
          name: "Canon Fixture Co",
          day: dayLabelFor(l.at, NOW),
          mktg: false,
          cold: true,
        })),
        total: lines.length,
        allHref: "/sendbook?all=1",
      }),
    );
    assert.doesNotMatch(html, /<form|<input|<textarea|<button/);
    const text = textOf(html).replace(/ \./g, ".");
    assert.deepEqual(
      [
        ...text.matchAll(
          /[^.]*\b(due|next|follow[- ]?up|overdue|chase|send the|call the)\b[^.]*\./gi,
        ),
      ].map((m) => m[0].trim()),
      ["What’s due next is on Groundwork."],
    );
    assert.match(html, /What’s due next is on <a href="\/groundwork">Groundwork<\/a>\./);
  });
});

describe("A10.20, A10.21 · every stamp's ↺ returns the move and withdraws its tap; the record's own entries are never unwritten", () => {
  const stampAt = new Date("2026-09-25T15:00:00.000Z");
  const store = () => {
    const stamps = new Map([["groundwork:2026-09-25:A1:silence-bump", stampAt]]);
    const notes = [
      // An earlier move's tap today, this move's own tap, and the record's
      // own send on the account in the same minute.
      {
        id: "tap-earlier",
        key: "sendbook:A1",
        createdAt: new Date("2026-09-25T14:00:00.000Z"),
      },
      { id: "tap-own", key: "sendbook:A1", createdAt: stampAt },
      { id: "record-send", key: "A1", createdAt: stampAt },
    ];
    return recorder<TakeBackStore>({
      stampAt: async (key) => stamps.get(key) ?? null,
      deleteStamp: async (key) => {
        stamps.delete(key);
      },
      tapsBetween: async (key, from, to) =>
        notes.filter((n) => n.key === key && n.createdAt >= from && n.createdAt <= to),
      deleteTap: async () => {},
    });
  };

  test("the take-back deletes today's stamp and the tap filed with it, and nothing else", async () => {
    const { proxy, calls } = store();
    await takeBack(proxy, "A1:silence-bump", "A1", new Date("2026-09-25T18:00:00.000Z"));
    assert.deepEqual(
      calls.map((c) => [c.name, c.args[0]]),
      [
        ["stampAt", "groundwork:2026-09-25:A1:silence-bump"],
        ["deleteStamp", "groundwork:2026-09-25:A1:silence-bump"],
        ["tapsBetween", "sendbook:A1"],
        ["deleteTap", "tap-own"],
      ],
    );
  });

  test("a stamp with no tap (a Copy stamp) takes nothing back but itself; the record's send stays", async () => {
    const { proxy, calls } = store();
    await takeBack(proxy, "A1:silence-bump", "A1", new Date("2026-09-25T18:00:00.000Z"));
    const deleted = calls.filter((c) => c.name === "deleteTap").map((c) => c.args[0]);
    assert.ok(!deleted.includes("record-send"));
    assert.ok(
      calls
        .filter((c) => c.name === "tapsBetween")
        .every((c) => String(c.args[0]).startsWith("sendbook:")),
      "the take-back only ever looks under sendbook:",
    );
    const copy = store();
    await takeBack(
      copy.proxy,
      "A1:wire-trigger",
      "A1",
      new Date("2026-09-25T18:00:00.000Z"),
    );
    assert.deepEqual(
      copy.calls.map((c) => c.name),
      ["stampAt", "deleteStamp"],
    );
  });

  test("with the stamp gone the move is live again, and the withdrawn tap leaves the register", () => {
    const moves = [
      { accountId: "A1", ruleId: "silence-bump" },
      { accountId: "A2", ruleId: "wire-trigger" },
    ];
    const stamps = new Map([
      ["groundwork:2026-09-25:A1:silence-bump", stampAt.toISOString()],
    ]);
    assert.deepEqual(liveMoves(moves, stamps, "2026-09-25"), [moves[1]]);
    stamps.delete("groundwork:2026-09-25:A1:silence-bump");
    assert.deepEqual(liveMoves(moves, stamps, "2026-09-25"), moves);
    const registerOf = (taps: ReturnType<typeof tapNote>[]) =>
      buildSendbook({ readsById: new Map(), tapsById: new Map([["A1", taps]]), now: NOW })
        .lines.length;
    assert.equal(registerOf([tapNote(stampAt.toISOString())]), 1);
    assert.equal(registerOf([]), 0);
  });

  test("every stamp on the wing carries the ↺, bound to the take-back; a read-only session sees none", async () => {
    const { DoneWing } = await import("../../src/app/groundwork/face");
    const done = [
      {
        name: "One",
        at: "9:10 AM",
        sub: "CALL · STEP 1",
        mk: "A1:silence-bump",
        accountId: "A1",
      },
      {
        name: "Two",
        at: "9:40 AM",
        sub: "COPIED THE NOTE",
        mk: "A2:wire-trigger",
        accountId: "A2",
      },
    ];
    const forms = elementsOf(DoneWing({ done, canWrite: true })).filter(
      (e) => e.type === "form",
    );
    assert.deepEqual(
      forms.map((f) => (f.props.action as { name?: string }).name),
      ["bound unWork", "bound unWork"],
    );
    const html = await render(createElement(DoneWing, { done, canWrite: true }));
    assert.equal((html.match(/>↺<\/button>/g) ?? []).length, 2);
    assert.match(
      html,
      /title="Take it back\. The move returns to the queue, and the tap it filed leaves the register\. A filed email stays on the record\."/,
    );
    const ro = await render(createElement(DoneWing, { done, canWrite: false }));
    assert.doesNotMatch(ro, /↺/);
  });
});

describe("A10.22 · the chip rows carry ✕ to close without filing", () => {
  test("✕ closes the channel row and the who row, and files nothing", () => {
    const open = askStep(ASK_IDLE, { kind: "open" }, []).state;
    const more = askStep(open, { kind: "more" }, []).state;
    const who = askStep(open, { kind: "pick", channel: "CALL" }, [
      "Adam Reyes",
      "Dana Ellis",
    ]).state;
    for (const s of [open, more, who]) {
      const r = askStep(s, { kind: "close" }, ["Adam Reyes", "Dana Ellis"]);
      assert.deepEqual(r, { state: ASK_IDLE, file: null });
    }
  });

  test("both rows paint ✕ last, titled to say nothing files", async () => {
    const { AskRow } = await import("../../src/app/groundwork/channel-ask");
    const open = askStep(ASK_IDLE, { kind: "open" }, []).state;
    const who = askStep(open, { kind: "pick", channel: "CALL" }, [
      "Adam Reyes",
      "Dana Ellis",
    ]).state;
    for (const state of [open, who]) {
      const html = await render(
        createElement(AskRow, {
          state,
          contacts: ["Adam Reyes", "Dana Ellis"],
          pending: false,
          accent: true,
          send: () => {},
        }),
      );
      assert.match(
        html,
        /<button type="button" class="[^"]*" title="Never mind\. Nothing files\.">✕<\/button><\/span>$/,
      );
    }
  });

  test("the ✕ sends the close step, and the close step is the one that files nothing", async () => {
    const { AskRow } = await import("../../src/app/groundwork/channel-ask");
    const sent: AskEvent[] = [];
    const open = askStep(ASK_IDLE, { kind: "open" }, []).state;
    for (const el of elementsOf(
      AskRow({
        state: open,
        contacts: [],
        pending: false,
        accent: true,
        send: (e: AskEvent) => sent.push(e),
      }),
    ))
      if (el.type === "button" && el.props.children === "✕")
        (el.props.onClick as () => void)();
    assert.deepEqual(sent, [{ kind: "close" }]);
  });
});

// ── pass 10: the register's cap is a door (the click-depth law) ────────────
describe("the register past its cap opens every line (pass 10, the click-depth law)", () => {
  test("Show all N is a link to every line under the same filter; under the cap there is no door", async () => {
    const { SendbookRegister } = await import("../../src/app/sendbook/register");
    const week = {
      total: 0,
      byChannel: [],
      accounts: 0,
      replied: 0,
      neverMet: 0,
      goneCold: 0,
    };
    const line = {
      accountId: "A1",
      at: "2026-09-02T15:00:00Z",
      channel: "EMAIL" as Channel,
      contact: "",
      clause: "Re: Canada",
      step: 1,
      name: "Canon Fixture Co",
      day: "SEP 2",
      reply: null,
      booking: null,
      mktg: false,
      cold: false,
    };
    const capped = await render(
      createElement(SendbookRegister, {
        week,
        channelsPresent: ["EMAIL"],
        filter: "EMAIL",
        lines: [line],
        total: 250,
        allHref: "/sendbook?ch=EMAIL&all=1",
      }),
    );
    assert.match(textOf(capped), /The register shows the last 1\. Show all 250\./);
    assert.match(capped, /<a href="\/sendbook\?ch=EMAIL&amp;all=1">Show all 250\.<\/a>/);
    const whole = await render(
      createElement(SendbookRegister, {
        week,
        channelsPresent: ["EMAIL"],
        filter: "",
        lines: [line],
        total: 1,
        allHref: "/sendbook?all=1",
      }),
    );
    assert.ok(!textOf(whole).includes("Show all"));
    const page = readFileSync(join(process.cwd(), "src/app/sendbook/page.tsx"), "utf8");
    assert.match(
      page,
      /const cap = all === "1" \? Number\.POSITIVE_INFINITY : LINE_CAP;/,
    );
  });
});
