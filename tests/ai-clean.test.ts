import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeAiResult } from "@/lib/intel/ai-clean";

test("sanitize: coerces a well-formed reply through intact", () => {
  const r = sanitizeAiResult({
    entries: [
      {
        kind: "email",
        subject: "RE: PrismOne",
        from: "Kim Bartolotti",
        to: "Lesha Cyphers",
        others: 1,
        timeLabel: "4:11 PM",
        dayLabel: "Jul 22",
        dayIso: "2025-07-22",
        body: "Wed at 9:30am would be great.",
      },
    ],
    signals: ["Implied deadline: Wednesday 9:30am meeting"],
  });
  assert.equal(r.entries.length, 1);
  assert.equal(r.entries[0].kind, "email");
  assert.equal(r.entries[0].dayIso, "2025-07-22");
  assert.equal(r.entries[0].others, 1);
  assert.equal(r.signals.length, 1);
});

test("sanitize: money is redacted from every field, including signals", () => {
  const r = sanitizeAiResult({
    entries: [
      {
        kind: "call",
        subject: "Pricing at $385 PEPM",
        from: "A",
        to: "B",
        others: 0,
        timeLabel: "",
        dayLabel: "",
        dayIso: "",
        body: "They asked about the $550 tier and 1,200 seats.",
      },
    ],
    signals: ["Quoted $165 for the add-on"],
  });
  assert.ok(!/385|550|165|1,200/.test(JSON.stringify(r)));
});

test("sanitize: malformed shapes degrade instead of throwing", () => {
  assert.deepEqual(sanitizeAiResult(null), { entries: [], signals: [] });
  assert.deepEqual(sanitizeAiResult("nope"), { entries: [], signals: [] });
  const r = sanitizeAiResult({
    entries: [
      null,
      {
        kind: "meeting", // unknown kind → email
        subject: 42, // wrong type → ""
        others: "three", // wrong type → 0
        dayIso: "July 22", // not ISO → ""
        body: "x".repeat(2000), // over cap → sliced
      },
    ],
    signals: [7, "", "real signal"],
  });
  assert.equal(r.entries.length, 1);
  assert.equal(r.entries[0].kind, "email");
  assert.equal(r.entries[0].subject, "");
  assert.equal(r.entries[0].others, 0);
  assert.equal(r.entries[0].dayIso, "");
  assert.equal(r.entries[0].body.length, 800);
  assert.deepEqual(r.signals, ["real signal"]);
});

test("sanitize: caps entry count at 40 and clamps others", () => {
  // bodies carry substance — body-less stubs now die at the noise gate
  const many = Array.from({ length: 60 }, (_, i) => ({
    kind: "task",
    subject: `t${i}`,
    from: "",
    to: "",
    others: 500,
    timeLabel: "",
    dayLabel: "",
    dayIso: "",
    body: `real substance ${i}`,
  }));
  const r = sanitizeAiResult({ entries: many, signals: [] });
  assert.equal(r.entries.length, 40);
  assert.equal(r.entries[0].others, 99);
});
