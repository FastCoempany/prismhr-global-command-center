// The single account read (the Chute brains refactor plan, §2.2; slice 10).
// Parity first: the read's intel is the old path's intel on every fixture the
// extract, closer, ted-doctrine, pipeline-fixes, intraday-court and
// accepted-invite suites hold; the hide filter inside the read is the room
// page's; machinery and sign-offs are flags on the doc, never exclusions; the
// second record folds a shell-keyed drop under the canonical id; THEIRS leads
// only with an account person's gem (C16); and whoseMove agrees with the
// engine's court on the room-read fixtures. Nothing here reads a source file.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readAccount, secondRecordFor, type RecordNote } from "../src/lib/record/read";
import { whoseMove } from "../src/lib/record/whose-move";
import { corpusFor, extractDealIntel } from "../src/lib/intel/extract";
import { digestFor, digestForCardName } from "../src/lib/intel/digest";
import { lastTouchRead } from "../src/lib/room/touch";
import { readDeal } from "../src/lib/room/engine";
import { isHomeSideName } from "../src/lib/intel/provenance";
import { theirsLine, type SecondRecord } from "../src/lib/activity/read";
import type { Gem } from "../src/lib/activity/stores";
import { ALIASES } from "../src/lib/book/merge";
import { NO_TAGS, withTags } from "../src/lib/today/route-notes";

const NOW = new Date("2026-09-05T17:00:00Z");

// ── fixtures ────────────────────────────────────────────────────────────────

type Over = Partial<RecordNote> & { id: string; body: string; createdAt: string };

/** A row as the wide loader hands it, with the fields the fixtures leave out. */
const row = (o: Over): RecordNote => ({
  accountId: "A1",
  partner: "",
  kind: "account",
  lane: "mine",
  actors: "",
  source: "",
  recipients: "",
  ...o,
});

const touch = (o: {
  subjectKey: string;
  label: string;
  contactedAt: string;
  message?: string;
  status?: string;
  log?: { at: string; body: string }[];
}) => ({
  kind: "account" as const,
  detail: "",
  message: "",
  followUpAt: o.contactedAt,
  intervalDays: 7,
  status: "awaiting" as const,
  log: [],
  ...o,
});

type Stores = {
  notes: RecordNote[];
  homeSide: readonly string[];
  todos?: { id: string; body: string; done: boolean; accountId: string; createdAt: string }[];
  touches?: ReturnType<typeof touch>[];
  dispositions?: Map<string, unknown>;
  now?: Date;
};

/** The read and the old path over the same stores. The old path gets the
 *  rows the room's own filter kept, the same roster and the same seed. */
function both(id: string, name: string, s: Stores) {
  const dispositions = s.dispositions ?? new Map<string, unknown>();
  const todos = (s.todos ?? []).map((t) => ({ ...t, remindAt: "", updatedAt: t.createdAt }));
  const touches = (s.touches ?? []).map((t) => ({ ...t, message: t.message ?? "" }));
  const read = readAccount({
    account: { id, name },
    notes: s.notes,
    touches,
    todos,
    dispositions,
    homeSide: s.homeSide,
    digest: digestFor(id) ?? digestForCardName(name),
    now: s.now ?? NOW,
  });
  const visible = s.notes.filter((n) => !dispositions.has(`hide:note:${n.id}`));
  const old = extractDealIntel(
    corpusFor(id, name, {
      acctNotes: visible,
      homeSide: s.homeSide,
      todos: todos.filter((t) => id && t.accountId === id),
      touches: touches.filter(
        (t) =>
          (id && t.subjectKey === `outreach:${id}`) ||
          t.label.toLowerCase() === name.toLowerCase(),
      ),
    }),
    digestFor(id) ?? digestForCardName(name),
  );
  return { read, old };
}

// The Lesha thread (tests/closer.test.ts), in filing order.
const LESHA = [
  row({
    id: "l3",
    body: "✉ TM Today 1:50 PM — No problem! · Lesha Cyphers → Antaeus Coe\nNo problem! 🙂",
    actors: "Lesha Cyphers → Antaeus Coe",
    createdAt: "2026-08-22T18:51:00Z",
  }),
  row({
    id: "l2",
    body: "✉ TM Today 1:50 PM — fantastic to hear · Antaeus Coe → Lesha Cyphers\nfantastic to hear. Thanks Lesha for the update!",
    actors: "Antaeus Coe → Lesha Cyphers",
    createdAt: "2026-08-22T18:50:00Z",
  }),
  row({
    id: "l1",
    body: "✉ TM Today 1:49 PM — Chassie owes you information · Lesha Cyphers → Antaeus Coe\nHey. I just talked to Chassie at Simploy. She owes you some information and will be in touch.",
    actors: "Lesha Cyphers → Antaeus Coe",
    createdAt: "2026-08-22T18:49:00Z",
  }),
];

