// Every visible clock and day boundary in the app runs in the user\'s home
// timezone — the server renders in UTC (Vercel), so anything derived from a
// bare Date drifts hours off the desk it serves. Single-seat app, single TZ.

export const USER_TZ = "America/Chicago";

// "1:52p" — the ledger/sheet time stamp.
export function clockShort(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t)
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: USER_TZ,
    })
    .toLowerCase()
    .replace(" am", "a")
    .replace(" pm", "p");
}

// Calendar-day key in the user\'s timezone ("2026-07-16").
export function userDayKey(iso: string | number | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: USER_TZ });
}

// The one Chicago day ("2026-09-24") every day boundary in the app reads —
// the Chute ledger, the Scratchpaper's kicker, the morning done key, the
// record's dates (CLAUDE.md, the closer rule: all days are Chicago days,
// theirs or ours). userDayKey already computes exactly this; the name says
// which day it is.
export const chicagoDay = userDayKey;

export function sameUserDay(iso: string, ref: Date | number = Date.now()): boolean {
  const k = userDayKey(iso);
  return k !== "" && k === userDayKey(ref instanceof Date ? ref : new Date(ref));
}

/** A Chicago wall-clock moment as the instant it names (2026-10-14): the
 *  "captured 10/14/2026, 9:05:00 AM" a bookmarklet writes on the operator's
 *  clock, or an email's zoneless "Sent:" line. The offset is the one Chicago
 *  keeps on that date, daylight or standard, never a fixed -05:00. */
export function chicagoWallToUtc(
  y: number,
  mo: number,
  d: number,
  h = 12,
  mi = 0,
  s = 0,
): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  // What Chicago's clock reads at `guess`, as if it were UTC; the gap is the
  // offset. One correction covers every hour but the repeated one in the
  // fall, where either reading is fine for a day key.
  const shown = (t: number) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: USER_TZ,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
        .formatToParts(t)
        .map((x) => [x.type, x.value]),
    );
    return Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!);
  };
  const first = guess - (shown(guess) - guess);
  return guess - (shown(first) - first);
}

/** "10/14/2026, 9:05:00 AM" (en-US, Chicago) as an instant; NaN when the
 *  text carries no M/D/YYYY. A date with no time reads at noon. */
export function parseChicagoStamp(text: string): number {
  const m =
    /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?)?/i.exec(
      text ?? "",
    );
  if (!m) return NaN;
  let h = m[4] ? Number(m[4]) : 12;
  if (m[7]) h = (h % 12) + (/p/i.test(m[7]) ? 12 : 0);
  return chicagoWallToUtc(+m[3]!, +m[1]!, +m[2]!, h, m[5] ? +m[5] : 0, m[6] ? +m[6] : 0);
}
