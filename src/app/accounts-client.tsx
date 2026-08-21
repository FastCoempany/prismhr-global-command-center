"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  stageLabel,
  suggestedAction,
  type Approach,
  type Intent,
  type Stage,
} from "@/lib/command-center/types";
import { kitsFor, mergeText, type CampaignKit } from "@/lib/campaigns";
import { EditableMessage } from "./today-client";
import { getContacts, type ContactRow } from "./accounts/actions";
import {
  deleteMailTemplate,
  draftOutreach,
  listMailTemplates,
  saveMailTemplate,
  type MailTemplate,
} from "./accounts/draft-actions";
import { sfContactUrl } from "@/lib/salesforce";
import styles from "./command-center.module.css";
import SecondRecordPanel, { type RowSecond } from "./accounts/second-record-panel";
import ActLane, { type LaneAct } from "./accounts/act-lane";
import { markActActed, unmarkActActed } from "./accounts/act-actions";

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

// Every section of the drilldown rests behind a fold (founder-decreed
// 2026-08-20) — the double-click lands on contacts and the research read;
// depth opens on command.
function Fold({
  label,
  hint,
  defaultOpen = false,
  children,
}: {
  label: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.foldSec}>
      <button
        type="button"
        className={styles.foldHead}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "▾" : "▸"} {label}
        {hint && <span className={styles.foldHint}>{hint}</span>}
      </button>
      {open && children}
    </div>
  );
}

export type AccountRow = {
  id: string;
  /** The second record's row read — null when the drop holds nothing. */
  second: RowSecond | null;
  /** The Act Lane's saved, unsent draft — the pad never eats your words. */
  actDraft: { to: string; subject: string; body: string } | null;
  /** The newest gem's acted day ("" when un-acted) — the ✓ stamp's date. */
  actedDay: string;
  /** That gem's term, for the stamp's take-back. */
  actedTerm: string;
  /** A live board card (by id, digest-matched) — the fork's HomeRoom half. */
  onBoard: boolean;
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
  // Salesforce's Account Risk Level, from the risk: register — "HIGH" lights
  // the row; anything else rides the chip's own word.
  risk: string | null;
  // Off-structure state: ⚡ in motion (live conversation) or ⏸ parked. Not-mine
  // accounts never reach the room — they live in the exclusions ledger.
  disposition: {
    status: "motion" | "parked" | "won" | "lost" | "engaged";
    reason: string;
  } | null;
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

// The touch cell's voice: first name + last initial, mono, dates as M/D.
function shortWho(full: string): string {
  const parts = (full ?? "").trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "—";
  const first = parts[0].toUpperCase();
  return parts.length > 1
    ? `${first} ${parts[parts.length - 1][0].toUpperCase()}`
    : first;
}
function mmddOf(day: string): string {
  return day ? day.slice(5).replace("-", "/") : "";
}

// The sheet sorts at the column title (founder-decreed 2026-08-21). Each
// column carries its own comparator and a sensible first direction: names
// A→Z, everything measured biggest-or-newest first.
type ColKey = "name" | "score" | "demand" | "touch" | "signal" | "act";

const COL_CMP: Record<ColKey, (a: AccountRow, b: AccountRow) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  score: (a, b) => a.score - b.score,
  demand: (a, b) => (a.demand ?? -1) - (b.demand ?? -1),
  touch: (a, b) => (a.second?.touch?.day ?? "").localeCompare(b.second?.touch?.day ?? ""),
  signal: (a, b) =>
    (a.second?.gems.length ?? 0) - (b.second?.gems.length ?? 0) ||
    (a.second?.supportTotal ?? 0) - (b.second?.supportTotal ?? 0),
  act: (a, b) => (a.second?.act ? 1 : 0) - (b.second?.act ? 1 : 0),
};

