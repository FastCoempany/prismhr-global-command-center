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

// The header keys a mail client writes, in the languages the book's partners
// write in (a Puerto Rico partner's Outlook quotes "De: / Enviado el: / Para:
// / Asunto:"), each read as the English key it stands for.
const KEY: Record<string, string> = {
  from: "from",
  de: "from",
  von: "from",
  da: "from",
  van: "from",
  sent: "sent",
  date: "sent",
  enviado: "sent",
  "enviado el": "sent",
  fecha: "sent",
  envoyé: "sent",
  "envoyé le": "sent",
  gesendet: "sent",
  datum: "sent",
  inviato: "sent",
  verzonden: "sent",
  to: "to",
  para: "to",
  an: "to",
  à: "to",
  a: "to",
  aan: "to",
  cc: "cc",
  subject: "subject",
  asunto: "subject",
  betreff: "subject",
  objet: "subject",
  oggetto: "subject",
  onderwerp: "subject",
};
const KEYS = Object.keys(KEY)
  .sort((x, y) => y.length - x.length)
  .join("|");
const HEAD_LINE = new RegExp(`^[ \\t]*\\*?(${KEYS})\\s?:\\*?[ \\t]*(.*)$`, "i");
const FROM_LINE = /^[ \t]*\*?(?:From|De|Von|Da|Van)\s?:\*?\s/i;
/** A wrapped recipients line: names and addresses and their separators,
 *  nothing a sentence would carry. */
