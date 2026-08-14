"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useFormStatus } from "react-dom";
import { EXTRA_PARTNERS, partnerRole } from "@/lib/book/partners";
import { competitorUrl } from "@/lib/book/research";
import { SfCheckpoint } from "@/components/sf";
import {
  AccountChipNotes,
  AccountNotes,
  BackgroundIntel,
  PeopleIndex,
  type ChipNote,
  type LinkedNote,
} from "@/components/account-notes";
import type { PersonRow } from "@/lib/intel/people";
import {
  askToJoinMessage,
  CADENCE_OPTIONS,
  engagementGates,
  type Engagement,
} from "@/lib/engagement";
import { addCard } from "./dashboard/actions";
import {
  applyPlay,
  clearValidation,
  saveEngagement,
  savePeo,
  toggleSfChecked,
  validateScore,
} from "./accounts/actions";
import {
  APPROACHES,
  INTENTS,
  STAGES,
  approachBlurb,
  approachLabel,
  priorityTier,
  stageLabel,
  suggestedAction,
  type Approach,
  type Intent,
  type Stage,
} from "@/lib/command-center/types";
import { kitsFor, mergeText, type CampaignKit } from "@/lib/campaigns";
import { EditableMessage } from "./today-client";
import { getContacts } from "./accounts/actions";
import type { BookContact } from "@/lib/book/contacts";
import { sfContactUrl } from "@/lib/salesforce";
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
      {pending ? "Adding…" : "Add to dashboard"}
    </button>
  );
}

function ValBadge({ v }: { v: AccountRow["validation"] }) {
  if (!v) return null;
  if (v.status === "confirmed")
    return <span className={styles.valConfirmed}>✓ confirmed</span>;
  if (v.status === "flagged") return <span className={styles.valFlagged}>⚠ flagged</span>;
  return <span className={styles.valAdjusted}>adjusted to {v.adjustedDemand}</span>;
}

