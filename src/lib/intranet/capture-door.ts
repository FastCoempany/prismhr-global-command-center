// The Intranet's capture is a door (ruled 2026-09-25, P2 — CLAUDE.md, The
// Chute): what names an account files through the paste pipeline, routed,
// guarded and picked like the Chute's; what names none stays an Intranet doc
// and is never inbound. This is the pure half of that door — the verdict on
// a route and the receipt's words — so the suite can pin both without a
// store or a session. The server half (src/app/intranet/capture-actions.ts)
// routes on the server (D12) and files through roomPaste.
//
// The capture files when routing is sure. One box holds a disputed or unsure
// file at every door (CLAUDE.md, The held file and the receipt, ship order
// 2026-10-06), so a capture that is not sure goes where a disputed one goes:
// it is held in the Chute mounted above the Send-it box, which says so in
// one line. A dispute is the guard's (slice 18a); an unsure route is the
// router's, when it finds candidate accounts and no sure one, and the held
// row offers those candidates as its choices (ordered 2026-10-06). The held
// box's ✕ there brings either back to the brain. A capture that names no
// account stays in the brain, as P2 rules. The receipt speaks in the
// surface's own word for itself — the brain — and carries an account name,
// never a figure.

import type { RouteHit, RouteRung } from "@/lib/route-capture";

export type CaptureRoute = { best: RouteHit | null; candidates: RouteHit[] };

/** One account a held row offers: its id, its name and the rung that found
 *  it. Never the hit's why, which can carry an address, and never its score:
 *  what leaves the server is names and rungs (D12). */
export type HeldCandidate = { id: string; name: string; rung: RouteRung };

export type CaptureVerdict =
  | { file: true; account: { id: string; name: string } }
  | { file: false; hold: true; line: string; candidates: HeldCandidate[] }
  | { file: false; hold: false; line: string };

const KEPT = "Kept in the brain.";

/** Send-it's line when the capture is held: the guard disputed it, or the
 *  route found no sure match, and it waits as a held row in the Chute
 *  mounted above the box (slice 18a; the unsure route since 2026-10-06). */
export const HELD_LINE = "Held in the Chute above.";

export function heldLine(): string {
  return HELD_LINE;
}

/** The line when the held box's ✕ keeps a held capture in the brain: filed
 *  on no account, and an Intranet doc again (P2). */
export function keptLine(): string {
  return KEPT;
}

/** The line when nothing in the capture names an account. */
export function keptUnnamedLine(): string {
  return `${KEPT} Nothing names an account.`;
}

/** The accounts an unsure route offers the held row, in the router's order,
 *  strongest rung first: ids, names and rungs, nothing more (D12). */
export function heldCandidates(route: CaptureRoute): HeldCandidate[] {
  return route.candidates.map((c) => ({ id: c.id, name: c.name, rung: c.rung }));
}

/** The line when the capture filed to the record. A read that failed says
 *  so: a paste filed without the read opened no actions and asked nothing. */
export function filedLine(name: string, readFailed = false): string {
  return readFailed
    ? `Filed to ${name}. The reader was down, so only the text filed.`
    : `Filed to ${name}.`;
}

/** The door's verdict on a route. It files when the router is sure: a best
 *  above the auto-route bar, clear of the second by the gap. It holds when
 *  the router found candidates and no sure one, with those candidates for
 *  the Chute's held row (ordered 2026-10-06). It keeps the capture in the
 *  brain when nothing names an account (P2). The pipeline's own guard
 *  judges a filing after this; a dispute there is held too. */
export function captureVerdict(route: CaptureRoute): CaptureVerdict {
  if (route.best)
    return { file: true, account: { id: route.best.id, name: route.best.name } };
  const candidates = heldCandidates(route);
  if (candidates.length) return { file: false, hold: true, line: heldLine(), candidates };
  return { file: false, hold: false, line: keptUnnamedLine() };
}
