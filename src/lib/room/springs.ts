// The TODAY register's summary line — its numeral and its trailing text, from
// ONE derivation.
//
// They used to come from two. The count summed the sheet's open commitments
// and whatever the display cap held back; the text fell through to the
// record's owed lines when the sheet had nothing. So a row carrying an owed
// item and no todo rendered "TODAY 0 · TrendHR follow-up" — a count of nothing
// beside a thing (Trend Personnel Services, 2026-09-23).
//
// The owed lines were never missing from the register: springing it open
// renders them at the top, above the commitments. Only the numeral could not
// see them.
//
// What the numeral means is "open today". Delayed items carry their own date
// and render with a clock, and what is finished rides the line separately as
// "· N done", so neither belongs in it.

export type TodayRegister = {
  /** How many things are open today — owed lines, open commitments, and
   *  whatever the display cap held back. */
  count: number;
  /** The one line the folded summary trails off with. "" when nothing is
   *  open, which the caller renders as its own empty state. */
  top: string;
};

export function todayRegister(args: {
  /** The record's live owed lines, in the order the register shows them. */
  owed: readonly string[];
  /** The live open commitments, in the order the register shows them. */
  open: readonly string[];
  /** Open commitments past the display cap — a door, never a disappearance. */
  restCount: number;
}): TodayRegister {
  const owed = args.owed.filter((s) => (s ?? "").trim());
  const open = args.open.filter((s) => (s ?? "").trim());
  const rest = Math.max(0, Math.trunc(args.restCount || 0));
  return {
    // A commitment leads when there is one; the record's owed line stands in
    // when there is not. Same precedence the line has always had — it is the
    // count that was wrong, never the text.
    top: open[0] ?? owed[0] ?? "",
    count: owed.length + open.length + rest,
  };
}
