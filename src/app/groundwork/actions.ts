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
import { takeBack, tapMoment, workChannel } from "@/lib/groundwork/worked";
import { SENDBOOK_NS } from "@/lib/sendbook/read";
import { roomResearch } from "@/app/room/actions";
import { SOURCES } from "@/lib/ingest/dialect";
import {
  SPINE_GONE,
  SPINE_WORKED,
  SPINE_MUTE,
  isMutable,
  isSpineKey,
} from "@/lib/groundwork/spine-store";
import {
  WIRE_NS,
  parseWireBody,
  runWireSweep,
  sweepDue,
  urlHash,
  wireAvailable,
  wireNoteBody,
} from "@/lib/groundwork/wire";

import { loadGroundworkDay } from "@/lib/groundwork/load";
import { draftMove, writeDraftNote } from "@/lib/groundwork/draft-run";
import { moveKey } from "@/lib/groundwork/day";
import {
  DRAFT_KEEP_DAYS,
  SEND_WAIT_NS,
  STAGE_DRAFT_NS,
  draftForMove,
  renderStageDraft,
} from "@/lib/groundwork/stage-draft";
import { userDayKey } from "@/lib/tz";

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
  // The press stamped the move already (pressWorked); the tap files at the
  // stamp's own moment so the take-back finds it (tapOfStamp). A tap long
  // after the press moves the stamp to itself instead, so the two still
  // pair and the wing shows when the channel was named.
  const now = new Date();
  const key = groundworkDoneKey(now, mk);
  const pressed = await getPrisma()
    .taskDone.findUnique({ where: { key }, select: { doneAt: true } })
    .catch(() => null);
  // A move that already carries its touch today keeps that one: a second
  // Worked it for it (an older alert of the same rule) files nothing more,
  // so no two touches share a stamp's moment and ↺ always withdraws the
  // stamp's own.
  if (pressed) {
    const carried = await getPrisma()
      .accountNote.findFirst({
        where: { accountId: `${SENDBOOK_NS}${accountId}`, createdAt: pressed.doneAt },
        select: { id: true },
      })
      .catch(() => null);
    if (carried) {
      revalidatePath("/groundwork");
      return;
    }
  }
  const at = tapMoment(pressed?.doneAt ?? null, now);
  if (pressed && at.getTime() !== pressed.doneAt.getTime())
    await getPrisma()
      .taskDone.update({ where: { key }, data: { doneAt: at } })
      .catch(() => undefined);
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
    at,
  );
  revalidatePath("/groundwork");
}

