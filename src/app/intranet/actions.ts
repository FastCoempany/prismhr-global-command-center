"use server";

// The Intranet's server half — capture in, answers out.
//
// This module writes ONLY to the Intranet's own tables. It imports no write
// action from the room, the accounts page, today or the playbook, and a test
// walks the import graph to keep it that way: the room reads, it does not edit
// (I.2).

import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import { CANDIDATE_CAP } from "@/lib/intranet/doctrine";
import {
  normalizeCapture,
  unseenMessages,
  captureReceipt,
} from "@/lib/intranet/normalize";
import {
  applyMerges,
  fallbackTitle,
  segmentMessages,
  segmentTranscript,
} from "@/lib/intranet/segment";
import { descendantIds } from "@/lib/intranet/index-topics";
import {
  claimsByEntities,
  claimsByIds,
  claimsByPhrases,
  claimsByTopics,
  commonEntities,
  docsByIds,
  loadTopics,
  todayCounts,
} from "@/lib/intranet/store";
import { CEILINGS, readCeilings } from "@/lib/intranet/evals";
import { accountsMentioned, promotionDraft } from "@/lib/intranet/bridges";
import { redactMoney } from "@/lib/intel/lexicon";
import {
  coverageOf,
  fallbackPlan,
  fuse,
  runPlan,
  type RoadHit,
} from "@/lib/intranet/retrieve";
import {
  NOTHING_IN_RECORD,
  escalationReason,
  runSynthesis,
  runWorldAnswer,
  synthAvailable,
  thinLine,
} from "@/lib/intranet/synthesize";
import { withSupersessions } from "@/lib/intranet/time";
import type {
  Answer,
  Candidate,
  Coverage,
  DocRef,
  QueryPlan,
} from "@/lib/intranet/types";

async function canRead() {
  const access = await getAppAccess();
  return access.status === "active";
}

