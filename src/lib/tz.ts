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

export function sameUserDay(iso: string, ref: Date | number = Date.now()): boolean {
  const k = userDayKey(iso);
  return k !== "" && k === userDayKey(ref instanceof Date ? ref : new Date(ref));
}
