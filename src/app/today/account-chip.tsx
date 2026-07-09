"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ChipTone } from "@/lib/today/build";
import { addAccountNote } from "./actions";
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

export function AccountChip({
  account,
  partner,
  tone,
  lastNoteAt,
  card,
  seedSubtitle,
  seedDiscovery,
}: {
  account: { id: string; name: string; score: number; play: string | null };
  partner: string;
  tone: ChipTone;
  lastNoteAt: string | null;
  card: { id: string; stages: Stage[] } | null;
  seedSubtitle: string;
  seedDiscovery: string;
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
        title={
          lastNoteAt
            ? "Last worked — see the box for options"
            : "Not worked yet — click to add a note"
        }
      >
        {account.name} <b>{account.score}</b>
        {account.play ? ` · ${account.play}` : ""}
      </button>

      {open && (
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

            {card ? (
              <span className={styles.chipStageBlock}>
                <span className={styles.chipStageHead}>On dashboard — set the stage</span>
                <span className={styles.chipStageList}>
                  {card.stages.map((s) => (
                    <form action={setCardStage} key={s.key} className={styles.valInline}>
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

            <Link href={`/accounts?focus=${account.id}`} className={styles.chipGoLink}>
              Go to account →
            </Link>
          </span>
        </>
      )}
    </span>
  );
}
