// The Sales Navigator grab, split row by row (pass 8 call 12 and D30 —
// CLAUDE.md, The Chute; the seam round's S-25).
//
// The grab is a list: the bookmarklet writes one head line, "SALESNAV
// ACCOUNTS - captured <date> - N rows collected", then every row of the
// operator's Sales Navigator accounts list, rows parted by a line of four
// dashes. It names about a hundred accounts, never one. Filed whole on the
// row it was pasted on, it was one note on one account, and the queue's
// intent read (src/lib/groundwork/signals.ts, intentFor) read every row's
// intent as that account's. So the pipeline splits it: each row is routed on
// its own by the router's rungs (src/lib/route-capture.ts; a row carries the
// account's name, so the name rung is the one that speaks), and each surely
// matched row files as its own note on its account, under the grab's own
// head line, with the source the intent read takes (salesnav). Rows that
// land on one account file together as that account's one note.
//
// Nothing files blind: a row with no sure match files nothing and is counted
// on the receipt. The duplicate guard holds per account: an account's note
// fingerprints like any capture, head line skipped (D16), so the same row
// re-pasted is refused on that account and counted as already on file. The
// row the paste landed on decides nothing, and no model reads the list: the
// intent read parses Sales Navigator's own words.
//
// Pure but for the store it is handed: roomPaste and roomGrab
// (src/app/room/actions.ts) hand in the pipeline's own writers, the suite
// hands in a stub. Client-safe, so the Chute can tell a grab before it routes.

import type { Door } from "./doors";
import { sniffHead } from "./dialect";
import type { Claim, DupeCheck } from "./filing";
import type { Window } from "./windows";
import { ALREADY_ON_FILE } from "./wrote";
import { redactMoney } from "@/lib/intel/lexicon";
import { pasteFingerprint } from "@/lib/paste-files";
import { routeCapture, type RouteAccount, type RouteRung } from "@/lib/route-capture";

/** What a grab's receipt names in the account's seat: the grab files on
 *  many accounts and on none of them alone. */
export const GRAB_LABEL = "Sales Nav";

/** The source every row's note files under: the store the queue's intent
 *  read takes. No model reads the grab, so it never carries the -ai suffix. */
const GRAB_SOURCE = "salesnav";

/** The line that parts two rows: the bookmarklet joins them with four
 *  dashes on a line of their own. */
const ROW_SEP = /^[ \t]*-{4,}[ \t]*$/m;
const ROW_JOIN = "\n\n----\n\n";

/** How many accounts file, or are taken back, at once: a grab of a hundred
 *  accounts is a hundred filings, and one at a time outlasts a request. */
export const GRAB_PARALLEL = 6;

/** Run tasks at most `limit` at a time, results in the tasks' order. */
export async function runLimited<T>(
  tasks: readonly (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = new Array<T>(tasks.length);
  let next = 0;
  const lane = async (): Promise<void> => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]!();
    }
  };
  const lanes = Math.max(1, Math.min(Math.floor(limit), tasks.length));
  await Promise.all(Array.from({ length: lanes }, lane));
  return results;
}

/** The duplicate guard's key for one account's capture, the one roomPaste
 *  writes (src/app/room/actions.ts). */
const pasteKeyFor = (accountId: string, fingerprint: string): string =>
  `pastehash:${accountId}:${fingerprint}`.slice(0, 191);

/** Whether a capture is a Sales Nav grab: its head says SALESNAV. */
export function isGrab(text: string): boolean {
  return sniffHead(text ?? "").dialect === "SN";
}

/** The grab's head line and its rows, each trimmed, empty ones dropped. A
 *  capture that is not a grab has neither. */
export function splitGrab(text: string): { head: string; rows: string[] } {
  const t = (text ?? "").trim();
  if (!isGrab(t)) return { head: "", rows: [] };
  const nl = t.indexOf("\n");
  const head = (nl >= 0 ? t.slice(0, nl) : t).trim();
  const body = nl >= 0 ? t.slice(nl + 1) : "";
  const rows = body
    .split(ROW_SEP)
    .map((r) => r.trim())
    .filter(Boolean);
  return { head, rows };
}

/** One account's share of a grab: the account the router surely matched,
 *  the rung that matched it, and the note's body, the grab's own head line
 *  over the account's rows. */
export type GrabFiling = {
  account: { id: string; name: string };
  rung: RouteRung;
  body: string;
};

