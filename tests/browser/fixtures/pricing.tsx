// The Pricing room's table for the browser suite (pass 15): every priced
// country from the page's own source, the one place our money is authored.

import { PricingClient } from "@/app/pricing-client";
import { countries } from "@/lib/pricing";

export default function Fixture() {
  const tiers = [...new Set(countries.map((c) => c.tier))];
  return (
    <main>
      <PricingClient countries={countries} tiers={tiers} />
    </main>
  );
}
