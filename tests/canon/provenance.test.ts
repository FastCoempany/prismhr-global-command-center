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
    const chute = read("src/app/room/chute.tsx");
    assert.match(chute, /roomPaste\([^)]*door:\s*"chute"/);
    const actions = read("src/app/room/actions.ts");
    assert.match(actions, /const door: Door = opts\?\.door \?\? "drop";/);
    // The fan-out is its own module since slice 6 (src/lib/ingest/fanout.ts).
    const fanoutSrc = read("src/lib/ingest/fanout.ts");
    const absorb = fanoutSrc.slice(fanoutSrc.indexOf("export async function absorbRead("));
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
    // run.ts is the second record's writer, exempt until slice 17 routes it.
    const allowed = new Set(["src/lib/notes/write.ts", "src/lib/activity/run.ts"]);
    const bareNotes = SRC.filter(
      (f) =>
        !allowed.has(rel(f)) &&
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

// ── The Spring (:377-378): the Todo writer's codec reads back unchanged ───
describe("createTodoRow writes the sheet's codec", () => {
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
    assert.equal(writes[0].remindAt?.toISOString(), "2026-07-30T12:00:00.000Z");
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
