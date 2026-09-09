// The Pipeline column's rules (founder-decreed 2026-09-09, amended the same
// day after the first cut still showed two-line labels and kept its subtext).
//
// ONE LINE. Every field is exactly one line on arrival — no exceptions, no
// wrapping, no second line for any label. A value too wide for the column is
// NOT cut: it scrolls left to right inside its own row, so the sentence stays
// whole and nothing needs an ellipsis or a door to get it back.
//
// The row may grow in only one case: a field holding more than one entry. Its
// top entry arrives on the line with a door counting the rest, and opening it
// expands the row — because several entries are several things, not one long
// sentence.
//
// RETIRED the same day: the source subtext. "deal intel", "record", "opened
// 8/18", "the book's date", "gap ledger", "second record" told the operator
// where a value came from, which this readout does not need — it is read
// aloud to a room, not audited. Every pixel it took belongs to the value.

/** Fields whose entries are short enough to read as one run. Countries is the
 *  whole of this case: "Brazil · EOR · 10 workers, Germany · EOR · 50 workers"
 *  is a sentence, and as four bullets it was four rows under one label. */
export function joinEntries(entries: readonly string[]): string {
  return entries.filter(Boolean).join(", ");
}

/** Whitespace collapsed to a single run, so a pasted value that arrived with
 *  newlines in it still renders as the one line the column promises. */
export function oneLine(raw: string): string {
  return (raw ?? "").replace(/\s+/g, " ").trim();
}
