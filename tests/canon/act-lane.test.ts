// Canon pins for the Act Lane (CLAUDE.md "The Act Lane" and the Ted
// doctrine's "Provenance is columns", rulings of 2026-09-25: D23/P3, C7).

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { actSendRow } from "../../src/lib/act/lane";
import { buildQueue, SEAT_SLOT_CAP } from "../../src/lib/groundwork/day";
import type { Peo } from "../../src/lib/book";

const peo = (id: string, name: string): Peo => ({
  id,
  name,
  cloud: "TST",
  csm: "Unassigned",
  contactName: "",
  contactEmail: "",
  size: 1000,
  sizeBucket: "Medium (1,000 - 4,999)",
  industry: "PEO/ASO",
  city: "",
  state: "",
  website: "",
  lastActivity: "",
  fit: 50,
  fitTier: "medium",
});

describe("every writer, the Act Lane included, fills actors and recipients at write (D23/P3)", () => {
  test("Send's row carries the operator as actor, the address as recipient, and no money", () => {
    const row = actSendRow({
      to: "pat@example.com",
      subject: "Re: the model, $12,000 a year",
    });
    assert.equal(row.actors, "Antaeus Coe → pat@example.com");
    assert.equal(row.recipients, "pat@example.com");
    assert.equal(row.lane, "mine");
    assert.equal(row.source, "act-lane");
    assert.ok(row.body.startsWith("✉ "), "a real ✉ outbound head");
    assert.equal(
      row.body.includes("12,000"),
      false,
      "the figure never reaches the record",
    );
    assert.ok(row.body.includes("pat@example.com"), "the send names its recipient");
  });

  test("a blank subject still files as a send, addressed", () => {
    const row = actSendRow({ to: "pat@example.com", subject: "" });
    assert.ok(row.body.startsWith("✉ Sent"));
    assert.equal(row.recipients, "pat@example.com");
    assert.equal(row.actors.endsWith("→ pat@example.com"), true);
  });
});

describe("seats keep their own cap (C7)", () => {
  test("a fourth seat sinks below the third — and below the next rule's own hit", () => {
    const ids = ["A1", "A2", "A3", "A4"];
    const wire = peo("W1", "Newsmaker");
    const { all } = buildQueue({
      accounts: [...ids.map((id, i) => peo(id, `Seat ${i + 1}`)), wire],
      intelById: new Map(),
      notesById: new Map(),
      touches: [],
      contactCountById: () => 5,
      wireAtById: new Map([[wire.id, "2026-08-20T12:00:00Z"]]),
      seats: new Map(
        ids.map((id, i) => [id, { act: `Move ${i + 1}.`, term: "T", day: "2026-08-21" }]),
      ),
      now: new Date("2026-08-21T15:00:00Z"),
    });
    const seatedPositions = all
      .map((q, i) => (q.ruleId === "seated" ? i : -1))
      .filter((i) => i >= 0);
    // Three seats lead in a block; the fourth sits after the wire hit.
    assert.deepEqual(seatedPositions.slice(0, SEAT_SLOT_CAP), [0, 1, 2]);
    assert.equal(all[SEAT_SLOT_CAP].ruleId, "wire-trigger");
    assert.equal(seatedPositions[SEAT_SLOT_CAP], SEAT_SLOT_CAP + 1);
  });
});
