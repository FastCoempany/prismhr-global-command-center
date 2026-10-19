"use client";

// The letter on the stage (ship order 2026-10-19; CLAUDE.md, "The draft on
// the stage"): the move's note, drafted before the send band, edited in
// place, and sent through Outlook. Send is the stage's one orange move: it
// opens the draft in the mail client, stamps the move and leaves Send's
// marker until the sent copy comes back. During the send band the stage runs
// as a stack: S sends, E edits, N sets the move aside for now. The page keys
// the letter by its draft, so a fresh draft from the server opens a fresh
// pad, and a pad with edits keeps them until they save.

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { mailtoHref } from "@/lib/groundwork/stage-draft";
import { redraftStage, saveStageDraft, sendFromStage } from "./actions";
import styles from "./groundwork.module.css";

export type RunPip = "seen" | "sent" | "now" | "left";

export function StageLetter({
  accountId,
  mk,
  to,
  subject: subject0,
  body: body0,
  drafted,
  instruction,
  canWrite,
  nextHref,
  run,
  why,
  other,
}: {
  accountId: string;
  mk: string;
  to: { name: string; title: string; email: string };
  subject: string;
  body: string;
  /** Who drafted it and when, said plainly. */
  drafted: string;
  /** The quiet flag, said as what to do about it. "" when clear. */
  instruction: string;
  canWrite: boolean;
  /** The next move on the queue, for Not now and the run's N. */
  nextHref: string | null;
  /** The send band's run: the pips and whether the keys are live. */
  run: { on: boolean; pips: RunPip[]; sent: number; toggleHref: string } | null;
  /** "Why this note": the chips said plainly, and their doors. */
  why: ReactNode;
  /** The other ways to work the move (the Channel Ask). */
  other: ReactNode;
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(subject0);
  const [body, setBody] = useState(body0);
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const saved = useRef({ subject: subject0, body: body0 });
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const keep = () => {
    if (!canWrite) return;
    if (saved.current.subject === subject && saved.current.body === body) return;
    saved.current = { subject, body };
    start(() => saveStageDraft(accountId, mk, subject, body));
  };

  // A save in flight never holds Send back; only a send already going does.
  const sending = useRef(false);
  const send = () => {
    if (sending.current) return;
    sending.current = true;
    window.location.href = mailtoHref({ email: to.email, subject, body });
    if (!canWrite) {
      sending.current = false;
      return;
    }
    saved.current = { subject, body };
    setNote("Opened in Outlook. The move stamps when your sent copy comes back.");
    start(async () => {
      await sendFromStage(accountId, mk, subject, body);
      sending.current = false;
      router.refresh();
    });
  };

  const redraft = () => {
    if (!canWrite || pending) return;
    setNote("Drafting a fresh one. About a minute.");
    start(async () => {
      await redraftStage(accountId, mk);
      setNote("");
      router.refresh();
    });
  };

  // The run's keys, live only in the run and never while typing.
  useEffect(() => {
    if (!run?.on) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) {
        if (e.key === "Escape") t.blur();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        send();
      } else if (k === "e") {
        e.preventDefault();
        const el = bodyRef.current;
        el?.focus();
        el?.setSelectionRange(el.value.length, el.value.length);
      } else if (k === "n" && nextHref) {
        e.preventDefault();
        router.push(nextHref);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const key = (k: string) =>
    run?.on ? <span className={styles.letterKey}>{k}</span> : null;

  return (
    <div className={styles.letterWrap}>
      {run && (
        <div className={styles.runBar}>
          <span className={styles.runKick}>
            {run.on ? "The run" : "Drafted for the send band"}
          </span>
          <span className={styles.runPips} aria-hidden="true">
            {run.pips.map((p, i) => (
              <span key={i} className={`${styles.runPip} ${styles[`pip_${p}`]}`} />
            ))}
          </span>
          <span className={styles.runCount}>
            {run.sent} of {run.pips.length} sent
          </span>
          <a className={styles.runToggle} href={run.toggleHref}>
            {run.on ? "End the run" : "Run them"}
          </a>
        </div>
      )}
      <div className={styles.letter}>
        <div className={styles.letterRow}>
          <span className={styles.letterLabel}>To</span>
          <span className={styles.letterTo}>
            {to.name || "No name on file"}
            <small>
              {[to.title, to.email || "No address on file. Add it in Outlook."]
                .filter(Boolean)
                .join(" · ")}
            </small>
          </span>
        </div>
        <label className={styles.letterRow}>
          <span className={styles.letterLabel}>Subject</span>
          <input
            className={styles.letterSubject}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onBlur={keep}
            readOnly={!canWrite}
          />
        </label>
        <textarea
          ref={bodyRef}
          className={styles.letterBody}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onBlur={keep}
          readOnly={!canWrite}
          aria-label="The note"
          rows={Math.min(16, Math.max(7, body.split("\n").length + 1))}
        />
        <div className={styles.letterFoot}>
          <span className={styles.letterBy}>{drafted}</span>
          <span>Edits here carry to Outlook</span>
        </div>
      </div>
      {instruction && <p className={styles.letterFlag}>{instruction}</p>}
      <div className={styles.stgActs}>
        <button type="button" className={styles.btnAccent} onClick={send}>
          Send in Outlook{key("S")}
        </button>
        {canWrite && (
          <button
            type="button"
            className={styles.btn2nd}
            onClick={redraft}
            disabled={pending}
            title="Writes a fresh draft from the record. Your edits on this one are replaced."
          >
            Redraft
          </button>
        )}
        {other}
        {nextHref && (
          <a className={styles.btnQuiet} href={nextHref}>
            Not now{key("N")}
          </a>
        )}
      </div>
      {note && (
        <p className={styles.letterNote} role="status">
          {note}
        </p>
      )}
      {why}
    </div>
  );
}
