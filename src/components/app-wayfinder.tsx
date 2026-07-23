import Link from "next/link";
import type { ReactNode } from "react";
import { ProductLockup } from "@/components/brand";
import { openLookIntoHighCount } from "@/lib/look-into/status";

type AppWayfinderProps = {
  current: string;
  onSignOut?: ReactNode;
  trail?: string;
};

export async function AppWayfinder({
  current,
  onSignOut,
  trail = "PrismHR Global",
}: AppWayfinderProps) {
  // Live count: high-priority Look-into items still open (resolved ones don't
  // badge the tab — the static count ignored resolution state).
  const lookIntoHighCount = await openLookIntoHighCount();
  return (
    <header className="ds-wayfinder-shell">
      <div className="ds-wayfinder">
        <Link className="ds-wayfinder__mark" href="/">
          <ProductLockup />
        </Link>
        <span className="ds-wayfinder__trail" aria-label="Trail">
          <span className="ds-wayfinder__trail-crumb">{trail}</span>
          <span className="ds-wayfinder__crumb">{current}</span>
        </span>
        <span className="ds-wayfinder__spacer" />
        <nav className="app-wayfinder-routes" aria-label="Primary routes">
          <Link
            aria-current={current === "Today" ? "page" : undefined}
            className="app-route-link"
            href="/today"
          >
            Today
          </Link>
          <Link
            aria-current={current === "Dashboard" ? "page" : undefined}
            className="app-route-link"
            href="/"
          >
            Dashboard
          </Link>
          <Link
            aria-current={current === "Accounts" ? "page" : undefined}
            className="app-route-link"
            href="/accounts"
          >
            Accounts
          </Link>
          <Link
            aria-current={current === "Partners" ? "page" : undefined}
            className="app-route-link"
            href="/partners"
          >
            Partners
          </Link>
          <Link
            aria-current={current === "Pricing" ? "page" : undefined}
            className="app-route-link"
            href="/pricing"
          >
            Pricing
          </Link>
          <Link
            aria-current={current === "Book" ? "page" : undefined}
            className="app-route-link"
            href="/book"
          >
            Book
          </Link>
          <Link
            aria-current={current === "Pipeline" ? "page" : undefined}
            className="app-route-link"
            href="/pipeline"
          >
            Pipeline
          </Link>
          <Link
            aria-current={current === "Demo Sidekick" ? "page" : undefined}
            className="app-route-link"
            href="/sidekick"
          >
            Demo Sidekick
          </Link>
          <Link
            aria-current={current === "v3 Sidekick" ? "page" : undefined}
            className="app-route-link"
            href="/sidekick-v3"
          >
            v3 Sidekick
          </Link>
          <Link
            aria-current={current === "Intake" ? "page" : undefined}
            className="app-route-link"
            href="/intake"
          >
            Intake
          </Link>
          <Link
            aria-current={current === "Look into" ? "page" : undefined}
            className="app-route-link"
            href="/look-into"
          >
            Look into
            {lookIntoHighCount > 0 && (
              <span
                className="app-route-badge"
                aria-label={`${lookIntoHighCount} high priority`}
              >
                {lookIntoHighCount}
              </span>
            )}
          </Link>
        </nav>
        {onSignOut}
      </div>
    </header>
  );
}
