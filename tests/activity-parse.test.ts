// The Second Record's parser under fire — the RFC-4180 state machine, the
// header fingerprint, the calendar dates, row identity, and the hostile
// fixture (§2.3 ⚔): every measured quirk of the real export at once.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activityRowKey,
  createCsvParser,
  dayKeyOf,
  dateTimeKeyOf,
  dropShaOf,
  fieldForHeader,
  fingerprintHeaders,
  refusalFor,
  rowRecord,
  rowsChecksum,
  stripThreadTokens,
  CANON_HEADERS,
} from "../src/lib/activity/parse";
import { createIngest } from "../src/lib/activity/ingest";
import { BOOK, headerLine, hostileCsv, row, csvLine } from "./activity-fixtures";
import { senderOf } from "../src/lib/activity/excerpt";

test("quoted multiline fields with commas, quotes, CRLF parse as one row", () => {
  const p = createCsvParser();
  const rows = [
    ...p.push('a,"line one\r\nline two, with comma","she said ""yes"""\r\nb,c,d\r\n'),
    ...p.finish(),
  ];
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], ["a", "line one\nline two, with comma", 'she said "yes"']);
  assert.deepEqual(rows[1], ["b", "c", "d"]);
});

test("state survives chunk boundaries — one character at a time", () => {
  const text = '﻿x,"a\nb","c""d"\ny,z,w\n';
  const p = createCsvParser();
  const rows: string[][] = [];
  for (const ch of text) rows.push(...p.push(ch));
  rows.push(...p.finish());
  assert.deepEqual(rows, [
    ["x", "a\nb", 'c"d'],
    ["y", "z", "w"],
  ]);
});

test("a trailing newline never yields a phantom row; a missing one still flushes", () => {
  const p1 = createCsvParser();
  assert.equal([...p1.push("a,b\n"), ...p1.finish()].length, 1);
  const p2 = createCsvParser();
  assert.equal([...p2.push("a,b"), ...p2.finish()].length, 1);
});

test("fingerprint: both anchors plus ten of nineteen, extras tolerated, fakes refused", () => {
  assert.equal(fingerprintHeaders([...CANON_HEADERS]).ok, true);
  const withExtra = [...CANON_HEADERS, "Some New Column"];
  const fp = fingerprintHeaders(withExtra);
  assert.equal(fp.ok, true);
  assert.deepEqual(fp.extra, ["Some New Column"]);
  // Anchors missing → refused, whatever else matches.
  const noAnchor = CANON_HEADERS.filter((h) => h !== "18 Digit ID");
  assert.equal(fingerprintHeaders([...noAnchor]).ok, false);
  // Too few canonical headers → refused.
  assert.equal(fingerprintHeaders(["18 Digit ID", "Subject", "Date"]).ok, false);
});

test("rowRecord binds by header name, never position", () => {
  const shuffled = ["Subject", "Assigned", "18 Digit ID"];
  const r = rowRecord(shuffled, ["hello", "Colleague One", "001X"]);
  assert.equal(r.subject, "hello");
  assert.equal(r.assigned, "Colleague One");
  assert.equal(r.id18, "001X");
  assert.equal(r.date, "");
});

test("day-only dates are calendar facts — no timezone shift, ever", () => {
  assert.equal(dayKeyOf("8/18/2026"), "2026-08-18");
  assert.equal(dayKeyOf("12/1/2026"), "2026-12-01");
  assert.equal(dayKeyOf("not a date"), "");
  assert.equal(dateTimeKeyOf("8/18/2026, 3:49 PM"), "2026-08-18 15:49");
  assert.equal(dateTimeKeyOf("8/18/2026, 12:05 AM"), "2026-08-18 00:05");
});

test("row identity: all nineteen fields count; comments alone distinguish", () => {
  const a = row({ subject: "s", date: "8/1/2026", comments: "one" });
  const b = row({ subject: "s", date: "8/1/2026", comments: "two" });
  assert.notEqual(activityRowKey(a), activityRowKey(b));
  assert.equal(activityRowKey(a), activityRowKey({ ...a }));
});

