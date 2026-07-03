import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { LOOK_INTO, lookIntoByCategory } from "@/lib/look-into";
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

  const groups = lookIntoByCategory();
  const highCount = LOOK_INTO.filter((i) => i.priority === "high").length;

  return (
    <>
      <AppWayfinder current="Look into" />
      <main className={styles.wrap}>
        <h1 className={styles.h1}>Look into</h1>
        <p className={styles.sub}>
          Open loops to resolve <b>internally</b> — where the command center runs on an assumption
          instead of a real source, system, or capability. {LOOK_INTO.length} open, {highCount} high
          priority. Day-to-day asks live in the <Link href="/today">Today capture</Link>; these are
          the “go find out” items.
        </p>

        {groups.map((g) => (
          <section key={g.category} className={styles.band}>
            <div className={styles.bandHead}>
              <div>
                <h2 className={styles.bandTitle}>{g.category}</h2>
                <p className={styles.bandSub}>
                  {g.items.length} item{g.items.length === 1 ? "" : "s"}
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
                </div>
              ))}
            </div>
          </section>
        ))}

        <p className={styles.muted}>
          This list is curated as the app grows — tell me when one&apos;s resolved, or when you spot
          another seam to add.
        </p>
      </main>
    </>
  );
}
