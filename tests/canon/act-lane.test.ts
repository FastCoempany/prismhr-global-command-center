// Canon pins for the Act Lane (CLAUDE.md "The Act Lane" and the Ted
// doctrine's "Provenance is columns", rulings of 2026-09-25: D23/P3, C7),
// and for the Accounts sheet it works beside (pass 9: Send consumes it, the
// send's stamp, the board lift, the click-depth doors, plain account links,
// C19, the direct doctrine's quiet flag, hidden is hidden, and D15).

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
// The CSS-module hook registers on this import, before any face loads.
import { render, textOf } from "../helpers/room-render";
import { actSendRow } from "../../src/lib/act/lane";
import { buildQueue, SEAT_SLOT_CAP, type QueueItem } from "../../src/lib/groundwork/day";
import { buildFile } from "../../src/lib/groundwork/file";
import { quietChipOf, quietFlagOf } from "../../src/lib/activity/quiet-flag";
import type { Peo } from "../../src/lib/book";
import { readAccount, type RecordNote } from "../../src/lib/record/read";
import { lastHumanTouch, sheetSecond } from "../../src/lib/record/accounts";
import { parseGemsBody, renderGemsBody, type Gem } from "../../src/lib/activity/stores";
import { lintAct, lintReason } from "../../src/lib/activity/lint";
import {
  KITS,
  askText,
  defaultPlay,
  getKit,
  kitText,
  kitsFor,
  mergeText,
  playNextAction,
  playsFor,
} from "../../src/lib/campaigns";
import { createTodoRow, type NewTodo, type TodoData } from "../../src/lib/notes/write";
import { buildAccountSheet } from "../../src/lib/room/sheet-view";
import {
  boardWords,
  csmThreadFlagOf,
  draftOnClose,
  forkTodo,
  liveOnBoard,
  registersOf,
  sendConsequences,
  sendFlagOf,
  stampActed,
  touchCiteOf,
  unparked,
} from "../../src/app/accounts/rules";
import type { AccountRow } from "../../src/app/accounts-client";
import type { LaneAct } from "../../src/app/accounts/act-lane";

const peo = (id: string, name: string): Peo => ({
  id,
  name,
  cloud: "TST",
  csm: "Unassigned",
  contactName: "",
  contactEmail: "",
  size: 1000,
  sizeBucket: "Medium (1,000 - 4,999)",
  industry: "PEO/ASO",
  city: "",
  state: "",
  website: "",
  lastActivity: "",
  fit: 50,
  fitTier: "medium",
});

describe("every writer, the Act Lane included, fills actors and recipients at write (D23/P3)", () => {
  test("Send's row carries the operator as actor, the address as recipient, and no money", () => {
    const row = actSendRow({
      to: "pat@example.com",
      subject: "Re: the model, $12,000 a year",
    });
    assert.equal(row.actors, "Antaeus Coe → pat@example.com");
    assert.equal(row.recipients, "pat@example.com");
    assert.equal(row.lane, "mine");
    assert.equal(row.source, "act-lane");
    assert.ok(row.body.startsWith("✉ "), "a real ✉ outbound head");
    assert.equal(
      row.body.includes("12,000"),
      false,
      "the figure never reaches the record",
    );
    assert.ok(row.body.includes("pat@example.com"), "the send names its recipient");
  });

  test("a blank subject still files as a send, addressed", () => {
    const row = actSendRow({ to: "pat@example.com", subject: "" });
    assert.ok(row.body.startsWith("✉ Sent"));
    assert.equal(row.recipients, "pat@example.com");
    assert.equal(row.actors.endsWith("→ pat@example.com"), true);
  });
});