test("checksums are stable across row order", async () => {
  const one = await rowsChecksum(["k1", "k2", "k3"]);
  const two = await rowsChecksum(["k3", "k1", "k2"]);
  assert.equal(one, two);
  const shaA = await dropShaOf(
    [
      { id: "b", rowsSum: "2", tallySum: "2" },
      { id: "a", rowsSum: "1", tallySum: "1" },
    ],
    10,
  );
  const shaB = await dropShaOf(
    [
      { id: "a", rowsSum: "1", tallySum: "1" },
      { id: "b", rowsSum: "2", tallySum: "2" },
    ],
    10,
  );
  assert.equal(shaA, shaB);
});

test("thread tokens strip from rendered subjects", () => {
  assert.equal(
    stripThreadTokens("Re: Case update [ thread::L9TrIyskd3q ] please read"),
    "Re: Case update please read",
  );
});

// ── ⚔ the hostile fixture — every quirk at once ─────────────────────────────

test("hostile fixture: BOM, fake header in comment, dupe, money, unmatched — all survived", async () => {
  const p = createCsvParser();
  const ingest = createIngest(BOOK);
  // Feed in awkward 7-byte chunks to stress chunk-boundary state.
  const text = hostileCsv();
  for (let i = 0; i < text.length; i += 7)
    for (const raw of p.push(text.slice(i, i + 7))) {
      const v = ingest.takeRow(raw);
      assert.equal(v.stop, undefined);
    }
  for (const raw of p.finish()) ingest.takeRow(raw);

  const { slices, manifest } = await ingest.finish({
    fileName: "hostile.csv",
    fileBytes: text.length,
    dropDay: "2026-08-20",
  });

  // The identical repeat is COUNTED but no longer staged twice: one send
  // logged once per Contact is one email (2026-08-31).
  assert.equal(manifest.dupes, 1);
  assert.equal(manifest.rowCount, 7);
  // The unmatched account is counted AND named.
  assert.equal(manifest.unmatched.length, 1);
  assert.equal(manifest.unmatched[0].name, "Advocate Pay LLC");
  assert.equal(manifest.unmatched[0].rows, 1);

  const trend = slices.find((s) => s.id === "001TESTTRENDHR000A");
  assert.ok(trend);
  // Blasts tallied, never staged.
  assert.equal(trend.tally.days["2026-08-12"]?.s, 1);
  assert.equal(trend.tally.days["2026-08-13"]?.o, 1);
  assert.ok(!trend.rows.some((r) => /^Sent |^Opened /.test(r.s)));
  // Machinery never staged.
  assert.ok(!trend.rows.some((r) => r.a === "HubSpot Integration User"));
  // The human row staged with its multiline comment INTACT — the fake header
  // line inside it parsed as text, never as a header (recognition reads only
  // the parsed first row).
  const humanPair = trend.rows.filter((r) => r.s === "Re: Global payroll question");
  assert.equal(humanPair.length, 1, "the exact repeat folds into its original");
  assert.equal(humanPair[0].n, 2, "and says how many rows it arrived as");
  const human = humanPair[0];
  assert.ok(human);
  // The colleague rule: assigned on ≥2 distinct accounts. Colleague Two spans
  // two; Colleague One only ever appears on Trend — an account person's shape.
  assert.ok(manifest.colleagues.includes("Colleague Two"));
  assert.ok(!manifest.colleagues.includes("Colleague One"));
  assert.ok(human.c?.includes("Subject,Account Name"));
  // Money redacted at staging; the headcount survives (it is sizing, not money).
  assert.ok(!/\$\s?12,000|12,000 PEPM/i.test(human.c ?? ""));
  assert.ok(human.c?.includes("1,200 employees"));
  // Day-only date, unshifted; account-level datetime read once.
  assert.equal(human.d, "2026-08-18");
  assert.equal(trend.meta.lastEmailReceivedKey, "2026-08-19 09:02");
  assert.equal(trend.meta.primaryContact, "Natalie Borland");

  // The case email with a CSM Task record type landed SUPPORT (rule order).
  const staff = slices.find((s) => s.id === "001TESTSTAFFLSG00B");
  assert.equal(staff?.rows[0].lane, "support");
  // The window read off the calendar facts.
  assert.equal(manifest.window.from, "2026-08-10");
  assert.equal(manifest.window.to, "2026-08-18");
});

