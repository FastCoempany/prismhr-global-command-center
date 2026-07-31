"use client";

// The self-check, runnable by hand. The eval set used to be decoration —
// defined and never executed. This button runs the real pipeline end to end
// and reports each check in plain words.

import { useState, useTransition } from "react";
import { intranetSelfCheck } from "../actions";
import styles from "../../command-center.module.css";

export function SelfCheck() {
  const [lines, setLines] = useState<string[]>([]);
  const [busy, start] = useTransition();
  return (
    <section className={styles.itPanel}>
      <p className={styles.itPanelHead}>The room, checking itself</p>
      <button
        type="button"
        className={styles.itRunBtn}
        disabled={busy}
        onClick={() =>
          start(async () => {
            const r = await intranetSelfCheck();
            setLines(r.ok ? r.lines : [r.reason ?? "The self-check couldn't run."]);
          })
        }
      >
        {busy ? "Checking — this takes a minute…" : "Run the self-check"}
      </button>
      {lines.length > 0 && (
        <ul className={styles.itRunLines}>
          {lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
