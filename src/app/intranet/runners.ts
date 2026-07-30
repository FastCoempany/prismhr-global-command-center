"use server";

// The write half of the pipeline — the workers that take a stored document and
// turn it into claims, topics, a decomposed index and a time-aware record.
//
// Everything here is:
//   · IDEMPOTENT — keyed by checksum, row id, or an already-set stamp, so a
//     second run costs nothing and produces no duplicates
//   · RESUMABLE — each stage writes before the next begins, so a failure at
//     extraction never loses a capture and a failure at indexing never loses
//     the claims
//   · BOUNDED — every runner takes a budget and stops, so a pass over a large
//     corpus is many small passes rather than one that times out
//
// C6 runs through all of it: nothing here deletes anything, ever. The closest
// it comes is marking a mirror `originGone` when its app row disappears.

import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import {
  PROMPT_VERSION,
  TOPIC_PROMOTE_AT,
  TOPIC_SPLIT_AT,
  type ClaimKind,
} from "@/lib/intranet/doctrine";
import { checksum } from "@/lib/intranet/normalize";
import { extractAvailable, runExtract } from "@/lib/intranet/extract";
import { foldLabel, sameLabel } from "@/lib/intranet/index-topics";
import { runSplit, shouldConsiderSplit } from "@/lib/intranet/decompose";
import { proposePairs } from "@/lib/intranet/time";
import {
  runTopicSummary,
  runVerdicts,
  supersessionDirection,
} from "@/lib/intranet/verdicts";
import {
  PROSPECT_ROOT,
  PROSPECT_SHAPE_TOPICS,
  playbookKnowledgeDoc,
  playbookQuestionDocs,
  playbookScenarioDocs,
} from "@/lib/intranet/playbook-in";
import {
  mirrorAccountNote,
  mirrorCard,
  mirrorDemoNote,
  mirrorPartnerNote,
  mirrorTodo,
  mirrorTouch,
  syncVerdict,
  type MirrorDoc,
} from "@/lib/intranet/mirror";
import { getScreen } from "@/lib/catalog";
import { accountsMentioned } from "@/lib/intranet/bridges";
import { isNamespacedAccountId } from "@/lib/today/overlay";
import type { Claim, Topic } from "@/lib/intranet/types";

export type RunReport = {
  ok: boolean;
  /** One line per stage, in the operator's language. */
  lines: string[];
  /** How much is still unread after this pass, so the room can keep going. */
  pending?: number;
  reason?: string;
};

/** A model failure, in words the operator can act on (IV.2). The first
 *  production run read nothing and said nothing about it; that never happens
 *  again. Not exported: a "use server" module may only export async actions. */
