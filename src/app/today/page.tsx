import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { loadCommand, todayIso, type PeoRow } from "@/lib/command-center/data";
import { STAGES, isGated, stageLabel, suggestedAction } from "@/lib/command-center/types";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";

const activeSet = new Set(STAGES.filter((s) => s.pipeline).map((s) => s.key));

// Gate-aware: never suggest a channel-jumping move for a PEO the CSM hasn't cleared.
function nextStepFor(r: PeoRow): string | null {
  if (isGated(r.approach)) return `Clear ${r.name} with ${r.csm} first`;
  return suggestedAction(r);
}

function Row({ r, note }: { r: PeoRow; note?: React.ReactNode }) {
  return (
    <div className={styles.item}>
      <Link href={`/book?peo=${r.id}`}>{r.name}</Link>
      {note}
    </div>
  );
}

export default async function TodayPage() {
  const data = await loadCommand();

  if (data.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Today" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const today = todayIso();
  const due = data.rows
    .filter((r) => r.nextActionDate && r.nextActionDate <= today)
    .sort((a, b) => (a.nextActionDate ?? "").localeCompare(b.nextActionDate ?? ""));
  const upcoming = data.rows
    .filter((r) => r.nextActionDate && r.nextActionDate > today)
    .sort((a, b) => (a.nextActionDate ?? "").localeCompare(b.nextActionDate ?? ""))
    .slice(0, 8);
  const inflight = data.rows.filter((r) => activeSet.has(r.stage) && !r.nextActionDate);
  const starts = data.rows
    .filter((r) => r.stage === "NOT_TOUCHED")
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 8);

  return (
    <>
      <AppWayfinder current="Today" />
      <main className={styles.wrap}>
        <h1 className={styles.h1}>Today</h1>
        <p className={styles.sub}>Your next moves across the PEO channel, prioritized.</p>
        {data.status === "database-unavailable" && (
          <div className={styles.banner}>
            Working state is read-only — run <code>docs/command-center-tables.sql</code> in
            Supabase to start tracking stage and next actions.
          </div>
        )}

        <div className={styles.cards}>
          <div className={styles.card}>
            <h3>Due / overdue ({due.length})</h3>
            {due.length === 0 && <p className={styles.muted}>Nothing due. Nice.</p>}
            {due.map((r) => (
              <Row
                key={r.id}
                r={r}
                note={
                  <span
                    className={`${styles.due} ${(r.nextActionDate ?? "") < today ? styles.overdue : ""}`}
                  >
                    {r.nextAction ? `${r.nextAction} · ` : ""}
                    {r.nextActionDate}
                  </span>
                }
              />
            ))}
          </div>

          <div className={styles.card}>
            <h3>In flight, no next step ({inflight.length})</h3>
            {inflight.length === 0 && (
              <p className={styles.muted}>All active PEOs have a next step.</p>
            )}
            {inflight.map((r) => (
              <div key={r.id} className={styles.itemStack}>
                <div className={styles.itemTop}>
                  <Link href={`/book?peo=${r.id}`}>{r.name}</Link>
                  <span className={styles.chip}>{stageLabel(r.stage)}</span>
                </div>
                {nextStepFor(r) && <div className={styles.suggest}>{nextStepFor(r)}</div>}
              </div>
            ))}
          </div>

          <div className={styles.card}>
            <h3>Upcoming ({upcoming.length})</h3>
            {upcoming.length === 0 && <p className={styles.muted}>Nothing scheduled ahead.</p>}
            {upcoming.map((r) => (
              <Row key={r.id} r={r} note={<span className={styles.due}>{r.nextActionDate}</span>} />
            ))}
          </div>

          <div className={styles.card}>
            <h3>Suggested starts — highest priority, untouched</h3>
            {starts.map((r) => (
              <div key={r.id} className={styles.itemStack}>
                <div className={styles.itemTop}>
                  <Link href={`/book?peo=${r.id}`}>{r.name}</Link>
                  <span className={styles.chip}>
                    {r.priority} · {r.csm}
                  </span>
                </div>
                <div className={styles.suggest}>Brief {r.csm} on {r.name}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
