// The whole email (ship order 2026-10-20; CLAUDE.md, The email in the row).
// The read files each email as a synopsis, and until now the email itself was
// dropped once the model had read it. The founder asked to read the newest
// email whole on the HomeRoom row, so the filing keeps it: the capture is
// split into its messages by their header blocks, each email entry the read
// filed is matched to the message it came from, and that message's own words,
// cleaned (src/lib/activity/excerpt.ts), ride to the store beside its note.
//
// Matching is strict, never a guess: the sender and the subject must agree,
// and the day and the clock break a tie. An entry with no sure message keeps
// no whole text, and the row then says so and shows the synopsis. Pure.

import { cleanEmailWhole } from "@/lib/activity/excerpt";
import { HEADS } from "@/lib/ingest/dialect";
import { MINE_RE } from "@/lib/intel/provenance";
import { chicagoDay } from "@/lib/tz";

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
  return blocks.map((b, k) => ({
    from: b.head.from ?? "",
    to: b.head.to ?? "",
    subject: b.head.subject ?? "",
    sent: b.head.sent ?? "",
    body: lines.slice(b.bodyAt, blocks[k + 1]?.start ?? lines.length).join("\n"),
  }));
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

/** The Chicago day a Sent line names: an ISO stamp with its offset is a
 *  moment, a written date is the day it says. "" when it names none. */
function sentDay(sent: string): string {
  const s = (sent ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const t = Date.parse(s);
    return Number.isNaN(t) ? "" : chicagoDay(new Date(t));
  }
  const dateOnly = s
    .replace(/^[A-Za-z]+,\s*/, "")
    .replace(/\d{1,2}:\d{2}.*$/, "")
    .trim()
    .replace(/,\s*$/, "");
  const t = Date.parse(`${dateOnly} 12:00:00 UTC`);
  return Number.isNaN(t) ? "" : new Date(t).toISOString().slice(0, 10);
}

const clockOf = (s: string): string =>
  /(\d{1,2}):(\d{2})\s*(AM|PM)/i
    .exec(s ?? "")
    ?.slice(1, 4)
    .join(":")
    .toUpperCase() ?? "";

/** Each entry's whole email, by index: the cleaned words of the message it
 *  came from, or null when no message surely matches, the entry is not an
 *  email, or the message has no words of its own. `outlook` says the capture
 *  is an Outlook thread, the only shape where a capture with no header block
 *  and one email entry is that email. */
export function wholeEmails(
  raw: string,
  entries: readonly WholeEntry[],
  opts: { outlook: boolean },
): (string | null)[] {
  const out: (string | null)[] = entries.map(() => null);
  const emails = entries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => (e.kind ?? "email") === "email");
  if (emails.length === 0) return out;
  const msgs = emailMessages(raw);

  if (msgs.length === 0) {
    if (!opts.outlook || emails.length !== 1) return out;
    const lines = (raw ?? "").replace(/\r/g, "").split("\n");
    const body = lines[0]?.startsWith(HEADS.outlook) ? lines.slice(1).join("\n") : raw;
    out[emails[0].i] = cleanEmailWhole(body) || null;
    return out;
  }

  const taken = new Set<number>();
  for (const { e, i } of emails) {
    const subject = threadSubject(e.subject ?? "");
    let picks = msgs
      .map((m, k) => ({ m, k }))
      .filter(
        ({ m, k }) =>
          !taken.has(k) &&
          sameSender(e.from ?? "", m.from) &&
          threadSubject(m.subject) === subject,
      );
    if (picks.length === 0 && emails.length === 1 && msgs.length === 1)
      picks = [{ m: msgs[0], k: 0 }];
    if (picks.length > 1 && e.dayIso) {
      const sameDay = picks.filter(({ m }) => sentDay(m.sent) === e.dayIso);
      if (sameDay.length) picks = sameDay;
    }
    if (picks.length > 1 && e.timeLabel) {
      const clock = clockOf(e.timeLabel);
      const sameClock = picks.filter(({ m }) => clock && clockOf(m.sent) === clock);
      if (sameClock.length) picks = sameClock;
    }
    const pick = picks[0];
    if (!pick) continue;
    taken.add(pick.k);
    out[i] = cleanEmailWhole(pick.m.body) || null;
  }
  return out;
}
