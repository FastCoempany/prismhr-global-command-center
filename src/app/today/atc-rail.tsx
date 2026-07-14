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

// Partner-thread rows for the cockpit's Work rail: one line per partner —
// status dot, one-phrase state, and THE next action the lifecycle says is due.
// Everything else tucks behind ⌄. Rows are composable (the page interleaves
// them with move rows and chase rows inside one rail).

export type RailItem = {
  partner: string;
  role: string;
  subjectKey: string;
  // Thread state, with "none" = fresh (roundup ready), "archived" kept
  // distinct so the phrase can say a fresh roundup is available, and "open" =
  // open-ended (not waiting on a reply — cadence off until a new exchange).
  status: "none" | "awaiting" | "replied" | "responded" | "archived" | "open";
  due: boolean; // check-in instant has arrived (awaiting/responded)
  phrase: string; // the one-line status, composed server-side
  dot: "green" | "yellow" | "orange" | "grey";
  detail: string;
  defaultMessage: string; // current-research roundup from the sendable accounts
  draftHref: string; // drafting desk anchor in the Partner Room
  sendable: number; // accounts still on the structured path (in the roundup)
  sections: RoundupSection[]; // composer rows — in-motion/parked default off
  frame: { opener: string; closer: string };
  cadenceDue?: boolean; // fresh row past the 2-day roundup cadence — surface hot
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

// One thread row. Panels (send editor / ⌄ actions / log-activity) open beneath
// it; each row manages its own state so rows compose anywhere in the rail.
export function AtcRow({ it }: { it: RailItem }) {
  const [open, setOpen] = useState<PanelKind | null>(null);
  const toggle = (kind: PanelKind) => setOpen((o) => (o === kind ? null : kind));
  const sendOpen = open === "send";
  const moreOpen = open === "more";
  const logOpen = open === "log";
  const fresh = it.status === "none" || it.status === "archived";
  const nothingToSend = fresh && it.sendable === 0;

  return (
    <div className={styles.atcRowWrap}>
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
        {/* Open-ended — nobody owes a reply; log the next exchange when it lands. */}
        {it.status === "open" && (
          <button
            type="button"
            className={styles.atcBtn}
            onClick={() => toggle("log")}
            aria-expanded={logOpen}
          >
            ＋ New exchange
          </button>
        )}
        {nothingToSend && (
          <button
            type="button"
            className={styles.atcBtn}
            onClick={() => toggle("log")}
            aria-expanded={logOpen}
          >
            Log activity ✎
          </button>
        )}
        {fresh && !nothingToSend && (
          <button
            type="button"
            className={`${styles.atcBtn} ${it.status === "none" ? styles.atcHot : ""}`}
            onClick={() => toggle("send")}
            aria-expanded={sendOpen}
          >
            {it.status === "archived" ? "New outreach ＋" : "Send roundup ▸"}
          </button>
        )}

        <button
          type="button"
          className={styles.atcMore}
          onClick={() => toggle("more")}
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
                keyForm(it.subjectKey, markReplied, "They replied ✓", styles.atcBtn)}
              {it.status === "replied" &&
                keyForm(it.subjectKey, markResponded, "I replied ✓", styles.atcBtn)}
              {keyForm(it.subjectKey, archiveThread, "Archive thread", styles.atcBtn)}
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
              {/* Reality skipped steps — set the state directly. The override
                  is stamped into the thread history. */}
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
                  <option value="open">↔ open-ended — not waiting</option>
                  <option value="archived">archived</option>
                </select>
                <button className={styles.atcBtn}>Set state</button>
              </form>
            </>
          )}
          <button type="button" className={styles.atcBtn} onClick={() => toggle("send")}>
            {fresh ? "Open the editor ▸" : "New outreach ＋"}
          </button>
          <button type="button" className={styles.atcBtn} onClick={() => toggle("log")}>
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

      {/* Log activity — a dated partner note (Partner Room + the card's notes
          strip), for work that happened outside a roundup thread. */}
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
}

// The curveball logger — account + what happened + the consequence. One
// capture: a dated account note, plus an optional disposition flip (in motion
// / parked / not mine) in the same write. Lives in the Work rail head.
export function CurveballButton({
  accounts,
}: {
  accounts: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={styles.atcCurveBtn}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Something happened off-script — log it once and let every surface reconcile"
      >
        ⚡ Curveball
      </button>
      {open && (
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
    </>
  );
}
