import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  BRIEF_CAP,
  buildMorningBrief,
  businessDaysBetween,
  type BriefCard,
  type BriefInput,
} from "@/lib/intel/brief";
import type { CorpusDoc } from "@/lib/intel/extract";
import { EMPTY_INTEL, type DealIntel } from "@/lib/intel/types";

const NOW = new Date("2026-07-27T15:00:00Z"); // a Monday
const DAY_KEY = NOW.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });

const card = (over: Partial<BriefCard> = {}): BriefCard => ({
  id: "c1",
  name: "Acme",
  accountId: "",
  states: { needs_analysis: "active" },
  ...over,
});

const intel = (over: Partial<DealIntel> = {}): DealIntel => ({
  ...structuredClone(EMPTY_INTEL),
  ...over,
});

const doc = (text: string, at: string, over: Partial<CorpusDoc> = {}): CorpusDoc => ({
  text,
  at,
  src: `note ${at.slice(5, 10)}`,
  ...over,
});

// One-card input; docs must be newest-first (corpusFor's contract).
const input = (over: {
  card?: Partial<BriefCard>;
  docs?: CorpusDoc[];
  intel?: Partial<DealIntel>;
  sugg?: BriefInput["suggByCard"][string];
  keys?: string[];
}): BriefInput => {
  const c = card(over.card);
  return {
    cards: [c],
    docsByCard: { [c.id]: over.docs ?? [doc("recent movement", "2026-07-26T12:00:00Z")] },
    intelByCard: { [c.id]: intel(over.intel) },
    suggByCard: { [c.id]: over.sugg ?? [] },
    dispositionKeys: new Set(over.keys ?? []),
    now: NOW,
  };
};

const ids = (inp: BriefInput) => buildMorningBrief(inp).map((r) => r.ruleId);

describe("businessDaysBetween", () => {
  test("skips weekends", () => {
    // Fri 7/24 → Mon 7/27 crosses Sat+Sun: one business day (Monday).
    assert.equal(businessDaysBetween("2026-07-24T12:00:00Z", NOW), 1);
    assert.equal(businessDaysBetween("2026-07-20T12:00:00Z", NOW), 5);
    assert.equal(businessDaysBetween("2026-07-28T12:00:00Z", NOW), 0);
  });
});

