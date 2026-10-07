// The Chute's ledger codec — pure, no React, no DOM. The receipt ledger
// survives a reload per Chicago day (CLAUDE.md, The Chute). What each row
// carries across that reload is decided here, by state:
//
//   · a row waiting on the operator (pick, mismatch) keeps its text and
//     comes back in the same state — a disputed read waits for the pick, and
//     a reload must not quietly turn the wait into "drop it again";
//   · a row mid-read when the tab died (reading, filing, activity), or still
//     waiting its turn to be read (queued), comes back interrupted, because
//     its read died with the tab;
//   · a settled row (filed, undone, vaulted, unfiled, kept, dupe, error,
//     activityDone, interrupted) keeps the account, the counts, the day and
//     the rung the router placed it on — never an address, never body text,
//     and never the held verdict, whose evidence can carry an address.
//
// A waiting row whose text cannot be kept — a binary awaiting the vault, or a
// capture past LEDGER_TEXT_CAP — comes back interrupted and says to drop it
// again. The limiter at the foot is the Chute's concurrency ceiling: at most
// CHUTE_PARALLEL files read at once; the rest wait in drop order and say so,
// each with its place in the line (D11).

import { keptGrab, type GrabSummary } from "@/lib/ingest/grab";
import type { Window } from "@/lib/ingest/windows";
import type { FilingWrote } from "@/lib/ingest/wrote";
import type { RouteHit } from "@/lib/route-capture";
import { chicagoDay } from "@/lib/tz";

type LedgerState =
  // Seated and waiting its turn: the Chute reads CHUTE_PARALLEL files at once
  // and the rest wait in drop order, saying so (D11).
  | "queued"
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
  | "vaulted"
  // The held box's ✕ (slice 18a): filed on no account and backed up under
  // accounts/_unfiled/, or, for a Send-it capture, kept in the brain.
  | "unfiled"
  | "kept";

/** The verdict a held row waits on (slice 18a): the rung that spoke, its
 *  reason, the evidence behind it on both sides, the claimed account and the
 *  router's candidates. The held box's grounds open to the evidence, which
 *  can carry an address, so a settled row never keeps it (D12). */
export type HeldVerdict = {
  rung?: "text" | "read";
  reason?: string;
  why?: string;
  boundWhy?: string;
  reasonBy?: "model";
  claimId?: string;
  candidates?: { id: string; name: string; rung: string }[];
};

/** One account a waiting row offers: what the held box reads, and what a
 *  route hit carries besides when the Chute routed the row itself. */
export type PickCandidate = { id: string; name: string; rung: string } & Partial<
  Pick<RouteHit, "score" | "why">
>;

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
  /** The router's candidates on a row waiting for the pick, which the held
   *  box offers by id, name and rung. A Chute route's hits carry their score
   *  and why beside them; a Send-it hand-off's never do, because what leaves
   *  the server is names and rungs (D13). */
  candidates?: PickCandidate[];
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
  /** The Filing row the filing wrote (§2.1 of the Chute brains refactor plan). */
  filingId?: string;
  /** Every window that cut something (D4): what a reader cut before the
   *  text arrived rides on a waiting row to the pick's re-run, and a settled
   *  row keeps them for its receipt — counts, never text. */
  windows?: Window[];
  /** Whether the duplicate check ran, or failed open (D7). */
  dupeCheck?: string;
  /** A second-record drop. Marked structurally so the ledger's reconcile can
   *  find its receipts without sniffing filenames or reason text. */
  act?: boolean;
  /** The backup riding the row: in flight, landed (with its link) or failed
   *  (with the reason). */
  vault?: { text: string; url?: string; bad?: boolean; going?: boolean };
  /** The verdict a held row waits on; kept across a reload with the text
   *  (C20) and dropped the moment the row settles (D12). */
  verdict?: HeldVerdict;
  /** A capture another door handed to the Chute: the Intranet's Send-it,
   *  whose disputed or unsure capture the Chute holds and files with that
   *  door (P2, P3; slice 18a, the unsure route since 2026-10-06). Never
   *  shown: the receipt names no door. */
  door?: "intranet";
  /** The day the row settled, M/D in Chicago: a settled row keeps the day. */
  day?: string;
  /** Their promises the filing filed as loops on their side (D10). */
  promises?: number;
  /** One amber sentence for the receipt's second line: the refused export's
   *  decreed line on the Drop (D2 as amended 2026-10-05). */
  note?: string;
  /** A duplicate's earlier filing: its day and, when the Filing table holds
   *  it, its id, so "Already on file." opens one click to what that filing
   *  wrote (pass 8, C2). Ids and a day, never text, so a settled row keeps
   *  it (D12). */
  prior?: { day?: string; filingId?: string };
  /** What a take-back took, as its lines, so "N removed." opens to them
   *  (pass 8, C5). Volatile: the lines are body text, which a settled row
   *  never keeps (D12), so storedRow drops them and a reloaded row opens to
   *  the counts it kept instead. */
  took?: FilingWrote;
  /** A Sales Nav grab's split (seam S-25): the accounts its rows filed to,
   *  the ones already on file and the rows that matched no account. Ids,
   *  names and counts, so a settled row keeps it; the unmatched rows' text
   *  rides only while the tab lives (D12; storedRow drops it). */
  grab?: GrabSummary;
};

