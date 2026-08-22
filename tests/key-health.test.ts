// The key-health latch (founder-decreed 2026-08-22): the app's instinct is
// always the API; a key that proves dead (invalid, out of credits) flips
// one latch and every availability gate app-wide takes its fallback. A
// transient failure never latches, and any success clears it.

import { strict as assert } from "node:assert";
import { beforeEach, describe, test } from "node:test";
import {
  claudeAvailable,
  claudeConfigured,
  claudeDead,
  markClaudeDown,
  markClaudeUp,
  noteClaudeFailure,
} from "../src/lib/claude/health";

describe("the key-health latch", () => {
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    markClaudeUp();
  });

  test("a configured key with no failures is available", () => {
    assert.equal(claudeConfigured(), true);
    assert.equal(claudeDead(), false);
    assert.equal(claudeAvailable(), true);
  });

  test("no key configured is never available, latch or not", () => {
    delete process.env.ANTHROPIC_API_KEY;
    assert.equal(claudeAvailable(), false);
  });

  test("an auth error latches — the whole app goes keyless", () => {
    assert.equal(noteClaudeFailure({ status: 401 }), true);
    assert.equal(claudeDead(), true);
    assert.equal(claudeAvailable(), false);
  });

  test("the invalid x-api-key message latches without a status", () => {
    assert.equal(
      noteClaudeFailure(new Error("authentication_error: invalid x-api-key")),
      true,
    );
    assert.equal(claudeAvailable(), false);
  });

  test("an empty credit balance latches", () => {
    assert.equal(
      noteClaudeFailure(
        new Error("Your credit balance is too low to access the Anthropic API."),
      ),
      true,
    );
    assert.equal(claudeAvailable(), false);
  });

  test("transient trouble never latches", () => {
    assert.equal(noteClaudeFailure({ status: 429 }), false);
    assert.equal(noteClaudeFailure(new Error("overloaded_error")), false);
    assert.equal(noteClaudeFailure(new Error("fetch failed")), false);
    assert.equal(claudeAvailable(), true);
  });

  test("a success clears the latch", () => {
    markClaudeDown();
    assert.equal(claudeAvailable(), false);
    markClaudeUp();
    assert.equal(claudeAvailable(), true);
  });
});
