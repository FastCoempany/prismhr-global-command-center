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
  test("the evidence rung runs BEFORE the read spends a cent", () => {
    const whole = readFileSync(join(cwd(), "src/app/room/actions.ts"), "utf8");
    const from = whole.indexOf("export async function roomPaste(");
    const to = whole.indexOf("async function absorbRead(");
    const paste = whole.slice(from, to);
    const earlyAt = paste.indexOf("const early = judgeFiling({");
    const readAt = paste.indexOf("await aiCleanTimeline(");
    assert.ok(earlyAt > 0, "roomPaste runs an early, read-free guard");
    assert.ok(readAt > earlyAt, "a wrong-row drop is refused before the model is called");
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

// ── the bland head token (swept 2026-09-08, against the COMPLETE note table) ─
// Every sweep this session ran `limit=6000` against a table PostgREST caps at
// 1000 rows, so they saw 1000 of 1323 notes. Re-run whole, the guard disputed
// three accounts' own records because one account is named "Employee
// Professionals NE LLC" and a book of PEOs says "employee" constantly. The
// BLAND list already held "employer"; it was missing its siblings.

describe("a generic head token identifies nobody", () => {
  const bland: RouteAccount[] = [
    { id: "e", name: "Employee Professionals NE LLC", emails: [], domains: [], people: [] },
    { id: "p", name: "Pinnacle Employee Services, Inc.", emails: [], domains: [], people: [] },
  ];
  test("“employee” no longer routes, so an ordinary PEO sentence disputes nothing", () => {
    const text = "They have 40 employees on the plan and want employee onboarding fixed.";
    const { best } = routeCapture(text, bland);
    assert.equal(best, null);
    assert.equal(
      judgeFiling({ text, claim: "", bound: { id: "p", name: bland[1].name }, roster: bland })
        .ok,
      true,
    );
  });
  test("the words that go with it are bland too", () => {
    for (const w of ["employee", "employees", "professional", "professionals", "leasing"]) {
      const { best } = routeCapture(`We discussed ${w} coverage at length.`, bland);
      assert.equal(best, null, w);
    }
  });
  test("a real distinctive head still routes", () => {
    const { best } = routeCapture("Following up with Simploy on the reseller paperwork.", [
      { id: "s", name: "Simploy", emails: [], domains: [], people: [] },
    ]);
    assert.ok(best, "a distinctive name is still a signal");
  });
});

// ── the two-tier law reaches the guard (2026-09-11) ─────────────────────────
// A PEO's mail is usually ABOUT its client, and the client is not in our book
// and never will be. So a read that names some other company is the ordinary
// shape of a channel sale, not a misfile — as long as the row carries evidence
// of its own.
//
// The case: Martha Ohler at Simple Everest, Infiniti HR's own prospect, writing
// to Tom at infinitihr.com with us copied, subject "Info needed for
// InfinitiHR", asking whether a contractor of record is available for their
// people in Poland. The router put it on Infiniti HR at 80 on the domain alone.
// The read named Simple Everest, rung 1 fired before anything looked at
// Infiniti's own evidence, and a live enquiry was held out of the vault.

describe("a PEO's own client is not a misfile", () => {
  const INFINITI = { id: "001F000000w38INFIN", name: "Infiniti HR" };
  const twoTier: RouteAccount[] = [
    ...roster,
    {
      id: INFINITI.id,
      name: "Infiniti HR",
      emails: ["jennifer@infinitihr.com"],
      domains: ["infinitihr.com"],
      people: ["jennifer hardesty"],
    },
  ];
  // The prospect writes; the PEO is the addressee; we are copied.
  const THREAD = [
    "Subject: Re: Info needed for InfinitiHR",
    "From: Martha Ohler <martha@simple-everest.com>",
    "To: Tom Harrison <Tom@infinitihr.com>",
    "Cc: Antaeus Coe <antaeus.coe@prismhr.com>",
    "",
    "I have learned that the contractors in Poland will remain contractors.",
    "Do you have a contractor of record available? If so, that would work best for us.",
  ].join("\n");

  test("the row's own evidence outranks a read that names the client", () => {
    const v = judgeFiling({
      text: THREAD,
      claim: "Simple Everest",
      bound: INFINITI,
      roster: twoTier,
    });
    assert.deepEqual(v, { ok: true });
  });

  test("the router finds the PEO on its domain, not the prospect", () => {
    const { best } = routeCapture(THREAD, twoTier);
    assert.equal(best?.name, "Infiniti HR");
  });

  test("a claim still objects when the row carries nothing of its own", () => {
    // Same read, dropped on a row the text never touches.
    const v = judgeFiling({
      text: "I have learned that the contractors in Poland will remain contractors.",
      claim: "Simple Everest",
      bound: REGIS,
      roster: twoTier,
    });
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.claim, "Simple Everest");
  });
});

// ── the banner shows both sides (2026-09-11) ────────────────────────────────
// The verdict used to carry only the case AGAINST the operator's choice, so
// the banner stated a conclusion and the correct move was labelled "file
// anyway". Whatever the chosen row carries for itself now rides along, so the
// operator is making a choice rather than overruling a verdict.

describe("a disputed filing shows what the chosen row carries", () => {
  test("boundWhy names the row's own evidence when it has some", () => {
    // Regis text (its domain is present) but the read insists on Simploy: the
    // evidence rung stays quiet, so force the claim rung with a weak row.
    const v = judgeFiling({
      text: "A note mentioning chassie smith and nobody else.",
      claim: "Simploy",
      bound: REGIS,
      roster,
    });
    assert.equal(v.ok, false);
    if (!v.ok) {
      assert.equal(v.bound, "Regis HR Group");
      // Nothing in that text points at Regis, and the banner must say so
      // rather than leaving the operator to guess.
      assert.equal(v.boundWhy, "");
    }
  });

  test("boundWhy is empty, not undefined, so the banner can branch on it", () => {
    const v = judgeFiling({
      text: "Nothing identifying here at all.",
      claim: "Advocate Pay",
      bound: REGIS,
      roster,
    });
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(typeof v.boundWhy, "string");
  });
});

// ── the gate needs the row to be the STRONGEST signal, not merely present ───
// Raised by review on #322. OWN_EVIDENCE_FLOOR is the weakest tier there is —
// a head word appearing anywhere in the text. A Simploy email carrying
// csmith@simploy.com scores Simploy 100; if it happens to say the word "Regis"
// and is dropped on Regis, Regis scores 55 on that word alone. Gating on the
// floor by itself let that file silently, which is the exact misfile this guard
// was built for.

describe("a weak head-word match does not outrank real evidence", () => {
  const SIMPLOY_MAIL = [
    "From: csmith@simploy.com",
    "We looked at what Regis does here and want the same for our people.",
  ].join("\n");

  test("a Simploy email mentioning Regis, dropped on Regis, is disputed", () => {
    const v = judgeFiling({
      text: SIMPLOY_MAIL,
      claim: "Simploy",
      bound: REGIS,
      roster,
    });
    assert.equal(v.ok, false);
  });

  test("and it is disputed even when the read named no company at all", () => {
    // The claim rung is silent, so this is rung 2 doing the work — the case
    // the guard was built for, reached through the same gate.
    const v = judgeFiling({ text: SIMPLOY_MAIL, claim: "", bound: REGIS, roster });
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.claim, "Simploy");
  });

  test("dropped on Simploy, the same mail files without a word", () => {
    const v = judgeFiling({
      text: SIMPLOY_MAIL,
      claim: "Simploy",
      bound: SIMPLOY,
      roster,
    });
    assert.deepEqual(v, { ok: true });
  });
});

