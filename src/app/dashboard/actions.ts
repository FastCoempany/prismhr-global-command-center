"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { DASH_NODE_KEYS, isNodeState, type DashNodeKey, type NodeState } from "@/lib/dashboard/stages";

function str(fd: FormData, key: string, max = 2000) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

async function requireWrite() {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

function done() {
  revalidatePath("/");
  redirect("/");
}

export async function addCard(formData: FormData) {
  const name = str(formData, "name", 120);
  if (!(await requireWrite()) || !name) done();

  const prisma = getPrisma();
  const top = await prisma.dashCard.findFirst({ orderBy: { position: "desc" }, select: { position: true } });
  await prisma.dashCard.create({
    data: {
      name,
      subtitle: str(formData, "subtitle", 160) || null,
      position: (top?.position ?? -1) + 1,
      states: {},
      notes: {},
    },
  });
  done();
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

export async function setNode(formData: FormData) {
  const cardId = str(formData, "cardId", 40);
  const node = str(formData, "node", 40) as DashNodeKey;
  const stateRaw = str(formData, "state", 20);
  const state: NodeState = isNodeState(stateRaw) ? stateRaw : "todo";
  const note = str(formData, "note", 2000);
  if (!(await requireWrite()) || !cardId || !DASH_NODE_KEYS.includes(node)) done();

  const prisma = getPrisma();
  const card = await prisma.dashCard.findUnique({ where: { id: cardId } });
  if (!card) done();

  const states: Record<string, string> = {
    ...((card!.states as Record<string, string> | null) ?? {}),
    [node]: state,
  };
  const notes: Record<string, string> = { ...((card!.notes as Record<string, string> | null) ?? {}) };
  if (note) notes[node] = note;
  else delete notes[node];

  await prisma.dashCard.update({ where: { id: cardId }, data: { states, notes } });
  done();
}

export async function moveCard(formData: FormData) {
  const id = str(formData, "id", 40);
  const dir = str(formData, "dir", 4);
  if (!(await requireWrite()) || !id) done();

  const prisma = getPrisma();
  const all = await prisma.dashCard.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true, position: true },
  });
  const idx = all.findIndex((c) => c.id === id);
  const swapWith = dir === "up" ? idx - 1 : idx + 1;
  if (idx >= 0 && swapWith >= 0 && swapWith < all.length) {
    const a = all[idx];
    const b = all[swapWith];
    await prisma.dashCard.update({ where: { id: a.id }, data: { position: b.position } });
    await prisma.dashCard.update({ where: { id: b.id }, data: { position: a.position } });
  }
  done();
}

export async function deleteCard(formData: FormData) {
  const id = str(formData, "id", 40);
  if (!(await requireWrite()) || !id) done();

  await getPrisma().dashCard.delete({ where: { id } });
  done();
}
