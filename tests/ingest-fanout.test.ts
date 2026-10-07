// The fan-out module (the Chute brains refactor plan, §2.5 and slice 6).
// Their commitments file as loops on their side with the promised day and
// the hearer (CLAUDE.md, The Chute, ruled 2026-09-25, D10); a repeated
// commitment is one loop; PROMISED needs a hearer (the closer rule, D28);
// the namespaces own their dedupe; the undo by filing id reaches every row
// and todo the filing wrote and nothing else, and a completion line keyed by
// an opened todo goes with its todo (the defects doc's open item).
//
// Pinned as behavior where the seam exists — the loop writer, the completion
// line and the namespaces take a stub client the way the Filing module takes
// one, owedByThem and the engine are pure — and as source where it does not:
// roomPasteUndo gates on getAppAccess and getPrisma, so its reach is read
// from the slice, as tests/ingest-defects.test.ts reads the rest.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import {
  commitmentKey,
  completionKey,
  fileCompletion,
  fileTheirLoops,
  loopKey,
  openLoopKeys,
  theirCommitmentsOf,
  undoCompletions,
  type CompletionClient,
  type LoopClient,
} from "../src/lib/ingest/fanout";
import { undoFiling, type FilingClient } from "../src/lib/ingest/filing";
import { sanitizeAiResult } from "../src/lib/intel/ai-clean";
import type { AccountNoteData, TodoData } from "../src/lib/notes/write";
import { filePlaybook, knownPlaybook, playbookBody } from "../src/lib/playbook/store";
import { readAccount } from "../src/lib/record/read";
import { readDeal } from "../src/lib/room/engine";
import { fileGaps, gapNs, knownGaps } from "../src/lib/room/gaps";
import { dayBlown, owedByThem, theirLoopOf } from "../src/lib/room/owed";
import { buildAccountSheet } from "../src/lib/room/sheet-view";
import { NO_TAGS, splitTags, tagName, withTags } from "../src/lib/today/route-notes";

const root = cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

// 2026-10-05 is a Monday; 2026-10-09 the Friday after it.
const NOW = new Date("2026-10-05T18:00:00Z");
const LATER = new Date("2026-10-12T18:00:00Z");

const ENTRY = {
  kind: "email",
  subject: "Pricing",
  from: "Adam Bell",
  to: "Antaeus Coe",
  others: 0,
  recipients: ["Antaeus Coe"],
  timeLabel: "9:10 AM",
  dayLabel: "Oct 5",
  dayIso: "2026-10-05",
  body: "Model by Friday, headcount after.",
  promises: [] as unknown[],
};
const readOf = (over: Record<string, unknown>) =>
  sanitizeAiResult({ entries: [ENTRY], signals: [], ...over });

const loopStub = (open: string[] = [], top = 4) => {
  const writes: TodoData[] = [];
  const client: LoopClient = {
    todo: {
      findMany: async () => open.map((body) => ({ body })),
      findFirst: async () => ({ position: top }),
      create: async ({ data }) => {
        writes.push(data);
        return { id: `t${writes.length}` };
      },
    },
  };
  return { client, writes };
};

