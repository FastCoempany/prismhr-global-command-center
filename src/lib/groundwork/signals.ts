// Sales Navigator intent signals — read, never pulled. LinkedIn has no intent
// API and none is wanted (founder decree): readings arrive only through the
// operator's ▤ grab pasted into the app, which the paste reader files as
// AccountNotes with a "salesnav" source. This module turns those notes into
// the queue's warm signals, and decides when the room may nag for a new read.
//
// Decay doctrine (plan §8 D8): a reading older than DECAY_DAYS ranks as
// nothing — a stale "High" is a guess wearing a badge. And only the NEWEST
// pasted reading counts: if the latest grab shows no intent, an older High is
// dead, not dormant.

import { HEADS, isSalesNav as isSalesNavSource } from "@/lib/ingest/dialect";
import { USER_TZ, userDayKey } from "@/lib/tz";

const DECAY_DAYS = 7;

type IntentLevel = "high" | "moderate";

export type IntentSignal = {
  level: IntentLevel;
  activities: number | null; // engagement count when the row carried one
  at: string; // ISO of the note that carried the reading
};

type NoteLike = { body: string; source: string; createdAt: string };

const isSalesNav = (n: NoteLike) => isSalesNavSource(n.source);

// Three grabs share the salesnav source and their heads tell them apart: the
// accounts list (SALESNAV ACCOUNTS, the intent read), the Home tab's alerts
// feed (SALESNAV ALERTS) and an account's Relationship explorer (SALESNAV
// PEOPLE). Only the accounts list carries an intent reading, so an alerts or
// people note never reads as one, and never kills one by being newer
// (2026-10-14). A salesnav note with no head is an accounts read: the reads
// filed before the heads split were all accounts grabs.
export type GrabKind = "accounts" | "alerts" | "people";
const ALERTS_HEAD_RE = new RegExp(`^${HEADS.salesnav} ALERTS\\b`, "i");
const PEOPLE_HEAD_RE = new RegExp(`^${HEADS.salesnav} PEOPLE\\b`, "i");
export function grabKind(body: string): GrabKind {
  const t = (body ?? "").trimStart();
  if (ALERTS_HEAD_RE.test(t)) return "alerts";
  if (PEOPLE_HEAD_RE.test(t)) return "people";
  return "accounts";
}
const isAccountsRead = (n: NoteLike) => isSalesNav(n) && grabKind(n.body) === "accounts";
const isAlertsRead = (n: NoteLike) => isSalesNav(n) && grabKind(n.body) === "alerts";

// The grab's own head line — "SALESNAV ACCOUNTS - captured <date> - N rows
// collected" — carries the copy moment, never a deal date.
const GRAB_HEAD_RE = new RegExp(`${HEADS.salesnav} ACCOUNTS\\s*-\\s*captured`, "i");

