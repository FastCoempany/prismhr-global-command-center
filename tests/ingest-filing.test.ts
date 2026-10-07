// The Filing table and the stored read (the Chute brains refactor plan, §2.1
// pick C; slice 4). Pinned as behavior where the seam exists — the Filing
// module over a stubbed client, the sanitizer, the windows module, the
// writers' link tier — and as source where it does not: roomPaste gates on
// getAppAccess and getPrisma, so, as tests/ingest-defects.test.ts does, the
// sequencing inside it is read from the slice between
// `export async function roomPaste(` and `export async function
// roomMoveDone(`, and the fan-out from its own module (slice 6).
//
// D4 (CLAUDE.md, The Chute): the note keeps the text whole at any size; only
// the model's read is windowed, and every window that cut something is on the
// receipt. D7: the duplicate check fails open and says so. P3/P4: provenance
// is columns — every row and todo a filing writes carries the filing's id.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { Prisma } from "../src/generated/prisma/client";
import {
  CLAIM_STALE_MS,
  CLAIM_STATUS,
  claimCapture,
  fileFiling,
  findFiling,
  readOfNote,
  releaseCapture,
  undoFiling,
  wroteOfFiling,
  type ClaimClient,
  type FilingClient,
  type FilingData,
  type WroteClient,
} from "../src/lib/ingest/filing";
import { PLAYBOOK_LESSONS, PLAYBOOK_MARKET, playbookBody } from "../src/lib/playbook/store";
import { gapNs } from "../src/lib/room/gaps";
import {
  DUPE_CHECK_SKIPPED,
  ENTRY_CAP,
  READ_WINDOW,
  READ_WINDOW_TAPE,
  TEXT_FLOOR,
  TRANSCRIBE_BYTES,
  cut,
  filingSentences,
  windowSentences,
  windowsOf,
} from "../src/lib/ingest/windows";
import {
  READER_CONTRACT,
  canonCountry,
  canonProduct,
  sanitizeAiResult,
} from "../src/lib/intel/ai-clean";
import { sheetToPaste } from "../src/lib/paste-files";
import {
  createAccountNoteRow,
  createTodoRow,
  type AccountNoteData,
  type TodoData,
} from "../src/lib/notes/write";

const root = cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const actions = read("src/app/room/actions.ts");
const fanoutSrc = read("src/lib/ingest/fanout.ts");

/** The body of one top-level function, from its head to the next marker. */
function slice(src: string, from: string, to: string): string {
  const a = src.indexOf(from);
  const b = src.indexOf(to, a + from.length);
  assert.ok(a >= 0, `missing slice head: ${from}`);
  assert.ok(b > a, `missing slice tail: ${to}`);
  return src.slice(a, b);
}

/** The text inside one call's parentheses, from the open paren to its match. */
function callArgs(src: string, open: number): string {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === "(" || c === "{" || c === "[") depth++;
    else if (c === ")" || c === "}" || c === "]") {
      depth--;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return src.slice(open + 1);
}

const roomPaste = slice(
  actions,
  "export async function roomPaste(",
  // roomActionUndo, the old tail, retired in pass 9 (no client had called it
  // since #360); the next action is the tail now.
  "export async function roomMoveDone(",
);
const absorbRead = slice(
  fanoutSrc,
  "export async function absorbRead(",
  "export function completionKey(",
);
const pasteUndo = slice(
  actions,
  "export async function roomPasteUndo(",
  "// --- Closing a deal",
);

// ── a stubbed client over the three tables the module touches ──────────────
type Row = FilingData & { id: string; createdAt: Date };

function stub(opts: { table?: boolean } = {}) {
  const filings = new Map<string, Row>();
  const notes = new Map<string, { filingId: string | null }>();
  const todos = new Map<string, { filingId: string | null }>();
  const calls: string[] = [];
  const table = opts.table ?? true;
  const gate = () => {
    if (!table) throw new Error('relation "Filing" does not exist');
  };
  let seq = 0;
  const client: FilingClient = {
    filing: {
      async upsert(args) {
        calls.push("filing.upsert");
        gate();
        const key = `${args.where.accountId_fingerprint.accountId}|${args.where.accountId_fingerprint.fingerprint}`;
        const prior = [...filings.values()].find(
          (r) => `${r.accountId}|${r.fingerprint}` === key,
        );
        if (prior) {
          filings.set(prior.id, { ...prior, ...args.update });
          return { id: prior.id };
        }
        const id = `f${++seq}`;
        filings.set(id, { ...args.create, id, createdAt: new Date("2026-10-05T15:00:00Z") });
        return { id };
      },
      async findUnique(args) {
        calls.push("filing.findUnique");
        gate();
        const w = args.where;
        const row =
          "id" in w
            ? filings.get(w.id)
            : [...filings.values()].find(
                (r) =>
                  r.accountId === w.accountId_fingerprint.accountId &&
                  r.fingerprint === w.accountId_fingerprint.fingerprint,
              );
        if (!row) return null;
        // What the client hands back: JSON columns as stored values.
        return {
          ...row,
          read: row.read === Prisma.JsonNull ? null : row.read,
          windows: row.windows,
        };
      },
      async deleteMany(args) {
        calls.push("filing.deleteMany");
        gate();
        const had = filings.delete(args.where.id);
        return { count: had ? 1 : 0 };
      },
    },
    accountNote: {
      async findUnique(args) {
        calls.push("accountNote.findUnique");
        const n = notes.get(args.where.id);
        return n ? { filingId: n.filingId } : null;
      },
      async deleteMany(args) {
        calls.push("accountNote.deleteMany");
        let count = 0;
        for (const [id, n] of notes)
          if (n.filingId === args.where.filingId) {
            notes.delete(id);
            count++;
          }
        return { count };
      },
    },
    todo: {
      async deleteMany(args) {
        calls.push("todo.deleteMany");
        let count = 0;
        for (const [id, t] of todos)
          if (t.filingId === args.where.filingId) {
            todos.delete(id);
            count++;
          }
        return { count };
      },
    },
  };
  return { client, filings, notes, todos, calls };
}