function reasonOf(e: unknown): string {
  const err = e as { status?: number; message?: string; name?: string };
  const msg = (err?.message ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
  if (err?.status === 401) return "the API key was refused";
  if (err?.status === 429)
    return "the model is rate-limited right now — try again shortly";
  if (err?.status === 529 || err?.status === 503)
    return "the model is overloaded right now — try again shortly";
  if (err?.status === 400)
    return `the model refused the request${msg ? ` — ${msg}` : ""}`;
  if (err?.name === "APIConnectionTimeoutError" || /timed? ?out|aborted/i.test(msg))
    return "the model call timed out — a very long entry can do that; it will be retried next pass";
  return msg || "an unknown failure";
}

async function guard(): Promise<string> {
  if (!hasDatabaseEnv()) return "The brain's store isn't reachable.";
  const access = await getAppAccess();
  if (access.status !== "active" || !access.canWrite) return "Read-only session.";
  return "";
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : "");

// ═══ Phase 4 · the app mirror ════════════════════════════════════════════════

/** Reflect the app's own rows into the corpus. Unchanged rows cost nothing;
 *  changed rows re-extract; vanished rows are marked, never removed (C6). */
export async function syncApp(budget = 400): Promise<RunReport> {
  const bad = await guard();
  if (bad) return { ok: false, lines: [], reason: bad };

  const prisma = getPrisma();
  const lines: string[] = [];
  const nameById = new Map(peos.map((p) => [p.id, p.name]));

  try {
    const drafts: MirrorDoc[] = [];

    const notes = await prisma.accountNote.findMany({
      orderBy: { createdAt: "desc" },
      take: budget,
    });
    for (const n of notes) {
      if (isNamespacedAccountId(n.accountId)) continue; // playbook/gaps/research
      const d = mirrorAccountNote(
        {
          id: n.id,
          accountId: n.accountId,
          body: n.body,
          kind: n.kind,
          lane: n.lane ?? "",
          actors: n.actors ?? "",
          source: n.source ?? "",
          createdAt: iso(n.createdAt),
        },
        nameById.get(n.accountId) ?? "",
      );
      if (d) drafts.push(d);
    }

    const todos = await prisma.todo.findMany({
      where: { accountId: { not: "" } },
      orderBy: { createdAt: "desc" },
      take: budget,
    });
    for (const t of todos) {
      const d = mirrorTodo(
        {
          id: t.id,
          body: t.body,
          accountId: t.accountId ?? "",
          done: t.done,
          remindAt: iso(t.remindAt),
          createdAt: iso(t.createdAt),
          updatedAt: iso(t.updatedAt),
        },
        nameById.get(t.accountId ?? "") ?? "",
      );
      if (d) drafts.push(d);
    }

    const touches = await prisma.touch.findMany({
      orderBy: { contactedAt: "desc" },
      take: budget,
    });
    for (const t of touches) {
      const d = mirrorTouch({
        subjectKey: t.subjectKey,
        kind: t.kind,
        label: t.label,
        detail: t.detail ?? "",
        message: t.message ?? "",
        contactedAt: iso(t.contactedAt),
        status: t.status,
      });
      if (d) drafts.push(d);
    }

    const cards = await prisma.dashCard.findMany({ take: budget });
    for (const c of cards) {
      const d = mirrorCard({
        id: c.id,
        name: c.name,
        states: (c.states ?? {}) as Record<string, string>,
        notes: (c.notes ?? {}) as Record<string, string>,
        archived: c.archived,
        updatedAt: iso(c.updatedAt),
      });
      if (d) drafts.push(d);
    }

    const pnotes = await prisma.partnerNote
      .findMany({ orderBy: { createdAt: "desc" }, take: budget })
      .catch(
        () => [] as { id: string; partner: string; body: string; createdAt: Date }[],
      );
    for (const n of pnotes) {
      const d = mirrorPartnerNote({
        id: n.id,
        partner: n.partner,
        body: n.body,
        createdAt: iso(n.createdAt),
      });
      if (d) drafts.push(d);
    }

    // Phase 13.6 · demos pipe in rather than being pasted. This is where most
    // prospect questions come from (C7).
    const demoNotes = await prisma.demoNote
      .findMany({
        orderBy: { createdAt: "desc" },
        take: budget,
        include: { account: true },
      })
      .catch(() => []);
    for (const n of demoNotes) {
      const d = mirrorDemoNote(
        {
          id: n.id,
          screenId: n.screenId,
          body: n.body,
          createdAt: iso(n.createdAt),
        },
        {
          name: n.account?.name ?? "",
          company: n.account?.company ?? "",
          persona: n.account?.personaLabel ?? "",
        },
        getScreen(n.screenId)?.title ?? "",
      );
      if (d) drafts.push(d);
    }

    const { created, updated, skipped } = await upsertDocs(drafts);
    lines.push(
      `The app: ${created} new, ${updated} changed, ${skipped} already current.`,
    );

    // C6 · a mirror whose home row has gone keeps its place and gains a stamp.
    const gone = await markVanished();
    if (gone > 0)
      lines.push(`${gone} row${gone === 1 ? "" : "s"} left the app — kept here, marked.`);

    return { ok: true, lines };
  } catch {
    return {
      ok: false,
      lines,
      reason: "The brain's tables aren't there yet — run docs/intranet-tables.sql.",
    };
  }
}

/** Create or update mirrored documents. The checksum comparison is what makes a
 *  second sync free (F10) — an unchanged row is never re-extracted. */
async function upsertDocs(drafts: MirrorDoc[]) {
  const prisma = getPrisma();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const d of drafts) {
    const sum = checksum(d.body);
    const existing = await prisma.intranetDoc.findUnique({
      where: { origin_originRef: { origin: d.origin, originRef: d.originRef } },
      select: { id: true, checksum: true },
    });
    const verdict = syncVerdict(existing?.checksum ?? null, sum);
    if (verdict === "skip") {
      skipped += 1;
      continue;
    }
    const data = {
      origin: d.origin,
      originRef: d.originRef,
      space: d.space,
      title: d.title,
      body: d.body,
      speakers: d.speakers,
      occurredAt: new Date(d.occurredAt || Date.now()),
      accountId: d.accountId,
      checksum: sum,
      // A changed document must be read again.
      extractedAt: null,
      originGone: null,
    };
    if (verdict === "create") {
      await prisma.intranetDoc.create({ data });
      created += 1;
    } else {
      await prisma.intranetDoc.update({ where: { id: existing!.id }, data });
      updated += 1;
    }
  }
  return { created, updated, skipped };
}