test("loud-fail: a csv without the anchors is refused at the first row", () => {
  const ingest = createIngest(BOOK);
  const v = ingest.takeRow(["Name", "Email", "Phone"]);
  assert.match(v.stop ?? "", /18 Digit ID \/ Subject missing/);
});

test("header order does not change the drop identity", async () => {
  // Same rows, reordered columns → same slices, same checksums.
  const reordered = [...CANON_HEADERS].reverse();
  const r = row({
    subject: "Re: hello",
    id18: "001TESTTRENDHR000A",
    account: "Trend Personnel",
    date: "8/15/2026",
    assigned: "Colleague One",
    taskSubtype: "Email",
    recordType: "Service Provider Task",
  });
  const a = createIngest(BOOK);
  a.takeRow([...headerLine().split(",")]);
  a.takeRow(csvLine(r).split(","));
  const b = createIngest(BOOK);
  b.takeRow(reordered);
  const byHeader = new Map<string, string>();
  headerLine()
    .split(",")
    .forEach((h, i) => byHeader.set(h, csvLine(r).split(",")[i]));
  b.takeRow(reordered.map((h) => byHeader.get(h) ?? ""));
  const [ra, rb] = await Promise.all([
    a.finish({ fileName: "a", fileBytes: 0, dropDay: "2026-08-20" }),
    b.finish({ fileName: "b", fileBytes: 0, dropDay: "2026-08-20" }),
  ]);
  assert.equal(ra.manifest.dropSha, rb.manifest.dropSha);
});

// ── the reader meets the export (2026-08-28) ────────────────────────────────
// Salesforce renames the same field by report type. The 8/28 rebuild shipped
// "Assigned To: Full Name" and "Comments" where the canon says "Assigned" and
// "Full Comments"; the pipeline read both as empty on 108,532 rows.

const REBUILT_HEADERS = [
  "Account Name",
  "Subject",
  "18 Digit ID",
  "Global Business Consultant: Full Name",
  "Primary Contact: Full Name",
  "Primary Contact Email",
  "Last Contact",
  "Contacted Date",
  "Primary Contact Title",
  "Task",
  "Task/Event Record Type",
  "Task Subtype",
  "Outreach Task Type",
  "Call Type",
  "Account Record Type",
  "Event Subtype",
  "Assigned To: Full Name",
  "Last Activity",
  "Comments",
  "Status",
  "Created Date",
  "Created By: Full Name",
  "Date",
];

test("aliases bind the renamed columns; the canon still wins on its own names", () => {
  assert.equal(fieldForHeader("Assigned"), "assigned");
  assert.equal(fieldForHeader("Assigned To: Full Name"), "assigned");
  assert.equal(fieldForHeader("Full Comments"), "comments");
  assert.equal(fieldForHeader("Comments"), "comments");
  assert.equal(fieldForHeader("Primary Contact: Full Name"), "primaryContact");
  assert.equal(fieldForHeader("Primary Contact Email"), "primaryContactEmail");
  assert.equal(fieldForHeader("Global Business Consultant: Full Name"), "gbc");
  assert.equal(fieldForHeader("﻿ Subject "), "subject");
  // Status is read now — it is the only column that tells an OPEN task's DUE
  // date apart from a day something happened (2026-08-31).
  assert.equal(fieldForHeader("Status"), "status");
  assert.equal(fieldForHeader("Account Record Type"), undefined);
});

