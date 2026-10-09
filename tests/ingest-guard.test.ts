// Two verdicts, each with its reason (the Chute brains refactor plan, slice
// 5; D9 as amended 2026-10-05 — CLAUDE.md, The Chute). A filing may be
// disputed twice: the text rung warns before the read and the read rung
// warns after it, each with a reason of nine words or fewer that says why
// the file looks like a different company than the one it was dropped on.
// The text rung's reason is built from the rule's why; the read rung's is
// the model's, read from the account's page data and the web, and when the
// model finds the same company the warning withdraws. One pick answers, and
// the pick's read runs again (§7 item 4); the pick never re-judges (D5).
//
// Pinned as behavior where the seam exists — guardPlan is pure, the verdict
// call takes a stub client the way the Filing module takes one — and as
// source where it does not: roomPaste gates on getAppAccess and getPrisma,
// so, as tests/ingest-defects.test.ts does, its sequencing is read from the
// slice between `export async function roomPaste(` and `export async
// function roomMoveDone(` (the fan-out left for its own module in slice 6).

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import type Anthropic from "@anthropic-ai/sdk";
import { lintReason } from "../src/lib/activity/lint";
import { markClaudeUp } from "../src/lib/claude/health";
import {
  REASON_WORDS,
  guardPlan,
  reasonFromWhy,
  shortName,
  type GuardVerdict,
} from "../src/lib/ingest/guard";
import {
  EXCERPT_CAP,
  PAGE_CAP,
  accountPage,
  claimPage,
  cleanReason,
  readRungVerdict,
  verdictReason,
  type VerdictClient,
} from "../src/lib/ingest/verdict-reason";
import { judgeFiling } from "../src/lib/intel/misfile";
import { MODEL_READ, MODEL_VERDICT } from "../src/lib/intranet/doctrine";
import { readFreeVerdict } from "../src/lib/room/paste";
import type { RouteAccount } from "../src/lib/route-capture";

const root = cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const actions = read("src/app/room/actions.ts");
const chute = read("src/app/room/chute.tsx");
const client = read("src/app/room/room-client.tsx");
const guardSrc = read("src/lib/ingest/guard.ts");
const verdictSrc = read("src/lib/ingest/verdict-reason.ts");

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

