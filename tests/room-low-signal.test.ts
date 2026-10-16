// Low signal (founder's order, 2026-10-16): above the closed ledger, a LOW
// SIGNAL section holds the deals that aren't in the operator's Salesforce
// pipeline; a row's ⇣ sends it there and its ↺ brings it back; the closed
// ledger hides and shows as a whole. These read the board's first paint and
// the pure helpers the page sorts with.

import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { createElement } from "react";
import { classesOf, render, roomClient, roomRow, textOf } from "./helpers/room-render";
import {
  boardGroup,
  GROUP_ORDER,
  LOW_SIGNAL_NS,
  lowSignalKey,
} from "../src/lib/room/low-signal";
import { ledgerExclusions } from "../src/lib/groundwork/day";

const room = await roomClient();

const board = (rows: ReturnType<typeof roomRow>[]) =>
  render(
    createElement(room.RoomClient, {
      rows,
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

const LIVE = roomRow({ accountId: "001LIVE", cardId: "card-live", name: "Live PEO" });
const LOW_A = roomRow({
  accountId: "001LOWA",
  cardId: "card-lowa",
  name: "Quiet PEO",
  lowSignal: true,
});
const LOW_B = roomRow({
  accountId: "001LOWB",
  cardId: "",
  name: "Offboard PEO",
  stages: [],
  lowSignal: true,
});
const CLOSED = roomRow({
  accountId: "001DONE",
  cardId: "card-done",
  name: "Done PEO",
  outcome: { status: "won", phrase: "", at: "2026-10-01T15:00:00Z" },
});

describe("the key and the order", () => {
  test("the mark keys by account, falls back to the card, and is namespaced", () => {
    assert.equal(lowSignalKey({ accountId: "001A", cardId: "c1" }), "lowsig:001A");
    assert.equal(lowSignalKey({ accountId: "", cardId: "c1" }), "lowsig:card:c1");
    assert.ok(LOW_SIGNAL_NS.endsWith(":"));
  });

  test("Groundwork never reads the mark: a namespaced key is not an account", () => {
    const out = ledgerExclusions(
      new Map([[lowSignalKey({ accountId: "001A", cardId: "" }), { status: "parked" }]]),
      [],
    );
    assert.equal(out.size, 0);
  });

  test("a stamped outcome outranks the mark; live, then low, then closed", () => {
    assert.equal(boardGroup({ outcome: null }), "live");
    assert.equal(boardGroup({ outcome: null, lowSignal: true }), "low");
    assert.equal(boardGroup({ outcome: { status: "won" }, lowSignal: true }), "closed");
    assert.ok(GROUP_ORDER.live < GROUP_ORDER.low && GROUP_ORDER.low < GROUP_ORDER.closed);
  });
});

describe("the board's sections", () => {
  test("LOW SIGNAL opens once, after the live book and above the closed ledger", async () => {
    const html = await board([LIVE, LOW_A, LOW_B, CLOSED]);
    const text = textOf(html);
    assert.equal(
      text.split("LOW SIGNAL · 2 · NOT IN YOUR SALESFORCE PIPELINE").length - 1,
      1,
    );
    assert.equal(text.split("CLOSED · 1 · THE RECORD KEEPS EVERYTHING").length - 1, 1);
    const at = (s: string) => text.indexOf(s);
    assert.ok(at("Live PEO") < at("LOW SIGNAL ·"));
    assert.ok(at("LOW SIGNAL ·") < at("Quiet PEO"));
    assert.ok(at("Offboard PEO") < at("CLOSED · 1"));
    assert.ok(at("CLOSED · 1") < at("Done PEO"));
  });

  test("no low-signal row, no LOW SIGNAL rule; no closed row, no CLOSED rule", async () => {
    const text = textOf(await board([LIVE]));
    assert.ok(!text.includes("LOW SIGNAL"));
    assert.ok(!text.includes("CLOSED ·"));
  });

  test("the low-signal row recedes as its own class; the closed row keeps the ledger's", async () => {
    const html = await board([LIVE, LOW_A, CLOSED]);
    const cls = classesOf(html);
    assert.ok(cls.includes("rowLow"));
    assert.ok(cls.includes("rowClosed"));
    assert.ok(cls.includes("lowRule"));
    assert.ok(!cls.includes("undefined"), "every class the board asks for exists");
  });

  test("the closed ledger paints shown, with one word that hides it", async () => {
    const html = await board([LIVE, CLOSED]);
    const toggle = html.match(/<button[^>]*class="ruleToggle"[^>]*>([^<]*)<\/button>/);
    assert.ok(toggle, "the closed rule carries its toggle");
    assert.equal(toggle[1], "HIDE");
    assert.match(toggle[0], /title="Hide the closed deals"/);
    assert.match(toggle[0], /aria-expanded="true"/);
    assert.ok(textOf(html).includes("Done PEO"), "the server paints the ledger shown");
  });

  test("the low-signal section has no toggle of its own", async () => {
    const html = await board([LIVE, LOW_A]);
    assert.ok(!html.includes('class="ruleToggle"'));
  });

  test("the legend keys ⇣ once, at the foot", async () => {
    const text = textOf(await board([LIVE, LOW_A, CLOSED]));
    assert.equal(text.split("⇣ low signal").length - 1, 1);
  });
});
