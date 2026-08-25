"use server";

// Operating Room actions. Every one is BOUND: the account id is validated
// against the book before anything writes, so a row can only ever file to
// itself. These return values (the room updates in place) instead of
// redirecting.

import { rulesRead } from "@/lib/intel/rules-read";
import { claudeClient, claudeAvailable } from "@/lib/claude/health";
import { revalidatePath } from "next/cache";
import { getAppAccess } from "@/lib/auth";
import { hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import { digestFor, digestForCardName } from "@/lib/intel/digest";
import {
  accountMatches,
  aiCleanAvailable,
  aiCleanTimeline,
  dropNoiseEntries,
} from "@/lib/intel/ai-clean";
import {
  PLAYBOOK_LESSONS,
  PLAYBOOK_MARKET,
  filePlaybook,
  knowledgeKey,
  parsePlaybookBody,
} from "@/lib/playbook/store";
import { fileGaps, gapDismissKey, gapNs, parseGapBody } from "@/lib/room/gaps";
import { actionBody, splitFallback, urgencyForDue } from "@/lib/room/deliverables";
import { outcomeMarkBody } from "@/lib/room/loss";
import { MINE_RE, actorsLine, laneFor } from "@/lib/intel/provenance";
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
import { corpusFor, extractDealIntel } from "@/lib/intel/extract";
import { cleanSfPaste, parseSfTimeline, scrubSecrets } from "@/lib/sf-timeline";
import { pasteFingerprint } from "@/lib/paste-files";
import { redactMoney } from "@/lib/intel/lexicon";
import {
  bindAccountId,
  cleanLogBody,
  moveDoneKey,
  MOVE_DONE_STATUS,
} from "@/lib/room/bind";
import { createAccountNoteRow } from "@/lib/notes/write";
import { applyStepComplete } from "@/lib/dashboard/complete";
import { mirrorNoteToSheet } from "@/lib/today/mirror";
import { OUTCOME_LABEL, writeOutcome, type OutcomeStatus } from "@/lib/dashboard/outcome";
import type { DashNodeKey } from "@/lib/dashboard/stages";

async function requireWrite() {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

function refresh() {
  revalidatePath("/room");
  revalidatePath("/accounts");
  revalidatePath("/today");
  revalidatePath("/groundwork");
  revalidatePath("/");
}

// Type a line, press Enter → one note on THIS account, everywhere. Returns
// the ids the receipt needs: the note row and its sheet mirror, so ↩ undo
// and "make it an action →" can act on exactly what this keystroke created.
export async function roomLog(
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
      lane: "mine",
      source: "room",
    });
    const todoId = await mirrorNoteToSheet(
      `✎ ${body}`,
      { accountNoteIds: [n.id], partnerNoteIds: [] },
      acct.name,
    );
    refresh();
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

export async function roomPaste(
  accountId: string,
  raw: string,
  opts?: { force?: boolean },
): Promise<{
  ok: boolean;
  filed: number;
  how: string;
  reason?: string;
  noteIds?: string[];
  // What the read did beyond filing the record:
  opened?: { id: string; text: string }[]; // auto-created actions (undo one by one)
  asks?: number; // new STILL UNKNOWN questions queued
  learned?: number; // market facts + lessons filed to the playbook
  outcome?: { status: "lost" | "won"; phrase: string } | null;
  // The misfile guard: the read believes this belongs somewhere else.
  mismatch?: { claim: string; bound: string };
  readFailed?: boolean; // the read errored; the rule parser filed the record
  // The duplicate guard: this exact capture already filed to this account.
  duplicate?: boolean;
  // A call transcript's full text was archived alongside the read's entries.
  archived?: boolean;
}> {
  const acct = bindAccountId(accountId, peos);
  const rawText = typeof raw === "string" ? raw.trim() : "";
  // The capture's true dialect travels into the head token and source column —
  // an Outlook thread must never masquerade as Salesforce activity.
  const dialect = /^OUTLOOK THREAD\b/.test(rawText)
    ? "OL"
    : /^TEAMS THREAD\b/.test(rawText)
      ? "TM"
      : /^CALL TRANSCRIPT\b/.test(rawText)
        ? "CT"
        : /^SALESNAV\b/.test(rawText)
          ? "SN"
          : "SF";
  // Head-keep suits newest-first captures (SF, Outlook). A call transcript is
  // different: the decisions live at the END of the call and the whole
  // conversation is the intelligence, so transcripts get a far higher ceiling
  // (a three-hour call still fits). If a monster paste ever exceeds its cap,
  // tell the model so instead of lying by omission.
  const cap = dialect === "CT" ? 400000 : 60000;
  const over = rawText.length - cap;
  const text =
    over > 0
      ? `${rawText.slice(0, cap)}\n[NOTE: paste truncated — ${over} more characters omitted]`
      : rawText;
  if (!acct)
    return {
      ok: false,
      filed: 0,
      how: "",
      reason: "That row isn't bound to a known account.",
    };
  if (text.length < 20)
    return { ok: false, filed: 0, how: "", reason: "Paste something first." };
  if (!(await requireWrite()))
    return { ok: false, filed: 0, how: "", reason: "Read-only session." };

  // The duplicate guard — app-wide, since every door (row paste, the Drop,
  // the Chute) files through here. The same capture filed to the same account
  // twice is refused BEFORE any read spends a cent. A guard that errors never
  // blocks a filing.
  const pasteKey = `pastehash:${acct.id}:${pasteFingerprint(rawText)}`.slice(0, 191);
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

  // The misfile guard. The read names the company the paste is ABOUT; if that
  // disagrees with the row it was dropped on, nothing is written until the
  // operator says file it anyway. Cheap to obey, expensive to skip — a paste
  // filed to the wrong account poisons two deals at once.
  if (read && !opts?.force && !accountMatches(read.accountName, acct.name)) {
    return {
      ok: false,
      filed: 0,
      how,
      mismatch: { claim: read.accountName, bound: acct.name },
      reason: `This reads like ${read.accountName}, not ${acct.name}.`,
    };
  }

  // The transcript archive — a call's full conversation, kept whole behind
  // one head line. The registers show the head line only; the full text sits
  // under the fold, searchable and citable, never spelled out on arrival.
  const archiveNote = async (): Promise<string> => {
    const label =
      /^CALL TRANSCRIPT\s*—\s*(.+)$/m.exec(rawText.split("\n")[0] ?? "")?.[1] ??
      "filed from the room";
    const whole = redactMoney(cleanSfPaste(text)).slice(0, 150000);
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
      lane: "mine",
      source: "transcript",
    });
    return n.id;
  };

  try {
    const noteIds: string[] = [];
    if (entries.length === 0) {
      if (dialect === "CT") {
        // A call with no read still keeps its whole conversation.
        const id = await archiveNote();
        await stampPasteMark(pasteKey, id);
        refresh();
        return {
          ok: true,
          filed: 1,
          how: "transcript",
          noteIds: [id],
          archived: true,
          readFailed,
        };
      }
      // Transcripts and Teams chats run OLDEST-first — keep the TAIL, where
      // the decisions and owed items live, and say when the head was cut.
      const whole = redactMoney(cleanSfPaste(text));
      const body =
        whole.length > 6000
          ? `[earlier portion trimmed: ${whole.length - 6000} characters]\n…${whole.slice(-6000)}`
          : whole;
      if (!body)
        return { ok: false, filed: 0, how, reason: "Nothing recognizable to file." };
      const n = await createAccountNoteRow({
        accountId: acct.id,
        kind: "account",
        body: `☰ transcript — filed from the room\n${body}`,
        lane: "mine",
        source: "transcript",
      });
      await stampPasteMark(pasteKey, n.id);
      refresh();
      return { ok: true, filed: 1, how: "transcript", noteIds: [n.id], readFailed };
    }
    let filed = 0;
    for (const e of entries.slice(0, 40)) {
      const actors = actorsLine(e.from ?? "", e.to ?? "", e.others ?? 0);
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
        lane: laneFor(actors, `${e.subject ?? ""}\n${e.body ?? ""}`),
        actors,
        source: `${
          liveDialect === "OL"
            ? "outlook"
            : liveDialect === "TM"
              ? "teams"
              : liveDialect === "CT"
                ? "call"
                : liveDialect === "SN"
                  ? "salesnav"
                  : "sf"
        }${how === "ai" ? "-ai" : ""}`,
        at,
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
    const absorbed = read
      ? await absorbRead(read, { id: acct.id, name: acct.name }, now)
      : { opened: [], asks: 0, learned: 0, outcome: null };
    refresh();
    return { ok: true, filed, how, noteIds, readFailed, archived, ...absorbed };
  } catch {
    return {
      ok: false,
      filed: 0,
      how,
      reason: "Filing failed partway. Check the account page.",
    };
  }
}

