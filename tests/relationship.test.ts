// The relationship read: the record outranks the book. Born 2026-08-13, the
// day the room told the operator to chase Ted — a man the record had never
// once seen — because the export seeded him as primary contact.

import { test } from "node:test";
import assert from "node:assert/strict";
import { relationshipFor } from "../src/lib/intel/relationship";
import type { NoteForPeople, ContactForPeople } from "../src/lib/intel/people";

const note = (
  actors: string,
  lane: "mine" | "background" = "mine",
  createdAt = "2026-08-12T20:00:00Z",
): NoteForPeople => ({ actors, lane, body: "☎ CT — demo · x", createdAt });

const roster: ContactForPeople[] = [
  { first: "Bill", last: "Laffey", title: "VP, Operations", email: "bill.laffey@xcelhr.com" },
  { first: "Ted", last: "Bross", title: "CEO", email: "ted.bross@xcelhr.com" },
];

const BOOK = { name: "Ted Bross", email: "ted.bross@xcelhr.com" };

test("an empty record falls back to the book seed", () => {
  const r = relationshipFor([], roster, BOOK);
  assert.equal(r.source, "book");
  assert.equal(r.name, "Ted Bross");
  assert.equal(r.email, "ted.bross@xcelhr.com");
});

test("the record's most-seen person outranks the book primary", () => {
  const notes = [
    note("Antaeus Coe → Bill Laffey +6"),
    note("Antaeus Coe → Bill Laffey"),
  ];
  const r = relationshipFor(notes, roster, BOOK);
  assert.equal(r.source, "record");
  assert.equal(r.name, "Bill Laffey");
  assert.equal(r.email, "bill.laffey@xcelhr.com");
});

test("a roster-matched person beats a more-seen outside colleague", () => {
  // Shane demos on every call — but he is not at the account, and the roster
  // proves it. Bill carries the relationship.
  const notes = [
    note("Shane Jacobs → Bill Laffey"),
    note("Shane Jacobs → Helen Niemcewicz"),
    note("Antaeus Coe → Bill Laffey"),
  ];
  const r = relationshipFor(notes, roster, BOOK);
  assert.equal(r.name, "Bill Laffey");
  assert.equal(r.source, "record");
});

test("background-only traffic loses to the operator's own threads", () => {
  const notes = [
    note("Sharon Murray → CustomerCare", "background"),
    note("Sharon Murray → CustomerCare", "background"),
    note("Antaeus Coe → Bill Laffey"),
  ];
  const r = relationshipFor(notes, roster, BOOK);
  assert.equal(r.name, "Bill Laffey");
});

test("a record with only background people still beats an absent book seed", () => {
  const notes = [note("Sharon Murray → CustomerCare", "background")];
  const r = relationshipFor(notes, roster, { name: "", email: "" });
  assert.equal(r.source, "record");
  assert.equal(r.name, "Sharon Murray");
});

test("an empty record and empty book stays honestly empty", () => {
  const r = relationshipFor([], [], {});
  assert.equal(r.source, "book");
  assert.equal(r.name, "");
  assert.equal(r.email, "");
});
