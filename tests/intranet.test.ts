import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";

import {
  AGE_DAYS,
  CANDIDATE_CAP,
  KIND_WEIGHT,
  MODEL_EXTRACT_RICH,
  MODEL_PLAN,
  MODEL_SYNTH,
  MODEL_SYNTH_HARD,
  NOTHING_DELETED,
  PROSPECT_TOPIC_LABEL,
  RANK,
  TOPIC_PROMOTE_AT,
} from "../src/lib/intranet/doctrine";
import {
  captureReceipt,
  checksum,
  msgKey,
  normalizeCapture,
  readLinks,
  readMessages,
  readReport,
  readSpace,
  unseenMessages,
} from "../src/lib/intranet/normalize";
import {
  applyMerges,
  segmentMessages,
  segmentTranscript,
} from "../src/lib/intranet/segment";
import {
  extractionRejected,
  locateQuote,
  modelForOrigin,
  sanitizeExtract,
} from "../src/lib/intranet/extract";
import {
  descendantIds,
  foldLabel,
  mergeCandidates,
  proposeTopic,
  railTopics,
  readyToPromote,
  resolveTopic,
  sameLabel,
  stalenessLine,
} from "../src/lib/intranet/index-topics";
import { sanitizeSplit, shouldConsiderSplit } from "../src/lib/intranet/decompose";
import {
  fallbackPlan,
  fuse,
  recencyWeight,
  sameAssertion,
  sanitizePlan,
} from "../src/lib/intranet/retrieve";
import {
  longestVerbatimRun,
  modelFor,
  readConfidence,
  sanitizeAnswer,
  violatesVerbatim,
} from "../src/lib/intranet/synthesize";
import {
  ageLimit,
  disputeCount,
  kindsComparable,
  proposePairs,
  readTime,
  withSupersessions,
} from "../src/lib/intranet/time";
import { goneLine, syncVerdict } from "../src/lib/intranet/mirror";
import { askShapeRead, isPlaybookNamespace } from "../src/lib/intranet/playbook-in";
import {
  sanitizeVerdicts,
  summaryStale,
  supersessionDirection,
} from "../src/lib/intranet/verdicts";
import type { Claim, Msg, Topic } from "../src/lib/intranet/types";

const root = cwd();
const NOW = "2026-07-30T18:00:00.000Z";

const msg = (over: Partial<Msg> & { body: string; at: string }): Msg => ({
  speaker: "Lindsey Forrest",
  atInferred: false,
  ...over,
});

const claim = (over: Partial<Claim> & { id: string; text: string }): Claim => ({
  docId: "d1",
  speaker: "Lesha Cyphers",
  saidAt: "2026-07-01T12:00:00.000Z",
  kind: "fact",
  confidence: "stated",
  entities: ["Brazil"],
  topicIds: ["t1"],
  askShape: "",
  offsetStart: 0,
  offsetEnd: 0,
  supersededBy: "",
  disputedWith: [],
  ...over,
});

const topic = (over: Partial<Topic> & { id: string; label: string }): Topic => ({
  parentId: "",
  summary: "",
  status: "live",
  mergedInto: "",
  docCount: 1,
  claimCount: 1,
  firstSeen: NOW,
  lastSeen: NOW,
  ...over,
});

// ── the doctrine ────────────────────────────────────────────────────────────
describe("the doctrine is what the founder asked for", () => {
  test("Claude is the parent brain, and Fable is the escalation", () => {
    // A later "cost saving" that quietly downgrades the room fails here.
    assert.equal(MODEL_EXTRACT_RICH, "claude-opus-5");
    assert.equal(MODEL_PLAN, "claude-opus-5");
    assert.equal(MODEL_SYNTH, "claude-opus-5");
    assert.equal(MODEL_SYNTH_HARD, "claude-fable-5");
  });
  test("nothing is ever deleted", () => {
    assert.equal(NOTHING_DELETED, true);
  });
  test("ranking never looks at where a claim came from (C1)", () => {
    const src = readFileSync(join(root, "src/lib/intranet/retrieve.ts"), "utf8");
    const formula = /for \(const c of all\) \{[\s\S]*?\n  \}/.exec(src)?.[0] ?? "";
    assert.ok(formula, "the scoring loop moved");
    assert.ok(!/origin/i.test(formula), "origin leaked into the ranking formula");
    assert.deepEqual(Object.keys(RANK).sort(), [
      "confidence",
      "corroboration",
      "kind",
      "lexical",
      "recency",
      "roadAgreement",
    ]);
  });
  test("a prospect question never ages, a commitment ages fast (C7)", () => {
    assert.equal(AGE_DAYS["prospect-question"], Number.POSITIVE_INFINITY);
    assert.equal(AGE_DAYS.commitment, 30);
    assert.ok(AGE_DAYS.fact > AGE_DAYS.process);
  });
  test("prospect questions carry real weight in ranking (C7)", () => {
    assert.ok(KIND_WEIGHT["prospect-question"] >= KIND_WEIGHT.fact);
    assert.ok(KIND_WEIGHT.decision > KIND_WEIGHT.opinion);
  });
  test("the room is not an editor — it imports no write action", () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.tsx?$/.test(e.name)) files.push(p);
      }
    };
    walk(join(root, "src/lib/intranet"));
    walk(join(root, "src/app/intranet"));
    const banned = /from "@\/app\/(room|today|accounts|playbook|dashboard)\/actions"/;
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      assert.ok(!banned.test(src), `${f} imports a write action — the room only reads`);
    }
  });
  test("people are never entities (C4)", () => {
    const src = readFileSync(join(root, "src/lib/intranet/extract.ts"), "utf8");
    assert.ok(/NEVER people/.test(src), "the rubric stopped forbidding person entities");
  });
});

