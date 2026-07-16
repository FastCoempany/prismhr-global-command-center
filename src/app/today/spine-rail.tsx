"use client";

// The spine ticker — the state-of-play numbers live as a vertical headline on
// the LEFT margin (red where it hurts), readable without opening anything.
// Clicking the rod pulls the curtain: a wide panel with every stat big, the
// country demand bar, and shortcuts to the rooms.

import { useState, type ReactNode } from "react";
import styles from "../command-center.module.css";

export function SpineRail({
  ticker,
  children,
}: {
  ticker: ReactNode; // the vertical headline on the rod
  children: ReactNode; // the curtain's contents
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`${styles.spineRod} ${open ? styles.spineRodOn : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="State of play — click to pull the curtain"
      >
        <span className={styles.spineTick}>{ticker}</span>
      </button>
      {open && (
        <>
          <div className={styles.edgeShade} onClick={() => setOpen(false)} />
          <div className={styles.spineCurtain}>
            <button
              type="button"
              className={styles.edgeClose}
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{ position: "absolute", top: 10, right: 12 }}
            >
              ×
            </button>
            {children}
          </div>
        </>
      )}
    </>
  );
}
