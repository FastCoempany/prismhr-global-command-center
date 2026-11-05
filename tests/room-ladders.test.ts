// The two stage ladders (the F26 face, release two; src/lib/room/ladders.ts):
// each stage read from the record the way the founder defined it on
// 2026-11-04, with the line it stands on, the hand on top, and live on the
// partner ladder read only from the client ladder.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { EMPTY_INTEL, type DealIntel } from "@/lib/intel/types";
import {
  NO_HAND,
  buildRowFacts,
  parseHandFacts,
  renderHandFacts,
} from "@/lib/room/facts";
import { readLadders, stageTone } from "@/lib/room/ladders";
import { applyFactChange } from "@/app/room/facts-actions";

type D = Parameters<typeof readLadders>[0]["docs"][number];
const doc = (at: string, text: string, over: Partial<D> = {}): D => ({
  text,
  at: `2026-${at}T15:00:00.000Z`,
  direction: "in",
  sender: "Dana Reyes",
  senderIsHome: false,
  machinery: false,
  closer: false,
  tape: false,
  ...over,
});
const ours = (at: string, text: string) =>
  doc(at, text, { direction: "out", sender: "Antaeus Coe", senderIsHome: true });
const facts = (
  intel: Partial<DealIntel> = {},
  docs: { text: string; at: string; src: string }[] = [],
) =>
  buildRowFacts({
    intel: { ...EMPTY_INTEL, ...intel },
    docs,
    hand: NO_HAND,
    todayMd: "11/4",
  });
const read = (docs: D[], over: Partial<Parameters<typeof readLadders>[0]> = {}) =>
  readLadders({ docs, facts: facts(), outcome: null, demoHeld: null, hand: {}, ...over });

describe("the partner ladder, read from the record", () => {
  test("only our own sends: not met", () => {
    const l = read([ours("10-01", "✉ Intro to PrismHR Global")]);
    assert.equal(l.partner.k, "none");
    assert.equal(l.client, null);
  });

  test("a reply or a call with nothing concrete: engaged cold, on its line", () => {
    const l = read([
      ours("10-01", "✉ Intro"),
      doc("10-02", "✉ Thanks, we'll keep it in mind."),
    ]);
    assert.equal(l.partner.k, "cold");
    assert.equal(l.partner.src.line, "✉ Thanks, we'll keep it in mind.");
    assert.equal(l.partner.src.day, "10/2");
    assert.equal(
      read([
        doc("10-03", "CALL TRANSCRIPT\nDana: hello", {
          tape: true,
          direction: undefined,
          sender: "",
        }),
      ]).partner.k,
      "cold",
    );
  });

  test("a closer or machinery alone engages nobody", () => {
    assert.equal(read([doc("10-02", "✉ thanks!", { closer: true })]).partner.k, "none");
    assert.equal(
      read([doc("10-02", "Automatic reply", { machinery: true })]).partner.k,
      "none",
    );
  });

  test("a request for a call warms it", () => {
    const l = read([
      doc("10-02", "✉ Could we set up a call next week to walk through it?"),
    ]);
    assert.equal(l.partner.k, "warm");
  });

  test("a leaning the record states warms it; the digest's seed does not", () => {
    const stated = facts({ chair: "resale" }, [
      {
        text: "✉ We'd resell it under our own name.",
        at: "2026-10-02T15:00:00.000Z",
        src: "n",
      },
    ]);
    assert.equal(stated.chair.line, "✉ We'd resell it under our own name.");
    assert.equal(
      read([doc("10-02", "✉ We'd resell it under our own name.")], { facts: stated })
        .partner.k,
      "warm",
    );
    const seeded = facts({ chair: "resale" }, []);
    assert.equal(read([doc("10-02", "✉ ok")], { facts: seeded }).partner.k, "cold");
  });

  test("the agreement going out is reviewing; naming it in an intro is not", () => {
    assert.equal(
      read([ours("10-01", "✉ We offer a reseller agreement and a referral agreement.")])
        .partner.k,
      "none",
    );
    const l = read([
      doc("10-02", "✉ Send it over"),
      ours("10-03", "✉ Attached is the reseller agreement for your review."),
    ]);
    assert.equal(l.partner.k, "review");
    assert.equal(l.agreement.n, 1);
  });

  test("their redline lifts the meter to two, the signed copy to three and the stage to signed", () => {
    const base = [
      doc("10-02", "✉ Send it"),
      ours("10-03", "✉ Attached is the reseller agreement."),
    ];
    const red = read([
      ...base,
      doc("10-10", "✉ Our counsel's edits are attached in tracked changes."),
    ]);
    assert.equal(red.partner.k, "review");
    assert.equal(red.agreement.n, 2);
    const signed = read([
      ...base,
      doc("10-14", "✉ Signed copy attached. Glad to get this done."),
    ]);
    assert.equal(signed.partner.k, "signed");
    assert.equal(signed.agreement.n, 3);
  });

  test("the board's Closed Won reads as signed; Closed Lost shows Passed", () => {
    const won = read([], { outcome: { status: "won", at: "2026-10-14T15:00:00.000Z" } });
    assert.equal(won.partner.k, "signed");
    assert.equal(won.partner.src.kind, "board");
    assert.equal(
      read([], { outcome: { status: "lost", at: "2026-10-14T15:00:00.000Z" } }).passed,
      true,
    );
  });

  test("the first orientation meeting after signing is oriented; one before it is not", () => {
    const signed = doc("10-14", "✉ Signed copy attached.");
    const before = doc("10-10", "✔ Implementation call · Meeting held", {
      direction: undefined,
      sender: "",
    });
    assert.equal(read([signed, before]).partner.k, "signed");
    const after = doc("11-04", "✔ Implementation call with Judi Owen · Meeting held", {
      direction: undefined,
      sender: "",
    });
    const l = read([signed, after]);
    assert.equal(l.partner.k, "oriented");
    assert.match(l.partner.src.line, /Judi Owen/);
  });
});