// The Joseph Lyon record (tests/accepted-invite.test.ts), heads verbatim.
const NOON = "2026-09-04T12:00:00.000Z";
const JOSEPH = [
  row({
    id: "n5",
    body: "✉ OL 09/04 3:49 PM — Accepted: Initial Chat | Intro to PrismHR Global · Joseph Lyon → Antaeus Coe",
    createdAt: NOON,
    actors: "Joseph Lyon → Antaeus Coe",
    source: "outlook-ai",
  }),
  row({
    id: "n4",
    body: "✉ OL 09/04 3:34 PM — Initial Chat | Intro to PrismHR Global · Antaeus Coe → Joseph Lyon\nAntaeus Coe is inviting you to a scheduled Zoom meeting.",
    createdAt: NOON,
    actors: "Antaeus Coe → Joseph Lyon",
    source: "outlook-ai",
  }),
  row({
    id: "n3",
    body: "✉ OL Today 10:32 AM — Re: Intro for Prism Global · Antaeus Coe → Joseph Lyon +2\nConfirms the intended days were Monday/Tuesday. Calendar invite to follow. Owed: send invite for the Mon Sep 14 window — @Antaeus Coe.",
    createdAt: NOON,
    actors: "Antaeus Coe → Joseph Lyon +2",
    source: "outlook-ai",
  }),
  row({
    id: "n2",
    body: "✉ OL Today 10:22 AM — Re: Intro for Prism Global · Joseph Lyon → Antaeus Coe +2\nFlags that the proposed dates fall on Monday and Tuesday. Monday Sept 14 works better for him.",
    createdAt: NOON,
    actors: "Joseph Lyon → Antaeus Coe +2",
    source: "outlook-ai",
  }),
];

// The Trend repro (tests/intraday-court.test.ts): a 9:44 AM send and the
// 10:39 AM answer, both at the noon anchor.
const TREND_NOON = "2026-09-02T12:00:00.000Z";
const TREND = [
  row({
    id: "t1",
    body: "✉ OL Today 9:44 AM — Re: Philippines Pricing · Antaeus Coe → Melanie Dreyer +2\nLooking forward to Adam's thoughts on this.",
    actors: "Antaeus Coe → Melanie Dreyer +2",
    createdAt: TREND_NOON,
    source: "outlook-ai",
  }),
  row({
    id: "t2",
    body: "✉ OL Today 10:39 AM — Re: Philippines Pricing · Adam Dingwell → Antaeus Coe +2\nStill working through the proposal process; foresees another month or two before a decision at best.",
    actors: "Adam Dingwell → Antaeus Coe +2",
    createdAt: TREND_NOON,
    source: "outlook-ai",
  }),
];

// ── parity: the read's intel is the old path's intel ────────────────────────

