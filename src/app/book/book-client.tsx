"use client";

import { useMemo, useState } from "react";
import {
  APPROACHES,
  INTENTS,
  STAGES,
  approachBlurb,
  approachLabel,
  intentLabel,
  priorityTier,
  stageLabel,
  suggestedAction,
  type Approach,
  type PeoRow,
  type Stage,
} from "@/lib/command-center/types";
import { kitsFor, mergeText, type CampaignKit } from "@/lib/campaigns";
import { applyPlay, savePeo } from "./actions";
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

function ApproachChip({ approach }: { approach: Approach }) {
  const cls =
    approach === "DIRECT_OK"
      ? `${styles.approach} ${styles.approachGo}`
      : approach === "CHANNEL_OK"
        ? `${styles.approach} ${styles.approachOk}`
        : `${styles.approach} ${styles.approachHold}`;
  return <span className={cls}>{approachLabel(approach)}</span>;
}

type Props = {
  rows: PeoRow[];
  canWrite: boolean;
  dbUnavailable: boolean;
  initialPeoId?: string;
  justSaved: boolean;
};

export function BookClient({
  rows,
  canWrite,
  dbUnavailable,
  initialPeoId,
  justSaved,
}: Props) {
  const [query, setQuery] = useState("");
  const [csm, setCsm] = useState("");
  const [tier, setTier] = useState("");
  const [stage, setStage] = useState("");
  const [approach, setApproach] = useState("");
  const [industry, setIndustry] = useState("");
  const [selectedId, setSelectedId] = useState(initialPeoId ?? "");
  const [copiedId, setCopiedId] = useState("");

  const csmOptions = useMemo(() => [...new Set(rows.map((r) => r.csm))].sort(), [rows]);
  const industryOptions = useMemo(
    () => [...new Set(rows.map((r) => r.industry))].sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((r) => {
      if (csm && r.csm !== csm) return false;
      if (tier && priorityTier(r.priority) !== tier) return false;
      if (stage && r.stage !== stage) return false;
      if (approach && r.approach !== approach) return false;
      if (industry && r.industry !== industry) return false;
      if (
        q &&
        !`${r.name} ${r.contactName} ${r.city} ${r.state}`.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [rows, query, csm, tier, stage, approach, industry]);

  // group by CSM, each group ranked by blended priority
  const groups = useMemo(() => {
    const m = new Map<string, PeoRow[]>();
    for (const r of filtered) {
      if (!m.has(r.csm)) m.set(r.csm, []);
      m.get(r.csm)!.push(r);
    }
    for (const list of m.values()) list.sort((a, b) => b.priority - a.priority);
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const select = (id: string) => {
    setSelectedId(id);
    window.history.replaceState(null, "", `/book?peo=${id}`);
  };

  const copyKit = async (kit: CampaignKit) => {
    if (!selected) return;
    const text = `Subject: ${mergeText(kit.subject, selected)}\n\n${mergeText(kit.body, selected)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(kit.id);
      setTimeout(() => setCopiedId(""), 2000);
    } catch {
      setCopiedId("");
    }
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
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          aria-label="Priority"
        >
          <option value="">All priority</option>
          <option value="high">High priority</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          aria-label="Stage"
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={approach}
          onChange={(e) => setApproach(e.target.value)}
          aria-label="Approach"
        >
          <option value="">Any approach</option>
          {APPROACHES.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
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
        <span className={styles.count}>
          {filtered.length} of {rows.length}
        </span>
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
                    <th>Priority</th>
                    <th>Stage / approach</th>
                    <th>Next action</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr
                      key={r.id}
                      className={r.id === selectedId ? styles.rowActive : ""}
                    >
                      <td>
                        <button className={styles.rowBtn} onClick={() => select(r.id)}>
                          {r.name}
                        </button>
                        <div className={styles.rowSub}>
                          {r.industry}
                          {r.size ? ` · ${r.size.toLocaleString()} WSE` : ""}
                          {r.state ? ` · ${r.city}, ${r.state}` : ""}
                          {r.intent !== "UNKNOWN"
                            ? ` · intl hiring: ${intentLabel(r.intent)}`
                            : ""}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`${styles.fit} ${fitClass[priorityTier(r.priority)]}`}
                          title={
                            r.priority !== r.fit
                              ? `structural fit ${r.fit} + intent`
                              : undefined
                          }
                        >
                          {r.priority}
                        </span>
                      </td>
                      <td>
                        <StageBadge stage={r.stage} />
                        <div className={styles.stackTop}>
                          <ApproachChip approach={r.approach} />
                        </div>
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
              <p className={styles.muted}>
                Select a PEO to view and update its working state.
              </p>
            </div>
          ) : (
            <div className={styles.panel}>
              <h2>{selected.name}</h2>
              <div className={styles.meta}>
                {selected.csm} · {selected.industry} · priority {selected.priority}
                {selected.priority !== selected.fit ? ` (fit ${selected.fit})` : ""}
                <br />
                {selected.contactName && (
                  <>
                    {selected.contactName}
                    {selected.contactEmail && (
                      <>
                        {" — "}
                        <a href={`mailto:${selected.contactEmail}`}>
                          {selected.contactEmail}
                        </a>
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
                    <label>Approach — what you&apos;re cleared to do</label>
                    <select name="approach" defaultValue={selected.approach}>
                      {APPROACHES.map((a) => (
                        <option key={a.key} value={a.key}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                    <p className={styles.hint}>{approachBlurb(selected.approach)}</p>
                  </div>
                  <div className={styles.field}>
                    <label>International hiring in their book</label>
                    <select name="intent" defaultValue={selected.intent}>
                      {INTENTS.map((i) => (
                        <option key={i.key} value={i.key}>
                          {i.label}
                        </option>
                      ))}
                    </select>
                    <p className={styles.hint}>
                      Lifts or lowers priority to match real demand.
                    </p>
                  </div>
                  <div className={styles.field}>
                    <label>Next action</label>
                    <input
                      name="nextAction"
                      defaultValue={selected.nextAction ?? ""}
                      placeholder={suggestedAction(selected) ?? "e.g. Brief the CSM"}
                    />
                    {!selected.nextAction && suggestedAction(selected) && (
                      <p className={styles.hint}>
                        Suggested: {suggestedAction(selected)}
                      </p>
                    )}
                  </div>
                  <div className={styles.field}>
                    <label>Next action date</label>
                    <input
                      type="date"
                      name="nextActionDate"
                      defaultValue={selected.nextActionDate ?? ""}
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Notes</label>
                    <textarea name="notes" defaultValue={selected.notes ?? ""} />
                  </div>
                  <div className={styles.field}>
                    <label>Log activity (optional)</label>
                    <input
                      name="activity"
                      placeholder="e.g. Called Anika — she'll intro to 2 clients"
                    />
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

              {(() => {
                const plays = kitsFor(selected.stage, selected.approach);
                return (
                  <div className={styles.plays}>
                    <h3 className={styles.playsHead}>Plays for this stage</h3>
                    {plays.length === 0 ? (
                      <p className={styles.muted}>
                        No play for this stage and approach — advance the stage or clear
                        the approach gate to unlock the next move.
                      </p>
                    ) : (
                      plays.map((k) => (
                        <div key={k.id} className={styles.play}>
                          <div className={styles.playTop}>
                            <strong>{k.name}</strong>
                            <span className={styles.chip}>{k.channel}</span>
                          </div>
                          <p className={styles.playAsk}>{mergeText(k.ask, selected)}</p>
                          <details className={styles.playDetails}>
                            <summary>Preview message</summary>
                            <div className={styles.playSubject}>
                              Subject: {mergeText(k.subject, selected)}
                            </div>
                            <pre className={styles.playPre}>
                              {mergeText(k.body, selected)}
                            </pre>
                          </details>
                          <div className={styles.playActions}>
                            <button
                              type="button"
                              className={styles.playCopy}
                              onClick={() => copyKit(k)}
                            >
                              {copiedId === k.id ? "Copied ✓" : "Copy message"}
                            </button>
                            {canWrite && (
                              <form action={applyPlay}>
                                <input type="hidden" name="peoId" value={selected.id} />
                                <input type="hidden" name="kitId" value={k.id} />
                                <input type="hidden" name="returnTo" value="/book" />
                                <button type="submit" className={styles.playApply}>
                                  Set as next action
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}
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