/** Mark mirrors whose home rows have disappeared. Never a delete — the brain
 *  remembers what the app forgot, which is the whole point of C6. */
async function markVanished(): Promise<number> {
  const prisma = getPrisma();
  let n = 0;
  const mirrored = await prisma.intranetDoc.findMany({
    where: {
      origin: { in: ["account-note", "todo", "touch", "partner-note", "card", "demo"] },
      originGone: null,
    },
    select: { id: true, origin: true, originRef: true },
    take: 2000,
  });
  for (const m of mirrored) {
    let alive = true;
    try {
      if (m.origin === "account-note")
        alive = Boolean(
          await prisma.accountNote.findUnique({
            where: { id: m.originRef },
            select: { id: true },
          }),
        );
      else if (m.origin === "todo")
        alive = Boolean(
          await prisma.todo.findUnique({
            where: { id: m.originRef },
            select: { id: true },
          }),
        );
      else if (m.origin === "touch")
        alive = Boolean(
          await prisma.touch.findUnique({
            where: { subjectKey: m.originRef },
            select: { id: true },
          }),
        );
      else if (m.origin === "card")
        alive = Boolean(
          await prisma.dashCard.findUnique({
            where: { id: m.originRef },
            select: { id: true },
          }),
        );
      else if (m.origin === "partner-note")
        alive = Boolean(
          await prisma.partnerNote.findUnique({
            where: { id: m.originRef },
            select: { id: true },
          }),
        );
      else if (m.origin === "demo")
        // A pasted demo transcript carries a "captureId:segment" ref and has no
        // home row to check — only mirrored sidekick notes are checkable.
        alive =
          m.originRef.includes(":") ||
          Boolean(
            await prisma.demoNote.findUnique({
              where: { id: m.originRef },
              select: { id: true },
            }),
          );
    } catch {
      alive = true; // never mark on a query failure
    }
    if (!alive) {
      await prisma.intranetDoc.update({
        where: { id: m.id },
        data: { originGone: new Date() },
      });
      n += 1;
    }
  }
  return n;
}

// ═══ Phase 5 · the Playbook and the prospect root ════════════════════════════

export async function ingestPlaybook(): Promise<RunReport> {
  const bad = await guard();
  if (bad) return { ok: false, lines: [], reason: bad };
  const prisma = getPrisma();
  const lines: string[] = [];

  try {
    const drafts: MirrorDoc[] = [...playbookQuestionDocs(), ...playbookScenarioDocs()];

    // Market facts and lessons live under their own namespaces, which the
    // generic mirror deliberately skipped.
    for (const ns of ["market", "lessons"] as const) {
      const rows = await prisma.accountNote.findMany({
        where: { accountId: `playbook:${ns}` },
        orderBy: { createdAt: "desc" },
        take: 400,
      });
      for (const r of rows) {
        const d = playbookKnowledgeDoc({
          id: r.id,
          ns,
          text: r.body.replace(/⟪[\s\S]*$/, "").trim(),
          account: "",
          createdAt: iso(r.createdAt),
        });
        if (d) drafts.push(d);
      }
    }

    const { created, updated, skipped } = await upsertDocs(drafts);
    lines.push(`The Playbook: ${created} new, ${updated} changed, ${skipped} current.`);

    // C7 · the one part of the index allowed to exist before it is discovered.
    const seeded = await seedProspectTopics();
    if (seeded) lines.push(`Seeded the prospect-question index (${seeded} topics).`);

    return { ok: true, lines };
  } catch {
    return { ok: false, lines, reason: "The Playbook ingest couldn't complete." };
  }
}

/** The prospect-question root and its shapes. Seeded rather than discovered
 *  because the shapes are known in advance and an empty rail teaches nothing. */
async function seedProspectTopics(): Promise<number> {
  const prisma = getPrisma();
  const existing = await prisma.intranetTopic.findMany({
    select: { id: true, label: true },
  });
  const has = (label: string) => existing.some((t) => sameLabel(t.label, label));
  let n = 0;

  let rootId = existing.find((t) => sameLabel(t.label, PROSPECT_ROOT.label))?.id ?? "";
  if (!rootId) {
    const root = await prisma.intranetTopic.create({
      data: {
        label: PROSPECT_ROOT.label,
        summary: PROSPECT_ROOT.summary,
        status: "live",
      },
    });
    rootId = root.id;
    n += 1;
  }
  for (const child of PROSPECT_SHAPE_TOPICS) {
    if (has(child.label)) continue;
    await prisma.intranetTopic.create({
      data: {
        label: child.label,
        summary: child.summary,
        parentId: rootId,
        status: "live",
      },
    });
    n += 1;
  }
  return n;
}

