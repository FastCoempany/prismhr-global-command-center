// Capture — the shelf the grabs live on. Three bookmarklets, each scoped to the
// region that actually holds a conversation, each stating what it refuses as
// plainly as what it takes. Filing happens at the account, in the ⚡ box on its
// row; this page installs tools and never writes anything itself.

import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { peos } from "@/lib/book";
import { CaptureShelf } from "./capture-shelf";
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
            Three grabs, installed once. Click the one that matches the window you&apos;re
            reading. The capture lands on your clipboard, and you paste it into the ⚡ box
            on the account it belongs to in the <Link href="/room">HomeRoom</Link>.
          </p>
        </div>
        <CaptureShelf accounts={accounts} />
      </main>
    </>
  );
}
