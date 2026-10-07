// The ingest-defect reproductions from audit pass 1 (docs/architecture/
// chute-architecture-map.md on the audit branch). One test per bug, named
// for the bug it pins. The FIX NOW set ran here from the start; the FIX IN
// REFACTOR set (bugs 1 and 2) waited in ingest-defects-deferred.test.ts,
// outside the chain, until slice 8 of the Chute brains refactor plan put the
// doors over shared hooks (src/app/room/ingest) and closed them; those two
// moved here, re-aimed at the hooks' behavior, and the deferred file is gone.
//
// roomPaste and roomPasteUndo cannot be called from a test: both gate on
// getAppAccess (next/headers cookies) and getPrisma, so these tests read the
// source the way misfile-guard and read-absorption already do. Where the
// behavior is pure (judgeFiling, the hooks' plan and request builders), the
// test calls it. The pins on receipt and comment wording were retired
// 2026-09-25; what still reads source is the sequencing inside the server
// actions, which has no callable seam.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { judgeFiling } from "../src/lib/intel/misfile";
import { readFreeVerdict } from "../src/lib/room/paste";
import type { RouteAccount } from "../src/lib/route-capture";
import { splitDrop, vaultAfterVerdict } from "../src/lib/room/drop-plan";
import { DROP_ACCEPT } from "../src/lib/paste-files";
import { filingRequest, planDrop } from "../src/app/room/ingest/use-ingest";
import { holdVerdict } from "../src/app/room/ingest/use-verdict";
import { undoRequest } from "../src/app/room/ingest/use-undo";

const root = cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const actions = read("src/app/room/actions.ts");
// The fan-out lives in its own module since slice 6 of the Chute brains
// refactor plan (src/lib/ingest/fanout.ts); roomPaste imports it by name.
const fanoutSrc = read("src/lib/ingest/fanout.ts");
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

const roomPaste = slice(
  actions,
  "export async function roomPaste(",
  // roomActionUndo, the old tail, retired in pass 9 (no client had called it
  // since #360); the next action is the tail now.
  "export async function roomMoveDone(",
);
const absorbRead = slice(
  fanoutSrc,
  "export async function absorbRead(",
  "export function completionKey(",
);
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

describe("bug 1 — the Chute picker's mismatch fell through to the vault", () => {
  // Closed 2026-10-02 by the C20 scaffold (the text rides the row before the
  // read) and pinned on the hook since slice 8: the held verdict carries the
  // text with it, and the pick's re-run files that text with force (D5).
  test("a disputed auto-route keeps its text for the pick, and the pick files it", () => {
    const disputed = {
      ok: false,
      mismatch: { claim: "Simploy", bound: "Regis HR Group", rung: "text" as const, reason: "Names Simploy staff, not Regis HR Group." },
      reason: "Names Simploy staff, not Regis HR Group.",
    };
    const held = holdVerdict(disputed, { text: TAPE, windows: [] });
    assert.ok(held, "a dispute is held, never dropped");
    assert.equal(held.text, TAPE, "the text rides with the question");
    assert.equal(held.reason, "Names Simploy staff, not Regis HR Group.");
    const [accountId, text, opts] = filingRequest("chute", SIMPLOY.id, held.text, {
      force: true,
      windows: held.windows,
    });
    assert.equal(accountId, SIMPLOY.id);
    assert.equal(text, TAPE, "the pick files the held text, not a re-read of nothing");
    assert.equal(opts?.force, true, "the pick is final: the filing re-runs with force (D5)");
    assert.equal(opts?.door, "chute");
  });
});

describe("bug 2 — the Drop files the first readable file only", () => {
  // Closed by the shared door (slice 8): every readable file in a drop is
  // read, each through the pipeline, each with its own receipt. splitDrop
  // used to hand the reader ONE readable file and send every other file to
  // the vault unread, so two .eml files dropped on a row filed one and lost
  // the other to the record.
  test("every readable file in a drop is read, not just the first", () => {
    const a = new File(["From: a@x.com\nSubject: one\n\nbody one"], "one.eml");
    const b = new File(["From: b@x.com\nSubject: two\n\nbody two"], "two.eml");
    const split = splitDrop([a, b], DROP_ACCEPT);
    const unreadReadable = split.unreadable.filter((f) => /\.eml$/i.test(f.name));
    assert.deepEqual(
      unreadReadable.map((f) => f.name),
      [],
      "a readable file went to the vault unread",
    );
    assert.deepEqual(split.readables, [a, b], "both files reach the reader, in drop order");
    for (const door of ["drop", "chute"] as const) {
      const plan = planDrop([a, b], door);
      assert.deepEqual(plan.read, [a, b], `${door}: both files are read`);
      assert.deepEqual(plan.vault, [], `${door}: nothing readable is vaulted unread`);
    }
  });
});

