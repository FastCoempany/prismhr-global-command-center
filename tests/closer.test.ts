// The closer rule (founder-decreed 2026-08-22): a courtesy sign-off is
// transparent — it never opens a reply-owed and never closes a promise.
// State derives from the last substantive message. The acceptance case is
// the Lesha/Simploy thread: her trailing "No problem! 🙂" must not mint
// "Answer Lesha", and an overdue paste-opened promise reads PROMISED.

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { isCloser } from "../src/lib/intel/closer";
import { corpusFor, extractDealIntel } from "../src/lib/intel/extract";
import { buildAccountSheet } from "../src/lib/room/sheet-view";
import { NO_TAGS, withTags } from "../src/lib/today/route-notes";

describe("the closer classifier", () => {
  test("sign-offs are closers", () => {
    for (const s of [
      "No problem! 🙂",
      "no worries",
      "Thanks!",
      "thank you so much",
      "Sounds good",
      "👍",
      "🙂",
      "ok great thanks",
      "You bet",
      "Perfect",
      "will do",
      "Anytime!",
    ])
      assert.equal(isCloser(s), true, `"${s}" should read as a closer`);
  });

  test("content is never a closer", () => {
    for (const s of [
      "Can you send the model?",
      "Thanks — can you also send pricing?",
      "Perfect. She is expecting your call.",
      "No problem is precipitated by this request",
      "Thanks Lesha for the update!",
      "ok, sending it Friday",
      "sounds good, see you at 3",
      "",
    ])
      assert.equal(isCloser(s), false, `"${s}" should NOT read as a closer`);
  });
});

describe("closers are transparent in the ledger", () => {
  let seq = 0;
  const note = (body: string, actors: string, createdAt: string) => ({
    id: `n${++seq}`,
    kind: "account",
    body,
    actors,
    createdAt,
  });

  test("a trailing 'No problem!' never becomes the last inbound", () => {
    // The Lesha thread, in filing order: her substantive message, the
    // operator's reply, her courtesy close.
    const docs = corpusFor("SIMPLOY01", "Simploy", {
      acctNotes: [
        note(
          "✉ TM Today 1:49 PM — Chassie owes you information · Lesha Cyphers → Antaeus Coe\nHey. I just talked to Chassie at Simploy. She owes you some information and will be in touch.",
          "Lesha Cyphers → Antaeus Coe",
          "2026-08-22T18:49:00Z",
        ),
        note(
          "✉ TM Today 1:50 PM — fantastic to hear · Antaeus Coe → Lesha Cyphers\nfantastic to hear. Thanks Lesha for the update!",
          "Antaeus Coe → Lesha Cyphers",
          "2026-08-22T18:50:00Z",
        ),
        note(
          "✉ TM Today 1:50 PM — No problem! · Lesha Cyphers → Antaeus Coe\nNo problem! 🙂",
          "Lesha Cyphers → Antaeus Coe",
          "2026-08-22T18:51:00Z",
        ),
      ],
    });
    const intel = extractDealIntel(docs);
    // The closer read through: the newest inbound is the SUBSTANTIVE 1:49
    // message, which the operator's 1:50 reply already answered — so no
    // surface derives "Answer Lesha" from this thread.
    assert.equal(intel.lastInbound, "2026-08-22T18:49:00Z");
    assert.ok(intel.lastOutbound > intel.lastInbound, "the reply postdates it");
  });

  test("a substantive inbound still counts — transparency is not deafness", () => {
    const docs = corpusFor("SIMPLOY01", "Simploy", {
      acctNotes: [
        note(
          "✉ TM Today 2:10 PM — Can you send the Canada model? · Chassie Smith → Antaeus Coe\nCan you send the Canada model this week?",
          "Chassie Smith → Antaeus Coe",
          "2026-08-22T19:10:00Z",
        ),
      ],
    });
    const intel = extractDealIntel(docs);
    assert.equal(intel.lastInbound, "2026-08-22T19:10:00Z");
    assert.equal(intel.lastInboundWho, "Chassie Smith");
  });
});

