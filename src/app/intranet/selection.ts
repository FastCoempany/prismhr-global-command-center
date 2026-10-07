// The rail's selection mark (pass 8 X6). Accents go by role, never by hue and
// never by position: a selected row is part of the scope the brain reads, so
// every selected row and every chip carries the one system-intelligence blue.
// The chips beside the rail name each selection by its label; the dot says
// only that the row is selected. It used to cycle the five accents by the
// order of selection, which spent the orange on a third pick.

export const SELECTION_DOT = "var(--ds-blue)";

/** The dot a row carries at its place in the selection; null when the row is
 *  not selected. The place never changes the color. */
export function selectionDot(index: number): string | null {
  return index < 0 ? null : SELECTION_DOT;
}
