"use server";

// Groundwork's writes — small on purpose. The room derives everything at
// request time; the only things it persists are worked stamps (side effects
// of real actions, §3.5) and the wire sweep's filed items. Every action
// re-checks its own preconditions server-side: the client's due chip is a
// convenience, never the gate. An action refreshes Groundwork, the page it
// is called from, and no other surface: every other page derives on request
// (D15; ruled 2026-10-07, pass 8 call 2).

import { revalidatePath } from "next/cache";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { createAccountNoteRow } from "@/lib/notes/write";
import { getPeo } from "@/lib/book";
import { READOUT_READ_KEY, groundworkDoneKey } from "@/lib/groundwork/file";
import { takeBack, workChannel } from "@/lib/groundwork/worked";
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
}

// The Channel Ask's landing (the Sendbook, decreed 2026-08-19): a worked
// stamp that names its channel files a sendbook:<account> touch beside the
// TaskDone stamp, so the register and the wing subtext read a real store.
// Channels that leave a file behind never come through here — the record's
// own outbound IS the touch, and the ask pre-answers. The tap and the stamp
// carry one moment, so the take-back finds the move's own tap (pass 8 G8).
// What it writes, and that it never writes a touch, is workChannel's
// (src/lib/groundwork/worked.ts).
export async function workedChannel(
  mk: string,
  accountId: string,
  channel: string,
  contact: string,
  clause: string,
): Promise<void> {
  if (!(await requireWrite())) return;
  if (!getPeo(accountId) || !mk || mk.length > 200) return;
  await workChannel(
    {
      note: async (row) => {
        await createAccountNoteRow({
          ...row,
          door: row.door,
          kind: "account",
          actors: "",
        });
      },
      stamp: writeStamp,
    },
    { mk, accountId, channel, contact, clause },
    new Date(),
  );
  revalidatePath("/groundwork");
}

// The take-back (founder-decreed 2026-08-19): an accidental stamp must be
// reversible in place. Un-stamping deletes today's done mark — the move
// returns to the queue — and withdraws the tap note that stamp filed, if one
// rode along: the move's own tap, never another move's from earlier in the
// day (pass 8 G8). The record's own entries are never touched: a filed email
// is a fact, not a stamp. The order of it is takeBack's
// (src/lib/groundwork/worked.ts); the store below reaches only the stamp
// table and the account's sendbook: key.
export async function unWork(mk: string, accountId: string): Promise<void> {
  if (!(await requireWrite()) || !mk || mk.length > 200) return;
  const prisma = getPrisma();
  try {
    await takeBack(
      {
        stampAt: async (key) =>
          (await prisma.taskDone.findUnique({ where: { key }, select: { doneAt: true } }))
            ?.doneAt ?? null,
        deleteStamp: async (key) => {
          await prisma.taskDone.deleteMany({ where: { key } });
        },
        // A leftover tap line is visible in the register and strikable
        // later; the stamp itself is already back out.
        tapsBetween: (sendbookKey, from, to) =>
          prisma.accountNote
            .findMany({
              where: { accountId: sendbookKey, createdAt: { gte: from, lte: to } },
              select: { id: true, createdAt: true },
            })
            .catch(() => []),
        deleteTap: async (id) => {
          await prisma.accountNote.delete({ where: { id } }).catch(() => undefined);
        },
      },
      mk,
      getPeo(accountId) ? accountId : "",
      new Date(),
    );
  } catch {
    return;
  }
  revalidatePath("/groundwork");
}

// The worked stamp itself, at the moment given: the Channel Ask hands its
// tap's moment in, so the two pair (tapOfStamp). Not exported, so no client
// can call it with a moment of its own. A lost stamp costs a checkmark, never
// the work.
async function writeStamp(key: string, at: Date): Promise<void> {
  try {
    await getPrisma().taskDone.upsert({
      where: { key },
      create: { key, doneAt: at },
      update: {},
    });
  } catch {
    return;
  }
}

async function stamp(mk: string, at: Date): Promise<void> {
  if (!(await requireWrite()) || !mk || mk.length > 200) return;
  await writeStamp(groundworkDoneKey(at, mk), at);
  revalidatePath("/groundwork");
}

export async function markWorked(mk: string): Promise<void> {
  await stamp(mk, new Date());
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
        door: "hand",
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
      door: "hand",
      lane: "background",
      actors: "",
      source: "wire",
    });
  } catch {
    return;
  }
  revalidatePath("/groundwork");
}
