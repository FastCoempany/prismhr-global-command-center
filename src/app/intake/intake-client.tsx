"use client";

// The Intake work surface: paste box → live parse preview → pick account →
// file. Plus the bookmarklet installer (drag to bookmarks bar); its link is
// built client-side from location.origin and attached via a ref because React
// (rightly) refuses javascript: hrefs in JSX.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { parseSfTimeline, type TimelineEntry } from "@/lib/sf-timeline";
import { fileTimeline } from "./actions";
import styles from "../command-center.module.css";

type Acct = { id: string; name: string };

// Grabs the timeline region's text (scrolled-away content included — it's all
// in the page), copies it, and opens Intake in a new tab.
function bookmarkletFor(origin: string): string {
  const js = `(async()=>{const q=['.slds-timeline','[class*="ActivityTimeline"]','[class*="timeline"]','main'];let el=null;for(const s of q){try{el=document.querySelector(s)}catch(e){}if(el&&el.innerText&&el.innerText.length>200)break}const t=(el||document.body).innerText;try{await navigator.clipboard.writeText(t)}catch(e){window.prompt('Auto-copy was blocked. Press Ctrl+C, then paste into Intake:',t.slice(0,4000))}window.open('${origin}/intake','_blank')})()`;
  return `javascript:${js}`;
}

export function IntakeClient({ accounts }: { accounts: Acct[] }) {
  const [raw, setRaw] = useState("");
  const [accountId, setAccountId] = useState("");
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ filed: number; account: string } | null>(null);
  const bmRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    bmRef.current?.setAttribute("href", bookmarkletFor(window.location.origin));
  }, []);

  const entries = useMemo(() => parseSfTimeline(raw), [raw]);
  const chosen = entries.filter((_, i) => !skipped.has(i));

  const toggle = (i: number) =>
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const file = async () => {
    if (!accountId || chosen.length === 0 || busy) return;
    setBusy(true);
    const r = await fileTimeline(accountId, chosen);
    setBusy(false);
    if (r.ok) {
      setResult({
        filed: r.filed,
        account: accounts.find((a) => a.id === accountId)?.name ?? "account",
      });
      setRaw("");
      setSkipped(new Set());
    }
  };

  const pasteFromClipboard = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setRaw(t);
    } catch {
      // clipboard permission denied — the textarea still takes a manual paste
    }
  };

  return (
    <div className={styles.inkWrap}>
      <section className={styles.inkPane}>
        <div className={styles.inkBar}>
          <button
            type="button"
            className={styles.atcBtn}
            onClick={pasteFromClipboard}
            title="Reads your clipboard (the bookmarklet just filled it)"
          >
            Paste from clipboard
          </button>
          <span className={styles.muted}>
            …or Ctrl+V into the box: select the SF activity timeline, copy, paste.
          </span>
        </div>
        <textarea
          className={styles.inkPaste}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={`Paste the Salesforce activity timeline here…\n\nAnything shaped like\n  Subject line\n  Someone to Someone Else + 2 others\n  3:47 PM | Jul 21\n  body text…\nbecomes a dated entry below.`}
          rows={10}
        />

        {raw.trim() && (
          <div className={styles.inkBar}>
            <b>
              {entries.length === 0
                ? "Nothing recognized yet — paste the timeline portion of the page."
                : `${entries.length} entr${entries.length === 1 ? "y" : "ies"} found · ${chosen.length} selected`}
            </b>
          </div>
        )}

        {entries.map((e, i) => (
          <PreviewRow key={i} e={e} on={!skipped.has(i)} toggle={() => toggle(i)} />
        ))}

        {entries.length > 0 && (
          <div className={styles.inkBar}>
            <select
              className={styles.inkSelect}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              aria-label="File to account"
            >
              <option value="">File to account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={styles.atcBtn}
              disabled={!accountId || chosen.length === 0 || busy}
              onClick={file}
            >
              {busy ? "Filing…" : `File ${chosen.length} to account`}
            </button>
          </div>
        )}

        {result && (
          <p className={styles.inkDone}>
            Filed {result.filed} entr{result.filed === 1 ? "y" : "ies"} to{" "}
            <b>{result.account}</b> — they&apos;re in the account&apos;s notes now.{" "}
            <Link href="/accounts">See accounts →</Link>
          </p>
        )}
      </section>

      <aside className={styles.inkAside}>
        <h2 className={styles.h2}>The bookmarklet</h2>
        <p className={styles.muted}>
          Drag this button onto your browser&apos;s bookmarks bar (one time). Then, on any
          Salesforce account/contact page: click it — the timeline is captured to your
          clipboard and this page opens; hit “Paste from clipboard”, pick the account,
          file.
        </p>
        <a
          ref={bmRef}
          className={styles.inkBookmarklet}
          title="Drag me to the bookmarks bar — don't click here"
        >
          ⚡ Grab SF activity
        </a>
        <p className={styles.mutedSm}>
          It reads only the page you&apos;re looking at, at the moment you click, in your
          own session. Content in inner scrollboxes comes through whole; entries behind a
          “Load more” need loading first. If your browser blocks the auto-copy, it falls
          back to a select-and-copy prompt — and plain copy-paste into the box always
          works.
        </p>
      </aside>
    </div>
  );
}

function PreviewRow({
  e,
  on,
  toggle,
}: {
  e: TimelineEntry;
  on: boolean;
  toggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const glyph = e.kind === "email" ? "✉" : e.kind === "call" ? "☎" : "✔";
  return (
    <div className={`${styles.inkRow} ${on ? "" : styles.inkRowOff}`}>
      <input type="checkbox" checked={on} onChange={toggle} aria-label="Include" />
      <span className={styles.inkGlyph}>{glyph}</span>
      <span className={styles.inkWhen}>
        {[e.dayLabel, e.timeLabel].filter(Boolean).join(" · ") || "no date"}
      </span>
      <span className={styles.inkMain} onClick={() => setExpanded((v) => !v)}>
        <b>{e.subject || "(no subject)"}</b> — {e.from} → {e.to}
        {e.others ? ` +${e.others}` : ""}
        {e.body && (
          <span className={expanded ? styles.inkBodyFull : styles.inkBodyClip}>
            {expanded ? e.body : e.body.slice(0, 140)}
          </span>
        )}
      </span>
    </div>
  );
}
