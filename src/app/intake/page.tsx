// Intake — get Salesforce activity into the app without an API. Paste a
// timeline (or let the bookmarklet capture+copy it for you), preview the
// parsed entries, pick the account, file. Content under an inner scrollbar
// on the SF page comes through whole; only never-loaded content can't.

import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { peos } from "@/lib/book";
import { IntakeClient } from "./intake-client";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const access = await getAppAccess();
  if (access.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Intake" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const accounts = [...peos]
    .map((p) => ({ id: p.id, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <AppWayfinder current="Intake" />
      <main className={styles.wrap}>
        <div className={styles.pageHead}>
          <h1 className={styles.h1}>Intake — Salesforce activity</h1>
          <p className={styles.sub}>
            Copy an account&apos;s activity timeline in Salesforce (or click the
            bookmarklet there), paste it here, file it to the account. The app never
            writes to Salesforce.
          </p>
        </div>
        <IntakeClient accounts={accounts} />
      </main>
    </>
  );
}
