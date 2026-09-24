// The ingest-defect reproductions from audit pass 1 (docs/architecture/
// chute-architecture-map.md on the audit branch). One test per bug, named
// for the bug it pins. The FIX NOW set lives here and runs in the verify
// chain; the FIX IN REFACTOR set lives in ingest-defects-deferred.test.ts,
// outside the chain, each with the refactor that closes it named.
//
// roomPaste and roomPasteUndo cannot be called from a test: both gate on
// getAppAccess (next/headers cookies) and getPrisma, so these tests read the
// source the way misfile-guard and read-absorption already do. Where the
// behavior is pure (judgeFiling), the test calls it.

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
const misfile = read("src/lib/intel/misfile.ts");

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
  test("the stale sentences are gone", () => {
    assert.ok(!misfile.includes("The verdict never blocks"), "misfile.ts header");
    assert.ok(!misfile.includes("The guard informs and never blocks"), "misfile.ts tie rule");
    assert.ok(!roomPaste.includes("It informs; it never blocks"), "roomPaste's guard comment");
    assert.ok(!client.includes("the account check did not run"), "the Drop's readFailed copy");
    assert.ok(!chute.includes("guard included when the key is on"), "the Chute's header");
  });
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
  test("the keyless early rung is described as keyless", () => {
    // The early guard runs before the read, on the text's own evidence, key
    // or no key. The Drop's readFailed copy has to say the check ran.
    const at = client.indexOf("The read didn't complete.");
    assert.ok(at > 0, "the rules-only receipt still exists");
    assert.match(client.slice(at, at + 320), /account check/i);
    assert.doesNotMatch(client.slice(at, at + 320), /did not run/);
  });
});

describe("bug 4 — 'cross it out and drop it again' cannot work", () => {
  test("the degraded transcript receipt points at a path that succeeds", () => {
    assert.ok(!client.includes("Cross it out and drop it again"));
    const at = client.indexOf("The reader is down");
    assert.ok(at > 0, "the degraded transcript receipt still exists");
    assert.match(client.slice(at, at + 280), /undo/i);
  });
  test("why undo works and cross-out does not", () => {
    // The undo clears the duplicate guard's marker, so the re-drop files.
    assert.ok(pasteUndo.includes("startsWith: `pastehash:${acct.id}:`"));
    // Cross-out parks the note under hide:note: and leaves the marker, so
    // the re-drop returns "Already on file".
    assert.ok(recordDelete.includes("hide:note:"));
    assert.ok(!recordDelete.includes("pastehash"));
    assert.ok(roomPaste.includes("Nothing filed twice."));
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
  test("both doors hand the todo ids to the undo, and the copy stops promising to leave them", () => {
    assert.match(chute, /roomPasteUndo\(acct\.id, ids, it\.todoIds/);
    assert.match(client, /roomPasteUndo\(row\.accountId, ids, /);
    assert.ok(!client.includes("The actions it opened stay"));
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
