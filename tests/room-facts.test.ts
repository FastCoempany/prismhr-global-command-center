// The F26 face's facts (ship order 2026-11-04; src/lib/room/facts.ts): the
// sentence's facts read from the record with the line each stands on, the
// operator's own hand on top and marked as the hand's, the map's index by the
// nearest client date, and the people deck joined to the book's contact card
// with every exchange the record holds.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { EMPTY_INTEL, type DealIntel } from "@/lib/intel/types";
import {
  NO_HAND,
  buildDeck,
  buildRowFacts,
  dateTone,
  mapIndex,
  parseHandFacts,
  renderHandFacts,
  touchesFor,
  type HandFacts,
} from "@/lib/room/facts";
import { applyFactChange } from "@/app/room/facts-actions";
import { mapXY } from "@/lib/room/world-map";
import { COUNTRY_NAME } from "@/lib/intel/lexicon";

const AT = "2026-10-30T15:00:00.000Z";
const DOC = {
  text: "✉ Dana: two engineers in India by Nov 16.\nmore",
  at: AT,
  src: "note 10/30",
};
const intel = (over: Partial<DealIntel> = {}): DealIntel => ({ ...EMPTY_INTEL, ...over });
const fact = <T>(value: T) => ({ value, src: DOC.src, at: DOC.at });

describe("the sentence's facts", () => {
  test("each product, country, count and the date carries its record line", () => {
    const f = buildRowFacts({
      intel: intel({
        products: [fact("eor" as const), fact("payroll" as const)],
        countries: [fact("in")],
        headcounts: [fact({ n: 2, country: "in" })],
        timing: fact({ phrase: "by Nov 16", dateIso: "2026-11-16" }),
        chair: "resale",
      }),
      docs: [
        DOC,
        { text: "We'd resell it under our own name.", at: AT, src: "note 10/29" },
      ],
      hand: NO_HAND,
      todayMd: "11/4",
    });
    assert.deepEqual(
      f.products.map((p) => p.word),
      ["employer of record", "global payroll"],
    );
    assert.equal(f.products[0]!.line, "✉ Dana: two engineers in India by Nov 16.");
    assert.equal(f.countries[0]!.name, "India");
    assert.equal(f.heads[0]!.n, 2);
    assert.equal(f.date?.iso, "2026-11-16");
    assert.equal(f.chair.v, "resale");
    assert.equal(f.chair.hand, false);
    assert.equal(f.client.name, null, "the read names no client yet");
  });

  test("the hand sits on top of the record, marked as the hand's", () => {
    const hand: HandFacts = {
      chair: "referral",
      client: "Everest Transportation and Packaging",
      add: ["mx"],
      remove: ["in"],
      day: { chair: "11/4", client: "11/4", add: "11/4", remove: "11/4" },
    };
    const f = buildRowFacts({
      intel: intel({ countries: [fact("in"), fact("ph")], chair: "resale" }),
      docs: [DOC],
      hand,
      todayMd: "11/4",
    });
    assert.deepEqual(f.chair, { v: "referral", hand: true, day: "11/4", line: "" });
    assert.deepEqual(f.client, {
      name: "Everest Transportation and Packaging",
      hand: true,
      day: "11/4",
    });
    assert.deepEqual(
      f.countries.map((c) => [c.code, c.hand]),
      [
        ["ph", false],
        ["mx", true],
      ],
    );
    assert.deepEqual(f.removed, ["in"]);
  });

  test("an undecided chair reads as not said", () => {
    const f = buildRowFacts({ intel: intel(), docs: [], hand: NO_HAND, todayMd: "11/4" });
    assert.equal(f.chair.v, "none");
    assert.equal(f.date, null);
  });
});

describe("the facts: store keeps the hand's facts and nothing else", () => {
  test("a store body reads back as it was written", () => {
    const h: HandFacts = {
      chair: "resale",
      client: "Lumen Freight",
      add: ["mx", "co"],
      remove: ["in"],
      day: { chair: "11/3", client: "11/4", add: "11/4", remove: "11/2" },
    };
    assert.deepEqual(parseHandFacts(renderHandFacts(h)), h);
  });

  test("a body under another head, a bad code or an unknown field reads as nothing", () => {
    assert.deepEqual(parseHandFacts("✎ PIPELINE EDITS\nchair\tresale"), NO_HAND);
    const h = parseHandFacts("✎ ROW FACTS\nadd\tzz,mx,MX\nwho\tme\nchair\tmaybe");
    assert.deepEqual(h.add, ["mx"]);
    assert.equal(h.chair, undefined);
  });

  test("a change writes only its field, and ↺ clears it", async () => {
    let h = await applyFactChange(NO_HAND, { field: "chair", value: "referral" }, "11/4");
    assert.equal(h.chair, "referral");
    h = await applyFactChange(
      h,
      { field: "client", value: "  Everest   Transport  " },
      "11/4",
    );
    assert.equal(h.client, "Everest Transport");
    h = await applyFactChange(h, { field: "chair", value: null }, "11/4");
    assert.equal(h.chair, undefined);
    assert.equal(h.client, "Everest Transport");
  });

  test("adding a country taken off by hand puts it back, and the reverse", async () => {
    let h = await applyFactChange(NO_HAND, { field: "remove", code: "in" }, "11/4");
    assert.deepEqual(h.remove, ["in"]);
    h = await applyFactChange(h, { field: "add", code: "in" }, "11/4");
    assert.deepEqual([h.add, h.remove], [[], []]);
    h = await applyFactChange(h, { field: "add", code: "mx" }, "11/4");
    h = await applyFactChange(h, { field: "remove", code: "mx" }, "11/4");
    assert.deepEqual([h.add, h.remove], [[], []]);
    const same = await applyFactChange(h, { field: "add", code: "zz" }, "11/4");
    assert.equal(same, h, "a code the book does not know changes nothing");
  });
});

