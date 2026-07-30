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

// Case-feed senders are raw addresses ("customersupport@prismhr.com").
const isEmailAddr = (s: string) => /^[\w.+-]+@[\w.-]+\.\w+$/.test(s.trim());
const nameOk = (s: string) => looksLikeName(s) || isEmailAddr(s);

// "Antaeus Coe to Bryce Rowley + 4 others" · "X sent an email to Y and 1
// other" · "Eric Ronci had a task with Andy Aziz" · "Lesha Cyphers has an
// upcoming task" · "X logged a call with Y". The "+ N others" tail may ride
// the same line or the next one (handled by the caller).
function parseAnchor(line: string): Anchor | null {
  const others = /(?:\+\s*(\d+)\s+others?|\band\s+(\d+)\s+others?)\s*$/.exec(line);
  const base = others ? line.slice(0, others.index).trim() : line.trim();
  const n = others ? Number(others[1] ?? others[2]) : 0;
  let m = /^(.+?)\s+sent an email to\s+(.+)$/.exec(base);
  if (m && nameOk(m[1]) && nameOk(m[2]))
    return { kind: "email", from: m[1], to: m[2], others: n };
  m = /^(.+?)\s+to\s+(.+)$/.exec(base);
  if (m && looksLikeName(m[1]) && looksLikeName(m[2]))
    return { kind: "email", from: m[1], to: m[2], others: n };
  m = /^(.+?)\s+(?:had|has) an? (?:upcoming )?task(?:\s+with\s+(.+))?$/.exec(base);
  if (m && looksLikeName(m[1]) && (!m[2] || looksLikeName(m[2])))
    return { kind: "task", from: m[1], to: m[2] ?? "", others: n };
  m = /^(.+?)\s+had a task with\s+(.+)$/.exec(base);
  if (m && looksLikeName(m[1]) && looksLikeName(m[2]))
    return { kind: "task", from: m[1], to: m[2], others: n };
  m = /^(.+?)\s+logged a call with\s+(.+)$/.exec(base);
  if (m && looksLikeName(m[1]) && looksLikeName(m[2]))
    return { kind: "call", from: m[1], to: m[2], others: n };
  return null;
}