describe("their promise is an await, never a reply owed", () => {
  const NOW = new Date("2026-08-22T17:00:00Z");
  const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();
  const base = {
    accountName: "Simploy",
    step: null,
    timing: null,
    lastTouch: { at: ago(17), awaitingReply: true, who: "Chassie" },
    lastRecordAt: ago(1),
    now: NOW,
  };

  test("the Lesha relay holds an await instead of demanding an answer", async () => {
    const { readDeal } = await import("../src/lib/room/engine");
    const r = readDeal({
      ...base,
      lastInbound: { at: ago(1), who: "Lesha", promise: true },
    });
    assert.match(r.move, /^Hold for their follow-up\. Promised yesterday\.$/);
    assert.ok(!/Answer/.test(r.move));
  });

  test("a week of silence turns the await into the chase", async () => {
    const { readDeal } = await import("../src/lib/room/engine");
    const r = readDeal({
      ...base,
      lastInbound: { at: ago(8), who: "Lesha", promise: true },
    });
    assert.match(r.move, /^Chase the follow-up\. Promised 8 days ago\.$/);
  });

  test("a real ask still demands the answer", async () => {
    const { readDeal } = await import("../src/lib/room/engine");
    const r = readDeal({
      ...base,
      lastInbound: { at: ago(1), who: "Chassie", promise: false },
    });
    assert.match(r.move, /^Answer Chassie\. They wrote yesterday\.$/);
  });

  test("the live Simploy entry reads as their promise", async () => {
    const { corpusFor, extractDealIntel } = await import("../src/lib/intel/extract");
    const docs = corpusFor("SIMPLOY01", "Simploy", {
      acctNotes: [
        {
          id: "n9",
          kind: "account",
          body: "☎ SF Yesterday 1:49 PM — Teams chat — Simploy moving forward with reseller option · Lesha Cyphers → Antaeus Coe\nLesha: just spoke with Chassie at Simploy — they are planning to move forward with the reseller option for global. Chassie still owes Antaeus some information and will be in touch.",
          actors: "Lesha Cyphers → Antaeus Coe",
          createdAt: "2026-08-21T12:00:00Z",
        },
      ],
    });
    const intel = extractDealIntel(docs);
    assert.equal(intel.lastInboundPromise, true);
  });
});

describe("an overdue paste-opened promise reads PROMISED", () => {
  const now = new Date("2026-08-22T18:00:00Z");
  const todo = (body: string, date: string) => ({
    id: "t1",
    body: withTags(body, { ...NO_TAGS, kind: "action", date }),
    done: false,
    accountId: "SIMPLOY01",
    remindAt: "",
    createdAt: "2026-08-20T12:00:00Z",
    updatedAt: "2026-08-20T12:00:00Z",
  });

  test("the wall chip carries the promise when the row came from a paste", () => {
    const sheet = buildAccountSheet(
      [todo("Send Chassie the information · from 8/20 paste", "2026-08-21")],
      "SIMPLOY01",
      new Set(),
      new Map(),
      now,
    );
    assert.equal(sheet.open.length, 1);
    assert.equal(sheet.open[0].wall, "8/21");
    assert.equal(sheet.open[0].promised, true);
  });

  test("a hand-typed dated action keeps the plain wall", () => {
    const sheet = buildAccountSheet(
      [todo("Book the demo", "2026-08-21")],
      "SIMPLOY01",
      new Set(),
      new Map(),
      now,
    );
    assert.equal(sheet.open[0].wall, "8/21");
    assert.equal(sheet.open[0].promised, undefined);
  });
});

