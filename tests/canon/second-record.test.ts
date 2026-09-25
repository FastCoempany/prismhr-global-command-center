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
});