test("the rebuilt export's columns land in the record", () => {
  const raw = [
    "Infiniti HR",
    "Email: Re: LMS?",
    "001F000000w38OIIAY",
    "Antaeus Coe",
    "Scott Smrkovski",
    "scott@infinitihr.com",
    "",
    "",
    "CEO",
    "1",
    "Service Provider Task",
    "Email",
    "",
    "",
    "Service Provider",
    "",
    "Anika Steenstra",
    "8/28/2026",
    "To: jennifer@infinitihr.com\nCC: \nBCC: \nAttachment: --none--\n\nSubject: Re: LMS?\nBody:\nStanding by.",
    "Completed",
    "5/28/2026",
    "Automated Process",
    "7/21/2026",
  ];
  const r = rowRecord(REBUILT_HEADERS, raw);
  assert.equal(r.assigned, "Anika Steenstra");
  assert.equal(r.gbc, "Antaeus Coe");
  assert.equal(r.primaryContact, "Scott Smrkovski");
  assert.equal(r.primaryContactEmail, "scott@infinitihr.com");
  assert.match(r.comments, /Standing by\./);
  // "Date" is the activity's day — never Created Date, which sits two columns
  // earlier and would have aged every row by two months.
  assert.equal(r.date, "7/21/2026");
});

test("a canonical column never loses its value to an alias column", () => {
  // Both spellings present: the canonical one is read, and an empty canonical
  // cell falls through to the alias rather than blanking the field.
  const headers = ["18 Digit ID", "Subject", "Assigned", "Assigned To: Full Name"];
  assert.equal(rowRecord(headers, ["1", "s", "Real Name", "Logger"]).assigned, "Real Name");
  assert.equal(rowRecord(headers, ["1", "s", "", "Logger"]).assigned, "Logger");
  // And it wins from either side of the file — column order is not a tiebreak.
  const flipped = ["18 Digit ID", "Subject", "Assigned To: Full Name", "Assigned"];
  assert.equal(rowRecord(flipped, ["1", "s", "Logger", "Real Name"]).assigned, "Real Name");
  assert.equal(rowRecord(flipped, ["1", "s", "Logger", ""]).assigned, "Logger");
});

test("the receipt is honest: an aliased column is never reported missing", () => {
  const fp = fingerprintHeaders(REBUILT_HEADERS);
  assert.equal(fp.ok, true);
  for (const h of ["Assigned", "Full Comments", "Primary Contact"])
    assert.equal(fp.missing.includes(h), false, `${h} reported missing`);
  // Columns the export genuinely lacks are still named.
  assert.deepEqual(fp.missing, ["Last Email Sent", "Last Email Received", "Type"]);
  // And columns nothing reads are still named as extra.
  assert.deepEqual(fp.extra, [
    "Task",
    "Account Record Type",
    "Last Activity",
    "Created Date",
    "Created By: Full Name",
  ]);
});

test("the rebuilt export ingests end to end — logged mail lands human, with its people", async () => {
  const ing = createIngest(BOOK);
  const body =
    "To: natalie@trend.example; antaeus.coe@prismhr.com\nCC: \nBCC: \nAttachment: --none--\n\nSubject: Re: LMS?\nBody:\nWe have a pain around Puerto Rico processing.";
  ing.takeRow(REBUILT_HEADERS);
  ing.takeRow([
    "Trend Personnel",
    "Email: Re: LMS?",
    BOOK[0].id,
    "Antaeus Coe",
    "Natalie Borland",
    "Natalie@Trend.Example",
    "",
    "",
    "CFO",
    "1",
    "",
    "Email",
    "",
    "",
    "Service Provider",
    "",
    "Automated Process",
    "8/28/2026",
    body,
    "Completed",
    "8/20/2026",
    "Automated Process",
    "8/21/2026",
  ]);
  const { slices, manifest } = await ing.finish({
    fileName: "sf90.csv",
    fileBytes: 1,
    dropDay: "2026-08-28",
  });
  assert.equal(manifest.rowCount, 1);
  assert.equal(manifest.laneTotals.human, 1);
  assert.equal(manifest.laneTotals.machinery, 0);
  const slice = slices[0];
  assert.equal(slice.meta.primaryContact, "Natalie Borland");
  assert.equal(slice.meta.primaryContactEmail, "natalie@trend.example");
  assert.equal(slice.rows.length, 1);
  assert.equal(slice.rows[0].d, "2026-08-21");
  assert.equal(slice.rows[0].p, "natalie@trend.example;antaeus.coe@prismhr.com");
  assert.match(slice.rows[0].c ?? "", /Puerto Rico/);
});

