import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { loadCommand } from "@/lib/command-center/data";
import { STAGES } from "@/lib/command-center/types";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";

const boardStages = STAGES.filter((s) => s.pipeline || s.key === "WON");

export default async function PipelinePage() {
  const data = await loadCommand();

  if (data.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Pipeline" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const inPipeline = data.rows.filter((r) => boardStages.some((s) => s.key === r.stage));

  return (
    <>
      <AppWayfinder current="Pipeline" />
      <main className={styles.wrap}>
        <h1 className={styles.h1}>Pipeline</h1>
        <p className={styles.sub}>
          {inPipeline.length} PEO{inPipeline.length === 1 ? "" : "s"} in motion across the
          channel.
        </p>
        {data.status === "database-unavailable" && (
          <div className={styles.banner}>
            Working state is read-only — run <code>docs/command-center-tables.sql</code> in
            Supabase, then move PEOs through stages from the Book.
          </div>
        )}

        {inPipeline.length === 0 ? (
          <div className={styles.empty}>
            Nothing in motion yet. Head to <Link href="/book">Book</Link> and move a high-fit PEO
            to a stage.
          </div>
        ) : (
          <div className={styles.cols}>
            {boardStages.map((s) => {
              const rows = inPipeline
                .filter((r) => r.stage === s.key)
                .sort((a, b) => b.priority - a.priority);
              return (
                <div key={s.key} className={styles.col}>
                  <div className={styles.colHead}>
                    <span style={{ color: "var(--navy)" }}>{s.label}</span>
                    <span>{rows.length}</span>
                  </div>
                  {rows.map((r) => (
                    <Link key={r.id} href={`/book?peo=${r.id}`} className={styles.pcard}>
                      <div className={styles.nm}>{r.name}</div>
                      <div className={styles.rowSub}>
                        {r.csm} · priority {r.priority}
                        {r.approach === "NEEDS_CSM" ? " · needs CSM" : ""}
                        {r.nextAction ? ` · ${r.nextAction}` : ""}
                      </div>
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
