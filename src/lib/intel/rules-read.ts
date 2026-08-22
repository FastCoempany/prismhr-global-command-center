// The rules reader (founder-decreed 2026-08-21): the app never goes mute
// when the model is unreachable. A pasted Teams chat or Outlook thread
// parses DETERMINISTICALLY into the same entry shape the deep read
// produces — real actors, real dates, real record lines — so the record
// files and the clocks move with no API at all. What the rules can't do
// (open commitments, queue asks, teach the playbook) waits for the deep
// read, and the receipt says so.

import { OPERATOR_NAME } from "@/lib/intel/provenance";
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
//   Lesha Cyphers 1:49 PM      ← someone else's turn
//   Hey. I just talked to …
//   1:50 PM                    ← the operator's own turn (name omitted)
//   fantastic to hear …
// with optional day dividers (Today / Yesterday / a date line) between runs.

const TURN_RE = /^(.{2,40}?)[ \t]+(\d{1,2}:\d{2}\s?[AP]M)$/i;
const OWN_TURN_RE = /^(\d{1,2}:\d{2}\s?[AP]M)$/i;
const DAY_RE = /^(Today|Yesterday)$/i;
const DATE_RE = /^([A-Z][a-z]+,?\s+)?([A-Z][a-z]+ \d{1,2}(?:,? \d{4})?)$/;

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
    const own = OWN_TURN_RE.exec(line);
    if (own) {
      cur = {
        who: OPERATOR_NAME,
        time: own[1].toUpperCase(),
        dayIso,
        dayLabel,
        body: [],
      };
      turns.push(cur);
      continue;
    }
    const turn = TURN_RE.exec(line);
    // A name is words, not a sentence — "we said 3:00 PM" must not become a
    // speaker called "we said".
    if (turn && /^[A-Z][\w.'-]*(\s+[A-Z][\w.'-]*){0,3}$/.test(turn[1].trim())) {
      cur = {
        who: turn[1].trim(),
        time: turn[2].toUpperCase(),
        dayIso,
        dayLabel,
        body: [],
      };
      turns.push(cur);
      continue;
    }
    if (cur && !DATE_RE.test(line)) cur.body.push(line);
  }

  // Two speaker turns make a chat; one stray stamp is not a conversation.
  if (turns.length < 2 || !turns.some((t) => t.body.length > 0)) return [];

  const speakers = [...new Set(turns.map((t) => t.who))];
  const otherOf = (who: string): string => {
    if (speakers.length !== 2) return "";
    return speakers.find((s) => s !== who) ?? "";
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
        others: Math.max(0, speakers.length - 2),
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
    const at = Date.parse(sent.replace(/^[A-Za-z]+,\s*/, ""));
    const dayIso = Number.isNaN(at) ? "" : chiDayIso(new Date(at));
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
      timeLabel: "",
      dayLabel: dayIso ? dayIso.slice(5).replace("-", "/") : "",
      dayIso,
      body: body.slice(0, 6000),
    });
  }
  return out;
}

// ── the door ────────────────────────────────────────────────────────────────

export function rulesRead(
  text: string,
  now: Date,
): { entries: TimelineEntry[]; dialect: "OL" | "TM" } | null {
  const emails = parseEmailPaste(text);
  if (emails.length > 0) return { entries: emails, dialect: "OL" };
  const chat = parseChatPaste(text, now);
  if (chat.length > 0) return { entries: chat, dialect: "TM" };
  return null;
}