// ── the door has teeth (2026-08-28) ─────────────────────────────────────────
// Recognition counted columns and did not weigh them. An export missing
// Full Comments still matched twelve of nineteen, so it was accepted, and
// 108,532 rows filed with no email text over a good read.

const GUTLESS = REBUILT_HEADERS.filter((h) => h !== "Comments");

test("an export with no email-body column is recognized and REFUSED", () => {
  const fp = fingerprintHeaders(GUTLESS);
  // Still the activity report — it must not fall through to another reader.
  assert.equal(fp.ok, true);
  assert.equal(fp.blockers.length, 1);
  assert.equal(fp.blockers[0].header, "Full Comments");
  const said = refusalFor(fp);
  assert.match(said, /^Nothing filed\./);
  assert.match(said, /Full Comments \(or Comments\)/);
  assert.match(said, /the email bodies/);
});

test("the refusal names every load-bearing column that is gone", () => {
  const fp = fingerprintHeaders(
    GUTLESS.filter((h) => h !== "Assigned To: Full Name"),
  );
  assert.deepEqual(
    fp.blockers.map((b) => b.header),
    ["Full Comments", "Assigned"],
  );
  const said = refusalFor(fp);
  assert.match(said, /Full Comments .* and Assigned /);
  assert.match(said, /who each activity belongs to/);
});

test("a readable export has no blockers, under either spelling", () => {
  assert.deepEqual(fingerprintHeaders(REBUILT_HEADERS).blockers, []);
  assert.deepEqual(fingerprintHeaders([...CANON_HEADERS]).blockers, []);
  assert.equal(refusalFor(fingerprintHeaders([...CANON_HEADERS])), "");
});

test("the door closes before a single row is bucketed", async () => {
  const ing = createIngest(BOOK);
  const stop = ing.takeRow(GUTLESS);
  assert.match(stop.stop ?? "", /^Nothing filed\./);
  assert.equal(ing.rowCount(), 0);
});

test("the manifest counts what could actually be read", async () => {
  const ing = createIngest(BOOK);
  const cells = (comments: string) => [
    "Trend Personnel", "Email: Re: LMS?", BOOK[0].id, "", "", "", "", "", "",
    "1", "", "Email", "", "", "Service Provider", "", "Anika Steenstra",
    "8/28/2026", comments, "Completed", "8/20/2026", "Automated Process",
    "8/21/2026",
  ];
  ing.takeRow(REBUILT_HEADERS);
  ing.takeRow(cells("To: a@b.com\nCC: \nBCC: \n\nSubject: x\nBody:\nReal words."));
  ing.takeRow(cells(""));
  ing.takeRow(cells("   "));
  const { manifest } = await ing.finish({
    fileName: "sf.csv",
    fileBytes: 1,
    dropDay: "2026-08-28",
  });
  assert.equal(manifest.rowCount, 3);
  assert.equal(manifest.textRows, 1);
});

// ── the collapse, and the row that has not happened yet (2026-08-31) ────────

