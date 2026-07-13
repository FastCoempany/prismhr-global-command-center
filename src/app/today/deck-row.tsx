"use client";

import { useState, type ReactNode } from "react";
import styles from "../command-center.module.css";

// One row on the "On deck" rail — the This-morning sibling of the ATC rail.
// Number, a kind tag (send / decide / close / note), the move phrase, the one
// fact that matters, and ONE button. The full coaching (steps, the editable
// message, park/seed) expands beneath on demand, so nothing stands tall.

export type DeckKind = "send" | "decide" | "close" | "note";

const KIND_CLS: Record<DeckKind, string> = {
  send: "deckSend",
  decide: "deckDecide",
  close: "deckClose",
  note: "deckNote",
};

export function DeckRow({
  num,
  kind,
  phrase,
  meta,
  primaryLabel,
  primaryHot = false,
  primary,
  children,
}: {
  num: string | number;
  kind: DeckKind;
  phrase: ReactNode;
  meta?: string;
  // A button that opens the coaching panel (Send ▸ / Decide ▸)…
  primaryLabel?: string;
  primaryHot?: boolean;
  // …or a ready server-action form rendered inline (Mark done ✓ on a commitment).
  primary?: ReactNode;
  children: ReactNode; // the expansion — full guidance, actions, SF checkpoint
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.atcRowWrap}>
      <div className={styles.atcRow}>
        <span className={styles.deckNum}>{num}</span>
        <span className={`${styles.deckKind} ${styles[KIND_CLS[kind]]}`}>{kind}</span>
        <span className={styles.atcPhrase}>{phrase}</span>
        {meta ? <span className={styles.deckMeta}>{meta}</span> : null}
        {primary}
        {primaryLabel && (
          <button
            type="button"
            className={`${styles.atcBtn} ${primaryHot ? styles.atcHot : ""}`}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {primaryLabel}
          </button>
        )}
        <button
          type="button"
          className={styles.atcMore}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Full coaching for this move"
        >
          {open ? "⌃" : "⌄"}
        </button>
      </div>
      {open && <div className={styles.deckExpand}>{children}</div>}
    </div>
  );
}
