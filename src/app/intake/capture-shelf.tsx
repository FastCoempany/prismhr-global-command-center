"use client";

// Capture, the shelf. Three grabs sit side by side, equal weight, each one
// stating what it takes and what it refuses — a capture that quietly grabs the
// wrong region is worse than one that declines, so the refusal is printed where
// the operator reads it, not buried in a comment.
//
// The paste workflow that used to live here is gone on purpose: filing happens
// at the account, in the ⚡ box on its row. This page installs tools and
// answers "what does this one actually see"; it never files anything.
//
// The bookmarklet hrefs are attached via refs — React (rightly) refuses a
// javascript: href in JSX — and are built from location.origin at mount.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PayrollForm } from "./payroll-form";
import styles from "../command-center.module.css";

type Acct = { id: string; name: string };

// Grabs the Salesforce timeline region's text (scrolled-away content included —
// it's all in the page), copies it, and opens Capture in a new tab.
function sfBookmarklet(origin: string): string {
  const js = `(async()=>{const q=['.slds-timeline','[class*="ActivityTimeline"]','[class*="timeline"]','main'];let el=null;for(const s of q){try{el=document.querySelector(s)}catch(e){}if(el&&el.innerText&&el.innerText.length>200)break}const t=(el||document.body).innerText;try{await navigator.clipboard.writeText(t)}catch(e){window.prompt('Auto-copy was blocked. Press Ctrl+C, then paste onto the account:',t.slice(0,4000))}window.open('${origin}/room','_blank')})()`;
  return `javascript:${js}`;
}

// Grabs the open Outlook (web) conversation — the READING PANE only, never the
// message list (a wide grab would hoover other deals' inbox rows into whichever
// account gets picked). Selectors tightest first; a miss refuses.
function outlookBookmarklet(origin: string): string {
  const js = `(async()=>{const q=['#ReadingPaneContainerId','[aria-label="Reading Pane"]','div[role="main"] [role="list"]','div[role="main"]'];let el=null;for(const s of q){try{el=document.querySelector(s)}catch(e){}if(el&&el.innerText&&el.innerText.length>200)break;el=null}if(!el){alert('Open the conversation first — the reading pane is what gets captured.');return}const t='OUTLOOK THREAD - captured '+new Date().toLocaleString()+'\\n\\n'+el.innerText;try{await navigator.clipboard.writeText(t)}catch(e){window.prompt('Auto-copy was blocked. Press Ctrl+C, then paste onto the account:',t.slice(0,4000))}window.open('${origin}/room','_blank')})()`;
  return `javascript:${js}`;
}

// Grabs the open Teams (web) chat or channel thread. Teams virtualises its
// message list — only what has rendered is in the DOM — so the grab scrolls the
// pane to the top a few times first, letting older messages load, then reads.
function teamsBookmarklet(origin: string): string {
  const js = `(async()=>{const sel=['[data-tid="message-pane-list-viewport"]','[data-tid="messagePaneList"]','[data-tid="chat-pane-list"]','[role="main"] [role="list"]','[data-tid="threadBodyContainer"]'];const find=()=>{for(const s of sel){let el=null;try{el=document.querySelector(s)}catch(e){}if(el&&el.innerText&&el.innerText.length>120)return el}return null};let el=find();if(!el){alert('Open the chat or channel thread first — Teams on the web only. The desktop app has no page for a bookmarklet to read.');return}const pane=(()=>{let p=el;for(let i=0;i<6&&p;i++){if(p.scrollHeight>p.clientHeight+40)return p;p=p.parentElement}return el})();const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));let last=-1;for(let i=0;i<8;i++){if(pane.scrollHeight===last)break;last=pane.scrollHeight;pane.scrollTop=0;await sleep(650)}el=find()||el;const t='TEAMS THREAD - '+document.title.replace(/ \\| Microsoft Teams.*$/,'')+' - captured '+new Date().toLocaleString()+'\\n\\n'+el.innerText;try{await navigator.clipboard.writeText(t)}catch(e){window.prompt('Auto-copy was blocked. Press Ctrl+C, then paste onto the account:',t.slice(0,4000))}window.open('${origin}/room','_blank')})()`;
  return `javascript:${js}`;
}

