"use client";

// "Ask next" — the ≤3 questions worth asking this account right now, rendered
// wherever the account is being worked (dashboard card, focus popover).
// drum copies the exact roundup-voice sentence; ✓ retires the question for
// this account (asknext-done:). Footer carries the research loop: copy the
// built prompt, open claude.ai, paste the answer back as a note.

import { useState } from "react";
import Link from "next/link";
import { CLAUDE_NEW_URL } from "@/lib/intel/research";
import { askNextDone } from "./actions";
import styles from "./ask-next.module.css";

export type AskNextQ = {
  id: string;
  question: string;
  why: string;
  drumLine: string;
};

function CopyBtn({
  payload,
  label,
  title,
  className,
}: {
  payload: string;
  label: string;
  title?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className ?? styles.btn}
      title={title ?? payload}
      onClick={() => {
        void navigator.clipboard.writeText(payload);
        setCopied(true);
        setTimeout(() => setCopied(false), 1400);
      }}
    >
      {copied ? "✓ copied" : label}
    </button>
  );
}

export function AskNext({
  accountId,
  questions,
  canWrite,
  returnTo,
  research,
}: {
  accountId: string;
  questions: AskNextQ[];
  canWrite: boolean;
  returnTo: string; // "/" | "/today" | "/playbook" | "/room"
  research?: string; // pre-built research prompt for this account
}) {
  if (questions.length === 0) return null;
  const bcHref = accountId
    ? `/playbook?account=${encodeURIComponent(accountId)}`
    : "/playbook";
  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.cap}>Ask next</span>
        <Link href={bcHref} className={styles.all}>
          all ▸
        </Link>
      </div>
      {questions.map((q) => (
        <div key={q.id} className={styles.row}>
          <span className={styles.q} title={q.why}>
            {q.question}
          </span>
          <span className={styles.info} title={q.why}>
            ⓘ
          </span>
          <CopyBtn payload={q.drumLine} label="drum" title={q.drumLine} />
          {canWrite && (
            <form action={askNextDone} className={styles.inline}>
              <input type="hidden" name="accountId" value={accountId} />
              <input type="hidden" name="questionId" value={q.id} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button className={styles.btn} title="Asked — retire this question">
                ✓
              </button>
            </form>
          )}
        </div>
      ))}
      {research && (
        <div className={styles.foot}>
          <CopyBtn
            payload={research}
            label="📋 Research"
            title="Copy the research prompt"
          />
          <a
            href={CLAUDE_NEW_URL}
            target="_blank"
            rel="noreferrer"
            className={styles.all}
          >
            open claude.ai ↗
          </a>
        </div>
      )}
    </div>
  );
}
