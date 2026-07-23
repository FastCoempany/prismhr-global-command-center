// Parser for Salesforce Lightning activity-timeline text — the paste (or
// bookmarklet capture) → structured entries pipeline behind /intake. Input is
// whatever innerText/copy gives us: subject lines, "A to B + 2 others",
// "3:47 PM | Jul 21" stamps, insight chips, and full email bodies (content
// under an inner scrollbar is present in the text; nothing is lost to
// scrolling). Pure and tolerant: unknown lines fall into the body rather than
// breaking an entry.

export type TimelineEntry = {
  kind: "email" | "task" | "call";
  subject: string;
  from: string;
  to: string;
  others: number; // "+ N others"
  timeLabel: string; // "3:47 PM" ("" when the stamp had no time)
  dayLabel: string; // "Jul 21" | "Yesterday" | "Today" | "6/29/2026" | ""
  dayIso: string; // "2026-07-21" resolved against `now` in Chicago, "" if unknown
  body: string;
};

const MONTHS: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

// A person-ish name: 1–4 capitalized-ish words. Keeps "My role is simply" from
// reading as a sender when a body sentence contains " to ".
function looksLikeName(s: string): boolean {
  const words = s.trim().split(/\s+/);
  if (words.length < 1 || words.length > 4) return false;
  return words.every((w) => /^[A-Z][\w.'()-]*$/.test(w) || /^\(Inactive\)$/i.test(w));
}

const NOISE = new Set(
  [
    "insights found",
    "view full email",
    "view more",
    "load more",
    "show all activities",
    "expand all",
    "collapse all",
    "this month",
    "last month",
    "older",
    "upcoming & overdue",
    "no activities to show.",
    "no more past activities to load.",
    "get started by sending an email, scheduling a task, and more.",
  ].map((s) => s),
);

function isNoise(line: string): boolean {
  const l = line.toLowerCase();
  if (NOISE.has(l)) return true;
  // Einstein insight chips: "Competition Mentioned", "Scheduling Requested"…
  if (/^[\w /&-]{3,32}(mentioned|requested|discussed|detected)$/i.test(line)) return true;
  return false;
}

// "July • 2026" section headers (the bullet survives innerText).
function isMonthHeader(line: string): boolean {
  return /^[A-Z][a-z]+ [•·] \d{4}$/.test(line);
}

type Stamp = { timeLabel: string; dayLabel: string };

// "3:47 PM | Jul 21" · "7:59 PM | Yesterday" · bare "Jun 29" / "Today".
function parseStamp(line: string): Stamp | null {
  const timed = /^(\d{1,2}:\d{2}\s*(?:AM|PM))\s*\|\s*(.+)$/i.exec(line);
  if (timed) return { timeLabel: timed[1], dayLabel: timed[2].trim() };
  if (
    /^(?:Today|Yesterday)$/i.test(line) ||
    /^[A-Z][a-z]{2} \d{1,2}(?:, \d{4})?$/.test(line) ||
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(line)
  )
    return { timeLabel: "", dayLabel: line };
  return null;
}

// Resolve a day label to YYYY-MM-DD, judged from `now` at the user's desk
// (Chicago) — "Jul 21" with no year belongs to the most recent Jul 21.
export function resolveDay(dayLabel: string, now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // "YYYY-MM-DD"
  const [ty, tm, td] = parts.split("-").map(Number);
  const iso = (y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const label = dayLabel.trim();
  if (/^today$/i.test(label)) return iso(ty, tm, td);
  if (/^yesterday$/i.test(label)) {
    const dt = new Date(Date.UTC(ty, tm - 1, td) - 86_400_000);
    return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  const mdY = /^([A-Z][a-z]{2}) (\d{1,2})(?:, (\d{4}))?$/.exec(label);
  if (mdY) {
    const m = MONTHS[mdY[1].toLowerCase()];
    const d = Number(mdY[2]);
    if (!m || d < 1 || d > 31) return "";
    let y = mdY[3] ? Number(mdY[3]) : ty;
    // No explicit year and the date sits in the future → it was last year.
    if (!mdY[3] && (m > tm || (m === tm && d > td))) y -= 1;
    return iso(y, m, d);
  }
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(label);
  if (slash) {
    const y = Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]);
    return iso(y, Number(slash[1]), Number(slash[2]));
  }
  return "";
}

type Anchor = {
  kind: TimelineEntry["kind"];
  from: string;
  to: string;
  others: number;
};

// "Antaeus Coe to Bryce Rowley + 4 others" · "Eric Ronci had a task with
// Andy Aziz" · "X logged a call with Y". The "+ N others" tail may ride the
// same line or the next one (handled by the caller).
function parseAnchor(line: string): Anchor | null {
  const others = /\+\s*(\d+)\s+others?\s*$/.exec(line);
  const base = others ? line.slice(0, others.index).trim() : line.trim();
  const n = others ? Number(others[1]) : 0;
  let m = /^(.+?)\s+to\s+(.+)$/.exec(base);
  if (m && looksLikeName(m[1]) && looksLikeName(m[2]))
    return { kind: "email", from: m[1], to: m[2], others: n };
  m = /^(.+?)\s+had a task with\s+(.+)$/.exec(base);
  if (m && looksLikeName(m[1]) && looksLikeName(m[2]))
    return { kind: "task", from: m[1], to: m[2], others: n };
  m = /^(.+?)\s+logged a call with\s+(.+)$/.exec(base);
  if (m && looksLikeName(m[1]) && looksLikeName(m[2]))
    return { kind: "call", from: m[1], to: m[2], others: n };
  return null;
}

export function parseSfTimeline(text: string, now: Date = new Date()): TimelineEntry[] {
  const lines = (text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const entries: TimelineEntry[] = [];

  for (let i = 0; i < lines.length; i++) {
    const anchor = parseAnchor(lines[i]);
    if (!anchor) continue;

    // Subject: nearest preceding line that isn't structure.
    let subject = "";
    for (let b = i - 1; b >= 0 && b >= i - 2; b--) {
      const l = lines[b];
      if (isNoise(l) || isMonthHeader(l) || parseStamp(l) || parseAnchor(l)) continue;
      subject = l;
      break;
    }

    // Stamp: within the next few lines ("+ N others" / chips may intervene).
    let j = i + 1;
    let stamp: Stamp | null = null;
    let others = anchor.others;
    for (let k = 0; k < 3 && j < lines.length; k++, j++) {
      const tail = /^\+\s*(\d+)\s+others?$/.exec(lines[j]);
      if (tail) {
        others = Number(tail[1]);
        continue;
      }
      if (isNoise(lines[j])) continue;
      stamp = parseStamp(lines[j]);
      if (stamp) {
        j++;
        break;
      }
      break; // a real content line — no stamp for this entry
    }

    // Body: everything until the next entry/section boundary. A line that is
    // the SUBJECT of the next anchor also ends the body (peek one ahead).
    const body: string[] = [];
    for (; j < lines.length; j++) {
      const l = lines[j];
      if (parseAnchor(l) || isMonthHeader(l)) break;
      if (/^(this month|last month|older|upcoming & overdue)$/i.test(l)) break;
      if (lines[j + 1] && parseAnchor(lines[j + 1]) && !isNoise(l) && !parseStamp(l))
        break;
      if (isNoise(l) || parseStamp(l)) continue;
      body.push(l);
      if (body.join("\n").length > 4000) break;
    }

    entries.push({
      kind: anchor.kind,
      subject,
      from: anchor.from,
      to: anchor.to,
      others,
      timeLabel: stamp?.timeLabel ?? "",
      dayLabel: stamp?.dayLabel ?? "",
      dayIso: stamp ? resolveDay(stamp.dayLabel, now) : "",
      body: body.join("\n").slice(0, 4000),
    });
    i = j - 1;
  }
  return entries;
}
