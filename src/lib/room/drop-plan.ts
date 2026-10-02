// The Drop's decisions around the vault, pure so the suite can pin them as
// behavior. The vault waits on the verdict (founder-decreed 2026-09-03): a
// readable capture archives only once its filing is ACCEPTED — a misfiled
// drop used to put its file in the wrong account's folder too, and the vault
// never un-writes (the Simploy call in accounts/Regis HR Group/). Files the
// reader cannot open carry no verdict to wait for, so they go at once.

export type DropSplit = {
  /** The one file the reader takes — it waits on the filing's verdict. */
  readable: File | undefined;
  /** Everything else: vault-only, archived now, never read a second time. */
  unreadable: File[];
};

/** Split a drop by the reader's accept list: the first readable file goes to
 *  the reader and waits; the rest go straight to the vault. */
export function splitDrop(files: readonly File[], accept: string): DropSplit {
  const readableExts = new Set(
    accept.split(",").map((e) => e.trim().replace(".", "").toLowerCase()),
  );
  const readable = files.find((x) =>
    readableExts.has(x.name.split(".").pop()?.toLowerCase() ?? ""),
  );
  return { readable, unreadable: files.filter((x) => x !== readable) };
}

export type VaultStep = {
  /** Files the verdict releases to the vault. */
  archive: File[];
  /** Files the verdict holds with the question, to ride the forced retry. */
  hold: File[];
};

/** What a filing's verdict does with the files waiting on it: an accepted
 *  filing releases them to the vault, a disputed one holds them with the
 *  question, and a filing that failed for any other reason sends nothing
 *  anywhere. */
export function vaultAfterVerdict(
  r: { ok: boolean; mismatch?: unknown },
  waiting: readonly File[] | undefined,
): VaultStep {
  const files = [...(waiting ?? [])];
  if (r.mismatch) return { archive: [], hold: files };
  if (r.ok) return { archive: files, hold: [] };
  return { archive: [], hold: [] };
}
