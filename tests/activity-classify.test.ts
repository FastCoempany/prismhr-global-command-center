// The lane classifier against the 60-row golden set — every Appendix B rule,
// every trap, pinned. A classification drift here is a build failure, never a
// silent absorption.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MACHINERY_USERS,
  actorKindOf,
  deriveColleagues,
  laneOf,
} from "../src/lib/activity/classify";
import { goldenSet, row } from "./activity-fixtures";

test("the golden set holds sixty labeled rows", () => {
  assert.equal(goldenSet().length, 60);
});

test("every golden row classifies exactly as labeled", () => {
  for (const g of goldenSet()) {
    const read = laneOf(g.r);
    assert.equal(read.lane, g.lane, `${g.why}: "${g.r.subject}" → ${read.lane}`);
    if (g.flags) {
      for (const [flag, want] of Object.entries(g.flags))
        assert.equal(
          read.flags[flag as keyof typeof read.flags],
          want,
          `${g.why}: flag ${flag}`,
        );
    }
  }
});

test("intent rows carry their verb and campaign", () => {
  const read = laneOf(
    row({
      subject: "Opened A Smarter Way to Benchmark Pay",
      taskSubtype: "Task",
      assigned: "Colleague One",
    }),
  );
  assert.equal(read.lane, "intent");
  assert.equal(read.intentKind, "opened");
  assert.equal(read.campaign, "A Smarter Way to Benchmark Pay");
});

test("machinery list is exact — a near-name is a person", () => {
  assert.equal(MACHINERY_USERS.length, 3);
  const read = laneOf(
    row({ subject: "Re: hi", assigned: "HubSpot Integration", taskSubtype: "Email" }),
  );
  assert.notEqual(read.lane, "machinery");
});

test("the colleague roster derives from Assigned ∪ CSMs ∪ extras − machinery", () => {
  const roster = deriveColleagues(
    ["Colleague One", "HubSpot Integration User", " ", "Automated Process"],
    ["Lesha Cyphers"],
    ["Eric Ronci"],
  );
  assert.ok(roster.has("Colleague One"));
  assert.ok(roster.has("Lesha Cyphers"));
  assert.ok(roster.has("Eric Ronci"));
  assert.ok(!roster.has("HubSpot Integration User"));
  assert.ok(!roster.has("Automated Process"));
});

test("actor kinds: colleague, account, machinery — and a collision is UNRESOLVED", () => {
  const colleagues = new Set(["Greg Williams", "Jordan Cross"]);
  const accountPeople = new Set(["Natalie Borland", "Jordan Cross"]);
  assert.equal(actorKindOf("Greg Williams", colleagues, accountPeople), "colleague");
  assert.equal(actorKindOf("Natalie Borland", colleagues, accountPeople), "account");
  assert.equal(actorKindOf("Jordan Cross", colleagues, accountPeople), "unresolved");
  assert.equal(actorKindOf("Automated Process", colleagues, accountPeople), "machinery");
  assert.equal(actorKindOf("Nobody Known", colleagues, accountPeople), "unresolved");
  assert.equal(actorKindOf("", colleagues, accountPeople), "unresolved");
});

test("rule 6: a CSM-assigned untyped row lands csm only when the roster is given", () => {
  const r = row({
    subject: "Quick note",
    assigned: "Lesha Cyphers",
    taskSubtype: "Email",
    recordType: "Service Provider Task",
  });
  assert.equal(laneOf(r).lane, "human");
  assert.equal(laneOf(r, { csmRoster: new Set(["Lesha Cyphers"]) }).lane, "csm");
});