describe("seats keep their own cap (C7)", () => {
  test("a fourth seat sinks below the third — and below the next rule's own hit", () => {
    const ids = ["A1", "A2", "A3", "A4"];
    const wire = peo("W1", "Newsmaker");
    const { all } = buildQueue({
      accounts: [...ids.map((id, i) => peo(id, `Seat ${i + 1}`)), wire],
      intelById: new Map(),
      notesById: new Map(),
      touches: [],
      contactCountById: () => 5,
      wireAtById: new Map([[wire.id, "2026-08-20T12:00:00Z"]]),
      seats: new Map(
        ids.map((id, i) => [id, { act: `Move ${i + 1}.`, term: "T", day: "2026-08-21" }]),
      ),
      now: new Date("2026-08-21T15:00:00Z"),
    });
    const seatedPositions = all
      .map((q, i) => (q.ruleId === "seated" ? i : -1))
      .filter((i) => i >= 0);
    // Three seats lead in a block; the fourth sits after the wire hit.
    assert.deepEqual(seatedPositions.slice(0, SEAT_SLOT_CAP), [0, 1, 2]);
    assert.equal(all[SEAT_SLOT_CAP].ruleId, "wire-trigger");
    assert.equal(seatedPositions[SEAT_SLOT_CAP], SEAT_SLOT_CAP + 1);
  });
});

// ── Pass 9, the accounts slice (docs/architecture/pass-8-rewalk.md §3: A2 to
// A8, X1's Accounts part, D15 per pass 8 call 2). The rules the page and the
// lane run are pure (src/app/accounts/rules.ts); the faces render under
// node:test through the suite's CSS-module hook (tests/helpers). One block,
// D15's, reads source, as the Chute canon's revalidation pin does: an action
// that needs a request cookie cannot be called here.

const NOW9 = new Date("2026-10-07T15:00:00Z");
const ACCT = "001F000000w38BOIAY";

type NoteOver = Partial<RecordNote> & { id: string; body: string; createdAt: string };
const note = (o: NoteOver): RecordNote => ({
  accountId: ACCT,
  partner: "",
  kind: "account",
  lane: "mine",
  actors: "",
  source: "",
  recipients: "",
  ...o,
});

const readOf = (notes: RecordNote[], dispositions = new Map<string, unknown>()) =>
  readAccount({
    account: { id: ACCT, name: "Simploy" },
    notes,
    touches: [],
    todos: [],
    dispositions,
    homeSide: [],
    now: NOW9,
  });

const gem = (term: string, over: Partial<Gem> = {}): Gem => ({
  dropSha: "abc123",
  verdict: "CONFIRMED",
  createdDay: "2026-10-01",
  actedDay: "",
  who: ["Pat Lee"],
  whoKind: "account",
  term,
  what: "They asked about Mexico.",
  whenDay: "2026-09-30",
  signal: "a question",
  act: "Answer Pat about Mexico.",
  reason: "They asked on 9/30.",
  cites: [{ k: "r1", day: "2026-09-30", who: "Pat Lee", subject: "Mexico" }],
  ...over,
});

// A sheet row with every field the client reads; each test overrides its own.
const sheetRow = async (over: Record<string, unknown> = {}) => {
  const { EMPTY_ENGAGEMENT } = await import("../../src/lib/engagement");
  return {
    id: ACCT,
    second: null,
    touch: null,
    touchCite: null,
    collision: null,
    actDraft: null,
    actedDay: "",
    actedTerm: "",
    onBoard: false,
    name: "Simploy",
    industry: "PEO",
    sizeBucket: "",
    size: 0,
    city: "",
    state: "",
    csm: "Anika Steenstra",
    cloud: "",
    website: "",
    contactName: "Pat Lee",
    contactEmail: "pat@simploy.com",
    incumbent: false,
    deskScore: 50,
    demand: null,
    confidence: "low",
    signals: [],
    evidence: [],
    summary: "",
    researched: false,
    play: null,
    competitors: [],
    countries: [],
    demandAdj: null,
    confFactor: 1,
    score: 50,
    tier: "medium",
    breakdown: { scale: 1, incumbency: 1, model: 1, recency: 1 },
    validation: null,
    engagement: EMPTY_ENGAGEMENT,
    risk: null,
    disposition: null,
    notes: [],
    chipNotes: [],
    bgNotes: [],
    people: [],
    contactCount: 0,
    stage: "NOT_TOUCHED",
    approach: "NEEDS_CSM",
    intent: "UNKNOWN",
    blended: 0,
    nextAction: null,
    nextActionDate: null,
    peoNotes: null,
    ...over,
  } as unknown as AccountRow;
};

const renderSheet = async (rows: AccountRow[], query = "") => {
  const { AccountsClient } = await import("../../src/app/accounts-client");
  return render(
    createElement(
      SearchParamsContext.Provider,
      { value: new URLSearchParams(query) },
      createElement(AccountsClient, {
        rows,
        canAdd: true,
        canWrite: true,
        onDashboard: [],
      }),
    ),
  );
};

