// Routing and the vault on the server (the Chute brains refactor plan, §2.4
// and slice 7). C2 (CLAUDE.md, The Chute): beside the book's contacts and
// domains, the router's email and people rungs read every actor and
// recipient the record holds for the account; the rungs stay pure rules;
// an undo withdraws whatever the undone filing taught. D12: routing runs on
// the server and the roster never ships to the browser. D8 as amended
// 2026-10-05: every dropped file archives whole to GitHub through a
// server-side upload, so no token reaches the browser; a file above the
// server's request cap arrives in pieces the server assembles before it
// lands. D13: vaulting is filing, with a receipt.
//
// Pinned as behavior where the seam exists — the roster builder and the
// route over a stubbed client, the pieces over a stubbed staging client and
// a scripted wire — and as source where it does not: which modules a client
// bundle imports, and what the doors' return types can carry.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { routingRoster } from "../src/lib/book/roster";
import { archiveFileToGitHub } from "../src/lib/github/archive";
import {
  joinRosters,
  readJoinedRoster,
  rosterQuery,
  routeText,
  signalsOf,
  type RosterClient,
  type RosterRow,
} from "../src/lib/ingest/route";
import {
  UNFINISHED,
  VAULT_PIECE_BYTES,
  piecesOf,
  sendToVault,
  stagePiece,
  type Piece,
  type PieceReply,
  type VaultChunkClient,
  type VaultReceipt,
} from "../src/lib/ingest/vault";

const root = cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

// ── the joined roster (C2) ──────────────────────────────────────────────────

const book = routingRoster();
// Two real accounts the book knows: one to teach, one to stand beside it.
const [taught, other] = book;
// A person the book binds to exactly one account, for the binding rule.
const bound = book.find((a) => (a.people ?? []).length > 0 && a.id !== other.id)!;
const boundPerson = bound.people![0];
const titled = (key: string) =>
  key
    .split(" ")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

/** A client over an in-memory table, recording what the roster asked for. */
function rosterStub(rows: RosterRow[]) {
  const asked: unknown[] = [];
  const client: RosterClient = {
    accountNote: {
      findMany: async (args) => {
        asked.push(args);
        return rows.filter(
          (r) => args.where.accountId.in.includes(r.accountId) && (r.actors || r.recipients),
        );
      },
    },
  };
  return { client, asked, rows };
}