// ═══ Phase 6 · extraction ════════════════════════════════════════════════════

/** Read the documents nobody has read yet. This is the stage everything
 *  downstream starves without: no claims means no topics, and no topics means
 *  no answers.
 *
 *  Deadline-aware (IV.2): the pass stops itself honestly before the platform
 *  would kill it, and reports what it did and what still waits. */
export async function extractPending(
  budget = 8,
  opts?: { captureId?: string; deadlineMs?: number },
): Promise<RunReport> {
  const bad = await guard();
  if (bad) return { ok: false, lines: [], reason: bad };
  if (!extractAvailable())
    return {
      ok: false,
      lines: [],
      reason: "No API key configured — nothing can be read.",
    };

  const prisma = getPrisma();
  const lines: string[] = [];

  try {
    const unread = {
      OR: [{ extractedAt: null }, { promptVersion: { not: PROMPT_VERSION } }],
    };
    const pending = await prisma.intranetDoc.findMany({
      where: opts?.captureId ? { AND: [unread, { captureId: opts.captureId }] } : unread,
      orderBy: { occurredAt: "desc" },
      take: budget,
    });
    if (pending.length === 0) return { ok: true, lines: ["Everything has been read."] };

    const topics = await prisma.intranetTopic.findMany({
      where: { status: "live" },
      select: { id: true, label: true, summary: true },
      take: 200,
    });
    const nameById = new Map(peos.map((p) => [p.id, p.name]));

    let claimsMade = 0;
    let read = 0;
    let outOfTime = false;
    const failures = new Map<string, number>();

    for (const doc of pending) {
      if (opts?.deadlineMs && Date.now() > opts.deadlineMs) {
        outOfTime = true;
        break;
      }
      let result;
      try {
        result = await runExtract({
          body: doc.body,
          origin: doc.origin,
          space: doc.space,
          occurredAt: iso(doc.occurredAt),
          accountName: nameById.get(doc.accountId) ?? undefined,
          topics,
        });
      } catch (e) {
        const why = reasonOf(e);
        failures.set(why, (failures.get(why) ?? 0) + 1);
        continue;
      }

      // Re-reading a document replaces its claims rather than doubling them.
      // This is the one place rows leave a table, and they leave to be rewritten
      // in the same breath — the document, and everything it said, remains.
      await prisma.intranetClaim.deleteMany({ where: { docId: doc.id } });

      const topicIds = result.topicMatches.filter((id) =>
        topics.some((t) => t.id === id),
      );

      for (const c of result.claims) {
        await prisma.intranetClaim.create({
          data: {
            docId: doc.id,
            text: c.text,
            speaker: c.speaker,
            saidAt: doc.occurredAt,
            kind: c.kind,
            confidence: c.confidence,
            entities: c.entities,
            topicIds,
            askShape: c.askShape,
            offsetStart: c.offsetStart,
            offsetEnd: c.offsetEnd,
          },
        });
        claimsMade += 1;
      }

      // Proposals become pending topics; the tally is what promotes them.
      for (const p of result.topicProposals) await tallyProposal(p.label, p.why, doc.id);

      // Prospect questions join the seeded family by their shape (C7).
      await fileProspectQuestions(doc.id);

      await prisma.intranetDoc.update({
        where: { id: doc.id },
        data: {
          extractedAt: new Date(),
          promptVersion: PROMPT_VERSION,
          title: doc.title || result.summary.slice(0, 90),
        },
      });
      read += 1;
    }

    if (read > 0)
      lines.push(
        `Read ${read} — kept ${claimsMade} thing${claimsMade === 1 ? "" : "s"} for the index.`,
      );
    // IV.2 — a failure is named where the operator is looking, never swallowed.
    for (const [why, n] of failures) lines.push(`${n} couldn't be read — ${why}.`);
    if (outOfTime)
      lines.push("Ran out of time this pass — the rest waits for the next one.");
    const left = await prisma.intranetDoc.count({
      where: { OR: [{ extractedAt: null }, { promptVersion: { not: PROMPT_VERSION } }] },
    });
    if (left > 0) lines.push(`${left} still to read.`);
    return { ok: true, lines, pending: left };
  } catch (e) {
    return { ok: false, lines, reason: `The reading pass failed — ${reasonOf(e)}.` };
  }
}