const REBUILT_IDX = (h: string) => REBUILT_HEADERS.indexOf(h);
const mkRow = (patch: Record<string, string>): string[] => {
  const cells = REBUILT_HEADERS.map(() => "");
  cells[REBUILT_IDX("Account Name")] = "Trend Personnel";
  cells[REBUILT_IDX("18 Digit ID")] = BOOK[0].id;
  cells[REBUILT_IDX("Task Subtype")] = "Email";
  cells[REBUILT_IDX("Assigned To: Full Name")] = "Riley Pitt";
  cells[REBUILT_IDX("Status")] = "Completed";
  cells[REBUILT_IDX("Date")] = "8/20/2026";
  for (const [k, v] of Object.entries(patch)) cells[REBUILT_IDX(k)] = v;
  return cells;
};

test("one send logged once per contact stages ONCE, counted", async () => {
  const ing = createIngest(BOOK, { dropDay: "2026-08-31" });
  ing.takeRow(REBUILT_HEADERS);
  const body = "To: a@trend.example\nCC: \nBCC: \n\nSubject: Monthly call\nBody:\nSee you Tuesday.";
  for (let i = 0; i < 12; i++)
    ing.takeRow(mkRow({ Subject: "Email: Re: Monthly call", Comments: body }));
  // A genuinely different email on the same thread is NOT folded into it.
  ing.takeRow(
    mkRow({ Subject: "Email: Re: Monthly call", Comments: body.replace("Tuesday", "Wednesday") }),
  );
  const { slices, manifest } = await ing.finish({
    fileName: "x.csv", fileBytes: 1, dropDay: "2026-08-31",
  });
  assert.equal(manifest.rowCount, 13);
  const s = slices[0];
  assert.equal(s.rows.length, 2, "twelve copies plus one distinct email");
  assert.equal(s.rows.find((r) => (r.n ?? 1) > 1)?.n, 12);
  // Rows stay the file's truth; emails say how many sends are behind them.
  assert.equal(s.laneCounts.csm + s.laneCounts.human, 13);
  assert.equal(s.laneEmails.csm + s.laneEmails.human, 2);
});

test("an OPEN row dated ahead never sets the window nor leads the account", async () => {
  const ing = createIngest(BOOK, { dropDay: "2026-08-31" });
  ing.takeRow(REBUILT_HEADERS);
  ing.takeRow(mkRow({ Subject: "Email: real work", Date: "8/28/2026", Comments: "To: a@b.com\n\nBody:\nDone." }));
  ing.takeRow(
    mkRow({ Subject: "Strategic Business Review", Date: "3/26/2027", Status: "Not Started", "Task Subtype": "Task" }),
  );
  const { slices, manifest } = await ing.finish({
    fileName: "x.csv", fileBytes: 1, dropDay: "2026-08-31",
  });
  // Kept and counted — it is a real row.
  assert.equal(manifest.rowCount, 2);
  assert.equal(slices[0].rows.length, 2);
  // But it is not when the drop's activity ran, and it is not the newest thing.
  assert.equal(manifest.window.to, "2026-08-28");
  assert.equal(slices[0].rows[0].d, "2026-08-28");
  assert.equal(slices[0].rows[1].fl.includes("f"), true);
  // A COMPLETED row dated ahead is a data oddity, not a schedule — untouched.
  const ing2 = createIngest(BOOK, { dropDay: "2026-08-31" });
  ing2.takeRow(REBUILT_HEADERS);
  ing2.takeRow(mkRow({ Subject: "Email: odd", Date: "3/26/2027", Status: "Completed" }));
  const r2 = await ing2.finish({ fileName: "x.csv", fileBytes: 1, dropDay: "2026-08-31" });
  assert.equal(r2.manifest.window.to, "2027-03-26");
});

// ── the signature outranks the Assigned column ──────────────────────────────
// A CC is enough to file a colleague's email under the operator. Reading the
// column as the author put Anika's onboarding welcome in Antaeus's mouth twice
// in one session (founder, 2026-08-31): "wrong person attribution is huge".

