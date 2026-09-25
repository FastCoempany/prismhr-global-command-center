// Canon pins for the Groundwork face (CLAUDE.md "Groundwork face", the
// rulings of 2026-09-25: C6, C7, C8, C9, D22, D26, D27). Every test drives a
// pure builder with an input and asserts what comes back — never a string in
// a source file.

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
  bandAt,
  buildQueue,
  currentBand,
  QUEUE_RULE_IDS,
  RULE_SLOT_CAP,
  SEAT_SLOT_CAP,
} from "../../src/lib/groundwork/day";
import { stampSubtext } from "../../src/lib/groundwork/stamp";
import type { Peo } from "../../src/lib/book";
import type { DealIntel } from "../../src/lib/intel/types";

const NOW = new Date("2026-07-30T15:00:00Z"); // 10:00a Chicago, a Thursday
// A quarter past the book sweep — the book-wide research stamp is stale.
const STALE_BOOK = new Date("2026-10-15T15:00:00Z");

const acct = (over: Partial<Peo>): Peo => ({
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
  fit: 95,
  fitTier: "high",
  ...over,
});

// Two real book ids whose demand clears the gate: the first is the stronger.
const STRONG = "001F000000w38ItIAI";
const WEAKER = "001F000000w38OIIAY";

const plainNote = { body: "note", source: "room", createdAt: "2026-07-29T12:00:00Z" };
const wireHit = "2026-07-29T12:00:00Z";
const seatOf = (act: string) => ({ act, term: "T", day: "2026-08-21" });

const base = {
  intelById: new Map<string, DealIntel>(),
  notesById: new Map<string, (typeof plainNote)[]>(),
  touches: [],
  contactCountById: () => 5,
  now: NOW,
};

describe("the two-slot cap governs rules; seats keep their own cap of three (C6/C7)", () => {
  test("four seats: SEAT_SLOT_CAP lead, the fourth sinks below the next rule's hit", () => {
    const seatsIds = [
      "S0000000000000001",
      "S0000000000000002",
      "S0000000000000003",
      "S0000000000000004",
    ];
    const wire = acct({ id: "W0000000000000001", name: "Newsmaker" });
    const { all } = buildQueue({
      ...base,
      accounts: [...seatsIds.map((id, i) => acct({ id, name: `Seat ${i + 1}` })), wire],
      wireAtById: new Map([[wire.id, wireHit]]),
      seats: new Map(seatsIds.map((id, i) => [id, seatOf(`Move ${i + 1}.`)])),
    });
    const leading = all.slice(0, SEAT_SLOT_CAP);
    assert.ok(
      leading.every((q) => q.ruleId === "seated"),
      "the seats lead",
    );
    // The fourth seat sinks below the wire hit; it is kept, never dropped.
    assert.equal(all[SEAT_SLOT_CAP].ruleId, "wire-trigger");
    assert.equal(all[SEAT_SLOT_CAP + 1].ruleId, "seated");
    assert.equal(all.filter((q) => q.ruleId === "seated").length, 4);
  });

  test("three hits of one rule: RULE_SLOT_CAP lead, the third sinks below another rule", () => {
    const wires = ["W0000000000000001", "W0000000000000002", "W0000000000000003"].map(
      (id, i) => acct({ id, name: `News ${i + 1}` }),
    );
    const warm = acct({ id: "I0000000000000001", name: "Warm" });
    const { all } = buildQueue({
      ...base,
      accounts: [...wires, warm],
      notesById: new Map([
        [
          warm.id,
          [
            {
              body: "high buyer intent",
              source: "salesnav-ai",
              createdAt: "2026-07-29T12:00:00Z",
            },
          ],
        ],
      ]),
      wireAtById: new Map(wires.map((w) => [w.id, wireHit])),
    });
    const leadingWires = all.slice(0, RULE_SLOT_CAP);
    assert.ok(leadingWires.every((q) => q.ruleId === "wire-trigger"));
    assert.equal(all[RULE_SLOT_CAP].ruleId, "intent-warm");
    assert.equal(all[RULE_SLOT_CAP + 1].ruleId, "wire-trigger");
  });
});

