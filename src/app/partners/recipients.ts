// Who the drafting desk writes to at each teed-up account: the relationship,
// the record's person over the book's seed (the Ted doctrine). The read's
// declared home side goes with it, so a colleague who turns up on more
// threads than anyone at the account is never the relationship (ruled
// 2026-10-07, pass 8 call 7): the CSM column unioned with everyone the record
// shows working across several accounts, read over the whole book
// (declaredHomeSide, src/lib/record/stores.ts). Pure; the page hands it the
// visible rows (./visible.ts), so a ✕-parked row names no one.

import { getPeo } from "@/lib/book";
import { contactsFor } from "@/lib/book/contacts";
import type { NoteForPeople } from "@/lib/intel/people";
import { isHomeSideName } from "@/lib/intel/provenance";
import { relationshipFor, type Relationship } from "@/lib/intel/relationship";

export function relationshipAt(
  notes: readonly NoteForPeople[],
  accountId: string,
  homeSide: readonly string[],
): Relationship {
  const p = getPeo(accountId);
  return relationshipFor(
    [...notes],
    contactsFor(accountId),
    { name: p?.contactName, email: p?.contactEmail },
    (n) => isHomeSideName(n, homeSide),
  );
}
