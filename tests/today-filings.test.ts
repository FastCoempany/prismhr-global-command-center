// TODAY always shows what happened today (founder-decreed 2026-10-13). A
// receipt lived only in the tab that filed it, so a reload lost the line and
// its ↺, and nothing else could take the filing back; "Already on file."
// then refused the re-drop with no way out. The row's TODAY now reads the
// account's filings from today out of the record, the duplicate's receipt
// takes back the earlier filing, and a take-back by the filing's id clears
// the duplicate marker by the fingerprint the Filing row keeps.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import {
  todayFilings,
  type TodayFiling,
  type TodayFilingsClient,
} from "../src/lib/ingest/today-filings";
import {
  CLEARED_KEY,
  loadCleared,
  mergeToday,
  saveCleared,
  todayReceipt,
  type TodayEntry,
} from "../src/app/room/ingest/today-receipts";
import { takeBackTarget } from "../src/app/room/ingest/use-undo";
import { pasteKeyOf } from "../src/lib/ingest/filing";
import { gapNs } from "../src/lib/room/gaps";
import { playbookBody } from "../src/lib/playbook/store";
import { roomActionsSource } from "./room-source";

const A = "001A";
const B = "001B";
const NOW = new Date("2026-10-13T20:00:00Z"); // 3 p.m. in Chicago

type Note = { filingId: string | null; accountId: string; body: string };
type Todo = { filingId: string | null; accountId: string | null; body: string };
type Filing = Awaited<ReturnType<TodayFilingsClient["filing"]["findMany"]>>[number];

/** A client over plain arrays, answering the reader's four queries as Prisma
 *  would, the archive filter included. */
function stub(filings: Filing[], notes: Note[], todos: Todo[]): TodayFilingsClient {
  const group = (rows: Note[]) => {
    const out = new Map<
      string,
      { filingId: string | null; accountId: string; n: number }
    >();
    for (const r of rows) {
      const k = `${r.filingId}|${r.accountId}`;
      const g = out.get(k) ?? { filingId: r.filingId, accountId: r.accountId, n: 0 };
      g.n++;
      out.set(k, g);
    }
    return [...out.values()].map((g) => ({
      filingId: g.filingId,
      accountId: g.accountId,
      _count: { _all: g.n },
    }));
  };
  return {
    filing: {
      findMany: async ({ where }) =>
        filings
          .filter(
            (f) =>
              where.accountId.in.includes(f.accountId) &&
              f.createdAt.getTime() >= where.createdAt.gte.getTime(),
          )
          .sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime()),
    },
    accountNote: {
      groupBy: async ({ where }) =>
        group(
          notes.filter(
            (n) =>
              !!n.filingId &&
              where.filingId.in.includes(n.filingId) &&
              !(where.NOT && n.body.startsWith(where.NOT.body.startsWith)),
          ),
        ),
      findMany: async ({ where }) =>
        notes
          .filter(
            (n) =>
              !!n.filingId &&
              where.filingId.in.includes(n.filingId) &&
              where.accountId.in.includes(n.accountId),
          )
          .map((n) => ({ filingId: n.filingId, body: n.body })),
    },
    todo: {
      findMany: async ({ where }) =>
        todos.filter((t) => !!t.filingId && where.filingId.in.includes(t.filingId)),
    },
  };
}

const filing = (over: Partial<Filing>): Filing => ({
  id: "f1",
  accountId: A,
  dialect: "OUT",
  read: { entries: [] },
  windows: [],
  dupeCheck: "ran",
  createdAt: new Date("2026-10-13T15:11:21Z"),
  ...over,
});