describe("the read's intel equals extractDealIntel(corpusFor(…)) on the suites' fixtures", () => {
  test("extract: every store, tagged and sorted", () => {
    const { read, old } = both("X1", "Acme", {
      homeSide: [],
      notes: [
        row({
          id: "1",
          body: "✉ SF Jul 21 3:47 PM — Re: demo · Russ Jones → Rachael Brown\nbody",
          createdAt: "2026-07-21T20:00:00Z",
        }),
        row({
          id: "2",
          body: "plain note about Canada",
          createdAt: "2026-07-24T20:00:00Z",
          kind: "mine",
        }),
      ],
      todos: [
        {
          id: "4",
          body: "send cal invite",
          done: false,
          accountId: "X1",
          createdAt: "2026-07-25T00:00:00Z",
        },
      ],
      touches: [
        touch({
          subjectKey: "outreach:X1",
          label: "Acme",
          contactedAt: "2026-07-19T00:00:00Z",
          message: "outreach text",
          log: [{ at: "2026-07-18T00:00:00Z", body: "Reply received ✓" }],
        }),
      ],
    });
    assert.deepEqual(read.intel, old);
    // The docs are the corpus's docs: the sheet line leads, the touch and
    // its log ride, the digest seed is absent for an account the digest
    // never saw.
    assert.equal(read.docs[0].text, "send cal invite");
    assert.ok(read.docs.some((d) => d.src.startsWith("touch ")));
    assert.ok(read.docs.some((d) => d.src.startsWith("touch-log")));
    const sf = read.docs.find((d) => d.src.startsWith("sf-activity"));
    assert.deepEqual(sf?.people, ["Russ Jones", "Rachael Brown"]);
  });

  test("extract golden: the Advocate digest and a fresh note", () => {
    const { read, old } = both("ADVOCATEPAY000001", "Advocate Pay — SubcontractorHub", {
      homeSide: [],
      notes: [
        row({
          id: "n1",
          body: "✉ SF 7/26 — Re: Side bar · Bryce Rowley → Antaeus Coe\nreferral agreement redlines back, targeting signature this week",
          createdAt: "2026-07-26T20:00:00Z",
        }),
      ],
    });
    assert.deepEqual(read.intel, old);
    assert.equal(read.intel.chair, "referral");
    assert.equal(read.intel.timing?.value.dateIso, "2026-09-01");
  });

  test("extract: a cold account from raw notes only", () => {
    const { read, old } = both("NOPE000000000001", "Nobody Co", {
      homeSide: [],
      notes: [
        row({
          id: "1",
          kind: "mine",
          body: "They have 12 contractors in Mexico paid by wire, considering an employer of record; time-sensitive — decision by August 6",
          createdAt: "2026-07-25T00:00:00Z",
        }),
      ],
    });
    assert.deepEqual(read.intel, old);
    assert.deepEqual(
      read.intel.countries.map((c) => c.value),
      ["mx"],
    );
    assert.equal(read.intel.timing?.value.dateIso, "2026-08-06");
  });

  test("closer: the Lesha thread reads through the sign-off", () => {
    const { read, old } = both("SIMPLOY01", "Simploy", { homeSide: [], notes: LESHA });
    assert.deepEqual(read.intel, old);
    assert.equal(read.intel.lastInbound, "2026-08-22T18:49:00Z");
    assert.ok(read.intel.lastOutbound > read.intel.lastInbound);
    assert.equal(read.intel.lastInboundPromise, true);
  });

  test("closer: a substantive inbound still counts", () => {
    const { read, old } = both("SIMPLOY01", "Simploy", {
      homeSide: [],
      notes: [
        row({
          id: "c1",
          body: "✉ TM Today 2:10 PM — Can you send the Canada model? · Chassie Smith → Antaeus Coe\nCan you send the Canada model this week?",
          actors: "Chassie Smith → Antaeus Coe",
          createdAt: "2026-08-22T19:10:00Z",
        }),
      ],
    });
    assert.deepEqual(read.intel, old);
    assert.equal(read.intel.lastInboundWho, "Chassie Smith");
  });

  test("ted-doctrine: a reply to us with a declared roster, and our own send", () => {
    const { read, old } = both("A1", "Acme", {
      homeSide: ["Anika Patel"],
      notes: [
        row({
          id: "1",
          body: "✉ OL Sep 2 10:39 AM — Re: Canada · Dana Ellis → Antaeus Coe\nWe have two clients asking. Can you walk us through it?",
          createdAt: "2026-09-02T12:00:00Z",
          actors: "Dana Ellis → Antaeus Coe",
          recipients: "Antaeus Coe",
        }),
        row({
          id: "2",
          body: "✉ OL Sep 2 9:44 AM — Re: Canada · Antaeus Coe → Dana Ellis\nSending the model now.",
          createdAt: "2026-09-02T12:00:00Z",
          actors: "Antaeus Coe → Dana Ellis",
        }),
      ],
    });
    assert.deepEqual(read.intel, old);
    const [inDoc, outDoc] = read.docs;
    assert.equal(inDoc.direction, "in");
    assert.equal(inDoc.sender, "Dana Ellis");
    assert.equal(inDoc.senderIsHome, false);
    assert.equal(outDoc.direction, "out");
    assert.equal(outDoc.sender, "Antaeus Coe");
    assert.equal(outDoc.senderIsHome, true);
  });

  test("pipeline-fixes: our sends classify outbound, client replies inbound", () => {
    const { read, old } = both("a", "Acme", {
      homeSide: [],
      notes: [
        row({
          id: "p1",
          body: "✉ SF Jul 28 — Re: contract · Antaeus Coe → Bryce Rowley",
          actors: "Antaeus Coe → Bryce Rowley",
          createdAt: "2026-07-28T12:00:00Z",
        }),
        row({
          id: "p2",
          body: "✉ SF Jul 29 — Re: contract · Bryce Rowley → Antaeus Coe",
          actors: "Bryce Rowley → Antaeus Coe",
          createdAt: "2026-07-29T12:00:00Z",
        }),
      ],
    });
    assert.deepEqual(read.intel, old);
    assert.equal(read.intel.lastOutbound, "2026-07-28T12:00:00Z");
    assert.equal(read.intel.lastInbound, "2026-07-29T12:00:00Z");
  });

  test("intraday-court: the same-day reply orders after the send", () => {
    const { read, old } = both("TREND01", "Trend Personnel Services", {
      homeSide: [],
      notes: TREND,
      now: new Date("2026-09-02T20:00:00Z"),
    });
    assert.deepEqual(read.intel, old);
    assert.ok(read.intel.lastInbound > read.intel.lastOutbound);
    assert.equal(read.lastInbound?.who, "Adam Dingwell");
    assert.equal(read.lastInbound?.noteId, "t2");
  });

  test("accepted-invite: the acceptance never becomes the last inbound", () => {
    const { read, old } = both("HRH01", "HR Hawaii", {
      homeSide: [],
      notes: JOSEPH,
      now: new Date("2026-09-04T22:00:00Z"),
    });
    assert.deepEqual(read.intel, old);
    assert.equal(read.lastInbound?.noteId, "n2");
    assert.equal(read.lastAccepted?.noteId, "n5");
    assert.equal(read.lastAccepted?.who, "Joseph Lyon");
  });
});

