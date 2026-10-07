// Routing and the vault on the server (the Chute brains refactor plan, §2.4
// and slice 7). C2 (CLAUDE.md, The Chute): beside the book's contacts and
// domains, the router's email and people rungs read every actor and
// recipient the record holds for the account; the rungs stay pure rules;
// an undo withdraws whatever the undone filing taught. D13: routing runs on
// the server and the roster never ships to the browser. D8 as amended
// 2026-10-05: every dropped file archives whole to GitHub through a
// server-side upload, so no token reaches the browser; a file above the
// server's request cap arrives in pieces the server assembles before it
// lands. D6: vaulting is filing, with a receipt.
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
import { claimCapture, releaseCapture, type ClaimClient } from "../src/lib/ingest/filing";
import {
  fileGrab,
  grabCounts,
  grabDay,
  grabFingerprint,
  grabResult,
  isGrab,
  keptGrab,
  planGrab,
  splitGrab,
  unmatchedLine,
  type GrabNote,
  type GrabStore,
} from "../src/lib/ingest/grab";
import { ALREADY_ON_FILE } from "../src/lib/ingest/wrote";
import { intentFor } from "../src/lib/groundwork/signals";
import type { RouteAccount } from "../src/lib/route-capture";
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

// ── the roster never ships (D13) ────────────────────────────────────────────

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
    // The route call is the shared door's since slice 8 (src/app/room/ingest/
    // use-ingest.ts); the Chute calls the hook, and neither routes in the browser.
    const chute = read("src/app/room/chute.tsx");
    const door = read("src/app/room/ingest/use-ingest.ts");
    assert.ok(isClientModule(chute));
    assert.ok(isClientModule(door));
    assert.match(door, /import \{[^}]*\brouteText\b[^}]*\} from "\.\.\/route-actions"/);
    assert.match(chute, /useIngest\(\{\s*door:\s*"chute"/);
    for (const [name, src] of [["the Chute", chute], ["the shared door", door]] as const) {
      assert.ok(!/routeCapture\(/.test(src), `${name} routes in the browser`);
      assert.ok(!/roster/.test(src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "")), `no roster in ${name}'s code`);
    }
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
    const b = actions.indexOf("export async function roomMoveDone(", a);
    const roomPaste = actions.slice(a, b);
    assert.ok(!actions.includes("routingRoster("), "actions.ts no longer builds the book's roster alone");
    assert.equal((roomPaste.match(/await joinedRoster\(\)/g) ?? []).length, 1);
    assert.equal((roomPaste.match(/roster,\n/g) ?? []).length, 2, "both guardPlan calls take it");
  });
});

