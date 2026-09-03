import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readLoss } from "@/lib/room/loss";
import { owedByThem, owedKey, owedToMe } from "@/lib/room/owed";

// ADVERSARIAL — the two judgment mechanisms. The loss read must fire on real
// loss language (Bryce's actual sentence) and stay silent on negations and
// near-misses; owed-to-you must find the operator's name and nobody else's.

const now = new Date("2026-07-29T16:00:00Z");
const note = (id: string, body: string, at = "2026-07-28T12:00:00Z", actors = "") => ({
  id,
  body,
  createdAt: at,
  actors,
});
const none = new Set<string>();

describe("readLoss — fires on the real thing, never on fear of it", () => {
  test("Bryce's actual sentence triggers the read", () => {
    const r = readLoss(
      [
        note(
          "n1",
          "✉ OL Jul 28 — Re: Bulgaria · Bryce Rowley → Antaeus Coe\nThe client found another solution. The 7-day delay cost us the deal.",
        ),
      ],
      none,
      now,
    );
    assert.ok(r);
    assert.equal(r?.noteId, "n1");
    assert.ok(/found another solution/i.test(r?.phrase ?? ""));
  });
  test("the operator's own verdict triggers the read — the ESC note", () => {
    const r = readLoss(
      [
        note(
          "esc",
          "✎ ESC is an MPEX deal which is handled solely by Russ and his team. Close lost it",
        ),
      ],
      none,
      now,
    );
    assert.ok(r);
    assert.equal(r?.status, "lost");
    assert.ok(/close lost/i.test(r?.phrase ?? ""));
  });
  test("more operator verdict spellings trigger", () => {
    for (const body of ["Mark it lost — Russ owns this one.", "Closed-lost. Not ours."]) {
      assert.ok(readLoss([note("n", body)], none, now), body);
    }
  });
  test("negations and near-misses stay silent", () => {
    for (const body of [
      "Let's move fast so we don't lose the deal to the deposit issue.",
      "We almost lost this one — the save was the entity answer.",
      "At risk of losing the deal if the contract slips again.",
      "Make sure we don't end up going in a different direction here.",
    ]) {
      assert.equal(readLoss([note("n", body)], none, now), null, body);
    }
  });
  test("a dismissed read stays down; NEW evidence resurfaces", () => {
    const notes = [
      note("new", "They went with another provider for payroll.", "2026-07-29T10:00:00Z"),
      note("old", "The client found another solution.", "2026-07-27T10:00:00Z"),
    ];
    const dismissedOld = readLoss(notes, new Set(["new"]), now);
    assert.equal(dismissedOld?.noteId, "old");
    assert.equal(readLoss(notes, new Set(["new", "old"]), now), null);
  });
  test("stale loss talk (31 days old) never triggers", () => {
    assert.equal(
      readLoss([note("n", "lost the deal", "2026-06-01T10:00:00Z")], none, now),
      null,
    );
  });
});

describe("owedToMe — my name opens work; everyone else's stays history", () => {
  test("the cleaner's Owed line: mine surfaces, Lucas's does not", () => {
    const out = owedToMe(
      [
        note(
          "n1",
          "Prefers SmartPay. Owed: SmartPay follow-up — @Lucas. Owed: coordinate the post-mortem — @Antaeus.",
        ),
      ],
      none,
      [],
      now,
    );
    assert.equal(out.length, 1);
    assert.ok(/post-mortem/.test(out[0].text));
  });
  test("a direct inbound ask becomes a suggestion, with the asker named", () => {
    const out = owedToMe(
      [
        note(
          "n2",
          "✉ OL Jul 29 — Re: Bulgaria · Russell Jones → Antaeus Coe\nWill you please coordinate an internal post mortem call - 20 minutes.",
          "2026-07-29T10:00:00Z",
          "Russell Jones → Antaeus Coe +2",
        ),
      ],
      none,
      [],
      now,
    );
    assert.equal(out.length, 1);
    assert.ok(/coordinate an internal post mortem/.test(out[0].text), out[0].text);
    assert.ok(/Russell/.test(out[0].src));
  });
  test("my own outbound asks never boomerang into suggestions", () => {
    const out = owedToMe(
      [
        note(
          "n3",
          "Could you send over the entity list when you have it?",
          "2026-07-29T10:00:00Z",
          "Antaeus Coe → Bryce Rowley",
        ),
      ],
      none,
      [],
      now,
    );
    assert.equal(out.length, 0);
  });
  test("dismissals hold and already-open work never re-suggests", () => {
    const notes = [note("n4", "Owed: chase the signature — @Antaeus.")];
    const key = owedKey("n4", "chase the signature");
    assert.equal(owedToMe(notes, new Set([key]), [], now).length, 0);
    assert.equal(owedToMe(notes, none, ["Chase the signature today"], now).length, 0);
  });
  test("caps hold and junk never throws", () => {
    const flood = Array.from({ length: 20 }, (_, i) =>
      note(`x${i}`, `Owed: thing number ${i} with enough words — @Antaeus.`),
    );
    flood.push(note("bad", null as unknown as string));
    const out = owedToMe(flood, none, [], now);
    assert.ok(out.length <= 3);
  });
});

describe("owedByThem — the client's side of the Owed line (the Simploy call)", () => {
  test("the real Simploy line: her segment reads, his does not", () => {
    // Verbatim shape from the 9/2 call entry — one line, both sides, split
    // on the semicolon.
    const out = owedByThem(
      [
        note(
          "s1",
          "Suspected month-to-month; client shared its GP invoices. Owed: invoices + EOR confirm — @Chassie; agreements, question list, India ballpark — @Antaeus.",
        ),
      ],
      now,
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].who, "Chassie");
    assert.equal(out[0].text, "invoices + EOR confirm");
  });
  test("a mine-only Owed line yields nothing", () => {
    const out = owedByThem([note("s2", "Owed: send the recap — @Antaeus.")], now);
    assert.equal(out.length, 0);
  });
  test("adversarial: free text with a stray semicolon fabricates no debt", () => {
    const out = owedByThem(
      [
        note(
          "s3",
          "Prefers SmartPay; eComp takes BoR — friction. No urgency; slow and steady.",
        ),
      ],
      now,
    );
    assert.equal(out.length, 0);
  });
  test("adversarial: a trailing sentence with a dash fabricates no owner", () => {
    const out = owedByThem(
      [note("s7", "Owed: invoices — @Chassie. Some other sentence — with a dash.")],
      now,
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].text, "invoices");
    assert.equal(out[0].who, "Chassie");
  });
  test("adversarial: stale notes and junk never read or throw", () => {
    const out = owedByThem(
      [
        note("s4", "Owed: the census file — @Dana.", "2026-06-01T10:00:00Z"),
        note("s5", null as unknown as string),
        { id: "s6", body: "Owed: x — @Dana.", createdAt: "garbage" },
      ],
      now,
    );
    assert.equal(out.length, 0);
  });
});
