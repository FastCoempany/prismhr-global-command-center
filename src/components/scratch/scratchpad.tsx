"use client";

// The Scratchpaper — the Float (triptych winner, 2026-08-12). A ✎ button
// pinned to every page where the stash floater used to sit. Click, write,
// Enter: the line lands date-and-time stamped and stays there and only there.
// Nothing routes, nothing files, nothing becomes an action.

import { useEffect, useRef, useState } from "react";
import {
  scratchAdd,
  scratchDelete,
  scratchList,
  type ScratchLine,
} from "@/app/scratch/actions";
import { dayLabelFor, timeLabelFor } from "@/lib/scratch";
import styles from "./scratchpad.module.css";

export function Scratchpad() {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<ScratchLine[] | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fetched = useRef(false);

  // The pad reads once per session, on mount — the button needs to know
  // whether lines are still sitting on the paper before anyone opens it.
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    void scratchList().then((r) => {
      if (r.ok) setLines(r.lines);
      else {
        setLines([]);
        setNote(r.reason ?? "The pad didn't load.");
      }
    });
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const keep = async () => {
    const body = inputRef.current?.value.trim() ?? "";
    if (!body || busy) return;
    setBusy(true);
    setNote(null);
    const r = await scratchAdd(body);
    setBusy(false);
    if (r.ok && r.line) {
      setLines((xs) => [r.line!, ...(xs ?? [])]);
      if (inputRef.current) inputRef.current.value = "";
    } else setNote(r.reason ?? "The line didn't keep.");
  };

  const crossOut = async (id: string) => {
    const prev = lines;
    setLines((xs) => (xs ?? []).filter((l) => l.id !== id));
    const r = await scratchDelete(id);
    if (!r.ok) {
      setLines(prev);
      setNote(r.reason ?? "The cross-out didn't take.");
    }
  };

  const now = new Date();
  // Day dividers derived up front — the first line of each Chicago day
  // carries its kicker.
  const rows: { l: ScratchLine; divider: string | null }[] = [];
  {
    let prev = "";
    for (const l of lines ?? []) {
      const day = dayLabelFor(l.at, now);
      rows.push({ l, divider: day && day !== prev ? day : null });
      if (day) prev = day;
    }
  }

  // The glow: lines still on the paper light the button red until every one
  // is crossed out. The pad never routes or files, so the paper itself is the
  // only place that can say "unfinished."
  const lit = (lines?.length ?? 0) > 0;

  return (
    <>
      <button
        type="button"
        className={lit ? `${styles.fab} ${styles.fabLit}` : styles.fab}
        title={lit ? "Lines still on the pad." : "Scratchpaper"}
        aria-label={open ? "Close the scratchpaper" : "Open the scratchpaper"}
        onClick={() => setOpen((v) => !v)}
      >
        ✎
      </button>
      {open && (
        <div className={styles.card} role="dialog" aria-label="Scratchpaper">
          <div className={styles.head}>
            <span className={styles.kick}>SCRATCHPAPER</span>
            <button type="button" className={styles.x} onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>
          <div className={styles.in}>
            <input
              ref={inputRef}
              placeholder="Write it. Enter keeps it."
              maxLength={500}
              onKeyDown={(e) => {
                if (e.key === "Enter") void keep();
              }}
            />
          </div>
          {note && <div className={styles.note}>{note}</div>}
          <div className={styles.list}>
            {lines === null && <div className={styles.quiet}>Reading the pad…</div>}
            {lines?.length === 0 && !note && (
              <div className={styles.quiet}>Blank paper. Write the first line.</div>
            )}
            {rows.map(({ l, divider }) => (
              <div key={l.id}>
                {divider && <div className={styles.day}>{divider}</div>}
                <div className={styles.row}>
                  <span className={styles.tm}>{timeLabelFor(l.at)}</span>
                  <span className={styles.body}>{l.body}</span>
                  <button
                    type="button"
                    className={styles.del}
                    title="Cross it out. Gone for good."
                    onClick={() => void crossOut(l.id)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.hint}>
            Stays here and only here. Nothing files anywhere.
          </div>
        </div>
      )}
    </>
  );
}
