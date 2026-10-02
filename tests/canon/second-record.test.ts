// Canon pins for the second record (CLAUDE.md "The second record", rulings
// of 2026-09-25: D20, D21). D18 (the acted stamp survives the take-back) is
// not pinned here: the stamp lives inside the gems: note body the take-back
// deletes, so it needs the design pass first.

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { personMoved } from "../../src/lib/activity/acted";
import { lintAct, lintReason } from "../../src/lib/activity/lint";

describe("the record has moved on a gem when a row after its day carries the gem's person (D20)", () => {
  // A send as the acted sweep reads it: the head names no one, so each case
  // says exactly which columns carry the person.
  const send = (over: Partial<Parameters<typeof personMoved>[1]>) => ({
    who: "",
    head: "✉ OL Aug 20 9:12 AM — Re: the model",
    actors: "",
    recipients: "",
    ...over,
  });

  test("an initial reads as the person: 'Natalie B.' matches 'Natalie Borland'", () => {
    assert.equal(personMoved(["Natalie B."], send({ who: "Natalie Borland" })), true);
    // The other order too.
    assert.equal(personMoved(["N. Borland"], send({ who: "Natalie Borland" })), true);
  });

  test("an address matches a row whose actors carry it", () => {
    assert.equal(
      personMoved(
        ["natalie.borland@x.com"],
        send({
          who: "natalie.borland@x.com",
          head: "✉ Re: the model — sent to natalie.borland@x.com.",
          actors: "Antaeus Coe → Natalie.Borland@x.com",
        }),
      ),
      true,
    );
    // And one whose recipients column carries it, when actors name someone else.
    assert.equal(
      personMoved(
        ["natalie.borland@x.com"],
        send({
          who: "Greg Williams",
          actors: "Antaeus Coe → Greg Williams +1",
          recipients: "greg@x.com, natalie.borland@x.com",
        }),
      ),
      true,
    );
  });

  test("a bare fragment is not a person: 'Nat' alone matches nothing", () => {
    assert.equal(personMoved(["Nat"], send({ who: "Natalie Borland" })), false);
    assert.equal(personMoved(["Nat"], send({ who: "Nathan Price" })), false);
  });

  test("a different person is not the gem's person", () => {
    assert.equal(
      personMoved(
        ["Natalie Borland"],
        send({ who: "Greg Williams", actors: "Antaeus Coe → Greg Williams" }),
      ),
      false,
    );
    assert.equal(personMoved(["Natalie B."], send({ who: "Natalie Price" })), false);
    assert.equal(personMoved([""], send({ who: "Natalie Borland" })), false);
  });
});