// ── D10 · their commitments file as loops with the hearer and the day ──────
describe("their commitments file as loops on their side (D10)", () => {
  test("a read with two owner-them actions writes two loops with the hearer and the day", async () => {
    const r = readOf({
      actions: [
        { text: "Send the pricing model", owner: "them", due: "2026-10-09", fallback: "" },
        { text: "Confirm the Canada headcount", owner: "them", due: "", fallback: "" },
        { text: "Send the recap", owner: "me", due: "", fallback: "" },
      ],
    });
    const theirs = theirCommitmentsOf(r);
    assert.deepEqual(theirs, [
      { text: "Send the pricing model", day: "2026-10-09", hearer: "Antaeus Coe", by: "Adam Bell" },
      { text: "Confirm the Canada headcount", day: "", hearer: "Antaeus Coe", by: "Adam Bell" },
    ]);
    const { client, writes } = loopStub();
    const loops = await fileTheirLoops(
      { commitments: theirs, accountId: "A1", known: new Set(), position: 5, filingId: "f1" },
      client,
    );
    assert.deepEqual(
      loops.map((l) => l.text),
      ["Send the pricing model", "Confirm the Canada headcount"],
    );
    assert.equal(writes.length, 2);
    // The exact encoding: the promised day in d:, the side in o:, the hearer
    // in h:, who owes it in b:. No k:a — a loop is never the operator's
    // action — and no reminder.
    assert.equal(
      writes[0].body,
      "Send the pricing model\n⚑[d:2026-10-09,o:them,h:Antaeus Coe,b:Adam Bell]",
    );
    assert.equal(writes[1].body, "Confirm the Canada headcount\n⚑[o:them,h:Antaeus Coe,b:Adam Bell]");
    for (const w of writes) {
      assert.equal(w.filingId, "f1");
      assert.equal(w.accountId, "A1");
      assert.equal(w.done, false);
      assert.ok(!("remindAt" in w), "a loop sets no reminder");
      assert.ok(!w.body.includes("k:a"));
    }
    assert.deepEqual(
      writes.map((w) => w.position),
      [5, 6],
    );
    // The codec reads it back whole, and the loop reader sees it.
    const back = splitTags(writes[0].body);
    assert.equal(back.text, "Send the pricing model");
    assert.deepEqual(back.tags, {
      ...NO_TAGS,
      date: "2026-10-09",
      owner: "them",
      hearer: "Antaeus Coe",
      by: "Adam Bell",
    });
    assert.deepEqual(theirLoopOf(writes[0].body), {
      text: "Send the pricing model",
      by: "Adam Bell",
      hearer: "Antaeus Coe",
      day: "2026-10-09",
    });
    assert.equal(theirLoopOf("Send the recap\n⚑[k:a]"), null);
  });

  test("the same commitment twice is one loop: across the two sources, across entries, and against the open rows", async () => {
    const r = readOf({
      entries: [
        {
          ...ENTRY,
          promises: [
            { what: "send the pricing model", by: "them", hearer: "Antaeus Coe", day: "2026-10-09" },
            { what: "Send the org chart.", by: "me", hearer: "Adam Bell", day: "" },
          ],
        },
        {
          ...ENTRY,
          dayIso: "2026-10-04",
          dayLabel: "Oct 4",
          body: "Will send the pricing model Friday.",
          promises: [
            { what: "Send the pricing model.", by: "them", hearer: "", day: "2026-10-09" },
          ],
        },
      ],
      actions: [
        { text: "Send the pricing model", owner: "them", due: "2026-10-09", fallback: "" },
        { text: "Share the Mexico census", owner: "them", due: "", fallback: "" },
      ],
    });
    const theirs = theirCommitmentsOf(r);
    assert.equal(theirs.length, 2, "the model said one loop three ways");
    assert.equal(theirs[0].text, "send the pricing model");
    assert.equal(theirs[0].hearer, "Antaeus Coe");
    assert.equal(theirs[0].by, "Adam Bell");
    assert.equal(loopKey("Send the pricing model.", "2026-10-09"), loopKey("send the pricing model", "2026-10-09"));
    assert.notEqual(loopKey("Send the pricing model", ""), loopKey("Send the pricing model", "2026-10-09"));

    // A loop the account already holds open is not written twice; the
    // operator's own open actions key on their side.
    const open = [
      "Send the pricing model\n⚑[d:2026-10-09,o:them,h:Antaeus Coe,b:Adam Bell]",
      "Send the recap · from 10/5 paste\n⚑[k:a]",
    ];
    const { client, writes } = loopStub(open);
    const known = await openLoopKeys("A1", client);
    assert.deepEqual([...known.theirs], [loopKey("Send the pricing model", "2026-10-09")]);
    assert.deepEqual([...known.mine], [commitmentKey("Send the recap · from 10/5 paste\n⚑[k:a]")]);
    const loops = await fileTheirLoops(
      { commitments: theirs, accountId: "A1", known: known.theirs, position: 0 },
      client,
    );
    assert.deepEqual(
      loops.map((l) => l.text),
      ["Share the Mexico census"],
    );
    assert.equal(writes.length, 1);
    assert.ok(!("filingId" in writes[0]), "no filing named, no link");
  });

  test("a loop with no hearer files without one and reads as a wall, never PROMISED (D28)", async () => {
    const r = readOf({
      entries: [{ ...ENTRY, to: "", recipients: [] }],
      actions: [{ text: "Send the signed order form", owner: "them", due: "2026-10-03", fallback: "" }],
    });
    const theirs = theirCommitmentsOf(r);
    assert.deepEqual(theirs, [
      { text: "Send the signed order form", day: "2026-10-03", hearer: "", by: "Adam Bell" },
    ]);
    const { client, writes } = loopStub();
    await fileTheirLoops({ commitments: theirs, accountId: "A1", known: new Set(), position: 0 }, client);
    assert.equal(writes[0].body, "Send the signed order form\n⚑[d:2026-10-03,o:them,b:Adam Bell]");
    const row = { id: "t1", body: writes[0].body, createdAt: "2026-10-05T18:00:00Z", done: false };
    const [owed] = owedByThem([], NOW, [row]);
    assert.ok(owed);
    assert.equal(owed.day, "2026-10-03");
    assert.equal(owed.hearer, "");
    assert.equal(owed.promised, false, "the day passed, but no one heard it");
    assert.equal(dayBlown("2026-10-03", NOW), true);
  });

  test("the hearer is who the promise was made to: the promise's own, else the entry's recipient on our side", () => {
    const r = readOf({
      entries: [
        {
          ...ENTRY,
          to: "Antaeus Coe",
          recipients: ["Antaeus Coe", "Lesha Cyphers"],
          promises: [
            { what: "Send the census file", by: "them", hearer: "Lesha Cyphers", day: "" },
            { what: "Book the review with legal", by: "them", hearer: "", day: "2026-10-20" },
          ],
        },
      ],
      actions: [],
    });
    const theirs = theirCommitmentsOf(r);
    assert.equal(theirs[0].hearer, "Lesha Cyphers", "the promise names its hearer");
    assert.equal(theirs[1].hearer, "Antaeus Coe", "the entry was addressed to the operator");
  });

  test("the money doctrine holds: a loop's text is the sanitized read's, never a figure", () => {
    const r = readOf({
      actions: [{ text: "Send the $5,000 deposit invoice", owner: "them", due: "", fallback: "" }],
    });
    const [c] = theirCommitmentsOf(r);
    assert.ok(c && !/\d/.test(c.text), c?.text);
  });

  test("a their-loop is never the operator's action: the register and the sheet leave it alone", () => {
    const body = "Send the pricing model\n⚑[d:2026-10-01,o:them,h:Antaeus Coe,b:Adam Bell]";
    const sheet = buildAccountSheet(
      [
        {
          id: "t1",
          body,
          done: false,
          accountId: "A1",
          remindAt: "",
          createdAt: "2026-09-28T12:00:00Z",
          updatedAt: "2026-09-28T12:00:00Z",
        },
      ],
      "A1",
      new Set(),
      new Map(),
      NOW,
    );
    assert.deepEqual(sheet.open, []);
    assert.deepEqual(sheet.delayed, []);
    assert.deepEqual(sheet.doneToday, []);
  });

  test("a name inside the tag line sheds the codec's own punctuation and survives otherwise", () => {
    assert.equal(tagName("Bell, Adam: [x]"), "Bell Adam [x");
    const body = withTags("Send it", { ...NO_TAGS, owner: "them", hearer: "O'Neil, Dana", by: "" });
    assert.equal(body, "Send it\n⚑[o:them,h:O'Neil Dana]");
    assert.equal(splitTags(body).tags.hearer, "O'Neil Dana");
    assert.equal(splitTags("x\n⚑[o:me]").tags.owner, "", "only them is a side");
  });
});

