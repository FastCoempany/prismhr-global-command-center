// The doors a row can come through (Provenance is columns, ruled 2026-09-25,
// P3 — CLAUDE.md, The Ted doctrine :405). Every AccountNote names one in its
// own column beside `source`, which names the dialect. The writer
// (src/lib/notes/write.ts) requires it, so a row with no door cannot be
// written through the one door the app has; a bare row is a defect.
//
//   chute     a file or paste thrown at the HomeRoom's Chute
//   drop      a paste or file dropped on an account's own row
//   act-lane  the Accounts sheet's workbench (drafts, sends, seats)
//   intranet  the Intranet's capture, routed through the pipeline
//   activity  the second record's writer (the weekly Salesforce export)
//   seed      a static store standing in until the record speaks
//   hand      the operator's own keystroke: a typed line, a click, a chip

export const DOORS = [
  "chute",
  "drop",
  "act-lane",
  "intranet",
  "activity",
  "seed",
  "hand",
] as const;

export type Door = (typeof DOORS)[number];

export function isDoor(x: unknown): x is Door {
  return typeof x === "string" && (DOORS as readonly string[]).includes(x);
}
