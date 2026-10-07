// What a filing wrote, as the receipt opens it (slice 18a of the Chute brains
// refactor plan; the face approved 2026-10-06). The receipt line is one mono
// line on arrival, and the click-depth law says every compression opens one
// click deep: the counts open to the entries' subject lines, the to-dos,
// their promises, the asks and the playbook lines. It opens every count it
// shows (ruled 2026-10-07, pass 8 call 9), so the asks and the playbook lines
// are read too, from their own namespaces by the filing's id. The ledger
// keeps counts, never text (D12: a settled row keeps the account, the counts,
// the day and the rung, never an address or body text), so the lines are
// read on request from the rows that carry the filing's id and shown, never
// stored.
//
// Pure: the server reader (wroteOfFiling, src/lib/ingest/filing.ts) hands in
// the rows. Every line is scrubbed of addresses, because the receipt is a
// settled row and an address shows only inside the grounds of a live hold.

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
  /** The asks the read queued in the account's gaps namespace. */
  asks: string[];
  /** The market facts and lessons the read filed to the playbook. */
  learned: string[];
};

/** The duplicate guard's refusal, verbatim (CLAUDE.md, The Chute: "Already on
 *  file. Nothing filed twice."). The earlier filing's day is not spliced in
 *  between the two sentences (B48): it rides beside the line as its door
 *  (pass 8, C2). */
export const ALREADY_ON_FILE = "Already on file. Nothing filed twice.";

/** A twin of the capture is filing now (the duplicate race, pass 8): the
 *  claim the first filing holds refuses the second while it runs. */
export const ALREADY_FILING = "Already filing. Nothing filed twice.";

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
 *  account's own namespace, its todos split by whose they are, and the asks
 *  and playbook lines as their own namespaces' parsers read them (the server
 *  reader parses them, so this module stays free of the stores). */
export function wroteFrom(
  notes: readonly { body: string; createdAt: Date }[],
  todos: readonly { body: string }[],
  more: { asks?: readonly string[]; learned?: readonly string[] } = {},
): FilingWrote {
  const out: FilingWrote = { filed: [], todos: [], promises: [], asks: [], learned: [] };
  for (const n of notes) out.filed.push(entryLine(n.body, n.createdAt));
  for (const t of todos) {
    const { text, tags } = splitTags(splitMarker(t.body ?? "").text);
    const said = scrub(text);
    if (!said) continue;
    if (tags.owner === "them") out.promises.push(tags.by ? `${tags.by} · ${said}` : said);
    else out.todos.push(said);
  }
  for (const [list, lines] of [
    [out.asks, more.asks ?? []],
    [out.learned, more.learned ?? []],
  ] as const)
    for (const line of lines) {
      const said = scrub(line);
      if (said) list.push(said);
    }
  return out;
}