// "High buyer intent", "expressing High buyer intent", "High · 11 activities",
// "11 activities" — the grab ships Sales Navigator's own words, so the parse
// stays close to them and refuses to invent a level it can't see.
export function parseIntent(body: string): Omit<IntentSignal, "at"> | null {
  // The accounts list's own cell first: the level on a line of its own, its
  // activity count on the next ("High" / "11 activities"). The cell is the
  // reading; a Neutral or Low cell is a reading of no intent, and the phrase
  // read below never overrules it.
  const lines = (body ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  for (let i = 0; i < lines.length - 1; i++) {
    const lv = /^(high|moderate|neutral|low)$/i.exec(lines[i]!);
    const acts = /^(\d{1,4})\s+activit(?:y|ies)\b/i.exec(lines[i + 1]!);
    if (!lv || !acts) continue;
    const level = lv[1]!.toLowerCase();
    if (level !== "high" && level !== "moderate") return null;
    return { level, activities: Number(acts[1]) };
  }
  const high = /\bhigh\b[^.\n]{0,40}\bintent\b|\bintent\b[^.\n]{0,40}\bhigh\b/i.test(
    body,
  );
  const moderate =
    /\bmoderate\b[^.\n]{0,40}\bintent\b|\bintent\b[^.\n]{0,40}\bmoderate\b/i.test(body);
  if (!high && !moderate) return null;
  const acts = /(\d{1,3})\s*activit/i.exec(body);
  return {
    level: high ? "high" : "moderate",
    activities: acts ? Number(acts[1]) : null,
  };
}

// The newest salesnav reading on one account decides — and only if it is
// fresh. A newer grab with no intent kills an older High (superseded, not
// dormant); a reading past DECAY_DAYS ranks as nothing.
export function intentFor(notes: NoteLike[] | undefined, now: Date): IntentSignal | null {
  const newest = (notes ?? []).find(isAccountsRead);
  if (!newest) return null;
  const ageDays = (now.getTime() - Date.parse(newest.createdAt)) / 86_400_000;
  if (!(ageDays <= DECAY_DAYS)) return null;
  const parsed = parseIntent(newest.body);
  return parsed ? { ...parsed, at: newest.createdAt } : null;
}

// The newest salesnav-sourced note anywhere in the book — the fact the nudge
// runs on, whatever account it landed against.
function newestReadIso(notesByAccount: Map<string, NoteLike[]>): string | null {
  let newest: string | null = null;
  for (const notes of notesByAccount.values()) {
    for (const n of notes) {
      if (!isAccountsRead(n)) continue;
      if (!newest || n.createdAt > newest) newest = n.createdAt;
    }
  }
  return newest;
}

// The day of the week in Chicago, where the operator's weekend falls (all
// days are Chicago days, theirs or ours). The UTC weekday read a Friday 10 PM
// read as Saturday and nagged for a new grab on Monday morning (pass 8 X5).
const chicagoWeekend = (t: number): boolean => {
  const day = new Date(t).toLocaleDateString("en-US", {
    timeZone: USER_TZ,
    weekday: "short",
  });
  return day === "Sat" || day === "Sun";
};

// Whole business days between two instants: each full day after `from` that
// ends on a Chicago weekday counts (endpoints open) — the same shape the
// morning brief uses, kept local so this module stays pure.
export function businessDaysBetween(fromIso: string, to: Date): number {
  const from = Date.parse(fromIso);
  if (Number.isNaN(from) || from >= to.getTime()) return 0;
  let n = 0;
  for (let t = from + 86_400_000; t <= to.getTime(); t += 86_400_000) {
    if (!chicagoWeekend(t)) n++;
  }
  return n;
}

// The nudge renders ONLY when a read is due (founder decree: silence when
// fresh; the one quiet line when due). Due = no read ever, or the newest is
// more than one business day old.
export function intentReadDue(
  notesByAccount: Map<string, NoteLike[]>,
  now: Date,
): boolean {
  const newest = newestReadIso(notesByAccount);
  if (!newest) return true;
  return businessDaysBetween(newest, now) >= 1;
}

// A CRM opportunity date riding in a pasted Sales Nav row ("8/21/2026",
// "10/21/2026") — the riding-lane rule's evidence. Guards against the grab's
// own furniture: the capture-header line is skipped, and a date that merely
// restates the day the paste landed is the paste's clock, not a deal.
export function ridingLaneDate(
  notes: NoteLike[] | undefined,
  now: Date,
  windowDays = 14,
): string | null {
  for (const n of notes ?? []) {
    if (!isAccountsRead(n)) continue;
    // The paste's own day is a Chicago day: a grab pasted at 8 PM lands after
    // midnight UTC, and its clock line names the Chicago date (pass 8 X5).
    const noteDay = userDayKey(n.createdAt);
    const lines = n.body.split("\n").filter((l) => !GRAB_HEAD_RE.test(l));
    for (const line of lines) {
      for (const m of line.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) {
        const iso = `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
        if (iso === noteDay) continue; // the paste's own clock line
        const t = Date.parse(`${iso}T12:00:00Z`);
        if (Number.isNaN(t)) continue;
        const days = (t - now.getTime()) / 86_400_000;
        if (days >= -1 && days <= windowDays) return iso;
      }
    }
  }
  return null;
}

// ── The change in intent (2026-10-14) ──────────────────────────────────────
// The operator grabs the list every working day, so the room can see a
// reading move: Moderate to High, or eleven activities where there were
// three. A move is a better trigger than a standing High, which can sit on
// an account for weeks. The comparison is against the newest reading taken
// on an EARLIER Chicago day, and only one inside the comparison window: two
// grabs a month apart say nothing about this week.

const DAY_MS = 86_400_000;
const RISE_WINDOW_DAYS = 14;
/** How many more activities than the last reading count as a rise. */
export const RISE_ACTIVITIES = 3;
const LEVEL_RANK: Readonly<Record<IntentLevel, number>> = { moderate: 1, high: 2 };

export type IntentRise = {
  from: IntentLevel | null; // null: the earlier reading showed no intent
  to: IntentLevel;
  fromActivities: number | null;
  toActivities: number | null;
  at: string; // ISO of the newer reading
};

export function intentRise(notes: NoteLike[] | undefined, now: Date): IntentRise | null {
  const cur = intentFor(notes, now);
  if (!cur) return null;
  const reads = (notes ?? []).filter(isAccountsRead);
  const curDay = userDayKey(cur.at);
  const prevNote = reads.find((n) => userDayKey(n.createdAt) !== curDay);
  if (!prevNote) return null;
  const gap = (Date.parse(cur.at) - Date.parse(prevNote.createdAt)) / DAY_MS;
  if (!(gap > 0 && gap <= RISE_WINDOW_DAYS)) return null;
  const prev = parseIntent(prevNote.body);
  const out = {
    from: prev?.level ?? null,
    to: cur.level,
    fromActivities: prev?.activities ?? null,
    toActivities: cur.activities,
    at: cur.at,
  };
  if (LEVEL_RANK[cur.level] > (prev ? LEVEL_RANK[prev.level] : 0)) return out;
  // More activities count only at the same level: a reading that fell from
  // High to Moderate is a fall, whatever its count says.
  if (
    prev &&
    prev.level === cur.level &&
    cur.activities != null &&
    prev.activities != null &&
    cur.activities - prev.activities >= RISE_ACTIVITIES
  )
    return out;
  return null;
}

// ── People: who is new, who posted (2026-10-14) ───────────────────────────
// Two readings name a person. The accounts list's lead recommendation
// carries Sales Navigator's own "Recently hired" badge on the lead it
// recommends. The Home tab's alerts feed names a lead who shared a post or
// moved jobs, with their company and title on the line beneath. Both are
// Sales Navigator's own words read back; nothing is inferred about anyone.

export type PersonSignal = {
  kind: "new-in-seat" | "posted";
  name: string;
  title: string;
  company: string;
  snippet: string; // a post's opening words; "" for a job move
  /** ISO: when it happened, as near as the reading says. A "Recently hired"
   *  badge carries no hire date, so its moment is the first grab that
   *  showed it, and `seen` says so. */
  at: string;
  seen?: boolean;
};

/** A connection degree on a line of its own, or trailing a name. */
const DEGREE_RE = /^(?:·\s*)?(?:1st|2nd|3rd)\+?$/i;
const TRAILING_DEGREE_RE = /^(.+?)\s*·\s*(?:1st|2nd|3rd)\+?$/i;
const CRM_RE = /^!?\s*(?:update\s+)?crm$/i;
const BADGE_RE =
  /buyer intent|recently hired|teamlink|mutual connection|follows your company|^\d+\+$|^save$|^add note$/i;

/** A person's name as Sales Navigator shows it, cleaned of credentials
 *  ("Andrea R. Vest, SHRM-SCP, SPHR,…") and truncation. Names are used as
 *  given: nothing shortens them. "" when it does not read as a name. */
export function cleanName(raw: string): string {
  const n = (raw ?? "")
    .split(",")[0]!
    .replace(/(?:…|\.\.\.)$/, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = n.split(" ");
  if (words.length < 2 || words.length > 5) return "";
  if (!/^[\p{L}][\p{L}.'’-]*$/u.test(words[0]!)) return "";
  return n;
}

/** The lead a row's "Recently hired" badge belongs to: the name above the
 *  badge, found by its connection degree, and the title beneath the name.
 *  Null when the row carries no badge or no name reads. */
export function parseRecentlyHired(body: string): { name: string; title: string } | null {
  const lines = (body ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const badge = lines.findIndex((l) => /^recently hired$/i.test(l));
  if (badge < 0) return null;
  for (let j = badge - 1; j >= 0; j--) {
    let name = "";
    let after = j + 1;
    const trailing = TRAILING_DEGREE_RE.exec(lines[j]!);
    if (trailing) name = cleanName(trailing[1]!);
    else if (DEGREE_RE.test(lines[j + 1] ?? "")) {
      name = cleanName(lines[j]!);
      after = j + 2;
    }
    if (!name) continue;
    let title = "";
    for (let k = after; k < badge; k++) {
      const l = lines[k]!;
      if (CRM_RE.test(l) || BADGE_RE.test(l) || DEGREE_RE.test(l)) continue;
      title = l.replace(/(?:…|\.\.\.)$/, "").trim();
      break;
    }
    return { name, title };
  }
  return null;
}

/** "2 days", "3d", "1 week ago", "5h": how long before the copy an alert
 *  happened, in days, or null when the line is not a relative time. */
export function relativeDays(line: string): number | null {
  const m =
    /^(\d{1,3})\s*(m|min|mins|minutes?|h|hrs?|hours?|d|days?|w|wks?|weeks?|mo|months?)(?:\s+ago)?$/i.exec(
      (line ?? "").trim(),
    );
  if (!m) return null;
  const n = Number(m[1]);
  const u = m[2]!.toLowerCase();
  if (u.startsWith("mo")) return n * 30;
  if (u.startsWith("m")) return 0;
  if (u.startsWith("h")) return 0;
  if (u.startsWith("d")) return n;
  if (u.startsWith("w")) return n * 7;
  return null;
}

/** A post line: "Alex Patel shared a post". A job line: "Alex Patel
 *  started a new position", "has a new position", "changed jobs". The job
 *  phrasings are LinkedIn's alert wording as far as it is known; one that
 *  does not match files as an ordinary alert and fires nothing. */
const POST_LINE_RE =
  /^(.+?)\s+(?:shared|reshared|published)\s+(?:a\s+)?(?:post|article)\b/i;
const JOB_LINE_RE =
  /^(.+?)\s+(?:started a new position|has a new position|has a new role|changed jobs|was recently hired|is in a new role)\b(?:\s+as\s+(.+?))?(?:\s+at\s+(.+?))?\.?$/i;
const ALERT_PREFIX_RE = /^(?:suggested\s+)?(?:lead|account)\s*:\s*/i;
const ROW_SEP_RE = /^[ \t]*-{4,}[ \t]*$/m;

/** Every person-shaped alert in an alerts note, with the day it happened.
 *  Company alerts ("posted a new photo", growth reads) name no person and
 *  return nothing: their subject line reads "… employees on LinkedIn". */
export function parseAlerts(body: string, filedAt: string): PersonSignal[] {
  const filed = Date.parse(filedAt);
  const out: PersonSignal[] = [];
  const items = (body ?? "").split(ROW_SEP_RE);
  for (const item of items) {
    const lines = item
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !ALERTS_HEAD_RE.test(l));
    if (!lines.length) continue;
    const head = lines[0]!.replace(ALERT_PREFIX_RE, "");
    const sub = lines[1] ?? "";
    if (/employees on linkedin/i.test(sub)) continue;
    const [company = "", title = ""] = sub.split("·").map((x) => x.trim());
    const relIdx = lines.findIndex((l) => relativeDays(l) != null);
    const ago = relIdx >= 0 ? relativeDays(lines[relIdx]!)! : 0;
    const at = Number.isNaN(filed)
      ? filedAt
      : new Date(filed - ago * DAY_MS).toISOString();
    const post = POST_LINE_RE.exec(head);
    if (post) {
      const name = cleanName(post[1]!);
      if (!name) continue;
      const snippet =
        relIdx >= 0 && lines[relIdx + 1]
          ? lines[relIdx + 1]!.replace(/(?:…|\.\.\.)$/, "").slice(0, 120)
          : "";
      out.push({ kind: "posted", name, title, company, snippet, at });
      continue;
    }
    const job = JOB_LINE_RE.exec(head);
    if (job) {
      const name = cleanName(job[1]!);
      if (!name) continue;
      out.push({
        kind: "new-in-seat",
        name,
        title: (job[2] ?? title).trim(),
        company: (job[3] ?? company).trim(),
        snippet: "",
        at,
      });
    }
  }
  return out;
}

/** A post fresh enough to answer; a move fresh enough to greet. */
export const POST_FRESH_DAYS = 5;
export const SEAT_FRESH_DAYS = 21;

/** Two names for one company: the router's account and the company an
 *  alert names. Loose on purpose (legal suffixes, punctuation, "HR" spelled
 *  with or without a space), strict on the first real word. */
export function sameCompany(a: string, b: string): boolean {
  const norm = (x: string) =>
    (x ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\b(inc|llc|llp|ltd|co|corp|company|group|the)\b/g, " ")
      .replace(/\s+/g, "");
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return true; // nothing to compare: the router's match stands
  const head = (z: string) => z.slice(0, Math.min(6, z.length));
  return x.includes(head(y)) || y.includes(head(x));
}

/** The freshest person signals on one account, newest first, one per person
 *  and kind: the alerts notes, and the newest accounts read's "Recently
 *  hired" badge while that reading is inside the intent decay. A badge is
 *  dated by the FIRST grab in the unbroken run of grabs that showed it for
 *  the same lead, so a daily grab never re-dates it, and it ages out
 *  SEAT_FRESH_DAYS after that first sighting. Nothing dated after `now`
 *  speaks, so the queue's as-of-yesterday re-rank never sees today's grab.
 *  A job alert that names a company other than the account it filed on
 *  (the company they left, say) speaks nothing on this account. */
export function peopleSignalsFor(
  notes: NoteLike[] | undefined,
  now: Date,
  accountName = "",
): PersonSignal[] {
  const seen = new Set<string>();
  const out: PersonSignal[] = [];
  const fresh = (s: PersonSignal) => {
    const age = (now.getTime() - Date.parse(s.at)) / DAY_MS;
    const cap = s.kind === "posted" ? POST_FRESH_DAYS : SEAT_FRESH_DAYS;
    return age >= 0 && age <= cap;
  };
  const push = (s: PersonSignal) => {
    const key = `${s.kind}:${s.name.toLowerCase()}`;
    if (seen.has(key) || !fresh(s)) return;
    seen.add(key);
    out.push(s);
  };
  const upToNow = (notes ?? []).filter((n) => Date.parse(n.createdAt) <= now.getTime());
  const reads = upToNow.filter(isAccountsRead);
  const read = reads[0];
  if (read && (now.getTime() - Date.parse(read.createdAt)) / DAY_MS <= DECAY_DAYS) {
    const hire = parseRecentlyHired(read.body);
    if (hire) {
      let first = read.createdAt;
      for (const r of reads.slice(1)) {
        if (parseRecentlyHired(r.body)?.name !== hire.name) break;
        first = r.createdAt;
      }
      push({
        kind: "new-in-seat",
        name: hire.name,
        title: hire.title,
        company: "",
        snippet: "",
        at: first,
        seen: true,
      });
    }
  }
  for (const n of upToNow) {
    if (!isAlertsRead(n)) continue;
    for (const s of parseAlerts(n.body, n.createdAt)) {
      if (s.kind === "new-in-seat" && s.company && !sameCompany(s.company, accountName))
        continue;
      push(s);
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}