// ── capture ─────────────────────────────────────────────────────────────────
describe("capture reads the grab whole", () => {
  const raw = [
    "TEAMS THREAD - Global Sales Team - captured 7/30/2026, 12:16 PM",
    "",
    "⟦MSG⟧ Jeanne Hogan ⟦AT⟧ 2026-07-09T09:02 ⟦BODY⟧",
    "sell a deal. email implementation with SOW and Handover. and then drop the SOW in the sharepoint.",
    "⟦MSG⟧ Lindsey Forrest ⟦AT⟧ 2026-07-30T12:03 ⟦BODY⟧",
    "So does it go like this: Plan Highlights, then top targets and cadences.",
    "⟦MSG⟧ Kimberly Durosko ⟦AT⟧ 2026-07-30T12:09 ⟦BODY⟧",
    "Yes",
    "⟦LINKS⟧",
    "[1] Global Payroll — Implementation SOW.docx · https://sharepoint.com/x/SOW.docx · Jeanne Hogan, 7/9",
    "[2] Recording — partner intro · — · Lindsey Forrest, 7/30",
    "⟦CAPTURED 214 messages · scrolled 8 · oldest 2026-06-02 · ceiling⟧",
  ].join("\n");

  test("the space is read, and it is a label not a partition", () => {
    assert.equal(readSpace(raw), "Global Sales Team");
  });
  test("every message keeps its own speaker and instant", () => {
    const m = readMessages(raw, NOW);
    assert.equal(m.length, 3);
    assert.equal(m[0].speaker, "Jeanne Hogan");
    assert.ok(m[0].body.startsWith("sell a deal"));
    assert.equal(m[2].speaker, "Kimberly Durosko");
    assert.ok(!m[0].atInferred);
  });
  test("links survive, and a preview card keeps its label with no url", () => {
    const l = readLinks(raw, NOW);
    assert.equal(l.length, 2);
    assert.ok(l[0].url?.includes("SOW.docx"));
    assert.equal(l[1].url, null);
    assert.ok(l[1].label.includes("Recording"));
  });
  test("the completeness report is read, including the ceiling", () => {
    const r = readReport(raw);
    assert.equal(r?.messages, 214);
    assert.equal(r?.scrolled, 8);
    assert.equal(r?.ceilingHit, true);
  });
  test("the receipt says what was skipped — silence would read as took-everything", () => {
    const line = captureReceipt({
      space: "Global Sales Team",
      kept: 12,
      skipped: 41,
      links: 2,
      report: { messages: 53, scrolled: 3, oldest: "2026-06-02", ceilingHit: false },
    });
    assert.ok(line.includes("12 messages"));
    assert.ok(line.includes("41 already in the brain"));
    assert.ok(line.includes("2 links"));
  });
  test("money and secrets never survive the chain (F8)", () => {
    const dirty = `${raw}\n⟦MSG⟧ Eric Ronci ⟦AT⟧ 2026-07-30T13:00 ⟦BODY⟧\nthey quoted $48,000 a year and the passcode is 559 221 887#`;
    const c = normalizeCapture(dirty);
    assert.ok(!/\$48,000/.test(c.body), "a dollar figure reached storage");
    assert.ok(!/559 221 887/.test(c.body), "a passcode reached storage");
  });
  test("a re-grab adds only what is new (F9)", () => {
    const first = readMessages(raw, NOW);
    const seen = new Set(first.map(msgKey));
    const again = readMessages(
      `${raw}\n⟦MSG⟧ Deana Morgan ⟦AT⟧ 2026-07-30T14:00 ⟦BODY⟧\nnew line entirely`,
      NOW,
    );
    const unseen = unseenMessages(again, seen);
    assert.equal(unseen.length, 1);
    assert.equal(unseen[0].speaker, "Deana Morgan");
  });
  test("the same body checksums the same regardless of whitespace", () => {
    assert.equal(checksum("a  b\n c"), checksum("a b c"));
  });
});