// ── the stage carries an obligation, never a curiosity (2026-08-29) ─────────
// Founder-decreed: the Next Move answers "what do we owe them, or they us" —
// a meeting, a document, a reply. A board gate is a thing we do not know yet,
// and it already rides the UNKNOWN register; the stage printing it verbatim
// said the same line twice and told the operator nothing was owed when
// something was.

const base = {
  accountName: "Infiniti HR",
  timing: null,
  lastTouch: null,
  lastRecordAt: "2026-08-27T12:00:00Z",
  now: new Date("2026-08-29T15:00:00Z"),
};

const GATE = {
  nodeKey: "needs",
  nodeLabel: "Needs analysis",
  item: "How they pay those workers today (method + any current provider)",
  ageDays: 2,
};

test("an open obligation outranks the board's open gate", async () => {
  const { readDeal } = await import("../src/lib/room/engine");
  const r = readDeal({
    ...base,
    step: GATE,
    openOwed: [{ text: "Send the calendar invite once they pick one of the Sep 2–4 windows." }],
  });
  assert.equal(r.move, "Send the calendar invite once they pick one of the Sep 2–4 windows.");
  assert.equal(/How they pay those workers/.test(r.move), false);
});

test("with nothing owed, the gate is named as a place to look, never as the move", async () => {
  const { readDeal } = await import("../src/lib/room/engine");
  const r = readDeal({ ...base, step: GATE, openOwed: [] });
  assert.equal(r.move, "Nothing owed either way. The open gates are in UNKNOWN.");
  // The register's own line is never reprinted on the stage.
  assert.equal(/How they pay those workers/.test(r.move), false);
  assert.equal(/asks nothing else/.test(r.move), false);
});

test("a gate still speaks when someone is LATE on it — that is an obligation", async () => {
  const { readDeal } = await import("../src/lib/room/engine");
  const r = readDeal({
    ...base,
    step: GATE,
    lastTouch: { at: "2026-08-20T12:00:00Z", awaitingReply: true, who: "Javier" },
    openOwed: [],
  });
  assert.match(r.move, /^Chase Javier on “how they pay those workers today/);
  assert.match(r.move, /Quiet 9 days\./);
});

test("a reply owed still outranks everything — the court comes first", async () => {
  const { readDeal } = await import("../src/lib/room/engine");
  const r = readDeal({
    ...base,
    step: GATE,
    lastInbound: { at: "2026-08-28T12:00:00Z", who: "Javier" },
    openOwed: [{ text: "Send the calendar invite." }],
  });
  assert.match(r.move, /^Answer Javier\./);
});

test("a long obligation is trimmed to one sentence the stage can carry", async () => {
  const { readDeal } = await import("../src/lib/room/engine");
  const r = readDeal({
    ...base,
    step: GATE,
    openOwed: [
      {
        text: "Send Javier the agreements and the client-information list. He asked for both on the call and Jennifer repeated the ask before the close.",
      },
    ],
  });
  assert.equal(
    r.move,
    "Send Javier the agreements and the client-information list.",
  );
});

test("the stage carries the commitment, not its fallback or its provenance", async () => {
  const { readDeal } = await import("../src/lib/room/engine");
  const { actionBody } = await import("../src/lib/room/deliverables");
  const body = actionBody(
    "Send the calendar invite once they pick one of the Sep 2–4 windows",
    "if no window is chosen, follow up Tuesday so it still lands that week",
    "from 8/29 paste",
  );
  const r = readDeal({ ...base, step: GATE, openOwed: [{ text: body }] });
  assert.equal(
    r.move,
    "Send the calendar invite once they pick one of the Sep 2–4 windows.",
  );
  // The contingency surfaces when the wall blows, never on arrival.
  assert.equal(/↯/.test(r.move), false);
  assert.equal(/follow up Tuesday/.test(r.move), false);
  // Provenance is a citation, not the thing owed.
  assert.equal(/from 8\/29 paste/.test(r.move), false);
  // And it never ellipses a sentence that fits.
  assert.equal(/…/.test(r.move), false);
});
