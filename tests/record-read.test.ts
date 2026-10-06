// The single account read (the Chute brains refactor plan, §2.2; slice 10).
// Parity first: the read's intel is the old path's intel on every fixture the
// extract, closer, ted-doctrine, pipeline-fixes, intraday-court and
// accepted-invite suites hold; the hide filter inside the read is the room
// page's; machinery and sign-offs are flags on the doc, never exclusions; the
// second record folds a shell-keyed drop under the canonical id; THEIRS leads
// only with an account person's gem (C16); and whoseMove agrees with the
// engine's move line on the room-read fixtures. Slice 12 adds the third
// migration's pins at the foot: the drawer's record, the minter's corpus and
// the live read all read the one read. One wiring test there reads the
// callers' source; nothing else here reads a source file.
//
// Slice 11a: Groundwork reads the account as the room does (pass 2 B rows 7
// and 8); the exclusion reads the export's attributed inbound and never its
// datetime (D19); the who chip row asks only between two names (C18); and a
// seat on an excluded account reads on the HomeRoom's register (C8).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readAccount, secondRecordFor, type RecordNote } from "../src/lib/record/read";
import { declaredHomeSide, readFromStores } from "../src/lib/record/stores";
import { whoseMove } from "../src/lib/record/whose-move";
import { liveMotionIds } from "../src/lib/groundwork/day";
import { buildRollup } from "../src/lib/activity/rollup";
import { parseRollupBody, renderRollupBody } from "../src/lib/activity/stores";
import type { AccountSlice, StagedRow } from "../src/lib/activity/types";
import { orgInboundKey } from "../src/lib/activity/read";
import { buildAccountSheet } from "../src/lib/room/sheet-view";
import { renderSeatBody } from "../src/lib/act/lane";
import { inboundDates, recordSends, warmDates, whoChipNames } from "../src/lib/sendbook/read";
import { corpusFor, extractDealIntel } from "../src/lib/intel/extract";
import { digestFor, digestForCardName } from "../src/lib/intel/digest";
import { lastTouchRead } from "../src/lib/room/touch";
import { readDeal } from "../src/lib/room/engine";
import { isHomeSideName } from "../src/lib/intel/provenance";
import { theirsLine, type SecondRecord } from "../src/lib/activity/read";
import type { Rollup } from "../src/lib/activity/rollup";
import { lastHumanTouch, sheetSecond } from "../src/lib/record/accounts";
import type { Gem } from "../src/lib/activity/stores";
import { ALIASES, canonicalAccountId } from "../src/lib/book/merge";
import { NO_TAGS, withTags } from "../src/lib/today/route-notes";
import { buildPipelineReport, type PipelineAccount } from "../src/lib/pipeline/build";
import { liveLines } from "../src/lib/ask/live";

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
  todos?: {
    id: string;
    body: string;
    done: boolean;
    accountId: string;
    createdAt: string;
  }[];
  touches?: ReturnType<typeof touch>[];
  dispositions?: Map<string, unknown>;
  now?: Date;
};

/** The read and the old path over the same stores. The old path gets the
 *  rows the room's own filter kept, the same roster and the same seed. */
