// The move line — how a commitment becomes an instruction (founder-decreed
// 2026-09-03).
//
// Two faults, one line of code apart. The stage printed the register's newest
// commitment VERBATIM as the row's NEXT MOVE, and then chopped it at
// character 95 when it ran long:
//
//   "Hold 11:00a–1:45p Tue/Wed/Thu next week for Regis global overview
//    call; confirm slot once Regis…"
//
// A commitment is a RECORD of a thing owed. A move is what to do today. They
// are not the same object and must never be printed as one. And the chop was
// a character count: the "first sentence" splitter knew only . ! ?, so the
// clause chains people actually write never split, and the cap then landed
// wherever it landed — mid-word, mid-name, mid-number.
//
// So the line is BUILT, not sliced:
//   1. the provenance tail goes — "· from 8/26 paste" is not the work;
//   2. the first CLAUSE is the instruction — a chain's tail is detail, and
//      detail lives one click down, never on arrival;
//   3. a parenthetical aside goes before any trimming does;
//   4. only then, if it still overruns, it trims at a WORD boundary.
//
// Every return carries the whole text beside the line, because the
// click-depth law says a compression is a door, never a dead end. Nothing
// here ever cuts mid-word, and nothing invents a verb the record didn't say.

export const MOVE_BUDGET = 96;

export type Clipped = { text: string; cut: boolean };

/** Trim to a budget on a WORD boundary. Never mid-word, never mid-number.
 *  A single word longer than the budget is the one case that hard-cuts —
 *  there is no boundary to find. */
export function clip(raw: string, budget = MOVE_BUDGET): Clipped {
  const text = (raw ?? "").trim().replace(/\s+/g, " ");
  if (text.length <= budget) return { text, cut: false };
  const room = budget - 1; // the ellipsis takes a column
  const head = text.slice(0, room);
  const sp = head.lastIndexOf(" ");
  // Keep a real amount of the line: a boundary in the last third only.
  const body = sp > room * 0.6 ? head.slice(0, sp) : head;
  return { text: `${body.replace(/[\s,;:—-]+$/, "")}…`, cut: true };
}

const PROVENANCE_TAIL = /\s+·\s+from\s.*$/i;
// A clause chain's first link is the instruction: "Hold the slots; confirm
// once they reply" is one thing to do and one thing that follows it.
const CLAUSE_SPLIT = /\s*(?:;|(?<=[.!?])\s)\s*/;
const PARENTHETICAL = /\s*\([^)]{4,}\)/g;

/** The instruction inside a commitment — clause-aware, never a character
 *  slice. Returns the line to print, the whole commitment for the door, and
 *  whether anything was held back. */
export function moveFromCommitment(
  commitment: string,
  budget = MOVE_BUDGET,
): { line: string; full: string; cut: boolean } {
  const full = (commitment ?? "")
    .trim()
    .replace(PROVENANCE_TAIL, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!full) return { line: "", full: "", cut: false };

  const period = (s: string) => (/[.!?…]$/.test(s) ? s : `${s}.`);

  // 1 — the first clause is the instruction.
  const first = full.split(CLAUSE_SPLIT).filter(Boolean)[0] ?? full;
  if (first.length <= budget)
    return { line: period(first), full, cut: first.length < full.length };

  // 2 — an aside in parentheses is detail; drop it before trimming words.
  const bare = first.replace(PARENTHETICAL, "").replace(/\s+/g, " ").trim();
  if (bare && bare.length <= budget) return { line: period(bare), full, cut: true };

  // 3 — last resort, and still never mid-word.
  return { line: period(clip(bare || first, budget).text), full, cut: true };
}

/** Which open commitment speaks. A blown wall outranks a date, a date
 *  outranks whatever the store happened to list first — order was never
 *  decided before, so the row's instruction was an accident of position. */
export function pickOwed<T extends { text: string; wall?: boolean; due?: string }>(
  owed: readonly T[],
): T | null {
  const live = (owed ?? []).filter((o) => (o?.text ?? "").trim());
  if (live.length === 0) return null;
  const rank = (o: T): number => (o.wall ? 0 : o.due ? 1 : 2);
  const dueMs = (o: T): number => {
    const t = Date.parse(`${o.due ?? ""}T12:00:00Z`);
    return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
  };
  return [...live].sort((a, b) => rank(a) - rank(b) || dueMs(a) - dueMs(b))[0] ?? null;
}