// ── the court reads them ───────────────────────────────────────────────────
describe("owedByThem reads a their-loop row beside its regex", () => {
  const loop = (id: string, body: string, createdAt = "2026-10-05T18:00:00Z", done = false) => ({
    id,
    body,
    createdAt,
    done,
  });
  const PRICING = "Send the pricing model\n⚑[d:2026-10-09,o:them,h:Antaeus Coe,b:Adam Bell]";

  test("a loop reads with who owes it, the day and the hearer, ahead of the Owed line", () => {
    const out = owedByThem(
      [
        {
          id: "n1",
          body: "Owed: invoices + EOR confirm — @Chassie; agreements — @Antaeus.",
          createdAt: "2026-10-05T12:00:00Z",
        },
      ],
      NOW,
      [loop("t1", PRICING)],
    );
    assert.equal(out.length, 2);
    assert.deepEqual(out[0], {
      noteId: "t1",
      who: "Adam Bell",
      text: "Send the pricing model",
      at: "2026-10-05T18:00:00Z",
      day: "2026-10-09",
      hearer: "Antaeus Coe",
      promised: false,
    });
    assert.equal(out[1].who, "Chassie");
    assert.equal(out[1].day, undefined, "the Owed line carries no day");
  });

  test("a blown one reads PROMISED with its date; a done row is closed; a plain action is not a loop", () => {
    const out = owedByThem(
      [],
      LATER,
      [
        loop("t1", PRICING),
        loop("t2", "Send the census\n⚑[d:2026-10-08,o:them,h:Antaeus Coe]", "2026-10-06T12:00:00Z", true),
        loop("t3", "Send the recap · from 10/5 paste\n⚑[d:2026-10-08,k:a]"),
      ],
    );
    assert.equal(out.length, 1);
    assert.equal(out[0].noteId, "t1");
    assert.equal(out[0].promised, true);
    assert.equal(out[0].day, "2026-10-09");
  });

  test("the engine says the day: Promised Friday ahead, PROMISED with the date once blown, a wall with no hearer", () => {
    const base = {
      accountName: "Acme PEO",
      step: null,
      timing: null,
      lastTouch: null,
      lastRecordAt: "2026-10-05T17:00:00Z",
      lastMeeting: { at: "2026-10-05T17:00:00Z", who: "Tom" },
    };
    const ahead = readDeal({
      ...base,
      now: NOW,
      theirBall: { who: "Adam", text: "the pricing model", day: "2026-10-09" },
    });
    assert.equal(ahead.move, "Send Tom the recap. Adam owes the pricing model. Promised Friday.");
    const today = readDeal({
      ...base,
      now: NOW,
      theirBall: { who: "Adam", text: "the pricing model", day: "2026-10-05" },
    });
    assert.match(today.move, /Promised today\.$/);
    const far = readDeal({
      ...base,
      now: NOW,
      theirBall: { who: "Adam", text: "the pricing model", day: "2026-10-20" },
    });
    assert.match(far.move, /Promised 10\/20\.$/);
    const blown = readDeal({
      ...base,
      lastMeeting: { at: "2026-10-12T17:00:00Z", who: "Tom" },
      lastRecordAt: "2026-10-12T17:00:00Z",
      now: LATER,
      theirBall: { who: "Adam", text: "the pricing model", day: "2026-10-09", promised: true },
    });
    assert.equal(blown.move, "Send Tom the recap. Adam owes the pricing model. PROMISED 10/9.");
    const wall = readDeal({
      ...base,
      lastMeeting: { at: "2026-10-12T17:00:00Z", who: "Tom" },
      lastRecordAt: "2026-10-12T17:00:00Z",
      now: LATER,
      theirBall: { who: "Adam", text: "the pricing model", day: "2026-10-09" },
    });
    assert.equal(wall.move, "Send Tom the recap. Adam owes the pricing model. The 10/9 wall passed.");
    // The Owed line's segment carries no day, and the move is what it was.
    const bare = readDeal({
      ...base,
      now: NOW,
      theirBall: { who: "Chassie", text: "invoices + EOR confirm" },
    });
    assert.equal(bare.move, "Send Tom the recap. Chassie owes invoices + EOR confirm.");
  });

  test("the room and the pipeline hand their loops to the reader, through the read", () => {
    // Since slice 14 the room takes the loop from the single account read's
    // theirPromise (field 14), which hands the account's todos to owedByThem
    // itself. The pipeline reads the read's whole list and makes no call of
    // its own (ruled 2026-10-07, pass 8 call 6).
    const acct = readAccount({
      account: { id: "A1", name: "Acme PEO" },
      notes: [],
      touches: [],
      todos: [
        { id: "t1", body: PRICING, done: false, accountId: "A1", createdAt: "2026-10-05T18:00:00Z" },
      ],
      dispositions: new Map(),
      homeSide: [],
      now: NOW,
    });
    assert.deepEqual(acct.theirPromise, {
      who: "Adam Bell",
      text: "Send the pricing model",
      at: "2026-10-05T18:00:00Z",
      day: "2026-10-09",
    });
    assert.equal(acct.whoseMove.rung, "loop");
    assert.equal(acct.whoseMove.who, "Adam Bell");
    const lib = read("src/lib/record/read.ts");
    assert.match(lib, /owedByThem\(visible, now, todos\)/);
    const page = read("src/app/room/page.tsx");
    assert.match(page, /acct\.theirPromise/);
    assert.match(page, /\.\.\.\(b\.day \? \{ day: b\.day \} : \{\}\)/);
    const build = read("src/lib/pipeline/build.ts");
    assert.match(build, /a\.read\.theirPromises/);
    assert.ok(!/owedByThem\(/.test(build), "the drawer counts no promises of its own");
  });
});

// ── the namespaces own their dedupe ────────────────────────────────────────
const nsStub = (rows: Record<string, string[]>) => {
  const writes: AccountNoteData[] = [];
  const client = {
    accountNote: {
      findMany: async ({ where }: { where: { accountId: string } }) =>
        (rows[where.accountId] ?? []).map((body) => ({ body })),
      create: async ({ data }: { data: AccountNoteData }) => {
        writes.push(data);
        return { id: `n${writes.length}` };
      },
    },
  };
  return { client, writes };
};

describe("fileGaps and filePlaybook build their own known-set when the caller passes none", () => {
  test("fileGaps without known dedupes against its namespace", async () => {
    const { client, writes } = nsStub({
      [gapNs("A1")]: ["? Who owns payroll there?", "? Which countries come first?"],
    });
    assert.equal((await knownGaps("A1", client)).size, 2);
    const ids = await fileGaps({
      accountId: "A1",
      questions: ["Who owns payroll there?", "who owns PAYROLL there", "Is the client on a PEO today?"],
      door: "hand",
      client,
    });
    assert.deepEqual(ids, ["n1"]);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].accountId, gapNs("A1"));
    assert.equal(writes[0].body, "? Is the client on a PEO today?");
    assert.equal(writes[0].door, "hand");
    // A caller that already read the rows keeps passing its set, and the
    // namespace is not read again.
    const second = nsStub({ [gapNs("A1")]: ["? Is the client on a PEO today?"] });
    const known = new Set<string>();
    await fileGaps({
      accountId: "A1",
      questions: ["Is the client on a PEO today?"],
      known,
      door: "hand",
      client: second.client,
    });
    assert.equal(second.writes.length, 1, "the caller's set governed, not the namespace");
  });

  test("filePlaybook likewise", async () => {
    const { client, writes } = nsStub({
      "playbook:market": [
        playbookBody("market", "Competitors ask for a deposit.", { a: "A1", n: "Acme", w: "Dana" }),
      ],
    });
    assert.equal((await knownPlaybook("market", client)).size, 1);
    assert.equal((await knownPlaybook("lesson", client)).size, 0);
    const ids = await filePlaybook({
      kind: "market",
      items: [
        { text: "competitors ask for a deposit" },
        { text: "Remote requires a deposit up front.", who: "Adam Bell" },
      ],
      accountId: "A1",
      accountName: "Acme",
      door: "hand",
      filingId: "f1",
      client,
    });
    assert.deepEqual(ids, ["n1"]);
    assert.equal(writes.length, 1);
    assert.equal(writes[0].accountId, "playbook:market");
    assert.match(writes[0].body, /^◆ Remote requires a deposit up front\. ⟦/);
    assert.equal(writes[0].filingId, "f1");
  });

  test("the callers dropped their inline sets", () => {
    const actions = read("src/app/room/actions.ts");
    const research = actions.slice(
      actions.indexOf("export async function roomResearch("),
      actions.indexOf("export async function roomGapsRefill("),
    );
    assert.ok(!research.includes("known:"), "roomResearch builds no known-set");
    const refill = actions.slice(
      actions.indexOf("export async function roomGapsRefill("),
      actions.indexOf("export async function roomGapDismiss("),
    );
    assert.ok(!refill.includes("known:"), "roomGapsRefill builds no known-set");
    const playbook = read("src/app/playbook/actions.ts");
    assert.ok(!playbook.includes("known"), "the approval builds no known-set");
    const fanout = read("src/lib/ingest/fanout.ts");
    const absorb = fanout.slice(fanout.indexOf("export async function absorbRead("));
    for (const name of ["fileGaps", "filePlaybook"]) {
      const at = absorb.indexOf(`await ${name}({`);
      assert.ok(at > 0, `${name} is called by the fan-out`);
      const args = absorb.slice(at, absorb.indexOf("});", at));
      assert.ok(!args.includes("known"), `the fan-out hands ${name} no set`);
    }
    assert.ok(!absorb.includes("priorAsks"));
    assert.ok(!actions.includes("async function absorbRead("), "absorbRead left actions.ts");
    assert.match(actions, /import \{ absorbRead, fileCompletion, undoCompletions \} from "@\/lib\/ingest\/fanout";/);
  });
});