describe("today's filings, read from the record", () => {
  test("each filing from today carries the counts its receipt shows", async () => {
    const notes: Note[] = [
      ...Array.from({ length: 3 }, () => ({
        filingId: "f1",
        accountId: A,
        body: "✉ OUT — Re: docs",
      })),
      { filingId: "f1", accountId: gapNs(A), body: "ask one" },
      {
        filingId: "f1",
        accountId: "playbook:lessons",
        body: playbookBody("lesson", "Silence after pricing.", { a: A, n: "A", w: "" }),
      },
      {
        filingId: "f1",
        accountId: "playbook:lessons",
        body: playbookBody("lesson", "Another account's lesson.", {
          a: B,
          n: "B",
          w: "",
        }),
      },
    ];
    const todos: Todo[] = [
      { filingId: "f1", accountId: A, body: "Send the model." },
      { filingId: "f1", accountId: A, body: "Send the forms.\n⚑[o:them,b:Javier]" },
    ];
    const out = await todayFilings([A], NOW, stub([filing({})], notes, todos));
    const [f] = out.get(A) ?? [];
    assert.ok(f);
    assert.deepEqual(
      { ...f, at: undefined },
      {
        filingId: "f1",
        accountId: A,
        at: undefined,
        day: "10/13",
        filed: 3,
        opened: 1,
        promises: 1,
        asks: 1,
        learned: 1,
        degraded: false,
        windows: [],
        dupeCheck: "ran",
      },
    );
  });

  test("only today's Chicago day counts: last night's late filing is yesterday", async () => {
    const out = await todayFilings(
      [A],
      NOW,
      stub(
        [
          filing({ id: "late", createdAt: new Date("2026-10-13T04:30:00Z") }), // 11:30 p.m. 10/12 in Chicago
          filing({ id: "early", createdAt: new Date("2026-10-13T05:30:00Z") }), // 12:30 a.m. 10/13
        ],
        [],
        [],
      ),
    );
    assert.deepEqual(
      (out.get(A) ?? []).map((f) => f.filingId),
      ["early"],
    );
  });

  test("no stored read is the reader down, except on a grab no model reads", async () => {
    const out = await todayFilings(
      [A, B],
      NOW,
      stub(
        [
          filing({ id: "down", read: null }),
          filing({ id: "grab", accountId: B, read: null, dialect: "SN" }),
        ],
        [],
        [],
      ),
    );
    assert.equal(out.get(A)?.[0].degraded, true);
    assert.equal(out.get(B)?.[0].degraded, false);
  });

  test("a call's archive note is not an entry, unless it is all the filing wrote", async () => {
    const out = await todayFilings(
      [A],
      NOW,
      stub(
        [filing({ id: "call" }), filing({ id: "bare" })],
        [
          { filingId: "call", accountId: A, body: "✉ CT — Kickoff" },
          {
            filingId: "call",
            accountId: A,
            body: "☰ Call transcript — 10/13 · 3 voices",
          },
          { filingId: "bare", accountId: A, body: "☰ Call transcript — 10/13" },
        ],
        [],
      ),
    );
    const by = new Map((out.get(A) ?? []).map((f) => [f.filingId, f.filed]));
    assert.equal(by.get("call"), 1);
    assert.equal(by.get("bare"), 1);
  });

  test("the windows it cut ride along, and a malformed one is dropped", async () => {
    const out = await todayFilings(
      [A],
      NOW,
      stub(
        [
          filing({
            windows: [{ what: "the paste", read: 60000, of: 90000 }, { what: 1 }],
          }),
        ],
        [],
        [],
      ),
    );
    assert.deepEqual(out.get(A)?.[0].windows, [
      { what: "the paste", read: 60000, of: 90000 },
    ]);
  });

  test("a store that errors gives nothing, and TODAY keeps the tab's own receipts", async () => {
    const broken = stub([], [], []);
    broken.filing.findMany = async () => {
      throw new Error("db down");
    };
    assert.equal((await todayFilings([A], NOW, broken)).size, 0);
    assert.equal((await todayFilings([], NOW, broken)).size, 0);
  });
});

