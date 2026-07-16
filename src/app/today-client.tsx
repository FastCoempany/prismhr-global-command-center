"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import styles from "./command-center.module.css";
import {
  archiveThread,
  deleteTouch,
  logTouch,
  markReplied,
  markResponded,
} from "./today/actions";

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
          <button
            type="button"
            className={styles.editMsgReset}
            onClick={() => setVal(text)}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

// A date + time stamp rendered in the viewer's own timezone. The server renders
// UTC, then the client corrects after mount — suppressHydrationWarning covers
// the expected mismatch.
export function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState(() => fmtStamp(iso, "UTC"));
  useEffect(() => {
    // Deferred so the local-tz correction paints after hydration settles
    // (react-hooks/set-state-in-effect).
    const id = setTimeout(() => setText(fmtStamp(iso)), 0);
    return () => clearTimeout(id);
  }, [iso]);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}

// Time-only variant for the ledger's time column — "9:43a", never a date.
export function LocalClock({ iso }: { iso: string }) {
  const [text, setText] = useState(() => fmtClock(iso, "UTC"));
  useEffect(() => {
    const id = setTimeout(() => setText(fmtClock(iso)), 0);
    return () => clearTimeout(id);
  }, [iso]);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}

function fmtClock(iso: string, timeZone?: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t)
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone })
    .toLowerCase()
    .replace(" am", "a")
    .replace(" pm", "p");
}

function fmtStamp(iso: string, timeZone?: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  const day = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(timeZone ? { timeZone } : {}),
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  });
  return `${day} · ${time}`;
}

