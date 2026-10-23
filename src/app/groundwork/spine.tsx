"use client";

// The Sales Nav spine (Concept C, ship order 2026-10-15;
// docs/mockups/groundwork-salesnav-column-2026-10-14.html). Groundwork's
// fourth column: every Sales Navigator alert on a book account this week,
// newest first, under TODAY / YESTERDAY / THIS WEEK, a glyph per kind down
// the spine. The alerts lead. The newest reads large with its buttons
// showing; the rest show theirs on hover or focus. The note opens as a
// pop-out beside the column, never in it.
//
// Buttons that leave the app open Sales Navigator or Salesforce in a new tab,
// and only at the addresses the page handed down: the alert's own links,
// unwrapped to https://www.linkedin.com/sales/ (src/lib/ingest/
// salesnav-links.ts), a Sales Navigator search by name, or the Salesforce
// record. Nothing here sends anything: Copy puts the note on the clipboard,
// the Outlook draft downloads an unsent .eml, and Worked it stamps the move
// and files the touch the operator says they made (workedChannel).

import { useEffect, useRef, useState } from "react";
import type { SpineDraft, SpineItem } from "@/lib/groundwork/spine";
import { KIND_GROUP } from "@/lib/groundwork/spine-kinds";
import {
  hideAlert,
  markAlertWorked,
  unmarkAlertWorked,
  muteAlerts,
  showAlert,
  unWork,
  unmuteAlerts,
  workedChannel,
} from "./actions";
import styles from "./groundwork.module.css";

export type SpineCard = SpineItem & {
  draft: SpineDraft | null;
  /** The account's Salesforce record, null without a real record id. */
  sf: string | null;
  /** Salesforce's New Contact form, filled in, for a person it may not have. */
  sfNew: string | null;
  worked: boolean;
  workedToday: boolean;
  /** The newest alert of its rule on its account: only its Worked it moves
   *  the queue. */
  newest: boolean;
  /** The queue's stamp for it landed today, so ↺ returns the move too. */
  stampedToday: boolean;
};

const FILTERS = [
  ["all", "All"],
  ["people", "People"],
  ["intent", "Intent"],
  ["activity", "Activity"],
] as const;
type Filter = (typeof FILTERS)[number][0];

const DAYS = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["week", "This week"],
] as const;
const OPEN = new Set<string>(["today", "yesterday", "week"]);

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2026-09" as "September"; the current month's older alerts read
 *  "Earlier in October". */
function monthLabel(month: string, nowMonth: string): string {
  const name = MONTHS[Number(month.slice(5, 7)) - 1] ?? month;
  return month === nowMonth ? `Earlier in ${name}` : name;
}

const shortDay = (iso: string): string => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t)
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "America/Chicago",
    })
    .toUpperCase();
};

function Glyph({ kind }: { kind: SpineItem["kind"] | "head" }) {
  const p = {
    head: (
      <>
        <path d="M2 12.5 6 8l3 2.5L14 4" />
        <path d="M10.5 4H14v3.5" />
      </>
    ),
    "new-in-seat": (
      <>
        <circle cx="7" cy="5.5" r="2.5" />
        <path d="M2.5 14c.6-2.6 2.3-4 4.5-4s3.9 1.4 4.5 4" />
        <path d="M13 3.5v4M11 5.5h4" />
      </>
    ),
    left: (
      <>
        <path d="M6 3.5H3.5v9H6" />
        <path d="M9.5 5 13 8l-3.5 3M13 8H6.5" />
      </>
    ),
    posted: <path d="M3 3.5h10v7H7l-3 2.5v-2.5H3z" />,
    intent: <path d="M3 13V9M8 13V6M13 13V3" />,
    active: <path d="M1.5 8h3l2-4.5 3 9 2-4.5h3" />,
    "company-post": (
      <>
        <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
        <path d="M5 6.5h6M5 9.5h4" />
      </>
    ),
    growth: <path d="M2 13h12M4 13V9M8 13V6M12 13V3" />,
  }[kind];
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={styles.snGlyph}>
      {p}
    </svg>
  );
}

/** The channel a Worked it files: what the pop-out last opened, else the
 *  draft's own road. */