describe("gem lines are operator copy: the seven devices are linted, and a non-date digit kills (D21)", () => {
  test("antithesis dies: 'Ask Greg, not Jane.'", () => {
    const v = lintAct("Ask Greg, not Jane.");
    assert.equal(v.ok, false);
    assert.ok(v.faults.includes("antithesis"), v.faults.join("; "));
    assert.equal(lintAct("Send not the deck but the model.").ok, false);
  });

  test("the dash hinge dies: 'Send the model — the close arrives.'", () => {
    const v = lintAct("Send the model — the close arrives.");
    assert.equal(v.ok, false);
    assert.ok(v.faults.includes("a dash hinge"), v.faults.join("; "));
    // The spaced hyphen is the same hinge.
    const r = lintReason("They asked for pricing - twice now.");
    assert.equal(r.ok, false);
    assert.ok(r.faults.includes("a dash hinge"), r.faults.join("; "));
  });

  test("a digit that is not a date kills: '3 clients want EOR.'", () => {
    const a = lintAct("3 clients want EOR.");
    assert.equal(a.ok, false);
    assert.ok(a.faults.includes("a digit that is not a date"), a.faults.join("; "));
    const r = lintReason("3 clients want EOR.");
    assert.equal(r.ok, false);
    assert.ok(r.faults.includes("a digit that is not a date"), r.faults.join("; "));
    assert.equal(lintReason("They opened 3 of ours.").ok, false);
  });

  test("a date is not a count: 'Aug 19 reply wants to discuss switching.' passes", () => {
    assert.equal(lintReason("Aug 19 reply wants to discuss switching.").ok, true);
    assert.equal(lintReason("Renewal meeting 9/12.").ok, true);
    assert.equal(lintReason("Quiet since 2026-08-01.").ok, true);
    assert.equal(lintReason("Their reply of 19 Aug asks for pricing.").ok, true);
  });

  test("plain speech passes: 'Ask Greg Williams about the call.'", () => {
    assert.equal(lintAct("Ask Greg Williams about the call.").ok, true);
    assert.equal(lintAct("Reach Natalie and William today.").ok, true);
    assert.equal(lintReason("Their partner thread is live.").ok, true);
    assert.equal(lintReason("Nine support cases. Never pitched.").ok, true);
  });

  // The plain-speech law's own examples (CLAUDE.md:90-100), verbatim, one per
  // device the lint did not yet carry — and beside each, a plain line a naive
  // regex would wrongly catch, which must pass. A false positive kills a real
  // gem, so the pass lines pin the detectors' conservatism.
  test("paradox dies: 'a call that ends hasn't ended'", () => {
    const v = lintReason("a call that ends hasn't ended");
    assert.equal(v.ok, false);
    assert.ok(v.faults.includes("paradox"), v.faults.join("; "));
    // A stem and its negation in one clause, whoever the subject is.
    assert.ok(lintReason("The quiet thread hasn't gone quiet.").faults.includes("paradox"));
    // The line's own imperative verb is the app doing its job, not a paradox;
    // and two subjects across a comma are two clauses, not one.
    assert.equal(lintAct("Ask what they haven't asked yet.").ok, true);
    assert.equal(lintReason("They replied, we haven't replied.").ok, true);
    assert.equal(lintReason("Nine support cases. Never pitched.").ok, true);
  });

  test("maxim dies: 'controlled beats discovered'", () => {
    const v = lintReason("controlled beats discovered");
    assert.equal(v.ok, false);
    assert.ok(v.faults.includes("a maxim"), v.faults.join("; "));
    assert.ok(lintReason("Speed over polish.").faults.includes("a maxim"));
    assert.ok(lintReason("Nine cases. Controlled beats discovered.").faults.includes("a maxim"));
    // "over" inside an instruction is a preposition, not an aphorism.
    assert.equal(lintAct("Send the deck over email.").ok, true);
    assert.equal(lintAct("Call over Zoom.").ok, true);
    assert.equal(lintReason("Their CFO beats around the bush.").ok, true);
  });

  test("definitional flip dies: 'questions now are free — later they're change orders'", () => {
    const v = lintReason("questions now are free — later they're change orders");
    assert.equal(v.ok, false);
    assert.ok(v.faults.includes("a definitional flip"), v.faults.join("; "));
    // The "X is just Y" redefinition is the same device.
    assert.ok(lintReason("Questions are just change orders.").faults.includes("a definitional flip"));
    // "now" and "later" in an instruction are times, not a redefinition; and
    // a measured fact with "just" is a fact.
    assert.equal(lintAct("Send it now and follow later.").ok, true);
    assert.equal(lintReason("The deck is just two pages.").ok, true);
  });

  test("escalating triad dies: 'their pay, our employment, our answer'", () => {
    const v = lintReason("their pay, our employment, our answer");
    assert.equal(v.ok, false);
    assert.ok(v.faults.includes("an escalating triad"), v.faults.join("; "));
    // A real list of three actual things is content, not a device.
    assert.equal(lintAct("Ask Greg, Jane, and Natalie.").ok, true);
    assert.equal(lintReason("Their pay, their benefits, their taxes.").ok, true);
    assert.equal(lintReason("Their CFO, their CEO, and the board.").ok, true);
  });

  test("chiasmus dies: 'inside the machine, not beside it'", () => {
    assert.equal(lintReason("inside the machine, not beside it").ok, false);
    // The ABBA inversion proper: two content words mirrored in one sentence.
    const v = lintReason("Work the plan, plan the work.");
    assert.equal(v.ok, false);
    assert.ok(v.faults.includes("chiasmus"), v.faults.join("; "));
    assert.ok(lintReason("Plan the work and work the plan.").faults.includes("chiasmus"));
    // A word that comes back across a sentence break, or with other content
    // between the mirrored pair, is repetition, not a mirror.
    assert.equal(lintReason("Call Greg. Greg asked for a call.").ok, true);
    assert.equal(lintReason("Call Greg, since Greg asked for a call.").ok, true);
    assert.equal(lintAct("Ask Greg Williams about the call.").ok, true);
  });
});
