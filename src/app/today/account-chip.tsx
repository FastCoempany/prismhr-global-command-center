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

// An account chip on a partner's outreach card. Clicking it opens a work box
// instead of jumping straight to the Accounts page: jot your own note, log what
// the partner said, hop to the account, or put the account on the dashboard and
// remote-control its stage from right here. The chip's color is its freshness
// clock — green under 24h since the last note, yellow 24–48h (or never touched),
// red past 48h.

type Stage = { key: string; label: string; state: "todo" | "active" | "done" };

type ChipNote = {
  id: string;
  kind: string;
  body: string;
  createdAt: string;
};

// One account note in the popover — a single ellipsized row; ▸ expands the
// full note, × deletes exactly this note.
function ChipNoteRow({ n }: { n: ChipNote }) {
  const [expanded, setExpanded] = useState(false);
  const d = new Date(Date.parse(n.createdAt));
  const stamp = Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  // The box renders position:fixed from the chip's measured rect — absolute
  // positioning inside the chip row got painted over by later cards (ancestor
  // stacking contexts trap z-index); fixed at the viewport level is immune.
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const partnerFirst = partner.split(" ")[0] || "Partner";

  const openBox = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      setPos({
        top: r.bottom + 6,
        left: Math.max(8, Math.min(r.left, window.innerWidth - 336)),
      });
    }
    setOpen((v) => !v);
  };

  // The box is anchored to a viewport position; if the page scrolls or resizes
  // underneath it, close rather than drift.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  // Neutral until an interaction starts the clock — "none" adds no color class.
  const toneClass =
    tone === "fresh"
      ? styles.chipFresh
      : tone === "stale"
        ? styles.chipStale
        : tone === "cold"
          ? styles.chipCold
          : "";

  const noteForm = (
    kind: "mine" | "partner" | "account",
    label: string,
    placeholder: string,
  ) => (
    <details className={styles.chipItem}>
      <summary>{label}</summary>
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
    </details>
  );

  return (
    <span className={styles.chipWrap}>
      <button
        ref={btnRef}
        type="button"
        className={`${styles.kickoffAcct} ${styles.chipBtn} ${toneClass}`}
        onClick={openBox}
        title={`${account.name}${account.play ? ` · ${account.play}` : ""}${
          disposition
            ? ` · ${disposition.status === "motion" ? "in motion" : "parked"}${disposition.reason ? ` — ${disposition.reason}` : ""}`
            : ""
        } — ${
          lastNoteAt ? "worked; click for the box" : "not worked yet; click to add a note"
        }`}
      >
        {disposition?.status === "motion"
          ? "⚡ "
          : disposition?.status === "parked"
            ? "⏸ "
            : ""}
        {account.name} <b>{account.score}</b>
        {notes.length > 0 && (
          <span className={styles.chipNoteCt}> · 🗒{notes.length}</span>
        )}
      </button>

      {/* The work box renders in a PORTAL on document.body — a contacted card's
          opacity (kickoffDone: 0.72) creates a stacking context that both traps
          any z-index inside it and renders descendants translucent. Escaping the
          subtree entirely is the only robust fix. */}
      {open &&
        createPortal(
          <>
            <span className={styles.chipShade} onClick={() => setOpen(false)} />
            <span className={styles.chipPop} style={pos ?? undefined}>
              <span className={styles.chipPopHead}>
                <b>{account.name}</b>
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

              {noteForm("mine", "✎ My note", `What you know / did on ${account.name}…`)}
              {noteForm(
                "partner",
                `💬 ${partnerFirst} said`,
                `What ${partnerFirst} told you about ${account.name}…`,
              )}
              {noteForm(
                "account",
                "🗒 Add account note",
                `A plain note on ${account.name} — lands on its account page…`,
              )}

              {/* This account's notes — one-line rows, expand, delete. */}
              {notes.length > 0 && (
                <details className={styles.chipItem}>
                  <summary>🗒 Notes ({notes.length})</summary>
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
                </details>
              )}

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
                            s.state === "active" ? "Current stage" : `Move to ${s.label}`
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

              {/* Off-structure exits — real life moved this account off the
                  scripted path. Each change also drops a dated account note. */}
              {disposition ? (
                <span className={styles.chipDispo}>
                  <span className={styles.chipDispoLine}>
                    {disposition.status === "motion" ? "⚡ In motion" : "⏸ Parked"}
                    {disposition.reason ? ` — ${disposition.reason}` : ""}
                  </span>
                  <form action={clearDisposition} className={styles.valInline}>
                    <input type="hidden" name="accountId" value={account.id} />
                    <input type="hidden" name="returnTo" value="/today" />
                    <button className={styles.chipDispoBtn}>↩ Return to active</button>
                  </form>
                </span>
              ) : (
                <details className={styles.chipItem}>
                  <summary>⚡ Off-structure…</summary>
                  <form action={setDisposition} className={styles.chipNoteForm}>
                    <input type="hidden" name="accountId" value={account.id} />
                    <input type="hidden" name="partner" value={partner} />
                    <input type="hidden" name="returnTo" value="/today" />
                    <select name="status" defaultValue="motion" aria-label="What shifted">
                      <option value="motion">already in motion — skip the roundup</option>
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

              <Link href={`/accounts?focus=${account.id}`} className={styles.chipGoLink}>
                Go to account →
              </Link>
            </span>
          </>,
          document.body,
        )}
    </span>
  );
}