async function canWrite() {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

// ── capture ─────────────────────────────────────────────────────────────────
export type CaptureReply = {
  ok: boolean;
  receipt: string;
  /** What just landed, so the room can read it immediately (IV.3). */
  captureId: string;
  reason?: string;
};

/** Take a grab or a paste into the brain. Redaction happens inside
 *  normalizeCapture, before the first write — there is no pre-redaction text to
 *  leak. */
export async function intranetCapture(
  raw: string,
  originHint?: "teams" | "meeting" | "demo" | "paste",
): Promise<CaptureReply> {
  if (!(await canWrite()))
    return { ok: false, receipt: "", captureId: "", reason: "Read-only session." };
  const text = (raw ?? "").trim();
  if (text.length < 20)
    return { ok: false, receipt: "", captureId: "", reason: "Nothing there to keep." };

  const cap = normalizeCapture(text, { origin: originHint });

  try {
    const prisma = getPrisma();

    // Identical capture → no-op. Re-grabbing a thread must never double it.
    const seen = await prisma.intranetCapture.findUnique({
      where: { rawChecksum: cap.checksum },
      select: { id: true },
    });
    if (seen) {
      await prisma.intranetCapture.update({
        where: { id: seen.id },
        data: { capturedAt: new Date() },
      });
      return {
        ok: true,
        receipt: "Already in the brain — nothing new to add.",
        captureId: seen.id,
      };
    }

    const capture = await prisma.intranetCapture.create({
      data: {
        origin: cap.origin,
        raw: cap.body.slice(0, 400_000),
        rawChecksum: cap.checksum,
        title: cap.title,
        meta: { space: cap.space, links: cap.links, report: cap.report },
      },
    });

    // Overlap: which messages has the brain already read, in this space?
    const priorKeys = new Set<string>();
    if (cap.space) {
      const priorDocs = await prisma.intranetDoc.findMany({
        where: { space: cap.space },
        select: { checksum: true },
        take: 400,
      });
      for (const d of priorDocs) priorKeys.add(d.checksum);
    }

    const fresh = cap.msgs.length ? unseenMessages(cap.msgs, new Set()) : [];
    const segments = cap.msgs.length
      ? applyMerges(segmentMessages(fresh), [])
      : segmentTranscript(cap.body, new Date().toISOString());

    let kept = 0;
    let skipped = 0;
    for (const seg of segments) {
      if (priorKeys.has(seg.key)) {
        skipped += seg.msgs.length || 1;
        continue;
      }
      await prisma.intranetDoc.create({
        data: {
          captureId: capture.id,
          origin: cap.origin,
          originRef: `${capture.id}:${seg.key}`,
          space: cap.space,
          title: fallbackTitle(cap.space, seg),
          body: seg.body,
          speakers: seg.speakers,
          occurredAt: new Date(seg.occurredAt || Date.now()),
          links: cap.links,
          checksum: seg.key,
        },
      });
      kept += seg.msgs.length || 1;
    }

    await prisma.intranetCapture.update({
      where: { id: capture.id },
      data: { segmented: true },
    });

    return {
      ok: true,
      receipt: captureReceipt({
        space: cap.space,
        kept,
        skipped,
        links: cap.links.length,
        report: cap.report,
      }),
      captureId: capture.id,
    };
  } catch {
    return {
      ok: false,
      receipt: "",
      captureId: "",
      reason:
        "The brain's tables aren't there yet — run docs/intranet-tables.sql in Supabase.",
    };
  }
}

// ── asking ──────────────────────────────────────────────────────────────────
export type AskReply = {
  ok: boolean;
  question: string;
  answer: Answer;
  /** The claims the answer cites, in handle order. */
  citations: {
    n: number;
    claimId: string;
    text: string;
    speaker: string;
    saidAt: string;
    kind: string;
    docId: string;
    docTitle: string;
    origin: string;
    accountId: string;
    originGone: string;
    road: string;
    /** The claim drafted in the Playbook's voice, for a human to promote by
     *  hand. Composed here; written nowhere (I.2). */
    promoteNs: "market" | "lessons";
    promoteLine: string;
  }[];
  coverage: Coverage | null;
  plan: QueryPlan | null;
  model: string;
  escalated: string;
  thin: string;
  /** Set when a ceiling was hit — the room degraded and says so (F10). */
  degraded: string;
  /** Book accounts the answer's material names — a link, never a filing. */
  accounts: { id: string; name: string }[];
  /** IV.6 — set only when the record had nothing: an answer from general
   *  knowledge, explicitly labelled, never blended with the corpus. */
  world: string;
  reason?: string;
};

const EMPTY_ANSWER_REPLY = (question: string, reason: string): AskReply => ({
  ok: false,
  question,
  answer: {
    answer: "",
    citations: [],
    reasoning: "",
    setAside: [],
    confidence: "thin",
    gaps: [],
  },
  citations: [],
  coverage: null,
  plan: null,
  model: "",
  escalated: "",
  thin: "",
  degraded: "",
  accounts: [],
  world: "",
  reason,
});

/** Turn citation handles into the rows the room renders — each carrying its
 *  provenance and a promotion draft the operator can take to the Playbook. */
function renderCitations(
  handles: number[],
  candidates: Candidate[],
  docs: Map<string, DocRef>,
): AskReply["citations"] {
  const roadOf = new Map(candidates.map((c, i) => [i + 1, c.roads.join("+")]));
  return handles
    .map((n) => {
      const c = candidates[n - 1];
      if (!c) return null;
      const d = docs.get(c.claim.docId);
      const promote = promotionDraft(
        {
          text: c.claim.text,
          kind: c.claim.kind,
          speaker: c.claim.speaker,
          saidAt: c.claim.saidAt,
        },
        { space: d?.space ?? "", title: d?.title ?? "", origin: d?.origin ?? "" },
      );
      return {
        n,
        claimId: c.claim.id,
        text: c.claim.text,
        speaker: c.claim.speaker,
        saidAt: c.claim.saidAt,
        kind: c.claim.kind,
        docId: c.claim.docId,
        docTitle: d?.title ?? "",
        origin: (d?.origin ?? "") as string,
        accountId: d?.accountId ?? "",
        originGone: d?.originGone ?? "",
        road: roadOf.get(n) ?? "",
        promoteNs: promote.ns,
        promoteLine: promote.line,
      };
    })
    .filter(Boolean) as AskReply["citations"];
}

export async function intranetAsk(question: string): Promise<AskReply> {
  const q = (question ?? "").trim().slice(0, 500);
  if (!q) return EMPTY_ANSWER_REPLY(q, "Ask it something.");
  if (!(await canRead())) return EMPTY_ANSWER_REPLY(q, "Sign in to continue.");
  if (!hasDatabaseEnv())
    return EMPTY_ANSWER_REPLY(q, "The brain's store isn't reachable.");

  const started = Date.now();
  const nowIso = new Date().toISOString();

  // 1 · plan. Claude decides what to look for; the database does the looking.
  const topics = (await loadTopics()).filter((t) => t.status === "live");
  const entities = await commonEntities();
  let plan: QueryPlan;
  try {
    plan = await runPlan(q, topics, entities);
  } catch {
    plan = fallbackPlan(q);
  }
  if (!plan.phrases.length && !plan.topicIds.length && !plan.entities.length)
    plan = { ...plan, ...fallbackPlan(q) };

  // 2 · the roads, in parallel. Topic reach includes descendants, so asking
  //     about a parent reaches the whole branch.
  const allTopics = await loadTopics();
  const reach = [...new Set(plan.topicIds.flatMap((id) => descendantIds(allTopics, id)))];
  const [byTopic, byEntity, byPhrase] = await Promise.all([
    claimsByTopics(reach),
    claimsByEntities(plan.entities),
    claimsByPhrases(plan.phrases),
  ]);

  const hits: RoadHit[] = [
    ...byTopic.map((claim) => ({ claim, road: "topic" as const })),
    ...byEntity.map((claim) => ({ claim, road: "entity" as const })),
    ...byPhrase.map((h) => ({
      claim: h.claim,
      road: "lexical" as const,
      lexicalRank: h.rank,
    })),
  ];

  // 3 · fuse and rank. Nothing in the formula looks at where a claim came from.
  let candidates = fuse(hits, {
    nowIso,
    needsRecent: plan.needsRecent,
    cap: CANDIDATE_CAP,
  });

  // A superseded claim never travels alone — its superseder goes with it.
  const byId = new Map(candidates.map((c) => [c.claim.id, c.claim]));
  const extraIds = candidates
    .map((c) => c.claim.supersededBy)
    .filter((id) => id && !byId.has(id));
  if (extraIds.length) {
    for (const c of await claimsByIds(extraIds)) byId.set(c.id, c);
    const grown = withSupersessions(
      candidates.map((c) => c.claim),
      byId,
    );
    candidates = fuse(
      grown.map((claim) => ({ claim, road: "topic" as const })),
      { nowIso, needsRecent: plan.needsRecent, cap: CANDIDATE_CAP },
    );
  }

  const docs = await docsByIds([...new Set(candidates.map((c) => c.claim.docId))]);
  const docLabel = new Map(
    [...docs.values()].map((d) => [d.id, `${d.space || d.origin}`]),
  );
  const docOrigin = new Map([...docs.values()].map((d) => [d.id, d.origin]));
  const coverage = coverageOf(candidates, docOrigin);

  // A claim's account, if the book knows it — an offer, not a filing.
  const named = accountsMentioned(
    [...new Set(candidates.flatMap((c) => c.claim.entities))],
    peos.map((p) => ({ id: p.id, name: p.name })),
  );

  if (candidates.length === 0) {
    // IV.6 · the record has nothing — answer from the world instead, labelled.
    const world = redactMoney(await runWorldAnswer(q).catch(() => ""));
    return {
      ok: true,
      question: q,
      answer: {
        answer: NOTHING_IN_RECORD,
        citations: [],
        reasoning: `Looked across the index for ${
          plan.phrases.join(", ") || "the question's own words"
        } and found nothing.`,
        setAside: [],
        confidence: "thin",
        gaps: [],
      },
      citations: [],
      coverage,
      plan,
      model: "",
      escalated: "",
      thin: "",
      degraded: "",
      accounts: named,
      world,
    };
  }

  // 4 · the ceilings (F10). A breach degrades the room to what retrieval alone
  //     can do — the claims, ranked, with their provenance — and says so.
  //     Nothing silently stops working.
  const ceiling = readCeilings(await todayCounts());
  if (ceiling.breached && ceiling.which === "asks") {
    return {
      ok: true,
      question: q,
      answer: {
        answer: "",
        citations: candidates.slice(0, 10).map((_, i) => i + 1),
        reasoning: "",
        setAside: [],
        confidence: "mixed",
        gaps: [],
      },
      citations: renderCitations(
        candidates.slice(0, 10).map((_, i) => i + 1),
        candidates,
        docs,
      ),
      coverage,
      plan,
      model: "",
      escalated: "",
      thin: "",
      degraded: ceiling.line,
      accounts: named,
      world: "",
    };
  }

  if (!synthAvailable()) {
    return EMPTY_ANSWER_REPLY(
      q,
      "No API key configured — the brain can hold material but can't answer yet.",
    );
  }

  // 5 · the answer. A pathological candidate set is cut rather than allowed to
  //     become a four-dollar question.
  const forSynthesis = candidates.slice(0, CEILINGS.claimsPerAsk);
  let answer: Answer;
  let model = "";
  try {
    const r = await runSynthesis({
      question: q,
      candidates: forSynthesis,
      docLabel,
      plan,
    });
    answer = r.answer;
    model = r.model;
  } catch {
    return EMPTY_ANSWER_REPLY(q, "The answer didn't come back — try again.");
  }

  const citations = renderCitations(answer.citations, forSynthesis, docs);

  // IV.6 · retrieval found material but the answer honestly abstained — the
  // record still has nothing to say, so the world speaks, labelled.
  const world =
    citations.length === 0 ? redactMoney(await runWorldAnswer(q).catch(() => "")) : "";

  // Keep the ask — for the fold, for evals, and so a repeat is cheap.
  try {
    await getPrisma().intranetAsk.create({
      data: {
        question: q,
        plan: plan as unknown as object,
        candidateIds: candidates.map((c) => c.claim.id),
        answer: answer.answer,
        reasoning: answer.reasoning,
        citations: citations as unknown as object,
        coverage: coverage as unknown as object,
        model,
        ms: Date.now() - started,
      },
    });
  } catch {
    // an unrecorded ask is not a failed ask
  }

  return {
    ok: true,
    question: q,
    answer,
    citations,
    coverage,
    plan,
    model,
    escalated: escalationReason(forSynthesis, plan),
    thin: answer.confidence === "thin" ? thinLine(forSynthesis) : "",
    degraded: ceiling.breached ? ceiling.line : "",
    accounts: named,
    world,
  };
}

// ── drilldown ───────────────────────────────────────────────────────────────
export type PassageReply = {
  ok: boolean;
  before: string;
  span: string;
  after: string;
  title: string;
  space: string;
  origin: string;
  accountId: string;
  accountName: string;
  originGone: string;
  whole: string;
};

/** Level 2 and 3: the claim in its surrounding turns, and the whole document
 *  behind it. */
export async function intranetPassage(claimId: string): Promise<PassageReply> {
  const empty: PassageReply = {
    ok: false,
    before: "",
    span: "",
    after: "",
    title: "",
    space: "",
    origin: "",
    accountId: "",
    accountName: "",
    originGone: "",
    whole: "",
  };
  if (!(await canRead()) || !hasDatabaseEnv() || !claimId) return empty;
  try {
    const prisma = getPrisma();
    const claim = await prisma.intranetClaim.findUnique({ where: { id: claimId } });
    if (!claim) return empty;
    const doc = await prisma.intranetDoc.findUnique({ where: { id: claim.docId } });
    if (!doc) return empty;

    const start = Math.max(0, claim.offsetStart);
    const end = Math.min(doc.body.length, claim.offsetEnd || start + claim.text.length);
    const acct = peos.find((p) => p.id === doc.accountId);

    return {
      ok: true,
      before: doc.body.slice(Math.max(0, start - 700), start),
      span: doc.body.slice(start, end),
      after: doc.body.slice(end, end + 700),
      title: doc.title,
      space: doc.space,
      origin: doc.origin,
      accountId: doc.accountId,
      accountName: acct?.name ?? "",
      originGone: doc.originGone ? doc.originGone.toISOString() : "",
      whole: doc.body.slice(0, 20_000),
    };
  } catch {
    return empty;
  }
}
