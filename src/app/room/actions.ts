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

import { rulesRead } from "@/lib/intel/rules-read";
import { claudeClient, claudeAvailable } from "@/lib/claude/health";
import { MODEL_TRANSCRIBE } from "@/lib/intranet/doctrine";
import { getAppAccess } from "@/lib/auth";
import { hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import { joinedRoster } from "@/lib/ingest/route";
import { guardPlan, type GuardVerdict } from "@/lib/ingest/guard";
import { EXCERPT_CAP, readRungVerdict } from "@/lib/ingest/verdict-reason";
import { HEADS, SOURCE_OF, sniffHead } from "@/lib/ingest/dialect";
import {
  fileFiling,
  undoFiling,
  type DupeCheck,
  type FilingHow,
} from "@/lib/ingest/filing";
import { absorbRead, fileCompletion, undoCompletions } from "@/lib/ingest/fanout";
import {
  ENTRY_CAP,
  READ_WINDOW,
  READ_WINDOW_TAPE,
  TEXT_FLOOR,
  TRANSCRIBE_BYTES,
  TRANSCRIBE_WINDOW,
  cut,
  type Window,
} from "@/lib/ingest/windows";
import { transcriberPrompt } from "@/lib/room/paste";
import { digestForCardName } from "@/lib/intel/digest";
import {
  aiCleanAvailable,
  aiCleanTimeline,
  dropNoiseEntries,
} from "@/lib/intel/ai-clean";
import {
  PLAYBOOK_LESSONS,
  PLAYBOOK_MARKET,
  parsePlaybookBody,
} from "@/lib/playbook/store";
import { fileGaps, gapDismissKey, gapNs, parseGapBody } from "@/lib/room/gaps";
import type { Door } from "@/lib/ingest/doors";
import { MINE_RE, actorsLine, joinRecipients, laneFor } from "@/lib/intel/provenance";
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
import { declaredHomeSide, readFromStores } from "@/lib/record/stores";
import {
  loadAccountNotes,
  loadDispositions,
  loadTodos,
  loadTouches,
} from "@/lib/today/overlay";
import { cleanSfPaste, parseSfTimeline, scrubSecrets } from "@/lib/sf-timeline";
import { pasteFingerprint, transcriptRecordedDay } from "@/lib/paste-files";
import { redactMoney } from "@/lib/intel/lexicon";
import {
  bindAccountId,
  cleanLogBody,
  moveDoneKey,
  MOVE_DONE_STATUS,
} from "@/lib/room/bind";
import { createAccountNoteRow, createTodoRow } from "@/lib/notes/write";
import { SEAT_NS, parseSeatBody, renderSeatBody } from "@/lib/act/lane";
import { groundworkDoneKey } from "@/lib/groundwork/file";
import { applyStepComplete } from "@/lib/dashboard/complete";
import { mirrorNoteToSheet } from "@/lib/today/mirror";
import { OUTCOME_LABEL, writeOutcome, type OutcomeStatus } from "@/lib/dashboard/outcome";
import type { DashNodeKey } from "@/lib/dashboard/stages";

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

// ⚡ paste → the read. One call to Claude returns dated entries AND judgment:
// the commitments in the text, the questions the record still can't answer, the
// market facts worth keeping past this deal, the lessons, and whether the paste
// says the deal closed. Entries file as the record; commitments OPEN as work,
// each undoable on its own; knowledge files to the playbook where every other
// account can reach it. Two-tier autonomy: an explicit commitment the operator
// owes is opened without asking, and everything that changes the deal's
// standing is only ever PROPOSED.
// The filed-capture marker: key carries the fingerprint, reason carries the
// filing moment and the first note id (so an undo can find and clear it).
async function stampPasteMark(pasteKey: string, firstNoteId: string) {
  const reason = `${new Date().toISOString()}·${firstNoteId}`;
  // Verify after write: a marker that silently fails to land lets the same
  // capture file twice (it happened — 2026-08-13). Two attempts, each read
  // back; still fail-open after that, because the marker is a guard, never
  // a gate — the filing already succeeded.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await getPrisma().accountDisposition.upsert({
        where: { accountId: pasteKey },
        create: { accountId: pasteKey, status: "filed", reason },
        update: { status: "filed", reason },
      });
      const check = await getPrisma().accountDisposition.findUnique({
        where: { accountId: pasteKey },
        select: { status: true },
      });
      if (check?.status === "filed") return;
    } catch {
      // retry once, then let it go
    }
  }
}

