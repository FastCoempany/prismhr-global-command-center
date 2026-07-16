"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import type { ChipTone } from "@/lib/today/build";
import type { Disposition } from "@/lib/today/overlay";
import {
  addAccountNote,
  clearDisposition,
  deleteAccountNote,
  setDisposition,
} from "./actions";
import { addCard, setCardStage } from "../dashboard/actions";
import { LocalTime } from "../today-client";
import styles from "../command-center.module.css";

// An account chip on the Focus strip. Clicking it opens the work box built to
// the approved mock: a header line (account · partner), ONE horizontal row of
// pill buttons (My note / Partner said / Notes (N) / Go to account /
// Dashboard), and whichever panel the active pill owns rendered inline
// beneath — notes as one-line expandable rows. The box caps to the viewport
// and scrolls internally; near the bottom of the screen it flips above the
// chip instead of running under the taskbar.

type Stage = { key: string; label: string; state: "todo" | "active" | "done" };

type ChipNote = {
  id: string;
  kind: string;
  body: string;
  createdAt: string;
};

// One account note — a single ellipsized row; ▸ expands, × deletes.
function ChipNoteRow({ n }: { n: ChipNote }) {
  const [expanded, setExpanded] = useState(false);
  const d = new Date(Date.parse(n.createdAt));
  const stamp = Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "America/Chicago",
      });
  return (
    <span className={styles.chipNoteRow}>
      <button
        type="button"
        className={styles.sheetChevron}
        title={expanded ? "Collapse" : "Expand the full note"}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "▾" : "▸"}
      </button>
      <b suppressHydrationWarning>{stamp}</b>
      <i className={n.kind === "partner" ? styles.chipNoteKindP : styles.chipNoteKind}>
        {n.kind === "partner" ? "partner" : "mine"}
      </i>
      <span
        className={`${styles.chipNoteBody} ${expanded ? styles.chipNoteBodyFull : ""}`}
        onClick={() => setExpanded((v) => !v)}
      >
        {n.body}
      </span>
      <form action={deleteAccountNote} className={styles.valInline}>
        <input type="hidden" name="id" value={n.id} />
        <input type="hidden" name="returnTo" value="/today" />
        <button className={styles.chipNoteDel} title="Delete this note">
          ×
        </button>
      </form>
    </span>
  );
}

type Panel = "notes" | "mine" | "partner" | "dash" | null;