/** What a grab will file: one filing per surely matched account, in the
 *  grab's order, and the first line of every row no account surely matched. */
export type GrabPlan = { filings: GrabFiling[]; missed: string[] };

/** A row's first line, as the receipt lists a row that matched nothing.
 *  It renders, so a figure in it never does (the money doctrine). */
const firstLine = (row: string): string =>
  redactMoney((row.split("\n").find((l) => l.trim()) ?? "").trim().slice(0, 120));

/** Split the grab and route every row by the router's rungs over the roster
 *  the pipeline reads (the joined roster, C2). A row files only on the
 *  router's sure match: the top hit clears the bar and no rival comes close.
 *  Pure. */
export function planGrab(text: string, roster: readonly RouteAccount[]): GrabPlan {
  const { head, rows } = splitGrab(text);
  const by = new Map<
    string,
    { account: { id: string; name: string }; rung: RouteRung; rows: string[] }
  >();
  const missed: string[] = [];
  for (const row of rows) {
    const { best } = routeCapture(row, [...roster]);
    if (!best) {
      missed.push(firstLine(row));
      continue;
    }
    const f = by.get(best.id) ?? {
      account: { id: best.id, name: best.name },
      rung: best.rung,
      rows: [],
    };
    f.rows.push(row);
    by.set(best.id, f);
  }
  return {
    filings: [...by.values()].map((f) => ({
      account: f.account,
      rung: f.rung,
      body: `${head}\n\n${f.rows.join(ROW_JOIN)}`,
    })),
    missed,
  };
}

/** The note one account's share files as, every provenance column named
 *  (P3/P4): the door it came through, the background lane (ingested
 *  intelligence around the account, never the working record), the salesnav
 *  source and the account's Filing row. */
export type GrabNote = {
  accountId: string;
  kind: "account";
  body: string;
  door: Door;
  lane: "background";
  source: string;
  filingId?: string;
};

/** The pipeline's writers, handed in. */
export type GrabStore = {
  /** The duplicate guard's claim on one account's capture (claimCapture). */
  claim(key: string): Promise<Claim>;
  /** Let a claim go when its filing filed nothing (releaseCapture). */
  release(key: string, token: string): Promise<void>;
  /** Turn the claim into the filed marker (roomPaste's stampPasteMark). */
  stamp(key: string, noteId: string): Promise<void>;
  /** The account's Filing row (fileFiling); undefined when the table is not
   *  there yet, and the note then files unlinked. */
  filing(
    accountId: string,
    fingerprint: string,
    dupeCheck: DupeCheck,
  ): Promise<string | undefined>;
  /** The note itself (createAccountNoteRow), with its id back. */
  note(n: GrabNote): Promise<string>;
};

/** One account a grab filed to: ids and a name, so a settled receipt keeps
 *  it (D12), and the ids the take-back reaches it by. */
export type GrabAccount = {
  id: string;
  name: string;
  rung: RouteRung;
  noteId: string;
  filingId?: string;
};

/** What a grab filed, as its receipt counts it. */
export type GrabSummary = {
  accounts: GrabAccount[];
  /** Accounts whose share was already on file: refused per account. */
  duplicates: { id: string; name: string }[];
  /** Accounts whose filing broke: nothing filed there. */
  failed: { id: string; name: string }[];
  /** Rows no account surely matched: they filed nothing. */
  unmatched: number;
  /** Each unmatched row's first line, for the receipt's open view while the
   *  tab holds it. Body text, so a settled row never keeps it (D12). */
  missed?: string[];
  /** Whether every account's duplicate check ran, or one failed open (D7). */
  dupeCheck: DupeCheck;
};

/** One account's share, filed: claimed against the duplicate guard, its
 *  Filing row, its note, the filed marker; a claim that filed nothing is let
 *  go, as roomPaste lets one go. */
async function fileShare(
  f: GrabFiling,
  store: GrabStore,
  door: Door,
): Promise<
  | { kind: "filed"; account: GrabAccount; dupeCheck: DupeCheck }
  | { kind: "duplicate" | "failed" }
