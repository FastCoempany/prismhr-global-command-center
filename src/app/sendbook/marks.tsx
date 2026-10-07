// The marks a Sendbook line carries after its clause: the live campaign, the
// lane, and the two annotations. ↩ REPLIED and BOOKED are doors (the
// click-depth law; pass 8 S2): one click opens, in place, the message each
// one reports, its writer, subject and day, and the words they wrote when
// the record holds them. No page and no link: a <details>, so the register
// stays a server render.

import type { SendAnswer } from "@/lib/sendbook/read";
import styles from "./sendbook.module.css";

export const shortDate = (iso: string): string => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  return d.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    timeZone: "America/Chicago",
  });
};

/** The copy the marks carry, named so the suite reads what the operator
 *  reads. Plain speech: no em-dash asides, no antithesis (pass 8 S1). */
export const MARK_TITLES = {
  mktg: "Marketing emailed this account in the last seven days. Your note lands next to theirs.",
  cold: "They have replied or met with us before, on the record or in the weekly export. Pick up where it left off.",
  booked:
    "Their calendar accepted a meeting after this send. The calendar answered, so it doesn't count as a reply and doesn't warm the account.",
} as const;

function Answer({ a, label, title }: { a: SendAnswer; label: string; title?: string }) {
  return (
    <details className={styles.door}>
      <summary className={styles.mark} title={title}>
        {label} {shortDate(a.at)}
      </summary>
      <div className={styles.answer}>
        <span className={styles.answerKick}>
          {shortDate(a.at)}
          {a.who ? ` · ${a.who}` : ""}
          {a.from === "export" ? " · THE WEEKLY EXPORT" : ""}
        </span>
        {a.head && <span className={styles.answerHead}>{a.head}</span>}
        {a.excerpt && <span className={styles.answerBody}>{a.excerpt}</span>}
      </div>
    </details>
  );
}

export function SendMarks({
  mktg,
  cold,
  reply,
  booking,
}: {
  mktg: boolean;
  cold: boolean;
  reply: SendAnswer | null;
  booking: SendAnswer | null;
}) {
  return (
    <>
      {mktg && (
        <span className={styles.mktgLive} title={MARK_TITLES.mktg}>
          MKTG LIVE
        </span>
      )}
      {cold && (
        <span className={styles.cold} title={MARK_TITLES.cold}>
          GONE COLD
        </span>
      )}
      {reply && <Answer a={reply} label="↩ REPLIED" />}
      {booking && <Answer a={booking} label="BOOKED" title={MARK_TITLES.booked} />}
    </>
  );
}