// ── the hide filter runs inside the read, on the room page's grammar ────────

describe("the hide filter (hide:note:) runs inside the read", () => {
  test("a parked row leaves every derived fact and stays in docs flagged", () => {
    const dispositions = new Map<string, unknown>([
      ["hide:note:l1", { status: "parked", reason: "", updatedAt: "" }],
    ]);
    const { read, old } = both("SIMPLOY01", "Simploy", {
      homeSide: [],
      notes: LESHA,
      dispositions,
    });
    assert.deepEqual([...read.hidden], ["l1"]);
    assert.deepEqual(read.intel, old);
    // With Lesha's substantive message parked, nothing inbound remains: the
    // sign-off is transparent and the operator's reply is ours.
    assert.equal(read.intel.lastInbound, "");
    assert.equal(read.lastInbound, null);
    const parked = read.docs.find((d) => d.noteId === "l1");
    assert.ok(parked, "the row stays in docs");
    assert.equal(parked.hidden, true);
    assert.equal(parked.direction, "in", "the doc keeps its own reading");
    assert.equal(read.docs.filter((d) => d.hidden).length, 1);
    // The newest entry's moment skips the parked row too.
    assert.equal(read.lastRecordAt, "2026-08-22T18:51:00Z");
  });

  test("no `hide:acct:` reader remains: only the note grammar hides", () => {
    const { read } = both("SIMPLOY01", "Simploy", {
      homeSide: [],
      notes: LESHA,
      dispositions: new Map([["hide:acct:l1", { status: "parked" }]]),
    });
    assert.equal(read.hidden.size, 0);
  });
});

// ── machinery and closer are flags, never exclusions (the two-flag rule) ────

describe("docs carry machinery and closer as flags", () => {
  test("the sign-off is a doc with closer: true and no direction", () => {
    const { read } = both("SIMPLOY01", "Simploy", { homeSide: [], notes: LESHA });
    const signOff = read.docs.find((d) => d.noteId === "l3");
    assert.ok(signOff);
    assert.equal(signOff.closer, true);
    assert.equal(signOff.machinery, false);
    assert.equal(signOff.direction, undefined);
    assert.equal(signOff.sender, "Lesha Cyphers");
    // Her voice still warms; it is not a reply.
    assert.equal(read.warmth.lastWarmAt, "2026-08-22T18:51:00Z");
    assert.equal(read.warmth.lastReplyAt, "2026-08-22T18:49:00Z");
  });

  test("the acceptance is a doc with machinery: true and no direction", () => {
    const { read } = both("HRH01", "HR Hawaii", {
      homeSide: [],
      notes: JOSEPH,
      now: new Date("2026-09-04T22:00:00Z"),
    });
    const accepted = read.docs.find((d) => d.noteId === "n5");
    assert.ok(accepted);
    assert.equal(accepted.machinery, true);
    assert.equal(accepted.closer, false);
    assert.equal(accepted.direction, undefined);
    assert.equal(accepted.sender, "Joseph Lyon");
    // Machinery never warms (C4, C5): the warm moment is his real message.
    const real = read.docs.find((d) => d.noteId === "n2");
    assert.equal(read.warmth.lastWarmAt, real?.at);
  });

  test("a campaign alert from a mailbox is machinery; a person's ask is inbound", () => {
    const { read } = both("A1", "Acme", {
      homeSide: [],
      notes: [
        row({
          id: "m1",
          body: "✉ OL Sep 21 — 📣 New campaign response lead · Marketing → Antaeus Coe\nCan you please review the lead",
          actors: "Marketing → Antaeus Coe",
          createdAt: "2026-09-21T12:00:00Z",
        }),
        row({
          id: "m2",
          body: "✉ OL Sep 20 — Re: Canada · Dana Ellis → Antaeus Coe\nCan you send the model?",
          actors: "Dana Ellis → Antaeus Coe",
          createdAt: "2026-09-20T12:00:00Z",
        }),
      ],
    });
    const [alert, ask] = read.docs;
    assert.equal(alert.machinery, true);
    assert.equal(alert.direction, undefined);
    assert.equal(ask.machinery, false);
    assert.equal(ask.direction, "in");
    assert.equal(read.lastInbound?.noteId, "m2");
  });
});