// Grabs the WHOLE Sales Navigator accounts list — company names, buyer-intent
// levels, activity counts, alerts — not just the rows on screen. LinkedIn
// virtualises the list (only rows near your scroll position exist in the page)
// and paginates it, so the grab walks the list itself: scroll to the bottom
// collecting rows, click Next, repeat, deduping as it goes, until there is no
// next page. 118 accounts takes under a minute; keep the tab in front. Refuses
// anything that isn't a Sales Navigator page. Long walks outlive the browser's
// copy permission, so a navy "Copy N rows" button appears when the walk ends —
// one click copies everything and opens the paste target. No API, no crawling —
// only the list the operator opened, read the way scrolling would read it.
//
// Destination: this capture is a MULTI-account snapshot, so it must never land
// in an account's ⚡ box (single-account binding; the misfile guard would fight
// it). It feeds the prospecting room's intent drop; until that room ships, it
// opens the Intranet, whose capture stores the snapshot whole.
function salesNavBookmarklet(origin: string): string {
  const js = `(async()=>{if(location.hostname.indexOf('linkedin.com')<0||location.pathname.indexOf('/sales')<0){alert('Open the Sales Navigator Accounts list first - that dashboard is what gets captured.');return}const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));const rowsOf=()=>{let els=document.querySelectorAll('main table tbody tr');if(els.length<2)els=document.querySelectorAll('[role="table"] [role="row"]');if(els.length<2)els=document.querySelectorAll('main li');return els};const seen=new Set();const out=[];const collect=()=>{rowsOf().forEach((r)=>{const x=(r.innerText||'').replace(/\\s+$/,'');if(x&&x.length>10&&!seen.has(x)){seen.add(x);out.push(x)}})};const pane=(()=>{let p=document.querySelector('main')||document.body;for(let i=0;i<6&&p;i++){if(p.scrollHeight>p.clientHeight+80)return p;p=p.parentElement}return document.scrollingElement||document.body})();for(let page=0;page<20;page++){let last=-1;for(let i=0;i<24;i++){collect();const done=pane.scrollTop+pane.clientHeight>=pane.scrollHeight-4;if(done&&pane.scrollHeight===last)break;last=pane.scrollHeight;pane.scrollTop=pane.scrollHeight;await sleep(600)}collect();const next=document.querySelector('button[aria-label="Next"]:not([disabled]),button[aria-label="Next page"]:not([disabled])');if(!next)break;next.click();await sleep(1500);pane.scrollTop=0;await sleep(500)}if(out.length<2){alert('Nothing readable found - is the Accounts list on screen?');return}const t='SALESNAV ACCOUNTS - captured '+new Date().toLocaleString()+' - '+out.length+' rows collected\\n\\n'+out.join('\\n\\n----\\n\\n');let ok=false;try{await navigator.clipboard.writeText(t);ok=true}catch(e){}if(ok){window.open('${origin}/intranet','_blank');return}const d=document.createElement('button');d.textContent='Copy '+out.length+' rows and open the paste target';d.style.cssText='position:fixed;top:16px;right:16px;z-index:2147483647;background:#0a1c40;color:#fff;border:0;padding:14px 16px;border-radius:8px;font:600 13px sans-serif;cursor:pointer;box-shadow:0 8px 30px rgba(10,28,64,.35)';d.onclick=async()=>{try{await navigator.clipboard.writeText(t)}catch(e){window.prompt('Copy blocked. Press Ctrl+C:',t.slice(0,4000))}d.remove();window.open('${origin}/intranet','_blank')};document.body.appendChild(d)})()`;
  return `javascript:${js}`;
}