describe("a seat follows its account (E6 + C8): an excluded account's seat leaves Groundwork", () => {
  test("a seat whose account is in excludedIds never seats", () => {
    const gone = acct({ id: "X0000000000000001", name: "Closing Deal" });
    const stays = acct({ id: "X0000000000000002", name: "Prospect" });
    const { all } = buildQueue({
      ...base,
      accounts: [gone, stays],
      seats: new Map([
        [gone.id, seatOf("Ask Russ about the follow-up.")],
        [stays.id, seatOf("Send the model.")],
      ]),
      excludedIds: new Set([gone.id]),
    });
    assert.equal(
      all.some((q) => q.accountId === gone.id),
      false,
      "nothing stages for the excluded account",
    );
    assert.equal(
      all
        .filter((q) => q.ruleId === "seated")
        .map((q) => q.accountId)
        .join(),
      stays.id,
    );
  });
});

// The fixture's accounts are on the platform and high-fit, so an account
// with no record fires never-touched-incumbent on its own. A plain note
// silences that; the contact count then decides whether the account is FREE
// (five names, no rule fires) or BUSY (one name: stakeholder-gap, 55 — weaker
// than either vehicle, so a collision would swallow it).
const busyIds = new Set<string>();
const withNote = (...ids: string[]) => new Map(ids.map((id) => [id, [plainNote]]));
const contacts = (id: string) => (busyIds.has(id) ? 1 : 5);

describe("a vehicle never collides (D22)", () => {
  test("the research stamp drops for the day when every eligible account has its own move", () => {
    busyIds.clear();
    busyIds.add(STRONG).add(WEAKER);
    const { all } = buildQueue({
      ...base,
      now: STALE_BOOK,
      contactCountById: contacts,
      notesById: withNote(STRONG, WEAKER),
      accounts: [
        acct({ id: STRONG, name: "Big Demand" }),
        acct({ id: WEAKER, name: "Also Demand" }),
      ],
    });
    assert.equal(
      all.some((q) => q.action === "Run the research pass."),
      false,
      "no research vehicle rides an occupied account",
    );
    assert.deepEqual(
      all.map((q) => q.ruleId),
      ["stakeholder-gap", "stakeholder-gap"],
    );
  });

  test("the roundup slot rides the one free account on the roster, never an occupied one", () => {
    const busy = acct({ id: "R0000000000000001", name: "Busy", csm: "Kim Bartolotti" });
    const free = acct({ id: "R0000000000000002", name: "Free", csm: "Kim Bartolotti" });
    busyIds.clear();
    busyIds.add(busy.id);
    const { all } = buildQueue({
      ...base,
      contactCountById: contacts,
      notesById: withNote(busy.id, free.id),
      accounts: [busy, free],
    });
    const slot = all.find((q) => q.ruleId === "roundup-slot");
    assert.equal(slot?.accountId, free.id);
    assert.equal(all.find((q) => q.accountId === busy.id)?.ruleId, "stakeholder-gap");
  });

  test("the roundup slot drops for the day when the whole roster is occupied", () => {
    const busy = acct({ id: "R0000000000000001", name: "Busy", csm: "Kim Bartolotti" });
    busyIds.clear();
    busyIds.add(busy.id);
    const { all } = buildQueue({
      ...base,
      contactCountById: contacts,
      notesById: withNote(busy.id),
      accounts: [busy],
    });
    assert.equal(
      all.some((q) => q.ruleId === "roundup-slot"),
      false,
    );
    assert.deepEqual(
      all.map((q) => q.ruleId),
      ["stakeholder-gap"],
    );
  });

  test("a seated account is never the research bearer — the bearer is chosen after the seats", () => {
    busyIds.clear();
    const { all } = buildQueue({
      ...base,
      now: STALE_BOOK,
      contactCountById: contacts,
      notesById: withNote(STRONG, WEAKER),
      accounts: [
        acct({ id: STRONG, name: "Big Demand" }),
        acct({ id: WEAKER, name: "Also Demand" }),
      ],
      seats: new Map([[STRONG, seatOf("Ask Russ about the follow-up.")]]),
    });
    const research = all.find((q) => q.action === "Run the research pass.");
    assert.equal(research?.accountId, WEAKER, "the stamp rides the free account");
    assert.equal(all.find((q) => q.accountId === STRONG)?.ruleId, "seated");
  });
});

