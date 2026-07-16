"use client";

// The edge tray — slim vertical tabs pinned to the right edge of the screen
// (ROUNDUPS · N, SCHEDULED · N). Clicking one flies its panel out over the
// page; the panels themselves are server-rendered children, so every form
// inside keeps its server action. The rail is the only standing footprint.

import { useState, type ReactNode } from "react";
import styles from "../command-center.module.css";

export type EdgeTab = {
  key: string;
  label: string;
  count: number;
  hot?: boolean; // red dot (something due) vs green
  body: ReactNode;
};

export function EdgeTray({ tabs }: { tabs: EdgeTab[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const active = tabs.find((t) => t.key === open);
  return (
    <>
      <div className={styles.edgeRail}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`${styles.edgeTab} ${open === t.key ? styles.edgeTabOn : ""}`}
            onClick={() => setOpen((o) => (o === t.key ? null : t.key))}
            aria-expanded={open === t.key}
          >
            <span className={`${styles.edgeDot} ${t.hot ? styles.edgeDotHot : ""}`} />
            {t.label} · {t.count}
          </button>
        ))}
      </div>
      {active && (
        <>
          <div className={styles.edgeShade} onClick={() => setOpen(null)} />
          <div className={styles.edgeFly}>
            <div className={styles.edgeFlyHead}>
              {active.label}
              <button
                type="button"
                className={styles.edgeClose}
                onClick={() => setOpen(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {active.body}
          </div>
        </>
      )}
    </>
  );
}
