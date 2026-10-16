// Low signal (founder's order, 2026-10-16): a deal row on the HomeRoom that
// isn't in the operator's Salesforce pipeline of opportunities. The row keeps
// everything, its read, its registers and its record; it only moves into the
// LOW SIGNAL section, which sits between the live board and the closed ledger.
//
// The fact is the operator's own hand, stored as a namespaced disposition
// (`lowsig:<account>`), status "parked" so loadDispositions() keeps it.
// Namespaced keys are not accounts: Groundwork's ledgerExclusions() skips any
// key with a colon, so marking a row low signal changes nothing outside the
// HomeRoom.

export const LOW_SIGNAL_NS = "lowsig:";

/** The disposition key for a row: its account, or its card when the card is
 *  bound to no account. Keyed by account first so the mark survives a card
 *  being retired and the account added back. */
export function lowSignalKey(r: { accountId: string; cardId: string }): string {
  return `${LOW_SIGNAL_NS}${r.accountId || `card:${r.cardId}`}`;
}

export type BoardGroup = "live" | "low" | "closed";

/** Where a row sits on the board. A stamped outcome outranks the low-signal
 *  mark: a closed deal belongs to the closed ledger whatever else is true. */
export function boardGroup(r: { outcome: unknown; lowSignal?: boolean }): BoardGroup {
  if (r.outcome) return "closed";
  return r.lowSignal ? "low" : "live";
}

/** The board's order: the live book, then low signal, then the closed ledger. */
export const GROUP_ORDER: Record<BoardGroup, number> = { live: 0, low: 1, closed: 2 };
