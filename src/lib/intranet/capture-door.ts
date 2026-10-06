// The Intranet's capture is a door (ruled 2026-09-25, P2 — CLAUDE.md, The
// Chute): what names an account files through the paste pipeline, routed,
// guarded and picked like the Chute's; what names none stays an Intranet doc
// and is never inbound. This is the pure half of that door — the verdict on
// a route and the receipt's words — so the suite can pin both without a
// store or a session. The server half (src/app/intranet/capture-actions.ts)
// routes on the server (D12) and files through roomPaste.
//
// The capture files when routing is sure. A route that is not sure stays an
// Intranet doc, with a receipt line saying so and where the pick lives. A
// capture the guard disputes is held in the Chute mounted above the Send-it
// box, which says so in one line (slice 18a; the face approved 2026-10-06),
// and the held box's ✕ there brings it back to the brain. The receipt speaks
// in the surface's own word for itself — the brain — and carries an account
// name, never a figure.

import type { RouteHit } from "@/lib/route-capture";

export type CaptureRoute = { best: RouteHit | null; candidates: RouteHit[] };

export type CaptureVerdict =
  | { file: true; account: { id: string; name: string } }
  | { file: false; line: string };

const KEPT = "Kept in the brain.";
const PICK = "File it from the Chute.";

/** Send-it's line when the guard disputes the capture: it waits as a held
 *  row in the Chute mounted above the box (slice 18a). */
export const HELD_LINE = "Held in the Chute above.";

export function heldLine(): string {
  return HELD_LINE;
}

/** The line when the held box's ✕ keeps a disputed capture in the brain:
 *  filed on no account, and an Intranet doc again (P2). */
export function keptLine(): string {
  return KEPT;
}

/** The line when nothing in the capture names an account. */
export function keptUnnamedLine(): string {
  return `${KEPT} Nothing names an account.`;
}

/** The line when the capture reads like an account the door cannot file to
 *  on its own — an unsure route, or a guard's dispute — naming it so the
 *  operator can take it to the Chute's picker. Two names at most. */
export function keptLikeLine(names: readonly string[]): string {
  const two = names
    .map((n) => n.trim())
    .filter(Boolean)
    .slice(0, 2);
  if (two.length === 0) return keptUnnamedLine();
  return `${KEPT} It reads like ${two.join(" or ")}. ${PICK}`;
}

/** The names an unsure route reads like: the candidates that share the top
 *  score, two at most. Empty when the router found nothing. */
export function readsLike(route: CaptureRoute): string[] {
  const top = route.candidates[0];
  if (!top) return [];
  return route.candidates
    .filter((c) => c.score === top.score)
    .slice(0, 2)
    .map((c) => c.name);
}

/** The line when the capture filed to the record. A read that failed says
 *  so: a paste filed without the read opened no actions and asked nothing. */
export function filedLine(name: string, readFailed = false): string {
  return readFailed
    ? `Filed to ${name}. The reader was down, so only the text filed.`
    : `Filed to ${name}.`;
}

/** The door's verdict on a route: file when the router is sure — a best
 *  above the auto-route bar, clear of the second by the gap — and keep
 *  otherwise, with the line that says why. The pipeline's own guard judges
 *  the filing after this; a dispute there keeps the capture too. */
export function captureVerdict(route: CaptureRoute): CaptureVerdict {
  if (route.best)
    return { file: true, account: { id: route.best.id, name: route.best.name } };
  return { file: false, line: keptLikeLine(readsLike(route)) };
}