const COL_DEFAULT_DIR: Record<ColKey, 1 | -1> = {
  name: 1,
  score: -1,
  demand: -1,
  touch: -1,
  signal: -1,
  act: -1,
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
  // Rests as one line (founder-decreed 2026-08-20): the panel is ahead of
  // where the ramp is — present, expandable, out of the way.
  const [open, setOpen] = useState(false);
  const e = a.engagement;
  const gates = engagementGates(e);
  const who = a.csm.trim().split(/\s+/)[0] || a.csm;
  if (!open)
    return (
      <div className={styles.engage}>
        <button
          type="button"
          className={styles.engageFold}
          onClick={() => setOpen(true)}
          aria-expanded={false}
        >
          ▸ CSM engagement with {a.csm}
          <span className={styles.engageGates}>
            Prep {gates.count}/3
            <span className={gates.sf ? styles.gateOn : styles.gateOff}>SF</span>
            <span className={gates.notes ? styles.gateOn : styles.gateOff}>Notes</span>
            <span className={gates.health ? styles.gateOn : styles.gateOff}>Health</span>
          </span>
        </button>
      </div>
    );
  return (
    <div className={styles.engage}>
      <div className={styles.engageHead}>
        <button
          type="button"
          className={styles.engageFold}
          onClick={() => setOpen(false)}
          aria-expanded={true}
        >
          ▾ CSM engagement with {a.csm}
        </button>
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
  // The Filter Door (founder-decreed 2026-08-21): the strip rests closed; a
  // live filter keeps the door lit and named even while the strip is folded.
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Column-header sort (founder-decreed 2026-08-21): clicking a title sorts
  // the sheet by that column; a second click flips it. The Sort dropdown is
  // retired (2026-08-21) — the titles are the only sort, Global fit at rest.
  const [colSort, setColSort] = useState<{ key: ColKey; dir: 1 | -1 } | null>(null);
  // Deep-link from Today (and elsewhere): /accounts?focus=<id> opens that
  // account's detail (initial openId, below) and scrolls it into view, so a link
  // lands on the row, not the top of a 130-row table. The savePeo redirect
  // returns as ?peo=<id> — same treatment, so a saved row reopens.
  const params = useSearchParams();
  const focusId = params.get("focus") ?? params.get("peo") ?? "";
  const [openId, setOpenId] = useState(focusId);
  // The second-record fold — one open at a time, from THE SIGNAL cell.
  const [srOpenId, setSrOpenId] = useState("");
  // The Act Lane (Version C, decreed 2026-08-21): one standing workbench,
  // reloaded chip to chip. The lane component saves a touched draft on hop.
  const [laneId, setLaneId] = useState("");
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`acct-${focusId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId]);

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

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    const list = rows.filter((r) => {
      if (csm && r.csm !== csm) return false;
      if (industry && r.industry !== industry) return false;
      if (tier && r.tier !== tier) return false;
      if (play && r.play !== play) return false;
      if (stageF && r.stage !== stageF) return false;
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
      if (colSort) return COL_CMP[colSort.key](a, b) * colSort.dir || b.score - a.score;
      return b.score - a.score;
    });
  }, [rows, q, csm, industry, tier, play, stageF, colSort]);

  // The door stays lit and named while any filter is live — filtered state
  // is never invisible behind a closed strip.
  const activeFilters = [
    csm && "PARTNERS",
    industry && "MODELS",
    tier && "FIT",
    play && "PLAYS",
    stageF && "STAGES",
  ].filter((f): f is string => Boolean(f));

  const clickSort = (key: ColKey) =>
    setColSort(
      colSort?.key === key
        ? { key, dir: colSort.dir === 1 ? -1 : 1 }
        : { key, dir: COL_DEFAULT_DIR[key] },
    );

  const tickActed = async (id: string, term: string) => {
    await markActActed({ accountId: id, term });
    if (laneId === id) setLaneId("");
    router.refresh();
  };
  const tickUnacted = async (id: string, term: string) => {
    await unmarkActActed({ accountId: id, term });
    router.refresh();
  };

  const laneRow = laneId ? rows.find((r) => r.id === laneId) : undefined;
  const laneGem = laneRow?.second?.gems[0];
  const laneAct: LaneAct | null =
    laneRow && laneRow.second?.act && laneGem
      ? {
          accountId: laneRow.id,
          accountName: laneRow.name,
          term: laneGem.term,
          act: laneRow.second.act,
          reason: laneGem.reason,
          whenDay: laneGem.whenDay,
          cites: laneGem.cites,
          to: laneRow.actDraft?.to ?? laneRow.contactName,
          toEmail: laneRow.contactEmail,
          subject: laneRow.actDraft?.subject ?? laneRow.second.act,
          body: laneRow.actDraft?.body ?? "",
          onBoard: laneRow.onBoard,
        }
      : null;

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
      <div className={styles.pageHead}>
        <h1 className={styles.h1}>Account Room</h1>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={copyList}
          title="Copy the list"
          aria-label="Copy the list"
        >
          {copied ? "✓" : "⧉"}
        </button>
        <button
          type="button"
          className={styles.iconBtn}
          onClick={exportCsv}
          title="Export CSV"
          aria-label="Export CSV"
        >
          ⇩
        </button>
      </div>
      {/* The search carries depth (founder-decreed 2026-08-21): inset
          glyph, layered shadow, a real focus ring. */}
      <div className={styles.searchWrap}>
        <span className={styles.searchGlyph} aria-hidden="true">
          ⌕
        </span>
        <input
          className={styles.searchDeep}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search account, city, contact…"
          aria-label="Search accounts"
        />
      </div>

      {/* The Filter Door (founder-decreed 2026-08-21, from the patch-list
          triptych): no rail — the sheet runs full width, the five filters
          live behind one mono door at the top-right shoulder, and a live
          filter keeps the door lit and named. The hot-signal bar stays
          retired. */}
      <div className={styles.fdoorRow}>
        <button
          type="button"
          className={
            activeFilters.length ? `${styles.fdoor} ${styles.fdoorLive}` : styles.fdoor
          }
          onClick={() => setFiltersOpen(!filtersOpen)}
          aria-expanded={filtersOpen}
        >
          FILTERS{activeFilters.map((f) => ` · ${f}`).join("")} ▾
        </button>
      </div>
      {filtersOpen && (
        <div className={styles.fstrip}>
          <select
            value={csm}
            onChange={(e) => setCsm(e.target.value)}
            aria-label="Partner"
          >
            <option value="">Partners</option>
            {partners.map((c) => (
              <option key={c} value={c}>
                {c} — {partnerRole(c)}
              </option>
            ))}
          </select>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            aria-label="Model"
          >
            <option value="">Models</option>
            {inds.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            aria-label="Fit tier"
          >
            <option value="">Fit</option>
            <option value="high">High fit</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={play}
            onChange={(e) => setPlay(e.target.value)}
            aria-label="Play type"
          >
            <option value="">Plays</option>
            <option value="displacement">Displacement</option>
            <option value="greenfield">Greenfield</option>
          </select>
          <select
            value={stageF}
            onChange={(e) => setStageF(e.target.value)}
            aria-label="Stage"
          >
            <option value="">Stages</option>
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className={styles.laneWrap}>
        <div className={styles.laneMain}>
          <table className={styles.table}>
            <thead>
              <tr>
                {(
                  [
                    ["name", "Account"],
                    ["score", "Global fit"],
                    ["demand", "Demand"],
                    ["touch", "Last human touch"],
                    ["signal", "The signal"],
                    ["act", "Act"],
                  ] as [ColKey, string][]
                ).map(([key, label]) => (
                  <th
                    key={key}
                    aria-sort={
                      colSort?.key === key
                        ? colSort.dir === 1
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      className={styles.thSort}
                      onClick={() => clickSort(key)}
                      title={`Sort by ${label.toLowerCase()}`}
                    >
                      {label}
                      {colSort?.key === key && (
                        <span className={styles.thArrow}>
                          {colSort.dir === 1 ? "▲" : "▼"}
                        </span>
                      )}
                    </button>
                    {key === "name" && (
                      <span className={styles.thCount}>
                        {filtered.length} of {rows.length}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
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
                            className={[
                              styles.dispoBadge,
                              a.disposition.status === "won" ? styles.dispoWon : "",
                              a.disposition.status === "lost" ? styles.dispoLost : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            title={a.disposition.reason || undefined}
                          >
                            {a.disposition.status === "motion"
                              ? "⚡ in motion"
                              : a.disposition.status === "parked"
                                ? "⏸ parked"
                                : a.disposition.status === "won"
                                  ? "✓ closed won"
                                  : a.disposition.status === "lost"
                                    ? "✕ closed lost"
                                    : "⌁ engaged"}
                          </span>
                        )}{" "}
                        {a.risk && (
                          <span
                            className={styles.riskChip}
                            title="Salesforce marks this account's risk level. Handle with care."
                          >
                            ⚠ {a.risk} RISK
                          </span>
                        )}{" "}
                        <ValBadge v={a.validation} />
                      </td>
                      <td>
                        <span className={`${styles.fit} ${fitClass[a.tier]}`}>
                          {a.score}
                        </span>
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
                        {a.second?.touch ? (
                          <span
                            className={styles.srTouch}
                            title={`The second record's last human row — ${a.second.touch.kind === "account" ? "their side wrote" : "a colleague's motion"}`}
                          >
                            <span
                              className={
                                a.second.touch.kind === "account"
                                  ? styles.srTouchAcct
                                  : undefined
                              }
                            >
                              {shortWho(a.second.touch.who)}
                            </span>{" "}
                            · {mmddOf(a.second.touch.day)}
                          </span>
                        ) : (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>
                      <td>
                        {a.second && a.second.gems.length > 0 ? (
                          <button
                            type="button"
                            className={styles.srTerm}
                            onClick={() => setSrOpenId(srOpenId === a.id ? "" : a.id)}
                            aria-expanded={srOpenId === a.id}
                            title="A verified gem — opens the card, citations, and the email meat"
                          >
                            {a.second.gems[0].term}
                            {a.second.gems.length > 1 && (
                              <span className={styles.srMore}>
                                {" "}
                                +{a.second.gems.length - 1}
                              </span>
                            )}
                          </button>
                        ) : a.second && a.second.supportTotal >= 8 ? (
                          <button
                            type="button"
                            className={`${styles.srTerm} ${styles.srTermSupport}`}
                            onClick={() => setSrOpenId(srOpenId === a.id ? "" : a.id)}
                            aria-expanded={srOpenId === a.id}
                            title="Heavy support traffic — opens the case list and the meat"
                          >
                            ▮ {a.second.supportTotal} CASES
                          </button>
                        ) : a.second?.verdict ? (
                          <span className={styles.srVerdict} title={a.second.verdict}>
                            {a.second.verdict}
                          </span>
                        ) : (
                          <span className={styles.muted}>—</span>
                        )}
                      </td>
                      <td className={styles.srActCell}>
                        {a.second?.act && a.second.gems.length > 0 ? (
                          <span className={styles.mchipWrap}>
                            <button
                              type="button"
                              className={styles.mchip}
                              onClick={() => setLaneId(laneId === a.id ? "" : a.id)}
                              aria-expanded={laneId === a.id}
                              title="Work the act on the lane — the draft, the evidence, the fork"
                            >
                              {a.second.act}
                              <span className={styles.mchipSrc}>
                                ◆ {a.second.gems[0].term} ·{" "}
                                {mmddOf(a.second.gems[0].whenDay)}
                              </span>
                            </button>
                            {canWrite && (
                              <button
                                type="button"
                                className={styles.mtick}
                                title="Mark acted — files the stamp, clears the nag"
                                onClick={() => tickActed(a.id, a.second!.gems[0].term)}
                              >
                                ✓
                              </button>
                            )}
                          </span>
                        ) : a.actedDay ? (
                          <span className={styles.actedStamp}>
                            <b>✓ ACTED</b> · {mmddOf(a.actedDay)}
                            {canWrite && a.actedTerm && (
                              <>
                                {" · "}
                                <button
                                  type="button"
                                  className={styles.actedTb}
                                  title="Take it back — the chip returns"
                                  onClick={() => tickUnacted(a.id, a.actedTerm)}
                                >
                                  ↺
                                </button>
                              </>
                            )}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                    {srOpenId === a.id && a.second && (
                      <tr>
                        <td colSpan={6} className={styles.srFoldTd}>
                          <SecondRecordPanel accountId={a.id} second={a.second} />
                        </td>
                      </tr>
                    )}
                    {openId === a.id && (
                      <tr>
                        <td colSpan={6}>
                          <div className={styles.acctDetail}>
                            <SfCheckpoint when="account" id={a.id} name={a.name} />
                            <p className={styles.acctMetaLine}>
                              MODEL · {a.industry || "—"} · PRISMHR ·{" "}
                              {a.incumbent ? a.cloud : "not a platform customer"}
                              {a.city
                                ? ` · ${a.city.toUpperCase()}${a.state ? `, ${a.state.toUpperCase()}` : ""}`
                                : ""}
                              {a.csm ? ` · CSM ${a.csm.toUpperCase()}` : ""}
                              {a.play === "greenfield" ? " · PLAY · GREENFIELD" : ""}
                              {a.play === "displacement"
                                ? ` · PLAY · DISPLACE${a.competitors.length ? ` (${a.competitors.join(" / ").toUpperCase()})` : ""}`
                                : ""}
                            </p>
                            {canAdd &&
                              (onDash.has(a.name) ? (
                                <p className={styles.acctMetaLine}>
                                  ON THE DASHBOARD · CLEARED WITH THE CSM
                                </p>
                              ) : (
                                <form action={addCard} className={styles.dashRow}>
                                  <input type="hidden" name="name" value={a.name} />
                                  <input
                                    type="hidden"
                                    name="subtitle"
                                    value={`${a.csm}${a.industry ? ` · ${a.industry}` : ""}`}
                                  />
                                  <input
                                    type="hidden"
                                    name="seedDiscovery"
                                    value={seedFor(a)}
                                  />
                                  <input
                                    type="hidden"
                                    name="returnTo"
                                    value="/accounts"
                                  />
                                  <button className={styles.addMini} type="submit">
                                    Put it on the dashboard
                                  </button>
                                </form>
                              ))}
                            {/* The people lead (founder-decreed 2026-08-20): the
                            double-click is looking for contacts first. */}
                            <ContactsPanel
                              accountId={a.id}
                              accountName={a.name}
                              count={a.contactCount}
                            />
                            {/* The research leads (founder-decreed 2026-08-14): the drilldown opens with what the research knows; the working furniture follows, folded. */}
                            <Fold
                              label="Research read"
                              hint="what the research knows about this account"
                              defaultOpen
                            >
                              <div className={styles.demandBlock}>
                                {a.researched ? (
                                  <>
                                    <div className={styles.demandHead}>
                                      {a.demand != null && (
                                        <span
                                          className={`${styles.fit} ${demandClass(a.demand)}`}
                                        >
                                          {a.demand}
                                        </span>
                                      )}
                                      <strong>Global-hiring demand</strong>
                                      <span className={styles.confChip}>
                                        {a.demand != null
                                          ? `${a.confidence} confidence`
                                          : "live pass, unscored"}
                                      </span>
                                    </div>
                                    {a.play === "displacement" &&
                                      a.competitors.length > 0 && (
                                        <p className={styles.servedBy}>
                                          Displacement play. Currently served by{" "}
                                          <strong>
                                            <CompetitorLinks names={a.competitors} />
                                          </strong>
                                          . Pitch: bring it in-house on the platform they
                                          already run.
                                        </p>
                                      )}
                                    {a.play === "greenfield" && (
                                      <p className={styles.servedBy}>
                                        Greenfield. Real demand, no incumbent EOR named in
                                        the research.
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
                                    {a.demand != null && (
                                      <div className={styles.formula}>
                                        How this {a.score} is built: 40% account profile
                                        at {a.deskScore}, 60% global demand at{" "}
                                        {a.demandAdj ?? a.demand}.
                                        {a.confFactor < 1
                                          ? ` Raw demand ${a.demand} trimmed to ${a.demandAdj} because confidence is ${a.confidence}.`
                                          : ""}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className={styles.demandPending}>
                                    Not researched: no findable web presence, or missed on
                                    the run. Score is the account profile only. No demand
                                    signal yet.
                                  </div>
                                )}
                              </div>
                            </Fold>
                            <AccountChipNotes notes={a.chipNotes} />
                            <AccountNotes notes={a.notes} />
                            <PeopleIndex people={a.people} />
                            <BackgroundIntel notes={a.bgNotes} />
                            <EngagementPanel a={a} />
                            <Fold label="Working the deal" hint="stage, approach, plays">
                              <WorkingDeal a={a} canWrite={canWrite} />
                            </Fold>

                            <Fold
                              label="Account profile"
                              hint="firmographics and the score's parts"
                            >
                              <div className={styles.bars}>
                                <div className={styles.barsHead}>
                                  Account profile · {a.deskScore}/100, firmographics only,
                                  no research
                                </div>
                                {(
                                  ["scale", "incumbency", "model", "recency"] as const
                                ).map((k) => (
                                  <div key={k} className={styles.barRow}>
                                    <span className={styles.barLabel}>
                                      {BAR_LABEL[k]}
                                    </span>
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
                                ))}
                              </div>

                              <div className={styles.acctMeta}>
                                {a.sizeBucket ||
                                  (a.size
                                    ? `${a.size.toLocaleString()} WSE`
                                    : "size unknown")}
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
                            </Fold>

                            {canAdd && (
                              <ValidateControls id={a.id} current={a.validation} />
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {laneAct && (
          <ActLane
            key={laneAct.accountId}
            act={laneAct}
            canWrite={canWrite}
            onClose={() => setLaneId("")}
          />
        )}
      </div>
    </>
  );
}

// The draft desk (founder-decreed 2026-08-20): step one drafts here with the
// brain against the account's record; step two opens Outlook with the
// addresses and the text already on it. Other people from the account ride
// as one-click cc chips.
function DraftDialog({
  accountId,
  accountName,
  contact,
  others,
  onClose,
}: {
  accountId: string;
  accountName: string;
  contact: ContactRow;
  others: ContactRow[];
  onClose: () => void;
}) {
  const [cc, setCc] = useState<string[]>([]);
  const [ask, setAsk] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const name = `${contact.first} ${contact.last}`.trim();

  // The template shelf (founder-decreed 2026-08-20): named drafts, reused
  // from a dropdown; {{first}} {{last}} {{name}} {{account}} fill on apply.
  // The draft desk's one line (5.2): a per-person read of both records —
  // exact words, cited or silent. Fetched once when the desk opens.
  const [deskLine, setDeskLine] = useState<{
    line: string;
    cite: { k: string; day: string; who: string; subject: string } | null;
  } | null>(null);
  const [deskExcerpt, setDeskExcerpt] = useState<string | null>(null);
  useEffect(() => {
    const q = contact.email || name;
    if (!q) return;
    void fetch(
      `/activity/evidence?acct=${encodeURIComponent(accountId)}&who=${encodeURIComponent(q)}`,
      { cache: "no-store" },
    )
      .then((r) => r.json())
      .then(
        (j: {
          ok: boolean;
          line?: string;
          cite?: typeof deskLine extends null
            ? never
            : NonNullable<typeof deskLine>["cite"];
        }) => {
          if (j.ok && j.line) setDeskLine({ line: j.line, cite: j.cite ?? null });
        },
      )
      .catch(() => null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, contact.email]);

  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [tplSel, setTplSel] = useState("");
  const [tplSaving, setTplSaving] = useState(false);
  const [tplName, setTplName] = useState("");
  useEffect(() => {
    void listMailTemplates().then(setTemplates);
  }, []);
  const fill = (s: string) =>
    s
      .replaceAll("{{first}}", contact.first || name || "there")
      .replaceAll("{{last}}", contact.last || "")
      .replaceAll("{{name}}", name || contact.email)
      .replaceAll("{{account}}", accountName);
  const applyTemplate = (id: string) => {
    setTplSel(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSubject(fill(t.subject));
    setBody(fill(t.body));
    setNote("");
  };
  const saveTemplate = async () => {
    if (!tplName.trim() || !body.trim()) return;
    const r = await saveMailTemplate(tplName, subject, body);
    if (r.ok) {
      setTemplates(await listMailTemplates());
      setTplSaving(false);
      setTplName("");
      setNote("Template saved.");
    } else setNote(r.reason ?? "The template didn't save.");
  };
  const dropTemplate = async () => {
    if (!tplSel) return;
    await deleteMailTemplate(tplSel);
    setTplSel("");
    setTemplates(await listMailTemplates());
  };

  const run = async () => {
    if (busy || (!ask.trim() && !body.trim())) return;
    setBusy(true);
    setNote("");
    const toNames = [
      name,
      ...others.filter((o) => cc.includes(o.email)).map((o) => `${o.first} ${o.last}`),
    ];
    const r = await draftOutreach(accountId, toNames, ask, body);
    setBusy(false);
    if (r.ok) {
      setBody(r.body ?? "");
      if (r.subject) setSubject(r.subject);
    } else setNote(r.reason ?? "The draft didn't come back.");
  };

  const mailto = `mailto:${encodeURIComponent(contact.email)}${
    cc.length ? `?cc=${encodeURIComponent(cc.join(","))}&` : "?"
  }subject=${encodeURIComponent(subject || `${accountName} — PrismHR Global`)}&body=${encodeURIComponent(
    body.slice(0, 1800),
  )}`;

  return (
    <div className={styles.draftBack} onClick={onClose}>
      <div className={styles.draftBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.draftHead}>
          <b>
            Draft to {name || contact.email} · {accountName}
          </b>
          <button type="button" className={styles.draftX} onClick={onClose}>
            ✕
          </button>
        </div>
        {deskLine && (
          <div className={styles.deskLine}>
            {deskLine.line}
            {(() => {
              const cite = deskLine.cite;
              if (!cite) return null;
              return (
                <button
                  type="button"
                  className={styles.deskLineRead}
                  onClick={async () => {
                    if (deskExcerpt !== null) {
                      setDeskExcerpt(null);
                      return;
                    }
                    try {
                      const r = await fetch(
                        `/activity/evidence?acct=${encodeURIComponent(accountId)}&k=${encodeURIComponent(cite.k)}`,
                        { cache: "no-store" },
                      );
                      const j = (await r.json()) as {
                        ok: boolean;
                        row?: { excerpt: string };
                      };
                      setDeskExcerpt(
                        j.ok
                          ? j.row?.excerpt || "The subject is the whole entry."
                          : "The row isn't in the staged slice.",
                      );
                    } catch {
                      setDeskExcerpt("The evidence store didn't answer.");
                    }
                  }}
                >
                  {deskExcerpt !== null ? "▾" : "▸ read it"}
                </button>
              );
            })()}
            {deskExcerpt !== null && (
              <div className={styles.srExcerpt}>{deskExcerpt}</div>
            )}
          </div>
        )}
        <div className={styles.draftTpl}>
          <select
            className={styles.draftTplSel}
            value={tplSel}
            onChange={(e) => applyTemplate(e.target.value)}
            aria-label="Apply a saved template"
          >
            <option value="">Templates…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {tplSel && (
            <button
              type="button"
              className={styles.draftChip}
              title="Delete this template"
              onClick={() => void dropTemplate()}
            >
              delete ✕
            </button>
          )}
          {!tplSaving ? (
            <button
              type="button"
              className={styles.draftChip}
              disabled={!body.trim()}
              title="Save the current subject and body as a named template. {{first}} {{last}} {{name}} {{account}} fill in when applied."
              onClick={() => setTplSaving(true)}
            >
              Save as template
            </button>
          ) : (
            <>
              <input
                className={styles.draftTplName}
                placeholder="Template name"
                value={tplName}
                autoFocus
                onChange={(e) => setTplName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveTemplate();
                  if (e.key === "Escape") setTplSaving(false);
                }}
              />
              <button
                type="button"
                className={styles.draftChipOn}
                onClick={() => void saveTemplate()}
              >
                Save
              </button>
              <button
                type="button"
                className={styles.draftChip}
                onClick={() => setTplSaving(false)}
              >
                ✕
              </button>
            </>
          )}
          <span className={styles.draftTplHint}>
            {"{{first}} {{account}} fill in when a template is applied"}
          </span>
        </div>
        {others.length > 0 && (
          <div className={styles.draftCc}>
            <span className={styles.draftLbl}>Also send to:</span>
            {others.slice(0, 8).map((o) => (
              <button
                key={o.email}
                type="button"
                className={cc.includes(o.email) ? styles.draftChipOn : styles.draftChip}
                onClick={() =>
                  setCc((xs) =>
                    xs.includes(o.email)
                      ? xs.filter((x) => x !== o.email)
                      : [...xs, o.email],
                  )
                }
              >
                {o.first} {o.last ? `${o.last[0]}.` : ""}
              </button>
            ))}
          </div>
        )}
        <input
          className={styles.draftAsk}
          placeholder={
            body
              ? "What should change? Enter sharpens it."
              : "What should this email do? Enter drafts it."
          }
          value={ask}
          onChange={(e) => setAsk(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void run();
          }}
        />
        <input
          className={styles.draftSubject}
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <textarea
          className={styles.draftBody}
          placeholder="The draft lands here. Edit it directly, or ask for changes above."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
        />
        {note && <p className={styles.draftNote}>{note}</p>}
        <div className={styles.draftActs}>
          <button
            type="button"
            className={styles.draftGo}
            disabled={busy}
            onClick={() => void run()}
          >
            {busy ? "Writing…" : body ? "Sharpen it" : "Draft it"}
          </button>
          <a
            className={body ? styles.draftOutlook : styles.draftOutlookOff}
            href={body ? mailto : undefined}
            onClick={(e) => {
              if (!body) e.preventDefault();
            }}
          >
            Open in Outlook →
          </a>
          {body && (
            <button
              type="button"
              className={styles.draftCopy}
              onClick={() => void navigator.clipboard?.writeText(body)}
            >
              Copy the text
            </button>
          )}
        </div>
        <p className={styles.draftFoot}>
          Outlook opens with the addresses and the draft on it. When it&rsquo;s sent, drop
          the .eml in the Chute — that files the touch.
        </p>
      </div>
    </div>
  );
}

// The account's full contact roster — the SF export PLUS the record's own
// discoveries — leading the drilldown, open on arrival (founder-decreed
// 2026-08-20): the double-click is looking for the people.
function ContactsPanel({
  accountId,
  accountName,
  count,
}: {
  accountId: string;
  accountName: string;
  count: number;
}) {
  const [open, setOpen] = useState(true);
  const [list, setList] = useState<ContactRow[] | null>(null);
  const [q, setQ] = useState("");
  const [drafting, setDrafting] = useState<ContactRow | null>(null);
  useEffect(() => {
    if (list === null) void getContacts(accountId).then(setList);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (count === 0 && (list?.length ?? 0) === 0) return null;

  const openUp = () => setOpen((v) => !v);

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
      <button
        type="button"
        className={`${styles.ctcToggle} ${styles.ctcLead}`}
        onClick={openUp}
      >
        {open ? "▾" : "▸"} Contacts ({list ? list.length : count})
        {list?.some((c) => c.fromRecord) && (
          <span className={styles.ctcFromRec}>
            {list.filter((c) => c.fromRecord).length} from the record
          </span>
        )}
      </button>
      {drafting && (
        <DraftDialog
          accountId={accountId}
          accountName={accountName}
          contact={drafting}
          others={(list ?? []).filter((c) => c.email && c.email !== drafting.email)}
          onClose={() => setDrafting(null)}
        />
      )}
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
                  {c.fromRecord && (
                    <span
                      className={styles.ctcFromRec}
                      title={`Discovered in the account's own record${c.firstSeen ? ` · first seen ${c.firstSeen.slice(0, 10)}` : ""} — not in the SF export yet.`}
                    >
                      from the record
                    </span>
                  )}
                  {c.email && (
                    <button
                      type="button"
                      className={styles.ctcDraft}
                      title="Draft an email to them — the brain helps write it, Outlook sends it."
                      onClick={() => setDrafting(c)}
                    >
                      ✎ Draft
                    </button>
                  )}
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