// ── the vault on the server (D8, D6) ────────────────────────────────────────

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
    for (const client of [
      "src/app/room/chute.tsx",
      "src/app/room/room-client.tsx",
      "src/app/room/ingest/use-ingest.ts",
    ]) {
      const src = read(client);
      assert.ok(!src.includes("process.env"), `${client} reads env`);
      assert.ok(!src.includes("GITHUB_ARCHIVE"), `${client} names the vault's env`);
      assert.ok(!/archiveFileToGitHub/.test(src), `${client} speaks to GitHub itself`);
    }
    // The carriage is the shared door's since slice 8: both faces vault
    // through it, and it alone posts through the two server doors.
    const door = read("src/app/room/ingest/use-ingest.ts");
    assert.match(door, /import \{ vaultChunk, vaultFile \} from "\.\.\/vault-actions"/);
    assert.match(door, /sendToVault\(/);
    for (const face of ["src/app/room/chute.tsx", "src/app/room/room-client.tsx"]) {
      assert.match(read(face), /ingest\.vault\(/, `${face} vaults through the shared door`);
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

// ── the Sales Nav grab, one note per account (seam S-25) ───────────────────
// Pass 8 call 12 and D30: the grab files through the one pipeline under its
// SALESNAV ACCOUNTS head. It is a list of about a hundred accounts, rows
// parted by "----", and it used to file as ONE note on the ONE row it was
// pasted on, so the queue's intent read took every row as that account's.
// Now each row routes by the router's rungs and files on its own account;
// a row with no sure match files nothing and is counted on the receipt; the
// duplicate guard holds per account.

describe("the Sales Nav grab files each row on its own account", () => {
  const ROSTER: RouteAccount[] = [
    { id: "A0000000000000001", name: "Acme Staffing Partners", emails: [], domains: [] },
    { id: "B0000000000000002", name: "Beacon Workforce", emails: [], domains: [] },
    { id: "C0000000000000003", name: "Corvid Employer Group", emails: [], domains: [] },
  ];
  const HEAD = "SALESNAV ACCOUNTS - captured 10/7/2026, 9:12:00 AM - 3 rows collected";
  const GRAB =
    `${HEAD}\n\n` +
    "Acme Staffing Partners\nStaffing and Recruiting · High buyer intent · 11 activities\n\n----\n\n" +
    "Beacon Workforce\nHuman Resources · Moderate buyer intent\n\n----\n\n" +
    "Halcyon Unknown Holdings\nHigh buyer intent · 4 activities";
  const NOW = new Date("2026-10-07T15:00:00.000Z");

  /** The pipeline's writers over memory: the real claim and release over a
   *  stubbed disposition table, and the Filing rows and notes recorded. */
  function memory() {
    const marks = new Map<string, { status: string; reason: string }>();
    const client: ClaimClient = {
      accountDisposition: {
        create: async ({ data }) => {
          if (marks.has(data.accountId))
            throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
          marks.set(data.accountId, { status: data.status, reason: data.reason });
          return data;
        },
        findUnique: async ({ where }) => marks.get(where.accountId) ?? null,
        updateMany: async ({ where, data }) => {
          const r = marks.get(where.accountId);
          if (!r || r.status !== where.status || r.reason !== where.reason) return { count: 0 };
          r.reason = data.reason;
          return { count: 1 };
        },
        deleteMany: async ({ where }) => {
          const r = marks.get(where.accountId);
          if (!r || r.status !== where.status || r.reason !== where.reason) return { count: 0 };
          marks.delete(where.accountId);
          return { count: 1 };
        },
      },
    };
    const notes: (GrabNote & { id: string })[] = [];
    const filings: { id: string; accountId: string; dupeCheck: string }[] = [];
    const store: GrabStore = {
      claim: (key) => claimCapture(key, NOW, client),
      release: (key, token) => releaseCapture(key, token, client),
      stamp: async (key, noteId) => {
        marks.set(key, { status: "filed", reason: `${NOW.toISOString()}·${noteId}` });
      },
      filing: async (accountId, _fp, dupeCheck) => {
        const id = `F${filings.length + 1}`;
        filings.push({ id, accountId, dupeCheck });
        return id;
      },
      note: async (n) => {
        const id = `N${notes.length + 1}`;
        notes.push({ ...n, id });
        return id;
      },
    };
    return { store, notes, filings, marks };
  }

  test("the grab splits at its row lines under its own head", () => {
    assert.ok(isGrab(GRAB));
    assert.ok(!isGrab("OUTLOOK THREAD - captured\n\nhi"));
    const { head, rows } = splitGrab(GRAB);
    assert.equal(head, HEAD);
    assert.equal(rows.length, 3);
    assert.match(rows[2], /^Halcyon Unknown Holdings/);
  });

  test("a three-row grab files two notes, one per known account, and counts the unknown row", async () => {
    const plan = planGrab(GRAB, ROSTER);
    assert.deepEqual(
      plan.filings.map((f) => [f.account.id, f.rung]),
      [
        ["A0000000000000001", "name"],
        ["B0000000000000002", "name"],
      ],
    );
    assert.deepEqual(plan.missed, ["Halcyon Unknown Holdings"]);

    const { store, notes, filings } = memory();
    const g = await fileGrab(plan, store, "drop");
    assert.equal(notes.length, 2, "one note per surely matched account");
    // The accounts file a few at a time; the summary keeps the grab's order.
    assert.deepEqual(
      notes.map((n) => n.accountId).sort(),
      ["A0000000000000001", "B0000000000000002"],
    );
    assert.deepEqual(
      g.accounts.map((a) => a.id),
      ["A0000000000000001", "B0000000000000002"],
    );
    for (const n of notes) {
      // Under the grab's own head, with the source the intent read takes.
      assert.ok(n.body.startsWith(`${HEAD}\n\n`), "the note keeps the SALESNAV ACCOUNTS head");
      assert.equal(n.source, "salesnav");
      assert.equal(n.door, "drop");
      assert.equal(n.lane, "background");
      assert.equal(n.kind, "account");
      assert.ok(filings.some((f) => f.id === n.filingId && f.accountId === n.accountId));
    }
    // Each note carries its own row and no other account's.
    const noteOf = (id: string) => notes.find((n) => n.accountId === id)!;
    const acme = noteOf("A0000000000000001");
    const beacon = noteOf("B0000000000000002");
    assert.match(acme.body, /Acme Staffing Partners/);
    assert.doesNotMatch(acme.body, /Beacon|Halcyon/);
    assert.match(beacon.body, /Beacon Workforce/);
    assert.doesNotMatch(beacon.body, /Acme|Halcyon/);
    // The unknown row filed nothing and is counted.
    assert.equal(g.unmatched, 1);
    assert.deepEqual(g.failed, []);
    assert.deepEqual(g.duplicates, []);
    const r = grabResult(g, []);
    assert.equal(r.ok, true);
    assert.equal(r.filed, 2);
    assert.ok(r.ok && r.grab.unmatched === 1);
    // Every note id rides inside the grab, per account; none at the top,
    // where a take-back bound to one account would read them as the whole.
    assert.ok(!("noteIds" in r));
    for (const a of g.accounts) {
      assert.ok(notes.some((n) => n.id === a.noteId && n.accountId === a.id), `${a.id}'s note`);
      assert.ok(filings.some((f) => f.id === a.filingId && f.accountId === a.id), `${a.id}'s filing`);
    }
    assert.deepEqual(grabCounts(g), ["2 accounts", "1 row matched no account"]);
    assert.equal(unmatchedLine(1), "1 row matched no account.");

    // The queue's intent read now reads each account's own row.
    const at = NOW.toISOString();
    assert.equal(intentFor([{ body: acme.body, source: acme.source, createdAt: at }], NOW)?.level, "high");
    assert.equal(intentFor([{ body: beacon.body, source: beacon.source, createdAt: at }], NOW)?.level, "moderate");
  });

  test("the duplicate guard holds per account: a re-paste files nothing twice", async () => {
    const m = memory();
    await fileGrab(planGrab(GRAB, ROSTER), m.store, "drop");
    // The same rows re-copied later the same day: the head line is skipped
    // (D16) and the day the grab was taken is the same, so it dedupes.
    const again = GRAB.replace("9:12:00 AM", "4:40:00 PM");
    const g = await fileGrab(planGrab(again, ROSTER), m.store, "chute");
    assert.equal(m.notes.length, 2, "nothing filed twice");
    assert.deepEqual(g.accounts, []);
    assert.deepEqual(
      g.duplicates.map((d) => d.id),
      ["A0000000000000001", "B0000000000000002"],
    );
    const r = grabResult(g, []);
    assert.ok(!r.ok && "duplicate" in r && r.duplicate);
    assert.equal(r.reason, `${ALREADY_ON_FILE} 1 row matched no account.`);
    // A changed row on one account files that account alone.
    const moved = again.replace("Moderate buyer intent", "High buyer intent");
    const g2 = await fileGrab(planGrab(moved, ROSTER), m.store, "drop");
    assert.deepEqual(g2.accounts.map((a) => a.id), ["B0000000000000002"]);
    assert.deepEqual(g2.duplicates.map((d) => d.id), ["A0000000000000001"]);
  });

  // A grab is an observation of the day it was taken (pass 9 seam ruling,
  // 2026-10-07): each account's fingerprint carries the grab's Chicago day,
  // read from the head's "captured …" moment, or the filing day when the
  // head has none. A re-copy that day dedupes (D16); a grab on a new day
  // files fresh, so intentFor's decay runs from the newest observation.
  test("a grab taken on a new day files fresh; the same day is refused", async () => {
    const m = memory();
    await fileGrab(planGrab(GRAB, ROSTER, NOW), m.store, "drop");
    const sameDay = GRAB.replace("10/7/2026, 9:12:00 AM", "10/7/2026, 11:58:00 PM");
    const refused = await fileGrab(planGrab(sameDay, ROSTER, NOW), m.store, "drop");
    assert.deepEqual(refused.accounts, [], "the same day is the same observation");
    assert.equal(refused.duplicates.length, 2);
    const nextDay = GRAB.replace("10/7/2026, 9:12:00 AM", "10/8/2026, 8:05:00 AM");
    const fresh = await fileGrab(planGrab(nextDay, ROSTER, NOW), m.store, "drop");
    assert.deepEqual(
      fresh.accounts.map((a) => a.id),
      ["A0000000000000001", "B0000000000000002"],
      "a new day's grab files fresh on every account",
    );
    assert.deepEqual(fresh.duplicates, []);
    assert.equal(m.notes.length, 4);
    // The fingerprint is the capture's own with the day beside it.
    const body = planGrab(GRAB, ROSTER, NOW).filings[0].body;
    assert.equal(grabFingerprint(body, "2026-10-07"), grabFingerprint(body, "2026-10-07"));
    assert.notEqual(grabFingerprint(body, "2026-10-07"), grabFingerprint(body, "2026-10-08"));
  });

  test("the grab's day is the head's captured date, else the Chicago filing day", async () => {
    assert.equal(grabDay(HEAD), "2026-10-07");
    assert.equal(grabDay("SALESNAV ACCOUNTS - captured 3/9/2027, 7:00:00 PM - 2 rows collected"), "2027-03-09");
    assert.equal(grabDay("SALESNAV ACCOUNTS - captured 2026-10-06T14:00 - 2 rows"), "2026-10-06");
    // No full date in the head: the filing day, in Chicago. 03:00 UTC on
    // 10/8 is still the evening of 10/7 there.
    const late = new Date("2026-10-08T03:00:00.000Z");
    assert.equal(grabDay("SALESNAV ACCOUNTS - captured Jul 30 - 118 rows", late), "2026-10-07");
    assert.equal(grabDay("SALESNAV", late), "2026-10-07");
    // A dateless grab dedupes within its filing day and files fresh the next.
    const dateless = GRAB.replace(HEAD, "SALESNAV ACCOUNTS - captured Jul 30 - 3 rows collected");
    const m = memory();
    await fileGrab(planGrab(dateless, ROSTER, late), m.store, "drop");
    const again = await fileGrab(planGrab(dateless, ROSTER, new Date("2026-10-08T04:30:00.000Z")), m.store, "drop");
    assert.equal(again.accounts.length, 0, "the same Chicago day");
    const next = await fileGrab(planGrab(dateless, ROSTER, new Date("2026-10-08T15:00:00.000Z")), m.store, "drop");
    assert.equal(next.accounts.length, 2, "the next Chicago day");
  });

  test("nothing files blind: a grab no row of which surely matches files nothing", async () => {
    // Two accounts named in one row tie on the name rung: no sure match.
    const tied = `${HEAD}\n\nAcme Staffing Partners and Beacon Workforce\nHigh buyer intent`;
    const plan = planGrab(tied, ROSTER);
    assert.deepEqual(plan.filings, []);
    const m = memory();
    const g = await fileGrab(plan, m.store, "drop");
    assert.equal(m.notes.length, 0);
    const r = grabResult(g, []);
    assert.equal(r.ok, false);
    assert.equal(r.reason, "1 row matched no account.");
  });

  test("a settled receipt keeps ids, names and counts, never a row's text (D12)", async () => {
    const g = await fileGrab(planGrab(GRAB, ROSTER), memory().store, "drop");
    assert.deepEqual(g.missed, ["Halcyon Unknown Holdings"]);
    const kept = keptGrab(g);
    assert.ok(kept);
    assert.ok(!("missed" in kept));
    assert.ok(!JSON.stringify(kept).includes("Halcyon"));
  });

  test("roomPaste splits a grab before the duplicate claim and the read, and the Chute's door files it", () => {
    const actions = read("src/app/room/actions.ts");
    const a = actions.indexOf("export async function roomPaste(");
    const roomPaste = actions.slice(a, actions.indexOf("export async function roomMoveDone(", a));
    const branch = roomPaste.indexOf('if (dialect === "SN") return await fileGrabCapture(rawText, door, opts.windows ?? []);');
    assert.ok(branch > 0, "roomPaste hands a grab to the split");
    assert.ok(branch < roomPaste.indexOf("claimCapture(pasteKey"), "before the whole-capture claim");
    assert.ok(branch < roomPaste.indexOf("aiCleanTimeline("), "before the read");
    assert.ok(roomPaste.indexOf("requireWrite()") < branch, "after the session check");
    // The split reads the joined roster and files through the pipeline's own
    // writers, with the door the capture came through.
    const grab = actions.slice(actions.indexOf("async function fileGrabCapture("), actions.indexOf("function refusal("));
    assert.match(grab, /planGrab\(rawText, await joinedRoster\(\), now\)/);
    for (const writer of ["claimCapture(", "releaseCapture(", "stampPasteMark(", "fileFiling(", "createAccountNoteRow("])
      assert.ok(grab.includes(writer), writer);
    assert.match(grab, /fileGrab\(\s*plan,\s*\{[\s\S]*?\},\s*door,?\s*\)/);
    assert.match(actions, /export async function roomGrab\(/);
    // The Chute tells a grab before it routes and hands it to the split.
    const chute = read("src/app/room/chute.tsx");
    const swallow = chute.slice(chute.indexOf("const swallow = async"), chute.indexOf("const batchSeq"));
    assert.ok(swallow.indexOf("isGrab(read.text)") > 0, "the Chute tells a grab");
    assert.ok(swallow.indexOf("isGrab(read.text)") < swallow.indexOf("routed(read.text)"), "before the route");
    assert.match(read("src/app/room/ingest/use-ingest.ts"), /await roomGrab\(/);
  });
});
