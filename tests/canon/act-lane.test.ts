// Canon pins for the Act Lane (CLAUDE.md "The Act Lane" and the Ted
// doctrine's "Provenance is columns", rulings of 2026-09-25: D23/P3, C7),
// and for the Accounts sheet it works beside (pass 9: Send consumes it, the
// send's stamp, the board lift, the click-depth doors, plain account links,
// C19, the direct doctrine's quiet flag, hidden is hidden, and D15).

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
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
  actedStampOf,
  boardWords,
  csmThreadFlagOf,
  draftOnClose,
  filterDoor,
  laneActOf,
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

  test("off a live deal the lane never offers the HomeRoom, where no row would show it", async () => {
    // The flip used to send an off-board move to the HomeRoom as a todo, and
    // the HomeRoom has no row for an off-board account to show it on (an
    // excluded account's seat reads there by C8 anyway). A live deal may
    // still go to the wing instead.
    const off = textOf(await renderLane(laneAct({ onBoard: false })));
    assert.ok(!off.includes("the other room instead"), off);
    const on = textOf(await renderLane(laneAct({ onBoard: true })));
    assert.ok(on.includes("the other room instead"), on);
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

// ── Pass 10: the Act Lane's and the sheet's honor rows, pinned (A8.1, A8.2,
// A8.5 to A8.9, A8.20 to A8.24). The sheet and the lane render under
// node:test as the operator's first paint; what a click opens is reached by
// the rule the click runs (laneActOf, filterDoor) or by the deep link the
// page honors (?focus= opens the drilldown). Colors, the stickiness and the
// corner are the stylesheet's and stay on the honor list.

const chipSecond = (gems: Gem[] = [gem("MEXICO ASK")]) => ({
  gems: gems.map((g) => ({
    term: g.term,
    act: g.act,
    reason: g.reason,
    whenDay: g.whenDay,
    cites: g.cites,
  })),
  act: gems[0]?.act ?? null,
  verdict: "",
  supportTotal: 0,
  spikeDay: "",
});
const actCells = (html: string) =>
  [...html.matchAll(/<td class="srActCell">([\s\S]*?)<\/td>/g)].map((m) => m[1]);
const headOf = (html: string) => html.slice(0, html.indexOf("<table"));

describe("the ACT column is the Move Chip, its source line beneath (A8.1, A8.2)", () => {
  test("a row with an act shows one chip: the act, then the source line inside it", async () => {
    const html = await renderSheet([await sheetRow({ second: chipSecond() })]);
    const [cell] = actCells(html);
    assert.match(
      cell,
      /^<span class="mchipWrap"><button type="button" class="mchip" aria-expanded="false"[^>]*>Answer Pat about Mexico\.<span class="mchipSrc">◆ MEXICO ASK · 09\/30<\/span><\/button>/,
      cell,
    );
    // The chip is the cell's one shape: the hover ✓ rides it, nothing else.
    assert.equal((cell.match(/<button/g) ?? []).length, 2);
    assert.match(cell, /class="mtick"[^>]*>✓<\/button><\/span>$/);
  });

  test("a read-only session keeps the chip and loses the ✓", async () => {
    const { AccountsClient } = await import("../../src/app/accounts-client");
    const html = await render(
      createElement(
        SearchParamsContext.Provider,
        { value: new URLSearchParams("") },
        createElement(AccountsClient, {
          rows: [await sheetRow({ second: chipSecond() })],
          canAdd: false,
          canWrite: false,
          onDashboard: [],
        }),
      ),
    );
    const [cell] = actCells(html);
    assert.ok(cell.includes('class="mchip"'));
    assert.equal(cell.includes("mtick"), false);
  });

  test("a row with no act and no stamp leaves the cell empty", async () => {
    const html = await renderSheet([await sheetRow()]);
    assert.deepEqual(actCells(html), [""]);
  });
});

describe("every ✓ stamp the sheet shows carries ↺ (A8.5)", () => {
  test("the stamp reads the newest acted gem about an account person", () => {
    const gems = [
      gem("OLD ASK", { actedDay: "2026-10-01" }),
      gem("NEW ASK", { actedDay: "2026-10-06" }),
      gem("OPEN ASK"),
    ];
    assert.deepEqual(actedStampOf(gems), { day: "2026-10-06", term: "NEW ASK" });
    assert.deepEqual(actedStampOf([gem("OPEN ASK")]), { day: "", term: "" });
  });

  test("a colleague's acted gem raises no stamp on the row (C16)", () => {
    // The acted sweep stamps any gem the record answers, a colleague's too;
    // the row never offered that gem's act, so it shows no stamp for it.
    const gems = [gem("ANIKA NOTE", { whoKind: "colleague", actedDay: "2026-10-07" })];
    assert.deepEqual(actedStampOf(gems), { day: "", term: "" });
    assert.deepEqual(
      actedStampOf([...gems, gem("MEXICO ASK", { actedDay: "2026-10-02" })]),
      { day: "2026-10-02", term: "MEXICO ASK" },
    );
  });

  test("the stamp renders with its ↺, which names the gem it takes back", async () => {
    const html = await renderSheet([
      await sheetRow({ actedDay: "2026-10-06", actedTerm: "MEXICO ASK" }),
    ]);
    const [cell] = actCells(html);
    assert.match(
      cell,
      /^<span class="actedStamp"><b>✓ ACTED<\/b> · 10\/06 · <button type="button" class="actedTb"[^>]*>↺<\/button><\/span>$/,
      cell,
    );
  });
});

describe("the chip opens the Act Lane on its own act (A8.6, partial)", () => {
  test("the chip is the lane's door, and the lane it opens is the standing workbench", async () => {
    const row = await sheetRow({ second: chipSecond() });
    const html = await renderSheet([row]);
    // The door: a button that says whether the lane is out.
    assert.match(
      actCells(html)[0],
      /<button type="button" class="mchip" aria-expanded="false"/,
    );
    // The sheet sits in the lane's wrap, so the lane opens beside it.
    assert.match(html, /<div class="laneWrap"><div class="laneMain"><table/);
    // What the click opens: the lane on the chip's own act.
    const act = laneActOf(row as unknown as AccountRow);
    assert.ok(act);
    assert.equal(act.act, "Answer Pat about Mexico.");
    assert.equal(act.term, "MEXICO ASK");
    const lane = await renderLane(act);
    assert.match(lane, /^<aside class="actLane" aria-label="The act workbench">/);
  });

  test("no chip, no lane", async () => {
    assert.equal(laneActOf((await sheetRow()) as unknown as AccountRow), null);
    assert.equal(laneActOf(undefined), null);
  });
});

describe("the lane runs top to bottom: evidence, the draft, then Send, File and the fork (A8.7, A8.8, A8.9)", () => {
  const cites = [
    { k: "r1", day: "2026-09-30", who: "Pat Lee", subject: "Mexico" },
    { k: "r2", day: "2026-10-02", who: "Pat Lee", subject: "Re: Mexico" },
  ];

  test("every citation is a door above the draft (A8.7, partial)", async () => {
    const html = await renderLane(laneAct({ cites }));
    const doors = [
      ...html.matchAll(/<button type="button" class="srCite">([\s\S]*?)<\/button>/g),
    ];
    assert.equal(doors.length, 2);
    assert.match(textOf(doors[0][1]), /^09\/30 · Pat Lee · Mexico ▸ read it$/);
    const lastDoor = html.lastIndexOf('class="srCite"');
    assert.ok(
      lastDoor < html.indexOf('aria-label="To"'),
      "evidence sits above the draft",
    );
    assert.ok(html.indexOf('class="actLaneAct"') < html.indexOf('class="srCite"'));
  });

  test("TO carries the relationship contact and SUBJECT the act; the body starts blank (A8.8)", async () => {
    const row = await sheetRow({
      second: chipSecond(),
      contactName: "Pat Lee",
      contactEmail: "pat@simploy.com",
    });
    const act = laneActOf(row as unknown as AccountRow);
    assert.ok(act);
    assert.equal(act.to, "Pat Lee");
    assert.equal(act.toEmail, "pat@simploy.com");
    assert.equal(act.subject, "Answer Pat about Mexico.");
    assert.equal(act.body, "");
    const html = await renderLane(act);
    assert.match(html, /<input aria-label="To" value="Pat Lee"\/>/);
    assert.match(
      html,
      /<input aria-label="Subject" value="Answer Pat about Mexico\."\/>/,
    );
    assert.match(html, /<textarea[^>]*aria-label="Draft body"><\/textarea>/);
  });

  test("a saved, unsent draft outranks the seed in every field (A8.8)", async () => {
    const row = await sheetRow({
      second: chipSecond(),
      actDraft: {
        to: "Dana Reyes",
        subject: "Mexico, the model",
        body: "Half a thought",
      },
    });
    const act = laneActOf(row as unknown as AccountRow);
    assert.ok(act);
    assert.deepEqual(
      { to: act.to, subject: act.subject, body: act.body },
      { to: "Dana Reyes", subject: "Mexico, the model", body: "Half a thought" },
    );
  });

  test("Send, File and the fork sit at the foot, after the draft, in that order (A8.9)", async () => {
    const html = await renderLane(laneAct());
    const at = (needle: string) => {
      const i = html.indexOf(needle);
      assert.ok(i >= 0, `missing ${needle}`);
      return i;
    };
    const order = [
      at('aria-label="Draft body"'),
      at("Send it → mail"),
      at("✓ File as done"),
      at("Save the draft"),
      at("FILE IT · TODAY"),
    ];
    assert.deepEqual(
      [...order].sort((a, b) => a - b),
      order,
    );
    assert.ok(html.endsWith("</div></aside>"), "nothing follows the fork");
  });

  test("a read-only session gets the evidence and the draft, and no foot", async () => {
    const { default: ActLane } = await import("../../src/app/accounts/act-lane");
    const html = await render(
      createElement(ActLane, {
        act: laneAct({ cites }),
        canWrite: false,
        onClose: () => {},
      }),
    );
    assert.ok(html.includes('class="srCite"'));
    assert.ok(html.includes('aria-label="Draft body"'));
    for (const gone of ["Send it → mail", "✓ File as done", "FILE IT · TODAY"])
      assert.equal(html.includes(gone), false, gone);
  });
});

describe("the sheet's head after the retirements (A8.20 to A8.24)", () => {
  const rows = async () => [
    await sheetRow({
      second: chipSecond(),
      play: "displacement",
      competitors: ["Velocity Global"],
    }),
    await sheetRow({ id: "B2", name: "Acme", play: "greenfield" }),
    await sheetRow({ id: "C3", name: "Brightway" }),
  ];

  test("six columns, titled; Stage, Next action and Play are gone (A8.20)", async () => {
    const html = await renderSheet(await rows());
    const heads = [
      ...html.matchAll(/<button type="button" class="thSort"[^>]*>([^<]*)</g),
    ].map((m) => m[1]);
    assert.deepEqual(heads, [
      "Account",
      "Global fit",
      "Demand",
      "Last human touch",
      "The signal",
      "Act",
    ]);
    assert.equal((html.match(/<th[ >]/g) ?? []).length, 6);
    // Every row carries exactly the six cells.
    const firstRow = html.slice(
      html.indexOf("<tbody>"),
      html.indexOf("</tr>", html.indexOf("<tbody>")),
    );
    assert.equal((firstRow.match(/<td[ >]/g) ?? []).length, 6);
  });

  test("the play reads in the drilldown's meta line (A8.20)", async () => {
    const r = await rows();
    const disp = await renderSheet(r, `focus=${ACCT}`);
    assert.match(
      disp,
      /<p class="acctMetaLine">[^<]*· PLAY · DISPLACE \(VELOCITY GLOBAL\)<\/p>/,
    );
    const green = await renderSheet(r, "focus=B2");
    assert.match(green, /<p class="acctMetaLine">[^<]*· PLAY · GREENFIELD<\/p>/);
  });

  test("no rail: one mono Filter Door at the shoulder, resting closed (A8.21, partial)", async () => {
    const head = headOf(await renderSheet(await rows()));
    assert.match(
      head,
      /<div class="fdoorRow"><button type="button" class="fdoor" aria-expanded="false">FILTERS ▾<\/button><\/div>/,
    );
    assert.equal(head.includes("<select"), false, "a filter control rides at arrival");
    assert.equal(head.includes("<aside"), false, "a rail rides beside the sheet");
  });

  test("a live filter keeps the door lit and names every live one (A8.21)", () => {
    const none = { csm: "", industry: "", tier: "", play: "", stage: "" };
    assert.deepEqual(filterDoor(none), { live: false, label: "FILTERS ▾" });
    assert.deepEqual(filterDoor({ ...none, tier: "high" }), {
      live: true,
      label: "FILTERS · FIT ▾",
    });
    assert.deepEqual(
      filterDoor({
        csm: "Anika Steenstra",
        industry: "PEO",
        tier: "high",
        play: "greenfield",
        stage: "DEMO",
      }),
      { live: true, label: "FILTERS · PARTNERS · MODELS · FIT · PLAYS · STAGES ▾" },
    );
  });

  test("the column titles are the only sort: each title is a button and no sort control exists (A8.22, partial)", async () => {
    const html = await renderSheet(await rows());
    const ths = [...html.matchAll(/<th(?:\s[^>]*)?>([\s\S]*?)<\/th>/g)].map((m) => m[1]);
    assert.equal(ths.length, 6);
    for (const th of ths)
      assert.match(th, /^<button type="button" class="thSort" title="Sort by /);
    assert.equal(html.includes("<select"), false);
    assert.equal(
      /\bsort\b/i.test(textOf(headOf(html))),
      false,
      "a sort control rides the head",
    );
  });

  test("no header subtext, no hot-signal bar, no ⊞; the dashboard door is plain words (A8.23)", async () => {
    const r = await rows();
    const html = await renderSheet(r, "focus=B2");
    const head = headOf(html);
    // The page head is the title and its two icons; nothing between the
    // search and the sheet but the Filter Door's row.
    assert.match(
      head,
      /^<div class="pageHead"><h1 class="h1">Account Room<\/h1><button[^>]*>⧉<\/button><button[^>]*>⇩<\/button><\/div><div class="searchWrap">[\s\S]*?<\/div><div class="fdoorRow">[\s\S]*?<\/div><div class="laneWrap"><div class="laneMain">$/,
      head,
    );
    assert.equal(html.includes("⊞"), false);
    assert.match(
      html,
      /<button class="addMini" type="submit">Put it on the dashboard<\/button>/,
    );
    const { AccountsClient } = await import("../../src/app/accounts-client");
    const on = await render(
      createElement(
        SearchParamsContext.Provider,
        { value: new URLSearchParams("focus=B2") },
        createElement(AccountsClient, {
          rows: r,
          canAdd: true,
          canWrite: true,
          onDashboard: ["Acme"],
        }),
      ),
    );
    assert.ok(textOf(on).includes("ON THE DASHBOARD · CLEARED WITH THE CSM"));
    assert.equal(on.includes("⊞"), false);
  });

  test("the count rides the Account title; ⧉ and ⇩ ride the page title; the search has its glyph (A8.24, partial)", async () => {
    const html = await renderSheet(await rows());
    assert.match(
      html,
      /<th><button type="button" class="thSort" title="Sort by account">Account<\/button><span class="thCount">3 of 3<\/span><\/th>/,
    );
    assert.match(
      html,
      /<div class="pageHead"><h1 class="h1">Account Room<\/h1><button type="button" class="iconBtn" title="Copy the list" aria-label="Copy the list">⧉<\/button><button type="button" class="iconBtn" title="Export CSV" aria-label="Export CSV">⇩<\/button><\/div>/,
    );
    assert.match(
      html,
      /<div class="searchWrap"><span class="searchGlyph" aria-hidden="true">⌕<\/span><input class="searchDeep"/,
    );
  });
});

// ── Pass 10, the copy beside the rows: every operator string on the sheet,
// the Salesforce checkpoint's tooltip, the THEIRS line's empty excerpt and
// the bank's world tag, run through the canon lint. The strings are read out
// of the source by the compiler's own parser (JSX text, string attributes,
// string and template literals), so a new tooltip is linted the day it
// lands. An empty cell's lone "—" is a glyph, not an aside.
describe("the sheet's copy obeys the writing canon and the plain-speech law", () => {
  const FILES = [
    "src/app/accounts-client.tsx",
    "src/components/sf.tsx",
    "src/app/room/theirs-line.tsx",
    "src/app/asks/page.tsx",
  ];
  // What is code, not copy: class lists, URLs, keys, ids and the like.
  const SKIP_ATTR = new Set(["className", "href", "key", "id", "name", "type", "value"]);
  const CODE = /^(use client|[\w-]*[./:?&=%][\w./:?&=%-]*|[a-z]+(-[a-z]+)+)$/;
  const copyOf = (file: string): { at: string; text: string }[] => {
    const src = readFileSync(join(process.cwd(), file), "utf8");
    const sf = ts.createSourceFile(
      file,
      src,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const out: { at: string; text: string }[] = [];
    const push = (n: ts.Node, text: string) => {
      const t = text.replace(/\s+/g, " ").trim();
      if (!t || t === "—" || !/[a-z]{2}/i.test(t) || CODE.test(t)) return;
      out.push({
        at: `${file}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`,
        text: t,
      });
    };
    const visit = (n: ts.Node): void => {
      if (ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) return;
      if (ts.isJsxAttribute(n) && SKIP_ATTR.has(n.name.getText())) return;
      if (
        ts.isCallExpression(n) &&
        /\b(encodeURIComponent|fetch|getElementById|startsWith|split|replace|join|test|match)\b/.test(
          n.expression.getText(),
        )
      )
        return;
      if (ts.isElementAccessExpression(n) || ts.isPropertyAccessExpression(n)) return;
      if (ts.isJsxText(n)) push(n, n.text.replace(/&rsquo;/g, "\u2019"));
      else if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))
        push(n, n.text);
      else if (ts.isTemplateExpression(n)) {
        // The static words, with each slot read as a name.
        push(
          n,
          [n.head.text, ...n.templateSpans.map((x) => `Simploy${x.literal.text}`)].join(
            "",
          ),
        );
        return;
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
    return out;
  };
  const FORMAT_ONLY = /the cap is eight|a digit that is not a date/;
  const sentencesOf = (t: string) =>
    t
      .split(/(?<=[.!?])\s+/)
      .map((x) => x.trim())
      .filter(Boolean);

  test("no string carries a dash aside, a parenthetical or a device", () => {
    const found: string[] = [];
    for (const file of FILES)
      for (const { at, text } of copyOf(file)) {
        if (/[—–]/.test(text.replace(/^—$/, ""))) found.push(`${at}: a dash · ${text}`);
        if (/\(/.test(text)) found.push(`${at}: a parenthetical · ${text}`);
        for (const line of sentencesOf(text))
          for (const f of lintReason(line).faults.filter((x) => !FORMAT_ONLY.test(x)))
            found.push(`${at}: ${f} · ${line}`);
      }
    assert.deepEqual(found, []);
  });

  test("the sweep reads real copy: the strings it fixed are in scope and the lint catches them", () => {
    const texts = FILES.flatMap(copyOf).map((x) => x.text);
    assert.ok(texts.includes("Open the gem with its citations and emails."));
    assert.ok(
      texts.some((t) => t.startsWith("Salesforce is the record")) ||
        texts.includes("Salesforce is the record"),
    );
    assert.ok(texts.includes("· general knowledge"));
    // The CSM's rhythm with the client is their check-ins; never "Cadence".
    assert.ok(texts.includes("Check-ins"));
    assert.equal(
      texts.some((t) => /\bcadence\b/i.test(t)),
      false,
    );
    const faults = (t: string) => sentencesOf(t).flatMap((x) => lintReason(x).faults);
    assert.ok(
      faults("The app is your operating layer, not the truth.").includes("antithesis"),
    );
    assert.ok(
      faults(
        "When it's sent, drop the .eml in the Chute — that files the touch.",
      ).includes("a dash hinge"),
    );
  });
});

// ── Pass 10, the sheet's green: the brand's #22C55E by role. On the pale
// field it is too light for words, so a green state is tint and border and
// its words stay ink (room.module.css .worked). The stylesheet is the only
// place a color lives, so this pin reads it.
describe("the sheet's green is the brand's, by role", () => {
  const css = readFileSync(
    join(process.cwd(), "src/app/command-center.module.css"),
    "utf8",
  );
  const rule = (sel: string) => {
    const m = new RegExp(
      `(?:^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
    ).exec(css);
    assert.ok(m, `${sel} is gone`);
    return m[1];
  };

  test("the token is the brand green, and no rule writes words in it", () => {
    assert.match(rule(".wrap"), /--green:\s*#22c55e;/i);
    assert.doesNotMatch(css, /(?:^|[\s;{])color:\s*var\(--green\)/);
    assert.doesNotMatch(css, /#1a7f3c|#15803d(?=;\s*\n\s*border-radius: 5px)/i);
  });

  test("every green state is tint and border with ink words", () => {
    for (const sel of [
      ".stageWon",
      ".approachGo",
      ".valConfirmed",
      ".prTag_reply",
      ".mtick:hover",
      ".actedStamp b",
    ]) {
      const r = rule(sel);
      assert.match(r, /rgba\(34, 197, 94, 0\.1\d?\)/, `${sel} has no green tint`);
      assert.match(r, /color:\s*(?:var\(--ink\)|#0a1c40)/i, `${sel} words are not ink`);
      assert.match(
        r,
        /(?:border(?:-color)?:[^;]*(?:#22c55e|var\(--green\)|rgba\(34, 197, 94)|box-shadow:\s*inset[^;]*rgba\(34, 197, 94)/i,
        `${sel} has no green edge`,
      );
    }
  });

  test("the dead stash tag is gone", () => {
    assert.equal(css.includes(".prTag_stash"), false);
  });
});

// A4.17 and A4.19, the Accounts face the founder shipped on 2026-08-20:
// MODEL and PRISMHR retire into the drilldown, and LAST HUMAN TOUCH, THE
// SIGNAL and ACT take the width, each cell a door (the gem's fold opens
// beneath the row on a click, which a first paint cannot show).
describe("Accounts: three columns take the width; MODEL and PRISMHR live in the drilldown (A4.17, A4.19)", () => {
  const headsOf = (html: string): string[] =>
    [...html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) =>
      textOf(m[1].replace(/<span class="thCount">[\s\S]*?<\/span>/, "")),
    );

  test("the sheet's columns: no MODEL, no PRISMHR, the three at the right", async () => {
    const html = await renderSheet([await sheetRow()]);
    assert.deepEqual(headsOf(html), [
      "Account",
      "Global fit",
      "Demand",
      "Last human touch",
      "The signal",
      "Act",
    ]);
    assert.ok(!headsOf(html).some((h) => /model|prismhr|platform|cloud/i.test(h)));
  });

  test("the drilldown carries MODEL and PRISMHR in its meta line", async () => {
    const row = await sheetRow({ industry: "PEO", incumbent: true, cloud: "PHR3" });
    const shut = await renderSheet([row]);
    assert.ok(
      !/MODEL · PEO · PRISMHR/.test(textOf(shut)),
      "the facts ride the sheet shut",
    );
    const open = await renderSheet([row], `focus=${ACCT}`);
    assert.match(textOf(open), /MODEL · PEO · PRISMHR · PHR3/);
  });

  test("LAST HUMAN TOUCH, THE SIGNAL and ACT are each a door on the row", async () => {
    const row = await sheetRow({
      touch: { who: "Pat Lee", day: "2026-09-22", kind: "ours", record: "record" },
      touchCite: {
        from: "record",
        day: "2026-09-22",
        who: "Pat Lee",
        how: "SENT",
        text: "✉ The Mexico model — sent to Pat Lee.",
      },
      second: sheetSecond({
        rollup: null,
        support: null,
        intent: null,
        gems: [gem("MEXICO ASK")],
      } as unknown as Parameters<typeof sheetSecond>[0]),
    });
    const html = await renderSheet([row]);
    const tr = /<tr id="acct-[^"]*"[\s\S]*?<\/tr>/.exec(html)?.[0] ?? "";
    const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
    assert.equal(cells.length, 6);
    const [, , , touch, signal, act] = cells;
    assert.match(touch, /^<button type="button" class="srTouch"/);
    assert.match(signal, /^<button type="button" class="srTerm"[^>]*>MEXICO ASK/);
    assert.match(
      act,
      /<button type="button" class="mchip"[^>]*>Answer Pat about Mexico\./,
    );
    // The fold rows are shut on arrival: nothing deep surfaces uninvited.
    assert.ok(!html.includes("srFoldTd"), "a fold opened on arrival");
  });
});
