// The threading badge reads exactly MULTI, colored by the semantic ladder:
// red 1 thread, amber 2, green 3 or more (standing decree). One ladder for
// every surface that paints the badge, the HomeRoom row and Groundwork's
// file, so the two can never read one count two ways.
//
// The ladder names no color for zero. The row paints red there, beside "No
// stakeholders on file yet", because nobody known is a single thread at
// best; Groundwork paints no badge at all below one.

type MultiTone = "r" | "y" | "g";

export function multiTone(threads: number): MultiTone {
  return threads >= 3 ? "g" : threads === 2 ? "y" : "r";
}
