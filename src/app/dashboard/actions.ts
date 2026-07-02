"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { DASH_NODE_KEYS, isNodeState, type DashNodeKey, type NodeState } from "@/lib/dashboard/stages";

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
  return raw === "/accounts" ? "/accounts" : "/";
}

function done(to = "/") {
  revalidatePath("/");
  revalidatePath("/accounts");
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
  const top = await prisma.dashCard.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
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

export async function renameCard(formData: FormData) {
  const id = str(formData, "id", 40);
  const name = str(formData, "name", 120);
  if (!(await requireWrite()) || !id || !name) done();

  await getPrisma().dashCard.update({
    where: { id },
    data: { name, subtitle: str(formData, "subtitle", 160) || null },
  });
  done();
}

// Quick-paint: set one node's state, preserving notes.
export async function paintNode(formData: FormData) {
  const cardId = str(formData, "cardId", 40);
  const node = str(formData, "node", 40) as DashNodeKey;
  const stateRaw = str(formData, "state", 20);
  const state: NodeState = isNodeState(stateRaw) ? stateRaw : "todo";
  if (!(await requireWrite()) || !cardId || !DASH_NODE_KEYS.includes(node)) done();

  const prisma = getPrisma();
  const card = await prisma.dashCard.findUnique({ where: { id: cardId } });
  if (!card) done();
  const states: Record<string, string> = {
    ...((card!.states as Record<string, string> | null) ?? {}),
    [node]: state,
  };
  await prisma.dashCard.update({ where: { id: cardId }, data: { states } });
  done();
}

// Save all of a card's per-node notes at once, preserving states.
export async function saveNotes(formData: FormData) {
  const cardId = str(formData, "cardId", 40);
  if (!(await requireWrite()) || !cardId) done();

  const notes: Record<string, string> = {};
  for (const key of DASH_NODE_KEYS) {
    const v = str(formData, `note_${key}`, 4000);
    if (v) notes[key] = v;
  }
  await getPrisma().dashCard.update({ where: { id: cardId }, data: { notes } });
  done();
}

export async function toggleArchive(formData: FormData) {
  const id = str(formData, "id", 40);
  if (!(await requireWrite()) || !id) done();
  const prisma = getPrisma();
  const card = await prisma.dashCard.findUnique({ where: { id }, select: { archived: true } });
  if (!card) done();
  await prisma.dashCard.update({ where: { id }, data: { archived: !card!.archived } });
  done();
}

export async function moveCard(formData: FormData) {
  const id = str(formData, "id", 40);
  const dir = str(formData, "dir", 4);
  if (!(await requireWrite()) || !id) done();

  const prisma = getPrisma();
  const all = await prisma.dashCard.findMany({
    where: { archived: false },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, position: true },
  });
  const idx = all.findIndex((c) => c.id === id);
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (idx >= 0 && swapWith >= 0 && swapWith < all.length) {
    // Reindex to sequential positions with the swap applied — robust even when
    // legacy rows share a position.
    const order = all.map((c) => c.id);
    [order[idx], order[swapWith]] = [order[swapWith], order[idx]];
    await Promise.all(
      order.map((cid, i) => prisma.dashCard.update({ where: { id: cid }, data: { position: i } })),
    );
  }
  done();
}

export async function deleteCard(formData: FormData) {
  const id = str(formData, "id", 40);
  if (!(await requireWrite()) || !id) done();
  await getPrisma().dashCard.delete({ where: { id } });
  done();
}

// Rename the six stage-column labels (global; stored in the DashConfig singleton).
export async function saveLabels(formData: FormData) {
  if (!(await requireWrite())) done();
  const labels: Record<string, string> = {};
  for (const key of DASH_NODE_KEYS) {
    const v = str(formData, `label_${key}`, 60);
    if (v) labels[key] = v;
  }
  await getPrisma().dashConfig.upsert({
    where: { id: "default" },
    create: { id: "default", labels },
    update: { labels },
  });
  done();
}
