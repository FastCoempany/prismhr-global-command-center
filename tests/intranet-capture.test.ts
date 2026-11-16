// The Intranet's capture, and the extractor takes the read (the Chute brains
// refactor plan, slice 16). Intelligence only (founder, 2026-11-16): every
// capture the Intranet takes is kept in the brain as Intranet docs and never
// routed onto an account; this replaces the 2026-09-25 rule (P2) that filed
// a capture naming an account through the pipeline. The sweep's extractor
// takes the Filing row's read for a mirrored row that has one and pays for a
// model read only for documents with none (the dead-code ledger's G6 ruling).
//
// Pinned as behavior where the seam exists — the door's pure half, the
// router over a roster fixture, the extractor over a stubbed model client,
// the Filing module over a stubbed store — and as source where it does not:
// intranetCapture gates on getAppAccess and getPrisma and files through
// roomPaste, which the suite cannot call (tests/ingest-guard.test.ts reads
// roomPaste's own sequencing from its slice for the same reason), so the
// door's wiring is read from its module.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import type Anthropic from "@anthropic-ai/sdk";
import { markClaudeUp } from "../src/lib/claude/health";
import { isDoor } from "../src/lib/ingest/doors";
import { readOfFiling, type FilingClient } from "../src/lib/ingest/filing";
import { sanitizeAiResult } from "../src/lib/intel/ai-clean";
import { keptLine } from "../src/lib/intranet/capture-door";
import { MODEL_EXTRACT } from "../src/lib/intranet/doctrine";
import {
  STORED_READ_TOPIC,
  actionOf,
  entryOf,
  readFromFiling,
  runRead,
  sanitizeRead,
  type ReadClient,
} from "../src/lib/intranet/extract";
import { OPERATOR, mirrorAccountNote, mirrorTodo } from "../src/lib/intranet/mirror";
import { actionBody } from "../src/lib/room/deliverables";
import { NO_TAGS, withTags } from "../src/lib/today/route-notes";

const root = cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const door = read("src/app/intranet/capture-actions.ts");
const answers = read("src/app/intranet/actions.ts");
const client = read("src/app/intranet/intranet-client.tsx");
const runners = read("src/app/intranet/runners.ts");
const extractSrc = read("src/lib/intranet/extract.ts");

/** The body of one top-level function, from its head to the next marker. */
function slice(src: string, from: string, to: string): string {
  const a = src.indexOf(from);
  const b = src.indexOf(to, a + from.length);
  assert.ok(a >= 0, `missing slice head: ${from}`);
  assert.ok(b > a, `missing slice tail: ${to}`);
  return src.slice(a, b);
}

// The account the extractor fixtures speak about, as the guard suite holds it.
const SIMPLOY = { id: "001F000000w38BOIAY", name: "Simploy" };

const canon = (line: string, label: string) => {
  assert.ok(!/[—()]/.test(line), `${label}: an aside or parenthetical — "${line}"`);
  assert.ok(!/\d/.test(line), `${label}: a figure — "${line}"`);
  assert.match(line, /\.$/, `${label}: not a sentence — "${line}"`);
  assert.ok(
    !/\b(may|might|consider|worth|appears to)\b/i.test(line),
    `${label}: a hedge — "${line}"`,
  );
};

// ── the door's words ────────────────────────────────────────────────────────

describe("the capture door keeps every capture in the brain (founder, 2026-11-16)", () => {
  test("the kept line is plain and carries no account", () => {
    assert.equal(keptLine(), "Kept in the brain.");
    canon(keptLine(), "the kept line");
  });

  test("the routing-era helpers are gone with the rule they served", () => {
    const pure = read("src/lib/intranet/capture-door.ts");
    for (const gone of [
      "captureVerdict",
      "filedLine",
      "heldLine",
      "heldCandidates",
      "keptUnnamedLine",
      "File it from the Chute",
    ])
      assert.ok(!pure.includes(`export function ${gone}`) && !door.includes(gone), gone);
  });

  test("intranet is a door the writer accepts", () => {
    assert.ok(isDoor("intranet"));
  });
});

// ── the door's wiring, read from its module ─────────────────────────────────

