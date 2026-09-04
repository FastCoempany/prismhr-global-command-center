// The calendar answers, and a kept promise closes (founder-decreed
// 2026-09-04). On 9/4 the operator told Joseph Lyon "calendar invite to
// follow" at 10:32 AM, sent the Zoom invite at 3:34 PM, and Joseph accepted
// it at 3:49 PM. The meeting was booked and nothing was owed — and the row
// said "Answer Joseph. They wrote today." beside a register still demanding
// the invite he had already accepted.
//
// Two faults: an acceptance is the calendar's machinery, not a person
// writing; and the register only ever knew what was promised, never what
// landed.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isMeetingResponse } from "../src/lib/intel/closer";
import { settledByRecord } from "../src/lib/room/settled";
import { corpusFor, extractDealIntel } from "../src/lib/intel/extract";
import { buildAccountSheet } from "../src/lib/room/sheet-view";
import { readDeal } from "../src/lib/room/engine";

const NOON = "2026-09-04T12:00:00.000Z";

// The record as it actually stands, heads verbatim.
const NOTES = [
  {
    id: "n5",
    body: "✉ OL 09/04 3:49 PM — Accepted: Initial Chat | Intro to PrismHR Global · Joseph Lyon → Antaeus Coe",
    createdAt: NOON,
    actors: "Joseph Lyon → Antaeus Coe",
    kind: "account",
  },
  {
    id: "n4",
    body: "✉ OL 09/04 3:34 PM — Initial Chat | Intro to PrismHR Global · Antaeus Coe → Joseph Lyon\nAntaeus Coe is inviting you to a scheduled Zoom meeting.",
    createdAt: NOON,
    actors: "Antaeus Coe → Joseph Lyon",
    kind: "account",
  },
  {
    id: "n3",
    body: "✉ OL Today 10:32 AM — Re: Intro for Prism Global · Antaeus Coe → Joseph Lyon +2\nConfirms the intended days were Monday/Tuesday. Calendar invite to follow. Owed: send invite for the Mon Sep 14 window — @Antaeus Coe.",
    createdAt: NOON,
    actors: "Antaeus Coe → Joseph Lyon +2",
    kind: "account",
  },
  {
    id: "n2",
    body: "✉ OL Today 10:22 AM — Re: Intro for Prism Global · Joseph Lyon → Antaeus Coe +2\nFlags that the proposed dates fall on Monday and Tuesday. Monday Sept 14 works better for him.",
    createdAt: NOON,
    actors: "Joseph Lyon → Antaeus Coe +2",
    kind: "account",
  },
];

describe("a calendar response is machinery, not a person writing", () => {
  test("the real acceptance head is recognized", () => {
    assert.equal(
      isMeetingResponse(
        "✉ OL 09/04 3:49 PM — Accepted: Initial Chat | Intro to PrismHR Global · Joseph Lyon → Antaeus Coe",
      ),
      true,
    );
  });
  test("declines and tentatives are responses too", () => {
    assert.ok(isMeetingResponse("✉ OL 09/04 — Declined: Quarterly review · J → A"));
    assert.ok(isMeetingResponse("✉ OL 09/04 — Tentative: Quarterly review · J → A"));
  });
  test("the invitation itself is not a response", () => {
    assert.equal(
      isMeetingResponse(
        "✉ OL 09/04 3:34 PM — Initial Chat | Intro to PrismHR Global · Antaeus Coe → Joseph Lyon",
      ),
      false,
    );
  });
  test("adversarial: a person using the word in a sentence is content", () => {
    assert.equal(
      isMeetingResponse(
        "✉ OL 09/04 — Re: pricing — we accepted: your terms look fine · J → A",
      ),
      false,
    );
    assert.equal(isMeetingResponse("✉ OL 09/04 — Re: Accepted terms · J → A"), false);
    assert.equal(isMeetingResponse(""), false);
  });

  test("the acceptance never flips the court — the last real inbound stands", () => {
    const intel = extractDealIntel(
      corpusFor("acct", "My HR Professionals", { acctNotes: NOTES }),
    );
    // Joseph's 10:22 AM message is his last real one — and the operator
    // answered it at 10:32, so nothing is owed back.
    const read = readDeal({
      accountName: "My HR Professionals",
      step: null,
      timing: null,
      lastTouch: { at: "2026-09-04T15:34:00Z", awaitingReply: true, who: "Joseph" },
      lastInbound: intel.lastInbound
        ? { at: intel.lastInbound, who: "Joseph", promise: intel.lastInboundPromise }
        : null,
      lastRecordAt: NOON,
      now: new Date("2026-09-04T21:00:00Z"),
    });
    assert.ok(!/^Answer Joseph/.test(read.move), `got: ${read.move}`);
  });
});