// Everything the read produced that ISN'T a record entry. Kept separate from
// the filing loop so a failure here can never lose the record — each limb
// swallows its own errors and reports what it managed.
async function absorbRead(
  read: Awaited<ReturnType<typeof aiCleanTimeline>>,
  acct: { id: string; name: string },
  now: Date,
): Promise<{
  opened: { id: string; text: string }[];
  asks: number;
  learned: number;
  outcome: { status: "lost" | "won"; phrase: string } | null;
}> {
  const prisma = getPrisma();
  const stamp = now.toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "numeric",
    day: "numeric",
  });

  // 1. Commitments the operator owes become real work, one row each, so each
  // one can be undone on its own. What THEY owe stays in the record — the
  // owed-to-you read already surfaces those as suggestions.
  const opened: { id: string; text: string }[] = [];
  const mine = read.actions.filter((a) => a.owner === "me");
  if (mine.length) {
    const openBodies = await prisma.todo
      .findMany({
        where: { accountId: acct.id, done: false },
        select: { body: true },
      })
      .catch(() => [] as { body: string }[]);
    // Compare commitment to commitment. The STORED body carries the fallback and
    // the "· from M/D paste" provenance, so hashing it raw never matches the
    // model's bare text and every re-paste opens the same work again.
    const commitmentKey = (body: string) =>
      knowledgeKey(
        splitFallback(visibleText(body)).text.replace(/\s+·\s+from\s.*$/i, ""),
      );
    const seen = new Set(openBodies.map((t) => commitmentKey(t.body)));
    let top =
      (
        await prisma.todo
          .findFirst({ orderBy: { position: "desc" }, select: { position: true } })
          .catch(() => null)
      )?.position ?? -1;
    for (const a of mine) {
      const body = actionBody(a.text, a.fallback, `from ${stamp} paste`);
      const key = knowledgeKey(a.text);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      try {
        const t = await prisma.todo.create({
          data: {
            body: withTags(body, {
              ...NO_TAGS,
              kind: "action",
              urgency: urgencyForDue(a.due, now),
              // The wall itself — the sheet reads this to know the date passed.
              date: a.due,
            }),
            done: false,
            position: ++top,
            accountId: acct.id,
            remindAt: a.due ? new Date(`${a.due}T12:00:00Z`) : new Date(),
          },
        });
        opened.push({ id: t.id, text: a.text });
      } catch {
        // One commitment that won't open never costs the others.
      }
    }
  }

  // 2. The asks — questions the record still can't answer for THIS deal.
  let asks = 0;
  if (read.gaps.length) {
    const priorAsks = await prisma.accountNote
      .findMany({ where: { accountId: gapNs(acct.id) }, select: { body: true } })
      .catch(() => [] as { body: string }[]);
    const known = new Set(priorAsks.map((r) => knowledgeKey(parseGapBody(r.body))));
    asks = (await fileGaps({ accountId: acct.id, questions: read.gaps, known })).length;
  }

  // 3. The playbook — knowledge that outlives the deal it came from. This is
  // the cure for knowledge trapped per account: filed to a namespace, read by
  // every account.
  let learned = 0;
  const market = read.competitorIntel.map((c) => ({ text: c.fact, who: c.who }));
  const lessons = read.lessons.map((l) => ({ text: l, who: "" }));
  for (const [kind, items] of [
    ["market", market],
    ["lesson", lessons],
  ] as const) {
    if (!items.length) continue;
    const ns = kind === "market" ? PLAYBOOK_MARKET : PLAYBOOK_LESSONS;
    const prior = await prisma.accountNote
      .findMany({ where: { accountId: ns }, select: { body: true } })
      .catch(() => [] as { body: string }[]);
    const known = new Set(prior.map((r) => knowledgeKey(parsePlaybookBody(r.body).text)));
    learned += (
      await filePlaybook({
        kind,
        items,
        accountId: acct.id,
        accountName: acct.name,
        known,
      })
    ).length;
  }

  // 4. The outcome. A closed deal is the biggest state change the app can
  // make, so the read only files the marker that makes the row say it — the
  // operator's click is what actually closes the card.
  let outcome: { status: "lost" | "won"; phrase: string } | null = null;
  if (read.outcome.status === "lost" || read.outcome.status === "won") {
    outcome = { status: read.outcome.status, phrase: read.outcome.phrase };
    try {
      await createAccountNoteRow({
        accountId: acct.id,
        kind: "account",
        body: outcomeMarkBody(read.outcome.status, read.outcome.phrase),
        lane: "mine",
        source: "outcome",
      });
    } catch {
      outcome = null;
    }
  }

  return { opened, asks, learned, outcome };
}

