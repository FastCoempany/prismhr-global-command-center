import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { peos } from "@/lib/book";
import { compositeScore, deskScore } from "@/lib/book/scoring";
import { analyzePlay, extractCountries, getDemand, researchGeneratedAt } from "@/lib/book/research";
import { loadValidations } from "@/lib/today/overlay";
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

  // Which accounts are already on the dashboard (matched by name) — so the
  // "+ Dashboard" button can show an added state instead of doing nothing visible.
  let onDashboard: string[] = [];
  if (canAdd) {
    try {
      const cards = await getPrisma().dashCard.findMany({ select: { name: true } });
      onDashboard = cards.map((c) => c.name);
    } catch {
      onDashboard = [];
    }
  }

  // Owner/CSM validation overlay — confirmed/flagged annotate; adjusted overrides
  // demand and reflows the composite.
  const validations = await loadValidations();

  const rows: AccountRow[] = peos
    .map((p) => {
      const d = deskScore(p);
      const dem = getDemand(p.id);
      const researchedDemand = dem?.researched ? dem.demandScore : null;
      const v = validations.get(p.id);
      const demand =
        v?.status === "adjusted" && v.adjustedDemand != null
          ? Math.max(0, Math.min(100, Math.round(v.adjustedDemand)))
          : researchedDemand;
      const c = compositeScore(d.score, demand, dem?.confidence ?? "low");
      // Play re-gates on the (possibly adjusted) demand; competitor detection is
      // text-based and unchanged.
      const basePl = analyzePlay(dem);
      const play =
        demand != null && demand >= 30
          ? basePl.competitors.length
            ? "displacement"
            : "greenfield"
          : demand == null
            ? basePl.play
            : null;
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
        play: play as AccountRow["play"],
        competitors: basePl.competitors,
        countries: extractCountries(dem),
        demandAdj: c.demandAdj,
        confFactor: c.confFactor,
        score: c.score,
        tier: c.tier,
        breakdown: d.breakdown,
        validation: v ? { status: v.status, note: v.note, adjustedDemand: v.adjustedDemand } : null,
      };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <>
      <AppWayfinder current="Accounts" />
      <main className={styles.wrap}>
        <h1 className={styles.h1}>Account Room</h1>
        <p className={styles.sub}>
          All {rows.length} channel accounts, heat-scored for PrismHR Global fit. Global fit = 40%
          account profile (size · on-PrismHR · model · recency) + 60% researched demand
          (confidence-weighted). Play flags whether they&apos;re already on a competitor EOR. Demand
          research last run {researchGeneratedAt}.
        </p>
        <AccountsClient rows={rows} canAdd={canAdd} onDashboard={onDashboard} />
      </main>
    </>
  );
}
