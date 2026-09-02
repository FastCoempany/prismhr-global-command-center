// The vault's arithmetic — lanes, names, tags, and the release face — pure
// and pinned. The wire calls live in the browser; what the suite proves is
// that every decision AROUND them is deterministic and canon-clean.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import {
  ARCHIVE_LIMIT_BYTES,
  archiveFileToGitHub,
  laneFor,
  releaseMetaFor,
  sanitizeSegment,
  tagFor,
} from "../src/lib/github/archive";

test("the lane is size alone: repo file, pre-release, or refused", () => {
  assert.equal(laneFor(1), "file");
  assert.equal(laneFor(ARCHIVE_LIMIT_BYTES), "file");
  assert.equal(laneFor(ARCHIVE_LIMIT_BYTES + 1), "release");
  assert.equal(laneFor(2 * 1024 * 1024 * 1024), "release");
  assert.equal(laneFor(2 * 1024 * 1024 * 1024 + 1), "too-big");
});

test("the folder is named by the account, readably", () => {
  assert.equal(sanitizeSegment("Staff Leasing Of Central New York, Inc."),
    "Staff Leasing Of Central New York, Inc");
  assert.equal(sanitizeSegment("M&M Sales & Outsourcing, Inc."),
    "M&M Sales & Outsourcing, Inc");
  assert.equal(sanitizeSegment("a/b\\c:d*e?f\"g<h>i|j#k%l"), "a-b-c-d-e-f-g-h-i-j-k-l");
  assert.equal(sanitizeSegment("  .hidden.  "), "hidden");
  assert.equal(sanitizeSegment(""), "unnamed");
});

test("tags are machine-safe and unique by the second", () => {
  const when = new Date(Date.UTC(2026, 8, 2, 14, 30, 5));
  assert.equal(tagFor("Staff Leasing Of Central New York, Inc.", when),
    "acct-staff-leasing-of-central-new-york-inc-20260902-143005");
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
  assert.equal(meta.name, "Pinnacle Employee Services, Inc. — quarterly-call.mp4");
  assert.ok(meta.body.includes("quarterly-call.mp4"));
  assert.ok(meta.body.includes("Dropped: 2026-09-02"));
});

test("a release drafts first and publishes only after the asset lands", () => {
  const root = cwd();
  const lib = readFileSync(join(root, "src/lib/github/archive.ts"), "utf8");
  // Created invisible…
  assert.ok(lib.includes("draft: true"));
  // …published only on a confirmed upload…
  assert.ok(lib.includes("draft: false"));
  const publishAt = lib.indexOf("draft: false");
  const uploadAt = lib.indexOf("upload_url.split");
  assert.ok(uploadAt > 0 && publishAt > uploadAt, "publish must follow the upload");
  // …and a failed upload clears the empty draft rather than leaving a
  // hollow release behind.
  assert.ok(lib.includes('method: "DELETE"'));
});

test("the row picker takes every file type; the reader keeps its own gate", () => {
  const root = cwd();
  const client = readFileSync(join(root, "src/app/room/room-client.tsx"), "utf8");
  // The vault input carries no accept filter and takes several at once.
  assert.ok(!/ref=\{fileInputRef\}[\s\S]{0,120}accept=/.test(client));
  assert.ok(/ref=\{fileInputRef\}[\s\S]{0,120}multiple/.test(client));
  // Readable types still route to the record's reader.
  assert.ok(client.includes("readableExts"));
});

test("the token stays out of the bundle and behind the auth gate", () => {
  const root = cwd();
  const lib = readFileSync(join(root, "src/lib/github/archive.ts"), "utf8");
  assert.ok(!lib.includes("process.env"), "the client lib must never read env");
  const act = readFileSync(join(root, "src/app/room/archive-actions.ts"), "utf8");
  assert.ok(act.startsWith('"use server"'));
  assert.ok(act.includes("getAppAccess"));
  assert.ok(act.includes("canWrite"));
  // And the row wires it: every dropped file archives, automatically.
  const client = readFileSync(join(root, "src/app/room/room-client.tsx"), "utf8");
  assert.ok(client.includes("archiveFiles(files)"));
  assert.ok(client.includes("archiveFileToGitHub"));
});

// ── every chute vaults (founder-decreed 2026-09-02) ─────────────────────────
// Recordings and VTTs drop at ANY door — the row, the HomeRoom Chute, the
// Intranet — and land in the vault under their account. A binary the reader
// can't open routes by its filename or waits for the operator's pick; it is
// never bounced with a can't-read error.

test("the chute vaults every drop and routes binaries by filename or pick", () => {
  const root = cwd();
  const chute = readFileSync(join(root, "src/app/room/chute.tsx"), "utf8");
  // The vault ride exists and uses the same grant + carrier as the row.
  assert.ok(chute.includes("vaultTo"));
  assert.ok(chute.includes("archiveFileToGitHub"));
  assert.ok(chute.includes("githubArchiveGrant"));
  // An unreadable file routes by filename, then falls to the pick — the
  // error bounce is gone from that path.
  assert.ok(chute.includes("routeCapture(f.name, roster)"));
  assert.ok(chute.includes("Pick its account for the vault"));
  // A readable file vaults AFTER it files, to the same account.
  assert.ok(/r\.ok && srcFile.*vaultTo\(key, account, srcFile, false\)/.test(chute));
  // The picker takes every type — no accept filter on the chute's input.
  assert.ok(!chute.includes("accept={DROP_ACCEPT}"));
  // The dropped File never persists to the ledger.
  assert.ok(chute.includes('Omit<ChuteItem, "text" | "candidates" | "file">'));
});

// ── the lost reply is not a lost file (2026-09-02) ──────────────────────────
// A Simploy VTT landed in the vault while the row said "GitHub was
// unreachable. The file did not archive." — the PUT committed and the reply
// died on the way back, and the old blanket catch guessed a failure it could
// not know. These runs script the wire and pin the honest behavior: verify
// with the vault before claiming anything, and when it IS a failure, say the
// real error.

type FakeStep = { status?: number; body?: unknown } | { throws: string };
const scriptFetch = (steps: FakeStep[], log: string[]) =>
  (async (url: unknown, init?: { method?: string }) => {
    log.push(`${init?.method ?? "GET"} ${String(url)}`);
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
      assert.ok(r.detail.includes("landed"));
    }
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
    if (!r.ok) {
      assert.ok(r.reason.includes("fetch failed"), r.reason);
      assert.ok(r.reason.includes("Drop it again"));
      assert.ok(!r.reason.includes("unreachable"));
    }
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

test("the intranet carries the same chute", () => {
  const root = cwd();
  const page = readFileSync(join(root, "src/app/intranet/page.tsx"), "utf8");
  assert.ok(page.includes('import { Chute } from "../room/chute"'));
  assert.ok(page.includes("<Chute"));
});