describe("the roster the rungs read is the book's joined with the record's", () => {
  test("the columns' signals: addresses, and people as keys", () => {
    const s = signalsOf(
      "Dana Record <dana.record@northwind-record-only.example> → Antaeus Coe +2",
      "Antaeus Coe, Priya Ledger",
    );
    assert.deepEqual(s.emails, ["dana.record@northwind-record-only.example"]);
    assert.deepEqual(s.people, ["dana record", "antaeus coe", "priya ledger"]);
    assert.deepEqual(signalsOf("", ""), { emails: [], people: [] });
  });

  test("an address the book lacks and the record holds routes by the email rung", async () => {
    const address = "dana.record@northwind-record-only.example";
    assert.ok(!book.some((a) => a.emails.includes(address)), "the book lacks it");
    const rows: RosterRow[] = [
      { accountId: taught.id, actors: `Dana Record <${address}> → Antaeus Coe`, recipients: "" },
    ];
    const roster = joinRosters(book, rows);
    const text = `OUTLOOK THREAD — x.eml\nFrom: Dana Record <${address}>\n\nhello`;
    const r = await routeText(text, roster);
    assert.equal(r.best?.id, taught.id, r.candidates.map((c) => c.why).join(" | "));
    assert.equal(r.best?.rung, "email");
    // Its domain teaches the domain rung too, for a colleague of Dana's.
    const sib = await routeText(
      "From: someone-else@northwind-record-only.example\n\nhi",
      roster,
    );
    assert.equal(sib.best?.id, taught.id);
    assert.equal(sib.best?.rung, "domain");
    // And the book alone never knew either.
    assert.equal((await routeText(text, book)).best, null);
  });

  test("a person the record names routes by the people rung", async () => {
    assert.ok(!book.some((a) => (a.people ?? []).includes("priya ledger")));
    const rows: RosterRow[] = [
      { accountId: taught.id, actors: "Priya Ledger → Antaeus Coe", recipients: "Antaeus Coe" },
    ];
    const roster = joinRosters(book, rows);
    const text =
      "CALL TRANSCRIPT — dropped file call.vtt\nPriya Ledger: Thanks for making time today.\nAntaeus Coe: Of course.";
    const r = await routeText(text, roster);
    assert.equal(r.best?.id, taught.id, r.candidates.map((c) => c.why).join(" | "));
    assert.equal(r.best?.rung, "person");
  });

  test("our own side teaches nothing: the operator, a colleague, a prismhr.com address", () => {
    const rows: RosterRow[] = [
      {
        accountId: taught.id,
        actors: "Antaeus Coe <acoe@prismhr.com> → Someone Else",
        recipients: "Lesha Cyphers <lcyphers@prismhr.com>",
      },
    ];
    const roster = joinRosters(book, rows);
    const t = roster.find((a) => a.id === taught.id)!;
    assert.ok(!t.emails.some((e) => e.endsWith("@prismhr.com")));
    assert.ok(!t.domains.includes("prismhr.com"));
    assert.ok(!t.people!.includes("antaeus coe"));
    assert.ok(!t.people!.includes("lesha cyphers"));
    // Someone Else, on the account's side, is taught.
    assert.ok(t.people!.includes("someone else"));
  });

  test("the book's binding beats the record's: a person on another row stays their account's", () => {
    // The 2026-09-03 shape: a Simploy person on a thread filed to Regis must
    // not make Regis routable by that person.
    const rows: RosterRow[] = [
      { accountId: other.id, actors: `${titled(boundPerson)} → Antaeus Coe`, recipients: "" },
    ];
    const roster = joinRosters(book, rows);
    assert.ok(!roster.find((a) => a.id === other.id)!.people!.includes(boundPerson));
    assert.ok(roster.find((a) => a.id === bound.id)!.people!.includes(boundPerson));
  });

  test("a signal the record holds under two accounts identifies neither", () => {
    const address = "shared@vendor-on-both-records.example";
    const rows: RosterRow[] = [
      { accountId: taught.id, actors: `Sam Shared <${address}> → Antaeus Coe`, recipients: "" },
      { accountId: other.id, actors: "", recipients: `Sam Shared <${address}>` },
    ];
    const roster = joinRosters(book, rows);
    for (const id of [taught.id, other.id]) {
      const a = roster.find((x) => x.id === id)!;
      assert.ok(!a.emails.includes(address));
      assert.ok(!a.domains.includes("vendor-on-both-records.example"));
      assert.ok(!a.people!.includes("sam shared"));
    }
  });

  test("the book's roster is only ever widened, never narrowed", () => {
    const roster = joinRosters(book, [
      { accountId: taught.id, actors: "New Person → Antaeus Coe", recipients: "" },
    ]);
    assert.equal(roster.length, book.length);
    for (let i = 0; i < book.length; i++) {
      const b = book[i];
      const j = roster[i];
      assert.equal(j.id, b.id);
      assert.deepEqual(j.aka, b.aka);
      for (const e of b.emails) assert.ok(j.emails.includes(e));
      for (const d of b.domains) assert.ok(j.domains.includes(d));
      for (const p of b.people ?? []) assert.ok(j.people!.includes(p));
    }
    // A row for an account the book does not hold teaches nothing anywhere.
    const stray = joinRosters(book, [
      { accountId: "not-in-the-book", actors: "Stray Person → Antaeus Coe", recipients: "" },
    ]);
    assert.ok(!stray.some((a) => a.people!.includes("stray person")));
  });

  test("the joined roster is built from the columns, never from bodies", async () => {
    const address = "only.in.a.body@body-never-teaches.example";
    const stub = rosterStub([
      // A row whose body carries an address its columns do not: the body is
      // not a column and the roster must not see it.
      { accountId: taught.id, actors: "Someone Named → Antaeus Coe", recipients: "", body: address } as RosterRow,
    ]);
    const roster = await readJoinedRoster(stub.client);
    assert.equal(stub.asked.length, 1);
    const args = stub.asked[0] as ReturnType<typeof rosterQuery>;
    assert.deepEqual(args.select, { accountId: true, actors: true, recipients: true });
    assert.ok(!("body" in args.select), "no body is selected");
    assert.deepEqual(args.distinct, ["accountId", "actors", "recipients"]);
    // The where names only book accounts and only rows naming anyone.
    assert.deepEqual(args.where.accountId.in, book.map((a) => a.id));
    assert.deepEqual(args.where.OR, [{ actors: { not: "" } }, { recipients: { not: "" } }]);
    // The query the module builds is the one it sends.
    assert.deepEqual(args, rosterQuery(book.map((a) => a.id)));
    const r = await routeText(`From: ${address}\n\nhello`, roster);
    assert.equal(r.best, null);
    assert.deepEqual(r.candidates, []);
    assert.ok(roster.find((a) => a.id === taught.id)!.people!.includes("someone named"));
  });

  test("after the filing that taught an address is undone, the address routes nowhere", async () => {
    // By construction: the roster is rebuilt from the rows on every read, and
    // the undo deletes every row carrying the filing's id
    // (src/lib/ingest/filing.ts, pinned in tests/ingest-filing.test.ts).
    const address = "taught.then.undone@undone-filing.example";
    const stub = rosterStub([
      { accountId: taught.id, actors: `Someone Undone <${address}> → Antaeus Coe`, recipients: "" },
    ]);
    const text = `OUTLOOK THREAD — x.eml\nFrom: Someone Undone <${address}>\n\nhello`;
    const before = await routeText(text, await readJoinedRoster(stub.client));
    assert.equal(before.best?.id, taught.id);
    assert.equal(before.best?.rung, "email");
    // The undo takes the filing's rows back.
    stub.rows.length = 0;
    const after = await routeText(text, await readJoinedRoster(stub.client));
    assert.equal(after.best, null);
    assert.deepEqual(after.candidates, []);
  });

  test("a store the server cannot read leaves the book's roster standing", async () => {
    const client: RosterClient = {
      accountNote: {
        findMany: async () => {
          throw new Error("P1001: Can't reach database server");
        },
      },
    };
    assert.deepEqual(await readJoinedRoster(client), book);
  });
});

