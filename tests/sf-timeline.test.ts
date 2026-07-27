import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { cleanSfPaste, parseSfTimeline, resolveDay } from "@/lib/sf-timeline";

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

describe("Lightning variants + paste cleaning", () => {
  test("'sent an email to' anchors parse as email entries", () => {
    const text = `Re: Wednesday call
Bill Laffey sent an email to Antaeus Coe
9:14 AM | Jul 27
Wed or Fri works on my end — send an invite.
`;
    const es = parseSfTimeline(text, NOW);
    assert.equal(es.length, 1);
    assert.equal(es[0].kind, "email");
    assert.equal(es[0].from, "Bill Laffey");
    assert.equal(es[0].to, "Antaeus Coe");
    assert.match(es[0].body, /send an invite/);
  });

  test("cleanSfPaste strips thread tokens, bare SF ids, skip links", () => {
    const dirty = [
      "To update or check the status of Case #00685327:",
      "thread::p4gG42cbcVy2-FRBDOEIHgE::",
      "00X2A000002B6c2UAC",
      "Skip to the top of the activity timeline",
      "Expand All",
      "Real sentence that stays.",
      "Congratulations", // 15 letters, no digit — must survive
    ].join("\n");
    const clean = cleanSfPaste(dirty);
    assert.ok(clean.includes("Case #00685327"));
    assert.ok(clean.includes("Real sentence that stays."));
    assert.ok(clean.includes("Congratulations"));
    assert.ok(!clean.includes("thread::"));
    assert.ok(!clean.includes("00X2A000002B6c2UAC"));
    assert.ok(!clean.includes("Skip to the top"));
    assert.ok(!clean.includes("Expand All"));
  });
});

describe("ESC case-feed format (real 7/27 capture shape)", () => {
  const RAW = `Skip to the bottom of the activity timeline
Only show activities with insights
Only show activities with insights
Filters: Within 2 months • All activities • Logged calls, Email, Events, List email, Tasks, and LinkedIn
Timeline Settings
Refresh • Collapse All • View All
Upcoming & Overdue
Details for PrismHR Case 00685327: Additional Information Requested [ thread::p4gG42cbcVy2-FRBDOElHgE:: ]
Prism/ESC: PrismOne Timeline
Prism/ESC: PrismOne Timeline
Jul 30, 2025
Overdue
Show more actions - Prism/ESC: PrismOne Timeline
Lesha Cyphers has an upcoming task
Priority
Normal
Created By
HubSpot Integration User, 6/23/2026, 1:13 PM
Description
While we knew the enhanced security was coming, we find the schedule very aggressive.
Lesha Cyphers is inviting you to a scheduled Zoom meeting.
Join Zoom Meeting
https://peo.zoom.us/j/82537740732?pwd=x
Meeting ID: 825 3774 0732
Passcode: 052296
One tap mobile
+13017158592,,82537740732#,,,,*052296# US (Washington DC)
Dial by your location
• +1 312 626 6799 US (Chicago)
Find your local number: https://peo.zoom.us/u/kbe3tZlgZZ
July • 2026
This Month
Details for
PrismHR Case 00685421: Suggested Solution [ thread::CzwvIr--evC19rUUXE871QE:: ]
5:27 PM | Today
Show more actions - PrismHR Case 00685421: Suggested Solution [ thread::CzwvIr--evC19rUUXE871QE:: ]
customersupport@prismhr.com sent an email to Kristen Wolasz and 1 other
From Address
customersupport@prismhr.com
To Address
Kristen Wolasz
Related To
00685421
Text Body
Good afternoon,
The employee record cannot be deleted while posted vouchers remain.
Thank you,
Jacob King
NEVER include SSN or username/password combination in your reply or in an attachment.
Responses via email to this case will result in a re-open of the case. If that is not your intention, simply read this email and the case will automatically be closed in 10 days. No further action is necessary.
thread::CzwvIr--evC19rUUXE871QE::
00X3k000001vPusEAE
Skip to the top of the activity timeline`;

  test("cleanSfPaste drops chrome, banners, invites, labels; dedupes doubles", () => {
    const clean = cleanSfPaste(RAW);
    for (const gone of [
      "Only show activities",
      "Timeline Settings",
      "Show more actions",
      "Details for",
      "thread::",
      "Meeting ID:",
      "One tap mobile",
      "Dial by your location",
      "NEVER include SSN",
      "Responses via email",
      "From Address",
      "Text Body",
      "Overdue",
    ])
      assert.ok(!clean.includes(gone), `should strip: ${gone}`);
    assert.ok(clean.includes("schedule very aggressive"));
    // doubled subject collapses to one
    assert.equal(clean.split("Prism/ESC: PrismOne Timeline").length, 2);
  });

  test("parses tasks and case emails: kind, subject, people, dates", () => {
    const es = parseSfTimeline(RAW, new Date("2026-07-27T22:00:00Z"));
    assert.equal(es.length, 2);
    const [task, mail] = es;
    assert.equal(task.kind, "task");
    assert.equal(task.subject, "Prism/ESC: PrismOne Timeline");
    assert.equal(task.from, "Lesha Cyphers");
    assert.equal(task.dayIso, "2025-07-30");
    assert.match(task.body, /schedule very aggressive/);
    assert.ok(!task.body.includes("Meeting ID"));
    assert.equal(mail.kind, "email");
    assert.equal(mail.subject, "PrismHR Case 00685421: Suggested Solution");
    assert.equal(mail.from, "customersupport@prismhr.com");
    assert.equal(mail.to, "Kristen Wolasz");
    assert.equal(mail.others, 1);
    assert.equal(mail.dayIso, "2026-07-27");
    assert.equal(mail.timeLabel, "5:27 PM");
    assert.match(mail.body, /^Good afternoon,/);
    assert.ok(!mail.body.includes("NEVER include SSN"));
  });
});
