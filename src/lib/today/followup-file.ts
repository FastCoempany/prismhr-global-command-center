// File a chase against the accounts it named: one action in the right-hand
// panel (the work) and one note on the record (the memory — without it the
// chase never reaches the account's history on Accounts). The writes are
// handed in, so the server action supplies the real ones and the suite
// supplies fakes; the decisions here are the same either way.

export type FollowUpFiler = {
  /** The room's composer — opens the chase as an action on the account. */
  compose: (
    accountId: string,
    text: string,
    opts: { kind: "action"; urgency: "med" },
  ) => Promise<{ ok: boolean } | null | undefined>;
  /** The record's writer — one note, lane mine, source followup. */
  note: (n: {
    accountId: string;
    kind: "account";
    body: string;
    lane: "mine";
    source: "followup";
  }) => Promise<unknown>;
};

/** Returns the ids that actually took, so the follow-up can remember and
 *  never double-file. At most three accounts; an account whose action did
 *  not take gets no note and is not remembered. */
export async function fileFollowUpToAccounts(
  label: string,
  hits: readonly { id: string; name: string }[],
  filer: FollowUpFiler,
): Promise<string[]> {
  const filed: string[] = [];
  for (const h of hits.slice(0, 3)) {
    const r = await filer
      .compose(h.id, label, { kind: "action", urgency: "med" })
      .catch(() => null);
    if (!r?.ok) continue;
    // The action is the work; the note is the memory.
    await filer
      .note({
        accountId: h.id,
        kind: "account",
        body: `⏲ Follow-up armed: ${label}`,
        lane: "mine",
        source: "followup",
      })
      .catch(() => null);
    filed.push(h.id);
  }
  return filed;
}
