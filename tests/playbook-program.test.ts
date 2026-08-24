// The cleared Playbook program's guards (2026-08-24). Each test pins a defect
// the two audit passes and the verification wing proved: the {countries} leak
// walked through a vacuous test, two hardcoded ids had no pin, scenario
// suppression hid trap-demanded questions, arrival order was an alphabetical
// accident, and the ask-next merge had three ways to fire backwards.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { DISCOVERY, questionsFor } from "@/lib/intel/discovery";
import { PRODUCT_BANK } from "@/lib/intel/discovery-product";
import { SCENARIOS } from "@/lib/intel/scenarios";
import {
  NO_FILTERS,
  selectQuestions,
  type Filters,
  type QProduct,
  type QSoph,
} from "@/lib/intel/bank";
import { askNextFor, bankFor } from "@/lib/intel/ask-next";
import { EMPTY_INTEL, type DealIntel } from "@/lib/intel/types";

const CATEGORIES = new Set([
  "footprint",
  "classification",
  "risk",
  "incumbent",
  "money",
  "timing",
  "commercial",
  "platform",
]);

// The page's actual served assembly, filled exactly as page.tsx fills it.
const fill = (s: string) => s.replaceAll("{countries}", "those countries");
const SERVED = [
  ...questionsFor({ phase: "contract", gaps: [], countries: [] }),
  ...PRODUCT_BANK,
].map((q) => ({
  ...q,
  question: fill(q.question),
  why: fill(q.why),
  listenFor: q.listenFor.map(fill),
  followUp: fill(q.followUp),
  relayLine: fill(q.relayLine),
}));

const intel = (over: Partial<DealIntel> = {}): DealIntel => ({
  ...structuredClone(EMPTY_INTEL),
  ...over,
});

describe("token hygiene — the leak class that shipped", () => {
  test("no field of the served page carries a raw {countries}", () => {
    for (const q of SERVED) {
      const blob = [q.question, q.why, q.followUp, q.relayLine, ...q.listenFor].join(" ");
      assert.ok(!blob.includes("{countries}"), `${q.id} serves a raw token`);
    }
  });
  test("raw bank tokens live only in question and relayLine, where fills cover them", () => {
    for (const q of [...DISCOVERY, ...PRODUCT_BANK]) {
      const unfilled = [q.why, q.followUp, ...q.listenFor].join(" ");
      assert.ok(!unfilled.includes("{countries}"), `${q.id} tokens an unfilled field`);
    }
  });
});

describe("scenario validity", () => {
  test("every lead and avoid category exists, and no scenario yields empty", () => {
    const BANK = [...DISCOVERY, ...PRODUCT_BANK];
    for (const s of SCENARIOS) {
      for (const c of [...s.leadWith, ...s.avoid])
        assert.ok(CATEGORIES.has(c), `${s.id} names unknown category ${c}`);
      const implied: Filters = {
        ...NO_FILTERS,
        product: (s.product !== "any" ? s.product : "") as QProduct | "",
        soph: (s.sophistication !== "any" ? s.sophistication : "") as QSoph | "",
      };
      const got = selectQuestions(BANK, implied, s);
      assert.ok(got.length > 0, `${s.id} yields nothing`);
    }
  });
  test("avoid demotes, never hides — the trap-demanded questions survive", () => {
    // sc-one-urgent-hire's trap 5 warns about statutory extras; its avoid
    // list holds the money category that carries that exact question.
    const scen = SCENARIOS.find((s) => s.id === "sc-one-urgent-hire")!;
    const shown = selectQuestions(
      [...DISCOVERY, ...PRODUCT_BANK],
      { ...NO_FILTERS, product: "eor" },
      scen,
    );
    assert.ok(
      shown.some((q) => q.id === "eor-statutory-extras"),
      "the urgent-hire trap's own question vanished",
    );
  });
});

