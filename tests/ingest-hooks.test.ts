// The shared door hooks (src/app/room/ingest; slice 8 of the Chute brains
// refactor plan), pinned on their pure reducers and on the one face state
// that renders without any state at all. The two faces stay two until the
// face pass (BLOCKED ON FACE), so what the suite proves here is the flow
// behind them: what a drop does with each file by door, what a pick asks of
// the server, what a held verdict carries, what the undo hands over, and
// what a read-only session sees.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import {
  DROP_CSV_RECEIPT,
  filingRequest,
  planDrop,
} from "../src/app/room/ingest/use-ingest";
import { holdVerdict, queueVerdict } from "../src/app/room/ingest/use-verdict";
import { undoRequest } from "../src/app/room/ingest/use-undo";
import { chute, render, textOf } from "./helpers/room-render";

const root = cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const eml = (name: string) =>
  new File([`From: a@x.example\nSubject: ${name}\n\nbody`], `${name}.eml`);
const mp4 = new File([new Uint8Array(8)], "call.mp4");
const csv = new File(["Date,Subject,Account\n2026-09-29,x,Simploy"], "activity.csv");

describe("the shared door's plan, by door", () => {
  test("two readable files on a row both reach the pipeline", () => {
    const [one, two] = [eml("one"), eml("two")];
    const plan = planDrop([one, mp4, two], "drop");
    assert.deepEqual(plan.read, [one, two], "every readable file is read, in drop order");
    assert.deepEqual(plan.vault, [mp4], "the recording goes to the vault alone");
    assert.deepEqual(plan.refused, []);
    // Each one files on its own, as this door.
    for (const f of plan.read) {
      const [, text, opts] = filingRequest("drop", "001", f.name);
      assert.equal(text, f.name);
      assert.equal(opts?.door, "drop", "the mounting door stamps the filing (P3)");
    }
    // The Chute reads the same drop the same way.
    assert.deepEqual(planDrop([one, mp4, two], "chute").read, [one, two]);
  });

  test("a refused .csv on the Drop is vaulted and not read, and its receipt names the Chute", () => {
    const drop = planDrop([csv, eml("one")], "drop");
    assert.deepEqual(drop.refused, [csv], "the export is refused before any read");
    assert.ok(!drop.read.includes(csv), "and never read on the row");
    assert.deepEqual(drop.vault, [], "it is not a binary; its receipt is its own");
    assert.equal(drop.read.length, 1, "the rest of the drop still files");
    // On the Chute the export is this door's to read for the book (D2).
    const onChute = planDrop([csv], "chute");
    assert.deepEqual(onChute.read, [csv]);
    assert.deepEqual(onChute.refused, []);
    // The receipt, verbatim (D2 as amended 2026-10-05), in the writing canon:
    // plain imperative sentences, the Chute named, no dash aside, no hedge.
    assert.equal(DROP_CSV_RECEIPT, "Not filed here. Backed up. Drop the export in the Chute.");
    assert.ok(DROP_CSV_RECEIPT.includes("Chute"));
    assert.ok(!/—|\(|consider|might|may be worth/i.test(DROP_CSV_RECEIPT));
  });
});

describe("the pick and the verdict", () => {
  test("a pick re-runs the filing with force, and only a pick", () => {
    const windows = [{ what: "the document", read: 60000, of: 80000 }];
    assert.deepEqual(filingRequest("chute", "001", "text", { force: true, windows }), [
      "001",
      "text",
      { force: true, door: "chute", windows },
    ]);
    // An auto-route files without force; the guard gets its say.
    const [, , plain] = filingRequest("drop", "001", "text");
    assert.equal(plain?.force, false);
    assert.equal(plain?.door, "drop");
    assert.equal(plain?.windows, undefined);
  });

  test("each verdict carries its reason, at either rung", () => {
    const text = holdVerdict(
      {
        mismatch: { claim: "Simploy", bound: "Regis HR Group", rung: "text", reason: "Names Simploy staff." },
        reason: "Names Simploy staff.",
      },
      { text: "the tape", files: [mp4], windows: [] },
    );
    assert.ok(text);
    assert.equal(text.rung, "text");
    assert.equal(text.reason, "Names Simploy staff.");
    assert.equal(text.text, "the tape", "the text rides with the question (C20)");
    assert.deepEqual(text.files, [mp4], "the files wait with it, out of the vault");
    const readRung = holdVerdict(
      { mismatch: { claim: "Simploy", bound: "Regis HR Group", rung: "read" }, reason: "The read names Simploy." },
      { text: "the tape" },
    );
    assert.ok(readRung);
    assert.equal(readRung.rung, "read");
    assert.equal(readRung.reason, "The read names Simploy.", "the result's reason is the fallback");
    // An accepted or failed result holds nothing.
    assert.equal(holdVerdict({ reason: "Already on file." }, { text: "x" }), null);
  });

  test("the Drop's held questions step in order, none lost", () => {
    const a = { claim: "A" };
    const b = { claim: "B" };
    let q = queueVerdict<{ claim: string }>([], a);
    q = queueVerdict(q, b);
    assert.deepEqual(q, [a, b], "a second dispute waits behind the first");
    q = queueVerdict(q, null);
    assert.deepEqual(q, [b], "answering the one showing steps the next up");
    assert.deepEqual(queueVerdict(q, null), []);
    assert.deepEqual(queueVerdict([], null), [], "nothing to answer, nothing happens");
  });
});

describe("the take-back", () => {
  test("the undo hands the filing id and the id lists", () => {
    assert.deepEqual(undoRequest("001", { noteIds: ["n1"], todoIds: ["t1"], filingId: "f1" }), [
      "001",
      ["n1"],
      ["t1"],
      "f1",
    ]);
    assert.deepEqual(undoRequest("001", { noteIds: ["n1"] }), ["001", ["n1"], [], undefined]);
    assert.deepEqual(undoRequest("001", { filingId: "f1" }), ["001", [], [], "f1"]);
  });
});

describe("the read-only session (D29)", () => {
  test("the read-only state renders the bar and no input", async () => {
    const { Chute } = await chute();
    const bar = await render(createElement(Chute, { canWrite: false }));
    const copy = textOf(bar);
    assert.ok(copy.includes("THE CHUTE"), "the bar renders");
    assert.ok(copy.includes("Read-only session"), "and says so where the ⇪ button was");
    assert.ok(!/<input/.test(bar), "no input: a read-only session cannot drop");
    assert.ok(!copy.includes("⇪ Files"));
    // A session that can write still has its button and its input.
    const live = await render(createElement(Chute, { canWrite: true }));
    assert.ok(/<input[^>]*type="file"/.test(live));
    assert.ok(textOf(live).includes("⇪ Files"));
    assert.ok(!textOf(live).includes("Read-only session"));
  });
});

describe("the hooks are the browser's, and ask for the fresh read", () => {
  test("every hook is a client module, and the filing asks the router for the fresh read once", () => {
    for (const f of ["use-ingest", "use-verdict", "use-receipts", "use-undo"]) {
      const src = read(`src/app/room/ingest/${f}.ts`);
      assert.match(src, /^"use client";/, `${f} is a client module`);
    }
    const door = read("src/app/room/ingest/use-ingest.ts");
    assert.match(door, /import \{ useRouter \} from "next\/navigation"/);
    const filed = door.indexOf("await roomPaste(");
    const refreshed = door.indexOf("router.refresh()", filed);
    assert.ok(filed > 0 && refreshed > filed, "router.refresh() follows the filing");
    assert.equal((door.match(/router\.refresh\(\)/g) ?? []).length, 1, "once");
  });
});
