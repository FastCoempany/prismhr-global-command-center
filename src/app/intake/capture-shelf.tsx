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

// Grabs the open Teams (web) chat or channel thread — the WHOLE thread (IV.4).
//
// Teams virtualises its list two ways at once: only rendered messages exist in
// the DOM, and messages that scroll out of view are UNLOADED. So the grab
// harvests incrementally — read what's rendered, scroll up, read again — into a
// map keyed by instant+text, until the top stops yielding anything new (three
// passes running) or a generous safety cap trips. A floating counter shows
// progress; pacing stays polite.
//
// Each message is emitted with the delimiters the parser was built for —
// ⟦MSG⟧ speaker ⟦AT⟧ instant ⟦BODY⟧ — read from the message DOM itself, so
// attribution is read, never inferred. Links and file cards land in ⟦LINKS⟧;
// the completeness report lands in ⟦CAPTURED⟧. If Teams ships a DOM the
// selectors don't recognise, the grab degrades to whole-pane text and says so.
function teamsBookmarklet(origin: string): string {
  const js =
    `(async()=>{` +
    `const sel=['[data-tid="message-pane-list-viewport"]','[data-tid="messagePaneList"]','[data-tid="chat-pane-list"]','[role="main"] [role="list"]','[data-tid="threadBodyContainer"]'];` +
    `const find=()=>{for(const s of sel){let el=null;try{el=document.querySelector(s)}catch(e){}if(el&&el.innerText&&el.innerText.length>120)return el}return null};` +
    `let el=find();` +
    `if(!el){alert('Open the chat or channel thread first — Teams on the web only. The desktop app has no page for a bookmarklet to read.');return}` +
    `const pane=(()=>{let p=el;for(let i=0;i<6&&p;i++){if(p.scrollHeight>p.clientHeight+40)return p;p=p.parentElement}return el})();` +
    `const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));` +
    `const hud=document.createElement('div');` +
    `hud.style.cssText='position:fixed;top:12px;right:12px;z-index:2147483647;background:#0A1C40;color:#fff;font:12px/1.4 ui-monospace,monospace;padding:8px 14px;border-radius:8px;pointer-events:none';` +
    `document.body.appendChild(hud);` +
    `const seen=new Map();const links=new Map();` +
    `const isoOf=(n)=>{const t=n.querySelector('time');if(t){const v=t.dateTime||t.getAttribute('datetime');if(v)return v}const s=n.querySelector('[data-tid="message-timestamp"],[id^="timestamp"]');const v=s&&(s.getAttribute('title')||s.textContent);if(v){const d=new Date(v);if(!isNaN(d))return d.toISOString()}return ''};` +
    `const harvest=()=>{` +
    `let grew=0;let author='';let iso='';` +
    `const nodes=pane.querySelectorAll('[data-tid="chat-pane-message"],[data-tid="channel-pane-message"],[data-tid*="message-card"],div[role="listitem"]');` +
    `for(const node of nodes){` +
    `if(node.getAttribute&&node.getAttribute('role')==='listitem'&&node.querySelector('[data-tid="chat-pane-message"],[data-tid="channel-pane-message"]'))continue;` +
    `const an=node.querySelector('[data-tid="message-author-name"],[data-tid="threading-author-name"]');` +
    `if(an&&an.innerText.trim())author=an.innerText.trim();` +
    `const t=isoOf(node);if(t)iso=t;` +
    `const bn=node.querySelector('[data-tid="message-body-content"],[data-tid="message-body"],.fui-ChatMessageBody');` +
    `const body=((bn&&bn.innerText)||node.innerText||'').trim();` +
    `if(!body)continue;` +
    `const who=author||'unknown';` +
    `const key=iso+'|'+body.slice(0,80);` +
    `const prev=seen.get(key);` +
    `if(!prev){seen.set(key,{a:who,t:iso,b:body,o:seen.size});grew++}` +
    `else if(prev.a==='unknown'&&who!=='unknown'){prev.a=who}` +
    `for(const a of node.querySelectorAll('a[href]')){const label=(a.innerText||a.href).trim().replace(/\\s+/g,' ').slice(0,120);if(label&&!links.has(label))links.set(label,{u:a.href,a:who,t:iso})}` +
    `for(const f of node.querySelectorAll('[data-tid*="file-chiclet"],[data-tid*="attachment"]')){const label=(f.innerText||'').trim().split('\\n')[0].slice(0,120);if(label&&!links.has(label))links.set(label,{u:null,a:who,t:iso})}` +
    `}` +
    `return grew};` +
    `harvest();` +
    `let passes=0,nogrow=0,capped=false;` +
    `for(;;){` +
    `passes++;if(passes>300){capped=true;break}` +
    `pane.scrollTop=0;await sleep(600);` +
    `const grew=harvest();` +
    `hud.textContent='capturing '+seen.size+' messages · pass '+passes;` +
    `if(grew===0&&pane.scrollTop<4){nogrow++}else{nogrow=0}` +
    `if(nogrow>=3)break;` +
    `}` +
    `hud.remove();` +
    `const msgs=[...seen.values()].sort((x,y)=>{const a=Date.parse(x.t),b=Date.parse(y.t);if(!isNaN(a)&&!isNaN(b)&&a!==b)return a-b;return x.o-y.o});` +
    `const title=document.title.replace(/ \\| Microsoft Teams.*$/,'');` +
    `let out='TEAMS THREAD - '+title+' - captured '+new Date().toLocaleString()+'\\n\\n';` +
    `if(msgs.length>=3){` +
    `for(const m of msgs){out+='⟦MSG⟧ '+m.a+' ⟦AT⟧ '+(m.t||'')+' ⟦BODY⟧\\n'+m.b+'\\n'}` +
    `if(links.size){out+='⟦LINKS⟧\\n';let i=1;for(const[label,l]of links){out+='['+i+'] '+label+' · '+(l.u||'—')+' · '+l.a+(l.t?', '+l.t.slice(5,10):'')+'\\n';i++}}` +
    `const oldest=msgs.map(m=>m.t).filter(Boolean).sort()[0]||'';` +
    `out+='⟦CAPTURED '+msgs.length+' messages · scrolled '+passes+' · oldest '+(oldest?oldest.slice(0,10):'unknown')+(capped?' · ceiling':'')+'⟧';` +
    `}else{` +
    `el=find()||el;` +
    `out+=el.innerText+'\\n\\n(structure not recognised — captured as plain text)';` +
    `}` +
    `try{await navigator.clipboard.writeText(out)}catch(e){window.prompt('Auto-copy was blocked. Press Ctrl+C:',out.slice(0,4000))}` +
    `window.open('${origin}/intranet','_blank')` +
    `})()`;
  return `javascript:${js}`;
}

type Tool = {
  key: "outlook" | "sf" | "teams";
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
      "The whole thread, top to bottom — every name, every timestamp, every link. A long history takes a minute or two; a counter shows progress.",
    refuses:
      "The desktop app, which isn't a page anything can read. Open the same chat at teams.microsoft.com.",
    build: teamsBookmarklet,
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
          Every grab lands on your clipboard. Teams threads paste into the{" "}
          <Link href="/intranet">Intranet</Link>; account activity goes to the ⚡ box on
          the account in the <Link href="/room">HomeRoom</Link>. This page files nothing,
          and nothing here writes back to Salesforce or Forms. When a grab changes, the
          bookmarks bar keeps the old copy — re-drag it to pick up the new one.
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
