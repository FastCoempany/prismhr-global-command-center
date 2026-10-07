// Provenance is columns (CLAUDE.md, The Ted doctrine :405 — ruled 2026-09-25,
// P3/P4), pinned as behavior and as construction. P3 says every note carries
// its door in its own column beside source; the construction half is that
// every writer in src names one and the only create of an AccountNote is the
// writer's. The money doctrine (:582-583) holds for a JSON body too: string
// values redact, numeric fields never do (§7 item 8 of the plan). The Spring's
// "tags survive verbatim" (:377-378) holds for the Todo writer: the codec it
// writes is the one the sheet reads back, unchanged.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { cwd } from "node:process";
import { DOORS, isDoor, type Door } from "../../src/lib/ingest/doors";
import {
  createAccountNoteRow,
  createTodoRow,
  redactStructured,
  type AccountNoteData,
  type TodoData,
} from "../../src/lib/notes/write";
import { redactMoney } from "../../src/lib/intel/lexicon";
import { urgencyForDue } from "../../src/lib/room/deliverables";
import {
  NO_TAGS,
  splitMarker,
  splitTags,
  withMarker,
  withTags,
} from "../../src/lib/today/route-notes";
import {
  foldSecondRecords,
  foldStageRows,
  secondRecordFor,
} from "../../src/lib/activity/read";
import {
  replaceSecondRecordNote,
  slicePeople,
  type SecondRecordClient,
} from "../../src/lib/activity/run";
import {
  ACTIVITY_NS,
  GEMS_NS,
  INTENT_NS,
  MANIFEST_ID,
  STAGE_NS,
  emptyRunState,
  parseIntentBody,
  parseManifestBody,
  parseStageBody,
  renderGemsBody,
  renderIntentBody,
  renderManifestBody,
  renderRollupBody,
  renderStageBody,
  type Gem,
} from "../../src/lib/activity/stores";
import type { Rollup } from "../../src/lib/activity/rollup";
import type { AccountSlice, DropManifest, StagedRow } from "../../src/lib/activity/types";
import { ALIASES } from "../../src/lib/book/merge";

const root = cwd();
const rel = (p: string) => relative(root, p).split("\\").join("/");

// Every .ts/.tsx under src. The generated client is left out: its doc comments
// show `prisma.accountNote.create` as an example, and it is not ours.
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== "generated") sourceFiles(p, out);
    } else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}
const SRC = sourceFiles(join(root, "src"));
const read = (p: string) => readFileSync(join(root, p), "utf8");

// The text inside one call's parentheses, from the open paren to its match.
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

const noteStub = () => {
  const writes: AccountNoteData[] = [];
  return {
    writes,
    client: {
      accountNote: {
        create: async ({ data }: { data: AccountNoteData }) => {
          writes.push(data);
          return { id: `n${writes.length}` };
        },
      },
    },
  };
};

const todoStub = (top: number | null = 4) => {
  const writes: TodoData[] = [];
  return {
    writes,
    client: {
      todo: {
        create: async ({ data }: { data: TodoData }) => {
          writes.push(data);
          return { id: `t${writes.length}` };
        },
        findFirst: async () => (top === null ? null : { position: top }),
      },
    },
  };
};