// A disputed verdict as the receipt roomPaste hands back: nothing filed,
// nothing opened, the dispute carried for the doors with its rung and its
// reason (D9 as amended 2026-10-05). Null when there is no verdict, so a
// rung that cleared reads as nothing to return.
function refusal(verdict: GuardVerdict | null, how: string) {
  if (!verdict) return null;
  return {
    ok: false as const,
    filed: 0 as const,
    how,
    mismatch: {
      claim: verdict.claim,
      bound: verdict.bound,
      why: verdict.why,
      boundWhy: verdict.boundWhy,
      rung: verdict.rung,
      reason: verdict.reason,
    },
    reason: verdict.reason,
  };
}

export async function roomPaste(
  accountId: string,
  raw: string,
  // The door the capture came through stamps every row the filing writes
  // (P3): the Chute says "chute"; a paste or file on the account's own row
  // is the Drop, the default. `windows` carries what a reader cut before the
  // text arrived — the transcriber's, the document's — so the Filing row
  // and the receipt hold every window (D4).
  opts?: { force?: boolean; door?: Door; windows?: Window[] },
): Promise<{
  ok: boolean;
  filed: number;
  how: string;
  reason?: string;
  noteIds?: string[];
  // The Filing row every row and todo of this filing links to (§2.1).
  filingId?: string;
  // Every window that cut something (D4), for the receipt.
  windows?: Window[];
  // Whether the duplicate check ran, or failed open (D7).
  dupeCheck?: DupeCheck;
  // The actions the read opened, by id: the undo's other reach.
  todoIds?: string[];
  // The model's judgment fanned out (actions, asks, lessons, outcome),
  // whichever reader filed the entries. `how` is the entries' provenance
  // alone: a model read that found no dated entries hands the record to the
  // rules and keeps its judgment (decided 2026-09-24, audit pass 1 bug 5).
  judged?: boolean;
  // What the read did beyond filing the record:
  opened?: { id: string; text: string }[]; // auto-created actions (undo one by one)
  asks?: number; // new STILL UNKNOWN questions queued
  learned?: number; // market facts + lessons filed to the playbook
  outcome?: { status: "lost" | "won"; phrase: string } | null;
  // The misfile guard: the capture reads like another account. `rung` says
  // which rung objected — the text's own evidence before the read, or the
  // read's claim after it — and `reason` is that rung's sentence, nine
  // words or fewer (D9 as amended 2026-10-05); the doors keep `why` and
  // `boundWhy` as the evidence behind it.
  mismatch?: {
    claim: string;
    bound: string;
    why?: string;
    boundWhy?: string;
    rung?: "text" | "read";
    reason?: string;
  };
  readFailed?: boolean; // the read errored; the rule parser filed the record
  // The duplicate guard: this exact capture already filed to this account.
  duplicate?: boolean;
  // A call transcript's full text was archived alongside the read's entries.
  archived?: boolean;
}> {
  const acct = bindAccountId(accountId, peos);
  const door: Door = opts?.door ?? "drop";
  const rawText = typeof raw === "string" ? raw.trim() : "";
  // The capture's true dialect travels into the head token and source column —
  // an Outlook thread must never masquerade as Salesforce activity. The head
  // found rides to the source column too: a spreadsheet, a document and a
  // typed note keep the SF token and say what they were in source.
  const { dialect, head: sniffedHead } = sniffHead(rawText);
  // Only the model's read is windowed (D4): head-keep suits newest-first
  // captures (SF, Outlook); a call transcript gets the tape's far higher
  // ceiling, because the decisions live at the END of the call (src/lib/
  // ingest/windows.ts). If a monster paste ever exceeds its window, tell the
  // model so instead of lying by omission — the note is model-facing. Every
  // window that cut something rides to the Filing row and the receipt, the
  // reader's own windows first.
  const readCut = cut(
    "the paste",
    rawText,
    dialect === "CT" ? READ_WINDOW_TAPE : READ_WINDOW,
  );
  const text = readCut.window
    ? `${readCut.text}\n[NOTE: paste truncated — ${rawText.length - readCut.window.read} more characters omitted]`
    : readCut.text;
  const windows: Window[] = [...(opts?.windows ?? [])];
  if (readCut.window) windows.push(readCut.window);
  if (!acct)
    return {
      ok: false,
      filed: 0,
      how: "",
      reason: "That row isn't bound to a known account.",
    };
  if (text.length < TEXT_FLOOR)
    return { ok: false, filed: 0, how: "", reason: "Paste something first." };
  if (!(await requireWrite()))
    return { ok: false, filed: 0, how: "", reason: "Read-only session." };

  // The duplicate guard — app-wide, since every door (row paste, the Drop,
  // the Chute) files through here. The same capture filed to the same account
  // twice is refused BEFORE any read spends a cent. A guard that errors never
  // blocks a filing — it fails open, and the Filing row and the receipt say
  // so (ruled 2026-09-25, D7).
  const fingerprint = pasteFingerprint(rawText);
  const pasteKey = `pastehash:${acct.id}:${fingerprint}`.slice(0, 191);
  let dupeCheck: DupeCheck = "ran";
  try {
    const prior = await getPrisma().accountDisposition.findUnique({
      where: { accountId: pasteKey },
    });
    if (prior) {
      const at = Date.parse((prior.reason ?? "").split("·")[0] ?? "");
      const when = Number.isNaN(at)
        ? ""
        : ` Filed ${new Date(at).toLocaleDateString("en-US", {
            month: "numeric",
            day: "numeric",
            timeZone: "America/Chicago",
          })}.`;
      return {
        ok: false,
        filed: 0,
        how: "",
        duplicate: true,
        reason: `Already on file.${when} Nothing filed twice.`,
      };
    }
  } catch {
    // guard unavailable — file anyway
    dupeCheck = "skipped";
  }

  // The misfile guard's FIRST rung runs before the read spends a cent. The
  // evidence in the text — a known address, a company domain, a person the
  // book binds to one account — needs no model at all, so a capture dropped
  // on the wrong row is refused for free rather than after a full read
  // (decreed 2026-09-04). The read's own company claim is judged after,
  // below, once there is a claim to judge. A filing may be disputed twice,
  // each time with a reason of nine words or fewer (D9 as amended
  // 2026-10-05); this rung's reason is built from the rule's own why, so a
  // keyless session gets this rung alone, as before. Both rungs read the
  // joined roster — the book's signals and the record's actors and
  // recipients (C2) — read once here on the server (D12).
  const roster = await joinedRoster();
  if (!opts?.force) {
    const refused = refusal(
      guardPlan({
        text: rawText,
        claim: "",
        bound: { id: acct.id, name: acct.name },
        roster,
      }).text,
      "",
    );
    if (refused) return refused;
  }

  const now = new Date();
  let read: Awaited<ReturnType<typeof aiCleanTimeline>> | null = null;
  let entries: Awaited<ReturnType<typeof aiCleanTimeline>>["entries"] = [];
  let how = "rules";
  // A read that fails degrades to the rule parser rather than losing the
  // operator's text — but it says so, because a paste filed WITHOUT the read is
  // a paste that opened no actions and asked no questions.
  let readFailed = false;
  if (!aiCleanAvailable()) readFailed = true;
  if (aiCleanAvailable()) {
    try {
      read = await aiCleanTimeline(text, now);
      entries = read.entries;
      how = "ai";
    } catch {
      read = null;
      entries = [];
      readFailed = true;
    }
  }
  if (entries.length === 0) {
    entries = dropNoiseEntries(parseSfTimeline(text));
    how = how === "ai" ? "rules" : how;
  }
  // The rules reader (founder-decreed 2026-08-21): when the deep read is
  // down and the SF parser finds nothing, a Teams chat or Outlook thread
  // still parses deterministically — real actors, real dates, real record
  // lines. The deep intelligence (commitments, asks, lessons) waits for the
  // reader; the receipt says so.
  let liveDialect = dialect;
  if (dialect !== "CT" && how !== "ai") {
    // The SF anchor grammar can fabricate one stamp-less garbage entry from
    // a chat line ("Talk to Chassie") — a stamped rules read outranks it
    // (refuted 2026-08-22). A TEAMS THREAD paste reads chat-first so a
    // quoted email inside it never swallows the conversation.
    const stampless =
      entries.length > 0 && entries.every((e) => !e.dayIso && !e.timeLabel);
    if (entries.length === 0 || (dialect === "SF" && stampless)) {
      const rr = rulesRead(text, now, dialect === "TM" ? "TM" : "");
      if (rr && (entries.length === 0 || rr.entries.length >= 2)) {
        entries = rr.entries;
        if (dialect === "SF") liveDialect = rr.dialect;
        how = "rules";
      }
    }
  }

  // The misfile guard's second rung, after the read: the company the read
  // names, judged when the row has nothing of its own to stand on. It exists
  // beside the first because a call transcript names no company at all, and
  // the old guard read the model's silence as consent (the Simploy call
  // filed to Regis, 2026-09-03). Cheap to obey, expensive to skip — a paste
  // filed to the wrong account poisons two deals at once. When this rung
  // disputes, the model reads both accounts' page data and the web and says
  // whether the two are the same company under another name: when they are,
  // the warning withdraws and the filing proceeds; when they are not, its
  // reason is the verdict's; when it has no answer, the rule's reason stands
  // (D9 as amended 2026-10-05; the founder's answer to §7 item 3). The call
  // runs only here, never on a filing the rule accepts. A dispute holds the
  // filing until the operator picks. With force no rung runs — the pick
  // never re-judges (D5) — and the read above ran again all the same, to be
  // sure (§7 item 4).
  const plan = guardPlan({
    force: Boolean(opts?.force),
    text: rawText,
    claim: read?.accountName ?? "",
    bound: { id: acct.id, name: acct.name },
    roster,
  });
  const disputed = plan.read
    ? await readRungVerdict(
        plan.read,
        { head: rawText.split("\n")[0] ?? "", excerpt: rawText.slice(0, EXCERPT_CAP) },
        { id: acct.id, name: acct.name },
      )
    : null;
  const verdict = refusal(disputed, how) ?? ({ ok: true } as const);
  if (!verdict.ok) {
    return {
      ok: false,
      filed: 0,
      how,
      mismatch: verdict.mismatch,
      reason: verdict.reason,
    };
  }
  // The day the capture says it was recorded, at noon UTC so day-math is
  // stable across timezones — the same convention the email path uses for its
  // activity dates. Undefined when the capture carries no date, and then the
  // DB stamps the filing moment as before.
  const recordedAt = (): Date | undefined => {
    const day = transcriptRecordedDay(rawText);
    return day ? new Date(`${day}T12:00:00Z`) : undefined;
  };

  // The Filing row (§2.1): written once every refusal is behind us and
  // before the first row it links, so a refused capture leaves no row and a
  // filed one is reachable by one id. It carries the sanitized read (null on
  // a keyless filing), every window that cut something (D4), the duplicate
  // check's outcome (D7) and the capture's own day when its head names one.
  // A database without the table answers null and the rows file unlinked.
  let filingId: string | undefined;
  const writeFiling = async (filingHow: FilingHow) => {
    const f = await fileFiling({
      accountId: acct.id,
      fingerprint,
      door,
      dialect,
      how: filingHow,
      read,
      windows,
      dupeCheck,
      filedAt: recordedAt() ?? now,
    });
    filingId = f?.id;
  };

  // The transcript archive — a call's full conversation, kept whole behind
  // one head line. The registers show the head line only; the full text sits
  // under the fold, searchable and citable, never spelled out on arrival.
  // Whole at any size (D4): the read is windowed, the note never is.
  const archiveNote = async (): Promise<string> => {
    // The tape's own head line, "CALL TRANSCRIPT — <label>", names the archive.
    const tapeLabel = new RegExp(`^${HEADS.call}\\s*—\\s*(.+)$`, "m");
    const label =
      tapeLabel.exec(rawText.split("\n")[0] ?? "")?.[1] ?? "filed from the room";
    // A call is filed at the day it HAPPENED, never the day it was dropped.
    // The email path has always done this; the transcript path never did, so a
    // call dropped two days late told the room "you met today" — and the recap
    // rule reads that clock (2026-08-29).
    const at = recordedAt();
    const whole = redactMoney(cleanSfPaste(rawText));
    const voices = new Set(
      whole
        .split("\n")
        .map((l) => /^([^:]{2,30}):\s/.exec(l)?.[1])
        .filter(Boolean),
    ).size;
    const n = await createAccountNoteRow({
      accountId: acct.id,
      kind: "account",
      body: `☰ Call transcript — ${label}${voices > 1 ? ` · ${voices} voices` : ""} · full text under the fold\n${whole}`,
      door,
      lane: "mine",
      source: "transcript",
      at,
      filingId,
    });
    return n.id;
  };

  try {
    const noteIds: string[] = [];
    if (entries.length === 0) {
      if (dialect === "CT") {
        // A call with no read still keeps its whole conversation.
        await writeFiling("transcript");
        const id = await archiveNote();
        await stampPasteMark(pasteKey, id);
        return {
          ok: true,
          filed: 1,
          how: "transcript",
          noteIds: [id],
          archived: true,
          readFailed,
          filingId,
          windows,
          dupeCheck,
        };
      }
      // A capture with no entries files whole as one line (D4): the read was
      // windowed, the note is not, and the decisions at the end of an
      // oldest-first chat are kept with everything before them.
      const body = redactMoney(cleanSfPaste(rawText));
      if (!body)
        return { ok: false, filed: 0, how, reason: "Nothing recognizable to file." };
      await writeFiling("transcript");
      const n = await createAccountNoteRow({
        accountId: acct.id,
        kind: "account",
        body: `☰ transcript — filed from the room\n${body}`,
        door,
        lane: "mine",
        source: "transcript",
        at: recordedAt(),
        filingId,
      });
      await stampPasteMark(pasteKey, n.id);
      return {
        ok: true,
        filed: 1,
        how: "transcript",
        noteIds: [n.id],
        readFailed,
        filingId,
        windows,
        dupeCheck,
      };
    }
    await writeFiling(how === "ai" ? "ai" : "rules");
    let filed = 0;
    for (const e of entries.slice(0, ENTRY_CAP)) {
      const actors = actorsLine(e.from ?? "", e.to ?? "", e.others ?? 0);
      // The whole receiving side, which `actors` deliberately does not carry.
      const recipients = joinRecipients(e.recipients);
      const when = [e.dayLabel, e.timeLabel].filter(Boolean).join(" ");
      const glyph = e.kind === "task" ? "✔" : e.kind === "call" ? "☎" : "✉";
      const who = actors || "(unattributed)";
      const head = `${glyph} ${liveDialect} ${when || "activity"} — ${e.subject || "(no subject)"} · ${who}`;
      // File at the ACTIVITY's own date (noon UTC — stable across timezones);
      // no dayIso → the DB stamps the filing moment as before.
      const at = e.dayIso ? new Date(`${e.dayIso}T12:00:00Z`) : undefined;
      const n = await createAccountNoteRow({
        accountId: acct.id,
        kind: "account",
        body: scrubSecrets(redactMoney(e.body ? `${head}\n${e.body}` : head)).slice(
          0,
          4000,
        ),
        door,
        lane: laneFor(actors, `${e.subject ?? ""}\n${e.body ?? ""}`),
        actors,
        recipients,
        source: SOURCE_OF(liveDialect, sniffedHead, how),
        at,
        filingId,
      });
      noteIds.push(n.id);
      filed++;
    }
    // A call transcript keeps its whole conversation alongside the read's
    // entries — the entries are the judgment, the archive is the evidence.
    let archived = false;
    if (dialect === "CT") {
      noteIds.push(await archiveNote());
      archived = true;
    }
    if (noteIds[0]) await stampPasteMark(pasteKey, noteIds[0]);
    const absorbed: Awaited<ReturnType<typeof absorbRead>> = read
      ? await absorbRead(read, { id: acct.id, name: acct.name }, now, door, filingId)
      : { opened: [], loops: [], asks: 0, learned: 0, outcome: null, noteIds: [] };
    // Everything the read fanned out rides in the receipt, so the undo can
    // take back the whole filing: the asks, playbook lines and outcome marker
    // by note id (in their own namespaces), the actions and their loops by
    // todo id. A loop is the undo's reach and nothing else's yet: the
    // receipt's opened chips are the operator's actions alone (D10; the
    // loop's seat is the face's, the plan's §5.4).
    const { noteIds: fanoutIds, loops, ...fanout } = absorbed;
    noteIds.push(...fanoutIds);
    return {
      ok: true,
      filed,
      how,
      noteIds,
      readFailed,
      archived,
      todoIds: [...fanout.opened.map((o) => o.id), ...loops.map((l) => l.id)],
      judged: read !== null,
      filingId,
      windows,
      dupeCheck,
      ...fanout,
    };
  } catch {
    return {
      ok: false,
      filed: 0,
      how,
      reason: "Filing failed partway. Check the account page.",
    };
  }
}