/** Record a proposal against the pending pool. Support is counted in DISTINCT
 *  documents, so one loud document cannot promote a topic on its own. */
async function tallyProposal(label: string, why: string, docId: string): Promise<void> {
  const prisma = getPrisma();
  const all = await prisma.intranetTopic.findMany({
    select: { id: true, label: true, status: true, summary: true, docCount: true },
  });
  const hit = all.find((t) => sameLabel(t.label, label));
  if (hit) {
    if (hit.status === "pending")
      await prisma.intranetTopic.update({
        where: { id: hit.id },
        data: { docCount: { increment: 1 }, lastSeen: new Date() },
      });
    return;
  }
  await prisma.intranetTopic.create({
    data: {
      label: label.slice(0, 80),
      summary: why.slice(0, 240),
      status: "pending",
      docCount: 1,
    },
  });
  void docId;
}

/** Attach a document's prospect questions to the shape topic they belong to. */
async function fileProspectQuestions(docId: string): Promise<void> {
  const prisma = getPrisma();
  const qs = await prisma.intranetClaim.findMany({
    where: { docId, kind: "prospect-question" },
    select: { id: true, askShape: true, topicIds: true },
  });
  if (qs.length === 0) return;
  const shapes = await prisma.intranetTopic.findMany({
    where: { status: "live" },
    select: { id: true, label: true, parentId: true },
  });
  const root = shapes.find((t) => sameLabel(t.label, PROSPECT_ROOT.label));
  if (!root) return;

  for (const q of qs) {
    const child = PROSPECT_SHAPE_TOPICS.find((s) => s.shape === q.askShape);
    const childRow = child ? shapes.find((t) => sameLabel(t.label, child.label)) : null;
    const add = [root.id, childRow?.id ?? ""].filter(Boolean);
    const next = [...new Set([...q.topicIds, ...add])];
    await prisma.intranetClaim.update({ where: { id: q.id }, data: { topicIds: next } });
  }
}

// ═══ Phase 7 · the index ═════════════════════════════════════════════════════

/** Promote what has earned it, fold what is the same thing twice, and keep the
 *  counts honest. Nothing is recomputed from scratch — a topic that exists
 *  today exists tomorrow. */
export async function indexTopics(): Promise<RunReport> {
  const bad = await guard();
  if (bad) return { ok: false, lines: [], reason: bad };
  const prisma = getPrisma();
  const lines: string[] = [];

  try {
    // 1 · promote
    const ready = await prisma.intranetTopic.findMany({
      where: { status: "pending", docCount: { gte: TOPIC_PROMOTE_AT } },
      take: 50,
    });
    for (const t of ready)
      await prisma.intranetTopic.update({
        where: { id: t.id },
        data: { status: "live", lastSeen: new Date() },
      });
    if (ready.length)
      lines.push(
        `${ready.length} new row${ready.length === 1 ? "" : "s"} joined the index.`,
      );

    // 2 · fold duplicates mechanically. Identical labels are one topic, and the
    //     loser keeps its row so every id ever issued still resolves.
    const live = await prisma.intranetTopic.findMany({ where: { status: "live" } });
    const byFold = new Map<string, (typeof live)[number]>();
    let merged = 0;
    for (const t of live) {
      const key = foldLabel(t.label);
      if (!key) continue;
      const winner = byFold.get(key);
      if (!winner) {
        byFold.set(key, t);
        continue;
      }
      const [keep, lose] = winner.claimCount >= t.claimCount ? [winner, t] : [t, winner];
      byFold.set(key, keep);
      await prisma.intranetTopic.update({
        where: { id: lose.id },
        data: { status: "merged", mergedInto: keep.id },
      });
      await reassignClaims(lose.id, keep.id);
      merged += 1;
    }
    if (merged)
      lines.push(
        `${merged} duplicate index row${merged === 1 ? "" : "s"} folded together.`,
      );

    // 3 · counts, from the claims themselves rather than from a running total
    //     that can drift.
    const current = await prisma.intranetTopic.findMany({ where: { status: "live" } });
    for (const t of current) {
      const claims = await prisma.intranetClaim.findMany({
        where: { topicIds: { has: t.id } },
        select: { docId: true },
      });
      const docs = new Set(claims.map((c) => c.docId));
      if (claims.length !== t.claimCount || docs.size !== t.docCount)
        await prisma.intranetTopic.update({
          where: { id: t.id },
          data: { claimCount: claims.length, docCount: docs.size, lastSeen: new Date() },
        });
    }

    // 4 · a summary that has fallen behind its material misdirects the planner,
    //     not just the eye.
    if (extractAvailable()) {
      const needy = current.filter((t) => !t.summary && t.claimCount >= 3).slice(0, 3);
      for (const t of needy) {
        const claims = await prisma.intranetClaim.findMany({
          where: { topicIds: { has: t.id } },
          take: 40,
        });
        const summary = await runTopicSummary(t.label, claims.map(toClaim)).catch(
          () => "",
        );
        if (summary)
          await prisma.intranetTopic.update({ where: { id: t.id }, data: { summary } });
      }
    }

    if (lines.length === 0) lines.push("The index is settled.");
    return { ok: true, lines };
  } catch {
    return { ok: false, lines, reason: "The index pass couldn't complete." };
  }
}