// ── segmentation ────────────────────────────────────────────────────────────
describe("one capture becomes the conversations it holds", () => {
  test("a long silence opens a new conversation", () => {
    const segs = segmentMessages([
      msg({ at: "2026-07-30T09:00:00Z", body: "morning thread" }),
      msg({ at: "2026-07-30T09:05:00Z", body: "still the same thread" }),
      msg({ at: "2026-07-30T15:00:00Z", body: "a different subject entirely" }),
    ]);
    assert.equal(segs.length, 2);
    assert.equal(segs[0].msgs.length, 2);
  });
  test("a day boundary always breaks", () => {
    const segs = segmentMessages([
      msg({ at: "2026-07-29T23:50:00Z", body: "late" }),
      msg({ at: "2026-07-30T00:10:00Z", body: "next day" }),
    ]);
    assert.equal(segs.length, 2);
  });
  test("segment keys are stable across re-captures", () => {
    const ms = [msg({ at: "2026-07-30T09:00:00Z", body: "anchor message here" })];
    assert.equal(segmentMessages(ms)[0].key, segmentMessages([...ms])[0].key);
  });
  test("the model may merge but never split", () => {
    const segs = segmentMessages([
      msg({ at: "2026-07-30T09:00:00Z", body: "one" }),
      msg({ at: "2026-07-30T15:00:00Z", body: "two" }),
    ]);
    assert.equal(applyMerges(segs, [true]).length, 1);
    assert.equal(applyMerges(segs, [false]).length, 2);
  });
  test("a transcript stays whole unless it is very long", () => {
    assert.equal(segmentTranscript("a short meeting transcript", NOW).length, 1);
    assert.ok(segmentTranscript("x ".repeat(30_000), NOW).length > 1);
  });
});

// ── extraction ──────────────────────────────────────────────────────────────
describe("extraction refuses what it cannot source", () => {
  const body =
    "Lesha Cyphers: Every Brazil deal we have won went out on EOR first, with the entity deferred to year two.";

  test("a locatable quote yields a span", () => {
    const span = locateQuote(body, "went out on EOR first");
    assert.ok(span && span.start > 0 && span.end > span.start);
  });
  test("whitespace drift still locates", () => {
    assert.ok(locateQuote(body, "went out   on EOR\nfirst"));
  });
  test("a quote that isn't there returns null — that is the hallucination catch", () => {
    assert.equal(locateQuote(body, "we always require a deposit"), null);
  });
  test("an unsourceable claim is dropped, not stored (F2)", () => {
    const r = sanitizeExtract(
      {
        summary: "s",
        claims: [
          {
            text: "real",
            speaker: "Lesha",
            kind: "decision",
            confidence: "stated",
            entities: [],
            askShape: "",
            prompted: "",
            quote: "went out on EOR first",
          },
          {
            text: "invented",
            speaker: "Lesha",
            kind: "fact",
            confidence: "stated",
            entities: [],
            askShape: "",
            prompted: "",
            quote: "nothing like this appears",
          },
        ],
        topicMatches: [],
        topicProposals: [],
        linkRefs: [],
      },
      body,
    );
    assert.equal(r.claims.length, 1);
    assert.equal(r.dropped, 1);
    assert.equal(r.claims[0].text, "real");
  });
  test("too many failures reject the whole extraction", () => {
    assert.equal(extractionRejected(4, 1), false);
    assert.equal(extractionRejected(1, 4), true);
  });
  test("askShape only survives on a prospect question (C7)", () => {
    const r = sanitizeExtract(
      {
        summary: "",
        claims: [
          {
            text: "a",
            speaker: "buyer",
            kind: "prospect-question",
            confidence: "stated",
            entities: [],
            askShape: "definitional",
            prompted: "the EOR slide",
            quote: "went out on EOR first",
          },
          {
            text: "b",
            speaker: "x",
            kind: "fact",
            confidence: "stated",
            entities: [],
            askShape: "commercial",
            prompted: "nonsense",
            quote: "entity deferred to year two",
          },
        ],
        topicMatches: [],
        topicProposals: [],
        linkRefs: [],
      },
      body,
    );
    assert.equal(r.claims[0].askShape, "definitional");
    assert.equal(r.claims[0].prompted, "the EOR slide");
    assert.equal(r.claims[1].askShape, "");
  });
  test("transcripts get the parent brain, app rows get the light one", () => {
    assert.equal(modelForOrigin("demo"), "claude-opus-5");
    assert.equal(modelForOrigin("teams"), "claude-opus-5");
    assert.equal(modelForOrigin("todo"), "claude-haiku-4-5");
  });
  test("junk degrades to empty rather than throwing", () => {
    const r = sanitizeExtract(null, body);
    assert.deepEqual(r.claims, []);
    assert.equal(r.summary, "");
  });
});

