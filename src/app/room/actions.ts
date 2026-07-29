"use server";

// Operating Room actions. Every one is BOUND: the account id is validated
// against the book before anything writes, so a row can only ever file to
// itself. These return values (the room updates in place) instead of
// redirecting.

import { revalidatePath } from "next/cache";
import { getAppAccess } from "@/lib/auth";
import { hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import { digestForCardName } from "@/lib/intel/digest";
import {
  aiCleanAvailable,
  aiCleanTimeline,
  dropNoiseEntries,
} from "@/lib/intel/ai-clean";
import { actorsLine, laneFor } from "@/lib/intel/provenance";
import { cleanSfPaste, parseSfTimeline, scrubSecrets } from "@/lib/sf-timeline";
import { redactMoney } from "@/lib/intel/lexicon";
import { bindAccountId, cleanLogBody } from "@/lib/room/bind";
import { createAccountNoteRow } from "@/lib/notes/write";
import { applyStepComplete } from "@/lib/dashboard/complete";
import { mirrorNoteToSheet } from "@/lib/today/mirror";
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
    return { ok: false, reason: "The note didn't save — try again." };
  }
}

// ⚡ paste → AI clean when configured (rule engine otherwise) → dated entries
// on THIS account; anything unparseable files whole as a transcript note.
export async function roomPaste(
  accountId: string,
  raw: string,
): Promise<{
  ok: boolean;
  filed: number;
  how: string;
  reason?: string;
  noteIds?: string[];
}> {
  const acct = bindAccountId(accountId, peos);
  const rawText = typeof raw === "string" ? raw.trim() : "";
  // The capture's true dialect travels into the head token and source column —
  // an Outlook thread must never masquerade as Salesforce activity.
  const dialect = /^OUTLOOK THREAD\b/.test(rawText) ? "OL" : "SF";
  // Head-keep suits newest-first captures (SF, Outlook). If a monster paste
  // ever exceeds the cap, tell the model so instead of lying by omission.
  const over = rawText.length - 60000;
  const text =
    over > 0
      ? `${rawText.slice(0, 60000)}\n[NOTE: paste truncated — ${over} more characters omitted]`
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

  let entries: Awaited<ReturnType<typeof aiCleanTimeline>>["entries"] = [];
  let how = "rules";
  if (aiCleanAvailable()) {
    try {
      entries = (await aiCleanTimeline(text, new Date())).entries;
      how = "ai";
    } catch {
      entries = [];
    }
  }
  if (entries.length === 0) {
    entries = dropNoiseEntries(parseSfTimeline(text));
    how = how === "ai" ? "rules" : how;
  }

  try {
    const noteIds: string[] = [];
    if (entries.length === 0) {
      // Transcripts and Teams chats run OLDEST-first — keep the TAIL, where
      // the decisions and owed items live, and say when the head was cut.
      const whole = redactMoney(cleanSfPaste(text));
      const body =
        whole.length > 6000
          ? `[earlier portion trimmed — ${whole.length - 6000} characters]\n…${whole.slice(-6000)}`
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
      refresh();
      return { ok: true, filed: 1, how: "transcript", noteIds: [n.id] };
    }
    let filed = 0;
    for (const e of entries.slice(0, 40)) {
      const actors = actorsLine(e.from ?? "", e.to ?? "", e.others ?? 0);
      const when = [e.dayLabel, e.timeLabel].filter(Boolean).join(" ");
      const glyph = e.kind === "task" ? "✔" : e.kind === "call" ? "☎" : "✉";
      const who = actors || "(unattributed)";
      const head = `${glyph} ${dialect} ${when || "activity"} — ${e.subject || "(no subject)"} · ${who}`;
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
        source: `${dialect === "OL" ? "outlook" : "sf"}${how === "ai" ? "-ai" : ""}`,
        at,
      });
      noteIds.push(n.id);
      filed++;
    }
    refresh();
    return { ok: true, filed, how, noteIds };
  } catch {
    return {
      ok: false,
      filed: 0,
      how,
      reason: "Filing failed partway — check the account page.",
    };
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
    return { ok: false, reason: "The close didn't save — try again." };
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
    return { ok: false, reason: "That didn't save — try again." };
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
    return { ok: false, reason: "The undo didn't take — try again." };
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
    const r = await getPrisma().accountNote.deleteMany({
      where: { id: { in: ids }, accountId: acct.id },
    });
    refresh();
    return { ok: true, removed: r.count };
  } catch {
    return { ok: false, removed: 0, reason: "The undo didn't take — try again." };
  }
}

// --- The loss read's two exits ----------------------------------------------
// The record suggested the deal is lost; the operator decides. Mark-it-lost
// archives the card and files the call; keep-salvaging retires THIS read
// (keyed to the triggering note — new loss evidence resurfaces it).
export async function roomMarkLost(
  accountId: string,
  cardId: string,
  noteId: string,
): Promise<{ ok: boolean; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  const cid = typeof cardId === "string" ? cardId.trim().slice(0, 40) : "";
  if (!cid) return { ok: false, reason: "Not a bound row." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    const prisma = getPrisma();
    const card = await prisma.dashCard.findUnique({
      where: { id: cid },
      select: { id: true, name: true },
    });
    if (!card) return { ok: false, reason: "That card is gone." };
    await prisma.dashCard.update({ where: { id: cid }, data: { archived: true } });
    if (acct) {
      await createAccountNoteRow({
        accountId: acct.id,
        kind: "account",
        body: `✓ Marked lost — retired from the board (the record's loss read, confirmed).`,
        lane: "mine",
        source: "room",
      }).catch(() => null);
    }
    // Quiet this read permanently for the archived card.
    const key = `loss-dismiss:${cid}:${(noteId ?? "").slice(0, 40)}`.slice(0, 191);
    await prisma.accountDisposition
      .upsert({
        where: { accountId: key },
        create: { accountId: key, status: "parked", reason: "marked lost" },
        update: { status: "parked", reason: "marked lost" },
      })
      .catch(() => null);
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, reason: "That didn't save — try again." };
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
    return { ok: false, reason: "That didn't save — try again." };
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
    return { ok: false, reason: "That didn't save — try again." };
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
    return { ok: false, reason: "That didn't save — try again." };
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
    const bare = clean.replace(/^[✉✓☰✎✔☎⚡▢]\s?/, "").trim();
    lines[0] = glyph ? `${glyph} ${bare}` : bare;
    await prisma.accountNote.update({
      where: { id },
      data: { body: lines.join("\n").slice(0, 8000) },
    });
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, reason: "The edit didn't save — try again." };
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
    return { ok: false, reason: "The delete didn't take — try again." };
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
    return { ok: false, reason: "That didn't save — try again." };
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
      await routeSheetNote(id, { accountId: acct.id }).catch(() => null);
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
    return { ok: false, reason: "That didn't save — try again." };
  }
}
