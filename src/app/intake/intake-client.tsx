"use client";

// The Intake work surface: paste box → live parse preview → pick account →
// file. Plus the bookmarklet installer (drag to bookmarks bar); its link is
// built client-side from location.origin and attached via a ref because React
// (rightly) refuses javascript: hrefs in JSX.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { parseSfTimeline, type TimelineEntry } from "@/lib/sf-timeline";
import { cleanWithAI, fileTimeline, fileTranscript } from "./actions";
import styles from "../command-center.module.css";

type Acct = { id: string; name: string };

// Grabs the timeline region's text (scrolled-away content included — it's all
// in the page), copies it, and opens Intake in a new tab.
function bookmarkletFor(origin: string): string {
  const js = `(async()=>{const q=['.slds-timeline','[class*="ActivityTimeline"]','[class*="timeline"]','main'];let el=null;for(const s of q){try{el=document.querySelector(s)}catch(e){}if(el&&el.innerText&&el.innerText.length>200)break}const t=(el||document.body).innerText;try{await navigator.clipboard.writeText(t)}catch(e){window.prompt('Auto-copy was blocked. Press Ctrl+C, then paste into Intake:',t.slice(0,4000))}window.open('${origin}/intake','_blank')})()`;
  return `javascript:${js}`;
}

// Grabs the open Outlook (web) conversation — the READING PANE only, never
// the message list (a wide grab would hoover other deals' inbox rows into
// whichever account gets picked). Reading-pane selectors are tried tightest
// first; if none hits, the grab refuses instead of falling back to the page.
function outlookBookmarkletFor(origin: string): string {
  const js = `(async()=>{const q=['#ReadingPaneContainerId','[aria-label="Reading Pane"]','div[role="main"] [role="list"]','div[role="main"]'];let el=null;for(const s of q){try{el=document.querySelector(s)}catch(e){}if(el&&el.innerText&&el.innerText.length>200)break;el=null}if(!el){alert('Open the conversation first — the reading pane is what gets captured.');return}const t='OUTLOOK THREAD - captured '+new Date().toLocaleString()+'\\n\\n'+el.innerText;try{await navigator.clipboard.writeText(t)}catch(e){window.prompt('Auto-copy was blocked. Press Ctrl+C, then paste into Intake:',t.slice(0,4000))}window.open('${origin}/intake','_blank')})()`;
  return `javascript:${js}`;
}

// Grabs the open Teams (web) chat or channel thread. Teams virtualises its
// message list — only what has actually rendered is in the DOM — so the grab
// scrolls the pane to the top a few times first, letting older messages load,
// then reads the list region. Tightest selectors first; a miss refuses rather
// than shipping the whole app chrome (rosters, nav, other chats) into a deal.
function teamsBookmarkletFor(origin: string): string {
  const js = `(async()=>{const sel=['[data-tid="message-pane-list-viewport"]','[data-tid="messagePaneList"]','[data-tid="chat-pane-list"]','[role="main"] [role="list"]','[data-tid="threadBodyContainer"]'];const find=()=>{for(const s of sel){let el=null;try{el=document.querySelector(s)}catch(e){}if(el&&el.innerText&&el.innerText.length>120)return el}return null};let el=find();if(!el){alert('Open the chat or channel thread first — Teams on the web only. The desktop app has no page for a bookmarklet to read.');return}const pane=(()=>{let p=el;for(let i=0;i<6&&p;i++){if(p.scrollHeight>p.clientHeight+40)return p;p=p.parentElement}return el})();const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));let last=-1;for(let i=0;i<8;i++){if(pane.scrollHeight===last)break;last=pane.scrollHeight;pane.scrollTop=0;await sleep(650)}el=find()||el;const t='TEAMS THREAD - '+document.title.replace(/ \\| Microsoft Teams.*$/,'')+' - captured '+new Date().toLocaleString()+'\\n\\n'+el.innerText;try{await navigator.clipboard.writeText(t)}catch(e){window.prompt('Auto-copy was blocked. Press Ctrl+C, then paste into Capture:',t.slice(0,4000))}window.open('${origin}/intake','_blank')})()`;
  return `javascript:${js}`;
}

