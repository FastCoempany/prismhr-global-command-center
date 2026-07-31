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
  asKind,
  locateQuote,
  modelForOrigin,
  sanitizeRead,
} from "../src/lib/intranet/extract";
import {
  BANK,
  BUYER_QUESTIONS_PARENT,
  BUYER_QUESTIONS_SUB,
  bankParentOf,
  bankPrompt,
} from "../src/lib/intranet/bank";
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
import {
  goneLine,
  mirrorAccountNote,
  mirrorCard,
  mirrorDemoNote,
  mirrorTodo,
  mirrorTouch,
  syncVerdict,
} from "../src/lib/intranet/mirror";
import {
  CEILINGS,
  EVAL_SET,
  TARGETS,
  abstained,
  attributionHolds,
  groundedness,
  healthLine,
  readCeilings,
  recallAt,
  scoreCase,
  summarise,
} from "../src/lib/intranet/evals";
import {
  accountsMentioned,
  askHref,
  harvestBattlecards,
  peerQuestions,
  promotionDraft,
  sameAsk,
  scopedAsk,
  type ProspectAsk,
} from "../src/lib/intranet/bridges";
import {
  askShapeRead,
  isPlaybookNamespace,
  playbookKnowledgeDoc,
} from "../src/lib/intranet/playbook-in";
import {
  archiveDayMeta,
  archiveRollup,
  chicagoDay,
  countryOf,
  countryTallies,
  dayLabel,
  flagSrc,
  groupByDay,
  launderDigest,
  type LedgerEntry,
} from "../src/lib/intranet/ledger";
import {
  sanitizeVerdicts,
  summaryStale,
  supersessionDirection,
} from "../src/lib/intranet/verdicts";
import type { Answer, Candidate, Claim, Msg, Topic } from "../src/lib/intranet/types";

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

// ── the liberal read (V.1) ──────────────────────────────────────────────────
describe("the liberal read organizes, files, and briefs", () => {
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
  test("a statement without a locatable quote is KEPT — liberal, not rigid (V.1)", () => {
    const r = sanitizeRead(
      {
        brief: "what I did",
        filings: [
          {
            topic: "EOR",
            subtopic: "EOR transitions & conversions",
            statements: [
              {
                text: "Brazil deals go EOR first",
                speaker: "Lesha Cyphers",
                kind: "decision",
                countries: ["Brazil"],
                quote: "went out on EOR first",
              },
              {
                text: "kept even without a source span",
                speaker: "Lesha Cyphers",
                kind: "fact",
                countries: [],
                quote: "nothing like this appears",
              },
            ],
          },
        ],
      },
      body,
    );
    assert.equal(r.brief, "what I did");
    assert.equal(r.filings.length, 1);
    assert.equal(r.filings[0].statements.length, 2);
    assert.ok(r.filings[0].statements[0].offsetStart > 0);
    assert.equal(r.filings[0].statements[1].offsetStart, 0);
  });
  test("loose kind words land on the doctrine's kinds", () => {
    assert.equal(asKind("buyer-question"), "prospect-question");
    assert.equal(asKind("Decision"), "decision");
    assert.equal(asKind("how we do it"), "process");
    assert.equal(asKind("gibberish"), "fact");
  });
  test("every read gets opus or better — never haiku (decreed 2026-07-31)", () => {
    assert.equal(modelForOrigin("demo"), "claude-opus-5");
    assert.equal(modelForOrigin("teams"), "claude-opus-5");
    assert.equal(modelForOrigin("todo"), "claude-opus-5");
  });
  test("junk degrades to empty rather than throwing", () => {
    const r = sanitizeRead(null, body);
    assert.deepEqual(r.filings, []);
    assert.equal(r.brief, "");
  });
});