function channelOf(card: SpineCard, used: "eml" | "inmail" | null): string {
  if (used === "eml") return "EMAIL";
  if (used === "inmail") return "INMAIL";
  // The road the pop-out named: "Email · on file" when an address is on
  // file, a LinkedIn message otherwise.
  return card.draft?.email ? "EMAIL" : "LINKEDIN";
}

function clauseOf(card: SpineCard): string {
  const who = card.who || card.draft?.to || "";
  switch (card.kind) {
    case "posted":
      return `Wrote to ${who} about the post.`;
    case "new-in-seat":
      return `Wrote to ${who} on the new role.`;
    case "left":
      return `Asked ${who} who takes over.`;
    default:
      return "Sent the note on their intent.";
  }
}

/** An unsent Outlook draft: X-Unsent opens it in Outlook as a draft, To and
 *  Subject filled, the body the operator edited. */
function emlOf(d: SpineDraft, body: string): string {
  const to = d.to ? `${d.to.replace(/[<>"]/g, "")} <${d.email}>` : d.email;
  return [
    `To: ${to}`,
    `Subject: ${d.subject || "Following up"}`,
    "X-Unsent: 1",
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body.replace(/\r?\n/g, "\r\n"),
  ].join("\r\n");
}

export function SpineColumn({
  cards,
  hidden,
  muted,
  canWrite,
  nowMonth,
}: {
  cards: readonly SpineCard[];
  hidden: readonly { key: string; label: string }[];
  muted: readonly string[];
  canWrite: boolean;
  /** The current Chicago month, "2026-10", from the server's clock, so the
   *  folds read the same on both renders. */
  nowMonth: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  const live = cards.filter((c) => !gone.has(c.key));
  const shown = live.filter((c) => filter === "all" || KIND_GROUP[c.kind] === filter);
  const week = live.filter((c) => OPEN.has(c.when));
  const today = live.filter((c) => c.when === "today").length;
  // The newest open alert leads; a folded month never leads.
  const firstKey = shown.find((c) => OPEN.has(c.when))?.key;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const hide = async (key: string) => {
    setGone((s) => new Set(s).add(key));
    if (open === key) setOpen(null);
    await hideAlert(key);
  };

  const renderEvent = (c: SpineCard) => (
    <SpineEvent
      key={c.key}
      card={c}
      lead={c.key === firstKey}
      open={open === c.key}
      busy={busy === c.key}
      canWrite={canWrite}
      onOpen={() => setOpen(open === c.key ? null : c.key)}
      onClose={() => setOpen(null)}
      onHide={() => void hide(c.key)}
      onWorked={async (used) => {
        if (!c.rule) return;
        setBusy(c.key);
        // Whatever Worked it is clicked for lands in Done today (the
        // ship order 2026-10-22): an older alert stamps its rule's
        // move too, and a move already stamped today keeps its one line.
        await workedChannel(
          `${c.accountId}:${c.rule}`,
          c.accountId,
          channelOf(c, used),
          c.who || c.draft?.to || "",
          clauseOf(c),
        );
        await markAlertWorked(c.key);
        setBusy(null);
        setOpen(null);
      }}
      onUnwork={async () => {
        if (!c.rule) return;
        setBusy(c.key);
        await unmarkAlertWorked(c.key);
        // An older alert's Worked it stamps the move too, so its ↺ returns
        // the move when its own mark went on today (spineWorked).
        if (c.stampedToday) await unWork(`${c.accountId}:${c.rule}`, c.accountId);
        setBusy(null);
      }}
      onMute={async () => {
        await muteAlerts(KIND_GROUP[c.kind]);
      }}
    />
  );

  const months: [string, SpineCard[]][] = [];
  for (const c of shown) {
    if (c.when === "today" || c.when === "yesterday" || c.when === "week") continue;
    const at = months.find(([m]) => m === c.when);
    if (at) at[1].push(c);
    else months.push([c.when, [c]]);
  }

  return (
    <aside className={styles.spine} aria-label="Sales Nav alerts">
      <div className={styles.snHead}>
        <span className={styles.snMark}>
          <Glyph kind="head" />
        </span>
        <span className={styles.snTitle}>Sales Nav</span>
        <span className={styles.snCount}>
          {week.length} this week · {today} today
        </span>
      </div>
      <div className={styles.snSeg} role="group" aria-label="Show">
        {FILTERS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            aria-pressed={filter === k}
            onClick={() => setFilter(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className={styles.snEmpty}>
          {live.length === 0
            ? "No Sales Nav alerts on your accounts in the last three months."
            : "Nothing under this filter."}
        </p>
      )}

      {DAYS.map(([when, kicker]) => {
        const day = shown.filter((c) => c.when === when);
        if (!day.length) return null;
        return (
          <div key={when}>
            <div className={styles.snDay}>{kicker}</div>
            {day.map(renderEvent)}
          </div>
        );
      })}

      {/* Older alerts fold by Chicago month, newest month first; each fold
          says its count and opens with one click (the click-depth law). */}
      {months.map(([month, items]) => (
        <details key={month} className={styles.snMonth}>
          <summary>
            {monthLabel(month, nowMonth)} · {items.length} alert
            {items.length === 1 ? "" : "s"}
          </summary>
          {items.map(renderEvent)}
        </details>
      ))}

      {(hidden.length > 0 || muted.length > 0) && (
        <details className={styles.snFold}>
          <summary>
            {[
              hidden.length ? `${hidden.length} hidden` : "",
              muted.length ? `${muted.join(", ")} muted` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </summary>
          {hidden.map((h) => (
            <span key={h.key} className={styles.snFoldRow}>
              {h.label}
              {canWrite && (
                <button
                  type="button"
                  onClick={() => {
                    setGone((g) => {
                      const next = new Set(g);
                      next.delete(h.key);
                      return next;
                    });
                    void showAlert(h.key);
                  }}
                  title="Show it again"
                >
                  ↺
                </button>
              )}
            </span>
          ))}
          {muted.map((g) => (
            <span key={g} className={styles.snFoldRow}>
              Every {g} alert
              {canWrite && (
                <button type="button" onClick={() => void unmuteAlerts(g)} title="Unmute">
                  ↺
                </button>
              )}
            </span>
          ))}
        </details>
      )}
    </aside>
  );
}

function SpineEvent({
  card: c,
  lead,
  open,
  busy,
  canWrite,
  onOpen,
  onClose,
  onHide,
  onWorked,
  onUnwork,
  onMute,
}: {
  card: SpineCard;
  lead: boolean;
  open: boolean;
  busy: boolean;
  canWrite: boolean;
  onOpen: () => void;
  onClose: () => void;
  onHide: () => void;
  onWorked: (used: "eml" | "inmail" | null) => Promise<void>;
  onUnwork: () => Promise<void>;
  onMute: () => Promise<void>;
}) {
  const hot = c.when === "today";
  const headline = c.who ? `${c.who}${c.title ? `, ${c.title}` : ""}` : c.line;
  const inmail = c.links.find((l) => l.label === "InMail");
  return (
    <div
      className={`${styles.snEv} ${hot ? styles.snHot : ""} ${lead ? styles.snLead : ""} ${
        c.worked ? styles.snWorked : ""
      }`}
      tabIndex={-1}
    >
      <span className={styles.snIc}>
        <Glyph kind={c.kind} />
      </span>
      <div className={styles.snBody}>
        <div className={styles.snKick}>
          <span>
            {c.label} · {shortDay(c.at)}
          </span>
          {canWrite && (
            <button
              type="button"
              className={styles.snX}
              onClick={onHide}
              aria-label={`Hide this alert about ${c.who || c.account}`}
              title="Hide"
            >
              ✕
            </button>
          )}
        </div>
        <div className={styles.snLine}>{headline}</div>
        <div className={styles.snMeta}>
          {c.who ? `${c.line} · ` : ""}
          <a
            className={styles.snAcct}
            href={`/groundwork?focus=${encodeURIComponent(c.accountId)}`}
          >
            {c.account}
          </a>
        </div>
        {c.quote && <div className={styles.snQuote}>“{c.quote}”</div>}

        {c.worked ? (
          <div className={styles.snDone}>
            ✓ Worked
            {canWrite && c.workedToday && (
              <button
                type="button"
                onClick={() => void onUnwork()}
                disabled={busy}
                title="Take it back"
              >
                ↺
              </button>
            )}
          </div>
        ) : (
          <div className={styles.snActs}>
            {c.draft && (
              <button
                type="button"
                className={`${styles.snBtn} ${styles.snBtnInk}`}
                onClick={onOpen}
                aria-expanded={open}
              >
                Draft the note
              </button>
            )}
            {c.links.map((l) => (
              <a
                key={l.href}
                className={styles.snBtn}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {l.label}
              </a>
            ))}
            {c.sf && (
              <a
                className={`${styles.snBtn} ${styles.snBtnBlue}`}
                href={c.sf}
                target="_blank"
                rel="noopener noreferrer"
              >
                Salesforce
              </a>
            )}
            {c.sfNew && (
              <a
                className={`${styles.snBtn} ${styles.snBtnBlue}`}
                href={c.sfNew}
                target="_blank"
                rel="noopener noreferrer"
                title="Salesforce's New Contact form, filled in. You click Save."
              >
                Add to Salesforce
              </a>
            )}
            {canWrite && !c.draft && !c.rule && (
              <button
                type="button"
                className={styles.snBtn}
                onClick={() => void onMute()}
                title="Hide every alert of this kind"
              >
                Mute {KIND_GROUP[c.kind]}
              </button>
            )}
          </div>
        )}

        {open && c.draft && (
          <SpinePop
            card={c}
            draft={c.draft}
            inmail={inmail?.href ?? ""}
            busy={busy}
            canWrite={canWrite}
            onClose={onClose}
            onWorked={onWorked}
          />
        )}
      </div>
    </div>
  );
}

function SpinePop({
  card: c,
  draft: d,
  inmail,
  busy,
  canWrite,
  onClose,
  onWorked,
}: {
  card: SpineCard;
  draft: SpineDraft;
  inmail: string;
  busy: boolean;
  canWrite: boolean;
  onClose: () => void;
  onWorked: (used: "eml" | "inmail" | null) => Promise<void>;
}) {
  const [body, setBody] = useState(d.body);
  const [said, setSaid] = useState("");
  const used = useRef<"eml" | "inmail" | null>(null);
  const ta = useRef<HTMLTextAreaElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ta.current?.focus();
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => document.addEventListener("mousedown", away), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", away);
    };
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setSaid(
        d.email
          ? "Copied. Paste it into your email."
          : "Copied. Paste it into the message.",
      );
    } catch {
      ta.current?.select();
      setSaid("Selected. Press Ctrl+C to copy.");
    }
  };

  const outlook = () => {
    used.current = "eml";
    const blob = new Blob([emlOf(d, body)], { type: "message/rfc822" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `Note to ${(d.to || c.account).replace(/[^\w .-]/g, "")}.eml`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setSaid("Downloaded. Open it and Outlook shows the draft, ready to send.");
  };

  return (
    <div
      ref={box}
      className={styles.snPop}
      role="dialog"
      aria-label={`Note to ${d.to || c.account}`}
    >
      <div className={styles.snPopHead}>
        <div>
          <span className={styles.snKickTxt}>
            {c.label} · {c.account}
          </span>
          <div className={styles.snPopTitle}>Note to {d.to || c.account}</div>
        </div>
        <button
          type="button"
          className={styles.snPopClose}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className={styles.snVia}>{d.via}</div>
      {d.subject && <div className={styles.snSubject}>Subject: {d.subject}</div>}
      <textarea
        ref={ta}
        className={styles.snText}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        aria-label="The note"
      />
      <div className={styles.snPopFoot}>
        <button
          type="button"
          className={`${styles.snPbtn} ${styles.snPbtnInk}`}
          onClick={() => void copy()}
        >
          Copy the note
        </button>
        {d.email && (
          <button type="button" className={styles.snPbtn} onClick={outlook}>
            Outlook draft
          </button>
        )}
        {inmail && (
          <a
            className={styles.snPbtn}
            href={inmail}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              used.current = "inmail";
            }}
          >
            Open InMail
          </a>
        )}
        {canWrite && c.rule && (
          <button
            type="button"
            className={styles.snPbtn}
            disabled={busy}
            onClick={() => void onWorked(used.current)}
          >
            Worked it
          </button>
        )}
        <span className={styles.snHint} role="status">
          {said ||
            (d.email
              ? `Goes to ${d.email}.`
              : `No email on file for ${d.to || "them"}. Send it on LinkedIn.`)}
        </span>
      </div>
    </div>
  );
}
