// The Scratchpaper's decree, pinned as behavior (CLAUDE.md "The Scratchpaper",
// :311-327: "✕ is per line and deliberate — and it archives, never destroys
// ... Nothing on the paper ever dies"). Every test calls a function and
// checks what it returns or what it asked a stub client to do; none reads a
// source file.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  SCRATCH_GONE_NS,
  SCRATCH_NS,
  SCRATCH_PAGE,
  editOutcome,
  scratchPage,
  scratchPageArgs,
  strikeLine,
  strikeMove,
  type PageClient,
  type ScratchCursor,
  type StrikeClient,
} from "../../src/lib/scratch";

// ── E8 · "the line moves to scratch:gone ... Nothing on the paper ever dies"
// (:324-327) ───────────────────────────────────────────────────────────────
describe("nothing on the paper ever dies (CLAUDE.md:324-327)", () => {
  test("the cross-out moves the row from the pad to the struck history and changes nothing else", () => {
    const m = strikeMove("line-1");
    assert.deepEqual(m.where, { id: "line-1", accountId: SCRATCH_NS });
    assert.deepEqual(Object.keys(m.data), ["accountId"]);
    assert.equal(m.data.accountId, SCRATCH_GONE_NS);
    assert.notEqual(SCRATCH_NS, SCRATCH_GONE_NS);
  });

  test("the move keeps the body and the timestamp: neither is in the payload", () => {
    const m = strikeMove("line-2") as { data: Record<string, unknown> };
    assert.ok(!("body" in m.data));
    assert.ok(!("createdAt" in m.data));
  });

  test("the struck row stays a namespaced row, out of every account view", () => {
    const m = strikeMove("line-3");
    assert.ok(m.data.accountId.includes(":"));
    assert.ok(m.where.accountId.includes(":"));
  });

  test("against a stub client the ✕ makes one update and no delete", async () => {
    const calls: { op: string; args: unknown }[] = [];
    const rows = [
      {
        id: "line-4",
        accountId: SCRATCH_NS,
        body: "call Dana about the $12,000 quote",
        createdAt: "2026-09-25T14:41:00Z",
      },
    ];
    const client = {
      accountNote: {
        updateMany: async (args: ReturnType<typeof strikeMove>) => {
          calls.push({ op: "updateMany", args });
          let count = 0;
          for (const r of rows)
            if (r.id === args.where.id && r.accountId === args.where.accountId) {
              r.accountId = args.data.accountId;
              count += 1;
            }
          return { count };
        },
        delete: async () => {
          throw new Error("delete is never called on the paper");
        },
        deleteMany: async () => {
          throw new Error("deleteMany is never called on the paper");
        },
      },
    } satisfies StrikeClient & {
      accountNote: { delete: () => Promise<never>; deleteMany: () => Promise<never> };
    };
    const moved = await strikeLine(client, "line-4");
    assert.equal(moved, 1);
    assert.deepEqual(
      calls.map((c) => c.op),
      ["updateMany"],
    );
    // The row is still there, whole, under the struck namespace.
    assert.equal(rows[0].accountId, SCRATCH_GONE_NS);
    assert.equal(rows[0].body, "call Dana about the $12,000 quote");
    assert.equal(rows[0].createdAt, "2026-09-25T14:41:00Z");
  });

  test("a line that is not on the paper moves nothing", async () => {
    const client: StrikeClient = {
      accountNote: { updateMany: async () => ({ count: 0 }) },
    };
    assert.equal(await strikeLine(client, "nope"), 0);
  });
});

