// V.7 · THE PASTE ARCHIVE — hidden, complete, verbatim.
//
// Every paste the room has ever received, exactly as it arrived (after the
// money redaction that happens before the first write — there is no
// pre-redaction text anywhere to show). Nothing here is rewritten, summarized,
// or thinned. The page is linked from one quiet corner of the room and from
// nowhere else.

import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { allCaptures } from "@/lib/intranet/store";
import { sentFrom } from "@/lib/intranet/ledger";
import styles from "../../command-center.module.css";

export const dynamic = "force-dynamic";

export default async function IntranetPastesPage() {
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

  const captures = await allCaptures(300);

  return (
    <>
      <AppWayfinder current="Intranet" />
      <main className={styles.wrap}>
        <div className={styles.pageHead}>
          <h1 className={styles.h1}>Every paste, verbatim</h1>
          <p className={styles.sub}>
            The raw record of everything the room has been handed — nothing rewritten,
            nothing thinned. <Link href="/intranet">Back to the room</Link>.
          </p>
        </div>

        {captures.length === 0 && <p>Nothing has been pasted yet.</p>}

        <div className={styles.itPasteArchive}>
          {captures.map((c) => {
            const when = new Date(Date.parse(c.at)).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZone: "America/Chicago",
            });
            return (
              <details key={c.id} className={styles.itPasteRow}>
                <summary>
                  <span className={styles.itPasteStamp}>{when}</span>
                  <span className={styles.itPasteTitle}>
                    {c.title || c.space || "untitled"}
                  </span>
                  <span className={styles.itPasteMeta}>
                    {sentFrom(c.space, c.origin)} · {c.chars.toLocaleString()} characters
                  </span>
                </summary>
                <pre className={styles.itPasteRaw}>{c.raw}</pre>
              </details>
            );
          })}
        </div>
      </main>
    </>
  );
}
