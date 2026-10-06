"use server";

// What a filing wrote, read on request (slice 18a of the Chute brains
// refactor plan; the face approved 2026-10-06). The receipt line opens one
// click deep to the entries' subject lines, the to-dos and their promises
// (the click-depth law). The ledger keeps counts and never text (D12), so
// the lines come from the rows that carry the filing's id, through this
// door, and nothing of them is stored on the way back. A read-only session
// sees receipts (D29), so the read asks for a signed-in session and nothing
// more; the account binds against the book and scopes both reads, so a
// forged id reaches no other account's rows.

import { getAppAccess } from "@/lib/auth";
import { peos } from "@/lib/book";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { wroteFrom, type FilingWrote } from "@/lib/ingest/wrote";
import { bindAccountId } from "@/lib/room/bind";

/** The most rows one receipt opens to; a filing files at most ENTRY_CAP
 *  entries, so this is room for them, the transcript and the loops. */
const ROWS = 60;

export async function filingWrote(
  accountId: string,
  filingId: string,
): Promise<FilingWrote | null> {
  if (!hasDatabaseEnv()) return null;
  const access = await getAppAccess();
  if (access.status !== "active") return null;
  const acct = bindAccountId(accountId, peos);
  const id = typeof filingId === "string" ? filingId.trim().slice(0, 40) : "";
  if (!acct || !id) return null;
  try {
    const prisma = getPrisma();
    const [notes, todos] = await Promise.all([
      prisma.accountNote.findMany({
        where: { filingId: id, accountId: acct.id },
        orderBy: { createdAt: "asc" },
        select: { body: true, createdAt: true },
        take: ROWS,
      }),
      prisma.todo.findMany({
        where: { filingId: id, accountId: acct.id },
        orderBy: { createdAt: "asc" },
        select: { body: true },
        take: ROWS,
      }),
    ]);
    return wroteFrom(notes, todos);
  } catch {
    return null;
  }
}
