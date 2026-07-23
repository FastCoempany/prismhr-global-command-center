import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { parseSfTimeline, resolveDay } from "@/lib/sf-timeline";

// Reference "now": Thu Jul 23 2026, mid-day Chicago (17:00 UTC).
const NOW = new Date("2026-07-23T17:00:00Z");

describe("sf timeline parser", () => {
  test("parses an email entry with subject, chips, stamp, and body", () => {
    const text = `
July • 2026
This Month
PrismHR - Canadian Based Payroll discussion
Insights Found
Russ Jones to Rachael Brown
+ 2 others
3:47 PM | Jul 21
Competition Mentioned
Scheduling Requested
Good afternoon,
Antaeus Coe shared that ESC is currently evaluating an opportunity with an existing client.
My role is simply to better understand your needs and help determine the most appropriate path.
View full email
`;
    const [e, ...rest] = parseSfTimeline(text, NOW);
    assert.equal(rest.length, 0);
    assert.equal(e.kind, "email");
    assert.equal(e.subject, "PrismHR - Canadian Based Payroll discussion");
    assert.equal(e.from, "Russ Jones");
    assert.equal(e.to, "Rachael Brown");
    assert.equal(e.others, 2);
    assert.equal(e.timeLabel, "3:47 PM");
    assert.equal(e.dayLabel, "Jul 21");
    assert.equal(e.dayIso, "2026-07-21");
    // Body keeps real sentences (even ones containing " to "), drops chips/noise.
    assert.match(e.body, /Good afternoon,/);
    assert.match(e.body, /My role is simply to better understand/);
    assert.doesNotMatch(e.body, /Competition Mentioned|View full email/);
  });

  test("parses several entries, tasks included, and splits on next subject", () => {
    const text = `
Re: Side bar
Antaeus Coe to Bryce Rowley + 4 others
7:59 PM | Yesterday
Re: Side bar
Aleks Boruk to Bryce Rowley + 4 others
5:47 PM | Yesterday
Advocate Pay meeting
Rick Torrence to Bryce Rowley + 2 others
8:15 AM | Yesterday
June • 2026
Last Month
This lead stopped by the Basic Capital Retirement, Human Interest booth.
Eric Ronci had a task with Andy Aziz
Jun 29
`;
    const es = parseSfTimeline(text, NOW);
    assert.equal(es.length, 4);
    assert.deepEqual(
      es.map((e) => e.from),
      ["Antaeus Coe", "Aleks Boruk", "Rick Torrence", "Eric Ronci"],
    );
    assert.equal(es[0].dayIso, "2026-07-22"); // Yesterday from Jul 23
    assert.equal(es[2].subject, "Advocate Pay meeting");
    assert.equal(es[3].kind, "task");
    assert.equal(es[3].subject.startsWith("This lead stopped by"), true);
    assert.equal(es[3].dayIso, "2026-06-29");
    // No body bleed between adjacent entries.
    assert.equal(es[0].body, "");
  });

  test("body sentences with ' to ' never spawn phantom entries", () => {
    const text = `
Quick note
Antaeus Coe to Hatton Dawes
2:00 PM | Today
We plan to move the demo to Wednesday and to invite the broader team.
`;
    const es = parseSfTimeline(text, NOW);
    assert.equal(es.length, 1);
    assert.match(es[0].body, /move the demo to Wednesday/);
  });

  test("resolveDay: relative labels and year inference from Chicago", () => {
    assert.equal(resolveDay("Today", NOW), "2026-07-23");
    assert.equal(resolveDay("Yesterday", NOW), "2026-07-22");
    assert.equal(resolveDay("Jun 29", NOW), "2026-06-29");
    assert.equal(resolveDay("Dec 15", NOW), "2025-12-15"); // future month → last year
    assert.equal(resolveDay("Jan 5, 2024", NOW), "2024-01-05");
    assert.equal(resolveDay("6/29/2026", NOW), "2026-06-29");
    assert.equal(resolveDay("nonsense", NOW), "");
  });
});
