"use client";

// The hand-off (slice 18a of the Chute brains refactor plan; the face
// approved 2026-10-06). When the guard disputes a capture sent through the
// Intranet's Send-it box, or the route finds no sure match for it (one box
// holds a disputed or unsure file at every door, ordered 2026-10-06), the
// box keeps its own line ("Held in the Chute above.") and hands the capture
// to the Chute mounted on that page, which holds it with the same box every
// door uses: a dispute waits on its verdict, an unsure capture waits on the
// pick among the route's candidates. One event carries it: the
// Chute's ledger hook takes it and seats a held row; when no Chute is
// listening, the capture is seated in the stored ledger instead, where the
// next mount reads it back held (C20). The capture's text travels from the
// box that sent it to the Chute beside it, in the browser; the verdict and
// the candidates came from the server and carry names and rungs, never the
// roster (D13).

import { seatHandOff, type HandOff } from "../chute-ledger";

/** The event a hand-off rides. */
export const HAND_OFF_EVENT = "chute:held";

/** The held row's name for a Send-it capture, which has no file name. */
export const SEND_IT_LABEL = "Send-it paste";

/** The event's payload: the hand-off, and whether a Chute took it. */
export type HandOffDetail = HandOff & { taken: boolean };

/** Hand a disputed or unsure capture to the Chute. Dispatch runs every
 *  listener before it returns, so `taken` says whether a mounted Chute
 *  seated it. */
export function handToChute(h: HandOff): void {
  const detail: HandOffDetail = { ...h, taken: false };
  window.dispatchEvent(new CustomEvent<HandOffDetail>(HAND_OFF_EVENT, { detail }));
  if (detail.taken) return;
  try {
    seatHandOff(h, localStorage);
  } catch {
    // Storage refused and no Chute listening: nothing more can hold it in
    // this browser. The Chute mounts on the same page as the Send-it box,
    // so this is the private window with no Chute on screen.
  }
}
