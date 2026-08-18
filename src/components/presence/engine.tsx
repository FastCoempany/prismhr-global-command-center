"use client";

// The desk engine — one singleton that hears the whole app (founder-decreed
// 2026-08-18, ActivTrak semantics). Mouse, keys, wheel, touch feed a last-input
// clock; every visible second classifies as ACTIVE (input inside 2 minutes),
// PASSIVE (2–15 quiet minutes), or INACTIVE (past 15 — the meter stops cold).
// Deltas bank to the server about once a minute, day-scoped to Chicago, so the
// tally survives reloads and resets at midnight. A hidden tab accrues nothing:
// this is time IN THE APP, honestly counted, not machine time.

import { useEffect, useSyncExternalStore } from "react";
import { presenceLog, presenceToday } from "@/app/presence/actions";
import { fmtDesk, presenceOf, type PresenceState } from "@/lib/presence";
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

// The capsule: today's active time leads; passive rides the tooltip. Inactive
// dims the meter — it has stopped, and says so.
export function DeskMeter() {
  const s = usePresence();
  const stopped = s.state === "inactive";
  return (
    <span
      className={stopped ? `${styles.meter} ${styles.meterStopped}` : styles.meter}
      title={
        `Active ${fmtDesk(s.activeSec)} · passive ${fmtDesk(s.passiveSec)} today. ` +
        `Two quiet minutes stay active; fifteen stop the meter. Resets at Chicago midnight.`
      }
    >
      <span className={styles.meterKick}>AT THE DESK</span>
      <span className={styles.meterVal} suppressHydrationWarning>
        {fmtDesk(s.activeSec)}
      </span>
    </span>
  );
}
