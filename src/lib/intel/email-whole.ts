// The whole email (ship order 2026-10-20; CLAUDE.md, The email in the row).
// The read files each email as a synopsis, and until now the email itself was
// dropped once the model had read it. The founder asked to read the newest
// email whole on the HomeRoom row, so the filing keeps it: the capture is
// split into its messages by their header blocks, each email entry the read
// filed is matched to the message it came from, and that message's own words,
// cleaned (src/lib/activity/excerpt.ts), ride to the store beside its note.
//
// Matching is strict, never a guess. Only a capture that leads with its own
// header block is split (the relay's copies, a dropped .eml or .msg): a
// reading-pane grab or a hand-pasted reply carries the newest message with no
// header of its own, and its only blocks are what it quotes. The sender and
// the subject must agree, a day both sides name must be the same day, and the
// clock breaks a tie; a tie left standing keeps nothing. An entry with no sure
// message keeps no whole text, and the row then says so and shows the
// synopsis. Pure.

import { cleanEmailWhole } from "@/lib/activity/excerpt";
import { MINE_RE } from "@/lib/intel/provenance";
import { sentClockLabel } from "@/lib/intel/rules-read";
import { USER_TZ, chicagoDay } from "@/lib/tz";

export type EmailMessage = {
  from: string;
  to: string;
  subject: string;
  sent: string;
  body: string;
};

/** What an entry offers the matcher: the read's own fields. */
export type WholeEntry = {
  kind?: string;
  from?: string;
  subject?: string;
  dayIso?: string;
  timeLabel?: string;
};

const HEAD_LINE = /^[ \t]*\*?(From|Sent|Date|To|Cc|Subject):\*?[ \t]*(.*)$/i;
const FROM_LINE = /^[ \t]*\*?From:\*?\s/i;

/** The capture's messages, in the order the text holds them (newest first in
 *  a reply chain). A header block is a From line with a Subject beneath it
 *  and a Sent, Date or To line, blank lines between them skipped, because an
 *  HTML message turned to text puts one between every paragraph; a wrapped
 *  recipients line joins the line above it. A block without those lines is
 *  not a message and stays inside the body above it. */
export function emailMessages(raw: string): EmailMessage[] {
  return blocksOf(raw).messages;
}

/** The capture's own first line, the head a door writes ("OUTLOOK THREAD —
 *  inbox copy", "OUTLOOK THREAD — dropped file …"), which is not a message. */
const CAPTURE_HEAD = /^[A-Z][A-Z ]{3,40}—/;

function blocksOf(raw: string): { messages: EmailMessage[]; leads: boolean } {
  const lines = (raw ?? "").replace(/\r/g, "").split("\n");
  const blocks: { start: number; bodyAt: number; head: Record<string, string> }[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!FROM_LINE.test(lines[i])) continue;
    const head: Record<string, string> = {};
    let last = "";
    let j = i;
    for (; j < Math.min(lines.length, i + 20); j++) {
      const line = lines[j];
      if (!line.trim()) continue;
      const m = HEAD_LINE.exec(line);
      if (m) {
        const key = m[1].toLowerCase() === "date" ? "sent" : m[1].toLowerCase();
        if (head[key] !== undefined) break;
        head[key] = m[2].trim();
        last = key;
        continue;
      }
      if (
        (last === "to" || last === "cc") &&
        /@|;/.test(line) &&
        !/[.!?]\s*$/.test(line)
      ) {
        head[last] = `${head[last]} ${line.trim()}`;
        continue;
      }
      break;
    }
    if (!head.from || head.subject === undefined || !(head.sent || head.to)) continue;
    blocks.push({ start: i, bodyAt: j, head });
    i = j - 1;
  }
  // The capture leads with its own header when its first line of substance,
  // past the door's head, opens the first block.
  let first = 0;
  while (first < lines.length && !lines[first].trim()) first++;
  if (first < lines.length && CAPTURE_HEAD.test(lines[first].trim())) first++;
  while (first < lines.length && !lines[first].trim()) first++;
  return {
    leads: blocks.length > 0 && blocks[0].start === first,
    messages: blocks.map((b, k) => ({
      from: b.head.from ?? "",
      to: b.head.to ?? "",
      subject: b.head.subject ?? "",
      sent: b.head.sent ?? "",
      body: lines.slice(b.bodyAt, blocks[k + 1]?.start ?? lines.length).join("\n"),
    })),
  };
}

/** A subject as a thread knows it: reply and forward prefixes, external tags
 *  and marks gone, case and spacing folded. */