const RCPT_LIST =
  /^\s*(?:(?:"?[^"<>;,@\n]{0,60}"?\s*<[^<>\s]+@[^<>\s]+>|[^\s<>;,]+@[^\s<>;,]+)\s*[;,]?\s*)+$/;
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
        const key = KEY[m[1].toLowerCase()] ?? "";
        if (!key || head[key] !== undefined) break;
        head[key] = m[2].trim();
        last = key;
        continue;
      }
      // A recipients line wraps onto the very next line and reads as a list;
      // past a blank line, or reading as words, it is the body.
      if (
        (last === "to" || last === "cc") &&
        lines[j - 1]?.trim() &&
        RCPT_LIST.test(line)
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

/** A sender's display name and address: "Leilani Gonzalez <l@x.com>",
 *  "Gonzalez, Leilani" or a bare "l@x.com". */
function senderOf(s: string): { name: string; address: string } {
  const raw = (s ?? "").trim();
  const angle = /^(.*?)<([^>]+)>/.exec(raw);
  const address = (angle ? angle[2] : /@/.test(raw) ? raw : "").trim().toLowerCase();
  let name = (angle ? angle[1] : /@/.test(raw) ? "" : raw).replace(/["']/g, "").trim();
  const lastFirst = /^([^,]+),\s*(.+)$/.exec(name);
  if (lastFirst) name = `${lastFirst[2]} ${lastFirst[1]}`;
  return { name, address };
}

const words = (name: string): string[] =>
  name
    .toLowerCase()
    .split(/[^a-z'’]+/)
    .filter((w) => w.length > 1);

const OUR_MAIL = /@(?:prismhr|vensure)\.com\b/i;
const isOurs = (s: string): boolean => MINE_RE.test(s) || OUR_MAIL.test(s);

/** Every address the capture's headers pair with a display name, so a bare
 *  address in one header (Power Automate writes the relay's From that way)
 *  reads as the name another header gives it. */
function aliasesOf(msgs: readonly EmailMessage[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of msgs)
    for (const field of [m.from, ...m.to.split(/[;,]/)]) {
      const { name, address } = senderOf(field);
      if (name && address && !out.has(address)) out.set(address, name);
    }
  return out;
}

/** Does the read's sender name the message's sender? Never across sides
 *  (ours against theirs). By name, every word the read wrote is in the
 *  header's name; by a bare address with no name anywhere in the capture,
 *  the address spells the read's name (its surname, or initial and surname). */
function sameSender(
  entryFrom: string,
  msgFrom: string,
  aliases: ReadonlyMap<string, string>,
): boolean {
  const mineEntry = MINE_RE.test(entryFrom) || /^(you|me)$/i.test(entryFrom.trim());
  if (mineEntry !== isOurs(msgFrom)) return false;
  if (mineEntry) return true;
  const want = words(entryFrom);
  if (want.length === 0) return false;
  const { name, address } = senderOf(msgFrom);
  const shown = name || aliases.get(address) || "";
  if (shown) {
    const have = new Set(words(shown));
    return want.every((w) => have.has(w));
  }
  const local = (address.split("@")[0] ?? "").replace(/[^a-z]/g, "");
  const first = want[0];
  const last = want[want.length - 1];
  if (!local) return false;
  return want.length === 1
    ? local === first
    : (last.length >= 3 && local.includes(last)) ||
        local === `${first[0]}${last}` ||
        local === `${first}${last[0]}`;
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

/** The day a written date names, "" when it names none: "Tuesday, October
 *  13, 2026 at 9:00 AM" (Outlook for Mac, a Gmail forward), "Oct 13, 2026,
 *  at 9:00 AM" (Apple), an RFC date, and the numeric forms, day first when
 *  the first number cannot be a month or the separator is a dot. */
function writtenDay(sent: string): string {
  const s = (sent ?? "").trim();
  if (!s) return "";
  const num = /^(?:[A-Za-z]+,?\s*)?(\d{1,2})([/.-])(\d{1,2})\2(\d{2,4})\b/.exec(s);
  if (num) {
    const [a, b] = [Number(num[1]), Number(num[3])];
    const dayFirst = num[2] === "." || a > 12;
    const [mo, d] = dayFirst ? [b, a] : [a, b];
    const y = Number(num[4].length === 2 ? `20${num[4]}` : num[4]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return "";
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const dateOnly = s
    .replace(/^[A-Za-z]+,\s*/, "")
    .replace(/,?\s+at\s+\d{1,2}:\d{2}.*$/i, "")
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

  const aliases = aliasesOf(msgs);
  // A day the entry names must be the message's: a Sent line that names
  // none says nothing, and one that names a day the reader cannot read is
  // never taken on trust.
  const dayFits = (e: WholeEntry, m: EmailMessage): boolean => {
    if (!e.dayIso || !m.sent.trim()) return true;
    const days = sentDays(m.sent);
    return days.length > 0 && days.includes(e.dayIso);
  };
  // A clock both sides name must agree too, a single candidate included.
  const clockFits = (e: WholeEntry, m: EmailMessage): boolean => {
    const clock = sentClockLabel(e.timeLabel ?? "");
    const clocks = sentClocks(m.sent);
    return !clock || clocks.length === 0 || clocks.includes(clock);
  };
  const taken = new Set<number>();
  for (const { e, i } of emails) {
    const subject = threadSubject(e.subject ?? "");
    const free = msgs
      .map((m, k) => ({ m, k }))
      .filter(({ m, k }) => !taken.has(k) && dayFits(e, m) && clockFits(e, m));
    const sender = ({ m }: { m: EmailMessage }) =>
      sameSender(e.from ?? "", m.from, aliases);
    let picks = free.filter((x) => sender(x) && threadSubject(x.m.subject) === subject);
    // One email read from a capture: the capture's own message, when its
    // sender is the read's and the read wrote the subject its own way. The
    // subject alone never pairs: every message of a thread shares it.
    if (picks.length === 0 && emails.length === 1)
      picks = free.filter((x) => x.k === 0 && sender(x));
    // A tie left standing is a guess, and a guess is never kept.
    if (picks.length !== 1) continue;
    taken.add(picks[0].k);
    out[i] = cleanEmailWhole(picks[0].m.body) || null;
  }
  return out;
}
