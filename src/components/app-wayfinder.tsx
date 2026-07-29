import Link from "next/link";
import type { ReactNode } from "react";
import { ProductLockup } from "@/components/brand";

type AppWayfinderProps = {
  current: string;
  onSignOut?: ReactNode;
  trail?: string;
};

// The three demo rooms live under one nav entry — any of them lights "Demos".
const DEMO_PAGES = new Set([
  "Demos",
  "Demo Sidekick",
  "v3 Sidekick",
  "Payroll Demo Sidekick",
]);

export async function AppWayfinder({
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
            aria-current={current === "Room" ? "page" : undefined}
            className="app-route-link"
            href="/room"
          >
            Room
          </Link>
          <Link
            aria-current={current === "Accounts" ? "page" : undefined}
            className="app-route-link"
            href="/accounts"
          >
            Accounts
          </Link>
          <Link
            aria-current={current === "Playbook" ? "page" : undefined}
            className="app-route-link"
            href="/playbook"
          >
            Playbook
          </Link>
          <Link
            aria-current={current === "Pricing" ? "page" : undefined}
            className="app-route-link"
            href="/pricing"
          >
            Pricing
          </Link>
          <Link
            aria-current={current === "Pipeline" ? "page" : undefined}
            className="app-route-link"
            href="/pipeline"
          >
            Pipeline
          </Link>
          <Link
            aria-current={DEMO_PAGES.has(current) ? "page" : undefined}
            className="app-route-link"
            href="/demos"
          >
            Demos
          </Link>
          <Link
            aria-current={current === "Capture" ? "page" : undefined}
            className="app-route-link"
            href="/intake"
          >
            Capture
          </Link>
          {/* Archived surfaces. Today and the board were the app's first two
              rooms; the Room absorbed both. They stay reachable and stay
              quiet — no colour, no weight, no competition for the eye. */}
          <span className="app-route-archive" aria-label="Archived surfaces">
            <Link
              aria-current={current === "Today" ? "page" : undefined}
              className="app-route-arch"
              href="/today"
            >
              Today
            </Link>
            <Link
              aria-current={current === "Dashboard" ? "page" : undefined}
              className="app-route-arch"
              href="/"
            >
              Board
            </Link>
          </span>
        </nav>
        {onSignOut}
      </div>
    </header>
  );
}
