// The Second Record's run — staging verification, rollups, distillation,
// refutation, coverage. The three adversarial passes live HERE, as stages of
// the running system, not as a QA chapter (the plan blessed 2026-08-20;
// CLAUDE.md, The second record):
//
//   ⚔ 1 · coverage — every account with human motion ends the run holding a
//         CONFIRMED gem or an arithmetic verdict; below 100% the run marks
//         itself failed-coverage and cannot complete silently.
//   ⚔ 2 · refutation — every gem candidate faces mechanical canon checks in
//         code, then an independent refuter that defaults to refute; one
//         failed check kills it before storage.
//   ⚔ 3 · staleness & acted — a new drop replaces changed accounts' gems
//         wholesale; the first record kills the nag the moment the operator
//         moves on a gem's person.
//
// The transport is verified too: the manifest names every batch and every
// account checksum, and an incomplete upload refuses to run.

import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { csms } from "@/lib/book";
import { accountIdsOf, canonicalAccountId } from "@/lib/book/merge";
import { contactsFor } from "@/lib/book/contacts";
import { EXTRA_PARTNERS } from "@/lib/book/partners";
import { redactMoney } from "@/lib/intel/lexicon";
import { inferActors, inferLane, joinRecipients } from "@/lib/intel/provenance";
import {
  createAccountNoteRow,
  redactStructured,
  type AccountNoteData,
} from "@/lib/notes/write";
import { docOf, type TouchRow } from "@/lib/record/docs";
import { hideNoteKey } from "@/lib/record/hide";
import type { RecordNote } from "@/lib/record/read";
import { declaredHomeSide, readFromStores } from "@/lib/record/stores";
import { homeSideFrom } from "@/lib/pipeline/build";
import { theirLoopOf } from "@/lib/room/owed";
import { RUN_LOCK_CHECKSUM } from "@/lib/intranet/doctrine";
import { readOutcome } from "@/lib/dashboard/outcome";
import { rowsChecksum, tallyChecksum } from "./parse";
import { deriveColleagues, isMachineryName, rowPerson } from "./classify";
import { actedDayFor, type SweepRow } from "./acted";
import { HIDE_NOTE_PREFIX, hiddenIds } from "./read";
import {
  buildRollup,
  intentWindows,
  isHumanMotion,
  supportThemes,
  verdictLine,
  type Rollup,
} from "./rollup";
import {
  ACTED_NS,
  ACTIVITY_NS,
  GEMS_NS,
  INTENT_NS,
  MANIFEST_ID,
  SECOND_RECORD_SPANS,
  STAGE_NS,
  STAGE_PENDING_NS,
  SUPPORT_NS,
  actedStampsOf,
  emptyRunState,
  isRollupNoteId,
  mergeActedStamps,
  parseActedBody,
  parseGemsBody,
  parseManifestBody,
  parseStageBody,
  reattachActed,
  renderActedBody,
  renderGemsBody,
  renderIntentBody,
  renderManifestBody,
  renderRollupBody,
  renderStageBody,
  renderSupportBody,
  type ActedStamp,
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

// Every receipt line carries the Chicago clock it was written at. A run
// rebuilds its closing lines each pass while earlier lines stay put, so a
// re-drop's receipt showed last night's "58 gems, 43 verdicts" one line above
// this morning's "0 candidates died" with nothing to tell them apart — the
// operator could not say which line described which moment (2026-09-01).
const chiClock = (d = new Date()): string =>
  d.toLocaleTimeString("en-US", {
    timeZone: CHI,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

/** One receipt line, stamped. Never stamps twice — a line rebuilt on a later
 *  pass keeps the clock of the pass that wrote it. */
export const STAMP = /^\d{2}:\d{2} · /;
const stamped = (text: string): string =>
  STAMP.test(text) ? text : `${chiClock()} · ${text}`;
const say = (run: { receipt: string[] }, text: string): void => {
  run.receipt.push(stamped(text));
};

// What this build IS, printed beside the failure. Three times on 2026-09-01 a
// deploy was reasoned about from the outside — promoted instead of rebuilt,
// or built before a variable was saved — and each guess cost a drop. A build
// that fails on configuration says which build it is and what configuration it
// actually has; nobody has to infer it from a dashboard.
function configLine(): string {
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7);
  const ws = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  return `This build is ${sha || "local"}. Its workspace id ${ws ? `is set and starts ${ws.slice(0, 12)}` : "is NOT SET"}.`;
}

const CONCURRENT_DISTILLS = 4;

/** The dead-key line's opening, said once per run; the run looks for it
 *  before saying it again. */
const DEAD_KEY_MARK = "The key is dead.";
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

// ── the store ───────────────────────────────────────────────────────────────

/** The store the run reads and writes: the Prisma client in production. A
 *  test hands in an in-memory table, the way the writer takes its client. */
export type ActivityDb = ReturnType<typeof getPrisma>;

// ── manifest store I/O ──────────────────────────────────────────────────────

async function readManifestStore(db: ActivityDb = getPrisma()): Promise<{
  noteId: string;
  store: ManifestStore;
} | null> {
  const rows = await db.accountNote.findMany({
    where: { accountId: MANIFEST_ID },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  if (rows.length === 0) return null;
  const store = parseManifestBody(rows[0].body);
  return store ? { noteId: rows[0].id, store } : null;
}

/** The manifest is book-wide: no account's people are on it. */
async function writeManifestStore(
  store: ManifestStore,
  db: ActivityDb = getPrisma(),
): Promise<void> {
  await replaceSecondRecordNote(MANIFEST_ID, renderManifestBody(store), NO_PEOPLE, db);
}

// ── the second record's writer (P4; slice 17) ───────────────────────────────
// A second-record row carries its provenance like a first-record row: the
// door in its own column beside source, lane, actors and recipients, and a
// bare row is a defect (Provenance is columns, ruled 2026-09-25, P3/P4 —
// CLAUDE.md, The Ted doctrine). So a fresh row goes through the one writer
// (src/lib/notes/write.ts) with door "activity", lane "background" (ingested
// intelligence around the account, never the operator's own working record),
// source "activity", and the export's people; and the body is marked
// structured, so the stage and manifest JSON redact by string value and a
// count, a row key or a checksum is never taken for a figure. The text
// grammars (rollup, gems, support, intent) hold no JSON and redact as text,
// which is what they need: their counts carry no comma groups.

/** The people columns a second-record row carries beside its door. */
export type SecondRecordPeople = { actors: string; recipients: string };

const NO_PEOPLE: SecondRecordPeople = { actors: "", recipients: "" };

// The columns are the people on the account's traffic this drop, not the
// evidence — the staged rows beneath carry every address — so the list is
// bounded here rather than the row.
const PEOPLE_CAP = 100;

const joinPeople = (people: Iterable<string>): string =>
  joinRecipients([...people].slice(0, PEOPLE_CAP));

/** The export's people on a slice, from the columns the slice already carries
 *  and never a body ("bodies and recipients never upload" holds because these
 *  are the uploaded columns, read back): who each row shows as its person —
 *  the signature first, the Assigned column after, never a mechanism
 *  (machinery is never a person) — as the actors; every address on a logged
 *  email as the recipients, our own side included, comma-joined the way the
 *  record's own rows carry theirs. One name or address once, newest first. */
export function slicePeople(slice: Pick<AccountSlice, "rows">): SecondRecordPeople {
  const actors = new Set<string>();
  const recipients = new Set<string>();
  for (const r of slice.rows) {
    const who = rowPerson(r);
    if (who) actors.add(who);
    for (const p of (r.p ?? "").split(";")) {
      const addr = p.trim().toLowerCase();
      if (addr) recipients.add(addr);
    }
  }
  return { actors: joinPeople(actors), recipients: joinPeople(recipients) };
}

/** The slice of the Prisma client the replace-forward write needs — a test
 *  hands in a stub, the way the writer takes its client. */
export type SecondRecordClient = {
  accountNote: {
    findMany(args: {
      where: { accountId: string };
      select: { id: true };
    }): Promise<{ id: string }[]>;
    update(args: {
      where: { id: string };
      data: Partial<AccountNoteData>;
    }): Promise<unknown>;
    delete(args: { where: { id: string } }): Promise<unknown>;
    create(args: { data: AccountNoteData }): Promise<{ id: string }>;
  };
};

/** Replace-forward write for any second-record note. A key with no row gets
 *  one through the writer; a key with a row keeps it — the same row, the same
 *  id — and takes the new body with the drop's provenance columns, because the
 *  export's people change drop to drop and a row written bare before this
 *  slice heals on the next drop rather than staying a defect. Strays behind
 *  the first row are folded away. The body is redacted the way the writer
 *  redacts a structured one, so both paths store the same bytes. */
export async function replaceSecondRecordNote(
  accountId: string,
  body: string,
  people: SecondRecordPeople = NO_PEOPLE,
  client: SecondRecordClient = getPrisma(),
): Promise<void> {
  const existing = await client.accountNote.findMany({
    where: { accountId },
    select: { id: true },
  });
  if (existing.length > 0) {
    const redacted = redactStructured(body);
    const provenance: Partial<AccountNoteData> = {
      lane: "background",
      actors: people.actors,
      source: "activity",
      door: "activity",
      recipients: people.recipients,
    };
    try {
      await client.accountNote.update({
        where: { id: existing[0].id },
        data: { body: redacted, ...provenance },
      });
    } catch {
      // A database without the provenance columns keeps the body current and
      // nothing else — the writer's own tiers, mirrored (never a lost drop).
      await client.accountNote.update({
        where: { id: existing[0].id },
        data: { body: redacted },
      });
    }
    for (const extra of existing.slice(1))
      await client.accountNote.delete({ where: { id: extra.id } });
  } else {
    await createAccountNoteRow(
      {
        accountId,
        kind: "mine",
        body,
        door: "activity",
        structured: true,
        lane: "background",
        source: "activity",
        actors: people.actors,
        recipients: people.recipients,
      },
      client,
    );
  }
}

async function readStageSlice(
  accountId: string,
  db: ActivityDb = getPrisma(),
  ns: string = STAGE_NS,
): Promise<{
  dropSha: string;
  slice: AccountSlice;
} | null> {
  const rows = await db.accountNote.findMany({
    where: { accountId: `${ns}${accountId}` },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  if (rows.length === 0) return null;
  return parseStageBody(rows[0].body);
}

// ── staging ─────────────────────────────────────────────────────────────────

/** The drop a rollup body came from: its head's short sha, "" if none. */
const rollupDropOf = (body: string): string =>
  /^⌗ ACTIVITY · drop (\S+) · /.exec(body ?? "")?.[1] ?? "";

/** Swap a verified drop's pending slices in (D17). Each pending row takes the
 *  stage key before the slice it replaces is removed, so a reader finds one
 *  whole slice at every moment, and whatever is left pending afterwards, a
 *  slice an abandoned upload left behind, goes. */
async function promotePending(
  accountIds: readonly string[],
  db: ActivityDb,
): Promise<void> {
  for (const id of accountIds) {
    const [pending] = await db.accountNote.findMany({
      where: { accountId: `${STAGE_PENDING_NS}${id}` },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { id: true },
    });
    if (!pending) continue;
    const prior = await db.accountNote.findMany({
      where: { accountId: `${STAGE_NS}${id}` },
      select: { id: true },
    });
    await db.accountNote.update({
      where: { id: pending.id },
      data: { accountId: `${STAGE_NS}${id}` },
    });
    for (const p of prior) await db.accountNote.delete({ where: { id: p.id } });
  }
  await db.accountNote.deleteMany({
    where: { accountId: { startsWith: STAGE_PENDING_NS } },
  });
}

export async function stageActivityBatch(
  batch: StageBatch,
  dbIn?: ActivityDb,
): Promise<StageReply> {
  if (!dbIn && !hasDatabaseEnv())
    return { ok: false, reason: "The store isn't reachable." };
  const db = dbIn ?? getPrisma();

  // Fresh drop? Reset the run state, remember the prior drop for change
  // detection and lane drift — the prior is data we already verified, never a
  // re-read of old files.
  let current = await readManifestStore(db);
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

  // Stage each slice. The server re-verifies the client's checksums before
  // anything lands, and redacts money again on the way in, defense in depth
  // over the client's own redaction. A slice lands PENDING: the faces cite
  // the prior drop's slice until the manifest verifies the whole upload
  // (ruled 2026-09-25, D17), so an upload refused or abandoned halfway leaves
  // the prior drop exactly as it was.
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
    await replaceSecondRecordNote(
      `${STAGE_PENDING_NS}${slice.id}`,
      renderStageBody(slice, batch.dropSha),
      slicePeople(slice),
      db,
    );
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
      const staged = await readStageSlice(a.id, db, STAGE_PENDING_NS);
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
        stamped(
          missingBatches.length > 0
            ? `${missingBatches.length} of ${m.totalBatches} batches never arrived. The last drop still stands. Drop the file again.`
            : `${badAccounts.length} account slice${badAccounts.length === 1 ? "" : "s"} failed verification. The last drop still stands. Drop the file again.`,
        ),
      ];
      // Nothing of a refused upload replaces anything (D17); its pending
      // slices go, and the prior drop's slices were never touched.
      await db.accountNote.deleteMany({
        where: { accountId: { startsWith: STAGE_PENDING_NS } },
      });
      await writeManifestStore(store, db);
      return {
        ok: false,
        verified: false,
        missingBatches,
        mismatched: badAccounts,
        reason: store.run.receipt[0],
      };
    }

    // Verified whole: the drop swaps in (D17).
    await promotePending(
      m.accounts.map((a) => a.id),
      db,
    );

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

    // Same drop as the prior one? Nothing changed: zero writes, zero calls.
    if (store.prior && store.prior.dropSha === m.dropSha && !rejudge) {
      store.manifest = m;
      store.run.phase = "done";
      store.run.receipt = [stamped("Nothing changed. This drop is already on file.")];
      await writeManifestStore(store, db);
      return { ok: true, verified: true, unchanged: true };
    }

    // Change detection: rows changed → distill; tally alone → arithmetic.
    // A re-drop of the SAME file refreshes staging but never re-distills what
    // this sha already produced: an account counts as covered when the run's
    // covered map holds it OR its rollup note was written by this very drop.
    // Same rows, same gems, zero calls. The rollup's own head names its drop;
    // reading that is what tells a re-drop from a new drop. The store was
    // reset to the incoming sha at the drop's first batch, so comparing the
    // manifest's sha to the incoming one called every drop a re-drop, and a
    // new drop skipped every account that already held a rollup.
    const holders = await db.accountNote.findMany({
      where: {
        accountId: { startsWith: ACTIVITY_NS },
        NOT: [{ accountId: { startsWith: STAGE_NS } }, { accountId: MANIFEST_ID }],
      },
      select: { accountId: true, body: true },
    });
    const thisDrop = m.dropSha.slice(0, 8);
    const shaCovered = new Set<string>(Object.keys(store.run.covered));
    for (const n of holders)
      if (isRollupNoteId(n.accountId) && rollupDropOf(n.body) === thisDrop)
        shaCovered.add(n.accountId.slice(ACTIVITY_NS.length));
    const sameSha = shaCovered.size > 0;
    // A hold is not coverage of the gems: with the distiller back, held
    // accounts re-queue on the same sha.
    if (rejudge) for (const id of heldPrior) shaCovered.delete(id);
    const priorById = new Map((store.prior?.accounts ?? []).map((a) => [a.id, a]));
    const { distillQueue, intentQueue } = dropQueues(m.accounts, priorById, shaCovered);
    if (rejudge) {
      const inDrop = new Set(m.accounts.map((a) => a.id));
      for (const id of heldPrior)
        if (inDrop.has(id) && !distillQueue.includes(id)) distillQueue.push(id);
    }

    // What came in, first line, in counts. A drop that reads nothing looks
    // identical to a drop that reads everything until this number is on the
    // page: the 2026-08-28 blank read reported full coverage and the operator
    // had no way to see that zero rows carried email text. Every line below
    // is a flat sentence over arithmetic (C4; the writing canon and the
    // plain-speech law).
    const plural = (n: number, one: string, many = `${one}s`) =>
      `${n} ${n === 1 ? one : many}`;
    const receipt: string[] = [
      `The drop landed with ${plural(m.rowCount, "row")} across ${plural(m.accounts.length, "account")}. ${m.textRows} of them carry email text.${m.dupes > 0 ? ` ${plural(m.dupes, "row is an identical repeat", "rows are identical repeats")}, kept because one send to several people logs once per person.` : ""}`,
    ];
    if (m.textRows === 0 && m.rowCount > 0)
      receipt.push(
        "No row carried email text, so this drop read nothing. Check the export's Full Comments column and drop it again.",
      );
    if (m.headerDiff.missing.length > 0)
      receipt.push(
        `This drop is missing ${m.headerDiff.missing.join(", ")}. What reads ${m.headerDiff.missing.length === 1 ? "that column" : "those columns"} is blank this drop.`,
      );
    if (m.headerDiff.extra.length > 0)
      receipt.push(`New columns ignored: ${m.headerDiff.extra.join(", ")}.`);
    if (m.unmatched.length > 0) {
      const total = m.unmatched.reduce((n, u) => n + u.rows, 0);
      receipt.push(
        `${plural(total, "row")} matched no book account: ${m.unmatched
          .slice(0, 5)
          .map((u) => `${u.name} with ${u.rows}`)
          .join(", ")}${m.unmatched.length > 5 ? ", and more" : ""}.`,
      );
    }
    if (m.collisions.length > 0)
      receipt.push(
        `Each of these names is both a contact and a colleague, and neither side is settled: ${m.collisions.join(", ")}.`,
      );

    // ⚔ lane drift — a >15-point share swing against the prior drop is named,
    // never silently absorbed.
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
            `The ${lane} lane moved from ${Math.round(was)}% to ${Math.round(is)}% of the rows. Check the report's filters before trusting this drop.`,
          );
      }
    }
    if (sameSha)
      receipt.push(
        `This file was dropped before. Staging is refreshed, and ${plural(shaCovered.size, "account")} already covered keep${shaCovered.size === 1 ? "s" : ""} what ${shaCovered.size === 1 ? "it" : "they"} had.`,
      );
    receipt.push(
      `${plural(distillQueue.length, "account")} changed and wait${distillQueue.length === 1 ? "s" : ""} to be distilled. ${plural(intentQueue.length, "account")} need${intentQueue.length === 1 ? "s" : ""} only ${intentQueue.length === 1 ? "its tally" : "their tallies"} refreshed.`,
    );

    store.manifest = m;
    store.run = {
      ...emptyRunState(),
      phase: "ready",
      distillQueue,
      intentQueue,
      receipt: receipt.map(stamped),
      // A same-sha re-drop keeps its coverage: the work already happened. A
      // new drop's run state was reset at its first batch, so this is empty.
      covered: store.run.covered,
      batchesSeen: store.run.batchesSeen,
      startedAt: "",
      finishedAt: "",
    };
    await writeManifestStore(store, db);
    await pulse(
      {
        active: true,
        kind: "activity",
        startedAt: Date.now(),
        total: distillQueue.length + intentQueue.length,
        done: 0,
        failed: 0,
        now: "The activity report landed and verified complete.",
        unit: `the second record, 0 of ${distillQueue.length + intentQueue.length} accounts`,
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

  await writeManifestStore(store, db);
  return { ok: true };
}

// ── the gems write and the acted ledger (D18) ───────────────────────────────
// The operator's acted stamp is the first record (ruled 2026-09-25, D18). It
// rides in the gems body, the second record's span, so every write that
// replaces or clears a gems note reads the stamps out first: a fresh gem with
// the same key takes its stamp back, and a stamp whose gem this drop did not
// find waits in the acted ledger (ACTED_NS), outside every span the take-back
// clears, for a later drop that finds it. A stamp that re-attaches leaves the
// ledger, so the operator's own ↺ on the gem is never undone by a later drop.

async function readActedLedger(accountId: string, db: ActivityDb): Promise<ActedStamp[]> {
  const [row] = await db.accountNote.findMany({
    where: { accountId: `${ACTED_NS}${accountId}` },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  return parseActedBody(row?.body ?? "");
}

/** Replace-forward write of an account's acted ledger; an empty ledger
 *  leaves no row. A first-record row with a door, never a bare one (P3): the
 *  stamps are the operator's own hand. */
async function writeActedLedger(
  accountId: string,
  stamps: readonly ActedStamp[],
  db: ActivityDb,
): Promise<void> {
  const key = `${ACTED_NS}${accountId}`;
  const rows = await db.accountNote.findMany({
    where: { accountId: key },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (stamps.length === 0) {
    if (rows.length > 0) await db.accountNote.deleteMany({ where: { accountId: key } });
    return;
  }
  const body = renderActedBody(stamps);
  if (rows.length > 0) {
    await db.accountNote.update({ where: { id: rows[0].id }, data: { body } });
    for (const extra of rows.slice(1))
      await db.accountNote.delete({ where: { id: extra.id } });
    return;
  }
  await createAccountNoteRow(
    { accountId: key, kind: "mine", body, door: "hand", lane: "mine", source: "acted" },
    db,
  );
}

/** Write an account's gems, or clear them when none survived, carrying the
 *  operator's acted stamps across (D18). */
export async function fileGems(
  accountId: string,
  gems: Gem[],
  people: SecondRecordPeople = NO_PEOPLE,
  db: ActivityDb = getPrisma(),
): Promise<void> {
  const key = `${GEMS_NS}${accountId}`;
  const [current] = await db.accountNote.findMany({
    where: { accountId: key },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  // The body being replaced speaks first; the ledger after it.
  const carried = mergeActedStamps(
    actedStampsOf(parseGemsBody(current?.body ?? "")),
    await readActedLedger(accountId, db),
  );
  // The body keeps three gems; only those three can take a stamp back.
  const { gems: kept, left } = reattachActed(gems.slice(0, 3), carried);
  if (kept.length > 0)
    await replaceSecondRecordNote(key, renderGemsBody(kept), people, db);
  else await db.accountNote.deleteMany({ where: { accountId: key } });
  await writeActedLedger(accountId, left, db);
}

/** The note ids the operator ✕-parked: hidden is hidden (X1). A failed read
 *  hides nothing rather than stop the run. */
async function hiddenNoteIdsIn(db: ActivityDb): Promise<Set<string>> {
  try {
    const markers = await db.accountDisposition.findMany({
      where: { accountId: { startsWith: HIDE_NOTE_PREFIX } },
      select: { accountId: true, status: true },
    });
    return hiddenIds(markers);
  } catch {
    return new Set();
  }
}

// ── the first-record context pack ───────────────────────────────────────────

/** One stored row as the wide loader shapes it (loadAccountNotes,
 *  src/lib/today/overlay.ts): the account's canonical id, the kind, and the
 *  actors and lane inferred for a row filed before the columns (D23). */
function recordNoteOf(
  r: {
    id: string;
    accountId: string;
    partner?: string | null;
    kind: string;
    body: string;
    createdAt: Date;
    lane?: string | null;
    actors?: string | null;
    source?: string | null;
    recipients?: string | null;
  },
  accountId: string,
): RecordNote {
  const kind =
    r.kind === "partner" ? "partner" : r.kind === "account" ? "account" : "mine";
  const actors = r.actors || inferActors(r.body);
  return {
    id: r.id,
    accountId,
    partner: r.partner ?? "",
    kind,
    body: r.body,
    lane:
      r.lane === "mine" || r.lane === "background"
        ? r.lane
        : inferLane(kind, r.body, actors),
    actors,
    source: r.source ?? "",
    recipients: r.recipients ?? "",
    createdAt: r.createdAt.toISOString(),
  };
}

/** The declared roster the account read takes (E9): the CSM column and
 *  everyone the first record shows on three or more accounts, counted over
 *  the whole book by homeSideFrom, as every page counts it. A failed read
 *  falls back to the CSM column rather than stop the run. */
async function declaredRosterIn(db: ActivityDb): Promise<string[]> {
  try {
    // Namespaced stores are not accounts (homeSideFrom skips them), and the
    // staged slices among them are large, so they never load.
    const rows = await db.accountNote.findMany({
      where: { NOT: { accountId: { contains: ":" } } },
      select: { accountId: true, actors: true, body: true },
    });
    const byAccount = new Map<string, { actors: string }[]>();
    for (const r of rows) {
      const id = canonicalAccountId(r.accountId);
      const list = byAccount.get(id) ?? byAccount.set(id, []).get(id)!;
      list.push({ actors: r.actors || inferActors(r.body) });
    }
    return declaredHomeSide(homeSideFrom(byAccount));
  } catch {
    return declaredHomeSide([]);
  }
}

/** The touch log as the account read takes it. A failed read is no log. */
async function touchLogIn(db: ActivityDb): Promise<(TouchRow & { status?: string })[]> {
  try {
    return (await db.touch.findMany()).map((t) => ({
      subjectKey: t.subjectKey,
      label: t.label,
      contactedAt: new Date(t.contactedAt).toISOString(),
      message: t.message ?? "",
      status: t.status,
      // The log column as the loader keeps it: entries with a body.
      log: (Array.isArray(t.log) ? t.log : [])
        .map((e) => {
          const o = (e ?? {}) as Record<string, unknown>;
          return {
            at: typeof o.at === "string" ? o.at : "",
            body: typeof o.body === "string" ? o.body : "",
          };
        })
        .filter((e) => e.body.trim()),
    }));
  } catch {
    return [];
  }
}

export async function contextPackFor(
  accountId: string,
  name: string,
  db: ActivityDb = getPrisma(),
  /** The declared roster, read once per pass by the run; read here when a
   *  caller hands none. */
  homeSide?: readonly string[],
): Promise<ContextPack> {
  const prisma = db;
  const lines: string[] = [
    "the operator is Antaeus Coe — their own logged motion is the first record, never a door to walk through",
  ];
  try {
    // A ✕-parked row is hidden from the distiller too (X1): it leaves the
    // pack's last outbound, its last inbound and its record lines.
    const hidden = await hiddenNoteIdsIn(prisma);
    // The operator's last outbound and their last inbound are the account
    // read's own (A2.4; the Ted doctrine: a derived fact reads the widest
    // live source, and its two stores merge by latest, C3): every row under
    // every id the account folds into, the touch log merged by latest, the
    // declared roster. The pack used to take the newest 80 rows under the raw
    // id alone, with no fold and no touch log. The open commitments below are
    // the pack's own read, so the read takes no todos.
    const id = canonicalAccountId(accountId);
    const notes = (
      await prisma.accountNote.findMany({
        where: { accountId: { in: accountIdsOf(accountId) } },
        orderBy: { createdAt: "desc" },
      })
    ).map((n) => recordNoteOf(n, id));
    const touches = await touchLogIn(prisma);
    const read = readFromStores(
      {
        notesById: new Map([[id, notes]]),
        touches,
        todos: [],
        dispositions: new Map([...hidden].map((h) => [hideNoteKey(h), true])),
        homeSide: homeSide ?? (await declaredRosterIn(prisma)),
      },
      { id, name },
      { now: new Date() },
    );

    const out = read.lastOutbound;
    if (out) {
      // The record's send says its own head; a logged touch, its message.
      const row = out.noteId ? notes.find((n) => n.id === out.noteId) : undefined;
      const logged = (t: TouchRow) =>
        t.subjectKey === `outreach:${id}` || t.label.toLowerCase() === name.toLowerCase();
      const head = row
        ? (row.body.split("\n")[0] ?? "")
        : (touches.find((t) => logged(t) && t.contactedAt === out.at && t.message)
            ?.message ?? "");
      lines.push(
        `the operator's last outbound: ${chiDay(new Date(out.at))}${out.to ? ` to ${out.to}` : ""} — ${redactMoney(head).slice(0, 90)}`,
      );
    }
    if (read.lastInbound)
      lines.push(
        `their last inbound to the operator: ${chiDay(new Date(read.lastInbound.at))}`,
      );
    if (!out && !read.lastInbound)
      lines.push("no direct conversation between the operator and this account yet");

    for (const n of notes.filter((x) => !hidden.has(x.id)).slice(0, 5)) {
      const head = redactMoney((n.body.split("\n")[0] ?? "").replace(/\s+/g, " ")).slice(
        0,
        100,
      );
      if (head) lines.push(`record ${chiDay(new Date(n.createdAt))}: ${head}`);
    }

    const todos = await prisma.todo.findMany({
      where: { accountId, done: false },
      orderBy: { createdAt: "desc" },
      take: 4,
    });
    for (const t of todos) {
      // A loop on their side (D10) is not the operator's commitment.
      if (theirLoopOf(t.body)) continue;
      lines.push(
        `open commitment: ${redactMoney(t.body.replace(/\s+/g, " ")).slice(0, 90)}`,
      );
    }

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
  db?: ActivityDb;
}): Promise<RunPassResult> {
  if (!opts?.db && !hasDatabaseEnv())
    return { ok: false, done: false, remaining: 0, receipt: [], reason: "No store." };
  const db = opts?.db ?? getPrisma();
  const current = await readManifestStore(db);
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

  // ⚔ 3 · staleness & acted — sweep at the head of every pass.
  await actedSweep(db);

  // The declared roster every context pack's account read takes (E9), read
  // once per pass and only when a distiller runs.
  let roster: Promise<string[]> | null = null;
  const rosterOnce = () => (roster ??= declaredRosterIn(db));

  // Tally-only accounts: pure arithmetic, no model, cheap enough to finish.
  while (run.intentQueue.length > 0 && Date.now() < deadline) {
    const id = run.intentQueue.shift()!;
    const staged = await readStageSlice(id, db);
    if (!staged) continue;
    await replaceSecondRecordNote(
      `${INTENT_NS}${id}`,
      renderIntentBody({
        dropSha: m.dropSha,
        windows: intentWindows(staged.slice.tally, today),
        receipts: staged.slice.tally.receipts,
      }),
      slicePeople(staged.slice),
      db,
    );
    run.covered[id] = run.covered[id] || "verdict";
  }
  await writeManifestStore(store, db);

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
    const staged = await readStageSlice(id, db);
    if (!staged) {
      run.covered[id] = "verdict";
      return [`${nameById.get(id) ?? id}: no staged slice, so it was skipped.`];
    }
    const slice = staged.slice;
    const name = slice.name || nameById.get(id) || id;
    const accountPeople = accountPeopleFor(slice);
    // The provenance columns every store written for this account carries.
    const people = slicePeople(slice);

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
      await replaceSecondRecordNote(
        `${SUPPORT_NS}${id}`,
        renderSupportBody({ dropSha: m.dropSha, ...support }),
        people,
        db,
      );
    await replaceSecondRecordNote(
      `${INTENT_NS}${id}`,
      renderIntentBody({
        dropSha: m.dropSha,
        windows: intentWindows(slice.tally, today),
        receipts: slice.tally.receipts,
      }),
      people,
      db,
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
      const pack = await contextPackFor(id, name, db, await rosterOnce());
      const rowsByKey = new Map(slice.rows.map((r) => [r.k, r]));
      const card = await db.dashCard.findFirst({ where: { name } }).catch(() => null);
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
      // named in the prompt — the one retry an account gets.
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
      await fileGems(id, gems, people, db);
      rollup.verdict = "";
      run.covered[id] = "gems";
      log.push(`${name}: ${gems.length} gem${gems.length === 1 ? "" : "s"} confirmed.`);
    } else if (distillerCould) {
      // A changed account whose gems all died keeps no stale gems note; its
      // acted stamps move to the ledger (D18).
      await fileGems(id, [], people, db);
      rollup.verdict = verdictLine(rollup);
      run.covered[id] = "verdict";
      log.push(`${name}: ${rollup.verdict}.`);
    } else {
      // The distiller never ran — a dead key is not a verdict on the
      // standing gems. Hold whatever the last funded pass filed; the
      // arithmetic stores above still moved. "held" is coverage of the
      // arithmetic only: a re-drop of the SAME file with the distiller
      // back re-queues exactly these accounts.
      const standing = await db.accountNote
        .findFirst({ where: { accountId: `${GEMS_NS}${id}` } })
        .catch(() => null);
      rollup.verdict = verdictLine(rollup);
      run.covered[id] = "held";
      log.push(
        standing
          ? `${name}: ${rollup.verdict}. The distiller is down, so the gems from the last distilled pass stay.`
          : `${name}: ${rollup.verdict}.`,
      );
    }
    await replaceSecondRecordNote(
      `${ACTIVITY_NS}${id}`,
      renderRollupBody(rollup),
      people,
      db,
    );
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
      unit: `the second record, ${Object.keys(run.covered).length} of ${totalWork} accounts`,
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
          text: `${nameById.get(batch[i]) ?? batch[i]} failed this pass and waits for a retry. The error: ${errText}`,
          bad: true,
        });
        // A DEAD key (auth or credits) is not a failure to loop on or to
        // stall the drop over: the latch flips and the re-queued accounts
        // take the held path next pass, the drop finishes on its counts, and
        // the receipt says what held (founder-decreed 2026-08-22).
        noteClaudeFailure(s.reason);
        if (claudeDead()) {
          // Say WHAT the API said. "The key is dead" names a symptom with
          // three different causes — an invalid key, a key without permission,
          // and a workspace with no credit read identically — and the operator
          // burned an evening guessing between them while this text sat right
          // here and was discarded (2026-09-01).
          if (!run.receipt.some((r) => r.includes(DEAD_KEY_MARK)))
            say(
              run,
              `${DEAD_KEY_MARK} The API said: ${errText}. ${configLine()} The rest of this drop runs on its counts alone, and the gems from the last distilled pass stay.`,
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
          say(
            run,
            `Every distillation failed. The error: ${errText}. Fix it and run again.`,
          );
          await writeManifestStore(store, db);
          await pulse(
            { active: false, now: `Distillation is paused. ${errText.slice(0, 120)}` },
            [{ text: `Distillation is paused. ${errText.slice(0, 120)}`, bad: true }],
          );
          return {
            ok: false,
            done: false,
            remaining: run.distillQueue.length,
            receipt: run.receipt,
            reason: `Every distillation failed. The error: ${errText}`,
          };
        }
      }
    }
    await writeManifestStore(store, db);
    await pulse({}, logs);
  }

  const remaining = run.distillQueue.length + run.intentQueue.length;
  if (remaining > 0) {
    await writeManifestStore(store, db);
    return { ok: true, done: false, remaining, receipt: run.receipt };
  }

  // ⚔ 1 · the coverage invariant — 100% or the run says failed.
  // Unchanged accounts keep their prior coverage; the rollup note is the
  // evidence it exists.
  const priorRollups = new Set(
    (
      await db.accountNote.findMany({
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
      await db.accountNote.findMany({
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
  // Every closing line is a flat sentence over the run's own counts (C4).
  const n = (k: number, one: string, many = `${one}s`) => `${k} ${k === 1 ? one : many}`;
  say(
    run,
    `${n(Object.keys(run.covered).length, "account")} distilled. ${gemsN} ${gemsN === 1 ? "holds confirmed gems" : "hold confirmed gems"}, ${verdictsN} ${verdictsN === 1 ? "holds" : "hold"} a verdict, and ${n(run.died, "candidate")} died in refutation.`,
  );
  if (heldN > 0)
    say(
      run,
      heldEmpty === 0
        ? `The distiller was down for ${n(heldN, "account")}, so the gems from the last distilled pass stay. Drop the file again once the key is back to judge ${heldN === 1 ? "it" : "them"}.`
        : `The distiller was down for ${n(heldN, "account")}, and ${heldEmpty} of them hold no gem because no earlier pass distilled them. Fix the key and drop the file again. Nothing was judged this run.`,
    );
  if (mortalityFlag(run.born, run.died))
    say(
      run,
      `${run.died} of ${n(run.born, "gem candidate")} died. Read the receipt before trusting this drop's gems.`,
    );
  if (uncovered.length > 0) {
    run.phase = "failed-coverage";
    say(
      run,
      `COVERAGE FAILED. ${n(uncovered.length, "active account holds", "active accounts hold")} neither a gem nor a verdict: ${uncovered.slice(0, 8).join(", ")}${uncovered.length > 8 ? ", and more" : ""}.`,
    );
  } else {
    run.phase = "done";
    // The claim is arithmetic, never a slogan: it names what the store holds
    // and how many. Full coverage over an empty store is the exact line that
    // told the founder a dead-key run had succeeded (2026-08-31).
    const active = m.accounts.filter((a) => a.humanRows > 0).length;
    say(
      run,
      heldN > 0
        ? `Coverage is 100%, with ${n(heldN, "account")} held. ${gemsN + verdictsN} of ${gemsN + verdictsN + heldN} were judged this run, and the held ones keep their old gems.`
        : `Coverage is 100%. ${active === 1 ? "The 1 active account holds" : `All ${active} active accounts hold`} a gem or a verdict.`,
    );
  }
  await writeManifestStore(store, db);
  await pulse(
    {
      active: false,
      kind: "activity",
      now:
        run.phase !== "done"
          ? "The run finished below full coverage. Open the receipt."
          : heldN > 0
            ? `The second record is distilled. ${gemsN + verdictsN} judged and ${heldN} held on their old gems.`
            : "The second record is distilled at full coverage.",
      unit: `the second record, ${Object.keys(run.covered).length} of ${totalWork} accounts`,
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

// ── ⚔ 3 · acted detection — the first record kills the nag ──────────────────
// The record has moved on a gem when a first-record row after the gem's day
// carries the gem's person as an actor or recipient (ruled 2026-09-25, D20).
// Every row, not only the operator's sends, each read at its own moment from
// its own columns (pass 8 call 5): the sweep once looked each send's columns
// up by the stored stamp while the send came back at its head's clock, so a
// clocked Outlook send never matched and a person who was only a recipient
// never stamped. The rows are the account's under every id that folds into
// it (E17), and a ✕-parked row is hidden (X1).
//
// The run sweeps every account at the head of each export pass. A filing
// sweeps one: "the acted sweep can re-stamp from the record any time it
// truly speaks" (CLAUDE.md, The Act Lane), so when the Chute or a Drop files
// rows on an account, its gems are checked against them then, not at the
// next weekly drop. `scope.accountId` reads that account's gems under every
// id it folds into, and nothing else.

export async function actedSweep(
  db: ActivityDb = getPrisma(),
  scope: { accountId?: string } = {},
): Promise<number> {
  let stamped = 0;
  try {
    const one = (scope.accountId ?? "").trim();
    const gemNotes = await db.accountNote.findMany({
      where: one
        ? { accountId: { in: accountIdsOf(`${GEMS_NS}${one}`) } }
        : { accountId: { startsWith: GEMS_NS } },
      take: 400,
    });
    if (gemNotes.length === 0) return 0;
    const hidden = await hiddenNoteIdsIn(db);
    for (const note of gemNotes) {
      const rawId = note.accountId.slice(GEMS_NS.length);
      const gems = parseGemsBody(note.body);
      const open = gems.filter((g) => !g.actedDay);
      if (open.length === 0) continue;
      const since = open.map((g) => g.createdDay).sort()[0] ?? "";
      const from = Date.parse(`${since}T00:00:00Z`);
      const notes = await db.accountNote.findMany({
        where: {
          accountId: { in: accountIdsOf(rawId) },
          ...(Number.isNaN(from) ? {} : { createdAt: { gte: new Date(from) } }),
        },
        orderBy: { createdAt: "desc" },
      });
      const rows: SweepRow[] = notes.map((n) => {
        const d = docOf(
          {
            id: n.id,
            body: n.body,
            createdAt: n.createdAt.toISOString(),
            kind: n.kind,
            actors: n.actors ?? "",
            source: n.source ?? "",
            recipients: n.recipients ?? "",
          },
          csms,
          hidden,
        );
        return {
          day: chiDay(n.createdAt),
          actors: d.actors,
          recipients: d.recipients,
          hidden: d.hidden,
        };
      });
      let changed = false;
      for (const g of gems) {
        if (g.actedDay) continue;
        const day = actedDayFor(g, rows);
        if (!day) continue;
        g.actedDay = day;
        changed = true;
        stamped += 1;
      }
      if (changed)
        await db.accountNote.update({
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
// A drop is reversible. Not to the drop before it: the writer overwrites a
// note body in place and the manifest keeps only the prior drop's checksums,
// so there is no earlier content to restore and the button must never pretend
// otherwise. What it can do is complete: clear every store the second record
// owns, and the app falls back to what it showed before any export existed.
//
// The reach is exactly the namespaces the run writes and nothing else. The
// record's own entries, the HomeRoom's moves, the Sendbook, the Scratchpaper,
// act drafts, seats and research notes are untouched; a bad drop was never
// able to reach them, and neither is the undo. The operator's acted stamps
// are the first record too (D18): they are read out of the gems before the
// gems go, and wait in the acted ledger for the drop that finds them again.

export type TakeBackResult = {
  ok: boolean;
  removed: number;
  lines: string[];
  reason?: string;
};

export async function takeBackSecondRecord(dbIn?: ActivityDb): Promise<TakeBackResult> {
  if (!dbIn && !hasDatabaseEnv())
    return { ok: false, removed: 0, lines: [], reason: "No database in this session." };
  const prisma = dbIn ?? getPrisma();
  const current = await readManifestStore(prisma);
  const was = current?.store.manifest;

  // The stamps first, so no delete below can take one (D18).
  const stampsById = new Map<string, ActedStamp[]>();
  for (const n of await prisma.accountNote.findMany({
    where: { accountId: { startsWith: GEMS_NS } },
    orderBy: { createdAt: "desc" },
  })) {
    const id = n.accountId.slice(GEMS_NS.length);
    const stamps = actedStampsOf(parseGemsBody(n.body));
    if (stamps.length > 0)
      stampsById.set(id, mergeActedStamps(stampsById.get(id) ?? [], stamps));
  }
  let kept = 0;
  for (const [id, stamps] of stampsById) {
    await writeActedLedger(
      id,
      mergeActedStamps(stamps, await readActedLedger(id, prisma)),
      prisma,
    );
    kept += stamps.length;
  }

  const lines: string[] = [];
  let removed = 0;
  for (const s of SECOND_RECORD_SPANS) {
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
      ? `Took back the drop of ${was.fileName || "the activity export"} from ${was.dropDay}: ${was.rowCount} rows across ${was.accounts.length} accounts.`
      : "Took back the second record.",
  );
  if (kept > 0)
    lines.push(
      `Kept ${kept} acted stamp${kept === 1 ? "" : "s"}. Each comes back when a later drop finds its gem.`,
    );
  // Said plainly, because a take-back that quietly loses the drop before it
  // would be the same kind of silence this whole fix exists to end.
  lines.push(
    "The second record is empty. Earlier drops were not kept, so every surface reads as it did before any export was filed.",
  );
  await pulse(
    {
      active: false,
      kind: "activity",
      now: "The second record was taken back.",
      unit: "the second record, empty",
      lanes: [],
    },
    [{ text: lines[0], bad: false }],
  );
  return { ok: true, removed, lines };
}
