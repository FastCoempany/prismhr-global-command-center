// The rules reader (founder-decreed 2026-08-21): the app never goes mute
// when the model is unreachable. A pasted Teams chat or Outlook thread
// parses DETERMINISTICALLY into the same entry shape the deep read
// produces — real actors, real dates, real record lines — so the record
// files and the clocks move with no API at all. What the rules can't do
// (open commitments, queue asks, teach the playbook) waits for the deep
// read, and the receipt says so.
//
// The attribution law (refuted 2026-08-22, twice): Teams renders a bare
// timestamp for BOTH the copier's own turns and a speaker's grouped
// follow-on messages, and a proposed meeting time can sit alone on a line
// inside a message. A bare stamp is therefore ambiguous, and the Ted
// doctrine forbids fabricating an actor — so bare-stamp turns file
// UNATTRIBUTED. An unattributed entry is never inbound, never outbound,
// never a touch; the deep read restores attribution when the key returns.

import type { TimelineEntry } from "@/lib/sf-timeline";

const CHI = "America/Chicago";

function chiDayIso(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: CHI });
}

function shiftDays(now: Date, days: number): string {
  return chiDayIso(new Date(now.getTime() - days * 86_400_000));
}

// ── the Teams-style chat ────────────────────────────────────────────────────
// Copied chats read as speaker turns:
//   Lesha Cyphers 1:49 PM      ← a named turn
//   Hey. I just talked to …
//   1:50 PM                    ← a bare stamp: ambiguous, files unattributed
//   fantastic to hear …
// with optional day dividers (Today / Yesterday / "August 14") between runs.

const TURN_RE = /^(.{2,40}?)[ \t]+(\d{1,2}:\d{2}\s?[AP]M)$/i;
const OWN_TURN_RE = /^(\d{1,2}:\d{2}\s?[AP]M)$/i;
const DAY_RE = /^(Today|Yesterday)$/i;

