// The one way to create an AccountNote. Stamps provenance (lane/actors/source)
// and degrades to the pre-migration column set if the DB hasn't gained the
// provenance columns yet — so deploys never race the Supabase SQL.

import { getPrisma } from "@/lib/db";
import type { Lane } from "@/lib/intel/provenance";

export type NewAccountNote = {
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
};

export async function createAccountNoteRow(n: NewAccountNote): Promise<{ id: string }> {
  const prisma = getPrisma();
  const at =
    n.at instanceof Date && !Number.isNaN(n.at.getTime()) ? { createdAt: n.at } : {};
  const stable = {
    accountId: n.accountId,
    partner: n.partner ?? "",
    kind: n.kind,
    body: n.body,
    ...at,
  };
  const provenance = {
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
    return await prisma.accountNote.create({
      data: { ...provenance, recipients: n.recipients ?? "" },
    });
  } catch {
    try {
      return await prisma.accountNote.create({ data: provenance });
    } catch {
      return await prisma.accountNote.create({ data: stable });
    }
  }
}
