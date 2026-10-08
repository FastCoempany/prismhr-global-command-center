// What the stage's Evidence Chips stand on — pure, so the suite can pin it.
// The chips are the decreed winner (2026-08-20) and every chip is a door that
// drills to row-level evidence (the meat law): the page names the rows a door
// opens to, by their keys, and the excerpts come down from the evidence route
// one row at a time (a GET, never a server action). Nothing here renders.

import type { Gem } from "@/lib/activity/stores";
import type { StagedRow } from "@/lib/activity/types";
import { rowPerson } from "@/lib/activity/classify";
import { cleanSubject } from "@/lib/activity/excerpt";
import { isHumanMotion } from "@/lib/activity/rollup";

/** One staged row as a door: its key for the evidence route, and its head. */
export type Cite = { k: string; day: string; who: string; subject: string };

export type ChipGem = Pick<Gem, "term" | "act" | "reason" | "whenDay" | "cites">;

const citeOf = (r: StagedRow): Cite => ({
  k: r.k,
  day: r.d,
  who: rowPerson(r),
  subject: cleanSubject(r.s).slice(0, 70),
});

/** The gems the chip row carries: un-acted, about an account person, with an
 *  act to show. A colleague's gem produces nothing for the operator anywhere
 *  (C6 as amended 2026-10-05; C16): its act is the retired coordination move
 *  ("Ask Anika what they said."), so it never reaches the stage. Pass 8 G1. */
export function chipGems(gems: readonly Gem[]): ChipGem[] {
  return gems
    .filter((g) => !g.actedDay && g.whoKind !== "colleague" && !!g.act)
    .slice(0, 2)
    .map((g) => ({
      term: g.term,
      act: g.act,
      reason: g.reason,
      whenDay: g.whenDay,
      cites: g.cites,
    }));
}

/** The row the collision chip's colleague stands on: the newest human motion
 *  the rollup read as lastHuman, matched by its day and its person the way
 *  the rollup named them (src/lib/activity/rollup.ts). The chip is the direct
 *  doctrine's quiet flag, never a move; it opens to the colleague's row so
 *  the flag shows its evidence (pass 8 G5). null when the slice no longer
 *  holds the row or there is no colleague. */
export function collisionCite(
  rows: readonly StagedRow[],
  colleague: { who: string; day: string } | null,
): Cite | null {
  if (!colleague) return null;
  const hit = rows
    .filter(isHumanMotion)
    .find((r) => r.d === colleague.day && rowPerson(r) === colleague.who);
  return hit ? citeOf(hit) : null;
}

/** SPIKE's day as a door: the support rows dated that day, the rows the
 *  rollup counted as the busiest single day (supportThemes). Pass 8 G5. */
export function spikeCites(rows: readonly StagedRow[], day: string): Cite[] {
  if (!day) return [];
  return rows
    .filter((r) => r.lane === "support" && r.d === day)
    .slice(0, 14)
    .map(citeOf);
}

/** The roundup brief's prep (5.3): the CSM's own last five rows on the
 *  account, each a door to its excerpt (pass 8 G5). Last means rows that
 *  happened: a row dated after today (a due-dated task) never leads the
 *  prep and never fills a short one. `today` is the Chicago day key. */
export function csmPrepRows(
  rows: readonly StagedRow[],
  csm: string,
  today: string,
): Cite[] {
  if (!csm) return [];
  return rows
    .filter((r) => r.a === csm && !!r.d && r.d.slice(0, 10) <= today)
    .slice(0, 5)
    .map(citeOf);
}

/** A stamp's "{N} SUPPORT CASES" as a door: the account's support rows in
 *  the staged slice, newest first, each opening to its excerpt (the
 *  click-depth law: every count opens). */
export function supportCites(rows: readonly StagedRow[]): Cite[] {
  return rows
    .filter((r) => r.lane === "support")
    .slice(0, 14)
    .map(citeOf);
}

/** The prep fold's kicker says the real count (pass 8 G6, A4.23): two to
 *  four rows are never "five". */
export function prepKicker(n: number): string {
  return `THE CSM’S OWN LAST ${n === 1 ? "ROW" : `${n} ROWS`} · SHARPEN THE ASK`;
}
