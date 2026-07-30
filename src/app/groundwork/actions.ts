"use server";

// Groundwork's writes — small on purpose. The room derives everything at
// request time; the only things it persists are worked stamps (side effects
// of real actions, §3.5) and the wire sweep's filed items.

import { revalidatePath } from "next/cache";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { createAccountNoteRow } from "@/lib/notes/write";
import { groundworkDoneKey } from "@/lib/groundwork/file";
import {
  WIRE_NS,
  runWireSweep,
  urlHash,
  wireAvailable,
  wireNoteBody,
} from "@/lib/groundwork/wire";

async function requireWrite() {
  if (!hasDatabaseEnv()) return false;
  const access = await getAppAccess();
  return access.status === "active" && access.canWrite;
}

// The worked stamp — called by the copy control AFTER the copy happened.
// Day-scoped: the key carries the Chicago day, so the row resets tomorrow
// while doneAt keeps the exact stamp time.
export async function markWorked(mk: string): Promise<void> {
  if (!(await requireWrite()) || !mk || mk.length > 200) return;
  const key = groundworkDoneKey(new Date(), mk);
  const prisma = getPrisma();
  const existing = await prisma.taskDone.findUnique({ where: { key } });
  if (!existing) await prisma.taskDone.create({ data: { key } });
  revalidatePath("/groundwork");
}

// The sweep — one click, one external pass, items filed immutable under the
// wire: namespace, deduped by URL hash. Never runs on page load.
export async function sweepWire(): Promise<void> {
  if (!(await requireWrite()) || !wireAvailable()) return;
  const now = new Date();
  let items;
  try {
    items = await runWireSweep(now);
  } catch {
    return; // the page keeps its last sweep; the due chip stays honest
  }
  const prisma = getPrisma();
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
  revalidatePath("/groundwork");
}

// Attach a wire item to an account's record — the drawer's real "file it"
// control. Writes the item's read as a note ON the account, by the operator's
// click, so Friday's prep carries the news.
export async function attachWireToAccount(
  accountId: string,
  headline: string,
  source: string,
  url: string,
  read: string,
): Promise<void> {
  if (!(await requireWrite()) || !accountId || !headline) return;
  await createAccountNoteRow({
    accountId,
    kind: "account",
    body: `⚡ WIRE ${source} — ${headline}\n${read}\n${url}`.slice(0, 4000),
    lane: "background",
    actors: "",
    source: "wire",
  });
  revalidatePath("/groundwork");
  revalidatePath("/room");
}
