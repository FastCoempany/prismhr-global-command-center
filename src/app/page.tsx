import Link from "next/link";
import { redirect } from "next/navigation";
import { HmlPriorityPanel } from "@/components/hml-priority-panel";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/auth/actions";
import { getAppAccess } from "@/lib/auth";
import { humanizeEnum } from "@/lib/format";
import { getDashboardData } from "./data";

export const dynamic = "force-dynamic";

const focusItems = [
  {
    id: "prospect-field-summary",
    label: "Prospect Field",
    body: "Chicagoland account discovery with fit evidence, source confidence, and safe channel path.",
  },
  {
    id: "partner-rooms",
    label: "Trust Path",
    body: "Relationship-owned motion where permission posture stays visible before action.",
  },
  {
    id: "signal-feed",
    label: "Signal Feed",
    body: "High, Medium, and Low priorities grounded in source, permission, and relationship motion.",
  },
];

export default async function Home() {
  const access = await getAppAccess();

  if (access.status !== "active") {
    redirect("/login?next=/");
  }

  const dashboard = await getDashboardData();
  const leadSignal = dashboard.hmlSummary.items[0];
  const leadAccount = dashboard.accounts[0];
  const nextSafestAction =
    leadSignal?.recommendedNextAction ??
    leadAccount?.nextSafestAction ??
    "Add a sourced prospect before action.";
  const permissionPosture = leadAccount
    ? humanizeEnum(leadAccount.permissionState)
    : "Research Only";
  const sourceConfidence = leadAccount
    ? humanizeEnum(leadAccount.sourceConfidence)
    : "Unverified";
  const operatingItems = [
    `${dashboard.totalAccounts} account${dashboard.totalAccounts === 1 ? "" : "s"} under research`,
    `${dashboard.hmlSummary.counts.HIGH} high priority signal${dashboard.hmlSummary.counts.HIGH === 1 ? "" : "s"}`,
    `${dashboard.totalOpenUnknowns} open unknown${dashboard.totalOpenUnknowns === 1 ? "" : "s"}`,
    dashboard.databaseReady
      ? "Permission posture stays beside each account"
      : "Prospect records are unavailable right now",
  ];

  return (
    <main className="app-shell">
      <aside className="nav-rail" aria-label="Primary">
        <div className="brand-mark" aria-hidden="true">
          <span />
        </div>
        <div>
          <p className="eyebrow">Field Signal</p>
          <h1>PrismHR Global</h1>
        </div>
        <nav>
          <a aria-current="page" href="#today">
            Today
          </a>
          <Link href="/prospect-field">Prospect Field</Link>
          <a href="#partner-rooms">Partner Rooms</a>
          <a href="#signal-feed">Signal Feed</a>
          <a href="#boundaries">Boundaries</a>
        </nav>
        <HmlPriorityPanel compact summary={dashboard.hmlSummary} />
        <form action={signOut}>
          <Button className="w-full" size="compact" type="submit" variant="quiet">
            Sign out
          </Button>
        </form>
      </aside>

      <section className="work-surface" id="today">
        <header className="top-bar">
          <div>
            <p className="eyebrow">Today</p>
            <h2>Find the right prospects. Protect the trust path.</h2>
          </div>
          <div className="status-pill">
            {dashboard.databaseReady ? "Live signals" : "Records unavailable"}
          </div>
        </header>

        <section className="safety-strip" aria-label="Current safety posture">
          <div>
            <span>Permission</span>
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

        <section className="panel-grid" aria-label="Workspace readiness">
          {focusItems.map((item) => (
            <article className="panel" id={item.id} key={item.label}>
              <h3>{item.label}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </section>

        <section className="table-panel" id="prospect-field">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Operating posture</p>
              <h3>Prospecting guardrails</h3>
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

      <aside className="right-rail" aria-label="Intelligence rail">
        <HmlPriorityPanel summary={dashboard.hmlSummary} />
        <section id="boundaries">
          <p className="eyebrow">Pitch rail</p>
          <h2>Prospecting and partner-motion command center.</h2>
          <p>
            Prospect Field keeps account evidence, source confidence, permission posture,
            and next safest action close together.
          </p>
        </section>
        <section>
          <p className="eyebrow">Boundary</p>
          <p>Research can raise priority. It cannot override permission.</p>
        </section>
      </aside>
    </main>
  );
}
