// The access read runs once per request (the dead-code ledger, G1; ruled KEEP
// 2026-09-25: "the per-request read is memoized with React's cache()").
// getAppAccess upserts the user row, and one page load reached it four to six
// times: the page, its loaders, the layout's pad and presence, and every
// server action's write gate. React's cache shares the first call's answer for
// the rest of the request. Outside a request the cache is a pass-through, as
// src/lib/ingest/route.ts says of joinedRoster, so the suite cannot observe
// the memo by calling it; it reads the module's wiring instead, as
// tests/ingest-route.test.ts pins joinedRoster's one read.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

describe("getAppAccess runs once per request (G1, the KEEP ruling)", () => {
  const src = readFileSync("src/lib/auth.ts", "utf8");

  test("it is React's request cache over the one read", () => {
    assert.match(src, /^import \{ cache \} from "react";$/m);
    assert.match(src, /^export const getAppAccess = cache\(readAppAccess\);$/m);
  });

  test("the uncached read is the module's own, never exported", () => {
    assert.match(src, /^async function readAppAccess\(\): Promise<AppAccess> \{$/m);
    assert.ok(!/export async function (getAppAccess|readAppAccess)\b/.test(src));
  });

  test("the user upsert lives inside the cached read, once", () => {
    assert.equal((src.match(/\.user\.upsert\(/g) ?? []).length, 1);
    const read = src.slice(
      src.indexOf("async function readAppAccess("),
      src.indexOf("export const getAppAccess = cache("),
    );
    assert.ok(read.includes(".user.upsert("), "the upsert runs outside the memo");
  });
});
