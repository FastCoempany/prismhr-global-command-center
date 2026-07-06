"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import styles from "./command-center.module.css";
import { deleteTouch, logTouch } from "./today/actions";

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

function ContactSubmit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={styles.contactSendBtn} disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

// One control that does both jobs: shows the exact opener (editable + copyable),
// and logs the contact — capturing what you actually sent and arming an
// automatic follow-up. Once contacted it collapses to a confirmation + Undo.
export function ContactControl({
  subjectKey,
  kind,
  label,
  detail = "",
  defaultMessage,
  sentLabel = "Mark contacted ✓",
  editLabel = "Edit & copy the message",
  doneText = "Contacted ✓",
  contacted,
  followUpLabel,
}: {
  subjectKey: string;
  kind: "partner" | "account";
  label: string;
  detail?: string;
  defaultMessage: string;
  sentLabel?: string;
  editLabel?: string;
  doneText?: string;
  contacted: boolean;
  followUpLabel?: string;
}) {
  const [val, setVal] = useState(defaultMessage);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow to fit. Also re-run when the disclosure opens: a textarea inside a
  // collapsed <details> measures scrollHeight as 0, so it must be re-fit on
  // expand or it renders squashed.
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };
  useEffect(fit, [val]);

  if (contacted) {
    return (
      <div className={styles.contactDone}>
        <span className={styles.contactDoneText}>
          {doneText}
          {followUpLabel ? ` · follow-up ${followUpLabel}` : ""}
        </span>
        <form action={deleteTouch}>
          <input type="hidden" name="subjectKey" value={subjectKey} />
          <button className={styles.mvUndoBtn}>Undo</button>
        </form>
      </div>
    );
  }

  return (
    <form action={logTouch} className={styles.contactForm}>
      <input type="hidden" name="subjectKey" value={subjectKey} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="label" value={label} />
      <input type="hidden" name="detail" value={detail} />
      {/* The textarea stays inside the form even while collapsed, so its edited
          value is still submitted. */}
      <details
        className={styles.contactDetails}
        onToggle={(e) => {
          if ((e.currentTarget as HTMLDetailsElement).open) fit();
        }}
      >
        <summary className={styles.contactSummary}>✎ {editLabel}</summary>
        <div className={styles.editMsg}>
          <textarea
            ref={ref}
            name="message"
            className={styles.editMsgArea}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            aria-label="Message to send"
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
              {copied ? "Copied ✓ — paste into Slack, Teams, or email" : "Copy message"}
            </button>
            {val !== defaultMessage && (
              <button
                type="button"
                className={styles.editMsgReset}
                onClick={() => setVal(defaultMessage)}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </details>
      <ContactSubmit label={sentLabel} />
    </form>
  );
}
