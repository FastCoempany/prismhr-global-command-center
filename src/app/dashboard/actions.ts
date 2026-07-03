"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import {
  DASH_NODE_KEYS,
  isNodeState,
  nodeChecklist,
  stateFromChecks,
  type DashNodeKey,
  type NodeState,
} from "@/lib/dashboard/stages";

function lightNext(states: Record<string, string>, node: DashNodeKey) {
  const i = DASH_NODE_KEYS.indexOf(node);
  const nextKey = DASH_NODE_KEYS[i + 1];
  if (nextKey && (!isNodeState(states[nextKey]) || states[nextKey] === "todo")) {
    states[nextKey] = "active";
  }
}

// Keep the per-node activation stamps in sync with the final node states: stamp
// the moment a node first goes active (so Today can age the debt), clear it when
// a node falls back to todo, and leave done nodes' stamps untouched.
function syncActivation(activated: Record<string, string>, states: Record<string, string>) {
  const now = new Date().toISOString();
  for (const key of DASH_NODE_KEYS) {
    if (states[key] === "active" && !activated[key]) activated[key] = now;
    else if (states[key] === "todo") delete activated[key];
  }
}

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

// Node-click override (the "for fun" poke): advance todo → active → done → todo,
// and light the next node when this one reaches done.
export async function advanceNode(formData: FormData) {
  const cardId = str(formData, "cardId", 40);
  const node = str(formData, "node", 40) as DashNodeKey;
  if (!(await requireWrite()) || !cardId || !DASH_NODE_KEYS.includes(node)) done();

  const prisma = getPrisma();
  const card = await prisma.dashCard.findUnique({ where: { id: cardId } });
  if (!card) done();
  const states: Record<string, string> = { ...((card!.states as Record<string, string> | null) ?? {}) };
  const cur: NodeState = isNodeState(states[node]) ? (states[node] as NodeState) : "todo";
  states[node] = cur === "todo" ? "active" : cur === "active" ? "done" : "todo";
  if (states[node] === "done") lightNext(states, node);
  const activated: Record<string, string> = { ...((card!.activated as Record<string, string> | null) ?? {}) };
  syncActivation(activated, states);
  await prisma.dashCard.update({ where: { id: cardId }, data: { states, activated } });
  done();
}

// The real mechanism: toggle one mandatory checkbox, recompute the node's lit
// state from its checks, and light the next node once all are checked.
export async function toggleCheck(formData: FormData) {
  const cardId = str(formData, "cardId", 40);
  const node = str(formData, "node", 40) as DashNodeKey;
  const index = parseInt(str(formData, "index", 4), 10);
  if (!(await requireWrite()) || !cardId || !DASH_NODE_KEYS.includes(node) || Number.isNaN(index)) {
    done();
  }

  const count = nodeChecklist(node).length;
  const prisma = getPrisma();
  const card = await prisma.dashCard.findUnique({ where: { id: cardId } });
  if (!card) done();

  const allChecks: Record<string, boolean[]> = {
    ...((card!.checks as Record<string, boolean[]> | null) ?? {}),
  };
  const arr = Array.isArray(allChecks[node]) ? [...allChecks[node]] : [];
  while (arr.length < count) arr.push(false);
  if (index >= 0 && index < count) arr[index] = !arr[index];
  allChecks[node] = arr;

  const states: Record<string, string> = { ...((card!.states as Record<string, string> | null) ?? {}) };
  states[node] = stateFromChecks(arr, count);
  if (states[node] === "done") lightNext(states, node);
  const activated: Record<string, string> = { ...((card!.activated as Record<string, string> | null) ?? {}) };
  syncActivation(activated, states);

  await prisma.dashCard.update({ where: { id: cardId }, data: { checks: allChecks, states, activated } });
  done();
}

// Per-checkbox note.
export async function saveCheckNote(formData: FormData) {
  const cardId = str(formData, "cardId", 40);
  const node = str(formData, "node", 40) as DashNodeKey;
  const index = str(formData, "index", 4);
  const note = str(formData, "note", 2000);
  if (!(await requireWrite()) || !cardId || !DASH_NODE_KEYS.includes(node)) done();

  const prisma = getPrisma();
  const card = await prisma.dashCard.findUnique({ where: { id: cardId } });
  if (!card) done();
  const all: Record<string, Record<string, string>> = {
    ...((card!.checkNotes as Record<string, Record<string, string>> | null) ?? {}),
  };
  const per = { ...(all[node] ?? {}) };
  if (note) per[index] = note;
  else delete per[index];
  all[node] = per;
  await prisma.dashCard.update({ where: { id: cardId }, data: { checkNotes: all } });
  done();
}

// General per-node note (e.g. the research seed dropped on Discovery at add-time).
export async function saveNote(formData: FormData) {
  const cardId = str(formData, "cardId", 40);
  const node = str(formData, "node", 40) as DashNodeKey;
  const note = str(formData, "note", 4000);
  if (!(await requireWrite()) || !cardId || !DASH_NODE_KEYS.includes(node)) done();

  const prisma = getPrisma();
  const card = await prisma.dashCard.findUnique({ where: { id: cardId } });
  if (!card) done();
  const notes: Record<string, string> = { ...((card!.notes as Record<string, string> | null) ?? {}) };
  if (note) notes[node] = note;
  else delete notes[node];
  await prisma.dashCard.update({ where: { id: cardId }, data: { notes } });
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
