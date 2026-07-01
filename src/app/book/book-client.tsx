"use client";

import { useMemo, useState } from "react";
import { STAGES, stageLabel, type PeoRow, type Stage } from "@/lib/command-center/types";
import { savePeo } from "./actions";
import styles from "../command-center.module.css";

const fitClass: Record<string, string> = {
  high: styles.fitHigh,
  medium: styles.fitMedium,
  low: styles.fitLow,
};

function StageBadge({ stage }: { stage: Stage }) {
  const cls =
    stage === "WON"
      ? styles.stageWon
      : stage === "NOT_TOUCHED" || stage === "PASSED"
        ? styles.stage
        : `${styles.stage} ${styles.stageActive}`;
  return <span className={cls}>{stageLabel(stage)}</span>;
}

type Props = {
  rows: PeoRow[];
  canWrite: boolean;
  dbUnavailable: boolean;
  initialPeoId?: string;
  justSaved: boolean;
};

export function BookClient({ rows, canWrite, dbUnavailable, initialPeoId, justSaved }: Props) {
  const [query, setQuery] = useState("");
  const [csm, setCsm] = useState("");
  const [tier, setTier] = useState("");
  const [stage, setStage] = useState("");
  const [industry, setIndustry] = useState("");
  const [selectedId, setSelectedId] = useState(initialPeoId ?? "");

  const csmOptions = useMemo(() => [...new Set(rows.map((r) => r.csm))].sort(), [rows]);
  const industryOptions = useMemo(
    () => [...new Set(rows.map((r) => r.industry))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((r) => {
      if (csm && r.csm !== csm) return false;
      if (tier && r.fitTier !== tier) return false;
      if (stage && r.stage !== stage) return false;
      if (industry && r.industry !== industry) return false;
      if (q && !`${r.name} ${r.contactName} ${r.city} ${r.state}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [rows, query, csm, tier, stage, industry]);

  // group by CSM
  const groups = useMemo(() => {
    const m = new Map<string, PeoRow[]>();
    for (const r of filtered) {
      if (!m.has(r.csm)) m.set(r.csm, []);
      m.get(r.csm)!.push(r);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const select = (id: string) => {
    setSelectedId(id);
    window.history.replaceState(null, "", `/book?peo=${id}`);
  };

  return (
    <>
      <div className={styles.filters}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search PEO, contact, city…"
        />
        <select value={csm} onChange={(e) => setCsm(e.target.value)} aria-label="CSM">
          <option value="">All CSMs</option>
          {csmOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={tier} onChange={(e) => setTier(e.target.value)} aria-label="Fit">
          <option value="">All fit</option>
          <option value="high">High fit</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Stage">
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          aria-label="Industry"
        >
          <option value="">All industries</option>
          {industryOptions.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        <span className={styles.count}>{filtered.length} of {rows.length}</span>
      </div>

      <div className={styles.split}>
        <div>
          {groups.length === 0 && <div className={styles.empty}>No PEOs match.</div>}
          {groups.map(([csmName, list]) => (
            <div key={csmName}>
              <div className={styles.grp}>
                {csmName} · {list.length}
              </div>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Fit</th>
                    <th>Stage</th>
                    <th>Next action</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id} className={r.id === selectedId ? styles.rowActive : ""}>
                      <td>
                        <button className={styles.rowBtn} onClick={() => select(r.id)}>
                          {r.name}
                        </button>
                        <div className={styles.rowSub}>
                          {r.industry}
                          {r.size ? ` · ${r.size.toLocaleString()} WSE` : ""}
                          {r.state ? ` · ${r.city}, ${r.state}` : ""}
                        </div>
                      </td>
                      <td>
                        <span className={`${styles.fit} ${fitClass[r.fitTier]}`}>{r.fit}</span>
                      </td>
                      <td>
                        <StageBadge stage={r.stage} />
                      </td>
                      <td>
                        {r.nextAction ? (
                          <>
                            {r.nextAction}
                            {r.nextActionDate && (
                              <div className={styles.rowSub}>{r.nextActionDate}</div>
                            )}
                          </>
                        ) : (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        <div>
          {!selected ? (
            <div className={styles.panel}>
              <p className={styles.muted}>Select a PEO to view and update its working state.</p>
            </div>
          ) : (
            <div className={styles.panel}>
              <h2>{selected.name}</h2>
              <div className={styles.meta}>
                {selected.csm} · {selected.industry} · fit {selected.fit}
                <br />
                {selected.contactName && (
                  <>
                    {selected.contactName}
                    {selected.contactEmail && (
                      <>
                        {" — "}
                        <a href={`mailto:${selected.contactEmail}`}>{selected.contactEmail}</a>
                      </>
                    )}
                    <br />
                  </>
                )}
                {selected.website && (
                  <a href={ensureHttp(selected.website)} target="_blank" rel="noreferrer">
                    {selected.website}
                  </a>
                )}
              </div>

              {canWrite ? (
                <form action={savePeo} key={selected.id}>
                  <input type="hidden" name="peoId" value={selected.id} />
                  <input type="hidden" name="returnTo" value="/book" />
                  <div className={styles.field}>
                    <label>Stage</label>
                    <select name="stage" defaultValue={selected.stage}>
                      {STAGES.map((s) => (
                        <option key={s.key} value={s.key}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Next action</label>
                    <input
                      name="nextAction"
                      defaultValue={selected.nextAction ?? ""}
                      placeholder="e.g. Brief Anika on Engage's global appetite"
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Next action date</label>
                    <input type="date" name="nextActionDate" defaultValue={selected.nextActionDate ?? ""} />
                  </div>
                  <div className={styles.field}>
                    <label>Notes</label>
                    <textarea name="notes" defaultValue={selected.notes ?? ""} />
                  </div>
                  <div className={styles.field}>
                    <label>Log activity (optional)</label>
                    <input name="activity" placeholder="e.g. Called Anika — she'll intro to 2 clients" />
                  </div>
                  <div className={styles.saveRow}>
                    <button type="submit" className={styles.saveBtn}>
                      Save
                    </button>
                    {justSaved && selected.id === initialPeoId && (
                      <span className={styles.saved}>Saved ✓</span>
                    )}
                  </div>
                </form>
              ) : (
                <p className={styles.muted}>
                  {dbUnavailable
                    ? "Read-only — run docs/command-center-tables.sql in Supabase to enable saving."
                    : "Read-only access."}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ensureHttp(url: string) {
  return /^https?:\/\//.test(url) ? url : `https://${url}`;
}
