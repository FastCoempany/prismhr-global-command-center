"use server";

import { redirect } from "next/navigation";
import { PeoApproach, PeoIntent, PeoStage } from "@/generated/prisma/client";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { csms, getPeo } from "@/lib/book";
import { getKit, playNextAction } from "@/lib/campaigns";
import { contactsFor } from "@/lib/book/contacts";
import { homeSideFrom } from "@/lib/pipeline/build";
import { readAccount } from "@/lib/record/read";
import {
  loadAccountNotes,
  loadDispositions,
  loadTodos,
  loadTouches,
} from "@/lib/today/overlay";

const stageValues = new Set<string>(Object.values(PeoStage));
const approachValues = new Set<string>(Object.values(PeoApproach));
const intentValues = new Set<string>(Object.values(PeoIntent));

function str(fd: FormData, key: string, max = 4000) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function backTo(fd: FormData, peoId: string, extra?: Record<string, string>) {
  const raw = str(fd, "returnTo", 200);
  const base =
    raw.startsWith("/") && !raw.startsWith("//") ? raw.split("?")[0] : "/accounts";
  const params = new URLSearchParams();
  if (peoId) params.set("peo", peoId);
  for (const [k, v] of Object.entries(extra ?? {})) params.set(k, v);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

async function requireWrite() {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function savePeo(formData: FormData) {
  const peoId = str(formData, "peoId", 40);
  if (!(await requireWrite()) || !peoId) {
    redirect(backTo(formData, peoId, { error: "1" }));
  }

  const stageRaw = str(formData, "stage", 40);
  const stage = stageValues.has(stageRaw) ? (stageRaw as PeoStage) : PeoStage.NOT_TOUCHED;
  const approachRaw = str(formData, "approach", 40);
  const approach = approachValues.has(approachRaw)
    ? (approachRaw as PeoApproach)
    : PeoApproach.NEEDS_CSM;
  const intentRaw = str(formData, "intent", 40);
  const intent = intentValues.has(intentRaw)
    ? (intentRaw as PeoIntent)
    : PeoIntent.UNKNOWN;
  const nextAction = str(formData, "nextAction", 400) || null;
  const nextActionDate = parseDate(str(formData, "nextActionDate", 10));
  const notes = str(formData, "notes", 8000) || null;
  const activity = str(formData, "activity", 1000);

  const prisma = getPrisma();
  const data = { stage, approach, intent, nextAction, nextActionDate, notes };
  await prisma.peoState.upsert({
    where: { peoId },
    create: { peoId, ...data },
    update: data,
  });
  if (activity) {
    await prisma.peoActivity.create({ data: { peoId, body: activity } });
  }

  redirect(backTo(formData, peoId, { saved: "1" }));
}

// Apply a campaign play: set its ask as the next action, due in the kit's window,
// and log the play to the PEO's activity trail. Leaves stage/approach/intent as-is.
export async function applyPlay(formData: FormData) {
  const peoId = str(formData, "peoId", 40);
  const kitId = str(formData, "kitId", 60);
  const kit = getKit(kitId);
  const peo = getPeo(peoId);
  if (!(await requireWrite()) || !peo || !kit) {
    redirect(backTo(formData, peoId, { error: "1" }));
  }

  // The relationship's name rides the durable next action, not the book
  // seed's (Ted doctrine) — "Email Bryce" outlives Bryce otherwise. It is
  // the account read's own answer (field 13), the one the Accounts row
  // shows: read over the visible record, so a ✕-parked entry never names
  // the person a play is aimed at (hidden is hidden, pass 8 X1).
  const [notes, dispositions, touches, todos] = await Promise.all([
    loadAccountNotes(),
    loadDispositions(),
    loadTouches(),
    loadTodos(),
  ]);
  const read = readAccount({
    account: {
      id: peo.id,
      name: peo.name,
      contacts: contactsFor(peoId),
      contact: { name: peo.contactName, email: peo.contactEmail },
    },
    notes: notes.get(peoId) ?? [],
    touches,
    todos,
    dispositions,
    homeSide: [...csms, ...homeSideFrom(notes)],
    now: new Date(),
  });
  const nextAction = playNextAction(kit, peo, read.relationship.name);
  const nextActionDate = new Date(Date.now() + kit.dueInDays * 86_400_000);

  const prisma = getPrisma();
  await prisma.peoState.upsert({
    where: { peoId },
    create: { peoId, nextAction, nextActionDate },
    update: { nextAction, nextActionDate },
  });
  await prisma.peoActivity.create({ data: { peoId, body: `Queued play: ${kit.name}` } });

  redirect(backTo(formData, peoId, { saved: "1" }));
}
