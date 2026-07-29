// Provenance for the account repository: every stored note carries a lane —
// "mine" (my own working record: threads I'm on, notes and actions I took) or
// "background" (ingested intelligence around the account: case traffic,
// support threads, other-department chatter). Stamped at write time; inferred
// at read time for rows written before the columns existed. Pure — testable.

export type Lane = "mine" | "background";

// The operator, canonically. Outlook renders them as "You"; Teams as "you" or
// "Me"; SF as the full name — all normalize to this before storage so lanes,
// direction, and the People index agree on who spoke.
export const OPERATOR_NAME = "Antaeus Coe";

// Me, in any of the forms SF and email render it.
const MINE_RE = /\bantaeus\b|antaeus\.coe@|acoe@prismhr/i;
export { MINE_RE };

// The light "just-in-case" promote: traffic that doesn't carry my name but is
// unmistakably about my product line still belongs in my working record —
// team members moving a Global deal without cc'ing me. Deliberately narrow
// (product-line terms only) so the background register stays background.
const GLOBAL_SCENT_RE =
  /prism\s*(hr)?\s*global|global\s+payroll|employer\s+of\s+record|\beor\b|international\s+(payroll|employee|hiring)/i;
export { GLOBAL_SCENT_RE };

export function laneFor(actors: string, text: string): Lane {
  if (MINE_RE.test(actors) || MINE_RE.test(text)) return "mine";
  if (GLOBAL_SCENT_RE.test(text)) return "mine";
  return "background";
}

// Normalize one person token before storage: first-person forms become the
// operator's name; "<mailto>" tails drop; "Last, First" flips to "First Last"
// so a name is one person everywhere, not two phantom halves.
export function normPerson(raw: string): string {
  let s = (raw ?? "").replace(/<[^>]*>/g, "").trim();
  if (/^(you|me|myself)$/i.test(s)) return OPERATOR_NAME;
  const lastFirst = /^([A-Z][\w'’.-]+),\s+([A-Z][\w'’.-]+)$/.exec(s);
  if (lastFirst) s = `${lastFirst[2]} ${lastFirst[1]}`;
  return s;
}

// "Kim Bartolotti → Lesha Cyphers +2" — the actors string stored on SF-filed
// entries, built from the parsed/AI-cleaned from/to fields.
export function actorsLine(from: string, to: string, others: number): string {
  const f = normPerson(from);
  const t = normPerson(to);
  const tail = others > 0 ? ` +${others}` : "";
  if (f && t) return `${f} → ${t}${tail}`;
  return `${f || t}${tail}`;
}

// Filed note heads: "✉ SF Jul 22 4:11 PM — Subject · A → B +2". The dialect
// token names the capture's true origin — SF timeline, OL (Outlook thread),
// TM (Teams chat) — so the record never claims CRM provenance for an inbox
// grab. Legacy inference accepts all three.
const SF_HEAD_RE = /^[✉✔☎] (?:SF|OL|TM) [^—\n]*— .*? · (.+?)$/mu;

// Recover the actors from a legacy note body (written before the column
// existed). "" when the body has no SF head.
export function inferActors(body: string): string {
  const m = SF_HEAD_RE.exec(body ?? "");
  return m ? m[1].trim() : "";
}

// Lane for a legacy row. Only paste-filed entries can be background —
// everything else in the table (chip notes, dispositions, transcripts, sheet
// routes) was typed or filed by me and is my working record by construction.
export function inferLane(kind: string, body: string, actors: string): Lane {
  if (kind !== "account") return "mine";
  if (!/^[✉✔☎] (?:SF|OL|TM) /u.test(body ?? "")) return "mine";
  return laneFor(actors, body);
}

// The subject of a paste-filed note ("" for hand-written notes) — feeds the
// People index's "last context" column.
export function inferSubject(body: string): string {
  const m = /^[✉✔☎] (?:SF|OL|TM) [^—\n]*— (.*?) · [^·\n]*$/mu.exec(body ?? "");
  return m ? m[1].trim() : "";
}
