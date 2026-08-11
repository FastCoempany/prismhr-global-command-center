"use client";

// "Look into (n)" — the live open-loops band on Today, sitting between the
// day's history and the focus row. Every row was derived from the corpus this
// render: a research gap, a stale capture ask, or a board/evidence
// contradiction. ✓ resolves (lookIntoStatus upsert); research rows carry a
// copyable prompt for the claude.ai loop.

import { useState } from "react";
import type { LiveLookIntoItem } from "@/lib/look-into/live";
import { resolveLiveLookInto } from "../look-into/actions";
import styles from "../command-center.module.css";

function PromptCopy({ prompt }: { prompt: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className={styles.atcBtn}
      title="Copy the research prompt. Run it in claude.ai, then paste the answer back as a note."
      onClick={() => {
        void navigator.clipboard.writeText(prompt);
        setOk(true);
        setTimeout(() => setOk(false), 1400);
      }}
    >
      {ok ? "✓ copied" : "📋 prompt"}
    </button>
  );
}

export function LookIntoBand({
  items,
  canWrite,
}: {
  items: LiveLookIntoItem[];
  canWrite: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <>
      <div className={styles.cockCap} id="lookinto">
        <span>Look into ({items.length})</span>
      </div>
      <div className={styles.atcRail}>
        {items.map((it) => (
          <div key={it.id} className={styles.lgRow}>
            <span className={styles.lgTm}>{it.weight === "high" ? "!" : ""}</span>
            <span
              className={`${styles.lgDot} ${
                it.weight === "high" ? styles.lgDotOwed : styles.lgDotCheck
              }`}
            />
            <span className={styles.lgTx} title={it.why}>
              {it.title}
              <span className={styles.lgMeta}> · {it.why}</span>
            </span>
            <span className={styles.lgAct}>
              {it.prompt && <PromptCopy prompt={it.prompt} />}
              {canWrite && (
                <form action={resolveLiveLookInto} className={styles.valInline}>
                  <input type="hidden" name="itemId" value={it.id} />
                  <button className={styles.atcBtn} title="Resolved. Clears this loop.">
                    ✓
                  </button>
                </form>
              )}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
