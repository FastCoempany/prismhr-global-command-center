// What a filing wrote, as the receipt opens it (slice 18a of the Chute brains
// refactor plan; the face approved 2026-10-06). The receipt line is one mono
// line on arrival, and the click-depth law says every compression opens one
// click deep: the counts open to the entries' subject lines, the to-dos and
// their promises. The ledger keeps counts, never text (D12: a settled row
// keeps the account, the counts, the day and the rung, never an address or
// body text), so the lines are read on request from the rows that carry the
// filing's id, here, and shown, never stored.
//
// Pure: the server door (src/app/room/filing-actions.ts) hands in the rows.
// Every line is scrubbed of addresses, because the receipt is a settled row
// and an address shows only inside the grounds of a live hold.

import { DIALECTS } from "./dialect";
import { splitMarker, splitTags } from "@/lib/today/route-notes";
import { USER_TZ } from "@/lib/tz";

export type FilingWrote = {
  /** One line per record entry: subject, people, day. */
  filed: string[];
  /** The operator's own to-dos the read opened. */
  todos: string[];
  /** Their promises, filed as loops on their side (D10). */
  promises: string[];
};

const GLYPH = /^[✉✓☰✎⚡▢✔☎]\s*/;
const EMAIL = /[a-z0-9][a-z0-9._%+-]*@[a-z0-9.-]+\.[a-z]{2,}/gi;
const DIALECT_HEAD = new RegExp(`^(?:${DIALECTS.join("|")})\\s+[^—]*?—\\s*`);

/** M/D in Chicago, the receipt's day. */
export function monthDay(at: Date): string {
  return at.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    timeZone: USER_TZ,
  });
}

/** A line with every address gone and its separators tidied. */
function scrub(s: string): string {
  return s
    .replace(EMAIL, "")
    .replace(/\s*<\s*>\s*/g, " ")
    .replace(/\s+·\s+(?=·|$)/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s·]+|[\s·]+$/g, "")
    .trim();
}

/** One record entry's line: the head's subject and people, then its day. The
 *  head is roomPaste's `${glyph} ${dialect} ${when} — ${subject} · ${actors}`
 *  or a transcript's own head; the dialect and the clock fall away, the dash
 *  becomes the receipt's dot, and the placeholders a head carries for an
 *  empty field are dropped rather than shown in brackets. */
export function entryLine(body: string, at: Date): string {
  const head = (body ?? "").split("\n")[0] ?? "";
  const line = head
    .replace(GLYPH, "")
    .replace(DIALECT_HEAD, "")
    .replace(/\s+—\s+/g, " · ")
    .replace(/\s*·\s*full text under the fold\b/i, "")
    .replace(/\s*·\s*filed from the room\b/i, "")
    .replace(/\(no subject\)/g, "No subject")
    .replace(/\s*·?\s*\(unattributed\)/g, "");
  const said = scrub(line);
  const day = monthDay(at);
  return said ? `${said} · ${day}` : day;
}

/** Everything one filing wrote, from its rows: the record entries in the
 *  account's own namespace, and its todos split by whose they are. */
export function wroteFrom(
  notes: readonly { body: string; createdAt: Date }[],
  todos: readonly { body: string }[],
): FilingWrote {
  const out: FilingWrote = { filed: [], todos: [], promises: [] };
  for (const n of notes) out.filed.push(entryLine(n.body, n.createdAt));
  for (const t of todos) {
    const { text, tags } = splitTags(splitMarker(t.body ?? "").text);
    const said = scrub(text);
    if (!said) continue;
    if (tags.owner === "them") out.promises.push(tags.by ? `${tags.by} · ${said}` : said);
    else out.todos.push(said);
  }
  return out;
}
