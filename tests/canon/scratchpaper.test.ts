// The Scratchpaper's decree, pinned as behavior (CLAUDE.md "The Scratchpaper",
// :311-327: "✕ is per line and deliberate — and it archives, never destroys
// ... Nothing on the paper ever dies"). Every test calls a function and
// checks what it returns or what it asked a stub client to do; none reads a
// source file.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { createElement } from "react";
// The CSS-module hook registers on this import, before the pad loads.
import { render, textOf } from "../helpers/room-render";
import {
  SCRATCH_GONE_NS,
  SCRATCH_NS,
  SCRATCH_PAGE,
  editOutcome,
  padQuestion,
  restoreLine,
  restoreMove,
  scratchPage,
  scratchPageArgs,
  scratchRow,
  strikeLine,
  strikeMove,
  type PageClient,
  type ScratchCursor,
  type StrikeClient,
} from "../../src/lib/scratch";
import { createAccountNoteRow, type AccountNoteData } from "../../src/lib/notes/write";
import { isRecordRowId, recordRowsWhere } from "../../src/lib/notes/record-rows";
import { isNamespacedAccountId } from "../../src/lib/today/overlay";
import { mirrorAccountNote } from "../../src/lib/intranet/mirror";
import { homeSideFrom } from "../../src/lib/pipeline/build";
import { canonicalAccountId } from "../../src/lib/book/merge";
import { askLinks } from "../../src/lib/ask/links";

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

// ── Pass 10: the Scratchpaper's honor rows, pinned (A7.1, A7.3, A7.8, A7.10,
// A7.14). Each block names its row and the decree it holds.

// ── A7.1 · "The stash floater is retired — component, actions, and lib
// deleted." ────────────────────────────────────────────────────────────────
describe("the stash floater is gone: no component, no actions, no lib, no route (A7.1)", () => {
  const SRC = join(process.cwd(), "src");
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      // The generated Prisma client keeps the StashItem model's types: the
      // table stays because every migration is additive (CLAUDE.md, Other
      // standing decrees). It is a schema, not the floater.
      if (n === "generated") return [];
      return statSync(p).isDirectory() ? [p, ...walk(p)] : [p];
    });
  const all = walk(SRC);

  test("the floater's own modules do not resolve", async () => {
    for (const m of [
      "../../src/components/stash/stash-dock",
      "../../src/app/stash/actions",
      "../../src/lib/stash/data",
      "../../src/lib/stash/summarize",
    ])
      await assert.rejects(import(m), `${m} still resolves`);
  });

  test("no file or folder under src names the stash, and no /stash route exists", () => {
    const named = all.filter((p) => /stash/i.test(relative(SRC, p)));
    assert.deepEqual(named, []);
    assert.equal(
      all.some((p) => /^app[\\/]stash([\\/]|$)/.test(relative(SRC, p))),
      false,
    );
  });

  test("no module imports anything from a stash path", () => {
    const code = all.filter((p) => /\.(tsx?|mjs|js)$/.test(p));
    const importers = code.filter((p) =>
      /from\s+["'][^"']*stash[^"']*["']|import\(\s*["'][^"']*stash/i.test(
        readFileSync(p, "utf8"),
      ),
    );
    assert.deepEqual(importers, []);
  });
});

// ── A7.3 · "A ✎ button bottom-right opens one running pad" ─────────────────
// The root layout mounts the pad once for every page (src/app/layout.tsx);
// next/font cannot load under node:test, so the layout itself is not
// rendered here, and the corner is the stylesheet's (.fab, position fixed).
describe("one ✎ button opens the one pad (A7.3, partial)", () => {
  test("first paint is the ✎ button alone, closed, with no second pad", async () => {
    const { Scratchpad } = await import("../../src/components/scratch/scratchpad");
    const html = await render(createElement(Scratchpad));
    assert.equal((html.match(/<button/g) ?? []).length, 1, html);
    assert.match(
      html,
      /<button type="button" class="fab"[^>]*aria-label="Open the scratchpaper">✎<\/button>/,
    );
    assert.equal(html.includes('role="dialog"'), false, "the pad rests closed");
    assert.equal(textOf(html), "✎");
  });
});