// ── the roster never ships (D12) ────────────────────────────────────────────

/** Every source file under src, recursively. */
function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== "generated") sources(p, out);
    } else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const isClientModule = (src: string) => /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(src);

describe("routing runs on the server; the roster never ships to the browser", () => {
  test("no client module imports the book's roster or the server router", () => {
    const clientModules = sources(join(root, "src")).filter((p) => isClientModule(read(p.slice(root.length + 1))));
    assert.ok(clientModules.length > 0, "the scan found client modules");
    for (const p of clientModules) {
      const src = read(p.slice(root.length + 1));
      assert.ok(!/from\s+["'][^"']*book\/roster["']/.test(src), `${p} imports the roster`);
      assert.ok(!/from\s+["'][^"']*ingest\/route["']/.test(src), `${p} imports the server router`);
      assert.ok(!/from\s+["'][^"']*book\/contacts["']/.test(src), `${p} imports contacts.json`);
    }
  });

  test("the doors route through the action, and no roster prop rides either page", () => {
    const chute = read("src/app/room/chute.tsx");
    assert.ok(isClientModule(chute));
    assert.match(chute, /import \{[^}]*\brouteText\b[^}]*\} from "\.\/route-actions"/);
    assert.ok(!/routeCapture\(/.test(chute), "the Chute no longer routes in the browser");
    assert.ok(!/roster/.test(chute.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "")), "no roster in the Chute's code");
    for (const page of ["src/app/room/page.tsx", "src/app/intranet/page.tsx"]) {
      const src = read(page);
      assert.ok(!/<Chute[^>]*roster=/.test(src), `${page} passes a roster`);
      assert.ok(!/book\/roster/.test(src), `${page} imports the roster`);
    }
    // The action answers the verdict and names only.
    const action = read("src/app/room/route-actions.ts");
    assert.match(action, /^"use server";/);
    assert.match(action, /export type RouteReply = \{[\s\S]*?\};/);
    const reply = /export type RouteReply = \{([\s\S]*?)\};/.exec(action)![1];
    for (const word of ["emails", "domains", "people", "roster", "token"])
      assert.ok(!reply.includes(word), `RouteReply carries ${word}`);
    assert.match(action, /export async function routeText\(text: string\): Promise<RouteReply>/);
  });

  test("roomPaste's two rungs read the joined roster, read once", () => {
    const actions = read("src/app/room/actions.ts");
    const a = actions.indexOf("export async function roomPaste(");
    const b = actions.indexOf("export async function roomActionUndo(", a);
    const roomPaste = actions.slice(a, b);
    assert.ok(!actions.includes("routingRoster("), "actions.ts no longer builds the book's roster alone");
    assert.equal((roomPaste.match(/await joinedRoster\(\)/g) ?? []).length, 1);
    assert.equal((roomPaste.match(/roster,\n/g) ?? []).length, 2, "both guardPlan calls take it");
  });
});

