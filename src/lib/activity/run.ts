// The Second Record's run — staging verification, rollups, distillation,
// refutation, coverage. The three adversarial passes live HERE, as stages of
// the running system, not as a QA chapter:
//
//   ⚔ 1 · coverage — every account with human motion ends the run holding a
//         CONFIRMED gem or an arithmetic verdict; below 100% the run marks
//         itself failed-coverage and cannot complete silently (§3.7).
//   ⚔ 2 · refutation — every gem candidate faces mechanical canon checks in
//         code, then an independent refuter that defaults to refute; one
//         failed check kills it before storage (§3.8).
//   ⚔ 3 · staleness & acted — a new drop replaces changed accounts' gems
//         wholesale; the first record kills the nag the moment the operator
//         moves on a gem's person (§3.9).
//
// The transport is verified too: the manifest names every batch and every
// account checksum, and an incomplete upload refuses to run (§3.0).

import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { csms } from "@/lib/book";
import { contactsFor } from "@/lib/book/contacts";
import { EXTRA_PARTNERS } from "@/lib/book/partners";
import { redactMoney } from "@/lib/intel/lexicon";
import { RUN_LOCK_CHECKSUM } from "@/lib/intranet/doctrine";
import { inboundDates, recordSends, type NoteLike } from "@/lib/sendbook/read";
import { readOutcome } from "@/lib/dashboard/outcome";
import { rowsChecksum, tallyChecksum } from "./parse";
import { deriveColleagues, isMachineryName } from "./classify";
import {
  buildRollup,
  intentWindows,
  isHumanMotion,
  supportThemes,
  verdictLine,
  type Rollup,
} from "./rollup";
import {
  ACTIVITY_NS,
  GEMS_NS,
  INTENT_NS,
  MANIFEST_ID,
  SECOND_RECORD_SPANS,
  STAGE_NS,
  SUPPORT_NS,
  emptyRunState,
  isRollupNoteId,
  parseGemsBody,
  parseManifestBody,
  parseStageBody,
  renderGemsBody,
  renderIntentBody,
  renderManifestBody,
  renderRollupBody,
  renderStageBody,
  renderSupportBody,
  type Gem,
  type ManifestStore,
} from "./stores";
import {
  claudeConfigured,
  claudeDead,
  markClaudeUp,
  noteClaudeFailure,
} from "@/lib/claude/health";
import {
  distillAvailable,
  gemFromCandidate,
  runDistill,
  runRefute,
  type ContextPack,
} from "./distill";
import { coverageGaps, dropQueues, mechanicalKill, mortalityFlag } from "./harness";
import type { AccountSlice, StageBatch, StageReply } from "./types";

const CHI = "America/Chicago";
const chiDay = (d = new Date()): string =>
  d.toLocaleDateString("en-CA", { timeZone: CHI });

const CONCURRENT_DISTILLS = 4;
const RETRY_SIGNAL_HUMAN_ROWS = 5;

// ── the pulse (the bench gadget narrates this run too) ──────────────────────
// Same sentinel the intranet workers write; the gadget renders whatever run
// is talking. Writing status must never break the work.

type PulseLog = { at: number; text: string; bad?: boolean };

