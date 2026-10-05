// The vault's arithmetic — lanes, names, tags, and the release face — pure
// and pinned. The wire calls live on the server since slice 7 (D8 as amended
// 2026-10-05); what the suite proves is that every decision AROUND them is
// deterministic and canon-clean, and the wire itself is scripted so the
// order of the calls can be read back. The row's and the Chute's own
// decisions are pure too (src/lib/room/drop-plan.ts,
// src/app/room/chute-ledger.ts) and their faces render here; no assertion
// reads a source file.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import {
  ARCHIVE_LIMIT_BYTES,
  archiveFileToGitHub,
  laneFor,
  releaseMetaFor,
  sanitizeSegment,
  tagFor,
} from "../src/lib/github/archive";
import { readFileToText } from "../src/app/room/read-file";
import { DROP_ACCEPT, readerFor } from "../src/lib/paste-files";
import { routeCapture, type RouteAccount } from "../src/lib/route-capture";
import { splitDrop, vaultAfterVerdict } from "../src/lib/room/drop-plan";
import { loadLedger, saveLedger, storedRow, type LedgerRow } from "../src/app/room/chute-ledger";
import { chute, render, roomClient, roomRow, textOf } from "./helpers/room-render";

test("the lane is size alone: repo file, pre-release, or refused", () => {
  assert.equal(laneFor(1), "file");
  assert.equal(laneFor(ARCHIVE_LIMIT_BYTES), "file");
  assert.equal(laneFor(ARCHIVE_LIMIT_BYTES + 1), "release");
  assert.equal(laneFor(2 * 1024 * 1024 * 1024), "release");
  assert.equal(laneFor(2 * 1024 * 1024 * 1024 + 1), "too-big");
});

test("the folder is named by the account, readably", () => {
  assert.equal(
    sanitizeSegment("Staff Leasing Of Central New York, Inc."),
    "Staff Leasing Of Central New York, Inc",
  );
  assert.equal(
    sanitizeSegment("M&M Sales & Outsourcing, Inc."),
    "M&M Sales & Outsourcing, Inc",
  );
  assert.equal(sanitizeSegment('a/b\\c:d*e?f"g<h>i|j#k%l'), "a-b-c-d-e-f-g-h-i-j-k-l");
  assert.equal(sanitizeSegment("  .hidden.  "), "hidden");
  assert.equal(sanitizeSegment(""), "unnamed");
});

test("tags are machine-safe and unique by the second", () => {
  const when = new Date(Date.UTC(2026, 8, 2, 14, 30, 5));
  assert.equal(
    tagFor("Staff Leasing Of Central New York, Inc.", when),
    "acct-staff-leasing-of-central-new-york-inc-20260902-143005",
  );
  const later = new Date(Date.UTC(2026, 8, 2, 14, 30, 6));
  assert.notEqual(tagFor("Same Account", when), tagFor("Same Account", later));
});

test("the release face carries tag, title, description, and pre-release", () => {
  const meta = releaseMetaFor({
    account: "Pinnacle Employee Services, Inc.",
    fileName: "quarterly-call.mp4",
    bytes: 480_000_000,
    when: new Date(Date.UTC(2026, 8, 2, 9, 0, 0)),
  });
  assert.equal(meta.prerelease, true);
  assert.ok(meta.tag_name.startsWith("acct-pinnacle-employee-services-inc-"));
  // The title names the account and the file; the body carries the file and
  // the day it was dropped. What the face says beyond that is its own.
  assert.ok(meta.name.includes("Pinnacle Employee Services, Inc."));
  assert.ok(meta.name.includes("quarterly-call.mp4"));
  assert.ok(meta.body.includes("quarterly-call.mp4"));
  assert.ok(meta.body.includes("2026-09-02"));
});


const memory = (): { getItem(k: string): string | null; setItem(k: string, v: string): void } => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

test("the row picker takes every file type; the reader keeps its own gate", async () => {
  // The vault input on the row carries no accept filter and takes several at
  // once — read off the row as the browser paints it.
  const room = await roomClient();
  const board = await render(
    createElement(room.RoomClient, {
      rows: [roomRow()],
      cadence: [],
      checkins: [],
      followUps: [],
      warming: [],
      later: [],
      canWrite: true,
      dbUnavailable: false,
      boardNames: [],
      pipeline: [],
      pipelineDay: "",
      pipelineStale: "",
    }),
  );
  const inputs = board.match(/<input[^>]*type="file"[^>]*>/g) ?? [];
  assert.equal(inputs.length, 1, "one file input per row");
  assert.ok(!/accept=/.test(inputs[0]), "the vault input carries no accept filter");
  assert.ok(/\smultiple(=""|\s|\/|>)/.test(inputs[0]), "the vault input takes several");
  // The reader's gate is its own: a type it cannot read is refused before
  // any read is spent, and a readable one comes back as paste text.
  let reads = 0;
  const readPdf = async () => {
    reads++;
    return { ok: false, reason: "unscripted" };
  };
  assert.equal(readerFor("quarterly-call.mp4"), "unsupported");
  const video = await readFileToText(
    new File(["not text"], "quarterly-call.mp4"),
    readPdf,
  );
  assert.equal(video.ok, false);
  const mail = await readFileToText(
    new File(
      ["From: dana@simploy.com\nSubject: Renewal\n\nThe board meets Thursday."],
      "renewal.eml",
    ),
    readPdf,
  );
  assert.ok(mail.ok);
  if (mail.ok) assert.match(mail.text, /^OUTLOOK THREAD/);
  assert.equal(reads, 0);
});

