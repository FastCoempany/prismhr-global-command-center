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
};

export async function createAccountNoteRow(n: NewAccountNote): Promise<{ id: string }> {
  const prisma = getPrisma();
  const stable = {
    accountId: n.accountId,
    partner: n.partner ?? "",
    kind: n.kind,
    body: n.body,
  };
  try {
    return await prisma.accountNote.create({
      data: {
        ...stable,
        lane: n.lane ?? "mine",
        actors: n.actors ?? "",
        source: n.source ?? "",
      },
    });
  } catch {
    return await prisma.accountNote.create({ data: stable });
  }
}
