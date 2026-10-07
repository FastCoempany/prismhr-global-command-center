import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { extractDealIntel } from "@/lib/intel/extract";
import { readRows } from "./helpers/account-read";

// corpusFor and dealIntelFor retired with their last caller (pass 8
// housekeeping); the account read (src/lib/record/read.ts) assembles the docs
// and extracts the intel now, so these pins read it.
describe("the read's docs", () => {
  test("assembles every store, tags SF activities, sorts newest first", () => {
    const { docs } = readRows(
      { id: "X1", name: "Acme" },
      [
        {
          id: "1",
          body: "✉ SF Jul 21 3:47 PM — Re: demo · Russ Jones → Rachael Brown\nbody",
          createdAt: "2026-07-21T20:00:00Z",
          kind: "account",
        },
        {
          id: "2",
          body: "plain note about Canada",
          createdAt: "2026-07-24T20:00:00Z",
          kind: "mine",
        },
      ],
      {
        homeSide: [],
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
          {
            subjectKey: "acct:X1",
            label: "Acme",
            contactedAt: "2026-07-19T00:00:00Z",
            message: "outreach text",
            log: [{ at: "2026-07-18T00:00:00Z", body: "Reply received ✓" }],
          },
        ],
      },
    );
    assert.equal(docs[0].text, "send cal invite"); // newest first
    const sf = docs.find((d) => d.src.startsWith("sf-activity"));
    assert.ok(sf);
    assert.deepEqual(sf!.people, ["Russ Jones", "Rachael Brown"]);
    assert.ok(docs.some((d) => d.src.startsWith("touch ")));
    assert.ok(docs.some((d) => d.src.startsWith("touch-log")));
  });
});

describe("extractDealIntel", () => {
  test("golden: Advocate digest + fresh notes", () => {
    // The read joins the digest by id, as readFromStores does.
    const { intel } = readRows(
      { id: "ADVOCATEPAY000001", name: "Advocate Pay — SubcontractorHub" },
      [
        {
          id: "n1",
          body: "✉ SF 7/26 — Re: Side bar · Bryce Rowley → Antaeus Coe\nreferral agreement redlines back, targeting signature this week",
          createdAt: "2026-07-26T20:00:00Z",
          kind: "account",
        },
      ],
      { homeSide: [] },
    );
    const codes = intel.countries.map((c) => c.value);
    for (const c of ["bg", "in", "ph", "mx", "za", "gb"]) assert.ok(codes.includes(c), c);
    const prods = intel.products.map((p) => p.value);
    for (const p of ["eor", "contractor", "wallet"] as const)
      assert.ok(prods.includes(p), p);
    assert.equal(intel.chair, "referral");
    assert.ok(intel.threads.execSeen && intel.threads.opsSeen);
    assert.equal(intel.incumbent?.value, "Globalization Partners");
    assert.equal(intel.timing?.value.dateIso, "2026-09-01");
    assert.match(intel.direction!.line, /EOR/);
  });

  test("cold account: extraction from raw notes only", () => {
    const { intel } = readRows(
      { id: "NOPE000000000001", name: "Nobody Co" },
      [
        {
          id: "1",
          body: "They have 12 contractors in Mexico paid by wire, considering an employer of record; time-sensitive — decision by August 6",
          createdAt: "2026-07-25T00:00:00Z",
          kind: "mine",
        },
      ],
      { homeSide: [] },
    );
    assert.deepEqual(
      intel.countries.map((c) => c.value),
      ["mx"],
    );
    assert.equal(intel.headcounts[0]?.value.n, 12);
    assert.ok(intel.products.some((p) => p.value === "eor"));
    assert.ok(intel.timing);
    assert.equal(intel.timing!.value.dateIso, "2026-08-06");
    assert.equal(intel.chair, "undecided");
  });

  test("contractor_plus wins over plain contractor in the same doc", () => {
    const intel = extractDealIntel([
      {
        text: "contractor plus with agent of record cover",
        at: "2026-07-01T00:00:00Z",
        src: "note 7/1",
      },
    ]);
    const prods = intel.products.map((p) => p.value);
    assert.ok(prods.includes("contractor_plus"));
    assert.ok(!prods.includes("contractor"));
  });

  test("chair: referral-only doc decides; mixed doc does not", () => {
    const ref = extractDealIntel([
      {
        text: "proceed using a referral-based model",
        at: "2026-07-01T00:00:00Z",
        src: "note",
      },
    ]);
    assert.equal(ref.chair, "referral");
    const mixed = extractDealIntel([
      {
        text: "weighing the reseller structure against a referral fee",
        at: "2026-07-01T00:00:00Z",
        src: "note",
      },
    ]);
    assert.equal(mixed.chair, "undecided");
  });
});