// ── the index ───────────────────────────────────────────────────────────────
describe("the index accumulates and stays still", () => {
  test("labels fold past plurals, punctuation and word order", () => {
    assert.ok(sameLabel("EOR risk", "EOR risks"));
    assert.ok(sameLabel("Risks with EOR", "EOR risk"));
    assert.ok(!sameLabel("EOR risk", "Payroll risk"));
    assert.equal(foldLabel("The Handover Process!"), "handover process");
  });
  test("a proposal needs three documents before it reaches the rail", () => {
    let pool = proposeTopic([], { label: "Brazil hiring", why: "" }, "d1", NOW);
    pool = proposeTopic(pool, { label: "Brazil hirings", why: "" }, "d2", NOW);
    assert.equal(readyToPromote(pool).length, 0);
    pool = proposeTopic(pool, { label: "Brazil hiring", why: "" }, "d3", NOW);
    assert.equal(readyToPromote(pool).length, 1);
    assert.equal(TOPIC_PROMOTE_AT, 3);
  });
  test("one loud document cannot promote a topic on its own", () => {
    let pool = proposeTopic([], { label: "Wallet", why: "" }, "d1", NOW);
    pool = proposeTopic(pool, { label: "Wallet", why: "" }, "d1", NOW);
    pool = proposeTopic(pool, { label: "Wallet", why: "" }, "d1", NOW);
    assert.equal(readyToPromote(pool).length, 0);
  });
  test("a merged topic keeps its row and redirects forever (I1)", () => {
    const topics = [
      topic({ id: "old", label: "EOR risks", status: "merged", mergedInto: "new" }),
      topic({ id: "new", label: "EOR risk" }),
    ];
    assert.equal(resolveTopic(topics, "old")?.id, "new");
  });
  test("only near-but-not-identical labels are worth arbitrating", () => {
    const pairs = mergeCandidates([
      topic({ id: "a", label: "Brazil payroll calendar" }),
      topic({ id: "b", label: "Brazil payroll calendars" }),
      topic({ id: "c", label: "Partner commercials" }),
    ]);
    assert.ok(pairs.length <= 1);
  });
  test("a topic's branch is reachable to any depth", () => {
    const topics = [
      topic({ id: "root", label: "Brazil" }),
      topic({ id: "kid", label: "Entity vs EOR", parentId: "root" }),
      topic({ id: "grand", label: "Notice periods", parentId: "kid" }),
    ];
    assert.deepEqual(descendantIds(topics, "root").sort(), ["grand", "kid", "root"]);
  });
  test("prospect questions lead the rail (C7)", () => {
    const rail = railTopics([
      topic({ id: "a", label: "Handover", claimCount: 90 }),
      topic({ id: "b", label: PROSPECT_TOPIC_LABEL, claimCount: 4 }),
    ]);
    assert.equal(rail[0].label, PROSPECT_TOPIC_LABEL);
  });
  test("the nag is global and says how long it has been (I.7.2)", () => {
    const line = stalenessLine("2026-07-24T16:12:00Z", NOW);
    assert.ok(/Nothing new since/.test(line));
    assert.ok(/6 days/.test(line));
    assert.ok(!/chat|channel|space/i.test(line), "the nag named a space");
  });
});

// ── decomposition ───────────────────────────────────────────────────────────
describe("decomposition refuses more often than it splits", () => {
  test("a topic under the threshold is never considered", () => {
    assert.equal(
      shouldConsiderSplit(topic({ id: "t", label: "x", claimCount: 12 }), 0),
      false,
    );
    assert.equal(
      shouldConsiderSplit(topic({ id: "t", label: "x", claimCount: 55 }), 0),
      true,
    );
  });
  test("a topic that already has children is not re-split", () => {
    assert.equal(
      shouldConsiderSplit(topic({ id: "t", label: "x", claimCount: 90 }), 3),
      false,
    );
  });
  test("a keep verdict survives sanitising", () => {
    assert.equal(
      sanitizeSplit({ verdict: "keep", why: "one subject" }, new Set()).verdict,
      "keep",
    );
  });
  test("children under the minimum are refused (F5)", () => {
    const ids = new Set(["1", "2", "3", "4", "5", "6"]);
    const r = sanitizeSplit(
      {
        verdict: "split",
        why: "",
        children: [
          { label: "A", summary: "", claimIds: ["1", "2", "3", "4", "5"] },
          { label: "B", summary: "", claimIds: ["6"] },
        ],
      },
      ids,
    );
    assert.equal(r.verdict, "keep", "a one-claim child was allowed to become a topic");
  });
  test("a claim can only land in one child", () => {
    const ids = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
    const r = sanitizeSplit(
      {
        verdict: "split",
        why: "",
        children: [
          { label: "A", summary: "", claimIds: ["1", "2", "3", "4", "5"] },
          { label: "B", summary: "", claimIds: ["5", "6", "7", "8", "9", "10"] },
        ],
      },
      ids,
    );
    assert.equal(r.verdict, "split");
    assert.ok(!r.children[1].claimIds.includes("5"));
  });
});

