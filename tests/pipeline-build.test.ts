// The Pipeline report end to end — the assembler and the plain text it copies
// (founder-decreed 2026-09-08, shipped to the HomeRoom's right margin).
//
// The fixtures are the real Simploy record, trimmed: the 9/2 call read with
// its Owed line, the three commitments he made on that call, the July
// scheduling items the call itself overtook, and the recruitment handoff that
// belongs to another team. Every rule the report has was written from this
// one account going wrong, so it is the account the tests are built on.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  buildPipelineReport,
  rankPipeline,
  quotesIn,
  tidyPeople,
  type PipelineAccount,
  type PipelineRecord,
} from "../src/lib/pipeline/build";
import {
  recordToText,
  reportToText,
  lineKey,
  closeText,
  arrivalWords,
  ARRIVAL,
} from "../src/lib/pipeline/plain";

const NOW = new Date("2026-09-08T12:00:00Z");

const note = (o: Partial<PipelineAccount["notes"][number]>) => ({
  id: o.id ?? "n1",
  createdAt: o.createdAt ?? "2026-09-02T18:00:00Z",
  body: o.body ?? "",
  lane: o.lane ?? ("mine" as const),
  actors: o.actors ?? "",
  source: o.source ?? "",
});
const todo = (o: Partial<PipelineAccount["todos"][number]>) => ({
  id: o.id ?? "t1",
  // An open commitment carries Today's own action marker on its own line;
  // without it the row is a note, and the sheet is right to leave it out.
  body: `${o.body ?? ""}\n⚑[k:a]`,
  accountId: o.accountId ?? "acc",
  createdAt: o.createdAt ?? "2026-09-02T18:00:00Z",
  remindAt: o.remindAt ?? "",
  updatedAt: o.updatedAt ?? o.createdAt ?? "2026-09-02T18:00:00Z",
  done: o.done ?? false,
});

const CALL_BODY = [
  "☎ CT Today 1:01 PM — Reseller path + GP-incumbent India client · Antaeus Coe → Chassie Smith",
  "Wants the reseller route with own markup. Target client: moving company, ~1 yr on Globalization Partners, ~4–5 India admin workers, likely EOR; client asks 'can't this be in one place?'. Suspected month-to-month. Open to a slight premium for consolidation. No urgency — 'slow and steady wins the race'. Owed: invoices + EOR confirm — @Chassie; agreements — @Antaeus.",
].join("\n");

function simploy(over: Partial<PipelineAccount> = {}): PipelineAccount {
  return {
    id: "acc",
    name: "Simploy",
    csm: "Lesha Cyphers",
    stageLabel: "",
    notes: [
      note({
        id: "call",
        source: "call-ai",
        actors: "Antaeus Coe → Chassie Smith",
        body: CALL_BODY,
      }),
    ],
    todos: [
      todo({
        id: "a",
        body: "Send the reseller agreement and the PEO-to-client agreement",
        createdAt: "2026-09-02T18:00:00Z",
      }),
      todo({
        id: "b",
        body: "Send the standard minimum-ask question list needed to quote EOR pricing",
        createdAt: "2026-09-02T18:00:00Z",
      }),
      todo({
        id: "c",
        body: "Connect Chassie with PrismHR's recruitment specialist",
        createdAt: "2026-08-25T18:00:00Z",
      }),
      todo({
        id: "d",
        body: "Send demo calendar options for Tue Jul 28 or Wed Jul 29",
        createdAt: "2026-08-25T18:00:00Z",
      }),
    ],
    gaps: ["What commercial structure does Simploy expect for the reseller arrangement?"],
    support: {
      total: 75,
      spike: { day: "2026-08-17", n: 9 },
      themes: [
        { label: "Update Provided", n: 46, firstDay: "2026-06-29", lastDay: "2026-08-27" },
      ],
    },
    actors: [
      { name: "Mike Paschal", kind: "colleague", lane: "support", n: 13 },
      { name: "Nihar Kulkarni", kind: "account", lane: "support", n: 41 },
    ],
    ...over,
  };
}

const build = (accounts: PipelineAccount[]): PipelineRecord[] =>
  buildPipelineReport({ accounts, csms: ["Lesha Cyphers", "Anika Steenstra"], me: "Antaeus Coe", now: NOW });

