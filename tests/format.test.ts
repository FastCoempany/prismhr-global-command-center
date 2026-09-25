import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { humanizeEnum } from "@/lib/format";

describe("format helpers", () => {
  test("humanizes enum values", () => {
    assert.equal(humanizeEnum("CSM_CONTEXT_NEEDED"), "Csm Context Needed");
  });
});