// ── retrieval ───────────────────────────────────────────────────────────────
describe("retrieval plans, fuses and ranks without looking at origin", () => {
  test("a hallucinated topic id is dropped", () => {
    const p = sanitizePlan(
      {
        intent: "lookup",
        topicIds: ["real", "invented"],
        entities: [],
        phrases: [],
        timeframe: null,
        originHint: null,
        needsRecent: false,
        hardness: "routine",
      },
      new Set(["real"]),
    );
    assert.deepEqual(p.topicIds, ["real"]);
  });
  test("originHint stays null unless it was asked for (C1)", () => {
    const p = sanitizePlan({ intent: "lookup", originHint: null }, new Set());
    assert.equal(p.originHint, null);
    assert.equal(fallbackPlan("what do we say about Brazil").originHint, null);
  });
  test("the fallback plan works with no model at all", () => {
    const p = fallbackPlan("how long does implementation take");
    assert.ok(p.phrases.includes("implementation"));
  });
  test("recency decays, and decays twice as fast when the question wants now", () => {
    const old = "2026-03-30T18:00:00.000Z";
    assert.ok(recencyWeight(NOW, NOW, false) > recencyWeight(old, NOW, false));
    assert.ok(recencyWeight(old, NOW, true) < recencyWeight(old, NOW, false));
  });
  test("agreement across roads outranks a single road", () => {
    const a = claim({ id: "a", text: "Brazil deals go out on EOR first of all" });
    const b = claim({
      id: "b",
      text: "Mexico contractors are paid through invoices monthly",
    });
    const out = fuse(
      [
        { claim: a, road: "topic" },
        { claim: a, road: "entity" },
        { claim: a, road: "lexical", lexicalRank: 1 },
        { claim: b, road: "lexical", lexicalRank: 0.2 },
      ],
      { nowIso: NOW, needsRecent: false },
    );
    assert.equal(out[0].claim.id, "a");
    assert.equal(out[0].roads.length, 3);
  });
  test("corroboration counts documents, not claims", () => {
    const text = "Implementation runs four to six weeks from signature to first payroll";
    const out = fuse(
      [
        { claim: claim({ id: "1", docId: "d1", text }), road: "topic" },
        { claim: claim({ id: "2", docId: "d1", text }), road: "topic" },
      ],
      { nowIso: NOW, needsRecent: false },
    );
    // Same document twice is not corroboration, and the near-duplicate collapses.
    assert.equal(out.length, 1);
    assert.equal(out[0].corroboration, 0);
  });
  test("near-identical assertions are recognised", () => {
    assert.ok(
      sameAssertion(
        "Implementation takes four to six weeks from signature",
        "implementation takes four to six weeks from signature to payroll",
      ),
    );
    assert.ok(!sameAssertion("Brazil needs an entity", "Mexico contractors invoice us"));
  });
  test("the candidate set is capped", () => {
    const many = Array.from({ length: 200 }, (_, i) =>
      claim({
        id: `c${i}`,
        docId: `d${i}`,
        text: `distinct assertion number ${i} about payroll`,
      }),
    );
    const out = fuse(
      many.map((c) => ({ claim: c, road: "topic" as const })),
      { nowIso: NOW, needsRecent: false },
    );
    assert.ok(out.length <= CANDIDATE_CAP);
  });
});

// ── synthesis ───────────────────────────────────────────────────────────────
describe("the answer composes, commits, and refuses well", () => {
  const cands = (n: number, over: Partial<Claim> = {}) =>
    Array.from({ length: n }, (_, i) => ({
      claim: claim({ id: `c${i}`, text: `claim ${i}`, ...over }),
      roads: ["topic" as const],
      lexicalRank: 0,
      corroboration: 0,
      score: 1,
    }));

  test("a fabricated citation handle is discarded", () => {
    const a = sanitizeAnswer(
      { answer: "x", citations: [1, 99, 2], confidence: "firm" },
      3,
    );
    assert.deepEqual(a.citations, [1, 2]);
  });
  test("verbatim runs are measured, not trusted (F11)", () => {
    const source =
      "Every Brazil deal we have won so far went out on EOR first with the entity conversation deferred to year two because the timeline for standing one up was quoted at four to six months";
    assert.ok(longestVerbatimRun(source, [source]) > 25);
    assert.ok(violatesVerbatim(source, [source]));
    assert.ok(!violatesVerbatim("We lead with EOR and defer entities.", [source]));
  });
  test("a marked quotation is allowed", () => {
    const source =
      "Every Brazil deal we have won so far went out on EOR first with the entity conversation deferred to year two because the timeline for standing one up was quoted at four to six months";
    const answer = `Lesha put it plainly: “${source}”`;
    assert.ok(!violatesVerbatim(answer, [source]));
  });
  test("thin is surfaced rather than hidden (F12)", () => {
    assert.equal(readConfidence(cands(2), NOW), "thin");
    assert.equal(
      readConfidence(cands(5, { confidence: "hedged" }), NOW),
      "thin",
      "all-hedged evidence read as firm",
    );
    assert.equal(readConfidence(cands(5), NOW), "firm");
  });
  test("a contested record reads mixed", () => {
    const c = cands(4);
    c[0].claim.disputedWith = [c[1].claim.id];
    c[1].claim.disputedWith = [c[0].claim.id];
    assert.equal(readConfidence(c, NOW), "mixed");
  });
  test("the harder brain takes over when the record fights itself", () => {
    const plain = cands(5);
    assert.equal(modelFor(plain, fallbackPlan("q")), MODEL_SYNTH);
    const contested = cands(6);
    contested[0].claim.disputedWith = [contested[1].claim.id];
    contested[1].claim.disputedWith = [contested[0].claim.id];
    contested[2].claim.disputedWith = [contested[3].claim.id];
    contested[3].claim.disputedWith = [contested[2].claim.id];
    assert.equal(modelFor(contested, fallbackPlan("q")), MODEL_SYNTH_HARD);
  });
  test("a comparative question escalates", () => {
    assert.equal(
      modelFor(cands(4), { ...fallbackPlan("q"), intent: "comparative" }),
      MODEL_SYNTH_HARD,
    );
  });
  test("the contract forbids answering from world knowledge", () => {
    const src = readFileSync(join(root, "src/lib/intranet/synthesize.ts"), "utf8");
    assert.ok(/Answer from this record only/.test(src));
    assert.ok(
      (src.match(/answer from this record only/gi) ?? []).length >= 2,
      "the strongest clause is stated once and easily lost",
    );
  });
});

