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
