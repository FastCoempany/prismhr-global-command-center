"use client";

// The take-back (the Chute brains refactor plan, §2.4 and slice 8). ↩ on a
// receipt takes back the whole filing and only that filing. The Filing row is
// the handle since slice 4: every row and todo the filing wrote carries its
// id, so the undo names it and the server takes back everything still
// linked, then the row itself. The id lists ride beside it for the receipts
// that predate the Filing table: a row filed before slice 4 has no filingId,
// and its undo is the ids the receipt kept. Both doors hand over both.

import { useRouter } from "next/navigation";
import type { GrabSummary } from "@/lib/ingest/grab";
import { roomGrabUndo, roomPasteUndo } from "../actions";

/** What a receipt keeps for its take-back. */
export type Undoable = {
  noteIds?: string[];
  todoIds?: string[];
  /** The Filing row the filing wrote (§2.1 of the plan); absent on a receipt
   *  filed before the table existed. */
  filingId?: string;
  /** A Sales Nav grab's split (seam S-25): every account it filed to, each
   *  with its own note and Filing row. */
  grab?: Pick<GrabSummary, "accounts">;
};

/** A grab's take-back: every account it filed to, each with its own note
 *  and Filing row, which the server takes back one account at a time, each
 *  bound to its account as every undo is, so the whole grab goes back and
 *  no id reaches another account. Pure, so the suite can read what the
 *  take-back asks. */
export function grabUndoRequest(
  grab: Pick<GrabSummary, "accounts">,
): Parameters<typeof roomGrabUndo> {
  return [
    grab.accounts.map((a) => ({
      id: a.id,
      noteId: a.noteId,
      ...(a.filingId ? { filingId: a.filingId } : {}),
    })),
  ];
}

/** What the undo asks of the server: the account, every note id and todo id
 *  the receipt kept, and the Filing id when the filing wrote one. Pure, so
 *  the suite can read what each door hands over. */
export function undoRequest(
  accountId: string,
  row: Undoable,
): Parameters<typeof roomPasteUndo> {
  return [accountId, row.noteIds ?? [], row.todoIds ?? [], row.filingId];
}

export function useUndo() {
  const router = useRouter();
  const undo = async (accountId: string, row: Undoable) => {
    // A grab filed on many accounts: its take-back reaches each of them.
    const r = row.grab?.accounts.length
      ? await roomGrabUndo(...grabUndoRequest(row.grab))
      : await roomPasteUndo(...undoRequest(accountId, row));
    // The rows are gone and every page derives on request (D15): the client
    // asks for the fresh read here, as the filing does; the server
    // revalidates nothing (slice 9), so this ask is the take-back's only one.
    if (r.ok) router.refresh();
    return r;
  };
  return { undo };
}