// Worked it stamps on the press (ship order 2026-10-22: whatever
// Worked it is clicked for lands in Done today, whether the draft went or
// the operator sent their own). The chip row that springs after it only
// names the channel. No revalidate here: the stage keeps the row in place,
// and the chip or ✕ refreshes the page.
export async function pressWorked(mk: string, accountId: string): Promise<void> {
  if (!(await requireWrite())) return;
  if (!getPeo(accountId) || !mk || mk.length > 200) return;
  const now = new Date();
  await writeStamp(groundworkDoneKey(now, mk), now);
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
  // Send's marker goes with its stamp, so a taken-back send stops waiting.
  if (getPeo(accountId))
    await prisma.accountNote
      .deleteMany({
        where: {
          accountId: `${SEND_WAIT_NS}${accountId}`,
          body: mk,
          createdAt: { gte: new Date(Date.now() - 86_400_000) },
        },
      })
      .catch(() => undefined);
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

// ── The Sales Nav spine's ✕ and mute (2026-10-15) ───────────────────────
// ✕ hides one alert; ↺ brings it back. Mute hides a read-only kind
// (activity) until unmuted. Each writes one namespaced note the spine reads
// and nothing else does (src/lib/groundwork/spine-store.ts).

async function spineMark(ns: string, value: string): Promise<void> {
  const prisma = getPrisma();
  const existing = await prisma.accountNote
    .findFirst({ where: { accountId: ns, body: value }, select: { id: true } })
    .catch(() => null);
  if (existing) return;
  await createAccountNoteRow({
    accountId: ns,
    kind: "account",
    body: value,
    door: "hand",
    lane: "background",
    actors: "",
    source: SOURCES.spine,
  }).catch(() => undefined);
}

async function spineUnmark(ns: string, value: string): Promise<void> {
  await getPrisma()
    .accountNote.deleteMany({ where: { accountId: ns, body: value } })
    .catch(() => undefined);
}

export async function hideAlert(key: string): Promise<void> {
  if (!(await requireWrite()) || !isSpineKey(key)) return;
  await spineMark(SPINE_GONE, key);
  revalidatePath("/groundwork");
}

export async function showAlert(key: string): Promise<void> {
  if (!(await requireWrite()) || !isSpineKey(key)) return;
  await spineUnmark(SPINE_GONE, key);
  revalidatePath("/groundwork");
}

export async function markAlertWorked(key: string): Promise<void> {
  if (!(await requireWrite()) || !isSpineKey(key)) return;
  await spineMark(SPINE_WORKED, key);
  revalidatePath("/groundwork");
}

export async function unmarkAlertWorked(key: string): Promise<void> {
  if (!(await requireWrite()) || !isSpineKey(key)) return;
  await spineUnmark(SPINE_WORKED, key);
  revalidatePath("/groundwork");
}

export async function muteAlerts(group: string): Promise<void> {
  if (!(await requireWrite()) || !isMutable(group)) return;
  await spineMark(SPINE_MUTE, group);
  revalidatePath("/groundwork");
}

export async function unmuteAlerts(group: string): Promise<void> {
  if (!(await requireWrite()) || !isMutable(group)) return;
  await spineUnmark(SPINE_MUTE, group);
  revalidatePath("/groundwork");
}

// ── The draft on the stage (ship order 2026-10-19) ──────────────────────
// Redraft writes a fresh draft for the move on stage; an edit saves as the
// operator's own hand; Send stamps the move and leaves Send's marker until
// the sent copy comes back through the inbound route. None of these files
// anything to the record: what went out is the record, by the sent copy.

const MK_RE = /^[A-Za-z0-9]{6,40}:[a-z-]{3,40}$/;

/** The account's draft notes: the move's newest, with older ones past the
 *  keep window cleared as a new one lands. */
async function stageDrafts(accountId: string) {
  return getPrisma()
    .accountNote.findMany({
      where: { accountId: `${STAGE_DRAFT_NS}${accountId}` },
      select: { body: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    })
    .then((rows) =>
      rows.map((r) => ({ body: r.body, createdAt: r.createdAt.toISOString() })),
    )
    .catch(() => []);
}

async function clearStaleDrafts(accountId: string, now: Date): Promise<void> {
  await getPrisma()
    .accountNote.deleteMany({
      where: {
        accountId: `${STAGE_DRAFT_NS}${accountId}`,
        createdAt: { lt: new Date(now.getTime() - DRAFT_KEEP_DAYS * 86_400_000) },
      },
    })
    .catch(() => undefined);
}

export async function redraftStage(accountId: string, mk: string): Promise<void> {
  if (!(await requireWrite()) || !getPeo(accountId) || !MK_RE.test(mk)) return;
  const now = new Date();
  try {
    const day = await loadGroundworkDay(now);
    const item = day.rankedAll.find((q) => moveKey(q) === mk);
    if (!item) return;
    await draftMove(day, item, now);
    await clearStaleDrafts(accountId, now);
  } catch {
    return;
  }
  revalidatePath("/groundwork");
}

/** The operator's edit, kept: the pad never eats your words. */
async function keepEdit(
  accountId: string,
  mk: string,
  subject: string,
  body: string,
  now: Date,
): Promise<void> {
  const prior = draftForMove(await stageDrafts(accountId), mk, now);
  if (prior && prior.subject === subject.trim() && prior.body === body.trim()) return;
  await writeDraftNote(
    accountId,
    renderStageDraft({
      day: userDayKey(now),
      mk,
      by: "hand",
      to: prior?.to ?? "",
      email: prior?.email ?? "",
      subject: subject.slice(0, 160),
      uses: prior?.uses ?? [],
      body: body.slice(0, 6000),
    }),
  ).catch(() => undefined);
}

export async function saveStageDraft(
  accountId: string,
  mk: string,
  subject: string,
  body: string,
): Promise<void> {
  if (!(await requireWrite()) || !getPeo(accountId) || !MK_RE.test(mk)) return;
  if (!(body ?? "").trim()) return;
  await keepEdit(accountId, mk, subject ?? "", body, new Date());
}

/** Send: the edit is kept, the move is stamped, and Send's marker waits for
 *  the sent copy. The browser opens the draft in Outlook itself. */
export async function sendFromStage(
  accountId: string,
  mk: string,
  subject: string,
  body: string,
): Promise<void> {
  if (!(await requireWrite()) || !getPeo(accountId) || !MK_RE.test(mk)) return;
  const now = new Date();
  if ((body ?? "").trim()) await keepEdit(accountId, mk, subject ?? "", body, now);
  await createAccountNoteRow({
    accountId: `${SEND_WAIT_NS}${accountId}`,
    kind: "account",
    body: mk,
    door: "hand",
    lane: "background",
    actors: "",
    source: SOURCES.sendWait,
  }).catch(() => undefined);
  await writeStamp(groundworkDoneKey(now, mk), now);
  revalidatePath("/groundwork");
}
