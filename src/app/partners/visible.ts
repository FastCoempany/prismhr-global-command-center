// Hidden is hidden (pass 8 X1). A record entry the operator ✕-parked carries
// a `hide:note:<id>` disposition: the note survives in the table and leaves
// every reader. The Partner Room reads the account notes twice, for the
// drafting desk's recipients (the relationship at each teed-up account) and
// for the draft's own prompt, and both read through this filter, so a parked
// row never names a recipient and never rides into a draft.

import { hideNoteKey } from "@/lib/record/hide";

export function visibleNotes<N extends { id: string }>(
  notesById: ReadonlyMap<string, readonly N[]>,
  dispositions: { has(key: string): boolean },
): Map<string, N[]> {
  const out = new Map<string, N[]>();
  for (const [id, notes] of notesById)
    out.set(
      id,
      notes.filter((n) => !dispositions.has(hideNoteKey(n.id))),
    );
  return out;
}
