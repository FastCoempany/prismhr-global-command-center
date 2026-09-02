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
