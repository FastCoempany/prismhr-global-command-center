"use server";

// Operating Room actions. Every one is BOUND: the account id is validated
// against the book before anything writes, so a row can only ever file to
// itself. These return values (the room updates in place) instead of
// redirecting.
//
// Nothing here revalidates a path. There is no revalidation list (ruled
// 2026-09-25, D15): every page is force-dynamic and derives on request, and
// the client that made a write asks the router for the fresh read itself
// (router.refresh() in the component that called the action), so a surface
// that archives leaves no list to be struck from (P1). The private refresh()
// that named three pages retired with slice 9 of the Chute brains refactor
// plan.

import { claudeClient, claudeAvailable } from "@/lib/claude/health";
import { MODEL_TRANSCRIBE } from "@/lib/intranet/doctrine";
import { getAppAccess } from "@/lib/auth";
import { hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import { grabsFrom } from "@/lib/ingest/salesnav-email";
import { GRAB_PARALLEL, runLimited } from "@/lib/ingest/grab";
import { pasteKeyOf, undoFiling, wroteOfFiling } from "@/lib/ingest/filing";
import { type FilingWrote } from "@/lib/ingest/wrote";
import { fileCompletion, undoCompletions } from "@/lib/ingest/fanout";
import { TEXT_FLOOR, TRANSCRIBE_BYTES, type Window } from "@/lib/ingest/windows";
import { transcriberPrompt } from "@/lib/room/paste";
import { digestForCardName } from "@/lib/intel/digest";
import { aiCleanAvailable } from "@/lib/intel/ai-clean";
import {
  PLAYBOOK_LESSONS,
  PLAYBOOK_MARKET,
  parsePlaybookBody,
} from "@/lib/playbook/store";
import { fileGaps, gapDismissKey, gapNs, parseGapBody } from "@/lib/room/gaps";
import type { Door } from "@/lib/ingest/doors";
import { MINE_RE } from "@/lib/intel/provenance";
import {
  diffFindings,
  parseResearchBody,
  researchAvailable,
  researchBody,
  researchNs,
  runResearch,
} from "@/lib/intel/deep-research";
import { mintAsks } from "@/lib/intel/ask-mint";
import { SCENARIOS } from "@/lib/intel/scenarios";
import { homeSideFrom } from "@/lib/pipeline/build";
import { hideNoteKey } from "@/lib/record/hide";
import { declaredHomeSide, readFromStores } from "@/lib/record/stores";
import {
  loadAccountNotes,
  loadDispositions,
  loadTodos,
  loadTouches,
} from "@/lib/today/overlay";
import { redactMoney } from "@/lib/intel/lexicon";
import {
  bindAccountId,
  cleanLogBody,
  moveDoneKey,
  MOVE_DONE_STATUS,
} from "@/lib/room/bind";
import { createAccountNoteRow, createTodoRow } from "@/lib/notes/write";
import { SEAT_NS } from "@/lib/act/lane";
import { editedSeatBody, editedSheetBody } from "@/lib/room/sheet-view";
import { lowSignalKey, lowSignalKeys } from "@/lib/room/low-signal";
import { groundworkDoneKey } from "@/lib/groundwork/file";
import { applyStepComplete } from "@/lib/dashboard/complete";
import { mirrorNoteToSheet } from "@/lib/today/mirror";
import { OUTCOME_LABEL, writeOutcome, type OutcomeStatus } from "@/lib/dashboard/outcome";
import type { DashNodeKey } from "@/lib/dashboard/stages";
import { fileGrabCapture, pasteCapture, type PasteResult } from "@/lib/room/paste-core";
import { dropEmailTexts } from "@/lib/notes/email-text";

async function requireWrite() {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

// Type a line, press Enter → one note on THIS account, everywhere. Returns
// the ids the receipt needs: the note row and its sheet mirror, so ↩ undo
// and "make it an action →" can act on exactly what this keystroke created.
async function roomLog(
  accountId: string,
  text: string,
): Promise<{ ok: boolean; reason?: string; noteId?: string; todoId?: string }> {
  const acct = bindAccountId(accountId, peos);
  const body = cleanLogBody(text);
  if (!acct) return { ok: false, reason: "That row isn't bound to a known account." };
  if (!body) return { ok: false, reason: "Nothing to file." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    const n = await createAccountNoteRow({
      accountId: acct.id,
      kind: "account",
      body: `✎ ${body}`,
      door: "hand",
      lane: "mine",
      source: "room",
    });
    const todoId = await mirrorNoteToSheet(
      `✎ ${body}`,
      { accountNoteIds: [n.id], partnerNoteIds: [] },
      acct.name,
    );
    return { ok: true, noteId: n.id, todoId: todoId ?? undefined };
  } catch {
    return { ok: false, reason: "The note didn't save. Try again." };
  }
}

// The Chute's door for a grab (seam S-25): a grab names no one account, so
// the Chute files it here without routing it whole first, and the split
// routes every row. The Drop's paste reaches the same split through
// roomPaste.
export async function roomGrab(
  raw: string,
  opts: { door: Door; windows?: Window[] },
): Promise<PasteResult> {
  const rawText = typeof raw === "string" ? raw.trim() : "";
  if (!grabsFrom(rawText).length)
    return { ok: false, filed: 0, how: "", reason: "That isn't a Sales Nav grab." };
  if (!(await requireWrite()))
    return { ok: false, filed: 0, how: "", reason: "Read-only session." };
  return fileGrabCapture(rawText, opts.door, opts.windows ?? []);
}

// ⚡ paste → the read, behind the session check (src/lib/room/paste-core.ts
// holds the pipeline itself).
export async function roomPaste(
  accountId: string,
  raw: string,
  opts: { force?: boolean; door: Door; windows?: Window[] },
): Promise<PasteResult> {
  return pasteCapture(accountId, raw, opts, requireWrite);
}

// "I worked this one." The stage close is the richer signal and stays the
// primary path, but it only exists when something is staged — a row reading
// "Chase Bill. Quiet 9 days." asked for a move and gave the operator no way to
// answer. This is that way. The mark is the day's, not the deal's: it clears
// overnight, so tomorrow's read stands on its own.
export async function roomMoveDone(
  accountId: string,
  undo?: boolean,
): Promise<{ ok: boolean; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  if (!acct) return { ok: false, reason: "That row isn't bound to a known account." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  const key = moveDoneKey(acct.id);
  try {
    const prisma = getPrisma();
    if (undo) {
      await prisma.accountDisposition.deleteMany({ where: { accountId: key } });
    } else {
      await prisma.accountDisposition.upsert({
        where: { accountId: key },
        create: {
          accountId: key,
          status: MOVE_DONE_STATUS,
          reason: new Date().toISOString(),
        },
        update: { status: MOVE_DONE_STATUS, reason: new Date().toISOString() },
      });
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "That didn't save. Try again." };
  }
}

// Close the row's outstanding stage item — durable, and it files the ✓.
export async function roomClose(args: {
  accountId: string;
  cardId: string;
  node: string;
  index: number;
  doneKey: string;
  item: string;
  cardName: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const acct = bindAccountId(args.accountId, peos);
  const resolvedId = acct?.id ?? digestForCardName(args.cardName ?? "")?.accountId ?? "";
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    await applyStepComplete({
      cardId: (args.cardId ?? "").slice(0, 40),
      node: args.node as DashNodeKey,
      index: Number(args.index),
      doneKey: (args.doneKey ?? "").slice(0, 160),
      item: (args.item ?? "").slice(0, 300),
      cardName: (args.cardName ?? "").slice(0, 160),
      accountId: resolvedId,
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "The close didn't save. Try again." };
  }
}

// --- The day sheet's mechanics, per account ---------------------------------
// The composer speaks the sheet's grammar: plain text files a note; "▢ …"
// opens an action; "⏲ wed …" schedules one. Actions are written in Today's
// own dialect — the k:a tag in the body plus the notetaker account column —
// so they surface identically here, on the ledger, and on the account page.

import { nextRemindIso, parseLogInput } from "@/lib/room/bind";
import { getPrisma } from "@/lib/db";
import {
  splitMarker,
  splitTags,
  withMarker,
  withTags,
  type NoteTags,
} from "@/lib/today/route-notes";
import { routeSheetNote } from "./sheet-actions";

// The register's composer. The Note | Action toggle and urgency chips arrive
// as opts (Today's capture bar, transplanted); the typed grammar still wins
// when the operator leads with a marker ("▢ …", "⏲ wed …").
export async function roomCompose(
  accountId: string,
  text: string,
  opts?: { kind?: "note" | "action"; urgency?: "" | "low" | "med" | "high" },
): Promise<{
  ok: boolean;
  kind?: "note" | "action" | "scheduled";
  reason?: string;
  noteId?: string;
  todoId?: string;
}> {
  const acct = bindAccountId(accountId, peos);
  if (!acct) return { ok: false, reason: "That row isn't bound to a known account." };
  const parsed = parseLogInput(text);
  if (!parsed) return { ok: false, reason: "Nothing to file." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  const wantAction =
    parsed.kind !== "note" || (opts?.kind === "action" && parsed.kind === "note");
  const urgency =
    opts?.urgency === "low" || opts?.urgency === "med" || opts?.urgency === "high"
      ? opts.urgency
      : "";
  try {
    if (!wantAction) {
      const r = await roomLog(acct.id, parsed.body);
      return r.ok
        ? { ok: true, kind: "note", noteId: r.noteId, todoId: r.todoId }
        : { ok: false, reason: r.reason };
    }
    const t = await createTodoRow({
      body: parsed.body,
      tags: { kind: "action", urgency },
      accountId: acct.id,
      remindAt:
        parsed.kind === "scheduled"
          ? new Date(nextRemindIso(parsed.remindDay, new Date()))
          : new Date(),
    });
    return {
      ok: true,
      kind: parsed.kind === "scheduled" ? "scheduled" : "action",
      todoId: t.id,
    };
  } catch {
    return { ok: false, reason: "That didn't save. Try again." };
  }
}

// ↩ on a capture's receipt — remove exactly what the keystroke created: the
// note rows the mirror's marker references (only this account's), then the
// mirror row itself. Today's undoSheetRoute semantics, completed.
export async function roomUnlog(
  accountId: string,
  todoId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  const id = typeof todoId === "string" ? todoId.trim().slice(0, 40) : "";
  if (!acct || !id) return { ok: false, reason: "Not a bound row." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    const prisma = getPrisma();
    const t = await prisma.todo.findUnique({ where: { id } });
    if (!t) return { ok: false, reason: "That entry is gone." };
    const refs = splitMarker(t.body).refs;
    let owned = (t.accountId ?? "") === acct.id;
    if (!owned && refs?.accountNoteIds?.length) {
      const hit = await prisma.accountNote.findFirst({
        where: { id: { in: refs.accountNoteIds }, accountId: acct.id },
        select: { id: true },
      });
      owned = !!hit;
    }
    if (!owned)
      return { ok: false, reason: "That entry belongs to a different account." };
    if (refs?.accountNoteIds?.length) {
      await prisma.accountNote
        .deleteMany({
          where: { id: { in: refs.accountNoteIds }, accountId: acct.id },
        })
        .catch(() => null);
    }
    await prisma.todo.delete({ where: { id } });
    return { ok: true };
  } catch {
    return { ok: false, reason: "The undo didn't take. Try again." };
  }
}

// ↺ on a Sales Nav grab's receipt (seam S-25): the grab filed one note on
// each account it surely matched, so its take-back is every account's share,
// each through the one take-back below and bound to its own account, so no
// id reaches another account's record. One request for the whole grab: a
// hundred accounts are a hundred take-backs, run a few at a time here
// rather than a hundred round trips from the browser.
export async function roomGrabUndo(
  shares: { id: string; noteId: string; filingId?: string }[],
): Promise<Awaited<ReturnType<typeof roomPasteUndo>>> {
  const list = (Array.isArray(shares) ? shares : [])
    .filter((x) => x && typeof x.id === "string" && typeof x.noteId === "string")
    .slice(0, 500);
  if (list.length === 0)
    return { ok: false, removed: 0, retired: 0, reason: "Nothing to undo." };
  const results = await runLimited(
    list.map(
      (x) => () =>
        roomPasteUndo(
          x.id,
          [x.noteId],
          [],
          typeof x.filingId === "string" ? x.filingId : undefined,
        ),
    ),
    GRAB_PARALLEL,
  );
  const failed = results.find((r) => !r.ok);
  return {
    ok: !failed,
    removed: results.reduce((n, r) => n + r.removed, 0),
    retired: results.reduce((n, r) => n + r.retired, 0),
    ...(failed ? { reason: failed.reason ?? "The undo didn't take. Try again." } : {}),
  };
}

// ↩ on a paste receipt — take back the WHOLE filing, and only that filing:
// the record entries, the transcript archive and the outcome marker on this
// account, the asks in its gaps: namespace, the playbook lines whose tail
// names it, and the actions the read opened. Every delete is scoped to the
// ids the paste returned AND to this account or its own namespaces, so a
// stale or forged id list can't reach anyone else's record. What the filing
// wrote is read by its id before anything goes and handed back as `took`,
// so "N removed." opens to it (pass 8, C5); the rows are gone after this.
export async function roomPasteUndo(
  accountId: string,
  noteIds: string[],
  todoIds: string[] = [],
  // The Filing row (§2.1): when the caller names it, every row and todo
  // still carrying its id goes with it, and then the row itself. The id
  // lists stay the undo's reach until the doors send the id (slice 8).
  filingId?: string,
): Promise<{
  ok: boolean;
  removed: number;
  retired: number;
  reason?: string;
  took?: FilingWrote;
}> {
  const acct = bindAccountId(accountId, peos);
  const clean = (xs: string[]): string[] =>
    Array.isArray(xs)
      ? xs
          .filter((x): x is string => typeof x === "string")
          .map((x) => x.trim().slice(0, 40))
          .filter(Boolean)
          .slice(0, 200)
      : [];
  const ids = clean(noteIds);
  const todos = clean(todoIds);
  const filing = typeof filingId === "string" ? filingId.trim().slice(0, 40) : "";
  if (!acct || (ids.length === 0 && todos.length === 0 && !filing))
    return { ok: false, removed: 0, retired: 0, reason: "Nothing to undo." };
  if (!(await requireWrite()))
    return { ok: false, removed: 0, retired: 0, reason: "Read-only session." };
  try {
    const prisma = getPrisma();
    // What the filing wrote, read while it is still there (pass 8, C5).
    const took = filing
      ? await wroteOfFiling(acct.id, filing).catch(() => undefined)
      : undefined;
    // The filing's own duplicate marker, found by the fingerprint its row
    // keeps. A take-back by the filing's id alone (a receipt rebuilt from the
    // record, or "Already on file." taking back the earlier filing) carries
    // no note id for the marker's reason, and the capture must be fileable
    // again either way.
    const fingerprint = filing
      ? await prisma.filing
          .findUnique({
            where: { id: filing },
            select: { accountId: true, fingerprint: true },
          })
          .then((f) => (f && f.accountId === acct.id ? f.fingerprint : ""))
          .catch(() => "")
      : "";
    // The whole emails the filing kept beside its entries (ship order
    // 2026-10-20), by the note ids and by the Filing row, on this account
    // alone. Not counted: each rode on a row the count already holds.
    await dropEmailTexts({ accountId: acct.id, noteIds: ids, filingId: filing });
    // The account's own rows and its asks.
    const r = ids.length
      ? await prisma.accountNote.deleteMany({
          where: { id: { in: ids }, accountId: { in: [acct.id, gapNs(acct.id)] } },
        })
      : { count: 0 };
    // The playbook is one namespace for every account, so a line goes only
    // when its ⟦tail⟧ names this one.
    let playbook = 0;
    if (ids.length) {
      const lines = await prisma.accountNote.findMany({
        where: {
          id: { in: ids },
          accountId: { in: [PLAYBOOK_MARKET, PLAYBOOK_LESSONS] },
        },
        select: { id: true, body: true },
      });
      const mine = lines
        .filter((x) => parsePlaybookBody(x.body).tail.a === acct.id)
        .map((x) => x.id);
      if (mine.length) {
        const p = await prisma.accountNote.deleteMany({ where: { id: { in: mine } } });
        playbook = p.count;
      }
    }
    // The todos the filing still links, read before the row goes: a
    // completion line is keyed by its todo, and the key is all that finds it.
    const filingTodos = filing
      ? await prisma.todo
          .findMany({
            where: { filingId: filing, accountId: acct.id },
            select: { id: true },
          })
          .then((rows) => rows.map((x) => x.id))
          .catch(() => [] as string[])
      : [];
    // The actions the read opened, on this account only.
    const t = todos.length
      ? await prisma.todo.deleteMany({ where: { id: { in: todos }, accountId: acct.id } })
      : { count: 0 };
    // The Filing row and whatever still carries its id, scoped to this
    // account by the row's own column; a forged id reaches no one else.
    const byFiling = filing
      ? await undoFiling(filing, acct.id)
      : { notes: 0, todos: 0, filing: 0 };
    if (fingerprint && byFiling.filing > 0)
      await prisma.accountDisposition
        .deleteMany({ where: { accountId: pasteKeyOf(acct.id, fingerprint) } })
        .catch(() => undefined);
    // A completion line filed when the operator closed an opened todo before
    // undoing goes with its todo (the defects doc's open item).
    const completions = await undoCompletions(acct.id, [...todos, ...filingTodos]);
    // The duplicate guard's marker carries the paste's first note id — an
    // undone paste must be re-fileable, so the marker goes with the notes.
    if (ids[0]) {
      try {
        await prisma.accountDisposition.deleteMany({
          where: {
            accountId: { startsWith: `pastehash:${acct.id}:` },
            reason: { contains: ids[0] },
          },
        });
      } catch {
        // marker cleanup is best-effort; the notes are already gone
      }
    }
    return {
      ok: true,
      removed: r.count + playbook + byFiling.notes + completions,
      retired: t.count + byFiling.todos,
      ...(took ? { took } : {}),
    };
  } catch {
    return {
      ok: false,
      removed: 0,
      retired: 0,
      reason: "The undo didn't take. Try again.",
    };
  }
}

// --- Closing a deal ----------------------------------------------------------
// The record suggested the deal closed; the operator decides. Confirming stamps
// the terminal state on the card — Closed Won or Closed Lost, with the sentence
// that proves it — retires it from the board, and files the call. Keep-salvaging
// retires THIS read (keyed to the triggering note, so new evidence resurfaces).
async function closeCard(args: {
  accountId: string;
  cardId: string;
  noteId: string;
  status: OutcomeStatus;
  phrase: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const acct = bindAccountId(args.accountId, peos);
  const cid = typeof args.cardId === "string" ? args.cardId.trim().slice(0, 40) : "";
  if (!cid) return { ok: false, reason: "Not a bound row." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    const prisma = getPrisma();
    const card = await prisma.dashCard.findUnique({
      where: { id: cid },
      select: { id: true, name: true, notes: true },
    });
    if (!card) return { ok: false, reason: "That card is gone." };
    const label = OUTCOME_LABEL[args.status];
    // The card does NOT leave the board here. A closed deal still has to be
    // able to SAY it closed — the stage meter reads Closed Won / Closed Lost
    // and the row goes quiet at the bottom. Retiring it is its own decision.
    await prisma.dashCard.update({
      where: { id: cid },
      data: {
        notes: writeOutcome(card.notes, {
          status: args.status,
          phrase: redactMoney((args.phrase ?? "").trim()).slice(0, 200),
          at: new Date().toISOString(),
        }),
      },
    });
    if (acct) {
      await createAccountNoteRow({
        accountId: acct.id,
        kind: "account",
        body: `✓ ${label}. Confirmed by your call.${
          args.phrase ? ` The evidence: ${redactMoney(args.phrase).slice(0, 160)}` : ""
        }`,
        door: "hand",
        lane: "mine",
        source: "outcome",
      }).catch(() => null);
    }
    // Quiet this read permanently for the closed card.
    const key = `loss-dismiss:${cid}:${(args.noteId ?? "").slice(0, 40)}`.slice(0, 191);
    await prisma.accountDisposition
      .upsert({
        where: { accountId: key },
        create: { accountId: key, status: "parked", reason: label },
        update: { status: "parked", reason: label },
      })
      .catch(() => null);
    return { ok: true };
  } catch {
    return { ok: false, reason: "That didn't save. Try again." };
  }
}

export async function roomMarkLost(
  accountId: string,
  cardId: string,
  noteId: string,
  phrase?: string,
): Promise<{ ok: boolean; reason?: string }> {
  return closeCard({
    accountId,
    cardId,
    noteId,
    status: "lost",
    phrase: phrase ?? "",
  });
}

export async function roomMarkWon(
  accountId: string,
  cardId: string,
  noteId: string,
  phrase?: string,
): Promise<{ ok: boolean; reason?: string }> {
  return closeCard({ accountId, cardId, noteId, status: "won", phrase: phrase ?? "" });
}

// Retire a closed row from the board. Separate from closing on purpose: the
// meter has to be able to read Closed Lost for as long as the operator wants to
// see it, and disappearing the row is a different intention entirely.
export async function roomRetire(
  accountId: string,
  cardId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const cid = typeof cardId === "string" ? cardId.trim().slice(0, 40) : "";
  if (!bindAccountId(accountId, peos) || !cid)
    return { ok: false, reason: "Not a bound row." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    await getPrisma().dashCard.update({
      where: { id: cid },
      data: { archived: true },
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "That didn't save. Try again." };
  }
}

// --- Low signal ------------------------------------------------------------
// A deal row that isn't in the operator's Salesforce pipeline moves into the
// LOW SIGNAL section above the closed ledger; the same control sends it back.
// Nothing files to the record and nothing leaves the row: this is how the
// operator sorts the board, stored as a namespaced disposition that no queue
// reads (src/lib/room/low-signal.ts).
export async function roomLowSignal(
  accountId: string,
  cardId: string,
  on: boolean,
): Promise<{ ok: boolean; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  const cid = typeof cardId === "string" ? cardId.trim().slice(0, 40) : "";
  if (!acct && !cid) return { ok: false, reason: "Not a bound row." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  const row = { accountId: acct?.id ?? "", cardId: cid };
  const key = lowSignalKey(row);
  try {
    const prisma = getPrisma();
    if (on === true)
      await prisma.accountDisposition.upsert({
        where: { accountId: key },
        create: { accountId: key, status: "parked", reason: "low signal" },
        update: { status: "parked", reason: "low signal" },
      });
    // Returning it to the live board clears every key that can mark the row, so a
    // card marked before the book bound it comes back too.
    else
      await prisma.accountDisposition.deleteMany({
        where: { accountId: { in: lowSignalKeys(row) } },
      });
    return { ok: true };
  } catch {
    return { ok: false, reason: "That didn't save. Try again." };
  }
}

// --- The research pass -------------------------------------------------------
// The obvious button. First run is the deep one; every run files its findings as
// a note on the account, so the record, the corpus, the intel extractor and the
// People index all pick it up with no further wiring. A refresh also reports
// what changed since the last pass, which is the only part worth reading twice.
export async function roomResearch(
  accountId: string,
): Promise<{ ok: boolean; reason?: string; changed?: string[]; summary?: string }> {
  const acct = bindAccountId(accountId, peos);
  if (!acct) return { ok: false, reason: "That row isn't bound to a known account." };
  if (!researchAvailable())
    return { ok: false, reason: "The brain is unreachable. Research is off." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  const now = new Date();
  try {
    const prisma = getPrisma();
    const prior = await prisma.accountNote
      .findMany({
        where: { accountId: researchNs(acct.id) },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true },
      })
      .catch(() => [] as { body: string }[]);
    const previous = prior[0] ? parseResearchBody(prior[0].body) : null;

    // The people the pass looks into are the account read's (src/lib/record/
    // read.ts), as the minter's asks are: the full visible record, folded
    // under the canonical id. The pass used to read the newest sixty raw
    // rows on the account's id, so a row the operator ✕-parked still named
    // its people to the research prompt. Hidden is hidden (pass 8, X1): the
    // read's hide filter takes them out before anyone is named.
    const [notesById, todos, touches, dispositions] = await Promise.all([
      loadAccountNotes(),
      loadTodos(),
      loadTouches(),
      loadDispositions(),
    ]);
    const read = readFromStores(
      {
        notesById,
        touches,
        todos,
        dispositions,
        homeSide: declaredHomeSide(homeSideFrom(notesById)),
      },
      acct,
      { now },
    );
    const people = read.people
      .map((p) => p.name)
      .filter((x) => x.length > 2 && !MINE_RE.test(x))
      .slice(0, 6);

    // The book knows their site; bindAccountId only carries id + name, so read
    // the fuller record for the one field the pass wants.
    const site = peos.find((p) => p.id === acct.id)?.website ?? "";
    const finding = await runResearch({
      accountName: acct.name,
      site: site || undefined,
      people,
      // The prompt calls these the countries the record mentions, so they
      // are the record's (the read's field 18), never the last pass's own.
      countries: read.countries.map((c) => c.value),
      now,
    });
    if (!finding.summary && finding.signals.length === 0)
      return { ok: false, reason: "The pass came back empty. Try again in a moment." };

    await createAccountNoteRow({
      accountId: researchNs(acct.id),
      kind: "account",
      body: researchBody(finding, now),
      door: "hand",
      lane: "background",
      source: "research",
    });
    // The readable half also lands on the account itself, so the record shows
    // that the research happened and the corpus can read the findings.
    await createAccountNoteRow({
      accountId: acct.id,
      kind: "account",
      body: researchBody(finding, now).split("\n⟪")[0],
      door: "hand",
      lane: "background",
      source: "research",
    }).catch(() => null);

    // Anything the pass says is worth asking joins the carousel; the
    // namespace owns its dedupe.
    await fileGaps({
      accountId: acct.id,
      questions: finding.asks,
      door: "hand",
    });

    return {
      ok: true,
      changed: diffFindings(previous, finding),
      summary: finding.summary.slice(0, 300),
    };
  } catch {
    return { ok: false, reason: "The research pass didn't complete. Try again." };
  }
}

// --- The asks (STILL UNKNOWN) -------------------------------------------------
// Any ask can be irrelevant to this scenario. Waving one off parks it and the
// carousel advances to the next ask behind it.
// The queue ran dry (or the operator wants better asks). Mint more, grounded in
// everything the app now knows about this deal — and in what other deals taught.
export async function roomGapsRefill(
  accountId: string,
): Promise<{ ok: boolean; added?: number; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  if (!acct) return { ok: false, reason: "That row isn't bound to a known account." };
  if (!aiCleanAvailable())
    return { ok: false, reason: "The brain is unreachable. Minting is off." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    const prisma = getPrisma();
    const [
      asks,
      research,
      lessons,
      market,
      scen,
      notesById,
      todos,
      touches,
      dispositions,
    ] = await Promise.all([
      prisma.accountNote
        .findMany({ where: { accountId: gapNs(acct.id) }, select: { body: true } })
        .catch(() => [] as { body: string }[]),
      prisma.accountNote
        .findMany({
          where: { accountId: researchNs(acct.id) },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { body: true },
        })
        .catch(() => [] as { body: string }[]),
      prisma.accountNote
        .findMany({
          where: { accountId: PLAYBOOK_LESSONS },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { body: true },
        })
        .catch(() => [] as { body: string }[]),
      prisma.accountNote
        .findMany({
          where: { accountId: PLAYBOOK_MARKET },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: { body: true },
        })
        .catch(() => [] as { body: string }[]),
      prisma.accountDisposition
        .findUnique({
          where: { accountId: `scenario:${acct.id}`.slice(0, 191) },
          select: { reason: true },
        })
        .catch(() => null),
      // The stores the read takes, the way every page loads them: the wide
      // loader folds a row filed under a shell id under its canonical
      // account, and the touch log, the sheet and the markers ride so the
      // read here is the room's own.
      loadAccountNotes(),
      loadTodos(),
      loadTouches(),
      loadDispositions(),
    ]);

    const found = research[0] ? parseResearchBody(research[0].body) : null;
    // The single account read (src/lib/record/read.ts; §2.2, the third
    // migration). The minter used to read forty raw rows on the canonical id
    // — no shell fold, no hide filter, no todos or touches, no roster (pass 2
    // C, the old :1252 row) — so asks were minted blind to the CEO thread
    // filed under the shell id and blind to nothing the operator ✕-parked.
    // The read's docs are the full visible record, folded, and its intel is
    // the room's. The roster is declared because the read takes one (E9);
    // the ask builder itself wants no inbound test — it reads countries,
    // products and the timing phrase off the docs and never reads direction
    // (pass 2 E).
    const read = readFromStores(
      {
        notesById,
        touches,
        todos,
        dispositions,
        homeSide: declaredHomeSide(homeSideFrom(notesById)),
      },
      acct,
      { now: new Date() },
    );
    const intel = read.intel;
    const scenario = SCENARIOS.find((x) => x.id === (scen?.reason ?? "")) ?? null;

    const minted = await mintAsks({
      accountName: acct.name,
      countries: intel.countries.map((c) => c.value),
      products: intel.products.map((p) => p.value),
      stage: intel.timing?.value.phrase ?? "",
      scenario: scenario ? { label: scenario.label, blurb: scenario.blurb } : null,
      research: [found?.summary ?? "", ...(found?.signals ?? [])]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 900),
      lessons: [...lessons, ...market].map((r) => parsePlaybookBody(r.body).text),
      asked: asks.map((r) => parseGapBody(r.body)),
    });
    // The rows were read above for the mint; the namespace owns the dedupe.
    const added = await fileGaps({
      accountId: acct.id,
      questions: minted,
      door: "hand",
    });
    return { ok: true, added: added.length };
  } catch {
    return { ok: false, reason: "Minting didn't complete. Try again." };
  }
}

export async function roomGapDismiss(
  accountId: string,
  noteId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  const nid = typeof noteId === "string" ? noteId.trim().slice(0, 40) : "";
  if (!acct || !nid) return { ok: false, reason: "Nothing to dismiss." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    // Bound like every other room write: the ask has to live in THIS account's
    // own queue, so a stale or forged id can't park someone else's row.
    const owned = await getPrisma().accountNote.findFirst({
      where: { id: nid, accountId: gapNs(acct.id) },
      select: { id: true },
    });
    if (!owned) return { ok: false, reason: "That ask belongs to a different account." };
    const key = gapDismissKey(nid).slice(0, 191);
    await getPrisma().accountDisposition.upsert({
      where: { accountId: key },
      create: { accountId: key, status: "parked", reason: "not relevant" },
      update: { status: "parked", reason: "not relevant" },
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "That didn't save. Try again." };
  }
}

export async function roomLossDismiss(
  accountId: string,
  cardId: string,
  noteId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const cid = typeof cardId === "string" ? cardId.trim().slice(0, 40) : "";
  const nid = typeof noteId === "string" ? noteId.trim().slice(0, 40) : "";
  if (!cid || !nid) return { ok: false, reason: "Not a bound row." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    const key = `loss-dismiss:${cid}:${nid}`.slice(0, 191);
    await getPrisma().accountDisposition.upsert({
      where: { accountId: key },
      create: { accountId: key, status: "parked", reason: "keep salvaging" },
      update: { status: "parked", reason: "keep salvaging" },
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "That didn't save. Try again." };
  }
}

// --- Owed-to-you suggestions --------------------------------------------------
// The record says someone put work on the operator's plate. Accept opens it
// as a real register action; dismiss retires the suggestion durably.
export async function roomOwedAccept(
  accountId: string,
  text: string,
  key: string,
): Promise<{ ok: boolean; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  const body = cleanLogBody(text);
  const k = typeof key === "string" ? key.trim().slice(0, 191) : "";
  if (!acct || !body || !k.startsWith("owed:"))
    return { ok: false, reason: "Not a bound suggestion." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    const prisma = getPrisma();
    await createTodoRow({
      body,
      tags: { kind: "action" },
      accountId: acct.id,
      remindAt: new Date(),
    });
    await prisma.accountDisposition
      .upsert({
        where: { accountId: k },
        create: { accountId: k, status: "parked", reason: "accepted" },
        update: { status: "parked", reason: "accepted" },
      })
      .catch(() => null);
    return { ok: true };
  } catch {
    return { ok: false, reason: "That didn't save. Try again." };
  }
}

export async function roomOwedDismiss(
  accountId: string,
  key: string,
): Promise<{ ok: boolean; reason?: string }> {
  const k = typeof key === "string" ? key.trim().slice(0, 191) : "";
  if (!k.startsWith("owed:")) return { ok: false, reason: "Not a bound suggestion." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    await getPrisma().accountDisposition.upsert({
      where: { accountId: k },
      create: { accountId: k, status: "parked", reason: "dismissed" },
      update: { status: "parked", reason: "dismissed" },
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "That didn't save. Try again." };
  }
}

// ✎ / ✕ on a record entry — the register's history is editable in place.
// Both are bound: the note must belong to this account, or nothing moves.
export async function roomRecordEdit(
  accountId: string,
  noteId: string,
  text: string,
): Promise<{ ok: boolean; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  const id = typeof noteId === "string" ? noteId.trim().slice(0, 40) : "";
  const clean = cleanLogBody(text);
  if (!acct || !id) return { ok: false, reason: "Not a bound row." };
  if (!clean) return { ok: false, reason: "Nothing to save." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    const prisma = getPrisma();
    const n = await prisma.accountNote.findFirst({
      where: { id, accountId: acct.id },
    });
    if (!n) return { ok: false, reason: "That entry belongs to a different account." };
    // The register shows (and edits) the FIRST LINE only — so the edit
    // replaces only that line. Everything beneath it (a filed email's full
    // body, a 6,000-char transcript) rides through untouched: fixing a typo
    // in the head must never amputate the substance.
    const lines = n.body.split("\n");
    const glyph = /^[✉✓☰✎✔☎]/.exec(n.body)?.[0];
    // Strip any glyph the client's edit box carried back so glyphs never stack.
    const bare = clean
      .replace(/^[✉✓☰✎✔☎⚡▢]\s?/, "")
      .trim()
      .slice(0, 500);
    lines[0] = glyph ? `${glyph} ${bare}` : bare;
    // Cap the EDITED LINE, never the whole body — a whole-body cap here once
    // amputated a 60k-char archived transcript down to its first 8,000 chars.
    await prisma.accountNote.update({
      where: { id },
      data: { body: lines.join("\n") },
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "The edit didn't save. Try again." };
  }
}

// ✕ on a record entry PARKS it (a hide:note: disposition) — the register's
// own doctrine: never a hard delete, always restorable. The row vanishes
// from every register view but the note itself survives in the table.
export async function roomRecordDelete(
  accountId: string,
  noteId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  const id = typeof noteId === "string" ? noteId.trim().slice(0, 40) : "";
  if (!acct || !id) return { ok: false, reason: "Not a bound row." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    const prisma = getPrisma();
    const n = await prisma.accountNote.findFirst({
      where: { id, accountId: acct.id },
      select: { id: true, body: true },
    });
    if (!n) return { ok: false, reason: "That entry belongs to a different account." };
    const key = hideNoteKey(id).slice(0, 191);
    await prisma.accountDisposition.upsert({
      where: { accountId: key },
      create: { accountId: key, status: "parked", reason: n.body.slice(0, 300) },
      update: { status: "parked", reason: n.body.slice(0, 300) },
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "The delete didn't take. Try again." };
  }
}

// ✸ make it an action → : promote a capture (its sheet mirror) or an old
// record entry into open work on this account's register.
export async function roomNoteToAction(
  accountId: string,
  src: { todoId?: string; noteId?: string },
): Promise<{ ok: boolean; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  if (!acct) return { ok: false, reason: "That row isn't bound to a known account." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    const prisma = getPrisma();
    const todoId = typeof src?.todoId === "string" ? src.todoId.trim().slice(0, 40) : "";
    if (todoId) {
      const t = await prisma.todo.findUnique({ where: { id: todoId } });
      if (!t) return { ok: false, reason: "That entry is gone." };
      let owned = (t.accountId ?? "") === acct.id;
      if (!owned) {
        const refs = splitMarker(t.body).refs;
        if (refs?.accountNoteIds?.length) {
          const hit = await prisma.accountNote.findFirst({
            where: { id: { in: refs.accountNoteIds }, accountId: acct.id },
            select: { id: true },
          });
          owned = !!hit;
        }
      }
      if (!owned)
        return { ok: false, reason: "That entry belongs to a different account." };
      await patchRoomTodoTags(todoId, t.body, { kind: "action", doneAt: "" });
      await prisma.todo.update({
        where: { id: todoId },
        data: { done: false, accountId: acct.id },
      });
      return { ok: true };
    }
    const noteId = typeof src?.noteId === "string" ? src.noteId.trim().slice(0, 40) : "";
    if (!noteId) return { ok: false, reason: "Nothing to promote." };
    const n = await prisma.accountNote.findFirst({
      where: { id: noteId, accountId: acct.id },
    });
    if (!n) return { ok: false, reason: "That entry belongs to a different account." };
    // Find the SUBSTANCE, not the metadata. A paste-filed entry's first line
    // is the head ("✉ SF Jul 22 — Subject · A → B") and a transcript's is a
    // constant label — promoting those made actions that said nothing. Prefer
    // the subject + first body line; skip generic labels entirely.
    const lines = n.body
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const first = (lines[0] ?? "").replace(/^[✎✉✓☰⚡▢✔☎]\s?/, "").trim();
    const headMatch = /^(?:SF|OL|TM)\b[^—]*—\s*(.+?)\s*·[^·]*$/.exec(first);
    let text: string;
    if (headMatch) {
      const subject = headMatch[1].trim();
      const bodyLine = lines[1] ?? "";
      text = bodyLine ? `${subject} — ${bodyLine}` : subject;
    } else if (/^transcript — filed from the room/.test(first)) {
      text = lines[1] ?? "";
    } else {
      text = first;
    }
    text = text.trim().slice(0, 300);
    if (!text) return { ok: false, reason: "Nothing to promote." };
    await createTodoRow({
      body: text,
      tags: { kind: "action" },
      accountId: acct.id,
      remindAt: new Date(),
    });
    return { ok: true };
  } catch {
    return { ok: false, reason: "That didn't save. Try again." };
  }
}

// Rewrite a sheet todo's lifecycle tags in place — text, routing marker, and
// every untouched tag ride through (same surgery Today's ledger performs).
async function patchRoomTodoTags(id: string, body: string, patch: Partial<NoteTags>) {
  const { text, refs, label } = splitMarker(body);
  const { text: plain, tags } = splitTags(text);
  const tagged = withTags(plain, { ...tags, ...patch });
  await getPrisma().todo.update({
    where: { id },
    data: { body: refs ? withMarker(tagged, refs, label) : tagged },
  });
}

// A seat on the register (ruled 2026-09-25, C8). When its account is excluded
// from Groundwork's queue, the Act Lane's seat reads on the TODAY register
// with the register's own controls, and each control means what it means on
// the wing: ✓ writes the day's worked stamp Groundwork's own button writes,
// ↩ takes the stamp back, ⏲ holds the line for today, ✕ parks the row like
// any record entry (restorable from the Archive), and ✎ rewrites the act with
// the seat's term and day kept. The seat row itself is never deleted here —
// the Act Lane's take-back is the one door that removes it.
async function seatRowFor(
  accountId: string,
  id: string,
): Promise<{ id: string; body: string } | null> {
  const prisma = getPrisma();
  const n = await prisma.accountNote.findUnique({
    where: { id },
    select: { id: true, accountId: true, body: true },
  });
  return n && n.accountId === `${SEAT_NS}${accountId}`
    ? { id: n.id, body: n.body }
    : null;
}

async function seatOp(
  accountId: string,
  seat: { id: string; body: string },
  op: "done" | "undo" | "tomorrow" | "now" | "drop",
): Promise<void> {
  const prisma = getPrisma();
  const stamp = groundworkDoneKey(new Date(), `${accountId}:seated`);
  const held = `row-delay:todo:${seat.id}`.slice(0, 191);
  const reason = seat.body.slice(0, 300);
  if (op === "done")
    await prisma.taskDone.upsert({
      where: { key: stamp },
      create: { key: stamp },
      update: {},
    });
  else if (op === "undo") await prisma.taskDone.deleteMany({ where: { key: stamp } });
  else if (op === "tomorrow")
    await prisma.accountDisposition.upsert({
      where: { accountId: held },
      create: { accountId: held, status: "parked", reason },
      update: { status: "parked", reason },
    });
  else if (op === "now")
    await prisma.accountDisposition.deleteMany({ where: { accountId: held } });
  else {
    const key = hideNoteKey(seat.id).slice(0, 191);
    await prisma.accountDisposition.upsert({
      where: { accountId: key },
      create: { accountId: key, status: "parked", reason },
      update: { status: "parked", reason },
    });
  }
}

// ✓ / ↩ / ⏲ / ✕ on an open item — Today's ledger lifecycle, spoken from the
// room. Ops are a closed set; the todo must belong to the bound account,
// either by its notetaker column or by a routing marker that references one
// of the account's own note rows.
export async function roomTodoSet(
  accountId: string,
  todoId: string,
  op: "done" | "undo" | "tomorrow" | "now" | "drop",
): Promise<{ ok: boolean; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  const id = typeof todoId === "string" ? todoId.trim().slice(0, 40) : "";
  if (!acct || !id) return { ok: false, reason: "Not a bound row." };
  if (!["done", "undo", "tomorrow", "now", "drop"].includes(op))
    return { ok: false, reason: "Unknown control." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    const prisma = getPrisma();
    const t = await prisma.todo.findUnique({ where: { id } });
    if (!t) {
      // Not a todo: the account's seat on the register (C8), or gone.
      const seat = await seatRowFor(acct.id, id);
      if (!seat) return { ok: false, reason: "That item is gone." };
      await seatOp(acct.id, seat, op);
      return { ok: true };
    }
    let owned = (t.accountId ?? "") === acct.id;
    if (!owned) {
      const refs = splitMarker(t.body).refs;
      if (refs?.accountNoteIds?.length) {
        const hit = await prisma.accountNote.findFirst({
          where: { id: { in: refs.accountNoteIds }, accountId: acct.id },
          select: { id: true },
        });
        owned = !!hit;
      }
    }
    if (!owned) return { ok: false, reason: "That item belongs to a different account." };

    if (op === "done") {
      // Stamp the moment, close it, clear any delay — then file it to the
      // account's record (the room knows the account, so no picker needed;
      // already-routed items pass through untouched).
      await patchRoomTodoTags(id, t.body, {
        doneAt: String(Date.now()),
      });
      await prisma.todo.update({ where: { id }, data: { done: true } });
      await prisma.accountDisposition
        .deleteMany({ where: { accountId: `row-delay:todo:${id}` } })
        .catch(() => null);
      // routeSheetNote files an UNROUTED item's text to the account and then
      // marks it; an already-routed item passes straight through, which is how
      // the completion used to vanish for anything the paste or composer opened.
      // So: file our dated line only when routing didn't already write one.
      const wasRouted = !!splitMarker(t.body).refs;
      await routeSheetNote(id, { accountId: acct.id }).catch(() => null);
      if (wasRouted) await fileCompletion(acct.id, id, t.body);
    } else if (op === "undo") {
      await patchRoomTodoTags(id, t.body, { doneAt: "" });
      await prisma.todo.update({ where: { id }, data: { done: false } });
    } else if (op === "tomorrow") {
      await prisma.todo.update({
        where: { id },
        data: { remindAt: new Date(nextRemindIso("tomorrow", new Date())) },
      });
    } else if (op === "now") {
      await prisma.todo.update({ where: { id }, data: { remindAt: null } });
      await prisma.accountDisposition
        .deleteMany({ where: { accountId: `row-delay:todo:${id}` } })
        .catch(() => null);
    } else {
      // ✕ parks the row in the Archive's hidden bin (restorable), exactly as
      // the ledger's ✕ does — never a hard delete.
      const snippet = splitTags(splitMarker(t.body).text).text.slice(0, 300);
      const key = `hide:todo:${id}`.slice(0, 191);
      await prisma.accountDisposition.upsert({
        where: { accountId: key },
        create: { accountId: key, status: "parked", reason: snippet },
        update: { status: "parked", reason: snippet },
      });
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "That didn't save. Try again." };
  }
}

// ✎ on a sheet line: the operator rewrites the item's visible text in place.
// Tags (urgency, k:a, delays) and the routing marker survive verbatim — the
// edit touches only what the eye reads. Money redacts like everywhere else.
export async function roomTodoEdit(
  accountId: string,
  todoId: string,
  text: string,
): Promise<{ ok: boolean; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  const id = typeof todoId === "string" ? todoId.trim().slice(0, 40) : "";
  const next = typeof text === "string" ? redactMoney(text.trim()).slice(0, 500) : "";
  if (!acct || !id) return { ok: false, reason: "Not a bound row." };
  if (!next) return { ok: false, reason: "An empty line is a delete. Use ✕." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    const prisma = getPrisma();
    const t = await prisma.todo.findUnique({ where: { id } });
    if (!t) {
      // Not a todo: the account's seat on the register (C8), or gone. The act
      // is rewritten; the term and the seated day survive, as a todo's tags
      // do. The grammar's own separator leaves the text, and the fork's cap
      // on the act holds.
      const seat = await seatRowFor(acct.id, id);
      const body = seat ? editedSeatBody(seat.body, next) : null;
      if (!seat || !body) return { ok: false, reason: "That item is gone." };
      await prisma.accountNote.update({ where: { id }, data: { body } });
      return { ok: true };
    }
    let owned = (t.accountId ?? "") === acct.id;
    if (!owned) {
      const refs = splitMarker(t.body).refs;
      if (refs?.accountNoteIds?.length) {
        const hit = await prisma.accountNote.findFirst({
          where: { id: { in: refs.accountNoteIds }, accountId: acct.id },
          select: { id: true },
        });
        owned = !!hit;
      }
    }
    if (!owned) return { ok: false, reason: "That item belongs to a different account." };
    // The tags and the routing marker ride along byte for byte (the pure
    // half lives in sheet-view.ts, where the suite calls it).
    const body = editedSheetBody(t.body, next);
    await prisma.todo.update({ where: { id }, data: { body } });
    return { ok: true };
  } catch {
    return { ok: false, reason: "The edit didn't save." };
  }
}

// The document transcriber — Claude reads a PDF or an image (a screenshot of
// an email, a chat, a whiteboard, a business card) to paste text the room's
// readers understand. An email thread comes back headed OUTLOOK THREAD, a
// chat as TEAMS THREAD, a call as CALL TRANSCRIPT with its Recorded line
// (ruled 2026-09-25, D3), anything else as a plain transcript; the ask is
// transcriberPrompt in src/lib/room/paste.ts, whose heads are the dialect
// table's. The bytes never persist; only the filed entries do.
const IMAGE_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function transcribePdf(
  file: File,
): Promise<{ ok: boolean; text?: string; reason?: string; window?: Window | null }> {
  if (!claudeAvailable())
    return { ok: false, reason: "The reader is unreachable. Paste the text instead." };
  if (file.size > TRANSCRIBE_BYTES)
    return { ok: false, reason: "That file is over 8 MB. Export a smaller one." };
  const isImage = IMAGE_MEDIA.has(file.type);
  if (!isImage && file.type !== "application/pdf" && !/\.pdf$/i.test(file.name))
    return { ok: false, reason: "The reader takes PDFs and images here." };
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const imageMedia = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  try {
    const client = claudeClient({ timeout: 110_000, maxRetries: 1 });
    const res = await client.messages.create({
      model: MODEL_TRANSCRIBE,
      max_tokens: 16000,
      output_config: { effort: "low" },
      messages: [
        {
          role: "user",
          content: [
            isImage
              ? {
                  type: "image" as const,
                  source: { type: "base64" as const, media_type: imageMedia, data },
                }
              : {
                  type: "document" as const,
                  source: {
                    type: "base64" as const,
                    media_type: "application/pdf" as const,
                    data,
                  },
                },
            {
              type: "text",
              text: transcriberPrompt(isImage ? "image" : "document", file.name),
            },
          ],
        },
      ],
    });
    if (res.stop_reason === "refusal")
      return { ok: false, reason: "The reader declined this document." };
    const text = res.content
      .filter(
        (b): b is Extract<(typeof res.content)[number], { type: "text" }> =>
          b.type === "text",
      )
      .map((b) => b.text)
      .join("\n")
      .trim();
    if (text.length < TEXT_FLOOR)
      return { ok: false, reason: "Nothing readable came back from the document." };
    // The transcription is handed on whole (ruled 2026-10-07, pass 8 call 3:
    // every reader hands on the text whole, and only what goes to a model is
    // windowed). roomPaste windows its own read and records that window.
    return { ok: true, text, window: null };
  } catch {
    return { ok: false, reason: "The document read failed. Paste the text instead." };
  }
}

// The Drop's PDF reader — bound to the row the file was dropped on.
export async function roomReadPdf(
  accountId: string,
  formData: FormData,
): Promise<{ ok: boolean; text?: string; reason?: string; window?: Window | null }> {
  const acct = bindAccountId(accountId, peos);
  if (!acct) return { ok: false, reason: "That row isn't bound to a known account." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, reason: "No file arrived." };
  return transcribePdf(file);
}

// The Chute's PDF reader — no row yet; the router names the account from the
// transcription afterward. Same permission gate, same transcriber.
export async function chuteReadPdf(
  formData: FormData,
): Promise<{ ok: boolean; text?: string; reason?: string; window?: Window | null }> {
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, reason: "No file arrived." };
  return transcribePdf(file);
}

// The partner-brief notifier's own hand (founder-decreed 2026-08-19): a click
// sets the status directly — "opp created" or plain done — instead of waiting
// on a stage-record item to close. Stored as day-less TaskDone keys so the
// mark survives every reload; "clear" takes it back.
export async function roomBriefedSet(
  accountId: string,
  value: "opp" | "done" | "clear",
): Promise<{ ok: boolean; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  if (!acct) return { ok: false, reason: "Not a bound row." };
  if (!["opp", "done", "clear"].includes(value))
    return { ok: false, reason: "Not a status." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    const prisma = getPrisma();
    await prisma.taskDone.deleteMany({
      where: { key: { in: [`briefed:${acct.id}:opp`, `briefed:${acct.id}:done`] } },
    });
    if (value !== "clear") {
      const key = `briefed:${acct.id}:${value}`;
      await prisma.taskDone.upsert({ where: { key }, create: { key }, update: {} });
    }
  } catch {
    return { ok: false, reason: "The status didn't keep. Try again." };
  }
  return { ok: true };
}