// ── a tie is ambiguous, and the router already says so ──────────────────────
// Raised by review on #322. routeCapture refuses to auto-route unless the top
// score beats the second by AUTO_ROUTE_GAP, so it calls a tie ambiguous and
// hands the capture to the picker. The gate blessing a tie contradicted that
// on the same evidence, and would file a cross-account thread silently.

describe("a tie does not clear the gate", () => {
  // Both domains present — both accounts score 80.
  const TIED = [
    "From: ops@simploy.com",
    "To: team@regishrgroup.com",
    "Thread about the handover.",
  ].join("\n");

  test("the router itself calls this ambiguous", () => {
    const { best } = routeCapture(TIED, roster);
    assert.equal(best, null);
  });

  test("dropped on either row, a tied thread is disputed", () => {
    for (const bound of [REGIS, SIMPLOY]) {
      const v = judgeFiling({ text: TIED, claim: "", bound, roster });
      assert.equal(v.ok, false, `${bound.name} should ask on a tie`);
    }
  });

  test("a clear winner still files without a word", () => {
    // Only Simploy's domain — no tie, nothing to ask about.
    const v = judgeFiling({
      text: "From: ops@simploy.com\nJust us on this one.",
      claim: "",
      bound: SIMPLOY,
      roster,
    });
    assert.deepEqual(v, { ok: true });
  });
});

// ── the bound row is scored on its own ──────────────────────────────────────
// Raised by review on #322. routeCapture returns hits.slice(0, 5) — a display
// list for the picker — so a row ranking sixth is absent from it even when the
// text carries its own domain. Reading the bound row's score out of that list
// scored it 0 and had the banner tell the operator "nothing in the text points
// to this account" about a row whose address was in the header.

describe("a bound row outside the top five still shows its own evidence", () => {
  const crowded: RouteAccount[] = [
    { id: "A", name: "Alpha PEO", emails: ["a@alpha.com"], domains: ["alpha.com"], people: [] },
    { id: "B", name: "Bravo HR", emails: ["b@bravo.com"], domains: ["bravo.com"], people: [] },
    { id: "C", name: "Charlie Staffing", emails: ["c@charlie.com"], domains: ["charlie.com"], people: [] },
    { id: "D", name: "Delta Employer", emails: ["d@delta.com"], domains: ["delta.com"], people: [] },
    { id: "E", name: "Echo Group", emails: ["e@echo.com"], domains: ["echo.com"], people: [] },
    { id: "Z", name: "Zulu Workforce", emails: ["someone@zulu.com"], domains: ["zulu.com"], people: [] },
  ];
  // Five contacts by address (100 each); Zulu appears only as a different
  // address on its own domain (80), so it ranks sixth and falls off the list.
  const TEXT =
    "a@alpha.com b@bravo.com c@charlie.com d@delta.com e@echo.com — cc: payroll@zulu.com";

  test("routeCapture really does drop it from the candidate list", () => {
    const { candidates } = routeCapture(TEXT, crowded);
    assert.equal(candidates.length, 5);
    assert.equal(
      candidates.some((c) => c.id === "Z"),
      false,
    );
  });

  test("the banner still names what points to it", () => {
    const v = judgeFiling({
      text: TEXT,
      claim: "Alpha PEO",
      bound: { id: "Z", name: "Zulu Workforce" },
      roster: crowded,
    });
    assert.equal(v.ok, false);
    if (!v.ok) assert.match(v.boundWhy, /zulu\.com/);
  });

  test("a row the roster does not hold scores nothing rather than throwing", () => {
    const v = judgeFiling({
      text: TEXT,
      claim: "Alpha PEO",
      bound: { id: "GHOST", name: "Not In The Book" },
      roster: crowded,
    });
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.boundWhy, "");
  });
});
