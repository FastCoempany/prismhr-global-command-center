"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import styles from "./command-center.module.css";

// Copy a partner-engagement line to the clipboard — the first, smallest step
// toward "automate copy to partners": today it's one click to paste into Slack.
export function CopyLine({ text, label = "Copy the line" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={styles.copyLine}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          setDone(false);
        }
      }}
    >
      {done ? "Copied ✓" : label}
    </button>
  );
}

export function NoteSubmit() {
  const { pending } = useFormStatus();
  return (
    <button className={styles.addMini} disabled={pending}>
      {pending ? "Saving…" : "Log it"}
    </button>
  );
}
