"use server";

// The Intranet's server half — capture in, answers out.
//
// This module writes ONLY to the Intranet's own tables. It imports no write
// action from the room, the accounts page, today or the playbook, and a test
// walks the import graph to keep it that way: the room reads, it does not edit
// (I.2).

import { getAppAccess } from "@/lib/auth";
import { priceQuoteFor } from "@/lib/pricing/quote";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import {
  CANDIDATE_CAP,
  PROMPT_VERSION,
  RUN_LOCK_CHECKSUM,
} from "@/lib/intranet/doctrine";
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
  ledgerEntries,
  loadTopics,
  todayCounts,
} from "@/lib/intranet/store";
import { countryOf, type LedgerEntry } from "@/lib/intranet/ledger";
import {
  CEILINGS,
  EVAL_SET,
  TARGETS,
  abstained,
  readCeilings,
} from "@/lib/intranet/evals";
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
  Claim,
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
  /** Provenance for the sent stamp (V): where the paste came from. */
  space: string;
  origin: string;
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
    return {
      ok: false,
      receipt: "",
      captureId: "",
      space: "",
      origin: "",
      reason: "Read-only session.",
    };
  const text = (raw ?? "").trim();
  if (text.length < 20)
    return {
      ok: false,
      receipt: "",
      captureId: "",
      space: "",
      origin: "",
      reason: "Nothing there to keep.",
    };

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
        space: cap.space,
        origin: cap.origin,
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
      space: cap.space,
      origin: cap.origin,
    };
  } catch {
    return {
      ok: false,
      receipt: "",
      captureId: "",
      space: "",
      origin: "",
      reason:
        "The brain's tables aren't there yet — run docs/intranet-tables.sql in Supabase.",
    };
  }
}

// The record-lines fallback (founder-decreed 2026-08-21): when the brain's
// mouth is down — no key, or the synthesis call fails — the ask still
// answers with the record's own closest lines, deterministically ranked by
// the same retrieval that feeds synthesis. Honest about what it is; the
// claims are already money-redacted at write.
function recordLinesAnswer(cands: Candidate[]): Answer {
  const lines = cands.slice(0, 5).map((c) => {
    const d = (c.claim.saidAt ?? "").slice(5, 10).replace("-", "/");
    const who =
      c.claim.speaker && c.claim.speaker !== "unknown" ? `${c.claim.speaker}` : "";
    const tag = [who, d].filter(Boolean).join(", ");
    return `• ${tag ? `[${tag}] ` : ""}${c.claim.text}`;
  });
  return {
    answer: `Composed without the brain — the record's own closest lines:\n${lines.join("\n")}`,
    // The printed lines ARE claims 1..n — they keep their provenance doors.
    citations: lines.map((_, i) => i + 1),
    reasoning: "",
    setAside: [],
    confidence: "thin",
    gaps: [],
  };
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
    /** The mirrored row's own key (e.g. "question:gp-funding") — what a deep
     *  link needs to land on the exact thing, not just its page. */
    originRef: string;
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
  /** How many lines the brain actually weighed — the honest number behind an
   *  empty answer ("read 31 lines, couldn't answer" is not "nothing on file"). */
  considered: number;
  /** Set when the price desk answered — the figure came from the Pricing
   *  page at read time; surfaces add the page's link. */
  priced?: boolean;
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
  considered: 0,
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
        originRef: d?.originRef ?? "",
        accountId: d?.accountId ?? "",
        originGone: d?.originGone ?? "",
        road: roadOf.get(n) ?? "",
        promoteNs: promote.ns,
        promoteLine: promote.line,
      };
    })
    .filter(Boolean) as AskReply["citations"];
}