describe("buildMorningBrief rules", () => {
  test("reply-waiting fires when inbound outruns outbound on a live deal", () => {
    const inp = input({
      docs: [
        doc("thanks — see attached", "2026-07-26T12:00:00Z", {
          direction: "in",
          people: ["Bryce Rowley", "Antaeus Coe"],
        }),
      ],
      intel: {
        lastInbound: "2026-07-26T12:00:00Z",
        lastOutbound: "2026-07-24T12:00:00Z",
      },
    });
    const rows = buildMorningBrief(inp);
    const row = rows.find((r) => r.ruleId === "reply-waiting")!;
    assert.ok(row);
    assert.equal(row.weight, 100);
    assert.match(row.text, /Bryce Rowley wrote yesterday — reply/);
    assert.equal(row.control.kind, "mailto");
  });

  test("reply-waiting stays quiet when I replied last or card is idle", () => {
    assert.ok(
      !ids(
        input({
          intel: {
            lastInbound: "2026-07-24T12:00:00Z",
            lastOutbound: "2026-07-26T12:00:00Z",
          },
        }),
      ).includes("reply-waiting"),
    );
    assert.ok(
      !ids(
        input({
          card: { states: {} },
          intel: { lastInbound: "2026-07-26T12:00:00Z" },
        }),
      ).includes("reply-waiting"),
    );
  });

  test("meeting-ask fires on a times-ask in the latest inbound", () => {
    const inp = input({
      docs: [
        doc("are you available Wed or Fri for a call?", "2026-07-27T12:00:00Z", {
          direction: "in",
          people: ["Bill Laffey", "Antaeus Coe"],
        }),
      ],
    });
    const row = buildMorningBrief(inp).find((r) => r.ruleId === "meeting-ask")!;
    assert.ok(row);
    assert.equal(row.weight, 95);
    assert.match(row.text, /Bill Laffey asked for times/);
    assert.match(row.control.href ?? "", /^mailto:/);
  });

  test("contract-chase: paper out + quiet 2 business days", () => {
    const inp = input({
      card: { states: { contract: "active" } },
      docs: [doc("contracts for signature sent to Bryce", "2026-07-21T12:00:00Z")],
      intel: { lastInbound: "2026-07-22T12:00:00Z" },
    });
    const row = buildMorningBrief(inp).find((r) => r.ruleId === "contract-chase")!;
    assert.ok(row);
    assert.equal(row.weight, 90);
    assert.match(row.text, /chase signature/);
  });

  test("contract-chase stays quiet when they answered recently", () => {
    const inp = input({
      card: { states: { contract: "active" } },
      docs: [doc("contracts for signature sent", "2026-07-21T12:00:00Z")],
      intel: { lastInbound: "2026-07-27T10:00:00Z" },
    });
    assert.ok(!ids(inp).includes("contract-chase"));
  });

  test("deadline-near fires inside 7 days, not outside", () => {
    const near = input({
      intel: {
        timing: {
          value: { phrase: "leadership review", dateIso: "2026-07-30" },
          src: "digest 07-27",
          at: "2026-07-27T00:00:00Z",
        },
      },
    });
    const row = buildMorningBrief(near).find((r) => r.ruleId === "deadline-near")!;
    assert.ok(row);
    assert.match(row.text, /what do they need in hand\?/);
    assert.equal(row.control.kind, "copy");
    const far = input({
      intel: {
        timing: {
          value: { phrase: "go-live", dateIso: "2026-09-01" },
          src: "digest 07-27",
          at: "2026-07-27T00:00:00Z",
        },
      },
    });
    assert.ok(!ids(far).includes("deadline-near"));
  });

  test("owed-item fires on my unkept promise", () => {
    const inp = input({
      docs: [
        doc(
          "I'll send over the implementation one-pager tomorrow",
          "2026-07-25T12:00:00Z",
          {
            direction: "out",
            people: ["Antaeus Coe", "Bryce Rowley"],
          },
        ),
      ],
    });
    const row = buildMorningBrief(inp).find((r) => r.ruleId === "owed-item")!;
    assert.ok(row);
    assert.equal(row.weight, 80);
    assert.match(row.text, /you owe Bryce Rowley/);
  });

  test("suggested-checks summarizes pending board evidence", () => {
    const inp = input({
      sugg: [
        {
          node: "demo",
          itemIdx: 3,
          reason: "demo evidence · note 7/7",
          srcAt: "2026-07-07T00:00:00Z",
        },
        {
          node: "contract",
          itemIdx: 2,
          reason: "paper moving",
          srcAt: "2026-07-21T00:00:00Z",
        },
      ],
    });
    const row = buildMorningBrief(inp).find((r) => r.ruleId === "suggested-checks")!;
    assert.ok(row);
    assert.match(row.text, /2 stage checks look satisfiable/);
    assert.equal(row.control.kind, "confirmCheck");
    assert.deepEqual(row.control.check, { cardId: "c1", node: "demo", idx: 3 });
  });

  test("single-thread nudges with the multithread relay line", () => {
    const inp = input({
      intel: { threads: { people: ["Chassie"], execSeen: false, opsSeen: false } },
    });
    const row = buildMorningBrief(inp).find((r) => r.ruleId === "single-thread")!;
    assert.ok(row);
    assert.match(row.text, /rides on Chassie alone/);
    assert.match(row.control.payload ?? "", /who else/);
  });

  test("stale-deal fires after 5 quiet business days on a live card", () => {
    const inp = input({ docs: [doc("old note", "2026-07-17T12:00:00Z")] });
    const row = buildMorningBrief(inp).find((r) => r.ruleId === "stale-deal")!;
    assert.ok(row);
    assert.equal(row.weight, 40);
    assert.ok(!ids(input({})).includes("stale-deal")); // fresh doc → quiet
  });

  test("rows come back sorted by weight desc; cap constant is 8", () => {
    const inp = input({
      docs: [
        doc("are you available this week?", "2026-07-26T12:00:00Z", {
          direction: "in",
          people: ["Bryce Rowley", "Antaeus Coe"],
        }),
      ],
      intel: {
        lastInbound: "2026-07-26T12:00:00Z",
        threads: { people: ["Bryce Rowley"], execSeen: false, opsSeen: false },
      },
    });
    const rows = buildMorningBrief(inp);
    assert.ok(rows.length >= 3);
    for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].weight >= rows[i].weight);
    assert.equal(BRIEF_CAP, 8);
  });

  test("done is day-scoped, mute is permanent", () => {
    const base = {
      intel: {
        lastInbound: "2026-07-26T12:00:00Z",
        lastOutbound: "2026-07-24T12:00:00Z",
      },
    };
    assert.ok(
      !ids(input({ ...base, keys: [`brief-done:reply-waiting:c1:${DAY_KEY}`] })).includes(
        "reply-waiting",
      ),
    );
    // A stale done key (yesterday) does NOT suppress today.
    assert.ok(
      ids(input({ ...base, keys: ["brief-done:reply-waiting:c1:2026-07-26"] })).includes(
        "reply-waiting",
      ),
    );
    assert.ok(
      !ids(input({ ...base, keys: ["brief-mute:reply-waiting:c1"] })).includes(
        "reply-waiting",
      ),
    );
  });
});