function both(id: string, name: string, s: Stores) {
  const dispositions = s.dispositions ?? new Map<string, unknown>();
  const todos = (s.todos ?? []).map((t) => ({
    ...t,
    remindAt: "",
    updatedAt: t.createdAt,
  }));
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

  // ── THEIRS carries only an account person's gems (C16, amended 2026-10-05) ──
  test("THEIRS's lead skips a colleague's gem, and the colleague's gem has no seat behind it", () => {
    const line = theirsLine(
      sr({
        gems: [
          gem({ whoKind: "colleague", who: ["Anika Steenstra"], term: "HANDOFF" }),
          gem({ whoKind: "account", who: ["Tom Schenck"], term: "TAX SWITCH" }),
        ],
      }),
    );
    assert.ok(line);
    // No "+1": the colleague's gem is not on the line (slice 11b).
    assert.equal(line.label, "TOM’S TAX SWITCH · 08/19");
    assert.deepEqual(
      line.gems.map((g) => g.term),
      ["TAX SWITCH"],
    );
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

  // ── the Accounts row reads the same builder (C6, C16, amended 2026-10-05) ──
  test("a row whose only live gem is a colleague's shows no ACT chip and no gem", () => {
    const row = sheetSecond(
      sr({
        gems: [
          gem({
            whoKind: "colleague",
            who: ["Anika Steenstra"],
            term: "HANDOFF",
            act: "Ask Anika what they said.",
          }),
        ],
      }),
    );
    assert.ok(row, "a drop is a row");
    assert.equal(row.act, null);
    assert.deepEqual(row.gems, []);
  });

  test("an account person's gem leads the chip; an acted one has left; no drop is no row", () => {
    const row = sheetSecond(
      sr({
        gems: [
          gem({
            whoKind: "colleague",
            term: "HANDOFF",
            act: "Ask Anika what they said.",
          }),
          gem({ whoKind: "account", term: "TAX SWITCH" }),
        ],
      }),
    );
    assert.equal(row?.act, "Ask Greg Williams about Schenck call.");
    assert.equal(row?.gems[0]?.term, "TAX SWITCH");
    assert.equal(
      sheetSecond(sr({ gems: [gem({ whoKind: "account", actedDay: "2026-08-21" })] }))
        ?.act,
      null,
    );
    assert.equal(sheetSecond(null), null);
    // The verdict and the support fold ride whatever the gems say.
    const support = sheetSecond(
      sr({
        rollup: null,
        support: {
          dropSha: "x",
          total: 9,
          spike: { day: "2026-08-19", n: 4 },
          themes: [],
        },
      }),
    );
    assert.equal(support?.act, null);
    assert.equal(support?.supportTotal, 9);
    assert.equal(support?.spikeDay, "2026-08-19");
  });
});

// ── whoseMove agrees with the engine's move line ────────────────────────────
// The court line is retired in full (ruled 2026-09-25, D25); the move line
// says who and when, and these pins read it.

/** The engine's move line, read as the record's answer: "Answer" and the recap
 *  are ours, "Wait on", "Nudge" and "Chase <name>" are theirs, the booked
 *  meeting is the acceptance, and a thin or gate-only read is no thread. */
const asWhose = (move: string): "you" | "them" | "booked" | "none" =>
  /^Wait for the meeting\./.test(move)
    ? "booked"
    : /^(Answer |Send .+ the recap\.)/.test(move)
      ? "you"
      : /^(Wait on |Nudge |Chase )/.test(move)
        ? "them"
        : "none";

describe("whoseMove agrees with the engine's answer on the room-read fixtures", () => {
  const touchAt = (daysAgo: number) =>
    new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString();

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
      assert.equal(mine.whose, asWhose(engine.move), `${days} days`);
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
    assert.equal(asWhose(engine.move), "none");
    assert.equal(mine.whose, "none");
  });

  /** The engine fed the way the room page feeds it, from the same rows: the
   *  facts from the read and, since slice 14, the read's own verdict. The
   *  engine with only the facts runs the same rungs (whoseMoveFrom), and the
   *  two must write one sentence — pinned on every fixture below. */
  const engineOver = (notes: RecordNote[], now: Date, roster: readonly string[] = []) => {
    const isHome = (n: string) => isHomeSideName(n, roster);
    const { read } = both("A1", "Acme", { homeSide: roster, notes, now });
    const touchRead = lastTouchRead(notes, null, isHome, now);
    const facts = {
      accountName: "Acme",
      step: null,
      timing: null,
      lastTouch: touchRead
        ? {
            at: touchRead.at,
            awaitingReply: touchRead.awaitingReply,
            who: touchRead.who,
          }
        : null,
      lastInbound: read.lastInbound
        ? {
            at: read.lastInbound.at,
            who: read.lastInbound.who,
            promise: read.lastInbound.promise,
          }
        : null,
      lastMeeting: read.lastMeeting
        ? { at: read.lastMeeting.at, who: read.lastMeeting.who }
        : null,
      lastAccepted: read.lastAccepted
        ? { at: read.lastAccepted.at, who: read.lastAccepted.who }
        : null,
      lastRecordAt: read.lastRecordAt,
      now,
    };
    const engine = readDeal({ ...facts, whoseMove: read.whoseMove });
    const fromFacts = readDeal(facts);
    assert.equal(fromFacts.move, engine.move, "the verdict and the facts write one sentence");
    return { read, engine };
  };

  test("the Trend reply after the send is ours to answer", () => {
    const now = new Date("2026-09-02T20:00:00Z");
    const { read, engine } = engineOver(TREND, now);
    assert.equal(asWhose(engine.move), "you");
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
    assert.equal(asWhose(engine.move), "them");
    assert.equal(read.whoseMove.whose, "them");
    assert.equal(read.whoseMove.who, "Adam Dingwell");
  });

  test("the acceptance after our send books the meeting", () => {
    const now = new Date("2026-09-04T22:00:00Z");
    const { read, engine } = engineOver(JOSEPH, now);
    assert.equal(asWhose(engine.move), "booked");
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
    assert.equal(asWhose(engine.move), "you");
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
    assert.equal(asWhose(engine.move), "you");
    assert.equal(read.whoseMove.whose, "you");
    assert.equal(read.whoseMove.who, "Adam Meyer");
    // A colleague writing to the operator about the account is not the
    // account writing (pass 2 B, row 2): with Lesha on the roster the doc is
    // not inbound, and the move stays none on the read and on the engine.
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
    assert.equal(colleague.read.whoseMove.whose, "none");
    assert.equal(colleague.read.lastInbound, null, "a colleague's mail is never inbound");
    assert.equal(asWhose(colleague.engine.move), "none");
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
      // Field 14 grown by slice 18b: the move line needs every open promise,
      // and a surface that needs a fact the read does not carry grows the
      // read (§2.2).
      "theirPromises",
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
    assert.equal(
      read.today.isToday("2026-09-06T05:30:00Z"),
      false,
      "12:30a the next day",
    );
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
    assert.deepEqual(
      byValue,
      { mx: false, br: true },
      "Mexico from the read, Brazil only on the tape",
    );
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

// ── slice 12 · the drawer, the asks and intake read the one read ────────────

describe("the drawer's record reads the room's read on the same rows (§2.2, the third migration)", () => {
  const CSMS = ["Lesha Cyphers"];
  const now = new Date("2026-09-08T12:00:00Z");
  const ROWS = [
    row({
      id: "ol2",
      body: "✉ OL Sep 5 — Re: agreements · Antaeus Coe → Chassie Smith\nAgreements attached.",
      actors: "Antaeus Coe → Chassie Smith",
      source: "outlook-ai",
      createdAt: "2026-09-05T15:00:00Z",
    }),
    row({
      id: "hid",
      body: "✉ OL Sep 4 — Re: Brazil · Chassie Smith → Antaeus Coe\nWe have 3 contractors in Brazil too.",
      actors: "Chassie Smith → Antaeus Coe",
      recipients: "Antaeus Coe",
      source: "outlook-ai",
      createdAt: "2026-09-04T15:00:00Z",
    }),
    row({
      id: "call",
      body: "☎ CT Sep 2 1:01 PM — Reseller path · Antaeus Coe → Chassie Smith\nWants the reseller route. The target client has 5 workers in Mexico, likely employer of record.",
      actors: "Antaeus Coe → Chassie Smith",
      source: "call-ai",
      createdAt: "2026-09-02T18:00:00Z",
    }),
  ];
  // The Brazil reply is ✕-parked: the room never shows it, so the drawer must not.
  const dispositions = new Map<string, unknown>([
    ["hide:note:hid", { status: "parked" }],
  ]);
  const read = readAccount({
    account: { id: "SIMPLOY01", name: "Simploy" },
    notes: ROWS,
    touches: [],
    todos: [],
    dispositions,
    homeSide: CSMS,
    now,
  });
  // The account as collectPipelineAccounts hands it to the builder: the
  // visible rows and the read beside them.
  const account: PipelineAccount = {
    id: "SIMPLOY01",
    name: "Simploy",
    csm: "Lesha Cyphers",
    stageLabel: "",
    notes: ROWS.filter((n) => !read.hidden.has(n.id)).map((n) => ({
      id: n.id,
      createdAt: n.createdAt,
      body: n.body,
      lane: n.lane,
      actors: n.actors,
      source: n.source,
    })),
    todos: [],
    gaps: [],
    support: null,
    actors: [],
    read,
  };
  const [rec] = buildPipelineReport({
    accounts: [account],
    csms: CSMS,
    me: "Antaeus Coe",
    now,
  });

  test("products, countries, the headcount and the last meeting are the read's fields", () => {
    assert.deepEqual(
      read.intel.products.map((p) => p.value),
      ["eor"],
    );
    assert.deepEqual(rec.products, ["EOR"]);
    assert.deepEqual(
      read.intel.countries.map((c) => c.value),
      ["mx"],
    );
    assert.deepEqual(
      rec.opportunities.map((o) => [o.country, o.product, o.headcount]),
      [["Mexico", "EOR", "5 workers"]],
    );
    assert.equal(read.lastMeeting?.noteId, "call");
    assert.equal(read.lastMeeting?.who, "Chassie Smith");
    assert.equal(rec.lastTouch?.date, "2026-09-02");
    assert.equal(rec.lastTouch?.kind, "Call");
    assert.equal(rec.lastTouch?.room[0]?.name, read.lastMeeting?.who);
    assert.deepEqual(rec.events, [{ at: "2026-09-02", kind: "Call" }]);
  });

  test("the reply they owe reads the read's clocks", () => {
    assert.equal(read.lastInbound, null, "the only inbound is parked");
    assert.equal(read.lastOutbound?.noteId, "ol2");
    assert.equal(rec.theirSide[0]?.who, "Chassie");
    assert.match(rec.theirSide[0]?.text ?? "", /reply to your 9\/5 note/);
  });

  test("a ✕-parked row leaves the drawer as it leaves the room: in docs flagged, out of every fact", () => {
    const parked = read.docs.find((d) => d.noteId === "hid");
    assert.equal(parked?.hidden, true);
    assert.equal(parked?.direction, "in", "the doc keeps its own reading");
    assert.ok(!read.intel.countries.some((c) => c.value === "br"));
    assert.ok(!rec.opportunities.some((o) => o.country === "Brazil"));
    assert.ok(!rec.contacts.some((c) => c.name === "Brazil"));
  });
});

describe("the minter's corpus is the read's docs: the shell id folds under the canonical account", () => {
  const [SHELL, REAL] = Object.entries(ALIASES)[0];
  const NAME = "myhrpros (SPMI)";
  // The table as it stands (src/lib/book/merge.ts): the CEO thread was filed
  // under the shell id, the account's own note under the real one.
  const stored = [
    row({
      id: "ceo",
      accountId: SHELL,
      body: "✉ OL Sep 10 — Re: Canada payroll · Joseph Lyon → Antaeus Coe\nWe have 40 employees in Canada we would move to an employer of record.",
      actors: "Joseph Lyon → Antaeus Coe",
      recipients: "Antaeus Coe",
      source: "outlook-ai",
      createdAt: "2026-09-10T15:00:00Z",
    }),
    row({
      id: "own",
      accountId: REAL,
      body: "plain note",
      createdAt: "2026-09-01T15:00:00Z",
    }),
  ];
  // The wide loader folds by canonical id and the stored row keeps the id it
  // was filed under (src/lib/today/overlay.ts); the fold, as the loader does it.
  const notesById = new Map<string, RecordNote[]>();
  for (const n of stored) {
    const k = canonicalAccountId(n.accountId);
    notesById.set(k, [...(notesById.get(k) ?? []), n]);
  }
  const stores = {
    notesById,
    touches: [],
    todos: [],
    dispositions: new Map<string, unknown>(),
    homeSide: declaredHomeSide([]),
  };

  test("the CEO thread filed under the shell id is a doc of the real account", () => {
    assert.equal(notesById.size, 1, "one company, one account");
    const read = readFromStores(stores, { id: REAL, name: NAME }, { now: NOW });
    assert.ok(read.docs.some((d) => d.noteId === "ceo"));
    assert.ok(read.intel.countries.some((c) => c.value === "ca"));
    assert.ok(read.intel.products.some((p) => p.value === "eor"));
    assert.equal(read.lastInbound?.noteId, "ceo");
    // The ask brain names the relationship the room names (pass 2 C, the
    // relationship row): the record over the book's seed.
    assert.equal(read.relationship.name, "Joseph Lyon");
    assert.equal(read.relationship.source, "record");
  });

  test("a ✕-parked row of the shell's leaves the minter's corpus too", () => {
    const read = readFromStores(
      { ...stores, dispositions: new Map([["hide:note:ceo", { status: "parked" }]]) },
      { id: REAL, name: NAME },
      { now: NOW },
    );
    assert.equal(read.docs.find((d) => d.noteId === "ceo")?.hidden, true);
    assert.equal(read.lastInbound, null);
    assert.ok(!read.intel.countries.some((c) => c.src.startsWith("sf-activity")));
  });

  test("the declared roster is the CSM column plus the record's own (E9)", () => {
    const roster = declaredHomeSide(new Set(["shane jacobs"]));
    assert.ok(roster.includes("shane jacobs"));
    assert.ok(roster.length > 1, "the CSM column rides too");
  });

  test("the minter, the intake prefill and the live read assemble the read from the stores, nothing of their own", () => {
    const actions = readFileSync("src/app/room/actions.ts", "utf8");
    const refill = actions.slice(
      actions.indexOf("export async function roomGapsRefill("),
      actions.indexOf("export async function roomGapDismiss("),
    );
    assert.ok(refill.includes("readFromStores("), "the minter reads the read");
    assert.ok(
      refill.includes("loadAccountNotes()"),
      "through the wide loader, which folds the shell id",
    );
    assert.ok(!refill.includes("take: 40"), "the forty-row corpus is gone");
    assert.ok(
      refill.includes("never reads direction"),
      "the ask builder's deliberate blindness stays written down (pass 2 E)",
    );
    for (const f of [
      "src/app/intake/actions.ts",
      "src/lib/ask/live.ts",
      "src/lib/pipeline/build.ts",
      "src/app/room/actions.ts",
    ]) {
      const src = readFileSync(f, "utf8");
      assert.ok(
        !/\b(corpusFor|dealIntelFor|extractDealIntel)\(/.test(src),
        `${f} builds a corpus of its own`,
      );
    }
    for (const f of ["src/app/intake/actions.ts", "src/lib/ask/live.ts"])
      assert.ok(
        readFileSync(f, "utf8").includes("readFromStores("),
        `${f} reads the read`,
      );
  });
});

describe('the live read says "no reply has been filed" only when the read\'s lastInbound is empty', () => {
  const NO_REPLY = /no reply has been filed/;
  const linesFor = (notes: RecordNote[], now: Date) => {
    const read = readAccount({
      account: { id: "A1", name: "Acme" },
      notes,
      touches: [],
      todos: [],
      dispositions: new Map(),
      homeSide: [],
      now,
    });
    return liveLines({ id: "A1", name: "Acme" }, read, {
      facts: [],
      rows: notes,
      openTodos: [],
    });
  };

  test("our send and nothing back: the phrase stands", () => {
    const lines = linesFor(
      [
        row({
          id: "o1",
          body: "✉ OL Sep 1 — Re: intro · Antaeus Coe → Dana Ellis\nSending the model.",
          actors: "Antaeus Coe → Dana Ellis",
          source: "outlook-ai",
          createdAt: "2026-09-01T15:00:00Z",
        }),
      ],
      new Date("2026-09-03T15:00:00Z"),
    );
    assert.ok(
      lines.some((l) => NO_REPLY.test(l) && /waiting on Dana Ellis since 9\/1/.test(l)),
    );
  });

  test("their reply after our send: they wrote, and the phrase is gone", () => {
    const lines = linesFor(TREND, new Date("2026-09-02T20:00:00Z"));
    assert.ok(!lines.some((l) => NO_REPLY.test(l)));
    assert.ok(
      lines.some(
        (l) => /Adam Dingwell wrote back 9\/2/.test(l) && /operator's to send/.test(l),
      ),
      lines.join("\n"),
    );
  });

  test("their word before our newest send: still waiting, their last word dated, the phrase gone", () => {
    const lines = linesFor(LESHA, NOW);
    assert.ok(!lines.some((l) => NO_REPLY.test(l)));
    assert.ok(
      lines.some(
        (l) =>
          /waiting on Lesha Cyphers since 8\/22/.test(l) &&
          /their last word on file is from 8\/22/.test(l),
      ),
      lines.join("\n"),
    );
    // The relationship is the read's: the record's person, not the book's seed.
    assert.ok(lines.some((l) => l === "The relationship on Acme is Lesha Cyphers."));
    // The record lines ride beneath, newest first.
    assert.ok(
      lines.some((l) => /^Record 8\/22 \(Lesha Cyphers → Antaeus Coe\): /.test(l)),
    );
  });
});

// ═══ slice 11a · Groundwork and the exclusion ═══════════════════════════════

// The two rows the derived-fact ledger named (pass 2 B, rows 7 and 8): the
// old Groundwork corpus dropped the actors column and the roster, so a ☎ CT
// send read as nothing and a mail between two of their people read as inbound.
// Both pages now call readAccount with the same assembly — the full rows, the
// whole touch log, the declared roster — and this is what that assembly says.
const CHASSIE = [
  row({
    id: "ct",
    body: "☎ CT Sep 20 — Intro call · Antaeus Coe → Chassie Smith\nWalked through the model.",
    actors: "Antaeus Coe → Chassie Smith",
    source: "call-ai",
    createdAt: "2026-09-20T15:00:00Z",
  }),
  row({
    id: "ol",
    body: "✉ OL Sep 10 — Intro · Antaeus Coe → Chassie Smith\nHere is the overview.",
    actors: "Antaeus Coe → Chassie Smith",
    source: "outlook-ai",
    createdAt: "2026-09-10T15:00:00Z",
  }),
];
const THEIR_THREAD = [
  row({
    id: "tj",
    body: "✉ OL Sep 15 — Re: payroll · Tom Harrison → Javier Ramirez\nCan you pull the Mexico headcount?",
    actors: "Tom Harrison → Javier Ramirez",
    recipients: "Javier Ramirez",
    source: "outlook-ai",
    createdAt: "2026-09-15T15:00:00Z",
  }),
];
const ROSTER = ["Lesha Cyphers", "Anika Steenstra"];

/** The page's call, as Groundwork and the room both make it. */
const pageRead = (notes: RecordNote[], now = new Date("2026-09-25T17:00:00Z")) =>
  readAccount({
    account: { id: "A1", name: "Test Partner", contacts: [] },
    notes,
    touches: [],
    todos: [],
    dispositions: new Map(),
    homeSide: ROSTER,
    now,
  });

describe("Groundwork reads the account as the room does (slice 11a; pass 2 B rows 7 and 8)", () => {
  test("row 7: the ☎ CT send with its actors column is the last outbound on both", () => {
    const groundwork = pageRead(CHASSIE);
    const room = pageRead(CHASSIE);
    assert.deepEqual(groundwork.intel, room.intel);
    assert.equal(groundwork.intel.lastOutbound, "2026-09-20T15:00:00Z");
    assert.equal(groundwork.intel.lastInbound, "");
  });

  test("row 8: a mail between two of their people is not inbound on both", () => {
    const groundwork = pageRead(THEIR_THREAD);
    const room = pageRead(THEIR_THREAD);
    assert.deepEqual(groundwork.intel, room.intel);
    assert.equal(groundwork.intel.lastInbound, "");
    assert.equal(groundwork.lastInbound, null);
    // The same mail to a colleague's inbox IS inbound (C6, amended
    // 2026-10-05): their reply reached us, whoever caught it.
    const toColleague = pageRead([
      row({
        ...THEIR_THREAD[0],
        body: "✉ OL Sep 15 — Re: payroll · Tom Harrison → Lesha Cyphers\nCan you pull the Mexico headcount?",
        actors: "Tom Harrison → Lesha Cyphers",
        recipients: "Lesha Cyphers",
      }),
    ]);
    assert.equal(toColleague.intel.lastInbound, "2026-09-15T15:00:00Z");
    assert.equal(toColleague.intel.lastInboundWho, "Tom Harrison");
    // …and it leaves the queue for 21 days, producing no move anywhere.
    const ids = liveMotionIds(
      new Map(),
      new Map([["A1", toColleague.intel]]),
      new Date("2026-09-25T17:00:00Z"),
    );
    assert.ok(ids.has("A1"));
  });
});

// ── the exclusion reads the export's attributed inbound (D19) ───────────────

const stagedRow = (p: Partial<StagedRow>): StagedRow => ({
  k: p.k ?? "k",
  d: p.d ?? "2026-08-25",
  s: p.s ?? "Re: global payroll",
  a: p.a ?? "Lesha Cyphers",
  lane: p.lane ?? "human",
  sub: p.sub ?? "Email",
  rt: p.rt ?? "Service Provider Task",
  ct: p.ct ?? "",
  fl: p.fl ?? "",
  ...(p.w ? { w: p.w } : {}),
  ...(p.c ? { c: p.c } : {}),
  ...(p.p ? { p: p.p } : {}),
});
const slice = (rows: StagedRow[], lastEmailReceivedKey: string): AccountSlice => ({
  id: "A1",
  name: "Test Partner",
  meta: {
    primaryContactEmail: "",
    primaryContact: "Dana Reyes",
    primaryContactTitle: "CFO",
    lastContact: "",
    contactedDate: "",
    lastEmailSentKey: "",
    lastEmailReceivedKey,
    gbc: "",
  },
  rows,
  dropped: 0,
  tally: { days: {}, camps: {}, receipts: 0 },
  laneCounts: { human: rows.length, csm: 0, support: 0, intent: 0, machinery: 0 },
  laneEmails: { human: rows.length, csm: 0, support: 0, intent: 0, machinery: 0 },
  rowsSum: "",
  tallySum: "",
});
const rollupOf = (rows: StagedRow[], lastEmailReceivedKey: string) =>
  buildRollup({
    slice: slice(rows, lastEmailReceivedKey),
    dropSha: "d942e0f2aaaaaaaa",
    dropDay: "2026-09-01",
    window: { from: "2026-06-01", to: "2026-09-01" },
    colleagues: new Set(["Lesha Cyphers"]),
    accountPeople: new Set(["Dana Reyes"]),
    accountEmails: new Map([["dana.reyes@example.com", "Dana Reyes"]]),
  });
const secondOf = (rows: StagedRow[], lastEmailReceivedKey: string) => ({
  rollup: rollupOf(rows, lastEmailReceivedKey),
  gems: [],
  support: null,
  intent: null,
});
const DANA_WROTE = stagedRow({
  k: "dana",
  d: "2026-08-25",
  w: "Dana Reyes",
  c: "To: lesha.cyphers@prismhr.com\nSubject: Re: global payroll\nBody: Thanks for the intro. Can we talk about Canada next week?\nBest regards,\nDana Reyes",
});

describe("the exclusion reads the second record's attributed inbound, never its datetime (D19)", () => {
  test("an export row with an attributed inbound body excludes for 21 days", () => {
    const second = new Map([["A1", secondOf([DANA_WROTE], "2026-08-25 09:00")]]);
    assert.equal(second.get("A1")!.rollup.lastTheirs?.who, "Dana Reyes");
    // A day key reads at noon UTC, as every day key in the second record does.
    const within = liveMotionIds(
      new Map(),
      new Map(),
      new Date("2026-09-15T11:00:00Z"),
      second,
    );
    assert.ok(within.has("A1"), "inside 21 days: in motion, off the queue");
    const past = liveMotionIds(
      new Map(),
      new Map(),
      new Date("2026-09-16T17:00:00Z"),
      second,
    );
    assert.equal(past.has("A1"), false, "past 21 days: the exclusion lifts");
    // The line survives the store's round trip, so a page reads what the run wrote.
    const parsed = parseRollupBody(renderRollupBody(second.get("A1")!.rollup));
    assert.deepEqual(parsed?.lastTheirs, {
      day: "2026-08-25",
      who: "Dana Reyes",
      subject: "Re: global payroll",
    });
  });

  test("an account-level datetime alone does not", () => {
    // Last Email Received says yesterday; the rows hold only the operator's
    // own send, with Dana in the To line. A datetime is not their voice.
    const ours = stagedRow({
      k: "ours",
      d: "2026-09-04",
      a: "Antaeus Coe",
      w: "Antaeus Coe",
      p: "dana.reyes@example.com",
      c: "To: dana.reyes@example.com\nSubject: Re: global payroll\nBody: Sending the model over.\nBest,\nAntaeus Coe",
    });
    const second = new Map([["A1", secondOf([ours], "2026-09-04 09:00")]]);
    const sr = second.get("A1")!;
    assert.equal(sr.rollup.lastTheirs, null);
    assert.equal(
      sr.rollup.lastHuman?.kind,
      "account",
      "the To line names her — not enough",
    );
    // The datetime still reads where the drumbeat reads it; it just never excludes.
    assert.equal(orgInboundKey(sr), "2026-09-04T09:00:00");
    const ids = liveMotionIds(
      new Map(),
      new Map(),
      new Date("2026-09-05T17:00:00Z"),
      second,
    );
    assert.equal(ids.has("A1"), false);
    // A rollup written before the line existed reads null and excludes nothing.
    const old = parseRollupBody(
      renderRollupBody(sr.rollup)
        .split("\n")
        .filter((l) => !l.startsWith("LAST THEIRS"))
        .join("\n"),
    );
    assert.equal(old?.lastTheirs, null);
  });

  test("a sign-off and a calendar response are not their word", () => {
    const thanks = stagedRow({
      k: "thanks",
      d: "2026-09-04",
      w: "Dana Reyes",
      c: "To: lesha.cyphers@prismhr.com\nSubject: Re: global payroll\nBody: Thanks!\nBest regards,\nDana Reyes",
    });
    const accepted = stagedRow({
      k: "accepted",
      d: "2026-09-04",
      s: "Accepted: Intro to PrismHR Global",
      w: "Dana Reyes",
      c: "To: lesha.cyphers@prismhr.com\nSubject: Accepted: Intro\nBody: Dana Reyes has accepted this meeting.",
    });
    const second = new Map([
      ["A1", secondOf([thanks, accepted, DANA_WROTE], "2026-09-04 09:00")],
    ]);
    // The closer and the acceptance are read through to her real word of Aug 25.
    assert.equal(second.get("A1")!.rollup.lastTheirs?.day, "2026-08-25");
    const ids = liveMotionIds(
      new Map(),
      new Map(),
      new Date("2026-09-25T17:00:00Z"),
      second,
    );
    assert.equal(ids.has("A1"), false, "Aug 25 is past the window; Sep 4 never counted");
  });
});

// ── the who chip row (C18) ──────────────────────────────────────────────────

describe("the who chip row offers the record's people merged with the book's and asks only between two names (C18)", () => {
  test("one person in the record, the same person in the book: one name, no ask", () => {
    const names = whoChipNames(
      [{ name: "Dana M. Reyes" }],
      [{ first: "Dana", last: "Reyes" }],
    );
    assert.deepEqual(names, ["Dana M. Reyes"]);
    assert.equal(names.length > 1, false);
  });

  test("the record's person and a second name from the book: two names, the record first, the row asks", () => {
    const names = whoChipNames(
      [{ name: "Dana Reyes" }],
      [
        { first: "Pat", last: "Example" },
        { first: "Dana", last: "Reyes" },
      ],
    );
    assert.deepEqual(names, ["Dana Reyes", "Pat Example"]);
    assert.equal(names.length > 1, true);
  });

  test("the read's people feed it: who the record names leads the book's roster", () => {
    const acct = readAccount({
      account: {
        id: "A1",
        name: "Test Partner",
        contacts: [
          { first: "Pat", last: "Example", title: "CEO", email: "pat@example.com" },
          { first: "Dana", last: "Reyes", title: "CFO", email: "dana@example.com" },
        ],
      },
      notes: [
        row({
          id: "d1",
          body: "✉ OL Sep 15 — Re: payroll · Dana Reyes → Antaeus Coe\nCan we talk Monday?",
          actors: "Dana Reyes → Antaeus Coe",
          source: "outlook-ai",
          createdAt: "2026-09-15T15:00:00Z",
        }),
      ],
      touches: [],
      todos: [],
      dispositions: new Map(),
      homeSide: ROSTER,
      now: NOW,
    });
    assert.deepEqual(
      whoChipNames(acct.people, [
        { first: "Pat", last: "Example" },
        { first: "Dana", last: "Reyes" },
      ]),
      ["Dana Reyes", "Pat Example"],
    );
    // A book that knows no one and a record naming one person: no ask.
    assert.equal(whoChipNames(acct.people, []).length, 1);
  });
});

// ── a seat follows its account onto the register (C8) ───────────────────────

describe("a seat on an excluded account reads on the HomeRoom's sheet as open (C8)", () => {
  const SEAT = {
    id: "s1",
    body: renderSeatBody({ act: "Send the model.", term: "MODEL", day: "2026-09-01" }),
    createdAt: "2026-09-01T15:00:00Z",
  };
  const sheet = (
    seat: Parameters<typeof buildAccountSheet>[6],
    opts: {
      notes?: { body: string; createdAt: string; source?: string; actors?: string }[];
      dispositions?: Map<string, { reason: string; updatedAt: string }>;
    } = {},
  ) =>
    buildAccountSheet(
      [],
      "A1",
      new Set(),
      opts.dispositions ?? new Map(),
      NOW,
      opts.notes ?? [],
      seat,
    );

  test("excluded: the seat is an open line carrying the act, the seat row's own id", () => {
    const s = sheet({ rows: [SEAT], excluded: true });
    assert.deepEqual(s.open, [
      { id: "s1", body: "Send the model.", edit: "Send the model." },
    ]);
    assert.equal(s.openMore, 0);
  });

  test("not excluded: the seat stays on the wing and reads nowhere here", () => {
    assert.deepEqual(sheet({ rows: [SEAT], excluded: false }).open, []);
    assert.deepEqual(sheet(null).open, []);
  });

  test("worked — by today's stamp or by the record's outbound after the seat — it reads nowhere", () => {
    assert.deepEqual(sheet({ rows: [SEAT], excluded: true, workedToday: true }).open, []);
    const sent = {
      body: "✉ OL Sep 3 — Re: the model · Antaeus Coe → Dana Reyes\nAttached.",
      createdAt: "2026-09-03T15:00:00Z",
      source: "outlook-ai",
      actors: "Antaeus Coe → Dana Reyes",
    };
    assert.deepEqual(sheet({ rows: [SEAT], excluded: true }, { notes: [sent] }).open, []);
    // A send BEFORE the seat is not the seat's work.
    const earlier = { ...sent, createdAt: "2026-08-20T15:00:00Z" };
    assert.equal(
      sheet({ rows: [SEAT], excluded: true }, { notes: [earlier] }).open.length,
      1,
    );
  });

  test("taken back with ✕ (hide:note:) it is gone; held with ⏲ it reads HELD for the day", () => {
    const parked = new Map([
      ["hide:note:s1", { reason: "", updatedAt: NOW.toISOString() }],
    ]);
    assert.deepEqual(
      sheet({ rows: [SEAT], excluded: true }, { dispositions: parked }).open,
      [],
    );
    const held = new Map([
      ["row-delay:todo:s1", { reason: "", updatedAt: NOW.toISOString() }],
    ]);
    const s = sheet({ rows: [SEAT], excluded: true }, { dispositions: held });
    assert.deepEqual(s.open, []);
    assert.deepEqual(s.delayed, [
      { id: "s1", body: "Send the model.", edit: "Send the model.", when: "HELD" },
    ]);
  });
});

// ── the Accounts sheet: LAST HUMAN TOUCH reads both records (C1) ────────────

describe("LAST HUMAN TOUCH reads both records and whispers which (C1)", () => {
  const rollup = (over: Partial<Rollup>): Rollup => ({
    dropSha: "037742a0",
    dropDay: "2026-09-26",
    window: { from: "2026-06-28", to: "2026-09-26" },
    lanes: { human: 0, csm: 0, support: 0, intent: 0, machinery: 0 },
    emails: { human: 0, csm: 0, support: 0, intent: 0, machinery: 0 },
    intent: { s: 0, o: 0, c: 0 },
    receipts: 0,
    lastHuman: null,
    lastOrgInbound: "",
    // Slice 11a's attributed inbound (D19); the C1 merge reads lastHuman alone.
    lastTheirs: null,
    actors: [],
    threads: [],
    verdict: "",
    ...over,
  });
  /** The export's last human row, as the rollup states it. */
  const exportRow = (
    day: string,
    who = "Dana Ellis",
    kind = "account",
  ): SecondRecord => ({
    rollup: rollup({
      lastHuman: { day, how: "email", who, kind, subject: "Re: Canada" },
    }),
    gems: [],
    support: null,
    intent: null,
  });
  // An .eml dropped on the Chute files as an OUTLOOK THREAD entry: the
  // operator's send to the account's person, filed Sep 22.
  const EML = [
    row({
      id: "e1",
      body: "✉ OL Sep 22 10:12 AM — Re: Canada model · Antaeus Coe → Dana Ellis\nModel attached, as promised.",
      actors: "Antaeus Coe → Dana Ellis",
      source: "outlook",
      createdAt: "2026-09-22T15:12:00Z",
    }),
  ];
  const NOW_SEP = new Date("2026-09-26T17:00:00Z");

  test("an .eml filed Sep 22 beats an export row of Sep 10 and whispers record", () => {
    const { read } = both("A1", "Acme", { homeSide: [], notes: EML, now: NOW_SEP });
    assert.equal(read.lastTouch?.source, "record");
    assert.deepEqual(lastHumanTouch(read, exportRow("2026-09-10")), {
      who: "Dana Ellis",
      day: "2026-09-22",
      kind: "ours",
      record: "record",
    });
  });

  test("the export wins the other way and whispers salesforce", () => {
    const { read } = both("A1", "Acme", { homeSide: [], notes: EML, now: NOW_SEP });
    assert.deepEqual(lastHumanTouch(read, exportRow("2026-09-25", "Adam Dingwell")), {
      who: "Adam Dingwell",
      day: "2026-09-25",
      kind: "account",
      record: "salesforce",
    });
  });

  test("one record alone speaks; a tie goes to the record; neither is nothing", () => {
    const { read } = both("A1", "Acme", { homeSide: [], notes: EML, now: NOW_SEP });
    assert.equal(lastHumanTouch(read, null)?.record, "record");
    const empty = both("A1", "Acme", { homeSide: [], notes: [], now: NOW_SEP }).read;
    assert.equal(lastHumanTouch(empty, exportRow("2026-09-10"))?.record, "salesforce");
    assert.equal(lastHumanTouch(empty, null), null);
    // The export's day is a day and the record's moment is the operator's
    // own hand: the same day reads from the record.
    assert.equal(lastHumanTouch(read, exportRow("2026-09-22"))?.record, "record");
  });

  test("the touch log is the record too: it merges with the record's sends by latest (C3)", () => {
    const { read } = both("A1", "Acme", {
      homeSide: [],
      notes: EML,
      touches: [
        touch({
          subjectKey: "outreach:A1",
          label: "Acme",
          contactedAt: "2026-09-24T15:00:00Z",
        }),
      ],
      now: NOW_SEP,
    });
    assert.equal(read.lastTouch?.source, "log");
    const merged = lastHumanTouch(read, exportRow("2026-09-23"));
    assert.equal(merged?.day, "2026-09-24");
    assert.equal(merged?.record, "record");
    // The log names no target: the relationship contact speaks.
    assert.equal(merged?.who, "Dana Ellis");
  });
});

// ── engaged reads the conversation (field 16), on Accounts and Groundwork ───

describe("an inbound with no send reads engaged", () => {
  const INBOUND_ONLY = [
    row({
      id: "i1",
      body: "✉ OL Sep 20 — Re: Canada · Dana Ellis → Antaeus Coe\nWe have two clients asking about Canada. Can you walk us through it?",
      actors: "Dana Ellis → Antaeus Coe",
      recipients: "Antaeus Coe",
      source: "outlook",
      createdAt: "2026-09-20T15:00:00Z",
    }),
  ];

  test("on Accounts: engaged reads conversationExists, and the touch column stays empty", () => {
    const { read } = both("A1", "Acme", { homeSide: [], notes: INBOUND_ONLY });
    assert.equal(read.lastOutbound, null);
    assert.equal(read.lastTouch, null);
    assert.equal(read.conversationExists, true);
    // Their word reached us and nothing of ours went out: engaged, with no
    // touch of the record's own for LAST HUMAN TOUCH to show.
    assert.equal(lastHumanTouch(read, null), null);
  });

  test("on Groundwork: the same rows, the same field", () => {
    // Groundwork's page reads the same `conversationExists` (slice 11a); the
    // pin rides the read, where both pages' answer lives.
    const { read } = both("A1", "Acme", {
      homeSide: [],
      notes: INBOUND_ONLY,
      now: new Date("2026-10-05T17:00:00Z"),
    });
    assert.equal(read.conversationExists, true);
    assert.equal(read.lastInbound?.who, "Dana Ellis");
  });

  test("machinery or a sign-off alone is no conversation, and an empty record is none", () => {
    // The acceptance (Joseph's n5) is machinery; Lesha's "No problem!" is a
    // closer: neither carries a direction, so neither engages.
    const accepted = both("HRH01", "HR Hawaii", { homeSide: [], notes: [JOSEPH[0]] });
    assert.equal(accepted.read.conversationExists, false);
    const signOff = both("SIMPLOY01", "Simploy", { homeSide: [], notes: [LESHA[0]] });
    assert.equal(signOff.read.conversationExists, false);
    assert.equal(
      both("A1", "Acme", { homeSide: [], notes: [] }).read.conversationExists,
      false,
    );
  });
});

// ── slice 14 · whose move, spelled once (§2.2, the fifth migration) ─────────
// Pass 2 B's first five rows each named a note on which two readers disagreed
// about whose move it was. One spelling now answers for the room, the drawer,
// the drumbeat and the Sendbook, and each row gets one answer.

describe("the five whose-move fixtures of pass 2 B rows 1 to 5 give one answer each", () => {
  const CSMS = ["Lesha Cyphers"];
  const isHome = (n: string) => isHomeSideName(n, CSMS);

  /** The read, the engine on its verdict, and the register's two date sets. */
  const everywhere = (notes: RecordNote[], now: Date) => {
    const read = readAccount({
      account: { id: "A1", name: "Acme" },
      notes,
      touches: [],
      todos: [],
      dispositions: new Map(),
      homeSide: CSMS,
      now,
    });
    const touchRead = lastTouchRead(notes, null, isHome, now);
    const engine = readDeal({
      accountName: "Acme",
      step: null,
      timing: null,
      whoseMove: read.whoseMove,
      lastTouch: touchRead
        ? { at: touchRead.at, awaitingReply: touchRead.awaitingReply, who: touchRead.who }
        : null,
      lastInbound: read.lastInbound,
      lastMeeting: read.lastMeeting,
      lastAccepted: read.lastAccepted,
      lastRecordAt: read.lastRecordAt,
      now,
    });
    return {
      read,
      engine,
      sends: recordSends(read.docs),
      warm: warmDates(read.docs),
      inbound: inboundDates(read.docs),
    };
  };

  test("row 1 · a self-addressed SF task never flips the court: the inbound before it stands", () => {
    const now = new Date("2026-09-25T17:00:00Z");
    const { read, engine, sends } = everywhere(
      [
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
      ],
      now,
    );
    assert.deepEqual(
      { whose: read.whoseMove.whose, rung: read.whoseMove.rung, who: read.whoseMove.who },
      { whose: "you", rung: "reply", who: "Adam Meyer" },
    );
    assert.equal(engine.move, "Answer Adam Meyer. They wrote 7 days ago.");
    // The task is not a send on any register: not the touch clock's, not the
    // Sendbook's.
    assert.equal(read.lastOutbound, null);
    assert.deepEqual(sends, []);
  });

  test("row 2 · a colleague's mail never flips it: not inbound, not warm, not excluding", () => {
    const now = new Date("2026-09-25T17:00:00Z");
    const notes = [
      row({
        id: "c1",
        body: "✉ OL Sep 22 — Re: Regis intro · Lesha Cyphers → Antaeus Coe\nI made the intro, you should hear from them.",
        actors: "Lesha Cyphers → Antaeus Coe",
        recipients: "Antaeus Coe",
        source: "outlook-ai",
        createdAt: "2026-09-22T12:00:00Z",
      }),
      row({
        id: "c0",
        body: "✉ OL Sep 21 — Re: Regis intro · Antaeus Coe → Leilani Gonzalez +1\nLooking forward to it.",
        actors: "Antaeus Coe → Leilani Gonzalez +1",
        source: "outlook-ai",
        createdAt: "2026-09-21T12:00:00Z",
      }),
    ];
    const { read, engine, warm, inbound } = everywhere(notes, now);
    const lesha = read.docs.find((d) => d.noteId === "c1")!;
    assert.equal(lesha.senderIsHome, true);
    assert.equal(lesha.direction, undefined, "ours, so neither in nor out");
    assert.equal(read.lastInbound, null);
    // The thread is still ours awaiting Leilani: the send stands, the mail
    // between colleagues changes nothing.
    assert.equal(read.whoseMove.whose, "them");
    assert.equal(read.whoseMove.rung, "send");
    assert.equal(read.whoseMove.who, "Leilani Gonzalez");
    assert.ok(!/^Answer/.test(engine.move), engine.move);
    assert.deepEqual(warm, [], "a CSM's voice never warms");
    assert.deepEqual(inbound, []);
    assert.equal(
      liveMotionIds(new Map(), new Map([["A1", read.intel]]), now).has("A1"),
      false,
      "a colleague's mail does not take the account off Groundwork",
    );
  });

  test("row 3 · an acceptance books: machinery for the register, the meeting for the move", () => {
    const now = new Date("2026-09-04T22:00:00Z");
    const { read, engine, warm, inbound } = everywhere(JOSEPH, now);
    assert.deepEqual(
      { whose: read.whoseMove.whose, rung: read.whoseMove.rung, who: read.whoseMove.who },
      { whose: "booked", rung: "acceptance", who: "Joseph Lyon" },
    );
    assert.equal(engine.move, "Wait for the meeting. Joseph Lyon accepted.");
    const accepted = read.docs.find((d) => d.noteId === "n5")!;
    assert.equal(accepted.machinery, true);
    assert.ok(!warm.includes(accepted.at), "the acceptance never warms");
    assert.ok(!inbound.includes(accepted.at), "and never replies");
    // Joseph's own 10:22 message is his voice, and it does both.
    const wrote = read.docs.find((d) => d.noteId === "n2")!;
    assert.ok(warm.includes(wrote.at));
    assert.ok(inbound.includes(wrote.at));
  });

  test("row 4 · a closer changes nothing for the move, and warms the lane", () => {
    const now = new Date("2026-09-25T17:00:00Z");
    const { read, engine, warm, inbound } = everywhere(
      [
        row({
          id: "k2",
          body: "✉ OL Sep 23 — Re: pricing · Adam Meyer → Antaeus Coe\nThanks!",
          actors: "Adam Meyer → Antaeus Coe",
          recipients: "Antaeus Coe",
          source: "outlook-ai",
          createdAt: "2026-09-23T12:00:00Z",
        }),
        row({
          id: "k1",
          body: "✉ OL Sep 22 — Re: pricing · Antaeus Coe → Adam Meyer\nThe Canada numbers are attached.",
          actors: "Antaeus Coe → Adam Meyer",
          source: "outlook-ai",
          createdAt: "2026-09-22T12:00:00Z",
        }),
      ],
      now,
    );
    const thanks = read.docs.find((d) => d.noteId === "k2")!;
    assert.equal(thanks.closer, true);
    assert.equal(thanks.direction, undefined, "transparent for whose move");
    assert.deepEqual(
      { whose: read.whoseMove.whose, rung: read.whoseMove.rung, who: read.whoseMove.who },
      { whose: "them", rung: "send", who: "Adam Meyer" },
    );
    assert.equal(engine.move, "Wait on Adam Meyer. Nothing owed on your side today.");
    assert.deepEqual(warm, [thanks.at], "their voice is still their voice");
    assert.deepEqual(inbound, [], "and ↩ REPLIED needs a substantive inbound");
  });

  test("row 5 · a same-day reply orders against the send by the head clock, on every reader", () => {
    const now = new Date("2026-09-02T20:00:00Z");
    // 9:44 AM send, 10:39 AM reply, one noon anchor: the reply answers the send.
    const answered = everywhere(TREND, now);
    assert.deepEqual(
      {
        whose: answered.read.whoseMove.whose,
        rung: answered.read.whoseMove.rung,
        who: answered.read.whoseMove.who,
      },
      { whose: "you", rung: "reply", who: "Adam Dingwell" },
    );
    assert.equal(answered.engine.move, "Answer Adam Dingwell. They wrote today.");
    assert.equal(answered.sends.length, 1);
    assert.ok(answered.inbound[0] > answered.sends[0].at, "the register orders them the same");
    // The same two entries with the send at 2:15 PM: a morning reply never
    // answers an afternoon send.
    const afternoon = everywhere(
      [
        row({
          ...TREND[0],
          body: TREND[0].body.replace("9:44 AM", "2:15 PM"),
        }),
        TREND[1],
      ],
      now,
    );
    assert.equal(afternoon.read.whoseMove.whose, "them");
    assert.equal(afternoon.read.whoseMove.rung, "send");
    assert.equal(afternoon.engine.move, "Wait on Melanie Dreyer. You wrote today.");
    assert.ok(afternoon.inbound[0] < afternoon.sends[0].at);
  });
});
