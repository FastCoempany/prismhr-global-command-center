"use client";

import { Fragment, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { addCard } from "./dashboard/actions";
import styles from "./command-center.module.css";

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button className={styles.addMini} disabled={pending}>
      {pending ? "Adding…" : "+ Dashboard"}
    </button>
  );
}

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
  countries: string[];
  demandAdj: number | null;
  confFactor: number;
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

export function AccountsClient({
  rows,
  canAdd,
  onDashboard,
}: {
  rows: AccountRow[];
  canAdd: boolean;
  onDashboard: string[];
}) {
  const onDash = useMemo(() => new Set(onDashboard), [onDashboard]);
  const [q, setQ] = useState("");
  const [csm, setCsm] = useState("");
  const [industry, setIndustry] = useState("");
  const [tier, setTier] = useState("");
  const [play, setPlay] = useState("");
  const [incOnly, setIncOnly] = useState(false);
  const [hotOnly, setHotOnly] = useState(false);
  const [sort, setSort] = useState("score");
  const [openId, setOpenId] = useState("");
  const [copied, setCopied] = useState(false);

  const isHot = (r: AccountRow) => r.play != null && (r.demand ?? 0) >= 60;

  const csms = useMemo(() => [...new Set(rows.map((r) => r.csm).filter(Boolean))].sort(), [rows]);
  const inds = useMemo(
    () => [...new Set(rows.map((r) => r.industry).filter(Boolean))].sort(),
    [rows],
  );

  // Per-CSM rollup of real targets (books worth briefing on).
  const rollup = useMemo(() => {
    const m = new Map<string, { high: number; targets: number; hot: number }>();
    for (const r of rows) {
      if (!r.csm) continue;
      if (!m.has(r.csm)) m.set(r.csm, { high: 0, targets: 0, hot: 0 });
      const e = m.get(r.csm)!;
      if (r.tier === "high") e.high++;
      if (r.play != null) e.targets++;
      if (isHot(r)) e.hot++;
    }
    return [...m.entries()].sort((a, b) => b[1].hot - a[1].hot);
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    const list = rows.filter((r) => {
      if (csm && r.csm !== csm) return false;
      if (industry && r.industry !== industry) return false;
      if (tier && r.tier !== tier) return false;
      if (play && r.play !== play) return false;
      if (incOnly && !r.incumbent) return false;
      if (hotOnly && !isHot(r)) return false;
      if (s && !`${r.name} ${r.city} ${r.state} ${r.contactName} ${r.industry}`.toLowerCase().includes(s))
        return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "demand") return (b.demand ?? -1) - (a.demand ?? -1);
      return b.score - a.score;
    });
  }, [rows, q, csm, industry, tier, play, incOnly, hotOnly, sort]);

  const copyList = async () => {
    const text = filtered
      .map(
        (r) =>
          `${r.name} — fit ${r.score}${r.demand != null ? `, demand ${r.demand}` : ""}${
            r.play ? `, ${r.play}${r.competitors.length ? ` (${r.competitors.join("/")})` : ""}` : ""
          } · ${r.csm}`,
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <div className={styles.rollup}>
        {rollup.map(([name, e]) => (
          <button
            key={name}
            type="button"
            aria-pressed={csm === name}
            className={`${styles.rollupCard} ${csm === name ? styles.rollupActive : ""}`}
            onClick={() => setCsm(csm === name ? "" : name)}
          >
            <span className={styles.rollupName}>{name}</span>
            <span className={styles.rollupNums}>
              <b>{e.hot}</b> hot · {e.targets} targets · {e.high} high-fit
            </span>
          </button>
        ))}
      </div>

      <div className={styles.filters}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search account, city, contact…"
          aria-label="Search accounts"
        />
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
        <label className={styles.toggle}>
          <input type="checkbox" checked={hotOnly} onChange={(e) => setHotOnly(e.target.checked)} />
          Hot targets
        </label>
        <button type="button" className={styles.addMini} onClick={copyList}>
          {copied ? "Copied ✓" : "Copy list"}
        </button>
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
                    <>
                      <span className={`${styles.tag} ${styles.tagDisplace}`}>Displace</span>
                      {a.competitors.length > 0 && (
                        <div className={styles.rowSub}>{a.competitors.join(", ")}</div>
                      )}
                    </>
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
                  {canAdd &&
                    (onDash.has(a.name) ? (
                      <span className={styles.onDash}>On dashboard ✓</span>
                    ) : (
                      <form action={addCard}>
                        <input type="hidden" name="name" value={a.name} />
                        <input
                          type="hidden"
                          name="subtitle"
                          value={`${a.csm}${a.industry ? ` · ${a.industry}` : ""}`}
                        />
                        <input type="hidden" name="seedDiscovery" value={seedFor(a)} />
                        <input type="hidden" name="returnTo" value="/accounts" />
                        <AddButton />
                      </form>
                    ))}
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
                            {a.countries.length > 0 && (
                              <div className={styles.countries}>
                                {a.countries.map((c) => (
                                  <span key={c} className={styles.countryChip}>
                                    {c}
                                  </span>
                                ))}
                              </div>
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
                            <div className={styles.formula}>
                              Global fit {a.score} = 40% desk ({a.deskScore}) + 60% demand ({a.demand}
                              {a.confFactor < 1 ? ` × ${a.confFactor} conf = ${a.demandAdj}` : ""})
                            </div>
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

// One-time seed dropped into a new dashboard card's Discovery note on "+ Dashboard".
function seedFor(a: AccountRow): string {
  if (!a.researched || a.demand == null) return "";
  const play =
    a.play === "displacement"
      ? `Displacement — currently on ${a.competitors.join(", ") || "a competitor EOR"}.`
      : a.play === "greenfield"
        ? "Greenfield — no incumbent EOR named."
        : "";
  const countries = a.countries.length ? ` Countries seen: ${a.countries.join(", ")}.` : "";
  return `Demand ${a.demand}/100 (${a.confidence} confidence). ${play}${countries} ${a.summary}`.trim();
}
