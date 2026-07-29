import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { dropNoiseEntries, isNoiseEntry, sanitizeAiResult } from "@/lib/intel/ai-clean";
import type { TimelineEntry } from "@/lib/sf-timeline";

// ADVERSARIAL — the noise gate between a raw SF paste and the record. The
// founder's real timeline junk (survey tracking, header-only emails,
// no-subject stubs) must die here; real substance must survive.

function entry(over: Partial<TimelineEntry>): TimelineEntry {
  return {
    kind: "email",
    subject: "Re: something",
    from: "A",
    to: "B",
    others: 0,
    timeLabel: "",
    dayLabel: "Jul 22",
    dayIso: "2026-07-22",
    body: "",
    ...over,
  };
}

describe("isNoiseEntry — the founder's actual junk dies at the gate", () => {
  test("header-only emails (subject, names, time, no body) are noise", () => {
    assert.ok(isNoiseEntry(entry({ subject: "Re: Side bar", body: "" })));
    assert.ok(isNoiseEntry(entry({ subject: "Advocate Pay meeting", body: "  " })));
  });
  test("survey/tracking artifacts are noise even WITH a body", () => {
    for (const s of [
      "Clicked Thank You for Supporting LIVE 2026 – Let's Make 2027 Even Better! (Survey)",
      "Opened Thank You for Supporting LIVE 2026 (Survey)",
      "Sent Thank You for Supporting LIVE 2026 (Survey)",
    ]) {
      assert.ok(
        isNoiseEntry(entry({ kind: "task", subject: s, body: "Marked as Complete" })),
        s,
      );
    }
    assert.ok(
      isNoiseEntry(
        entry({
          kind: "task",
          subject: "This lead stopped by the Basic Capital booth at PrismLIVE 2026",
          body: "Marked as Complete",
        }),
      ),
    );
  });
  test("no-subject and not-shared stubs are noise", () => {
    assert.ok(isNoiseEntry(entry({ subject: "[No subject]", body: "" })));
    assert.ok(
      isNoiseEntry(entry({ subject: "Emails are not shared with you", body: "" })),
    );
  });
  test("substance survives: bodied emails, logged calls, distilled meetings", () => {
    assert.ok(
      !isNoiseEntry(
        entry({
          subject: "RE: Prism | Advocate Pay | Bulgaria",
          body: "That works. Book time with Andy Aziz.",
        }),
      ),
    );
    assert.ok(
      !isNoiseEntry(entry({ kind: "call", subject: "Call with Bryce", body: "" })),
    );
    assert.ok(
      !isNoiseEntry(
        entry({
          kind: "task",
          subject: "Revenue Growth Meeting",
          body: "Prefers SmartPay/InsurePay (BoR stays). Owed: SmartPay follow-up — @Lucas.",
        }),
      ),
    );
  });
});

describe("the gate holds on both paths", () => {
  test("sanitizeAiResult filters noise the model lets slip", () => {
    const out = sanitizeAiResult({
      entries: [
        entry({ subject: "Re: Side bar", body: "" }),
        entry({
          subject: "RE: Bulgaria",
          body: "Decision: move forward; Andy Aziz (COO) owns it.",
        }),
        entry({ kind: "task", subject: "Clicked Whatever (Survey)", body: "x" }),
      ],
      signals: [],
    });
    assert.equal(out.entries.length, 1);
    assert.ok(out.entries[0].body.includes("Andy Aziz"));
  });
  test("dropNoiseEntries never throws on hostile shapes and keeps order", () => {
    const kept = dropNoiseEntries([
      entry({ subject: "", body: "real note first" }),
      entry({ subject: "[No subject]", body: "" }),
      entry({ subject: "", body: "real note second" }),
    ]);
    assert.deepEqual(
      kept.map((e) => e.body),
      ["real note first", "real note second"],
    );
  });
});