// ── the fixtures, as misfile-guard.test.ts holds them ──────────────────────
const SIMPLOY = { id: "001F000000w38BOIAY", name: "Simploy" };
const REGIS = { id: "001F000000w38OHIAY", name: "Regis HR Group" };
const PINNACLE = { id: "001F000000w38PINNA", name: "Pinnacle Employee Services, Inc." };

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
  {
    id: PINNACLE.id,
    name: PINNACLE.name,
    emails: ["ops@pinnacleemployee.com"],
    domains: ["pinnacleemployee.com"],
    people: [],
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
const SIMPLOY_MAIL = [
  "From: csmith@simploy.com",
  "We looked at what Regis does here and want the same for our people.",
].join("\n");
const TIED = [
  "From: ops@simploy.com",
  "To: team@regishrgroup.com",
  "Thread about the handover.",
].join("\n");
const BLAND = "Nothing identifying here at all.";

const wordsOf = (s: string): number =>
  s.trim().replace(/[.!]$/, "").split(/\s+/).filter(Boolean).length;

/** The writing canon's lint on a verdict reason: every fault but the lint's
 *  own word count, which caps a gem's reason at eight where this reason has
 *  nine by decree; the nine is asserted beside it. */
function canonFaults(reason: string): string[] {
  return lintReason(reason).faults.filter((f) => !/\bwords\b.*\bcap\b/.test(f));
}
function assertCanon(reason: string, label: string) {
  assert.ok(reason.trim().length > 0, `${label}: empty`);
  assert.ok(
    wordsOf(reason) <= REASON_WORDS,
    `${label}: ${wordsOf(reason)} words — "${reason}"`,
  );
  assert.deepEqual(canonFaults(reason), [], `${label}: "${reason}"`);
  assert.ok(!/[—()]/.test(reason), `${label}: an aside or parenthetical — "${reason}"`);
  assert.match(reason, /[.!?]$/, `${label}: not a sentence — "${reason}"`);
}

// ── a stub model client, the way the Filing suite stubs its store ──────────
type Params = Anthropic.MessageCreateParamsNonStreaming;
const message = (text: string, stop: Anthropic.Message["stop_reason"] = "end_turn") =>
  ({
    id: "m1",
    type: "message",
    role: "assistant",
    model: "stub",
    content: [{ type: "text", text, citations: null }],
    stop_reason: stop,
    stop_sequence: null,
  }) as unknown as Anthropic.Message;

function stub(replies: (Anthropic.Message | Error | { status: number })[]): {
  client: VerdictClient;
  calls: Params[];
} {
  const calls: Params[] = [];
  const queue = [...replies];
  const client: VerdictClient = {
    messages: {
      async create(params) {
        calls.push(params);
        const next = queue.shift();
        if (!next) throw new Error("the stub ran out of replies");
        if (next instanceof Error || !("content" in next)) throw next;
        return next;
      },
    },
  };
  return { client, calls };
}
const says = (sameCompany: boolean, reason: string) =>
  message(JSON.stringify({ sameCompany, reason }));

const CAPTURE = { head: TAPE.split("\n")[0]!, excerpt: TAPE };
const PAGES = async (bound: { id: string; name: string }, claim: string) => ({
  bound: { name: bound.name, page: `Name: ${bound.name}\nSite: regishrgroup.com` },
  claim: { name: claim, page: `Name: ${claim}\nSite: simploy.com` },
});

// ── the text rung ───────────────────────────────────────────────────────────

describe("the text rung, before the read", () => {
  test("its reason is nine words or fewer and names the rung's evidence", () => {
    const plan = guardPlan({ text: TAPE, claim: "", bound: REGIS, roster });
    assert.ok(plan.text, "the tape dropped on Regis is disputed on the text alone");
    assert.equal(plan.read, null, "the text rung answers first; the read rung waits");
    const v = plan.text;
    assert.equal(v.rung, "text");
    assert.equal(v.claim, "Simploy");
    assert.equal(v.bound, "Regis HR Group");
    assert.match(v.why, /Chassie Smith/);
    assert.equal(v.boundWhy, "");
    assertCanon(v.reason, "the text rung");
    assert.match(v.reason, /Chassie Smith/, "the reason names the person the book binds");
    assert.match(v.reason, /Simploy/, "the reason names the other company");
    assert.ok(Array.isArray(v.candidates), "the router's reading rides for the picker");
  });

  test("it composes readFreeVerdict, whose shape the misfile-guard suite pins", () => {
    const early = readFreeVerdict(TAPE, REGIS, roster);
    const plan = guardPlan({ text: TAPE, claim: "", bound: REGIS, roster });
    assert.ok(early && plan.text);
    assert.equal(plan.text.claim, early.mismatch.claim);
    assert.equal(plan.text.why, early.mismatch.why);
    assert.equal(plan.text.boundWhy, early.mismatch.boundWhy);
    assert.match(guardSrc, /readFreeVerdict\(text, bound, inp\.roster\)/);
  });

  test("it runs before the read and spends nothing on the model", () => {
    const real = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("the text rung reached the wire");
    }) as unknown as typeof fetch;
    try {
      assert.ok(guardPlan({ text: TAPE, claim: "", bound: REGIS, roster }).text);
      assert.equal(
        guardPlan({ text: TAPE, claim: "", bound: SIMPLOY, roster }).text,
        null,
      );
    } finally {
      globalThis.fetch = real;
    }
    // roomPaste returns the text rung's refusal before the availability gate
    // the read sits behind.
    const refusedAt = roomPaste.indexOf("if (refused) return refused;");
    const readGateAt = roomPaste.indexOf("if (aiCleanAvailable()) {");
    assert.ok(
      refusedAt > 0 && readGateAt > refusedAt,
      "the text rung refuses before the read",
    );
    assert.match(
      roomPaste,
      /const refused = refusal\(\s*guardPlan\(\{\s*text: rawText,\s*claim: "",/,
    );
  });

  test("a keyless filing produces the text rung alone", () => {
    // No key means no read and no claim: the plan with claim "" is what a
    // keyless roomPaste gets on both passes. The tape disputes on the text
    // alone; a clear capture disputes nowhere.
    const disputed = guardPlan({ text: TAPE, claim: "", bound: REGIS, roster });
    assert.ok(disputed.text);
    assert.equal(disputed.read, null);
    assert.deepEqual(guardPlan({ text: BLAND, claim: "", bound: REGIS, roster }), {
      text: null,
      read: null,
    });
  });
});

// ── the read rung ───────────────────────────────────────────────────────────

describe("the read rung, after the read", () => {
  const disputing = () =>
    guardPlan({ text: BLAND, claim: "Advocate Pay", bound: REGIS, roster });

  test("it disputes exactly where judgeFiling does, with the rule's reason to start", () => {
    const plan = disputing();
    assert.equal(plan.text, null, "the text clears the row");
    assert.ok(plan.read, "the read's claim disputes it");
    const v = plan.read;
    assert.equal(v.rung, "read");
    assert.equal(v.claim, "Advocate Pay");
    assert.equal(v.bound, "Regis HR Group");
    assert.equal(v.why, "the read names Advocate Pay");
    assertCanon(v.reason, "the read rung's rule reason");
    assert.match(v.reason, /Advocate Pay/);
    const j = judgeFiling({ text: BLAND, claim: "Advocate Pay", bound: REGIS, roster });
    assert.equal(j.ok, false);
    if (!j.ok) assert.equal(v.why, j.why);
    // An agreeing claim, and a row with evidence of its own, dispute nothing.
    assert.equal(
      guardPlan({ text: BLAND, claim: "Regis HR Group", bound: REGIS, roster }).read,
      null,
    );
    assert.equal(
      guardPlan({ text: SIMPLOY_MAIL, claim: "Simple Everest", bound: SIMPLOY, roster })
        .read,
      null,
    );
  });

  test("its reason is the stubbed model's, nine words or fewer", async () => {
    const { client, calls } = stub([
      says(false, "Simploy and Regis HR Group are separate PEOs."),
    ]);
    const v = await readRungVerdict(disputing().read!, CAPTURE, REGIS, {
      client,
      pages: PAGES,
    });
    assert.ok(v, "a different company keeps the dispute");
    assert.equal(v.reason, "Simploy and Regis HR Group are separate PEOs.");
    assertCanon(v.reason, "the read rung's model reason");
    assert.equal(v.rung, "read");
    assert.equal(
      v.why,
      "the read names Advocate Pay",
      "the rule's why rides along for the doors",
    );
    assert.equal(calls.length, 1);
  });

  test("a stubbed sameCompany: true withdraws the read rung", async () => {
    const { client } = stub([says(true, "Advocate Pay is Regis HR Group's trade name.")]);
    const v = await readRungVerdict(disputing().read!, CAPTURE, REGIS, {
      client,
      pages: PAGES,
    });
    assert.equal(v, null, "the warning withdraws and the filing proceeds");
  });

  test("a failed model call falls back to the rule's why", async () => {
    const rule = disputing().read!;
    for (const replies of [
      [new Error("fetch failed")],
      [{ status: 529 }],
      [message("not an answer at all")],
      [message("{}", "max_tokens")],
    ]) {
      const { client } = stub(replies);
      const v = await readRungVerdict(rule, CAPTURE, REGIS, { client, pages: PAGES });
      assert.deepEqual(v, rule, "the rule's verdict, reason and all, stands");
    }
    // A reason the sanitizer rejects keeps the dispute on the rule's words.
    for (const bad of [
      "",
      "Advocate Pay is a contractor payments company and Regis HR Group is a PEO in Florida.",
      "Advocate Pay bills $40 PEPM, Regis HR Group does not.",
      "Advocate Pay seems to be another company than Regis.",
      "A payer, not a PEO — Advocate Pay.",
    ]) {
      const { client } = stub([says(false, bad)]);
      const v = await readRungVerdict(rule, CAPTURE, REGIS, { client, pages: PAGES });
      assert.ok(v);
      assert.equal(v.reason, rule.reason, `rejected: "${bad}"`);
    }
  });

  test("the verdict call runs only when the read rung disputes", async () => {
    // No verdict, no call: the plan is pure and the call site is guarded.
    const real = globalThis.fetch;
    globalThis.fetch = (() => {
      throw new Error("guardPlan reached the wire");
    }) as unknown as typeof fetch;
    try {
      assert.ok(disputing().read);
    } finally {
      globalThis.fetch = real;
    }
    assert.match(roomPaste, /const disputed = plan\.read\s*\?\s*await readRungVerdict\(/);
    assert.equal((roomPaste.match(/readRungVerdict\(/g) ?? []).length, 1);
    // Keyless, the call answers null without a client and without a key.
    const key = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    markClaudeUp();
    try {
      assert.equal(
        await verdictReason({
          head: CAPTURE.head,
          excerpt: CAPTURE.excerpt,
          bound: { name: "Regis HR Group", page: "" },
          claim: { name: "Advocate Pay", page: "" },
        }),
        null,
      );
    } finally {
      if (key !== undefined) process.env.ANTHROPIC_API_KEY = key;
    }
  });
});

// ── the model call's shape ──────────────────────────────────────────────────

describe("the verdict call", () => {
  const input = {
    head: "OUTLOOK THREAD — Re: Poland contractors",
    excerpt: "x".repeat(EXCERPT_CAP + 500),
    bound: {
      name: "Regis HR Group",
      page: "Name: Regis HR Group\nSite: regishrgroup.com",
    },
    claim: { name: "Simple Everest", page: "" },
  };

  test("reads its slot from the roster, searches the web, asks for structured output", async () => {
    const { client, calls } = stub([
      says(false, "Simple Everest is a client, Regis is the PEO."),
    ]);
    const a = await verdictReason(input, client);
    assert.ok(a && !a.sameCompany);
    const p = calls[0]!;
    assert.equal(p.model, MODEL_VERDICT);
    assert.equal(MODEL_VERDICT, MODEL_READ, "the verdict's slot is the read's tier");
    assert.ok(!/claude-/.test(verdictSrc), "no caller names a model");
    const tool = (p.tools ?? [])[0] as {
      type?: string;
      name?: string;
      max_uses?: number;
    };
    assert.equal(tool.type, "web_search_20260209");
    assert.equal(tool.name, "web_search");
    assert.equal(tool.max_uses, 4);
    const fmt = (p.output_config as { format?: { type?: string; schema?: unknown } })
      .format;
    assert.equal(fmt?.type, "json_schema");
    assert.deepEqual(
      Object.keys((fmt?.schema as { properties: object }).properties).sort(),
      ["reason", "sameCompany"],
    );
    const system = String(p.system);
    assert.match(system, /nine words or fewer/);
    assert.match(system, /parent|subsidiary/);
    assert.match(system, /DBA/);
    assert.match(system, /client of the PEO/);
    assert.match(system, /naming both companies/);
    const content = String(p.messages[0]!.content);
    assert.ok(content.includes("Dropped on: Regis HR Group"));
    assert.ok(content.includes("Reads like: Simple Everest"));
    assert.ok(content.includes("Site: regishrgroup.com"));
    assert.ok(content.includes("(not an account in our book)"));
    assert.ok(content.includes(input.head));
    assert.ok(content.includes("x".repeat(EXCERPT_CAP)), "the first 2,000 characters");
    assert.ok(!content.includes("x".repeat(EXCERPT_CAP + 1)), "and no more");
  });

  test("a paused search run is continued once, as the research pass does", async () => {
    const { client, calls } = stub([
      message("", "pause_turn"),
      says(false, "Simple Everest is Regis HR Group's client."),
    ]);
    const a = await verdictReason(input, client);
    assert.ok(a && a.reason);
    assert.equal(calls.length, 2);
    assert.equal(calls[1]!.messages.length, 2);
    assert.equal(calls[1]!.messages[1]!.role, "assistant");
  });

  test("a format the API refuses beside the search tool falls back to plain text", async () => {
    const { client, calls } = stub([
      { status: 400 },
      message(
        'Checked their site.\n```json\n{"sameCompany": false, "reason": "Simple Everest is a client, Regis is the PEO."}\n```',
      ),
    ]);
    const a = await verdictReason(input, client);
    assert.ok(a);
    assert.equal(a.sameCompany, false);
    assert.equal(a.reason, "Simple Everest is a client, Regis is the PEO.");
    assert.equal(calls.length, 2);
    assert.ok(!("output_config" in calls[1]!), "the second ask carries no format");
  });

  test("the sanitizer: redacted, grammar-stripped, trimmed, nine words, canon-clean", () => {
    assert.equal(
      cleanReason("  Simploy ⟦⟧ is a different PEO than Regis HR Group "),
      "Simploy is a different PEO than Regis HR Group.",
    );
    assert.equal(
      cleanReason("Simploy ⇢[x] is ↯ another PEO."),
      "Simploy x] is another PEO.",
      "the glyphs go, the words stay",
    );
    assert.equal(
      cleanReason('"Simploy and Regis are two PEOs."'),
      "Simploy and Regis are two PEOs.",
    );
    assert.equal(cleanReason(""), null);
    assert.equal(cleanReason(42), null);
    assert.equal(cleanReason("One two three four five six seven eight nine ten."), null);
    assert.equal(
      cleanReason("One two three four five six seven eight nine."),
      "One two three four five six seven eight nine.",
    );
    assert.equal(
      cleanReason("Simploy pays $40 PEPM and Regis does not."),
      null,
      "a figure dies",
    );
    assert.equal(
      cleanReason("Simploy may be worth a second look."),
      null,
      "a hedge dies",
    );
    assert.equal(
      cleanReason("Simploy is a PEO — Regis is not."),
      null,
      "a dash hinge dies",
    );
    assert.equal(
      cleanReason("Simploy has 3 offices and Regis has one."),
      null,
      "a count dies",
    );
  });
});

// ── the reason, built from every why the rule can produce ──────────────────

describe("reasonFromWhy over every why misfile.ts can produce", () => {
  const whys: [string, string][] = [
    ["the read names Advocate Pay", "Advocate Pay"],
    ["csmith@simploy.com is Simploy's contact", "Simploy"],
    ["simploy.com address in the text", "Simploy"],
    ["Chassie Smith is Simploy's contact", "Simploy"],
    ["named in the text", "Simploy"],
    ["“pinnacle” appears in the text", PINNACLE.name],
    ["“ESC” matches the initials", "Employer Services Corporation"],
    ["something the router never said", "Simploy"],
  ];

  test("each passes the writing canon's lint, with and without the row's own evidence", () => {
    for (const [why, claim] of whys)
      for (const boundWhy of ["", "named in the text"]) {
        const r = reasonFromWhy(why, "Regis HR Group", claim, boundWhy);
        assertCanon(r, `${why} / ${boundWhy || "no boundWhy"}`);
        assert.ok(r.includes(shortName(claim)), `names the other company: "${r}"`);
        assert.ok(!/@/.test(r), `never an address: "${r}"`);
      }
  });

  test("the row's sentence rides when the nine words allow it, and says the truth", () => {
    // A one-word row leaves room; an absent row is said to be absent and a
    // row with evidence of its own is said to show up too, never absent.
    const absent = reasonFromWhy(
      "Chassie Smith is Simploy's contact",
      "Regis",
      "Simploy",
    );
    assert.equal(absent, "Chassie Smith is Simploy's contact. Nothing points to Regis.");
    const present = reasonFromWhy(
      "Chassie Smith is Simploy's contact",
      "Regis",
      "Simploy",
      "named in the text",
    );
    assert.equal(present, "Chassie Smith is Simploy's contact. Regis shows up too.");
    // A three-word row leaves none; the other company's sentence stands alone.
    assert.equal(
      reasonFromWhy("Chassie Smith is Simploy's contact", "Regis HR Group", "Simploy"),
      "Chassie Smith is Simploy's contact.",
    );
    assert.equal(
      reasonFromWhy("the read names Advocate Pay", "Regis HR Group", "Advocate Pay"),
      "The read names Advocate Pay.",
    );
  });

  test("the fallback reports what the read names, never a hedge (pass 8 call 13)", () => {
    // Ruled 2026-10-07: "This reads like {claim}." becomes "The read names
    // {claim}." for a why the reason table does not know and for a name too
    // long for any sentence; "Reads as {label}." elsewhere is a report of
    // the reader's classification and stays.
    assert.equal(
      reasonFromWhy("something the router never said", "Regis HR Group", "Simploy"),
      "The read names Simploy.",
    );
    assert.equal(
      reasonFromWhy("something the router never said", "Regis", "Simploy"),
      "The read names Simploy. Nothing points to Regis.",
    );
    const absurd = "One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve";
    assert.equal(
      reasonFromWhy("named in the text", "Regis", absurd),
      "The read names One Two Three Four Five Six.",
    );
    for (const [why] of whys) {
      for (const claim of ["Simploy", absurd]) {
        const r = reasonFromWhy(why, "Regis HR Group", claim);
        assert.ok(!/reads like/i.test(r), `a hedge: "${r}"`);
      }
    }
  });

  test("the book's longest names still fit nine words", () => {
    const long = "Superior Staffing & Services LLC dba Hawai'i Staffing & Services";
    const longer = "HAWAII EMPLOYEE LEASING PROFESSIONALS LLC dba HR HAWAII";
    for (const [why] of whys) {
      const r = reasonFromWhy(why, long, longer);
      assert.ok(wordsOf(r) <= REASON_WORDS, `"${r}"`);
      assert.deepEqual(canonFaults(r), [], `"${r}"`);
    }
    const absurd = "One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve";
    assert.ok(
      wordsOf(reasonFromWhy("named in the text", "Regis", absurd)) <= REASON_WORDS,
    );
  });

  test("shortName says the name as a person does", () => {
    assert.equal(shortName("Simploy, Inc."), "Simploy");
    assert.equal(
      shortName("Pinnacle Employee Services, Inc."),
      "Pinnacle Employee Services",
    );
    assert.equal(
      shortName("Cornerstone Employer Solutions (dba SynchronyHR)"),
      "Cornerstone Employer Solutions",
    );
    assert.equal(
      shortName("United Benefits Consulting, Inc. d/b/a Zamp HR"),
      "United Benefits Consulting",
    );
    assert.equal(shortName("Engage PEO - Cloud"), "Engage PEO");
    assert.equal(shortName("Regis HR Group"), "Regis HR Group");
  });

  test("the live verdicts on the misfile-guard fixtures read clean", () => {
    const cases: {
      label: string;
      text: string;
      claim: string;
      bound: { id: string; name: string };
    }[] = [
      { label: "the tape on Regis (person)", text: TAPE, claim: "", bound: REGIS },
      {
        label: "the Simploy mail on Regis (email, head word)",
        text: SIMPLOY_MAIL,
        claim: "",
        bound: REGIS,
      },
      { label: "the tie on Regis (domain)", text: TIED, claim: "", bound: REGIS },
      { label: "the tie on Simploy (domain)", text: TIED, claim: "", bound: SIMPLOY },
      {
        label: "a head word on Regis",
        text: "Pinnacle sent over the census.",
        claim: "",
        bound: REGIS,
      },
      {
        label: "the name on Regis",
        text: "Following up with Simploy on the paperwork.",
        claim: "",
        bound: REGIS,
      },
      {
        label: "a claim on a bare row",
        text: BLAND,
        claim: "Advocate Pay",
        bound: REGIS,
      },
    ];
    for (const c of cases) {
      const plan = guardPlan({ text: c.text, claim: c.claim, bound: c.bound, roster });
      const v: GuardVerdict | null = plan.text ?? plan.read;
      assert.ok(v, `${c.label}: disputed`);
      assertCanon(v.reason, c.label);
      assert.ok(v.reason.includes(shortName(v.claim)), `${c.label}: "${v.reason}"`);
    }
  });
});

// ── the pick ────────────────────────────────────────────────────────────────

describe("the pick", () => {
  test("re-runs the read: the plan holds no read and runs no rung with force", () => {
    // The model client is a counter: the first drop reads (1) and the claim
    // disputes; the pick reads again (2) and, with force, no rung runs. The
    // plan takes a claim string, never a read to reuse, so nothing is held
    // between the two (§7 item 4; D5).
    let reads = 0;
    const theRead = () => {
      reads++;
      return "Advocate Pay";
    };
    const first = guardPlan({ text: BLAND, claim: theRead(), bound: REGIS, roster });
    assert.ok(first.read, "the first pass disputes on the claim");
    const pick = guardPlan({
      force: true,
      text: BLAND,
      claim: theRead(),
      bound: REGIS,
      roster,
    });
    assert.equal(reads, 2, "the read ran again");
    assert.deepEqual(pick, { text: null, read: null }, "no rung runs on the pick");
    assert.deepEqual(
      guardPlan({ force: true, text: TAPE, claim: "", bound: REGIS, roster }),
      {
        text: null,
        read: null,
      },
    );
    // In roomPaste the read sits outside every force gate: nothing between
    // the text rung's return and the read assignment reads the flag.
    const between = slice(
      roomPaste,
      "if (refused) return refused;",
      "read = await aiCleanTimeline(",
    );
    assert.ok(!/force/.test(between), "the read is not gated on force");
    // The options are required since pass 9 (the door is a required
    // argument), so force reads without the optional chain.
    assert.ok(roomPaste.includes("opts.force"), "force stays the operator's override");
    assert.match(roomPaste, /force: Boolean\(opts\.force\)/);
  });

  test("against a duplicate under the picked account is refused", () => {
    // The duplicate check runs before either rung and reads no force flag:
    // the pick's re-run meets it like any other filing (D5: the pick never
    // re-judges; the duplicate guard is not a judgment).
    // Since pass 9 the check claims the capture and the rest of the filing
    // runs in fileClaimed, so the check is the stretch up to that call.
    const dupeAt = roomPaste.indexOf("duplicate: true,");
    const forceAt = roomPaste.indexOf("opts.force");
    assert.ok(
      dupeAt > 0 && dupeAt < forceAt,
      "the duplicate refusal precedes the first rung",
    );
    const dupe = slice(
      roomPaste,
      "const fingerprint = pasteFingerprint(rawText);",
      "return await fileClaimed(",
    );
    assert.ok(dupe.includes("duplicate: true,"));
    assert.ok(!/force/.test(dupe), "the duplicate check never reads force");
  });
});

// ── the result and the doors ────────────────────────────────────────────────

describe("the result and the doors", () => {
  test("a disputed result carries the rung and the reason beside the evidence", () => {
    const refusal = slice(
      actions,
      "function refusal(",
      "export async function roomPaste(",
    );
    for (const key of ["claim:", "bound:", "why:", "boundWhy:", "rung:", "reason:"])
      assert.ok(refusal.includes(key), key);
    assert.match(
      roomPaste,
      /mismatch\?: \{[\s\S]*?rung\?: "text" \| "read";[\s\S]*?reason\?: string;/,
    );
    assert.match(
      roomPaste,
      /if \(!verdict\.ok\) \{\s*return \{\s*ok: false,\s*filed: 0,\s*how,\s*mismatch: verdict\.mismatch,\s*reason: verdict\.reason,/,
    );
  });

  test("each door shows the reason where the why was, in the one held box", () => {
    // Rewritten for slice 18a (the face approved 2026-10-06): the Chute's
    // "Pick the account." line and the Drop's two-sided banner retired into
    // one held box both doors paint (src/app/room/ingest/held.tsx). The
    // rung's reason is its second line and the rule's why sits one click
    // down in the grounds; tests/ingest-faces.test.ts renders both.
    const held = read("src/app/room/ingest/held.tsx");
    assert.match(held, /\{verdict\.reason\}/, "the box says the rung's reason");
    assert.match(held, /groundsOf\(verdict,/, "and opens to the grounds behind it");
    assert.match(
      chute,
      /<HeldBox[\s\S]*?verdict=\{it\.state === "mismatch" \? \(it\.verdict \?\? \{ reason: it\.reason \}\) : null\}/,
    );
    // The held verdict is the shared hook's since slice 8 (use-verdict.ts);
    // the Drop holds it through useVerdict and hands the box the same fields.
    const verdict = read("src/app/room/ingest/use-verdict.ts");
    assert.ok(verdict.includes('rung?: "text" | "read";'));
    assert.match(client, /useVerdict<DropHold>\(\)/);
    assert.match(client, /<HeldBox[\s\S]*?verdict=\{mismatch\}/);
  });
});

// ── the page data ───────────────────────────────────────────────────────────

describe("an account's page data", () => {
  const RESEARCH = [
    "⌕ Research — 9/1/26",
    "Simploy is a St. Louis PEO serving small employers; pricing starts at $40 PEPM.",
    "Signals: posting a role in Poland",
    "Countries named: Poland",
    "People: Chassie Smith — VP Operations",
    "Sources: https://simploy.com",
    '⟪{"summary":"secret tail"}⟫',
  ].join("\n");

  test("reads the book and the research store, redacted and capped", async () => {
    const page = await accountPage(SIMPLOY.id, async () => RESEARCH);
    assert.equal(page.name, "Simploy");
    assert.ok(page.page.startsWith("Name: Simploy"));
    assert.match(page.page, /Email domains: .*simploy\.com/);
    assert.match(page.page, /People: .*Chassie Smith/);
    assert.ok(
      page.page.includes("Signals: posting a role in Poland"),
      "the note's head lines",
    );
    assert.ok(!page.page.includes("secret tail"), "never the machine tail");
    assert.ok(!page.page.includes("Sources:"), "never the source list");
    assert.ok(!page.page.includes("$40"), "money never reaches the page");
    assert.ok(page.page.includes("[—]"));
    assert.ok(page.page.length <= PAGE_CAP);
    // A store that answers nothing still gives the book's row.
    const bare = await accountPage(SIMPLOY.id, async () => null);
    assert.ok(bare.page.startsWith("Name: Simploy"));
    assert.deepEqual(await accountPage("GHOST", async () => null), {
      name: "",
      page: "",
    });
  });

  test("the claimed company's page is the book's when the book holds it, bare when not", async () => {
    const held = await claimPage("Simploy", async () => null);
    assert.equal(held.name, "Simploy");
    assert.ok(held.page.startsWith("Name: Simploy"));
    const client = await claimPage("Simple Everest", async () => null);
    assert.deepEqual(client, { name: "Simple Everest", page: "" });
    assert.deepEqual(await claimPage("", async () => null), { name: "", page: "" });
  });
});

// ── A12.3 · the reason is the trigger, not a description (pass 14) ──────────
// On the ingest surfaces a reason is the held box's: why the file looks like
// a different company. The rule's reason is built from the rung's own why, so
// it names the evidence it stands on; the model's reason passes the nine-word
// cap and the canon's lint, which since pass 14 kills recency ("recently",
// "a while"), or the rule's reason stands. The receipt's second line is pinned
// beside it in tests/ingest-faces.test.ts.
describe("every reason on the ingest surfaces names the fact it stands on (A12.3, whole scope)", () => {
  test("the rule's reason carries its evidence: the address, the name, the quoted word, the initials or the read", () => {
    const cases: [string, string, RegExp][] = [
      [
        "simploy.com address in the text",
        "Simploy",
        /A Simploy email address is in the text/,
      ],
      [
        "csmith@simploy.com is Simploy's contact",
        "Simploy",
        /Simploy's contact address is in the text/,
      ],
      [
        "Chassie Smith is Simploy's contact",
        "Simploy",
        /Chassie Smith is Simploy's contact/,
      ],
      ["named in the text", "Simploy", /^Simploy is named\./],
      [
        "“pinnacle” appears in the text",
        PINNACLE.name,
        /“pinnacle” in the text points to Pinnacle Employee Services/,
      ],
      [
        "“ESC” matches the initials",
        "Employer Services Corporation",
        /“ESC” matches Employer Services's initials/,
      ],
      ["the read names Advocate Pay", "Advocate Pay", /^The read names Advocate Pay\./],
      ["something the router never said", "Simploy", /^The read names Simploy\./],
    ];
    for (const [why, claim, evidence] of cases) {
      const r = reasonFromWhy(why, "Regis HR Group", claim);
      assert.match(r, evidence, `${why}: "${r}"`);
      assert.deepEqual(
        lintReason(r).faults.filter((f) => !/cap/.test(f)),
        [],
        r,
      );
    }
  });

  test("the model's reason that leans on recency, or hedges, is refused and the rule's reason stands", async () => {
    const rule = guardPlan({
      text: BLAND,
      claim: "Advocate Pay",
      bound: REGIS,
      roster,
    }).read!;
    for (const bad of [
      "Regis HR Group wrote recently, Advocate Pay did not.",
      "It's been a while since Advocate Pay wrote Regis.",
      "Advocate Pay may be a different company than Regis.",
    ]) {
      const { client } = stub([says(false, bad)]);
      const v = await readRungVerdict(rule, CAPTURE, REGIS, { client, pages: PAGES });
      assert.ok(v);
      assert.equal(v.reason, rule.reason, `let through: "${bad}"`);
    }
    // A reason that names the fact passes.
    const { client } = stub([
      says(false, "Advocate Pay and Regis HR Group are separate PEOs."),
    ]);
    const v = await readRungVerdict(rule, CAPTURE, REGIS, { client, pages: PAGES });
    assert.equal(v?.reason, "Advocate Pay and Regis HR Group are separate PEOs.");
  });
});
