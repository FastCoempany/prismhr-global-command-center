import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { matchAccountIn } from "@/lib/ask/live";

// The question-to-account matcher behind the live read. Squashed containment
// for real names, word boundaries for short ones, longest name wins, and no
// firing on nothing.

const BOOK = [
  { id: "XCEL", name: "XCEL HR" },
  { id: "ESC", name: "ESC" },
  { id: "STAFF", name: "Staff Leasing Of Central New York, Inc." },
  { id: "INF", name: "Infiniti HR" },
];

describe("matchAccountIn — the question names the account, however it's typed", () => {
  test("squashed spellings match: 'xcelhr' finds XCEL HR", () => {
    assert.equal(
      matchAccountIn("what am i waiting on bill for at xcelhr?", BOOK)?.id,
      "XCEL",
    );
    assert.equal(matchAccountIn("latest on XCEL HR please", BOOK)?.id, "XCEL");
  });
  test("short names only fire on a word boundary — 'escalate' is not ESC", () => {
    assert.equal(
      matchAccountIn("should we escalate the infiniti hr thread?", BOOK)?.id,
      "INF",
    );
    assert.equal(matchAccountIn("what happened with esc?", BOOK)?.id, "ESC");
  });
  test("the longest matching name wins", () => {
    assert.equal(
      matchAccountIn("update on staff leasing of central new york", BOOK)?.id,
      "STAFF",
    );
  });
  test("no account named, no match", () => {
    assert.equal(matchAccountIn("what should i send russ this week?", BOOK), null);
    assert.equal(matchAccountIn("", BOOK), null);
  });
});
