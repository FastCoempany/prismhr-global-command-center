import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import {
  addOns,
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

// Build-to-contract pricing (SF / CPQ). All PEPM unless marked one-time.
const contractRows = [
  {
    service: "EOR Services",
    peo: ["Tier 1 — $350", "Tier 2 — $385", "Tier 3 — $455"],
    onboarding: [
      "$500 onboarding & off-boarding / per EE",
      "$200 background check / per EE",
      "$750 custom portal branding (PEO or SMB level)",
    ],
    smb: ["Tier 1 — $500", "Tier 2 — $550", "Tier 3 — $650"],
    revshare: ["Tier 1 — $150", "Tier 2 — $165", "Tier 3 — $195"],
  },
  {
    service: "International Payroll",
    peo: ["Custom"],
    onboarding: ["Custom"],
    smb: ["Custom"],
    revshare: ["Custom"],
  },
  {
    service: "Contractor Services",
    peo: ["$27"],
    onboarding: ["N/A"],
    smb: ["$45"],
    revshare: ["$18"],
  },
  {
    service: "Contractor Plus Services",
    peo: ["$135"],
    onboarding: ["N/A"],
    smb: ["$225"],
    revshare: ["$90"],
  },
];

function stack(lines: string[]) {
  return lines.map((l, i) => (
    <div key={i} className={styles.priceLine}>
      {l}
    </div>
  ));
}

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
    {
      label: "Offboarding fee (per employee)",
      price: offboardingFee,
      billing: "one-time",
    },
    ...addOns,
  ];

  return (
    <>
      <AppWayfinder current="Pricing" />
      <main className={styles.wrap}>
        <div className={styles.pageHead}>
          <h1 className={styles.h1}>EOR Pricing</h1>

          <p className={styles.sub}>
            EOR list pricing by country ({countries.length} countries) · PEPM · updated{" "}
            {pricingGeneratedAt}.
          </p>
        </div>

        <div className={styles.banner}>
          <strong>Offboarding:</strong> {offboardingNote}
        </div>

        {/* ── Build-to-contract pricing (SF / CPQ) ─────────────────────── */}
        <h2 className={styles.h2}>Contract pricing — build-to-contract (SF / CPQ)</h2>
        <p className={styles.sub}>
          What&apos;s being built to contract in Salesforce / CPQ — leverage this on
          in-process opportunities. Every country carries a designated tier (1–3). If a
          PEO doesn&apos;t know its countries yet, quote the tier range — e.g.{" "}
          <b>$500–$650 PEPM</b> for SMB-direct EOR. All prices are PEPM (per employee, per
          month) unless marked one-time. ETA for contracts / SF CPQ setup:{" "}
          <b>July 10 at the earliest</b>; a 2nd training will walk through contracting.
        </p>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Service</th>
                <th>PEO pricing</th>
                <th>Onboarding fees (one-time)</th>
                <th>List price (SMB pricing)</th>
                <th>Recommended markup for PEO (rev share)</th>
              </tr>
            </thead>
            <tbody>
              {contractRows.map((r) => (
                <tr key={r.service}>
                  <td>
                    <span className={styles.priceCountry}>{r.service}</span>
                  </td>
                  <td>{stack(r.peo)}</td>
                  <td className={styles.feeCell}>{stack(r.onboarding)}</td>
                  <td>{stack(r.smb)}</td>
                  <td>{stack(r.revshare)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Two billing options ──────────────────────────────────────── */}
        <h2 className={styles.h2}>Two billing options</h2>
        <div className={styles.narGrid}>
          <div className={styles.narCard}>
            <h4>① Bill the SMB directly — lean here ✅</h4>
            <p>
              Use the <b>List Price (SMB pricing)</b>. The PEO earns the{" "}
              <b>revenue share</b> (the Recommended Markup column). This is what the
              system is set up to accommodate today — favor it.
            </p>
          </div>
          <div className={styles.narCard}>
            <h4>② Bill the PEO directly — mechanics still TBD ⚠</h4>
            <p>
              Use the <b>PEO pricing</b>. The PEO then has the option to bill their SMB
              themselves, at the Recommended List Price or a price of their choice. Some
              elements are still being worked out — harder to execute for now.
            </p>
          </div>
        </div>
        <div className={styles.banner}>
          <strong>Ask each PEO:</strong> is the requirement a one-month deposit? Confirm
          before you quote.
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