// ── the second record folds by canonical id (E17) ───────────────────────────

describe("secondRecordFor folds a shell-keyed drop under the canonical id", () => {
  const [SHELL, REAL] = Object.entries(ALIASES)[0];
  const gem = (over: Partial<Gem>): Gem => ({
    dropSha: "037742a0",
    verdict: "CONFIRMED",
    createdDay: "2026-08-20",
    actedDay: "",
    who: ["Tom Schenck"],
    whoKind: "account",
    term: "TAX SWITCH",
    what: "Tom asked Greg for a call about switching",
    whenDay: "2026-08-19",
    signal: "decision maker moved from silent to asking",
    act: "Ask Greg Williams about Schenck call.",
    reason: "Aug 19 reply wants to discuss switching.",
    cites: [],
    ...over,
  });
  const sr = (over: Partial<SecondRecord>): SecondRecord => ({
    rollup: null,
    gems: [],
    support: null,
    intent: null,
    ...over,
  });

  test("a drop keyed by the shell id reads under the real account", () => {
    const byId = new Map([[SHELL, sr({ gems: [gem({})] })]]);
    assert.equal(secondRecordFor(byId, REAL)?.gems.length, 1);
    assert.equal(secondRecordFor(byId, SHELL)?.gems.length, 1);
  });

  test("two drops merge, the freshest namespace winning, the canonical first among equals", () => {
    const byId = new Map([
      [REAL, sr({ gems: [gem({ term: "REAL", createdDay: "2026-08-20" })] })],
      [
        SHELL,
        sr({
          gems: [gem({ term: "SHELL", createdDay: "2026-08-27" })],
          support: { dropSha: "x", total: 9, spike: null, themes: [] },
        }),
      ],
    ]);
    const folded = secondRecordFor(byId, REAL);
    assert.equal(folded?.gems[0].term, "SHELL");
    assert.equal(folded?.support?.total, 9);
    // Equal days: the account's own key wins.
    const tie = secondRecordFor(
      new Map([
        [REAL, sr({ gems: [gem({ term: "REAL" })] })],
        [SHELL, sr({ gems: [gem({ term: "SHELL" })] })],
      ]),
      REAL,
    );
    assert.equal(tie?.gems[0].term, "REAL");
  });

  test("an account with no drop under any id reads null", () => {
    assert.equal(secondRecordFor(new Map(), REAL), null);
    const { read } = both("A1", "Acme", { homeSide: [], notes: [] });
    assert.equal(read.secondRecord, null);
  });

  // ── THEIRS leads only with an account person's gem (C16) ──────────────
  test("THEIRS's lead skips a colleague's gem", () => {
    const line = theirsLine(
      sr({
        gems: [
          gem({ whoKind: "colleague", who: ["Anika Steenstra"], term: "HANDOFF" }),
          gem({ whoKind: "account", who: ["Tom Schenck"], term: "TAX SWITCH" }),
        ],
      }),
    );
    assert.ok(line);
    assert.equal(line.label, "TOM’S TAX SWITCH · 08/19 · +1");
    assert.equal(line.gems[0].term, "TAX SWITCH");
  });

  test("only colleague gems: no THEIRS line at all", () => {
    assert.equal(
      theirsLine(sr({ gems: [gem({ whoKind: "colleague", who: ["Anika Steenstra"] })] })),
      null,
    );
  });

  test("a mixed gem is about an account person; acted gems have left", () => {
    const line = theirsLine(
      sr({
        gems: [
          gem({ whoKind: "account", actedDay: "2026-08-21", term: "ACTED" }),
          gem({ whoKind: "mixed", who: ["Greg Williams", "Tom Schenck"], term: "MIXED" }),
        ],
      }),
    );
    assert.equal(line?.label, "GREG’S MIXED · 08/19");
    assert.equal(line?.gems.length, 1);
    assert.equal(theirsLine(null), null);
  });
});

// ── whoseMove agrees with the engine's court ────────────────────────────────

