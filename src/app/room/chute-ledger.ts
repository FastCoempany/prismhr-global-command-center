// The Chute's ledger codec — pure, no React, no DOM. The receipt ledger
// survives a reload per Chicago day (CLAUDE.md, The Chute). What each row
// carries across that reload is decided here, by state:
//
//   · a row waiting on the operator (pick, mismatch) keeps its text and
//     comes back in the same state — a disputed read waits for the pick, and
//     a reload must not quietly turn the wait into "drop it again";
//   · a row mid-read when the tab died (reading, filing, activity) comes back
//     interrupted, because its read died with the tab;
//   · a settled row (filed, undone, vaulted, dupe, error, activityDone,
//     interrupted) keeps the account, the counts, the day and the rung the
//     router placed it on — never an address, never body text.
//
// A waiting row whose text cannot be kept — a binary awaiting the vault, or a
// capture past LEDGER_TEXT_CAP — comes back interrupted and says to drop it
// again. The limiter at the foot is the Chute's concurrency ceiling: at most
// CHUTE_PARALLEL files read at once; the rest wait in drop order.

import type { RouteHit } from "@/lib/route-capture";

export type LedgerState =
  | "reading"
  | "filing"
  | "filed"
  | "pick"
  | "mismatch"
  | "error"
  | "dupe"
  | "interrupted"
  | "undone"
  | "activity"
  | "activityDone"
  | "vaulted";

export type LedgerRow = {
  key: number;
  filename: string;
  state: LedgerState;
  text?: string;
  account?: { id: string; name: string };
  why?: string;
  /** The router's rung that placed the row (email, domain, person, name,
   *  head, initials) or the operator's own hand (pick, batch). Settled rows
   *  keep this in place of the why, which can carry an address. */
  rung?: string;
  candidates?: RouteHit[];
  /** The activity drop's own arrival counts — what came in, before any verdict. */
  came?: { rows: number; accounts: number; textRows: number };
  /** The take-back asks twice; one click arms it. */
  armed?: boolean;
  filed?: number;
  opened?: number;
  asks?: number;
  learned?: number;
  reason?: string;
  claim?: string;
  batch?: number;
  archived?: boolean;
  degraded?: boolean;
  noteIds?: string[];
  todoIds?: string[];
  /** A second-record drop. Marked structurally so the ledger's reconcile can
   *  find its receipts without sniffing filenames or reason text. */
  act?: boolean;
  vault?: { text: string; url?: string; bad?: boolean };
};

export const LEDGER_KEY = "chute-ledger-v1";
export const LEDGER_CAP = 40;
/** The most text a waiting row may carry into storage. Past this the row
 *  comes back interrupted rather than risking the whole ledger on a quota
 *  refusal. */
export const LEDGER_TEXT_CAP = 200_000;
/** How many dropped files the Chute reads at once. */
export const CHUTE_PARALLEL = 3;

export const READ_CUT_SHORT = "A reload cut the read short. Drop the file again.";
export const PICK_LOST = "The pick did not survive. Drop the file again.";

export type LedgerStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export const chicagoDay = (now: Date = new Date()): string =>
  now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });

export const isWaiting = (s: LedgerState): boolean => s === "pick" || s === "mismatch";
export const isInFlight = (s: LedgerState): boolean =>
  s === "reading" || s === "filing" || s === "activity";
export const isSettled = (s: LedgerState): boolean => !isWaiting(s) && !isInFlight(s);

// The router's why strings, read back into the rung that produced them —
// only for rows persisted before the rung rode on the row itself.
export function rungFromWhy(why: string | undefined): string {
  const w = (why ?? "").trim();
  if (!w) return "";
  if (w === "your call") return "pick";
  if (w === "the rest of this drop went there") return "batch";
  if (/'s contact$/.test(w)) return w.includes("@") ? "email" : "person";
  if (/address in the text$/.test(w)) return "domain";
  if (/^named in the text$/.test(w)) return "name";
  if (/appears in the text$/.test(w)) return "head";
  if (/matches the initials$/.test(w)) return "initials";
  return "other";
}

export const rungOf = (row: LedgerRow): string => row.rung || rungFromWhy(row.why);

/** One row as it is written to storage. */
export function storedRow(x: LedgerRow): LedgerRow {
  const base: LedgerRow = {
    key: x.key,
    filename: x.filename,
    state: x.state,
    account: x.account,
    came: x.came,
    filed: x.filed,
    opened: x.opened,
    asks: x.asks,
    learned: x.learned,
    reason: x.reason,
    claim: x.claim,
    batch: x.batch,
    archived: x.archived,
    degraded: x.degraded,
    noteIds: x.noteIds,
    todoIds: x.todoIds,
    act: x.act,
    vault: x.vault,
  };
  if (isWaiting(x.state)) {
    const keep = !!x.text && x.text.length <= LEDGER_TEXT_CAP;
    return {
      ...base,
      why: x.why,
      rung: rungOf(x) || undefined,
      ...(keep ? { text: x.text, candidates: x.candidates } : {}),
    };
  }
  return { ...base, rung: rungOf(x) || undefined };
}

/** One row as it comes back after a reload. */
export function reconcileRow(x: LedgerRow): LedgerRow {
  if (isInFlight(x.state)) return { ...x, state: "interrupted", reason: READ_CUT_SHORT };
  if (isWaiting(x.state) && !x.text)
    return { ...x, state: "interrupted", reason: PICK_LOST };
  return x;
}

const EMPTY = { items: [] as LedgerRow[], maxKey: 0 };

export function loadLedger(
  storage: LedgerStorage,
  now: Date = new Date(),
): { items: LedgerRow[]; maxKey: number } {
  try {
    const raw = storage.getItem(LEDGER_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as { day?: string; items?: LedgerRow[] };
    if (parsed.day !== chicagoDay(now) || !Array.isArray(parsed.items)) return EMPTY;
    const items = parsed.items.slice(0, LEDGER_CAP).map(reconcileRow);
    return { items, maxKey: items.reduce((m, x) => Math.max(m, x.key), 0) };
  } catch {
    return EMPTY;
  }
}

export function saveLedger(
  items: readonly LedgerRow[],
  storage: LedgerStorage,
  now: Date = new Date(),
): void {
  try {
    storage.setItem(
      LEDGER_KEY,
      JSON.stringify({
        day: chicagoDay(now),
        items: items.slice(0, LEDGER_CAP).map(storedRow),
      }),
    );
  } catch {
    // storage full or blocked — the live view still works
  }
}

/** Run tasks with at most `limit` in flight, starting them in order and
 *  returning their results in that same order. A task that throws rejects the
 *  whole run; the Chute's own tasks never throw — each swallow catches. */
export async function runLimited<T>(
  tasks: readonly (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array<T>(tasks.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]!();
    }
  };
  const lanes = Math.max(1, Math.min(Math.floor(limit), tasks.length));
  await Promise.all(Array.from({ length: lanes }, worker));
  return results;
}
