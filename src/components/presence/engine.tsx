"use client";

// The desk engine — one singleton that hears the whole app (founder-decreed
// 2026-08-18, ActivTrak semantics). Mouse, keys, wheel, touch feed a last-input
// clock; every visible second classifies as ACTIVE (input inside 2 minutes),
// PASSIVE (2–15 quiet minutes), or INACTIVE (past 15 — the meter stops cold).
// Deltas bank to the server about once a minute, day-scoped to Chicago, so the
// tally survives reloads and resets at midnight. A hidden tab accrues nothing:
// this is time IN THE APP, honestly counted, not machine time.

import { useEffect, useSyncExternalStore } from "react";
import { presenceLog, presenceReset, presenceToday } from "@/app/presence/actions";
import { deskParts, fmtDesk, presenceOf, type PresenceState } from "@/lib/presence";
import styles from "./presence.module.css";

type Snap = {
  state: PresenceState;
  lastInput: number;
  activeSec: number;
  passiveSec: number;
};

let lastInput = 0;
let storedA = 0; // today's banked totals, seeded once from the server
let storedP = 0;
let sessA = 0; // accrued locally since mount
let sessP = 0;
let pendA = 0; // accrued but not yet banked
let pendP = 0;
let started = false;
let snap: Snap = { state: "active", lastInput: 0, activeSec: 0, passiveSec: 0 };
const EMPTY: Snap = snap;
const subs = new Set<() => void>();

function notify() {
  for (const fn of subs) fn();
}

function refreshSnap(state: PresenceState) {
  snap = {
    state,
    lastInput,
    activeSec: storedA + sessA,
    passiveSec: storedP + sessP,
  };
}

function flush() {
  if (pendA === 0 && pendP === 0) return;
  const a = pendA;
  const p = pendP;
  pendA = 0;
  pendP = 0;
  void presenceLog(a, p).catch(() => {
    pendA += a;
    pendP += p;
  });
}

export function ensureStarted() {
  if (started || typeof window === "undefined") return;
  started = true;
  lastInput = Date.now();
  const heard = () => {
    lastInput = Date.now();
  };
  for (const ev of ["mousemove", "mousedown", "keydown", "wheel", "touchstart"])
    window.addEventListener(ev, heard, { passive: true });

  void presenceToday()
    .then((t) => {
      storedA = t.a;
      storedP = t.p;
      refreshSnap(snap.state);
      notify();
    })
    .catch(() => null);

  window.setInterval(() => {
    const state = presenceOf(Date.now() - lastInput);
    if (document.visibilityState === "visible") {
      if (state === "active") {
        sessA += 1;
        pendA += 1;
      } else if (state === "passive") {
        sessP += 1;
        pendP += 1;
      }
      refreshSnap(state);
      notify();
    } else if (state !== snap.state) {
      refreshSnap(state);
      notify();
    }
  }, 1000);

  window.setInterval(flush, 60_000);
  window.addEventListener("pagehide", flush);
}

// The reset (founder-decreed 2026-08-19): zero today, locally and banked —
// the meter restarts from 0h 00m 00s on the next tick.
export function resetDesk(): void {
  storedA = 0;
  storedP = 0;
  sessA = 0;
  sessP = 0;
  pendA = 0;
  pendP = 0;
  refreshSnap(snap.state);
  notify();
  void presenceReset().catch(() => null);
}

// The masthead clock asks this to decide whether to keep ticking.
export function presenceLastInput(): number {
  return started ? lastInput : Date.now();
}

export function usePresence(): Snap {
  return useSyncExternalStore(
    (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    () => snap,
    () => EMPTY,
  );
}

// Mounted once in the layout — starts the engine for every page.
export function PresenceTracker() {
  useEffect(() => {
    ensureStarted();
  }, []);
  return null;
}

// The instrument: a status lamp (green breathing = active, amber = passive,
// hollow = stopped), the kicker, and live h/m/s digits that tick with the
// desk. Today's active time leads; passive rides the tooltip. Inactive dims
// the whole meter — it has stopped, and says so.
const LAMP: Record<PresenceState, string> = {
  active: styles.lampActive,
  passive: styles.lampPassive,
  inactive: styles.lampStopped,
};

export function DeskMeter() {
  const s = usePresence();
  const stopped = s.state === "inactive";
  const t = deskParts(s.activeSec);
  return (
    <span
      className={stopped ? `${styles.meter} ${styles.meterStopped}` : styles.meter}
      title={
        `Active ${fmtDesk(s.activeSec)} · passive ${fmtDesk(s.passiveSec)} today. ` +
        `Two quiet minutes stay active; fifteen stop the meter. Resets at Chicago midnight.`
      }
    >
      <span className={`${styles.lamp} ${LAMP[s.state]}`} />
      <span className={styles.meterCol}>
        <span className={styles.meterKick}>AT THE DESK</span>
        <span className={styles.meterDigits} suppressHydrationWarning>
          <span className={styles.dig}>{t.h}</span>
          <span className={styles.unit}>h</span>
          <span className={styles.dig}>{String(t.m).padStart(2, "0")}</span>
          <span className={styles.unit}>m</span>
          <span className={styles.dig}>{String(t.s).padStart(2, "0")}</span>
          <span className={styles.unit}>s</span>
        </span>
      </span>
      <button
        type="button"
        className={styles.meterReset}
        title="Reset the desk clock. Today's tally starts from zero — history keeps its days."
        onClick={resetDesk}
      >
        ↺
      </button>
    </span>
  );
}
