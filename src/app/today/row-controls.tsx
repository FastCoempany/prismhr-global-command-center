"use client";

// The quiet right-edge controls a ledger row can carry.
//
// DelayControl — the ⏲. Clicking it demands a WHY: three quick-pick reasons
// plus free text. The reason is stored against the row for today and the row
// sinks into the "Delayed — and why" register wearing it.
//
// FlagPickControl — the ⚐ on rows with no detected country: opens a small
// flag menu and stamps the chosen country onto the note/action.

import { useState } from "react";
import { delayLedgerRow, setRowCountry } from "./actions";
import { CountryFlag, PICKER_CODES, CODE_TO_NAME } from "@/lib/flags";
import styles from "../command-center.module.css";

const QUICKS = ["waiting on reply", "blocked", "push to tomorrow"];

export function DelayControl({ rowKey }: { rowKey: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={styles.dlyWrap}>
      <button
        type="button"
        className={`${styles.ctlBtn} ${open ? styles.ctlBtnOn : ""}`}
        title="Delay — say why"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ⏲
      </button>
      {open && (
        <form action={delayLedgerRow} className={styles.delayBox}>
          <input type="hidden" name="key" value={rowKey} />
          <span className={styles.dlyLab}>why?</span>
          {QUICKS.map((q) => (
            <button key={q} name="quick" value={q} className={styles.dqp}>
              {q}
            </button>
          ))}
          <input
            name="reason"
            maxLength={300}
            placeholder="or type a reason…"
            aria-label="Delay reason"
            className={styles.dfree}
          />
          <button className={styles.dset}>set</button>
          <button
            type="button"
            className={styles.dcancel}
            aria-label="Cancel"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </form>
      )}
    </span>
  );
}

export function FlagPickControl({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={styles.dlyWrap}>
      <button
        type="button"
        className={styles.flagPickBtn}
        title="No country detected — pick one"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ⚐
      </button>
      {open && (
        <form action={setRowCountry} className={`${styles.delayBox} ${styles.flagMenu}`}>
          <input type="hidden" name="id" value={id} />
          {PICKER_CODES.map((c) => (
            <button key={c} name="code" value={c} title={CODE_TO_NAME[c]}>
              <CountryFlag code={c} className={styles.flag} />
            </button>
          ))}
        </form>
      )}
    </span>
  );
}
