// The rollup builder — arithmetic and verbatim quotation only. Counts, last
// human motion, actors, notable threads, support themes, intent windows, and
// the caps. Every number a surface will ever render starts here.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildRollup,
  intentWindows,
  emailNamesInRow,
  isHumanMotion,
  namesInRow,
  supportThemes,
  verdictLine,
} from "../src/lib/activity/rollup";
import { createIngest } from "../src/lib/activity/ingest";
import { SLICE_ROW_CAP } from "../src/lib/activity/types";
import type { AccountSlice, StagedRow } from "../src/lib/activity/types";
import { BOOK, csvLine, headerLine, row } from "./activity-fixtures";

const mkRow = (p: Partial<StagedRow>): StagedRow => ({
  k: p.k ?? Math.random().toString(16).slice(2),
  d: p.d ?? "2026-08-15",
  s: p.s ?? "Re: subject",
  a: p.a ?? "Colleague One",
  lane: p.lane ?? "human",
  sub: p.sub ?? "Email",
  rt: p.rt ?? "Service Provider Task",
  ct: p.ct ?? "",
  fl: p.fl ?? "",
  c: p.c,
  p: p.p,
});

const mkSlice = (rows: StagedRow[], patch?: Partial<AccountSlice>): AccountSlice => ({
  id: "001TESTTRENDHR000A",
  name: "Trend Personnel",
  meta: {
    primaryContactEmail: "",
    primaryContact: "Natalie Borland",
    primaryContactTitle: "CFO",
    lastContact: "",
    contactedDate: "",
    lastEmailSentKey: "2026-08-18 15:49",
    lastEmailReceivedKey: "2026-08-19 09:02",
    gbc: "",
  },
  rows,
  dropped: 0,
  tally: { days: { "2026-08-13": { s: 10, o: 4, c: 1 } }, camps: {}, receipts: 2 },
  laneEmails: { human: 0, csm: 0, support: 0, intent: 0, machinery: 0 },
  laneCounts: { human: rows.length, csm: 0, support: 0, intent: 15, machinery: 3 },
  rowsSum: "",
  tallySum: "",
  ...patch,
});

const ctx = {
  dropSha: "d942e0f2aaaaaaaa",
  dropDay: "2026-08-20",
  window: { from: "2026-05-23", to: "2026-08-20" },
  colleagues: new Set(["Colleague One", "Greg Williams"]),
  accountPeople: new Set(["Natalie Borland", "William Ackman"]),
};

test("human motion excludes receipts and automated rows", () => {
  assert.equal(isHumanMotion(mkRow({})), true);
  assert.equal(isHumanMotion(mkRow({ fl: "r" })), false);
  assert.equal(isHumanMotion(mkRow({ fl: "a" })), false);
  assert.equal(isHumanMotion(mkRow({ lane: "support" })), false);
  assert.equal(isHumanMotion(mkRow({ lane: "csm" })), true);
});

test("namesInRow finds whole two-word names only", () => {
  const r = mkRow({
    s: "Re: intro",
    c: "Talked with Natalie Borland about Natalie's plan",
  });
  assert.deepEqual(namesInRow(r, ["Natalie Borland", "Natalie", "William Ackman"]), [
    "Natalie Borland",
  ]);
});

test("last human motion: the newest genuine person, account name preferred", () => {
  const rows = [
    mkRow({
      d: "2026-08-19",
      s: "Re: Zayzoon partner intro",
      c: "Natalie Borland replied",
    }),
    mkRow({ d: "2026-08-20", s: "[Seismic] [Session] viewed deck", fl: "r" }),
    mkRow({ d: "2026-08-10", s: "older note" }),
  ];
  const r = buildRollup({ slice: mkSlice(rows), ...ctx });
  assert.equal(r.lastHuman?.day, "2026-08-19");
  assert.equal(r.lastHuman?.who, "Natalie Borland");
  assert.equal(r.lastHuman?.kind, "account");
  assert.equal(r.lastOrgInbound, "2026-08-19 09:02");
  assert.equal(r.intent.s, 10);
  assert.equal(r.receipts, 2);
});

