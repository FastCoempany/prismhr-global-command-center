"use client";

import { useState } from "react";
import Link from "next/link";
import {
  archiveThread,
  delayFollowUp,
  deleteTouch,
  markReplied,
  markResponded,
} from "./actions";
import { ContactControl } from "../today-client";
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
  defaultMessage: string; // current-research roundup (or follow-up context)
  draftHref: string; // drafting desk anchor in the Partner Room
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

export function AtcRail({ items }: { items: RailItem[] }) {
  // One panel open at a time: the send editor or the ⌄ secondary actions.
  const [open, setOpen] = useState<{ partner: string; kind: "send" | "more" } | null>(
    null,
  );
  const toggle = (partner: string, kind: "send" | "more") =>
    setOpen((o) =>
      o && o.partner === partner && o.kind === kind ? null : { partner, kind },
    );

  return (
    <div className={styles.atcRail}>
      <div className={styles.atcHead}>Control — next action per partner</div>
      {items.map((it) => {
        const sendOpen = open?.partner === it.partner && open.kind === "send";
        const moreOpen = open?.partner === it.partner && open.kind === "more";
        const fresh = it.status === "none" || it.status === "archived";
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
              {fresh && (
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
                  </>
                )}
                <button
                  type="button"
                  className={styles.atcBtn}
                  onClick={() => toggle(it.partner, "send")}
                >
                  {fresh ? "Open the editor ▸" : "New outreach ＋"}
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
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