// The read-absorption fixture, grown with the deal facts — on the entry that
// states them, never on the read (§2.1: every fact is a door to its row).
const CALL_ENTRY = {
  kind: "call",
  subject: "Discovery call",
  from: "Dana Ellis",
  to: "Antaeus Coe",
  others: 2,
  recipients: ["Dana Ellis", "Antaeus Coe"],
  timeLabel: "10:00 AM",
  dayLabel: "Aug 27",
  dayIso: "2026-08-27",
  body: "Mexico first, then Canada. Ten workers to start.",
  countries: ["Mexico", "canada"],
  products: ["Employer of record"],
  headcounts: [{ what: "workers in Mexico", count: 10 }],
  timing: "by January",
  promises: [
    { what: "Send the model.", by: "me", hearer: "Dana Ellis", day: "2026-10-09" },
    { what: "Send the org chart.", by: "them", hearer: "Antaeus Coe", day: "" },
  ],
};
const RAW_READ = {
  entries: [CALL_ENTRY],
  signals: ["Mexico first, Canada after"],
  actions: [{ text: "Send the model.", owner: "me", due: "2026-10-09", fallback: "" }],
  gaps: ["Do the Mexico workers need benefits parity?"],
  competitorIntel: [{ fact: "Deel asks a deposit up front for Mexico.", who: "Dana Ellis" }],
  lessons: ["Lead with the entity question on a first call."],
  outcome: { status: "none", phrase: "" },
  accountName: "Acme PEO",
};
/** The same read with one entry's facts overridden. */
const withEntry = (over: Record<string, unknown>) => ({
  ...RAW_READ,
  entries: [{ ...CALL_ENTRY, ...over }],
});

const FILING = {
  accountId: "A1",
  fingerprint: "abc123",
  door: "chute" as const,
  dialect: "CT",
  how: "ai" as const,
  windows: [{ what: "the paste", read: 60000, of: 212000 }],
  dupeCheck: "ran" as const,
  filedAt: new Date("2026-08-27T12:00:00Z"),
};

// ── the stored read ────────────────────────────────────────────────────────
describe("a filing's read round-trips through the sanitizer unchanged", () => {
  test("what fileFiling stores is the sanitized read, and findFiling hands it back equal", async () => {
    const { client, filings } = stub();
    const sane = sanitizeAiResult(RAW_READ);
    const r = await fileFiling({ ...FILING, read: sane }, client);
    assert.ok(r);
    const stored = filings.get(r.id);
    assert.ok(stored);
    // Stored as plain JSON — the same thing the sanitizer made, no undefined.
    assert.deepEqual(JSON.parse(JSON.stringify(stored.read)), JSON.parse(JSON.stringify(sane)));
    assert.deepEqual(sanitizeAiResult(stored.read), sane);
    const back = await findFiling("A1", "abc123", client);
    assert.ok(back);
    assert.deepEqual(back.read, sane);
    assert.deepEqual(back.windows, FILING.windows);
    assert.equal(back.how, "ai");
    assert.equal(back.dupeCheck, "ran");
    assert.equal(back.door, "chute");
    assert.equal(back.dialect, "CT");
    assert.equal(back.filedAt.toISOString(), "2026-08-27T12:00:00.000Z");
  });

  test("the stored read is money-redacted: the sanitizer runs on the way in", async () => {
    const { client, filings } = stub();
    const sane = sanitizeAiResult(RAW_READ);
    const r = await fileFiling(
      {
        ...FILING,
        read: {
          ...sane,
          entries: [
            {
              ...sane.entries[0]!,
              timing: "by January, budget $12,000",
              headcounts: [{ what: "$5,000 of workers", count: 10 }],
            },
          ],
        },
      },
      client,
    );
    assert.ok(r);
    const json = JSON.stringify(filings.get(r.id)!.read);
    assert.ok(!json.includes("12,000") && !json.includes("5,000"), json);
    assert.ok(json.includes('"count":10'), "a count is a number, never a figure");
  });

  test("a re-drop after an undo replaces the row: upsert on (accountId, fingerprint)", async () => {
    const { client, filings } = stub();
    const first = await fileFiling({ ...FILING, read: null, how: "rules" }, client);
    const again = await fileFiling({ ...FILING, read: sanitizeAiResult(RAW_READ) }, client);
    assert.ok(first && again);
    assert.equal(again.id, first.id);
    assert.equal(filings.size, 1);
    assert.equal(filings.get(first.id)!.how, "ai");
  });

  test("readOfNote follows the note's filingId to the read; no link, no read", async () => {
    const { client, notes } = stub();
    const sane = sanitizeAiResult(RAW_READ);
    const r = await fileFiling({ ...FILING, read: sane }, client);
    assert.ok(r);
    notes.set("n1", { filingId: r.id });
    notes.set("n2", { filingId: null });
    assert.deepEqual(await readOfNote("n1", client), sane);
    assert.equal(await readOfNote("n2", client), null);
    assert.equal(await readOfNote("nope", client), null);
  });
});