type Tool = {
  key: "outlook" | "sf" | "teams" | "salesnav";
  glyph: string;
  name: string;
  where: string;
  label: string;
  takes: string;
  refuses: string;
  build: (origin: string) => string;
};

const TOOLS: Tool[] = [
  {
    key: "outlook",
    glyph: "✉",
    name: "Outlook thread",
    where: "web",
    label: "✉ Grab Outlook thread",
    takes:
      "The whole reading pane — every expanded message, senders and timestamps with it.",
    refuses:
      "The inbox list. A collapsed message ships only its header, so expand what matters first.",
    build: outlookBookmarklet,
  },
  {
    key: "sf",
    glyph: "⚡",
    name: "Salesforce activity",
    where: "lightning",
    label: "⚡ Grab SF activity",
    takes:
      "The activity timeline entire, including the entries that have scrolled out of view.",
    refuses:
      "Collapsed previews — they travel as headers only. Hit SF's “Expand All” where the page offers it.",
    build: sfBookmarklet,
  },
  {
    key: "teams",
    glyph: "☰",
    name: "Teams thread",
    where: "web only",
    label: "☰ Grab Teams thread",
    takes:
      "The chat or channel thread — it scrolls the pane up first so Teams loads what it was hiding.",
    refuses:
      "The desktop app, which isn't a page anything can read. A very long history may need a second run.",
    build: teamsBookmarklet,
  },
  {
    key: "salesnav",
    glyph: "▤",
    name: "Sales Nav intent",
    where: "accounts list",
    label: "▤ Grab Sales Nav intent",
    takes:
      "The whole accounts list — it scrolls and pages through every row itself (118 accounts in under a minute), collecting names, intent levels, activity counts, and alerts. Lands whole in the Intranet, never on one account's row.",
    refuses:
      "Any page that isn't Sales Navigator. Keep the tab in front while it walks the list; a navy button hands you the copy when it finishes.",
    build: salesNavBookmarklet,
  },
];

export function CaptureShelf({ accounts }: { accounts: Acct[] }) {
  const refs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    for (const t of TOOLS) {
      refs.current[t.key]?.setAttribute("href", t.build(window.location.origin));
    }
  }, []);

  return (
    <>
      <div className={styles.shelf}>
        {TOOLS.map((t) => (
          <article key={t.key} className={styles.tool}>
            <div className={styles.toolTop}>
              <span
                className={styles.toolGlyph}
                style={t.key === "sf" ? { color: "var(--orange)" } : undefined}
                aria-hidden="true"
              >
                {t.glyph}
              </span>
              <span className={styles.toolName}>{t.name}</span>
              <span className={styles.toolWhere}>{t.where}</span>
            </div>
            <a
              ref={(el) => {
                refs.current[t.key] = el;
              }}
              className={styles.toolDrag}
              title="Drag me to the bookmarks bar — don't click here"
            >
              {t.label}
              <span className={styles.toolDragRail}>drag</span>
            </a>
            <div className={styles.toolBody}>
              <span className={styles.toolTakes}>
                <b>takes</b>
                {t.takes}
              </span>
              <span className={styles.toolRefuses}>
                <b>refuses</b>
                {t.refuses}
              </span>
            </div>
          </article>
        ))}
      </div>

      <div className={styles.shelfFoot}>
        <span>
          Every grab lands on your clipboard. The ⚡ box on the account in the{" "}
          <Link href="/room">HomeRoom</Link> is what reads it — this page files nothing,
          and nothing here writes back to Salesforce or Forms.
        </span>
        <button
          type="button"
          className={styles.shelfFormBtn}
          onClick={() => setFormOpen((v) => !v)}
          aria-expanded={formOpen}
        >
          {formOpen ? "✕ Close the payroll intake form" : "✎ Payroll intake form"}
        </button>
      </div>

      {formOpen && (
        <div className={styles.shelfForm}>
          <PayrollForm accounts={accounts} />
        </div>
      )}
    </>
  );
}
