"use client";

// Partner notes under a Focus card — hidden until asked for. "Show notes"
// reveals one-line rows; each row expands to the full note and carries its
// own utilities (expand, delete this partner's copy). Nothing renders by
// default so the card stays a clean header + chips.

import { useState } from "react";
import Link from "next/link";
import { deletePartnerNote } from "../partners/actions";
import styles from "../command-center.module.css";

type Note = { id: string; body: string; createdAt: string };

const MAX_ROWS = 8;

function shortDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function PnRow({ n }: { n: Note }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={styles.pnRow}>
      <button
        type="button"
        className={styles.sheetChevron}
        title={expanded ? "Collapse to one row" : "Expand the full note"}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "▾" : "▸"}
      </button>
      <span className={styles.pnDate} suppressHydrationWarning>
        {shortDate(n.createdAt)}
      </span>
      <span
        className={`${styles.pnBody} ${expanded ? styles.pnBodyFull : ""}`}
        onClick={() => setExpanded((v) => !v)}
      >
        {n.body}
      </span>
      <form action={deletePartnerNote} className={styles.valInline}>
        <input type="hidden" name="id" value={n.id} />
        <input type="hidden" name="returnTo" value="/today" />
        <button
          className={styles.pnDel}
          title="Delete this note (this partner's copy only)"
        >
          ×
        </button>
      </form>
    </div>
  );
}

export function PartnerNotes({ partner, notes }: { partner: string; notes: Note[] }) {
  const [open, setOpen] = useState(false);
  if (notes.length === 0) return null;
  return (
    <div className={styles.pnWrap}>
      <button
        type="button"
        className={styles.pnToggle}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "▾ hide notes" : `▸ show notes (${notes.length})`}
      </button>
      {open && (
        <div className={styles.pnList}>
          {notes.slice(0, MAX_ROWS).map((n) => (
            <PnRow key={n.id} n={n} />
          ))}
          {notes.length > MAX_ROWS && (
            <Link
              className={styles.pnMore}
              href={`/partners#${encodeURIComponent(partner)}`}
            >
              +{notes.length - MAX_ROWS} more in the partner room →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
