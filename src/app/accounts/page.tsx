import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import { compositeScore, deskScore } from "@/lib/book/scoring";
import { analyzePlay, getDemand } from "@/lib/book/research";
import { AccountsClient, type AccountRow } from "../accounts-client";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const access = await getAppAccess();

  if (access.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Accounts" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const canAdd = access.canWrite && hasDatabaseEnv();
  const rows: AccountRow[] = peos
    .map((p) => {
      const d = deskScore(p);
      const dem = getDemand(p.id);
      const demand = dem?.researched ? dem.demandScore : null;
      const c = compositeScore(d.score, demand);
      const pl = analyzePlay(dem);
      return {
        id: p.id,
        name: p.name,
        industry: p.industry,
        sizeBucket: p.sizeBucket,
        size: p.size,
        city: p.city,
        state: p.state,
        csm: p.csm,
        cloud: p.cloud,
        website: p.website,
        contactName: p.contactName,
        contactEmail: p.contactEmail,
        incumbent: d.incumbent,
        deskScore: d.score,
        demand,
        confidence: dem?.confidence ?? "low",
        signals: dem?.signals ?? [],
        evidence: dem?.evidence ?? [],
        summary: dem?.summary ?? "",
        researched: dem?.researched ?? false,
        play: pl.play,
        competitors: pl.competitors,
        score: c.score,
        tier: c.tier,
        breakdown: d.breakdown,
      };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <>
      <AppWayfinder current="Accounts" />
      <main className={styles.wrap}>
        <h1 className={styles.h1}>Account Room</h1>
        <p className={styles.sub}>
          All {rows.length} channel accounts, heat-scored for PrismHR Global fit. Search, then add
          any to your dashboard. Desk score now — the demand signal folds in after the 131-account
          research pass.
        </p>
        <AccountsClient rows={rows} canAdd={canAdd} />
      </main>
    </>
  );
}
