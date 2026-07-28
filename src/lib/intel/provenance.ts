// Provenance for the account repository: every stored note carries a lane —
// "mine" (my own working record: threads I'm on, notes and actions I took) or
// "background" (ingested intelligence around the account: case traffic,
// support threads, other-department chatter). Stamped at write time; inferred
// at read time for rows written before the columns existed. Pure — testable.

export type Lane = "mine" | "background";

// Me, in any of the forms SF and email render it.
const MINE_RE = /\bantaeus\b|antaeus\.coe@|acoe@prismhr/i;

// The light "just-in-case" promote: traffic that doesn't carry my name but is
// unmistakably about my product line still belongs in my working record —
// team members moving a Global deal without cc'ing me. Deliberately narrow
// (product-line terms only) so the background register stays background.
const GLOBAL_SCENT_RE =
  /prism\s*(hr)?\s*global|global\s+payroll|employer\s+of\s+record|\beor\b|international\s+(payroll|employee|hiring)/i;

export function laneFor(actors: string, text: string): Lane {
  if (MINE_RE.test(actors) || MINE_RE.test(text)) return "mine";
  if (GLOBAL_SCENT_RE.test(text)) return "mine";
  return "background";
}

// "Kim Bartolotti → Lesha Cyphers +2" — the actors string stored on SF-filed
// entries, built from the parsed/AI-cleaned from/to fields.
export function actorsLine(from: string, to: string, others: number): string {
  const f = from.trim();
  const t = to.trim();
  const tail = others > 0 ? ` +${others}` : "";
  if (f && t) return `${f} → ${t}${tail}`;
  return `${f || t}${tail}`;
}

// SF-filed note heads look like "✉ SF Jul 22 4:11 PM — Subject · A → B +2".
const SF_HEAD_RE = /^[✉✔☎] SF [^—\n]*— .*? · (.+?)$/mu;

// Recover the actors from a legacy note body (written before the column
// existed). "" when the body has no SF head.
export function inferActors(body: string): string {
  const m = SF_HEAD_RE.exec(body ?? "");
  return m ? m[1].trim() : "";
}

// Lane for a legacy row. Only SF-filed pastes can be background — everything
// else in the table (chip notes, dispositions, transcripts, sheet routes) was
// typed or filed by me and is my working record by construction.
export function inferLane(kind: string, body: string, actors: string): Lane {
  if (kind !== "account") return "mine";
  if (!/^[✉✔☎] SF /u.test(body ?? "")) return "mine";
  return laneFor(actors, body);
}

// The subject of an SF-filed note ("" for hand-written notes) — feeds the
// People index's "last context" column.
export function inferSubject(body: string): string {
  const m = /^[✉✔☎] SF [^—\n]*— (.*?) · [^·\n]*$/mu.exec(body ?? "");
  return m ? m[1].trim() : "";
}
