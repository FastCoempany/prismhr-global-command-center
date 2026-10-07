// The quiet flag's words (the direct doctrine): when a send crosses live
// motion, the composed thing carries a quiet flag so the operator knows. It
// informs and never blocks. The words had two writers, Groundwork's file card
// (src/lib/groundwork/file.ts) and the Act Lane's send (src/app/accounts/
// rules.ts), held equal by a parity test, and the stage's chip spelled a
// third (pass 9 seam, S-6). They are written here once. The module imports
// nothing, so the client-side chips and sheet rules read it as the server
// pages do; the fact itself is the collision guard's (collisionFor,
// src/lib/activity/read.ts), which reads both records (S-18).

/** The collision guard's fact: live marketing sends this week, or a
 *  colleague's thread inside seven days. `noteId` is set when the thread is
 *  an entry of the operator's own record, and absent when it is the export's
 *  row; `text` is that entry's own words, so the flag opens to it. */
export type Collision = {
  mktgSends7: number;
  colleague: { who: string; day: string; noteId?: string; text?: string } | null;
};

/** A day key as the flag prints it: "2026-10-02" → "10/02". */
const mmdd = (day: string | undefined): string =>
  (day ?? "").slice(5, 10).replace("-", "/");

const thread = (who: string | undefined, day: string | undefined, short = false) => {
  const name = (who ?? "").trim() || "A COLLEAGUE";
  const said = short && who?.trim() ? (name.split(/\s+/)[0] ?? name) : name;
  return `${said.toUpperCase()}'S THREAD · ${mmdd(day)}`;
};

const cadence = (n: number, short = false) =>
  short
    ? `MKTG CADENCE LIVE · ${n} THIS WEEK`
    : `MKTG CADENCE LIVE · ${n} SEND${n === 1 ? "" : "S"} THIS WEEK`;

/** The flag on the composed thing (the file card's line, the Act Lane's
 *  send): a live marketing cadence first, else the colleague's thread. ""
 *  when clear. */
export function quietFlagOf(col: Collision | null | undefined): string {
  if (!col) return "";
  if (col.mktgSends7 > 0) return cadence(col.mktgSends7);
  return thread(col.colleague?.who, col.colleague?.day);
}

/** The CSM play, the alternative to the direct play (C19): it carries the
 *  flag when a colleague's thread is live. "" when none is. */
export function csmThreadFlagOf(col: Collision | null | undefined): string {
  return col?.colleague ? thread(col.colleague.who, col.colleague.day) : "";
}

/** The stage's chip, the same words cut to the chip row's budget: the
 *  colleague's first name, and the cadence without its noun. */
export function quietChipOf(col: Collision | null | undefined): string {
  if (!col) return "";
  if (col.mktgSends7 > 0) return cadence(col.mktgSends7, true);
  return thread(col.colleague?.who, col.colleague?.day, true);
}
