// The reader's cut of a stored answer (founder-decreed 2026-08-19): the
// bracketed citation handles the older synthesis wrote into its prose —
// [1], [3][4] — mean nothing to the operator; the doors below the answer
// carry the sourcing. New answers are written clean; this strips the marks
// out of everything already on file, everywhere an answer renders.

export function cleanAskText(s: string): string {
  return (s ?? "")
    .replace(/\s*(?:\[\d{1,3}\])+/g, "")
    .replace(/[ \t]+([.,;:!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
