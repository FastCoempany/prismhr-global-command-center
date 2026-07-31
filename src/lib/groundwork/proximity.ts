// Proximity — where an account sits relative to the operator's desk (Chicago).
// Doctrine (plan §7.2): proximity breaks ties in the queue and shapes
// logistics; it NEVER sets priority. A small static read of the book's own
// city/state columns — no geocoding, no external calls.

import type { Peo } from "@/lib/book";

export type ProxBand = "metro" | "daydrive" | "flight" | "far";

// Chicago-metro towns that appear in the book. Lowercased contains-match so
// "Westchester" and "Westchester, IL" both land.
const METRO_CITIES = [
  "chicago",
  "westchester",
  "northbrook",
  "frankfort",
  "evanston",
  "oak brook",
  "schaumburg",
  "naperville",
];

// A day's drive from Chicago: the neighboring states' working cores.
const DAYDRIVE_STATES = new Set(["IL", "WI", "IN", "MI"]);

// A short direct flight with same-day return.
const FLIGHT_STATES = new Set(["MN", "MO", "KS", "OH", "IA", "NE", "KY", "TN"]);

export function proximityBand(p: Pick<Peo, "city" | "state">): ProxBand {
  const city = (p.city ?? "").trim().toLowerCase();
  const state = (p.state ?? "").trim().toUpperCase();
  if (state === "IL" && METRO_CITIES.some((c) => city.includes(c))) return "metro";
  if (city && METRO_CITIES.some((c) => city === c)) return "metro";
  if (DAYDRIVE_STATES.has(state)) return "daydrive";
  if (FLIGHT_STATES.has(state)) return "flight";
  return "far";
}

// Lower is closer — used ONLY as a tie-break after weight and composite score.
export function proximityRank(p: Pick<Peo, "city" | "state">): number {
  const order: Record<ProxBand, number> = { metro: 0, daydrive: 1, flight: 2, far: 3 };
  return order[proximityBand(p)];
}

// The operator-facing mark. Only metro earns one — the founder's green
// "one town over" / "your metro" chip; anything farther is unmarked.
export function proximityMark(p: Pick<Peo, "city" | "state">): string | null {
  return proximityBand(p) === "metro" ? "your metro" : null;
}