async function reassignClaims(fromId: string, toId: string): Promise<void> {
  const prisma = getPrisma();
  const claims = await prisma.intranetClaim.findMany({
    where: { topicIds: { has: fromId } },
    select: { id: true, topicIds: true },
    take: 2000,
  });
  for (const c of claims) {
    const next = [...new Set(c.topicIds.map((t) => (t === fromId ? toId : t)))];
    await prisma.intranetClaim.update({ where: { id: c.id }, data: { topicIds: next } });
  }
}

function toClaim(c: {
  id: string;
  docId: string;
  text: string;
  speaker: string;
  saidAt: Date;
  kind: string;
  confidence: string;
  entities: string[];
  topicIds: string[];
  askShape: string;
  offsetStart: number;
  offsetEnd: number;
  supersededBy: string;
  disputedWith: string[];
}): Claim {
  return {
    id: c.id,
    docId: c.docId,
    text: c.text,
    speaker: c.speaker,
    saidAt: iso(c.saidAt),
    kind: c.kind as ClaimKind,
    confidence: c.confidence as Claim["confidence"],
    entities: c.entities ?? [],
    topicIds: c.topicIds ?? [],
    askShape: c.askShape ?? "",
    offsetStart: c.offsetStart ?? 0,
    offsetEnd: c.offsetEnd ?? 0,
    supersededBy: c.supersededBy ?? "",
    disputedWith: c.disputedWith ?? [],
  };
}

// ═══ Phase 8 · decomposition ═════════════════════════════════════════════════

/** Split what has grown enough to warrant it — and refuse the rest. */
export async function decomposeTopics(budget = 2): Promise<RunReport> {
  const bad = await guard();
  if (bad) return { ok: false, lines: [], reason: bad };
  if (!extractAvailable()) return { ok: true, lines: [] };
  const prisma = getPrisma();
  const lines: string[] = [];

  try {
    const big = await prisma.intranetTopic.findMany({
      where: { status: "live", claimCount: { gte: TOPIC_SPLIT_AT } },
      orderBy: { claimCount: "desc" },
      take: budget * 3,
    });

    let done = 0;
    for (const t of big) {
      if (done >= budget) break;
      const kids = await prisma.intranetTopic.count({
        where: { parentId: t.id, status: "live" },
      });
      const topic: Topic = {
        id: t.id,
        label: t.label,
        parentId: t.parentId,
        summary: t.summary,
        status: "live",
        mergedInto: t.mergedInto,
        docCount: t.docCount,
        claimCount: t.claimCount,
        firstSeen: iso(t.firstSeen),
        lastSeen: iso(t.lastSeen),
      };
      if (!shouldConsiderSplit(topic, kids)) continue;

      const claims = await prisma.intranetClaim.findMany({
        where: { topicIds: { has: t.id } },
        take: 400,
      });
      const proposal = await runSplit(topic, claims.map(toClaim)).catch(() => null);
      done += 1;
      if (!proposal || proposal.verdict !== "split") {
        lines.push(`${t.label} holds together — left whole.`);
        continue;
      }

      for (const child of proposal.children) {
        const row = await prisma.intranetTopic.create({
          data: {
            label: child.label,
            summary: child.summary,
            parentId: t.id,
            status: "live",
            claimCount: child.claimIds.length,
          },
        });
        for (const cid of child.claimIds) {
          const claim = claims.find((c) => c.id === cid);
          if (!claim) continue;
          await prisma.intranetClaim.update({
            where: { id: cid },
            data: { topicIds: [...new Set([...claim.topicIds, row.id])] },
          });
        }
      }
      lines.push(
        `${t.label} opened into ${proposal.children.length}: ${proposal.children.map((c) => c.label).join(", ")}.`,
      );
    }

    if (lines.length === 0) lines.push("Nothing has grown enough to open yet.");
    return { ok: true, lines };
  } catch {
    return { ok: false, lines, reason: "The decomposition pass couldn't complete." };
  }
}

