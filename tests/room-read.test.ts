import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { climbFraction, readDeal } from "@/lib/room/engine";
import { DASH_NODE_KEYS } from "@/lib/dashboard/stages";
import { peopleFor } from "@/lib/intel/people";

// ADVERSARIAL PASS 3 — row assembly at the boundaries: every stage key the
// board can produce, health flips at exact thresholds, and the stakeholder
// hover under weird repository data.

const NOW = new Date("2026-07-28T17:00:00Z");

describe("climb — every real stage key lands inside the bar", () => {
  test("all seven stages produce ascending, in-bounds fractions", () => {
    let prev = -1;
    for (const key of DASH_NODE_KEYS) {
      const f = climbFraction(key, 0, 4);
      assert.ok(f >= 0 && f <= 1, key);
      assert.ok(f > prev, `${key} should climb past the stage before it`);
      prev = f;
    }
  });
  test("a fully-checked final stage caps at exactly 1", () => {
    const last = DASH_NODE_KEYS[DASH_NODE_KEYS.length - 1];
    assert.equal(climbFraction(last, 3, 3), 1);
  });
});

describe("health thresholds — flips happen at the boundary, not near it", () => {
  const step = { nodeKey: "demo", nodeLabel: "Demo", item: "Demo delivered", ageDays: 0 };
  const touchAt = (daysAgo: number) =>
    new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString();

  test("4 quiet days is amber territory at worst; 5 with a date is red", () => {
    const at4 = readDeal({
      accountName: "ESC",
      step,
      timing: { phrase: "Thursday demo", dateIso: "2026-07-31" },
      lastTouch: { at: touchAt(4), awaitingReply: true, who: "Kristen" },
      lastRecordAt: touchAt(1),
      now: NOW,
    });
    assert.notEqual(at4.health, "red");
    const at5 = readDeal({
      accountName: "ESC",
      step,
      timing: { phrase: "Thursday demo", dateIso: "2026-07-31" },
      lastTouch: { at: touchAt(5), awaitingReply: true, who: "Kristen" },
      lastRecordAt: touchAt(1),
      now: NOW,
    });
    assert.equal(at5.health, "red");
  });
  test("a replied thread is never 'their move'", () => {
    const r = readDeal({
      accountName: "ESC",
      step,
      timing: null,
      lastTouch: { at: touchAt(10), awaitingReply: false, who: "Kristen" },
      lastRecordAt: touchAt(1),
      now: NOW,
    });
    assert.equal(r.court.tone, "you");
  });
});

describe("stakeholder hover — weird repository data stays presentable", () => {
  test("empty actors, self-mentions, and shared inboxes never become people", () => {
    const people = peopleFor(
      [
        {
          actors: "",
          lane: "mine",
          body: "✎ note with no actors",
          createdAt: "2026-07-01T00:00:00Z",
        },
        {
          actors: "Antaeus Coe → customersupport@prismhr.com",
          lane: "mine",
          body: "✉ SF Jul 1 — case ping · Antaeus Coe → customersupport@prismhr.com",
          createdAt: "2026-07-01T00:00:00Z",
        },
        {
          actors: "no-reply@prismhr.com → Kristen Wolasz",
          lane: "background",
          body: "✉ SF Jul 2 — auto · no-reply@prismhr.com → Kristen Wolasz",
          createdAt: "2026-07-02T00:00:00Z",
        },
      ],
      [],
    );
    assert.ok(!people.some((p) => /antaeus|customersupport|no-?reply/i.test(p.name)));
    assert.ok(people.some((p) => p.name === "Kristen Wolasz"));
  });
  test("a flood of actors is capped, sorted, and stable", () => {
    const notes = Array.from({ length: 200 }, (_, i) => ({
      actors: `Person ${i % 40} → Person ${(i + 1) % 40}`,
      lane: (i % 2 ? "mine" : "background") as "mine" | "background",
      body: `✉ SF Jul 1 — thread ${i} · Person ${i % 40} → Person ${(i + 1) % 40}`,
      createdAt: `2026-07-${String((i % 27) + 1).padStart(2, "0")}T00:00:00Z`,
    }));
    const people = peopleFor(notes, [], 12);
    assert.ok(people.length <= 12);
    for (let i = 1; i < people.length; i++)
      assert.ok(people[i - 1].count >= people[i].count);
  });
});
