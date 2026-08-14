"use server";

// Groundwork's writes — small on purpose. The room derives everything at
// request time; the only things it persists are worked stamps (side effects
// of real actions, §3.5) and the wire sweep's filed items. Every action
// re-checks its own preconditions server-side: the client's due chip is a
// convenience, never the gate.

import { revalidatePath } from "next/cache";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { createAccountNoteRow } from "@/lib/notes/write";
import { getPeo } from "@/lib/book";
import { READOUT_READ_KEY, groundworkDoneKey } from "@/lib/groundwork/file";
import { roomResearch } from "@/app/room/actions";
import {
  WIRE_NS,
  parseWireBody,
  runWireSweep,
  sweepDue,
  urlHash,
  wireAvailable,
  wireNoteBody,
} from "@/lib/groundwork/wire";

const WIRE_KEEP_DAYS = 30;

async function requireWrite() {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

// The worked stamp — called by the copy control AFTER the copy happened.
// Day-scoped: the key carries the Chicago day, so the row resets tomorrow
// while doneAt keeps the exact stamp time.
// The stage's own research button (founder-decreed 2026-08-14): when the
// queue says "Run the research pass.", the pass runs right here — one press
// files the deep pass to the account and stamps the move worked.
export async function runResearchNow(mk: string, accountId: string): Promise<void> {
  if (!(await requireWrite())) return;
  const r = await roomResearch(accountId);
  if (r.ok) await markWorked(mk);
  revalidatePath("/groundwork");
  revalidatePath("/room");
}

export async function markWorked(mk: string): Promise<void> {
  if (!(await requireWrite()) || !mk || mk.length > 200) return;
  const key = groundworkDoneKey(new Date(), mk);
  try {
    const prisma = getPrisma();
    await prisma.taskDone.upsert({ where: { key }, create: { key }, update: {} });
  } catch {
    return; // a lost stamp costs a checkmark, never the work
  }
  revalidatePath("/groundwork");
}

// The readout-read stamp — Russ's pull tab records when the readout was last
// copied out, durable (not day-scoped), doneAt moving forward on each read.
export async function markReadoutRead(): Promise<void> {
  if (!(await requireWrite())) return;
  try {
    const prisma = getPrisma();
    await prisma.taskDone.upsert({
      where: { key: READOUT_READ_KEY },
      create: { key: READOUT_READ_KEY },
      update: { doneAt: new Date() },
    });
  } catch {
    return;
  }
  revalidatePath("/groundwork");
}

// The sweep — one click, one external pass, items filed immutable under the
// wire: namespace, deduped by URL hash. Never runs on page load, and the
// staleness check happens HERE, against the stored wire, so a stray or
// replayed click inside the fresh window costs nothing.
export async function sweepWire(): Promise<void> {
  if (!(await requireWrite()) || !wireAvailable()) return;
  const now = new Date();
  const prisma = getPrisma();
  try {
    const stored = await prisma.accountNote.findMany({
      where: { accountId: { startsWith: WIRE_NS } },
      select: { body: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const items = stored
      .map((n) => parseWireBody(n.body))
      .filter((w): w is NonNullable<typeof w> => w !== null);
    if (!sweepDue(items, now)) return;
  } catch {
    return;
  }
  let items;
  try {
    items = await runWireSweep(now);
  } catch {
    return; // the page keeps its last sweep; the due chip stays honest
  }
  try {
    for (const item of items) {
      const ns = `${WIRE_NS}${urlHash(item.url)}`;
      const existing = await prisma.accountNote.findFirst({
        where: { accountId: ns },
        select: { id: true },
      });
      if (existing) continue;
      await createAccountNoteRow({
        accountId: ns,
        kind: "account",
        body: wireNoteBody(item).slice(0, 4000),
        lane: "background",
        actors: "",
        source: "wire",
      });
    }
    // Old wire items age out — the wire is a week's pulse, not an archive.
    await prisma.accountNote.deleteMany({
      where: {
        accountId: { startsWith: WIRE_NS },
        createdAt: { lt: new Date(now.getTime() - WIRE_KEEP_DAYS * 86_400_000) },
      },
    });
  } catch {
    return;
  }
  revalidatePath("/groundwork");
}

// Attach a wire item to an account's record — the drawer's real "file it"
// control. Writes the item's read as a note ON the account, by the operator's
// click, so Friday's prep carries the news. Only real book accounts take the
// note, and only http(s) links ride along.
export async function attachWireToAccount(
  accountId: string,
  headline: string,
  source: string,
  url: string,
  read: string,
): Promise<void> {
  if (!(await requireWrite()) || !accountId || !headline) return;
  if (!getPeo(accountId)) return;
  const safeUrl = /^https?:\/\//i.test(url) ? url.slice(0, 500) : "";
  const body = [
    `⚡ WIRE ${source.slice(0, 60)} — ${headline.slice(0, 220)}`,
    read.slice(0, 500),
    safeUrl,
  ]
    .filter(Boolean)
    .join("\n");
  try {
    await createAccountNoteRow({
      accountId,
      kind: "account",
      body: body.slice(0, 4000),
      lane: "background",
      actors: "",
      source: "wire",
    });
  } catch {
    return;
  }
  revalidatePath("/groundwork");
  revalidatePath("/room");
}
