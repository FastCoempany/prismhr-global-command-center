"use client";

// THE ledger row — every row on Today's tab renders through this one grid:
// time/age | rail dot | text (KIND — body · meta) | actions. Tones color the
// dot: open (blue ring), owed (red ring), check (grey ring — quiet), up
// (dimmed future). The optional expansion opens under the row via the
// primaryLabel button or the ▾ chevron; nothing action-shaped stands on the
// row beyond `primary` and that one label.

import { useState, type ReactNode } from "react";
import styles from "../command-center.module.css";

export type LedgerTone = "open" | "owed" | "check" | "up";

const TONE_DOT: Record<LedgerTone, string> = {
  open: "lgDotOpen",
  owed: "lgDotOwed",
  check: "lgDotCheck",
  up: "lgDotUp",
};

const TONE_ROW: Record<LedgerTone, string> = {
  open: "",
  owed: "",
  check: "lgQuiet",
  up: "lgQuiet",
};

export function LedgerRow({
  tm = "",
  tone,
  kind,
  text,
  textTitle,
  meta,
  primary,
  primaryLabel,
  primaryHot = false,
  children,
}: {
  tm?: string; // the time column — an age ("6d") or a date ("Thu 7/17")
  tone: LedgerTone;
  kind?: string; // bold lead-in word: SEND / DECIDE / CLOSE / ROUNDUP / REPLY
  text: ReactNode;
  textTitle?: string; // hover shows the full line
  meta?: string;
  primary?: ReactNode; // a ready form (Done ✓) that acts without opening
  primaryLabel?: string; // button that opens the expansion (Send ▸ / Decide ▸)
  primaryHot?: boolean;
  children?: ReactNode; // the expansion
}) {
  const [open, setOpen] = useState(false);
  const toneRow = TONE_ROW[tone];
  return (
    <div>
      <div className={`${styles.lgRow} ${toneRow ? styles[toneRow] : ""}`.trim()}>
        <span className={styles.lgTm}>{tm}</span>
        <span className={`${styles.lgDot} ${styles[TONE_DOT[tone]]}`} />
        <span className={styles.lgTx} title={textTitle}>
          {kind ? (
            <>
              <b className={styles.lgKind}>{kind}</b>
              {" — "}
            </>
          ) : null}
          {text}
          {meta ? <span className={styles.lgMeta}> · {meta}</span> : null}
        </span>
        <span className={styles.lgAct}>
          {primary}
          {primaryLabel && children && (
            <button
              type="button"
              className={`${styles.atcBtn} ${primaryHot ? styles.atcHot : ""}`}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              {primaryLabel}
            </button>
          )}
          {children && (
            <button
              type="button"
              className={styles.lgChev}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label="Toggle details"
            >
              {open ? "▴" : "▾"}
            </button>
          )}
        </span>
      </div>
      {open && children && <div className={styles.lgExp}>{children}</div>}
    </div>
  );
}
