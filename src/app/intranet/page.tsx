// The Intranet — the app's brain.
//
// Everything the operator has given it, plus everything the app itself knows,
// in one corpus. You ask it something; it reads across the whole of what it
// knows and answers. Citations underneath, drilling four levels to the message.
//
// The room reads. It never writes to a deal, never files a note, never moves a
// stage. Where an answer implies work it offers a link into the HomeRoom.

import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { brainStats, loadTopics } from "@/lib/intranet/store";
import {
  childrenOf,
  isFresh,
  railTopics,
  stalenessLine,
} from "@/lib/intranet/index-topics";
import { synthAvailable } from "@/lib/intranet/synthesize";
import { IntranetClient, type RailTopic } from "./intranet-client";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";

export default async function IntranetPage() {
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
  const [topics, stats] = await Promise.all([loadTopics(), brainStats()]);

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
        <div className={styles.pageHead}>
          <h1 className={styles.h1}>Intranet</h1>
          <p className={styles.sub}>
            Everything you&apos;ve given it and everything the app knows — internal
            threads, meetings, demos, every note and action, and the whole Playbook. One
            brain. Ask it something.
          </p>
        </div>
        <IntranetClient
          rail={rail}
          stats={stats}
          staleness={stalenessLine(stats.lastCaptureAt, nowIso)}
          canWrite={access.canWrite}
          canAnswer={synthAvailable()}
        />
      </main>
    </>
  );
}
