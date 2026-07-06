// Follow-up cadence — pure logic for the "contacted → auto follow-up every N
// days → surfaces in Today until you mark a reply" loop. Nothing here touches
// the DB; the Touch rows are loaded in overlay.ts and passed in. `now` is always
// injected (default-param) so the clock read stays out of the React render path.

import { firstNameOf } from "./build";

// Default check-in gap: "every other day."
export const FOLLOWUP_DAYS = 2;

export type TouchLogEntry = { at: string; body: string };

// A logged contact as Today consumes it (ISO strings, not Date objects).
export type Touch = {
  subjectKey: string;
  kind: "partner" | "account";
  label: string;
  detail: string;
  message: string;
  contactedAt: string;
  followUpAt: string;
  intervalDays: number;
  status: "awaiting" | "replied";
  log: TouchLogEntry[];
};

// Stable, deterministic subject keys. The kickoff key carries the ISO week so the
// weekly "contact each partner" ritual resets every week; outreach is one thread
// per account.
export function outreachSubjectKey(accountId: string): string {
  return `outreach:${accountId}`;
}

// ISO of `now` + `days`, at day granularity is unnecessary — keep the time so the
// gap is a true N×24h. Pure given `now`.
export function followUpFrom(now: number, days: number = FOLLOWUP_DAYS): string {
  return new Date(now + days * 86_400_000).toISOString();
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

export function partitionFollowUps(touches: Touch[], now: number = Date.now()): FollowUpBuckets {
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

// The ready-to-send follow-up nudge — a gentle "circling back," shaped by whether
// the touch was a partner week-opener or a single-account outreach. Editable
// before you send it.
export function followUpMessage(t: Touch, now: number = Date.now()): string {
  const who = firstNameOf(t.label);
  const days = daysSinceIso(t.contactedAt, now);
  const when = days <= 0 ? "the other day" : days === 1 ? "yesterday" : `${days} days ago`;
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

// How a due row should read: "contacted 3 days ago, no reply yet."
export function followUpStatusLine(t: Touch, now: number = Date.now()): string {
  const days = daysSinceIso(t.contactedAt, now);
  const ago = days <= 0 ? "earlier today" : days === 1 ? "yesterday" : `${days} days ago`;
  return `Contacted ${ago} · no reply logged yet`;
}