// ── time ────────────────────────────────────────────────────────────────────
describe("time is explained in words an operator can act on", () => {
  test("pairs need a shared entity, compatible kinds, and distance", () => {
    const a = claim({
      id: "a",
      text: "entity first",
      saidAt: "2026-03-01T12:00:00Z",
      entities: ["Brazil"],
    });
    const b = claim({
      id: "b",
      text: "EOR first",
      saidAt: "2026-07-01T12:00:00Z",
      entities: ["Brazil"],
    });
    const c = claim({
      id: "c",
      text: "EOR first",
      saidAt: "2026-07-01T12:00:00Z",
      entities: ["Mexico"],
    });
    assert.equal(proposePairs([a, b]).length, 1);
    assert.equal(proposePairs([a, c]).length, 0, "different countries read as conflict");
  });
  test("same-day claims are a conversation, not a contradiction", () => {
    const a = claim({ id: "a", text: "one view", saidAt: "2026-07-01T09:00:00Z" });
    const b = claim({ id: "b", text: "another view", saidAt: "2026-07-01T17:00:00Z" });
    assert.equal(proposePairs([a, b]).length, 0);
  });
  test("a buyer's question is never in conflict with anything (C7)", () => {
    assert.equal(kindsComparable("prospect-question", "fact"), false);
    assert.equal(kindsComparable("question", "fact"), false);
    assert.equal(kindsComparable("decision", "fact"), true);
  });
  test("superseded says what to do about it", () => {
    const older = claim({
      id: "old",
      text: "the older position",
      supersededBy: "new",
      saidAt: "2026-03-01T12:00:00Z",
    });
    const newer = claim({
      id: "new",
      text: "the newer position",
      saidAt: "2026-07-30T12:00:00Z",
    });
    const s = readTime(older, new Map([["new", newer]]), NOW);
    assert.equal(s.state, "superseded");
    assert.ok(/see the newer line/.test((s as { line: string }).line));
  });
  test("disputed names both voices so the split is legible", () => {
    const a = claim({
      id: "a",
      text: "one framing",
      speaker: "Lindsey Forrest",
      disputedWith: ["b"],
    });
    const b = claim({ id: "b", text: "another framing", speaker: "Kimberly Durosko" });
    const s = readTime(a, new Map([["b", b]]), NOW);
    assert.equal(s.state, "disputed");
    assert.ok(/Lindsey/.test((s as { line: string }).line));
  });
  test("aging is per kind — a commitment sours long before a fact", () => {
    const old = "2026-05-01T12:00:00Z";
    assert.equal(
      readTime(
        claim({ id: "x", text: "owed", kind: "commitment", saidAt: old }),
        new Map(),
        NOW,
      ).state,
      "aging",
    );
    assert.equal(
      readTime(
        claim({ id: "y", text: "a fact", kind: "fact", saidAt: old }),
        new Map(),
        NOW,
      ).state,
      "current",
    );
    assert.equal(
      readTime(
        claim({
          id: "z",
          text: "how long?",
          kind: "prospect-question",
          saidAt: "2020-01-01T00:00:00Z",
        }),
        new Map(),
        NOW,
      ).state,
      "current",
      "a prospect question aged out",
    );
    assert.equal(ageLimit("prospect-question"), Number.POSITIVE_INFINITY);
  });
  test("a superseded claim never travels alone into an answer (F6)", () => {
    const older = claim({ id: "old", text: "older", supersededBy: "new" });
    const newer = claim({ id: "new", text: "newer" });
    const out = withSupersessions([older], new Map([["new", newer]]));
    assert.equal(out.length, 2);
  });
  test("disputes are counted for the escalation trigger", () => {
    const a = claim({ id: "a", text: "a", disputedWith: ["b"] });
    const b = claim({ id: "b", text: "b", disputedWith: ["a"] });
    assert.equal(disputeCount([a, b]), 1);
  });
});

