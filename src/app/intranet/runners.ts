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
  RUN_LOCK_CHECKSUM,
  TOPIC_PROMOTE_AT,
  TOPIC_SPLIT_AT,
  type ClaimKind,
} from "@/lib/intranet/doctrine";
import { checksum } from "@/lib/intranet/normalize";
import { extractAvailable, runRead } from "@/lib/intranet/extract";
import {
  BANK,
  BUYER_QUESTIONS_PARENT,
  BUYER_QUESTIONS_SUB,
  bankParentOf,
  type BankParent,
} from "@/lib/intranet/bank";
import { PROSPECT_TOPIC_LABEL } from "@/lib/intranet/doctrine";
import { foldLabel, sameLabel } from "@/lib/intranet/index-topics";
import { runSplit, shouldConsiderSplit } from "@/lib/intranet/decompose";
import { proposePairs } from "@/lib/intranet/time";
import {
  runTopicSummary,
  runVerdicts,
  supersessionDirection,
} from "@/lib/intranet/verdicts";
import {
  playbookKnowledgeDoc,
  playbookQuestionDocs,
  playbookScenarioDocs,
} from "@/lib/intranet/playbook-in";
import {
  mirrorAccountNote,
  mirrorActivityDigest,
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
  /** Another catch-up already holds the run lock — watch it, don't stack. */
  busy?: boolean;
  /** Every read failed the same way — stop the run instead of hammering the
   *  same doomed calls for sixty more passes. The reason says what to fix. */
  halt?: boolean;
  /** V.6 — the excessive version behind "N failed · detail": stage, model,
   *  the full untruncated server error, and which entries. For sharing. */
  detail?: string[];
  /** V.8 — the written briefs, when a paste was read. */
  briefs?: string[];
  reason?: string;
};

/** The untruncated version of a failure, for the detail fold (V.6). */
function rawOf(e: unknown): string {
  const err = e as { status?: number; message?: string; name?: string };
  return [
    err?.name ? `[${err.name}]` : "",
    err?.status ? `status ${err.status}` : "",
    err?.message ?? String(e),
  ]
    .filter(Boolean)
    .join(" · ");
}

/** A model failure, in words the operator can act on (IV.2). The first
 *  production run read nothing and said nothing about it; that never happens
 *  again. Not exported: a "use server" module may only export async actions. */