// The completion line, filed to the account's own history exactly once. Keyed
// by todo id so done → undo → done can't stack duplicates on the record.
async function fileCompletion(accountId: string, todoId: string, body: string) {
  const prisma = getPrisma();
  const key = `done-filed:${todoId}`.slice(0, 191);
  try {
    const already = await prisma.accountDisposition.findUnique({
      where: { accountId: key },
      select: { accountId: true },
    });
    if (already) return;
    const text = splitFallback(visibleText(body)).text.slice(0, 300);
    if (!text) return;
    const day = new Date().toLocaleDateString("en-US", {
      timeZone: "America/Chicago",
      month: "numeric",
      day: "numeric",
    });
    await createAccountNoteRow({
      accountId,
      kind: "account",
      body: `✓ ${text} — done ${day}`,
      lane: "mine",
      source: "done",
    });
    await prisma.accountDisposition.upsert({
      where: { accountId: key },
      create: { accountId: key, status: "parked", reason: "completion filed" },
      update: { status: "parked", reason: "completion filed" },
    });
  } catch {
    // The close still stands even if its history line doesn't land.
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
    refresh();
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
    refresh();
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
    refresh();
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
  NO_TAGS,
  splitMarker,
  splitTags,
  visibleText,
  withMarker,
  withTags,
  type NoteTags,
} from "@/lib/today/route-notes";
import { routeSheetNote } from "@/app/today/sheet-actions";

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
    const prisma = getPrisma();
    const top = await prisma.todo.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });
    const t = await prisma.todo.create({
      data: {
        body: withTags(parsed.body, { ...NO_TAGS, kind: "action", urgency }),
        done: false,
        position: (top?.position ?? -1) + 1,
        accountId: acct.id,
        remindAt:
          parsed.kind === "scheduled"
            ? new Date(nextRemindIso(parsed.remindDay, new Date()))
            : new Date(),
      },
    });
    refresh();
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
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, reason: "The undo didn't take. Try again." };
  }
}