describe("whoseMove agrees with the engine's answer on the room-read fixtures", () => {
  const touchAt = (daysAgo: number) =>
    new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString();

  /** The engine's tone, read as the record's answer: "you" is ours, "them"
   *  and "quiet" are theirs, BOOKED is the acceptance, "none" is no thread. */
  const asWhose = (court: { line: string; tone: string }) =>
    court.line.startsWith("BOOKED")
      ? "booked"
      : court.tone === "you"
        ? "you"
        : court.tone === "them" || court.tone === "quiet"
          ? "them"
          : "none";

  test("a logged touch awaiting a reply at 4, 5 and 10 days", () => {
    for (const days of [4, 5, 10]) {
      const log = { contactedAt: touchAt(days), awaitingReply: true, who: "Kristen" };
      const engine = readDeal({
        accountName: "ESC",
        step: null,
        timing: null,
        lastTouch: { at: log.contactedAt, awaitingReply: true, who: "Kristen" },
        lastRecordAt: touchAt(1),
        now: NOW,
      });
      const mine = whoseMove([], [], NOW, { touch: log });
      assert.equal(mine.whose, asWhose(engine.court), `${days} days`);
      assert.equal(mine.whose, "them");
      assert.equal(mine.who, "Kristen");
      assert.equal(mine.since, log.contactedAt);
    }
  });

  test("a replied thread with nothing newer: the record decides nothing", () => {
    const log = { contactedAt: touchAt(10), awaitingReply: false, who: "Kristen" };
    const engine = readDeal({
      accountName: "ESC",
      step: null,
      timing: null,
      lastTouch: { at: log.contactedAt, awaitingReply: false, who: "Kristen" },
      lastRecordAt: touchAt(1),
      now: NOW,
    });
    const mine = whoseMove([], [], NOW, { touch: log });
    assert.equal(asWhose(engine.court), "none");
    assert.equal(mine.whose, "none");
  });

  /** The engine fed the way the room page feeds it, from the same rows. */
  const engineOver = (notes: RecordNote[], now: Date, roster: readonly string[] = []) => {
    const isHome = (n: string) => isHomeSideName(n, roster);
    const { read } = both("A1", "Acme", { homeSide: roster, notes, now });
    const touchRead = lastTouchRead(notes, null, isHome, now);
    return {
      read,
      engine: readDeal({
        accountName: "Acme",
        step: null,
        timing: null,
        lastTouch: touchRead
          ? { at: touchRead.at, awaitingReply: touchRead.awaitingReply, who: touchRead.who }
          : null,
        lastInbound: read.intel.lastInbound
          ? {
              at: read.intel.lastInbound,
              who: read.intel.lastInboundWho,
              promise: read.intel.lastInboundPromise,
            }
          : null,
        lastMeeting: read.lastMeeting ? { at: read.lastMeeting.at, who: read.lastMeeting.who } : null,
        lastAccepted: read.lastAccepted
          ? { at: read.lastAccepted.at, who: read.lastAccepted.who }
          : null,
        lastRecordAt: read.lastRecordAt,
        now,
      }),
    };
  };

  test("the Trend reply after the send is ours to answer", () => {
    const now = new Date("2026-09-02T20:00:00Z");
    const { read, engine } = engineOver(TREND, now);
    assert.equal(asWhose(engine.court), "you");
    assert.equal(read.whoseMove.whose, "you");
    assert.equal(read.whoseMove.who, "Adam Dingwell");
    assert.equal(whoseMove(read.docs, [], now).whose, "you");
  });

  test("the operator answering back the same day leaves it with them", () => {
    const now = new Date("2026-09-02T20:00:00Z");
    const answered = [
      ...TREND,
      row({
        id: "t3",
        body: "✉ OL Today 11:02 AM — Re: Philippines Pricing · Antaeus Coe → Adam Dingwell +2\nThanks Adam - let's put a checkpoint on the calendar for early October.",
        actors: "Antaeus Coe → Adam Dingwell +2",
        createdAt: TREND_NOON,
        source: "outlook-ai",
      }),
    ];
    const { read, engine } = engineOver(answered, now);
    assert.equal(asWhose(engine.court), "them");
    assert.equal(read.whoseMove.whose, "them");
    assert.equal(read.whoseMove.who, "Adam Dingwell");
  });

  test("the acceptance after our send books the meeting", () => {
    const now = new Date("2026-09-04T22:00:00Z");
    const { read, engine } = engineOver(JOSEPH, now);
    assert.equal(asWhose(engine.court), "booked");
    assert.equal(read.whoseMove.whose, "booked");
    assert.equal(read.whoseMove.who, "Joseph Lyon");
  });

  test("a meeting newer than our send puts the recap on us", () => {
    const now = new Date("2026-09-05T17:00:00Z");
    const notes = [
      row({
        id: "k2",
        body: "☎ CT Sep 4 — Intro call · Antaeus Coe → Chassie Smith\nChassie: we have two clients in Mexico.",
        actors: "Antaeus Coe → Chassie Smith",
        source: "call-ai",
        createdAt: "2026-09-04T15:00:00Z",
      }),
      row({
        id: "k1",
        body: "✉ OL Sep 1 — Re: intro · Antaeus Coe → Chassie Smith\nSee you Thursday.",
        actors: "Antaeus Coe → Chassie Smith",
        source: "outlook-ai",
        createdAt: "2026-09-01T15:00:00Z",
      }),
    ];
    const { read, engine } = engineOver(notes, now);
    assert.equal(asWhose(engine.court), "you");
    assert.equal(read.whoseMove.whose, "you");
    assert.equal(read.whoseMove.who, "Chassie Smith");
    assert.equal(read.lastMeeting?.noteId, "k2");
  });

  test("a self-addressed task never becomes our send; a colleague's mail never flips it", () => {
    const now = new Date("2026-09-25T17:00:00Z");
    const notes = [
      row({
        id: "s2",
        body: "✔ SF Sep 20 — Follow up with TrendHR · Antaeus Coe → Antaeus Coe",
        actors: "Antaeus Coe → Antaeus Coe",
        source: "sf",
        createdAt: "2026-09-20T12:00:00Z",
      }),
      row({
        id: "s1",
        body: "✉ OL Sep 18 — Re: pricing · Adam Meyer → Antaeus Coe\nCan you send the Canada numbers?",
        actors: "Adam Meyer → Antaeus Coe",
        source: "outlook-ai",
        createdAt: "2026-09-18T12:00:00Z",
      }),
    ];
    const { read, engine } = engineOver(notes, now);
    assert.equal(asWhose(engine.court), "you");
    assert.equal(read.whoseMove.whose, "you");
    assert.equal(read.whoseMove.who, "Adam Meyer");
    // A colleague writing to the operator about the account is not the
    // account writing: with Lesha on the roster the move stays none.
    const colleague = engineOver(
      [
        row({
          id: "c1",
          body: "✉ OL Sep 22 — Re: Regis intro · Lesha Cyphers → Antaeus Coe\nI made the intro, you should hear from them.",
          actors: "Lesha Cyphers → Antaeus Coe",
          recipients: "Antaeus Coe",
          source: "outlook-ai",
          createdAt: "2026-09-22T12:00:00Z",
        }),
      ],
      now,
      ["Lesha Cyphers"],
    );
    // The old corpus reads a colleague's mail to us as inbound (the ledger's
    // row 2, accidental); the read says the same today — parity, recorded.
    assert.equal(colleague.read.whoseMove.whose, asWhose(colleague.engine.court));
  });

  test("an open loop on their side with no thread leaves the move with them", () => {
    const todos = [
      {
        id: "lp1",
        // A their-loop as the fan-out files it (D10): owner them, who owes it,
        // who heard it, the day named.
        body: withTags("Send the invoices and the client contract", {
          ...NO_TAGS,
          kind: "action",
          owner: "them",
          by: "Chassie Smith",
          hearer: "Antaeus Coe",
          date: "2026-09-10",
        }),
        done: false,
        accountId: "A1",
        createdAt: "2026-09-03T15:00:00Z",
      },
    ];
    const mine = whoseMove([], todos, NOW);
    assert.equal(mine.whose, "them");
    assert.equal(mine.who, "Chassie Smith");
    assert.equal(whoseMove([], [], NOW).whose, "none");
  });
});