// ═══ the ingest reaction (IV.3) ══════════════════════════════════════════════

/** Read what was JUST pasted, settle the index, and report the visible
 *  consequence — which rows grew, which are new. This is what runs the moment
 *  the operator clicks "Keep it": the paste is never fire-and-forget. */
export async function readCapture(captureId: string): Promise<RunReport> {
  const bad = await guard();
  if (bad) return { ok: false, lines: [], reason: bad };
  if (!captureId) return { ok: false, lines: [], reason: "Nothing to read." };
  if (!extractAvailable())
    return {
      ok: false,
      lines: [],
      reason:
        "Kept — but no API key is configured, so it can't be read into the index yet.",
    };

  const prisma = getPrisma();
  try {
    const before = new Map(
      (await prisma.intranetTopic.findMany({ where: { status: "live" } })).map((t) => [
        t.id,
        { label: t.label, n: t.claimCount },
      ]),
    );

    const read = await extractPending(24, {
      captureId,
      deadlineMs: Date.now() + 220_000,
    });
    const idx = await indexTopics();

    const after = await prisma.intranetTopic.findMany({ where: { status: "live" } });
    const grew: string[] = [];
    for (const t of after) {
      const b = before.get(t.id);
      if (!b) {
        if (t.claimCount > 0) grew.push(`new: ${t.label}`);
      } else if (t.claimCount > b.n) {
        grew.push(`${t.label} +${t.claimCount - b.n}`);
      }
    }

    const lines = [...read.lines];

    // The full digest (IV.3): not just the index, but what the paste actually
    // was, what kinds of things it carried, and where they travel from here.
    const docsRead = await prisma.intranetDoc.findMany({
      where: { captureId },
      select: { id: true, space: true, occurredAt: true },
      take: 400,
    });
    if (docsRead.length > 0) {
      const spaces = [...new Set(docsRead.map((d) => d.space).filter(Boolean))];
      const times = docsRead
        .map((d) => d.occurredAt?.getTime() ?? NaN)
        .filter((t) => !Number.isNaN(t))
        .sort((a, b) => a - b);
      const day = (t: number) =>
        new Date(t).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "America/Chicago",
        });
      const span =
        times.length > 1 && day(times[0]) !== day(times[times.length - 1])
          ? `, ${day(times[0])} → ${day(times[times.length - 1])}`
          : times.length
            ? `, ${day(times[0])}`
            : "";
      if (spaces.length) lines.push(`That was ${spaces.slice(0, 3).join(", ")}${span}.`);

      const claims = await prisma.intranetClaim.findMany({
        where: { docId: { in: docsRead.map((d) => d.id) } },
        select: { kind: true, entities: true },
        take: 2000,
      });
      const KIND_WORD: Record<string, string> = {
        fact: "facts",
        decision: "decisions",
        commitment: "commitments",
        process: "ways we do things",
        question: "open questions",
        opinion: "opinions",
        "prospect-question": "things buyers asked",
      };
      const tally = new Map<string, number>();
      for (const c of claims) tally.set(c.kind, (tally.get(c.kind) ?? 0) + 1);
      const parts = Object.keys(KIND_WORD)
        .filter((k) => (tally.get(k) ?? 0) > 0)
        .map((k) => `${tally.get(k)} ${KIND_WORD[k]}`);
      if (parts.length) lines.push(`In it: ${parts.join(" · ")}.`);

      if (grew.length) lines.push(`The index grew: ${grew.join(" · ")}.`);

      const buyers = tally.get("prospect-question") ?? 0;
      if (buyers > 0)
        lines.push(
          `${buyers} buyer ask${buyers === 1 ? "" : "s"} filed under ${PROSPECT_ROOT.label} — proposals surface on the Playbook.`,
        );

      const named = accountsMentioned(
        [...new Set(claims.flatMap((c) => c.entities))],
        peos.map((p) => ({ id: p.id, name: p.name })),
      );
      if (named.length)
        lines.push(
          `The book knows these names: ${named.map((a) => a.name).join(", ")} — their rows carry it from here.`,
        );
    } else if (grew.length) {
      lines.push(`The index grew: ${grew.join(" · ")}.`);
    }

    lines.push(...idx.lines.filter((l) => l !== "The index is settled."));
    if (!read.ok && read.reason) lines.push(read.reason);
    return { ok: true, lines, pending: read.pending };
  } catch (e) {
    return { ok: false, lines: [], reason: `The reading failed — ${reasonOf(e)}.` };
  }
}

