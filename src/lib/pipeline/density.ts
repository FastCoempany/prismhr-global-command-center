// The Pipeline column's budget (founder-decreed 2026-09-09, "On the label's
// own line").
//
// Every value starts on its label's line — no exceptions, no kickers. That
// hands the whole problem to the column: an 80px label rail leaves the value
// 290px, about 53 characters a line at 10.5px. So a value that runs long
// clips on a word boundary, and the clip is a door.
//
// THE BUDGET IS 88, AND IT WAS MEASURED, NOT DERIVED. The arithmetic says two
// lines hold 106 characters. That is wrong: the source chip and the door ride
// the last line and eat into the text's own room. Rendering the whole book at
// 104, 96 and 88 and counting what overflowed found the real ceiling — 104
// leaves twelve labels over two lines, 96 leaves five, 88 leaves none.
//
// THE CLIP IS A RENDER CONCERN AND LIVES ONLY IN THE DRAWER. Nothing here is
// ever called from build.ts, plain.ts or docx.ts: Copy and the Word file read
// the record itself, so they always carry the whole value however narrow the
// pane got. A test guards it. Push this down into the record and the pane
// starts silently deciding what a readout contains.

export const VALUE_BUDGET = 88;

export type Clipped = { text: string; cut: boolean };

/** Trim to the budget on a WORD boundary. Never mid-word, never mid-number.
 *  A single word longer than the budget is the one case that hard-cuts —
 *  there is no boundary to find. Mirrors clip() in room/move-line.ts so a move
 *  and a value cut the same way. */
export function clipValue(raw: string, budget = VALUE_BUDGET): Clipped {
  const text = (raw ?? "").trim().replace(/\s+/g, " ");
  if (text.length <= budget) return { text, cut: false };
  const room = budget - 1; // the ellipsis takes a column
  const head = text.slice(0, room);
  const sp = head.lastIndexOf(" ");
  // Keep a real amount of the line: a boundary in the last third only.
  const body = sp > room * 0.6 ? head.slice(0, sp) : head;
  // The period goes with the rest of the trailing punctuation — "on 8/17.…"
  // reads as a typo.
  return { text: `${body.replace(/[\s,;:.—-]+$/, "")}…`, cut: true };
}

/** Fields whose entries are short enough to read as one run. Countries is the
 *  whole of this case: "Brazil · EOR · 10 workers, Germany · EOR · 50 workers"
 *  is a sentence, and as four bullets it was four lines under one label. */
export function joinEntries(entries: readonly string[]): string {
  return entries.filter(Boolean).join(", ");
}