// ── A7.8 · "The pact: it stays there and only there; nothing routes, nothing
// files, nothing becomes an action." ────────────────────────────────────────
describe("the pad routes nowhere (A7.8)", () => {
  const pad = (ns: string, body: string, actors = "") => ({
    id: `${ns}-1`,
    accountId: ns,
    body,
    kind: "mine",
    lane: "mine",
    actors,
    source: "scratch",
    createdAt: "2026-10-08T15:00:00Z",
  });

  test("a kept line is one row under the pad's namespace, by the hand door, figures kept", async () => {
    const at = new Date("2026-10-08T15:00:00Z");
    const row = scratchRow("  call Dana about the $12,000 quote  ", at);
    assert.ok(row);
    const writes: AccountNoteData[] = [];
    const client = {
      accountNote: {
        create: async (args: { data: AccountNoteData }) => {
          writes.push(args.data);
          return { id: "n1" };
        },
      },
    };
    await createAccountNoteRow(row, client);
    // One write, and only the provenance tier: no second store, no todo.
    assert.equal(writes.length, 1);
    assert.equal(writes[0].accountId, SCRATCH_NS);
    assert.equal(writes[0].door, "hand");
    assert.equal(writes[0].lane, "mine");
    assert.equal(writes[0].source, "scratch");
    assert.equal(writes[0].body, "call Dana about the $12,000 quote");
    assert.equal(writes[0].createdAt?.toISOString(), at.toISOString());
    assert.equal(scratchRow("   ", at), null, "the paper keeps no empty line");
  });

  test("both pad namespaces are namespaced: never a record row, never an account", () => {
    for (const ns of [SCRATCH_NS, SCRATCH_GONE_NS]) {
      assert.equal(isRecordRowId(ns), false, ns);
      assert.equal(isNamespacedAccountId(ns), true, ns);
      // No book account folds into the pad, and the pad folds into none.
      assert.equal(canonicalAccountId(ns), ns);
    }
  });

  test("the whole-table read admits record rows and neither pad namespace", () => {
    const where = recordRowsWhere() as { NOT: { accountId: { contains: string } } };
    const admits = (id: string) => !id.includes(where.NOT.accountId.contains);
    assert.equal(admits("001F000000w38BOIAY"), true);
    assert.equal(admits(SCRATCH_NS), false);
    assert.equal(admits(SCRATCH_GONE_NS), false);
  });

  test("the intranet mirror turns no pad line into a doc, kept or struck", () => {
    for (const ns of [SCRATCH_NS, SCRATCH_GONE_NS])
      assert.equal(
        mirrorAccountNote(pad(ns, "Dana said the board meets Friday."), ""),
        null,
      );
    // A record row with the same words does mirror: the namespace is the gate.
    assert.ok(
      mirrorAccountNote(
        pad("001F000000w38BOIAY", "Dana said the board meets Friday."),
        "Simploy",
      ),
    );
  });

  test("a name the pad repeats never becomes our side in the account views", () => {
    // Two pad rows and one account row name Dana Reyes: three keys, so a
    // read that counted the pad as accounts would call Dana a colleague.
    const notes: [string, { actors: string }[]][] = [
      [SCRATCH_NS, [{ actors: "Dana Reyes" }]],
      [SCRATCH_GONE_NS, [{ actors: "Dana Reyes" }]],
      ["001F000000w38BOIAY", [{ actors: "Dana Reyes" }]],
    ];
    assert.equal(homeSideFrom(notes).has("dana reyes"), false);
  });

  test("an answer citing a pad line offers no door back into the pad", () => {
    const links = askLinks(
      {
        question: "what did I write about Dana?",
        accounts: [],
        citations: [
          {
            origin: "account-note",
            originRef: "n1",
            accountId: SCRATCH_NS,
            docTitle: "",
          },
        ],
      },
      () => "",
    );
    assert.ok(
      links.every((l) => !l.href.includes("scratch")),
      JSON.stringify(links),
    );
  });
});

// ── A7.10 · "the ask door still redacts, because asks leave the paper." ────
describe("the ask door redacts; the paper keeps (A7.10)", () => {
  test("the question that leaves carries no figure", () => {
    const q = padQuestion("  What does $12,000 a year buy in Brazil, or 90,000 USD?  ");
    assert.equal(/12,000|90,000/.test(q), false, q);
    assert.ok(q.startsWith("What does"), "trimmed, words intact");
  });

  test("the same words kept on the paper keep their figure", () => {
    const row = scratchRow("What does $12,000 a year buy in Brazil?", new Date());
    assert.ok(row?.body.includes("$12,000"));
  });

  test("the question is capped and a blank stays blank", () => {
    assert.equal(padQuestion("x".repeat(400)).length, 300);
    assert.equal(padQuestion("   "), "");
  });
});

// ── A7.14 · "readable under the pad's STRUCK fold, restorable by ↺." ───────
describe("a struck line is restorable by ↺ (A7.14)", () => {
  type Row = { id: string; accountId: string; body: string; createdAt: string };
  const clientOver = (rows: Row[]) =>
    ({
      accountNote: {
        updateMany: async (args: ReturnType<typeof restoreMove>) => {
          let count = 0;
          for (const r of rows)
            if (r.id === args.where.id && r.accountId === args.where.accountId) {
              r.accountId = args.data.accountId;
              count += 1;
            }
          return { count };
        },
      },
    }) satisfies StrikeClient;

  test("↺ moves the row from the struck history back to the pad and changes nothing else", () => {
    const m = restoreMove("line-9");
    assert.deepEqual(m.where, { id: "line-9", accountId: SCRATCH_GONE_NS });
    assert.deepEqual(m.data, { accountId: SCRATCH_NS });
  });

  test("cross out, then ↺: the line is back on the paper with its words and its moment", async () => {
    const rows: Row[] = [
      {
        id: "line-9",
        accountId: SCRATCH_NS,
        body: "ask Dana for the census",
        createdAt: "2026-10-01T14:00:00Z",
      },
    ];
    const client = clientOver(rows);
    assert.equal(await strikeLine(client, "line-9"), 1);
    assert.equal(rows[0].accountId, SCRATCH_GONE_NS);
    assert.equal(await restoreLine(client, "line-9"), 1);
    assert.deepEqual(rows[0], {
      id: "line-9",
      accountId: SCRATCH_NS,
      body: "ask Dana for the census",
      createdAt: "2026-10-01T14:00:00Z",
    });
  });

  test("↺ on a line that is not struck moves nothing", async () => {
    const rows: Row[] = [
      {
        id: "line-1",
        accountId: SCRATCH_NS,
        body: "still on the paper",
        createdAt: "2026-10-01T14:00:00Z",
      },
    ];
    assert.equal(await restoreLine(clientOver(rows), "line-1"), 0);
    assert.equal(rows[0].accountId, SCRATCH_NS);
  });
});
