// The HomeRoom page's own reads, kept pure so the suite can hold them: which
// accounts get a row beside the board's, the acceptance the move line names,
// and the warmth the eye finds on file. The page (./page.tsx) builds every
// row through the one account read and the one engine; these only decide what
// goes in.

import { liveMotionIds } from "@/lib/groundwork/day";
import type { DealIntel } from "@/lib/intel/types";
import { GLOBAL_SCENT_RE } from "@/lib/intel/provenance";

/** The first word of a name: how the move line says a person. */
export function firstName(s: string): string {
  return (s ?? "").trim().split(/\s+/)[0] ?? "";
}

// ✕ parks a record row under this disposition key; the account read holds the
// same filter (src/lib/record/read.ts).
const HIDE_NOTE = "hide:note:";

type NoteLike = { id: string; body: string; source: string; createdAt: string };

/** The accounts that may take a row off the board (ruled 2026-10-07, pass 8
 *  call 1): every account in the book with no live card and a record to read.
 *  The board's own rows come first and are never repeated; a deal stamped
 *  Closed Won or Lost and retired from the board stays retired; and the
 *  ledger's hand outranks the record, so an account marked not-mine, parked
 *  or snoozed takes no row. Whether a candidate is a row is the record's live
 *  motion, read per account by ownRecordMotion once the read is built. */
export function offBoardCandidates<P extends { id: string; name: string }>(i: {
  accounts: readonly P[];
  /** Accounts holding a live card: they already have their row. */
  onBoard: ReadonlySet<string>;
  /** Accounts whose retired card carries a Closed Won/Lost stamp. */
  closed: ReadonlySet<string>;
  dispositions: ReadonlyMap<string, { status: string }>;
  snoozes: ReadonlyMap<string, unknown>;
  notesById: ReadonlyMap<string, readonly unknown[]>;
}): P[] {
  return i.accounts.filter((p) => {
    if (!p.id || i.onBoard.has(p.id) || i.closed.has(p.id)) return false;
    const status = i.dispositions.get(p.id)?.status;
    if (status === "not-mine" || status === "parked") return false;
    if (i.snoozes.has(p.id)) return false;
    return (i.notesById.get(p.id)?.length ?? 0) > 0;
  });
}

/** Live motion on the operator's own record (ruled 2026-10-07, pass 8 call
 *  1): Groundwork's exclusion predicate over the first record alone — a real
 *  inbound inside its window, or a meeting, call or transcript filed fresh.
 *  The second record never makes a row: an exclusion that rests only on a
 *  colleague's inbox adds none (C6). `notes` are the account's visible rows;
 *  `intel` is the account read's. */
export function ownRecordMotion(
  accountId: string,
  notes: readonly NoteLike[],
  intel: Pick<DealIntel, "lastInbound">,
  now: Date,
): boolean {
  if (!accountId) return false;
  return liveMotionIds(
    new Map([[accountId, [...notes]]]),
    new Map([[accountId, intel]]),
    now,
  ).has(accountId);
}

/** The acceptance as the move line names it (H2). The read leaves the name
 *  empty when our own side accepted (field 15), and nobody stands in for it:
 *  the relationship's name there put a person on the line who never
 *  accepted anything (the Ted doctrine). */
export function acceptedForMove(
  a: { at: string; who: string } | null,
): { at: string; who: string } | null {
  return a ? { at: a.at, who: firstName(a.who) } : null;
}

const FRESH_SCENT_MS = 14 * 86_400_000;

/** The eye's filed warmth: the newest row on file inside two weeks that
 *  carries the global scent. Hidden is hidden (X1): a ✕-parked row warms
 *  nothing. */
export function filedWarmth<N extends { id: string; body: string; createdAt: string }>(
  notes: readonly N[],
  dispositions: ReadonlyMap<string, unknown>,
  now: Date,
): N | null {
  return (
    notes.find(
      (n) =>
        !dispositions.has(`${HIDE_NOTE}${n.id}`) &&
        now.getTime() - Date.parse(n.createdAt) < FRESH_SCENT_MS &&
        GLOBAL_SCENT_RE.test(n.body),
    ) ?? null
  );
}