// ── the vault on the server (D8, D13) ───────────────────────────────────────

describe("no server action returns a token", () => {
  test("the grant action is gone and nothing imports it", () => {
    assert.ok(!existsSync(join(root, "src/app/room/archive-actions.ts")));
    for (const p of sources(join(root, "src")))
      assert.ok(!/from\s+["'][^"']*archive-actions["']/.test(read(p.slice(root.length + 1))), p);
    const archive = read("src/lib/github/archive.ts");
    assert.ok(!archive.includes("ArchiveGrant"), "the grant type is gone");
    assert.ok(!archive.includes("process.env"), "the lib never reads env");
  });

  test("the vault's doors answer a receipt whose type cannot carry a credential", () => {
    const doors = read("src/app/room/vault-actions.ts");
    assert.match(doors, /^"use server";/);
    const exported = [...doors.matchAll(/export async function (\w+)\(([\s\S]*?)\): Promise<(\w+)>/g)];
    assert.deepEqual(
      exported.map((m) => [m[1], m[3]]),
      [
        ["vaultFile", "VaultReceipt"],
        ["vaultChunk", "PieceReply"],
      ],
    );
    const lib = read("src/lib/ingest/vault.ts");
    const receipt = /export type VaultReceipt =([\s\S]*?);/.exec(lib)![1];
    const reply = /export type PieceReply =([\s\S]*?);/.exec(lib)![1];
    for (const t of [receipt, reply]) {
      assert.ok(!/token|repo|grant/.test(t), t);
    }
    assert.ok(!lib.includes("process.env"), "the carriage never reads env");
    // The env is read in the doors alone, and only into the GitHub call.
    assert.equal((doors.match(/GITHUB_ARCHIVE_TOKEN/g) ?? []).length, 2, "named once to read, once in the message");
    for (const client of ["src/app/room/chute.tsx", "src/app/room/room-client.tsx"]) {
      const src = read(client);
      assert.ok(!src.includes("process.env"), `${client} reads env`);
      assert.ok(!src.includes("GITHUB_ARCHIVE"), `${client} names the vault's env`);
      assert.ok(!/archiveFileToGitHub/.test(src), `${client} speaks to GitHub itself`);
      assert.match(src, /import \{ vaultChunk, vaultFile \} from "\.\/vault-actions"/);
      assert.match(src, /sendToVault\(/);
    }
  });
});

// ── the pieces ──────────────────────────────────────────────────────────────

const MB = 1024 * 1024;

/** A client over an in-memory VaultChunk table. */
function stagingStub() {
  type Row = Piece & { id: string; createdAt: Date };
  const rows: Row[] = [];
  let seq = 0;
  const matches = (r: Row, w: Record<string, unknown>) =>
    (w.accountId === undefined || r.accountId === w.accountId) &&
    (w.filename === undefined || r.filename === w.filename) &&
    (w.total === undefined || r.total === w.total) &&
    (w.index === undefined || r.index === w.index) &&
    (w.createdAt === undefined || r.createdAt < (w.createdAt as { lt: Date }).lt);
  const client: VaultChunkClient = {
    vaultChunk: {
      deleteMany: async ({ where }) => {
        const before = rows.length;
        for (let i = rows.length - 1; i >= 0; i--) if (matches(rows[i], where)) rows.splice(i, 1);
        return { count: before - rows.length };
      },
      create: async ({ data }) => {
        const row = { ...data, id: `c${++seq}`, createdAt: new Date() };
        rows.push(row);
        return { id: row.id };
      },
      count: async ({ where }) => rows.filter((r) => matches(r, where)).length,
      findMany: async ({ where }) =>
        rows
          .filter((r) => matches(r, where))
          .sort((a, b) => a.index - b.index)
          .map((r) => ({ index: r.index, bytes: r.bytes })),
    },
  };
  return { client, rows };
}

type Call = { method: string; url: string; body: string; auth: string };
type FakeStep = { status?: number; body?: unknown } | { throws: string };
const scriptFetch = (steps: FakeStep[], calls: Call[]) =>
  (async (
    url: unknown,
    init?: { method?: string; body?: unknown; headers?: Record<string, string> },
  ) => {
    const method = init?.method ?? "GET";
    calls.push({
      method,
      url: String(url),
      body: typeof init?.body === "string" ? init.body : "",
      auth: init?.headers?.Authorization ?? "",
    });
    const s = steps.shift();
    if (!s) throw new Error("unscripted call: " + String(url));
    if ("throws" in s) throw new TypeError(s.throws);
    const status = s.status ?? 200;
    return { ok: status >= 200 && status < 300, status, json: async () => s.body ?? {} };
  }) as unknown as typeof fetch;

/** The doors as the browser half sees them, wired straight to the server
 *  half over the stub store and a landing. */
function doorsOver(
  store: ReturnType<typeof stagingStub>,
  land: (file: File) => Promise<VaultReceipt>,
  account = { id: "A1", name: "Simploy" },
) {
  const whole = async (_accountId: string, form: FormData) => land(form.get("file") as File);
  const piece = async (
    accountId: string,
    filename: string,
    index: number,
    total: number,
    form: FormData,
  ): Promise<PieceReply> => {
    const f = form.get("file") as File;
    assert.equal(accountId, account.id);
    return stagePiece(
      store.client,
      { accountId, filename, index, total, bytes: new Uint8Array(await f.arrayBuffer()), type: f.type },
      land,
    );
  };
  return { whole, piece };
}

/** Ten megabytes with a pattern that tells a piece from its neighbor. */
function tenMegabytes(): Uint8Array<ArrayBuffer> {
  const u = new Uint8Array(10 * MB);
  for (let i = 0; i < u.length; i += 4096) u[i] = (i / 4096) % 251;
  u[u.length - 1] = 7;
  return u;
}

describe("a file above the request cap arrives in pieces and lands once", () => {
  test("the cut: 4 MB pieces, a small file whole", () => {
    assert.equal(VAULT_PIECE_BYTES, 4 * MB);
    const small = new File([new Uint8Array(4 * MB)], "fits.pdf");
    assert.deepEqual(piecesOf(small), [small]);
    const big = new File([new Uint8Array(10 * MB)], "big.pdf");
    const pieces = piecesOf(big);
    assert.deepEqual(
      pieces.map((p) => p.size),
      [4 * MB, 4 * MB, 2 * MB],
    );
  });

  test("a 10 MB file arrives in three pieces and lands as one GitHub PUT", async () => {
    const real = globalThis.fetch;
    const calls: Call[] = [];
    globalThis.fetch = scriptFetch(
      [
        { status: 404 }, // name probe: free
        { status: 201, body: { content: { html_url: "https://github.com/o/vault/blob/x" } } },
      ],
      calls,
    );
    const store = stagingStub();
    const landed: File[] = [];
    const land = async (file: File) => {
      landed.push(file);
      return archiveFileToGitHub({
        file,
        accountName: "Simploy",
        grant: { repo: "o/vault", token: "t" },
      });
    };
    const progress: string[] = [];
    try {
      const bytes = tenMegabytes();
      const r = await sendToVault(
        "A1",
        new File([bytes], "quarterly-call.pdf", { type: "application/pdf" }),
        doorsOver(store, land),
        (sent, total) => progress.push(`${sent}/${total}`),
      );
      assert.ok(r.ok, JSON.stringify(r));
      if (r.ok) {
        assert.equal(r.kind, "file");
        assert.equal(r.detail, "accounts/Simploy/quarterly-call.pdf");
        assert.equal(r.url, "https://github.com/o/vault/blob/x");
      }
      assert.deepEqual(progress, ["1/3", "2/3", "3/3"]);
      // One landing, the whole file, in order.
      assert.equal(landed.length, 1);
      assert.equal(landed[0].size, 10 * MB);
      assert.equal(landed[0].name, "quarterly-call.pdf");
      assert.equal(landed[0].type, "application/pdf");
      const back = new Uint8Array(await landed[0].arrayBuffer());
      assert.deepEqual(back, bytes);
      // One PUT on the wire, carrying the whole file, with the caller's token.
      assert.deepEqual(
        calls.map((c) => c.method),
        ["GET", "PUT"],
      );
      const put = JSON.parse(calls[1].body) as { content: string };
      assert.equal(Buffer.from(put.content, "base64").length, 10 * MB);
      assert.equal(calls[1].auth, "Bearer t");
      // The pieces are gone once the file landed.
      assert.equal(store.rows.length, 0);
    } finally {
      globalThis.fetch = real;
    }
  });

  test("a missing piece vaults nothing and the receipt says the backup did not finish", async () => {
    // The browser half: the second piece never reaches the server.
    const store = stagingStub();
    let landings = 0;
    const land = async (): Promise<VaultReceipt> => {
      landings++;
      return { ok: true, kind: "file", url: "u", detail: "d" };
    };
    const doors = doorsOver(store, land);
    const broken = {
      whole: doors.whole,
      piece: async (a: string, f: string, i: number, t: number, form: FormData) => {
        if (i === 1) throw new TypeError("fetch failed");
        return doors.piece(a, f, i, t, form);
      },
    };
    const r = await sendToVault("A1", new File([new Uint8Array(10 * MB)], "big.mp4"), broken);
    assert.deepEqual(r, { ok: false, reason: UNFINISHED });
    assert.equal(landings, 0);
    assert.equal(store.rows.length, 1, "the first piece waits; the next drop replaces it");

    // The server half: the last piece arrives with one missing. Nothing is
    // assembled, nothing lands, the pieces wait for a re-drop.
    const again = stagingStub();
    const piece = (index: number): Piece => ({
      accountId: "A1",
      filename: "big.mp4",
      index,
      total: 3,
      bytes: new Uint8Array(index === 2 ? 2 * MB : 4 * MB),
    });
    assert.deepEqual(await stagePiece(again.client, piece(0), land), {
      ok: true,
      staged: true,
      index: 0,
      total: 3,
    });
    assert.deepEqual(await stagePiece(again.client, piece(2), land), {
      ok: true,
      staged: true,
      index: 2,
      total: 3,
    });
    assert.equal(landings, 0);
    assert.equal(again.rows.length, 2);
    // A fresh drop of the same file opens a fresh set: the first piece clears
    // what waited, and the full set lands once.
    assert.deepEqual(await stagePiece(again.client, piece(0), land), {
      ok: true,
      staged: true,
      index: 0,
      total: 3,
    });
    assert.equal(again.rows.length, 1);
    await stagePiece(again.client, piece(1), land);
    const last = await stagePiece(again.client, piece(2), land);
    assert.deepEqual(last, { ok: true, kind: "file", url: "u", detail: "d" });
    assert.equal(landings, 1);
    assert.equal(again.rows.length, 0);
  });

  test("a set that can never be whole is cleared and says so; a bad piece is refused", async () => {
    const store = stagingStub();
    let landings = 0;
    const land = async (): Promise<VaultReceipt> => {
      landings++;
      return { ok: true, kind: "file", url: "u", detail: "d" };
    };
    const piece = (index: number, over: Partial<Piece> = {}): Piece => ({
      accountId: "A1",
      filename: "big.mp4",
      index,
      total: 3,
      bytes: new Uint8Array(1024),
      ...over,
    });
    // A piece sent twice replaces itself; the set still lands once.
    await stagePiece(store.client, piece(0), land);
    await stagePiece(store.client, piece(1), land);
    await stagePiece(store.client, piece(1), land);
    assert.equal(store.rows.length, 2);
    const r = await stagePiece(store.client, piece(2), land);
    assert.ok(r.ok && !("staged" in r));
    assert.equal(landings, 1);
    // Refused before any store call: an index past the total, a total of one,
    // an empty piece, a piece over the size.
    for (const bad of [
      piece(3),
      piece(0, { total: 1 }),
      piece(0, { bytes: new Uint8Array(0) }),
      piece(0, { bytes: new Uint8Array(VAULT_PIECE_BYTES + 1) }),
    ]) {
      assert.deepEqual(await stagePiece(store.client, bad, land), { ok: false, reason: UNFINISHED });
    }
    assert.equal(store.rows.length, 0);
    assert.equal(landings, 1);
    // A whole call that breaks off is a receipt, never a thrown promise.
    const r2 = await sendToVault(
      "A1",
      new File(["WEBVTT"], "call.vtt"),
      {
        whole: async () => {
          throw new TypeError("fetch failed");
        },
        piece: async () => {
          throw new Error("unreached");
        },
      },
    );
    assert.equal(r2.ok, false);
    if (!r2.ok) assert.match(r2.reason, /Drop it again\.$/);
  });

  test("the body limit admits a piece and stays under the request cap", () => {
    const config = read("next.config.ts");
    const m = /bodySizeLimit:\s*"(\d+)kb"/.exec(config);
    assert.ok(m, "next.config.ts sets experimental.serverActions.bodySizeLimit in kb");
    const limit = Number(m![1]) * 1024;
    assert.ok(limit > VAULT_PIECE_BYTES + 64 * 1024, "a piece plus the form's overhead fits");
    assert.ok(limit < 4.5 * MB, "under Vercel's 4.5 MB request cap");
  });

  test("the staging table's migration is additive and registered", () => {
    const sql = read("prisma/migrations/20261005180000_vault_chunk/migration.sql");
    assert.match(sql, /CREATE TABLE IF NOT EXISTS "VaultChunk"/);
    assert.match(sql, /"bytes" BYTEA NOT NULL/);
    assert.ok(!/ALTER TABLE/.test(sql), "no existing table is touched");
    const schema = read("prisma/schema.prisma");
    assert.match(schema, /model VaultChunk \{[\s\S]*?bytes\s+Bytes[\s\S]*?\}/);
  });
});
