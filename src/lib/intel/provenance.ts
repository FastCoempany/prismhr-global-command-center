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

// Our own side of a thread: the operator, anyone on the PrismHR roster the
// caller hands in (the book's CSM column is the live one), or a bare
// prismhr.com address. Named for the Regis row of 2026-08-27, which read
// "Wait on Lesha Cyphers" because the CSM who made the intro happened to lead
// the To line — the room told the operator to wait on his own colleague.
// Pure: the roster arrives as an argument so this stays testable and the
// intel layer never imports the book.
export function isHomeSideName(name: string, roster: readonly string[]): boolean {
  const s = normPerson(name ?? "").trim();
  if (!s) return false;
  if (MINE_RE.test(s)) return true;
  if (/@prismhr\.com\b/i.test(s)) return true;
  const key = s.toLowerCase();
  return roster.some((r) => {
    const t = normPerson(r ?? "")
      .trim()
      .toLowerCase();
    return !!t && t !== "unassigned" && t === key;
  });
}

// The receiving side of an actors line — "Tom Harrison → Javier Ramirez +3"
// names Javier. The overflow count is how many others were on it, never a
// person, so it comes off. "" when the line names nobody on the right.
export function recipientOf(actors: string): string {
  const right = (actors ?? "").split("→")[1];
  if (right === undefined) return "";
  return normPerson(cleanNameToken(right.replace(/\+\d+\s*$/, "")));
}

// Letters people put after their name. Stripped from an allowlist, never by a
// blanket ", X" rule — "Pegram, Sarah" is a flipped name and normPerson has to
// still see both halves to put it back.
const CREDENTIALS =
  /,\s*(?:PHR|SPHR|GPHR|SHRM-?S?CP|CPA|CPP|CEBS|MBA|JD|PMP|CPC|Jr\.?|Sr\.?|I{2,3})\.?\s*$/i;

// A name as the record actually stores it, not as it ought to look. Captures
// come out of mail clients half-parsed: `Anika Steenstra >` keeps the tail of a
// stripped address, `"Melanie Dreyer` keeps the open quote of a display name,
// `Sarah Pegram, PHR` carries credentials. Left alone, that stray `>` made a
// CSM's own name fail to match the roster and demoted a real client reply
// (found sweeping the record before shipping the inbound test, 2026-09-15).
export function cleanNameToken(raw: string): string {
  return (raw ?? "")
    .replace(/[<>"']+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(CREDENTIALS, "")
    .trim();
}

// Did this reach OUR side? Named for the Infiniti row of 2026-09-15, where a
// thread between two of the PEO's own people — we were merely copied — read as
// a reply owed and the stage said "Answer Tom. They wrote today." Nobody had
// written to him.
//
// A message to a colleague still counts: a reply that lands in a colleague's
// inbox has still reached us, and the second record already holds that
// position (src/lib/groundwork/day.ts — "no bump; the move flips to
// coordination instead"). What does NOT count is a message addressed to
// another of the account's own people.
//
// Conservative on purpose. It answers TRUE when the line names no recipient,
// so a capture that never carried a To line keeps the answer it had before
// this rule existed. Taking a real reply away is the worse failure of the two,
// and the guard needs evidence to do it (evidence or nothing).
export function isAddressedToUs(actors: string, roster: readonly string[]): boolean {
  const rcpt = recipientOf(actors);
  if (!rcpt) return true;
  if (isHomeSideName(rcpt, roster)) return true;
  // A record often carries only a colleague's first name ("Anika") — the same
  // allowance the pipeline builder makes when it tells a colleague from a
  // client. It can only ever KEEP an inbound, never take one away, so a client
  // who happens to share a first name with one of ours costs nothing.
  const one = rcpt.toLowerCase();
  if (one.includes(" ")) return false;
  if (MINE_RE.test(one)) return true;
  return roster.some((r) => (r ?? "").trim().toLowerCase().split(" ")[0] === one);
}

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
// existed). "" when the body has no SF head. The head's "(unattributed)"
// placeholder is a label, never a person — it must not resurrect as a
// sender (refuted 2026-08-22: a phantom "(unattributed)" was warming
// accounts and registering inbound).
export function inferActors(body: string): string {
  const m = SF_HEAD_RE.exec(body ?? "");
  const a = m ? m[1].trim() : "";
  return a === "(unattributed)" ? "" : a;
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
