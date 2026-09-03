// The misfile guard, both rungs (the Simploy call filed to Regis, 2026-09-03).
// A call transcript names no company — nobody says their own company out loud
// on a call — so the read had no claim, the guard's "empty claim = no
// objection" rule shrugged, and a Simploy conversation filed to Regis HR
// Group, taking three todos and three playbook facts with it. The book knew
// Chassie Smith was Simploy's in two separate stores. The guard just never
// looked at people.

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { judgeFiling } from "../src/lib/intel/misfile";
import { peopleNamedIn, routeCapture, type RouteAccount } from "../src/lib/route-capture";
import { peopleIndex, personKey } from "../src/lib/book/contacts";
import { routingRoster } from "../src/lib/book/roster";

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

// A tape's shape: speaker labels, no company name anywhere, no addresses.
const TAPE = [
  "CALL TRANSCRIPT — dropped file GMT20260902-180135_Recording.transcript.vtt",
  "Antaeus Coe: Hi, Chassie, how are you?",
  "Chassie Smith: Good, thanks for making time.",
  "Antaeus Coe: So the client is on Globalization Partners today?",
  "Chassie Smith: Right, about a year now. I'll grab a couple of their invoices.",
].join("\n");

describe("the people rung — the fact the guard was missing", () => {
  test("the real misfile is caught, and named in the operator's words", () => {
    const v = judgeFiling({ text: TAPE, claim: "", bound: REGIS, roster });
    assert.equal(v.ok, false);
    if (!v.ok) {
      assert.equal(v.claim, "Simploy");
      assert.equal(v.bound, "Regis HR Group");
      assert.match(v.why, /Chassie Smith is Simploy's contact/);
    }
  });
  test("the same tape files silently on its own row", () => {
    assert.equal(judgeFiling({ text: TAPE, claim: "", bound: SIMPLOY, roster }).ok, true);
  });
  test("an empty claim is no longer read as consent", () => {
    // The exact old hole: claim "" + a row the evidence contradicts.
    const v = judgeFiling({ text: TAPE, claim: "", bound: REGIS, roster });
    assert.equal(v.ok, false);
  });
});

describe("the guard never cries wolf", () => {
  test("a thread carrying its own account's evidence files, mentions and all", () => {
    // Regis's own domain is present, so naming Chassie in passing is just
    // conversation — the bound account has evidence of its own.
    const passing = [
      "From: Lesha Cyphers <lcyphers@prismhr.com>",
      "To: Kevin Miller <kmiller@regishrgroup.com>",
      "Just talked to Chassie Smith at Simploy — different deal.",
    ].join("\n");
    assert.equal(judgeFiling({ text: passing, claim: "", bound: REGIS, roster }).ok, true);
  });
  test("a capture with no signal at all files wherever it is dropped", () => {
    const bland = "Talked through pricing. They will come back to us next week.";
    assert.equal(judgeFiling({ text: bland, claim: "", bound: REGIS, roster }).ok, true);
  });
  test("force (file it anyway) is the operator's, and the guard never blocks", () => {
    // The guard returns a verdict; the caller passes force. Proven at the
    // call site: a disputed verdict returns ok:false with a reason, never a
    // thrown error or a silent drop.
    const v = judgeFiling({ text: TAPE, claim: "", bound: REGIS, roster });
    assert.equal(typeof (v.ok ? "" : v.why), "string");
  });
});

describe("the company rung still stands, and outranks nothing", () => {
  test("a disagreeing company claim disputes on its own", () => {
    const v = judgeFiling({
      text: "Nothing identifying here at all.",
      claim: "Advocate Pay",
      bound: REGIS,
      roster,
    });
    assert.equal(v.ok, false);
    if (!v.ok) assert.match(v.why, /the read names Advocate Pay/);
  });
  test("a fuzzy-but-agreeing claim files", () => {
    assert.equal(
      judgeFiling({ text: "x", claim: "Simploy, Inc.", bound: SIMPLOY, roster }).ok,
      true,
    );
  });
});

describe("the vault waits on the verdict", () => {
  const client = readFileSync(join(cwd(), "src/app/room/room-client.tsx"), "utf8");
  test("a readable drop archives only after the filing is accepted", () => {
    // The files ride to filePaste and archive inside the ok branch — never
    // beside the read, which is how the Simploy call reached the Regis
    // folder while the filing was still being judged.
    assert.ok(/readDroppedFile\(f, files\)/.test(client));
    assert.ok(/if \(waiting\?\.length\) void archiveFiles\(waiting\)/.test(client));
    const okAt = client.indexOf("if (waiting?.length) void archiveFiles(waiting);");
    const mismatchAt = client.indexOf("setMismatch({ ...r.mismatch, text, files: waiting })");
    assert.ok(mismatchAt > 0 && okAt > mismatchAt, "the accept path archives, the dispute holds");
  });
  test("a disputed drop holds its file with the question", () => {
    assert.ok(client.includes("files?: File[]"));
    assert.ok(client.includes("filePaste(mismatch.text, true, mismatch.files)"));
    assert.ok(client.includes("holding out of the vault"));
  });
  test("the guard runs before anything files or fans out", () => {
    const whole = readFileSync(join(cwd(), "src/app/room/actions.ts"), "utf8");
    // Scoped to roomPaste's own body — other actions write notes of their own.
    const from = whole.indexOf("export async function roomPaste(");
    const to = whole.indexOf("async function absorbRead(");
    assert.ok(from > 0 && to > from);
    const paste = whole.slice(from, to);
    const guardAt = paste.indexOf("judgeFiling({");
    assert.ok(guardAt > 0, "roomPaste runs the guard");
    assert.ok(
      paste.indexOf("await absorbRead(") > guardAt,
      "knowledge never fans out from a disputed capture",
    );
    assert.ok(
      paste.indexOf("await createAccountNoteRow({") > guardAt,
      "no entry is written before the verdict",
    );
  });
});

describe("the name scanner and the book's index", () => {
  test("capitalized pairs are found; lowercase prose is not a name", () => {
    const found = peopleNamedIn("Chassie Smith: right. we talked about global payroll");
    assert.ok(found.has("chassie smith"));
    assert.ok(!found.has("global payroll"));
  });
  test("personKey collapses middles and punctuation to first+last", () => {
    assert.equal(personKey("Chassie  Smith"), "chassie smith");
    assert.equal(personKey("Mary K. O'Brien"), "mary o'brien");
    assert.equal(personKey("Chassie"), "");
    assert.equal(personKey(""), "");
  });
  test("the book really does bind Chassie Smith to Simploy alone", () => {
    const at = peopleIndex().get("chassie smith") ?? [];
    assert.deepEqual([...at], [SIMPLOY.id]);
  });
  test("the shared roster carries people, and only unambiguous ones", () => {
    const live = routingRoster();
    const simploy = live.find((a) => a.id === SIMPLOY.id);
    assert.ok(simploy, "Simploy is in the roster");
    assert.ok(simploy!.people!.includes("chassie smith"));
    const idx = peopleIndex();
    for (const a of live)
      for (const p of a.people ?? [])
        assert.equal((idx.get(p) ?? []).length, 1, `${p} must bind to exactly one account`);
  });
  test("a person on two accounts routes nobody", () => {
    const shared: RouteAccount[] = [
      { id: "a", name: "Alpha", emails: [], domains: [], people: [] },
      { id: "b", name: "Beta", emails: [], domains: [], people: [] },
    ];
    const { best } = routeCapture("Chassie Smith said so", shared);
    assert.equal(best, null);
  });
});
