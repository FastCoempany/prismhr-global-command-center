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
  editOutcome,
  strikeLine,
  strikeMove,
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
