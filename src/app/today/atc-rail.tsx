"use client";

import { useState } from "react";
import Link from "next/link";
import {
  archiveThread,
  delayFollowUp,
  deleteTouch,
  logHappening,
  markReplied,
  markResponded,
  setThreadStatus,
} from "./actions";
import { addPartnerNote } from "../partners/actions";
import { ContactControl, type RoundupSection } from "../today-client";
import styles from "../command-center.module.css";

// The air-traffic-control rail: one line per partner — status dot, one-phrase
// state, and THE next action the lifecycle says is due. Everything else tucks
// behind ⌄. The partner cards below the rail are pure reference; this is where
// the work happens, top to bottom in urgency order.

export type RailItem = {
  partner: string;
  role: string;
  subjectKey: string;
  // Thread state, with "none" = fresh (roundup ready) and "archived" kept
  // distinct so the phrase can say a fresh roundup is available.
  status: "none" | "awaiting" | "replied" | "responded" | "archived";
  due: boolean; // check-in instant has arrived (awaiting/responded)
  phrase: string; // the one-line status, composed server-side
  dot: "green" | "yellow" | "orange" | "grey";
  detail: string;
  defaultMessage: string; // current-research roundup from the sendable accounts
  draftHref: string; // drafting desk anchor in the Partner Room
  sendable: number; // accounts still on the structured path (in the roundup)
  sections: RoundupSection[]; // composer rows — in-motion/parked default off
  frame: { opener: string; closer: string };
};

const DOT: Record<RailItem["dot"], string> = {
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#e6701e",
  grey: "#cbd5e1",
};

function keyForm(
  subjectKey: string,
  action: (fd: FormData) => void,
  label: string,
  cls: string,
) {
  return (
    <form action={action} className={styles.valInline}>
      <input type="hidden" name="subjectKey" value={subjectKey} />
      <button className={cls}>{label}</button>
    </form>
  );
}

type PanelKind = "send" | "more" | "log";

