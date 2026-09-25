// The way to create an AccountNote — the contract every writer is to take
// (Provenance is columns, ruled 2026-09-25, P3/P4 — CLAUDE.md, The Ted
// doctrine :405). Stamps provenance (lane/actors/source/recipients) and
// degrades to the pre-migration column set if the DB hasn't gained the
// provenance columns yet — so deploys never race the Supabase SQL. A create
// outside this module is a bare row and a defect by the ruling; the audit of
// 2026-09-25 found them in src/app/accounts/draft-actions.ts (the mail
// template store) and src/lib/activity/run.ts (the second record's
// namespaced notes).
//
// Money never reaches the table through this door: the body is redacted here,
// whatever the caller did upstream (the Ted doctrine's E3, ruled 2026-09-25).
// The one carve-out is the Scratchpaper, whose pact keeps figures because the
// pad routes nowhere by construction — it says so with `keepFigures`.

import { getPrisma } from "@/lib/db";
import { redactMoney } from "@/lib/intel/lexicon";
import type { Lane } from "@/lib/intel/provenance";

type NewAccountNote = {
  accountId: string;
  partner?: string;
  kind: "mine" | "partner" | "account";
  body: string;
  lane?: Lane;
  actors?: string;
  source?: string;
  /** Every recipient the capture kept, comma-joined, our own side included.
   *  `actors` names the account's person by design and cannot answer "did this
   *  reach us"; this can (src/lib/intel/provenance.ts). */
  recipients?: string;
  // The ACTIVITY's own moment (a pasted email's send time), not the filing
  // moment — so the record and the intel clock keep true chronology. Omitted
  // (or invalid) → the DB stamps now(), as before.
  at?: Date;
  /** The Scratchpaper's carve-out (CLAUDE.md, The Scratchpaper, amended
   *  2026-08-21): scratch lines are NOT money-redacted. Nothing else sets it. */
  keepFigures?: boolean;
};

/** The columns a note row is written with, oldest tier first. */
export type AccountNoteData = {
  accountId: string;
  partner: string;
  kind: string;
  body: string;
  createdAt?: Date;
  lane?: string;
  actors?: string;
  source?: string;
  recipients?: string;
};

/** The slice of the Prisma client the writer needs — a test hands in a stub. */
type NoteClient = {
  accountNote: {
    create(args: { data: AccountNoteData }): Promise<{ id: string }>;
  };
};

export async function createAccountNoteRow(
  n: NewAccountNote,
  client: NoteClient = getPrisma(),
): Promise<{ id: string }> {
  const at =
    n.at instanceof Date && !Number.isNaN(n.at.getTime()) ? { createdAt: n.at } : {};
  const body = n.keepFigures ? n.body : redactMoney(n.body ?? "");
  const stable: AccountNoteData = {
    accountId: n.accountId,
    partner: n.partner ?? "",
    kind: n.kind,
    body,
    ...at,
  };
  const provenance: AccountNoteData = {
    ...stable,
    lane: n.lane ?? "mine",
    actors: n.actors ?? "",
    source: n.source ?? "",
  };
  try {
    // Newest column first. It gets its own tier rather than joining the one
    // below: sharing a tier would mean an unmigrated database silently drops
    // lane, actors and source too, which is a much larger loss than the one
    // column actually missing.
    return await client.accountNote.create({
      data: { ...provenance, recipients: n.recipients ?? "" },
    });
  } catch {
    try {
      return await client.accountNote.create({ data: provenance });
    } catch {
      return await client.accountNote.create({ data: stable });
    }
  }
}
