// The ingest-defect reproductions from audit pass 1 (docs/architecture/
// chute-architecture-map.md on the audit branch). One test per bug, named
// for the bug it pins. The FIX NOW set lives here and runs in the verify
// chain; the FIX IN REFACTOR set lives in ingest-defects-deferred.test.ts,
// outside the chain, each with the refactor that closes it named.
//
// roomPaste and roomPasteUndo cannot be called from a test: both gate on
// getAppAccess (next/headers cookies) and getPrisma, so these tests read the
// source the way misfile-guard and read-absorption already do. Where the
// behavior is pure (judgeFiling), the test calls it. The pins on receipt and
// comment wording were retired 2026-09-25; what still reads source is the
// sequencing inside the server actions, which has no callable seam.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { judgeFiling } from "../src/lib/intel/misfile";
import type { RouteAccount } from "../src/lib/route-capture";

const root = cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const actions = read("src/app/room/actions.ts");
const client = read("src/app/room/room-client.tsx");
const chute = read("src/app/room/chute.tsx");

/** The body of one top-level function in a source file, from its head to the
 *  next marker. Scoped slices keep an assertion about roomPaste from being
 *  satisfied by some other action in the same 1,700-line file. */
function slice(src: string, from: string, to: string): string {
  const a = src.indexOf(from);
  const b = src.indexOf(to, a + from.length);
  assert.ok(a >= 0, `missing slice head: ${from}`);
  assert.ok(b > a, `missing slice tail: ${to}`);
  return src.slice(a, b);
}

const roomPaste = slice(actions, "export async function roomPaste(", "async function absorbRead(");
const absorbRead = slice(actions, "async function absorbRead(", "async function fileCompletion(");
const pasteUndo = slice(
  actions,
  "export async function roomPasteUndo(",
  "// --- Closing a deal",
);
const recordDelete = slice(
  actions,
  "export async function roomRecordDelete(",
  "export async function roomNoteToAction(",
);

// The Simploy-to-Regis shape from misfile-guard.test.ts: a tape that names
// people and no company, dropped on the wrong row.
const SIMPLOY = { id: "001F000000w38BOIAY", name: "Simploy" };
const REGIS = { id: "001F000000w38OHIAY", name: "Regis HR Group" };
const roster: RouteAccount[] = [
  {
    id: SIMPLOY.id,
    name: "Simploy",
    emails: ["csmith@simploy.com"],
    domains: ["simploy.com"],
    people: ["chassie smith"],
  },
  {
    id: REGIS.id,
    name: "Regis HR Group",
    emails: ["kmiller@regishrgroup.com"],
    domains: ["regishrgroup.com"],
    people: ["kevin miller"],
  },
];
const TAPE = [
  "CALL TRANSCRIPT — dropped file GMT20260902-180135_Recording.transcript.vtt",
  "Antaeus Coe: Hi, Chassie, how are you?",
  "Chassie Smith: Good, thanks for making time.",
].join("\n");