export function AtcRail({
  items,
  accounts,
}: {
  items: RailItem[];
  // Every workable account (for the curveball logger's picker).
  accounts: { id: string; name: string }[];
}) {
  // One panel open at a time: the send editor, the ⌄ secondary actions, or the
  // log-activity note box.
  const [open, setOpen] = useState<{ partner: string; kind: PanelKind } | null>(null);
  const [curveOpen, setCurveOpen] = useState(false);
  const toggle = (partner: string, kind: PanelKind) =>
    setOpen((o) =>
      o && o.partner === partner && o.kind === kind ? null : { partner, kind },
    );

  return (
    <div className={styles.atcRail}>
      <div className={styles.atcHead}>
        Control — next action per partner
        <button
          type="button"
          className={styles.atcCurveBtn}
          onClick={() => setCurveOpen((v) => !v)}
          aria-expanded={curveOpen}
          title="Something happened off-script — log it once and let every surface reconcile"
        >
          ⚡ Curveball
        </button>
      </div>

      {/* The curveball logger — account + what happened + the consequence.
          One capture: a dated account note, plus an optional disposition flip
          (in motion / parked / not mine) in the same write. */}
      {curveOpen && (
        <form action={logHappening} className={styles.atcCurve}>
          <select name="accountId" required defaultValue="" aria-label="Account">
            <option value="" disabled>
              Which account?
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input
            name="body"
            required
            maxLength={2000}
            placeholder="What happened? (dated note lands on the account)"
            aria-label="What happened"
          />
          <select name="consequence" defaultValue="" aria-label="And so…">
            <option value="">…just log it</option>
            <option value="motion">…it&apos;s in motion — skip the roundup</option>
            <option value="parked">…park it for now</option>
            <option value="not-mine">…not mine — remove from my book</option>
          </select>
          <button className={styles.atcBtn}>Log it ✓</button>
        </form>
      )}

      {items.map((it) => {
        const sendOpen = open?.partner === it.partner && open.kind === "send";
        const moreOpen = open?.partner === it.partner && open.kind === "more";
        const logOpen = open?.partner === it.partner && open.kind === "log";
        const fresh = it.status === "none" || it.status === "archived";
        const nothingToSend = fresh && it.sendable === 0;
        return (
          <div key={it.partner} className={styles.atcRowWrap}>
            <div className={styles.atcRow}>
              <span className={styles.atcDot} style={{ background: DOT[it.dot] }} />
              <span className={styles.atcName}>{it.partner}</span>
              <span className={styles.atcPhrase}>{it.phrase}</span>

              {/* THE next action, by state */}
              {it.status === "replied" && (
                <>
                  <a href={it.draftHref} className={`${styles.atcBtn} ${styles.atcHot}`}>
                    ✍ Draft the reply
                  </a>
                  {keyForm(it.subjectKey, markResponded, "I replied ✓", styles.atcBtn)}
                </>
              )}
              {(it.status === "awaiting" || it.status === "responded") &&
                keyForm(
                  it.subjectKey,
                  markReplied,
                  "They replied ✓",
                  `${styles.atcBtn} ${styles.atcGo}`,
                )}
              {nothingToSend && (
                <button
                  type="button"
                  className={styles.atcBtn}
                  onClick={() => toggle(it.partner, "log")}
                  aria-expanded={logOpen}
                >
                  Log activity ✎
                </button>
              )}
              {fresh && !nothingToSend && (
                <button
                  type="button"
                  className={`${styles.atcBtn} ${it.status === "none" ? styles.atcHot : ""}`}
                  onClick={() => toggle(it.partner, "send")}
                  aria-expanded={sendOpen}
                >
                  {it.status === "archived" ? "New outreach ＋" : "Send roundup ▸"}
                </button>
              )}

              <button
                type="button"
                className={styles.atcMore}
                onClick={() => toggle(it.partner, "more")}
                aria-expanded={moreOpen}
                aria-label={`More actions for ${it.partner}`}
              >
                ⌄
              </button>
            </div>

            {/* ⌄ — the rest of the moves, one compact line */}
            {moreOpen && (
              <div className={styles.atcPanel}>
                {!fresh && (
                  <>
                    {it.status !== "replied" &&
                      keyForm(
                        it.subjectKey,
                        markReplied,
                        "They replied ✓",
                        styles.atcBtn,
                      )}
                    {it.status === "replied" &&
                      keyForm(it.subjectKey, markResponded, "I replied ✓", styles.atcBtn)}
                    {keyForm(
                      it.subjectKey,
                      archiveThread,
                      "Archive thread",
                      styles.atcBtn,
                    )}
                    <form action={delayFollowUp} className={styles.valInline}>
                      <input type="hidden" name="subjectKey" value={it.subjectKey} />
                      <input type="hidden" name="when" value="today" />
                      <button className={styles.atcBtn}>Delay: later today</button>
                    </form>
                    <form action={delayFollowUp} className={styles.valInline}>
                      <input type="hidden" name="subjectKey" value={it.subjectKey} />
                      <input type="hidden" name="when" value="tomorrow" />
                      <button className={styles.atcBtn}>Delay: tomorrow</button>
                    </form>
                    {it.status === "awaiting" &&
                      keyForm(it.subjectKey, deleteTouch, "Undo send", styles.atcBtn)}
                    {/* Reality skipped steps — set the state directly. The
                        override is stamped into the thread history. */}
                    <form action={setThreadStatus} className={styles.atcStateForm}>
                      <input type="hidden" name="subjectKey" value={it.subjectKey} />
                      <select
                        name="status"
                        defaultValue={it.status}
                        aria-label="Set thread state"
                      >
                        <option value="awaiting">awaiting reply</option>
                        <option value="replied">they replied</option>
                        <option value="responded">I replied</option>
                        <option value="archived">archived</option>
                      </select>
                      <button className={styles.atcBtn}>Set state</button>
                    </form>
                  </>
                )}
                <button
                  type="button"
                  className={styles.atcBtn}
                  onClick={() => toggle(it.partner, "send")}
                >
                  {fresh ? "Open the editor ▸" : "New outreach ＋"}
                </button>
                <button
                  type="button"
                  className={styles.atcBtn}
                  onClick={() => toggle(it.partner, "log")}
                >
                  Log activity ✎
                </button>
                <a href={it.draftHref} className={styles.atcBtn}>
                  ✍ Drafting desk
                </a>
                <Link
                  href={`/partners#${encodeURIComponent(it.partner)}`}
                  className={styles.atcBtn}
                >
                  Partner room →
                </Link>
              </div>
            )}

            {/* Log activity — a dated partner note (Partner Room + the card's
                notes strip), for work that happened outside a roundup thread. */}
            {logOpen && (
              <div className={styles.atcPanel}>
                <form action={addPartnerNote} className={styles.atcLogForm}>
                  <input type="hidden" name="partner" value={it.partner} />
                  <input type="hidden" name="source" value="today" />
                  <input type="hidden" name="returnTo" value="/today" />
                  <input
                    name="body"
                    required
                    maxLength={4000}
                    placeholder={`What happened with ${it.partner.split(" ")[0]}? (dated — lands in the Partner Room)`}
                    aria-label="Activity note"
                  />
                  <button className={styles.atcBtn}>Log it ✓</button>
                </form>
              </div>
            )}

            {/* Send / new-outreach editor — the only thing that ever gets tall */}
            {sendOpen && (
              <div className={styles.atcPanel}>
                <ContactControl
                  subjectKey={it.subjectKey}
                  kind="partner"
                  label={it.partner}
                  detail={it.detail}
                  defaultMessage={it.defaultMessage}
                  sentLabel="Mark contacted ✓"
                  editLabel={`Edit & copy the roundup to ${it.partner.split(" ")[0]}`}
                  status="none"
                  sections={it.sections}
                  frame={it.frame}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