const LEDGER_KEY = "chute-ledger-v1";
const LEDGER_CAP = 40;
/** The most text a waiting row may carry into storage. Past this the row
 *  comes back interrupted rather than risking the whole ledger on a quota
 *  refusal. */
export const LEDGER_TEXT_CAP = 200_000;
/** How many dropped files the Chute reads at once. */
export const CHUTE_PARALLEL = 3;

// The decree's words, verbatim (CLAUDE.md, The Chute: mid-flight reads come
// back as "interrupted — drop it again"; B48).
const READ_CUT_SHORT = "interrupted — drop it again";
const PICK_LOST = "The pick did not survive. Drop the file again.";

export type LedgerStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/** The ledger's day is the one Chicago day app-wide (src/lib/tz.ts),
 *  re-exported so the canon suite's import holds. */
export { chicagoDay };

const isWaiting = (s: LedgerState): boolean => s === "pick" || s === "mismatch";
const isInFlight = (s: LedgerState): boolean =>
  s === "queued" || s === "reading" || s === "filing" || s === "activity";

// The router's why strings, read back into the rung that produced them —
// only for rows persisted before the rung rode on the row itself.
function rungFromWhy(why: string | undefined): string {
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

const rungOf = (row: LedgerRow): string => row.rung || rungFromWhy(row.why);

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
    promises: x.promises,
    asks: x.asks,
    learned: x.learned,
    reason: x.reason,
    claim: x.claim,
    batch: x.batch,
    archived: x.archived,
    degraded: x.degraded,
    noteIds: x.noteIds,
    todoIds: x.todoIds,
    filingId: x.filingId,
    windows: x.windows,
    dupeCheck: x.dupeCheck,
    act: x.act,
    vault: x.vault,
    door: x.door,
    day: x.day,
    note: x.note,
    prior: x.prior,
    grab: keptGrab(x.grab),
  };
  if (isWaiting(x.state)) {
    const keep = !!x.text && x.text.length <= LEDGER_TEXT_CAP;
    return {
      ...base,
      why: x.why,
      rung: rungOf(x) || undefined,
      ...(keep ? { text: x.text, candidates: x.candidates, verdict: x.verdict } : {}),
    };
  }
  return { ...base, rung: rungOf(x) || undefined };
}

