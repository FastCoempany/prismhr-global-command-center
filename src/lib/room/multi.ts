// The threading badge reads exactly MULTI, colored by the semantic ladder:
// red 1 thread, amber 2, green 3 or more (standing decree). One ladder for
// every surface that paints the badge, the HomeRoom row and Groundwork's
// file, so the two can never read one count two ways.
//
// Zero threads takes the ladder's red on every surface: nobody known is at
// least as thin as one thread (coordinator's call, pass 10). Anything that
// is not a count of two or more, zero, a negative or a missing number,
// reads red. Groundwork paints no badge below one, and when a surface does
// paint one at zero, it is red.

type MultiTone = "r" | "y" | "g";

export function multiTone(threads: number): MultiTone {
  if (!(threads >= 2)) return "r";
  return threads >= 3 ? "g" : "y";
}
