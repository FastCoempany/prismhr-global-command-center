// Phase 13.3 · THE BRAIN'S VITAL SIGNS.
//
// Not a vanity dashboard. This is how "why is the room being stupid today"
// becomes a two-minute check instead of an afternoon: what it has read, what it
// is still holding, what it has spent against the day's ceilings, and what the
// eval set is watching for.
//
// Same auth as the room. There is no public surface.

import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { brainStats, recentAsks, todayCounts } from "@/lib/intranet/store";
import {
  CEILINGS,
  EVAL_SET,
  TARGETS,
  healthLine,
  readCeilings,
} from "@/lib/intranet/evals";
import { PROMPT_VERSION } from "@/lib/intranet/doctrine";
import { brainQueue } from "../runners";
import { SelfCheck } from "./self-check";
import styles from "../../command-center.module.css";

export const dynamic = "force-dynamic";
// The self-check runs six real questions back to back.
export const maxDuration = 300;

export default async function IntranetHealthPage() {
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

  const [stats, queue, today, asks] = await Promise.all([
    brainStats(),
    brainQueue(),
    todayCounts(),
    recentAsks(10),
  ]);
  const ceiling = readCeilings(today);

  return (
    <>
      <AppWayfinder current="Intranet" />
      <main className={styles.wrap}>
        <div className={styles.pageHead}>
          <h1 className={styles.h1}>The brain&apos;s vital signs</h1>
          <p className={styles.sub}>
            What it has read, what it is still holding, and what it has spent today.{" "}
            <Link href="/intranet">Back to the room</Link>.
          </p>
        </div>

        <div className={styles.itHealth}>
          <p className={styles.itHealthLine}>
            {healthLine({
              docs: stats.docs,
              claims: stats.claims,
              topics: stats.topics,
              pending: queue.pending,
              todayDocs: today.docs,
              todayAsks: today.asks,
            })}
          </p>

          <section className={styles.itPanel}>
            <p className={styles.itPanelHead}>The corpus</p>
            <div className={styles.itMeter}>
              <span>Documents</span>
              <span className={styles.itMeterN}>{stats.docs}</span>
            </div>
            <div className={styles.itMeter}>
              <span>Claims</span>
              <span className={styles.itMeterN}>{stats.claims}</span>
            </div>
            <div className={styles.itMeter}>
              <span>Questions prospects asked</span>
              <span className={styles.itMeterN}>{stats.prospectQuestions}</span>
            </div>
            <div className={styles.itMeter}>
              <span>Live topics</span>
              <span className={styles.itMeterN}>{stats.topics}</span>
            </div>
            <div className={styles.itMeter}>
              <span>Waiting to be read</span>
              <span className={styles.itMeterN}>{queue.pending}</span>
            </div>
            <div className={styles.itMeter}>
              <span>Proposed topics not yet on the rail</span>
              <span className={styles.itMeterN}>{queue.unindexed}</span>
            </div>
            <div className={styles.itMeter}>
              <span>Reading rubric</span>
              <span className={styles.itMeterN}>{PROMPT_VERSION}</span>
            </div>
          </section>

          <section className={styles.itPanel}>
            <p className={styles.itPanelHead}>Today, against the ceilings</p>
            {ceiling.breached && <p className={styles.itBreach}>{ceiling.line}</p>}
            <div className={styles.itMeter}>
              <span>Documents read</span>
              <span className={styles.itMeterN}>
                {today.docs} / {CEILINGS.docsPerDay}
              </span>
            </div>
            <div className={styles.itMeter}>
              <span>Questions answered</span>
              <span className={styles.itMeterN}>
                {today.asks} / {CEILINGS.asksPerDay}
              </span>
            </div>
            <div className={styles.itMeter}>
              <span>Claims into one answer</span>
              <span className={styles.itMeterN}>at most {CEILINGS.claimsPerAsk}</span>
            </div>
          </section>

          <section className={styles.itPanel}>
            <p className={styles.itPanelHead}>What the self-check watches</p>
            <div className={styles.itMeter}>
              <span>Recall on what a human marked relevant</span>
              <span className={styles.itMeterN}>≥ {TARGETS.recall}</span>
            </div>
            <div className={styles.itMeter}>
              <span>Every citation credited to the right speaker</span>
              <span className={styles.itMeterN}>{TARGETS.attribution.toFixed(2)}</span>
            </div>
            <div className={styles.itMeter}>
              <span>Declines what the record cannot answer</span>
              <span className={styles.itMeterN}>{TARGETS.abstention.toFixed(2)}</span>
            </div>
            <div className={styles.itMeter}>
              <span>Every assertion traces to a cited claim</span>
              <span className={styles.itMeterN}>≥ {TARGETS.grounded}</span>
            </div>
            {EVAL_SET.map((c) => (
              <div key={c.id} className={styles.itEvalRow}>
                <span>
                  {c.question}
                  <span className={styles.itEvalProves}> — {c.proves}</span>
                </span>
              </div>
            ))}
          </section>

          <SelfCheck />

          <section className={styles.itPanel}>
            <p className={styles.itPanelHead}>The last ten questions</p>
            {asks.length === 0 && (
              <p className={styles.itEvalProves}>Nothing has been asked yet.</p>
            )}
            {asks.map((a) => (
              <div key={a.id} className={styles.itAskRowLog}>
                <span>{a.question}</span>
                <span className={styles.itMeterN}>
                  {a.model || "—"} · {Math.round((a.ms ?? 0) / 100) / 10}s
                </span>
              </div>
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
