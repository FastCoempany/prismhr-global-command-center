"use server";

// What a filing wrote, read on request (slice 18a of the Chute brains
// refactor plan; the face approved 2026-10-06). The receipt line opens one
// click deep to every count it shows (the click-depth law; ruled 2026-10-07,
// pass 8 call 9): the entries' subject lines, the to-dos, their promises,
// the asks and the playbook lines. The ledger keeps counts and never text
// (D12), so the lines come from the rows that carry the filing's id, in
// every namespace the filing writes to (wroteOfFiling), through this door,
// and nothing of them is stored on the way back. A read-only session sees
// receipts (D29), so the read asks for a signed-in session and nothing more;
// the account binds against the book and scopes every read, so a forged id
// reaches no other account's rows. The duplicate receipt opens the earlier
// filing through the same door (pass 8, C2).

import { getAppAccess } from "@/lib/auth";
import { peos } from "@/lib/book";
import { hasDatabaseEnv } from "@/lib/db";
import { wroteOfFiling } from "@/lib/ingest/filing";
import type { FilingWrote } from "@/lib/ingest/wrote";
import { bindAccountId } from "@/lib/room/bind";

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
    return await wroteOfFiling(acct.id, id);
  } catch {
    return null;
  }
}
