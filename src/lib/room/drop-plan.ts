// The Drop's decisions around the vault, pure so the suite can pin them as
// behavior. The vault waits on the verdict (founder-decreed 2026-09-03): a
// readable capture archives under its account once its filing is ACCEPTED —
// a misfiled drop used to put its file in the wrong account's folder too, and
// the vault never un-writes (the Simploy call in accounts/Regis HR Group/).
// Files the reader cannot open carry no verdict to wait for, so they go at
// once. A readable file whose filing fails for a reason other than a dispute
// or a duplicate still backs up (ruled 2026-10-07, pass 8 call 8): git is
// the home for every dropped file (D8).

export type DropSplit = {
  /** The first readable file: the one the Drop read alone before slice 8 of
   *  the Chute brains refactor plan, kept for the suites that read the split
   *  one file at a time. `readables` is the whole list. */
  readable: File | undefined;
  /** Every file the reader can open, in drop order. Each one is read and
   *  waits on its own filing's verdict: a drop of two .eml files is two
   *  filings, never one filing and one file lost to the record (audit pass
   *  1, bug 2; closed in slice 8). */
  readables: File[];
  /** Everything else: vault-only, archived now, never read a second time. */
  unreadable: File[];
};

/** Split a drop by the reader's accept list: every readable file goes to the
 *  reader and waits; the rest go straight to the vault. */
export function splitDrop(files: readonly File[], accept: string): DropSplit {
  const readableExts = new Set(
    accept.split(",").map((e) => e.trim().replace(".", "").toLowerCase()),
  );
  const canRead = (x: File): boolean =>
    readableExts.has(x.name.split(".").pop()?.toLowerCase() ?? "");
  const readables = files.filter(canRead);
  return {
    readable: readables[0],
    readables,
    unreadable: files.filter((x) => !canRead(x)),
  };
}

export type VaultStep = {
  /** Files the verdict releases to the vault. */
  archive: File[];
  /** Files the verdict holds with the question, to ride the forced retry. */
  hold: File[];
  /** Files whose filing failed for a reason other than a dispute or a
   *  duplicate. They back up all the same, to the account the filing named
   *  or under accounts/_unfiled/, and the receipt says the filing failed and
   *  the file is backed up (pass 8 call 8). Present only when there are any. */
  failed?: File[];
};

/** What a filing's verdict does with the files waiting on it: an accepted
 *  filing releases them to the vault, a disputed one holds them with the
 *  question, a duplicate vaults nothing new (D8: the earlier filing's backup
 *  is already there), and a filing that failed for any other reason hands
 *  them to the backup as failed. */
export function vaultAfterVerdict(
  r: { ok: boolean; mismatch?: unknown; duplicate?: boolean },
  waiting: readonly File[] | undefined,
): VaultStep {
  const files = [...(waiting ?? [])];
  if (r.mismatch) return { archive: [], hold: files };
  if (r.ok) return { archive: files, hold: [] };
  if (r.duplicate || files.length === 0) return { archive: [], hold: [] };
  return { archive: [], hold: [], failed: files };
}