export async function intranetAsk(
  question: string,
  live?: { accountId: string; name: string; lines: string[] } | null,
): Promise<AskReply> {
  const q = (question ?? "").trim().slice(0, 500);
  if (!q) return EMPTY_ANSWER_REPLY(q, "Ask it something.");
  if (!(await canRead())) return EMPTY_ANSWER_REPLY(q, "Sign in to continue.");
  if (!hasDatabaseEnv())
    return EMPTY_ANSWER_REPLY(q, "The brain's store isn't reachable.");

  const started = Date.now();

  // The price desk (founder-decreed 2026-08-21): a pricing question answers
  // from the Pricing page's own numbers — arithmetic, no model, instantly.
  // The brain's stores are money-redacted by doctrine and can never hold a
  // figure, so this is the ONE road a price travels: computed at read time,
  // shown live, and banked as its redacted twin with the pointer back.
  {
    const quote = priceQuoteFor(q);
    if (quote) {
      try {
        await getPrisma().intranetAsk.create({
          data: {
            question: q,
            plan: { priceDesk: true } as unknown as object,
            candidateIds: [],
            answer: `${redactMoney(quote.answer)} Priced live from the Pricing page — open it for the figures.`,
            reasoning: "",
            citations: [] as unknown as object,
            coverage: {} as unknown as object,
            model: "price-desk",
            ms: Date.now() - started,
            world: "",
          },
        });
      } catch {
        // an unrecorded quote is still a served quote
      }
      return {
        ok: true,
        question: q,
        answer: {
          answer: quote.answer,
          citations: [],
          reasoning: "",
          setAside: [],
          confidence: "firm",
          gaps: [],
        },
        citations: [],
        coverage: null,
        plan: null,
        model: "price-desk",
        escalated: "",
        thin: "",
        degraded: "",
        accounts: [],
        world: "",
        considered: 0,
        priced: true,
      };
    }
  }

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

  // The app's own live read rides as claims (founder-decreed 2026-08-18,
  // after the XcelHR miss: the room said "Wait on Bill" while the ask claimed
  // nothing). Derived seconds ago by the same readers the room uses, speaker-
  // stamped and citable like anything else. The mirror lags extraction; the
  // live read never lags. It leads the candidate list so the synthesis cap
  // can't cut it.
  if (live?.lines?.length) {
    const liveDocId = `live:${live.accountId}`;
    const liveCands: Candidate[] = live.lines.slice(0, 14).map((text, i) => ({
      claim: {
        id: `live-${i}`,
        docId: liveDocId,
        text,
        speaker: "the app's live read",
        saidAt: nowIso,
        kind: "fact",
        confidence: "stated",
        entities: [],
        topicIds: [],
        askShape: "",
        offsetStart: 0,
        offsetEnd: 0,
        supersededBy: "",
        disputedWith: [],
      },
      roads: ["lexical"],
      lexicalRank: 1,
      corroboration: 1,
      score: 1,
    }));
    candidates = [...liveCands, ...candidates];
    docLabel.set(liveDocId, `${live.name} — derived live`);
    docs.set(liveDocId, {
      id: liveDocId,
      origin: "live",
      originRef: `account:${live.accountId}`,
      space: "Live",
      title: `${live.name} — the app's live read`,
      accountId: live.accountId,
      occurredAt: nowIso,
      originGone: "",
    });
  }

  // A claim's account, if the book knows it — an offer, not a filing. The
  // live read's account always rides along.
  const mentioned = accountsMentioned(
    [...new Set(candidates.flatMap((c) => c.claim.entities))],
    peos.map((p) => ({ id: p.id, name: p.name })),
  );
  const named =
    live && !mentioned.some((a) => a.id === live.accountId)
      ? [{ id: live.accountId, name: live.name }, ...mentioned]
      : mentioned;

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
      considered: 0,
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
      considered: candidates.length,
    };
  }

  // 5 · the answer. A pathological candidate set is cut rather than allowed to
  //     become a four-dollar question. When the mouth is down — no key, or
  //     the call fails — the record's own closest lines answer instead of
  //     silence (the record-lines fallback, founder-decreed 2026-08-21).
  const forSynthesis = candidates.slice(0, CEILINGS.claimsPerAsk);
  let answer: Answer;
  let model = "";
  if (!synthAvailable()) {
    answer = recordLinesAnswer(forSynthesis);
    model = "record-lines";
  } else {
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
      answer = recordLinesAnswer(forSynthesis);
      model = "record-lines";
    }
    // A dead key surfaces as a SWALLOWED transport error: runSynthesis
    // returns EMPTY_ANSWER as if it succeeded (caught live 2026-08-22 —
    // the pad read 74 lines and answered nothing). An empty mouth with
    // material in hand is never an answer; the record's own lines speak.
    // A genuine abstention is not empty — it says the record holds nothing.
    if (!answer.answer.trim() && answer.citations.length === 0) {
      answer = recordLinesAnswer(forSynthesis);
      model = "record-lines";
    }
  }

  const citations = renderCitations(answer.citations, forSynthesis, docs);

  // IV.6 · retrieval found material but the answer honestly abstained — the
  // record still has nothing to say, so the world speaks, labelled.
  const world =
    citations.length === 0 ? redactMoney(await runWorldAnswer(q).catch(() => "")) : "";

  // Keep the ask — for the fold, for evals, and so a repeat is cheap. The
  // world answer keeps too (founder-decreed 2026-08-18): a labelled outside
  // answer the operator read once must survive a reload in the bank.
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
        world,
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
    // Nothing escalates when no model ran at all.
    escalated: model === "record-lines" ? "" : escalationReason(forSynthesis, plan),
    thin: answer.confidence === "thin" ? thinLine(forSynthesis) : "",
    degraded: ceiling.breached ? ceiling.line : "",
    accounts: named,
    world,
    considered: candidates.length,
  };
}