describe("the map", () => {
  test("every country the read can name has a place on the map", () => {
    for (const code of Object.keys(COUNTRY_NAME)) {
      const xy = mapXY(code);
      assert.ok(xy, code);
      assert.ok(xy[0] > 0 && xy[0] < 100 && xy[1] > 0 && xy[1] < 100, code);
    }
  });

  test("a country's light is its nearest date; the reddest country leads", () => {
    const deal = (key: string, code: string, iso: string | null, n?: number) => ({
      key,
      name: key,
      live: true,
      facts: buildRowFacts({
        intel: intel({
          countries: [fact(code)],
          headcounts: n ? [fact({ n, country: code })] : [],
          timing: iso ? fact({ phrase: "by then", dateIso: iso }) : null,
        }),
        docs: [DOC],
        hand: NO_HAND,
        todayMd: "11/4",
      }),
    });
    const idx = mapIndex(
      [
        deal("A", "mx", "2026-12-20", 3),
        deal("B", "mx", "2026-11-10"),
        deal("C", "in", "2027-02-01", 2),
        { ...deal("D", "de", "2026-11-05"), live: false },
      ],
      "2026-11-04",
    );
    assert.deepEqual(
      idx.map((c) => [c.code, c.tone, c.days]),
      [
        ["mx", "hot", 6],
        ["in", "cool", 89],
      ],
    );
    assert.equal(idx[0]!.people, 3);
    assert.equal(idx[0]!.unsaid, 1);
  });

  test("a date with no day is amber; no date at all is plain", () => {
    assert.equal(
      dateTone({ iso: null, phrase: "ASAP", day: "", line: "" }, "2026-11-04"),
      "warm",
    );
    assert.equal(dateTone(null, "2026-11-04"), "none");
  });
});

describe("the people deck", () => {
  const docs = [
    {
      text: "✉ hello",
      at: "2026-10-01T15:00:00Z",
      sender: "Dana Reyes",
      senderIsHome: false,
      machinery: false,
      tape: false,
      recipients: ["Antaeus Coe"],
    },
    {
      text: "✉ reply",
      at: "2026-10-02T15:00:00Z",
      sender: "Antaeus Coe",
      senderIsHome: true,
      machinery: false,
      tape: false,
      recipients: ["dana.reyes@simploy.com"],
    },
    {
      text: "CALL TRANSCRIPT\nDana: hi",
      at: "2026-10-03T15:00:00Z",
      sender: "",
      senderIsHome: false,
      machinery: false,
      tape: true,
      people: ["Dana Reyes"],
      recipients: [],
    },
    {
      text: "Automatic reply",
      at: "2026-10-04T15:00:00Z",
      sender: "Dana Reyes",
      senderIsHome: false,
      machinery: true,
      tape: false,
      recipients: [],
    },
  ];

  test("every exchange with one person, in order, machinery left out", () => {
    assert.deepEqual(
      touchesFor({ name: "Dana Reyes", email: "dana.reyes@simploy.com" }, docs).map(
        (t) => [t.kind, t.dir],
      ),
      [
        ["email", "in"],
        ["email", "out"],
        ["call", "both"],
      ],
    );
  });

  test("the record's people join the book's contact card", () => {
    const [p] = buildDeck({
      people: [{ name: "Dana Reyes", title: "", email: "" }],
      contacts: [
        {
          first: "Dana",
          last: "Reyes",
          title: "VP of Operations",
          email: "dana.reyes@simploy.com",
          phone: "(555) 010-2210",
          mobile: "",
          city: "Raleigh",
          state: "NC",
        },
      ],
      docs,
    });
    assert.equal(p!.title, "VP of Operations");
    assert.equal(p!.email, "dana.reyes@simploy.com");
    assert.equal(p!.city, "Raleigh, NC");
    assert.equal(p!.linkedin, null, "no LinkedIn until one is on file");
    assert.equal(p!.touches.length, 3);
  });
});
