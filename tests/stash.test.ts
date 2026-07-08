import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanText, microNote, sharpen, isStashLane, STASH_LANES } from "../src/lib/stash/summarize";

test("cleanText collapses whitespace and newlines", () => {
  assert.equal(cleanText("  a\n b\t c  "), "a b c");
  assert.equal(cleanText(""), "");
});

test("microNote keeps short text intact", () => {
  assert.equal(microNote("Call Bryce back about salaries"), "Call Bryce back about salaries");
});

test("microNote clips long text at a word boundary with an ellipsis", () => {
  const long =
    "subhub deal has twelve workers at least one of whom is working in Spain not Bulgaria and salaries are still to be confirmed";
  const out = microNote(long);
  assert.ok(out.length <= 91, `expected <=91, got ${out.length}`);
  assert.ok(out.endsWith("…"), "truncated note should end with an ellipsis");
  assert.ok(!/ $/.test(out.slice(0, -1)), "no trailing space before the ellipsis");
  assert.ok(long.startsWith(out.slice(0, -1)), "clip is a prefix of the original");
});

test("microNote does not add an ellipsis when nothing is truncated", () => {
  assert.ok(!microNote("short note").endsWith("…"));
});

test("sharpen strips spoken filler", () => {
  const out = sharpen("um so basically we just really need to like confirm the deposit");
  assert.ok(!/\b(um|basically|just|really|like)\b/i.test(out), `filler survived: ${out}`);
  assert.ok(/confirm the deposit/i.test(out));
});

test("sharpen drops a leading conjunction and sentence-cases", () => {
  const out = sharpen("and then send Eric the book map");
  assert.ok(/^Then send Eric the book map/.test(out), out);
});

test("sharpen falls back to microNote when everything was filler", () => {
  const out = sharpen("um uh like you know");
  assert.equal(out, microNote("um uh like you know"));
});

test("sharpen is deterministic", () => {
  const input = "so basically we um need to really follow up with the partner";
  assert.equal(sharpen(input), sharpen(input));
});

test("isStashLane guards the three lanes", () => {
  assert.ok(isStashLane("todo"));
  assert.ok(isStashLane("follow"));
  assert.ok(isStashLane("gap"));
  assert.ok(!isStashLane("nope"));
  assert.ok(!isStashLane(""));
});

test("STASH_LANES covers the three lanes in order", () => {
  assert.deepEqual(
    STASH_LANES.map((l) => l.key),
    ["todo", "follow", "gap"],
  );
});
