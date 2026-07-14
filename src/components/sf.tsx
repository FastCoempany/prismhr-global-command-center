"use client";

import { useState } from "react";
import { sfAccountUrl, isRealSfId } from "@/lib/salesforce";
import styles from "./sf.module.css";

// The exact "check before / update after" wording, tuned to where you are. Keep
// it concrete so it reads as a real step, not decoration.
const COPY: Record<string, { lead: string; text: string }> = {
  standing: {
    lead: "Salesforce discipline",
    text: "Every account touch runs through Salesforce: check it before you act, update it after. Before you reach out to any partner about an account, its current state comes from SF — not memory, not this app.",
  },
  "before-outreach": {
    lead: "Salesforce first",
    text: "Before you message the partner: open this account in Salesforce and check recent activity, open cases, notes, and any contract/renewal dates. Log the outreach back in SF right after.",
  },
  kickoff: {
    lead: "Salesforce first",
    text: "Check Salesforce on each teed-up account before you send — recent activity, notes, open items — then log each touch in SF after.",
  },
  followup: {
    lead: "Check Salesforce",
    text: "Look in Salesforce for anything new since you last reached out (a reply, a case, an activity) before you nudge — and update the record after.",
  },
  account: {
    lead: "Salesforce = system of record",
    text: "Check Salesforce before you act on this account, and update it (note / activity / fields) after. The app is your operating layer; SF is the truth.",
  },
  triage: {
    lead: "Check Salesforce",
    text: "Before you seed or work this, check its current status and notes in Salesforce so you're not acting on stale data.",
  },
  dashboard: {
    lead: "Keep Salesforce in sync",
    text: "As this deal moves, update the account in Salesforce and log a note — the board is your view, SF is the record.",
  },
};

// A copyable Salesforce id (fallback when no instance URL / deep link).
function SfId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={styles.copy}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(id);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? "Copied ✓" : `Copy SF ID (${id.slice(0, 8)}…)`}
    </button>
  );
}

// A deep-link to the account in Salesforce, or a copyable id, or (for synthetic
// ids) a note that there's no SF record yet.
export function SfLink({ id, name }: { id: string; name?: string }) {
  const url = sfAccountUrl(id);
  if (url) {
    return (
      <a className={styles.link} href={url} target="_blank" rel="noreferrer">
        Open {name ? `${name} ` : ""}in Salesforce ↗
      </a>
    );
  }
  if (isRealSfId(id)) return <SfId id={id} />;
  return (
    <span className={styles.inline}>
      No Salesforce record on file yet — create/link one
    </span>
  );
}

// The checkpoint notation — a tiny ⟳SF micro-badge. Inconspicuous but always
// there; the full "check before, log after" wording lives in the tooltip, and
// a deep link rides along when an account id is in hand. (`strong` is accepted
// for call-site compatibility but no longer changes the size — the long banner
// treatment is retired.)
export function SfCheckpoint({
  when,
  id,
  name,
}: {
  when: keyof typeof COPY;
  id?: string;
  name?: string;
  strong?: boolean;
}) {
  const c = COPY[when];
  return (
    <span className={styles.mini} title={`${c.lead} — ${c.text}`}>
      <span className={styles.miniBadge}>⟳ SF</span>
      {id ? <SfLink id={id} name={name} /> : null}
    </span>
  );
}