describe("the record reads what the record says", () => {
  const [r] = build([simploy()]);

  test("outcomes are the call's decisions, not its topics", () => {
    assert.ok(r.outcomes.some((o) => /reseller route with own markup/.test(o)));
    assert.ok(r.outcomes.some((o) => /month-to-month/.test(o)));
    assert.ok(!r.outcomes.some((o) => /^Owed:/i.test(o)));
  });
  test("their own words survive verbatim, apostrophes and all", () => {
    assert.deepEqual(r.theirWords, [
      "can't this be in one place?",
      "slow and steady wins the race",
    ]);
  });
  test("the next steps are the ones he made on the last call", () => {
    assert.equal(r.ourNext.length, 2);
    assert.ok(r.ourNext.every((n) => n.opened === "2026-09-02"));
    assert.ok(r.ourNext.some((n) => /reseller agreement/.test(n.text)));
  });
  test("another team's handoff is FYI, never his next step", () => {
    assert.ok(!r.ourNext.some((n) => /recruitment specialist/.test(n.text)));
    assert.equal(r.handoffs.length, 1);
    assert.match(r.handoffs[0], /recruitment specialist/);
  });
  test("a commitment the call overtook is folded, not deleted", () => {
    assert.ok(r.overtaken.some((o) => /Jul 28/.test(o.text)));
    assert.ok(!r.ourNext.some((o) => /Jul 28/.test(o.text)));
  });
  test("their turn is read, and it runs first", () => {
    assert.equal(r.theirSide[0].who, "Chassie");
    assert.match(r.theirSide[0].text, /invoices/);
    assert.equal(r.gated, true);
  });
  test("the FYI line names who on our side is carrying it", () => {
    assert.match(r.fyi, /^75 support cases 6\/29–8\/27/);
    assert.equal(r.fyiWho, "Mike Paschal is handling it");
    assert.ok(!r.owners.some((o) => o.name === "Nihar Kulkarni"), "the client is not ours");
  });
  test("the CSM is never a contact", () => {
    assert.ok(!r.contacts.some((c) => /Lesha/i.test(c.name)));
  });
  test("Unknown is a value, never a silent blank", () => {
    assert.equal(r.stage, null, "no board stage means the field renders Unknown");
    assert.equal(r.incumbent?.v, "Globalization Partners");
  });
});

describe("the report degrades honestly", () => {
  test("an account with nothing on it still produces a record", () => {
    const bare: PipelineAccount = {
      id: "empty",
      name: "Quiet Co",
      csm: "",
      stageLabel: "",
      notes: [],
      todos: [],
      gaps: [],
      support: null,
      actors: [],
    };
    const [r] = build([bare]);
    assert.equal(r.account, "Quiet Co");
    assert.deepEqual(r.ourNext, []);
    assert.deepEqual(r.outcomes, []);
    assert.equal(r.lastTouch, null);
    assert.equal(r.fyi, "");
    assert.equal(r.fyiWho, "");
    assert.equal(r.gated, false, "nothing owed by them gates nothing");
  });
  test("no next step and nobody's turn is the finding, in the text too", () => {
    const bare = { ...simploy(), todos: [], notes: [] };
    const [r] = build([bare]);
    assert.match(recordToText(r), /Next step: None set — that is the finding/);
  });
  test("a record never carries a money figure", () => {
    const withMoney = simploy({
      notes: [
        note({
          id: "call",
          source: "call-ai",
          actors: "Antaeus Coe → Chassie Smith",
          body: "head\nThey agreed to $4,620/mo and a $8,400 one-time fee.",
        }),
      ],
    });
    const [r] = build([withMoney]);
    const text = recordToText(r);
    assert.ok(!/\$\s?\d/.test(text), `money reached the report: ${text}`);
  });
});

describe("what needs him most comes first", () => {
  test("a blown promise outranks a quiet account", () => {
    const urgent = simploy({
      id: "urgent",
      name: "Urgent Co",
      todos: [
        {
          id: "u",
          // A blown wall is the action's own date tag — the day he named.
          body: "Send the pricing\n⚑[k:a,d:2026-08-18]",
          accountId: "urgent",
          createdAt: "2026-08-18T12:00:00Z",
          remindAt: "",
          updatedAt: "2026-08-18T12:00:00Z",
          done: false,
        },
      ],
      notes: [],
    });
    const quiet: PipelineAccount = {
      ...simploy({ id: "quiet", name: "Quiet Co" }),
      notes: [],
      todos: [],
    };
    const ranked = rankPipeline(build([quiet, urgent]));
    assert.equal(ranked[0].account, "Urgent Co");
  });
});

