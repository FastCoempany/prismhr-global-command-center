import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { SfCheckpoint } from "@/components/sf";
import type { LinkedNote } from "@/components/account-notes";
import { peos } from "@/lib/book";
import { loadDashboard } from "@/lib/dashboard/data";
import { loadTodos } from "@/lib/today/overlay";
import { DashboardClient } from "./dashboard-client";
import styles from "./command-center.module.css";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await loadDashboard();

  // Surface notetaker notes on their card, matched by account name (cards are
  // keyed by name; notes carry the account id → resolve via the book).
  const nameById = new Map(peos.map((p) => [p.id, p.name]));
  const notesByName: Record<string, LinkedNote[]> = {};
  for (const t of await loadTodos()) {
    const name = t.accountId ? nameById.get(t.accountId) : undefined;
    if (!name) continue;
    (notesByName[name] ??= []).push({
      id: t.id,
      body: t.body,
      done: t.done,
      remindAt: t.remindAt,
    });
  }

  if (data.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Dashboard" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <AppWayfinder current="Dashboard" />
      <main className={styles.wrap}>
        <h1 className={styles.h1}>Dashboard</h1>
        <p className={styles.sub}>
          Your hand-sewn board — manual, wired to nothing. Click any node to set its state and note
          what has to happen for it to go green. <Link href="/accounts">Open the Account Room →</Link>
        </p>
        <SfCheckpoint when="dashboard" />

        {data.status === "database-unavailable" && (
          <div className={styles.banner}>
            Read-only — run <code>docs/dashboard-tables.sql</code> in Supabase to start saving cards
            and node states. This board&apos;s table is isolated from everything else.
          </div>
        )}
        <DashboardClient
          cards={data.cards}
          canWrite={data.canWrite}
          dbUnavailable={data.status === "database-unavailable"}
          labels={data.labels}
          notesByName={notesByName}
        />
      </main>
    </>
  );
}
