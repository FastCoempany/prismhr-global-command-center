// The Sendbook as it paints (triptych winner, decreed 2026-08-19): the week
// head, the channel filter, every touch a dated line under day kickers,
// newest first, and the lane legend. It tells what happened; what is due
// next stays Groundwork's, so nothing here is a move, a date ahead or a
// question about how a touch went. The page holds the reads; this holds the
// face, so the suite can render it.

import Link from "next/link";
import type { Channel, SendAnswer, weekStats } from "@/lib/sendbook/read";
import { SendMarks } from "./marks";
import styles from "./sendbook.module.css";

/** One register line as the face paints it. */
export type RegisterLine = {
  accountId: string;
  at: string;
  channel: Channel;
  contact: string;
  clause: string;
  step: number;
  name: string;
  /** The Chicago day kicker the line sits under. */
  day: string;
  reply: SendAnswer | null;
  booking: SendAnswer | null;
  /** A live marketing cadence, marked once per account on its newest line. */
  mktg: boolean;
  cold: boolean;
};

export function SendbookRegister({
  week,
  channelsPresent,
  filter,
  lines,
  total,
  allHref,
}: {
  week: ReturnType<typeof weekStats>;
  channelsPresent: readonly Channel[];
  filter: Channel | "";
  lines: readonly RegisterLine[];
  /** Every line the register holds under the filter, before the cap. */
  total: number;
  /** The door to every line past the cap. */
  allHref: string;
}) {
  return (
    <main className={styles.wrap}>
      <h1 className={styles.masthead}>The Sendbook</h1>
      <p className={styles.sub}>
        Every outreach touch, from the sends filed through the Chute and the taps in the
        Channel Ask. Replies come from the record. What&rsquo;s due next is on{" "}
        <Link href="/groundwork">Groundwork</Link>.
      </p>

      <div className={styles.weekhead}>
        <span className={styles.whBig}>
          {week.total} {week.total === 1 ? "touch" : "touches"} this week
        </span>
        {week.total > 0 && (
          <>
            <span className={styles.whMix}>
              {week.byChannel.map(([c, n]) => `${n} ${c}`).join(" · ")}
            </span>
            <span className={styles.whMix}>
              {week.accounts} ACCOUNT{week.accounts === 1 ? "" : "S"}
              {week.goneCold > 0
                ? ` · ${week.neverMet} NEVER MET · ${week.goneCold} GONE COLD`
                : ""}
              {week.replied > 0 ? ` · ${week.replied} REPLIED` : ""}
            </span>
          </>
        )}
      </div>

      {channelsPresent.length > 1 && (
        <div className={styles.filters}>
          <Link href="/sendbook" className={filter ? styles.fChip : styles.fChipOn}>
            ALL
          </Link>
          {channelsPresent.map((c) => (
            <Link
              key={c}
              href={`/sendbook?ch=${encodeURIComponent(c)}`}
              className={filter === c ? styles.fChipOn : styles.fChip}
            >
              {c}
            </Link>
          ))}
        </div>
      )}

      {lines.length === 0 && (
        <p className={styles.empty}>
          No outreach on the book yet. Work a move on Groundwork or drop a sent email in
          the Chute. Every touch lands here.
        </p>
      )}

      {lines.map((l, i) => (
        <div key={`${l.accountId}:${l.at}:${i}`}>
          {(i === 0 || l.day !== lines[i - 1].day) && (
            <div className={styles.day}>{l.day}</div>
          )}
          <div className={styles.line}>
            <span className={styles.ch}>{l.channel}</span>
            <span className={styles.acct}>
              <Link href={`/accounts?focus=${encodeURIComponent(l.accountId)}`}>
                {l.name}
              </Link>
            </span>
            <span className={styles.step}>STEP {l.step}</span>
            <span className={styles.clause}>
              {l.clause}
              {l.contact ? (l.clause ? ` · ${l.contact}` : l.contact) : ""}
            </span>
            <SendMarks mktg={l.mktg} cold={l.cold} reply={l.reply} booking={l.booking} />
          </div>
        </div>
      ))}

      {total > lines.length && (
        <p className={styles.empty}>
          The register shows the last {lines.length}.{" "}
          <Link href={allHref}>Show all {total}.</Link>
        </p>
      )}

      <p className={styles.legend}>
        NEVER MET means they have never replied and no meeting was ever held. Your own
        outreach never warms an account, and a CSM intro doesn&rsquo;t either.
      </p>
    </main>
  );
}