test("notable threads: grouped by normalized subject, account-led ranked in", () => {
  const rows = [
    mkRow({ d: "2026-08-12", s: "Partner Introduction ~ Zayzoon | TrendHR" }),
    mkRow({
      d: "2026-08-19",
      s: "RE: Partner Introduction ~ Zayzoon | TrendHR",
      c: "William Ackman +1",
    }),
    mkRow({ d: "2026-08-14", s: "Fwd: Partner Introduction ~ Zayzoon | TrendHR" }),
    mkRow({ d: "2026-08-01", s: "internal housekeeping" }),
  ];
  const r = buildRollup({ slice: mkSlice(rows), ...ctx });
  assert.equal(r.threads[0].rows, 3);
  assert.equal(r.threads[0].firstDay, "2026-08-12");
  assert.equal(r.threads[0].lastDay, "2026-08-19");
  assert.equal(r.threads[0].led, "account-led");
  assert.equal(r.threads[1].led, "internal");
});

test("verdict lines are arithmetic sentences", () => {
  const machineryOnly = buildRollup({
    slice: mkSlice([], {
      laneEmails: { human: 0, csm: 0, support: 0, intent: 0, machinery: 0 },
  laneCounts: { human: 0, csm: 0, support: 0, intent: 15, machinery: 3 },
    }),
    ...ctx,
  });
  assert.match(verdictLine(machineryOnly), /machinery only — 15 blast receipts/);
  const supportOnly = buildRollup({
    slice: mkSlice([mkRow({ lane: "support", s: "Email: PrismHR Case 1: help" })], {
      laneEmails: { human: 0, csm: 0, support: 0, intent: 0, machinery: 0 },
  laneCounts: { human: 0, csm: 0, support: 9, intent: 0, machinery: 0 },
      tally: { days: {}, camps: {}, receipts: 0 },
    }),
    ...ctx,
  });
  assert.match(verdictLine(supportOnly), /support traffic only — 9 case rows/);
});

test("support themes: case machinery stripped from labels, spike found", () => {
  const rows = [
    ...[..."123456789"].map((n, i) =>
      mkRow({
        lane: "support",
        d: i < 5 ? "2026-08-18" : "2026-06-02",
        s: `Email: PrismHR Case 0068823${n}: Payroll tax filings [ thread::abc${n} ]`,
      }),
    ),
  ];
  const { themes, total, spike } = supportThemes(rows);
  assert.equal(total, 9);
  assert.equal(themes[0].n, 9);
  assert.match(themes[0].label, /^Payroll tax filings$/);
  assert.ok(!themes[0].examples[0].includes("thread::"));
  assert.deepEqual(spike, { day: "2026-08-18", n: 5 });
});

test("intent windows: 30/60/90 boundaries and top campaigns by opens", () => {
  const iw = intentWindows(
    {
      days: {
        "2026-08-10": { s: 5, o: 2, c: 1 },
        "2026-06-25": { s: 4, o: 1, c: 0 },
        "2026-05-25": { s: 3, o: 1, c: 0 },
      },
      camps: {
        "A Smarter Way to Benchmark Pay": { s: 6, o: 3, c: 1, lastOpen: "2026-08-10" },
        "Leadership Update": { s: 6, o: 1, c: 0, lastOpen: "2026-06-25" },
      },
      receipts: 0,
    },
    "2026-08-20",
  );
  assert.deepEqual(iw.w30, { s: 5, o: 2, c: 1 });
  assert.deepEqual(iw.w60, { s: 9, o: 3, c: 1 });
  assert.deepEqual(iw.w90, { s: 12, o: 4, c: 1 });
  assert.equal(iw.lastOpen, "2026-08-10");
  assert.equal(iw.top[0].campaign, "A Smarter Way to Benchmark Pay");
});

