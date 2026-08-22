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
