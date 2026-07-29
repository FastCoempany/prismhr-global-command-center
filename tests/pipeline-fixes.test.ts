import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  OPERATOR_NAME,
  actorsLine,
  inferLane,
  laneFor,
  normPerson,
} from "@/lib/intel/provenance";
import { peopleFor } from "@/lib/intel/people";
import { redactMoney } from "@/lib/intel/lexicon";
import { parseSfTimeline, scrubSecrets } from "@/lib/sf-timeline";
import { corpusFor, extractDealIntel } from "@/lib/intel/extract";
import { readDeal } from "@/lib/room/engine";

// ADVERSARIAL — the 25-finding repair batch. Each block attacks one seam the
// sweep proved broken: identity, provenance, the deal read, data integrity,
// and the capture path.

describe("identity — the operator is one person everywhere", () => {
  test("first-person forms normalize to the operator", () => {
    assert.equal(normPerson("You"), OPERATOR_NAME);
    assert.equal(normPerson("you"), OPERATOR_NAME);
    assert.equal(normPerson("Me"), OPERATOR_NAME);
  });
  test("Last, First flips; email tails drop; plain names pass", () => {
    assert.equal(normPerson("Bartolotti, Kim"), "Kim Bartolotti");
    assert.equal(normPerson("Kim Bartolotti <kim@x.com>"), "Kim Bartolotti");
    assert.equal(normPerson("Bryce Rowley"), "Bryce Rowley");
    // Two FULL names separated by a comma are a list, not one flipped person.
    assert.equal(
      normPerson("Kim Bartolotti, Lesha Cyphers"),
      "Kim Bartolotti, Lesha Cyphers",
    );
  });
  test("actorsLine lanes the operator's Outlook sends as mine", () => {
    const actors = actorsLine("You", "Bryce Rowley", 1);
    assert.equal(actors, `${OPERATOR_NAME} → Bryce Rowley +1`);
    assert.equal(laneFor(actors, "contract timing"), "mine");
  });
  test("the People index never mints 'You' or phantom half-people", () => {
    const rows = peopleFor(
      [
        {
          actors: "Bartolotti, Kim → Cyphers, Lesha",
          lane: "mine",
          createdAt: "2026-07-29T12:00:00Z",
          body: "✉ OL Jul 29 — Re: x · Bartolotti, Kim → Cyphers, Lesha",
        },
        {
          actors: "you → Kim Bartolotti",
          lane: "mine",
          createdAt: "2026-07-29T13:00:00Z",
          body: "note",
        },
      ] as never,
      [],
    );
    const names = rows.map((r) => r.name);
    assert.ok(!names.some((n) => /^you$/i.test(n)), "'You' was indexed");
    assert.ok(names.includes("Kim Bartolotti"), names.join(", "));
    assert.ok(!names.includes("Kim"), "half-person minted");
    assert.ok(!names.includes("Bartolotti"), "half-person minted");
  });
  test("legacy inference reads OL and TM heads, not just SF", () => {
    assert.equal(
      inferLane("account", "✉ OL Jul 29 — Re: x · Dana → Sam", "Dana → Sam"),
      "background",
    );
  });
});

describe("data integrity — what the record stores", () => {
  test("headcounts survive redaction; money still dies", () => {
    const out = redactMoney(
      "1,200 employees and a $34,000 deposit plus 3,000 contractors",
    );
    assert.ok(out.includes("1,200 employees"), out);
    assert.ok(out.includes("3,000 contractors"), out);
    assert.ok(!out.includes("34,000"), out);
  });
  test("bare comma-numbers without a quantity word still redact", () => {
    assert.ok(!redactMoney("we quoted 34,000 for year one").includes("34,000"));
  });
  test("secrets scrub wherever they sit in a line", () => {
    const out = scrubSecrets(
      "Recording > PrismHR Global 7-7 - Passcode: $NyT*&d9 via https://teams.microsoft.com/l/meetup-join/abc123",
    );
    assert.ok(!out.includes("$NyT*&d9"), out);
    assert.ok(!out.includes("meetup-join"), out);
  });
});

describe("capture — the rules parser refuses foreign dialects", () => {
  test("an OUTLOOK-stamped paste parses to zero entries", () => {
    const paste = `OUTLOOK THREAD - captured 7/29/2026\n\nWelcome to PrismHR\nBryce Rowley\nTue 7/28 9:26 PM\nbody text here that could fool the anchor grammar`;
    assert.deepEqual(parseSfTimeline(paste), []);
  });
});

