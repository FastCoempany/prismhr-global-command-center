"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { EXTRA_PARTNERS, partnerRole } from "@/lib/book/partners";
import { competitorUrl } from "@/lib/book/research";
import { SfCheckpoint } from "@/components/sf";
import { AccountNotes, type LinkedNote } from "@/components/account-notes";
import {
  askToJoinMessage,
  CADENCE_OPTIONS,
  engagementGates,
  type Engagement,
} from "@/lib/engagement";
import { addCard } from "./dashboard/actions";
import { clearValidation, saveEngagement, toggleSfChecked, validateScore } from "./accounts/actions";
import { EditableMessage } from "./today-client";
import styles from "./command-center.module.css";

function CompetitorLinks({ names }: { names: string[] }) {
  return (
    <>
      {names.map((c, i) => {
        const url = competitorUrl(c);
        return (
          <Fragment key={c}>
            {i > 0 && ", "}
            {url ? (
              <a href={url} target="_blank" rel="noreferrer">
                {c}
              </a>
            ) : (
              c
            )}
          </Fragment>
        );
      })}
    </>
  );
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button className={styles.addMini} disabled={pending}>
      {pending ? "Adding…" : "+ Dashboard"}
    </button>
  );
}

function ValBadge({ v }: { v: AccountRow["validation"] }) {
  if (!v) return null;
  if (v.status === "confirmed") return <span className={styles.valConfirmed}>✓ confirmed</span>;
  if (v.status === "flagged") return <span className={styles.valFlagged}>⚠ flagged</span>;
  return <span className={styles.valAdjusted}>adj → {v.adjustedDemand}</span>;
}