test("the vault's doors answer behind the auth gate and never carry the token, and the row wires the vault", async () => {
  // No signed-in session, no landing — whatever the environment holds.
  // Outside a request there is no cookie to read, so each door refuses or
  // throws; either way nothing carrying the token comes back. The grant that
  // once rode to the browser retired with src/app/room/archive-actions.ts
  // (slice 7; D8 as amended 2026-10-05): the subjects are the doors' own
  // returns, vaultFile's and vaultChunk's.
  const { vaultChunk, vaultFile } = await import("../src/app/room/vault-actions");
  const prevRepo = process.env.GITHUB_ARCHIVE_REPO;
  const prevToken = process.env.GITHUB_ARCHIVE_TOKEN;
  process.env.GITHUB_ARCHIVE_REPO = "o/vault";
  process.env.GITHUB_ARCHIVE_TOKEN = "env-token-that-must-not-ride";
  try {
    const refused = () => ({ ok: false as const, reason: "no request scope" });
    const form = new FormData();
    form.set("file", new File(["WEBVTT"], "call.vtt"), "call.vtt");
    const whole = await vaultFile("001F000000w38BOIAY", form).then((x) => x, refused);
    assert.equal(whole.ok, false);
    assert.ok(!JSON.stringify(whole).includes("env-token-that-must-not-ride"));
    const piece = await vaultChunk("001F000000w38BOIAY", "big.mp4", 0, 3, form).then(
      (x) => x,
      refused,
    );
    assert.equal(piece.ok, false);
    assert.ok(!JSON.stringify(piece).includes("env-token-that-must-not-ride"));
  } finally {
    if (prevRepo === undefined) delete process.env.GITHUB_ARCHIVE_REPO;
    else process.env.GITHUB_ARCHIVE_REPO = prevRepo;
    if (prevToken === undefined) delete process.env.GITHUB_ARCHIVE_TOKEN;
    else process.env.GITHUB_ARCHIVE_TOKEN = prevToken;
  }
  // And the row wires it: every dropped file archives automatically — the
  // unreadable ones at once, each readable one the moment its own filing is
  // accepted (the guard gates the vault, 2026-09-03). Every readable file is
  // read (bug 2, closed in slice 8); only what the reader cannot open goes
  // straight to the vault. The whiteboard screenshot is an image the
  // transcriber reads, so it waits on its filing like the tape does.
  const vtt = new File(["WEBVTT"], "call.vtt");
  const mp4 = new File([new Uint8Array(8)], "call.mp4");
  const png = new File([new Uint8Array(8)], "whiteboard.png");
  const split = splitDrop([mp4, vtt, png], DROP_ACCEPT);
  assert.equal(split.readable, vtt);
  assert.deepEqual(split.readables, [vtt, png]);
  assert.deepEqual(split.unreadable, [mp4]);
  assert.deepEqual(vaultAfterVerdict({ ok: true }, [vtt]).archive, [vtt]);
  assert.deepEqual(
    vaultAfterVerdict({ ok: false, mismatch: { claim: "Simploy" } }, [vtt]).archive,
    [],
  );
});

// ── every chute vaults (founder-decreed 2026-09-02) ─────────────────────────
// Recordings and VTTs drop at ANY door — the row, the HomeRoom Chute, the
// Intranet — and land in the vault under their account. A binary the reader
// can't open routes by its filename or waits for the operator's pick; it is
// never bounced with a can't-read error.