describe("a row's TODAY merges the record with the tab", () => {
  const ACCT = { id: A, name: "Infiniti HR" };
  const tf = (id: string): TodayFiling => ({
    filingId: id,
    accountId: A,
    at: "2026-10-13T15:11:21.000Z",
    day: "10/13",
    filed: 33,
    opened: 0,
    promises: 0,
    asks: 0,
    learned: 0,
    degraded: true,
    windows: [],
    dupeCheck: "ran",
  });
  const keys = () => {
    let k = 100;
    return () => ++k;
  };

  test("the record's filings arrive as filed receipts, marked as the record's", () => {
    const out = mergeToday([], [tf("f1")], ACCT, { cleared: new Set(), nextKey: keys() });
    assert.equal(out.length, 1);
    assert.deepEqual(out[0].receipt, todayReceipt(tf("f1"), ACCT, 101));
    assert.equal(out[0].receipt?.fromRecord, true);
    assert.equal(out[0].receipt?.state, "filed");
    assert.deepEqual(takeBackTarget(out[0].receipt!), {
      noteIds: undefined,
      todoIds: undefined,
      filingId: "f1",
      grab: undefined,
    });
  });

  test("a filing the tab already shows keeps the tab's receipt", () => {
    const tab: TodayEntry = {
      receipt: {
        key: 1,
        filename: "thread.eml",
        state: "filed",
        account: ACCT,
        filingId: "f1",
      },
    };
    const out = mergeToday([tab], [tf("f1")], ACCT, {
      cleared: new Set(),
      nextKey: keys(),
    });
    assert.equal(out.length, 1);
    assert.equal(out[0].receipt?.filename, "thread.eml");
  });

  test("a record receipt leaves when its filing is gone; the tab's own lines stay", () => {
    const seeded = mergeToday([], [tf("f1"), tf("f2")], ACCT, {
      cleared: new Set(),
      nextKey: keys(),
    });
    const taken: TodayEntry = {
      receipt: { key: 9, filename: "", state: "undone", account: ACCT, filingId: "f0" },
    };
    const note: TodayEntry = { text: "Logged a call." };
    const out = mergeToday([taken, note, ...seeded], [tf("f2")], ACCT, {
      cleared: new Set(),
      nextKey: keys(),
    });
    assert.deepEqual(
      out.map((e) => (e.receipt ? e.receipt.filingId : e.text)),
      ["f0", "Logged a call.", "f2"],
    );
  });

  test("a receipt taken back here stays as its 'Taken back.' line", () => {
    const [seeded] = mergeToday([], [tf("f1")], ACCT, {
      cleared: new Set(),
      nextKey: keys(),
    });
    const undone: TodayEntry = { receipt: { ...seeded.receipt!, state: "undone" } };
    const out = mergeToday([undone], [], ACCT, { cleared: new Set(), nextKey: keys() });
    assert.equal(out.length, 1);
    assert.equal(out[0].receipt?.state, "undone");
  });

  test("a cleared filing never comes back today, and nothing new means the same list", () => {
    const cleared = new Set(["f1"]);
    assert.equal(
      mergeToday([], [tf("f1")], ACCT, { cleared, nextKey: keys() }).length,
      0,
    );
    const seeded = mergeToday([], [tf("f1")], ACCT, {
      cleared: new Set(),
      nextKey: keys(),
    });
    assert.equal(
      mergeToday(seeded, [tf("f1")], ACCT, { cleared, nextKey: keys() }).length,
      0,
    );
    assert.equal(
      mergeToday(seeded, [tf("f1")], ACCT, { cleared: new Set(), nextKey: keys() }),
      seeded,
    );
  });

  test("the cleared list is kept per Chicago day", () => {
    const mem = new Map<string, string>();
    const store = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
    };
    saveCleared(store, "2026-10-13", "f1");
    saveCleared(store, "2026-10-13", "f2");
    assert.deepEqual([...loadCleared(store, "2026-10-13")], ["f1", "f2"]);
    assert.equal(loadCleared(store, "2026-10-14").size, 0, "a new day starts clean");
    saveCleared(store, "2026-10-14", "f3");
    assert.deepEqual(JSON.parse(mem.get(CLEARED_KEY)!), {
      day: "2026-10-14",
      ids: ["f3"],
    });
    mem.set(CLEARED_KEY, "{not json");
    assert.equal(loadCleared(store, "2026-10-14").size, 0);
  });
});

describe("a take-back makes the capture fileable again", () => {
  const src = roomActionsSource(cwd());
  const undo = src.slice(
    src.indexOf("export async function roomPasteUndo("),
    src.indexOf("// --- Closing a deal"),
  );

  test("the marker is cleared by the fingerprint the Filing row keeps", () => {
    assert.match(undo, /select: \{ accountId: true, fingerprint: true \}/);
    assert.match(undo, /f && f\.accountId === acct\.id \? f\.fingerprint : ""/);
    assert.match(
      undo,
      /if \(fingerprint && byFiling\.filing > 0\)\s*await prisma\.accountDisposition\s*\.deleteMany\(\{ where: \{ accountId: pasteKeyOf\(acct\.id, fingerprint\) \} \}\)/,
    );
    // The fingerprint is read before the row goes.
    assert.ok(undo.indexOf("fingerprint: true") < undo.indexOf("await undoFiling("));
  });

  test("the filing and the take-back build the one marker key", () => {
    assert.match(src, /const pasteKey = pasteKeyOf\(acct\.id, fingerprint\);/);
    assert.equal(pasteKeyOf("001A", "abc"), "pastehash:001A:abc");
    assert.equal(pasteKeyOf("001A", "x".repeat(300)).length, 191);
  });

  test("the room page hands every row its filings from today", () => {
    const page = readFileSync(join(cwd(), "src/app/room/page.tsx"), "utf8");
    assert.match(page, /const filedToday = await todayFilings\(/);
    assert.match(page, /r\.todayFilings = filedToday\.get\(r\.accountId\) \?\? \[\]/);
  });
});