// ── the undo's reach ───────────────────────────────────────────────────────
describe("undo by filing id removes every row and todo it wrote and nothing else", () => {
  test("undoFiling over two filings on one account takes back one", async () => {
    const notes = new Map([
      ["n1", { filingId: "f1" }],
      ["n2", { filingId: "f1" }],
      ["n3", { filingId: "f2" }],
      ["n4", { filingId: null as string | null }],
    ]);
    const todos = new Map([
      ["t1", { filingId: "f1" }],
      ["t2", { filingId: "f1" }],
      ["t3", { filingId: "f2" }],
    ]);
    const filings = new Map([
      ["f1", { accountId: "A1" }],
      ["f2", { accountId: "A1" }],
    ]);
    const client = {
      filing: {
        upsert: async () => ({ id: "x" }),
        findUnique: async ({ where }: { where: { id: string } | object }) => {
          const id = "id" in where ? where.id : "";
          const f = filings.get(id);
          return f
            ? {
                id,
                accountId: f.accountId,
                fingerprint: "",
                door: "chute",
                dialect: "OL",
                how: "ai",
                read: null,
                windows: [],
                dupeCheck: "ran",
                createdAt: NOW,
                filedAt: NOW,
              }
            : null;
        },
        deleteMany: async ({ where }: { where: { id: string } }) => ({
          count: filings.delete(where.id) ? 1 : 0,
        }),
      },
      accountNote: {
        findUnique: async () => null,
        deleteMany: async ({ where }: { where: { filingId: string } }) => {
          let count = 0;
          for (const [id, n] of notes)
            if (n.filingId === where.filingId) {
              notes.delete(id);
              count++;
            }
          return { count };
        },
      },
      todo: {
        deleteMany: async ({ where }: { where: { filingId: string } }) => {
          let count = 0;
          for (const [id, t] of todos)
            if (t.filingId === where.filingId) {
              todos.delete(id);
              count++;
            }
          return { count };
        },
      },
    } as unknown as FilingClient;
    assert.deepEqual(await undoFiling("f1", "A1", client), { notes: 2, todos: 2, filing: 1 });
    assert.deepEqual([...notes.keys()], ["n3", "n4"]);
    assert.deepEqual([...todos.keys()], ["t3"]);
    assert.deepEqual([...filings.keys()], ["f2"]);
  });

  test("roomPasteUndo reads the filing's todos before the row goes and takes their completion lines back", () => {
    const actions = read("src/app/room/actions.ts");
    const undo = actions.slice(
      actions.indexOf("export async function roomPasteUndo("),
      actions.indexOf("// --- Closing a deal"),
    );
    const readAt = undo.indexOf("where: { filingId: filing, accountId: acct.id }");
    const filingAt = undo.indexOf("await undoFiling(filing, acct.id)");
    const doneAt = undo.indexOf("await undoCompletions(acct.id, [...todos, ...filingTodos])");
    assert.ok(readAt > 0, "the filing's todos are read by the column, on this account");
    assert.ok(filingAt > readAt, "read before the row goes");
    assert.ok(doneAt > filingAt, "the completion lines go after");
    assert.ok(undo.includes("+ completions"), "the receipt counts them");
    // The id lists stay the undo's reach until slice 8 stops sending them.
    assert.match(undo, /todoIds: string\[\] = \[\],\n[\s\S]*?filingId\?: string,\n\)/);
    // ✕ on one opened action takes its completion line with it too.
    const one = actions.slice(
      actions.indexOf("export async function roomActionUndo("),
      actions.indexOf("export async function roomMoveDone("),
    );
    assert.ok(one.includes("await prisma.todo.delete({ where: { id } });"));
    assert.ok(one.includes("await undoCompletions(acct.id, [id]);"));
    // The close still files its line through the module.
    assert.ok(actions.includes("if (wasRouted) await fileCompletion(acct.id, id, t.body);"));
  });

  test("a fileCompletion note keyed by an opened todo is taken back with its todo", async () => {
    const notes = new Map<string, AccountNoteData>();
    const marks = new Map<string, { status: string; reason: string }>();
    let seq = 0;
    const client: CompletionClient = {
      accountNote: {
        create: async ({ data }) => {
          const id = `n${++seq}`;
          notes.set(id, data);
          return { id };
        },
        deleteMany: async ({ where }) => {
          const n = notes.get(where.id);
          if (!n || n.accountId !== where.accountId) return { count: 0 };
          notes.delete(where.id);
          return { count: 1 };
        },
      },
      accountDisposition: {
        findUnique: async ({ where }) => {
          const m = marks.get(where.accountId);
          return m ? { reason: m.reason } : null;
        },
        upsert: async ({ where, create }) => {
          marks.set(where.accountId, { status: create.status, reason: create.reason });
        },
        deleteMany: async ({ where }) => ({ count: marks.delete(where.accountId) ? 1 : 0 }),
      },
    };
    await fileCompletion("A1", "t1", "Send the model.\n⚑[d:2026-10-09,u:high,k:a]", client);
    assert.equal(notes.size, 1);
    const [[noteId, line]] = [...notes];
    assert.match(line.body, /^✓ Send the model\. — done \d{1,2}\/\d{1,2}$/);
    assert.equal(line.door, "hand");
    assert.equal(line.source, "done");
    assert.equal(marks.get(completionKey("t1"))?.reason, `completion filed·${noteId}`);
    // Done → undo → done files one line, not two.
    await fileCompletion("A1", "t1", "Send the model.\n⚑[k:a]", client);
    assert.equal(notes.size, 1);
    // Another account's undo reaches nothing; the line and the marker stand.
    assert.equal(await undoCompletions("A2", ["t1"], client), 0);
    assert.equal(notes.size, 1);
    assert.ok(marks.has(completionKey("t1")), "a marker it cannot act on stays");
    // The todo's own undo takes the line and clears the marker.
    assert.equal(await undoCompletions("A1", ["t1", "t1", "t9"], client), 1);
    assert.equal(notes.size, 0);
    assert.equal(marks.size, 0);
    // A marker from before the line carried its id names no line: the record
    // keeps the line it cannot find, and the marker stands with it.
    marks.set(completionKey("t2"), { status: "parked", reason: "completion filed" });
    assert.equal(await undoCompletions("A1", ["t2"], client), 0);
    assert.equal(marks.size, 1);
  });
});