// ── the reading pane (V.4) ──────────────────────────────────────────────────
// Anything clicked in the rail shows what is filed inside it. Multi-select
// reads the union; the search-within box narrows to the selected drawers only.

export type ShelfScope =
  | { type: "topic"; id: string; label: string }
  | { type: "country"; code: string; label: string; topicId?: string };

export type ShelfItem = {
  claimId: string;
  text: string;
  speaker: string;
  day: string;
  kind: string;
  space: string;
  docTitle: string;
  origin: string;
  countries: string[];
};

export type ShelfReply = { ok: boolean; total: number; items: ShelfItem[] };

export async function intranetContents(
  scopes: ShelfScope[],
  search: string,
): Promise<ShelfReply> {
  if (!(await canRead()) || !hasDatabaseEnv() || scopes.length === 0)
    return { ok: false, total: 0, items: [] };

  const allTopics = await loadTopics();
  const byId = new Map<string, Claim>();

  for (const s of scopes.slice(0, 12)) {
    if (s.type === "topic") {
      const reach = descendantIds(allTopics, s.id);
      for (const c of await claimsByTopics(reach, 400)) byId.set(c.id, c);
    } else {
      const wanted = [s.label, s.code.toUpperCase(), s.code].filter(Boolean);
      let found = await claimsByEntities(wanted, 400);
      if (s.topicId) {
        const reach = new Set(descendantIds(allTopics, s.topicId));
        found = found.filter((c) => c.topicIds.some((t) => reach.has(t)));
      }
      for (const c of found) byId.set(c.id, c);
    }
  }

  let claims = [...byId.values()];
  const q = (search ?? "").trim().toLowerCase();
  if (q)
    claims = claims.filter(
      (c) => c.text.toLowerCase().includes(q) || c.speaker.toLowerCase().includes(q),
    );
  claims.sort((a, b) => b.saidAt.localeCompare(a.saidAt));
  const total = claims.length;
  claims = claims.slice(0, 150);

  const docs = await docsByIds([...new Set(claims.map((c) => c.docId))]);
  const items: ShelfItem[] = claims.map((c) => {
    const d = docs.get(c.docId);
    return {
      claimId: c.id,
      text: c.text,
      speaker: c.speaker,
      day: c.saidAt.slice(0, 10),
      kind: c.kind,
      space: d?.space ?? "",
      docTitle: d?.title ?? "",
      origin: d?.origin ?? "",
      countries: [
        ...new Set(c.entities.map((e) => countryOf(e)?.name ?? "").filter(Boolean)),
      ],
    };
  });
  return { ok: true, total, items };
}

// ── the pulse (the bench gadget's read side) ────────────────────────────────
// The workers write a status blob on the run-lock sentinel as they work; the
// instrument on the page polls this every two seconds. Read-only.

