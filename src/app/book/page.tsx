import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { loadCommand } from "@/lib/command-center/data";
import { BookClient } from "./book-client";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const pick = (k: string) => {
    const v = params[k];
    return typeof v === "string" ? v : undefined;
  };
  const data = await loadCommand();

  if (data.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Book" />
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
      <AppWayfinder current="Book" />
      <main className={styles.wrap}>
        <h1 className={styles.h1}>Book</h1>
        <p className={styles.sub}>
          {data.rows.length} PEO partner accounts, grouped by CSM, ranked by fit.
        </p>
        {data.status === "database-unavailable" && (
          <div className={styles.banner}>
            Working state is read-only — run <code>docs/command-center-tables.sql</code> in
            Supabase to enable saving stage / next actions.
          </div>
        )}
        <BookClient
          rows={data.rows}
          canWrite={data.canWrite}
          dbUnavailable={data.status === "database-unavailable"}
          initialPeoId={pick("peo")}
          justSaved={pick("saved") === "1"}
        />
      </main>
    </>
  );
}
