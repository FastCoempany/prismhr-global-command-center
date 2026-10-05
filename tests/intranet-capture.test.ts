// The Intranet's capture through the pipeline, and the extractor takes the
// read (the Chute brains refactor plan, slice 16). The Intranet's capture is
// a door too (ruled 2026-09-25, P2 — CLAUDE.md, The Chute): what names an
// account files through the pipeline, routed, guarded and picked like the
// Chute's; what names none stays an Intranet doc and is never inbound. The
// sweep's extractor takes the Filing row's read for a mirrored row that has
// one and pays for a model read only for documents with none (the dead-code
// ledger's G6 ruling).
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
import { routeText } from "../src/lib/ingest/route";
import { sanitizeAiResult } from "../src/lib/intel/ai-clean";
import {
  captureVerdict,
  filedLine,
  keptLikeLine,
  keptUnnamedLine,
  readsLike,
} from "../src/lib/intranet/capture-door";
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
import type { RouteAccount } from "../src/lib/route-capture";
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

// ── the fixtures, as the guard suite holds them ─────────────────────────────
const SIMPLOY = { id: "001F000000w38BOIAY", name: "Simploy" };
const REGIS = { id: "001F000000w38OHIAY", name: "Regis HR Group" };

const roster: RouteAccount[] = [
  {
    id: SIMPLOY.id,
    name: SIMPLOY.name,
    emails: ["csmith@simploy.com"],
    domains: ["simploy.com"],
    people: ["chassie smith"],
  },
  {
    id: REGIS.id,
    name: REGIS.name,
    emails: ["kmiller@regishrgroup.com"],
    domains: ["regishrgroup.com"],
    people: ["kevin miller"],
  },
];

const NAMED = [
  "OUTLOOK THREAD — EOR for a client in Brazil",
  "From: csmith@simploy.com",
  "To: Antaeus Coe",
  "We have a client with twelve people in Brazil and want them on an employer of record by January.",
].join("\n");
const BLAND = [
  "A note about nothing in particular, long enough to keep.",
  "Nobody is named here and no company is either.",
].join("\n");
const TIED = [
  "From: ops@simploy.com",
  "To: team@regishrgroup.com",
  "Thread about the handover between the two of us.",
].join("\n");

const canon = (line: string, label: string) => {
  assert.ok(!/[—()]/.test(line), `${label}: an aside or parenthetical — "${line}"`);
  assert.ok(!/\d/.test(line), `${label}: a figure — "${line}"`);
  assert.match(line, /\.$/, `${label}: not a sentence — "${line}"`);
  assert.ok(
    !/\b(may|might|consider|worth|appears to)\b/i.test(line),
    `${label}: a hedge — "${line}"`,
  );
};

// ── the door's verdict and its words ────────────────────────────────────────

describe("the capture door: file when the route is sure, keep when it is not (P2)", () => {
  test("a capture naming a known address routes to its account and files", async () => {
    const route = await routeText(NAMED, roster);
    assert.equal(route.best?.id, SIMPLOY.id, route.candidates.map((c) => c.why).join(" | "));
    assert.equal(route.best?.rung, "email");
    const v = captureVerdict(route);
    assert.ok(v.file, "a sure route files");
    assert.deepEqual(v.account, SIMPLOY);
  });

  test("a capture naming nothing is kept, and the line says so", async () => {
    const route = await routeText(BLAND, roster);
    assert.equal(route.best, null);
    assert.deepEqual(route.candidates, []);
    const v = captureVerdict(route);
    assert.ok(!v.file);
    assert.equal(v.line, "Kept in the brain. Nothing names an account.");
    assert.equal(v.line, keptUnnamedLine());
    canon(v.line, "the unnamed line");
  });

  test("an unsure route is kept and names what it reads like, two names at most", async () => {
    const route = await routeText(TIED, roster);
    assert.equal(route.best, null, "two domains at the same score never auto-route");
    assert.deepEqual(readsLike(route), [REGIS.name, SIMPLOY.name]);
    const v = captureVerdict(route);
    assert.ok(!v.file);
    assert.equal(
      v.line,
      "Kept in the brain. It reads like Regis HR Group or Simploy. File it from the Chute.",
    );
    canon(v.line, "the tied line");
  });

  test("a disputed capture's receipt names the claim and points at the Chute", () => {
    const line = keptLikeLine([SIMPLOY.name]);
    assert.equal(line, "Kept in the brain. It reads like Simploy. File it from the Chute.");
    canon(line, "the dispute line");
    assert.equal(keptLikeLine([]), keptUnnamedLine(), "no claim reads as nothing named");
    assert.equal(keptLikeLine(["", "  "]), keptUnnamedLine());
  });

  test("the filed line carries the account's name and says when the reader was down", () => {
    assert.equal(filedLine(SIMPLOY.name), "Filed to Simploy.");
    assert.equal(
      filedLine(SIMPLOY.name, true),
      "Filed to Simploy. The reader was down, so only the text filed.",
    );
    canon(filedLine(SIMPLOY.name), "the filed line");
    canon(filedLine(SIMPLOY.name, true), "the degraded filed line");
  });

  test("intranet is a door the writer accepts", () => {
    assert.ok(isDoor("intranet"));
  });
});

