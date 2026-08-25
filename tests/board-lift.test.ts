// The board's word outranks the hand-edited seed (founder-decreed
// 2026-08-21): an account on the dashboard is cleared with the CSM and
// touched. The lift only ever advances — a real stage never drags back.

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { boardLift } from "../src/lib/command-center/types";

describe("the board lift", () => {
  test("a dashboard account never reads NOT_TOUCHED or NEEDS_CSM", () => {
    const lifted = boardLift("NOT_TOUCHED", "NEEDS_CSM");
    assert.equal(lifted.stage, "CSM_BRIEFED");
    assert.equal(lifted.approach, "CHANNEL_OK");
  });

  test("a real stage and a wider clearance stand — the lift never demotes", () => {
    assert.deepEqual(boardLift("DEMO", "DIRECT_OK"), {
      stage: "DEMO",
      approach: "DIRECT_OK",
    });
    assert.deepEqual(boardLift("WON", "NEEDS_CSM"), {
      stage: "WON",
      approach: "CHANNEL_OK",
    });
    assert.deepEqual(boardLift("NOT_TOUCHED", "DIRECT_OK"), {
      stage: "CSM_BRIEFED",
      approach: "DIRECT_OK",
    });
  });
});
