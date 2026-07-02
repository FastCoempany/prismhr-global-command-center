"use client";

import { Fragment, useMemo, useState } from "react";
import { addCard } from "./dashboard/actions";
import styles from "./command-center.module.css";

export type AccountRow = {
  id: string;
  name: string;
  industry: string;
  sizeBucket: string;
  size: number;
  city: string;
  state: string;
  csm: string;
  cloud: string;
  website: string;
  contactName: string;
  contactEmail: string;
  incumbent: boolean;
  score: number;
  tier: "high" | "medium" | "low";
  breakdown: { scale: number; incumbency: number; model: number; recency: number };
};

const fitClass: Record<string, string> = {
  high: styles.fitHigh,
  medium: styles.fitMedium,
  low: styles.fitLow,
};

const BAR_MAX = { scale: 35, incumbency: 25, model: 25, recency: 15 } as const;
const BAR_LABEL = {
  scale: "Book scale",
  incumbency: "On PrismHR",
  model: "Model fit",
  recency: "Recency",
} as const;

export function AccountsClient({ rows, canAdd }: { rows: AccountRow[]; canAdd: boolean }) {
  const [q, setQ] = useState("");
  const [csm, setCsm] = useState("");
  const [industry, setIndustry] = useState("");
  const [tier, setTier] = useState("");
  const [incOnly, setIncOnly] = useState(false);
  const [sort, setSort] = useState("score");
  const [openId, setOpenId] = useState("");

  const csms = useMemo(() => [...new Set(rows.map((r) => r.csm).filter(Boolean))].sort(), [rows]);
  const inds = useMemo(
    () => [...new Set(rows.map((r) => r.industry).filter(Boolean))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    const list = rows.filter((r) => {
      if (csm && r.csm !== csm) return false;
      if (industry && r.industry !== industry) return false;
      if (tier && r.tier !== tier) return false;
      if (incOnly && !r.incumbent) return false;
      if (s && !`${r.name} ${r.city} ${r.state} ${r.contactName} ${r.industry}`.toLowerCase().includes(s))
        return false;
      return true;
    });
    return [...list].sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : b.score - a.score,
    );
  }, [rows, q, csm, industry, tier, incOnly, sort]);

  return (
    <>
      <div className={styles.filters}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search account, city, contact…" />
        <select value={csm} onChange={(e) => setCsm(e.target.value)} aria-label="CSM">
          <option value="">All CSMs</option>
          {csms.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={industry} onChange={(e) => setIndustry(e.target.value)} aria-label="Industry">
          <option value="">All models</option>
          {inds.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        <select value={tier} onChange={(e) => setTier(e.target.value)} aria-label="Fit tier">
          <option value="">All fit</option>
          <option value="high">High fit</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="score">Sort: fit</option>
          <option value="name">Sort: name</option>
        </select>
        <label className={styles.toggle}>
          <input type="checkbox" checked={incOnly} onChange={(e) => setIncOnly(e.target.checked)} />
          On PrismHR only
        </label>
        <span className={styles.count}>
          {filtered.length} of {rows.length}
        </span>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Account</th>
            <th>Fit (desk)</th>
            <th>Model</th>
            <th>Size</th>
            <th>PrismHR</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.map((a) => (
            <Fragment key={a.id}>
              <tr className={a.id === openId ? styles.rowActive : ""}>
                <td>
                  <button
                    className={styles.rowBtn}
                    onClick={() => setOpenId(openId === a.id ? "" : a.id)}
                    aria-expanded={openId === a.id}
                  >
                    {a.name}
                  </button>
                  <div className={styles.rowSub}>
                    {a.city}
                    {a.state ? `, ${a.state}` : ""}
                    {a.csm ? ` · ${a.csm}` : ""}
                  </div>
                </td>
                <td>
                  <span className={`${styles.fit} ${fitClass[a.tier]}`}>{a.score}</span>
                </td>
                <td className={styles.rowSub}>{a.industry}</td>
                <td className={styles.rowSub}>
                  {a.sizeBucket || (a.size ? a.size.toLocaleString() : "—")}
                </td>
                <td>
                  {a.incumbent ? (
                    <span className={styles.chip}>{a.cloud}</span>
                  ) : (
                    <span className={styles.muted}>—</span>
                  )}
                </td>
                <td>
                  {canAdd && (
                    <form action={addCard}>
                      <input type="hidden" name="name" value={a.name} />
                      <input
                        type="hidden"
                        name="subtitle"
                        value={`${a.csm}${a.industry ? ` · ${a.industry}` : ""}`}
                      />
                      <input type="hidden" name="returnTo" value="/accounts" />
                      <button className={styles.addMini}>+ Dashboard</button>
                    </form>
                  )}
                </td>
              </tr>
              {openId === a.id && (
                <tr>
                  <td colSpan={6}>
                    <div className={styles.acctDetail}>
                      <div className={styles.bars}>
                        {(["scale", "incumbency", "model", "recency"] as const).map((k) => (
                          <div key={k} className={styles.barRow}>
                            <span className={styles.barLabel}>{BAR_LABEL[k]}</span>
                            <span className={styles.barTrack}>
                              <span
                                className={styles.barFill}
                                style={{ width: `${(a.breakdown[k] / BAR_MAX[k]) * 100}%` }}
                              />
                            </span>
                            <span className={styles.barVal}>
                              {a.breakdown[k]}/{BAR_MAX[k]}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className={styles.demandPending}>
                        Demand signal — not yet researched. Fills in on the 131-account research pass
                        (weight ~30 of the final score).
                      </div>
                      <div className={styles.acctMeta}>
                        {a.contactName && (
                          <>
                            {a.contactName}
                            {a.contactEmail && (
                              <>
                                {" · "}
                                <a href={`mailto:${a.contactEmail}`}>{a.contactEmail}</a>
                              </>
                            )}
                            <br />
                          </>
                        )}
                        {a.website && (
                          <a href={ensureHttp(a.website)} target="_blank" rel="noreferrer">
                            {a.website}
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ensureHttp(url: string) {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}