test("the chute vaults every drop and routes binaries by filename or pick", async () => {
  // An unreadable file routes by its filename — a Teams recording usually
  // carries the meeting's name — and otherwise falls to the pick with no
  // candidate to suggest.
  const roster: RouteAccount[] = [
    { id: "S", name: "Simploy", emails: [], domains: [], people: [] },
    { id: "R", name: "Regis HR Group", emails: [], domains: [], people: [] },
  ];
  const named = routeCapture(
    "Simploy discovery-20260902_1801-Meeting Recording.mp4",
    roster,
  );
  assert.equal(named.best?.id, "S");
  assert.equal(named.best?.rung, "name");
  const bare = routeCapture("GMT20260902-180135_Recording.mp4", roster);
  assert.equal(bare.best, null);
  assert.deepEqual(bare.candidates, []);
  // A readable file vaults AFTER it files, to the same account: the Chute
  // runs the row's own verdict gate, so an accepted filing releases the file,
  // a duplicate vaults nothing new, and a dispute keeps it for the pick.
  const vtt = new File(["WEBVTT"], "Simploy discovery.vtt");
  const accepted = { ok: true, filed: 2, how: "ai" };
  const duplicate = { ok: false, filed: 0, how: "", duplicate: true };
  const disputed = { ok: false, mismatch: { claim: "Simploy", bound: "Regis HR Group" } };
  assert.deepEqual(vaultAfterVerdict(accepted, [vtt]).archive, [vtt]);
  assert.deepEqual(vaultAfterVerdict(duplicate, [vtt]).archive, []);
  assert.deepEqual(vaultAfterVerdict(disputed, [vtt]), { archive: [], hold: [vtt] });
  // The picker takes every type — no accept filter on the chute's input. The
  // mount is propless but for canWrite: the roster never ships to the browser
  // (D12), the route runs on the server (slice 7).
  const { Chute } = await chute();
  const bar = await render(createElement(Chute, { canWrite: true }));
  const input = /<input[^>]*type="file"[^>]*>/.exec(bar)?.[0] ?? "";
  assert.ok(input, "the Chute paints a file input");
  assert.ok(!/accept=/.test(input), "no accept filter on the chute's input");
  assert.ok(/\smultiple(=""|\s|\/|>)/.test(input));
  assert.ok(textOf(bar).includes("⇪ Files"));
  // The dropped File never persists to the ledger: the codec (chute-ledger.ts,
  // since the 2026-09-25 rulings) names every stored field and `file` is not
  // one of them, so a binary waiting on the pick comes back after a reload
  // saying to drop it again.
  const waiting = {
    key: 1,
    filename: "GMT20260902-180135_Recording.mp4",
    state: "pick",
    candidates: [],
    file: vtt,
  } as LedgerRow & { file: File };
  assert.ok(!("file" in storedRow(waiting)), "the ledger row must not carry the File");
  const storage = memory();
  saveLedger([waiting], storage);
  const back = loadLedger(storage);
  assert.equal(back.items.length, 1);
  assert.ok(!("file" in back.items[0]));
  assert.equal(back.items[0].state, "interrupted");
  assert.match(back.items[0].reason ?? "", /Drop the file again/);
});

// ── the wire, scripted ──────────────────────────────────────────────────────
// A Simploy VTT landed in the vault while the row said "GitHub was
// unreachable. The file did not archive." — the PUT committed and the reply
// died on the way back, and the old blanket catch guessed a failure it could
// not know (2026-09-02). These runs script the wire and read the calls back:
// what was asked of GitHub, in what order, with which credential.

type FakeStep = { status?: number; body?: unknown } | { throws: string };
type Call = { method: string; url: string; body: string; auth: string };
const scriptFetch = (steps: FakeStep[], log: string[], calls: Call[] = []) =>
  (async (
    url: unknown,
    init?: { method?: string; body?: unknown; headers?: Record<string, string> },
  ) => {
    const method = init?.method ?? "GET";
    log.push(`${method} ${String(url)}`);
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
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => s.body ?? {},
    };
  }) as unknown as typeof fetch;

const grant = { repo: "o/vault", token: "t" };

test("a release drafts first and publishes only after the asset lands", async () => {
  const real = globalThis.fetch;
  const calls: Call[] = [];
  globalThis.fetch = scriptFetch(
    [
      {
        status: 201,
        body: {
          upload_url: "https://uploads.github.com/repos/o/vault/releases/9/assets{?name}",
          url: "https://api.github.com/repos/o/vault/releases/9",
        },
      },
      { status: 200 }, // the asset lands
      { status: 200, body: { html_url: "https://github.com/o/vault/releases/tag/x" } },
    ],
    [],
    calls,
  );
  try {
    const r = await archiveFileToGitHub({
      file: new File([new Uint8Array(ARCHIVE_LIMIT_BYTES + 1)], "big.mp4"),
      accountName: "Simploy",
      grant,
    });
    assert.ok(r.ok, JSON.stringify(r));
    if (r.ok) {
      assert.equal(r.kind, "release");
      assert.equal(r.url, "https://github.com/o/vault/releases/tag/x");
    }
    // Created invisible, the binary uploaded into it, then flipped public —
    // in that order, and nothing deleted along the way.
    assert.deepEqual(
      calls.map((c) => c.method),
      ["POST", "POST", "PATCH"],
    );
    assert.equal(calls[0].url, "https://api.github.com/repos/o/vault/releases");
    assert.equal(JSON.parse(calls[0].body).draft, true);
    assert.ok(
      calls[1].url.startsWith(
        "https://uploads.github.com/repos/o/vault/releases/9/assets?name=",
      ),
    );
    assert.equal(calls[2].url, "https://api.github.com/repos/o/vault/releases/9");
    assert.equal(JSON.parse(calls[2].body).draft, false);
  } finally {
    globalThis.fetch = real;
  }
});