// The trust layer: Confirm the AI score, Flag it as wrong (visibly distrusted
// downstream), or Adjust the demand (flows into the composite everywhere).
function ValidateControls({ id, current }: { id: string; current: AccountRow["validation"] }) {
  return (
    <div className={styles.validate}>
      <span className={styles.validateLabel}>Validate score:</span>
      <form action={validateScore} className={styles.valInline}>
        <input type="hidden" name="accountId" value={id} />
        <input type="hidden" name="status" value="confirmed" />
        <button className={styles.valBtn}>Confirm ✓</button>
      </form>
      <details className={styles.valDetails}>
        <summary className={styles.valBtn}>Flag ▾</summary>
        <form action={validateScore} className={styles.parkForm}>
          <input type="hidden" name="accountId" value={id} />
          <input type="hidden" name="status" value="flagged" />
          <input name="note" maxLength={500} placeholder="What's wrong?" aria-label="Flag reason" />
          <button className={styles.parkBtn}>Flag</button>
        </form>
      </details>
      <details className={styles.valDetails}>
        <summary className={styles.valBtn}>Adjust ▾</summary>
        <form action={validateScore} className={styles.parkForm}>
          <input type="hidden" name="accountId" value={id} />
          <input type="hidden" name="status" value="adjusted" />
          <input
            name="adjustedDemand"
            type="number"
            min="0"
            max="100"
            required
            placeholder="Demand 0–100"
            aria-label="Adjusted demand"
          />
          <input name="note" maxLength={500} placeholder="Why? (optional)" aria-label="Adjust note" />
          <button className={styles.parkBtn}>Set</button>
        </form>
      </details>
      {current && (
        <form action={clearValidation} className={styles.valInline}>
          <input type="hidden" name="accountId" value={id} />
          <button className={styles.valClear}>Clear</button>
        </form>
      )}
    </div>
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
  validation: {
    status: "confirmed" | "flagged" | "adjusted";
    note?: string;
    adjustedDemand?: number;
  } | null;
  engagement: Engagement;
  notes: LinkedNote[];
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

const HEALTHS = ["green", "yellow", "red"] as const;

// The CSM-engagement panel: meeting cadence, notes, client health, the three prep
// gates (SF pulled · notes · health), and a ready "can I join?" message. This is
// the partner-first motion made concrete — ride the CSM's existing meetings.
function EngagementPanel({ a }: { a: AccountRow }) {
  const e = a.engagement;
  const gates = engagementGates(e);
  const who = a.csm.trim().split(/\s+/)[0] || a.csm;
  return (
    <div className={styles.engage}>
      <div className={styles.engageHead}>
        <span className={styles.engageTitle}>CSM engagement — {a.csm}</span>
        <span className={styles.engageGates}>
          Prep {gates.count}/3
          <span className={gates.sf ? styles.gateOn : styles.gateOff}>SF</span>
          <span className={gates.notes ? styles.gateOn : styles.gateOff}>Notes</span>
          <span className={gates.health ? styles.gateOn : styles.gateOff}>Health</span>
        </span>
      </div>

      <form action={toggleSfChecked} className={styles.engageSfForm}>
        <input type="hidden" name="accountId" value={a.id} />
        <button className={e.sfChecked ? styles.gateBtnOn : styles.gateBtnOff}>
          {e.sfChecked ? "✓ Salesforce research pulled" : "☐ Mark Salesforce research pulled"}
        </button>
      </form>

      <form action={saveEngagement} className={styles.engageForm}>
        <input type="hidden" name="accountId" value={a.id} />
        <div className={styles.engageGrid}>
          <label className={styles.engageField}>
            <span>Cadence</span>
            <input
              name="cadence"
              defaultValue={e.cadence}
              list="cadenceOpts"
              placeholder="Weekly / Monthly…"
              maxLength={40}
            />
          </label>
          <label className={styles.engageField}>
            <span>Meeting day</span>
            <input name="meetingDay" defaultValue={e.meetingDay} placeholder="Thursday" maxLength={20} />
          </label>
          <label className={styles.engageField}>
            <span>Next meeting</span>
            <input type="date" name="nextMeeting" defaultValue={e.nextMeeting} />
          </label>
        </div>
        <datalist id="cadenceOpts">
          {CADENCE_OPTIONS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <div className={styles.engageHealth}>
          <span className={styles.engageHealthLab}>Client health</span>
          {HEALTHS.map((h) => (
            <label key={h} className={styles.healthOpt}>
              <input
                type="radio"
                name="clientHealth"
                value={h}
                defaultChecked={e.clientHealth === h}
              />
              <span className={`${styles.healthDot} ${styles[`health_${h}`]}`}>{h}</span>
            </label>
          ))}
          <label className={styles.healthOpt}>
            <input type="radio" name="clientHealth" value="" defaultChecked={e.clientHealth === ""} />
            <span className={styles.healthNone}>—</span>
          </label>
        </div>
        <label className={styles.engageField}>
          <span>CSM notes</span>
          <textarea
            name="csmNotes"
            defaultValue={e.csmNotes}
            rows={3}
            maxLength={4000}
            placeholder="What the CSM said — the client's world, health, timing, any cross-border hints…"
          />
        </label>
        <button className={styles.engageSave}>Save engagement</button>
      </form>

      <details className={styles.engageAsk}>
        <summary className={styles.engageAskSummary}>
          ✎ &ldquo;Can I join?&rdquo; — message to {who}
        </summary>
        <EditableMessage
          text={askToJoinMessage(a.csm, a.name, e)}
          copyLabel={`Copy the ask-to-join to ${who}`}
        />
      </details>
    </div>
  );
}

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
  // Deep-link from Today (and elsewhere): /accounts?focus=<id> opens that
  // account's detail (initial openId, below) and scrolls it into view, so a link
  // lands on the row, not the top of a 130-row table.
  const params = useSearchParams();
  const focusId = params.get("focus") ?? "";
  const [openId, setOpenId] = useState(focusId);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`acct-${focusId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId]);

  const isHot = (r: AccountRow) => r.play != null && (r.demand ?? 0) >= 60;

  // Partners (internal PrismHR people): the CSMs from the book + others like
  // Eric who may bring net-new accounts before owning any here.
  const partners = useMemo(
    () => [...new Set([...rows.map((r) => r.csm).filter(Boolean), ...EXTRA_PARTNERS])].sort(),
    [rows],
  );
  const inds = useMemo(
    () => [...new Set(rows.map((r) => r.industry).filter(Boolean))].sort(),
    [rows],
  );

  // Per-partner rollup of real targets (books worth briefing on).
  const rollup = useMemo(() => {
    const m = new Map<string, { high: number; targets: number; hot: number }>();
    for (const name of partners) m.set(name, { high: 0, targets: 0, hot: 0 });
    for (const r of rows) {
      const e = m.get(r.csm);
      if (!e) continue;
      if (r.tier === "high") e.high++;
      if (r.play != null) e.targets++;
      if (isHot(r)) e.hot++;
    }
    return [...m.entries()].sort((a, b) => b[1].hot - a[1].hot || b[1].targets - a[1].targets);
  }, [rows, partners]);

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

  // Export the current (filtered) view as CSV — a portable PEO list to hand a
  // partner, or the canonical account roster until an internal source is wired.
  const exportCsv = () => {
    const cols = [
      "Account",
      "City",
      "State",
      "Partner",
      "Role",
      "Model",
      "Size",
      "On PrismHR",
      "Global fit",
      "Demand",
      "Confidence",
      "Play",
      "Competitors",
      "Countries",
      "Website",
      "Contact",
      "Email",
    ];
    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = filtered.map((r) =>
      [
        r.name,
        r.city,
        r.state,
        r.csm,
        partnerRole(r.csm),
        r.industry,
        r.size || "",
        r.incumbent ? r.cloud : "",
        r.score,
        r.demand ?? "",
        r.researched ? r.confidence : "",
        r.play ?? "",
        r.competitors.join(" / "),
        r.countries.join(" / "),
        r.website,
        r.contactName,
        r.contactEmail,
      ]
        .map(esc)
        .join(","),
    );
    const csv = [cols.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prismhr-accounts-${filtered.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
            <span className={styles.rollupName}>
              {name} <span className={styles.rollupRole}>· {partnerRole(name)}</span>
            </span>
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
        <select value={csm} onChange={(e) => setCsm(e.target.value)} aria-label="Partner">
          <option value="">All partners</option>
          {partners.map((c) => (
            <option key={c} value={c}>
              {c} — {partnerRole(c)}
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
        <button type="button" className={styles.addMini} onClick={exportCsv}>
          Export CSV
        </button>
        <span className={styles.count}>
          {filtered.length} of {rows.length}
        </span>
      </div>

      {(() => {
        const hotOffBoard = rows.filter((r) => isHot(r) && !onDash.has(r.name));
        if (hotOffBoard.length === 0 || !canAdd) return null;
        return (
          <div className={styles.triage}>
            <span>
              <b>{hotOffBoard.length}</b> hot {hotOffBoard.length === 1 ? "signal" : "signals"} not on
              the board yet.
            </span>
            <button
              type="button"
              className={styles.addMini}
              onClick={() => {
                setHotOnly(true);
                setCsm("");
                setTier("");
                setPlay("");
              }}
            >
              Show them
            </button>
          </div>
        );
      })()}

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
              <tr id={`acct-${a.id}`} className={a.id === openId ? styles.rowActive : ""}>
                <td>
                  <button
                    className={styles.rowBtn}
                    onClick={() => setOpenId(openId === a.id ? "" : a.id)}
                    aria-expanded={openId === a.id}
                  >
                    {a.name}
                  </button>{" "}
                  <ValBadge v={a.validation} />
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
                        <div className={styles.rowSub}>
                          <CompetitorLinks names={a.competitors} />
                        </div>
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
                    <span
                      className={styles.chip}
                      title={`PrismHR cloud tenant “${a.cloud}” — existing platform customer`}
                    >
                      {a.cloud}
                    </span>
                  ) : (
                    <span className={styles.muted} title="Not a PrismHR platform customer">
                      —
                    </span>
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
                      <SfCheckpoint when="account" id={a.id} name={a.name} />
                      <AccountNotes notes={a.notes} />
                      <EngagementPanel a={a} />
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
                                <strong>
                                  <CompetitorLinks names={a.competitors} />
                                </strong>
                                . Pitch: bring it in-house on the platform they already run.
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
                              How this {a.score} is built: account profile {a.deskScore} (40% of the
                              score) + global demand {a.demandAdj ?? a.demand} (60%).
                              {a.confFactor < 1
                                ? ` Raw demand ${a.demand} trimmed to ${a.demandAdj} because confidence is ${a.confidence}.`
                                : ""}
                            </div>
                          </>
                        ) : (
                          <div className={styles.demandPending}>
                            Not researched (no findable web presence, or missed on the run). Score is
                            the account profile only — no demand signal yet.
                          </div>
                        )}
                      </div>

                      <div className={styles.bars}>
                        <div className={styles.barsHead}>
                          Account profile · {a.deskScore}/100 (firmographics, no research)
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
                        {" · Partner: "}
                        {a.csm} ({partnerRole(a.csm)})
                        {a.contactName && (
                          <>
                            {" · "}
                            {a.contactName} (Primary contact)
                            {a.contactEmail && (
                              <>
                                {" — "}
                                <a href={`mailto:${a.contactEmail}`}>{a.contactEmail}</a>
                              </>
                            )}
                          </>
                        )}
                        {a.website && (
                          <>
                            {" · "}
                            <a href={ensureHttp(a.website)} target="_blank" rel="noreferrer">
                              {a.website}
                            </a>
                          </>
                        )}
                      </div>

                      {canAdd && <ValidateControls id={a.id} current={a.validation} />}
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
