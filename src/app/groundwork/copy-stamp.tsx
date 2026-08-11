"use client";

// The room's one client control: copy the composed thing, then let the stamp
// land as a side effect (§3.5 — done marks ride on real actions, never stand
// alone). Without a write session the copy still works; only the stamp skips.

import { useState, useTransition } from "react";
import styles from "./groundwork.module.css";

export function CopyStamp({
  payload,
  label,
  accent,
  action,
}: {
  payload: string;
  label: string;
  accent?: boolean;
  action?: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      className={accent ? styles.btnAccent : styles.btn2nd}
      onClick={async () => {
        let ok = true;
        try {
          await navigator.clipboard.writeText(payload);
        } catch {
          // The fallback prompt returns null on cancel — no copy, no stamp.
          ok =
            window.prompt("Copy blocked. Press Ctrl+C:", payload.slice(0, 4000)) !== null;
        }
        if (!ok) return;
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
        if (action) start(() => action());
      }}
    >
      {copied ? "Copied. It's on your clipboard." : label}
    </button>
  );
}