describe("the client ladder, read from the record", () => {
  const scoped = facts(
    {
      products: [{ value: "eor", src: "n", at: "2026-10-30T15:00:00.000Z" }],
      countries: [{ value: "in", src: "n", at: "2026-10-30T15:00:00.000Z" }],
      headcounts: [
        { value: { n: 2, country: "in" }, src: "n", at: "2026-10-30T15:00:00.000Z" },
      ],
      timing: {
        value: { phrase: "by Nov 16", dateIso: "2026-11-16" },
        src: "n",
        at: "2026-10-30T15:00:00.000Z",
      },
    },
    [
      {
        text: "✉ Two engineers in India by Nov 16.",
        at: "2026-10-30T15:00:00.000Z",
        src: "n",
      },
    ],
  );

  test("a mentioned client is named; country, product, count and date make it scoped", () => {
    const named = facts({
      countries: [{ value: "in", src: "n", at: "2026-10-30T15:00:00.000Z" }],
    });
    assert.equal(read([], { facts: named }).client?.k, "named");
    assert.equal(read([], { facts: scoped }).client?.k, "scoped");
  });

  test("a demo held, or numbers sent, shows it", () => {
    const demo = read([], {
      facts: scoped,
      demoHeld: { at: "2026-11-01T15:00:00.000Z", line: "Demo held with Dana." },
    });
    assert.equal(demo.client?.k, "shown");
    assert.equal(demo.client?.src.line, "Demo held with Dana.");
    assert.equal(
      read([ours("11-02", "✉ Here is the pricing for India.")], { facts: scoped }).client
        ?.k,
      "shown",
    );
  });

  test("won, onboarding and live are the hand's; a live client makes the partner live", () => {
    const l = read([doc("10-14", "✉ Signed copy attached.")], {
      facts: scoped,
      hand: { client: "live", clientDay: "11/4" },
    });
    assert.equal(l.client?.k, "live");
    assert.equal(l.client?.hand, true);
    assert.equal(l.client?.recordK, "scoped");
    assert.equal(l.partner.k, "live");
  });
});

