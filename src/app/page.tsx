import Link from "next/link";
import { redirect } from "next/navigation";
import { AppWayfinder } from "@/components/app-wayfinder";
import { HmlPriorityPanel } from "@/components/hml-priority-panel";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/auth/actions";
import { getAppAccess } from "@/lib/auth";
import { humanizeEnum } from "@/lib/format";
import { getDashboardData } from "./data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const access = await getAppAccess();

  if (access.status !== "active") {
    redirect("/login?next=/");
  }

  const dashboard = await getDashboardData();
  const leadSignal = dashboard.hmlSummary.items[0];
  const leadAccount = dashboard.accounts[0];
  const hasAccounts = dashboard.totalAccounts > 0;
  const nextSafestAction =
    leadSignal?.recommendedNextAction ??
    leadAccount?.nextSafestAction ??
    "Add a sourced Chicagoland prospect.";
  const permissionPosture = leadAccount
    ? humanizeEnum(leadAccount.permissionState)
    : "No active account";
  const sourceConfidence = leadAccount
    ? humanizeEnum(leadAccount.sourceConfidence)
    : "Source needed";
  const operatingItems = [
    `${dashboard.totalAccounts} sourced prospect${dashboard.totalAccounts === 1 ? "" : "s"}`,
    `${dashboard.hmlSummary.counts.HIGH} high priority item${dashboard.hmlSummary.counts.HIGH === 1 ? "" : "s"}`,
    `${dashboard.totalOpenUnknowns} open unknown${dashboard.totalOpenUnknowns === 1 ? "" : "s"}`,
    dashboard.databaseReady
      ? "Permission stays visible before action"
      : "Prospect records are unavailable right now",
  ];
  const nextWork = [
    {
      body: hasAccounts
        ? "Review the sourced account list and update evidence, confidence, or next action."
        : "Create the first real Chicagoland account with source evidence and confidence.",
      href: "/prospect-field",
      label: hasAccounts ? "Review Prospect Field" : "Add first prospect",
    },
    {
      body:
        dashboard.hmlSummary.total > 0
          ? "Open the priority item and decide the safest next move."
          : "HML will appear after sourced records have enough context.",
      href: leadSignal?.href ?? "/prospect-field",
      label: dashboard.hmlSummary.total > 0 ? "Review HML priority" : "Build HML context",
    },
    {
      body:
        dashboard.totalOpenUnknowns > 0
          ? "Resolve the unknowns that could affect permission, source quality, or schema."
          : "Keep unresolved facts explicit as they appear.",
      href: "/unknowns",
      label: dashboard.totalOpenUnknowns > 0 ? "Resolve open unknowns" : "Track unknowns",
    },
  ];

  return (
    <main className="app-shell">
      <AppWayfinder
        current="Today"
        onSignOut={
          <form action={signOut}>
            <Button size="compact" type="submit" variant="quiet">
              Sign out
            </Button>
          </form>
        }
      />

      <section className="work-surface" id="today">
        <header className="top-bar">
          <div className="grid gap-2">
            <p className="eyebrow">Today</p>
            <h1>Start with the next safe move.</h1>
            <p className="page-lede">
              Prospecting, priority, permission, and evidence in one place.
            </p>
          </div>
          <div className="status-pill">
            {dashboard.databaseReady ? "Records ready" : "Records unavailable"}
          </div>
        </header>

        <section className="safety-strip" aria-label="Current safety posture">
          <div>
            <span>Current account</span>
            <strong>{permissionPosture}</strong>
          </div>
          <div>
            <span>Next safest action</span>
            <strong>{nextSafestAction}</strong>
          </div>
          <div>
            <span>Source confidence</span>
            <strong>{sourceConfidence}</strong>
          </div>
        </section>

        <section className="today-stack" aria-label="Today workspace">
          <HmlPriorityPanel summary={dashboard.hmlSummary} />

          <section className="panel-grid" aria-label="Next work">
            {nextWork.map((item) => (
              <Link className="panel panel--link" href={item.href} key={item.label}>
                <h3>{item.label}</h3>
                <p>{item.body}</p>
              </Link>
            ))}
          </section>

          <section className="table-panel" id="prospect-field">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Current read</p>
                <h3>Workspace status</h3>
              </div>
            </div>
            <div className="readiness-list">
              {operatingItems.map((item) => (
                <div className="readiness-row" key={item}>
                  <span className="status-dot" aria-hidden="true" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}