const laneAct = (over: Partial<LaneAct> = {}): LaneAct => ({
  accountId: ACCT,
  accountName: "Simploy",
  term: "MEXICO ASK",
  act: "Answer Pat about Mexico.",
  reason: "They asked on 9/30.",
  whenDay: "2026-09-30",
  cites: [],
  to: "Pat Lee",
  toEmail: "pat@simploy.com",
  subject: "Mexico",
  body: "",
  onBoard: false,
  flag: "",
  ...over,
});

const renderLane = async (act: LaneAct) => {
  const { default: ActLane } = await import("../../src/app/accounts/act-lane");
  return render(createElement(ActLane, { act, canWrite: true, onClose: () => {} }));
};

describe("Send consumes it (A2; the Act Lane, A8.12)", () => {
  test("a sent draft is gone: the close after Send saves nothing", () => {
    const typed = { to: "Pat Lee", subject: "Mexico", body: "Here is the answer." };
    assert.equal(draftOnClose({ ...typed, dirty: true, sent: true }), null);
  });

  test("an unsent, touched draft still saves on close; the pad never eats your words", () => {
    const typed = { to: "Pat Lee", subject: "Mexico", body: "Half a thought" };
    assert.deepEqual(draftOnClose({ ...typed, dirty: true, sent: false }), typed);
    assert.equal(draftOnClose({ ...typed, dirty: false, sent: false }), null);
  });
});

describe("Send stamps the gem acted, as the hover ✓ does (A3; A4.14, A8.4)", () => {
  test("Send consumes the draft and stamps the lane's gem with today's Chicago day", () => {
    // 01:00 UTC on the 7th is still the 6th in Chicago.
    const after = sendConsequences({
      accountId: ACCT,
      term: "MEXICO ASK",
      now: new Date("2026-10-07T01:00:00Z"),
    });
    assert.equal(after.consumeDraft, `actdraft:${ACCT}`);
    assert.deepEqual(after.stamp, { term: "MEXICO ASK", day: "2026-10-06" });
  });

  test("the stamp lands on the gems store's actedDay, clears the nag, and keeps its ↺", () => {
    const gems = [
      gem("MEXICO ASK"),
      gem("PHR STALL", { act: "Ask Pat about the stall." }),
    ];
    const stamped = stampActed(gems, "MEXICO ASK", "2026-10-07");
    assert.ok(stamped);
    // The store keeps the day through its own grammar.
    const stored = parseGemsBody(renderGemsBody(stamped));
    assert.equal(stored.find((g) => g.term === "MEXICO ASK")?.actedDay, "2026-10-07");
    // The ACT chip moves off the acted gem.
    const sr = { rollup: null, gems: stored, support: null, intent: null };
    assert.equal(sheetSecond(sr)?.act, "Ask Pat about the stall.");
    // ↺: the take-back clears the same field, and the chip comes back.
    const back = stampActed(stored, "MEXICO ASK", "");
    assert.ok(back);
    assert.equal(sheetSecond({ ...sr, gems: back })?.act, "Answer Pat about Mexico.");
  });

  test("a term no gem carries stamps nothing", () => {
    assert.equal(stampActed([gem("MEXICO ASK")], "NOT HERE", "2026-10-07"), null);
  });
});

