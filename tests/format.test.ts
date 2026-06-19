import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { formatContributingSignal, humanizeEnum } from "@/lib/format";

describe("format helpers", () => {
  test("humanizes enum values", () => {
    assert.equal(humanizeEnum("CSM_CONTEXT_NEEDED"), "Csm Context Needed");
  });

  test("formats HML contributing signal tags for operators", () => {
    assert.equal(
      formatContributingSignal("motion_gate:channel_only"),
      "Safe motion: Channel path needed",
    );
    assert.equal(formatContributingSignal("research_score:73"), "Research score: 73");
    assert.equal(
      formatContributingSignal("source_confidence:STRONG"),
      "Source confidence: Strong",
    );
  });

  test("does not expose raw fallback tags with underscores", () => {
    assert.equal(
      formatContributingSignal("ownership_unclear_requires_verification"),
      "Ownership Unclear Requires Verification",
    );
  });
});