// ── D24 · "Click-away keeps an edit; the pad never eats your words" (:329) ──
describe("the in-place edit: Enter keeps, Escape puts it back, click-away keeps (CLAUDE.md:329)", () => {
  const original = "call Dana about the quote";

  test("Enter keeps the draft", () => {
    assert.deepEqual(editOutcome("enter", "call Dana about the Canada quote", original), {
      action: "keep",
      text: "call Dana about the Canada quote",
    });
  });

  test("Escape reverts to the original, whatever the draft held", () => {
    assert.deepEqual(editOutcome("escape", "call Dana about the Canada quote", original), {
      action: "revert",
      text: original,
    });
    assert.deepEqual(editOutcome("escape", "", original), { action: "revert", text: original });
  });

  test("blur keeps the draft: a click-away never eats your words", () => {
    assert.deepEqual(editOutcome("blur", "call Dana about the Canada quote", original), {
      action: "keep",
      text: "call Dana about the Canada quote",
    });
    // The kept words are trimmed, as the pad writes them.
    assert.deepEqual(editOutcome("blur", "  call Dana tomorrow  ", original), {
      action: "keep",
      text: "call Dana tomorrow",
    });
  });

  test("an unchanged draft on any event is a no-op keep", () => {
    for (const event of ["enter", "escape", "blur"] as const) {
      assert.deepEqual(editOutcome(event, original, original), {
        action: "keep",
        text: original,
      });
      assert.deepEqual(editOutcome(event, `  ${original}  `, original), {
        action: "keep",
        text: original,
      });
    }
  });

  test("a blanked draft puts the line back: the paper keeps no empty line", () => {
    assert.deepEqual(editOutcome("enter", "   ", original), { action: "revert", text: original });
    assert.deepEqual(editOutcome("blur", "", original), { action: "revert", text: original });
  });
});

// ── pass 8 X8 · every line stays reachable ─────────────────────────────────
// The pad and its struck history read only their newest 300 lines, so the
// 301st line on the paper was alive in the table and gone from the pad.
// They page now: the pad reads the newest page, an EARLIER fold reads the
// next, and the cursor (moment, then id) never skips or repeats a line kept
// in the same millisecond as another.
describe("nothing on the paper ever dies: every line is one fold away (pass 8 X8)", () => {
  type Row = { id: string; accountId: string; body: string; createdAt: Date };
  // A stub that reads the page's one query the way the database does.
  const stub = (rows: Row[]): PageClient => ({
    accountNote: {
      findMany: async (args: ReturnType<typeof scratchPageArgs>) => {
        const w = args.where as {
          accountId: string;
          OR?: [{ createdAt: { lt: Date } }, { createdAt: Date; id: { lt: string } }];
        };
        const keep = rows.filter((r) => {
          if (r.accountId !== w.accountId) return false;
          if (!w.OR) return true;
          const [older, tie] = w.OR;
          return (
            r.createdAt < older.createdAt.lt ||
            (r.createdAt.getTime() === tie.createdAt.getTime() && r.id < tie.id.lt)
          );
        });
        keep.sort(
          (a, b) =>
            b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1),
        );
        return keep
          .slice(0, args.take)
          .map((r) => ({ id: r.id, body: r.body, createdAt: r.createdAt }));
      },
    },
  });
  // 650 lines; every fifth shares its millisecond with the one before it.
  const rows: Row[] = [];
  for (let i = 0; i < 650; i++)
    rows.push({
      id: `line-${String(i).padStart(4, "0")}`,
      accountId: SCRATCH_NS,
      body: `line ${i}`,
      createdAt: new Date(Date.UTC(2026, 0, 1) + (i - (i % 5 === 0 ? 1 : 0)) * 60_000),
    });
  rows.push({
    id: "struck-1",
    accountId: SCRATCH_GONE_NS,
    body: "crossed out",
    createdAt: new Date(Date.UTC(2026, 0, 2)),
  });

  test("the first page is the newest page, and it says more lines wait", async () => {
    const page = await scratchPage(stub(rows), SCRATCH_NS, null);
    assert.equal(page.lines.length, SCRATCH_PAGE);
    assert.equal(page.more, true);
    assert.equal(page.lines[0].body, "line 649");
  });

  test("paging reaches every line on the paper exactly once, newest first", async () => {
    const client = stub(rows);
    const seen: string[] = [];
    let before: ScratchCursor | null = null;
    for (let guard = 0; guard < 10; guard++) {
      const page = await scratchPage(client, SCRATCH_NS, before);
      seen.push(...page.lines.map((l) => l.id));
      if (!page.more) break;
      const last = page.lines[page.lines.length - 1];
      before = { at: last.at, id: last.id };
    }
    assert.equal(seen.length, 650);
    assert.equal(new Set(seen).size, 650);
    const want = rows
      .filter((r) => r.accountId === SCRATCH_NS)
      .sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1),
      )
      .map((r) => r.id);
    assert.deepEqual(seen, want);
  });

  test("the struck history pages from its own namespace", async () => {
    const page = await scratchPage(stub(rows), SCRATCH_GONE_NS, null);
    assert.deepEqual(
      page.lines.map((l) => l.body),
      ["crossed out"],
    );
    assert.equal(page.more, false);
  });
});
