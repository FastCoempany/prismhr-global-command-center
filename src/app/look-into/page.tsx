import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { LOOK_INTO, lookIntoByCategory } from "@/lib/look-into";
import { loadLookIntoStatus } from "@/lib/look-into/status";
import { toggleLookInto } from "./actions";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";

const prioClass: Record<string, string> = {
  high: styles.fitHigh,
  medium: styles.fitMedium,
  low: styles.fitLow,
};

export default async function LookIntoPage() {
  const access = await getAppAccess();

  if (access.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Look into" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const { available, map } = await loadLookIntoStatus();
  const canWrite = access.status === "active" && access.canWrite && available;
  const isResolved = (id: string) => map.get(id)?.resolved === true;

  const groups = lookIntoByCategory()
    .map((g) => ({ ...g, items: g.items.filter((i) => !isResolved(i.id)) }))
    .filter((g) => g.items.length > 0);
  const resolved = LOOK_INTO.filter((i) => isResolved(i.id));
  const openHigh = LOOK_INTO.filter(
    (i) => i.priority === "high" && !isResolved(i.id),
  ).length;

  return (
    <>
      <AppWayfinder current="Look into" />
      <main className={styles.wrap}>
        <h1 className={styles.h1}>Look into</h1>
        <p className={styles.sub}>
          Open loops to resolve <b>internally</b> — where the command center runs on an
          assumption instead of a real source, system, or capability.{" "}
          {LOOK_INTO.length - resolved.length} open, {openHigh} high priority. Day-to-day
          asks live in the <Link href="/today">Today capture</Link>; these are the “go
          find out” items.
        </p>

        {groups.map((g) => (
          <section key={g.category} className={styles.band}>
            <div className={styles.bandHead}>
              <div>
                <h2 className={styles.bandTitle}>{g.category}</h2>
                <p className={styles.bandSub}>
                  {g.items.length} open item{g.items.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className={styles.bandBody}>
              {g.items.map((item) => (
                <div key={item.id} className={styles.lookItem}>
                  <div className={styles.lookTop}>
                    <span className={`${styles.fit} ${prioClass[item.priority]}`}>
                      {item.priority}
                    </span>
                    <span className={styles.lookTitle}>{item.title}</span>
                    <span className={styles.lookWhere}>{item.surfacedIn}</span>
                  </div>
                  <p className={styles.lookWhy}>{item.why}</p>
                  <p className={styles.lookAsk}>
                    <strong>Find out:</strong> {item.ask}
                  </p>
                  {canWrite && (
                    <form action={toggleLookInto} className={styles.lookResolve}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="resolved" value="true" />
                      <button className={styles.valBtn}>Mark resolved ✓</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {groups.length === 0 && (
          <p className={styles.muted}>Every open loop is resolved. Nice.</p>
        )}

        {resolved.length > 0 && (
          <details className={styles.archive}>
            <summary className={styles.archiveSummary}>
              <span className={styles.archiveTitle}>Resolved archive</span>
              <span className={styles.archiveCount}>{resolved.length} closed</span>
              <span className={styles.archiveHint}>— click to open</span>
            </summary>
            <div className={styles.archiveBody}>
              {resolved.map((item) => (
                <div key={item.id} className={styles.archiveRow}>
                  <span className={styles.archiveCheck}>✓</span>
                  <span className={styles.archiveName}>{item.title}</span>
                  <span className={styles.archiveWhere}>{item.surfacedIn}</span>
                  {canWrite && (
                    <form action={toggleLookInto} className={styles.noteResolve}>
                      <input type="hidden" name="itemId" value={item.id} />
                      <input type="hidden" name="resolved" value="false" />
                      <button className={styles.noteResolveBtn}>Reopen</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}

        <p className={styles.muted}>
          {available
            ? "Mark items resolved as you close them out. "
            : "Run docs/dashboard-tables.sql to enable marking items resolved. "}
          This list is curated as the app grows — tell me when you spot another seam to
          add.
        </p>
      </main>
    </>
  );
}
