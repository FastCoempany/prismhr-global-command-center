// The Sheet's ship audit, run by the test suite instead of by hand: the graph
// (every door reachable, every cue landing on a real product, every ask index
// in range), the scans (account and person names, money, the evidence ladder),
// and the country wing's index against the sheet it stands on.

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
  BETWEEN,
  CUES,
  ISSUE_ORDER,
  PRODUCTS,
  cuesFor,
  product,
  type Cite,
} from "../src/lib/playbook/products";
import { COUNTRY_TALLY, countryCard, countryIndex } from "../src/lib/playbook/countries";
import { peos } from "../src/lib/book";
import { knownPeople } from "../src/lib/book/contacts";
import { redactMoney } from "../src/lib/intel/lexicon";

const RUNGS = new Set(["tape", "filed", "research", "none"]);

/** Everything a partner or the operator reads on this surface. */
function spokenLines(): string[] {
  const out: string[] = [];
  for (const p of PRODUCTS) {
    out.push(p.name, p.door, p.fork, p.one, p.lang, p.time, p.money, ...p.how, ...p.we);
    out.push(...p.they, ...p.ask);
    if (p.sub) out.push(p.sub);
    if (p.watch) out.push(p.watch);
    for (const [, when] of p.notThis) out.push(when);
    for (const issue of ISSUE_ORDER) {
      const s = p.solves[issue];
      out.push(s.head, s.body, ...s.pts);
    }
    for (const t of p.tiers) out.push(t.name, t.who, ...t.pts);
  }
  for (const c of CUES) {
    out.push(c.cue, c.gist, ...c.respond);
    for (const [, when] of c.also ?? []) out.push(when);
  }
  for (const b of BETWEEN) out.push(b.q, b.a);
  return out;
}

function allCites(): Cite[] {
  const out: Cite[] = [];
  for (const p of PRODUCTS)
    for (const issue of ISSUE_ORDER) out.push(...p.solves[issue].ev);
  for (const c of CUES) out.push(...c.ev);
  for (const b of BETWEEN) out.push(...b.ev);
  return out;
}

describe("the Sheet · the graph", () => {
  test("every product carries all five issues, and the doors are unique", () => {
    const ids = new Set<string>();
    for (const p of PRODUCTS) {
      assert.equal(ids.has(p.id), false, `duplicate product id ${p.id}`);
      ids.add(p.id);
      for (const issue of ISSUE_ORDER) {
        const s = p.solves[issue];
        assert.ok(s, `${p.id} has nothing for ${issue}`);
        assert.ok(s.head.length > 0 && s.body.length > 0, `${p.id}/${issue} is empty`);
      }
    }
    assert.equal(PRODUCTS.length, 5);
  });

  test("every cue lands on a real product, and every product has cues", () => {
    for (const c of CUES) {
      assert.ok(product(c.p), `cue ${c.id} names no product`);
      assert.ok(ISSUE_ORDER.includes(c.issue), `cue ${c.id} has issue ${c.issue}`);
    }
    for (const p of PRODUCTS)
      assert.ok(cuesFor(p.id).length > 0, `${p.id} has nothing partners say about it`);
    const ids = new Set(CUES.map((c) => c.id));
    assert.equal(ids.size, CUES.length, "duplicate cue id");
  });

  test("every ask index is in range, and every crossing link resolves", () => {
    for (const c of CUES) {
      const p = product(c.p);
      assert.ok(p);
      for (const i of c.ask)
        assert.ok(p.ask[i], `cue ${c.id} asks for ${c.p}.ask[${i}], which is not there`);
      for (const [id] of c.also ?? [])
        assert.ok(product(id), `cue ${c.id} crosses to ${id}, which is not a product`);
    }
    for (const p of PRODUCTS)
      for (const [id] of p.notThis)
        assert.ok(product(id), `${p.id} rules out ${id}, which is not a product`);
  });

  test("every country a cue names is one the wing can open", () => {
    for (const c of CUES)
      for (const name of c.cty ?? [])
        assert.ok(countryCard(name), `cue ${c.id} pins ${name}, which the sheet lacks`);
  });
});

describe("the Sheet · the scans", () => {
  test("evidence or nothing — every cite reads a rung of the ladder", () => {
    for (const [text, rung] of allCites()) {
      assert.ok(text.trim().length > 0, "a cite with no text");
      assert.ok(RUNGS.has(rung), `${rung} is not a rung`);
    }
    for (const c of CUES) assert.ok(c.ev.length > 0, `cue ${c.id} stands on nothing`);
    for (const b of BETWEEN) assert.ok(b.ev.length > 0, `"${b.q}" stands on nothing`);
  });

  test("no account name and no person name reaches the surface", () => {
    const names = [
      ...peos.map((p) => p.name),
      ...peos.map((p) => p.contactName),
      ...knownPeople(),
    ]
      .map((n) => n.trim())
      .filter((n) => n.length >= 5 && n.includes(" "));
    const lines = spokenLines();
    for (const n of new Set(names)) {
      const re = new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      const hit = lines.find((l) => re.test(l));
      assert.equal(hit, undefined, `"${n}" appears on the Playbook: ${hit}`);
    }
  });

  test("no figure renders in what the product says about price", () => {
    for (const line of spokenLines())
      assert.equal(redactMoney(line), line, `a figure renders: ${line}`);
  });

  test("the word 'steps' never appears in operator-facing copy", () => {
    for (const line of spokenLines())
      assert.equal(/\bsteps\b/i.test(line), false, `"steps" appears: ${line}`);
  });
});

describe("the Sheet · the country wing", () => {
  test("the index matches the sheet it stands on", () => {
    const index = countryIndex();
    const priced = index.filter((r) => r.priced);
    assert.equal(priced.length, COUNTRY_TALLY.priced);
    assert.equal(
      priced.filter((r) => r.points > 0).length,
      COUNTRY_TALLY.written,
      "the written tally and the index disagree",
    );
    for (const r of index)
      assert.ok(countryCard(r.name), `${r.name} is indexed and has no card`);
  });

  test("a country we do not cover still gets an answer", () => {
    const card = countryCard("Russia");
    assert.ok(card);
    assert.equal(card.priced, false);
    assert.equal(card.verdict, "no");
    assert.equal(card.sixteen.length, 0);
    assert.equal(countryCard("Atlantis"), null);
  });

  test("a country we price but have not written up says so", () => {
    const blank = countryIndex().find((r) => r.priced && r.points === 0);
    assert.ok(blank);
    const card = countryCard(blank.name);
    assert.ok(card);
    assert.equal(card.lead.length, 0);
    assert.equal(card.verdictLine.length > 0, true);
  });

  test("the countries we never promise blind carry their own line", () => {
    for (const name of ["Ukraine", "Puerto Rico", "Israel"]) {
      const card = countryCard(name);
      assert.ok(card, `${name} is not on the sheet`);
      assert.notEqual(card.verdict, "ok", `${name} reads as a plain yes`);
    }
  });
});