// ── the door's wiring, read from its module ─────────────────────────────────

describe("the Send-it box's action routes on the server and files through the pipeline", () => {
  const capture = slice(door, "export async function intranetCapture(", "\n}\n");

  test("it is a server module and routes with the lib, never the roster in the browser (D12)", () => {
    assert.match(door, /^"use server";/);
    assert.match(door, /import \{ routeText \} from "@\/lib\/ingest\/route";/);
    assert.ok(!/route-actions/.test(door), "the server never calls its own action");
    assert.ok(!/book\/roster|routingRoster\(/.test(door), "the door builds no roster of its own");
    assert.ok(!/roster/.test(client), "the roster never reaches the Intranet's client");
    assert.ok(!/ingest\/route|routeCapture\(/.test(client), "the client never routes");
  });

  test("a sure route files through roomPaste with the intranet door (D1, P3)", () => {
    assert.match(door, /import \{ roomPaste \} from "@\/app\/room\/actions";/);
    assert.match(capture, /const verdict = captureVerdict\(await routeText\(text\)\);/);
    assert.match(
      capture,
      /await roomPaste\(verdict\.account\.id, text, \{ door: "intranet" \}\)/,
    );
    assert.ok(!/createAccountNoteRow|accountNote\.create/.test(door), "the pipeline writes the note, never the door");
  });

  test("a filed capture never becomes an Intranet doc; a kept one never becomes a note (P2)", () => {
    const filed = capture.indexOf("receipt: filedLine(verdict.account.name, r.readFailed)");
    const doc = capture.indexOf("prisma.intranetDoc.create(");
    assert.ok(filed > 0 && doc > filed, "the filed return comes before any Intranet doc write");
    // The filed reply carries no capture id: nothing of it waits in the brain.
    const filedReply = capture.slice(filed, capture.indexOf("};", filed));
    assert.match(filedReply, /captureId: ""/);
    assert.match(filedReply, /space: verdict\.account\.name/);
    // The kept path is the brain's own road, and it is the only road with a doc write.
    assert.equal((capture.match(/intranetDoc\.create\(/g) ?? []).length, 1);
  });

  test("a dispute at either rung keeps the capture, with the claim in the receipt", () => {
    const dispute = capture.indexOf("kept = keptLikeLine([r.mismatch.claim]);");
    const doc = capture.indexOf("prisma.intranetDoc.create(");
    assert.ok(dispute > 0 && doc > dispute, "the dispute falls through to the kept road");
    assert.match(capture, /if \(!r\.mismatch\) return refused\(r\.reason \?\? "That didn't land\."\);/);
    assert.match(capture, /receipt: `\$\{kept\} \$\{captureReceipt\(\{/);
  });

  test("a duplicate under the routed account is the pipeline's own receipt, and writes nothing", () => {
    const dup = capture.indexOf("if (r.duplicate)");
    const doc = capture.indexOf("prisma.intranetDoc.create(");
    assert.ok(dup > 0 && doc > dup);
    assert.match(capture.slice(dup, dup + 400), /receipt: r\.reason \?\? "Already on file\. Nothing filed twice\."/);
  });

  test("the ask-and-answer module gave the capture up and still writes only to the brain's tables", () => {
    assert.ok(!answers.includes("export async function intranetCapture"));
    assert.ok(!/intranetDoc\.create|intranetCapture\.create/.test(answers));
    const banned = /from "@\/app\/(room|today|accounts|playbook|dashboard)\/actions"/;
    assert.ok(!banned.test(answers), "actions.ts imports a write action");
    assert.match(client, /import \{ intranetCapture \} from "\.\/capture-actions";/);
  });

  test("the Send-it box shows the line where its receipt renders and reads nothing when nothing waits", () => {
    assert.match(client, /if \(!r\.captureId\) \{/);
    const skip = slice(client, "if (!r.captureId) {", "return;");
    assert.match(skip, /lines: \[r\.receipt\]/);
    assert.match(skip, /router\.refresh\(\)/);
    assert.ok(!/fetch\("\/intranet\/read"/.test(skip), "a filed capture never asks the brain to read it");
    // The two faces the receipt had before are the two it has now.
    assert.match(client, /lines: \[r\.receipt, "Reading what you sent…"\]/);
    assert.match(client, /\{receipt && <p className=\{styles\.itDockErr\}>\{receipt\}<\/p>\}/);
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

const input = (doc: { body: string; origin: string; space: string; occurredAt: string; speakers: string[] }) => ({
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
    assert.equal(entryOf(STORED, archiveDoc.body), null, "a tape's archive matches no entry");
    assert.equal(entryOf(STORED, todoDoc.body), null);
  });

  test("the mirrored todo carries its action, found by its own words", () => {
    assert.equal(actionOf(STORED, todoDoc.body)?.text, ACTION);
    assert.equal(actionOf(STORED, noteDoc.body), null);
  });

  test("the model client is not called for a doc whose note has a read, with or without a key", async () => {
    const { client: c, calls } = stub([]);
    const stored = await withoutKey(() => runRead({ ...input(noteDoc), stored: STORED }, c));
    assert.equal(calls.length, 0, "the stored read reached the model");
    assert.equal(stored.filings.length, 1);
    const withKeyToo = await withKey(() => runRead({ ...input(noteDoc), stored: STORED }, c));
    assert.equal(calls.length, 0);
    assert.deepEqual(withKeyToo, stored);
  });

  test("a doc with no read still goes to the model, on the roster's slot", async () => {
    const { client: c, calls } = stub([JSON.stringify({ brief: "read it", filings: [] })]);
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
    const fromModel = await withKey(() => runRead({ ...input(noteDoc), stored: null }, model.client));
    assert.equal(model.calls.length, 1);
    const silent = stub([]);
    const fromStored = await runRead({ ...input(noteDoc), stored: STORED }, silent.client);
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
    assert.ok(r.filings[0].statements[0].offsetStart > 0, "the action is located in the mirror");
  });

  test("a doc with a read that holds nothing of it emits nothing and spends nothing", async () => {
    const { client: c, calls } = stub([]);
    const r = await withoutKey(() => runRead({ ...input(archiveDoc), stored: STORED }, c));
    assert.equal(calls.length, 0);
    assert.deepEqual(r, { brief: "", filings: [] });
  });

  test("the stored shape is the sanitizer's own: clamping it again changes nothing", () => {
    const raw = readFromFiling(STORED, { body: noteDoc.body, origin: "account-note", speakers: noteDoc.speakers });
    const once = sanitizeRead(raw, noteDoc.body);
    assert.deepEqual(sanitizeRead(once, noteDoc.body), once);
    assert.equal(raw.brief, "", "nothing is invented: no brief");
    // Every statement is the row's own words: the text is its own quote.
    for (const f of raw.filings) for (const s of f.statements) assert.equal(s.text, s.quote);
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
    assert.match(extract, /const stored = await Promise\.all\(batch\.map\(\(d\) => storedRead\(d\)\)\);/);
    assert.match(extract, /stored: stored\[b\],/);
    assert.match(extract, /speakers: d\.speakers,/);
  });

  test("a note's read comes through readOfNote, a todo's through its filingId (G6: the todo mirror carries the note's read)", () => {
    assert.match(lookup, /if \(doc\.origin === "account-note"\) return readOfNote\(doc\.originRef\);/);
    assert.match(lookup, /if \(doc\.origin === "todo"\)/);
    assert.match(lookup, /todo\.findUnique\(\{ where: \{ id: doc\.originRef \}, select: \{ filingId: true \} \}\)/);
    assert.match(lookup, /return t\?\.filingId \? readOfFiling\(t\.filingId\) : null;/);
    assert.match(lookup, /\}\s*return null;\s*$/, "every other origin reads as no stored read");
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
        async findUnique(args: { where: { id: string } | { accountId_fingerprint: unknown } }) {
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
    assert.equal(await readOfFiling("f1", store), null, "a missing table reads as no read");
  });
});