describe("bug 3 — the guard's comments and copy contradict the canon", () => {
  // CLAUDE.md (the Chute): "Nothing files blind: no sure match or a disputed
  // read waits for the operator's pick." The behavior is decreed; the
  // sentences saying the verdict never blocks were the bug.
  test("the blocking behavior is unchanged: a disputed read holds for the pick", () => {
    // The pure verdict still disputes…
    const v = judgeFiling({ text: TAPE, claim: "", bound: REGIS, roster });
    assert.equal(v.ok, false);
    // …and roomPaste still returns ok:false, filed:0 on either pass unless
    // the operator forces.
    const earlyAt = roomPaste.indexOf("if (!early.ok)");
    assert.ok(earlyAt > 0, "the early guard is still consulted");
    assert.match(roomPaste.slice(earlyAt, earlyAt + 160), /return \{\s*ok: false,\s*filed: 0/);
    const lateAt = roomPaste.indexOf("if (!verdict.ok)");
    assert.ok(lateAt > earlyAt, "the late guard is still consulted");
    assert.match(roomPaste.slice(lateAt, lateAt + 160), /return \{\s*ok: false,\s*filed: 0/);
    assert.ok(roomPaste.includes("opts?.force"), "force stays the operator's override");
  });
  test("the keyless early rung stands on the text's own evidence", () => {
    // The early guard runs before any read, key or no key, so its verdict
    // has to be complete with no claim in: the rung that objected, the row
    // the evidence points at and the row the operator chose. That is what
    // the rules-only receipt reports.
    const v = judgeFiling({ text: TAPE, claim: "", bound: REGIS, roster });
    assert.equal(v.ok, false);
    if (!v.ok) {
      assert.equal(v.rung, "person");
      assert.equal(v.claim, "Simploy");
      assert.equal(v.bound, "Regis HR Group");
    }
  });
});

describe("bug 4 — 'cross it out and drop it again' cannot work", () => {
  test("why undo works and cross-out does not", () => {
    // The undo clears the duplicate guard's marker, so the re-drop files.
    assert.ok(pasteUndo.includes("startsWith: `pastehash:${acct.id}:`"));
    // Cross-out parks the note under hide:note: and leaves the marker, so
    // the re-drop is refused as a duplicate.
    assert.ok(recordDelete.includes("hide:note:"));
    assert.ok(!recordDelete.includes("pastehash"));
  });
});

describe("bug 5 — absorbRead on a rules-fallback read", () => {
  test("did not reproduce: a keyless filing never reaches absorbRead", () => {
    // The claim was that todos, gaps and playbook rows open from a keyless
    // regex pass. They cannot: the read object is assigned only inside the
    // availability gate, the catch resets it, and absorbRead is guarded on
    // it. What the map actually describes is a LIVE model read whose entry
    // list came back empty and was filled by the rules; that read's
    // judgment is the model's, not the regex's. See the report for the
    // residual labeling question.
    const gateAt = roomPaste.indexOf("if (aiCleanAvailable()) {");
    const assignAt = roomPaste.indexOf("read = await aiCleanTimeline(");
    assert.ok(gateAt > 0 && assignAt > gateAt, "the read is assigned only when the key is on");
    assert.ok(roomPaste.slice(assignAt).includes("read = null;"), "a throw resets the read");
    assert.match(roomPaste, /const absorbed(?::[^=]+)? = read\s*\?\s*await absorbRead\(/);
  });
  test("option 1: the receipt names the model's judgment when the rules filed the entries", () => {
    // Decided 2026-09-24: `how` stays the entries' provenance, and the
    // result carries `judged` whenever the read object was non-null, so a
    // filing whose entries came from the rules but whose actions and asks
    // came from the model can say so instead of reading as a plain rules
    // pass. The flag is the contract; the Drop's receipt reads it.
    assert.match(roomPaste, /judged: read !== null/);
  });
});

describe("bug 6 — undo is partial", () => {
  // roomPaste writes record notes, the pastehash marker, opened todos, gap
  // rows, playbook rows and an outcome marker. Undo has to take back all of
  // it, so a wrong-account drop leaves nothing behind.
  test("absorbRead hands back the ids of everything it wrote", () => {
    assert.ok(absorbRead.includes("noteIds"), "gap, playbook and outcome ids are collected");
    assert.match(
      absorbRead,
      /const \w+ = await createAccountNoteRow\(\{[\s\S]*?outcomeMarkBody\(/,
      "the outcome marker's id is kept, not discarded",
    );
    assert.match(roomPaste, /todoIds/, "the result carries the opened todo ids");
  });
  test("roomPasteUndo takes back notes in every namespace the filing wrote, and the todos", () => {
    assert.ok(pasteUndo.includes("prisma.todo.deleteMany"), "opened actions are taken back");
    assert.ok(pasteUndo.includes("gapNs(acct.id)"), "gap rows are taken back");
    assert.ok(
      pasteUndo.includes("PLAYBOOK_MARKET") && pasteUndo.includes("PLAYBOOK_LESSONS"),
      "playbook rows are taken back",
    );
    // Scoping survives: nothing outside the bound account and its own
    // namespaces can be reached by a forged id list.
    assert.ok(pasteUndo.includes("accountId: acct.id"));
  });
  test("both doors hand the todo ids to the undo", () => {
    assert.match(chute, /roomPasteUndo\(acct\.id, ids, it\.todoIds/);
    assert.match(client, /roomPasteUndo\(row\.accountId, ids, /);
  });
});

describe("bug 8 — every non-primary file dropped on a row is vaulted twice", () => {
  test("the waiting list excludes files already vaulted as unreadable", () => {
    // Both archiveFiles calls stay (vault.test.ts pins them as decreed):
    // the unreadable ones go at once, the readable one waits on the
    // verdict. The defect was that `waiting` carried the whole drop, so
    // every non-primary file was PUT again on accept.
    assert.ok(client.includes("void archiveFiles(unreadable)"));
    assert.ok(client.includes("void archiveFiles(waiting)"));
    assert.ok(!client.includes("readDroppedFile(f, files)"));
    assert.ok(client.includes("readDroppedFile(f, [f])"));
  });
});
