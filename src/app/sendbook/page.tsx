// The Sendbook — the register of outreach (triptych winner, decreed
// 2026-08-19). Every touch a dated line under day kickers, newest first; the
// week head carries the counts; replies annotate from the record, never from
// the operator's memory. Purely a read of the touch stores — it can never
// disagree with the queue. The forward motion (what is due next) stays
// Groundwork's; this page tells what happened.

import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { getPeo } from "@/lib/book";
import {
  SENDBOOK_NS,
  buildSendbook,
  weekStats,
  type Channel,
  type NoteLike,
} from "@/lib/sendbook/read";
import {
  isNamespacedAccountId,
  loadAccountNotes,
  loadDispositions,
} from "@/lib/today/overlay";
import { dayLabelFor } from "@/lib/scratch";
import styles from "./sendbook.module.css";

export const dynamic = "force-dynamic";

const LINE_CAP = 400;

const shortDate = (iso: string): string => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  return d.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    timeZone: "America/Chicago",
  });
};

export default async function SendbookPage({
  searchParams,
}: {
  searchParams: Promise<{ ch?: string }>;
}) {
  const access = await getAppAccess();
  if (access.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Groundwork" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const now = new Date();
  const [notesMap, dispositions] = await Promise.all([
    loadAccountNotes(),
    loadDispositions(),
  ]);

  const notesById = new Map<string, NoteLike[]>();
  const tapsById = new Map<string, NoteLike[]>();
  for (const [id, notes] of notesMap) {
    if (id.startsWith(SENDBOOK_NS)) {
      const accountId = id.slice(SENDBOOK_NS.length);
      if (accountId)
        tapsById.set(
          accountId,
          notes.map((n) => ({ body: n.body, source: n.source, createdAt: n.createdAt })),
        );
      continue;
    }
    if (isNamespacedAccountId(id)) continue;
    notesById.set(
      id,
      notes
        .filter((n) => !dispositions.has(`hide:note:${n.id}`))
        .map((n) => ({
          body: n.body,
          source: n.source,
          createdAt: n.createdAt,
          actors: n.actors,
        })),
    );
  }

  const book = buildSendbook({ notesById, tapsById, now });
  const week = weekStats(book, now);

  const { ch } = await searchParams;
  const channelsPresent = [...new Set(book.lines.map((l) => l.channel))];
  const filter = channelsPresent.includes((ch ?? "") as Channel) ? (ch as Channel) : "";
  const lines = (filter ? book.lines.filter((l) => l.channel === filter) : book.lines)
    .slice(0, LINE_CAP)
    .map((l) => ({
      ...l,
      name: getPeo(l.accountId)?.name ?? l.accountId,
      day: dayLabelFor(l.at, now),
    }));

  return (
    <>
      <AppWayfinder current="Groundwork" trail="The record" />
      <main className={styles.wrap}>
        <h1 className={styles.masthead}>The Sendbook</h1>
        <p className={styles.sub}>
          Every outreach touch, kept — the Chute&rsquo;s filed sends and the Channel
          Ask&rsquo;s tapped ones, one register. Replies annotate from the record. What is
          due next stays on <Link href="/groundwork">Groundwork</Link>.
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
            the Chute — every touch lands here.
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
                {l.contact ? (l.clause ? ` — ${l.contact}` : l.contact) : ""}
              </span>
              {book.laneById.get(l.accountId) === "gone-cold" && (
                <span
                  className={styles.cold}
                  title="They have spoken before — a reply or a meeting is on file. The thread went cold; this is a re-open, not an introduction."
                >
                  GONE COLD
                </span>
              )}
              {l.repliedAt && (
                <span className={styles.replied}>↩ REPLIED {shortDate(l.repliedAt)}</span>
              )}
            </div>
          </div>
        ))}

        {book.lines.length > LINE_CAP && (
          <p className={styles.empty}>
            The register shows the last {LINE_CAP}. The record keeps everything.
          </p>
        )}

        <p className={styles.legend}>
          NEVER MET is the register&rsquo;s default population — no reply ever, no meeting
          ever held, whatever was thrown at them. The operator&rsquo;s own outbound never
          warms an account; a CSM intro doesn&rsquo;t either.
        </p>
      </main>
    </>
  );
}