describe("the board lift reads a live deal (A4; A8.15)", () => {
  const outcome = (status: "won" | "lost") => ({
    __outcome: JSON.stringify({ status, phrase: "They signed.", at: "2026-10-01" }),
  });
  const ids: Record<string, string> = {
    "Won Co": "W",
    "Lost Co": "L",
    "Old Co": "O",
    "Live Co": "V",
  };
  const words = boardWords(
    [
      { name: "Won Co", archived: false, notes: outcome("won") },
      { name: "Lost Co", archived: false, notes: outcome("lost") },
      { name: "Old Co", archived: true, notes: {} },
      { name: "Live Co", archived: false, notes: {} },
      { name: "Nobody", archived: false, notes: {} },
    ],
    (name) => ids[name] ?? "",
  );

  test("a Closed Won, a Closed Lost and an archived card are not a live deal", () => {
    assert.equal(liveOnBoard(words.get("W")), false);
    assert.equal(liveOnBoard(words.get("L")), false);
    assert.equal(liveOnBoard(words.get("O")), false);
  });

  test("a card neither archived nor stamped is; no card is not", () => {
    assert.equal(liveOnBoard(words.get("V")), true);
    assert.equal(liveOnBoard(undefined), false);
  });

  test("the stamp outranks a live card on the same account", () => {
    const both = boardWords(
      [
        { name: "Won Co", archived: false, notes: {} },
        { name: "Won Co", archived: false, notes: outcome("won") },
      ],
      (name) => ids[name] ?? "",
    );
    assert.equal(liveOnBoard(both.get("W")), false);
  });

  test("the lane off a live deal sends the follow-up to Groundwork, and never says the deal is live", async () => {
    const off = textOf(await renderLane(laneAct({ onBoard: false })));
    assert.ok(off.includes("⚑ GROUNDWORK"), off);
    assert.ok(!off.includes("the deal is live"), off);
    const on = textOf(await renderLane(laneAct({ onBoard: true })));
    assert.ok(on.includes("⌂ HOMEROOM"), on);
  });
});

// ── the fork lands where its receipt says (A8.15) ───────────────────────────
// A live deal's move lands as a HomeRoom action todo. The register lists
// only action todos, so the fork files the action tag a composed action
// carries. It used to file the bare text: the lane answered "✓ FILED · THE
// HOMEROOM'S TODAY REGISTER" and the line never appeared there.