describe("the Send-it box's action keeps the capture in the brain and never files it", () => {
  const capture = slice(door, "export async function intranetCapture(", "\n}\n");

  test("it is a server module that neither routes nor files", () => {
    assert.match(door, /^"use server";/);
    assert.ok(!/routeText|captureVerdict|route-actions/.test(door), "the door routes");
    assert.ok(!/roomPaste/.test(door), "the door files through the pipeline");
    assert.ok(!/book\/roster|routingRoster\(/.test(door), "the door builds a roster");
    assert.ok(
      !/createAccountNoteRow|accountNote\.create/.test(door),
      "the door writes a note",
    );
    assert.ok(!/roster/.test(client), "the roster never reaches the Intranet's client");
    assert.ok(!/ingest\/route|routeCapture\(/.test(client), "the client never routes");
  });

  test("every capture becomes an Intranet doc, and its reply carries the capture to read", () => {
    assert.equal((capture.match(/intranetDoc\.create\(/g) ?? []).length, 1);
    assert.ok(!/held:/.test(capture), "the capture holds");
    assert.ok(!/captureId: ""/.test(capture), "a kept capture with nothing to read");
    assert.match(capture, /receipt: `\$\{kept\} \$\{captureReceipt\(\{/);
    assert.match(capture, /const kept = keptLine\(\);/);
  });

  test("a repeat is a no-op that still hands back the capture it matches", () => {
    const seen = capture.indexOf("if (seen) {");
    const create = capture.indexOf("prisma.intranetCapture.create(");
    assert.ok(seen > 0 && create > seen);
    const reply = capture.slice(seen, create);
    assert.match(reply, /receipt: "Already in the brain\. Nothing new to add\."/);
    assert.match(reply, /captureId: seen\.id/);
  });

  test("a text too heavy for one request reaches the keep whole, in pieces, and the page re-reads after the read", () => {
    const piece = slice(door, "export async function intranetKeepPiece(", "\n}\n");
    assert.match(
      piece,
      /if \(!\(await canWrite\(\)\)\) return refused\("Read-only session\."\);/,
    );
    assert.match(piece, /takeTextPiece\(/);
    assert.match(piece, /\(text\) => intranetCapture\(text\)/);
    const chute = read("src/app/room/chute.tsx");
    assert.match(
      chute,
      /carryText\(text, \{ whole: intranetKeep, piece: intranetKeepPiece \}/,
    );
    assert.ok(!/await intranetKeep\(/.test(chute), "a keep skips the carriage");
    const keepRow = slice(chute, "const keepRow = async", "\n  };\n");
    assert.ok(
      keepRow.indexOf('fetch("/intranet/read"') < keepRow.indexOf("router.refresh()"),
      "the page re-reads after the read",
    );
    // A capture bigger than one pass is read to the end, as Send-it's is.
    assert.match(keepRow, /let left = g\?\.ok \? \(g\.pending \?\? 0\) : 0;/);
    assert.match(keepRow, /fetch\("\/intranet\/run",[\s\S]*?sweep: false/);
    assert.match(keepRow, /if \(!c \|\| c\.busy \|\| c\.halt \|\| !c\.ok\) break;/);
    assert.ok(
      keepRow.indexOf('fetch("/intranet/run"') < keepRow.indexOf("router.refresh()"),
      "the page re-reads after the rest is read",
    );
  });

  test("the keep is the capture itself", () => {
    assert.match(
      door,
      /export async function intranetKeep\(raw: string\): Promise<CaptureReply> \{\s*return intranetCapture\(raw\);/,
    );
  });

  test("the ask-and-answer module gave the capture up and still writes only to the brain's tables", () => {
    assert.ok(!answers.includes("export async function intranetCapture"));
    assert.ok(!/intranetDoc\.create|intranetCapture\.create/.test(answers));
    const banned = /from "@\/app\/(room|today|accounts|playbook|dashboard)\/actions"/;
    assert.ok(!banned.test(answers), "actions.ts imports a write action");
    assert.match(client, /import \{ intranetCapture \} from "\.\/capture-actions";/);
  });

  test("the Send-it box reads every capture it sends, and hands nothing to the Chute", () => {
    assert.ok(!/r\.held|handToChute/.test(client));
    assert.ok(!/if \(!r\.captureId\) \{/.test(client));
    assert.match(client, /lines: \[r\.receipt, "Reading what you sent…"\]/);
    assert.match(client, /body: JSON\.stringify\(\{ captureId: r\.captureId \}\)/);
    assert.match(
      client,
      /\{receipt && <p className=\{styles\.itDockErr\}>\{receipt\}<\/p>\}/,
    );
  });
});

// ── the extractor takes the read ────────────────────────────────────────────

// The read the pipeline stored for one Outlook entry: the entry's words, its
// author, the country the lexicon clamped, and the promise it stated.
const ENTRY_BODY =
  "We have a client with twelve people in Brazil and want them on an employer of record by January. I will send their current agreements this week.";
const PROMISE = "I will send their current agreements this week.";
const ACTION = "Send the Brazil model to Chassie.";
const STORED = sanitizeAiResult({
  entries: [
    {
      kind: "email",
      subject: "EOR for a client in Brazil",
      from: "Chassie Smith",
      to: "Antaeus Coe",
      others: 0,
      recipients: ["Antaeus Coe"],
      timeLabel: "9:10 AM",
      dayLabel: "Oct 5",
      dayIso: "2026-10-05",
      body: ENTRY_BODY,
      countries: ["Brazil"],
      products: ["Employer of record"],
      promises: [{ what: PROMISE, by: "them", hearer: "Antaeus Coe", day: "2026-10-09" }],
    },
  ],
  signals: [],
  actions: [{ text: ACTION, owner: "me", due: "2026-10-09", fallback: "" }],
  gaps: [],
  competitorIntel: [],
  lessons: [],
  outcome: { status: "none", phrase: "" },
  accountName: "Simploy",
});

// The note as the pipeline writes it for that entry, and its mirror.
const NOTE_BODY = `✉ OL Oct 5 9:10 AM — EOR for a client in Brazil · Chassie Smith → Antaeus Coe\n${ENTRY_BODY}`;
const noteDoc = mirrorAccountNote(
  {
    id: "n1",
    accountId: SIMPLOY.id,
    body: NOTE_BODY,
    kind: "account",
    lane: "theirs",
    actors: "Chassie Smith → Antaeus Coe",
    source: "outlook",
    createdAt: "2026-10-05T14:10:00Z",
  },
  SIMPLOY.name,
)!;

// The action as the fan-out opens it, and its mirror.
const TODO_BODY = withTags(actionBody(ACTION, "", "from 10/5 paste"), {
  ...NO_TAGS,
  kind: "action",
  date: "2026-10-09",
});
const todoDoc = mirrorTodo(
  {
    id: "t1",
    body: TODO_BODY,
    accountId: SIMPLOY.id,
    done: false,
    remindAt: "2026-10-09T17:00:00Z",
    createdAt: "2026-10-05T14:11:00Z",
    updatedAt: "2026-10-05T14:11:00Z",
  },
  SIMPLOY.name,
)!;

// A tape's archive note: the whole conversation, no entry of its own.
const archiveDoc = mirrorAccountNote(
  {
    id: "n2",
    accountId: SIMPLOY.id,
    body: "☰ Call transcript — tape · 2 voices · full text under the fold\nAntaeus Coe: Hi, Chassie.\nChassie Smith: Good, thanks for making time.",
    kind: "account",
    lane: "mine",
    actors: "",
    source: "transcript",
    createdAt: "2026-10-05T15:00:00Z",
  },
  SIMPLOY.name,
)!;

type Params = Anthropic.MessageCreateParamsNonStreaming;
const message = (text: string) =>
  ({
    id: "m1",
    type: "message",
    role: "assistant",
    model: "stub",
    content: [{ type: "text", text, citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
  }) as unknown as Anthropic.Message;

function stub(replies: string[]): { client: ReadClient; calls: Params[] } {
  const calls: Params[] = [];
  const queue = [...replies];
  return {
    calls,
    client: {
      messages: {
        async create(params) {
          calls.push(params);
          const next = queue.shift();
          if (next === undefined) throw new Error("the stub ran out of replies");
          return message(next);
        },
      },
    },
  };
}

/** Run with the key present and the latch up, then put the env back. */
async function withKey<T>(fn: () => Promise<T>): Promise<T> {
  const prior = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "test-key";
  markClaudeUp();
  try {
    return await fn();
  } finally {
    if (prior === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = prior;
  }
}

async function withoutKey<T>(fn: () => Promise<T>): Promise<T> {
  const prior = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    return await fn();
  } finally {
    if (prior !== undefined) process.env.ANTHROPIC_API_KEY = prior;
  }
}

const input = (doc: {
  body: string;
  origin: string;
  space: string;
  occurredAt: string;
  speakers: string[];
}) => ({
  body: doc.body,
  origin: doc.origin,
  space: doc.space,
  occurredAt: doc.occurredAt,
  accountName: SIMPLOY.name,
  grown: [],
  speakers: doc.speakers,
});

describe("the extractor takes the stored read and calls the model only for documents with none (G6)", () => {
  test("the mirrored note carries its entry, found by its own words", () => {
    const e = entryOf(STORED, noteDoc.body);
    assert.ok(e, "the entry was not found in the mirrored body");
    assert.equal(e.subject, "EOR for a client in Brazil");
    assert.equal(
      entryOf(STORED, archiveDoc.body),
      null,
      "a tape's archive matches no entry",
    );
    assert.equal(entryOf(STORED, todoDoc.body), null);
  });

  test("the mirrored todo carries its action, found by its own words", () => {
    assert.equal(actionOf(STORED, todoDoc.body)?.text, ACTION);
    assert.equal(actionOf(STORED, noteDoc.body), null);
  });

  test("the model client is not called for a doc whose note has a read, with or without a key", async () => {
    const { client: c, calls } = stub([]);
    const stored = await withoutKey(() =>
      runRead({ ...input(noteDoc), stored: STORED }, c),
    );
    assert.equal(calls.length, 0, "the stored read reached the model");
    assert.equal(stored.filings.length, 1);
    const withKeyToo = await withKey(() =>
      runRead({ ...input(noteDoc), stored: STORED }, c),
    );
    assert.equal(calls.length, 0);
    assert.deepEqual(withKeyToo, stored);
  });

  test("a doc with no read still goes to the model, on the roster's slot", async () => {
    const { client: c, calls } = stub([
      JSON.stringify({ brief: "read it", filings: [] }),
    ]);
    const r = await withKey(() => runRead({ ...input(noteDoc), stored: null }, c));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].model, MODEL_EXTRACT);
    assert.equal(r.brief, "read it");
  });

  test("the claims from the stored read equal the claims the model would file for the same statements", async () => {
    // The model's reply for the same document, saying what the filing holds:
    // the entry's words as its author's statement, the country, the promise.
    const modelSaid = JSON.stringify({
      brief: "",
      filings: [
        {
          topic: STORED_READ_TOPIC.topic,
          subtopic: STORED_READ_TOPIC.subtopic,
          statements: [
            {
              text: ENTRY_BODY,
              speaker: "Chassie Smith",
              kind: "fact",
              countries: ["Brazil"],
              quote: ENTRY_BODY,
            },
            {
              text: PROMISE,
              speaker: "Chassie Smith",
              kind: "commitment",
              countries: [],
              quote: PROMISE,
            },
          ],
        },
      ],
    });
    const model = stub([modelSaid]);
    const fromModel = await withKey(() =>
      runRead({ ...input(noteDoc), stored: null }, model.client),
    );
    assert.equal(model.calls.length, 1);
    const silent = stub([]);
    const fromStored = await runRead(
      { ...input(noteDoc), stored: STORED },
      silent.client,
    );
    assert.equal(silent.calls.length, 0);
    assert.deepEqual(fromStored, fromModel);
    // And the parity is not vacuous: both located the quote and carry it.
    const [said, promised] = fromStored.filings[0].statements;
    assert.ok(said.offsetStart > 0 && said.offsetEnd > said.offsetStart);
    assert.ok(promised.offsetStart > said.offsetStart);
    assert.deepEqual(said.countries, ["Brazil"]);
    assert.equal(promised.kind, "commitment");
    assert.equal(promised.speaker, "Chassie Smith", "their promise is theirs");
  });

  test("a mirrored todo files the operator's commitment from the read, and calls no model", async () => {
    const { client: c, calls } = stub([]);
    const r = await withoutKey(() => runRead({ ...input(todoDoc), stored: STORED }, c));
    assert.equal(calls.length, 0);
    assert.equal(r.filings.length, 1);
    assert.deepEqual(
      r.filings[0].statements.map((s) => [s.text, s.speaker, s.kind]),
      [[ACTION, OPERATOR, "commitment"]],
    );
    assert.ok(
      r.filings[0].statements[0].offsetStart > 0,
      "the action is located in the mirror",
    );
  });

  test("a doc with a read that holds nothing of it emits nothing and spends nothing", async () => {
    const { client: c, calls } = stub([]);
    const r = await withoutKey(() =>
      runRead({ ...input(archiveDoc), stored: STORED }, c),
    );
    assert.equal(calls.length, 0);
    assert.deepEqual(r, { brief: "", filings: [] });
  });

  test("the stored shape is the sanitizer's own: clamping it again changes nothing", () => {
    const raw = readFromFiling(STORED, {
      body: noteDoc.body,
      origin: "account-note",
      speakers: noteDoc.speakers,
    });
    const once = sanitizeRead(raw, noteDoc.body);
    assert.deepEqual(sanitizeRead(once, noteDoc.body), once);
    assert.equal(raw.brief, "", "nothing is invented: no brief");
    // Every statement is the row's own words: the text is its own quote.
    for (const f of raw.filings)
      for (const s of f.statements) assert.equal(s.text, s.quote);
  });

  test("the stored read runs before the key is looked at, and the model call reads the handed client", () => {
    const run = slice(extractSrc, "export async function runRead(", "\n}\n");
    const storedAt = run.indexOf("if (input.stored)");
    const gateAt = run.indexOf("if (!extractAvailable())");
    assert.ok(storedAt > 0 && gateAt > storedAt, "the stored read waits behind the key");
    assert.match(run, /const model = client \?\? claudeClient\(/);
    assert.match(run, /await model\.messages\.create\(\{\s*model: MODEL_EXTRACT,/);
  });
});

// ── the runner looks the read up, by the link columns ───────────────────────

describe("the sweep looks up the read by the row's filing link, note and todo alike", () => {
  const extract = slice(runners, "export async function extractPending(", "\n}\n");
  const lookup = slice(runners, "async function storedRead(", "\n}\n");

  test("every document in a batch is asked for its stored read before the reads run", () => {
    assert.match(
      extract,
      /const stored = await Promise\.all\(batch\.map\(\(d\) => storedRead\(d\)\)\);/,
    );
    assert.match(extract, /stored: stored\[b\],/);
    assert.match(extract, /speakers: d\.speakers,/);
  });

  test("a note's read comes through readOfNote, a todo's through its filingId (G6: the todo mirror carries the note's read)", () => {
    assert.match(
      lookup,
      /if \(doc\.origin === "account-note"\) return readOfNote\(doc\.originRef\);/,
    );
    assert.match(lookup, /if \(doc\.origin === "todo"\)/);
    assert.match(
      lookup,
      /todo\.findUnique\(\{ where: \{ id: doc\.originRef \}, select: \{ filingId: true \} \}\)/,
    );
    assert.match(lookup, /return t\?\.filingId \? readOfFiling\(t\.filingId\) : null;/);
    assert.match(
      lookup,
      /\}\s*return null;\s*$/,
      "every other origin reads as no stored read",
    );
  });

  test("the log says when a row was read from its filing, so the second read's absence is visible", () => {
    assert.match(extract, /read\$\{stored\[b\] \? " from its filing" : ""\}/);
  });

  test("readOfFiling reads the filing by id through the same client the Filing module takes", async () => {
    const rows = new Map<string, { id: string; read: unknown }>();
    rows.set("f1", { id: "f1", read: STORED });
    rows.set("f2", { id: "f2", read: null });
    let broken = false;
    const store = {
      filing: {
        async upsert() {
          throw new Error("unused");
        },
        async findUnique(args: {
          where: { id: string } | { accountId_fingerprint: unknown };
        }) {
          if (broken) throw new Error('relation "Filing" does not exist');
          const w = args.where;
          const row = "id" in w ? rows.get(w.id) : undefined;
          return row
            ? {
                ...row,
                accountId: SIMPLOY.id,
                fingerprint: "abc",
                door: "intranet",
                dialect: "OL",
                how: "ai",
                windows: [],
                dupeCheck: "ran",
                createdAt: new Date(),
                filedAt: new Date(),
              }
            : null;
        },
        async deleteMany() {
          return { count: 0 };
        },
      },
      accountNote: {
        async findUnique() {
          return null;
        },
        async deleteMany() {
          return { count: 0 };
        },
      },
      todo: {
        async deleteMany() {
          return { count: 0 };
        },
      },
    } as unknown as FilingClient;
    assert.deepEqual(await readOfFiling("f1", store), STORED);
    assert.equal(await readOfFiling("f2", store), null, "a keyless filing has no read");
    assert.equal(await readOfFiling("nope", store), null);
    broken = true;
    assert.equal(
      await readOfFiling("f1", store),
      null,
      "a missing table reads as no read",
    );
  });
});
