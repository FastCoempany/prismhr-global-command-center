// The price desk (founder-decreed 2026-08-21): pricing questions answer
// arithmetically from the Pricing page's own data — the one sanctioned money
// surface. No model, no stored figure; the ledger banks the redacted twin.

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { priceQuoteFor } from "../src/lib/pricing/quote";
import { redactMoney } from "../src/lib/intel/lexicon";

describe("the price desk", () => {
  test("a country quote carries the page's figure and the per-month shape", () => {
    const q = priceQuoteFor("give me a price quote for 1 employee EOR Mexico");
    assert.ok(q, "the desk answered");
    assert.ok(q.matched.includes("Mexico"));
    assert.match(q.answer, /Mexico: \$\d/);
    assert.match(q.answer, /per employee per month/);
    assert.match(q.answer, /Rates from the Pricing page/);
  });

  test("an employee count multiplies arithmetically", () => {
    const one = priceQuoteFor("cost for 1 ee EOR Mexico");
    const three = priceQuoteFor("cost for 3 ees EOR Mexico");
    assert.ok(one && three);
    const rate = /Mexico: \$([\d,]+)/.exec(one.answer);
    assert.ok(rate);
    const per = parseInt(rate[1].replace(/,/g, ""), 10);
    assert.ok(
      three.answer.includes(`3 employees → $${(per * 3).toLocaleString("en-US")}/month`),
      `expected the tripled figure in: ${three.answer}`,
    );
  });

  test("a non-pricing question never wakes the desk", () => {
    assert.equal(priceQuoteFor("who is the CSM for Simploy"), null);
    assert.equal(priceQuoteFor("what did Mexico's office say"), null);
  });

  test("a pricing question with no named country gets the door, not a shrug", () => {
    const q = priceQuoteFor("how does EOR pricing work");
    assert.ok(q);
    assert.match(q.answer, /Name the country/);
  });

  test("the ledger twin redacts clean — no figure survives redactMoney", () => {
    const q = priceQuoteFor("price for 2 employees EOR Mexico");
    assert.ok(q);
    assert.doesNotMatch(redactMoney(q.answer), /\$\d/);
  });
});
