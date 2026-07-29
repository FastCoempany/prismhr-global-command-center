// Capture — get Salesforce activity into the app without an API. Paste a
// timeline (or let the bookmarklet capture+copy it for you), preview the
// parsed entries, pick the account, file. Content under an inner scrollbar
// on the SF page comes through whole; only never-loaded content can't.

import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { peos } from "@/lib/book";
import { aiCleanAvailable } from "@/lib/intel/ai-clean";
import { IntakeTabs } from "./intake-tabs";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const access = await getAppAccess();
  if (access.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Capture" />
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
      <AppWayfinder current="Capture" />
      <main className={styles.wrap}>
        <div className={styles.pageHead}>
          <h1 className={styles.h1}>Capture</h1>
          <p className={styles.sub}>
            The capture kit: the bookmarklets that grab an Outlook thread or a Salesforce
            activity feed, and the payroll intake form prefilled from what the app already
            knows. Day to day the ⚡ box on the account in the{" "}
            <Link href="/room">Room</Link> is the faster road — it reads the paste and
            files it against that deal. The app never writes to Salesforce or Forms.
          </p>
        </div>
        <IntakeTabs accounts={accounts} ai={aiCleanAvailable()} />
      </main>
    </>
  );
}