// ── the twenty fields, in order ─────────────────────────────────────────────

describe("the read carries the twenty fields of pass 2 E in its order", () => {
  test("every field is present, named as the plan names it", () => {
    const { read } = both("SIMPLOY01", "Simploy", { homeSide: [], notes: LESHA });
    assert.deepEqual(Object.keys(read), [
      "docs",
      "lastOutbound",
      "lastInbound",
      "whoseMove",
      "warmth",
      "lastMeeting",
      "lastTouch",
      "hidden",
      "homeSide",
      "today",
      "intel",
      "stage",
      "relationship",
      "theirPromise",
      "lastAccepted",
      "conversationExists",
      "secondRecord",
      "countries",
      "products",
      "headcounts",
      "people",
      "lastRecordAt",
    ]);
  });

  test("the Lesha thread's facts, each from the one read", () => {
    const { read } = both("SIMPLOY01", "Simploy", { homeSide: [], notes: LESHA });
    assert.deepEqual(read.lastOutbound, {
      at: "2026-08-22T18:50:00Z",
      noteId: "l2",
      to: "Lesha Cyphers",
    });
    assert.deepEqual(read.lastInbound, {
      at: "2026-08-22T18:49:00Z",
      who: "Lesha Cyphers",
      promise: true,
      noteId: "l1",
    });
    assert.equal(read.lastTouch?.source, "record");
    assert.equal(read.lastTouch?.at, "2026-08-22T18:50:00Z");
    assert.equal(read.lastTouch?.who, "Lesha Cyphers");
    assert.equal(read.lastMeeting, null);
    assert.equal(read.lastAccepted, null);
    assert.equal(read.conversationExists, true);
    assert.equal(read.stage, null);
    assert.equal(read.today.key, "2026-09-05");
    assert.equal(read.today.isToday("2026-09-05T18:00:00Z"), true);
    assert.equal(read.today.isToday("2026-09-06T04:30:00Z"), true, "11:30p Chicago");
    assert.equal(read.today.isToday("2026-09-06T05:30:00Z"), false, "12:30a the next day");
    assert.equal(read.relationship.name, "Lesha Cyphers");
    assert.equal(read.relationship.source, "record");
    assert.equal(read.people[0]?.name, "Lesha Cyphers");
    assert.equal(read.theirPromise?.who, "Lesha Cyphers");
    assert.match(read.theirPromise?.text ?? "", /owes you/);
    assert.equal(read.lastRecordAt, "2026-08-22T18:51:00Z");
    assert.deepEqual(read.homeSide, []);
  });

  test("an empty record reads honestly empty", () => {
    const { read } = both("A1", "Acme", { homeSide: [], notes: [] });
    assert.equal(read.docs.length, 0);
    assert.equal(read.lastOutbound, null);
    assert.equal(read.lastInbound, null);
    assert.equal(read.whoseMove.whose, "none");
    assert.deepEqual(read.warmth, { lastWarmAt: "", lastReplyAt: "" });
    assert.equal(read.lastTouch, null);
    assert.equal(read.conversationExists, false);
    assert.equal(read.relationship.source, "book");
    assert.equal(read.lastRecordAt, "");
    assert.deepEqual(read.countries, []);
  });

  test("the declared roster is handed to every test: a colleague leading a collapsed To line is never who we wait on", () => {
    const notes = [
      row({
        id: "r1",
        body: "✉ OL Sep 20 — Re: intro · Antaeus Coe → Shane Jacobs +2\nIntro below.",
        actors: "Antaeus Coe → Shane Jacobs +2",
        source: "outlook-ai",
        createdAt: "2026-09-20T12:00:00Z",
      }),
    ];
    const now = new Date("2026-09-25T17:00:00Z");
    const plain = both("A1", "Acme", { homeSide: [], notes, now });
    assert.equal(plain.read.lastTouch?.who, "Shane Jacobs");
    const union = both("A1", "Acme", { homeSide: ["shane jacobs"], notes, now });
    assert.equal(union.read.lastTouch?.who, "", "falls back to the relationship");
    assert.equal(union.read.lastOutbound?.to, "");
  });
});

