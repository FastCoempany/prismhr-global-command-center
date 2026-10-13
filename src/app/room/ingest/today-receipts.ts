// A HomeRoom row's TODAY, rebuilt from the record (decreed 2026-10-13: "today
// should always show what happened today"). The server reads the account's
// filings from today (src/lib/ingest/today-filings.ts); this module turns each
// into the same receipt a filing in this tab shows, merges them with the tab's
// own receipts by filing id, drops one the record no longer holds (taken back
// from another door), and keeps a receipt the operator cleared out of sight
// for the rest of the Chicago day. Pure, so the suite reads every rule.

import type { TodayFiling } from "@/lib/ingest/today-filings";
import type { LedgerRow } from "../chute-ledger";

/** A row's TODAY entry: a plain line, or a receipt. */
export type TodayEntry = { text: string; receipt?: undefined } | { receipt: LedgerRow };

/** The receipt one filing from today shows: the account, its counts, its day
 *  and its caveats, with its filing id for the ↺ and for opening its lines. */
export function todayReceipt(
  f: TodayFiling,
  account: { id: string; name: string },
  key: number,
): LedgerRow {
  return {
    key,
    filename: "",
    state: "filed",
    account,
    filed: f.filed,
    opened: f.opened,
    promises: f.promises,
    asks: f.asks,
    learned: f.learned,
    degraded: f.degraded,
    filingId: f.filingId,
    windows: f.windows,
    dupeCheck: f.dupeCheck,
    day: f.day,
    fromRecord: true,
  };
}

/** The tab's entries with the record's filings merged in. A filing the tab
 *  already shows keeps the tab's receipt, which may carry its backup line. A
 *  receipt rebuilt from the record leaves when the record no longer holds its
 *  filing (taken back from another door) or when it was cleared today; the
 *  tab's own receipts are never dropped here, so a take-back's "Taken back."
 *  line stays. */
export function mergeToday(
  entries: readonly TodayEntry[],
  filings: readonly TodayFiling[],
  account: { id: string; name: string },
  opts: { cleared: ReadonlySet<string>; nextKey: () => number },
): TodayEntry[] {
  const live = new Set(filings.map((f) => f.filingId));
  const kept = entries.filter((e) => {
    const rc = e.receipt;
    if (!rc?.fromRecord || rc.state !== "filed") return true;
    return !!rc.filingId && live.has(rc.filingId) && !opts.cleared.has(rc.filingId);
  });
  const shown = new Set(
    kept.map((e) => e.receipt?.filingId).filter((id): id is string => !!id),
  );
  const added: TodayEntry[] = [];
  for (const f of filings) {
    if (shown.has(f.filingId) || opts.cleared.has(f.filingId)) continue;
    added.push({ receipt: todayReceipt(f, account, opts.nextKey()) });
  }
  if (added.length === 0 && kept.length === entries.length)
    return entries as TodayEntry[];
  return [...kept, ...added];
}

/** Where a cleared receipt is remembered, per browser, for one Chicago day. */
export const CLEARED_KEY = "room-cleared-v1";

type Store = Pick<Storage, "getItem" | "setItem">;

/** The filing ids cleared today. Another day's list reads as empty. */
export function loadCleared(store: Store, day: string): Set<string> {
  try {
    const raw = JSON.parse(store.getItem(CLEARED_KEY) ?? "null") as {
      day?: unknown;
      ids?: unknown;
    } | null;
    if (!raw || raw.day !== day || !Array.isArray(raw.ids)) return new Set();
    return new Set(raw.ids.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

/** Remember one more cleared filing for today. */
export function saveCleared(store: Store, day: string, filingId: string): void {
  try {
    const ids = loadCleared(store, day);
    ids.add(filingId);
    store.setItem(CLEARED_KEY, JSON.stringify({ day, ids: [...ids].slice(-200) }));
  } catch {
    // Storage refused: the receipt is cleared for this page only.
  }
}