export type PulseReply = {
  active: boolean;
  kind: string;
  startedAt: number;
  total: number;
  done: number;
  failed: number;
  now: string;
  unit: string;
  lanes: { src: string; what: string; sinceMs: number }[];
  log: { at: number; text: string; bad?: boolean }[];
  detail: string[];
  pending: number;
};

export async function intranetPulse(): Promise<PulseReply | null> {
  if (!(await canRead()) || !hasDatabaseEnv()) return null;
  try {
    const p = getPrisma();
    const [row, pending] = await Promise.all([
      p.intranetCapture.findUnique({
        where: { rawChecksum: RUN_LOCK_CHECKSUM },
        select: { meta: true },
      }),
      p.intranetDoc.count({
        where: {
          OR: [{ extractedAt: null }, { promptVersion: { not: PROMPT_VERSION } }],
        },
      }),
    ]);
    const s = ((row?.meta ?? {}) as { status?: Partial<PulseReply> }).status ?? {};
    return {
      active: Boolean(s.active),
      kind: s.kind ?? "",
      startedAt: s.startedAt ?? 0,
      total: s.total ?? 0,
      done: s.done ?? 0,
      failed: s.failed ?? 0,
      now: s.now ?? "",
      unit: s.unit ?? "",
      lanes: Array.isArray(s.lanes) ? s.lanes.slice(0, 4) : [],
      log: Array.isArray(s.log) ? s.log.slice(0, 40) : [],
      detail: Array.isArray(s.detail) ? s.detail.slice(0, 20) : [],
      pending,
    };
  } catch {
    return null;
  }
}

// ── the self-check (Phase 13, finally wired) ────────────────────────────────
// The eval set was decoration — defined, never executed. Now it runs the real
// pipeline end to end and reports in plain words. A recall case whose material
// simply isn't in the record yet says so, rather than posing as a failure.

export type SelfCheckReply = { ok: boolean; lines: string[]; reason?: string };

export async function intranetSelfCheck(): Promise<SelfCheckReply> {
  if (!(await canRead())) return { ok: false, lines: [], reason: "Sign in to continue." };
  if (!synthAvailable())
    return {
      ok: false,
      lines: [],
      reason: "No API key configured — the room can't check itself yet.",
    };

  const lines: string[] = [];
  let passed = 0;
  for (const c of EVAL_SET) {
    const r = await intranetAsk(c.question);
    const cited = r.citations;
    const didAbstain = abstained(r.answer, NOTHING_IN_RECORD) && cited.length === 0;
    let ok: boolean;
    let note: string;
    if (c.shouldAbstain) {
      ok = didAbstain;
      note = ok ? "it declined, honestly" : "it answered what the record cannot support";
    } else if (didAbstain) {
      ok = false;
      note = "the record has nothing on this yet — feed it and check again";
    } else {
      const hay = [r.answer.answer, ...cited.map((x) => x.text)]
        .join(" • ")
        .toLowerCase();
      const found = c.wants.filter((w) => hay.includes(w.toLowerCase())).length;
      const recall = c.wants.length ? found / c.wants.length : 1;
      const real = await claimsByIds(cited.map((x) => x.claimId));
      const byId = new Map(real.map((cl) => [cl.id, cl]));
      const attribution = cited.every(
        (x) => (byId.get(x.claimId)?.speaker ?? "") === (x.speaker ?? ""),
      );
      ok = recall >= TARGETS.recall && attribution;
      note = !attribution
        ? "a line was credited to the wrong person"
        : recall < TARGETS.recall
          ? "it missed material it should have found"
          : "found, answered, credited correctly";
    }
    if (ok) passed += 1;
    lines.push(`${ok ? "✓" : "✕"} ${c.question} — ${note}.`);
  }
  lines.unshift(`${passed} of ${EVAL_SET.length} checks passed.`);
  return { ok: true, lines };
}

// ── the archive (IV.8) ──────────────────────────────────────────────────────
/** One day's slice of the record, for the archive tab. Read-only. */
export async function intranetLedgerDay(day: string): Promise<LedgerEntry[]> {
  if (!(await canRead())) return [];
  const key = (day ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return [];
  return ledgerEntries({ day: key, limit: 100 });
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
