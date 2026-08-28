// The lane classifier against the 60-row golden set — every Appendix B rule,
// every trap, pinned. A classification drift here is a build failure, never a
// silent absorption.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MACHINERY_USERS,
  actorKindOf,
  deriveColleagues,
  isLoggedCorrespondence,
  isMachineryName,
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

// ── the logger is not the actor (2026-08-28) ────────────────────────────────
// The Outlook capture files a real email under "Automated Process". Rule 1
// swallowed all of them: 118 of the operator's own rows at one account
// vanished into machinery, and the room read the book as quieter than it was.

const loggedComment = (to: string, body: string): string =>
  `To: ${to}\nCC: \nBCC: \nAttachment: --none--\n\nSubject: Re: LMS?\nBody:\n${body}`;

test("a logged email escapes machinery — the assignee names the logger", () => {
  const r = row({
    subject: "Email: Re: LMS?",
    assigned: "Automated Process",
    taskSubtype: "Email",
    comments: loggedComment(
      "jennifer@infinitihr.com; antaeus.coe@prismhr.com",
      "We are currently having a pain around Puerto Rico processing.",
    ),
  });
  assert.equal(isLoggedCorrespondence(r), true);
  assert.equal(laneOf(r).lane, "human");
});

test("a logged email keeps its own lane — support and csm still win", () => {
  const support = row({
    subject: "Email: PrismHR Case 00675872: Suggested Solution",
    assigned: "Automated Process",
    taskSubtype: "Email",
    comments: loggedComment("alea@infinitihr.com", "The fix shipped in May."),
  });
  assert.equal(laneOf(support).lane, "support");
  const csm = row({
    subject: "Email: Renewal",
    assigned: "Automated Process",
    taskSubtype: "Email",
    recordType: "CSM Task",
    comments: loggedComment("scott@infinitihr.com", "Your renewal is up."),
  });
  assert.equal(laneOf(csm).lane, "csm");
});

test("the escape hatch is narrow — a bare machinery row is still machinery", () => {
  // No comments at all.
  assert.equal(
    laneOf(row({ subject: "Sync", assigned: "Automated Process", taskSubtype: "Email" }))
      .lane,
    "machinery",
  );
  // Comments, but no Body: block — a note, not a captured email.
  assert.equal(
    laneOf(
      row({
        subject: "Sync",
        assigned: "Automated Process",
        taskSubtype: "Email",
        comments: "To: someone@elsewhere.com\nnothing else",
      }),
    ).lane,
    "machinery",
  );
  // The scaffold is there but the subtype is not Email.
  assert.equal(
    laneOf(
      row({
        subject: "Sync",
        assigned: "Automated Process",
        taskSubtype: "Task",
        comments: loggedComment("a@b.com", "hello"),
      }),
    ).lane,
    "machinery",
  );
  // An engagement receipt wearing the scaffold is machinery, always.
  assert.equal(
    laneOf(
      row({
        subject: "Automated Email: Welcome",
        assigned: "Automated Process",
        taskSubtype: "Email",
        comments: loggedComment("a@b.com", "hello"),
      }),
    ).lane,
    "machinery",
  );
  // The integration users never carry captured mail; the hatch is theirs too,
  // and it only opens on the same evidence.
  assert.equal(
    laneOf(
      row({
        subject: "Sent Partner Webinar",
        assigned: "HubSpot Integration User",
        taskSubtype: "Task",
      }),
    ).lane,
    "machinery",
  );
});

test("isMachineryName knows the mechanisms and nobody else", () => {
  for (const m of MACHINERY_USERS) assert.equal(isMachineryName(m), true);
  assert.equal(isMachineryName("  Automated Process  "), true);
  assert.equal(isMachineryName("Antaeus Coe"), false);
  assert.equal(isMachineryName(""), false);
});

test("the case acknowledgement is a receipt, not a person — it never rides the hatch", () => {
  const ack = row({
    subject: "Email: PrismHR Case 00675872 has been received,",
    assigned: "Salesforce Administrator User",
    taskSubtype: "Email",
    recordType: "Support Call",
    comments: loggedComment("alea@infinitihr.com", "We got your case."),
  });
  assert.equal(isLoggedCorrespondence(ack), false);
  assert.equal(laneOf(ack).lane, "machinery");
  // Assigned to a real person it is still a receipt, and still not motion.
  const byHuman = row({ ...ack, assigned: "Samantha Ingram" });
  assert.equal(laneOf(byHuman).flags.receipt, true);
  // A real reply about the same case is untouched.
  const reply = row({
    subject: "Email: PrismHR Case 00675872: Suggested Solution",
    assigned: "Automated Process",
    taskSubtype: "Email",
    comments: loggedComment("alea@infinitihr.com", "The fix shipped in May."),
  });
  assert.equal(laneOf(reply).flags.receipt, false);
  assert.equal(laneOf(reply).lane, "support");
});
