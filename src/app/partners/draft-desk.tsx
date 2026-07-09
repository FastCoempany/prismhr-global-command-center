"use client";

import { useState } from "react";
import { draftFollowUp, getFollowUpPrompt, type DraftResult } from "./actions";
import type { DraftRecipient } from "@/lib/claude/prompt";
import styles from "../command-center.module.css";

// The Claude drafting desk on a partner's room card. Two forks:
//   1. "From app intel" — assembles everything the app knows (the roundup you
//      sent, thread history, per-account worked notes, research) and drafts the
//      follow-up from that alone.
//   2. Paste box — drop in anything (their reply email, call notes); it rides on
//      top of the same app intel.
// Two output paths: with ANTHROPIC_API_KEY configured on the server the draft
// generates in-app; without it, one click copies the fully-assembled prompt and
// opens claude.ai, where your subscription does the writing.

export function DraftDesk({
  partner,
  recipients,
}: {
  partner: string;
  recipients: DraftRecipient[]; // partner first, then account contacts
}) {
  const [recipientIx, setRecipientIx] = useState(0);
  const [customName, setCustomName] = useState("");
  const [pasted, setPasted] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<"draft" | "copy" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const CUSTOM = recipients.length;
  const recipient: DraftRecipient =
    recipientIx === CUSTOM
      ? { name: customName || "the contact", role: "contact (my note below says who)" }
      : recipients[recipientIx];

  const onDraft = async () => {
    setBusy("draft");
    setNotice(null);
    const res: DraftResult = await draftFollowUp(partner, recipient, pasted);
    if (res.ok) {
      setDraft(res.draft);
      setNotice("Draft generated — edit below, then copy.");
    } else if (res.reason === "no-key") {
      setNotice(
        "No ANTHROPIC_API_KEY configured — use “Copy prompt & open claude.ai” instead (your subscription does the writing), or add the key in Vercel to draft in-app.",
      );
    } else {
      setNotice(
        `Couldn't draft: ${res.detail ?? "unknown error"}. Try the copy-prompt path.`,
      );
    }
    setBusy(null);
  };

  const onCopyPrompt = async () => {
    setBusy("copy");
    setNotice(null);
    try {
      const prompt = await getFollowUpPrompt(partner, recipient, pasted);
      await navigator.clipboard.writeText(prompt);
      window.open("https://claude.ai/new", "_blank", "noopener");
      setNotice("Prompt copied ✓ — paste it into the claude.ai tab that just opened.");
    } catch {
      setNotice("Couldn't copy the prompt — try again.");
    }
    setBusy(null);
  };

  return (
    <details className={styles.desk}>
      <summary className={styles.deskSummary}>
        ✍ Drafting desk — have Claude write the follow-up
      </summary>
      <div className={styles.deskBody}>
        <label className={styles.deskField}>
          <span>To</span>
          <select
            value={recipientIx}
            onChange={(e) => setRecipientIx(Number(e.target.value))}
            aria-label="Recipient"
          >
            {recipients.map((r, i) => (
              <option key={i} value={i}>
                {r.name} — {r.role}
              </option>
            ))}
            <option value={CUSTOM}>Someone else…</option>
          </select>
          {recipientIx === CUSTOM && (
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Name (say who they are in the context box)"
              aria-label="Custom recipient"
            />
          )}
        </label>

        <label className={styles.deskField}>
          <span>Paste anything (their reply, call notes — optional; unlimited)</span>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={5}
            placeholder="Fork 2: paste context here. Leave empty for Fork 1 — the draft builds from the app's to-date intel alone (thread, notes, research)."
          />
        </label>

        <div className={styles.deskActions}>
          <button
            type="button"
            className={styles.deskDraftBtn}
            onClick={onDraft}
            disabled={busy !== null}
          >
            {busy === "draft" ? "Drafting…" : "⚡ Draft in-app"}
          </button>
          <button
            type="button"
            className={styles.deskCopyBtn}
            onClick={onCopyPrompt}
            disabled={busy !== null}
          >
            {busy === "copy" ? "Assembling…" : "⧉ Copy prompt & open claude.ai"}
          </button>
        </div>

        {notice && <p className={styles.deskNotice}>{notice}</p>}

        {draft && (
          <div className={styles.deskOut}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={10}
              aria-label="Generated draft"
            />
            <button
              type="button"
              className={styles.copyLine}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(draft);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "Copied ✓" : "Copy draft"}
            </button>
          </div>
        )}
      </div>
    </details>
  );
}
