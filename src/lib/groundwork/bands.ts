// The working day's bands — pure, no server imports, so the Klaxon (a client
// component) and the queue read one table.
import { USER_TZ } from "@/lib/tz";

export type Band = "now" | "eleven" | "two";

// The one band table (ruled 2026-09-25, D26): the queue, the Klaxon and the
// test all read it. Minutes from midnight, Chicago. 9:00–11:00 sends ·
// 11:00–14:00 people · 14:00 on research & filing (the Klaxon's day closes
// at 17:00). Before 9:00 the day hasn't opened: the send band is NEXT, not
// now.
export const BAND_TABLE: readonly { id: Band; from: number; to: number }[] = [
  { id: "now", from: 9 * 60, to: 11 * 60 },
  { id: "eleven", from: 11 * 60, to: 14 * 60 },
  { id: "two", from: 14 * 60, to: 17 * 60 },
];

// Chicago wall-clock minutes from midnight.
export function chicagoMinutes(now: Date): number {
  const parts = now
    .toLocaleTimeString("en-US", { hour12: false, timeZone: USER_TZ })
    .split(":");
  const h = Number(parts[0]) % 24;
  const m = Number(parts[1]);
  return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m);
}

// The band a Chicago minute falls in — null before the day opens, when the
// send band is next rather than live. Past the last band's close the day
// stays on its last band (research and filing runs from 14:00 on).
export function bandAt(min: number): Band | null {
  if (min < BAND_TABLE[0].from) return null;
  const row = BAND_TABLE.find((b) => min < b.to) ?? BAND_TABLE[BAND_TABLE.length - 1];
  return row.id;
}

// Which band the CLOCK is in right now (Chicago); null before 9:00.
export function currentBand(now: Date): Band | null {
  return bandAt(chicagoMinutes(now));
}
