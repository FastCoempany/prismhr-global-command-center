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
import { sanitizeAiResult, type AiCleanResult } from "@/lib/intel/ai-clean";

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

/** Write the filing, replacing the row an earlier filing of the same capture
 *  left: a ✕-parked or undone filing (D13) is re-droppable, and the unique on
 *  (accountId, fingerprint) is never violated. Null when the table is not
 *  there yet — the rows then file without a link, as before. */
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
    const row = await client.filing.findUnique({ where: { id: note.filingId } });
    return row ? rowOf(row).read : null;
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
