"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import styles from "./command-center.module.css";

// A visible, editable message box: see exactly what you're sending, tweak it,
// then copy the edited text. Auto-grows to fit. Used for partner messages and
// week-openers so nothing is copied blind.
export function EditableMessage({
  text,
  copyLabel = "Copy message",
}: {
  text: string;
  copyLabel?: string;
}) {
  const [val, setVal] = useState(text);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [val]);

  return (
    <div className={styles.editMsg}>
      <textarea
        ref={ref}
        className={styles.editMsgArea}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        aria-label="Editable message"
        spellCheck
      />
      <div className={styles.editMsgRow}>
        <button
          type="button"
          className={styles.copyLine}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(val);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              setCopied(false);
            }
          }}
        >
          {copied ? "Copied ✓ — paste into Slack, Teams, or email" : copyLabel}
        </button>
        {val !== text && (
          <button type="button" className={styles.editMsgReset} onClick={() => setVal(text)}>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

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
