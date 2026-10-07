// The Filing table (the Chute brains refactor plan, §2.1, pick C; slice 4):
// one row per capture, carrying the structured read, every window that cut
// something and the duplicate check's outcome, linked by `filingId` from
// every AccountNote and Todo the filing wrote. Provenance is columns (ruled
// 2026-09-25, P3/P4): nothing here scans a body for what a column says.
//
// Every function degrades the way the writer does (src/lib/notes/write.ts):
// a database that has not gained the table or the column yet answers as if
// the filing were not there — nothing files blind, and nothing throws at a
// reader. The table's own migration lands with the deploy (src/lib/db/
// migrate.ts), so on a deployed database none of this degrades.

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";
import type { Door } from "@/lib/ingest/doors";
import { windowsOf, type Window } from "@/lib/ingest/windows";
import { wroteFrom, type FilingWrote } from "@/lib/ingest/wrote";
import { sanitizeAiResult, type AiCleanResult } from "@/lib/intel/ai-clean";
import {
  PLAYBOOK_LESSONS,
  PLAYBOOK_MARKET,
  parsePlaybookBody,
} from "@/lib/playbook/store";
import { gapNs, parseGapBody } from "@/lib/room/gaps";

/** Whose read filed the entries: the model's, the rule parser's, or none
 *  (a tape archived whole). */
export type FilingHow = "ai" | "rules" | "transcript";

/** Whether the duplicate check ran, or failed open and the filing went ahead
 *  (ruled 2026-09-25, D7). */
export type DupeCheck = "ran" | "skipped";

export type NewFiling = {
  accountId: string;
  /** The pastehash marker's own fingerprint (src/lib/paste-files.ts). */
  fingerprint: string;
  door: Door;
  dialect: string;
  how: FilingHow;
  /** The sanitized read, or null on a keyless filing. */
  read: AiCleanResult | null;
  /** Every window that cut something (D4); empty when the capture fit. */
  windows: readonly Window[];
  dupeCheck: DupeCheck;
  /** The capture's own day when its head carries one, else the filing moment. */
  filedAt: Date;
};

/** A Filing row as the readers see it. */
export type FilingRow = {
  id: string;
  accountId: string;
  fingerprint: string;
  door: string;
  dialect: string;
  how: string;
  read: AiCleanResult | null;
  windows: Window[];
  dupeCheck: string;
  createdAt: Date;
  filedAt: Date;
};

/** The slice of the Prisma client the table needs — a test hands in a stub. */
export type FilingClient = {
  filing: {
    upsert(args: {
      where: { accountId_fingerprint: { accountId: string; fingerprint: string } };
      create: FilingData;
      update: FilingData;
      select: { id: true };
    }): Promise<{ id: string }>;
    findUnique(args: {
      where:
        | { id: string }
        | { accountId_fingerprint: { accountId: string; fingerprint: string } };
    }): Promise<StoredFiling | null>;
    deleteMany(args: { where: { id: string } }): Promise<{ count: number }>;
  };
  accountNote: {
    findUnique(args: {
      where: { id: string };
      select: { filingId: true };
    }): Promise<{ filingId: string | null } | null>;
    deleteMany(args: { where: { filingId: string } }): Promise<{ count: number }>;
  };
  todo: {
    deleteMany(args: { where: { filingId: string } }): Promise<{ count: number }>;
  };
};

/** The columns a Filing row is written with. */
export type FilingData = {
  accountId: string;
  fingerprint: string;
  door: string;
  dialect: string;
  how: string;
  read: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  windows: Prisma.InputJsonValue;
  dupeCheck: string;
  filedAt: Date;
};

/** A row as the client returns it: the JSON columns untyped. */
type StoredFiling = Omit<FilingRow, "read" | "windows"> & {
  read: unknown;
  windows: unknown;
};

/** The read as JSON the table takes: the sanitized result, round-tripped so
 *  no undefined rides in and what is stored is exactly what parses back. The
 *  sanitizer already redacted every string (the money doctrine). */