describe("the hardcoded ids stay pinned", () => {
  test("the ids Groundwork and the brief splice by name exist with live relays", () => {
    for (const id of ["fp-where", "fp-status", "mt-exec"]) {
      const q = DISCOVERY.find((x) => x.id === id);
      assert.ok(q, `${id} left DISCOVERY — compose.ts/brief.ts splice it by name`);
      assert.ok(q!.relayLine.length > 20, `${id} relay went blank`);
    }
  });
  test("mt-exec's relay keeps the words the brief test matches", () => {
    const q = DISCOVERY.find((x) => x.id === "mt-exec")!;
    assert.match(q.relayLine, /who else/);
  });
  test("retired ids never come back", () => {
    const RETIRED = [
      "x-payment-path",
      "x-footprint-forward",
      "x-partner-chair",
      "eor-own-entity",
      "gp-headcount",
      "gp-employer-reg",
      "gp-nationality",
      "cm-ip-assignment",
    ];
    const ids = new Set([...DISCOVERY, ...PRODUCT_BANK].map((q) => q.id));
    for (const id of RETIRED)
      assert.ok(!ids.has(id), `${id} was retired 2026-08-24 — reusing it un-retires it`);
  });
});

describe("arrival order is curated, not alphabetical", () => {
  test("the no-scenario arrival leads with the triage openers", () => {
    const shown = selectQuestions([...SERVED], NO_FILTERS, null);
    assert.equal(shown[0].id, "x-triage-language");
    assert.equal(shown[1].id, "x-why-now");
    assert.ok(
      shown.findIndex((q) => q.id === "fp-where") < 6,
      "fp-where sits deep in the arrival order",
    );
  });
});

describe("the ask-next merge fires forward, never backwards", () => {
  test("the earliest stage serves questions now — it was silently empty", () => {
    const qs = askNextFor({
      intel: intel(),
      states: {},
      accountId: "A1",
      doneKeys: new Set(),
    });
    assert.ok(qs.length > 0, "investigate-stage ask-next is empty again");
    assert.ok(qs.length <= 3);
  });
  test("displacement questions wait for a known incumbent", () => {
    const cold = bankFor(intel());
    assert.ok(
      !cold.some((q) => (q.soph ?? "any") === "displacement"),
      "a competitor question fired with no competitor known",
    );
    const warm = bankFor(
      intel({ incumbent: { value: "G-P", src: "digest", at: "2026-07-07T00:00:00Z" } }),
    );
    assert.ok(warm.some((q) => (q.soph ?? "any") === "displacement"));
  });
  test("a deal with no named product earns only product-neutral questions", () => {
    const cold = bankFor(intel());
    assert.ok(cold.every((q) => (q.product ?? "any") === "any"));
    const eor = bankFor(
      intel({ products: [{ value: "eor", src: "note", at: "2026-07-01T00:00:00Z" }] }),
    );
    assert.ok(eor.some((q) => q.product === "eor"));
    assert.ok(!eor.some((q) => q.product === "payroll"));
  });
  test("contractor-plus maps into the contractor lane", () => {
    const bank = bankFor(
      intel({
        products: [{ value: "contractor_plus", src: "note", at: "2026-07-01T00:00:00Z" }],
      }),
    );
    assert.ok(bank.some((q) => q.product === "contractor"));
  });
});

describe("new content keeps the house doctrine", () => {
  test("the program questions exist and the program scenario leads commercial", () => {
    const ids = new Set(PRODUCT_BANK.map((q) => q.id));
    for (const id of ["x-prog-book", "x-prog-margin", "x-prog-support"])
      assert.ok(ids.has(id), `${id} missing`);
    const rollout = SCENARIOS.find((s) => s.id === "sc-program-rollout");
    assert.ok(rollout, "the program scenario is missing");
    assert.equal(
      rollout!.leadWith[0],
      "commercial",
      "program questions only surface if the scenario leads commercial",
    );
  });
  test("the coverage holes are closed: eor first_meeting, eor displacement, cm naive", () => {
    const eorFirst = PRODUCT_BANK.filter(
      (q) => q.product === "eor" && q.phase === "first_meeting",
    );
    const eorDisp = PRODUCT_BANK.filter(
      (q) => q.product === "eor" && q.soph === "displacement",
    );
    const cmNaive = PRODUCT_BANK.filter(
      (q) => q.product === "contractor" && q.soph === "naive",
    );
    assert.ok(eorFirst.length > 0, "EOR still has no first-meeting question");
    assert.ok(eorDisp.length > 0, "EOR still has no displacement question");
    assert.ok(cmNaive.length > 0, "contractor still has no naive question");
  });
});
