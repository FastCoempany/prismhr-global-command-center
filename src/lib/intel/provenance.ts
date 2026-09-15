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

// The stored recipient list, which is one string because the column is one
// string. Names are comma-joined on write; a name carrying its own comma is
// not a thing the cleaner emits (it normalizes "Last, First" before this).
export function splitRecipients(stored: string | null | undefined): string[] {
  return (stored ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinRecipients(names: readonly string[] | undefined): string {
  return (names ?? [])
    .map((n) => normPerson(cleanNameToken(n)))
    .filter(Boolean)
    .join(", ");
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
// thread between two of the PEO's own people read as a reply owed and the
// stage said "Answer Tom. They wrote today." Nobody had written to him.
//
// A message to a colleague counts: a reply that lands in a colleague's inbox
// has still reached us, and the second record already holds that position
// (src/lib/groundwork/day.ts — "no bump; the move flips to coordination
// instead").
//
// READ THE COUNT BEFORE TRUSTING THE NAME. The actors line's recipient slot is
// not the recipient list. The cleaner is told, in as many words, that when a
// message has several recipients "to" names the person on the ACCOUNT'S side,
// never a @prismhr.com colleague, even when the colleague leads the To line
// (src/lib/intel/ai-clean.ts) — because our own side is on nearly every thread
// and identifies nobody. Everyone else collapses to "+N". So on a collapsed
// line an account-side name is exactly what the contract promises whether we
// were on it or not, and reading absence from it is reading nothing.
//
// Measured before this was written the second time: of 39 entries the naive
// rule demoted across the whole record, 35 sat behind a "+N" that could have
// held the operator. Only where the line names ONE recipient is that name the
// whole truth, and only there may a reply be taken away.
//
// So: TRUE unless the line names a single recipient who is not ours. That is
// narrow, and deliberately — it does not settle the Infiniti row, which
// carries "+3". Settling that one needs the capture to keep the recipients it
// currently throws away, not a cleverer reading of what survives.
export function isAddressedToUs(
  actors: string,
  roster: readonly string[],
  /** Every recipient the capture kept, our own side included. When the capture
   *  carried it this IS the answer, and the collapsed-count reasoning below is
   *  not needed. Absent on every row filed before the field existed. */
  recipients?: readonly string[],
): boolean {
  const all = (recipients ?? []).map(cleanNameToken).filter(Boolean);
  if (all.length) return all.some((n) => isOurs(n, roster));

  // No list — fall back to what the actors line alone can prove.
  // "+N" means the line dropped N recipients on the floor. Any of them could
  // be us, and the contract above says the one it kept is theirs by design.
  if (/\+\d+\s*$/.test((actors ?? "").trim())) return true;
  const rcpt = recipientOf(actors);
  if (!rcpt) return true;
  return isOurs(rcpt, roster);
}

// One person, our side or theirs. The roster read, plus the allowance a record
// needs: it often carries only a colleague's first name ("Anika"), the same
// allowance the pipeline builder makes when it tells a colleague from a
// client. That allowance can only ever KEEP an inbound, never take one away,
// so a client who happens to share a first name with one of ours costs
// nothing.
function isOurs(name: string, roster: readonly string[]): boolean {
  if (isHomeSideName(name, roster)) return true;
  const one = name.trim().toLowerCase();
  if (!one || one.includes(" ")) return false;
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