export function IntakeClient({ accounts, ai }: { accounts: Acct[]; ai: boolean }) {
  const [raw, setRawState] = useState("");
  const [accountId, setAccountId] = useState("");
  const [skipped, setSkipped] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ filed: number; account: string } | null>(null);
  // Paste kind: SF timeline entries (parsed, many notes) or a meeting
  // transcript (files whole as one ☰ note, money-redacted, capped).
  const [kind, setKind] = useState<"timeline" | "transcript">("timeline");
  // AI-cleaned entries override the rule-based parse until the paste changes.
  const [aiEntries, setAiEntries] = useState<TimelineEntry[] | null>(null);
  const [aiSignals, setAiSignals] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const bmRef = useRef<HTMLAnchorElement>(null);
  const bmOutRef = useRef<HTMLAnchorElement>(null);
  const bmTeamsRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    bmRef.current?.setAttribute("href", bookmarkletFor(window.location.origin));
    bmOutRef.current?.setAttribute("href", outlookBookmarkletFor(window.location.origin));
    bmTeamsRef.current?.setAttribute("href", teamsBookmarkletFor(window.location.origin));
  }, []);

  // Any change to the paste invalidates a previous AI clean.
  const setRaw = (t: string) => {
    setRawState(t);
    setAiEntries(null);
    setAiSignals([]);
    setAiNote(null);
  };

  const parsed = useMemo(
    () => (kind === "timeline" ? parseSfTimeline(raw) : []),
    [raw, kind],
  );
  const entries = aiEntries ?? parsed;
  const chosen = entries.filter((_, i) => !skipped.has(i));

  const aiClean = async () => {
    if (!raw.trim() || aiBusy) return;
    setAiBusy(true);
    setAiNote(null);
    // try/finally: a rejected server action (platform duration kill, network
    // drop mid-await) must never wedge the button at "Cleaning…" forever.
    try {
      const r = await cleanWithAI(raw);
      if (r.ok) {
        setAiEntries(r.entries);
        setAiSignals(r.signals);
        setSkipped(new Set());
      } else {
        setAiNote(r.reason);
      }
    } catch {
      setAiNote("The clean didn't come back — try again, or file as ☰ transcript.");
    } finally {
      setAiBusy(false);
    }
  };

  const fileAsTranscript = async () => {
    if (!accountId || !raw.trim() || busy) return;
    setBusy(true);
    const r = await fileTranscript(accountId, raw);
    setBusy(false);
    if (r.ok) {
      setResult({
        filed: 1,
        account: accounts.find((x) => x.id === accountId)?.name ?? "account",
      });
      setRaw("");
    }
  };

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
    const head = raw.trimStart();
    const dialect = /^OUTLOOK THREAD\b/.test(head)
      ? "OL"
      : /^TEAMS THREAD\b/.test(head)
        ? "TM"
        : "SF";
    const r = await fileTimeline(accountId, chosen, dialect);
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
          <label className={styles.toggle}>
            <input
              type="radio"
              name="pasteKind"
              checked={kind === "timeline"}
              onChange={() => setKind("timeline")}
            />
            SF timeline
          </label>
          <label className={styles.toggle}>
            <input
              type="radio"
              name="pasteKind"
              checked={kind === "transcript"}
              onChange={() => setKind("transcript")}
            />
            ☰ Transcript / meeting notes
          </label>
          <button
            type="button"
            className={styles.atcBtn}
            onClick={pasteFromClipboard}
            title="Reads your clipboard (the bookmarklet just filled it)"
          >
            Paste from clipboard
          </button>
          {kind === "timeline" && (
            <span className={styles.muted}>
              …or Ctrl+V into the box: select the SF activity timeline, copy, paste.
            </span>
          )}
        </div>
        <textarea
          className={styles.inkPaste}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={
            kind === "timeline"
              ? `Paste the Salesforce activity timeline here…\n\nAnything shaped like\n  Subject line\n  Someone to Someone Else + 2 others\n  3:47 PM | Jul 21\n  body text…\nbecomes a dated entry below.`
              : `Paste meeting notes or a call transcript here…\n\nIt files whole as ONE ☰ note on the account (money figures stripped, capped at 6,000 characters).`
          }
          rows={10}
        />

        {kind === "transcript" && raw.trim() && (
          <div className={styles.inkBar}>
            <select
              className={styles.inkSelect}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              aria-label="File transcript to account"
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
              disabled={!accountId || !raw.trim() || busy}
              onClick={fileAsTranscript}
            >
              {busy ? "Filing…" : "File as ☰ transcript"}
            </button>
          </div>
        )}

        {kind === "timeline" && raw.trim() && (
          <div className={styles.inkBar}>
            <b>
              {aiEntries
                ? `✨ AI-cleaned — ${entries.length} entr${entries.length === 1 ? "y" : "ies"} · ${chosen.length} selected`
                : entries.length === 0
                  ? "Nothing recognized — this page's timeline text is shaped differently."
                  : `${entries.length} entr${entries.length === 1 ? "y" : "ies"} found · ${chosen.length} selected`}
            </b>
            {ai && !aiEntries && (
              <button
                type="button"
                className={styles.atcBtn}
                disabled={aiBusy}
                onClick={aiClean}
                title="Sends this paste to Claude once, server-side — comes back as clean dated entries plus signal flags. Review before filing."
              >
                {aiBusy ? "Cleaning…" : "✨ Clean with AI"}
              </button>
            )}
            {aiEntries && (
              <button
                type="button"
                className={styles.atcBtn}
                onClick={() => {
                  setAiEntries(null);
                  setAiSignals([]);
                  setSkipped(new Set());
                }}
              >
                Back to rule-based parse
              </button>
            )}
            {entries.length === 0 && !aiBusy && raw.trim().length > 120 && (
              <button
                type="button"
                className={styles.atcBtn}
                onClick={() => setKind("transcript")}
                title="Nothing is lost — file the whole paste as one ☰ note on the account instead"
              >
                File it whole as ☰ transcript instead →
              </button>
            )}
          </div>
        )}

        {kind === "timeline" && aiNote && <p className={styles.mutedSm}>{aiNote}</p>}

        {kind === "timeline" && aiSignals.length > 0 && (
          <div className={styles.inkRow}>
            <span className={styles.inkGlyph}>⚑</span>
            <span className={styles.inkMain}>
              {aiSignals.map((s, i) => (
                <span key={i}>
                  {s}
                  {i < aiSignals.length - 1 ? " · " : ""}
                </span>
              ))}
            </span>
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
        <h2 className={styles.h2}>The bookmarklets</h2>
        <p className={styles.muted}>
          Drag either button onto your browser&apos;s bookmarks bar (one time), then click
          it on the page you&apos;re reading — the capture lands on your clipboard and
          this page opens; hit “Paste from clipboard”, pick the account, file.
        </p>
        <a
          ref={bmOutRef}
          className={styles.inkBookmarklet}
          title="Drag me to the bookmarks bar — don't click here"
        >
          ✉ Grab Outlook thread
        </a>
        <p className={styles.mutedSm}>
          For Outlook on the web: open the conversation you want — the day&apos;s live
          thread — and <b>expand the messages that matter</b> (a collapsed message ships
          only its header, and no cleaner can read words that weren&apos;t captured). The
          whole reading pane comes along, senders and timestamps included.
        </p>
        <a
          ref={bmRef}
          className={styles.inkBookmarklet}
          title="Drag me to the bookmarks bar — don't click here"
        >
          ⚡ Grab SF activity
        </a>
        <p className={styles.mutedSm}>
          For a Salesforce account/contact page&apos;s activity timeline. Use SF&apos;s
          “Expand All” first where you can — collapsed previews don&apos;t travel.
        </p>
        <a
          ref={bmTeamsRef}
          className={styles.inkBookmarklet}
          title="Drag me to the bookmarks bar — don't click here"
        >
          ☰ Grab Teams thread
        </a>
        <p className={styles.mutedSm}>
          For Teams <b>on the web</b> (teams.microsoft.com) — the desktop app isn&apos;t a
          browser page, so nothing can read it there. Open the chat or channel thread and
          click the bookmarklet: it scrolls the pane up a few times so Teams loads the
          older messages it hides, then takes the whole conversation. Very long histories
          may need a second run. Selecting and copying by hand still works too — the
          cleaner reads the chat dialect either way: speakers stay named, the noise dies,
          decisions and owed items survive.
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