describe("the research bearer is the strongest above-gate account with no candidate of its own (C9)", () => {
  test("the strongest account has its own move; the stamp rides the weaker free one", () => {
    busyIds.clear();
    busyIds.add(STRONG);
    const { all } = buildQueue({
      ...base,
      now: STALE_BOOK,
      contactCountById: contacts,
      notesById: withNote(STRONG, WEAKER),
      accounts: [
        acct({ id: STRONG, name: "Big Demand" }),
        acct({ id: WEAKER, name: "Also Demand" }),
      ],
    });
    const research = all.filter((q) => q.action === "Run the research pass.");
    assert.equal(research.length, 1, "one move for the whole book");
    assert.equal(research[0].accountId, WEAKER);
    assert.equal(all.find((q) => q.accountId === STRONG)?.ruleId, "stakeholder-gap");
  });

  test("with every bearer free, the strongest carries it", () => {
    busyIds.clear();
    const { all } = buildQueue({
      ...base,
      now: STALE_BOOK,
      contactCountById: contacts,
      notesById: withNote(STRONG, WEAKER),
      accounts: [
        acct({ id: WEAKER, name: "Also Demand" }),
        acct({ id: STRONG, name: "Big Demand" }),
      ],
    });
    const research = all.filter((q) => q.action === "Run the research pass.");
    assert.equal(research.length, 1);
    assert.equal(research[0].accountId, STRONG);
  });
});

describe("one band table (D26): sends 9–11, people 11–14, research from 14, Chicago", () => {
  test("8:00 Chicago is not the live send band; 10:00 is sends; 12:30 is people; 15:00 is research", () => {
    // 2026-07-30 is CDT (UTC-5).
    assert.equal(currentBand(new Date("2026-07-30T13:00:00Z")), null); // 8:00a CT
    assert.equal(currentBand(new Date("2026-07-30T15:00:00Z")), "now"); // 10:00a CT
    assert.equal(currentBand(new Date("2026-07-30T17:30:00Z")), "eleven"); // 12:30p CT
    assert.equal(currentBand(new Date("2026-07-30T20:00:00Z")), "two"); // 3:00p CT
  });

  test("the band edges, minute by minute", () => {
    assert.equal(bandAt(8 * 60 + 59), null);
    assert.equal(bandAt(9 * 60), "now");
    assert.equal(bandAt(10 * 60 + 59), "now");
    assert.equal(bandAt(11 * 60), "eleven");
    assert.equal(bandAt(13 * 60 + 59), "eleven");
    assert.equal(bandAt(14 * 60), "two");
    // Research and filing runs from 14:00 on — the evening is still that band.
    assert.equal(bandAt(18 * 60), "two");
  });

  test("winter time reads the same wall clock (CST)", () => {
    // 2026-01-15 is CST (UTC-6): 8:30a CT is 14:30Z, 9:30a CT is 15:30Z.
    assert.equal(currentBand(new Date("2026-01-15T14:30:00Z")), null);
    assert.equal(currentBand(new Date("2026-01-15T15:30:00Z")), "now");
  });
});

describe("no rule stamps with an empty label (D27)", () => {
  test("every rule the queue can fire has a non-empty subtext with nothing specific to say", () => {
    for (const id of QUEUE_RULE_IDS) {
      const sub = stampSubtext(id, {});
      assert.ok(sub.trim().length > 0, `${id} stamps mutely`);
    }
  });

  test("the three once-silent rules speak: seated with its day, the gem with its term, engaged as never met", () => {
    assert.equal(stampSubtext("seated", { seatDay: "2026-08-20" }), "SEATED · 8/20");
    assert.equal(
      stampSubtext("second-record-gem", { gemTerm: "phr stall" }),
      "THEIRS · PHR STALL",
    );
    assert.equal(stampSubtext("engaged-never-introduced", {}), "ENGAGED · NEVER MET");
  });

  test("a rule the table does not know still speaks its own label", () => {
    assert.equal(stampSubtext("some-new-rule", {}), "SOME NEW RULE");
    assert.ok(stampSubtext("", {}).length > 0);
  });
});
