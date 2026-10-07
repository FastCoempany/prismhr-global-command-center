"use server";

// The Act Lane's actions (founder-decreed 2026-08-21, Version C winner).
// The lane works the act right there: Send files a real outbound to the
// record and stamps the gem acted, as the hover ✓ does (pass 8 A3), File-as-
// done stamps the gem by hand, drafts save so the pad never eats your words,
// and the fork files the follow-up where it belongs — a live deal's move in
// the HomeRoom's TODAY register, any other account's in Groundwork's wing.
// Every write carries its take-back.
//
// No action here revalidates a path (D15, reached to every action by pass 8
// call 2): there is no revalidation list, every page derives on request, and
// the lane's client asks the router for the fresh read after each write.

import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { createAccountNoteRow, createTodoRow } from "@/lib/notes/write";
import { redactMoney } from "@/lib/intel/lexicon";
import { userDayKey } from "@/lib/tz";
import { fetchGemsNoteFor } from "@/lib/activity/read";
import { renderGemsBody } from "@/lib/activity/stores";
import {
  ACT_DRAFT_NS,
  SEAT_NS,
  actSendRow,
  renderActDraftBody,
  renderSeatBody,
} from "@/lib/act/lane";
import { forkTodo, sendConsequences, stampActed } from "./rules";

async function requireWrite(): Promise<boolean> {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

const clip = (s: unknown, max: number) =>
  typeof s === "string" ? s.trim().slice(0, max) : "";

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
      door: "act-lane",
      lane: "mine",
      source: "act-lane",
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
  /** The gem the lane is working; Send stamps it acted. */
  term: string;
}): Promise<{ ok: boolean }> {
  const accountId = clip(args.accountId, 40);
  const to = clip(args.to, 120);
  const subject = clip(args.subject, 200);
  if (!accountId || !to || !(await requireWrite())) return { ok: false };
  try {
    await createAccountNoteRow({
      accountId,
      kind: "mine",
      door: "act-lane",
      ...actSendRow({ to, subject }),
    });
    const after = sendConsequences({
      accountId,
      term: clip(args.term, 80),
      now: new Date(),
    });
    // The draft is consumed by the send.
    await getPrisma().accountNote.deleteMany({
      where: { accountId: after.consumeDraft },
    });
    // Sending from the lane is acting on the gem: the stamp lands now, on the
    // gems store's own actedDay, so the nag clears without waiting for the
    // next export pass, and its ↺ takes it back like the hover ✓'s. The send
    // is filed either way; a stamp that fails leaves it to the acted sweep.
    if (after.stamp)
      await setActed(accountId, after.stamp.term, after.stamp.day).catch(() => false);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ── the hand stamp (and its take-back) ──────────────────────────────────────
// Sets/clears actedDay on the gem itself — one store, the same field the
// acted sweep writes when the record shows the move (Ted doctrine: the
// record can re-stamp a taken-back act any time it truly speaks). The note
// is found through the second record's own read, folded by canonical id
// (E17): the gems the face showed may sit under the account's shell id, and
// the stamp lands on that note, never on an empty twin under the other key.

async function setActed(accountId: string, term: string, day: string) {
  const note = await fetchGemsNoteFor(accountId);
  if (!note) return false;
  const gems = stampActed(note.gems, term, day);
  if (!gems) return false;
  await getPrisma().accountNote.update({
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
    return { ok: await setActed(accountId, term, userDayKey(new Date())) };
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
    return { ok: await setActed(accountId, term, "") };
  } catch {
    return { ok: false };
  }
}

// ── the fork (a live deal → HomeRoom TODAY, else → Groundwork's wing) ──────

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
      // An action the TODAY register reads (A8.15): the rule carries the tag.
      const t = await createTodoRow(forkTodo({ accountId, act, now: new Date() }));
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
      door: "act-lane",
      lane: "mine",
      source: "act-lane",
    });
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
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