// ↩ on a paste receipt — remove the WHOLE batch this paste filed, and only
// that batch: the delete is scoped to the ids the paste returned AND to this
// account, so a stale or forged id list can't reach anyone else's record.
export async function roomPasteUndo(
  accountId: string,
  noteIds: string[],
): Promise<{ ok: boolean; removed: number; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  const ids = Array.isArray(noteIds)
    ? noteIds
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 60)
    : [];
  if (!acct || ids.length === 0)
    return { ok: false, removed: 0, reason: "Nothing to undo." };
  if (!(await requireWrite()))
    return { ok: false, removed: 0, reason: "Read-only session." };
  try {
    const prisma = getPrisma();
    const r = await prisma.accountNote.deleteMany({
      where: { id: { in: ids }, accountId: acct.id },
    });
    // The duplicate guard's marker carries the paste's first note id — an
    // undone paste must be re-fileable, so the marker goes with the notes.
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
    refresh();
    return { ok: true, removed: r.count };
  } catch {
    return { ok: false, removed: 0, reason: "The undo didn't take. Try again." };
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
    refresh();
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
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, reason: "That didn't save. Try again." };
  }
}

// A closure recorded in error must be undoable — the card comes back to the
// board with its stage rail intact and the terminal stamp removed.
export async function roomReopen(
  accountId: string,
  cardId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const cid = typeof cardId === "string" ? cardId.trim().slice(0, 40) : "";
  if (!bindAccountId(accountId, peos) || !cid)
    return { ok: false, reason: "Not a bound row." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    const prisma = getPrisma();
    const card = await prisma.dashCard.findUnique({
      where: { id: cid },
      select: { notes: true },
    });
    if (!card) return { ok: false, reason: "That card is gone." };
    await prisma.dashCard.update({
      where: { id: cid },
      data: {
        archived: false,
        notes: writeOutcome(card.notes, null),
      },
    });
    refresh();
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
      lane: "background",
      source: "research",
    });
    // The readable half also lands on the account itself, so the record shows
    // that the research happened and the corpus can read the findings.
    await createAccountNoteRow({
      accountId: acct.id,
      kind: "account",
      body: researchBody(finding, now).split("\n⟪")[0],
      lane: "background",
      source: "research",
    }).catch(() => null);

    // Anything the pass says is worth asking joins the carousel.
    const priorAsks = await prisma.accountNote
      .findMany({ where: { accountId: gapNs(acct.id) }, select: { body: true } })
      .catch(() => [] as { body: string }[]);
    await fileGaps({
      accountId: acct.id,
      questions: finding.asks,
      known: new Set(priorAsks.map((r) => knowledgeKey(parseGapBody(r.body)))),
    });

    refresh();
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
    const [asks, research, lessons, market, scen, notes] = await Promise.all([
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
      prisma.accountNote
        .findMany({
          where: { accountId: acct.id },
          orderBy: { createdAt: "desc" },
          take: 40,
          select: { body: true, actors: true, createdAt: true, kind: true },
        })
        .catch(
          () => [] as { body: string; actors: string; createdAt: Date; kind: string }[],
        ),
    ]);

    const found = research[0] ? parseResearchBody(research[0].body) : null;
    const intel = extractDealIntel(
      corpusFor(acct.id, acct.name, {
        acctNotes: notes.map((n, i) => ({
          id: String(i),
          body: n.body,
          actors: n.actors ?? "",
          createdAt: n.createdAt.toISOString(),
          kind: n.kind,
        })),
      }),
      digestFor(acct.id) ?? digestForCardName(acct.name),
    );
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
    const added = await fileGaps({
      accountId: acct.id,
      questions: minted,
      known: new Set(asks.map((r) => knowledgeKey(parseGapBody(r.body)))),
    });
    refresh();
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
    refresh();
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
    refresh();
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
    const top = await prisma.todo.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });
    await prisma.todo.create({
      data: {
        body: withTags(body, { ...NO_TAGS, kind: "action" }),
        done: false,
        position: (top?.position ?? -1) + 1,
        accountId: acct.id,
        remindAt: new Date(),
      },
    });
    await prisma.accountDisposition
      .upsert({
        where: { accountId: k },
        create: { accountId: k, status: "parked", reason: "accepted" },
        update: { status: "parked", reason: "accepted" },
      })
      .catch(() => null);
    refresh();
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
    refresh();
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
    refresh();
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
    refresh();
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
      await patchRoomTodoTags(todoId, t.body, { kind: "action", doneAt: "", delay: "" });
      await prisma.todo.update({
        where: { id: todoId },
        data: { done: false, accountId: acct.id },
      });
      refresh();
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
    const top = await prisma.todo.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });
    await prisma.todo.create({
      data: {
        body: withTags(text, { ...NO_TAGS, kind: "action" }),
        done: false,
        position: (top?.position ?? -1) + 1,
        accountId: acct.id,
        remindAt: new Date(),
      },
    });
    refresh();
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
    if (!t) return { ok: false, reason: "That item is gone." };
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
        delay: "",
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
      revalidatePath("/archive");
    }
    refresh();
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
    if (!t) return { ok: false, reason: "That item is gone." };
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
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, reason: "The edit didn't save." };
  }
}

