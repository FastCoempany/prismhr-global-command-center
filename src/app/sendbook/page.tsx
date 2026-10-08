// The Sendbook — the register of outreach (triptych winner, decreed
// 2026-08-19). Every touch a dated line under day kickers, newest first; the
// week head carries the counts; replies annotate from the record, never from
// the operator's memory. Purely a read of the touch stores — it can never
// disagree with the queue. The forward motion (what is due next) stays
// Groundwork's; this page tells what happened.

import { fetchSecondRecords, type SecondRecord } from "@/lib/activity/read";
import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { getPeo } from "@/lib/book";
import { homeSideFrom } from "@/lib/pipeline/build";
import type { AccountRead } from "@/lib/record/read";
import { declaredHomeSide, readFromStores } from "@/lib/record/stores";
import {
  SENDBOOK_NS,
  buildSendbook,
  orgSignalsOf,
  weekStats,
  type Channel,
  type NoteLike,
} from "@/lib/sendbook/read";
import {
  isNamespacedAccountId,
  loadAccountNotes,
  loadDispositions,
  loadTodos,
  loadTouches,
} from "@/lib/today/overlay";
import { dayLabelFor } from "@/lib/scratch";
import { SendbookRegister } from "./register";
import styles from "./sendbook.module.css";

export const dynamic = "force-dynamic";

const LINE_CAP = 400;

export default async function SendbookPage({
  searchParams,
}: {
  searchParams: Promise<{ ch?: string; all?: string }>;
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
  const [notesMap, dispositions, touches, todos] = await Promise.all([
    loadAccountNotes(),
    loadDispositions(),
    loadTouches(),
    loadTodos(),
  ]);

  const tapsById = new Map<string, NoteLike[]>();
  const accountIds: string[] = [];
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
    accountIds.push(id);
  }

  // The second record, parsed once for the whole book; the read folds it by
  // canonical id (E17), and the register reads its attributed inbound
  // through the read (D19).
  const secondById: Map<string, SecondRecord> = await fetchSecondRecords().catch(
    () => new Map(),
  );
  // The single account read per account, assembled exactly as Groundwork
  // assembles its own — the full rows with their actors and recipients, the
  // declared roster over the whole book, the hide filter inside the read — so
  // this register and the Tallyfoot's are one register (pass 4 G4; slice 13).
  const stores = {
    notesById: notesMap,
    touches,
    todos,
    dispositions,
    secondById,
    homeSide: declaredHomeSide(homeSideFrom(notesMap)),
  };
  const readsById = new Map<string, AccountRead>();
  for (const id of accountIds)
    readsById.set(
      id,
      readFromStores(stores, { id, name: getPeo(id)?.name ?? id }, { now }),
    );
  const book = buildSendbook({ readsById, tapsById, now });
  // A live marketing cadence marks the line. It informs and blocks nothing.
  const mktgLive = new Set<string>();
  for (const [id, read] of readsById)
    if (orgSignalsOf(read.secondRecord).mktgLive) mktgLive.add(id);
  // The cadence marker speaks once per account — on its newest line — never
  // as a wall down the register (quiet ink, the canon's way).
  const newestLineAt = new Map<string, string>();
  for (const l of book.lines)
    if (!newestLineAt.has(l.accountId)) newestLineAt.set(l.accountId, l.at);
  const week = weekStats(book, now);

  const { ch, all } = await searchParams;
  // The cap's door opens every line (the click-depth law).
  const cap = all === "1" ? Number.POSITIVE_INFINITY : LINE_CAP;
  const channelsPresent = [...new Set(book.lines.map((l) => l.channel))];
  const filter = channelsPresent.includes((ch ?? "") as Channel) ? (ch as Channel) : "";
  const lines = (filter ? book.lines.filter((l) => l.channel === filter) : book.lines)
    .slice(0, cap)
    .map((l) => ({
      ...l,
      name: getPeo(l.accountId)?.name ?? l.accountId,
      day: dayLabelFor(l.at, now),
    }));

  return (
    <>
      <AppWayfinder current="Groundwork" trail="The record" />
      <SendbookRegister
        week={week}
        channelsPresent={channelsPresent}
        filter={filter}
        lines={lines.map((l) => ({
          ...l,
          mktg: mktgLive.has(l.accountId) && newestLineAt.get(l.accountId) === l.at,
          cold: book.laneById.get(l.accountId) === "gone-cold",
        }))}
        total={
          filter
            ? book.lines.filter((l) => l.channel === filter).length
            : book.lines.length
        }
        allHref={`/sendbook?${new URLSearchParams({ ...(filter ? { ch: filter } : {}), all: "1" }).toString()}`}
      />
    </>
  );
}