export function threadSubject(s: string): string {
  let t = (s ?? "").replace(/\[\s*(?:EXTERNAL|EXT|External Email)\s*\]/gi, " ");
  for (;;) {
    const next = t.replace(
      /^[\s❗!*:|-]*(?:re|fw|fwd|aw|sv|wg)\s*(?:\[\d+\])?\s*:\s*/i,
      "",
    );
    if (next === t) break;
    t = next;
  }
  return t.replace(/[❗]/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

/** The name words of a sender: "Leilani Gonzalez <l@x.com>", "Gonzalez,
 *  Leilani" and "leilani.gonzalez@x.com" all read as leilani, gonzalez. */
function nameWords(s: string): string[] {
  const raw = (s ?? "").trim();
  const angle = /^(.*?)<([^>]+)>/.exec(raw);
  let name = (angle ? angle[1] : raw).replace(/["']/g, "").trim();
  if (!name || /@/.test(name)) {
    const addr = angle ? angle[2] : raw;
    name = (addr.split("@")[0] ?? "").replace(/[._-]+/g, " ");
  }
  const lastFirst = /^([^,]+),\s*(.+)$/.exec(name);
  if (lastFirst) name = `${lastFirst[2]} ${lastFirst[1]}`;
  return name
    .toLowerCase()
    .split(/[^a-z'’]+/)
    .filter((w) => w.length > 1);
}

/** Does the read's sender name the message's sender? Every word the read
 *  wrote is in the header's name, or the operator wrote both. */
function sameSender(entryFrom: string, msgFrom: string): boolean {
  if (MINE_RE.test(entryFrom) || /^(you|me)$/i.test(entryFrom.trim()))
    return MINE_RE.test(msgFrom);
  const want = nameWords(entryFrom);
  const have = new Set(nameWords(msgFrom));
  return want.length > 0 && want.every((w) => have.has(w));
}

/** The days a Sent line can mean: an ISO stamp with its offset is a moment,
 *  read as its Chicago day and as its UTC day, because the read may have
 *  dated it either way; a written date is the day it says. Empty when it
 *  names none. */
function sentDays(sent: string): string[] {
  const s = (sent ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const t = Date.parse(s);
    return Number.isNaN(t)
      ? []
      : [chicagoDay(new Date(t)), new Date(t).toISOString().slice(0, 10)];
  }
  const day = writtenDay(s);
  return day ? [day] : [];
}

/** The clocks a Sent line can mean, as the head writes them ("2:10 PM"):
 *  a stamp's Chicago clock and its UTC clock, a written clock in either
 *  idiom (src/lib/intel/rules-read.ts reads the 24-hour one). */
function sentClocks(sent: string): string[] {
  const s = (sent ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const t = Date.parse(s);
    if (Number.isNaN(t)) return [];
    const chi = new Date(t).toLocaleTimeString("en-US", {
      timeZone: USER_TZ,
      hour: "numeric",
      minute: "2-digit",
    });
    return [chi, sentClockLabel(new Date(t).toISOString().slice(11, 16))];
  }
  const clock = sentClockLabel(s);
  return clock ? [clock] : [];
}

/** The day a written date names, "" when it names none. */
function writtenDay(sent: string): string {
  const s = (sent ?? "").trim();
  if (!s) return "";
  const dateOnly = s
    .replace(/^[A-Za-z]+,\s*/, "")
    .replace(/\d{1,2}:\d{2}.*$/, "")
    .trim()
    .replace(/,\s*$/, "");
  const t = Date.parse(`${dateOnly} 12:00:00 UTC`);
  return Number.isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10);
}

/** Each entry's whole email, by index: the cleaned words of the message it
 *  came from, or null when the capture does not lead with its own header,
 *  no message surely matches, the entry is not an email, or the message has
 *  no words of its own. */
export function wholeEmails(
  raw: string,
  entries: readonly WholeEntry[],
): (string | null)[] {
  const out: (string | null)[] = entries.map(() => null);
  const emails = entries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => (e.kind ?? "email") === "email");
  if (emails.length === 0) return out;
  const { messages: msgs, leads } = blocksOf(raw);
  if (!leads) return out;

  // A day both sides name must agree; a side that names none never vetoes.
  const dayFits = (e: WholeEntry, m: EmailMessage): boolean => {
    const days = sentDays(m.sent);
    return !e.dayIso || days.length === 0 || days.includes(e.dayIso);
  };
  const taken = new Set<number>();
  for (const { e, i } of emails) {
    const subject = threadSubject(e.subject ?? "");
    const free = msgs
      .map((m, k) => ({ m, k }))
      .filter(({ m, k }) => !taken.has(k) && dayFits(e, m));
    let picks = free.filter(
      ({ m }) => sameSender(e.from ?? "", m.from) && threadSubject(m.subject) === subject,
    );
    // One email read from a capture: the capture's own message, when the
    // sender or the subject still agrees and the read only wrote the other
    // its own way.
    if (picks.length === 0 && emails.length === 1)
      picks = free.filter(
        ({ m, k }) =>
          k === 0 &&
          (sameSender(e.from ?? "", m.from) || threadSubject(m.subject) === subject),
      );
    if (picks.length > 1 && e.timeLabel) {
      const clock = sentClockLabel(e.timeLabel);
      const sameClock = picks.filter(
        ({ m }) => !!clock && sentClocks(m.sent).includes(clock),
      );
      if (sameClock.length) picks = sameClock;
    }
    // A tie left standing is a guess, and a guess is never kept.
    if (picks.length !== 1) continue;
    taken.add(picks[0].k);
    out[i] = cleanEmailWhole(picks[0].m.body) || null;
  }
  return out;
}
