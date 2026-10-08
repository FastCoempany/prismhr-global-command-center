// The Klaxon's reading — pure, no server imports, so the instrument (a client
// component) and the suite read one function. The band's command and its
// countdown run the masthead (triptych winner, decided 2026-08-11): the
// serif verb, the count, and a full-width burn bar draining as the window
// empties, red and pulsing inside the last five minutes (pass 8 call 11).
// The capsule facts (Chicago clock, date, weather) ride the sub-row. With no
// clock yet (the server's first paint) every reading is a dash, so the
// hydration never disagrees.

import { BAND_TABLE, currentBand } from "./bands";

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
const hm = (min: number) => `${Math.floor(min / 60)}:${pad(min % 60)}`;

// The working day's bands. The times are the one band table (ruled
// 2026-09-25, D26); only the words live here.
const WORDS = [
  { label: "THE SEND WINDOW", verb: "Send." },
  { label: "THE PEOPLE WINDOW", verb: "Get on the phone." },
  { label: "RESEARCH & FILING", verb: "Research and file." },
] as const;
const BANDS = BAND_TABLE.map((b, i) => {
  const after = BAND_TABLE[i + 1];
  return {
    id: b.id,
    from: b.from,
    to: b.to,
    label: WORDS[i]?.label ?? "",
    verb: WORDS[i]?.verb ?? "",
    next: after
      ? `NEXT · ${WORDS[i + 1]?.label ?? ""} · ${hm(after.from)}–${hm(after.to)}`
      : `NEXT · TOMORROW'S SENDS · ${hm(BAND_TABLE[0].from)}`,
  };
});
const DAY_FROM = BANDS[0].from;
const DAY_TO = BANDS[BANDS.length - 1].to;

/** The minutes inside which the count and the bar turn red and pulse. */
export const KLAXON_LATE_MIN = 5;

export type KlaxonReading = {
  /** The serif command, left on the masthead. */
  verb: string;
  /** The countdown, right on the masthead. */
  count: string;
  /** The burn bar's remaining width, 0 to 100: full before the band opens,
   *  draining as the window empties. */
  burnPct: number;
  /** Inside the last five minutes of a live band. */
  late: boolean;
  /** The band's sub-row: its name and when it closes or opens. */
  band: string;
  /** "NEXT · " before the day opens, else "". */
  lead: string;
  /** " · CLOSES 11:00", " · OPENS 9:00", or "" once the day is worked. */
  edge: string;
  /** The band after this one, "" before or after the day. */
  next: string;
  /** The capsule: Chicago clock and date. */
  clock: string;
  date: string;
};

/** The reading at a moment; null is the server's first paint. */
export function klaxonReading(now: Date | null): KlaxonReading {
  // Chicago wall-clock minutes, derived once per tick.
  const chi = now
    ? new Date(
        now.toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false }),
      )
    : null;
  const min = chi ? chi.getHours() * 60 + chi.getMinutes() + chi.getSeconds() / 60 : null;
  const sec = chi ? chi.getSeconds() : 0;

  // The band is the table's own reading (currentBand, D26): null before the
  // day opens, and before the day the send band is the one on the masthead.
  const bandId = now ? currentBand(now) : null;
  const band = BANDS.find((b) => b.id === bandId) ?? BANDS[0];
  const afterDay = min != null && min >= DAY_TO;
  // Before the day opens the send band is NEXT, not now (D26): the count runs
  // to its opening and the bar waits full.
  const beforeDay = min != null && min < DAY_FROM;
  const left =
    min == null
      ? null
      : beforeDay
        ? Math.max(0, band.from - min)
        : Math.max(0, band.to - min);
  const frac =
    min == null || beforeDay
      ? 0
      : Math.min(1, Math.max(0, (min - band.from) / (band.to - band.from)));
  const late = left != null && left <= KLAXON_LATE_MIN && !afterDay && !beforeDay;

  const clock = chi
    ? `${chi.getHours()}:${pad(chi.getMinutes())}:${pad(sec)}`
    : "—:——:——";
  const date = chi
    ? chi
        .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
        .toUpperCase()
        .replace(/,/g, " ·")
    : "—";
  const count =
    left == null
      ? "—:——"
      : afterDay
        ? "—"
        : left >= 60
          ? `${Math.floor(left / 60)}:${pad(Math.floor(left % 60))}:${pad(Math.floor((left % 1) * 60))}`
          : `${Math.floor(left)}:${pad(Math.floor((left % 1) * 60))}`;

  return {
    verb: afterDay ? "The day is worked." : band.verb,
    count,
    burnPct: Math.round((1 - frac) * 100),
    late,
    band: band.label,
    lead: beforeDay ? "NEXT · " : "",
    edge: afterDay
      ? ""
      : beforeDay
        ? ` · OPENS ${hm(band.from)}`
        : ` · CLOSES ${hm(band.to)}`,
    next: afterDay || beforeDay ? "" : band.next,
    clock,
    date,
  };
}
