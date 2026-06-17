import Link from "next/link";
import type { ReactNode } from "react";
import { ProductLockup } from "@/components/brand";
import { FieldGlyph } from "@/components/field-glyph";
import { Button } from "@/components/ui/button";

type AppWayfinderProps = {
  current: string;
  nextAction: string;
  onSignOut?: ReactNode;
  trail?: string;
};

export function AppWayfinder({
  current,
  nextAction,
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
        <Link className="ds-wayfinder__pulling" href="/prospect-field">
          <span className="ds-wayfinder__pulling-gauge" aria-hidden="true" />
          <FieldGlyph accent="blue" name="signal" size={18} />
          <span className="ds-wayfinder__pulling-verb">Pulling</span>
          <span className="ds-wayfinder__pulling-object">{nextAction}</span>
        </Link>
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
        </nav>
        <span className="ds-wayfinder__spacer" />
        <Button size="compact" type="button" variant="quiet">
          Ctrl K
        </Button>
        {onSignOut}
      </div>
    </header>
  );
}