// The trust layer: Confirm the AI score, Flag it as wrong (visibly distrusted
// downstream), or Adjust the demand (flows into the composite everywhere).
function ValidateControls({
  id,
  current,
}: {
  id: string;
  current: AccountRow["validation"];
}) {
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
          <input
            name="note"
            maxLength={500}
            placeholder="What's wrong?"
            aria-label="Flag reason"
          />
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
          <input
            name="note"
            maxLength={500}
            placeholder="Why? Optional."
            aria-label="Adjust note"
          />
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
  // Off-structure state: ⚡ in motion (live conversation) or ⏸ parked. Not-mine
  // accounts never reach the room — they live in the exclusions ledger.
  disposition: { status: "motion" | "parked"; reason: string } | null;
  notes: LinkedNote[];
  chipNotes: ChipNote[]; // the working record ("mine" lane)
  bgNotes: ChipNote[]; // background register — behind a click
  people: PersonRow[]; // everyone in the account's traffic
  contactCount: number;
  // Working-the-deal state (absorbed from the Book).
  stage: Stage;
  approach: Approach;
  intent: Intent;
  blended: number; // fit + intent blended priority
  nextAction: string | null;
  nextActionDate: string | null;
  peoNotes: string | null;
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

// "Working the deal" — the Book's editable form + plays, verbatim, living in
// the account's expanded row. Posts the same savePeo/applyPlay actions.
function WorkingDeal({ a, canWrite }: { a: AccountRow; canWrite: boolean }) {
  const [copiedId, setCopiedId] = useState("");
  const plays = kitsFor(a.stage, a.approach);
  const copyKit = async (kit: CampaignKit) => {
    const text = `Subject: ${mergeText(kit.subject, a)}\n\n${mergeText(kit.body, a)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(kit.id);
      setTimeout(() => setCopiedId(""), 2000);
    } catch {
      setCopiedId("");
    }
  };
  return (
    <div className={styles.panel}>
      {/* Folded by decree (2026-08-14): the drilldown leads with the
          research; the working furniture opens on demand. */}
      <details className={styles.foldSect}>
        <summary className={styles.foldSum}>
          <h3 className={styles.playsHead}>
            Working the deal <StageBadge stage={a.stage} />{" "}
            <ApproachChip approach={a.approach} />
          </h3>
        </summary>
        {canWrite ? (
          <form action={savePeo} key={a.id}>
            <input type="hidden" name="peoId" value={a.id} />
            <input type="hidden" name="returnTo" value="/accounts" />
            <div className={styles.field}>
              <label>Stage</label>
              <select name="stage" defaultValue={a.stage}>
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Approach</label>
              <select name="approach" defaultValue={a.approach}>
                {APPROACHES.map((ap) => (
                  <option key={ap.key} value={ap.key}>
                    {ap.label}
                  </option>
                ))}
              </select>
              <p className={styles.hint}>{approachBlurb(a.approach)}</p>
            </div>
            <div className={styles.field}>
              <label>International hiring in their book</label>
              <select name="intent" defaultValue={a.intent}>
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
                defaultValue={a.nextAction ?? ""}
                placeholder={suggestedAction(a) ?? "Brief the CSM"}
              />
              {!a.nextAction && suggestedAction(a) && (
                <p className={styles.hint}>{suggestedAction(a)}</p>
              )}
            </div>
            <div className={styles.field}>
              <label>Next action date</label>
              <input
                type="date"
                name="nextActionDate"
                defaultValue={a.nextActionDate ?? ""}
              />
            </div>
            <div className={styles.field}>
              <label>Notes</label>
              <textarea name="notes" defaultValue={a.peoNotes ?? ""} />
            </div>
            <div className={styles.field}>
              <label>Log activity</label>
              <input
                name="activity"
                placeholder="Called Anika. She'll introduce two clients."
              />
            </div>
            <div className={styles.saveRow}>
              <button type="submit" className={styles.saveBtn}>
                Save
              </button>
            </div>
          </form>
        ) : (
          <p className={styles.muted}>Read-only access.</p>
        )}
      </details>

      <details className={styles.foldSect}>
        <summary className={styles.foldSum}>
          <h3 className={styles.playsHead}>
            Plays for this stage{plays.length > 0 ? ` · ${plays.length}` : ""}
          </h3>
        </summary>
        <div className={styles.plays}>
          {plays.length === 0 ? (
            <p className={styles.muted}>
              No play for this stage and approach. Advance the stage or clear the approach
              gate.
            </p>
          ) : (
            plays.map((k) => (
              <div key={k.id} className={styles.play}>
                <div className={styles.playTop}>
                  <strong>{k.name}</strong>
                  <span className={styles.chip}>{k.channel}</span>
                </div>
                <p className={styles.playAsk}>{mergeText(k.ask, a)}</p>
                <details className={styles.playDetails}>
                  <summary>Preview message</summary>
                  <div className={styles.playSubject}>
                    Subject: {mergeText(k.subject, a)}
                  </div>
                  <pre className={styles.playPre}>{mergeText(k.body, a)}</pre>
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
                      <input type="hidden" name="peoId" value={a.id} />
                      <input type="hidden" name="kitId" value={k.id} />
                      <input type="hidden" name="returnTo" value="/accounts" />
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
      </details>
    </div>
  );
}

const fitClass: Record<string, string> = {
  high: styles.fitHigh,
  medium: styles.fitMedium,
  low: styles.fitLow,
};

const demandClass = (d: number | null) =>
  d == null
    ? styles.fitLow
    : d >= 60
      ? styles.fitHigh
      : d >= 35
        ? styles.fitMedium
        : styles.fitLow;

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
        <span className={styles.engageTitle}>CSM engagement with {a.csm}</span>
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
          {e.sfChecked
            ? "✓ Salesforce research pulled"
            : "☐ Mark Salesforce research pulled"}
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
            <input
              name="meetingDay"
              defaultValue={e.meetingDay}
              placeholder="Thursday"
              maxLength={20}
            />
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
            <input
              type="radio"
              name="clientHealth"
              value=""
              defaultChecked={e.clientHealth === ""}
            />
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
            placeholder="What the CSM said: the client's world, health, timing, any cross-border hints."
          />
        </label>
        <button className={styles.engageSave}>Save engagement</button>
      </form>

      <details className={styles.engageAsk}>
        <summary className={styles.engageAskSummary}>Ask {who} if you can join.</summary>
        <EditableMessage
          text={askToJoinMessage(a.csm, a.name, e)}
          copyLabel={`Copy the message for ${who}`}
        />
      </details>
    </div>
  );
}

export function AccountsClient({
  rows,
  canAdd,
  canWrite = false,
  onDashboard,
}: {
  rows: AccountRow[];
  canAdd: boolean;
  canWrite?: boolean;
  onDashboard: string[];
}) {
  const onDash = useMemo(() => new Set(onDashboard), [onDashboard]);
  const [q, setQ] = useState("");
  const [csm, setCsm] = useState("");
  const [industry, setIndustry] = useState("");
  const [tier, setTier] = useState("");
  const [play, setPlay] = useState("");
  const [stageF, setStageF] = useState("");
  const [approachF, setApproachF] = useState("");
  const [prioF, setPrioF] = useState("");
  const [groupByCsm, setGroupByCsm] = useState(false);
  const [hotOnly, setHotOnly] = useState(false);
  const [sort, setSort] = useState("score");
  // Deep-link from Today (and elsewhere): /accounts?focus=<id> opens that
  // account's detail (initial openId, below) and scrolls it into view, so a link
  // lands on the row, not the top of a 130-row table. The savePeo redirect
  // returns as ?peo=<id> — same treatment, so a saved row reopens.
  const params = useSearchParams();
  const focusId = params.get("focus") ?? params.get("peo") ?? "";
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
    () =>
      [...new Set([...rows.map((r) => r.csm).filter(Boolean), ...EXTRA_PARTNERS])].sort(),
    [rows],
  );
  const inds = useMemo(
    () => [...new Set(rows.map((r) => r.industry).filter(Boolean))].sort(),
    [rows],
  );

  // Counts for every filter option, so each choice says how many it selects.
  const countBy = (pick: (r: AccountRow) => string) => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = pick(r);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const csmCounts = useMemo(() => countBy((r) => r.csm), [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const indCounts = useMemo(() => countBy((r) => r.industry), [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const tierCounts = useMemo(() => countBy((r) => r.tier), [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const playCounts = useMemo(() => countBy((r) => r.play ?? ""), [rows]); // eslint-disable-line react-hooks/exhaustive-deps
  const hotCount = useMemo(() => rows.filter((r) => isHot(r)).length, [rows]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    const list = rows.filter((r) => {
      if (csm && r.csm !== csm) return false;
      if (industry && r.industry !== industry) return false;
      if (tier && r.tier !== tier) return false;
      if (play && r.play !== play) return false;
      if (stageF && r.stage !== stageF) return false;
      if (approachF && r.approach !== approachF) return false;
      if (prioF && priorityTier(r.blended) !== prioF) return false;
      if (hotOnly && !isHot(r)) return false;
      if (
        s &&
        !`${r.name} ${r.city} ${r.state} ${r.contactName} ${r.industry}`
          .toLowerCase()
          .includes(s)
      )
        return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "demand") return (b.demand ?? -1) - (a.demand ?? -1);
      return b.score - a.score;
    });
  }, [rows, q, csm, industry, tier, play, stageF, approachF, prioF, hotOnly, sort]);

  // Group-by-CSM view (the Book's grouping): per-CSM groups, largest first.
  const grouped = useMemo(() => {
    if (!groupByCsm) return null;
    const m = new Map<string, AccountRow[]>();
    for (const r of filtered) {
      if (!m.has(r.csm)) m.set(r.csm, []);
      m.get(r.csm)!.push(r);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered, groupByCsm]);

  const copyList = async () => {
    const text = filtered
      .map(
        (r) =>
          `${r.name} — fit ${r.score}${r.demand != null ? `, demand ${r.demand}` : ""}${
            r.play
              ? `, ${r.play}${r.competitors.length ? ` (${r.competitors.join("/")})` : ""}`
              : ""
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
      <div className={styles.filters}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search account, city, contact…"
          aria-label="Search accounts"
        />
        <select value={csm} onChange={(e) => setCsm(e.target.value)} aria-label="Partner">
          <option value="">All partners ({rows.length})</option>
          {partners.map((c) => (
            <option key={c} value={c}>
              {c} — {partnerRole(c)} ({csmCounts.get(c) ?? 0})
            </option>
          ))}
        </select>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          aria-label="Industry"
        >
          <option value="">All models ({rows.length})</option>
          {inds.map((i) => (
            <option key={i} value={i}>
              {i} ({indCounts.get(i) ?? 0})
            </option>
          ))}
        </select>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value)}
          aria-label="Fit tier"
        >
          <option value="">All fit ({rows.length})</option>
          <option value="high">High fit ({tierCounts.get("high") ?? 0})</option>
          <option value="medium">Medium ({tierCounts.get("medium") ?? 0})</option>
          <option value="low">Low ({tierCounts.get("low") ?? 0})</option>
        </select>
        <select
          value={play}
          onChange={(e) => setPlay(e.target.value)}
          aria-label="Play type"
        >
          <option value="">All plays ({rows.length})</option>
          <option value="displacement">
            Displacement ({playCounts.get("displacement") ?? 0})
          </option>
          <option value="greenfield">
            Greenfield ({playCounts.get("greenfield") ?? 0})
          </option>
        </select>
        <select
          value={stageF}
          onChange={(e) => setStageF(e.target.value)}
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
          value={approachF}
          onChange={(e) => setApproachF(e.target.value)}
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
          value={prioF}
          onChange={(e) => setPrioF(e.target.value)}
          aria-label="Priority"
        >
          <option value="">All priority</option>
          <option value="high">High priority</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="score">Sort: Global fit</option>
          <option value="demand">Sort: demand</option>
          <option value="name">Sort: name</option>
        </select>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={groupByCsm}
            onChange={(e) => setGroupByCsm(e.target.checked)}
          />
          Group by CSM
        </label>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={hotOnly}
            onChange={(e) => setHotOnly(e.target.checked)}
          />
          Hot targets ({hotCount})
        </label>
        <button type="button" className={styles.addMini} onClick={copyList}>
          {copied ? "Copied ✓" : "Copy list"}
        </button>
        <button type="button" className={styles.addMini} onClick={exportCsv}>
          Export CSV
        </button>
        <span className={styles.count}>
          <b>{filtered.length}</b> of {rows.length}
          {csm ? ` — ${csm.split(" ")[0]}'s` : ""}
        </span>
      </div>

      {(() => {
        const hotOffBoard = rows.filter((r) => isHot(r) && !onDash.has(r.name));
        if (hotOffBoard.length === 0 || !canAdd) return null;
        return (
          <div className={styles.triage}>
            <span>
              <b>{hotOffBoard.length}</b> hot{" "}
              {hotOffBoard.length === 1 ? "signal" : "signals"} not on the board yet.
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
            <th>Stage</th>
            <th>Next action</th>
            <th>Play</th>
            <th>Model</th>
            <th>PrismHR</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(grouped
            ? grouped.flatMap(([gName, list]) => [
                { __group: gName, count: list.length },
                ...list,
              ])
            : filtered
          ).map((item) => {
            if ("__group" in item)
              return (
                <tr key={`grp-${item.__group}`}>
                  <td colSpan={9} className={styles.grp}>
                    {item.__group} · {item.count}
                  </td>
                </tr>
              );
            const a = item;
            return (
              <Fragment key={a.id}>
                <tr
                  id={`acct-${a.id}`}
                  className={a.id === openId ? styles.rowActive : ""}
                >
                  <td>
                    <button
                      className={styles.rowBtn}
                      onClick={() => setOpenId(openId === a.id ? "" : a.id)}
                      aria-expanded={openId === a.id}
                    >
                      {a.name}
                    </button>{" "}
                    {a.disposition && (
                      <span
                        className={styles.dispoBadge}
                        title={a.disposition.reason || undefined}
                      >
                        {a.disposition.status === "motion" ? "⚡ in motion" : "⏸ parked"}
                      </span>
                    )}{" "}
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
                      <span className={`${styles.fit} ${demandClass(a.demand)}`}>
                        {a.demand}
                      </span>
                    ) : (
                      <span className={styles.muted} title="Not researched">
                        —
                      </span>
                    )}
                  </td>
                  <td>
                    <StageBadge stage={a.stage} />
                    <div className={styles.stackTop}>
                      <ApproachChip approach={a.approach} />
                    </div>
                  </td>
                  <td>
                    {a.nextAction ? (
                      <>
                        <span className={styles.rowSub}>{a.nextAction}</span>
                        {a.nextActionDate && (
                          <div className={styles.rowSub}>{a.nextActionDate}</div>
                        )}
                      </>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td>
                    {a.play === "displacement" ? (
                      <>
                        <span className={`${styles.tag} ${styles.tagDisplace}`}>
                          Displace
                        </span>
                        {a.competitors.length > 0 && (
                          <div className={styles.rowSub}>
                            <CompetitorLinks names={a.competitors} />
                          </div>
                        )}
                      </>
                    ) : a.play === "greenfield" ? (
                      <span className={`${styles.tag} ${styles.tagGreen}`}>
                        Greenfield
                      </span>
                    ) : (
                      <span className={styles.muted}>—</span>
                    )}
                  </td>
                  <td className={styles.rowSub}>{a.industry}</td>
                  <td>
                    {a.incumbent ? (
                      <span
                        className={styles.chip}
                        title={`Already a platform customer, on PrismHR cloud tenant “${a.cloud}”.`}
                      >
                        {a.cloud}
                      </span>
                    ) : (
                      <span
                        className={styles.muted}
                        title="Not a PrismHR platform customer"
                      >
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
                    <td colSpan={9}>
                      <div className={styles.acctDetail}>
                        <SfCheckpoint when="account" id={a.id} name={a.name} />
                        {/* The research leads (founder-decreed 2026-08-14): the drilldown opens with what the research knows; the working furniture follows, folded. */}
                        <div className={styles.demandBlock}>
                          {a.researched && a.demand != null ? (
                            <>
                              <div className={styles.demandHead}>
                                <span
                                  className={`${styles.fit} ${demandClass(a.demand)}`}
                                >
                                  {a.demand}
                                </span>
                                <strong>Global-hiring demand</strong>
                                <span className={styles.confChip}>
                                  {a.confidence} confidence
                                </span>
                              </div>
                              {a.play === "displacement" && a.competitors.length > 0 && (
                                <p className={styles.servedBy}>
                                  Displacement play. Currently served by{" "}
                                  <strong>
                                    <CompetitorLinks names={a.competitors} />
                                  </strong>
                                  . Pitch: bring it in-house on the platform they already
                                  run.
                                </p>
                              )}
                              {a.play === "greenfield" && (
                                <p className={styles.servedBy}>
                                  Greenfield. Real demand, no incumbent EOR named in the
                                  research.
                                </p>
                              )}
                              {a.summary && (
                                <p className={styles.demandSummary}>{a.summary}</p>
                              )}
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
                                    <a
                                      key={i}
                                      href={e.url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      ↗ {hostOf(e.url)}
                                    </a>
                                  ))}
                                </div>
                              )}
                              <div className={styles.formula}>
                                How this {a.score} is built: 40% account profile at{" "}
                                {a.deskScore}, 60% global demand at{" "}
                                {a.demandAdj ?? a.demand}.
                                {a.confFactor < 1
                                  ? ` Raw demand ${a.demand} trimmed to ${a.demandAdj} because confidence is ${a.confidence}.`
                                  : ""}
                              </div>
                            </>
                          ) : (
                            <div className={styles.demandPending}>
                              Not researched: no findable web presence, or missed on the
                              run. Score is the account profile only. No demand signal
                              yet.
                            </div>
                          )}
                        </div>
                        <AccountChipNotes notes={a.chipNotes} />
                        <AccountNotes notes={a.notes} />
                        <PeopleIndex people={a.people} />
                        <BackgroundIntel notes={a.bgNotes} />
                        <EngagementPanel a={a} />
                        <WorkingDeal a={a} canWrite={canWrite} />

                        <div className={styles.bars}>
                          <div className={styles.barsHead}>
                            Account profile · {a.deskScore}/100, firmographics only, no
                            research
                          </div>
                          {(["scale", "incumbency", "model", "recency"] as const).map(
                            (k) => (
                              <div key={k} className={styles.barRow}>
                                <span className={styles.barLabel}>{BAR_LABEL[k]}</span>
                                <span className={styles.barTrack}>
                                  <span
                                    className={styles.barFill}
                                    style={{
                                      width: `${(a.breakdown[k] / BAR_MAX[k]) * 100}%`,
                                    }}
                                  />
                                </span>
                                <span className={styles.barVal}>
                                  {a.breakdown[k]}/{BAR_MAX[k]}
                                </span>
                              </div>
                            ),
                          )}
                        </div>

                        <div className={styles.acctMeta}>
                          {a.sizeBucket ||
                            (a.size ? `${a.size.toLocaleString()} WSE` : "size unknown")}
                          {" · Partner: "}
                          {a.csm}, {partnerRole(a.csm)}
                          {a.contactName && (
                            <>
                              {" · "}
                              {a.contactName}, the relationship
                              {a.contactEmail && (
                                <>
                                  {" — "}
                                  <a href={`mailto:${a.contactEmail}`}>
                                    {a.contactEmail}
                                  </a>
                                </>
                              )}
                            </>
                          )}
                          {a.website && (
                            <>
                              {" · "}
                              <a
                                href={ensureHttp(a.website)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {a.website}
                              </a>
                            </>
                          )}
                        </div>

                        <ContactsPanel accountId={a.id} count={a.contactCount} />

                        {canAdd && <ValidateControls id={a.id} current={a.validation} />}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

// The account's full contact roster — every column of the SF contact reports.
// Collapsed by default; the list loads through a server action on first open
// (5k contacts app-wide would otherwise ride in every page load).
function ContactsPanel({ accountId, count }: { accountId: string; count: number }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<BookContact[] | null>(null);
  const [q, setQ] = useState("");
  if (count === 0) return null;

  const openUp = async () => {
    const next = !open;
    setOpen(next);
    if (next && list === null) setList(await getContacts(accountId));
  };

  const needle = q.trim().toLowerCase();
  const shown = (list ?? []).filter(
    (c) =>
      !needle ||
      `${c.first} ${c.last} ${c.title} ${c.email} ${c.city} ${c.state} ${c.phone} ${c.mobile}`
        .toLowerCase()
        .includes(needle),
  );

  return (
    <div className={styles.ctcWrap}>
      <button type="button" className={styles.ctcToggle} onClick={openUp}>
        {open ? "▾" : "▸"} Contacts ({count})
      </button>
      {open && (
        <>
          {count > 8 && (
            <input
              type="search"
              className={styles.ctcSearch}
              placeholder="Filter by name, title, email, city…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          )}
          {list === null && <p className={styles.muted}>Loading…</p>}
          {list !== null && shown.length === 0 && (
            <p className={styles.muted}>No contact matches “{q}”.</p>
          )}
          <div className={styles.ctcList}>
            {shown.map((c, i) => (
              <div className={styles.ctcRow} key={`${c.email}-${i}`}>
                <div className={styles.ctcHead}>
                  {sfContactUrl(c.id) ? (
                    <a
                      href={sfContactUrl(c.id)!}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.ctcName}
                      title="Open this contact's record in Salesforce"
                    >
                      {c.first} {c.last} ↗
                    </a>
                  ) : (
                    <b>
                      {c.first} {c.last}
                    </b>
                  )}
                  {c.title && <span className={styles.ctcTitle}> — {c.title}</span>}
                </div>
                <div className={styles.ctcLine}>
                  {c.email && (
                    <a href={`mailto:${c.email}`} className={styles.ctcLink}>
                      ✉ {c.email}
                    </a>
                  )}
                  {c.phone && (
                    <a href={`tel:${c.phone}`} className={styles.ctcLink}>
                      ☎ {c.phone}
                    </a>
                  )}
                  {c.mobile && (
                    <a href={`tel:${c.mobile}`} className={styles.ctcLink}>
                      📱 {c.mobile}
                    </a>
                  )}
                </div>
                {(c.street || c.city || c.state || c.zip || c.country) && (
                  <div className={styles.ctcAddr}>
                    {[c.street, c.city, c.state, c.zip, c.country]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
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

// One-time seed dropped into a new dashboard card's Discovery note on "Add to dashboard".
function seedFor(a: AccountRow): string {
  if (!a.researched || a.demand == null) return "";
  const play =
    a.play === "displacement"
      ? `Displacement. Currently on ${a.competitors.join(", ") || "a competitor EOR"}.`
      : a.play === "greenfield"
        ? "Greenfield. No incumbent EOR named."
        : "";
  const countries = a.countries.length
    ? ` Countries seen: ${a.countries.join(", ")}.`
    : "";
  return `Demand ${a.demand}/100 at ${a.confidence} confidence. ${play}${countries} ${a.summary}`.trim();
}
