// The Scratchpaper's grammar — pure helpers for the one pad that rides every
// page (the Float, triptych winner 2026-08-12). Lines live as namespaced
// AccountNote rows under SCRATCH_NS, which keeps them out of every account
// view and out of the intranet mirror by construction: the pad stays the pad.

export const SCRATCH_NS = "scratch:pad";

// The struck archive (founder-decreed 2026-08-19): a crossed-out line moves
// here instead of dying — history keeps everything, ✕ just takes it off the
// paper. Same namespace family, so it stays out of every account view and
// the intranet mirror by the same construction.
export const SCRATCH_GONE_NS = "scratch:gone";

const CHI = "America/Chicago";

const chicagoDayKey = (d: Date): string =>
  d.toLocaleDateString("en-CA", { timeZone: CHI });

// TODAY · YESTERDAY · then the dated kicker ("MON · AUG 11").
export function dayLabelFor(iso: string, now: Date = new Date()): string {
  const t = new Date(Date.parse(iso));
  if (Number.isNaN(t.getTime())) return "";
  const day = chicagoDayKey(t);
  if (day === chicagoDayKey(now)) return "TODAY";
  if (day === chicagoDayKey(new Date(now.getTime() - 86_400_000))) return "YESTERDAY";
  return t
    .toLocaleDateString("en-US", {
      timeZone: CHI,
      weekday: "short",
      month: "short",
      day: "numeric",
    })
    .toUpperCase()
    .replace(/,/g, " ·");
}

// "9:41a" — the pad's short clock.
export function timeLabelFor(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t)
    .toLocaleTimeString("en-US", { timeZone: CHI, hour: "numeric", minute: "2-digit" })
    .toLowerCase()
    .replace(" ", "")
    .replace("m", "");
}