const asJson = (v: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

function rowOf(s: StoredFiling): FilingRow {
  return {
    ...s,
    // A read that comes back from storage passes the sanitizer again, so a
    // row written by an older reader is still clamped to today's schema.
    read: s.read && typeof s.read === "object" ? sanitizeAiResult(s.read) : null,
    windows: windowsOf(s.windows),
  };
}

/** Write the filing, replacing any row an earlier filing of the same capture
 *  left, so the unique on (accountId, fingerprint) is never violated. An
 *  undone filing is re-droppable: its take-back clears the duplicate guard's
 *  marker and the row. A ✕-parked filing is still on file and its re-drop is
 *  refused at the duplicate check before this runs (D7); the replace is for
 *  a filing whose check failed open (D7) or whose marker did not land. Null
 *  when the table is not there yet — the rows then file without a link, as
 *  before. */
export async function fileFiling(
  f: NewFiling,
  client: FilingClient = getPrisma(),
): Promise<{ id: string } | null> {
  const data: FilingData = {
    accountId: f.accountId,
    fingerprint: f.fingerprint,
    door: f.door,
    dialect: f.dialect,
    how: f.how,
    read: f.read ? asJson(sanitizeAiResult(f.read)) : Prisma.JsonNull,
    windows: asJson(f.windows),
    dupeCheck: f.dupeCheck,
    filedAt: f.filedAt,
  };
  try {
    return await client.filing.upsert({
      where: {
        accountId_fingerprint: { accountId: f.accountId, fingerprint: f.fingerprint },
      },
      create: data,
      update: data,
      select: { id: true },
    });
  } catch {
    return null;
  }
}

/** The filing of one capture on one account, or null. */
export async function findFiling(
  accountId: string,
  fingerprint: string,
  client: FilingClient = getPrisma(),
): Promise<FilingRow | null> {
  try {
    const row = await client.filing.findUnique({
      where: { accountId_fingerprint: { accountId, fingerprint } },
    });
    return row ? rowOf(row) : null;
  } catch {
    return null;
  }
}

/** The sanitized read of one filing, by id, or null: the filing is not there,
 *  it was keyless, or the table is not there yet. The reader a caller holding
 *  the link column already takes — the intranet's extractor for a mirrored
 *  todo, whose Todo row carries the filingId (G6: the todo mirror carries the
 *  note's read rather than earning its own). */
export async function readOfFiling(
  filingId: string,
  client: FilingClient = getPrisma(),
): Promise<AiCleanResult | null> {
  try {
    const row = await client.filing.findUnique({ where: { id: filingId } });
    return row ? rowOf(row).read : null;
  } catch {
    return null;
  }
}

/** The sanitized read of the filing that wrote a note, or null: the note has
 *  no filing, the filing was keyless, or the columns are not there yet. */
export async function readOfNote(
  noteId: string,
  client: FilingClient = getPrisma(),
): Promise<AiCleanResult | null> {
  try {
    const note = await client.accountNote.findUnique({
      where: { id: noteId },
      select: { filingId: true },
    });
    if (!note?.filingId) return null;
    return await readOfFiling(note.filingId, client);
  } catch {
    return null;
  }
}

/** Take back everything a filing wrote — every AccountNote and Todo carrying
 *  its id — and then the Filing row, returning the counts. With `accountId`,
 *  only a filing on that account is touched, so a forged id reaches no one
 *  else's record. Zeros when the filing is not there. */
export async function undoFiling(
  filingId: string,
  accountId?: string,
  client: FilingClient = getPrisma(),
): Promise<{ notes: number; todos: number; filing: number }> {
  const none = { notes: 0, todos: 0, filing: 0 };
  try {
    const row = await client.filing.findUnique({ where: { id: filingId } });
    if (!row || (accountId && row.accountId !== accountId)) return none;
    const notes = await client.accountNote.deleteMany({ where: { filingId } });
    const todos = await client.todo.deleteMany({ where: { filingId } });
    const filing = await client.filing.deleteMany({ where: { id: filingId } });
    return { notes: notes.count, todos: todos.count, filing: filing.count };
  } catch {
    return none;
  }
}

// ── what a filing wrote, by its id ─────────────────────────────────────────

/** The most note rows one receipt opens to: a filing files at most ENTRY_CAP
 *  entries, its transcript and its outcome marker on the account, then its
 *  asks and its playbook lines in their own namespaces. */
export const WROTE_NOTES = 120;
/** The most todo rows one receipt opens to: the to-dos and their loops. */
export const WROTE_TODOS = 60;

/** The slice of the Prisma client the receipt's read needs — a test hands in
 *  a stub. */
export type WroteClient = {
  accountNote: {
    findMany(args: {
      where: { filingId: string; accountId: { in: string[] } };
      orderBy: { createdAt: "asc" };
      select: { body: true; createdAt: true; accountId: true };
      take: number;
    }): Promise<{ body: string; createdAt: Date; accountId: string }[]>;
  };
  todo: {
    findMany(args: {
      where: { filingId: string; accountId: string };
      orderBy: { createdAt: "asc" };
      select: { body: true };
      take: number;
    }): Promise<{ body: string }[]>;
  };
};

/** Everything one filing wrote, read by the filing's id across every
 *  namespace it writes to: the record entries on the account, the asks in
 *  its gaps namespace, the playbook lines whose tail names it, and the todos
 *  on the account. The receipt opens every count it shows (ruled 2026-10-07,
 *  pass 8 call 9), so the asks and the playbook lines are read here beside
 *  the entries. Each read is scoped to the account or its own namespaces, so
 *  a forged filing id reaches no other account's rows: the playbook is one
 *  namespace for every account, and a line counts only when its tail names
 *  this one, as the undo reads it. Throws when the store does. */
export async function wroteOfFiling(
  accountId: string,
  filingId: string,
  client: WroteClient = getPrisma(),
): Promise<FilingWrote> {
  const asksNs = gapNs(accountId);
  const [notes, todos] = await Promise.all([
    client.accountNote.findMany({
      where: {
        filingId,
        accountId: { in: [accountId, asksNs, PLAYBOOK_MARKET, PLAYBOOK_LESSONS] },
      },
      orderBy: { createdAt: "asc" },
      select: { body: true, createdAt: true, accountId: true },
      take: WROTE_NOTES,
    }),
    client.todo.findMany({
      where: { filingId, accountId },
      orderBy: { createdAt: "asc" },
      select: { body: true },
      take: WROTE_TODOS,
    }),
  ]);
  const entries: { body: string; createdAt: Date }[] = [];
  const asks: string[] = [];
  const learned: string[] = [];
  for (const n of notes) {
    if (n.accountId === accountId) entries.push(n);
    else if (n.accountId === asksNs) asks.push(parseGapBody(n.body));
    else {
      const { text, tail } = parsePlaybookBody(n.body);
      if (tail.a === accountId) learned.push(text);
    }
  }
  return wroteFrom(entries, todos, { asks, learned });
}

// ── the duplicate guard's claim ────────────────────────────────────────────
// The same capture filed to the same account twice is refused (CLAUDE.md, The
// Chute: "Already on file. Nothing filed twice."). The guard's marker is the
// `pastehash:<account>:<fingerprint>` disposition row, whose key is unique.
// A check that only reads the marker lets two filings of one capture in
// flight together both pass it and fold onto one Filing row (pass 8, the
// duplicate race), so the check claims the key instead: the first filing
// creates the marker as a claim, a twin's create meets the unique key and
// reads the claim, and the filing turns the claim into the filed marker when
// it lands (roomPaste's stampPasteMark) or releases it when it files nothing.
// No schema change: the claim is the marker row with its own status, which
// the disposition loader drops like every namespaced marker's.

/** The marker's status while a filing holds the capture. */
export const CLAIM_STATUS = "filing";

/** A claim older than this is a filing that died mid-flight (a closed tab, a
 *  timed-out function); the next filing of the capture takes it over. */
export const CLAIM_STALE_MS = 10 * 60 * 1000;

/** What the duplicate check found: this filing holds the capture, the
 *  capture is already on file (with the marker's reason, "<ISO>·<note id>"),
 *  a twin is filing it now, or the check failed open (D7). */
export type Claim =
  | { kind: "claimed"; token: string }
  | { kind: "filed"; reason: string }
  | { kind: "inflight" }
  | { kind: "skipped" };

/** The slice of the Prisma client the claim needs — a test hands in a stub. */
export type ClaimClient = {
  accountDisposition: {
    create(args: {
      data: { accountId: string; status: string; reason: string };
    }): Promise<unknown>;
    findUnique(args: {
      where: { accountId: string };
    }): Promise<{ status: string; reason: string | null } | null>;
    updateMany(args: {
      where: { accountId: string; status: string; reason: string };
      data: { reason: string };
    }): Promise<{ count: number }>;
    deleteMany(args: {
      where: { accountId: string; status: string; reason: string };
    }): Promise<{ count: number }>;
  };
};

const isUniqueViolation = (e: unknown): boolean =>
  !!e && typeof e === "object" && (e as { code?: unknown }).code === "P2002";

/** The claim's token: its moment, so a stale claim is readable as stale, and
 *  a nonce, so a release or a takeover touches this claim and no other. */
const claimToken = (now: Date): string =>
  `${now.toISOString()}·claim:${globalThis.crypto.randomUUID()}`;

/** Claim a capture for one filing. Fails open (D7): a store that errors
 *  answers "skipped" and the filing goes ahead, saying so on its receipt. */
export async function claimCapture(
  pasteKey: string,
  now: Date,
  client: ClaimClient = getPrisma(),
): Promise<Claim> {
  const token = claimToken(now);
  // Twice: a claim released between a twin's create and its read leaves the
  // key free, and the second attempt takes it.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await client.accountDisposition.create({
        data: { accountId: pasteKey, status: CLAIM_STATUS, reason: token },
      });
      return { kind: "claimed", token };
    } catch (e) {
      if (!isUniqueViolation(e)) return { kind: "skipped" };
    }
    try {
      const prior = await client.accountDisposition.findUnique({
        where: { accountId: pasteKey },
      });
      if (!prior) continue;
      const reason = prior.reason ?? "";
      if (prior.status !== CLAIM_STATUS) return { kind: "filed", reason };
      const at = Date.parse(reason.split("·")[0] ?? "");
      if (!Number.isNaN(at) && now.getTime() - at < CLAIM_STALE_MS)
        return { kind: "inflight" };
      // A stale claim: take it over only if it is still the one read, so two
      // filings arriving after a dead one cannot both take it.
      const took = await client.accountDisposition.updateMany({
        where: { accountId: pasteKey, status: CLAIM_STATUS, reason },
        data: { reason: token },
      });
      return took.count === 1 ? { kind: "claimed", token } : { kind: "inflight" };
    } catch {
      return { kind: "skipped" };
    }
  }
  return { kind: "skipped" };
}

/** Let a claim go when its filing filed nothing, so the capture can be filed
 *  again. A claim the filing turned into the filed marker is left alone: the
 *  delete matches the claim's own status and token only. */
export async function releaseCapture(
  pasteKey: string,
  token: string,
  client: ClaimClient = getPrisma(),
): Promise<void> {
  try {
    await client.accountDisposition.deleteMany({
      where: { accountId: pasteKey, status: CLAIM_STATUS, reason: token },
    });
  } catch {
    // A claim that will not clear goes stale and is taken over later.
  }
}