// ✕ on ONE auto-created action. The paste's own undo removes the record it
// filed; the work it opened is retired one commitment at a time, because a
// paste that got three actions right and one wrong should keep the three.
export async function roomActionUndo(
  accountId: string,
  todoId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  const id = typeof todoId === "string" ? todoId.trim().slice(0, 40) : "";
  if (!acct || !id) return { ok: false, reason: "Not a bound row." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    const prisma = getPrisma();
    const t = await prisma.todo.findUnique({
      where: { id },
      select: { accountId: true, done: true, body: true },
    });
    if (!t) return { ok: false, reason: "That action is already gone." };
    if ((t.accountId ?? "") !== acct.id)
      return { ok: false, reason: "That action belongs to a different account." };
    // Taking back a bad read is one thing; erasing work the operator has since
    // finished is another. Once it's done, the record owns it.
    if (t.done || splitTags(t.body).tags.doneAt)
      return { ok: false, reason: "That one's already closed. Undo it on the row." };
    await prisma.todo.delete({ where: { id } });
    // A completion line the row filed before it was reopened goes with it.
    await undoCompletions(acct.id, [id]);
    return { ok: true };
  } catch {
    return { ok: false, reason: "The undo didn't take. Try again." };
  }
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

// ↩ on a paste receipt — take back the WHOLE filing, and only that filing:
// the record entries, the transcript archive and the outcome marker on this
// account, the asks in its gaps: namespace, the playbook lines whose tail
// names it, and the actions the read opened. Every delete is scoped to the
// ids the paste returned AND to this account or its own namespaces, so a
// stale or forged id list can't reach anyone else's record.
export async function roomPasteUndo(
  accountId: string,
  noteIds: string[],
  todoIds: string[] = [],
  // The Filing row (§2.1): when the caller names it, every row and todo
  // still carrying its id goes with it, and then the row itself. The id
  // lists stay the undo's reach until the doors send the id (slice 8).
  filingId?: string,
): Promise<{ ok: boolean; removed: number; retired: number; reason?: string }> {
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

    const notes = await prisma.accountNote
      .findMany({
        where: { accountId: acct.id },
        orderBy: { createdAt: "desc" },
        take: 60,
        select: { body: true, actors: true },
      })
      .catch(() => [] as { body: string; actors: string }[]);
    const people = [
      ...new Set(
        notes
          .flatMap((n) => (n.actors ?? "").split(/→|\+|,/))
          .map((x) => x.replace(/\s*\d+\s*(others?)?/gi, "").trim())
          .filter((x) => x.length > 2 && !MINE_RE.test(x)),
      ),
    ].slice(0, 6);

    // The book knows their site; bindAccountId only carries id + name, so read
    // the fuller record for the one field the pass wants.
    const site = peos.find((p) => p.id === acct.id)?.website ?? "";
    const finding = await runResearch({
      accountName: acct.name,
      site: site || undefined,
      people,
      countries: previous?.countries ?? [],
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
    const key = `hide:note:${id}`.slice(0, 191);
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
    const key = `hide:note:${seat.id}`.slice(0, 191);
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
      const parsed = seat ? parseSeatBody(seat.body) : null;
      if (!seat || !parsed) return { ok: false, reason: "That item is gone." };
      const act = next.replace(/·/g, "-").slice(0, 200);
      await prisma.accountNote.update({
        where: { id },
        data: { body: renderSeatBody({ act, term: parsed.term, day: parsed.day }) },
      });
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
    const marker = splitMarker(t.body);
    const { tags } = splitTags(marker.text);
    // Hand-typed grammar must never masquerade as real markers.
    const clean = next
      .replace(/[⟦⟧⟪⟫]|[⇢⚑]\s*\[/g, " ")
      .replace(/[ \t]+/g, " ")
      .trim();
    let body = withTags(clean, tags);
    if (marker.refs) body = withMarker(body, marker.refs, marker.label);
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
    // The transcriber's window rides back with the text (D4): the door hands
    // it to roomPaste, which records it on the Filing row and the receipt.
    const c = cut("the transcription", text, TRANSCRIBE_WINDOW);
    return { ok: true, text: c.text, window: c.window };
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