function reasonOf(e: unknown): string {
  const err = e as { status?: number; message?: string; name?: string };
  let msg = (err?.message ?? "").replace(/\s+/g, " ").trim();
  // The SDK wraps server errors in a JSON blob; the human part is "message".
  const inner = /"message"\s*:\s*"([^"]+)"/.exec(msg);
  if (inner) msg = inner[1];
  msg = msg.slice(0, 160);
  if (/credit balance is too low/i.test(msg))
    return "the API account is out of credits — add credits under Plans & Billing, then press ⟳; everything that failed retries automatically";
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

    // §6 · the second record's digests — one per account per drop, rollup +
    // gems only. Blast tallies and staged slices never enter the brain.
    const activityNotes = await prisma.accountNote.findMany({
      where: {
        accountId: { startsWith: "activity:" },
        // The staged slices are ~120KB each and never enter the brain — they
        // must never ride this query either.
        NOT: [
          { accountId: { startsWith: "activity:stage:" } },
          { accountId: "activity:manifest" },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 400,
    });
    const gemsNotes = await prisma.accountNote.findMany({
      where: { accountId: { startsWith: "gems:" } },
      orderBy: { createdAt: "desc" },
      take: 400,
    });
    const gemsById = new Map(
      gemsNotes.map((n) => [n.accountId.slice("gems:".length), n.body]),
    );
    for (const n of activityNotes) {
      if (
        n.accountId.startsWith("activity:stage:") ||
        n.accountId === "activity:manifest"
      )
        continue;
      const accountId = n.accountId.slice("activity:".length);
      const head = /^⌗ ACTIVITY · drop (\S+) · (\S+)/.exec(n.body ?? "");
      if (!head) continue;
      const d = mirrorActivityDigest({
        accountId,
        accountName: nameById.get(accountId) ?? "",
        dropSha: head[1],
        dropDay: head[2],
        rollupBody: n.body,
        gemsBody: gemsById.get(accountId) ?? "",
      });
      if (d) drafts.push(d);
    }

    const { created, updated, skipped } = await upsertDocs(drafts);
    lines.push(
      `Looked around the app — ${created} new, ${updated} changed, ${skipped} already in hand.`,
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
 *  remembers what the app forgot, which is the whole point of C6. The playbook
 *  origin joined 2026-08-24: a retired question's mirror doc otherwise teaches
 *  a question the bank no longer asks, forever. */
async function markVanished(): Promise<number> {
  const prisma = getPrisma();
  let n = 0;
  const { DISCOVERY } = await import("@/lib/intel/discovery");
  const { PRODUCT_BANK } = await import("@/lib/intel/discovery-product");
  const { SCENARIOS } = await import("@/lib/intel/scenarios");
  const bankIds = new Set([...DISCOVERY, ...PRODUCT_BANK].map((q) => q.id));
  const scenarioIds = new Set(SCENARIOS.map((s) => s.id));
  const mirrored = await prisma.intranetDoc.findMany({
    where: {
      origin: {
        in: ["account-note", "todo", "touch", "partner-note", "card", "demo", "playbook"],
      },
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
      else if (m.origin === "playbook") {
        // question:/scenario: refs check against the static banks; market:/
        // lessons: refs keep their own app rows and stay out of this sweep.
        if (m.originRef.startsWith("question:"))
          alive = bankIds.has(m.originRef.slice("question:".length));
        else if (m.originRef.startsWith("scenario:"))
          alive = scenarioIds.has(m.originRef.slice("scenario:".length));
      }
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
    lines.push(
      `The Playbook came along — ${created} new, ${updated} changed, ${skipped} unchanged.`,
    );

    // V.3 · the foundational bank — the floor every filing lands on.
    const seeded = await seedBank();
    if (seeded)
      lines.push(
        `Laid the index floor — ${seeded} subject${seeded === 1 ? "" : "s"} seeded from the bank.`,
      );

    // V.4 · questions are content, not categories.
    const retired = await retireQuestionRail();
    if (retired)
      lines.push(
        `The question categories left the rail — what they held now lives under ${BUYER_QUESTIONS_PARENT}.`,
      );

    return { ok: true, lines };
  } catch {
    return { ok: false, lines, reason: "The Playbook ingest couldn't complete." };
  }
}

/** V.3 · seed the foundational bank: subject parents and their subtopics, live
 *  from day one. Idempotent — existing rows are left alone, only what's missing
 *  is created. The labels are the interface (V.2); the rows resolve them. */
async function seedBank(): Promise<number> {
  const prisma = getPrisma();
  const existing = await prisma.intranetTopic.findMany({
    select: { id: true, label: true, parentId: true },
  });
  let n = 0;
  for (const parent of BANK) {
    let parentRow = existing.find((t) => !t.parentId && sameLabel(t.label, parent.label));
    if (!parentRow) {
      const row = await prisma.intranetTopic.create({
        data: { label: parent.label, summary: parent.summary, status: "live" },
      });
      parentRow = { id: row.id, label: row.label, parentId: "" };
      existing.push(parentRow);
      n += 1;
    }
    for (const sub of parent.subs) {
      const here = parentRow.id;
      if (existing.some((t) => t.parentId === here && sameLabel(t.label, sub.label)))
        continue;
      const row = await prisma.intranetTopic.create({
        data: {
          label: sub.label,
          summary: sub.summary,
          parentId: here,
          status: "live",
        },
      });
      existing.push({ id: row.id, label: row.label, parentId: here });
      n += 1;
    }
  }
  return n;
}

/** V.4 · retire the old "What prospects ask" family from the rail. Buyers'
 *  words are content now — everything the shape bins held moves under
 *  Deals & selling → Buyer questions. Nothing is deleted (C6): the retired
 *  rows keep their place, marked merged, so every id ever issued resolves. */
async function retireQuestionRail(): Promise<number> {
  const prisma = getPrisma();
  const all = await prisma.intranetTopic.findMany({
    select: { id: true, label: true, parentId: true, status: true },
  });
  const root = all.find((t) => !t.parentId && sameLabel(t.label, PROSPECT_TOPIC_LABEL));
  if (!root) return 0;
  const family = [root, ...all.filter((t) => t.parentId === root.id)].filter(
    (t) => t.status !== "merged",
  );
  if (family.length === 0) return 0;
  const dealsRow = all.find(
    (t) => !t.parentId && sameLabel(t.label, BUYER_QUESTIONS_PARENT),
  );
  const binRow = all.find(
    (t) => t.parentId === dealsRow?.id && sameLabel(t.label, BUYER_QUESTIONS_SUB),
  );
  if (!binRow) return 0;
  for (const t of family) {
    await prisma.intranetTopic.update({
      where: { id: t.id },
      data: { status: "merged", mergedInto: binRow.id },
    });
    await reassignClaims(t.id, binRow.id);
  }
  return family.length;
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
      reason: "The brain is unreachable — nothing can be read right now.",
    };

  const prisma = getPrisma();
  const lines: string[] = [];

  try {
    const unread = {
      OR: [{ extractedAt: null }, { promptVersion: { not: PROMPT_VERSION } }],
    };
    // Never-tried docs first ("" sorts before "fail:N"), failures last — a
    // document that keeps timing out must never head the queue every pass and
    // starve the three hundred behind it (the 3-of-306 crawl, caught
    // 2026-08-19). occurredAt breaks ties, newest first.
    const pending = await prisma.intranetDoc.findMany({
      where: opts?.captureId ? { AND: [unread, { captureId: opts.captureId }] } : unread,
      orderBy: [{ promptVersion: "asc" }, { occurredAt: "desc" }],
      take: budget,
    });
    if (pending.length === 0) return { ok: true, lines: ["Everything has been read."] };

    // The living index, for the model as text (V.2) and for the app as rows.
    // "Grown" is every subtopic beyond the seeded bank, offered back to the
    // model so it files into them rather than re-inventing them.
    const topicRows = await prisma.intranetTopic.findMany({
      where: { status: "live" },
      select: { id: true, label: true, parentId: true },
    });
    const labelOf = new Map(topicRows.map((t) => [t.id, t.label]));
    const grown = topicRows
      .filter((t) => t.parentId && labelOf.has(t.parentId))
      .map((t) => ({ parent: labelOf.get(t.parentId)!, label: t.label }));
    const nameById = new Map(peos.map((p) => [p.id, p.name]));

    let claimsMade = 0;
    let read = 0;
    let outOfTime = false;
    let failed = 0;
    let firstWhy = "";
    const detail: string[] = [];
    const briefs: string[] = [];

    // The instrument's counts. The bar declares its unit — your paste in a
    // send-it run, the whole backlog otherwise — and the total is recounted
    // from the table so a sweep that found more makes the bar own up.
    const backlog = await prisma.intranetDoc.count({
      where: opts?.captureId ? { AND: [unread, { captureId: opts.captureId }] } : unread,
    });
    const st = await readPulse();
    const doneBase = st.active ? st.done : 0;
    const unitWord =
      st.kind === "sendit" && opts?.captureId ? "your paste" : "the whole backlog";
    const partWord = st.kind === "sendit" && opts?.captureId ? "parts read" : "read";
    let total = doneBase + backlog;
    await pulse({ total, unit: `${unitWord} — ${doneBase} of ${total} ${partWord}` });

    // Reads run eight at a time — the model is the slow part and the calls
    // are independent, so a pass gets eight entries per model-latency instead
    // of one (doubled 2026-08-20; the 300-doc backlog crawled at four).
    // Persistence stays sequential, one document at a time, below.
    const CONCURRENT_READS = 8;
    for (let i = 0; i < pending.length; i += CONCURRENT_READS) {
      if (opts?.deadlineMs && Date.now() > opts.deadlineMs) {
        outOfTime = true;
        break;
      }
      const batch = pending.slice(i, i + CONCURRENT_READS);

      // The lanes: what each of the four hands holds, this second.
      const held = batch.map((d) => laneWords(d));
      await pulse({
        lanes: held.map((w) => ({ ...w, sinceMs: Date.now() })),
        now:
          held.length === 1
            ? `Reading ${held[0].what}.`
            : `Reading ${held[0].what} and ${held.length - 1} more.`,
      });

      const settled = await Promise.allSettled(
        batch.map((d) =>
          runRead({
            body: d.body,
            origin: d.origin,
            space: d.space,
            occurredAt: iso(d.occurredAt),
            accountName: nameById.get(d.accountId) ?? undefined,
            grown,
          }),
        ),
      );
      for (let b = 0; b < batch.length; b += 1) {
        const doc = batch[b];
        const s = settled[b];
        if (s.status === "rejected") {
          // V.6 — the room says one word; the whole truth waits behind it.
          // Repeats collapse: the counter carries the arithmetic, and one line
          // per pass says it — never a wall of identical red.
          failed += 1;
          if (!firstWhy) firstWhy = reasonOf(s.reason);
          const raw = `${doc.space || doc.origin} · ${iso(doc.occurredAt).slice(0, 10)} — ${rawOf(s.reason)}`;
          detail.push(raw);
          // The failure is stamped so the doc sorts behind never-tried work
          // next pass. It stays pending — promptVersion "fail:N" is still
          // not the live version — it just stops hogging the front.
          const priorFails = Number(/^fail:(\d+)$/.exec(doc.promptVersion)?.[1] ?? 0);
          await prisma.intranetDoc
            .update({
              where: { id: doc.id },
              data: { promptVersion: `fail:${priorFails + 1}` },
            })
            .catch(() => null);
          total -= 1; // the total shrinks so 100 stays honest
          await pulse(
            {
              failed,
              total,
              unit: `${unitWord} — ${doneBase + read} of ${total} ${partWord} · ${failed} queued for retry`,
            },
            { detail: [raw] },
          );
          continue;
        }
        const result = s.value;

        // Re-reading a document replaces its claims rather than doubling them.
        // This is the one place rows leave a table, and they leave to be rewritten
        // in the same breath — the document, and everything it said, remains.
        await prisma.intranetClaim.deleteMany({ where: { docId: doc.id } });

        for (const filing of result.filings) {
          // Text in, rows out (V.2): the model named a parent and a subtopic;
          // the app resolves the words, growing the bank where it must.
          const ids = await resolveFilingIds(filing.topic, filing.subtopic, topicRows);
          for (const st of filing.statements) {
            const topicIds = new Set(ids);
            if (st.kind === "prospect-question")
              for (const id of await resolveFilingIds(
                BUYER_QUESTIONS_PARENT,
                BUYER_QUESTIONS_SUB,
                topicRows,
              ))
                topicIds.add(id);
            await prisma.intranetClaim.create({
              data: {
                docId: doc.id,
                text: st.text,
                speaker: st.speaker,
                saidAt: doc.occurredAt,
                kind: st.kind,
                confidence: "stated",
                entities: st.countries,
                topicIds: [...topicIds],
                askShape: "",
                offsetStart: st.offsetStart,
                offsetEnd: st.offsetEnd,
              },
            });
            claimsMade += 1;
          }
        }

        // V.8 — the brief is the product of the paste; it travels with the pass.
        if (result.brief) briefs.push(result.brief);

        await prisma.intranetDoc.update({
          where: { id: doc.id },
          data: {
            extractedAt: new Date(),
            promptVersion: PROMPT_VERSION,
            title: doc.title || result.brief.replace(/\s+/g, " ").slice(0, 90),
          },
        });
        read += 1;

        // The instrument hears about every entry the moment it lands.
        const w = laneWords(doc);
        const subs = [...new Set(result.filings.map((f) => f.subtopic))].slice(0, 3);
        const nSt = result.filings.reduce((n, f) => n + f.statements.length, 0);
        await pulse(
          {
            done: doneBase + read,
            unit: `${unitWord} — ${doneBase + read} of ${total} ${partWord}`,
          },
          {
            log: [
              {
                text: nSt
                  ? `${w.what} read — ${nSt} statement${nSt === 1 ? "" : "s"} filed under ${subs.join(", ")}.`
                  : `${w.what} read clean — nothing worth keeping, and that's fine.`,
              },
            ],
          },
        );
      }
    }

    if (read > 0)
      lines.push(
        `Read ${read} entr${read === 1 ? "y" : "ies"} and filed ${claimsMade} statement${claimsMade === 1 ? "" : "s"} into the index.`,
      );
    // V.6 — one word where the operator is looking; the detail rides along.
    if (failed > 0) {
      lines.push(`${failed} failed.`);
      await pulse(
        {},
        {
          log: [
            {
              text: `${failed} failed this pass — queued for retry.`,
              bad: true,
            },
          ],
        },
      );
    }
    if (outOfTime)
      lines.push("Ran out of time this pass — the rest waits for the next one.");
    const left = await prisma.intranetDoc.count({
      where: { OR: [{ extractedAt: null }, { promptVersion: { not: PROMPT_VERSION } }] },
    });
    if (left > 0) lines.push(`${left} still to read.`);

    // The circuit breaker: when a whole pass failed and nothing was read, the
    // problem is systemic — credits, key, outage. Running sixty more passes of
    // doomed calls helps nobody; stop, and say what to fix.
    const halted = read === 0 && failed > 0 && !outOfTime;
    if (halted)
      await pulse(
        { active: false, now: `Reading is paused — ${firstWhy}.`, lanes: [] },
        { log: [{ text: `Reading is paused — ${firstWhy}.`, bad: true }] },
      );

    return {
      ok: true,
      lines,
      pending: left,
      halt: halted || undefined,
      detail: detail.length ? detail : undefined,
      briefs: briefs.length ? briefs : undefined,
    };
  } catch (e) {
    return { ok: false, lines, reason: `The reading pass failed — ${reasonOf(e)}.` };
  }
}

/** Resolve a text filing to index rows, creating a grown subtopic when the
 *  content genuinely fits nothing seeded (V.3). Returns [parentId, subId] —
 *  a statement always carries both, which is what keeps a parent's material
 *  at least the sum of its children's (V.4). Text that resolves to nothing
 *  files nowhere, but the statement itself is kept on its document (C6). */
async function resolveFilingIds(
  topicLabel: string,
  subLabel: string,
  rows: { id: string; label: string; parentId: string }[],
): Promise<string[]> {
  const prisma = getPrisma();

  const ensureParent = async (bp: BankParent) => {
    let row = rows.find((r) => !r.parentId && sameLabel(r.label, bp.label)) ?? null;
    if (!row) {
      const created = await prisma.intranetTopic.create({
        data: { label: bp.label, summary: bp.summary, status: "live" },
      });
      row = { id: created.id, label: created.label, parentId: "" };
      rows.push(row);
    }
    return row;
  };

  // The model named a bank parent — the intended path.
  let parent = bankParentOf(topicLabel);
  let sub = subLabel;
  if (!parent) {
    // Or it swapped the levels, or named a subtopic the bank already places.
    const topicAsSub = BANK.find((p) =>
      p.subs.some((s) => sameLabel(s.label, topicLabel)),
    );
    const subOfBank = BANK.find((p) => p.subs.some((s) => sameLabel(s.label, subLabel)));
    if (topicAsSub) {
      parent = topicAsSub;
      sub = topicLabel;
    } else if (subOfBank) {
      parent = subOfBank;
    } else {
      // Or it named a subtopic the index has already grown, under whichever
      // parent grew it.
      const known =
        rows.find((r) => r.parentId && sameLabel(r.label, subLabel)) ??
        rows.find((r) => r.parentId && sameLabel(r.label, topicLabel));
      if (known) return [known.parentId, known.id];
    }
  }
  if (!parent || !sub.trim()) return [];

  const parentRow = await ensureParent(parent);
  let subRow = rows.find((r) => r.parentId === parentRow.id && sameLabel(r.label, sub));
  if (!subRow) {
    const created = await prisma.intranetTopic.create({
      data: { label: sub.trim().slice(0, 80), parentId: parentRow.id, status: "live" },
    });
    subRow = { id: created.id, label: created.label, parentId: parentRow.id };
    rows.push(subRow);
  }
  return [parentRow.id, subRow.id];
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

    // 2 · fold duplicates mechanically. Identical labels UNDER THE SAME PARENT
    //     are one topic — "Payments & banking" under Payroll operations and a
    //     same-named grown row elsewhere are different drawers. The loser keeps
    //     its row so every id ever issued still resolves.
    const live = await prisma.intranetTopic.findMany({ where: { status: "live" } });
    const byFold = new Map<string, (typeof live)[number]>();
    let merged = 0;
    for (const t of live) {
      const folded = foldLabel(t.label);
      if (!folded) continue;
      const key = `${t.parentId}|${folded}`;
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
    //     that can drift. A parent's material includes everything filed under
    //     its subtopics — the invariant V.4 demands: a parent never holds less
    //     than its children do.
    const current = await prisma.intranetTopic.findMany({ where: { status: "live" } });
    const kidsOf = new Map<string, string[]>();
    for (const t of current) {
      if (!t.parentId) continue;
      kidsOf.set(t.parentId, [...(kidsOf.get(t.parentId) ?? []), t.id]);
    }
    for (const t of current) {
      const family = [t.id, ...(kidsOf.get(t.id) ?? [])];
      const claims = await prisma.intranetClaim.findMany({
        where: { topicIds: { hasSome: family } },
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

/** "a, b, and c" — the way a person lists things (IV.9). */
function listOut(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** "The index grew — X picked up 6, and Y is brand new." */
function grewSentence(grew: { label: string; n: number; fresh: boolean }[]): string {
  const grown = grew.filter((g) => !g.fresh).map((g) => `${g.label} picked up ${g.n}`);
  const fresh = grew.filter((g) => g.fresh).map((g) => `"${g.label}" is brand new`);
  return `The index grew — ${listOut([...grown, ...fresh])}.`;
}

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
        "Kept — but the brain is unreachable, so it can't be read into the index yet.",
    };

  const prisma = getPrisma();
  try {
    const before = new Map(
      (await prisma.intranetTopic.findMany({ where: { status: "live" } })).map((t) => [
        t.id,
        { label: t.label, n: t.claimCount },
      ]),
    );

    // The instrument stamps itself SEND-IT RUN: the bar now measures YOUR
    // paste — parts read of parts split — and says so.
    const parts = await prisma.intranetDoc.count({
      where: {
        captureId,
        OR: [{ extractedAt: null }, { promptVersion: { not: PROMPT_VERSION } }],
      },
    });
    const capRow = await prisma.intranetCapture.findUnique({
      where: { id: captureId },
      select: { meta: true },
    });
    const capSpace = ((capRow?.meta ?? {}) as { space?: string }).space ?? "";
    await pulse(
      {
        active: true,
        kind: "sendit",
        startedAt: Date.now(),
        total: parts,
        done: 0,
        failed: 0,
        now: "Your paste arrived — reading it before anything else.",
        unit: `your paste — 0 of ${parts} part${parts === 1 ? "" : "s"} read`,
        lanes: [],
        log: [],
        detail: [],
      },
      {
        log: [
          {
            text: `Your paste arrived${capSpace ? ` — ${capSpace}` : ""}, kept verbatim in the archive. Split into ${parts} part${parts === 1 ? "" : "s"}.`,
          },
        ],
      },
    );

    const read = await extractPending(24, {
      captureId,
      deadlineMs: Date.now() + 220_000,
    });
    const idx = await indexTopics();

    const after = await prisma.intranetTopic.findMany({ where: { status: "live" } });
    const grew: { label: string; n: number; fresh: boolean }[] = [];
    for (const t of after) {
      const b = before.get(t.id);
      if (!b) {
        if (t.claimCount > 0) grew.push({ label: t.label, n: t.claimCount, fresh: true });
      } else if (t.claimCount > b.n) {
        grew.push({ label: t.label, n: t.claimCount - b.n, fresh: false });
      }
    }

    const lines = [...read.lines];

    // The full digest (IV.3, voiced per IV.9): what the paste actually was,
    // what it carried, and where it travels — said the way a person would say
    // it, in whole sentences, never in pipeline shorthand.
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
      if (spaces.length && times.length) {
        const first = day(times[0]);
        const last = day(times[times.length - 1]);
        lines.push(
          first === last
            ? `What you pasted is ${spaces.slice(0, 3).join(" and ")} from ${first}.`
            : `What you pasted covers ${spaces.slice(0, 3).join(" and ")} from ${first} through ${last}.`,
        );
      }

      const claims = await prisma.intranetClaim.findMany({
        where: { docId: { in: docsRead.map((d) => d.id) } },
        select: { kind: true, entities: true },
        take: 2000,
      });
      const KIND_WORD: Record<string, string> = {
        fact: "facts",
        decision: "decisions",
        commitment: "commitments people made",
        process: "notes on how we do things",
        question: "open questions",
        opinion: "opinions",
        "prospect-question": "questions buyers asked",
      };
      const tally = new Map<string, number>();
      for (const c of claims) tally.set(c.kind, (tally.get(c.kind) ?? 0) + 1);
      const found = Object.keys(KIND_WORD)
        .filter((k) => (tally.get(k) ?? 0) > 0)
        .map((k) => `${tally.get(k)} ${KIND_WORD[k]}`);
      if (found.length) lines.push(`Inside it I found ${listOut(found)}.`);

      if (grew.length) lines.push(grewSentence(grew));

      const buyers = tally.get("prospect-question") ?? 0;
      if (buyers > 0)
        lines.push(
          `${buyers === 1 ? "One of those is a question a real buyer asked — it's" : `${buyers} of those are questions real buyers asked — they're`} filed under ${BUYER_QUESTIONS_PARENT}, in ${BUYER_QUESTIONS_SUB}, and any battlecard proposals from them will show up on the Playbook.`,
        );

      const named = accountsMentioned(
        [...new Set(claims.flatMap((c) => c.entities))],
        peos.map((p) => ({ id: p.id, name: p.name })),
      );
      if (named.length)
        lines.push(
          `${listOut(named.map((a) => a.name))} came up by name — their account rows carry this from here.`,
        );
    } else if (grew.length) {
      lines.push(grewSentence(grew));
    }

    lines.push(...idx.lines.filter((l) => l !== "The index is settled."));
    if (!read.ok && read.reason) lines.push(read.reason);

    // The record keeps the digest (IV.8) — and the brief itself (V.8), and the
    // whole truth behind any failure (V.6): stored on the capture, so the
    // ledger can replay what this paste did long after this response is gone.
    try {
      const cap = await prisma.intranetCapture.findUnique({
        where: { id: captureId },
        select: { meta: true },
      });
      await prisma.intranetCapture.update({
        where: { id: captureId },
        data: {
          meta: {
            ...((cap?.meta ?? {}) as object),
            digest: lines,
            briefs: read.briefs ?? [],
            detail: read.detail ?? [],
          },
        },
      });
    } catch {
      // an unreplayable digest is not a failed read
    }

    // The bar completes on YOUR paste; the handoff to whatever else waits is
    // announced, never silent.
    await pulse(
      { now: "Your paste is fully read and briefed." },
      { log: [{ text: "Your brief just landed on its card in the record." }] },
    );
    if ((read.pending ?? 0) === 0)
      await pulse(
        {
          active: false,
          now: "Caught up — nothing waiting.",
          unit: "nothing — at rest",
          lanes: [],
        },
        { log: [{ text: "Done — the backlog is clear." }] },
      );

    return {
      ok: true,
      lines,
      pending: read.pending,
      briefs: read.briefs,
      detail: read.detail,
    };
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

// The run lock. One catch-up at a time — a hard refresh or a second tab must
// WATCH the running pass, never stack another on top of it. Overlapping runs
// read the same entries twice, fight for connections, and can starve the page
// itself. The lock is a sentinel capture row (no new tables), invisible on
// every surface, with a TTL so a crashed run can never wedge the room.
const RUN_LOCK_TTL_MS = 240_000;

async function acquireRunLock(): Promise<boolean> {
  const prisma = getPrisma();
  const now = Date.now();
  try {
    const row = await prisma.intranetCapture.findUnique({
      where: { rawChecksum: RUN_LOCK_CHECKSUM },
      select: { id: true, meta: true },
    });
    if (!row) {
      try {
        await prisma.intranetCapture.create({
          data: {
            origin: "paste",
            raw: "the room's own run lock — not a paste",
            rawChecksum: RUN_LOCK_CHECKSUM,
            title: "",
            meta: { lockedUntil: now + RUN_LOCK_TTL_MS },
          },
        });
        return true;
      } catch {
        return false; // two runs raced the create; the other one won
      }
    }
    const until = Number((row.meta as { lockedUntil?: number })?.lockedUntil ?? 0);
    if (until > now) return false;
    await prisma.intranetCapture.update({
      where: { id: row.id },
      data: {
        meta: { ...((row.meta ?? {}) as object), lockedUntil: now + RUN_LOCK_TTL_MS },
      },
    });
    return true;
  } catch {
    return true; // a lock that can't be read must never stop the work itself
  }
}

async function releaseRunLock(): Promise<void> {
  try {
    const prisma = getPrisma();
    const row = await prisma.intranetCapture.findUnique({
      where: { rawChecksum: RUN_LOCK_CHECKSUM },
      select: { id: true, meta: true },
    });
    if (!row) return;
    await prisma.intranetCapture.update({
      where: { id: row.id },
      data: { meta: { ...((row.meta ?? {}) as object), lockedUntil: 0 } },
    });
  } catch {
    // the TTL frees it either way
  }
}

// ── the pulse (the bench gadget's wire) ─────────────────────────────────────
// The instrument on the Intranet page is only as honest as what the workers
// write. So the workers write: a status blob on the run-lock sentinel — which
// run, what each lane holds this second, the counts, a plain-language log.
// The page polls it every two seconds. Writing status must NEVER break the
// work: every pulse swallows its own failures.

type PulseLane = { src: string; what: string; sinceMs: number };
type PulseLog = { at: number; text: string; bad?: boolean };
type PulseStatus = {
  active: boolean;
  kind: "refresh" | "sendit" | "";
  startedAt: number;
  lastAt: number;
  total: number;
  done: number;
  failed: number;
  /** The now-sentence — what the room would say out loud. */
  now: string;
  /** What the bar measures, declared: "the whole backlog — 3 of 8 read". */
  unit: string;
  lanes: PulseLane[];
  log: PulseLog[];
  detail: string[];
};

function emptyPulse(): PulseStatus {
  return {
    active: false,
    kind: "",
    startedAt: 0,
    lastAt: 0,
    total: 0,
    done: 0,
    failed: 0,
    now: "",
    unit: "",
    lanes: [],
    log: [],
    detail: [],
  };
}

async function readPulse(): Promise<PulseStatus> {
  try {
    const row = await getPrisma().intranetCapture.findUnique({
      where: { rawChecksum: RUN_LOCK_CHECKSUM },
      select: { meta: true },
    });
    const meta = (row?.meta ?? {}) as { status?: PulseStatus };
    return meta.status ?? emptyPulse();
  } catch {
    return emptyPulse();
  }
}

async function pulse(
  patch: Partial<PulseStatus>,
  add?: { log?: { text: string; bad?: boolean }[]; detail?: string[] },
): Promise<void> {
  try {
    const prisma = getPrisma();
    const row = await prisma.intranetCapture.findUnique({
      where: { rawChecksum: RUN_LOCK_CHECKSUM },
      select: { id: true, meta: true },
    });
    const meta = (row?.meta ?? {}) as Record<string, unknown> & {
      status?: PulseStatus;
    };
    const prev = meta.status ?? emptyPulse();
    const next: PulseStatus = { ...prev, ...patch, lastAt: Date.now() };
    if (add?.log?.length)
      next.log = [
        ...add.log.map((l) => ({ at: Date.now(), ...l })),
        ...(patch.log ?? prev.log),
      ].slice(0, 40);
    if (add?.detail?.length)
      next.detail = [...(patch.detail ?? prev.detail), ...add.detail].slice(-20);
    const data = { meta: { ...meta, status: next } };
    if (row) await prisma.intranetCapture.update({ where: { id: row.id }, data });
    else
      await prisma.intranetCapture.create({
        data: {
          origin: "paste",
          raw: "the room's own run lock — not a paste",
          rawChecksum: RUN_LOCK_CHECKSUM,
          title: "",
          meta: { lockedUntil: 0, status: next },
        },
      });
  } catch {
    // the instrument never gets to break the machine
  }
}

/** A document named the way the gadget's lane says it (IV.9, plain words). */
function laneWords(doc: { origin: string; space: string; title: string }): {
  src: string;
  what: string;
} {
  const SRC: Record<string, string> = {
    "account-note": "accounts page",
    todo: "accounts page",
    touch: "accounts page",
    card: "the dashboard",
    "partner-note": "partners page",
    demo: "demo notes",
    playbook: "the playbook",
    research: "the playbook",
    gap: "the playbook",
    teams: "your paste",
    meeting: "your paste",
    paste: "your paste",
  };
  // The app's own note syntax (⚑[k:a], →[…], pencil glyphs) never reaches the
  // lane — the instrument speaks plain words only.
  const plain = (doc.title || doc.space || "an entry")
    .replace(/[✎⚑⟪⟫]/g, " ")
    .replace(/\[[a-z]+:[^\]]*\]?/gi, " ")
    .replace(/→\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return {
    src: SRC[doc.origin] ?? doc.origin,
    what: (plain || "an entry").slice(0, 60),
  };
}

/** Bring the brain up to date: mirror, ingest, read, index, decompose, reconcile.
 *  Bounded on purpose — a big corpus is many small passes rather than one that
 *  times out halfway and leaves the operator guessing what happened. */
export async function runBrain(opts?: {
  deep?: boolean;
  /** false = a catch-up pass: skip the app/Playbook sweeps done moments ago —
   *  the clock belongs to reading (IV.3). */
  sweep?: boolean;
}): Promise<RunReport> {
  const bad = await guard();
  if (bad) return { ok: false, lines: [], reason: bad };

  if (!(await acquireRunLock())) {
    const q = await brainQueue();
    return { ok: true, busy: true, lines: [], pending: q.pending };
  }

  const sweep = opts?.sweep !== false;

  // The instrument's run header. A sweep pass opens a fresh REFRESH RUN; a
  // catch-up pass continues the one already narrating; a run that follows a
  // paste converts the send-it run into "continuing the backlog".
  const prevPulse = await readPulse();
  if (sweep || !prevPulse.active || Date.now() - prevPulse.lastAt > RUN_LOCK_TTL_MS) {
    await pulse(
      {
        active: true,
        kind: "refresh",
        startedAt: Date.now(),
        total: 0,
        done: 0,
        failed: 0,
        now: sweep ? "Looking around the whole app first…" : "Continuing the backlog.",
        unit: "the whole backlog — sweep first, then reads",
        lanes: [],
        log: [],
        detail: [],
      },
      {
        log: [
          {
            text: sweep
              ? "Sweep started — the accounts page, the Playbook, partners, demo notes."
              : "Continuing the backlog.",
          },
        ],
      },
    );
  } else if (prevPulse.kind === "sendit") {
    await pulse(
      { kind: "refresh", now: "Continuing the backlog." },
      { log: [{ text: "Continuing with what was still waiting." }] },
    );
  }

  const deep = opts?.deep === true;
  const deadline = Date.now() + 220_000;
  const lines: string[] = [];
  const all: [string, () => Promise<RunReport>][] = [
    ["app", () => syncApp(deep ? 1500 : 300)],
    ["playbook", () => ingestPlaybook()],
    ["read", () => extractPending(24, { deadlineMs: deadline })],
    ["index", () => indexTopics()],
    ["open", () => decomposeTopics(deep ? 4 : 1)],
    ["time", () => readTimeAcrossTopics(deep ? 4 : 1)],
  ];
  const stages =
    opts?.sweep === false
      ? all.filter(([name]) => name === "read" || name === "index")
      : all;

  let pending = 0;
  let halt = false;
  const detail: string[] = [];
  const briefs: string[] = [];
  try {
    for (const [name, run] of stages) {
      const r = await run();
      lines.push(...r.lines);
      if (typeof r.pending === "number") pending = r.pending;
      if (r.halt) halt = true;
      if (r.detail) detail.push(...r.detail);
      if (r.briefs) briefs.push(...r.briefs);
      // The sweep stages narrate through the instrument too; the read stage
      // narrates itself, entry by entry, from inside extractPending.
      if ((name === "app" || name === "playbook") && r.lines.length)
        await pulse({}, { log: r.lines.map((text) => ({ text })) });
      // A stage that fails does not stop the rest — each writes before the next
      // begins, so the corpus is always consistent, just possibly less complete.
      if (!r.ok && r.reason) lines.push(r.reason);
    }
  } finally {
    await releaseRunLock();
  }

  if (pending === 0)
    await pulse(
      {
        active: false,
        now: "Caught up — nothing waiting.",
        unit: "nothing — at rest",
        lanes: [],
      },
      { log: [{ text: "Done — the backlog is clear." }] },
    );

  return {
    ok: true,
    lines,
    pending,
    halt: halt || undefined,
    detail: detail.length ? detail : undefined,
    briefs: briefs.length ? briefs : undefined,
  };
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