// Copy a partner-engagement line to the clipboard — the first, smallest step
// toward "automate copy to partners": today it's one click to paste into Slack.
export function CopyLine({
  text,
  label = "Copy the line",
}: {
  text: string;
  label?: string;
}) {
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

// One account row in the roundup composer: toggling it in or out rebuilds the
// message. "mark" flags why a row defaults to unchecked (already in motion, or
// parked) so the checkbox row explains itself.
export type RoundupSection = {
  id: string;
  name: string;
  bullet: string;
  on: boolean;
  mark: "" | "motion" | "parked";
};

// One control that does both jobs: shows the exact opener (editable + copyable),
// and logs the contact — capturing what you actually sent and arming the next
// check-in (later today or tomorrow, never a weekend). Once contacted it shows
// when it was sent, when the check-in lands, a "They replied" close, an Undo,
// and "+ New outreach" to start the next thread (history is kept server-side).
export function ContactControl({
  subjectKey,
  kind,
  label,
  detail = "",
  defaultMessage,
  sentLabel = "Mark contacted ✓",
  editLabel = "Edit & copy the message",
  doneText = "Contacted",
  status = "none",
  contactedLabel,
  followUpLabel,
  draftHref,
  sections,
  frame,
}: {
  subjectKey: string;
  kind: "partner" | "account";
  label: string;
  detail?: string;
  defaultMessage: string;
  sentLabel?: string;
  editLabel?: string;
  doneText?: string;
  // The roundup lifecycle: none (fresh — current-research roundup ready) →
  // awaiting (sent) → replied (they answered) → responded (you answered back)
  // → archive resets to none with history kept.
  status?: "none" | "awaiting" | "replied" | "responded";
  contactedLabel?: string; // short date the contact was logged
  followUpLabel?: string; // short date of the next check-in
  draftHref?: string; // link to the Claude drafting desk for this thread
  // The roundup composer: per-account toggles that rebuild the message from
  // opener + checked bullets + closer. In-motion/parked rows default off.
  sections?: RoundupSection[];
  frame?: { opener: string; closer: string };
}) {
  const [val, setVal] = useState(defaultMessage);
  const [copied, setCopied] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set((sections ?? []).filter((s) => s.on).map((s) => s.id)),
  );
  const ref = useRef<HTMLTextAreaElement>(null);

  const composeFrom = (ids: Set<string>) => {
    if (!sections || !frame) return defaultMessage;
    const bullets = sections.filter((s) => ids.has(s.id)).map((s) => s.bullet);
    return bullets.length
      ? `${frame.opener}\n\n${bullets.join("\n")}\n\n${frame.closer}`
      : `${frame.opener}\n\n${frame.closer}`;
  };
  const toggleSection = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChecked(next);
    setVal(composeFrom(next));
  };

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

  // The outreach form (editor + when + send). Rendered directly before first
  // contact, and inside a "+ New outreach" disclosure after.
  const outreachForm = (submitLabel: string) => (
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
        {sections && sections.length > 0 && (
          <div className={styles.composerRow}>
            <span className={styles.composerHint}>
              In this roundup (toggling rebuilds the message):
            </span>
            {sections.map((s) => (
              <label
                key={s.id}
                className={`${styles.composerChk} ${
                  s.mark === "motion"
                    ? styles.composerMotion
                    : s.mark === "parked"
                      ? styles.composerParked
                      : ""
                }`}
                title={
                  s.mark === "motion"
                    ? `${s.name} is already in motion — left out by default`
                    : s.mark === "parked"
                      ? `${s.name} is parked — left out by default`
                      : s.name
                }
              >
                <input
                  type="checkbox"
                  checked={checked.has(s.id)}
                  onChange={() => toggleSection(s.id)}
                />
                {s.mark === "motion" ? "⚡ " : s.mark === "parked" ? "⏸ " : ""}
                {s.name}
              </label>
            ))}
          </div>
        )}
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
      <div className={styles.contactSendRow}>
        <label className={styles.contactWhen}>
          Check in
          <select name="when" defaultValue="tomorrow" aria-label="When to check in">
            <option value="today">later today</option>
            <option value="tomorrow">tomorrow</option>
          </select>
        </label>
        <ContactSubmit label={submitLabel} />
      </div>
    </form>
  );

  if (status !== "none") {
    const statusLine =
      status === "replied"
        ? `Replied ✓${contactedLabel ? ` · sent ${contactedLabel}` : ""} — your move`
        : status === "responded"
          ? `You replied ✓${followUpLabel ? ` · check-in ${followUpLabel}` : ""} — their move`
          : `${doneText} ✓${contactedLabel ? ` · sent ${contactedLabel}` : ""}${
              followUpLabel ? ` · check-in ${followUpLabel}` : ""
            }`;
    return (
      <div className={styles.contactDone}>
        <div className={styles.contactDoneRow}>
          <span className={styles.contactDoneText}>{statusLine}</span>
          {(status === "awaiting" || status === "responded") && (
            <form action={markReplied}>
              <input type="hidden" name="subjectKey" value={subjectKey} />
              <button className={styles.contactRepliedBtn}>They replied ✓</button>
            </form>
          )}
          {status === "replied" && (
            <form action={markResponded}>
              <input type="hidden" name="subjectKey" value={subjectKey} />
              <button className={styles.contactRepliedBtn}>I replied ✓</button>
            </form>
          )}
          {(status === "replied" || status === "responded") && (
            <form action={archiveThread}>
              <input type="hidden" name="subjectKey" value={subjectKey} />
              <button
                className={styles.mvUndoBtn}
                title="Close the thread — history stays in the Partner Room; the card resets to a fresh roundup from current research"
              >
                Archive thread ✓
              </button>
            </form>
          )}
          {status === "awaiting" && (
            <form action={deleteTouch}>
              <input type="hidden" name="subjectKey" value={subjectKey} />
              <button className={styles.mvUndoBtn}>Undo</button>
            </form>
          )}
          {draftHref && status === "replied" && (
            <a href={draftHref} className={styles.contactDraftLink}>
              ✍ Draft the reply →
            </a>
          )}
        </div>
        <details className={styles.contactAgain}>
          <summary className={styles.contactSummary}>＋ New outreach</summary>
          {outreachForm("Log new outreach ✓")}
        </details>
      </div>
    );
  }

  return outreachForm(sentLabel);
}
