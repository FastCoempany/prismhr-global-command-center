// The identity-linked key gate. An identity-linked API key names no workspace
// of its own, so every call must carry anthropic-workspace-id. Until this
// existed the API answered that condition with "your credit balance is too
// low" — and the operator spent an evening funding an account that was never
// short (2026-09-01).

import { test } from "node:test";
import assert from "node:assert/strict";
import { noteClaudeFailure, workspaceHeaders } from "../src/lib/claude/health";

const withEnv = (v: string | undefined, f: () => void) => {
  const had = process.env.ANTHROPIC_WORKSPACE_ID;
  if (v === undefined) delete process.env.ANTHROPIC_WORKSPACE_ID;
  else process.env.ANTHROPIC_WORKSPACE_ID = v;
  try {
    f();
  } finally {
    if (had === undefined) delete process.env.ANTHROPIC_WORKSPACE_ID;
    else process.env.ANTHROPIC_WORKSPACE_ID = had;
  }
};

test("the workspace header rides only when a workspace is configured", () => {
  // A classic workspace key names its own workspace — nothing is added, so
  // the app behaves exactly as it did before this shipped.
  withEnv(undefined, () => assert.deepEqual(workspaceHeaders(), {}));
  withEnv("   ", () => assert.deepEqual(workspaceHeaders(), {}));
  withEnv("wrkspc_01ABC", () =>
    assert.deepEqual(workspaceHeaders(), { "anthropic-workspace-id": "wrkspc_01ABC" }),
  );
  // Pasted out of the console with a stray newline — still a valid id.
  withEnv(" wrkspc_01ABC\n", () =>
    assert.deepEqual(workspaceHeaders(), { "anthropic-workspace-id": "wrkspc_01ABC" }),
  );
});

test("a missing workspace id latches the key dead instead of retrying forever", () => {
  // It arrives as a 400, not a 401, so without naming it the run read the
  // failure as transient and paid a doomed call for every account in turn.
  assert.equal(
    noteClaudeFailure(
      new Error(
        'anthropic-workspace-id is required when authenticating with an identity-linked API key; send the id of the workspace this request acts in.',
      ),
    ),
    true,
  );
  // The old classifications still hold.
  assert.equal(noteClaudeFailure(new Error("Your credit balance is too low")), true);
  assert.equal(noteClaudeFailure({ status: 401 }), true);
  // And a real hiccup still never latches.
  assert.equal(noteClaudeFailure(new Error("overloaded_error")), false);
  assert.equal(noteClaudeFailure({ status: 429 }), false);
});
