"use client";

// The spine — a quiet, slim strip on the LEFT margin. No text on the rod;
// just a grip and a red dot when something is past its window. Clicking it
// pulls the curtain: a wide panel with every stat big, the country demand
// bar, and shortcuts to the rooms.

import { useState, type ReactNode } from "react";
import styles from "../command-center.module.css";

export function SpineRail({
  hot,
  children,
}: {
  hot?: boolean; // red dot on the rod (something past window)
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
        aria-label="State of play"
        title="State of play — click to pull the curtain"
      >
        {hot && <span className={styles.spineDot} />}
        <span className={styles.spineGrip} aria-hidden>
          ⋮
        </span>
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
