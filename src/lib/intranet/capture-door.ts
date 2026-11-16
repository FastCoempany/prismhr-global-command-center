// The Intranet's capture door, its pure half: the receipt's opening words.
// Intelligence only (founder, 2026-11-16): every capture the Intranet takes,
// from the Send-it box, a Teams grab or a top Chute drop, is kept in the
// brain and read there, and none is routed onto an account. This replaces
// the 2026-09-25 rule (P2) that filed a capture naming an account through
// the paste pipeline and held an unsure one in the Chute; the route verdict,
// the filed line and the held line went with it. The server half is
// src/app/intranet/capture-actions.ts.

const KEPT = "Kept in the brain.";

/** The receipt's first words for every capture the brain keeps. */
export function keptLine(): string {
  return KEPT;
}
