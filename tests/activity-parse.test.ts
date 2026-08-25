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
  fingerprintHeaders,
  rowRecord,
  rowsChecksum,
  stripThreadTokens,
  CANON_HEADERS,
} from "../src/lib/activity/parse";
import { createIngest } from "../src/lib/activity/ingest";
import { BOOK, headerLine, hostileCsv, row, csvLine } from "./activity-fixtures";

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

  // The identical repeat is KEPT (multi-recipient sends look alike) and
  // counted; its citation key gains an occurrence suffix.
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
  assert.equal(humanPair.length, 2);
  assert.notEqual(humanPair[0].k, humanPair[1].k);
  assert.ok(humanPair.some((r) => r.k.endsWith("#1")));
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
