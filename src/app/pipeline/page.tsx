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
        <div className={styles.pageHead}>
          <h1 className={styles.h1}>Pipeline</h1>

          <p className={styles.sub}>
            Archived. The <Link href="/room">Room</Link> is the pipeline — it holds every
            deal in motion and the stage each one is actually at. This view reads the
            older stage field kept on the account record, so it can lag what the Room
            knows; it survives as a plain column count, nothing more.
          </p>
        </div>
        {data.status === "database-unavailable" && (
          <div className={styles.banner}>
            Working state is read-only — run <code>docs/command-center-tables.sql</code>{" "}
            in Supabase, then set an account&apos;s stage from its row on Accounts.
          </div>
        )}

        {inPipeline.length === 0 ? (
          <div className={styles.empty}>
            Nothing carries the old stage field. The live pipeline is the{" "}
            <Link href="/room">Room</Link>.
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
                    // The old Book route redirects to Accounts and drops the id on
                    // the way. Link the account row directly so the click lands.
                    <Link
                      key={r.id}
                      href={`/accounts?peo=${r.id}`}
                      className={styles.pcard}
                    >
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