describe("a promise closes by delivery, and the record holds the landing", () => {
  const commitment = {
    text: "Send calendar invite for the Mon Sep 14 Global module overview · from 9/4 paste",
    at: NOON,
  };
  test("the invite promise is settled by their acceptance", () => {
    const s = settledByRecord(commitment, NOTES);
    assert.ok(s, "the record shows it landed");
    assert.equal(s!.why, "they accepted the invitation");
  });
  test("a non-scheduling promise is never auto-settled", () => {
    assert.equal(
      settledByRecord({ text: "Send the India pricing ballpark", at: NOON }, NOTES),
      null,
    );
  });
  test("a decline settles nothing — only an acceptance proves the booking", () => {
    const declined = NOTES.map((n) =>
      n.id === "n5" ? { ...n, body: n.body.replace("Accepted:", "Declined:") } : n,
    );
    assert.equal(settledByRecord(commitment, declined), null);
  });
  test("an OLDER acceptance never settles a promise made after it", () => {
    const older = [{ ...NOTES[0], createdAt: "2026-08-01T12:00:00.000Z" }];
    assert.equal(settledByRecord(commitment, older), null);
  });
  test("adversarial: no notes, junk notes, junk dates — no throw, no settle", () => {
    assert.equal(settledByRecord(commitment, []), null);
    assert.equal(settledByRecord({ text: "", at: "" }, NOTES), null);
    assert.equal(
      settledByRecord({ ...commitment, at: "garbage" }, NOTES),
      null,
    );
  });

  test("the register marks it LANDED and the stage stops instructing it", () => {
    const todos = [
      {
        id: "t1",
        body: "Send calendar invite for the Mon Sep 14 Global module overview · from 9/4 paste\n⚑[k:a]",
        done: false,
        accountId: "acct",
        remindAt: "2026-09-04T12:00:00.000Z",
        createdAt: NOON,
        updatedAt: NOON,
      },
    ];
    const sheet = buildAccountSheet(
      todos,
      "acct",
      new Set<string>(),
      new Map(),
      new Date("2026-09-04T21:00:00Z"),
      NOTES,
    );
    assert.equal(sheet.open.length, 1);
    assert.equal(sheet.open[0].settled, "they accepted the invitation");
    // The stage builds its move from unsettled commitments only.
    const read = readDeal({
      accountName: "My HR Professionals",
      step: null,
      timing: null,
      lastTouch: null,
      lastRecordAt: NOON,
      openOwed: sheet.open
        .filter((o) => !o.settled)
        .map((o) => ({ text: o.edit, wall: !!o.wall, due: o.due })),
      now: new Date("2026-09-04T21:00:00Z"),
    });
    assert.ok(!/calendar invite/i.test(read.move), `got: ${read.move}`);
  });

  test("adversarial: the settle is a claim the operator can refuse", () => {
    // Two meetings in flight is the known limit of this read: an acceptance
    // for one booking can mark a commitment about another as landed. That is
    // why nothing is hidden and nothing is written — the row says LANDED and
    // WHY, and the ✓ stays the operator's. The commitment survives untouched
    // in the store either way.
    const other = {
      text: "Send calendar invite for the December roadmap review",
      at: NOON,
    };
    const s = settledByRecord(other, NOTES);
    assert.ok(s, "it does settle — the read cannot tell two bookings apart");
    // But the commitment is never mutated and never removed from the sheet.
    const todos = [
      {
        id: "t3",
        body: `${other.text} · from 9/4 paste\n⚑[k:a]`,
        done: false,
        accountId: "acct",
        remindAt: NOON,
        createdAt: NOON,
        updatedAt: NOON,
      },
    ];
    const sheet = buildAccountSheet(
      todos,
      "acct",
      new Set<string>(),
      new Map(),
      new Date("2026-09-04T21:00:00Z"),
      NOTES,
    );
    assert.equal(sheet.open.length, 1, "it still shows on the register");
    assert.ok(sheet.open[0].settled, "labelled, not removed");
    // The stored body is byte-identical to what went in — nothing written.
    assert.equal(sheet.open[0].edit, `${other.text} · from 9/4 paste`);
  });

  test("an unsettled commitment still leads the row, exactly as before", () => {
    const todos = [
      {
        id: "t2",
        body: "Send the India pricing ballpark · from 9/4 paste\n⚑[k:a]",
        done: false,
        accountId: "acct",
        remindAt: NOON,
        createdAt: NOON,
        updatedAt: NOON,
      },
    ];
    const sheet = buildAccountSheet(
      todos,
      "acct",
      new Set<string>(),
      new Map(),
      new Date("2026-09-04T21:00:00Z"),
      NOTES,
    );
    assert.equal(sheet.open[0].settled, undefined);
  });
});
