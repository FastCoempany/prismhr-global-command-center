"use server";

// The Act Lane's actions (founder-decreed 2026-08-21, Version C winner).
// The lane works the act right there: Send files a real outbound to the
// record (the record then clears the gem's nag itself), File-as-done stamps
// the gem by hand, drafts save so the pad never eats your words, and the
// fork files the follow-up where it belongs — a board account's move in the
// HomeRoom's TODAY register, an off-board account's in Groundwork's wing.
// Every write carries its take-back.

import { revalidatePath } from "next/cache";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { createAccountNoteRow } from "@/lib/notes/write";
import { redactMoney } from "@/lib/intel/lexicon";
import { OPERATOR_NAME } from "@/lib/intel/provenance";
import { userDayKey } from "@/lib/tz";
import { GEMS_NS, parseGemsBody, renderGemsBody } from "@/lib/activity/stores";
import {
  ACT_DRAFT_NS,
  SEAT_NS,
  renderActDraftBody,
  renderSeatBody,
} from "@/lib/act/lane";

async function requireWrite(): Promise<boolean> {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

const clip = (s: unknown, max: number) =>
  typeof s === "string" ? s.trim().slice(0, max) : "";

function refresh() {
  revalidatePath("/accounts");
  revalidatePath("/groundwork");
  revalidatePath("/room");
}

// ── the draft (the pad never eats your words) ───────────────────────────────

export async function saveActDraft(args: {
  accountId: string;
  term: string;
  to: string;
  subject: string;
  body: string;
}): Promise<{ ok: boolean }> {
  const accountId = clip(args.accountId, 40);
  if (!accountId || !(await requireWrite())) return { ok: false };
  const body = redactMoney(
    renderActDraftBody({
      term: clip(args.term, 80),
      to: clip(args.to, 120),
      subject: clip(args.subject, 200),
      body: clip(args.body, 4000),
    }),
  );
  const prisma = getPrisma();
  try {
    await prisma.accountNote.deleteMany({
      where: { accountId: `${ACT_DRAFT_NS}${accountId}` },
    });
    await createAccountNoteRow({
      accountId: `${ACT_DRAFT_NS}${accountId}`,
      kind: "mine",
      body,
      lane: "mine",
      source: "act-lane",
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function discardActDraft(args: {
  accountId: string;
}): Promise<{ ok: boolean }> {
  const accountId = clip(args.accountId, 40);
  if (!accountId || !(await requireWrite())) return { ok: false };
  try {
    await getPrisma().accountNote.deleteMany({
      where: { accountId: `${ACT_DRAFT_NS}${accountId}` },
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ── the send (a real outbound on the record) ────────────────────────────────

export async function fileActSend(args: {
  accountId: string;
  to: string;
  subject: string;
}): Promise<{ ok: boolean }> {
  const accountId = clip(args.accountId, 40);
  const to = clip(args.to, 120);
  const subject = clip(args.subject, 200);
  if (!accountId || !to || !(await requireWrite())) return { ok: false };
  try {
    await createAccountNoteRow({
      accountId,
      kind: "mine",
      body: redactMoney(`✉ ${subject || "Sent"} — sent to ${to}.`),
      lane: "mine",
      actors: `${OPERATOR_NAME} → ${to}`,
      source: "act-lane",
    });
    // The draft is consumed by the send.
    await getPrisma().accountNote.deleteMany({
      where: { accountId: `${ACT_DRAFT_NS}${accountId}` },
    });
    refresh();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ── the hand stamp (and its take-back) ──────────────────────────────────────
// Sets/clears actedDay on the gem itself — one store, the same field the
// acted sweep writes when the record shows the move (Ted doctrine: the
// record can re-stamp a taken-back act any time it truly speaks).

async function setActed(accountId: string, term: string, day: string) {
  const prisma = getPrisma();
  const note = await prisma.accountNote.findFirst({
    where: { accountId: `${GEMS_NS}${accountId}` },
    orderBy: { createdAt: "desc" },
  });
  if (!note) return false;
  const gems = parseGemsBody(note.body);
  const gem = gems.find((g) => g.term === term);
  if (!gem) return false;
  gem.actedDay = day;
  await prisma.accountNote.update({
    where: { id: note.id },
    data: { body: renderGemsBody(gems) },
  });
  return true;
}

export async function markActActed(args: {
  accountId: string;
  term: string;
}): Promise<{ ok: boolean }> {
  const accountId = clip(args.accountId, 40);
  const term = clip(args.term, 80);
  if (!accountId || !term || !(await requireWrite())) return { ok: false };
  try {
    const ok = await setActed(accountId, term, userDayKey(new Date()));
    if (ok) refresh();
    return { ok };
  } catch {
    return { ok: false };
  }
}

export async function unmarkActActed(args: {
  accountId: string;
  term: string;
}): Promise<{ ok: boolean }> {
  const accountId = clip(args.accountId, 40);
  const term = clip(args.term, 80);
  if (!accountId || !term || !(await requireWrite())) return { ok: false };
  try {
    const ok = await setActed(accountId, term, "");
    if (ok) refresh();
    return { ok };
  } catch {
    return { ok: false };
  }
}

// ── the fork (board → HomeRoom TODAY, off-board → Groundwork's wing) ────────

export async function forkAct(args: {
  accountId: string;
  act: string;
  term: string;
  toHome: boolean;
}): Promise<{ ok: boolean; undo?: { kind: "todo" | "seat"; id: string } }> {
  const accountId = clip(args.accountId, 40);
  const act = clip(args.act, 200);
  const term = clip(args.term, 80);
  if (!accountId || !act || !(await requireWrite())) return { ok: false };
  const prisma = getPrisma();
  try {
    if (args.toHome) {
      const top = await prisma.todo.findFirst({
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const t = await prisma.todo.create({
        data: {
          body: act,
          done: false,
          position: (top?.position ?? -1) + 1,
          accountId,
          remindAt: new Date(),
        },
      });
      refresh();
      return { ok: true, undo: { kind: "todo", id: t.id } };
    }
    // One seat per account — refiling replaces the old seat.
    await prisma.accountNote.deleteMany({
      where: { accountId: `${SEAT_NS}${accountId}` },
    });
    const row = await createAccountNoteRow({
      accountId: `${SEAT_NS}${accountId}`,
      kind: "mine",
      body: redactMoney(renderSeatBody({ act, term, day: userDayKey(new Date()) })),
      lane: "mine",
      source: "act-lane",
    });
    refresh();
    return { ok: true, undo: { kind: "seat", id: row.id } };
  } catch {
    return { ok: false };
  }
}

export async function undoForkAct(args: {
  kind: "todo" | "seat";
  id: string;
}): Promise<{ ok: boolean }> {
  const id = clip(args.id, 60);
  if (!id || !(await requireWrite())) return { ok: false };
  const prisma = getPrisma();
  try {
    if (args.kind === "todo") await prisma.todo.delete({ where: { id } });
    else await prisma.accountNote.delete({ where: { id } });
    refresh();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