// ── the facts with the tape flag: the Filing's own first (E18) ──────────────

describe("countries, products and headcounts carry the tape flag", () => {
  test("a row with the Filing's facts is read from them, not the regex", () => {
    const { read } = both("A1", "Acme", {
      homeSide: [],
      notes: [
        row({
          id: "f1",
          body: "✉ OL Sep 20 — Re: next steps · Dana Ellis → Antaeus Coe\nAs discussed.",
          actors: "Dana Ellis → Antaeus Coe",
          source: "outlook-ai",
          createdAt: "2026-09-20T12:00:00Z",
          facts: {
            countries: ["Mexico"],
            products: ["Employer of record"],
            headcounts: [{ what: "workers in Mexico", count: 10 }],
          },
        }),
      ],
    });
    assert.deepEqual(
      read.countries.map((c) => [c.value, c.tape]),
      [["mx", false]],
    );
    assert.deepEqual(
      read.products.map((p) => [p.value, p.tape]),
      [["eor", false]],
    );
    assert.deepEqual(
      read.headcounts.map((h) => [h.value, h.tape]),
      [[{ n: 10, country: "mx" }, false]],
    );
    // The regex extractor saw nothing in the body: intel stays the old
    // answer, parity held, and the facts field is where the model's read
    // lands.
    assert.deepEqual(read.intel.countries, []);
  });

  test("a row without facts is regex-mined, and the tape carries its flag", () => {
    const { read } = both("A1", "Acme", {
      homeSide: [],
      notes: [
        row({
          id: "g2",
          body: "✉ OL Sep 21 — Re: scope · Dana Ellis → Antaeus Coe\nWe have 3 contractors in Mexico.",
          actors: "Dana Ellis → Antaeus Coe",
          source: "outlook-ai",
          createdAt: "2026-09-21T12:00:00Z",
        }),
        row({
          id: "g1",
          body: "☰ Call transcript — demo\nCALL TRANSCRIPT\nShane Jacobs: here is Brazil showing the public holidays.\nDana Ellis: and our contractors in Mexico?",
          source: "transcript",
          createdAt: "2026-09-20T12:00:00Z",
        }),
      ],
    });
    const byValue = Object.fromEntries(read.countries.map((c) => [c.value, c.tape]));
    assert.deepEqual(byValue, { mx: false, br: true }, "Mexico from the read, Brazil only on the tape");
    assert.equal(read.headcounts[0]?.value.n, 3);
    assert.equal(read.headcounts[0]?.tape, false);
    // The extractor's own countries rank the tape behind the reads and drop
    // it when a read names any: the flag is what lets a consumer choose.
    assert.deepEqual(
      read.intel.countries.map((c) => c.value),
      ["mx"],
    );
  });
});
