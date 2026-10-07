// One account's read over a handful of record rows, for the suites that used
// to pin a behavior through corpusFor and dealIntelFor. Those two retired with
// their last caller (pass 8 housekeeping): every surface reads the account
// through the single read (src/lib/record/read.ts, readAccount), so the pins
// call it too. The seed is joined as readFromStores joins it — the digest by
// id, then by name — and the roster is declared, never optional (E9).

import { digestFor, digestForCardName } from "../../src/lib/intel/digest";
import {
  readAccount,
  type AccountRead,
  type AccountReadInput,
  type RecordNote,
} from "../../src/lib/record/read";

/** A row as a fixture writes it: the loader's columns it leaves out read as
 *  the wide loader hands an old row (no lane, actors, source or recipients
 *  stamped). */
export type FixtureRow = {
  id: string;
  body: string;
  createdAt: string;
  kind?: string;
  actors?: string;
  recipients?: string | null;
  source?: string;
  lane?: string;
};

export function readRows(
  account: { id: string; name: string },
  rows: readonly FixtureRow[],
  opts: {
    homeSide: readonly string[];
    todos?: AccountReadInput["todos"];
    touches?: AccountReadInput["touches"];
    now?: Date;
  },
): AccountRead {
  const notes: RecordNote[] = rows.map((r) => ({
    accountId: account.id,
    partner: "",
    lane: r.lane === "background" ? "background" : "mine",
    actors: r.actors ?? "",
    source: r.source ?? "",
    recipients: r.recipients ?? "",
    id: r.id,
    body: r.body,
    createdAt: r.createdAt,
    kind: r.kind === "mine" || r.kind === "partner" ? r.kind : "account",
  }));
  return readAccount({
    account,
    notes,
    touches: opts.touches ?? [],
    todos: opts.todos ?? [],
    dispositions: new Map(),
    homeSide: opts.homeSide,
    digest: digestFor(account.id) ?? digestForCardName(account.name),
    now: opts.now ?? new Date("2026-10-07T17:00:00Z"),
  });
}