async function pulse(
  patch: Record<string, unknown>,
  log?: { text: string; bad?: boolean }[],
): Promise<void> {
  try {
    const prisma = getPrisma();
    const row = await prisma.intranetCapture.findUnique({
      where: { rawChecksum: RUN_LOCK_CHECKSUM },
      select: { id: true, meta: true },
    });
    const meta = (row?.meta ?? {}) as Record<string, unknown> & {
      status?: Record<string, unknown> & { log?: PulseLog[] };
    };
    const prev = meta.status ?? {};
    const next = { ...prev, ...patch, lastAt: Date.now() };
    if (log?.length)
      next.log = [
        ...log.map((l) => ({ at: Date.now(), ...l })),
        ...(Array.isArray(prev.log) ? prev.log : []),
      ].slice(0, 40);
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

// ── manifest store I/O ──────────────────────────────────────────────────────

async function readManifestStore(): Promise<{
  noteId: string;
  store: ManifestStore;
} | null> {
  const prisma = getPrisma();
  const rows = await prisma.accountNote.findMany({
    where: { accountId: MANIFEST_ID },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  if (rows.length === 0) return null;
  const store = parseManifestBody(rows[0].body);
  return store ? { noteId: rows[0].id, store } : null;
}

async function writeManifestStore(store: ManifestStore): Promise<void> {
  const prisma = getPrisma();
  const body = renderManifestBody(store);
  const existing = await prisma.accountNote.findMany({
    where: { accountId: MANIFEST_ID },
    select: { id: true },
  });
  if (existing.length > 0) {
    await prisma.accountNote.update({
      where: { id: existing[0].id },
      data: { body },
    });
    // Replace forward: any strays beyond the first are folded away.
    for (const extra of existing.slice(1))
      await prisma.accountNote.delete({ where: { id: extra.id } });
  } else {
    await prisma.accountNote.create({
      data: { accountId: MANIFEST_ID, kind: "mine", body, source: "activity" },
    });
  }
}

/** Replace-forward write for any activity namespace note. */
async function replaceNote(accountId: string, body: string): Promise<void> {
  const prisma = getPrisma();
  const existing = await prisma.accountNote.findMany({
    where: { accountId },
    select: { id: true },
  });
  if (existing.length > 0) {
    await prisma.accountNote.update({ where: { id: existing[0].id }, data: { body } });
    for (const extra of existing.slice(1))
      await prisma.accountNote.delete({ where: { id: extra.id } });
  } else {
    await prisma.accountNote.create({
      data: { accountId, kind: "mine", body, source: "activity" },
    });
  }
}

async function readStageSlice(accountId: string): Promise<{
  dropSha: string;
  slice: AccountSlice;
} | null> {
  const prisma = getPrisma();
  const rows = await prisma.accountNote.findMany({
    where: { accountId: `${STAGE_NS}${accountId}` },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  if (rows.length === 0) return null;
  return parseStageBody(rows[0].body);
}

// ── staging ─────────────────────────────────────────────────────────────────

export async function stageActivityBatch(batch: StageBatch): Promise<StageReply> {
  if (!hasDatabaseEnv()) return { ok: false, reason: "The store isn't reachable." };

  // Fresh drop? Reset the run state, remember the prior drop for change
  // detection and lane drift — the prior is data we already verified, never a
  // re-read of old files.
  let current = await readManifestStore();
  if (!current || current.store.manifest.dropSha !== batch.dropSha) {
    // The prior drop, for change detection and lane drift. Only a COMPLETED
    // drop becomes the prior — an abandoned half-drop keeps whatever prior it
    // itself was diffing against.
    const prior = !current
      ? null
      : current.store.run.phase === "done" ||
          current.store.run.phase === "failed-coverage"
        ? {
            dropSha: current.store.manifest.dropSha,
            laneTotals: current.store.manifest.laneTotals,
            accounts: current.store.manifest.accounts.map((a) => ({
              id: a.id,
              rowsSum: a.rowsSum,
              tallySum: a.tallySum,
            })),
          }
        : current.store.prior;
    current = {
      noteId: "",
      store: {
        manifest: {
          dropSha: batch.dropSha,
          dropDay: chiDay(),
          fileName: "",
          fileBytes: 0,
          rowCount: 0,
          textRows: 0,
          dupes: 0,
          window: { from: "", to: "" },
          laneTotals: { human: 0, csm: 0, support: 0, intent: 0, machinery: 0 },
          receiptRows: 0,
          accounts: [],
          unmatched: [],
          colleagues: [],
          collisions: [],
          headerDiff: { missing: [], extra: [] },
          totalBatches: batch.totalBatches,
        },
        run: emptyRunState(),
        prior,
      },
    };
  }
  const store = current.store;

  // Stage each slice — server re-verifies the client's checksums before
  // anything lands, and redacts money again on the way in (defense in depth;
  // the client already redacted).
  const mismatched: string[] = [];
  for (const slice of batch.slices) {
    const keys = slice.rows.map((r) => r.k);
    const [rowsSum, tallySum] = await Promise.all([
      rowsChecksum(keys),
      tallyChecksum(slice.tally),
    ]);
    if (rowsSum !== slice.rowsSum || tallySum !== slice.tallySum) {
      mismatched.push(slice.id);
      continue;
    }
    for (const r of slice.rows) if (r.c) r.c = redactMoney(r.c);
    await replaceNote(`${STAGE_NS}${slice.id}`, renderStageBody(slice, batch.dropSha));
  }

  if (!store.run.batchesSeen.includes(batch.batchIndex))
    store.run.batchesSeen.push(batch.batchIndex);

  // The final batch carries the manifest — verification happens NOW, and an
  // incomplete upload refuses to run (⚔ transport).
  if (batch.manifest) {
    const m = batch.manifest;
    const missingBatches: number[] = [];
    for (let i = 0; i < m.totalBatches; i++)
      if (!store.run.batchesSeen.includes(i)) missingBatches.push(i);

    const badAccounts: string[] = [...mismatched];
    for (const a of m.accounts) {
      const staged = await readStageSlice(a.id);
      if (
        !staged ||
        staged.dropSha !== m.dropSha ||
        staged.slice.rowsSum !== a.rowsSum ||
        staged.slice.tallySum !== a.tallySum
      )
        badAccounts.push(a.id);
    }

    if (missingBatches.length > 0 || badAccounts.length > 0) {
      store.manifest = m;
      store.run.phase = "refused";
      store.run.receipt = [
        missingBatches.length > 0
          ? `Upload incomplete — ${missingBatches.length} of ${m.totalBatches} batches missing. Drop the file again.`
          : `${badAccounts.length} account slice${badAccounts.length === 1 ? "" : "s"} failed verification. Drop the file again.`,
      ];
      await writeManifestStore(store);
      return {
        ok: false,
        verified: false,
        missingBatches,
        mismatched: badAccounts,
        reason: store.run.receipt[0],
      };
    }

    // Accounts held while the distiller was down owe a re-judge: their
    // coverage is arithmetic only, and the moment the key is back a re-drop
    // of the same file re-queues exactly them (refuted 2026-08-22).
    const heldPrior = Object.entries(store.run.covered)
      .filter(([, v]) => v === "held")
      .map(([id]) => id);
    // A re-drop is the operator's own probe: a configured key gets one fresh
    // chance even if the latch is down — success clears it, failure
    // re-latches and the drop completes arithmetically again. The latch is
    // per-instance, so the pass may land on an instance still latched; that
    // re-drop holds again and the latch expires within ten minutes.
    if (heldPrior.length > 0 && claudeConfigured() && claudeDead()) markClaudeUp();
    const rejudge = heldPrior.length > 0 && distillAvailable();

    // Same drop as the prior one? Nothing changed — zero writes, zero calls.
    if (store.prior && store.prior.dropSha === m.dropSha && !rejudge) {
      store.manifest = m;
      store.run.phase = "done";
      store.run.receipt = ["Nothing changed — the record already holds this drop."];
      await writeManifestStore(store);
      return { ok: true, verified: true, unchanged: true };
    }

    // Change detection (§3.3): rows changed → distill; tally alone → arithmetic.
    // A re-drop of the SAME file refreshes staging but never re-distills what
    // this sha already produced — an account counts as covered when the run's
    // covered map holds it OR its rollup note already exists (rollups replace
    // per drop, so an existing rollup under the same manifest IS this drop's
    // product). Same rows, same gems, zero calls.
    const sameSha = store.manifest.dropSha === m.dropSha;
    const shaCovered = new Set<string>(sameSha ? Object.keys(store.run.covered) : []);
    if (sameSha) {
      const holders = await getPrisma().accountNote.findMany({
        where: { accountId: { startsWith: ACTIVITY_NS } },
        select: { accountId: true },
      });
      for (const n of holders)
        if (isRollupNoteId(n.accountId))
          shaCovered.add(n.accountId.slice(ACTIVITY_NS.length));
      // A hold is not coverage of the gems: with the distiller back, held
      // accounts re-queue on the same sha.
      if (rejudge) for (const id of heldPrior) shaCovered.delete(id);
    }
    const priorById = new Map((store.prior?.accounts ?? []).map((a) => [a.id, a]));
    const { distillQueue, intentQueue } = dropQueues(m.accounts, priorById, shaCovered);
    if (rejudge) {
      const inDrop = new Set(m.accounts.map((a) => a.id));
      for (const id of heldPrior)
        if (inDrop.has(id) && !distillQueue.includes(id)) distillQueue.push(id);
    }

    // What came in, first line, in counts. A drop that reads nothing looks
    // identical to a drop that reads everything until this number is on the
    // page — the 2026-08-28 blank read reported "Coverage: 100%" and the
    // operator had no way to see that zero rows carried email text.
    const receipt: string[] = [
      `The drop landed — ${m.rowCount} rows across ${m.accounts.length} accounts, ${m.textRows} of them carrying email text${m.dupes > 0 ? `, ${m.dupes} identical repeats kept (multi-recipient sends look alike)` : ""}.`,
    ];
    if (m.textRows === 0 && m.rowCount > 0)
      receipt.push(
        `NOT ONE ROW CARRIED TEXT — this drop read nothing. Check the export's Full Comments column and drop it again.`,
      );
    if (m.headerDiff.missing.length > 0)
      receipt.push(
        `Missing columns this drop: ${m.headerDiff.missing.join(", ")} — those readings run dark.`,
      );
    if (m.headerDiff.extra.length > 0)
      receipt.push(`New columns ignored: ${m.headerDiff.extra.join(", ")}.`);
    if (m.unmatched.length > 0) {
      const total = m.unmatched.reduce((n, u) => n + u.rows, 0);
      receipt.push(
        `${total} rows matched no book account: ${m.unmatched
          .slice(0, 5)
          .map((u) => `${u.name} (${u.rows})`)
          .join(", ")}${m.unmatched.length > 5 ? ", …" : ""}.`,
      );
    }
    if (m.collisions.length > 0)
      receipt.push(
        `Name collisions (unresolved either side): ${m.collisions.join(", ")}.`,
      );

    // ⚔ lane drift — a >15-point share swing against the prior drop is named,
    // never silently absorbed (§3.2).
    if (store.prior) {
      const share = (t: Record<string, number>, k: string): number => {
        const total = Object.values(t).reduce((a, b) => a + b, 0);
        return total > 0 ? (100 * (t[k] ?? 0)) / total : 0;
      };
      for (const lane of ["human", "csm", "support", "intent", "machinery"]) {
        const was = share(store.prior.laneTotals, lane);
        const is = share(m.laneTotals, lane);
        if (Math.abs(is - was) > 15)
          receipt.push(
            `Lane drift: ${lane} ${Math.round(was)}% → ${Math.round(is)}% — check the report's filters before trusting this drop.`,
          );
      }
    }
    if (sameSha && shaCovered.size > 0)
      receipt.push(
        `Same file re-dropped — staging refreshed; ${shaCovered.size} accounts already covered stay covered.`,
      );
    receipt.push(
      `${distillQueue.length} accounts changed and wait for distillation; ${intentQueue.length} need only their tallies refreshed.`,
    );

    store.manifest = m;
    store.run = {
      ...emptyRunState(),
      phase: "ready",
      distillQueue,
      intentQueue,
      receipt,
      // A same-sha re-drop keeps its coverage — the work already happened.
      covered: sameSha ? store.run.covered : {},
      batchesSeen: store.run.batchesSeen,
      startedAt: "",
      finishedAt: "",
    };
    await writeManifestStore(store);
    await pulse(
      {
        active: true,
        kind: "activity",
        startedAt: Date.now(),
        total: distillQueue.length + intentQueue.length,
        done: 0,
        failed: 0,
        now: "The activity report landed — verified complete.",
        unit: `the second record — 0 of ${distillQueue.length + intentQueue.length} accounts`,
        lanes: [],
      },
      receipt.map((text) => ({ text })),
    );
    return {
      ok: true,
      verified: true,
      queued: { distill: distillQueue.length, intentOnly: intentQueue.length },
    };
  }

  await writeManifestStore(store);
  return { ok: true };
}

// ── the first-record context pack ───────────────────────────────────────────

async function contextPackFor(accountId: string, name: string): Promise<ContextPack> {
  const prisma = getPrisma();
  const lines: string[] = [
    "the operator is Antaeus Coe — their own logged motion is the first record, never a door to walk through",
  ];
  try {
    const notes = await prisma.accountNote.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
      take: 80,
    });
    const likes: NoteLike[] = notes.map((n) => ({
      body: n.body,
      source: n.source ?? "",
      createdAt: n.createdAt.toISOString(),
      actors: n.actors ?? "",
    }));

    const sends = recordSends(likes).sort((a, b) => (a.at < b.at ? 1 : -1));
    if (sends.length > 0) {
      const d = chiDay(new Date(sends[0].at));
      lines.push(
        `the operator's last outbound: ${d}${sends[0].who ? ` to ${sends[0].who}` : ""} — ${redactMoney(sends[0].head).slice(0, 90)}`,
      );
    }
    const inbound = inboundDates(likes).sort();
    if (inbound.length > 0)
      lines.push(
        `their last inbound to the operator: ${chiDay(new Date(inbound[inbound.length - 1]))}`,
      );
    if (sends.length === 0 && inbound.length === 0)
      lines.push("no direct conversation between the operator and this account yet");

    for (const n of notes.slice(0, 5)) {
      const head = redactMoney((n.body.split("\n")[0] ?? "").replace(/\s+/g, " ")).slice(
        0,
        100,
      );
      if (head) lines.push(`record ${chiDay(n.createdAt)}: ${head}`);
    }

    const todos = await prisma.todo.findMany({
      where: { accountId, done: false },
      orderBy: { createdAt: "desc" },
      take: 4,
    });
    for (const t of todos)
      lines.push(
        `open commitment: ${redactMoney(t.body.replace(/\s+/g, " ")).slice(0, 90)}`,
      );

    const card = await prisma.dashCard.findFirst({ where: { name } });
    if (card) {
      const outcome = readOutcome(card.notes);
      lines.push(
        outcome
          ? `the board says this deal is closed ${outcome.status}`
          : "a live board row exists — the deal is being worked",
      );
    }
  } catch {
    // a pack that can't fully assemble still ships what it has
  }
  return { accountName: name, lines: lines.slice(0, 14) };
}

// ── the run pass ────────────────────────────────────────────────────────────

export type RunPassResult = {
  ok: boolean;
  done: boolean;
  remaining: number;
  receipt: string[];
  reason?: string;
};

export async function runActivityPass(opts?: {
  deadlineMs?: number;
}): Promise<RunPassResult> {
  if (!hasDatabaseEnv())
    return { ok: false, done: false, remaining: 0, receipt: [], reason: "No store." };
  const current = await readManifestStore();
  if (!current)
    return {
      ok: false,
      done: false,
      remaining: 0,
      receipt: [],
      reason: "No drop staged.",
    };
  const store = current.store;
  const { manifest: m, run } = store;
  if (run.phase === "refused")
    return {
      ok: false,
      done: true,
      remaining: 0,
      receipt: run.receipt,
      reason: run.receipt[0],
    };
  if (run.phase === "done" || run.phase === "failed-coverage")
    return { ok: true, done: true, remaining: 0, receipt: run.receipt };
  if (run.phase !== "ready" && run.phase !== "running")
    return {
      ok: false,
      done: false,
      remaining: 0,
      receipt: [],
      reason: "The drop is still uploading.",
    };

  const deadline = opts?.deadlineMs ?? Date.now() + 220_000;
  run.phase = "running";
  if (!run.startedAt) run.startedAt = new Date().toISOString();

  const today = chiDay();
  const nameById = new Map(m.accounts.map((a) => [a.id, a.name]));
  const colleagues = deriveColleagues(m.colleagues, csms, EXTRA_PARTNERS);
  const totalWork =
    Object.keys(run.covered).length + run.distillQueue.length + run.intentQueue.length;
  const doneAlready = Object.keys(run.covered).length;

  // ⚔ 3 · staleness & acted — sweep at the head of every pass (§3.9).
  await actedSweep();

  // Tally-only accounts: pure arithmetic, no model, cheap enough to finish.
  while (run.intentQueue.length > 0 && Date.now() < deadline) {
    const id = run.intentQueue.shift()!;
    const staged = await readStageSlice(id);
    if (!staged) continue;
    await replaceNote(
      `${INTENT_NS}${id}`,
      renderIntentBody({
        dropSha: m.dropSha,
        windows: intentWindows(staged.slice.tally, today),
        receipts: staged.slice.tally.receipts,
      }),
    );
    run.covered[id] = run.covered[id] || "verdict";
  }
  await writeManifestStore(store);

  // Changed accounts: rollup + stores + distillation, CONCURRENT_DISTILLS at
  // a time, resumable — the store is saved after every batch.
  const accountPeopleFor = (slice: AccountSlice): Set<string> => {
    const out = new Set<string>();
    for (const c of contactsFor(slice.id)) {
      const n = `${c.first ?? ""} ${c.last ?? ""}`.trim();
      if (n && n.includes(" ")) out.add(n);
    }
    for (const n of [slice.meta.primaryContact, slice.meta.lastContact])
      if (n && n.trim().includes(" ")) out.add(n.trim());
    // A name Assigned only on this account is this account's person — the
    // export logs captured emails under their own name (measured 2026-08-20).
    for (const r of slice.rows) {
      const a = (r.a ?? "").trim();
      // Machinery is never a person. "Automated Process" has a space in it
      // and is excluded from the colleague roster by construction, so without
      // this guard the logger walked straight in as an account person.
      if (a && a.includes(" ") && !isMachineryName(a) && !colleagues.has(a)) out.add(a);
    }
    return out;
  };

  // Address → the account person's name. Built from the account's OWN
  // contacts and the export's Primary Contact Email, so a hit is always
  // someone on their side; our own addresses are never in it.
  const accountEmailsFor = (slice: AccountSlice): Map<string, string> => {
    const out = new Map<string, string>();
    for (const c of contactsFor(slice.id)) {
      const n = `${c.first ?? ""} ${c.last ?? ""}`.trim();
      const e = (c.email ?? "").trim().toLowerCase();
      if (n && n.includes(" ") && e.includes("@")) out.set(e, n);
    }
    const pe = (slice.meta.primaryContactEmail ?? "").trim().toLowerCase();
    const pn = (slice.meta.primaryContact ?? "").trim();
    if (pe.includes("@") && pn.includes(" ") && !out.has(pe)) out.set(pe, pn);
    return out;
  };

  const processAccount = async (id: string): Promise<string[]> => {
    const log: string[] = [];
    const staged = await readStageSlice(id);
    if (!staged) {
      run.covered[id] = "verdict";
      return [`${nameById.get(id) ?? id}: staging missing — skipped, named here.`];
    }
    const slice = staged.slice;
    const name = slice.name || nameById.get(id) || id;
    const accountPeople = accountPeopleFor(slice);

    const rollup: Rollup = buildRollup({
      slice,
      dropSha: m.dropSha,
      dropDay: m.dropDay,
      window: m.window,
      colleagues,
      accountPeople,
      accountEmails: accountEmailsFor(slice),
    });
    // Themes and examples read from the staged slice; the TOTAL is the full
    // lane count — the slice cap must never understate the number the
    // operator quotes (Axcet read 151 of its true 197 on the first drop).
    const support = supportThemes(slice.rows);
    support.total = Math.max(support.total, slice.laneCounts.support);
    if (support.total > 0)
      await replaceNote(
        `${SUPPORT_NS}${id}`,
        renderSupportBody({ dropSha: m.dropSha, ...support }),
      );
    await replaceNote(
      `${INTENT_NS}${id}`,
      renderIntentBody({
        dropSha: m.dropSha,
        windows: intentWindows(slice.tally, today),
        receipts: slice.tally.receipts,
      }),
    );

    const motionRows = slice.rows.filter(isHumanMotion);
    const hasSubstance = slice.rows.some(
      (r) => (r.lane === "human" || r.lane === "csm") && !r.fl.includes("r"),
    );
    // One availability read per account: a sibling's mid-batch latch must
    // never flip THIS account's funded judgment to "held" after its
    // distiller already ran (refuted 2026-08-22).
    const distillerCould = distillAvailable();
    const distillerRan = hasSubstance && distillerCould;
    let gems: Gem[] = [];

    if (distillerRan) {
      const pack = await contextPackFor(id, name);
      const rowsByKey = new Map(slice.rows.map((r) => [r.k, r]));
      const card = await getPrisma()
        .dashCard.findFirst({ where: { name } })
        .catch(() => null);
      const rollupText = renderRollupBody(rollup);

      const attempt = async (retryNote?: string): Promise<Gem[]> => {
        // A transport failure THROWS — the account re-queues and the circuit
        // breaker names the error. A failed call is never "nothing found":
        // the first live drop filed 126 straight-faced verdicts over a
        // swallowed uniform failure, and that never happens again.
        const res = await runDistill({
          accountName: name,
          rows: slice.rows,
          rollupText,
          pack,
          rich: Boolean(card),
          retryNote,
        });
        run.born += res.gems.length;
        const out: Gem[] = [];
        for (const cand of res.gems) {
          // ⚔ 2a · the mechanical gauntlet — cheap rejections never spend a call.
          const kill = mechanicalKill(cand, rowsByKey, colleagues, accountPeople);
          if (kill) {
            run.died += 1;
            continue;
          }
          // ⚔ 2b · the refuter — independent, defaults to refute.
          const verdict = await runRefute({
            accountName: name,
            gem: cand,
            citedRows: cand.citedRowKeys
              .map((k) => rowsByKey.get(k))
              .filter((r): r is NonNullable<typeof r> => Boolean(r)),
            pack,
            colleagues: [...colleagues]
              .filter((c) => cand.who.includes(c) || m.colleagues.includes(c))
              .slice(0, 20),
            accountPeople: [...accountPeople].slice(0, 20),
          });
          if (verdict.refuted) {
            run.died += 1;
            continue;
          }
          out.push(
            gemFromCandidate({ cand, rowsByKey, dropSha: m.dropSha, createdDay: today }),
          );
        }
        return out;
      };

      gems = await attempt();

      // ⚔ 1b · one re-distillation for signal-dense empties, the failure
      // named in the prompt (§3.7.2).
      const dense =
        motionRows.length >= RETRY_SIGNAL_HUMAN_ROWS ||
        slice.rows.some((r) => r.fl.includes("i")) ||
        rollup.threads.some((t) => t.led === "account-led");
      if (gems.length === 0 && dense && !run.retried.includes(id)) {
        run.retried.push(id);
        gems = await attempt(
          "your first pass produced nothing that survived verification; the slice holds dense human signal — find the actionable thread or state precisely why it is not actionable",
        );
      }
    }

    if (gems.length > 0) {
      await replaceNote(`${GEMS_NS}${id}`, renderGemsBody(gems));
      rollup.verdict = "";
      run.covered[id] = "gems";
      log.push(`${name}: ${gems.length} gem${gems.length === 1 ? "" : "s"} confirmed.`);
    } else if (distillerCould) {
      // A changed account whose gems all died keeps no stale gems note.
      await getPrisma().accountNote.deleteMany({
        where: { accountId: `${GEMS_NS}${id}` },
      });
      rollup.verdict = verdictLine(rollup);
      run.covered[id] = "verdict";
      log.push(`${name}: ${rollup.verdict}.`);
    } else {
      // The distiller never ran — a dead key is not a verdict on the
      // standing gems. Hold whatever the last funded pass filed; the
      // arithmetic stores above still moved. "held" is coverage of the
      // arithmetic only: a re-drop of the SAME file with the distiller
      // back re-queues exactly these accounts.
      const standing = await getPrisma()
        .accountNote.findFirst({ where: { accountId: `${GEMS_NS}${id}` } })
        .catch(() => null);
      rollup.verdict = verdictLine(rollup);
      run.covered[id] = "held";
      log.push(
        standing
          ? `${name}: ${rollup.verdict}. Gems held from the last pass — the distiller is down.`
          : `${name}: ${rollup.verdict}.`,
      );
    }
    await replaceNote(`${ACTIVITY_NS}${id}`, renderRollupBody(rollup));
    return log;
  };

  while (run.distillQueue.length > 0 && Date.now() < deadline) {
    const batch = run.distillQueue.slice(0, CONCURRENT_DISTILLS);
    const held = batch.map((id) => nameById.get(id) ?? id);
    await pulse({
      active: true,
      kind: "activity",
      now:
        held.length === 1
          ? `Distilling ${held[0]}.`
          : `Distilling ${held[0]} and ${held.length - 1} more.`,
      total: totalWork,
      done:
        Object.keys(run.covered).length - doneAlready >= 0
          ? Object.keys(run.covered).length
          : 0,
      unit: `the second record — ${Object.keys(run.covered).length} of ${totalWork} accounts`,
      lanes: held.map((what) => ({
        src: "the activity report",
        what,
        sinceMs: Date.now(),
      })),
    });
    const settled = await Promise.allSettled(batch.map((id) => processAccount(id)));
    const logs: { text: string; bad?: boolean }[] = [];
    for (let i = 0; i < batch.length; i++) {
      const s = settled[i];
      if (s.status === "fulfilled") {
        run.distillQueue = run.distillQueue.filter((x) => x !== batch[i]);
        logs.push(...s.value.map((text) => ({ text })));
      } else {
        // A failed account sinks behind the fresh work and retries next pass —
        // the starvation fix pattern, reused.
        run.distillQueue = [...run.distillQueue.filter((x) => x !== batch[i]), batch[i]];
        const errText = String(
          (s.reason as { message?: string })?.message ?? s.reason ?? "unknown",
        ).slice(0, 200);
        logs.push({
          text: `${nameById.get(batch[i]) ?? batch[i]} failed this pass — ${errText} — queued for retry.`,
          bad: true,
        });
        // A DEAD key (auth or credits) is not a failure to loop on or to
        // stall the drop over: the latch flips and the re-queued accounts
        // take the held path next pass — the drop completes arithmetically
        // and the receipt says what held (founder-decreed 2026-08-22).
        noteClaudeFailure(s.reason);
        if (claudeDead()) {
          if (!run.receipt.some((r) => r.includes("completes arithmetically")))
            run.receipt.push(
              "The key is dead — the rest of this drop completes arithmetically and gems hold from the last funded pass.",
            );
          continue;
        }
        // A uniform failure (outage, network) must not loop forever: if
        // every account in the batch failed and nothing has ever succeeded
        // this run, stop and say the ACTUAL error out loud.
        if (
          settled.every((x) => x.status === "rejected") &&
          Object.keys(run.covered).length === 0
        ) {
          run.receipt.push(
            `Every distillation failed — ${errText}. Fix it and run again.`,
          );
          await writeManifestStore(store);
          await pulse(
            { active: false, now: `Distillation is paused — ${errText.slice(0, 120)}` },
            [{ text: `Distillation is paused — ${errText.slice(0, 120)}`, bad: true }],
          );
          return {
            ok: false,
            done: false,
            remaining: run.distillQueue.length,
            receipt: run.receipt,
            reason: `Every distillation failed — ${errText}`,
          };
        }
      }
    }
    await writeManifestStore(store);
    await pulse({}, logs);
  }

  const remaining = run.distillQueue.length + run.intentQueue.length;
  if (remaining > 0) {
    await writeManifestStore(store);
    return { ok: true, done: false, remaining, receipt: run.receipt };
  }

  // ⚔ 1 · the coverage invariant — 100% or the run says failed (§3.7).
  // Unchanged accounts keep their prior coverage; the rollup note is the
  // evidence it exists.
  const priorRollups = new Set(
    (
      await getPrisma().accountNote.findMany({
        where: { accountId: { startsWith: ACTIVITY_NS } },
        select: { accountId: true },
      })
    )
      .map((n) => n.accountId)
      .filter(isRollupNoteId)
      .map((id) => id.slice(ACTIVITY_NS.length)),
  );
  // A held account keeps its OLD gems — so the store, not the hold, is the
  // evidence. Read which accounts actually have one before judging coverage.
  const gemHolders = new Set(
    (
      await getPrisma().accountNote.findMany({
        where: { accountId: { startsWith: GEMS_NS } },
        select: { accountId: true },
      })
    ).map((n) => n.accountId.slice(GEMS_NS.length)),
  );
  const uncovered = coverageGaps(
    m.accounts,
    run.covered,
    (id) => priorRollups.has(id),
    (id) => gemHolders.has(id),
  );

  run.finishedAt = new Date().toISOString();
  const gemsN = Object.values(run.covered).filter((v) => v === "gems").length;
  const verdictsN = Object.values(run.covered).filter((v) => v === "verdict").length;
  const held = Object.entries(run.covered).filter(([, v]) => v === "held");
  const heldN = held.length;
  const heldEmpty = held.filter(([id]) => !gemHolders.has(id)).length;
  run.receipt.push(
    `${Object.keys(run.covered).length} accounts distilled — ${gemsN} hold confirmed gems, ${verdictsN} filed honest verdicts, ${run.died} candidates died in refutation.`,
  );
  if (heldN > 0)
    run.receipt.push(
      heldEmpty === 0
        ? `The distiller was down for ${heldN} account${heldN === 1 ? "" : "s"} — their gems hold from the last funded pass. Re-drop the file once the key is back and they re-judge.`
        : `The distiller was down for ${heldN} account${heldN === 1 ? "" : "s"}, and ${heldEmpty} of them hold NO gem — there was no funded pass to fall back on. Fix the key and drop the file again; nothing was judged this run.`,
    );
  if (mortalityFlag(run.born, run.died))
    run.receipt.push(
      `Distiller quality flag: ${run.died} of ${run.born} candidates died. Read the receipt before trusting this drop's gems.`,
    );
  if (uncovered.length > 0) {
    run.phase = "failed-coverage";
    run.receipt.push(
      `COVERAGE FAILED — ${uncovered.length} active account${uncovered.length === 1 ? "" : "s"} hold neither a gem nor a verdict: ${uncovered.slice(0, 8).join(", ")}${uncovered.length > 8 ? ", …" : ""}.`,
    );
  } else {
    run.phase = "done";
    // The claim is arithmetic, never a slogan: it names what the store holds.
    // "Coverage: 100%" over an empty store is the exact line that told the
    // founder a dead-key run had succeeded (2026-08-31).
    run.receipt.push(
      heldN > 0
        ? `Coverage: 100% — but ${heldN} account${heldN === 1 ? "" : "s"} held, so ${gemsN + verdictsN} of ${gemsN + verdictsN + heldN} were judged this run. The rest read their old gems.`
        : "Coverage: 100% — every active account holds a gem or an honest verdict.",
    );
  }
  await writeManifestStore(store);
  await pulse(
    {
      active: false,
      kind: "activity",
      now:
        run.phase !== "done"
          ? "The run finished BELOW coverage — see the receipt."
          : heldN > 0
            ? `The second record is distilled — ${gemsN + verdictsN} judged, ${heldN} held on their old gems.`
            : "The second record is distilled — coverage 100%.",
      unit: `the second record — ${Object.keys(run.covered).length} of ${totalWork} accounts`,
      lanes: [],
    },
    [
      {
        text: run.receipt[run.receipt.length - 1],
        bad: run.phase !== "done",
      },
    ],
  );
  return {
    ok: run.phase === "done",
    done: true,
    remaining: 0,
    receipt: run.receipt,
    reason: run.phase === "done" ? undefined : run.receipt[run.receipt.length - 1],
  };
}

// ── ⚔ 3 · acted detection — the first record kills the nag (§3.9) ───────────

export async function actedSweep(): Promise<number> {
  const prisma = getPrisma();
  let stamped = 0;
  try {
    const gemNotes = await prisma.accountNote.findMany({
      where: { accountId: { startsWith: GEMS_NS } },
      take: 400,
    });
    for (const note of gemNotes) {
      const accountId = note.accountId.slice(GEMS_NS.length);
      const gems = parseGemsBody(note.body);
      if (gems.length === 0 || gems.every((g) => g.actedDay)) continue;
      const notes = await prisma.accountNote.findMany({
        where: { accountId },
        orderBy: { createdAt: "desc" },
        take: 60,
      });
      const likes: NoteLike[] = notes.map((n) => ({
        body: n.body,
        source: n.source ?? "",
        createdAt: n.createdAt.toISOString(),
        actors: n.actors ?? "",
      }));
      const sends = recordSends(likes);
      let changed = false;
      for (const g of gems) {
        if (g.actedDay) continue;
        for (const s of sends) {
          const day = chiDay(new Date(s.at));
          if (day <= g.createdDay) continue;
          const text = `${s.who} ${s.head}`;
          if (g.who.some((w) => w && text.includes(w))) {
            g.actedDay = day;
            changed = true;
            stamped += 1;
            break;
          }
        }
      }
      if (changed)
        await prisma.accountNote.update({
          where: { id: note.id },
          data: { body: renderGemsBody(gems) },
        });
    }
  } catch {
    // the sweep never breaks the run
  }
  return stamped;
}

// ── status for receipts ─────────────────────────────────────────────────────

export type ActivityStatus = {
  hasDrop: boolean;
  phase: string;
  dropDay: string;
  receipt: string[];
  remaining: number;
};

export async function activityStatus(): Promise<ActivityStatus> {
  const empty: ActivityStatus = {
    hasDrop: false,
    phase: "",
    dropDay: "",
    receipt: [],
    remaining: 0,
  };
  if (!hasDatabaseEnv()) return empty;
  const current = await readManifestStore();
  if (!current) return empty;
  const { manifest, run } = current.store;
  return {
    hasDrop: true,
    phase: run.phase,
    dropDay: manifest.dropDay,
    receipt: run.receipt,
    remaining: run.distillQueue.length + run.intentQueue.length,
  };
}

// ── the take-back (2026-08-28) ──────────────────────────────────────────────
// A drop is reversible. Not to the drop before it — the writer overwrites a
// note body in place and the manifest keeps only the prior drop's checksums,
// so there is no earlier content to restore and the button must never pretend
// otherwise. What it can do is complete: clear every store the second record
// owns, and the app falls back to what it showed before any export existed.
//
// The reach is exactly the five namespaces the run writes and nothing else.
// The record's own entries, the HomeRoom's moves, the Sendbook, the
// Scratchpaper, act drafts, seats and research notes are untouched — a bad
// drop was never able to reach them, and neither is the undo.

export type TakeBackResult = {
  ok: boolean;
  removed: number;
  lines: string[];
  reason?: string;
};

export async function takeBackSecondRecord(): Promise<TakeBackResult> {
  if (!hasDatabaseEnv())
    return { ok: false, removed: 0, lines: [], reason: "No database in this session." };
  const prisma = getPrisma();
  const current = await readManifestStore();
  const was = current?.store.manifest;
  const spans = SECOND_RECORD_SPANS;
  const lines: string[] = [];
  let removed = 0;
  for (const s of spans) {
    const r = await prisma.accountNote.deleteMany({
      where: { accountId: { startsWith: s.ns } },
    });
    removed += r.count;
    if (r.count > 0) lines.push(`${r.count} ${s.label} removed.`);
  }
  if (removed === 0)
    return {
      ok: true,
      removed: 0,
      lines: ["There was no second record to take back."],
    };
  lines.unshift(
    was
      ? `Took back the drop of ${was.fileName || "the activity export"} from ${was.dropDay} — ${was.rowCount} rows, ${was.accounts.length} accounts.`
      : "Took back the second record.",
  );
  // Said plainly, because a take-back that quietly loses the drop before it
  // would be the same kind of silence this whole fix exists to end.
  lines.push(
    "The second record is empty. Earlier drops are not kept, so nothing was restored — every other surface reads what it read before any export was filed.",
  );
  await pulse(
    {
      active: false,
      kind: "activity",
      now: "The second record was taken back — nothing filed.",
      unit: "the second record — empty",
      lanes: [],
    },
    [{ text: lines[0], bad: false }],
  );
  return { ok: true, removed, lines };
}
