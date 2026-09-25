import Link from "next/link";
import type { ReactNode } from "react";
import { ProductLockup } from "@/components/brand";
import { DeskMeter } from "@/components/presence/engine";
import { WAYFINDER_ROUTES } from "@/components/wayfinder-routes";

type AppWayfinderProps = {
  current: string;
  onSignOut?: ReactNode;
  trail?: string;
};

// The route table lives in wayfinder-routes.ts (pure data, so the suite can
// check every live row against the pages on disk); this renders it.

export async function AppWayfinder({
  current,
  onSignOut,
  trail = "PrismHR Global",
}: AppWayfinderProps) {
  const live = WAYFINDER_ROUTES.filter((r) => !r.archived);
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
          {live.map((r) => (
            <Link
              key={r.href}
              aria-current={r.pages.includes(current) ? "page" : undefined}
              className="app-route-link"
              href={r.href}
            >
              {r.label}
            </Link>
          ))}
        </nav>
        <DeskMeter />
        {onSignOut}
      </div>
    </header>
  );
}