// ── the foundational bank (V.3) ─────────────────────────────────────────────
describe("the bank is the floor every filing lands on", () => {
  test("every parent carries concrete subtopics", () => {
    assert.ok(BANK.length >= 10, "the bank thinned out");
    for (const p of BANK) {
      assert.ok(p.subs.length >= 3, `${p.label} has too few subtopics`);
      assert.ok(p.summary.length > 0);
    }
  });
  test("buyer questions are content under Deals & selling, not a rail category (V.4)", () => {
    const parent = bankParentOf(BUYER_QUESTIONS_PARENT);
    assert.ok(parent, "the buyer-questions parent left the bank");
    assert.ok(parent!.subs.some((s) => s.label === BUYER_QUESTIONS_SUB));
  });
  test("the rendered bank is text only — no ids, no codes (V.2)", () => {
    const prompt = bankPrompt([{ parent: "EOR", label: "A grown subtopic" }]);
    assert.ok(prompt.includes("EOR"));
    assert.ok(prompt.includes("A grown subtopic"));
    assert.ok(!/\bc[a-z0-9]{20,}\b/.test(prompt), "a database id leaked into the prompt");
    assert.ok(!/\d{3,}/.test(prompt), "numeric codes leaked into the prompt");
  });
  test("a grown subtopic that duplicates a seeded one is not offered twice", () => {
    const prompt = bankPrompt([{ parent: "EOR", label: "how eor works" }]);
    const hits = prompt.match(/How EOR works/gi) ?? [];
    assert.equal(hits.length, 1);
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
  test("the rail leads with the bank's subjects, in their decreed order (V.4)", () => {
    const rail = railTopics([
      topic({ id: "a", label: "Handover", claimCount: 90 }),
      topic({ id: "b", label: "Deals & selling", claimCount: 4 }),
      topic({ id: "c", label: "Payroll operations", claimCount: 1 }),
    ]);
    assert.equal(rail[0].label, "Payroll operations");
    assert.equal(rail[1].label, "Deals & selling");
    assert.equal(rail[2].label, "Handover");
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
  test("the ask bar, the rail, the paste dock and the fold are all present", () => {
    for (const marker of [
      "Ask",
      "Show the reasoning",
      "Paste into the brain",
      "itRail",
    ]) {
      assert.ok(client.includes(marker), `missing: ${marker}`);
    }
  });
  test("the index rail sits on the left and the page has no subtitle (IV.3)", () => {
    assert.ok(
      client.indexOf("styles.itRail") < client.indexOf("styles.itMain"),
      "the rail moved back to the right",
    );
    assert.ok(
      /grid-template-columns:\s*288px minmax/.test(css),
      "the grid no longer leads with the rail",
    );
    assert.ok(!page.includes("styles.sub"), "the page subtitle came back");
    assert.ok(!page.includes("itKicker"), "the kicker came back");
  });
  test("pipeline vocabulary never reaches the surface (IV.1)", () => {
    for (const banned of [
      "deep pass",
      "vital signs",
      "the grabs",
      "intranetHarvest",
      "claims from",
      "documents waiting",
      "document",
    ]) {
      assert.ok(!client.includes(banned), `pipeline word on the surface: ${banned}`);
    }
  });
  test("the room survives the platform's clock (IV.2)", () => {
    assert.ok(page.includes("maxDuration"), "reads die silently to the default timeout");
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
  test("the standing backlog message never exists — the room catches itself up (V)", () => {
    // The founder: "'215 entries it hasn't read yet' as a standing message
    // should never be the case." The room reads on open, on send, on ⟳ — the
    // count appears only while it is actively working through it.
    assert.ok(
      !client.includes("hasn't read yet"),
      "the standing backlog message came back",
    );
    assert.ok(client.includes("wokeRef"), "the room no longer catches up on open");
    assert.ok(
      /queue\.pending > 0.*catchUp/.test(client),
      "the wake-up never looks at what is waiting",
    );
  });
  test("one flow: Send it reads AND drains, ⟳ sweeps, stop always works (V)", () => {
    assert.ok(client.includes("runBrain"), "nothing in the room starts the chain");
    assert.ok(
      !client.includes("Bring the brain up to date"),
      "the second button is back",
    );
    assert.ok(client.includes("itRefresh"), "the ⟳ by the title is gone");
    assert.ok(
      /g\.pending \?\? 0\) > 0/.test(client),
      "Send it no longer drains the rest",
    );
    assert.ok(client.includes("stop after this pass"), "the loop cannot be stopped");
    assert.ok(/r\.pending/.test(client), "the loop never learns when it is done");
    assert.ok(client.includes("itRunLines"), "the report is never shown");
    assert.ok(page.includes("brainQueue"), "the room can't say what is waiting");
  });
  test("reads run side by side, and catch-up passes give reading the whole clock", () => {
    assert.ok(runners.includes("CONCURRENT_READS"), "reads went back to single file");
    assert.ok(runners.includes("Promise.allSettled"), "a slow read blocks its batch");
    assert.ok(/sweep === false/.test(runners), "every pass re-sweeps the app");
    assert.ok(/sweep: false/.test(client), "the loop never skips the sweep");
  });
  test("a paste is read on the spot and the operator watches the index grow (IV.3)", () => {
    assert.ok(client.includes("readCapture"), "Keep it is fire-and-forget again");
    assert.ok(client.includes("router.refresh"), "the rail never updates after ingest");
  });
  test("a read failure says one word, and keeps the whole truth behind it (V.6)", () => {
    assert.ok(runners.includes("reasonOf"), "failures are swallowed again");
    assert.ok(runners.includes("timed out"), "a timeout has no plain-language read");
    assert.ok(runners.includes("the API key was refused"));
    assert.ok(
      /rawOf\(s\.reason\)/.test(runners),
      "a rejected read no longer keeps its untruncated detail",
    );
    assert.ok(/failed\./.test(runners), "the one-word failure line is gone");
  });
  test("the ingest runner reads the capture and settles the index", () => {
    assert.ok(runners.includes("export async function readCapture"));
    const rc = /export async function readCapture[\s\S]*?\n}\n/.exec(runners)?.[0] ?? "";
    assert.ok(rc.includes("extractPending"), "readCapture never reads");
    assert.ok(rc.includes("indexTopics"), "readCapture never settles the index");
    assert.ok(rc.includes("grewSentence"), "the visible consequence is missing");
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
  test("the bank is seeded and the question categories left the rail (V.3, V.4)", () => {
    assert.ok(runners.includes("seedBank"), "the floor is never laid");
    assert.ok(runners.includes("retireQuestionRail"), "the shape bins still stand");
    assert.ok(
      runners.includes("BUYER_QUESTIONS_SUB"),
      "buyer questions lost their drawer",
    );
    assert.ok(runners.includes("resolveFilingIds"), "filings no longer resolve by text");
    assert.ok(
      !/topicMatches/.test(runners),
      "the id-matching filing path came back (V.2 forbids it)",
    );
  });
  test("every stage is bounded, so one pass never runs away", () => {
    for (const sig of [
      /syncApp\(budget = 400\)/,
      /extractPending\(\s*budget = 8/,
      /decomposeTopics\(budget = 2\)/,
      /readTimeAcrossTopics\(budget = 2\)/,
    ]) {
      assert.ok(sig.test(runners), `unbounded runner: ${sig}`);
    }
  });
  test("a failing stage never stops the ones after it", () => {
    const orchestrator =
      /export async function runBrain[\s\S]*?\n}\n/.exec(runners)?.[0] ?? "";
    // The guard at the top may refuse the whole pass (no database, read-only).
    // Inside the stage loop nothing may return: a stage that fails records its
    // reason and the next one still runs.
    const loop =
      /for \(const \[name, run\] of stages\) \{[\s\S]*?\n    \}/.exec(
        orchestrator,
      )?.[0] ?? "";
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

// ── Phase 13 · evals, governance and the bridges ────────────────────────────
describe("the measures that decide whether the room is any good", () => {
  const cands = (texts: string[]): Candidate[] =>
    texts.map((t, i) => ({
      claim: claim({ id: `c${i}`, text: t }),
      roads: ["topic"],
      lexicalRank: 0,
      corroboration: 1,
      score: 1 - i / 100,
    }));

  test("the permanent set covers every commitment it was built to prove", () => {
    const ids = EVAL_SET.map((c) => c.id);
    for (const need of [
      "cross-corpus",
      "changed-position",
      "absent",
      "vocabulary",
      "thin",
      "prospect-questions",
    ])
      assert.ok(ids.includes(need), `the eval set lost ${need}`);
    for (const c of EVAL_SET)
      assert.ok(c.proves, `${c.id} stopped saying what it proves`);
  });
  test("attribution and abstention are held at 1.00 — the failures fluency hides", () => {
    assert.equal(TARGETS.attribution, 1);
    assert.equal(TARGETS.abstention, 1);
    assert.ok(TARGETS.recall >= 0.85);
    assert.ok(TARGETS.grounded >= 0.95);
  });
  test("recall counts what a human marked, not what came back", () => {
    const found = cands([
      "Implementation runs four to six weeks from signature to first payroll",
      "Two of them slipped past that",
    ]);
    assert.equal(recallAt(found, ["four to six weeks", "slipped"]), 1);
    assert.equal(recallAt(found, ["four to six weeks", "Reykjavik"]), 0.5);
    assert.equal(recallAt(found, []), 1, "a question with nothing to find cannot fail");
  });
  test("recall only sees the top k — a claim ranked 40th was never read", () => {
    const many = cands([...Array(30)].map((_, i) => `filler claim number ${i}`));
    many.push(...cands(["the one that mattered"]));
    assert.equal(recallAt(many, ["the one that mattered"], 20), 0);
  });
  test("a citation whose speaker has drifted is an attribution failure", () => {
    const c = claim({ id: "x", text: "we quoted six weeks", speaker: "Jeanne Hogan" });
    const byId = new Map([["x", c]]);
    assert.equal(
      attributionHolds([{ claimId: "x", speaker: "Jeanne Hogan" }], byId),
      true,
    );
    assert.equal(
      attributionHolds([{ claimId: "x", speaker: "Lesha Cyphers" }], byId),
      false,
    );
    assert.equal(
      attributionHolds([{ claimId: "ghost", speaker: "Jeanne Hogan" }], byId),
      false,
      "a citation to a claim that does not exist passed",
    );
  });
  test("an abstention is the answer naming its own emptiness", () => {
    const nothing = "Nothing in the record covers that.";
    const answered: Answer = {
      answer: "We tell people four to six weeks.",
      citations: [1],
      reasoning: "",
      setAside: [],
      confidence: "firm",
      gaps: [],
    };
    assert.equal(
      abstained({ ...answered, answer: nothing, citations: [] }, nothing),
      true,
    );
    assert.equal(abstained(answered, nothing), false);
  });
  test("a citation handle pointing past the candidate set is fabricated", () => {
    const a: Answer = {
      answer: "x",
      citations: [1, 2, 9],
      reasoning: "",
      setAside: [],
      confidence: "firm",
      gaps: [],
    };
    assert.equal(groundedness(a, 3), 2 / 3);
    assert.equal(groundedness({ ...a, citations: [] }, 3), 1);
  });
  test("a case that misattributes fails however good its recall", () => {
    const c = EVAL_SET[0];
    const claims = cands([
      "four to six weeks from signature to first payroll",
      "slipped",
    ]);
    const byId = new Map(claims.map((x) => [x.claim.id, x.claim]));
    const r = scoreCase(c, {
      candidates: claims,
      answer: {
        answer: "Four to six weeks, and it has slipped twice.",
        citations: [1, 2],
        reasoning: "",
        setAside: [],
        confidence: "firm",
        gaps: [],
      },
      cited: [{ claimId: "c0", speaker: "somebody else" }],
      byId,
      nothingLine: "Nothing in the record",
    });
    assert.equal(r.passed, false);
    assert.equal(r.note, "a citation credited the wrong speaker");
  });
  test("a failure says which commitment broke", () => {
    const summary = summarise([
      {
        id: "a",
        proves: "C1",
        recall: 1,
        attribution: true,
        abstention: true,
        grounded: 1,
        passed: true,
        note: "",
      },
      {
        id: "b",
        proves: "C7",
        recall: 0.2,
        attribution: true,
        abstention: true,
        grounded: 1,
        passed: false,
        note: "retrieval missed material a human marked relevant",
      },
    ]);
    assert.equal(summary.passed, 1);
    assert.equal(summary.failed, 1);
    assert.ok(summary.lines[1].includes("C7"));
    assert.ok(summary.lines[1].includes("retrieval missed"));
  });
});

describe("cost governance degrades the room, it never breaks it (F10)", () => {
  test("under the ceilings nothing changes", () => {
    const s = readCeilings({ docs: 10, asks: 4 });
    assert.equal(s.breached, false);
    assert.equal(s.line, "");
  });
  test("a breach says what happened and what still works", () => {
    const s = readCeilings({ docs: 0, asks: CEILINGS.asksPerDay });
    assert.equal(s.breached, true);
    assert.equal(s.which, "asks");
    assert.ok(/still work/.test(s.line), "the breach line stopped saying what survives");
    assert.ok(!/error|failed/i.test(s.line), "a ceiling is not a failure");
  });
  test("the reading ceiling holds material rather than dropping it (C6)", () => {
    const s = readCeilings({ docs: CEILINGS.docsPerDay, asks: 0 });
    assert.equal(s.which, "docs");
    assert.ok(/hold what you give it/.test(s.line));
  });
  test("a pathological candidate set is cut before it becomes a four-dollar question", () => {
    const src = readFileSync(join(root, "src/app/intranet/actions.ts"), "utf8");
    assert.ok(
      /candidates\.slice\(0, CEILINGS\.claimsPerAsk\)/.test(src),
      "synthesis stopped capping its input",
    );
    assert.ok(
      /readCeilings\(await todayCounts\(\)\)/.test(src),
      "the ask stopped checking the day",
    );
  });
  test("the health line reads in two seconds", () => {
    const line = healthLine({
      docs: 240,
      claims: 1800,
      topics: 26,
      pending: 3,
      todayDocs: 12,
      todayAsks: 4,
    });
    assert.ok(line.includes("1800 claims from 240 documents"));
    assert.ok(line.includes("3 waiting to be read"));
    assert.ok(line.includes("today: 12 read, 4 asked"));
  });
});

describe("the bridges offer, they never file (Phase 13.6)", () => {
  const ask = (
    over: Partial<ProspectAsk> & { claimId: string; text: string },
  ): ProspectAsk => ({
    shape: "commercial",
    entities: ["Brazil"],
    saidAt: "2026-06-01T12:00:00.000Z",
    docId: "d1",
    accountId: "",
    space: "Acme demo",
    ...over,
  });

  test("a question asked in one room is not a pattern", () => {
    const { propose } = harvestBattlecards(
      [
        ask({
          claimId: "1",
          text: "How do you handle contractor classification in Brazil?",
        }),
      ],
      [],
    );
    assert.equal(propose.length, 0);
  });
  test("the same worry from two separate rooms becomes a proposal (C7)", () => {
    const { propose } = harvestBattlecards(
      [
        ask({
          claimId: "1",
          text: "How do you handle contractor classification in Brazil?",
        }),
        ask({
          claimId: "2",
          docId: "d2",
          text: "What happens if a contractor gets reclassified in Brazil?",
        }),
      ],
      [],
      { minDocs: 2 },
    );
    assert.equal(propose.length, 1);
    assert.equal(propose[0].asked, 2);
    assert.ok(propose[0].read, "the proposal lost the read on why they asked");
  });
  test("a question the Playbook already asks is not proposed again", () => {
    const asks = [
      ask({
        claimId: "1",
        text: "How do you handle contractor classification in Brazil?",
      }),
      ask({
        claimId: "2",
        docId: "d2",
        text: "How do you handle contractor classification in Brazil?",
      }),
    ];
    const { propose } = harvestBattlecards(asks, [
      "How do you handle contractor classification in Brazil?",
    ]);
    assert.equal(propose.length, 0);
  });
  test("a battlecard question no buyer ever asked is ours, not theirs", () => {
    const { oursNotTheirs } = harvestBattlecards(
      [ask({ claimId: "1", text: "What does the Brazil entity cost to stand up?" })],
      ["Who signs off on your global payroll strategy today?"],
    );
    assert.deepEqual(oursNotTheirs, [
      "Who signs off on your global payroll strategy today?",
    ]);
  });
  test("two different worries never collapse into one battlecard", () => {
    assert.equal(
      sameAsk(
        "How long does payroll implementation take?",
        "How long does onboarding a contractor take?",
      ),
      false,
    );
  });
  test("a deal inherits what comparable deals provoked, never its own echo", () => {
    const asks = [
      ask({
        claimId: "1",
        text: "Who is liable if a Brazil contractor is reclassified?",
        accountId: "acct-a",
      }),
      ask({
        claimId: "2",
        text: "What does Brazil cost?",
        accountId: "acct-b",
        entities: ["Brazil"],
      }),
    ];
    const peers = peerQuestions(asks, {
      entities: ["Brazil"],
      excludeAccountId: "acct-a",
    });
    assert.equal(peers.length, 1);
    assert.equal(peers[0].claimId, "2");
    assert.deepEqual(peers[0].shared, ["Brazil"]);
  });
  test("no shared situation means no inherited question", () => {
    assert.deepEqual(
      peerQuestions([ask({ claimId: "1", text: "x", entities: ["Poland"] })], {
        entities: ["Brazil"],
      }),
      [],
    );
    assert.deepEqual(
      peerQuestions([ask({ claimId: "1", text: "x" })], { entities: [] }),
      [],
    );
  });
  test("an entity that names a book account offers a link into that deal", () => {
    const book = [
      { id: "a1", name: "Advocate Pay" },
      { id: "a2", name: "Warren Averett" },
    ];
    assert.deepEqual(accountsMentioned(["Advocate Pay, Inc."], book), [
      { id: "a1", name: "Advocate Pay" },
    ]);
    assert.deepEqual(accountsMentioned(["Brazil", "EOR"], book), []);
  });
  test("asking from anywhere starts at the account and still reads everything (C1)", () => {
    const q = scopedAsk("Advocate Pay", ["eor", "contractor"]);
    assert.ok(q.includes("Advocate Pay"));
    assert.ok(askHref(q).startsWith("/intranet?q="));
    assert.equal(scopedAsk("", []), "");
  });
  test("a promoted claim travels with where it came from", () => {
    const d = promotionDraft(
      {
        text: "Brazil entity setup ran four months on the last two deals",
        kind: "fact",
        speaker: "Jeanne Hogan",
        saidAt: "2026-05-04T12:00:00.000Z",
      },
      { space: "Global Sales Team", title: "", origin: "teams" },
    );
    assert.equal(d.ns, "market");
    assert.ok(d.line.includes("Global Sales Team, 2026-05-04"));
  });
  test("a decision promotes as a lesson, a fact as market knowledge", () => {
    const base = { text: "we lead with EOR first", speaker: "x", saidAt: "" };
    assert.equal(
      promotionDraft({ ...base, kind: "decision" }, { space: "", title: "", origin: "" })
        .ns,
      "lessons",
    );
    assert.equal(
      promotionDraft({ ...base, kind: "fact" }, { space: "", title: "", origin: "" }).ns,
      "market",
    );
  });
  test("promotion composes text and writes nothing — the Playbook is written by hand", () => {
    const src = readFileSync(join(root, "src/lib/intranet/bridges.ts"), "utf8");
    assert.ok(!/prisma|create\(|update\(|upsert\(/.test(src), "a bridge started writing");
  });
  test("a demo pipes itself in rather than waiting to be pasted", () => {
    const d = mirrorDemoNote(
      {
        id: "dn1",
        screenId: "payroll-register",
        body: "They asked twice how corrections are handled mid-cycle.",
        createdAt: "2026-07-14T15:00:00.000Z",
      },
      { name: "Acme", company: "Acme Manufacturing", persona: "CFO" },
      "Payroll Register",
    );
    assert.ok(d);
    assert.equal(d.origin, "demo");
    assert.equal(d.originRef, "dn1");
    assert.ok(d.body.includes("Payroll Register"), "the screen was dropped");
    assert.ok(d.body.includes("Acme Manufacturing"));
    assert.equal(
      mirrorDemoNote(
        { id: "x", screenId: "s", body: "  ", createdAt: "" },
        { name: "", company: "", persona: "" },
        "",
      ),
      null,
    );
  });
  test("a pasted demo transcript is never mistaken for a vanished sidekick note (C6)", () => {
    const runners = readFileSync(join(root, "src/app/intranet/runners.ts"), "utf8");
    assert.ok(
      /m\.originRef\.includes\(":"\)/.test(runners),
      "a pasted demo would be stamped as removed from the app",
    );
  });
  test("the room still imports no write action after the bridges were built", () => {
    const banned = /from "@\/app\/(room|today|accounts|playbook|dashboard)\/actions"/;
    for (const f of [
      "src/lib/intranet/bridges.ts",
      "src/lib/intranet/evals.ts",
      "src/app/intranet/actions.ts",
      "src/app/intranet/health/page.tsx",
    ])
      assert.ok(
        !banned.test(readFileSync(join(root, f), "utf8")),
        `${f} writes elsewhere`,
      );
  });
});

describe("nothing sensitive reaches storage by any road (F8, Phase 13.5)", () => {
  const nasty =
    "They came back at $48,000 a year, about 12,500 USD a quarter. Dial-in https://teams.microsoft.com/l/meetup/abc, the passcode is 559 221 887#.";

  const assertClean = (s: string, where: string) => {
    assert.ok(!/\$\s?\d/.test(s), `a dollar figure reached ${where}`);
    assert.ok(!/12,500|48,000/.test(s), `a figure reached ${where}`);
    assert.ok(!/559 221 887/.test(s), `a passcode reached ${where}`);
    assert.ok(!/teams\.microsoft\.com\/l\//.test(s), `a dial-in reached ${where}`);
  };

  test("a pasted thread is clean before its first write", () => {
    const c = normalizeCapture(
      `TEAMS THREAD - Pricing - captured 7/30/2026, 12:16 PM\n\n⟦MSG⟧ Eric Ronci ⟦AT⟧ 2026-07-30T13:00 ⟦BODY⟧\n${nasty}`,
      {},
    );
    assertClean(c.body, "a capture");
  });
  test("an account note mirrored from the app is clean", () => {
    const d = mirrorAccountNote(
      {
        id: "n1",
        accountId: "a1",
        body: nasty,
        kind: "note",
        lane: "mine",
        actors: "",
        source: "",
        createdAt: "2026-07-01T12:00:00.000Z",
      },
      "Advocate Pay",
    );
    assert.ok(d);
    assertClean(d.body, "an account note mirror");
  });
  test("an action, a follow-up, a card and a demo are all clean", () => {
    const t = mirrorTodo(
      {
        id: "t1",
        body: nasty,
        accountId: "a1",
        done: false,
        remindAt: "",
        createdAt: "2026-07-01T12:00:00.000Z",
        updatedAt: "2026-07-01T12:00:00.000Z",
      },
      "Advocate Pay",
    );
    assertClean(t!.body, "an action mirror");

    const touch = mirrorTouch({
      subjectKey: "outreach:a1",
      kind: "custom",
      label: "chase pricing",
      detail: "",
      message: nasty,
      contactedAt: "2026-07-01T12:00:00.000Z",
      status: "awaiting",
    });
    assertClean(touch!.body, "a follow-up mirror");

    const card = mirrorCard({
      id: "c1",
      name: "Advocate Pay",
      states: { discovery: "active" },
      notes: { discovery: nasty },
      archived: false,
      updatedAt: "2026-07-01T12:00:00.000Z",
    });
    assertClean(card!.body, "a card mirror");

    const demo = mirrorDemoNote(
      {
        id: "d1",
        screenId: "pricing",
        body: nasty,
        createdAt: "2026-07-01T12:00:00.000Z",
      },
      { name: "Acme", company: "Acme", persona: "" },
      "Pricing",
    );
    assertClean(demo!.body, "a demo mirror");
  });
  test("a lesson promoted into the Playbook is clean before it is read back", () => {
    const d = playbookKnowledgeDoc({
      id: "k1",
      ns: "lessons",
      text: nasty,
      account: "",
      createdAt: "2026-07-01T12:00:00.000Z",
    });
    assertClean(d!.body, "a Playbook mirror");
  });
  test("headcount survives the redaction — it is sizing intel, not a figure", () => {
    const d = mirrorAccountNote(
      {
        id: "n2",
        accountId: "a1",
        body: "They run 1,200 employees across four countries.",
        kind: "note",
        lane: "mine",
        actors: "",
        source: "",
        createdAt: "2026-07-01T12:00:00.000Z",
      },
      "Advocate Pay",
    );
    assert.ok(d!.body.includes("1,200 employees"), "headcount was stripped as money");
  });
  test("every mirrored document leaves through the same gate", () => {
    const src = readFileSync(join(root, "src/lib/intranet/mirror.ts"), "utf8");
    // Every mirror composer returns an object whose first key is `origin`.
    const returns = src.match(/\n  return (sealed\(\{|\{)\n    origin: /g) ?? [];
    assert.ok(returns.length >= 6, "the mirror composers moved");
    for (const r of returns)
      assert.ok(
        r.includes("sealed({"),
        "a mirror composes a document without redacting it",
      );
  });
});

// ── Part IV · the operator's correction ─────────────────────────────────────
describe("the grab takes the whole thread, structured (IV.4)", () => {
  const shelf = readFileSync(join(root, "src/app/intake/capture-shelf.tsx"), "utf8");

  test("every message is emitted with the delimiters the parser was built for", () => {
    for (const mark of ["⟦MSG⟧", "⟦AT⟧", "⟦BODY⟧", "⟦LINKS⟧", "⟦CAPTURED"]) {
      assert.ok(shelf.includes(mark), `the grab no longer emits ${mark}`);
    }
  });
  test("attribution is read from the DOM, never inferred from layout", () => {
    assert.ok(shelf.includes("message-author-name"), "the author node is not read");
    assert.ok(shelf.includes("dateTime"), "the instant is not read from <time>");
  });
  test("it scrolls until the top stops yielding, not eight passes", () => {
    assert.ok(shelf.includes("nogrow"), "the no-growth stop is gone");
    assert.ok(/passes>300/.test(shelf), "the safety cap is gone");
    assert.ok(!/for\(let i=0;i<8;i\+\+\)/.test(shelf), "the old eight-pass cap is back");
  });
  test("it harvests incrementally, because Teams unloads what scrolls away", () => {
    assert.ok(/const seen=new Map\(\)/.test(shelf), "no incremental harvest map");
    assert.ok(shelf.includes("harvest()"), "nothing harvests per pass");
  });
  test("an unrecognised DOM degrades to plain text and says so", () => {
    assert.ok(shelf.includes("structure not recognised"));
  });
  test("a Teams grab opens the Intranet, and the shelf says to re-drag", () => {
    assert.ok(shelf.includes("/intranet"), "the grab still opens the old room");
    assert.ok(/re-drag/i.test(shelf), "nobody is told the bookmark went stale");
  });
  test("the grab's own output parses back into messages with speakers", () => {
    const sample = [
      "TEAMS THREAD - Global Sales Team - captured 7/30/2026, 2:16 PM",
      "",
      "⟦MSG⟧ Jeanne Hogan ⟦AT⟧ 2026-07-09T09:02:00.000Z ⟦BODY⟧",
      "sell a deal, email implementation with the SOW.",
      "⟦MSG⟧ Lindsey Forrest ⟦AT⟧ 2026-07-30T12:03:00.000Z ⟦BODY⟧",
      "Plan Highlights first, then top targets.",
      "⟦CAPTURED 2 messages · scrolled 41 · oldest 2026-07-09 · ceiling⟧",
    ].join("\n");
    const m = readMessages(sample, NOW);
    assert.equal(m.length, 2);
    assert.equal(m[0].speaker, "Jeanne Hogan");
    const rep = readReport(sample);
    assert.equal(rep?.messages, 2);
    assert.equal(rep?.ceilingHit, true);
  });
});

describe("the world speaks only when the record is empty (IV.6)", () => {
  const synth = readFileSync(join(root, "src/lib/intranet/synthesize.ts"), "utf8");
  const actions = readFileSync(join(root, "src/app/intranet/actions.ts"), "utf8");
  const client = readFileSync(join(root, "src/app/intranet/intranet-client.tsx"), "utf8");

  test("the world answer exists, and knows nothing about the reader's record", () => {
    assert.ok(synth.includes("runWorldAnswer"));
    assert.ok(
      /Never invent facts about the reader's own company/.test(synth),
      "the world prompt may hallucinate internal facts",
    );
  });
  test("record synthesis still refuses to blend in world knowledge (F12)", () => {
    assert.ok(/answer from this record only/i.test(synth));
  });
  test("money is redacted from world answers like everything else", () => {
    assert.ok(
      /redactMoney\(await runWorldAnswer/.test(actions),
      "a world answer can carry a dollar figure to the screen",
    );
  });
  test("it fires only when the record has nothing — never blended", () => {
    assert.ok(
      /candidates\.length === 0/.test(actions),
      "the empty-record branch is gone",
    );
    assert.ok(
      /citations\.length === 0\s*\?\s*redactMoney/.test(actions),
      "an honest abstention no longer reaches for the world",
    );
  });
  test("the surface labels it as from outside the record", () => {
    assert.ok(client.includes("From the world, not the record"));
    assert.ok(client.includes("itWorld"), "the world block has no distinct dress");
  });
  test("buyers' own questions are read as intelligence in the answer path (C7)", () => {
    assert.ok(/BUYERS' OWN QUESTIONS/.test(synth), "the synthesis contract lost C7");
  });
});

describe("what prospects ask lives on the Playbook (IV.5)", () => {
  const pbClient = readFileSync(
    join(root, "src/app/playbook/playbook-client.tsx"),
    "utf8",
  );
  const pbPage = readFileSync(join(root, "src/app/playbook/page.tsx"), "utf8");
  const itClient = readFileSync(
    join(root, "src/app/intranet/intranet-client.tsx"),
    "utf8",
  );

  test("the Playbook carries the shelf", () => {
    assert.ok(pbClient.includes("What prospects ask"));
    assert.ok(pbClient.includes("Ours, not theirs"), "the inverse list is missing");
    assert.ok(pbPage.includes("harvestBattlecards"));
    assert.ok(pbPage.includes("prospectAsks"));
  });
  test("on the Intranet it is an index row and nothing else", () => {
    assert.ok(!itClient.includes("harvestBattlecards"));
    assert.ok(!itClient.includes("oursNotTheirs"));
  });
  test("a proposal names its provenance — the rooms it was asked in", () => {
    const { propose } = harvestBattlecards(
      [
        {
          claimId: "1",
          text: "How do you handle contractor classification in Brazil?",
          shape: "risk",
          entities: [],
          saidAt: "2026-06-01T12:00:00.000Z",
          docId: "d1",
          accountId: "",
          space: "Acme demo",
        },
        {
          claimId: "2",
          text: "What happens if a contractor gets reclassified in Brazil?",
          shape: "risk",
          entities: [],
          saidAt: "2026-06-08T12:00:00.000Z",
          docId: "d2",
          accountId: "",
          space: "Borealis call",
        },
      ],
      [],
    );
    assert.equal(propose.length, 1);
    assert.deepEqual(propose[0].rooms.sort(), ["Acme demo", "Borealis call"]);
  });
});

describe("the ingest digest says where things went, not just that the index grew", () => {
  const runners = readFileSync(join(root, "src/app/intranet/runners.ts"), "utf8");
  const rc = /export async function readCapture[\s\S]*?\n}\n/.exec(runners)?.[0] ?? "";

  test("it names what the paste was and when it spans, in a sentence (IV.9)", () => {
    assert.ok(
      rc.includes("What you pasted"),
      "the digest lost the paste's identity line",
    );
  });
  test("it tallies what was kept the way a person would say it", () => {
    assert.ok(rc.includes("questions buyers asked"), "buyer asks vanish into a number");
    assert.ok(rc.includes("Inside it I found"), "no kinds sentence");
    assert.ok(!/["`]claims?["`:]/.test(rc), "pipeline vocabulary in the digest");
  });
  test("it says where buyer asks travel — the Playbook", () => {
    assert.ok(rc.includes("will show up on the Playbook"));
  });
  test("it names book accounts the paste mentioned", () => {
    assert.ok(rc.includes("accountsMentioned"), "account mentions are not surfaced");
    assert.ok(rc.includes("came up by name"));
  });
  test("the digest speaks in sentences, not fragment-and-dot shorthand", () => {
    const runnersAll = readFileSync(join(root, "src/app/intranet/runners.ts"), "utf8");
    assert.ok(runnersAll.includes("function listOut"), "the human list helper is gone");
    assert.ok(runnersAll.includes("grewSentence"), "index growth fell back to shorthand");
    const norm = readFileSync(join(root, "src/lib/intranet/normalize.ts"), "utf8");
    assert.ok(norm.includes("Got it —"), "the receipt stopped talking like a person");
  });
  test("the button says Send it, and never Keep it (IV.9)", () => {
    const cl = readFileSync(join(root, "src/app/intranet/intranet-client.tsx"), "utf8");
    assert.ok(cl.includes('"Send it"'));
    assert.ok(!cl.includes('"Keep it"'), "the old button name came back");
  });
});

// ── the Ledger (IV.8) ───────────────────────────────────────────────────────
describe("the room is a running record that survives the tab", () => {
  const mkAsk = (id: string, at: string): LedgerEntry => ({
    kind: "ask",
    id,
    at,
    question: "q",
    answer: "a",
    reasoning: "",
    model: "",
    citations: [],
  });
  const mkFed = (id: string, at: string): LedgerEntry => ({
    kind: "fed",
    id,
    at,
    space: "Global Sales Team",
    title: "",
    origin: "teams",
    lines: ["Got it."],
    briefs: [],
    detail: [],
  });

  test("an instant lands on the operator's day, not UTC's", () => {
    // 02:00 UTC on the 31st is still the evening of the 30th in Chicago.
    assert.equal(chicagoDay("2026-07-31T02:00:00.000Z"), "2026-07-30");
    assert.equal(chicagoDay("2026-07-30T15:00:00.000Z"), "2026-07-30");
    assert.equal(chicagoDay("not a date"), "");
  });
  test("dividers speak: Today, Yesterday, then just the date", () => {
    const now = "2026-07-30T18:00:00.000Z";
    assert.ok(dayLabel("2026-07-30", now).startsWith("Today — "));
    assert.ok(dayLabel("2026-07-29", now).startsWith("Yesterday — "));
    assert.ok(!dayLabel("2026-07-22", now).includes("—"));
  });
  test("the record groups under day dividers, newest first", () => {
    const days = groupByDay(
      [
        mkAsk("a1", "2026-07-29T20:00:00.000Z"),
        mkFed("f1", "2026-07-30T19:00:00.000Z"),
        mkAsk("a2", "2026-07-30T16:00:00.000Z"),
      ],
      "2026-07-30T21:00:00.000Z",
    );
    assert.equal(days.length, 2);
    assert.equal(days[0].entries.map((e) => e.id).join(","), "f1,a2");
    assert.equal(days[1].entries[0].id, "a1");
  });
  test("the archive rolls the record into months and days with counts", () => {
    const months = archiveRollup([
      { at: "2026-07-30T15:00:00.000Z", kind: "ask" },
      { at: "2026-07-30T16:00:00.000Z", kind: "fed" },
      { at: "2026-07-30T17:00:00.000Z", kind: "ask" },
      { at: "2026-06-02T15:00:00.000Z", kind: "fed" },
    ]);
    assert.equal(months.length, 2);
    assert.equal(months[0].month, "July 2026");
    assert.equal(months[0].days[0].asks, 2);
    assert.equal(months[0].days[0].pastes, 1);
    assert.equal(archiveDayMeta(months[0].days[0]), "2 asks · 1 paste");
    assert.equal(months[1].month, "June 2026");
  });
});

describe("a country is a lens, never a copy (IV.8)", () => {
  test("an entity that names a country is read as one — exactly, not by substring", () => {
    assert.deepEqual(countryOf("Brazil"), { code: "br", name: "Brazil" });
    assert.deepEqual(countryOf("  brazil "), { code: "br", name: "Brazil" });
    assert.deepEqual(countryOf("gb"), { code: "gb", name: "United Kingdom" });
    assert.equal(countryOf("brazil nut allergy"), null);
    assert.equal(countryOf("EOR"), null);
  });
  test("the tally counts a claim once per country however noisy its entities", () => {
    // Sub-rows are the index's own subject parents (V.4) — concrete nouns,
    // never kind-words like "facts on the ground".
    const subjectOf = (id: string) =>
      id === "sub-payroll" || id === "top-payroll"
        ? { id: "top-payroll", label: "Payroll operations" }
        : id === "top-deals"
          ? { id: "top-deals", label: "Deals & selling" }
          : null;
    const rows = countryTallies(
      [
        { entities: ["Brazil", "brazil", "EOR"], topicIds: ["top-deals"] },
        { entities: ["Brazil"], topicIds: ["sub-payroll", "top-payroll"] },
        { entities: ["Germany"], topicIds: [] },
      ],
      subjectOf,
    );
    assert.equal(rows[0].name, "Brazil");
    assert.equal(rows[0].total, 2);
    assert.ok(
      rows[0].lenses.some(
        (l) =>
          l.label === "Payroll operations" && l.n === 1 && l.topicId === "top-payroll",
      ),
    );
    assert.ok(rows[0].lenses.some((l) => l.label === "Deals & selling" && l.n === 1));
    assert.ok(
      rows[0].lenses.every((l) => l.label !== "Facts on the ground"),
      "a vague kind-word survived as a sub-row",
    );
    assert.equal(rows[1].name, "Germany");
  });
  test("flags are real images, never emoji (IV.9)", () => {
    assert.ok(flagSrc("br").endsWith("/br.png"));
    const client = readFileSync(
      join(root, "src/app/intranet/intranet-client.tsx"),
      "utf8",
    );
    assert.ok(client.includes("flagSrc"), "the country rail lost its flags");
    assert.ok(!/🇧🇷|🇬🇧/.test(client), "emoji flags crept in");
    assert.ok(client.includes("onError"), "a broken flag renders as a broken image");
  });
});

describe("the ledger surface holds the decrees (IV.8)", () => {
  const client = readFileSync(join(root, "src/app/intranet/intranet-client.tsx"), "utf8");
  const runners = readFileSync(join(root, "src/app/intranet/runners.ts"), "utf8");
  const actions = readFileSync(join(root, "src/app/intranet/actions.ts"), "utf8");

  test("entries fold, days fold, nothing disappears", () => {
    assert.ok(client.includes("fold the day"));
    assert.ok(client.includes("itLFoldBtn"), "entries lost their fold control");
    assert.ok(
      !/\.filter\(.*minned/.test(client),
      "folding removes entries instead of folding them",
    );
  });
  test("the rail carries its two delineated tabs", () => {
    assert.ok(client.includes("By country"));
    assert.ok(client.includes("The archive"));
    assert.ok(client.includes("itRailTabs"));
  });
  test("an archive day opens its slice of the record", () => {
    assert.ok(client.includes("intranetLedgerDay"));
    assert.ok(actions.includes("export async function intranetLedgerDay"));
    assert.ok(client.includes("back to today"));
  });
  test("the paste dock is pinned and always open, and it says Send it", () => {
    assert.ok(client.includes("itDock"), "the dock is gone");
    assert.ok(client.includes('"Send it"'));
    assert.ok(!client.includes("itDockNote"), "the dock label came back");
  });
  test("the progress line is transient — replaced by the result", () => {
    assert.ok(client.includes("Reading what you sent…"));
    assert.ok(/l\.map\(\(e\) =>/.test(client), "the pending entry is never replaced");
  });
  test("the digest is stored on the capture, so the record can replay it", () => {
    assert.ok(/digest: lines/.test(runners), "readCapture stopped persisting the digest");
    const store = readFileSync(join(root, "src/lib/intranet/store.ts"), "utf8");
    assert.ok(
      store.includes("meta.digest"),
      "the ledger loader ignores the stored digest",
    );
  });
  test("the country lens note states the no-duplication doctrine", () => {
    assert.ok(client.includes("A country is a lens, not a copy"));
  });
});

describe("the room carries the brand's depth without breaking its rules (IV.9)", () => {
  const css = readFileSync(join(root, "src/app/command-center.module.css"), "utf8");
  const client = readFileSync(join(root, "src/app/intranet/intranet-client.tsx"), "utf8");
  const stash = readFileSync(join(root, "src/components/stash/stash-dock.tsx"), "utf8");

  test("the Ask is the one orange move — solid, and alone", () => {
    const go = /\.itGo \{[\s\S]*?\n\}/.exec(css)?.[0] ?? "";
    assert.ok(/background: var\(--orange\)/.test(go), "the move went pale again");
    const wash = /\.itWrap \{[\s\S]*?\n\}/.exec(css)?.[0] ?? "";
    assert.ok(!/230, 112, 30/.test(wash), "orange leaked into the field wash");
  });
  test("entries carry their semantic edge — navy asked, green fed, blue world", () => {
    assert.ok(css.includes(".itLAsked"), "asked entries lost their edge");
    assert.ok(css.includes(".itLFed"));
    assert.ok(css.includes(".itLWorld"));
    assert.ok(client.includes("itLFed"), "the client stopped applying the edges");
  });
  test("depth comes from the brand's own shadow ladder", () => {
    assert.ok(css.includes("--ds-shadow-rest"), "cards sit flat on the field");
    assert.ok(css.includes("--ds-shadow-lift"), "nothing lifts on hover");
  });
  test("the stash chip rides above the intranet's paste dock", () => {
    assert.ok(stash.includes("usePathname"), "the chip doesn't know where it is");
    assert.ok(/\/intranet/.test(stash), "the chip still sits on the Send button");
  });
  test("a pre-digest capture replays as a sentence, not a placeholder", () => {
    const store = readFileSync(join(root, "src/lib/intranet/store.ts"), "utf8");
    assert.ok(
      /meta\.report\?\.messages/.test(store),
      "the fallback ignores what meta remembers",
    );
  });
});

describe("opus or better, always (founder-decreed 2026-07-31)", () => {
  test("haiku appears nowhere in the app's source", () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? walk(join(dir, e.name))
          : /\.(ts|tsx)$/.test(e.name)
            ? [join(dir, e.name)]
            : [],
      );
    const offenders = walk(join(root, "src")).filter((f) =>
      readFileSync(f, "utf8").includes("claude-haiku"),
    );
    assert.deepEqual(offenders, [], "a haiku model id crept back into src");
  });
});

describe("one catch-up at a time, and replayed history obeys V.6", () => {
  const runners = readFileSync(join(root, "src/app/intranet/runners.ts"), "utf8");
  const client = readFileSync(join(root, "src/app/intranet/intranet-client.tsx"), "utf8");
  const store = readFileSync(join(root, "src/lib/intranet/store.ts"), "utf8");

  test("the run lock exists, expires, and always releases", () => {
    assert.ok(runners.includes("acquireRunLock"), "overlapping runs can stack again");
    assert.ok(runners.includes("releaseRunLock"));
    assert.ok(runners.includes("RUN_LOCK_TTL_MS"), "a crashed run would wedge the room");
    assert.ok(/finally\s*\{\s*await releaseRunLock/.test(runners), "the lock can leak");
  });
  test("a second run watches instead of stacking", () => {
    assert.ok(/busy: true/.test(runners), "runBrain never says it is busy");
    assert.ok(/r\.busy/.test(client), "the client stacks catch-ups anyway");
  });
  test("the sentinel row is invisible on every surface", () => {
    const hits = store.match(/rawChecksum: \{ not: RUN_LOCK_CHECKSUM \}/g) ?? [];
    assert.ok(hits.length >= 3, "a surface still shows the lock row");
  });
  test("old stored digests replay laundered — raw JSON never renders (V.6)", () => {
    const w = launderDigest([
      "Got it — 12 messages.",
      '3 couldn\'t be read — the model refused the request — 400 {"type":"error","error":{"type":"invalid_request_error","message":"maxItems is not supported"}}',
      "234 still to read.",
    ]);
    assert.deepEqual(w.lines, [
      "Got it — 12 messages.",
      "234 still to read.",
      "3 failed.",
    ]);
    assert.equal(w.detail.length, 1);
    assert.ok(!w.lines.some((l) => l.includes('{"type"')), "raw JSON still renders");
  });
  test("new-style digests pass through untouched", () => {
    const w = launderDigest([
      "Read 4 entries and filed 12 statements into the index.",
      "2 failed.",
    ]);
    assert.deepEqual(w.lines, [
      "Read 4 entries and filed 12 statements into the index.",
      "2 failed.",
    ]);
    assert.deepEqual(w.detail, []);
  });
});

describe("the bench gadget is wired to the truth", () => {
  const runners = readFileSync(join(root, "src/app/intranet/runners.ts"), "utf8");
  const actions = readFileSync(join(root, "src/app/intranet/actions.ts"), "utf8");
  const client = readFileSync(join(root, "src/app/intranet/intranet-client.tsx"), "utf8");

  test("the workers write the pulse as they work — lanes, counts, log", () => {
    assert.ok(runners.includes("async function pulse("), "nobody writes status");
    assert.ok(runners.includes("readPulse"), "nobody reads it back");
    assert.ok(/lanes: held\.map/.test(runners), "the lanes never say what they hold");
    assert.ok(
      runners.includes("the total shrinks so 100 stays honest"),
      "a failure lets the bar lie",
    );
    assert.ok(/kind: "sendit"/.test(runners), "a paste never stamps its own run");
    assert.ok(
      runners.includes("Your brief just landed"),
      "the send-it run never announces the brief",
    );
  });
  test("the instrument never gets to break the machine", () => {
    const p = /async function pulse\([\s\S]*?\n\}/.exec(runners)?.[0] ?? "";
    assert.ok(p.includes("catch"), "a status write failure would kill the read");
  });
  test("the page reads the pulse — it never invents it", () => {
    assert.ok(actions.includes("export async function intranetPulse"));
    assert.ok(client.includes("intranetPulse"), "the gadget has no wire");
    assert.ok(/setInterval\(read, 2000\)/.test(client), "the two-second poll is gone");
  });
  test("the gadget is docked, stamps its run, and takes you to it on Send it", () => {
    assert.ok(client.includes("itBgPlate"), "the gadget lost its plate");
    assert.ok(client.includes("scrollIntoView"), "Send it no longer brings you to it");
    assert.ok(client.includes("Send-it run — your paste"));
    assert.ok(client.includes("Refresh run — the whole backlog"));
    assert.ok(client.includes("At rest — caught up"), "rest is not stated honestly");
  });
  test("a failure holds the gadget open until it is seen (V.6)", () => {
    assert.ok(client.includes("failHold"), "a failed run folds away unseen");
    assert.ok(client.includes("dismiss"));
  });
});

describe("structured-output schemas stay inside what the API accepts", () => {
  // The API's schema validator rejects maxItems/minItems on arrays — with it,
  // EVERY model call 400s and the brain reads nothing. The caps live in the
  // sanitize layer instead, where they always did the real work.
  test("no schema carries an array-size constraint", () => {
    for (const f of [
      "src/lib/intranet/extract.ts",
      "src/lib/intranet/retrieve.ts",
      "src/lib/intranet/verdicts.ts",
      "src/lib/intranet/synthesize.ts",
      "src/lib/intranet/decompose.ts",
    ]) {
      const src = readFileSync(join(root, f), "utf8");
      assert.ok(!/maxItems|minItems/.test(src), `${f} still carries an array cap`);
    }
  });
  test("the sanitize layer still enforces every cap the schemas dropped", () => {
    const extract = readFileSync(join(root, "src/lib/intranet/extract.ts"), "utf8");
    assert.ok(
      /\.slice\(0, 40\)/.test(extract),
      "the filings cap left the sanitize layer",
    );
    assert.ok(
      /\.slice\(0, 80\)/.test(extract),
      "the statements cap left the sanitize layer",
    );
    const verdicts = readFileSync(join(root, "src/lib/intranet/verdicts.ts"), "utf8");
    assert.ok(verdicts.includes("slice(0, 60)"));
    const synth = readFileSync(join(root, "src/lib/intranet/synthesize.ts"), "utf8");
    assert.ok(synth.includes("slice(0, 20)"));
  });
  test("a server error surfaces as its message, not a JSON blob", () => {
    const runners = readFileSync(join(root, "src/app/intranet/runners.ts"), "utf8");
    assert.ok(/"message"/.test(runners), "reasonOf stopped unwrapping the server error");
  });
});
