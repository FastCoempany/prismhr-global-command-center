"use client";

// THE ledger row — every row on Today's tab renders through this one grid:
// time/age | glyph (or rail dot) | text · meta | actions. The verb is an ICON
// with its own color (the word survives as a tooltip); tones still color the
// fallback dot. The optional expansion opens under the row via the
// primaryLabel button or the ▾ chevron; `controls` carries the quiet cluster
// (delay, back-to-sheet, remove) at the row's right edge.

import { useState, type ReactNode } from "react";
import styles from "../command-center.module.css";
import { Glyph, type GlyphKind } from "./ledger-icons";

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
  icon,
  flag,
  text,
  textTitle,
  meta,
  primary,
  primaryLabel,
  primaryHot = false,
  controls,
  children,
}: {
  tm?: string; // the time column — an age ("6d") or a date ("Thu 7/17")
  tone: LedgerTone;
  kind?: string; // legacy bold lead-in word — only renders when no icon is set
  icon?: GlyphKind; // the verb as a colored glyph (word moves to the tooltip)
  flag?: ReactNode; // country flag rendered right after the text
  text: ReactNode;
  textTitle?: string; // hover shows the full line
  meta?: string;
  primary?: ReactNode; // a ready form (Done ✓) that acts without opening
  primaryLabel?: string; // button that opens the expansion (Send ▸ / Decide ▸)
  primaryHot?: boolean;
  controls?: ReactNode; // the quiet right-edge cluster (delay / back / remove)
  children?: ReactNode; // the expansion
}) {
  const [open, setOpen] = useState(false);
  const toneRow = TONE_ROW[tone];
  return (
    <div>
      <div className={`${styles.lgRow} ${toneRow ? styles[toneRow] : ""}`.trim()}>
        <span className={styles.lgTm}>{tm}</span>
        {icon ? (
          <Glyph kind={icon} hot={tone === "owed"} />
        ) : (
          <span className={`${styles.lgDot} ${styles[TONE_DOT[tone]]}`} />
        )}
        <span className={styles.lgTx} title={textTitle}>
          {!icon && kind ? (
            <>
              <b className={styles.lgKind}>{kind}</b>
              {" — "}
            </>
          ) : null}
          {text}
          {flag}
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
          {controls}
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
