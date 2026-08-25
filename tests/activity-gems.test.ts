// The store grammars round-trip — the text IS the store, so every renderer's
// parser must read back exactly what was written (Appendix A). Plus the
// mechanical canon linter's accept and reject sets (§7.2).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isRollupNoteId,
  parseGemsBody,
  parseIntentBody,
  parseManifestBody,
  parseRollupBody,
  parseStageBody,
  parseSupportBody,
  renderGemsBody,
  renderIntentBody,
  renderManifestBody,
  renderRollupBody,
  renderStageBody,
  renderSupportBody,
  emptyRunState,
  sv,
  type Gem,
} from "../src/lib/activity/stores";
import { lintAct, lintReason, lintTerm } from "../src/lib/activity/lint";
import type { Rollup } from "../src/lib/activity/rollup";
import type { AccountSlice, DropManifest } from "../src/lib/activity/types";

const rollup: Rollup = {
  dropSha: "d942e0f2ffffffff",
  dropDay: "2026-08-20",
  window: { from: "2026-05-23", to: "2026-08-20" },
  lanes: { human: 41, csm: 12, support: 96, intent: 2727, machinery: 14 },
  intent: { s: 2100, o: 540, c: 87 },
  receipts: 9,
  lastHuman: {
    day: "2026-08-19",
    how: "email",
    who: "Natalie Borland",
    kind: "account",
    subject: "Re: Partner Introduction ~ Zayzoon | TrendHR",
  },
  lastOrgInbound: "2026-08-19 09:02",
  actors: [
    { name: "Natalie Borland", kind: "account", lane: "human", n: 9 },
    { name: "Anika Steenstra", kind: "colleague", lane: "csm", n: 3 },
  ],
  threads: [
    {
      subject: "Re: Partner Introduction ~ Zayzoon - TrendHR",
      firstDay: "2026-08-12",
      lastDay: "2026-08-19",
      rows: 11,
      led: "account-led",
    },
  ],
  verdict: "",
};

test("the rollup grammar round-trips", () => {
  const parsed = parseRollupBody(renderRollupBody(rollup));
  assert.ok(parsed);
  assert.equal(parsed.dropSha, "d942e0f2");
  assert.deepEqual(parsed.lanes, { ...rollup.lanes, intent: 2727 });
  assert.deepEqual(parsed.intent, rollup.intent);
  assert.equal(parsed.receipts, 9);
  assert.equal(parsed.lastHuman?.who, "Natalie Borland");
  assert.equal(parsed.lastHuman?.kind, "account");
  assert.equal(parsed.lastOrgInbound, "2026-08-19 09:02");
  assert.equal(parsed.actors.length, 2);
  assert.equal(parsed.threads[0].rows, 11);
  assert.equal(parsed.threads[0].led, "account-led");
});

test("a verdict line survives the trip", () => {
  const withVerdict = {
    ...rollup,
    verdict: "machinery only — 212 blast receipts, no human motion",
  };
  const parsed = parseRollupBody(renderRollupBody(withVerdict));
  assert.match(parsed?.verdict ?? "", /machinery only/);
});

const gem: Gem = {
  dropSha: "d942e0f2ffffffff",
  verdict: "CONFIRMED",
  createdDay: "2026-08-20",
  actedDay: "",
  who: ["Natalie Borland", "William Ackman"],
  whoKind: "account",
  term: "PARTNER MOTION",
  what: "Zayzoon partner-introduction thread, active replies",
  whenDay: "2026-08-19",
  signal: "actively partnering while the proposal sits",
  act: "Reach Natalie and William today.",
  reason: "Their partner thread is live.",
  cites: [
    {
      k: "abc123def456",
      day: "2026-08-19",
      who: "Anika Steenstra",
      subject: "Re: Partner Introduction ~ Zayzoon",
    },
  ],
};

test("the gem grammar round-trips, acted stamp included", () => {
  const [back] = parseGemsBody(renderGemsBody([gem]));
  assert.ok(back);
  assert.deepEqual(back.who, gem.who);
  assert.equal(back.whoKind, "account");
  assert.equal(back.term, "PARTNER MOTION");
  assert.equal(back.whenDay, "2026-08-19");
  assert.equal(back.act, gem.act);
  assert.equal(back.actedDay, "");
  assert.equal(back.cites[0].k, "abc123def456");
  assert.equal(back.cites[0].day, "2026-08-19");

  const acted = { ...gem, actedDay: "2026-08-21" };
  const [back2] = parseGemsBody(renderGemsBody([acted]));
  assert.equal(back2.actedDay, "2026-08-21");
});

test("three gems cap; a fourth never renders", () => {
  const four = [gem, gem, gem, gem];
  assert.equal(parseGemsBody(renderGemsBody(four)).length, 3);
});

test("the support grammar round-trips", () => {
  const body = renderSupportBody({
    dropSha: "d942e0f2ffffffff",
    total: 96,
    spike: { day: "2026-08-18", n: 9 },
    themes: [
      {
        label: "payroll tax filings",
        n: 9,
        firstDay: "2026-06-02",
        lastDay: "2026-08-18",
        examples: ["Suggested Solution", "New note added"],
      },
    ],
  });
  const parsed = parseSupportBody(body);
  assert.equal(parsed?.total, 96);
  assert.deepEqual(parsed?.spike, { day: "2026-08-18", n: 9 });
  assert.equal(parsed?.themes[0].label, "payroll tax filings");
  assert.deepEqual(parsed?.themes[0].examples, ["Suggested Solution", "New note added"]);
});