// ── the mirror and C6 ───────────────────────────────────────────────────────
describe("the app's own record, and the promise never to forget it", () => {
  test("an unchanged row costs nothing (F10)", () => {
    assert.equal(syncVerdict("abc", "abc"), "skip");
    assert.equal(syncVerdict("abc", "xyz"), "update");
    assert.equal(syncVerdict(null, "abc"), "create");
  });
  test("a vanished app row is stamped, never deleted (C6)", () => {
    const line = goneLine("2026-07-30T12:00:00Z");
    assert.ok(/has since been removed from the app/.test(line));
    const src = readFileSync(join(root, "src/lib/intranet/mirror.ts"), "utf8");
    assert.ok(!/\.delete\(|deleteMany/.test(src), "the mirror learned to delete");
  });
  test("the Playbook's namespaces defer to their own phase", () => {
    assert.ok(isPlaybookNamespace("playbook:market"));
    assert.ok(!isPlaybookNamespace("001simploy"));
  });
  test("a prospect question's shape is read into plain words (C7)", () => {
    const line = askShapeRead("definitional", "the EOR slide");
    assert.ok(/still working out what it is/.test(line));
    assert.ok(/the EOR slide/.test(line));
  });
});

// ── the wiring ──────────────────────────────────────────────────────────────
describe("the room is wired where the operator can reach it", () => {
  const nav = readFileSync(join(root, "src/components/app-wayfinder.tsx"), "utf8");
  const page = readFileSync(join(root, "src/app/intranet/page.tsx"), "utf8");
  const client = readFileSync(join(root, "src/app/intranet/intranet-client.tsx"), "utf8");
  const css = readFileSync(join(root, "src/app/command-center.module.css"), "utf8");

  test("Intranet sits in the working row", () => {
    const main = nav.split("app-route-archive")[0];
    assert.ok(main.includes('href="/intranet"'), "the tab is missing or archived");
    assert.ok(page.includes('current="Intranet"'));
  });
  test("the ask bar, the rail and the fold are all present", () => {
    for (const marker of ["Ask", "Show the reasoning", "add to the brain", "itRail"]) {
      assert.ok(client.includes(marker), `missing: ${marker}`);
    }
  });
  test("citations drill and the drawer closes on a click away", () => {
    assert.ok(client.includes("intranetPassage"));
    assert.ok(client.includes("useDismiss"));
  });
  test("the tables ship as SQL for the founder to run", () => {
    assert.ok(existsSync(join(root, "docs/intranet-tables.sql")));
    const sql = readFileSync(join(root, "docs/intranet-tables.sql"), "utf8");
    for (const t of [
      "IntranetCapture",
      "IntranetDoc",
      "IntranetClaim",
      "IntranetTopic",
      "IntranetAsk",
    ]) {
      assert.ok(sql.includes(`"${t}"`), `${t} missing from the migration`);
    }
    assert.ok(sql.includes("originGone"), "C6 has no column");
    assert.ok(sql.includes("askShape"), "C7 has no column");
    assert.ok(!/DROP TABLE|DELETE FROM/i.test(sql), "the migration destroys something");
  });
  test("every class the room asks for exists", () => {
    const used = new Set<string>();
    for (const m of client.matchAll(/styles\.([A-Za-z_][A-Za-z0-9_]*)/g)) used.add(m[1]);
    const defined = new Set<string>();
    for (const m of css.matchAll(/\.([A-Za-z_][A-Za-z0-9_]*)/g)) defined.add(m[1]);
    assert.deepEqual(
      [...used].filter((c) => !defined.has(c)),
      [],
    );
  });
});

// ── the runners ─────────────────────────────────────────────────────────────
describe("the chain that fills the brain is wired end to end", () => {
  const runners = readFileSync(join(root, "src/app/intranet/runners.ts"), "utf8");
  const client = readFileSync(join(root, "src/app/intranet/intranet-client.tsx"), "utf8");
  const page = readFileSync(join(root, "src/app/intranet/page.tsx"), "utf8");

  test("every phase has a runner, and the orchestrator calls them all", () => {
    for (const fn of [
      "syncApp", // 4 · the app mirror
      "ingestPlaybook", // 5 · the Playbook and the prospect root
      "extractPending", // 6 · reading documents into claims
      "indexTopics", // 7 · promotion, folding, counts, summaries
      "decomposeTopics", // 8 · splitting what has grown
      "readTimeAcrossTopics", // 12 · superseded and disputed
    ]) {
      assert.ok(
        runners.includes(`export async function ${fn}`),
        `${fn} has no runner — its library would never be called`,
      );
      const orchestrator =
        /export async function runBrain[\s\S]*?\n}\n/.exec(runners)?.[0] ?? "";
      assert.ok(orchestrator.includes(fn), `runBrain never calls ${fn}`);
    }
  });
  test("the operator can start it, and sees what it did", () => {
    assert.ok(client.includes("runBrain"), "nothing in the room starts the chain");
    assert.ok(client.includes("Bring the brain up to date"));
    assert.ok(client.includes("deep pass"));
    assert.ok(client.includes("itRunLines"), "the report is never shown");
    assert.ok(page.includes("brainQueue"), "the room can't say what is waiting");
  });
  test("re-reading a document replaces its claims rather than doubling them", () => {
    const extract =
      /export async function extractPending[\s\S]*?\n}\n/.exec(runners)?.[0] ?? "";
    assert.ok(
      /intranetClaim\.deleteMany\(\{ where: \{ docId/.test(extract),
      "a re-read would leave the old claims behind and double the record",
    );
    assert.ok(extract.includes("PROMPT_VERSION"), "a rubric bump would never re-read");
  });
  test("nothing but a re-read ever deletes (C6)", () => {
    // The single deleteMany above is claims being rewritten in the same breath.
    // Any other delete in the runners would break the promise.
    const deletes = runners.match(/delete(Many)?\(/g) ?? [];
    assert.equal(deletes.length, 1, "a second delete appeared in the runners");
    assert.ok(
      /originGone: new Date\(\)/.test(runners),
      "a vanished app row is not being marked",
    );
  });
  test("an unchanged app row costs nothing to re-sync (F10)", () => {
    assert.ok(runners.includes("syncVerdict"), "the mirror stopped comparing checksums");
    const upsert = /async function upsertDocs[\s\S]*?\n}\n/.exec(runners)?.[0] ?? "";
    assert.ok(/=== "skip"/.test(upsert), "an unchanged row is re-extracted anyway");
  });
  test("a changed document is queued for re-reading, not left stale", () => {
    const upsert = /async function upsertDocs[\s\S]*?\n}\n/.exec(runners)?.[0] ?? "";
    assert.ok(/extractedAt: null/.test(upsert));
  });
  test("prospect questions are filed into their shape (C7)", () => {
    assert.ok(runners.includes("fileProspectQuestions"));
    assert.ok(runners.includes("PROSPECT_SHAPE_TOPICS"));
    assert.ok(runners.includes("seedProspectTopics"));
  });
  test("every stage is bounded, so one pass never runs away", () => {
    for (const sig of [
      "syncApp(budget = 400)",
      "extractPending(budget = 8)",
      "decomposeTopics(budget = 2)",
      "readTimeAcrossTopics(budget = 2)",
    ]) {
      assert.ok(runners.includes(sig), `unbounded runner: ${sig}`);
    }
  });
  test("a failing stage never stops the ones after it", () => {
    const orchestrator =
      /export async function runBrain[\s\S]*?\n}\n/.exec(runners)?.[0] ?? "";
    // The guard at the top may refuse the whole pass (no database, read-only).
    // Inside the stage loop nothing may return: a stage that fails records its
    // reason and the next one still runs.
    const loop =
      /for \(const \[, run\] of stages\) \{[\s\S]*?\n  \}/.exec(orchestrator)?.[0] ?? "";
    assert.ok(loop, "the stage loop moved");
    assert.ok(!/\breturn\b/.test(loop), "one bad stage aborts the pass");
  });
});

