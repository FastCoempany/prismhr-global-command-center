// The desk clock's grammar (founder-decreed 2026-08-18, ActivTrak semantics).
// Input inside the grace window is ACTIVE time — the first two quiet minutes
// still count as work, because reading is work. From two to fifteen quiet
// minutes the desk is PASSIVE — present, hands off. Past fifteen the desk is
// INACTIVE and the meter stops cold until the mouse or keys speak again. The
// masthead clock has its own earlier decree: it freezes at five quiet minutes.

export const ACTIVE_GRACE_MS = 2 * 60_000;
export const PASSIVE_STOP_MS = 15 * 60_000;
export const CLOCK_FREEZE_MS = 5 * 60_000;

export const PRESENCE_NS = "presence:";

export type PresenceState = "active" | "passive" | "inactive";

export function presenceOf(gapMs: number): PresenceState {
  if (!Number.isFinite(gapMs) || gapMs < 0) return "inactive";
  if (gapMs <= ACTIVE_GRACE_MS) return "active";
  if (gapMs <= PASSIVE_STOP_MS) return "passive";
  return "inactive";
}

// The Chicago day a moment belongs to — the meter resets at Chicago midnight.
export function presenceDayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

// "2h 14m" · "14m" · "0m" — the capsule's read.
export function fmtDesk(sec: number): string {
  const s = Number.isFinite(sec) && sec > 0 ? Math.floor(sec) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// The day row's reason column carries the two counters as JSON. A mangled
// reason costs the day's tally, never a crash.
export function presenceReason(activeSec: number, passiveSec: number): string {
  const clamp = (n: number) =>
    Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 86_400) : 0;
  return JSON.stringify({ a: clamp(activeSec), p: clamp(passiveSec) });
}

export function parsePresenceReason(reason: string): { a: number; p: number } {
  try {
    const o = JSON.parse(reason ?? "") as { a?: unknown; p?: unknown };
    const num = (v: unknown) =>
      typeof v === "number" && Number.isFinite(v) && v > 0
        ? Math.min(Math.floor(v), 86_400)
        : 0;
    return { a: num(o?.a), p: num(o?.p) };
  } catch {
    return { a: 0, p: 0 };
  }
}