describe("the HomeRoom fork lands in the TODAY register (A8.15)", () => {
  const now = new Date("2026-10-07T15:00:00Z");
  const filed = async (t: NewTodo) => {
    const writes: TodoData[] = [];
    const client = {
      todo: {
        create: async ({ data }: { data: TodoData }) => {
          writes.push(data);
          return { id: "fork1" };
        },
        findFirst: async () => null,
      },
    };
    await createTodoRow(t, client);
    const d = writes[0];
    return {
      id: "fork1",
      body: d.body,
      done: false,
      accountId: d.accountId ?? "",
      remindAt: d.remindAt ? d.remindAt.toISOString() : "",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  };

  test("the fork's row, fed to the register, is an open line today", async () => {
    const row = await filed(
      forkTodo({ accountId: "ACCT01", act: "Ask Adam for the census", now }),
    );
    const sheet = buildAccountSheet([row], "ACCT01", new Set(), new Map(), now);
    assert.equal(sheet.open.length, 1, "the line reaches TODAY");
    assert.equal(sheet.open[0].body, "Ask Adam for the census");
    assert.equal(sheet.delayed.length, 0, "due now, not scheduled");
  });

  test("the bare row it used to file is the one the register skips", async () => {
    const row = await filed({
      body: "Ask Adam for the census",
      accountId: "ACCT01",
      remindAt: now,
    });
    const sheet = buildAccountSheet([row], "ACCT01", new Set(), new Map(), now);
    assert.equal(sheet.open.length, 0, "an untagged todo is a note to the register");
  });

  test("forkAct's HomeRoom half files through the rule", () => {
    const src = readFileSync("src/app/accounts/act-actions.ts", "utf8");
    assert.match(src, /createTodoRow\(\s*forkTodo\(/);
  });
});

describe("LAST HUMAN TOUCH and the verdict open one click deep (A5, the click-depth law)", () => {
  test("the touch cell and the verdict cell are doors on the sheet", async () => {
    const row = await sheetRow({
      touch: { who: "Pat Lee", day: "2026-09-22", kind: "ours", record: "record" },
      touchCite: {
        from: "record",
        day: "2026-09-22",
        who: "Pat Lee",
        how: "SENT",
        text: "✉ The Mexico model — sent to Pat Lee.",
      },
      second: {
        gems: [],
        act: null,
        verdict: "3 human rows, latest 2026-09-22 — nothing actionable",
        supportTotal: 2,
        spikeDay: "",
      },
    });
    const html = await renderSheet([row]);
    assert.match(html, /<button type="button" class="srTouch" aria-expanded="false"/);
    assert.match(
      html,
      /<button type="button" class="srVerdict" aria-expanded="false"[^>]*>3 human rows/,
    );
  });

  test("the first record's touch opens to the entry it read", async () => {
    const send = note({
      id: "n1",
      body: "✉ The Mexico model — sent to Pat Lee.",
      actors: "Antaeus Coe → Pat Lee",
      createdAt: "2026-09-22T15:00:00Z",
    });
    const read = readOf([send]);
    const touch = lastHumanTouch(read, null);
    const cite = touchCiteOf(read, touch, null);
    assert.equal(cite?.from, "record");
    assert.equal(cite?.how, "SENT");
    assert.ok(cite && cite.from === "record" && cite.text.includes("The Mexico model"));
    const { TouchEvidence } = await import("../../src/app/accounts/second-record-panel");
    const text = textOf(
      await render(createElement(TouchEvidence, { accountId: ACCT, cite: cite! })),
    );
    assert.ok(text.includes("The Mexico model"), text);
  });

  test("a logged touch opens to the log's own message", () => {
    const read = readAccount({
      account: { id: ACCT, name: "Simploy" },
      notes: [],
      touches: [
        {
          subjectKey: `outreach:${ACCT}`,
          label: "Simploy",
          message: "Called Pat about the Mexico model.",
          contactedAt: "2026-10-02T15:00:00Z",
          status: "awaiting",
          log: [],
        },
      ],
      todos: [],
      dispositions: new Map(),
      homeSide: [],
      now: NOW9,
    });
    const cite = touchCiteOf(read, lastHumanTouch(read, null), null);
    assert.equal(cite?.from, "record");
    assert.equal(cite?.how, "LOGGED TOUCH");
    assert.ok(cite && cite.from === "record" && cite.text.includes("Mexico model"));
  });

  test("the export's touch opens to its row, and the row to its excerpt", async () => {
    const lastHuman = {
      day: "2026-10-01",
      how: "email",
      who: "Pat Lee",
      kind: "account",
      subject: "Re: Mexico headcount",
    };
    const touch = {
      who: "Pat Lee",
      day: "2026-10-01",
      kind: "account",
      record: "salesforce" as const,
    };
    const cite = touchCiteOf(readOf([]), touch, lastHuman);
    // The cite carries the row's key when the rollup did (S-17); this rollup
    // was written before the key rode, so the key is empty and the fold
    // falls back to the day and the subject.
    assert.deepEqual(cite, {
      from: "salesforce",
      day: "2026-10-01",
      who: "Pat Lee",
      how: "EMAIL",
      subject: "Re: Mexico headcount",
      k: "",
    });
    const { TouchEvidence } = await import("../../src/app/accounts/second-record-panel");
    const html = await render(
      createElement(TouchEvidence, { accountId: ACCT, cite: cite! }),
    );
    assert.match(html, /<button type="button" class="srCite"/);
    assert.ok(textOf(html).includes("Re: Mexico headcount ▸ read it"), textOf(html));
  });

  test("the verdict's fold carries the rows it counted", async () => {
    const { default: SecondRecordPanel } =
      await import("../../src/app/accounts/second-record-panel");
    const html = await render(
      createElement(SecondRecordPanel, {
        accountId: ACCT,
        second: {
          gems: [],
          act: null,
          verdict: "3 human rows",
          supportTotal: 0,
          spikeDay: "",
        },
      }),
    );
    assert.ok(
      textOf(html).includes("THE STAGED ROWS, NEWEST FIRST ▸ the rows"),
      textOf(html),
    );
  });
});

describe("account names are plain links, no ↗ (A6; A11.2)", () => {
  test("the Salesforce link reads in plain words", async () => {
    const { SfCheckpoint } = await import("../../src/components/sf");
    const html = await render(
      createElement(SfCheckpoint, { when: "account", id: ACCT, name: "Simploy" }),
    );
    assert.ok(textOf(html).includes("Open Simploy in Salesforce"), textOf(html));
    assert.ok(!html.includes("↗"), html);
  });

  test("the open drilldown carries no arrow glyph", async () => {
    const html = await renderSheet([await sheetRow()], `focus=${ACCT}`);
    assert.ok(html.includes("acctDetail"), "the drilldown is open");
    assert.ok(!html.includes("↗"), "an arrow glyph rides the drilldown");
  });
});

describe("the Approach is a fact, never a gate (A7; C19)", () => {
  const STAGES_WITH_PLAYS = [...new Set(KITS.map((k) => k.stage))];

  test("every play for the stage shows, whatever the Approach recorded", () => {
    for (const stage of STAGES_WITH_PLAYS) {
      const all = KITS.filter((k) => k.stage === stage)
        .map((k) => k.id)
        .sort();
      assert.deepEqual(
        kitsFor(stage)
          .map((k) => k.id)
          .sort(),
        all,
        stage,
      );
    }
  });

  test("the stage's direct play is the default seed at every stage, NOT_TOUCHED included", () => {
    assert.ok(STAGES_WITH_PLAYS.includes("NOT_TOUCHED"));
    for (const stage of STAGES_WITH_PLAYS) {
      const seed = defaultPlay(stage);
      assert.ok(seed, `${stage} has no direct play`);
      assert.notEqual(seed!.audience, "CSM", stage);
      assert.equal(kitsFor(stage)[0].id, seed!.id, `${stage} leads with its direct play`);
    }
    assert.equal(defaultPlay("OPPORTUNITY"), undefined);
  });

  test("NOT_TOUCHED's direct play asks in the writing canon, and carries no figure", () => {
    const seed = defaultPlay("NOT_TOUCHED")!;
    const ctx = {
      name: "Simploy",
      csm: "Anika Steenstra",
      contactName: "Pat Lee",
      city: "",
      state: "",
      industry: "PEO",
    };
    const ask = askText(seed.ask, ctx);
    assert.equal(ask, "Email Pat about global hiring");
    assert.deepEqual(lintAct(ask), { ok: true, faults: [] }, ask);
    // With no contact on file the ask still reads as an instruction.
    const bare = askText(seed.ask, { ...ctx, contactName: "" });
    assert.equal(bare, "Email the contact about global hiring");
    assert.deepEqual(lintAct(bare), { ok: true, faults: [] }, bare);
    // The greeting keeps its own fallback.
    assert.ok(mergeText(seed.body, { ...ctx, contactName: "" }).startsWith("Hi there,"));
    assert.doesNotMatch(`${seed.subject}\n${seed.body}`, /[$€£]\s?\d/);
  });

  test("the CSM play is the alternative and carries the quiet flag when the CSM's thread is live", () => {
    const col = {
      mktgSends7: 0,
      colleague: { who: "Anika Steenstra", day: "2026-10-02" },
    };
    const plays = playsFor("NOT_TOUCHED", csmThreadFlagOf(col));
    assert.equal(plays[0].kit.audience, "PEO");
    assert.equal(plays[0].flag, "");
    const csm = plays.find((p) => p.kit.audience === "CSM");
    assert.ok(csm, "the CSM play stays available");
    assert.equal(csm!.flag, "ANIKA STEENSTRA'S THREAD · 10/02");
    // No live thread, no flag; a marketing cadence is not the CSM's thread.
    assert.equal(csmThreadFlagOf(null), "");
    assert.equal(csmThreadFlagOf({ mktgSends7: 3, colleague: null }), "");
  });
});

// The play copy, swept against the plain-speech law and the writing canon
// (the coordinator's follow-up to A7). Every line runs through the canon lint
// the second record's gems face (src/lib/activity/lint.ts), so a device in a
// play fails the build: drafts a CSM or a prospect reads go sentence by
// sentence through the device and hedge checks, and each ask goes through
// the action-line lint whole.
describe("the play copy obeys the plain-speech law", () => {
  const CTX = {
    name: "Regis HR Group",
    csm: "Anika Steenstra",
    contactName: "Pat Lee",
    city: "",
    state: "",
    industry: "PEO",
  };
  const BARE = { ...CTX, csm: "Unassigned", contactName: "" };
  // Two of the lint's faults are the gem line's format, not devices: the
  // eight-word cap and the digit that is not a date. A draft says "20
  // minutes" and runs longer than eight words; neither is a device.
  const FORMAT_ONLY = /the cap is eight|a digit that is not a date/;
  const faultsIn = (line: string) =>
    lintReason(line).faults.filter((f) => !FORMAT_ONLY.test(f));
  const sentencesOf = (text: string) =>
    text
      .split(/\n+/)
      .flatMap((para) => para.split(/(?<=[.!?])\s+/))
      .map((x) => x.trim())
      .filter(Boolean);

  test("every name, subject and sentence of every play passes the canon lint", () => {
    const found: string[] = [];
    for (const kit of KITS)
      for (const ctx of [CTX, BARE]) {
        const { subject, body } = kitText(kit, ctx);
        for (const line of [kit.name, subject, ...sentencesOf(body)])
          for (const f of faultsIn(line)) found.push(`${kit.id}: ${f} · ${line}`);
      }
    assert.deepEqual(found, []);
  });

  test("every ask is an action line in the writing canon, with or without names", () => {
    for (const kit of KITS)
      for (const ctx of [CTX, BARE]) {
        const ask = askText(kit.ask, ctx);
        assert.deepEqual(lintAct(ask), { ok: true, faults: [] }, `${kit.id}: ${ask}`);
      }
  });

  test("no play carries a dash, a money figure or an unfilled placeholder", () => {
    for (const kit of KITS)
      for (const ctx of [CTX, BARE]) {
        const { subject, body } = kitText(kit, ctx);
        const all = [kit.name, subject, body, askText(kit.ask, ctx)].join("\n");
        assert.doesNotMatch(all, /[—–]|\s-\s/, kit.id);
        assert.doesNotMatch(all, /[$€£]\s?\d/, kit.id);
        assert.doesNotMatch(all, /\{\w+\}/, kit.id);
      }
  });

  test("a draft never claims a CSM who isn't there", () => {
    const nudge = getKit("peo-value-nudge")!;
    assert.ok(
      kitText(nudge, CTX).body.includes("Anika Steenstra knows I'm reaching out."),
    );
    const bare = kitText(nudge, BARE).body;
    assert.doesNotMatch(bare, /CSM|Unassigned|reaching out/);
    assert.ok(bare.startsWith("Hi there,\n\nI work on the global side"), bare);
    assert.equal(
      askText(getKit("csm-brief-intro")!.ask, BARE),
      "Ask the CSM for an intro",
    );
  });

  test("the lint is the gate: the lines the sweep removed fail it", () => {
    assert.ok(
      faultsIn("I'll keep it low-key and lead with value, not a pitch.").includes(
        "antithesis",
      ),
    );
    assert.ok(
      faultsIn(
        "Helping Regis clients hire internationally — no entity required",
      ).includes("a dash hinge"),
    );
  });
});

describe("the lane's send carries the quiet flag (A8; the direct doctrine)", () => {
  const thread = {
    mktgSends7: 0,
    colleague: { who: "Anika Steenstra", day: "2026-10-02" },
  };
  const cadence = { mktgSends7: 3, colleague: null };

  test("the flag's words are Groundwork's file card's, off the same collision", () => {
    // One writer (pass 9 seam, S-6): the Act Lane's send and the file card
    // both read src/lib/activity/quiet-flag.ts, so the parity below holds by
    // construction, the colleague the export could not name included (the
    // two copies once said "'S THREAD" and "A COLLEAGUE'S THREAD" for it).
    assert.equal(sendFlagOf, quietFlagOf);
    const peoW = peo("001F000000w38BOIAY", "Simploy");
    const item = {
      accountId: peoW.id,
      name: peoW.name,
      ruleId: "seated",
      weight: 95,
      band: "now",
      action: "Answer Pat about Mexico.",
      reason: "Seated 10/7 from the sheet.",
      owed: "",
      carried: false,
      intent: null,
    } as unknown as QueueItem;
    const unnamed = { mktgSends7: 0, colleague: { who: "", day: "2026-10-02" } };
    for (const col of [thread, cadence, unnamed]) {
      const file = buildFile(peoW, {
        queueItem: item,
        intent: null,
        notes: [],
        touches: [],
        wire: [],
        contacts: [],
        second: { collision: col },
        now: NOW9,
      });
      assert.equal(sendFlagOf(col), file.collisionLine);
    }
    assert.equal(sendFlagOf(unnamed), "A COLLEAGUE'S THREAD · 10/02");
    assert.equal(sendFlagOf(null), "");
    // The stage's chip is the same words cut to the chip row: a first name,
    // and the cadence without its noun.
    assert.equal(quietChipOf(thread), "ANIKA'S THREAD · 10/02");
    assert.equal(quietChipOf(cadence), "MKTG CADENCE LIVE · 3 THIS WEEK");
    assert.equal(quietChipOf(unnamed), "A COLLEAGUE'S THREAD · 10/02");
  });

  test("the lane shows the flag above the composed send; it informs and the send stays", async () => {
    const html = await renderLane(laneAct({ flag: sendFlagOf(thread) }));
    assert.match(
      html,
      /class="quietFlag"[^>]*>⚠ ANIKA STEENSTRA&#x27;S THREAD · 10\/02</,
    );
    assert.ok(textOf(html).includes("Send it → mail"), "the send is not blocked");
    const clear = await renderLane(laneAct({ flag: "" }));
    assert.ok(!clear.includes("quietFlag"));
  });
});

describe("hidden is hidden on Accounts (X1)", () => {
  const parked = [1, 2, 3].map((i) =>
    note({
      id: `h${i}`,
      body: `✉ OL 9/${i} — Re: pricing · Hidden Person → Antaeus Coe\nWhat about pricing?`,
      actors: "Hidden Person → Antaeus Coe",
      createdAt: `2026-09-0${i}T15:00:00Z`,
    }),
  );
  const seen = note({
    id: "v1",
    body: "✉ OL 9/20 — Re: Mexico · Pat Lee → Antaeus Coe\nCan we talk Mexico?",
    actors: "Pat Lee → Antaeus Coe",
    createdAt: "2026-09-20T15:00:00Z",
  });
  const bg = note({
    id: "h4",
    lane: "background",
    body: "Case 123 — Hidden Person opened a case",
    actors: "Hidden Person",
    createdAt: "2026-09-04T15:00:00Z",
  });
  const notes = [...parked, bg, seen];
  const dispositions = new Map<string, unknown>(
    ["h1", "h2", "h3", "h4"].map((id) => [`hide:note:${id}`, { status: "parked" }]),
  );
  const read = readOf(notes, dispositions);

  test("a ✕-parked entry leaves both registers", () => {
    const r = registersOf(notes, read.hidden);
    assert.deepEqual(
      r.mine.map((n) => n.id),
      ["v1"],
    );
    assert.deepEqual(r.background, []);
  });

  test("the contacts panel and the draft desk read the record minus parked rows", () => {
    assert.deepEqual(
      unparked(notes, dispositions).map((n) => n.id),
      ["v1"],
    );
  });

  test("the people index never names a person only parked rows hold", () => {
    assert.deepEqual(
      read.people.map((p) => p.name),
      ["Pat Lee"],
    );
  });

  test("the applied play's next action names the visible relationship", () => {
    const kit = getKit("peo-value-nudge")!;
    const p = peo(ACCT, "Simploy");
    assert.equal(
      playNextAction(kit, p, read.relationship.name),
      "Email Pat about hiring abroad",
    );
  });
});

describe("no action revalidates another surface (D15, pass 8 call 2)", () => {
  const SRC = (f: string) => readFileSync(join(process.cwd(), f), "utf8");
  // Every server-action module the Accounts sheet posts to.
  const files = ["src/app/accounts", "src/app/book"]
    .flatMap((dir) => readdirSync(join(process.cwd(), dir)).map((f) => `${dir}/${f}`))
    .filter((f) => /\.tsx?$/.test(f) && SRC(f).startsWith('"use server";'));

  test("the Act Lane's actions revalidate nothing; the lane asks the router", () => {
    const act = SRC("src/app/accounts/act-actions.ts");
    assert.doesNotMatch(act, /\brevalidate(?:Path|Tag)\s*\(|from "next\/cache"/);
    for (const f of ["src/app/accounts/act-lane.tsx", "src/app/accounts-client.tsx"]) {
      const src = SRC(f);
      assert.match(src, /import \{[^}]*useRouter[^}]*\} from "next\/navigation"/, f);
      assert.ok(src.includes("router.refresh()"), `${f} never asks for the fresh read`);
    }
  });

  test("no action names another surface's path", () => {
    assert.ok(files.length >= 5, `only ${files.length} action modules found`);
    const offenders: string[] = [];
    for (const f of files)
      for (const m of SRC(f).matchAll(/\brevalidatePath\(\s*"([^"]*)"/g))
        if (m[1] !== "/accounts") offenders.push(`${f}: ${m[1]}`);
    assert.deepEqual(offenders, []);
  });
});