// The document transcriber — Claude reads a PDF or an image (a screenshot of
// an email, a chat, a whiteboard, a business card) to paste text the room's
// readers understand. An email thread comes back headed OUTLOOK THREAD, a
// chat as TEAMS THREAD, anything else as a plain transcript. The bytes never
// persist; only the filed entries do.
const IMAGE_MEDIA = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

async function transcribePdf(
  file: File,
): Promise<{ ok: boolean; text?: string; reason?: string }> {
  if (!claudeAvailable())
    return { ok: false, reason: "The reader is unreachable. Paste the text instead." };
  if (file.size > 8 * 1024 * 1024)
    return { ok: false, reason: "That file is over 8 MB. Export a smaller one." };
  const isImage = IMAGE_MEDIA.has(file.type);
  if (!isImage && file.type !== "application/pdf" && !/\.pdf$/i.test(file.name))
    return { ok: false, reason: "The reader takes PDFs and images here." };
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const imageMedia = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  try {
    const client = claudeClient({ timeout: 110_000, maxRetries: 1 });
    const res = await client.messages.create({
      model: "claude-opus-5",
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
              text: `Transcribe this ${isImage ? "image" : "document"} to plain text for a sales record. If it shows an email thread, start the output with "OUTLOOK THREAD — ${file.name}" and give each message its own From / To / Sent / Subject header block, newest first, with the message text under it. If it shows a chat, start with "TEAMS THREAD — ${file.name}" and keep speakers named inline. If it is a screenshot of anything else — a slide, a whiteboard, a card, handwriting — transcribe every readable word in reading order and describe only what is needed to make the text make sense. Output only the transcription.`,
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
    if (text.length < 20)
      return { ok: false, reason: "Nothing readable came back from the document." };
    return { ok: true, text: text.slice(0, 60000) };
  } catch {
    return { ok: false, reason: "The document read failed. Paste the text instead." };
  }
}

// The Drop's PDF reader — bound to the row the file was dropped on.
export async function roomReadPdf(
  accountId: string,
  formData: FormData,
): Promise<{ ok: boolean; text?: string; reason?: string }> {
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
): Promise<{ ok: boolean; text?: string; reason?: string }> {
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
  revalidatePath("/room");
  return { ok: true };
}