describe("the hand on the ladders", () => {
  test("a hand stage outranks the record and keeps the record's stage for ↺", () => {
    const l = read([doc("10-02", "✉ Thanks.")], {
      hand: { partner: "signed", partnerDay: "11/4" },
    });
    assert.deepEqual(
      [l.partner.k, l.partner.recordK, l.partner.hand],
      ["signed", "cold", true],
    );
    assert.equal(l.agreement.n, 3, "a partner marked signed carries a signed agreement");
  });

  test("the store keeps both stages, refuses live on the partner ladder, and ↺ clears", async () => {
    let h = await applyFactChange(
      NO_HAND,
      { field: "partner", value: "oriented" },
      "11/4",
    );
    h = await applyFactChange(h, { field: "stage", value: "onboarding" }, "11/4");
    const back = parseHandFacts(renderHandFacts(h));
    assert.deepEqual([back.partner, back.stage], ["oriented", "onboarding"]);
    const live = await applyFactChange(
      NO_HAND,
      { field: "partner", value: "live" },
      "11/4",
    );
    assert.equal(live.partner, undefined);
    h = await applyFactChange(h, { field: "partner", value: null }, "11/4");
    assert.equal(h.partner, undefined);
    assert.equal(h.stage, "onboarding");
  });

  test("the colors by phase: grey, blue, green", () => {
    assert.deepEqual(
      ["none", "cold", "warm", "review", "signed", "oriented", "live"].map((k) =>
        stageTone("p", k),
      ),
      ["t0", "t0", "tb", "tb", "tg", "tg", "tg"],
    );
    assert.deepEqual(
      ["named", "scoped", "shown", "won", "onboarding", "live"].map((k) =>
        stageTone("c", k),
      ),
      ["t0", "tb", "tb", "tg", "tg", "tg"],
    );
  });
});

describe("the ladders read what happened, never what was asked (review of #424)", () => {
  test("our own email asking for a call engages nobody; an invitation after signing is not orientation", () => {
    assert.equal(
      read([ours("10-01", "✉ Can we schedule a call next week?")]).partner.k,
      "none",
    );
    const l = read([
      doc("10-14", "✉ Signed copy attached."),
      ours("10-20", "✉ Can we schedule an orientation call next week?"),
    ]);
    assert.equal(l.partner.k, "signed");
    assert.equal(
      read([
        doc("10-14", "✉ Signed copy attached."),
        doc("10-21", "☎ Orientation call with Dana"),
      ]).partner.k,
      "oriented",
    );
  });

  test("a product only our outbound or the seed names does not warm a neutral reply", () => {
    const seeded = facts({
      products: [{ value: "eor", src: "seed", at: "2026-10-01T15:00:00.000Z" }],
    });
    assert.equal(
      read([doc("10-02", "✉ Thanks, noted.")], { facts: seeded }).partner.k,
      "cold",
    );
    const theirs = facts(
      { products: [{ value: "eor", src: "n", at: "2026-10-02T15:00:00.000Z" }] },
      [
        {
          text: "✉ We need an employer of record in Mexico.",
          at: "2026-10-02T15:00:00.000Z",
          src: "n",
        },
      ],
    );
    const l = read([doc("10-02", "✉ We need an employer of record in Mexico.")], {
      facts: theirs,
    });
    assert.equal(l.partner.k, "warm");
    assert.equal(l.partner.src.line, "✉ We need an employer of record in Mexico.");
  });

  test("a question about pricing does not show the client; numbers sent do", () => {
    const named = facts({
      countries: [{ value: "in", src: "n", at: "2026-10-30T15:00:00.000Z" }],
    });
    assert.equal(
      read([ours("11-02", "✉ Would you like pricing?")], { facts: named }).client?.k,
      "named",
    );
    assert.equal(
      read([ours("11-02", "✉ I'll send a quote tomorrow.")], { facts: named }).client?.k,
      "named",
    );
    assert.equal(
      read([ours("11-02", "✉ Attached is the quote for India.")], { facts: named }).client
        ?.k,
      "shown",
    );
  });
});

test("a hidden note is never demo evidence: the page searches the visible notes", async () => {
  const { readFileSync } = await import("node:fs");
  const page = readFileSync("src/app/room/page.tsx", "utf8");
  assert.match(page, /const demoNote = allNotes\.find\(/);
  assert.doesNotMatch(page, /rawNotes\.find\(\(n\) => DEMO_HELD_RE/);
});