// ── verdicts ────────────────────────────────────────────────────────────────
describe("a contradiction has to justify itself", () => {
  const a = claim({
    id: "a",
    text: "Standing up a Brazilian entity was quoted at four to six months",
    saidAt: "2026-03-01T12:00:00Z",
  });
  const b = claim({
    id: "b",
    text: "Every Brazil deal since has gone out on EOR first",
    saidAt: "2026-07-01T12:00:00Z",
  });
  const byId = new Map([
    ["a", a],
    ["b", b],
  ]);

  test("a verdict that cannot quote both claims is discarded", () => {
    const kept = sanitizeVerdicts(
      {
        pairs: [
          {
            aId: "a",
            bId: "b",
            verdict: "supersedes",
            why: "they conflict",
            onSamePoint: "Brazil",
          },
        ],
      },
      byId,
    );
    assert.equal(kept.length, 0, "an unjustified verdict survived");
  });
  test("a verdict that quotes both is kept", () => {
    const kept = sanitizeVerdicts(
      {
        pairs: [
          {
            aId: "a",
            bId: "b",
            verdict: "supersedes",
            why: "The earlier line said standing up a Brazilian entity was quoted at four to six months; the later says every Brazil deal since has gone out on EOR first.",
            onSamePoint: "how we enter Brazil",
          },
        ],
      },
      byId,
    );
    assert.equal(kept.length, 1);
    assert.equal(kept[0].verdict, "supersedes");
  });
  test("unrelated needs no justification — it asserts nothing", () => {
    const kept = sanitizeVerdicts(
      { pairs: [{ aId: "a", bId: "b", verdict: "unrelated", why: "", onSamePoint: "" }] },
      byId,
    );
    assert.equal(kept[0].verdict, "unrelated");
  });
  test("the later claim always supersedes the earlier", () => {
    assert.equal(supersessionDirection(a, b).newer.id, "b");
    assert.equal(supersessionDirection(b, a).newer.id, "b");
  });
  test("an unknown claim id is dropped rather than trusted", () => {
    const kept = sanitizeVerdicts(
      {
        pairs: [
          { aId: "a", bId: "ghost", verdict: "disputes", why: "x", onSamePoint: "" },
        ],
      },
      byId,
    );
    assert.equal(kept.length, 0);
  });
  test("a summary is regenerated once its topic has grown a quarter", () => {
    assert.equal(summaryStale(10, 8), true);
    assert.equal(summaryStale(9, 8), false);
    assert.equal(summaryStale(4, 0), true);
  });
});
