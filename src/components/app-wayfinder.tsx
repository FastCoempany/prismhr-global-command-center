import Link from "next/link";
import type { ReactNode } from "react";
import { ProductLockup } from "@/components/brand";
import { Button } from "@/components/ui/button";

type AppWayfinderProps = {
  current: string;
  onSignOut?: ReactNode;
  trail?: string;
};

export function AppWayfinder({
  current,
  onSignOut,
  trail = "PrismHR Global",
}: AppWayfinderProps) {
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
            href="/"
          >
            Today
          </Link>
          <Link
            aria-current={current === "Prospect Field" ? "page" : undefined}
            className="app-route-link"
            href="/prospect-field"
          >
            Prospect Field
          </Link>
          <Link
            aria-current={current === "Signal Feed" ? "page" : undefined}
            className="app-route-link"
            href="/signal-feed"
          >
            Signal Feed
          </Link>
        </nav>
        <Button size="compact" type="button" variant="quiet">
          Ctrl K
        </Button>
        {onSignOut}
      </div>
    </header>
  );
}
