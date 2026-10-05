// The read over the loaded stores (the Chute brains refactor plan, §2.2;
// slice 12). readAccount is pure: it takes one account's slice of every store
// with the book's seeds already joined. This is the one place that joins them
// — the wide loader's folded rows, the roster, the seeded contact, the digest,
// the second record's fold, the declared home side — so every surface that
// builds a read off the loaders assembles it the same way. The Pipeline's
// fresh pull, the ask minter, the intake prefill and the ask room's live read
// all come through here. The HomeRoom's row loop assembles the same input
// inline beside its card (src/app/room/page.tsx) and hands its reads down to
// the pipeline, so the report is built once per /room load (pass 4 G2).

import type { SecondRecord } from "@/lib/activity/read";
import { csms, peos } from "@/lib/book";
import { contactsFor } from "@/lib/book/contacts";
import { digestFor, digestForCardName } from "@/lib/intel/digest";
import {
  readAccount,
  secondRecordFor,
  type AccountRead,
  type AccountReadInput,
  type RecordNote,
} from "./read";

/** The loaders' output, as a page or an action holds it after one round of
 *  reads (src/lib/today/overlay.ts; src/lib/activity/read.ts). */
export type LoadedStores = {
  /** The wide loader's rows by account id — folded, so a row filed under a
   *  shell id already sits under its canonical account (src/lib/book/merge.ts;
   *  the Ted doctrine: the two stores merge). */
  notesById: ReadonlyMap<string, readonly RecordNote[]>;
  /** The whole touch log; the read keeps the account's slice. */
  touches: AccountReadInput["touches"];
  /** Every todo, done included; the read keeps the account's. */
  todos: AccountReadInput["todos"];
  /** The disposition markers; the read's hide filter reads them. */
  dispositions: ReadonlyMap<string, unknown>;
  /** The second record by raw tail, when the caller loaded it. */
  secondById?: ReadonlyMap<string, SecondRecord>;
  /** Who counts as our side, declared — `declaredHomeSide` below (E9). */
  homeSide: readonly string[];
};

/** The declared roster: the CSM column unioned with everyone the record shows
 *  working across several accounts — `homeSideFrom` over the WHOLE book
 *  (src/lib/pipeline/build.ts), never the active slice. One spelling of the
 *  union, so no caller hands the read a partial roster that would demote a
 *  reply to a colleague (the Ted doctrine; E9). */
export function declaredHomeSide(fromRecord: Iterable<string>): string[] {
  return [...csms, ...fromRecord];
}

/** One account's read from the loaded stores. `board` is the account's card
 *  when the caller has the board; without it the stage reads null. */
export function readFromStores(
  stores: LoadedStores,
  account: { id: string; name: string },
  opts: { now: Date; board?: AccountReadInput["board"] },
): AccountRead {
  const peo = peos.find((p) => p.id === account.id);
  return readAccount({
    account: {
      id: account.id,
      name: account.name,
      // The book's seeds, which the record outranks the moment it speaks.
      contacts: contactsFor(account.id),
      contact: { name: peo?.contactName, email: peo?.contactEmail },
    },
    notes: stores.notesById.get(account.id) ?? [],
    touches: stores.touches,
    todos: stores.todos,
    dispositions: stores.dispositions,
    // The second record, folded by canonical id (E17).
    secondRecord: stores.secondById
      ? secondRecordFor(stores.secondById, account.id)
      : null,
    homeSide: stores.homeSide,
    digest: digestFor(account.id) ?? digestForCardName(account.name),
    now: opts.now,
    board: opts.board ?? null,
  });
}
