// The acted match (ruled 2026-09-25, D20): the record has moved on a gem
// when a first-record row after the gem's day carries the gem's person as
// an actor or recipient, matched by address or by normalized name with
// initials accepted. "Natalie B." finds "Natalie Borland"; "Nat" alone finds
// nothing — a bare fragment is not a person. The day check stays with the
// caller, which knows the gem. Pure, so the canon suite pins it.

export type MovedRow = {
  /** The send's recipient names, as the record reads them. */
  who: string;
  /** The note's head line. */
  head: string;
  /** The actors column, "A → B +2". */
  actors?: string;
  /** The recipients column, comma-joined addresses or names. */
  recipients?: string;
};

const norm = (s: string): string =>
  (s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9@.'\-+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const words = (s: string): string[] =>
  norm(s)
    .split(" ")
    .map((w) => w.replace(/^[.'\-]+|[.'\-]+$/g, ""))
    .filter(Boolean);

/** Does one row carry one of the gem's people? */
export function personMoved(who: readonly string[], row: MovedRow): boolean {
  const hay = [row.who, row.actors ?? "", row.recipients ?? "", row.head]
    .filter(Boolean)
    .join(" ");
  const hayNorm = norm(hay);
  const hayWords = words(hay);
  for (const raw of who) {
    const w = (raw ?? "").trim();
    if (!w) continue;
    if (w.includes("@")) {
      if (hayNorm.includes(norm(w))) return true;
      continue;
    }
    const parts = words(w);
    if (parts.length === 0) continue;
    if (parts.length === 1) {
      // A lone token must be a whole word — "nat" never claims "natalie".
      if (parts[0].length >= 2 && hayWords.includes(parts[0])) return true;
      continue;
    }
    const first = parts[0];
    const last = parts[parts.length - 1];
    const fits = (word: string, token: string) =>
      token.length === 1 ? word.startsWith(token) : word === token;
    for (let i = 0; i < hayWords.length - 1; i++) {
      const a = hayWords[i];
      const b = hayWords[i + 1];
      if ((fits(a, first) && fits(b, last)) || (fits(a, last) && fits(b, first)))
        return true;
    }
  }
  return false;
}
