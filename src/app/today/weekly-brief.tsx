"use client";

// The weekly brief block at the top of the Narrative drawer — the update
// writes itself; ONE button copies it as plain text (Teams-paste friendly).

import { useState } from "react";
import type { BriefSection } from "@/lib/intel/narrative";
import styles from "../command-center.module.css";

export function WeeklyBriefBlock({
  sections,
  text,
}: {
  sections: BriefSection[];
  text: string;
}) {
  const [copied, setCopied] = useState(false);
  if (sections.length === 0) return null;
  return (
    <div className={styles.notesWrap}>
      <div className={styles.inkBar}>
        <h2 className={styles.h2}>This week, written for you</h2>
        <button
          type="button"
          className={styles.atcBtn}
          onClick={() => {
            void navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "Copied ✓" : "Copy brief"}
        </button>
      </div>
      {sections.map((s) => (
        <div key={s.title}>
          <b>{s.title}</b>
          <ul className={styles.signalList}>
            {s.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