describe("the plain text is what he pastes", () => {
  const [r] = build([simploy()]);

  test("fixed label, value, newline — and the account heads it", () => {
    const lines = recordToText(r).split("\n");
    assert.equal(lines[0], "SIMPLOY");
    assert.match(lines[1], /CSM Lesha Cyphers/);
    assert.ok(lines.some((l) => l.startsWith("Opportunities:") || l.startsWith("Opportunities: ")));
  });
  test("their move is printed before his, because it runs first", () => {
    const t = recordToText(r);
    assert.ok(t.indexOf("Their move first") < t.indexOf("Next from me"));
    assert.ok(!/^Waiting on:/m.test(t), "the gated record says it once, not twice");
  });
  test("an edit rides into the copy", () => {
    const k = lineKey(r.id, "next", 0);
    const out = recordToText(r, { [k]: "Send the agreements to Simploy legal" });
    assert.match(out, /Send the agreements to Simploy legal/);
  });
  test("a struck line leaves the copy", () => {
    const k = lineKey(r.id, "next", 0);
    const before = recordToText(r);
    const after = recordToText(r, { [k]: null });
    assert.ok(before.includes(r.ourNext[0].text));
    assert.ok(!after.includes(r.ourNext[0].text));
  });
  test("a field with every line struck leaves with them", () => {
    const overlay = Object.fromEntries(
      r.unknowns.map((_, i) => [lineKey(r.id, "unknown", i), null]),
    );
    assert.ok(!/^Unknowns/m.test(recordToText(r, overlay)), "no empty heading");
  });
  test("the whole report heads with the day and rules between records", () => {
    const rows = build([simploy(), simploy({ id: "b", name: "Other Co" })]);
    const t = reportToText(rows, {}, "Mon 9/8");
    assert.match(t, /^PIPELINE STATUS · Mon 9\/8/);
    assert.equal(t.split("———").length, 2, "one rule between two records");
  });
  test("a phrase close date is never run through a date formatter", () => {
    // "asap" once rendered as 0/0.
    assert.equal(closeText({ v: "asap", src: "x", derived: true, passed: false }), "asap");
    assert.equal(closeText({ v: "2026-08-06", src: "x", passed: true }), "8/6");
    assert.equal(closeText(null), "");
  });
});

describe("the small readers", () => {
  test("quotesIn never opens on a contraction", () => {
    assert.deepEqual(quotesIn("client asks 'can't this be in one place?' today"), [
      "can't this be in one place?",
    ]);
  });
  test("tidyPeople drops the duplicate, the credential, and the department", () => {
    assert.deepEqual(tidyPeople(["Tom Boell", "Tom", "PHR", "Marketing", "Sarah Pegram"]), [
      "Tom Boell",
      "Sarah Pegram",
    ]);
  });
});

// The arrival budget. His acceptance criterion is a record read aloud in under
// twenty seconds — about sixty words — and the full Simploy record is 277, all
// the weight in Outcomes, Unknowns and the FYI lines. The click-depth law
// decides: the budget wins and the intelligence moves a click down. Copy is
// not arrival, and is deliberately unbounded.
describe("the arrival budget is a hard limit", () => {
  const [r] = build([simploy()]);

  test("the spine arrives well inside twenty seconds", () => {
    assert.ok(arrivalWords(r) <= 90, `${arrivalWords(r)} words on arrival`);
  });
  test("the depth is not on the spine", () => {
    const words = arrivalWords(r);
    const full = recordToText(r).split(/\s+/).length;
    assert.ok(full > words * 1.5, "the fold is actually holding something back");
  });
  test("what he pastes is the whole record, fold and all", () => {
    const t = recordToText(r);
    assert.match(t, /Unknowns:/);
    assert.match(t, /Outcomes:/);
    assert.match(t, /FYI · elsewhere:/);
  });
  test("every arrival label is one the spine actually renders", () => {
    // A label in ARRIVAL that the text never writes would silently widen the
    // budget check into a no-op.
    const t = recordToText(r);
    const seen = ARRIVAL.filter((l) => t.includes(`${l}:`));
    assert.ok(seen.length >= 8, `only ${seen.length} arrival labels rendered`);
  });
  test("a struck line shrinks the arrival, not just the copy", () => {
    const before = arrivalWords(r);
    const after = arrivalWords(r, { [lineKey(r.id, "opp", 0)]: null });
    assert.ok(after < before);
  });
});
