"use client";

import { useMemo, useState } from "react";
import { fmtPrice, type PriceCountry } from "@/lib/pricing";
import styles from "./command-center.module.css";

const tierClass: Record<string, string> = {
  "Tier 1": styles.fitLow,
  "Tier 2": styles.fitMedium,
  "Tier 3": styles.fitHigh,
};

export function PricingClient({
  countries,
  tiers,
}: {
  countries: PriceCountry[];
  tiers: string[];
}) {
  const [q, setQ] = useState("");
  const [tier, setTier] = useState("");
  const [sort, setSort] = useState("country");

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    const list = countries.filter((c) => {
      if (tier && c.tier !== tier) return false;
      if (s && !c.country.toLowerCase().includes(s)) return false;
      return true;
    });
    return [...list].sort((a, b) =>
      sort === "price" ? a.price - b.price || a.country.localeCompare(b.country) : a.country.localeCompare(b.country),
    );
  }, [countries, q, tier, sort]);

  return (
    <>
      <div className={styles.filters}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search country…"
          aria-label="Search country"
        />
        <select value={tier} onChange={(e) => setTier(e.target.value)} aria-label="Tier">
          <option value="">All tiers</option>
          {tiers.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="country">Sort: country</option>
          <option value="price">Sort: price</option>
        </select>
        <span className={styles.count}>
          {filtered.length} of {countries.length}
        </span>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Country</th>
            <th>EOR / employee / month</th>
            <th>Tier</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => (
            <tr key={c.country}>
              <td>
                <span className={styles.priceCountry}>{c.country}</span>
              </td>
              <td className={styles.priceCell}>{fmtPrice(c.price)}</td>
              <td>
                <span className={`${styles.fit} ${tierClass[c.tier] ?? styles.fitMedium}`}>
                  {c.tier}
                </span>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={3} className={styles.muted}>
                No country matches.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