test("the sender is read from the signature, not from who logged the row", () => {
  const body = [
    "To: javier@staffleasing.com",
    "CC: antaeus.coe@prismhr.com",
    "Subject: Welcome",
    "",
    "Body:",
    "Great meeting you both today. I will send the deck over tonight.",
    "",
    "Best regards,",
    "Anika Steenstra",
    "Client Growth Manager",
    "E: anika.steenstra@prismhr.com",
  ].join("\n");
  const read = senderOf(body);
  assert.equal(read.name, "Anika Steenstra");
  assert.equal(read.email, "anika.steenstra@prismhr.com");
});

test("the read declines rather than guess", () => {
  // Two signatures in one flattened body: say nothing.
  const crossed = "Body:\nSure.\n\nRegards,\nAnika Steenstra\nE: mary.mahoney@prismhr.com";
  assert.deepEqual(senderOf(crossed), { name: "", email: "" });
  // A bare first name names whoever else shares it.
  assert.equal(senderOf("Body:\nOn my way.\n\nThanks,\nRiley").name, "");
  // The next sentence is not a surname.
  assert.equal(senderOf("Body:\nOK.\n\nThanks, Riley. Nice to meet you.").name, "");
  // Nothing to read at all.
  assert.equal(senderOf("Body:\nSee attached.").name, "");
});

test("a signature below the quoted trail belongs to the person being replied to", () => {
  const body = [
    "Body:",
    "Sounds good, see you then.",
    "From: Javier Ramirez <javier@staffleasing.com>",
    "Sent: Thursday, August 28, 2026 9:14 AM",
    "Subject: Re: Welcome",
    "",
    "Best regards,",
    "Anika Steenstra",
  ].join("\n");
  // Anika wrote the QUOTED message, not this one. No name beats the wrong one.
  assert.equal(senderOf(body).name, "");
});

test("the name is tidied without garbling it", () => {
  const sign = (s: string) => senderOf(`Body:\nHi.\n\nRegards,\n${s}`).name;
  assert.equal(sign("CHASSIE SMITH"), "Chassie Smith");
  assert.equal(sign("Bill Bill Laffey"), "Bill Laffey");
  assert.equal(sign("Jamie MorrisonSenior Sales Executive"), "Jamie Morrison");
  assert.equal(sign("Jessica Brach EVP Operations"), "Jessica Brach");
  assert.equal(sign("Amy Grazioso Vice President"), "Amy Grazioso");
  assert.equal(sign("Sample Info"), "");
  assert.equal(sign("Original Case Details"), "");
  assert.equal(sign("JoryJory's Calendar"), "");
  // Names that legitimately carry an internal capital survive whole.
  assert.equal(sign("Sean McDonald"), "Sean McDonald");
  assert.equal(sign("Lisa King-Corbin"), "Lisa King-Corbin");
  assert.equal(sign("Debbie Van Meers"), "Debbie Van Meers");
});

test("the staged row carries the writer, and the Assigned column stays the logger", async () => {
  const ing = createIngest(BOOK, { dropDay: "2026-08-31" });
  ing.takeRow(REBUILT_HEADERS);
  ing.takeRow(
    mkRow({
      Subject: "Email: Welcome to PrismHR",
      Date: "8/28/2026",
      "Assigned To: Full Name": "Antaeus Coe",
      Comments:
        "To: javier@staffleasing.com\nCC: antaeus.coe@prismhr.com\n\nBody:\nGreat meeting you.\n\nBest regards,\nAnika Steenstra\nE: anika.steenstra@prismhr.com",
    }),
  );
  const { slices } = await ing.finish({
    fileName: "x.csv",
    fileBytes: 1,
    dropDay: "2026-08-31",
  });
  const staged = slices[0].rows[0];
  assert.equal(staged.a, "Antaeus Coe");
  assert.equal(staged.w, "Anika Steenstra");
});