describe("a keyless filing stores a null read and how rules", () => {
  test("fileFiling writes JsonNull for the read and keeps how", async () => {
    const { client, filings } = stub();
    const r = await fileFiling({ ...FILING, read: null, how: "rules" }, client);
    assert.ok(r);
    const stored = filings.get(r.id)!;
    assert.equal(stored.read, Prisma.JsonNull);
    assert.equal(stored.how, "rules");
    const back = await findFiling("A1", "abc123", client);
    assert.equal(back?.read, null);
    assert.equal(back?.how, "rules");
    assert.equal(await readOfNote("n1", client), null);
  });

  test("roomPaste hands the read as it stands — null when the key is off — and names how", () => {
    // The read is assigned only inside the availability gate and reset on a
    // throw (ingest-defects pins that); the Filing row takes that same
    // variable, so a keyless filing's read is null by construction.
    const at = roomPaste.indexOf("const writeFiling = async (filingHow: FilingHow) =>");
    assert.ok(at > 0, "roomPaste writes the Filing row");
    const body = roomPaste.slice(at, at + 600);
    assert.match(body, /\bread,\n/, "the read object itself is stored");
    assert.match(body, /\bwindows,\n/, "every window that cut something is stored");
    assert.match(body, /\bdupeCheck,\n/, "the duplicate check's outcome is stored");
    assert.match(body, /filedAt: recordedAt\(\) \?\? now/, "the capture's day, else now");
    assert.ok(roomPaste.includes('await writeFiling(how === "ai" ? "ai" : "rules");'));
    assert.equal((roomPaste.match(/await writeFiling\("transcript"\)/g) ?? []).length, 2);
    // Before the first row, after every refusal: the early refusal, the
    // duplicate, the two guard rungs all return before the row is written,
    // and on each of the three filing paths the row is written right before
    // the first note.
    const firstWrite = roomPaste.indexOf("await writeFiling(");
    for (const refusal of [
      "if (refused) return refused;",
      "duplicate: true,",
      "if (!verdict.ok)",
    ])
      assert.ok(roomPaste.indexOf(refusal) < firstWrite, refusal);
    assert.ok(roomPaste.includes('await writeFiling("transcript");\n        const id = await archiveNote();'));
    assert.ok(roomPaste.includes('await writeFiling("transcript");\n      const n = await createAccountNoteRow('));
    assert.ok(roomPaste.includes('await writeFiling(how === "ai" ? "ai" : "rules");\n    let filed = 0;'));
    for (const m of roomPaste.matchAll(/stampPasteMark\(pasteKey/g))
      assert.ok((m.index ?? 0) > firstWrite, "the marker lands after the row");
  });
});

describe("every row and todo the filing wrote carries its id (P3/P4)", () => {
  test("the writers put the link on its own tier, and lose only the link on a database without it", async () => {
    const writes: AccountNoteData[] = [];
    const noteClient = {
      accountNote: {
        create: async ({ data }: { data: AccountNoteData }) => {
          writes.push(data);
          return { id: `n${writes.length}` };
        },
      },
    };
    await createAccountNoteRow(
      { accountId: "A1", kind: "account", body: "Hi", door: "chute", filingId: "f1" },
      noteClient,
    );
    assert.equal(writes[0].filingId, "f1");
    assert.equal(writes[0].door, "chute");
    assert.ok("recipients" in writes[0], "the link rides above the full provenance tier");
    await createAccountNoteRow(
      { accountId: "A1", kind: "account", body: "Hi", door: "chute" },
      noteClient,
    );
    assert.ok(!("filingId" in writes[1]), "no filing, no attempt at the link");

    const attempts: AccountNoteData[] = [];
    const unmigrated = {
      accountNote: {
        create: async ({ data }: { data: AccountNoteData }) => {
          attempts.push(data);
          if ("filingId" in data) throw new Error("no such column");
          return { id: "linked-less" };
        },
      },
    };
    const r = await createAccountNoteRow(
      { accountId: "A1", kind: "account", body: "Hi", door: "drop", filingId: "f1" },
      unmigrated,
    );
    assert.equal(r.id, "linked-less");
    assert.equal(attempts.length, 2);
    assert.equal(attempts[0].filingId, "f1");
    assert.ok(!("filingId" in attempts[1]));
    assert.equal(attempts[1].door, "drop");
    assert.ok("recipients" in attempts[1], "the provenance survives; only the link is lost");

    const todoWrites: TodoData[] = [];
    const todoClient = {
      todo: {
        create: async ({ data }: { data: TodoData }) => {
          todoWrites.push(data);
          return { id: `t${todoWrites.length}` };
        },
        findFirst: async () => ({ position: 3 }),
      },
    };
    await createTodoRow(
      { body: "Send the model.", tags: { kind: "action" }, accountId: "A1", filingId: "f1" },
      todoClient,
    );
    assert.equal(todoWrites[0].filingId, "f1");
    assert.equal(todoWrites[0].accountId, "A1");
    await createTodoRow({ body: "Call Dana.", tags: { kind: "action" } }, todoClient);
    assert.ok(!("filingId" in todoWrites[1]));
  });

  test("roomPaste and its fan-out pass the filing's id to every row and todo they write", () => {
    const sliceOf = `${roomPaste}${absorbRead}`;
    const calls: { name: string; args: string }[] = [];
    for (const name of ["createAccountNoteRow", "createTodoRow", "fileGaps", "filePlaybook"]) {
      const re = new RegExp(`\\b${name}\\s*\\(`, "g");
      for (let m = re.exec(sliceOf); m; m = re.exec(sliceOf))
        calls.push({ name, args: callArgs(sliceOf, m.index + m[0].length - 1) });
    }
    assert.ok(calls.length >= 7, `only ${calls.length} writer calls found`);
    for (const c of calls)
      assert.match(c.args, /(?:^|[\s,{])filingId\b/, `${c.name}(${c.args.slice(0, 60)}…)`);
    assert.match(absorbRead, /filingId\?: string,\n\): Promise<\{/, "absorbRead takes the id");
    assert.match(roomPaste, /await absorbRead\(read, \{ id: acct\.id, name: acct\.name \}, now, door, filingId\)/);
    // The writers of the fan-out's namespaces carry the id through.
    for (const f of ["src/lib/room/gaps.ts", "src/lib/playbook/store.ts"]) {
      const src = read(f);
      assert.match(src, /filingId\?: string;/, `${f} takes the filing's id`);
      assert.match(src, /filingId: opts\.filingId,/, `${f} passes it on`);
    }
  });

  test("the result carries filingId, windows and dupeCheck on every filed path", () => {
    const returns = roomPaste.match(/return \{\s*ok: true,[\s\S]*?\};/g) ?? [];
    assert.equal(returns.length, 3, "the archive, the no-entries line, the entries");
    for (const r of returns)
      for (const key of ["filingId", "windows", "dupeCheck"])
        assert.match(r, new RegExp(`\\b${key},`), `${key} missing from ${r.slice(0, 80)}`);
  });

  test("undoFiling takes back every row and todo carrying the id, then the row, scoped to the account", async () => {
    const { client, notes, todos, filings } = stub();
    const r = await fileFiling({ ...FILING, read: null, how: "rules" }, client);
    assert.ok(r);
    notes.set("n1", { filingId: r.id });
    notes.set("n2", { filingId: r.id });
    notes.set("n3", { filingId: "other" });
    todos.set("t1", { filingId: r.id });
    // Another account's id reaches nothing.
    assert.deepEqual(await undoFiling(r.id, "A2", client), { notes: 0, todos: 0, filing: 0 });
    assert.equal(notes.size, 3);
    assert.deepEqual(await undoFiling(r.id, "A1", client), { notes: 2, todos: 1, filing: 1 });
    assert.deepEqual([...notes.keys()], ["n3"]);
    assert.equal(todos.size, 0);
    assert.equal(filings.size, 0);
    assert.deepEqual(await undoFiling("gone", "A1", client), { notes: 0, todos: 0, filing: 0 });
  });

  test("roomPasteUndo keeps its id lists and takes the filing's id as well", () => {
    assert.match(pasteUndo, /todoIds: string\[\] = \[\],\n[\s\S]*?filingId\?: string,\n\)/);
    assert.ok(pasteUndo.includes("await undoFiling(filing, acct.id)"), "scoped to the bound row");
    assert.ok(pasteUndo.includes("ids.length === 0 && todos.length === 0 && !filing"));
    // The marker still clears off the first note id (ingest-defects pins the key).
    assert.ok(pasteUndo.includes("startsWith: `pastehash:${acct.id}:`"));
  });

  test("a database without the table answers null and zeros, never a throw", async () => {
    const { client } = stub({ table: false });
    assert.equal(await fileFiling({ ...FILING, read: null, how: "rules" }, client), null);
    assert.equal(await findFiling("A1", "abc123", client), null);
    assert.equal(await readOfNote("n1", client), null);
    assert.deepEqual(await undoFiling("f1", "A1", client), { notes: 0, todos: 0, filing: 0 });
  });
});

// ── the windows ────────────────────────────────────────────────────────────
describe("the windows list names what was cut of what arrived (D4)", () => {
  test("cut returns the window only when something was cut", () => {
    const big = "x".repeat(212000);
    const c = cut("the paste", big, READ_WINDOW);
    assert.equal(c.text.length, 60000);
    assert.deepEqual(c.window, { what: "the paste", read: 60000, of: 212000 });
    const fit = cut("the paste", "short", READ_WINDOW);
    assert.equal(fit.text, "short");
    assert.equal(fit.window, null);
    const exact = cut("the paste", "y".repeat(READ_WINDOW), READ_WINDOW);
    assert.equal(exact.window, null);
  });

  test("the named windows are the pipeline's, and no literal cap stays inline", () => {
    assert.equal(READ_WINDOW, 60000);
    assert.equal(READ_WINDOW_TAPE, 400000);
    assert.equal(TRANSCRIBE_BYTES, 8 * 1024 * 1024);
    assert.equal(ENTRY_CAP, 40);
    assert.equal(TEXT_FLOOR, 20);
    for (const f of [
      "src/app/room/actions.ts",
      "src/app/room/read-file.ts",
      "src/lib/paste-files.ts",
      "src/lib/intel/ai-clean.ts",
    ]) {
      const src = read(f);
      // The ids trimmed to 40 characters elsewhere in actions.ts are not the
      // entry cap; the cap is the slice over `entries`.
      assert.ok(
        !/\b(?:400000|60000|30000|150000|400_000|60_000|30_000)\b|8 \* 1024 \* 1024|entries\.slice\(0, 40\)|length < 20\b/.test(src),
        `${f} spells a cap inline`,
      );
    }
    // The read is windowed with the module's windows, by dialect.
    assert.match(
      roomPaste,
      /cut\(\s*"the paste",\s*rawText,\s*dialect === "CT" \? READ_WINDOW_TAPE : READ_WINDOW,?\s*\)/,
    );
    // The model-facing truncation note keeps its text.
    assert.ok(roomPaste.includes("[NOTE: paste truncated — "));
    assert.ok(roomPaste.includes("more characters omitted]"));
    // Rewritten in pass 9 (ruled 2026-10-07, pass 8 call 3: every reader
    // hands on the text whole, and only what goes to a model is windowed).
    // The transcriber and the document reader used to cut before filing;
    // neither cuts now, and roomPaste's read window is the one cut.
    assert.ok(!actions.includes('cut("the transcription"'), "the transcriber cuts nothing");
    assert.ok(actions.includes("return { ok: true, text, window: null };"));
    const reader = read("src/app/room/read-file.ts");
    assert.ok(!/\bcut\(/.test(reader), "the file reader cuts nothing");
    assert.ok(reader.includes("`DOCUMENT — ${f.name}\\n\\n${raw}`"), "the document whole");
    assert.ok(reader.includes("if (r.window) windows.push(r.window);"));
    assert.ok(reader.includes("return { ok: true, text, windows };"));
    assert.ok(roomPaste.includes("const windows: Window[] = [...(opts.windows ?? [])];"));
  });

  // Rewritten in pass 9 (pass 8 call 3): the sheet's trim was a window cut
  // before filing; the reader now hands the sheet on whole, every sheet and
  // every row, and only roomPaste's read of it is windowed.
  test("the sheet is handed on whole: every sheet, every row, no trim", () => {
    const rows = Array.from({ length: 500 }, (_, i) => [`Account ${i}`, "Mexico", `${i}`]);
    const big = sheetToPaste([{ name: "Accounts", rows }], "book.xlsx");
    const whole = ["SPREADSHEET — book.xlsx", "\n== sheet: Accounts ==", ...rows.map((r) => r.join("\t"))].join("\n");
    assert.equal(big.text, whole, "all five hundred rows");
    assert.ok(!big.text.includes("trimmed"));
    const wide = sheetToPaste(
      [{ name: "Notes", rows: Array.from({ length: 300 }, () => ["x".repeat(200)]) }],
      "notes.xlsx",
    );
    assert.equal(wide.text.length, "SPREADSHEET — notes.xlsx\n\n== sheet: Notes ==\n".length + 300 * 201 - 1);
    const many = sheetToPaste(
      Array.from({ length: 6 }, (_, i) => ({ name: `S${i}`, rows: [[`row ${i}`]] })),
      "six.xlsx",
    );
    for (let i = 0; i < 6; i++) assert.ok(many.text.includes(`== sheet: S${i} ==\nrow ${i}`), `sheet ${i}`);
    const small = sheetToPaste([{ name: "Accounts", rows: [["Simploy", "Mexico"]] }], "a.xlsx");
    assert.equal(small.text, "SPREADSHEET — a.xlsx\n\n== sheet: Accounts ==\nSimploy\tMexico");
    const reader = read("src/app/room/read-file.ts");
    assert.ok(reader.includes("text = sheetToPaste(sheets, f.name).text;"));
  });

  test("windows read back from storage drop anything that is not a window", () => {
    assert.deepEqual(
      windowsOf([
        { what: "the paste", read: 60000, of: 212000 },
        { what: 1, read: 2, of: 3 },
        null,
        "x",
        { what: "the document", read: Infinity, of: 1 },
      ]),
      [{ what: "the paste", read: 60000, of: 212000 }],
    );
    assert.deepEqual(windowsOf(null), []);
  });
});

// ── the notes keep the text whole ──────────────────────────────────────────
describe("the note keeps the text whole at any size (D4)", () => {
  test("the tape's archive note is the whole text", () => {
    const at = roomPaste.indexOf("const archiveNote = async ()");
    assert.ok(at > 0);
    const archive = roomPaste.slice(at, roomPaste.indexOf("return n.id;", at));
    assert.ok(archive.includes("const whole = redactMoney(cleanSfPaste(rawText));"));
    assert.ok(!/whole\)?\.slice\(/.test(archive), "the archive is never sliced");
    assert.ok(!roomPaste.includes("150000"));
  });

  test("the no-entries note is the whole text", () => {
    assert.ok(roomPaste.includes("const body = redactMoney(cleanSfPaste(rawText));"));
    assert.ok(!roomPaste.includes("earlier portion trimmed"));
    assert.ok(!roomPaste.includes("slice(-6000)"));
    assert.ok(!/\b6000\b/.test(roomPaste));
    // Only the model's read is windowed: the whole text comes from rawText,
    // never from the windowed `text`.
    assert.ok(!roomPaste.includes("cleanSfPaste(text)"));
  });
});

// ── the grown read ─────────────────────────────────────────────────────────
describe("the grown read round-trips and the sanitizer clamps it to the lexicon", () => {
  test("countries and products come back as the lexicon spells them; the unknown is dropped", () => {
    const r = sanitizeAiResult(
      withEntry({
        countries: ["Mexico", "uk", "Narnia", "Canadian", "mexico", "Czech Republic", "Dubai"],
        products: ["EOR", "Global payroll", "widgets", "contractor plus on the platform", "Talent"],
      }),
    );
    const e = r.entries[0]!;
    assert.deepEqual(e.countries, [
      "Mexico",
      "United Kingdom",
      "Canada",
      "Czech Republic/Czechia",
      "UAE",
    ]);
    assert.deepEqual(e.products, [
      "Employer of record",
      "Global payroll",
      "Contractor of record",
      "Talent",
    ]);
    // The facts have one home: nothing is pooled onto the read.
    assert.ok(!("countries" in r) && !("products" in r) && !("promises" in r));
    assert.equal(canonCountry("Narnia"), "");
    assert.equal(canonCountry("the Netherlands"), "Netherlands");
    assert.equal(canonCountry("Puerto Rico"), "Puerto Rico");
    assert.equal(canonProduct("contractor management"), "Contractor management");
    assert.equal(canonProduct("widgets"), "");
  });

  test("counts are non-negative integers, strings are redacted, and a thin promise is dropped", () => {
    const e = sanitizeAiResult(
      withEntry({
        headcounts: [
        { what: "workers in Mexico", count: 10 },
        { what: "", count: 3 },
        { what: "contractors", count: -2.6 },
        { what: "seats at $5,000", count: 2.5 },
        { what: "nope", count: "ten" },
        ],
        timing: "by January, budget $12,000",
        promises: [
          { what: "Send the model.", by: "me", hearer: "Ellis, Dana", day: "2026-10-09" },
          { what: "x", by: "them", hearer: "", day: "2026-10-09" },
          { what: "Send the org chart.", by: "them", hearer: "Antaeus Coe", day: "Friday" },
          { what: "Quote the $400 PEPM.", by: "them", hearer: "", day: "" },
        ],
      }),
    ).entries[0]!;
    assert.deepEqual(e.headcounts, [
      { what: "workers in Mexico", count: 10 },
      { what: "contractors", count: 0 },
      { what: "seats at [—]", count: 3 },
    ]);
    assert.equal(e.timing, "by January, budget [—]");
    assert.deepEqual(e.promises, [
      { what: "Send the model.", by: "me", hearer: "Dana Ellis", day: "2026-10-09" },
      { what: "Send the org chart.", by: "them", hearer: "Antaeus Coe", day: "" },
      // redactMoney eats the figure and the space after it; the clamp is the
      // lexicon's own, never softened here.
      { what: "Quote the [—]PEPM.", by: "them", hearer: "", day: "" },
    ]);
  });

  test("every new field is optional-by-emptiness on the entry; the rule parser leaves them absent", () => {
    // The entry with no facts at all, as the rule parser would hand it over.
    const { countries, products, headcounts, timing, promises, ...bare } = CALL_ENTRY;
    assert.ok(countries && products && headcounts && timing && promises);
    for (const junk of [{}, { countries: "Mexico", promises: 7, headcounts: null, timing: 4 }]) {
      const e = sanitizeAiResult({ ...RAW_READ, entries: [{ ...bare, ...junk }] }).entries[0]!;
      assert.deepEqual(e.countries, []);
      assert.deepEqual(e.products, []);
      assert.deepEqual(e.headcounts, []);
      assert.equal(e.timing, "");
      assert.deepEqual(e.promises, []);
    }
    // The read itself carries no copy of any fact.
    const r = sanitizeAiResult(null) as unknown as Record<string, unknown>;
    for (const key of ["countries", "products", "headcounts", "timing", "promises"])
      assert.ok(!(key in r), `${key} pooled onto the read`);
    const parser = read("src/lib/sf-timeline.ts");
    assert.match(parser, /countries\?: string\[\];/);
    assert.match(parser, /promises\?: EntryPromise\[\];/);
    assert.ok(!/countries:\s*\[/.test(parser), "the rule parser never fills the facts");
  });

  test("the grown read round-trips through storage unchanged", async () => {
    const { client } = stub();
    const sane = sanitizeAiResult(RAW_READ);
    const e = sane.entries[0]!;
    assert.deepEqual(e.countries, ["Mexico", "Canada"]);
    assert.deepEqual(e.products, ["Employer of record"]);
    assert.equal(e.promises?.length, 2);
    assert.equal(e.timing, "by January");
    const r = await fileFiling({ ...FILING, read: sane }, client);
    assert.ok(r);
    const back = await findFiling("A1", "abc123", client);
    assert.deepEqual(back?.read, sane);
  });

  test("the reader's contract asks for the facts per entry, in its own voice", () => {
    for (const line of [
      "- Each entry also carries the deal facts THAT entry states",
      "  - countries:",
      "  - products:",
      "  - headcounts:",
      "  - timing:",
      "  - promises:",
      "hearer = the name of the person who heard it",
    ])
      assert.ok(READER_CONTRACT.includes(line), line);
  });
});

// ── the receipt ────────────────────────────────────────────────────────────
describe("the receipt sentences read from the result (D4, D7)", () => {
  test('"Read 60,000 of 212,000 characters." and "The duplicate check didn\'t run."', () => {
    assert.deepEqual(
      filingSentences({ windows: [{ what: "the paste", read: 60000, of: 212000 }] }),
      ["Read 60,000 of 212,000 characters."],
    );
    assert.deepEqual(filingSentences({ dupeCheck: "skipped" }), ["The duplicate check didn't run."]);
    assert.equal(DUPE_CHECK_SKIPPED, "The duplicate check didn't run.");
    assert.deepEqual(
      filingSentences({
        windows: [{ what: "the paste", read: 60000, of: 212000 }],
        dupeCheck: "skipped",
      }),
      ["Read 60,000 of 212,000 characters.", "The duplicate check didn't run."],
    );
    assert.deepEqual(filingSentences({ windows: [], dupeCheck: "ran" }), []);
    assert.deepEqual(filingSentences({}), []);
  });

  test("more than one window names what each one cut", () => {
    assert.deepEqual(
      windowSentences([
        { what: "the transcription", read: 60000, of: 212000 },
        { what: "the paste", read: 60000, of: 80000 },
      ]),
      [
        "Read 60,000 of 212,000 characters of the transcription.",
        "Read 60,000 of 80,000 characters of the paste.",
      ],
    );
  });

  test("both doors read the same sentences from the result, and the ledger keeps them", () => {
    // Rewritten for slice 18a (the face approved 2026-10-06): the two old
    // receipt strings retired into one receipt component both doors paint
    // (src/app/room/ingest/receipt.tsx), which reads the sentences from the
    // row each door fills from the result. tests/ingest-faces.test.ts
    // renders it.
    const chute = read("src/app/room/chute.tsx");
    const client = read("src/app/room/room-client.tsx");
    const receipt = read("src/app/room/ingest/receipt.tsx");
    assert.ok(receipt.includes("filingSentences(r)"));
    for (const [name, face] of [["the Chute", chute], ["the Drop", client]] as const) {
      assert.match(face, /import \{ ReceiptLine \} from "\.\/ingest\/receipt";/, name);
      assert.ok(face.includes("<ReceiptLine"), `${name} paints the one receipt`);
      for (const key of ["filingId: r.filingId", "windows: r.windows", "dupeCheck: r.dupeCheck"])
        assert.ok(face.includes(key), `${name}: ${key}`);
    }
    const ledger = read("src/app/room/chute-ledger.ts");
    for (const key of ["filingId: x.filingId", "windows: x.windows", "dupeCheck: x.dupeCheck"])
      assert.ok(ledger.includes(key), key);
    // The windows a reader cut ride the row to the pick's re-run on the
    // Chute (the held box's one pick, which replaced the batch-mate button
    // and the select), and the held question on the Drop.
    assert.equal((chute.match(/\bit\.windows,\n/g) ?? []).length, 1);
    assert.ok(client.includes("filePaste(mismatch.text, true, mismatch.files, mismatch.windows, to)"));
    assert.ok(client.includes("filePaste(read.text, false, waiting, read.windows)"));
  });
});

// ── what a filing wrote, by its id (pass 8 call 9, C1) ─────────────────────
describe("the receipt's read takes every namespace the filing wrote to, by its id", () => {
  type NoteRow = { body: string; createdAt: Date; accountId: string; filingId: string };
  const at = new Date("2026-10-06T15:00:00Z");
  const notes: NoteRow[] = [
    { body: "✉ OL 10/6 9:00 AM — Re: renewal · Lesha Cyphers", createdAt: at, accountId: "A1", filingId: "f1" },
    { body: "? Which countries are first?", createdAt: at, accountId: gapNs("A1"), filingId: "f1" },
    { body: playbookBody("market", "Remote asks for a deposit up front.", { a: "A1", n: "Acme", w: "Lesha" }), createdAt: at, accountId: PLAYBOOK_MARKET, filingId: "f1" },
    { body: playbookBody("lesson", "Security review slowed the close.", { a: "A1", n: "Acme", w: "" }), createdAt: at, accountId: PLAYBOOK_LESSONS, filingId: "f1" },
    // A playbook line under the same filing id that names another account:
    // the playbook is one namespace, so only the tail admits a line.
    { body: playbookBody("lesson", "Someone else's lesson entirely.", { a: "B2", n: "Other", w: "" }), createdAt: at, accountId: PLAYBOOK_LESSONS, filingId: "f1" },
    // Another account's rows and another filing's rows never come back.
    { body: "✉ OL 10/6 — Not ours · Someone", createdAt: at, accountId: "B2", filingId: "f1" },
    { body: "? Another filing's ask?", createdAt: at, accountId: gapNs("A1"), filingId: "f9" },
  ];
  const asked: { notes?: unknown; todos?: unknown } = {};
  const client: WroteClient = {
    accountNote: {
      findMany: async (args) => {
        asked.notes = args.where;
        return notes
          .filter((n) => n.filingId === args.where.filingId && args.where.accountId.in.includes(n.accountId))
          .map(({ body, createdAt, accountId }) => ({ body, createdAt, accountId }));
      },
    },
    todo: {
      findMany: async (args) => {
        asked.todos = args.where;
        return args.where.filingId === "f1" && args.where.accountId === "A1"
          ? [{ body: "Send the census.\n⚑[k:a]" }, { body: "Send the plan.\n⚑[o:them,b:Lesha Cyphers]" }]
          : [];
      },
    },
  };

  test("the entries, the to-dos, their promises, the asks and the playbook lines", async () => {
    const wrote = await wroteOfFiling("A1", "f1", client);
    assert.deepEqual(wrote, {
      filed: ["Re: renewal · Lesha Cyphers · 10/6"],
      todos: ["Send the census."],
      promises: ["Lesha Cyphers · Send the plan."],
      asks: ["Which countries are first?"],
      learned: ["Remote asks for a deposit up front.", "Security review slowed the close."],
    });
    assert.deepEqual(asked.notes, {
      filingId: "f1",
      accountId: { in: ["A1", gapNs("A1"), PLAYBOOK_MARKET, PLAYBOOK_LESSONS] },
    });
    assert.deepEqual(asked.todos, { filingId: "f1", accountId: "A1" });
  });

  test("the server door reads through it, so the asks and the playbook lines open", () => {
    const door = read("src/app/room/filing-actions.ts");
    assert.ok(door.includes("return await wroteOfFiling(acct.id, id);"));
    assert.ok(!door.includes("prisma.accountNote.findMany"), "no narrow read of the account's own id");
  });
});

// ── the duplicate guard's claim (pass 8, the duplicate race) ───────────────
describe("two filings of one capture in flight cannot both pass the duplicate check", () => {
  type Row = { status: string; reason: string };
  /** The disposition table as its unique key behaves: a second create on a
   *  key throws Prisma's P2002, and every call yields to the event loop so
   *  two claims interleave the way two requests do. */
  const table = () => {
    const rows = new Map<string, Row>();
    const tick = () => new Promise<void>((r) => setImmediate(r));
    const client: ClaimClient = {
      accountDisposition: {
        create: async ({ data }) => {
          await tick();
          if (rows.has(data.accountId)) throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
          rows.set(data.accountId, { status: data.status, reason: data.reason });
          return data;
        },
        findUnique: async ({ where }) => {
          await tick();
          return rows.get(where.accountId) ?? null;
        },
        updateMany: async ({ where, data }) => {
          await tick();
          const r = rows.get(where.accountId);
          if (!r || r.status !== where.status || r.reason !== where.reason) return { count: 0 };
          r.reason = data.reason;
          return { count: 1 };
        },
        deleteMany: async ({ where }) => {
          await tick();
          const r = rows.get(where.accountId);
          if (!r || r.status !== where.status || r.reason !== where.reason) return { count: 0 };
          rows.delete(where.accountId);
          return { count: 1 };
        },
      },
    };
    return { rows, client };
  };
  const KEY = "pastehash:A1:abc123";
  const NOW = new Date("2026-10-07T15:00:00Z");

  test("of two at once, one holds the capture and the other is refused as in flight", async () => {
    const { rows, client } = table();
    const [a, b] = await Promise.all([claimCapture(KEY, NOW, client), claimCapture(KEY, NOW, client)]);
    const kinds = [a.kind, b.kind].sort();
    assert.deepEqual(kinds, ["claimed", "inflight"]);
    assert.equal(rows.get(KEY)?.status, CLAIM_STATUS);
  });

  test("a landed filing is on file; a ✕-parked one keeps its marker and stays on file (D7)", async () => {
    const { rows, client } = table();
    const first = await claimCapture(KEY, NOW, client);
    assert.equal(first.kind, "claimed");
    // roomPaste's stampPasteMark turns the claim into the filed marker.
    rows.set(KEY, { status: "filed", reason: "2026-10-03T14:00:00.000Z·n1" });
    if (first.kind === "claimed") await releaseCapture(KEY, first.token, client);
    assert.equal(rows.get(KEY)?.status, "filed", "the release leaves a filed marker alone");
    const again = await claimCapture(KEY, NOW, client);
    assert.deepEqual(again, { kind: "filed", reason: "2026-10-03T14:00:00.000Z·n1" });
  });

  test("a filing that files nothing lets the capture go, and only its own claim", async () => {
    const { rows, client } = table();
    const first = await claimCapture(KEY, NOW, client);
    assert.equal(first.kind, "claimed");
    if (first.kind !== "claimed") return;
    await releaseCapture(KEY, "someone-else's-token", client);
    assert.ok(rows.has(KEY), "another token releases nothing");
    await releaseCapture(KEY, first.token, client);
    assert.ok(!rows.has(KEY));
    assert.equal((await claimCapture(KEY, NOW, client)).kind, "claimed", "the re-drop files");
  });

  test("a claim left by a filing that died is taken over once it is stale", async () => {
    const { rows, client } = table();
    const dead = new Date(NOW.getTime() - CLAIM_STALE_MS - 1000);
    rows.set(KEY, { status: CLAIM_STATUS, reason: `${dead.toISOString()}·claim:dead` });
    const [a, b] = await Promise.all([claimCapture(KEY, NOW, client), claimCapture(KEY, NOW, client)]);
    assert.deepEqual([a.kind, b.kind].sort(), ["claimed", "inflight"], "one takes it over, never both");
    const fresh = new Date(NOW.getTime() - 60_000);
    rows.set(KEY, { status: CLAIM_STATUS, reason: `${fresh.toISOString()}·claim:live` });
    assert.equal((await claimCapture(KEY, NOW, client)).kind, "inflight");
  });

  test("a store that errors fails open, and the filing says so (D7)", async () => {
    const broken: ClaimClient = {
      accountDisposition: {
        create: async () => {
          throw new Error("connection reset");
        },
        findUnique: async () => null,
        updateMany: async () => ({ count: 0 }),
        deleteMany: async () => ({ count: 0 }),
      },
    };
    assert.deepEqual(await claimCapture(KEY, NOW, broken), { kind: "skipped" });
  });

  test("roomPaste claims before any read, refuses a twin, and always lets an unfiled claim go", () => {
    assert.match(roomPaste, /const claim = await claimCapture\(pasteKey, new Date\(\)\);/);
    assert.match(roomPaste, /if \(claim\.kind === "inflight"\)\s*return \{ ok: false, filed: 0, how: "", duplicate: true, reason: ALREADY_FILING \};/);
    assert.match(roomPaste, /\} finally \{[\s\S]*?if \(claim\.kind === "claimed"\) await releaseCapture\(pasteKey, claim\.token\);/);
    assert.ok(roomPaste.indexOf("claimCapture(") < roomPaste.indexOf("aiCleanTimeline("), "the claim precedes the read");
    assert.match(roomPaste, /const dupeCheck: DupeCheck = claim\.kind === "skipped" \? "skipped" : "ran";/);
  });
});