test("the credential on the wire is the grant's, never the environment's", async () => {
  // The lib never reads env: a token in the environment must not ride, only
  // the grant the server handed the browser.
  const real = globalThis.fetch;
  const envToken = process.env.GITHUB_ARCHIVE_TOKEN;
  process.env.GITHUB_ARCHIVE_TOKEN = "env-token-that-must-not-ride";
  const calls: Call[] = [];
  globalThis.fetch = scriptFetch(
    [
      { status: 404 }, // name probe: free
      {
        status: 201,
        body: { content: { html_url: "https://github.com/o/vault/blob/x" } },
      },
    ],
    [],
    calls,
  );
  try {
    const r = await archiveFileToGitHub({
      file: new File(["WEBVTT"], "call.vtt"),
      accountName: "Simploy",
      grant,
    });
    assert.ok(r.ok, JSON.stringify(r));
    assert.equal(calls.length, 2);
    for (const c of calls) assert.equal(c.auth, "Bearer t");
  } finally {
    globalThis.fetch = real;
    if (envToken === undefined) delete process.env.GITHUB_ARCHIVE_TOKEN;
    else process.env.GITHUB_ARCHIVE_TOKEN = envToken;
  }
});

test("a thrown PUT whose file actually landed reports the landing", async () => {
  const real = globalThis.fetch;
  const log: string[] = [];
  globalThis.fetch = scriptFetch(
    [
      { status: 404 }, // name probe: free
      { throws: "fetch failed" }, // PUT: reply lost AFTER the commit
      { status: 200, body: { html_url: "https://github.com/o/vault/blob/x" } },
    ],
    log,
  );
  try {
    const r = await archiveFileToGitHub({
      file: new File(["WEBVTT"], "call.vtt"),
      accountName: "Simploy",
      grant,
    });
    assert.ok(r.ok, JSON.stringify(r));
    if (r.ok) {
      assert.equal(r.kind, "file");
      assert.equal(r.url, "https://github.com/o/vault/blob/x");
      assert.ok(r.detail.includes("accounts/Simploy/call.vtt"));
    }
    // The catch asked the vault before it said anything: a GET of the same
    // path the PUT was writing, after the PUT died.
    const path =
      "https://api.github.com/repos/o/vault/contents/accounts/Simploy/call.vtt";
    assert.deepEqual(log, [`GET ${path}`, `PUT ${path}`, `GET ${path}`]);
  } finally {
    globalThis.fetch = real;
  }
});

test("a thrown PUT with nothing in the vault reports the real error", async () => {
  const real = globalThis.fetch;
  globalThis.fetch = scriptFetch(
    [{ status: 404 }, { throws: "fetch failed" }, { status: 404 }],
    [],
  );
  try {
    const r = await archiveFileToGitHub({
      file: new File(["WEBVTT"], "call.vtt"),
      accountName: "Simploy",
      grant,
    });
    assert.ok(!r.ok);
    if (!r.ok) assert.ok(r.reason.includes("fetch failed"), r.reason);
  } finally {
    globalThis.fetch = real;
  }
});

test("a mid-upload break with no published release clears the draft", async () => {
  const real = globalThis.fetch;
  const log: string[] = [];
  globalThis.fetch = scriptFetch(
    [
      {
        status: 201,
        body: {
          upload_url: "https://uploads.github.com/repos/o/vault/releases/9/assets{?name}",
          url: "https://api.github.com/repos/o/vault/releases/9",
        },
      },
      { throws: "network reset" }, // the asset upload dies
      { status: 404 }, // tag probe: nothing published
      { status: 204 }, // the hollow draft is deleted
    ],
    log,
  );
  try {
    const r = await archiveFileToGitHub({
      file: new File([new Uint8Array(ARCHIVE_LIMIT_BYTES + 1)], "big.mp4"),
      accountName: "Simploy",
      grant,
    });
    assert.ok(!r.ok);
    if (!r.ok) assert.ok(r.reason.includes("network reset"), r.reason);
    assert.ok(
      log.some((l) => l === "DELETE https://api.github.com/repos/o/vault/releases/9"),
      log.join("\n"),
    );
  } finally {
    globalThis.fetch = real;
  }
});

