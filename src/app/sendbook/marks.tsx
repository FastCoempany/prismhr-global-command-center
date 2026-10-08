// The marks a Sendbook line carries after its clause: the live campaign, the
// lane, and the two annotations. Every mark is a door (the click-depth law):
// ↩ REPLIED and BOOKED open, in place, the message each one reports, its
// writer, subject and day, and the words they wrote when the record holds
// them (pass 8 S2); GONE COLD opens the day the account was last warm and
// MKTG LIVE the count of marketing sends behind it (pass 10). No page and no
// link: a <details>, so the register stays a server render.

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

/** A mark that opens to the plain lines behind it, in place. */
function Door({ label, cls, lines }: { label: string; cls: string; lines: string[] }) {
  return (
    <details className={styles.door}>
      <summary className={cls}>{label}</summary>
      <div className={styles.answer}>
        {lines.map((l) => (
          <span key={l} className={styles.answerBody}>
            {l}
          </span>
        ))}
      </div>
    </details>
  );
}

export function SendMarks({
  mktg,
  cold,
  coldSince = "",
  mktgSends = 0,
  reply,
  booking,
}: {
  mktg: boolean;
  cold: boolean;
  /** The account's last warm moment on either record, for GONE COLD's door. */
  coldSince?: string;
  /** Marketing sends in the last seven days, for MKTG LIVE's door. */
  mktgSends?: number;
  reply: SendAnswer | null;
  booking: SendAnswer | null;
}) {
  return (
    <>
      {mktg && (
        <Door
          label="MKTG LIVE"
          cls={styles.mktgLive}
          lines={[
            ...(mktgSends > 0
              ? [
                  `Marketing sent ${mktgSends} email${mktgSends === 1 ? "" : "s"} here in the last seven days.`,
                ]
              : []),
            MARK_TITLES.mktg,
          ]}
        />
      )}
      {cold && (
        <Door
          label="GONE COLD"
          cls={styles.cold}
          lines={[
            ...(shortDate(coldSince) ? [`Last warm ${shortDate(coldSince)}.`] : []),
            MARK_TITLES.cold,
          ]}
        />
      )}
      {reply && <Answer a={reply} label="↩ REPLIED" />}
      {booking && <Answer a={booking} label="BOOKED" title={MARK_TITLES.booked} />}
    </>
  );
}
