// Follow-up cadence — pure logic for the "contacted → auto follow-up every N
// days → surfaces in Today until you mark a reply" loop. Nothing here touches
// the DB; the Touch rows are loaded in overlay.ts and passed in. `now` is always
// injected (default-param) so the clock read stays out of the React render path.

import { firstNameOf } from "./build";

// When the next check-in can land: later today, or tomorrow. That's the whole
// menu — no multi-day windows.
export type FollowUpWhen = "today" | "tomorrow";

export function asFollowUpWhen(v: string): FollowUpWhen {
  return v === "today" ? "today" : "tomorrow";
}

export type TouchLogEntry = { at: string; body: string };

// A logged contact as Today consumes it (ISO strings, not Date objects).
// kind "custom" = a follow-up you wrote yourself (not tied to a logged contact).
export type Touch = {
  subjectKey: string;
  kind: "partner" | "account" | "custom";
  label: string;
  detail: string;
  message: string;
  contactedAt: string;
  followUpAt: string;
  intervalDays: number;
  status: "awaiting" | "replied";
  log: TouchLogEntry[];
};

// A note / to-do (right-hand column beside Follow-ups). Optionally tied to an
// account and given a date/time.
export type Todo = {
  id: string;
  body: string;
  done: boolean;
  accountId: string; // "" = unlinked
  remindAt: string; // ISO ("" = none)
};

// Stable, deterministic subject keys. The kickoff key carries the ISO week so the
// weekly "contact each partner" ritual resets every week; outreach is one thread
// per account.
export function outreachSubjectKey(accountId: string): string {
  return `outreach:${accountId}`;
}

// The next check-in instant. "today" = a few hours from now; "tomorrow" = this
// time tomorrow. Either way the window never includes a weekend — anything that
// would land on Sat/Sun rolls forward to Monday (same time of day). Days are
// UTC, consistent with dayStamp/weekStamp everywhere else. Pure given `now`.
export function nextCheckIn(now: number, when: FollowUpWhen): Date {
  const base = when === "today" ? now + 4 * 3_600_000 : now + 86_400_000;
  let d = new Date(base);
  while (d.getUTCDay() === 6 || d.getUTCDay() === 0)
    d = new Date(d.getTime() + 86_400_000);
  return d;
}

// Whole days between an ISO instant and `now` (floored, never negative).
export function daysSinceIso(iso: string, now: number = Date.now()): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
}

// Whole days until an ISO instant from `now` (ceil so "in 1.2 days" reads as 2;
// past instants return 0 — they're due, not negative).
export function daysUntilIso(iso: string, now: number = Date.now()): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.ceil((t - now) / 86_400_000));
}

// A follow-up is "due" when it's still awaiting a reply and its follow-up instant
// has arrived.
export function isDue(t: Touch, now: number): boolean {
  return t.status === "awaiting" && Date.parse(t.followUpAt) <= now;
}

export type FollowUpBuckets = {
  due: Touch[]; // awaiting + past the follow-up instant — needs you now (most overdue first)
  upcoming: Touch[]; // awaiting + follow-up still in the future (soonest first)
  replied: Touch[]; // closed the loop (most recent first)
};

export function partitionFollowUps(
  touches: Touch[],
  now: number = Date.now(),
): FollowUpBuckets {
  const due: Touch[] = [];
  const upcoming: Touch[] = [];
  const replied: Touch[] = [];
  for (const t of touches) {
    if (t.status === "replied") replied.push(t);
    else if (isDue(t, now)) due.push(t);
    else upcoming.push(t);
  }
  due.sort((a, b) => Date.parse(a.followUpAt) - Date.parse(b.followUpAt)); // most overdue first
  upcoming.sort((a, b) => Date.parse(a.followUpAt) - Date.parse(b.followUpAt)); // soonest first
  replied.sort((a, b) => Date.parse(b.contactedAt) - Date.parse(a.contactedAt));
  return { due, upcoming, replied };
}

// Upcoming check-ins, grouped by the calendar day they're due (UTC), soonest day
// first. Labels read for scanning: "Today", "Tomorrow", else "Wednesday · Jul 15".
export type DayGroup = { key: string; label: string; items: Touch[] };

function utcDayKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function dayGroupLabel(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const key = utcDayKey(t);
  if (key === utcDayKey(now)) return "Today";
  if (key === utcDayKey(now + 86_400_000)) return "Tomorrow";
  const d = new Date(t);
  const weekday = d.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  const monthDay = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${weekday} · ${monthDay}`;
}

export function groupUpcomingByDay(
  upcoming: Touch[],
  now: number = Date.now(),
): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const t of upcoming) {
    const ms = Date.parse(t.followUpAt);
    if (Number.isNaN(ms)) continue;
    const key = utcDayKey(ms);
    const g = groups.get(key);
    if (g) g.items.push(t);
    else groups.set(key, { key, label: dayGroupLabel(t.followUpAt, now), items: [t] });
  }
  // partitionFollowUps already sorted `upcoming` soonest-first, so insertion
  // order is day order and items within a day stay soonest-first.
  return [...groups.values()];
}

// The ready-to-send follow-up nudge — a gentle "circling back," shaped by whether
// the touch was a partner week-opener or a single-account outreach. Editable
// before you send it.
export function followUpMessage(t: Touch, now: number = Date.now()): string {
  if (t.kind === "custom") return t.message || t.label; // your own words, not a partner nudge
  const who = firstNameOf(t.label);
  const days = daysSinceIso(t.contactedAt, now);
  const when =
    days <= 0 ? "the other day" : days === 1 ? "yesterday" : `${days} days ago`;
  if (t.kind === "partner") {
    return (
      `Hi ${who} — circling back on the accounts I flagged ${when} (${t.detail}). No pressure at ` +
      `all, and I don't want to nag — I just want to make sure it didn't get buried. Even a quick ` +
      `"yes / no / not yet" on each would help me prioritize where to spend time. Happy to grab 15 ` +
      `minutes whenever suits you. Thanks so much!`
    );
  }
  return (
    `Hi ${who} — following up on ${t.label} from ${when}. Totally understand if now isn't the ` +
    `moment; I just didn't want it to slip. Whenever you have a second, even a quick read on ` +
    `whether there's anything worth exploring would be a big help. Thanks!`
  );
}
