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
  CHANNELS,
  SENDBOOK_NS,
  sendbookNoteBody,
  type Channel,
} from "@/lib/sendbook/read";
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
// The stage's own research button (founder-decreed 2026-08-14): fresh
// research runs on demand for whatever account is on deck. When the move
// itself IS the research pass, one press also stamps the move worked; on any
// other move the pass files quietly and the move stays open — running
// research never completes work it didn't do.
export async function runResearchNow(
  mk: string | null,
  accountId: string,
): Promise<void> {
  if (!(await requireWrite())) return;
  const r = await roomResearch(accountId);
  if (r.ok && mk) await markWorked(mk);
  revalidatePath("/groundwork");
  revalidatePath("/room");
}

// The Channel Ask's landing (the Sendbook, decreed 2026-08-19): a worked
// stamp that names its channel files a sendbook:<account> touch beside the
// TaskDone stamp, so the register and the wing subtext read a real store.
// Channels that leave a file behind never come through here — the record's
// own outbound IS the touch, and the ask pre-answers.
export async function workedChannel(
  mk: string,
  accountId: string,
  channel: string,
  contact: string,
  clause: string,
): Promise<void> {
  if (!(await requireWrite())) return;
  if (!getPeo(accountId)) return;
  if (!(CHANNELS as readonly string[]).includes(channel)) {
    await markWorked(mk);
    return;
  }
  try {
    await createAccountNoteRow({
      accountId: `${SENDBOOK_NS}${accountId}`,
      kind: "account",
      body: sendbookNoteBody(
        channel as Channel,
        contact.slice(0, 60),
        clause.slice(0, 160),
      ),
      lane: "background",
      actors: "",
      source: "sendbook",
    });
  } catch {
    // the stamp still lands below — a lost touch line costs the register a
    // row, never the day its checkmark
  }
  await markWorked(mk);
  revalidatePath("/sendbook");
}

// The take-back (founder-decreed 2026-08-19): an accidental stamp must be
// reversible in place. Un-stamping deletes today's done mark — the move
// returns to the queue — and withdraws the tap note the stamp filed, if one
// rode along today. The record's own entries are never touched: a filed
// email is a fact, not a stamp.
export async function unWork(mk: string, accountId: string): Promise<void> {
  if (!(await requireWrite()) || !mk || mk.length > 200) return;
  const key = groundworkDoneKey(new Date(), mk);
  const prisma = getPrisma();
  try {
    await prisma.taskDone.deleteMany({ where: { key } });
  } catch {
    return;
  }
  if (accountId && getPeo(accountId)) {
    try {
      // Only the newest tap filed today comes back out — Chicago's day, the
      // same day the stamp itself was scoped to.
      const chi = new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Chicago",
      });
      // Coarse fetch window (UTC midnight minus a buffer covers every
      // Chicago offset); the exact day check is the per-row comparison below.
      const windowStart = new Date(Date.parse(`${chi}T00:00:00Z`) - 12 * 3_600_000);
      const candidates = await prisma.accountNote.findMany({
        where: {
          accountId: `${SENDBOOK_NS}${accountId}`,
          createdAt: { gte: windowStart },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, createdAt: true },
      });
      const todays = candidates.find(
        (c) =>
          c.createdAt.toLocaleDateString("en-CA", { timeZone: "America/Chicago" }) ===
          chi,
      );
      if (todays) await prisma.accountNote.delete({ where: { id: todays.id } });
    } catch {
      // a leftover tap line is visible in the register and strikable later;
      // the stamp itself is already back out
    }
  }
  revalidatePath("/groundwork");
  revalidatePath("/sendbook");
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