// Lightning + email junk that rides along in a timeline copy — UI chrome,
// field labels, thread markers, record ids, security banners, meeting-invite
// dial-in blocks, and support-desk boilerplate. Stripped before a paste is
// parsed or filed, so what circulates is the conversation, not the DOM.
const JUNK_LINES: RegExp[] = [
  /^thread::\S+/,
  /^(?=[0-9A-Za-z]*\d)[0-9A-Za-z]{15}(?:[0-9A-Za-z]{3})?$/, // bare SF record id
  /^Skip to the (?:top|bottom) of the activity timeline$/,
  /^Only show activities with insights$/,
  /^Filters: /,
  /^Timeline Settings$/,
  /^Refresh(?: • Collapse All(?: • View All)?)?$/,
  /^(?:Expand All|Collapse All|View All|View More)$/,
  /^Upcoming & Overdue$/i,
  /^(?:This Month|Last Month|Older|Overdue)$/i,
  /^Details for\b/,
  /^Show more actions\b/,
  /^(?:Priority|Normal|Name)$/,
  /^(?:From Address|To Address|Related To|Text Body|Description|Created By)$/,
  /^(?:Preview|Ask to share|Show menu)$/,
  /^Emails are not shared with you/,
  /^(?:ZjQcmQRYFpfptBannerStart|ZjQcmQRYFpfptBannerEnd|sophospsmartbannerend)$/,
  /^This Message Is From an External Sender$/,
  /^DO NOT CLICK links or attachments/,
  /^NEVER include SSN/,
  /^Responses via email to this case will result in a re-open/,
  /^Get Outlook for (?:iOS|Android)$/,
  /^This message may contain confidential/,
  /^W: Prismhr\.com/i,
  // Meeting-invite plumbing (Zoom / Teams / Meet)
  /^Microsoft Teams Need help\?$/,
  /^Join (?:the meeting now|Zoom Meeting)$/i,
  /^https:\/\/[\w.-]*zoom\.us\//i,
  /^https:\/\/teams\.microsoft\.com\//i,
  /^https:\/\/meet\.google\.com\//i,
  /^(?:Meeting ID|Passcode|Phone conference ID)[:\s]/i,
  /^(?:One tap mobile|Dial by your location|Dial in by phone)$/i,
  /^• \+1[\d\s()#*,-]+/,
  /^\+1[\d\s()#*,-]+(?:US|United States)/,
  /^Find (?:your|a) local number/i,
  /^For organizers: Meeting options/,
  /^Powered by Zoom$/,
  /^_{5,}$/,
  /^-{5,}\s*One tap mobile/,
  /^.+, \d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2} (?:AM|PM)$/, // "Created By" value stamps
];

const isJunkLine = (t: string) => JUNK_LINES.some((re) => re.test(t));

// Mask meeting credentials wherever they sit — MID-LINE passcodes, join links
// carrying conference ids, one-tap dial strings. Line-anchored junk filters
// miss these (a recording link with "Passcode: $NyT*&d9" inside a prose line
// sailed straight into the record), and redactMoney never sees them.
export function scrubSecrets(s: string): string {
  return (s ?? "")
    .replace(/\b(passcode|password|access code|pwd)\s*[:=]\s*\S+/gi, "$1: [—]")
    .replace(
      /https:\/\/(?:[\w.-]*zoom\.us|teams\.microsoft\.com|meet\.google\.com)\/\S+/gi,
      "[meeting link]",
    )
    .replace(/\bMeeting ID[:\s]+[\d\s]{6,}/gi, "Meeting ID: [—]")
    .replace(/\+1\s?\d{3}[\s.-]?\d{3}[\s.-]?\d{4},,\d+#?/g, "[dial-in]");
}

export function cleanSfPaste(text: string): string {
  const out: string[] = [];
  let prev = "";
  for (const raw of (text ?? "").split(/\r?\n/)) {
    // Inline thread markers ("Subject [ thread::abc:: ]") vanish in place.
    const t = raw.replace(/\[\s*thread::\S+\s*\]/g, "").trim();
    if (!t) {
      out.push("");
      continue;
    }
    if (isJunkLine(t)) continue;
    if (t === prev) continue; // Lightning doubles subjects/previews
    out.push(t);
    prev = t;
  }
  return scrubSecrets(
    out
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
  );
}

export function parseSfTimeline(text: string, now: Date = new Date()): TimelineEntry[] {
  // An Outlook-thread capture is a different dialect entirely — the SF anchor
  // grammar ("X to Y") false-positives on subjects like "Welcome to PrismHR"
  // and fabricates entries. Refuse it here so the caller takes the transcript
  // path (or the AI, which reads the stamp) instead.
  if (/^(OUTLOOK|TEAMS) THREAD\b/.test((text ?? "").trimStart())) return [];
  // Junk is stripped up front so both timeline shapes parse over clean lines
  // and whatever survives into bodies is conversation, not chrome.
  const lines = cleanSfPaste(text ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const entries: TimelineEntry[] = [];

  // An entry "head" seen at index k — either the anchor itself, or the
  // subject/stamp runway leading into one ([subject,] stamp, anchor). Used to
  // stop a body before it swallows the next entry's header lines.
  const anchorAt = (k: number) => k < lines.length && parseAnchor(lines[k]) != null;
  const headAt = (k: number) =>
    anchorAt(k) ||
    anchorAt(k + 1) || // this line is the next entry's subject
    (k + 2 < lines.length && parseStamp(lines[k + 1]) != null && anchorAt(k + 2));

  for (let i = 0; i < lines.length; i++) {
    const anchor = parseAnchor(lines[i]);
    if (!anchor) continue;

    // Subject + (case-feed shape) a stamp BEFORE the anchor: look back a few
    // lines — "Subject / 5:27 PM | Today / <anchor>".
    let subject = "";
    let stamp: Stamp | null = null;
    for (let b = i - 1; b >= 0 && b >= i - 3; b--) {
      const l = lines[b];
      if (isNoise(l) || isMonthHeader(l) || parseAnchor(l)) continue;
      const s = parseStamp(l);
      if (s) {
        if (!stamp) stamp = s;
        continue;
      }
      subject = l;
      break;
    }

    // Classic shape: the stamp follows the anchor instead — prefer it when
    // present ("+ N others" / chips may intervene).
    let j = i + 1;
    let others = anchor.others;
    for (let k = 0; k < 3 && j < lines.length; k++, j++) {
      const tail = /^\+\s*(\d+)\s+others?$/.exec(lines[j]);
      if (tail) {
        others = Number(tail[1]);
        continue;
      }
      if (isNoise(lines[j])) continue;
      const s = parseStamp(lines[j]);
      if (s) {
        stamp = s;
        j++;
        break;
      }
      break; // a real content line — no trailing stamp for this entry
    }

    // Body: everything until the next entry's head or a section boundary.
    // Leading field VALUES (From/To addresses, "Related To" case number,
    // task contact name) just repeat the anchor — skipped until real prose.
    const body: string[] = [];
    for (; j < lines.length; j++) {
      const l = lines[j];
      if (headAt(j) || isMonthHeader(l)) break;
      if (/^(this month|last month|older|upcoming & overdue)$/i.test(l)) break;
      if (isNoise(l) || parseStamp(l)) continue;
      if (
        body.length === 0 &&
        (l === anchor.from || l === anchor.to || /^\d{6,10}$/.test(l))
      )
        continue;
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