// ── P3 · the construction: every writer names its door ────────────────────
describe("every note carries its door in its own column (CLAUDE.md:405, P3)", () => {
  test("every createAccountNoteRow call in src passes a door from DOORS", () => {
    const calls: { at: string; door: string }[] = [];
    for (const f of SRC) {
      if (rel(f) === "src/lib/notes/write.ts") continue;
      const src = readFileSync(f, "utf8");
      const re = /\bcreateAccountNoteRow\s*\(/g;
      for (let m = re.exec(src); m; m = re.exec(src)) {
        const at = `${rel(f)}:${src.slice(0, m.index).split("\n").length}`;
        const args = callArgs(src, m.index + m[0].length - 1);
        assert.ok(args.trim().startsWith("{"), `${at}: the writer takes an object`);
        // `door: "hand"`, `door: opts.door`, or the shorthand `door,` — a
        // literal is checked against the roster here; an identifier is typed
        // Door, which the compiler checks.
        const d = /(?:^|[\s,{])door\b\s*(?::\s*([^,\n}]+))?/.exec(args);
        assert.ok(d, `${at}: names no door`);
        const value = (d[1] ?? "door").trim();
        if (value.startsWith('"')) {
          assert.ok(isDoor(JSON.parse(value)), `${at}: ${value} is not a door`);
        } else {
          assert.match(value, /^[\w$]+(\.[\w$]+)*$/, `${at}: ${value} is not a door`);
          assert.ok(/\bdoor$/.test(value), `${at}: ${value} is not a door`);
        }
        calls.push({ at, door: value });
      }
    }
    assert.ok(calls.length >= 20, `only ${calls.length} writer calls found`);
    const literal = new Set(calls.map((c) => c.door).filter((d) => d.startsWith('"')));
    assert.ok(literal.has('"hand"'), "the operator's own hand files as hand");
    assert.ok(literal.has('"act-lane"'), "the Act Lane files as act-lane");
  });

  test("the Chute files as chute; the row's paste is the drop; the fan-out carries the filing's door", () => {
    // The doors file through the shared hook since slice 8: the Chute mounts
    // it as "chute", the row's Drop as "drop", and the hook's one roomPaste
    // call stamps the door it was mounted with.
    const chute = read("src/app/room/chute.tsx");
    assert.match(chute, /useIngest\(\{\s*door:\s*"chute"/);
    const client = read("src/app/room/room-client.tsx");
    assert.match(client, /useIngest\(\{\s*door:\s*"drop"/);
    const door = read("src/app/room/ingest/use-ingest.ts");
    assert.match(door, /roomPaste\(\.\.\.filingRequest\(door,/);
    assert.match(door, /\{ force: !!opts\.force, door, windows: opts\.windows \}/);
    const actions = read("src/app/room/actions.ts");
    // The door is a required argument since pass 9 (pass 8 housekeeping):
    // roomPaste no longer defaults a caller that names none to the Drop.
    assert.match(actions, /opts: \{ force\?: boolean; door: Door; windows\?: Window\[\] \},/);
    assert.match(actions, /const door: Door = opts\.door;/);
    assert.ok(!/opts\?\.door/.test(actions), "no caller's door is optional");
    // The fan-out is its own module since slice 6 (src/lib/ingest/fanout.ts).
    const fanoutSrc = read("src/lib/ingest/fanout.ts");
    const absorb = fanoutSrc.slice(
      fanoutSrc.indexOf("export async function absorbRead("),
    );
    const fanout = absorb.slice(0, absorb.indexOf("\n}\n"));
    assert.match(fanout, /door: Door,/, "absorbRead takes the filing's door");
    assert.ok(!/door:\s*"/.test(fanout), "the fan-out never names a door of its own");
    for (const f of ["src/lib/room/gaps.ts", "src/lib/playbook/store.ts"]) {
      const src = read(f);
      assert.match(src, /door: Door;/, `${f} takes the door from its caller`);
      assert.match(src, /door: opts\.door,/, `${f} passes the caller's door on`);
    }
  });

  test("the only create of an AccountNote is the writer's; the only create of a Todo too", () => {
    // The second record's writer (src/lib/activity/run.ts) comes through the
    // one writer since slice 17; nothing is exempt.
    const bareNotes = SRC.filter(
      (f) =>
        rel(f) !== "src/lib/notes/write.ts" &&
        /accountNote\s*\.\s*create\s*\(/.test(readFileSync(f, "utf8")),
    ).map(rel);
    assert.deepEqual(bareNotes, [], "a bare AccountNote row is a defect (P4)");
    const bareTodos = SRC.filter(
      (f) =>
        rel(f) !== "src/lib/notes/write.ts" &&
        /\btodo\s*\.\s*create\s*\(/.test(readFileSync(f, "utf8")),
    ).map(rel);
    assert.deepEqual(bareTodos, [], "the Todo has one writer");
  });

  test("the type refuses a call with no door", () => {
    const { client } = noteStub();
    const refused = async () =>
      // @ts-expect-error door is required by the writer contract (P3)
      createAccountNoteRow({ accountId: "A1", kind: "account", body: "x" }, client);
    assert.equal(typeof refused, "function");
    const named = { door: "chute" } satisfies { door: Door };
    assert.ok(isDoor(named.door));
    assert.deepEqual(
      [...DOORS],
      ["chute", "drop", "act-lane", "intranet", "activity", "seed", "hand"],
    );
    assert.equal(isDoor("supabase"), false);
  });
});

// ── P3 · the behavior: the door rides the provenance tier ─────────────────
describe("the writer sends the door on the provenance tier", () => {
  test("every door the roster names is stored, beside lane, actors, source and recipients", async () => {
    const { client, writes } = noteStub();
    for (const door of DOORS) {
      await createAccountNoteRow(
        { accountId: "A1", kind: "account", body: "Call Dana.", door },
        client,
      );
    }
    assert.deepEqual(
      writes.map((w) => w.door),
      [...DOORS],
    );
    assert.equal(writes[0].lane, "mine");
    assert.equal(writes[0].actors, "");
    assert.equal(writes[0].source, "");
    assert.equal(writes[0].recipients, "");
  });

  test("an unmigrated table degrades tier by tier: recipients, then the door with the provenance, then the stable set", async () => {
    const attempts: AccountNoteData[] = [];
    const client = {
      accountNote: {
        create: async ({ data }: { data: AccountNoteData }) => {
          attempts.push(data);
          if ("recipients" in data) throw new Error("no such column");
          if ("door" in data) throw new Error("no such column");
          return { id: "stable" };
        },
      },
    };
    const r = await createAccountNoteRow(
      { accountId: "A1", kind: "account", body: "$5,000 PEPM they said", door: "drop" },
      client,
    );
    assert.equal(r.id, "stable");
    assert.equal(attempts.length, 3);
    assert.equal(attempts[0].door, "drop");
    assert.ok("recipients" in attempts[0]);
    assert.equal(attempts[1].door, "drop");
    assert.equal(attempts[1].lane, "mine");
    assert.ok(!("recipients" in attempts[1]));
    assert.ok(!("door" in attempts[2]));
    assert.ok(!("lane" in attempts[2]));
    for (const a of attempts) assert.ok(!a.body.includes("5,000"), a.body);
  });
});

// ── P4 meets the money doctrine (:582-583): a JSON body ───────────────────
describe("a structured body redacts its words and keeps its counts", () => {
  test("string values redact, numeric fields never do, and the body stays JSON", async () => {
    const { client, writes } = noteStub();
    const body = JSON.stringify({
      counts: [1, 234],
      seats: 1234,
      quote: "$1,234 a month",
      nested: { fee: "about 5,000 USD", n: 7, ok: true, none: null },
    });
    await createAccountNoteRow(
      { accountId: "activity:x", kind: "mine", body, door: "activity", structured: true },
      client,
    );
    const stored = JSON.parse(writes[0].body);
    assert.deepEqual(stored.counts, [1, 234], "a count inside an array is not a figure");
    assert.equal(stored.seats, 1234);
    assert.equal(stored.nested.n, 7);
    assert.equal(stored.nested.ok, true);
    assert.equal(stored.nested.none, null);
    assert.ok(
      !/\d/.test(stored.quote) && /^\[—\]\s?a month$/.test(stored.quote),
      stored.quote,
    );
    assert.ok(!/5,000|USD/.test(stored.nested.fee), stored.nested.fee);
    // Plain redaction over the same text would have eaten "[1,234]" whole.
    assert.throws(() => JSON.parse(redactMoney(body)));
  });

  test("a figure-free JSON body is stored byte for byte; a body that is not JSON redacts whole", async () => {
    const { client, writes } = noteStub();
    const body = JSON.stringify({
      name: "Intro",
      subject: "Canada — 25 employees",
      body: "Hi\nDana",
    });
    await createAccountNoteRow(
      {
        accountId: "template:mail",
        kind: "account",
        body,
        door: "hand",
        structured: true,
      },
      client,
    );
    assert.equal(writes[0].body, body);
    assert.equal(redactStructured("they quoted $12,000"), "they quoted [—]");
  });

  test("without the flag a JSON body is redacted as text, as every writer was", async () => {
    const { client, writes } = noteStub();
    await createAccountNoteRow(
      { accountId: "A1", kind: "account", body: '{"q":"$500"}', door: "hand" },
      client,
    );
    assert.equal(writes[0].body, '{"q":"[—]"}');
  });
});

// ── P4 · the second record's rows carry provenance like the first's ────────
// (CLAUDE.md, The second record; slice 17 of the Chute brains refactor plan.)

const SHA = "d942e0f2ffffffffd942e0f2ffffffffd942e0f2ffffffffd942e0f2ffffffff";

/** One account's staged slice as the export's columns fill it: a human row
 *  with a signature read and two addresses, a machinery row, a support row.
 *  The counts are the ones a money blanker could mistake for figures. */
const stagedSlice = (over: Partial<AccountSlice> = {}): AccountSlice => ({
  id: "001TEST00000000AAA",
  name: "Test Partner",
  meta: {
    primaryContact: "Pat Example",
    primaryContactEmail: "pat@example.com",
    primaryContactTitle: "",
    lastContact: "",
    contactedDate: "",
    lastEmailSentKey: "",
    lastEmailReceivedKey: "",
    gbc: "",
  },
  rows: [
    {
      k: "a1b2c3d4e5f60718",
      d: "2026-08-20",
      s: "Re: the $5,000 PEPM model",
      a: "Antaeus Coe",
      w: "Natalie Borland",
      lane: "human",
      sub: "Email",
      rt: "",
      ct: "",
      fl: "",
      c: "she wrote back",
      n: 1234,
      p: "natalie.borland@example.com;acoe@prismhr.com",
    },
    {
      k: "0f0e0d0c0b0a0908",
      d: "2026-08-19",
      s: "Webinar follow-up",
      a: "Automated Process",
      lane: "machinery",
      sub: "",
      rt: "",
      ct: "",
      fl: "a",
      p: "natalie.borland@example.com",
    },
    {
      k: "1122334455667788",
      d: "2026-08-18",
      s: "Case 00123: W-2 reprint",
      a: "Greg Williams",
      lane: "support",
      sub: "",
      rt: "",
      ct: "",
      fl: "",
    },
  ],
  dropped: 0,
  tally: {
    days: { "2026-08-20": { s: 1200, o: 34, c: 5 } },
    camps: { "$500 gift card webinar": { s: 1200, o: 34, c: 5, lastOpen: "2026-08-20" } },
    receipts: 2,
  },
  laneCounts: { human: 1234, csm: 0, support: 1, intent: 1200, machinery: 1 },
  laneEmails: { human: 1, csm: 0, support: 1, intent: 1200, machinery: 1 },
  rowsSum: SHA,
  tallySum: SHA,
  ...over,
});

/** The replace-forward write's client, stubbed: what it finds under the key,
 *  and every create, update and delete it is asked for. */
const secondRecordStub = (existing: { id: string }[] = []) => {
  const creates: AccountNoteData[] = [];
  const updates: { id: string; data: Partial<AccountNoteData> }[] = [];
  const deletes: string[] = [];
  const client: SecondRecordClient = {
    accountNote: {
      findMany: async () => existing,
      update: async ({ where, data }) => {
        updates.push({ id: where.id, data });
        return {};
      },
      delete: async ({ where }) => {
        deletes.push(where.id);
        return {};
      },
      create: async ({ data }) => {
        creates.push(data);
        return { id: `n${creates.length}` };
      },
    },
  };
  return { client, creates, updates, deletes };
};

describe("a second-record row carries lane, actors, recipients, source and door (P4)", () => {
  test("a fresh key goes through the writer with the activity door and the export's people", async () => {
    const slice = stagedSlice();
    const { client, creates, updates } = secondRecordStub();
    await replaceSecondRecordNote(
      `${STAGE_NS}${slice.id}`,
      renderStageBody(slice, SHA),
      slicePeople(slice),
      client,
    );
    assert.equal(updates.length, 0);
    assert.equal(creates.length, 1);
    const row = creates[0];
    assert.equal(row.accountId, `${STAGE_NS}${slice.id}`);
    assert.equal(row.kind, "mine");
    assert.equal(row.door, "activity");
    assert.equal(row.lane, "background");
    assert.equal(row.source, "activity");
    // The signature first, the Assigned column after, never a mechanism: the
    // machinery row names nobody, and the logger is not the author.
    assert.equal(row.actors, "Natalie Borland, Greg Williams");
    // Every address on a logged email, once, our own side included.
    assert.equal(row.recipients, "natalie.borland@example.com, acoe@prismhr.com");
  });

  test("a key with a row keeps the row and takes the drop's body and columns; strays fold away", async () => {
    const slice = stagedSlice();
    const { client, creates, updates, deletes } = secondRecordStub([
      { id: "kept" },
      { id: "stray" },
    ]);
    await replaceSecondRecordNote(
      `${STAGE_NS}${slice.id}`,
      renderStageBody(slice, SHA),
      slicePeople(slice),
      client,
    );
    assert.equal(creates.length, 0, "the update path never creates");
    assert.deepEqual(deletes, ["stray"]);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].id, "kept");
    const data = updates[0].data;
    assert.equal(data.door, "activity");
    assert.equal(data.lane, "background");
    assert.equal(data.source, "activity");
    assert.equal(data.actors, "Natalie Borland, Greg Williams");
    assert.equal(data.recipients, "natalie.borland@example.com, acoe@prismhr.com");
    // The same bytes either path: the writer's structured redaction.
    assert.equal(data.body, redactStructured(renderStageBody(slice, SHA)));
  });

  test("the manifest carries the door and no account's people", async () => {
    const { client, creates } = secondRecordStub();
    const store = { manifest: manifestOf(), run: emptyRunState(), prior: null };
    await replaceSecondRecordNote(
      MANIFEST_ID,
      renderManifestBody(store),
      undefined,
      client,
    );
    assert.equal(creates[0].door, "activity");
    assert.equal(creates[0].actors, "");
    assert.equal(creates[0].recipients, "");
  });
});

const manifestOf = (over: Partial<DropManifest> = {}): DropManifest => ({
  dropSha: SHA,
  dropDay: "2026-08-20",
  fileName: "report.csv",
  fileBytes: 42,
  rowCount: 6,
  textRows: 3,
  dupes: 1,
  window: { from: "2026-05-23", to: "2026-08-20" },
  laneTotals: { human: 1, csm: 0, support: 1, intent: 2, machinery: 1 },
  receiptRows: 0,
  accounts: [],
  unmatched: [],
  colleagues: [],
  collisions: [],
  headerDiff: { missing: [], extra: [] },
  totalBatches: 101,
  ...over,
});

describe("a second-record body keeps its counts and redacts the words (P4 meets the money doctrine)", () => {
  test("the intent store: the counts stand, the campaign title loses its figure", async () => {
    const { client, creates } = secondRecordStub();
    await replaceSecondRecordNote(
      `${INTENT_NS}X`,
      renderIntentBody({
        dropSha: SHA,
        windows: {
          w7: { s: 0, o: 0, c: 0 },
          w30: { s: 1200, o: 34, c: 5 },
          w60: { s: 1200, o: 34, c: 5 },
          w90: { s: 1200, o: 34, c: 5 },
          lastOpen: "2026-08-20",
          top: [{ campaign: "$500 gift card webinar", o: 34, c: 5, last: "2026-08-20" }],
        },
        receipts: 2,
      }),
      undefined,
      client,
    );
    const back = parseIntentBody(creates[0].body);
    assert.ok(back);
    assert.deepEqual(back.windows.w30, { s: 1200, o: 34, c: 5 });
    assert.equal(back.receipts, 2);
    assert.equal(back.windows.top[0].o, 34);
    assert.ok(!/\$|500/.test(back.windows.top[0].campaign), back.windows.top[0].campaign);
    assert.match(back.windows.top[0].campaign, /gift card webinar/);
  });

  test("the stage store is JSON whole: counts, keys and checksums stand, a subject loses its figure", async () => {
    const slice = stagedSlice();
    const { client, creates } = secondRecordStub();
    await replaceSecondRecordNote(
      `${STAGE_NS}${slice.id}`,
      renderStageBody(slice, SHA),
      slicePeople(slice),
      client,
    );
    const body = creates[0].body;
    assert.ok(
      body.startsWith("{"),
      "the body is JSON, so the writer redacts by string value",
    );
    JSON.parse(body);
    const back = parseStageBody(body);
    assert.ok(back);
    assert.equal(back.dropSha, SHA);
    assert.equal(back.slice.laneCounts.human, 1234);
    assert.equal(back.slice.laneCounts.intent, 1200);
    assert.equal(back.slice.rows[0].n, 1234);
    assert.deepEqual(back.slice.tally.days["2026-08-20"], { s: 1200, o: 34, c: 5 });
    assert.equal(back.slice.rows[0].k, "a1b2c3d4e5f60718");
    assert.equal(back.slice.rowsSum, SHA);
    assert.equal(back.slice.tallySum, SHA);
    assert.ok(!/\d/.test(back.slice.rows[0].s), back.slice.rows[0].s);
    assert.match(back.slice.rows[0].s, /^Re: the \[—\]/);
    // The support subject's case number is not a figure.
    assert.equal(back.slice.rows[2].s, "Case 00123: W-2 reprint");
  });

  test("the manifest store is JSON whole, so a run of batch indexes is never read as a figure", async () => {
    // Text redaction eats "99,100" as a comma-grouped number — the one shape
    // that used to break the manifest's parse past a hundred batches.
    const run = {
      ...emptyRunState(),
      batchesSeen: Array.from({ length: 101 }, (_, i) => i),
    };
    const store = { manifest: manifestOf(), run, prior: null };
    assert.throws(() => JSON.parse(redactMoney(JSON.stringify(store))));
    const { client, creates } = secondRecordStub();
    await replaceSecondRecordNote(
      MANIFEST_ID,
      renderManifestBody(store),
      undefined,
      client,
    );
    const back = parseManifestBody(creates[0].body);
    assert.deepEqual(back, store);
  });

  test("a row staged before the slice still reads: the legacy marked block parses", () => {
    const slice = stagedSlice();
    const legacy = `⌗ STAGE · drop ${SHA.slice(0, 8)} · Test Partner · rows 3 · dropped 0\n⟪act⟫${JSON.stringify({ dropSha: SHA, slice })}⟪/act⟫`;
    assert.deepEqual(parseStageBody(legacy)?.slice, slice);
    const store = { manifest: manifestOf(), run: emptyRunState(), prior: null };
    const legacyManifest = `⌗ MANIFEST · drop x\n⟪act⟫${JSON.stringify(store)}⟪/act⟫`;
    assert.deepEqual(parseManifestBody(legacyManifest), store);
  });
});

// ── E17 · the second record folds by canonical id ──────────────────────────

describe("a drop keyed by a shell id reads under the canonical account (E17)", () => {
  const [SHELL, REAL] = Object.entries(ALIASES)[0];
  const gem = (over: Partial<Gem> = {}): Gem => ({
    dropSha: SHA,
    verdict: "CONFIRMED",
    createdDay: "2026-08-20",
    actedDay: "",
    who: ["Tom Schenck"],
    whoKind: "account",
    term: "TAX SWITCH",
    what: "Tom asked Greg for a call about switching",
    whenDay: "2026-08-19",
    signal: "decision maker moved from silent to asking",
    act: "Ask Greg Williams about Schenck call.",
    reason: "Aug 19 reply wants to discuss switching.",
    cites: [],
    ...over,
  });
  const rollup = (over: Partial<Rollup> = {}): Rollup => ({
    dropSha: SHA,
    dropDay: "2026-08-20",
    window: { from: "2026-05-23", to: "2026-08-20" },
    lanes: { human: 1, csm: 0, support: 0, intent: 0, machinery: 0 },
    emails: { human: 1, csm: 0, support: 0, intent: 0, machinery: 0 },
    intent: { s: 0, o: 0, c: 0 },
    receipts: 0,
    lastHuman: null,
    lastOrgInbound: "",
    lastTheirs: null,
    actors: [],
    threads: [],
    verdict: "",
    ...over,
  });

  test("the fold's keys are canonical ids; the shell's stores read under the account", () => {
    const folded = foldSecondRecords([
      { accountId: `${GEMS_NS}${SHELL}`, body: renderGemsBody([gem()]) },
      { accountId: `${ACTIVITY_NS}${SHELL}`, body: renderRollupBody(rollup()) },
      // The stage slice and the manifest share the prefix and never fold in.
      { accountId: `${STAGE_NS}${SHELL}`, body: "{}" },
      { accountId: MANIFEST_ID, body: "{}" },
    ]);
    assert.deepEqual([...folded.keys()], [REAL]);
    const sr = folded.get(REAL);
    assert.equal(sr?.gems[0].term, "TAX SWITCH");
    assert.equal(sr?.rollup?.dropDay, "2026-08-20");
    // The lookup answers either id with the one record.
    assert.equal(secondRecordFor(folded, SHELL), sr);
    assert.equal(secondRecordFor(folded, REAL), sr);
  });

  test("both ids staged: each namespace from the freshest drop, the account's own key first among equals", () => {
    const folded = foldSecondRecords([
      {
        accountId: `${GEMS_NS}${SHELL}`,
        body: renderGemsBody([gem({ term: "SHELL", createdDay: "2026-08-27" })]),
      },
      { accountId: `${GEMS_NS}${REAL}`, body: renderGemsBody([gem({ term: "REAL" })]) },
      { accountId: `${ACTIVITY_NS}${REAL}`, body: renderRollupBody(rollup()) },
    ]);
    const sr = folded.get(REAL);
    assert.equal(sr?.gems[0].term, "SHELL", "the fresher drop's gems");
    assert.equal(sr?.rollup?.dropDay, "2026-08-20", "the only rollup");
    const tie = foldSecondRecords([
      { accountId: `${GEMS_NS}${SHELL}`, body: renderGemsBody([gem({ term: "SHELL" })]) },
      { accountId: `${GEMS_NS}${REAL}`, body: renderGemsBody([gem({ term: "REAL" })]) },
    ]);
    assert.equal(tie.get(REAL)?.gems[0].term, "REAL");
  });

  test("the staged rows of both slices read as one list, the account's own first, one row per key", () => {
    const row = (k: string, d: string): StagedRow => ({
      k,
      d,
      s: k,
      a: "Greg Williams",
      lane: "human",
      sub: "",
      rt: "",
      ct: "",
      fl: "",
    });
    const shared = row("shared", "2026-08-21");
    const rows = foldStageRows([
      {
        own: false,
        rows: [row("shell-new", "2026-08-27"), { ...shared, s: "the shell's copy" }],
      },
      { own: true, rows: [shared, row("real-old", "2026-08-20")] },
    ]);
    assert.deepEqual(
      rows.map((r) => r.k),
      ["shell-new", "shared", "real-old"],
    );
    assert.equal(rows[1].s, "shared", "the account's own slice supplies the shared row");
    assert.deepEqual(foldStageRows([]), []);
  });
});

// ── The Spring (:377-378): the Todo writer's codec reads back unchanged ───
describe("createTodoRow writes the sheet's codec", () => {
  test("a figure in the body is redacted before the tags ride; the tags are untouched", async () => {
    const { client, writes } = todoStub();
    await createTodoRow(
      {
        body: "Send the $1,200 PEPM model.",
        tags: { kind: "action" },
        due: "2026-07-30",
        now: new Date("2026-07-28T15:00:00Z"),
        accountId: "A1",
      },
      client,
    );
    const body = writes[0]!.body;
    assert.ok(!body.includes("1,200"), body);
    assert.equal(redactMoney(body), body, "the stored body carries no figure");
    const { tags } = splitTags(body);
    assert.equal(tags.date, "2026-07-30");
    assert.equal(tags.kind, "action");
  });

  test("a dated commitment: the wall, its urgency and kind, read back by splitTags unchanged", async () => {
    const now = new Date("2026-07-28T15:00:00Z");
    const { client, writes } = todoStub();
    const r = await createTodoRow(
      {
        body: "Send the model.",
        tags: { kind: "action" },
        due: "2026-07-30",
        now,
        accountId: "A1",
        position: 9,
      },
      client,
    );
    assert.equal(r.id, "t1");
    // What the fan-out assembled by hand before the writer carried it.
    const byHand = withTags("Send the model.", {
      ...NO_TAGS,
      kind: "action",
      urgency: urgencyForDue("2026-07-30", now),
      date: "2026-07-30",
    });
    assert.equal(writes[0].body, byHand);
    assert.equal(writes[0].body, "Send the model.\n⚑[d:2026-07-30,u:high,k:a]");
    const back = splitTags(writes[0].body);
    assert.equal(back.text, "Send the model.");
    assert.deepEqual(back.tags, {
      ...NO_TAGS,
      date: "2026-07-30",
      urgency: "high",
      kind: "action",
    });
    // The first moment of the Chicago day, midnight CDT (pass 8, H11): noon
    // UTC read as 7 AM Chicago, so a commitment due today and filed before
    // then read as scheduled.
    assert.equal(writes[0].remindAt?.toISOString(), "2026-07-30T05:00:00.000Z");
    assert.equal(writes[0].position, 9);
    assert.equal(writes[0].accountId, "A1");
    assert.equal(writes[0].done, false);
  });

  test("an undated commitment: no wall, no urgency, the reminder is the filing moment", async () => {
    const before = Date.now();
    const { client, writes } = todoStub();
    await createTodoRow(
      {
        body: "Call Dana.",
        tags: { kind: "action" },
        due: "",
        accountId: "A1",
        position: 0,
      },
      client,
    );
    assert.equal(writes[0].body, "Call Dana.\n⚑[k:a]");
    const at = writes[0].remindAt?.getTime() ?? 0;
    assert.ok(at >= before && at <= Date.now() + 1000);
  });

  test("the composer's row: the urgency chip rides, the position is one past the top", async () => {
    const { client, writes } = todoStub(4);
    const remindAt = new Date("2026-08-03T12:00:00Z");
    await createTodoRow(
      {
        body: "Chase the SOW.",
        tags: { kind: "action", urgency: "med" },
        accountId: "A1",
        remindAt,
      },
      client,
    );
    assert.equal(writes[0].body, "Chase the SOW.\n⚑[u:med,k:a]");
    assert.equal(writes[0].position, 5);
    assert.equal(writes[0].remindAt, remindAt);
    const empty = todoStub(null);
    await createTodoRow({ body: "x", tags: { kind: "action" } }, empty.client);
    assert.equal(empty.writes[0].position, 0);
    assert.ok(!("accountId" in empty.writes[0]), "no account, no column");
  });

  test("a body with no tags is written as handed over: the mirror's marker row, the Act Lane's fork", async () => {
    const { client, writes } = todoStub();
    const marked = withMarker(
      "✎ Called Dana.",
      { accountNoteIds: ["n1"], partnerNoteIds: [] },
      "Acme",
    );
    await createTodoRow({ body: marked, position: 2 }, client);
    assert.equal(writes[0].body, marked);
    assert.deepEqual(splitMarker(writes[0].body).refs, {
      accountNoteIds: ["n1"],
      partnerNoteIds: [],
    });
    assert.ok(
      !("remindAt" in writes[0]),
      "the mirror's fallback tier writes no reminder",
    );
    assert.ok(!("accountId" in writes[0]));
    await createTodoRow(
      { body: "Send the deck.", accountId: "A1", remindAt: new Date() },
      client,
    );
    assert.equal(writes[1].body, "Send the deck.");
    assert.equal(writes[1].accountId, "A1");
  });
});
