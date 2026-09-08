// The Pipeline's saved edits (founder-decreed 2026-09-08: "the close date
// should survive a reload just as me editing lines make it into the downloaded
// doc file at any given time").
//
// The report is derived at render, so an edit had nowhere to live and every
// typed close date went back to the book's default on the next read.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  PIPELINE_EDIT_NS,
  editsFrom,
  parseEditsBody,
  renderEditsBody,
} from "../src/lib/pipeline/edits";
import { recordToText, lineKey } from "../src/lib/pipeline/plain";

const ID = "001F000000w38GlIAI";

describe("edits round-trip through the store", () => {
  test("a rewrite comes back as itself", () => {
    const edits = { [`${ID}:close:0`]: "2026-11-30", [`${ID}:model:0`]: "Referral" };
    const back = parseEditsBody(ID, renderEditsBody(edits));
    assert.deepEqual(back, edits);
  });
  test("a strike survives a reload — nothing dies by a mis-click", () => {
    const edits = { [`${ID}:next:1`]: null };
    const back = parseEditsBody(ID, renderEditsBody(edits));
    assert.equal(back[`${ID}:next:1`], null);
    assert.ok(`${ID}:next:1` in back, "the key is kept, not merely absent");
  });
  test("text with its own tabs and newlines cannot break the grammar", () => {
    const edits = { [`${ID}:fyi:0`]: "one\ttwo\nthree" };
    const back = parseEditsBody(ID, renderEditsBody(edits));
    // The newline ends the line, so what survives is everything up to it —
    // never a spill into the next key.
    assert.equal(Object.keys(back).length, 1);
    assert.ok(!("three" in back));
  });
  test("a body that is not this store parses to nothing", () => {
    assert.deepEqual(parseEditsBody(ID, "✎ DRAFT · something else\nTO x"), {});
    assert.deepEqual(parseEditsBody(ID, ""), {});
  });
  test("the keys carry the account they belong to", () => {
    const back = parseEditsBody("other", renderEditsBody({ [`${ID}:model:0`]: "Referral" }));
    assert.ok(`other:model:0` in back, "re-keyed to the row's own account");
  });
  test("editsFrom reads the newest row, and nothing when there is none", () => {
    const body = renderEditsBody({ [`${ID}:stage:0`]: "Contract" });
    assert.equal(editsFrom(ID, [{ body }])[`${ID}:stage:0`], "Contract");
    assert.deepEqual(editsFrom(ID, []), {});
    assert.deepEqual(editsFrom(ID, undefined), {});
  });
  test("the namespace is its own, and not another store's", () => {
    assert.equal(PIPELINE_EDIT_NS, "pipeline:");
    assert.ok(!PIPELINE_EDIT_NS.startsWith("actdraft"));
  });
});

describe("a saved edit is what the document says", () => {
  test("the close date he typed is the one that ships", () => {
    const r = {
      id: ID,
      account: "XCEL HR",
      csm: "Anika Steenstra",
      lastTouch: null,
      events: [],
      model: null,
      incumbent: null,
      opportunities: [],
      products: [],
      outcomes: [],
      outcomesSrc: "",
      theirWords: [],
      ourNext: [],
      doneRecently: [],
      theirSide: [],
      gated: false,
      handoffs: [],
      unknowns: [],
      stage: null,
      closeDate: { v: "2026-12-25", src: "the book's date", derived: true, passed: false },
      risks: [],
      quietDays: null,
      contacts: [],
      fyi: "",
      fyiWho: "",
      owners: [],
    };
    const saved = parseEditsBody(ID, renderEditsBody({ [lineKey(ID, "close")]: "2026-11-30" }));
    assert.match(recordToText(r), /Close date: 12\/25/);
    assert.match(recordToText(r, saved), /Close date: 2026-11-30/);
  });
});