/** One row as it comes back after a reload. */
function reconcileRow(x: LedgerRow): LedgerRow {
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
 *  returning their results in that same order: one batch through its own
 *  line (readQueue, below). A task that throws rejects the whole run; the
 *  Chute's own tasks never throw — each swallow catches. */
export async function runLimited<T>(
  tasks: readonly (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const run = readQueue(limit);
  return Promise.all(tasks.map((task) => run(task)));
}

/** One line for every read a door starts, however many drops feed it: at
 *  most `limit` in flight, the rest started in the order they joined (D11).
 *  A drop thrown while another is still reading joins behind it, so the
 *  door never reads more than `limit` at once and a waiting file's place
 *  is true. A slot passes straight to the next in line when a read ends,
 *  so nothing joining later can step ahead. */
export function readQueue(limit: number): <T>(task: () => Promise<T>) => Promise<T> {
  const lanes = Math.max(1, Math.floor(limit));
  let running = 0;
  const line: (() => void)[] = [];
  const release = () => {
    const next = line.shift();
    if (next) next();
    else running -= 1;
  };
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (running < lanes && line.length === 0) running += 1;
    else await new Promise<void>((go) => line.push(go));
    try {
      return await task();
    } finally {
      release();
    }
  };
}

/** How many files wait ahead of a queued row: the queued rows seated before
 *  it. Keys rise in drop order and the door's one line starts reads in that
 *  order, so this is the row's true place (D11). */
export function waitAhead(items: readonly LedgerRow[], key: number): number {
  return items.filter((x) => x.state === "queued" && x.key < key).length;
}

/** A settled receipt is the operator's to clear (decreed 2026-09-01: no
 *  notice sits on the screen against their will). In-flight rows and rows
 *  waiting on a pick stay — dismissing work that still needs a decision would
 *  be the ledger quietly forgetting what was thrown at it. */
export function isSettled(s: LedgerRow["state"]): boolean {
  return (
    s === "filed" ||
    s === "vaulted" ||
    s === "activityDone" ||
    s === "error" ||
    s === "dupe" ||
    s === "undone" ||
    s === "interrupted" ||
    s === "unfiled" ||
    s === "kept"
  );
}

/** A capture another door hands to the Chute: the Intranet's Send-it. One
 *  box holds a disputed or unsure file at every door (CLAUDE.md, The held
 *  file and the receipt, ship order 2026-10-06), so Send-it hands over both:
 *  a capture the guard disputed (slice 18a), and one the route found no sure
 *  match for (ordered 2026-10-06). The Chute holds either as a held row with
 *  the same box, and the pick files it with the door it came through. */
export type HandOff = DisputedHandOff | UnsureHandOff;

type HandOffBase = { filename: string; text: string; door: "intranet" };

/** A capture the guard disputed: the account the route chose, what the
 *  capture reads like, and the rung's verdict. */
export type DisputedHandOff = HandOffBase & {
  account: { id: string; name: string };
  claim: string;
  verdict: HeldVerdict;
};

/** A capture the route found no sure match for: the candidates it found,
 *  by id, name and rung (D13), which the held row offers as its choices. */
export type UnsureHandOff = HandOffBase & {
  candidates: { id: string; name: string; rung: string }[];
};

/** The held row a hand-off becomes. An unsure capture waits as a pick row,
 *  the state the Chute's own unroutable files wait in, so the box says "No
 *  sure match" and offers the candidates; a disputed one waits on its
 *  verdict. */
export function handOffRow(h: HandOff, key: number): LedgerRow {
  if ("candidates" in h)
    return {
      key,
      filename: h.filename,
      state: "pick",
      text: h.text,
      // Rebuilt field by field, so nothing beside the id, the name and the
      // rung rides into the ledger (D12).
      candidates: h.candidates.map((c) => ({ id: c.id, name: c.name, rung: c.rung })),
      door: h.door,
    };
  return {
    key,
    filename: h.filename,
    state: "mismatch",
    text: h.text,
    account: h.account,
    claim: h.claim,
    reason: h.verdict.reason,
    verdict: h.verdict,
    door: h.door,
  };
}

/** Seat a hand-off in the stored ledger, for when no Chute is listening:
 *  the next mount reads it back held, with its text (C20). */
export function seatHandOff(
  h: HandOff,
  storage: LedgerStorage,
  now: Date = new Date(),
): void {
  const { items, maxKey } = loadLedger(storage, now);
  saveLedger([handOffRow(h, maxKey + 1), ...items], storage, now);
}

/** The live run state the activity receipt reports, as the reconcile reads it. */
export type LiveRun = {
  hasDrop: boolean;
  phase: string;
  receipt: readonly string[];
};

/** A stored second-record receipt is a SEED; the manifest's live run state is
 *  the record, and the record outranks every seed (the Ted doctrine, applied
 *  to receipts). Every settled activity row re-reads the live receipt: a row
 *  that said COVERAGE FAILED at 13:51 goes green when the 17:37 run did. A run
 *  still in flight is left alone — the dock is narrating it — and so is every
 *  row that is not an activity drop. Returns the same array when nothing
 *  changes, so a state setter can bail out. */
export function reconcileActivityRows<T extends LedgerRow>(
  items: T[],
  live: LiveRun | null | undefined,
): T[] {
  if (!live?.hasDrop || live.phase === "running" || live.receipt.length === 0)
    return items;
  const line = live.receipt[live.receipt.length - 1] ?? "";
  const state: LedgerRow["state"] = live.phase === "done" ? "activityDone" : "error";
  let changed = false;
  const next = items.map((x) => {
    if (
      x.act &&
      (x.state === "activityDone" || x.state === "error" || x.state === "interrupted") &&
      (x.state !== state || x.reason !== line)
    ) {
      changed = true;
      return { ...x, state, reason: line };
    }
    return x;
  });
  return changed ? next : items;
}