test("the intent grammar round-trips", () => {
  const body = renderIntentBody({
    dropSha: "d942e0f2ffffffff",
    windows: {
      w7: { s: 0, o: 0, c: 0 },
      w30: { s: 812, o: 240, c: 31 },
      w60: { s: 1500, o: 400, c: 60 },
      w90: { s: 2100, o: 540, c: 87 },
      lastOpen: "2026-08-18",
      top: [
        { campaign: "A Smarter Way to Benchmark Pay", o: 88, c: 12, last: "2026-08-18" },
      ],
    },
    receipts: 9,
  });
  const parsed = parseIntentBody(body);
  assert.deepEqual(parsed?.windows.w30, { s: 812, o: 240, c: 31 });
  assert.equal(parsed?.windows.lastOpen, "2026-08-18");
  assert.equal(parsed?.windows.top[0].campaign, "A Smarter Way to Benchmark Pay");
  assert.equal(parsed?.receipts, 9);
});

test("stage and manifest blocks round-trip", () => {
  const slice: AccountSlice = {
    id: "001TESTTRENDHR000A",
    name: "Trend Personnel",
    meta: {
      primaryContact: "Natalie Borland",
      primaryContactTitle: "CFO",
      lastContact: "",
      contactedDate: "4/12/2017",
      lastEmailSentKey: "",
      lastEmailReceivedKey: "2026-08-19 09:02",
      gbc: "",
    },
    rows: [
      {
        k: "abc",
        d: "2026-08-19",
        s: "Re: hello",
        a: "Colleague One",
        lane: "human",
        sub: "Email",
        rt: "Service Provider Task",
        ct: "",
        fl: "",
        c: "a note",
      },
    ],
    dropped: 0,
    tally: { days: {}, camps: {}, receipts: 0 },
    laneCounts: { human: 1, csm: 0, support: 0, intent: 0, machinery: 0 },
    rowsSum: "r",
    tallySum: "t",
  };
  const back = parseStageBody(renderStageBody(slice, "d942e0f2ffffffff"));
  assert.equal(back?.dropSha, "d942e0f2ffffffff");
  assert.deepEqual(back?.slice, slice);

  const manifest: DropManifest = {
    dropSha: "d942e0f2ffffffff",
    dropDay: "2026-08-20",
    fileName: "report.csv",
    fileBytes: 42,
    rowCount: 6,
    dupes: 1,
    window: { from: "2026-05-23", to: "2026-08-20" },
    laneTotals: { human: 1, csm: 0, support: 1, intent: 2, machinery: 1 },
    receiptRows: 0,
    accounts: [
      {
        id: slice.id,
        name: slice.name,
        rowsSum: "r",
        tallySum: "t",
        rows: 1,
        humanRows: 1,
      },
    ],
    unmatched: [{ name: "Advocate Pay LLC", id18: "001Z", rows: 1 }],
    colleagues: ["Colleague One"],
    collisions: [],
    headerDiff: { missing: [], extra: [] },
    totalBatches: 2,
  };
  const store = { manifest, run: emptyRunState(), prior: null };
  const parsed = parseManifestBody(renderManifestBody(store));
  assert.deepEqual(parsed, store);
});

test("isRollupNoteId separates the rollup from its stage and manifest kin", () => {
  assert.equal(isRollupNoteId("activity:001X"), true);
  assert.equal(isRollupNoteId("activity:stage:001X"), false);
  assert.equal(isRollupNoteId("activity:manifest"), false);
  assert.equal(isRollupNoteId("gems:001X"), false);
});

test("sv keeps grammar separators out of values", () => {
  assert.equal(sv("a · b | c\nd"), "a - b - c d");
});

// ── the mechanical canon linter (§7.2) ──────────────────────────────────────

test("acts: the accept set", () => {
  for (const act of [
    "Reach Natalie and William today.",
    "Ask Greg about the tax thread.",
    "Open the first conversation.",
    "Call the CSM.",
    "Send the Canada pricing.",
  ])
    assert.equal(lintAct(act).ok, true, act);
});

test("acts: the reject set — hedges, deadlines, length, mood, retirements", () => {
  for (const [act, why] of [
    ["It may be worth reaching out to Natalie.", "hedge + not imperative"],
    ["Consider calling the CSM.", "hedge"],
    ["Call the CSM before Friday.", "deadline rides the action"],
    ["Reach out to Natalie and William and the whole team today.", "over six words"],
    ["The model delivery is pending.", "noun-form, not imperative"],
    ["Email them — they seem keen.", "aside"],
    ["Work their own book angle.", "retired vocabulary"],
    ["Send the next steps list.", "the banned word"],
  ] as const)
    assert.equal(lintAct(act).ok, false, `${why}: ${act}`);
});

test("reasons carry deadlines; hedges still die", () => {
  assert.equal(lintReason("Renewal meeting Monday.").ok, true);
  assert.equal(lintReason("Nine support cases. Never pitched.").ok, true);
  assert.equal(lintReason("It may be worth a look.").ok, false);
});

test("terms: two words, labels not sentences", () => {
  assert.equal(lintTerm("PARTNER MOTION").ok, true);
  assert.equal(lintTerm("TAX THREAD").ok, true);
  assert.equal(lintTerm("A VERY LONG TERM").ok, false);
  assert.equal(lintTerm("Partner motion happening now.").ok, false);
});
