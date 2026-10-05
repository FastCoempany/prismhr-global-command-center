"use client";

// The receipt ledger (the Chute brains refactor plan, §2.4 and slice 8), over
// the pure codec in ../chute-ledger.ts. Every file thrown at the Chute gets
// its row the moment it lands and keeps it through the day: the ledger
// survives a reload per Chicago day; a row waiting on the operator's pick
// keeps its text and comes back waiting (C20); a row mid-read when the tab
// died comes back interrupted; a settled row keeps the account, the counts,
// the day and the rung the router placed it on, never an address, never body
// text (D12; storedRow decides). Receipts dismiss per row and all at once
// (D12). A stored second-record receipt is a seed the live run outranks (the
// Ted doctrine, applied to receipts): every settled activity row re-reads the
// live receipt on mount and whenever the tab comes back into view, so a drop
// that failed at 13:51 and was re-run green from the Intranet dock at 17:37
// never sits red here for four hours again (2026-09-01).
//
// The Drop's receipts are the TODAY register's and have no ledger; their
// shape, like the Chute's, waits on the face pass.

import { useEffect, useRef, useState } from "react";
import { activityReceipt } from "../../activity/actions";
import {
  isSettled,
  loadLedger,
  reconcileActivityRows,
  saveLedger,
  type LedgerRow,
} from "../chute-ledger";

/** One receipt as the Chute holds it: the ledger's row plus the one field
 *  that never persists. */
export type Receipt = LedgerRow & {
  /** The dropped File itself, volatile, never persisted; a reload loses it
   *  and the pick line says so honestly. Carried so a recording can vault
   *  after the operator picks its account. */
  file?: File;
};

export function useReceipts() {
  const [items, setItems] = useState<Receipt[]>([]);
  const seq = useRef(0);
  const loaded = useRef(false);

  /** Re-read the second record's live run into every settled activity row.
   *  The reconcile is pure (chute-ledger.ts); it hands back the same array
   *  when nothing changes, so the setter bails out. */
  const reconcile = async () => {
    const live = await activityReceipt();
    setItems((xs) => reconcileActivityRows(xs, live));
  };

  // Reload the day's ledger once on mount; persist on every change after.
  useEffect(() => {
    const back = () => {
      if (document.visibilityState === "visible") void reconcile();
    };
    document.addEventListener("visibilitychange", back);
    const stored = loadLedger(localStorage);
    seq.current = stored.maxKey;
    loaded.current = true;
    if (!stored.items.length) {
      return () => document.removeEventListener("visibilitychange", back);
    }
    // Deferred so hydration completes against the server's empty list first.
    const t = setTimeout(() => {
      setItems(stored.items);
      if (stored.items.some((x) => x.act)) void reconcile();
    }, 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", back);
    };
  }, []);
  useEffect(() => {
    if (loaded.current) saveLedger(items, localStorage);
  }, [items]);

  const patch = (key: number, up: Partial<Receipt>) =>
    setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...up } : x)));

  /** Seat every dropped file the moment it lands, newest first, each with
   *  the batch it arrived in; the keys come back in drop order so the reads
   *  can run in that order. */
  const seat = (files: readonly File[], batch: number): { f: File; key: number }[] => {
    const seated = files.map((f) => ({ f, key: ++seq.current }));
    setItems((xs) => [
      ...seated
        .map(({ f, key }) => ({
          key,
          filename: f.name,
          state: "reading" as const,
          batch,
          file: f,
        }))
        .reverse(),
      ...xs,
    ]);
    return seated;
  };

  /** A settled receipt is the operator's to clear (decreed 2026-09-01); the
   *  gate is isSettled in chute-ledger.ts. */
  const settled = (row: Receipt): boolean => isSettled(row.state);
  const dismiss = (key: number) => setItems((xs) => xs.filter((x) => x.key !== key));
  const dismissAll = () => setItems([]);

  return { items, patch, seat, settled, dismiss, dismissAll, reconcile };
}
