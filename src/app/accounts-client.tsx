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
  deskScore: number;
  demand: number | null;
  confidence: "high" | "medium" | "low";
  signals: string[];
  evidence: { claim: string; url: string }[];
  summary: string;
  researched: boolean;
  play: "displacement" | "greenfield" | null;
  competitors: string[];
  score: number; // composite
  tier: "high" | "medium" | "low";
  breakdown: { scale: number; incumbency: number; model: number; recency: number };
};

const fitClass: Record<string, string> = {
  high: styles.fitHigh,
  medium: styles.fitMedium,
  low: styles.fitLow,
};

const demandClass = (d: number | null) =>
  d == null ? styles.fitLow : d >= 60 ? styles.fitHigh : d >= 35 ? styles.fitMedium : styles.fitLow;

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
  const [play, setPlay] = useState("");
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
      if (play && r.play !== play) return false;
      if (incOnly && !r.incumbent) return false;
      if (s && !`${r.name} ${r.city} ${r.state} ${r.contactName} ${r.industry}`.toLowerCase().includes(s))
        return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "demand") return (b.demand ?? -1) - (a.demand ?? -1);
      return b.score - a.score;
    });
  }, [rows, q, csm, industry, tier, play, incOnly, sort]);

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
        <select value={play} onChange={(e) => setPlay(e.target.value)} aria-label="Play type">
          <option value="">All plays</option>
          <option value="displacement">Displacement</option>
          <option value="greenfield">Greenfield</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="score">Sort: Global fit</option>
          <option value="demand">Sort: demand</option>
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
            <th>Global fit</th>
            <th>Demand</th>
            <th>Play</th>
            <th>Model</th>
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
                <td>
                  {a.researched && a.demand != null ? (
                    <span className={`${styles.fit} ${demandClass(a.demand)}`}>{a.demand}</span>
                  ) : (
                    <span className={styles.muted} title="Not researched">
                      —
                    </span>
                  )}
                </td>
                <td>
                  {a.play === "displacement" ? (
                    <span
                      className={`${styles.tag} ${styles.tagDisplace}`}
                      title={`Currently served by ${a.competitors.join(", ")}`}
                    >
                      Displace
                    </span>
                  ) : a.play === "greenfield" ? (
                    <span className={`${styles.tag} ${styles.tagGreen}`}>Greenfield</span>
                  ) : (
                    <span className={styles.muted}>—</span>
                  )}
                </td>
                <td className={styles.rowSub}>{a.industry}</td>
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
                  <td colSpan={7}>
                    <div className={styles.acctDetail}>
                      <div className={styles.demandBlock}>
                        {a.researched && a.demand != null ? (
                          <>
                            <div className={styles.demandHead}>
                              <span className={`${styles.fit} ${demandClass(a.demand)}`}>
                                {a.demand}
                              </span>
                              <strong>Global-hiring demand</strong>
                              <span className={styles.confChip}>{a.confidence} confidence</span>
                            </div>
                            {a.play === "displacement" && a.competitors.length > 0 && (
                              <p className={styles.servedBy}>
                                Displacement play — currently served by{" "}
                                <strong>{a.competitors.join(", ")}</strong>. Pitch: bring it in-house
                                on the platform they already run.
                              </p>
                            )}
                            {a.play === "greenfield" && (
                              <p className={styles.servedBy}>
                                Greenfield — real demand, no incumbent EOR named in the research.
                              </p>
                            )}
                            {a.summary && <p className={styles.demandSummary}>{a.summary}</p>}
                            {a.signals.length > 0 && (
                              <ul className={styles.signalList}>
                                {a.signals.slice(0, 4).map((s, i) => (
                                  <li key={i}>{s}</li>
                                ))}
                              </ul>
                            )}
                            {a.evidence.length > 0 && (
                              <div className={styles.evidence}>
                                {a.evidence.map((e, i) => (
                                  <a key={i} href={e.url} target="_blank" rel="noreferrer">
                                    ↗ {hostOf(e.url)}
                                  </a>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className={styles.demandPending}>
                            Not researched (no findable web presence, or missed on the run). Score is
                            desk-only.
                          </div>
                        )}
                      </div>

                      <div className={styles.bars}>
                        <div className={styles.barsHead}>
                          Desk signals · {a.deskScore}/100
                        </div>
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

                      <div className={styles.acctMeta}>
                        {a.sizeBucket || (a.size ? `${a.size.toLocaleString()} WSE` : "size n/a")}
                        {" · "}
                        {a.contactName && (
                          <>
                            {a.contactName}
                            {a.contactEmail && (
                              <>
                                {" · "}
                                <a href={`mailto:${a.contactEmail}`}>{a.contactEmail}</a>
                              </>
                            )}
                            {" · "}
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

function hostOf(url: string) {
  try {
    return new URL(ensureHttp(url)).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