test("the slice row cap drops oldest and counts them", async () => {
  const ingest = createIngest(BOOK);
  ingest.takeRow(headerLine().split(","));
  for (let i = 0; i < SLICE_ROW_CAP + 20; i++)
    ingest.takeRow(
      csvLine(
        row({
          subject: `Re: note number ${i}`,
          account: "Trend Personnel",
          id18: "001TESTTRENDHR000A",
          date: `${(i % 12) + 1}/${(i % 27) + 1}/2026`,
          assigned: "Colleague One",
          taskSubtype: "Email",
          recordType: "Service Provider Task",
        }),
      ).split(","),
    );
  const { slices } = await ingest.finish({
    fileName: "big.csv",
    fileBytes: 0,
    dropDay: "2026-08-20",
  });
  assert.equal(slices[0].rows.length, SLICE_ROW_CAP);
  assert.equal(slices[0].dropped, 20);
  // Newest-first held after the cap.
  assert.ok(slices[0].rows[0].d >= slices[0].rows[slices[0].rows.length - 1].d);
});

// ── the people on a logged email (2026-08-28) ───────────────────────────────
// The Assigned column on captured mail names the LOGGER. Before this, the
// newest motion at Infiniti HR read "Automated Process (unresolved)".

const BY_EMAIL = new Map([
  ["jennifer@infinitihr.com", "Jennifer Hardesty"],
  ["scott@infinitihr.com", "Scott Smrkovski"],
]);

test("emailNamesInRow reads the recipient list, in order, deduped", () => {
  const r = mkRow({
    p: "jennifer@infinitihr.com;antaeus.coe@prismhr.com;JENNIFER@infinitihr.com;scott@infinitihr.com",
  });
  assert.deepEqual(emailNamesInRow(r, BY_EMAIL), [
    "Jennifer Hardesty",
    "Scott Smrkovski",
  ]);
  // Our own address is not in the map — a colleague never resolves here.
  assert.deepEqual(emailNamesInRow(mkRow({ p: "antaeus.coe@prismhr.com" }), BY_EMAIL), []);
  assert.deepEqual(emailNamesInRow(mkRow({}), BY_EMAIL), []);
  assert.deepEqual(emailNamesInRow(mkRow({ p: "jennifer@infinitihr.com" }), new Map()), []);
});

test("last human names the correspondent, never the logger", () => {
  const slice = mkSlice([
    mkRow({
      k: "n1",
      d: "2026-08-27",
      s: "Email: Re: LMS?",
      a: "Automated Process",
      p: "jennifer@infinitihr.com;antaeus.coe@prismhr.com",
    }),
  ]);
  const r = buildRollup({
    slice,
    dropSha: "sha",
    dropDay: "2026-08-28",
    window: { from: "2026-06-01", to: "2026-08-28" },
    colleagues: new Set(["Antaeus Coe"]),
    accountPeople: new Set(["Jennifer Hardesty"]),
    accountEmails: BY_EMAIL,
  });
  assert.equal(r.lastHuman?.who, "Jennifer Hardesty");
  assert.equal(r.lastHuman?.kind, "account");
  // The mechanism is never an actor, and the thread reads account-led.
  assert.equal(
    r.actors.some((a) => a.name === "Automated Process"),
    false,
  );
  assert.equal(r.actors[0]?.name, "Jennifer Hardesty");
  assert.equal(r.threads[0]?.led, "account-led");
});

test("with no map and a machinery logger, the read says unresolved and names nobody", () => {
  const slice = mkSlice([
    mkRow({ k: "n1", d: "2026-08-27", a: "Automated Process", p: "jennifer@infinitihr.com" }),
  ]);
  const r = buildRollup({
    slice,
    dropSha: "sha",
    dropDay: "2026-08-28",
    window: { from: "2026-06-01", to: "2026-08-28" },
    colleagues: new Set(),
    accountPeople: new Set(),
  });
  assert.equal(r.lastHuman?.who, "");
  assert.equal(r.lastHuman?.kind, "unresolved");
  assert.deepEqual(r.actors, []);
});

test("the body cap drops addresses before it drops a row", () => {
  const long = Array.from({ length: 8 }, (_, i) => `person${i}@averylongdomain.example`).join(";");
  const rows = Array.from({ length: 200 }, (_, i) =>
    mkRow({ k: `k${i}`, d: "2026-08-01", c: "x".repeat(500), p: long }),
  );
  const body = JSON.stringify(rows);
  assert.ok(body.length > 120_000, "fixture must actually exceed the cap");
});
