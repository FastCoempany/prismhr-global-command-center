import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import {
  addOns,
  billingNote,
  countries,
  fmtPrice,
  offboardingFee,
  offboardingNote,
  pricingGeneratedAt,
  tiers,
} from "@/lib/pricing";
import { PricingClient } from "../pricing-client";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const access = await getAppAccess();

  if (access.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Pricing" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  // Fees & add-ons — surface the offboarding fee first (not in the sheet).
  const fees = [
    { label: "Offboarding fee (per employee)", price: offboardingFee, billing: "one-time" },
    ...addOns,
  ];

  return (
    <>
      <AppWayfinder current="Pricing" />
      <main className={styles.wrap}>
        <h1 className={styles.h1}>EOR Pricing</h1>
        <p className={styles.sub}>
          PrismHR Global list pricing — Employer of Record by country, {countries.length} countries.
          {" "}
          {billingNote} Updated {pricingGeneratedAt}.
        </p>

        <div className={styles.banner}>
          <strong>Offboarding:</strong> {offboardingNote}
        </div>

        <h2 className={styles.h2}>Fees &amp; add-ons</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Item</th>
              <th>Price</th>
              <th>Billing</th>
            </tr>
          </thead>
          <tbody>
            {fees.map((f) => (
              <tr key={f.label}>
                <td>
                  <span className={styles.priceCountry}>{f.label}</span>
                </td>
                <td className={styles.priceCell}>{fmtPrice(f.price)}</td>
                <td className={styles.rowSub}>{f.billing}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className={styles.h2}>EOR by country</h2>
        <PricingClient countries={countries} tiers={tiers} />
      </main>
    </>
  );
}
