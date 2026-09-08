"use server";

// The Pipeline's fresh pull. The drawer calls this when it opens, so the report
// on screen — and the Word file the button builds from it — is the record as it
// stands right now, not as it stood when the page was rendered.
//
// The fault it answers: leave the room open, drop a transcript down the Chute,
// press the Word button, and the file carried the record from before the drop
// (founder-caught 2026-09-08). Every store is re-read here; the gathering
// itself is the same collectPipelineAccounts() the page uses, so the two can
// never drift.

import { csms, peos } from "@/lib/book";
import { getAppAccess } from "@/lib/auth";
import { loadDashboard } from "@/lib/dashboard/data";
import { DROP_STALE_DAYS, fetchSecondRecords } from "@/lib/activity/read";
import { loadAccountNotes, loadDispositions, loadTodos } from "@/lib/today/overlay";
import { daysBetween } from "@/lib/room/engine";
import { buildPipelineReport, homeSideFrom, rankPipeline } from "@/lib/pipeline/build";
import type { PipelineRecord } from "@/lib/pipeline/build";
import { collectPipelineAccounts, pipelineDayLabel } from "@/lib/pipeline/collect";
import {
  PIPELINE_EDIT_NS,
  editsFrom,
  renderEditsBody,
  type SavedEdits,
} from "@/lib/pipeline/edits";
import { getPrisma } from "@/lib/db";
import { createAccountNoteRow } from "@/lib/notes/write";
import { redactMoney } from "@/lib/intel/lexicon";

export type FreshPipeline = {
  rows: PipelineRecord[];
  dayLabel: string;
  staleNote: string;
  /** Chicago wall-clock of this read, for the drawer's own line. */
  readAt: string;
  /** Every line the operator has changed or struck, across the book. His
   *  corrections sit on top of what the app derived and outlive the session. */
  edits: SavedEdits;
};

export async function freshPipeline(): Promise<FreshPipeline | null> {
  // The report names people and accounts; it is never served to a reader the
  // room itself would turn away.
  const access = await getAppAccess();
  if (access.status !== "active") return null;

  const data = await loadDashboard();
  if (data.status !== "active") return null;

  const [notesById, todos, dispositions] = await Promise.all([
    loadAccountNotes(),
    loadTodos(),
    loadDispositions(),
  ]);
  const secondById = await fetchSecondRecords().catch(
    () => new Map() as Awaited<ReturnType<typeof fetchSecondRecords>>,
  );
  const now = new Date();

  const accounts = collectPipelineAccounts({
    cards: data.cards,
    labels: data.labels,
    notesById,
    todos,
    dispositions,
    secondById,
    peos,
    now,
  });
  const rows = rankPipeline(
    buildPipelineReport({
      accounts,
      // The whole book, not the active slice — a colleague who works across the
      // book but appears on only two active accounts is still ours.
      homeSide: homeSideFrom(notesById),
      csms,
      me: "Antaeus Coe",
      now,
    }),
  );

  const drop = [...secondById.values()]
    .map((s) => s.rollup?.dropDay ?? "")
    .filter(Boolean)
    .sort()
    .pop();
  const age = drop
    ? (daysBetween(`${drop}T12:00:00Z`, now) ?? Number.MAX_SAFE_INTEGER)
    : Number.MAX_SAFE_INTEGER;
  const staleNote = !drop
    ? "no second record"
    : age > DROP_STALE_DAYS
      ? `second record ${drop.slice(5)} — stale`
      : `second record ${drop.slice(5)}`;

  // His saved corrections, read back with the record they belong to.
  let edits: SavedEdits = {};
  for (const a of accounts)
    edits = { ...edits, ...editsFrom(a.id, notesById.get(`${PIPELINE_EDIT_NS}${a.id}`)) };

  return {
    rows,
    edits,
    dayLabel: pipelineDayLabel(now),
    staleNote,
    readAt: now.toLocaleTimeString("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

/** Keep one account's edits. The whole overlay for that record is written at
 *  once — one row per account, newest wins — so a strike is stored as plainly
 *  as a rewrite and nothing is lost between reloads. Passing an empty object
 *  clears them, which is what "restore everything" means. */
export async function savePipelineEdits(args: {
  accountId: string;
  edits: SavedEdits;
}): Promise<{ ok: boolean }> {
  const access = await getAppAccess();
  if (access.status !== "active" || !access.canWrite) return { ok: false };
  const accountId = (args.accountId ?? "").slice(0, 40);
  if (!accountId) return { ok: false };

  const prisma = getPrisma();
  try {
    await prisma.accountNote.deleteMany({
      where: { accountId: `${PIPELINE_EDIT_NS}${accountId}` },
    });
    const body = redactMoney(renderEditsBody(args.edits ?? {}));
    // Nothing left to keep — the row goes rather than sitting empty.
    if (Object.keys(args.edits ?? {}).length)
      await createAccountNoteRow({
        accountId: `${PIPELINE_EDIT_NS}${accountId}`,
        kind: "mine",
        body,
        lane: "mine",
        source: "pipeline",
      });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