> {
  const fingerprint = pasteFingerprint(f.body);
  const key = pasteKeyFor(f.account.id, fingerprint);
  const claim = await store.claim(key);
  if (claim.kind === "filed" || claim.kind === "inflight") return { kind: "duplicate" };
  const dupeCheck: DupeCheck = claim.kind === "skipped" ? "skipped" : "ran";
  try {
    const filingId = await store.filing(f.account.id, fingerprint, dupeCheck);
    const noteId = await store.note({
      accountId: f.account.id,
      kind: "account",
      body: f.body,
      door,
      lane: "background",
      source: GRAB_SOURCE,
      ...(filingId ? { filingId } : {}),
    });
    await store.stamp(key, noteId);
    return {
      kind: "filed",
      dupeCheck,
      account: { ...f.account, rung: f.rung, noteId, ...(filingId ? { filingId } : {}) },
    };
  } catch {
    return { kind: "failed" };
  } finally {
    // The filed marker has replaced a claim that landed, so this lets go
    // only a claim whose share filed nothing.
    if (claim.kind === "claimed") await store.release(key, claim.token);
  }
}

/** File every account's share, a few at a time, and count what came of the
 *  grab in the grab's order. */
export async function fileGrab(
  plan: GrabPlan,
  store: GrabStore,
  door: Door,
): Promise<GrabSummary> {
  const results = await runLimited(
    plan.filings.map((f) => () => fileShare(f, store, door)),
    GRAB_PARALLEL,
  );

  const out: GrabSummary = {
    accounts: [],
    duplicates: [],
    failed: [],
    unmatched: plan.missed.length,
    missed: plan.missed,
    dupeCheck: "ran",
  };
  results.forEach((r, i) => {
    const account = plan.filings[i]!.account;
    if (r.kind === "filed") {
      out.accounts.push(r.account);
      if (r.dupeCheck === "skipped") out.dupeCheck = "skipped";
    } else if (r.kind === "duplicate") out.duplicates.push(account);
    else out.failed.push(account);
  });
  return out;
}

const many = (n: number, one: string, more: string): string =>
  `${n} ${n === 1 ? one : more}`;

/** The receipt's sentence for rows that filed nothing. */
export const unmatchedLine = (n: number): string =>
  `${many(n, "row", "rows")} matched no account.`;

/** The counts a grab's receipt line carries, zeros left out. */
export function grabCounts(
  g: Pick<GrabSummary, "accounts" | "duplicates" | "failed" | "unmatched">,
): string[] {
  return [
    g.accounts.length ? many(g.accounts.length, "account", "accounts") : "",
    g.unmatched
      ? many(g.unmatched, "row matched no account", "rows matched no account")
      : "",
    g.duplicates.length ? `${g.duplicates.length} already on file` : "",
    g.failed.length ? `${g.failed.length} didn't file` : "",
  ].filter(Boolean);
}

/** What a settled receipt keeps of a grab: ids, names and counts, never the
 *  unmatched rows' text (D12). */
export function keptGrab(g: GrabSummary | undefined): GrabSummary | undefined {
  if (!g) return undefined;
  return {
    accounts: g.accounts,
    duplicates: g.duplicates,
    failed: g.failed,
    unmatched: g.unmatched,
    dupeCheck: g.dupeCheck,
  };
}

/** The grab's result in roomPaste's shape, so every door reads it like any
 *  filing: filed when any account took its share; the decree's duplicate
 *  line when every matched share was already on file; the failure when
 *  every share broke; and the unmatched sentence when no row matched. The
 *  receipt opens to `grab`, which carries every account's note and Filing
 *  row. No note ids ride at the top: a take-back is bound to one account,
 *  and a door that reads only the top would take back one account's share
 *  of the grab and call it the whole (use-undo.ts reads `grab`). */
export function grabResult(g: GrabSummary, windows: Window[]) {
  const unmatched = g.unmatched ? ` ${unmatchedLine(g.unmatched)}` : "";
  if (g.accounts.length > 0)
    return {
      ok: true as const,
      filed: g.accounts.length,
      how: "rules",
      windows,
      dupeCheck: g.dupeCheck,
      grab: g,
    };
  if (g.duplicates.length > 0)
    return {
      ok: false as const,
      filed: 0 as const,
      how: "",
      duplicate: true,
      reason: `${ALREADY_ON_FILE}${unmatched}`,
    };
  if (g.failed.length > 0)
    return {
      ok: false as const,
      filed: 0 as const,
      how: "rules",
      reason: `Filing failed partway. Check the account page.${unmatched}`,
    };
  return {
    ok: false as const,
    filed: 0 as const,
    how: "rules",
    reason: g.unmatched ? unmatchedLine(g.unmatched) : "Nothing recognizable to file.",
  };
}