describe("the deal read — filed intel finally moves the room", () => {
  const note = (body: string, actors: string, at: string) => ({
    id: "n",
    body,
    createdAt: at,
    kind: "account",
    actors,
  });
  test("your own sends classify outbound; client replies inbound", () => {
    const docs = corpusFor("a", "Acme", {
      acctNotes: [
        note(
          "✉ SF Jul 28 — Re: contract · Antaeus Coe → Bryce Rowley",
          "Antaeus Coe → Bryce Rowley",
          "2026-07-28T12:00:00Z",
        ),
        note(
          "✉ SF Jul 29 — Re: contract · Bryce Rowley → Antaeus Coe",
          "Bryce Rowley → Antaeus Coe",
          "2026-07-29T12:00:00Z",
        ),
      ],
    });
    const intel = extractDealIntel(docs);
    assert.equal(intel.lastOutbound, "2026-07-28T12:00:00Z");
    assert.equal(intel.lastInbound, "2026-07-29T12:00:00Z");
  });
  test("a newer pasted doc revises the seeded timing — the seed is a fallback", () => {
    const seeded = extractDealIntel([], {
      id: "a",
      names: ["Acme"],
      accountId: "a",
      asOf: "2026-07-01",
      facts: [],
      intelSeed: {
        timing: {
          value: { phrase: "Aug 6 leadership review", dateIso: "2026-08-06" },
          src: "digest",
          at: "2026-07-01",
        },
      },
    } as never);
    assert.ok(seeded.timing?.value.phrase.includes("Aug 6"));
    const revised = extractDealIntel(
      [
        {
          text: "board pushed it — now by Sept 15 at the earliest",
          at: "2026-07-29T12:00:00Z",
          src: "sf-activity 7/29",
        },
      ],
      {
        id: "a",
        names: ["Acme"],
        accountId: "a",
        asOf: "2026-07-01",
        facts: [],
        intelSeed: {
          timing: {
            value: { phrase: "Aug 6 leadership review", dateIso: "2026-08-06" },
            src: "digest",
            at: "2026-07-01",
          },
        },
      } as never,
    );
    assert.ok(
      !revised.timing?.value.phrase.includes("Aug 6"),
      revised.timing?.value.phrase,
    );
  });
  test("an inbound reply newer than the touch flips the court to YOU", () => {
    const read = readDeal({
      accountName: "Acme",
      step: { nodeKey: "demo", nodeLabel: "Demo", item: "Send recap", ageDays: 2 },
      timing: null,
      lastTouch: {
        at: "2026-07-20T12:00:00Z",
        awaitingReply: true,
        who: "Sarah",
      },
      lastInbound: { at: "2026-07-28T12:00:00Z", who: "Sarah" },
      lastRecordAt: "2026-07-28T12:00:00Z",
      now: new Date("2026-07-29T12:00:00Z"),
    });
    assert.equal(read.court.tone, "you");
    assert.ok(/SARAH WROTE/.test(read.court.line), read.court.line);
    assert.ok(/Answer Sarah/.test(read.move), read.move);
    assert.notEqual(read.health, "red"); // quiet-alarm suppressed — they answered
  });
  test("an expired dated wall reads red and says so", () => {
    const read = readDeal({
      accountName: "Acme",
      step: { nodeKey: "demo", nodeLabel: "Demo", item: "Close pricing", ageDays: 1 },
      timing: { phrase: "Aug 6 review", dateIso: "2026-08-06" },
      lastTouch: { at: "2026-08-09T12:00:00Z", awaitingReply: false, who: "Sarah" },
      lastRecordAt: "2026-08-09T12:00:00Z",
      now: new Date("2026-08-10T12:00:00Z"),
    });
    assert.equal(read.health, "red");
    assert.ok(/wall passed/.test(read.move), read.move);
  });
  test("no inbound, no wall — the old behavior holds exactly", () => {
    const read = readDeal({
      accountName: "Acme",
      step: { nodeKey: "demo", nodeLabel: "Demo", item: "Send recap", ageDays: 2 },
      timing: null,
      lastTouch: { at: "2026-07-27T12:00:00Z", awaitingReply: true, who: "Sarah" },
      lastRecordAt: "",
      now: new Date("2026-07-29T12:00:00Z"),
    });
    assert.equal(read.court.tone, "them");
  });
});