const MONTHS: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};
const DAYWORD_RE =
  /^(Today|Yesterday|Tomorrow|Tonight|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i;

// "August 14" / "Thursday, August 14, 2026" — a real divider carries a real
// month; "Chassie 21" and "Suite 200" are body lines, never day markers.
function resolveDateLine(line: string, now: Date): string | null {
  const m = /^(?:[A-Z][a-z]+,?\s+)?([A-Z][a-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/.exec(
    line,
  );
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  const day = parseInt(m[2], 10);
  if (!month || day < 1 || day > 31) return null;
  let year = m[3] ? parseInt(m[3], 10) : parseInt(chiDayIso(now).slice(0, 4), 10);
  const pad = (n: number) => String(n).padStart(2, "0");
  // Dividers are the past: a bare month-day ahead of today rolls back a year.
  if (!m[3] && `${year}-${pad(month)}-${pad(day)}` > chiDayIso(now)) year -= 1;
  return `${year}-${pad(month)}-${pad(day)}`;
}

// A name is words, not a sentence: capitalized words with lowercase particles
// allowed between them ("Lesha van Dyk"), never ending in a day word.
const PARTICLES = new Set(["van", "de", "da", "la", "von", "del", "der", "al", "le"]);
function looksLikeName(s: string): boolean {
  const words = s.trim().split(/\s+/);
  if (words.length < 1 || words.length > 4) return false;
  if (!/^[A-Z][\w.'-]*$/.test(words[0])) return false;
  const last = words[words.length - 1];
  if (!/^[A-Z][\w.'-]*$/.test(last) || DAYWORD_RE.test(last)) return false;
  return words.every((w) => /^[A-Z][\w.'-]*$/.test(w) || PARTICLES.has(w));
}

export function parseChatPaste(raw: string, now: Date): TimelineEntry[] {
  const lines = (raw ?? "").replace(/\r/g, "").split("\n");
  type Turn = {
    who: string;
    time: string;
    dayIso: string;
    dayLabel: string;
    body: string[];
  };
  const turns: Turn[] = [];
  let dayIso = chiDayIso(now);
  let dayLabel = "Today";
  let cur: Turn | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (DAY_RE.test(line)) {
      dayLabel = line;
      dayIso = /yesterday/i.test(line) ? shiftDays(now, 1) : chiDayIso(now);
      continue;
    }
    // A dated divider between runs sets the day it names (refuted: silently
    // dropping it filed week-old chats as today). Mid-message short lines
    // ("Chassie 21") stay body lines.
    if (!cur || cur.body.length === 0) {
      const dated = resolveDateLine(line, now);
      if (dated) {
        dayIso = dated;
        dayLabel = dated.slice(5).replace("-", "/");
        continue;
      }
    }
    const own = OWN_TURN_RE.exec(line);
    if (own) {
      cur = { who: "", time: own[1].toUpperCase(), dayIso, dayLabel, body: [] };
      turns.push(cur);
      continue;
    }
    const turn = TURN_RE.exec(line);
    if (turn) {
      // The hover-stamp style carries a day word before the clock:
      // "Lesha Cyphers Yesterday 1:49 PM". The day state only moves once
      // the name validates — a body line ending in a clock must not shift
      // the whole chat's day (refuted 2026-08-22).
      let name = turn[1].trim();
      const trail = /\s+(Today|Yesterday)$/i.exec(name);
      const wk = trail
        ? null
        : /\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$/i.exec(name);
      if (trail) name = name.slice(0, trail.index).trim();
      else if (wk) name = name.slice(0, wk.index).trim();
      if (looksLikeName(name)) {
        if (trail) {
          dayLabel = trail[1];
          dayIso = /yesterday/i.test(trail[1]) ? shiftDays(now, 1) : chiDayIso(now);
        }
        cur = { who: name, time: turn[2].toUpperCase(), dayIso, dayLabel, body: [] };
        turns.push(cur);
        continue;
      }
    }
    if (cur) cur.body.push(line);
  }

  // Two turns make a chat, at least one of them named; one stray stamp is
  // not a conversation.
  const named = [...new Set(turns.filter((t) => t.who).map((t) => t.who))];
  if (turns.length < 2 || named.length === 0) return [];
  if (!turns.some((t) => t.body.length > 0)) return [];

  const otherOf = (who: string): string => {
    if (named.length !== 2 || !who) return "";
    return named.find((s) => s !== who) ?? "";
  };

  return turns
    .filter((t) => t.body.length > 0)
    .slice(0, 40)
    .map((t) => {
      const body = t.body.join("\n");
      return {
        kind: "email" as const,
        subject: body.replace(/\s+/g, " ").slice(0, 80),
        from: t.who,
        to: otherOf(t.who),
        others: Math.max(0, named.length - 2),
        timeLabel: t.time,
        dayLabel: t.dayLabel,
        dayIso: t.dayIso,
        body,
      };
    });
}

// ── the Outlook-style thread ────────────────────────────────────────────────
// Header blocks: From / Sent (or Date) / To / Subject, body until the next
// From:. One entry per block.

const strip = (s: string) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

// The DAY the header names, timezone-proof: the wall-clock time is dropped
// and the date parses at noon UTC, so a 12:30 AM send never slides to the
// previous Chicago day (refuted 2026-08-22).
function sentDayIso(sent: string): string {
  const dateOnly = sent
    .replace(/^[A-Za-z]+,\s*/, "")
    .replace(/\d{1,2}:\d{2}.*$/, "")
    .trim()
    .replace(/,\s*$/, "");
  if (!dateOnly) return "";
  const at = Date.parse(`${dateOnly} 12:00:00 UTC`);
  return Number.isNaN(at) ? "" : chiDayIso(new Date(at));
}

// The CLOCK the same header names — kept as the head's own label so same-day
// entries order by when they happened. Dropping it cost the court a name:
// two same-day sends tied at the day anchor and "Wait on Melanie" printed
// where "Wait on Adam" belonged (2026-09-02). Emitted in the 12-hour idiom
// the OL head grammar already speaks ("2:10 PM"), 24-hour headers converted.
export function sentClockLabel(sent: string): string {
  const m = /(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i.exec(sent ?? "");
  if (!m) return "";
  let h = Number(m[1]);
  const min = m[2];
  const mer = m[3]?.toUpperCase();
  if (mer) return h >= 1 && h <= 12 ? `${h}:${min} ${mer}` : "";
  if (h > 23) return "";
  const pm = h >= 12;
  h = h % 12 || 12;
  return `${h}:${min} ${pm ? "PM" : "AM"}`;
}

export function parseEmailPaste(raw: string): TimelineEntry[] {
  const text = (raw ?? "").replace(/\r/g, "");
  const blocks = text.split(/^(?=From:[ \t])/m).filter((b) => /^From:/.test(b));
  const out: TimelineEntry[] = [];
  for (const b of blocks.slice(0, 40)) {
    const head = b.split("\n").slice(0, 8).join("\n");
    const from = strip(/^From:[ \t]*(.+)$/m.exec(head)?.[1] ?? "");
    const to = strip(/^To:[ \t]*(.+)$/m.exec(head)?.[1] ?? "")
      .split(";")[0]
      .split(",")[0];
    const subject = strip(/^Subject:[ \t]*(.+)$/m.exec(head)?.[1] ?? "");
    const sent = /^(?:Sent|Date):[ \t]*(.+)$/m.exec(head)?.[1]?.trim() ?? "";
    if (!from || !subject) continue;
    const dayIso = sentDayIso(sent);
    const body = b
      .split("\n")
      .filter((l) => !/^(From|Sent|Date|To|Cc|Subject):[ \t]/.test(l))
      .join("\n")
      .trim();
    out.push({
      kind: "email",
      subject,
      from,
      to,
      others: 0,
      timeLabel: sentClockLabel(sent),
      dayLabel: dayIso ? dayIso.slice(5).replace("-", "/") : "",
      dayIso,
      body: body.slice(0, 6000),
    });
  }
  return out;
}

// ── the door ────────────────────────────────────────────────────────────────
// The declared dialect gets right-of-way: a TEAMS THREAD paste that quotes a
// forwarded email must read as the chat, not as the one email inside it.

export function rulesRead(
  text: string,
  now: Date,
  hint: "TM" | "" = "",
): { entries: TimelineEntry[]; dialect: "OL" | "TM" } | null {
  const emails = () => {
    const e = parseEmailPaste(text);
    return e.length > 0 ? { entries: e, dialect: "OL" as const } : null;
  };
  const chat = () => {
    const e = parseChatPaste(text, now);
    return e.length > 0 ? { entries: e, dialect: "TM" as const } : null;
  };
  return hint === "TM" ? (chat() ?? emails()) : (emails() ?? chat());
}
