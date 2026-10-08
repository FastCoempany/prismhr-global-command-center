"use client";

// One meter on the brain's vital signs, as a door (pass 10, the click-depth
// law): the label and its number, and one click opens the rows it counts.
// The rows come down when it opens, never with the page.

import { useState, type ReactNode } from "react";
import type { HealthList, HealthRow } from "@/lib/intranet/ledger";
import { intranetHealthList } from "../actions";
import styles from "../../command-center.module.css";

export function MeterDoor({
  label,
  which,
  children,
  initial,
}: {
  label: string;
  which: HealthList;
  /** The meter's number as the page draws it. */
  children: ReactNode;
  /** Rows open on first paint, for the suite. */
  initial?: HealthRow[];
}) {
  const [open, setOpen] = useState(!!initial);
  const [rows, setRows] = useState<HealthRow[] | null>(initial ?? null);
  const toggle = () => {
    setOpen((v) => !v);
    if (rows === null) void intranetHealthList(which).then(setRows);
  };
  return (
    <>
      <button
        type="button"
        className={`${styles.itMeter} ${styles.itMeterDoor}`}
        aria-expanded={open}
        title={
          open ? `Hide the ${label.toLowerCase()}` : `Show the ${label.toLowerCase()}`
        }
        onClick={toggle}
      >
        <span>{label}</span>
        <span className={styles.itMeterN}>{children}</span>
      </button>
      {open && (
        <ul className={styles.itMeterRows}>
          {rows === null ? (
            <li>Opening…</li>
          ) : rows.length === 0 ? (
            <li>Nothing here yet.</li>
          ) : (
            rows.map((r, i) => (
              <li key={i}>
                {r.text}
                {r.meta && <span className={styles.itCiteMeta}>{r.meta}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </>
  );
}
