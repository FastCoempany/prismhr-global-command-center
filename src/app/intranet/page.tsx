// The Intranet — the app's brain.
//
// Everything the operator has given it, plus everything the app itself knows,
// in one corpus. You ask it something; it reads across the whole of what it
// knows and answers. Citations underneath, drilling four levels to the message.
//
// The room reads. It never writes to a deal, never files a note, never moves a
// stage. Where an answer implies work it offers a link into the HomeRoom.
//
// The face keeps the pipeline's vocabulary out of sight (IV.1): the index rail
// carries the only standing numbers, and granularity appears only in citations
// and ingest receipts.

import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import {
  archiveDays,
  brainStats,
  countryIndex,
  ledgerEntries,
  loadTopics,
} from "@/lib/intranet/store";
import {
  childrenOf,
  isFresh,
  railTopics,
  stalenessLine,
} from "@/lib/intranet/index-topics";
import { synthAvailable } from "@/lib/intranet/synthesize";
import { brainQueue } from "./runners";
import { peos } from "@/lib/book";
import { ActivityDock } from "../activity/dock";
import { IntranetClient, type RailTopic } from "./intranet-client";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";
// Reading a long thread through Opus 5 outlives the platform's default window;
// the first production run died silently to exactly this (IV.2).
export const maxDuration = 300;

export default async function IntranetPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; grab?: string }>;
}) {
  const access = await getAppAccess();
  if (access.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Intranet" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const nowIso = new Date().toISOString();
  const [topics, stats, queue, params, ledger, archive, countries] = await Promise.all([
    loadTopics(),
    brainStats(),
    brainQueue(),
    searchParams,
    ledgerEntries({ limit: 40 }),
    archiveDays(),
    countryIndex(),
  ]);
  // Ask from anywhere (Phase 13.6): another room can hand the brain a question
  // pre-scoped to what it was looking at. Prefilled, never fired on arrival —
  // the operator reads it first.
  const initialQ = (params?.q ?? "").slice(0, 300);
  const grabArrived = params?.grab === "1";

  // The rail: live top-level topics, prospect questions first, each carrying
  // its children so a click decomposes without a round trip.
  const rail: RailTopic[] = railTopics(topics).map((t) => ({
    id: t.id,
    label: t.label,
    summary: t.summary,
    claims: t.claimCount,
    fresh: isFresh(t, nowIso),
    children: childrenOf(topics, t.id).map((c) => ({
      id: c.id,
      label: c.label,
      summary: c.summary,
      claims: c.claimCount,
      fresh: isFresh(c, nowIso),
      children: childrenOf(topics, c.id).map((g) => ({
        id: g.id,
        label: g.label,
        summary: g.summary,
        claims: g.claimCount,
        fresh: isFresh(g, nowIso),
        children: [],
      })),
    })),
  }));

  return (
    <>
      <AppWayfinder current="Intranet" />
      <main className={styles.wrap}>
        {/* The second record's door sits ABOVE the ledger, not under it. It
            spent its life rendered after the client, which on a page whose
            asked-list runs hundreds of rows deep meant the one control that
            takes a drop back was unreachable without scrolling past
            everything (2026-08-28). */}
        <ActivityDock
          book={peos.map((p) => ({ id: p.id, name: p.name }))}
          canWrite={access.canWrite}
        />
        <IntranetClient
          rail={rail}
          initialQ={initialQ}
          grabArrived={grabArrived}
          empty={stats.docs === 0}
          staleness={stalenessLine(stats.lastCaptureAt, nowIso)}
          queue={queue}
          ledger={ledger}
          archive={archive}
          countries={countries}
          nowIso={nowIso}
          canWrite={access.canWrite}
          canAnswer={synthAvailable()}
        />
      </main>
    </>
  );
}