export function AccountChip({
  account,
  partner,
  tone,
  lastNoteAt,
  card,
  seedSubtitle,
  seedDiscovery,
  disposition = null,
  notes = [],
}: {
  account: { id: string; name: string; score: number; play: string | null };
  partner: string;
  tone: ChipTone;
  lastNoteAt: string | null;
  card: { id: string; stages: Stage[] } | null;
  seedSubtitle: string;
  seedDiscovery: string;
  notes?: ChipNote[];
  // Off-structure state: "motion" (⚡ live conversation, out of the roundup) or
  // "parked" (⏸ shelved). "not-mine" never reaches a chip — those accounts are
  // filtered out server-side.
  disposition?: Disposition | null;
}) {
  const [open, setOpen] = useState(false);
  // Notes are the default panel when they exist — the box opens showing them.
  const [panel, setPanel] = useState<Panel>(notes.length > 0 ? "notes" : null);
  // Fixed-position box measured off the chip; flips above when the chip sits
  // low on screen, and caps its height so the content scrolls INSIDE the box.
  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    maxHeight: number;
  } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLSpanElement>(null);
  const partnerFirst = partner.split(" ")[0] || "Partner";

  const openBox = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const left = Math.max(8, Math.min(r.left, window.innerWidth - 470));
      const below = window.innerHeight - r.bottom - 18;
      const above = r.top - 18;
      if (below < 320 && above > below) {
        // Not enough room under the chip — open upward instead.
        setPos({
          bottom: window.innerHeight - r.top + 6,
          left,
          maxHeight: Math.min(480, above),
        });
      } else {
        setPos({ top: r.bottom + 6, left, maxHeight: Math.min(480, below) });
      }
    }
    setPanel(notes.length > 0 ? "notes" : null);
    setOpen((v) => !v);
  };

  // Page scroll/resize under a fixed box → close rather than drift. Scrolling
  // INSIDE the box is fine — those events are ignored.
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e.target instanceof Node && popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const pill = (key: Exclude<Panel, null>, label: string) => (
    <button
      type="button"
      className={`${styles.chipPill} ${panel === key ? styles.chipPillOn : ""}`}
      onClick={() => setPanel((p) => (p === key ? null : key))}
      aria-expanded={panel === key}
    >
      {label}
    </button>
  );

  const noteForm = (kind: "mine" | "partner", placeholder: string) => (
    <form action={addAccountNote} className={styles.chipNoteForm}>
      <input type="hidden" name="accountId" value={account.id} />
      <input type="hidden" name="partner" value={partner} />
      <input type="hidden" name="kind" value={kind} />
      <textarea
        name="body"
        required
        maxLength={2000}
        rows={3}
        placeholder={placeholder}
      />
      <button className={styles.chipSaveBtn}>Save note</button>
    </form>
  );

  return (
    <span className={styles.chipWrap}>
      <button
        ref={btnRef}
        type="button"
        className={styles.focusChip}
        data-tone={tone}
        onClick={openBox}
        title={`${account.name}${account.play ? ` · ${account.play}` : ""}${
          disposition
            ? ` · ${disposition.status === "motion" ? "in motion" : "parked"}${disposition.reason ? ` — ${disposition.reason}` : ""}`
            : ""
        } — ${
          lastNoteAt ? "worked; click for the box" : "not worked yet; click to add a note"
        }`}
      >
        <span className={styles.focusChipName}>
          {disposition?.status === "motion"
            ? "⚡ "
            : disposition?.status === "parked"
              ? "⏸ "
              : ""}
          {account.name}
        </span>{" "}
        <b>{account.score}</b>
        {notes.length > 0 && (
          <span className={styles.chipNoteCt}> · 🗒{notes.length}</span>
        )}
      </button>

      {/* The work box renders in a PORTAL on document.body — ancestor stacking
          contexts would otherwise trap it. */}
      {open &&
        createPortal(
          <>
            <span className={styles.chipShade} onClick={() => setOpen(false)} />
            <span
              ref={popRef}
              className={styles.chipPop2}
              style={
                pos
                  ? {
                      top: pos.top,
                      bottom: pos.bottom,
                      left: pos.left,
                      maxHeight: pos.maxHeight,
                    }
                  : undefined
              }
            >
              <span className={styles.chipPop2Head}>
                <b>{account.name}</b>
                <span className={styles.chipPop2Partner}> · {partner}</span>
                <span className={styles.chipPopStamp}>
                  {lastNoteAt ? (
                    <>
                      last note <LocalTime iso={lastNoteAt} />
                    </>
                  ) : (
                    "no notes yet"
                  )}
                </span>
              </span>

              <span className={styles.chipPills}>
                {pill("mine", "My note")}
                {pill("partner", `${partnerFirst} said`)}
                {notes.length > 0 &&
                  pill(
                    "notes",
                    `Notes (${notes.length}) ${panel === "notes" ? "▾" : "▸"}`,
                  )}
                <Link href={`/accounts?focus=${account.id}`} className={styles.chipPill}>
                  Go to account →
                </Link>
                {pill("dash", "Dashboard ▸")}
              </span>

              {panel === "mine" &&
                noteForm("mine", `What you know / did on ${account.name}…`)}
              {panel === "partner" &&
                noteForm(
                  "partner",
                  `What ${partnerFirst} told you about ${account.name}…`,
                )}

              {panel === "notes" && (
                <>
                  <span className={styles.chipNotesList}>
                    {notes.slice(0, 8).map((n) => (
                      <ChipNoteRow key={n.id} n={n} />
                    ))}
                    {notes.length > 8 && (
                      <Link
                        href={`/accounts?focus=${account.id}`}
                        className={styles.chipGoLink}
                      >
                        +{notes.length - 8} more on the account →
                      </Link>
                    )}
                  </span>
                  <span className={styles.chipPop2Foot}>
                    one-line rows · ▸ expands · × deletes · this account&apos;s notes only
                  </span>
                </>
              )}

              {panel === "dash" && (
                <span className={styles.chipDashPanel}>
                  {card ? (
                    <span className={styles.chipStageBlock}>
                      <span className={styles.chipStageHead}>
                        On dashboard — set the stage
                      </span>
                      <span className={styles.chipStageList}>
                        {card.stages.map((s) => (
                          <form
                            action={setCardStage}
                            key={s.key}
                            className={styles.valInline}
                          >
                            <input type="hidden" name="cardId" value={card.id} />
                            <input type="hidden" name="node" value={s.key} />
                            <input type="hidden" name="returnTo" value="/today" />
                            <button
                              className={`${styles.chipStageBtn} ${
                                s.state === "active"
                                  ? styles.chipStageOn
                                  : s.state === "done"
                                    ? styles.chipStageDone
                                    : ""
                              }`}
                              title={
                                s.state === "active"
                                  ? "Current stage"
                                  : `Move to ${s.label}`
                              }
                            >
                              {s.state === "done" ? "✓ " : ""}
                              {s.label}
                            </button>
                          </form>
                        ))}
                      </span>
                    </span>
                  ) : (
                    <form action={addCard} className={styles.chipItemForm}>
                      <input type="hidden" name="name" value={account.name} />
                      <input type="hidden" name="subtitle" value={seedSubtitle} />
                      <input type="hidden" name="seedDiscovery" value={seedDiscovery} />
                      <input type="hidden" name="returnTo" value="/today" />
                      <button className={styles.chipDashBtn}>
                        ＋ Add account to dashboard
                      </button>
                    </form>
                  )}

                  {/* Off-structure exits + the plain unattributed note live
                      behind Dashboard ▸ — out of the everyday path. */}
                  {disposition ? (
                    <span className={styles.chipDispo}>
                      <span className={styles.chipDispoLine}>
                        {disposition.status === "motion" ? "⚡ In motion" : "⏸ Parked"}
                        {disposition.reason ? ` — ${disposition.reason}` : ""}
                      </span>
                      <form action={clearDisposition} className={styles.valInline}>
                        <input type="hidden" name="accountId" value={account.id} />
                        <input type="hidden" name="returnTo" value="/today" />
                        <button className={styles.chipDispoBtn}>
                          ↩ Return to active
                        </button>
                      </form>
                    </span>
                  ) : (
                    <details className={styles.chipItem}>
                      <summary>⚡ Off-structure…</summary>
                      <form action={setDisposition} className={styles.chipNoteForm}>
                        <input type="hidden" name="accountId" value={account.id} />
                        <input type="hidden" name="partner" value={partner} />
                        <input type="hidden" name="returnTo" value="/today" />
                        <select
                          name="status"
                          defaultValue="motion"
                          aria-label="What shifted"
                        >
                          <option value="motion">
                            already in motion — skip the roundup
                          </option>
                          <option value="parked">park it for now</option>
                          <option value="not-mine">not mine — remove from my book</option>
                        </select>
                        <input
                          name="reason"
                          maxLength={400}
                          placeholder="Why? (optional — lands as a dated note)"
                          aria-label="Reason"
                        />
                        <button className={styles.chipSaveBtn}>Apply</button>
                      </form>
                    </details>
                  )}
                  <details className={styles.chipItem}>
                    <summary>🗒 Plain account note…</summary>
                    <form action={addAccountNote} className={styles.chipNoteForm}>
                      <input type="hidden" name="accountId" value={account.id} />
                      <input type="hidden" name="partner" value={partner} />
                      <input type="hidden" name="kind" value="account" />
                      <textarea
                        name="body"
                        required
                        maxLength={2000}
                        rows={3}
                        placeholder={`A plain note on ${account.name} — lands on its account page…`}
                      />
                      <button className={styles.chipSaveBtn}>Save note</button>
                    </form>
                  </details>
                </span>
              )}
            </span>
          </>,
          document.body,
        )}
    </span>
  );
}
