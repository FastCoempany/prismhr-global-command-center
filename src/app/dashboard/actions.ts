"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import {
  DASH_NODE_KEYS,
  lightNext,
  migrateActivated,
  migrateChecks,
  migrateNotes,
  migrateStates,
  nodeChecklist,
  stateFromChecks,
  syncActivation,
  type DashNodeKey,
} from "@/lib/dashboard/stages";

function str(fd: FormData, key: string, max = 4000) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

async function requireWrite() {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

function safeReturn(fd: FormData): string {
  const raw = str(fd, "returnTo", 80);
  return raw === "/accounts" || raw === "/room" ? raw : "/";
}

function done(to = "/") {
  revalidatePath("/accounts");
  revalidatePath("/room");
  redirect(to);
}

export async function addCard(formData: FormData) {
  const name = str(formData, "name", 120);
  const back = safeReturn(formData);
  if (!(await requireWrite()) || !name) done(back);

  // Optional one-time seed from the Account Room research (Discovery note).
  const seed = str(formData, "seedDiscovery", 4000);
  const notes: Record<string, string> = seed ? { discovery: seed } : {};

  const prisma = getPrisma();
  const top = await prisma.dashCard.findFirst({
    orderBy: { position: "desc" },
    select: { position: true },
  });
  await prisma.dashCard.create({
    data: {
      name,
      subtitle: str(formData, "subtitle", 160) || null,
      position: (top?.position ?? -1) + 1,
      states: {},
      notes,
    },
  });
  done(back);
}

// The real mechanism: toggle one mandatory checkbox, recompute the node's lit
// state from its checks, and light the next node once all are checked.
export async function toggleCheck(formData: FormData) {
  const cardId = str(formData, "cardId", 40);
  const node = str(formData, "node", 40) as DashNodeKey;
  const index = parseInt(str(formData, "index", 4), 10);
  const back = safeReturn(formData);
  if (
    !(await requireWrite()) ||
    !cardId ||
    !DASH_NODE_KEYS.includes(node) ||
    Number.isNaN(index)
  ) {
    done(back);
  }

  const count = nodeChecklist(node).length;
  const prisma = getPrisma();
  const card = await prisma.dashCard.findUnique({ where: { id: cardId } });
  if (!card) done(back);

  const allChecks: Record<string, boolean[]> = migrateChecks(card!.checks);
  const arr = Array.isArray(allChecks[node]) ? [...allChecks[node]] : [];
  while (arr.length < count) arr.push(false);
  if (index >= 0 && index < count) arr[index] = !arr[index];
  allChecks[node] = arr;

  const states: Record<string, string> = migrateStates(card!.states);
  states[node] = stateFromChecks(arr, count);
  if (states[node] === "done") lightNext(states, node);
  const activated: Record<string, string> = migrateActivated(card!.activated);
  syncActivation(activated, states);

  await prisma.dashCard.update({
    where: { id: cardId },
    data: { checks: allChecks, states, activated },
  });
  done(back);
}

// General per-node note (e.g. the research seed dropped on Discovery at add-time).
export async function saveNote(formData: FormData) {
  const cardId = str(formData, "cardId", 40);
  const node = str(formData, "node", 40) as DashNodeKey;
  const note = str(formData, "note", 4000);
  if (!(await requireWrite()) || !cardId || !DASH_NODE_KEYS.includes(node))
    done(safeReturn(formData));

  const prisma = getPrisma();
  const card = await prisma.dashCard.findUnique({ where: { id: cardId } });
  if (!card) done(safeReturn(formData));
  const notes: Record<string, string> = migrateNotes(card!.notes);
  if (note) notes[node] = note;
  else delete notes[node];
  await prisma.dashCard.update({ where: { id: cardId }, data: { notes } });
  done(safeReturn(formData));
}

// Run a DB write, but never let a missing/newer column (dealSize, stakeholders —
// added by docs/dashboard-tables.sql) 500 the page. Degrades to a no-op if the
// migration hasn't run. `done()` redirects (throws NEXT_REDIRECT) so it stays
// OUTSIDE the try/catch.
async function safeWrite(work: () => Promise<void>) {
  try {
    await work();
  } catch {
    // Column not migrated yet — swallow so the board reloads cleanly.
  }
}

// ✕ on an amber "suggested ✓" chip — this suggestion never comes back for
// this card+node+item. Zero-schema: sugg-dismiss disposition.
export async function dismissSuggestion(formData: FormData) {
  const cardId = str(formData, "cardId", 40);
  const node = str(formData, "node", 40);
  const index = str(formData, "index", 4);
  const back = safeReturn(formData);
  if (!(await requireWrite()) || !cardId || !node) done(back);
  const key = `sugg-dismiss:${cardId}:${node}:${index}`.slice(0, 191);
  await safeWrite(async () => {
    await getPrisma().accountDisposition.upsert({
      where: { accountId: key },
      create: { accountId: key, status: "parked", reason: "" },
      update: { status: "parked" },
    });
  });
  done(back);
}