describe("bug 3 — the guard's comments and copy contradict the canon", () => {
  // CLAUDE.md (the Chute): "Nothing files blind: no sure match or a disputed
  // read waits for the operator's pick." The behavior is decreed; the
  // sentences saying the verdict never blocks were the bug.
  test("the blocking behavior is unchanged: a disputed read holds for the pick", () => {
    // The pure verdict still disputes…
    const v = judgeFiling({ text: TAPE, claim: "", bound: REGIS, roster });
    assert.equal(v.ok, false);
    // …and roomPaste still returns ok:false, filed:0 on either pass unless
    // the operator forces. The early pass is readFreeVerdict (src/lib/room/
    // paste.ts, since audit pass 5): its refusal is the receipt roomPaste
    // hands back.
    const refused = readFreeVerdict(TAPE, REGIS, roster);
    assert.ok(refused, "the early guard is still consulted");
    assert.equal(refused.ok, false);
    assert.equal(refused.filed, 0);
    const earlyAt = roomPaste.indexOf("if (refused) return refused;");
    assert.ok(earlyAt > 0, "roomPaste returns the early refusal");
    const lateAt = roomPaste.indexOf("if (!verdict.ok)");
    assert.ok(lateAt > earlyAt, "the late guard is still consulted");
    assert.match(roomPaste.slice(lateAt, lateAt + 160), /return \{\s*ok: false,\s*filed: 0/);
    // The options are required since pass 9 (the door is a required
    // argument), so force reads without the optional chain.
    assert.ok(roomPaste.includes("opts.force"), "force stays the operator's override");
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
    // Cross-out parks the note under hide:note: (spelled once, by
    // hideNoteKey, S-11) and leaves the marker, so the re-drop is refused as
    // a duplicate.
    assert.ok(recordDelete.includes("hideNoteKey("));
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
  test("option 1: `how` stays the entries' provenance and the counts carry the model's judgment", () => {
    // Decided 2026-09-24: `how` stays the entries' provenance. The result
    // once carried a `judged` flag for the receipt to name the model's
    // judgment beside a rules read, but no door ever read it, and the
    // receipt the face approved on 2026-10-06 names no reader at all; the
    // flag retired in pass 9 (pass 8 housekeeping). What the model judged
    // reaches the receipt as its counts, which absorbRead hands back
    // whichever reader filed the entries.
    assert.doesNotMatch(roomPaste, /\bjudged\??:/);
    assert.match(roomPaste, /how = how === "ai" \? "rules" : how;/);
    assert.match(roomPaste, /\.\.\.fanout,/);
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
  test("both doors hand the todo ids and the filing id to the undo", () => {
    // The take-back is the shared hook's since slice 8 (use-undo.ts): the
    // request carries every id the receipt kept and the Filing id when the
    // filing wrote one, so a row filed before the Filing table still undoes
    // by its lists and a row filed after undoes whole by its id.
    const [accountId, noteIds, todoIds, filingId] = undoRequest(SIMPLOY.id, {
      noteIds: ["n1", "n2"],
      todoIds: ["t1"],
      filingId: "f1",
    });
    assert.equal(accountId, SIMPLOY.id);
    assert.deepEqual(noteIds, ["n1", "n2"]);
    assert.deepEqual(todoIds, ["t1"]);
    assert.equal(filingId, "f1");
    const older = undoRequest(SIMPLOY.id, { noteIds: ["n1"] });
    assert.deepEqual(older.slice(1), [["n1"], [], undefined], "a pre-Filing receipt undoes by its lists");
    // Neither door reaches the server's undo on its own any more.
    assert.ok(chute.includes("useUndo()"), "the Chute takes the shared undo");
    assert.ok(client.includes("useUndo()"), "the Drop takes the shared undo");
    assert.ok(!chute.includes("roomPasteUndo("), "the Chute calls the hook, not the action");
    assert.ok(!client.includes("roomPasteUndo("), "the Drop calls the hook, not the action");
  });
});

describe("bug 8 — every non-primary file dropped on a row is vaulted twice", () => {
  test("the waiting list excludes files already vaulted as unreadable", () => {
    // The plan is the shared door's (use-ingest.ts, slice 8): the unreadable
    // ones go to the vault at once, each readable one waits on its own
    // verdict alone. The defect was that `waiting` carried the whole drop, so
    // every non-primary file was PUT again on accept.
    const vtt = new File(["WEBVTT"], "call.vtt");
    const mp4 = new File([new Uint8Array(8)], "call.mp4");
    const png = new File([new Uint8Array(8)], "whiteboard.png");
    const plan = planDrop([mp4, vtt, png], "drop");
    assert.deepEqual(plan.vault, [mp4], "the unreadable one goes at once");
    assert.deepEqual(plan.read, [vtt, png], "each readable one waits on its own verdict");
    assert.deepEqual(plan.refused, []);
    for (const f of plan.read)
      assert.ok(!plan.vault.includes(f), `${f.name} is in both lists, so it would vault twice`);
    // Accepted: the waiting list is the one file, so the vault takes it once.
    assert.deepEqual(vaultAfterVerdict({ ok: true }, [vtt]).archive, [vtt]);
  });
});