// ═══ Phase 12 · time ═════════════════════════════════════════════════════════

/** Find where the record moved on, and where it argues with itself. */
export async function readTimeAcrossTopics(budget = 2): Promise<RunReport> {
  const bad = await guard();
  if (bad) return { ok: false, lines: [], reason: bad };
  if (!extractAvailable()) return { ok: true, lines: [] };
  const prisma = getPrisma();
  const lines: string[] = [];

  try {
    const topics = await prisma.intranetTopic.findMany({
      where: { status: "live", claimCount: { gte: 4 } },
      orderBy: { lastSeen: "desc" },
      take: budget,
    });

    let superseded = 0;
    let disputed = 0;

    for (const t of topics) {
      const rows = await prisma.intranetClaim.findMany({
        where: { topicIds: { has: t.id } },
        take: 200,
      });
      const claims = rows.map(toClaim);
      const pairs = proposePairs(claims);
      if (pairs.length === 0) continue;

      const verdicts = await runVerdicts(pairs).catch(() => []);
      const byId = new Map(claims.map((c) => [c.id, c]));

      for (const v of verdicts) {
        const a = byId.get(v.aId);
        const b = byId.get(v.bId);
        if (!a || !b) continue;
        if (v.verdict === "supersedes") {
          const { older, newer } = supersessionDirection(a, b);
          await prisma.intranetClaim.update({
            where: { id: older.id },
            data: { supersededBy: newer.id },
          });
          superseded += 1;
        } else if (v.verdict === "disputes") {
          await prisma.intranetClaim.update({
            where: { id: a.id },
            data: { disputedWith: [...new Set([...a.disputedWith, b.id])] },
          });
          await prisma.intranetClaim.update({
            where: { id: b.id },
            data: { disputedWith: [...new Set([...b.disputedWith, a.id])] },
          });
          disputed += 1;
        }
      }
    }

    if (superseded)
      lines.push(
        `${superseded} line${superseded === 1 ? " has" : "s have"} been overtaken by something newer.`,
      );
    if (disputed)
      lines.push(
        `${disputed} disagreement${disputed === 1 ? "" : "s"} in the record, flagged.`,
      );
    if (lines.length === 0) lines.push("Nothing in the record contradicts itself.");
    return { ok: true, lines };
  } catch {
    return { ok: false, lines, reason: "The time pass couldn't complete." };
  }
}

// ═══ the orchestrator ════════════════════════════════════════════════════════

/** Bring the brain up to date: mirror, ingest, read, index, decompose, reconcile.
 *  Bounded on purpose — a big corpus is many small passes rather than one that
 *  times out halfway and leaves the operator guessing what happened. */
export async function runBrain(opts?: { deep?: boolean }): Promise<RunReport> {
  const bad = await guard();
  if (bad) return { ok: false, lines: [], reason: bad };

  const deep = opts?.deep === true;
  const deadline = Date.now() + 220_000;
  const lines: string[] = [];
  const stages: [string, () => Promise<RunReport>][] = [
    ["app", () => syncApp(deep ? 1500 : 300)],
    ["playbook", () => ingestPlaybook()],
    ["read", () => extractPending(deep ? 24 : 6, { deadlineMs: deadline })],
    ["index", () => indexTopics()],
    ["open", () => decomposeTopics(deep ? 4 : 1)],
    ["time", () => readTimeAcrossTopics(deep ? 4 : 1)],
  ];

  let pending = 0;
  for (const [, run] of stages) {
    const r = await run();
    lines.push(...r.lines);
    if (typeof r.pending === "number") pending = r.pending;
    // A stage that fails does not stop the rest — each writes before the next
    // begins, so the corpus is always consistent, just possibly less complete.
    if (!r.ok && r.reason) lines.push(r.reason);
  }

  return { ok: true, lines, pending };
}

/** What is waiting, so the room can say so without running anything. */
export async function brainQueue(): Promise<{ pending: number; unindexed: number }> {
  if (!hasDatabaseEnv()) return { pending: 0, unindexed: 0 };
  try {
    const prisma = getPrisma();
    const [pending, unindexed] = await Promise.all([
      prisma.intranetDoc.count({
        where: {
          OR: [{ extractedAt: null }, { promptVersion: { not: PROMPT_VERSION } }],
        },
      }),
      prisma.intranetTopic.count({ where: { status: "pending" } }),
    ]);
    return { pending, unindexed };
  } catch {
    return { pending: 0, unindexed: 0 };
  }
}
