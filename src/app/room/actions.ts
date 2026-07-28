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
import { aiCleanAvailable, aiCleanTimeline } from "@/lib/intel/ai-clean";
import { actorsLine, laneFor } from "@/lib/intel/provenance";
import { cleanSfPaste, parseSfTimeline } from "@/lib/sf-timeline";
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

// Type a line, press Enter → one note on THIS account, everywhere.
export async function roomLog(
  accountId: string,
  text: string,
): Promise<{ ok: boolean; reason?: string }> {
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
    await mirrorNoteToSheet(
      `✎ ${body}`,
      { accountNoteIds: [n.id], partnerNoteIds: [] },
      acct.name,
    );
    refresh();
    return { ok: true };
  } catch {
    return { ok: false, reason: "The note didn't save — try again." };
  }
}

// ⚡ paste → AI clean when configured (rule engine otherwise) → dated entries
// on THIS account; anything unparseable files whole as a transcript note.
export async function roomPaste(
  accountId: string,
  raw: string,
): Promise<{ ok: boolean; filed: number; how: string; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  const text = typeof raw === "string" ? raw.trim().slice(0, 60000) : "";
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
    entries = parseSfTimeline(text);
    how = how === "ai" ? "rules" : how;
  }

  try {
    if (entries.length === 0) {
      const body = redactMoney(cleanSfPaste(text)).slice(0, 6000);
      if (!body)
        return { ok: false, filed: 0, how, reason: "Nothing recognizable to file." };
      await createAccountNoteRow({
        accountId: acct.id,
        kind: "account",
        body: `☰ transcript — filed from the room\n${body}`,
        lane: "mine",
        source: "transcript",
      });
      refresh();
      return { ok: true, filed: 1, how: "transcript" };
    }
    let filed = 0;
    for (const e of entries.slice(0, 50)) {
      const actors = actorsLine(e.from ?? "", e.to ?? "", e.others ?? 0);
      const when = [e.dayLabel, e.timeLabel].filter(Boolean).join(" ");
      const glyph = e.kind === "task" ? "✔" : e.kind === "call" ? "☎" : "✉";
      const who = `${e.from}${e.to ? ` → ${e.to}` : ""}${e.others ? ` +${e.others}` : ""}`;
      const head = `${glyph} SF ${when || "activity"} — ${e.subject || "(no subject)"} · ${who}`;
      await createAccountNoteRow({
        accountId: acct.id,
        kind: "account",
        body: redactMoney(e.body ? `${head}\n${e.body}` : head).slice(0, 2000),
        lane: laneFor(actors, `${e.subject ?? ""}\n${e.body ?? ""}`),
        actors,
        source: how === "ai" ? "sf-ai" : "sf",
      });
      filed++;
    }
    refresh();
    return { ok: true, filed, how };
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

export async function roomCompose(
  accountId: string,
  text: string,
): Promise<{ ok: boolean; kind?: "note" | "action" | "scheduled"; reason?: string }> {
  const acct = bindAccountId(accountId, peos);
  if (!acct) return { ok: false, reason: "That row isn't bound to a known account." };
  const parsed = parseLogInput(text);
  if (!parsed) return { ok: false, reason: "Nothing to file." };
  if (!(await requireWrite())) return { ok: false, reason: "Read-only session." };
  try {
    if (parsed.kind === "note") {
      const r = await roomLog(acct.id, parsed.body);
      return r.ok ? { ok: true, kind: "note" } : { ok: false, reason: r.reason };
    }
    const prisma = getPrisma();
    const top = await prisma.todo.findFirst({
      orderBy: { position: "desc" },
      select: { position: true },
    });
    await prisma.todo.create({
      data: {
        body: withTags(parsed.body, { ...NO_TAGS, kind: "action" }),
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
    return { ok: true, kind: parsed.kind };
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
