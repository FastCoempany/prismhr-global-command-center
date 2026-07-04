import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { loadDashboard } from "@/lib/dashboard/data";
import { loadFieldNotes, FIELD_NOTE_KINDS } from "@/lib/field-notes/data";
import { loadSnoozes, loadValidations } from "@/lib/today/overlay";
import { researchGeneratedAt } from "@/lib/book/research";
import {
  accountIntel,
  applyValidations,
  commitmentsFromCards,
  COMMITMENT_WINDOW_DAYS,
  isStrongSignal,
  isTrusted,
  movedThisWeek,
  narrative,
  partitionSignals,
  partnerAngle,
  signals,
  stateOfPlay,
  type AccountIntel,
  type Validation,
} from "@/lib/today/build";
import { CopyLine, NoteSubmit } from "../today-client";
import { addCard, toggleCheck } from "../dashboard/actions";
import { addFieldNote, resolveFieldNote, snoozeSignal, unsnoozeSignal } from "./actions";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";

function PlayTag({ play }: { play: AccountIntel["play"] }) {
  if (!play) return null;
  const cls = play === "displacement" ? styles.tagDisplace : styles.tagGreen;
  return <span className={`${styles.tag} ${cls}`}>{play}</span>;
}

function FunnelChip({ funnel }: { funnel: AccountIntel["funnel"] }) {
  return (
    <span className={`${styles.funnelChip} ${funnel === "hcm" ? styles.funnelHcm : ""}`}>
      {funnel === "hcm" ? "HCM funnel" : "PEO channel"}
    </span>
  );
}

function ValidationBadge({ v }: { v?: Validation }) {
  if (!v) return null;
  if (v.status === "confirmed") return <span className={styles.valConfirmed}>✓ confirmed</span>;
  if (v.status === "flagged") return <span className={styles.valFlagged}>⚠ flagged</span>;
  return <span className={styles.valAdjusted}>adjusted → {v.adjustedDemand}</span>;
}

function fitClass(tier: "high" | "medium" | "low") {
  return tier === "high" ? styles.fitHigh : tier === "medium" ? styles.fitMedium : styles.fitLow;
}

function ageBadge(ageDays: number | null) {
  if (ageDays == null) return null;
  const label = ageDays === 0 ? "today" : `${ageDays}d open`;
  const hot = ageDays >= COMMITMENT_WINDOW_DAYS;
  return <span className={`${styles.ageBadge} ${hot ? styles.ageHot : ""}`}>{label}</span>;
}

// One-time seed dropped into a new card's Discovery note on "Seed to board".
function seedFor(a: AccountIntel): string {
  if (!a.researched || a.demand == null) return "";
  const play =
    a.play === "displacement"
      ? `Displacement — currently on ${a.competitors.join(", ") || "a competitor EOR"}.`
      : a.play === "greenfield"
        ? "Greenfield — no incumbent EOR named."
        : "";
  const countries = a.countries.length ? ` Countries: ${a.countries.join(", ")}.` : "";
  return `Demand ${a.demand}/100 (${a.confidence} confidence). ${play}${countries} ${a.summary}`.trim();
}

// "Seed to board" / "Act" — reuses the Dashboard addCard action, returning here.
function SeedForm({ a, onBoard, label }: { a: AccountIntel; onBoard: boolean; label: string }) {
  if (onBoard) return <span className={styles.onDash}>On board ✓</span>;
  return (
    <form action={addCard}>
      <input type="hidden" name="name" value={a.name} />
      <input type="hidden" name="subtitle" value={`${a.csm}${a.industry ? ` · ${a.industry}` : ""}`} />
      <input type="hidden" name="seedDiscovery" value={seedFor(a)} />
      <input type="hidden" name="returnTo" value="/today" />
      <button className={styles.actBtn}>{label}</button>
    </form>
  );
}

// "Park ▾" — a disclosure with the snooze form (reason + optional resurface).
function ParkControl({ id }: { id: string }) {
  return (
    <details className={styles.park}>
      <summary className={styles.parkSummary}>Park ▾</summary>
      <form action={snoozeSignal} className={styles.parkForm}>
        <input type="hidden" name="accountId" value={id} />
        <input name="reason" required maxLength={300} placeholder="Why park it?" aria-label="Reason" />
        <select name="days" defaultValue="0" aria-label="Resurface">
          <option value="0">until I un-park</option>
          <option value="3">in 3 days</option>
          <option value="7">in 7 days</option>
          <option value="14">in 14 days</option>
        </select>
        <button className={styles.parkBtn}>Park</button>
      </form>
    </details>
  );
}

export default async function TodayPage() {
  const dash = await loadDashboard();

  if (dash.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Today" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const [snoozes, validations, notes] = await Promise.all([
    loadSnoozes(),
    loadValidations(),
    loadFieldNotes(),
  ]);

  const intel = applyValidations(accountIntel(), validations);
  const nar = narrative(intel);
  const commitments = commitmentsFromCards(dash.cards, dash.labels);
  const onBoard = new Set(dash.cards.map((c) => c.name));

  // Signals, split into active vs parked ("Not now"). Request-time "now" is
  // resolved inside the pure helpers so the component stays free of impure calls.
  const { active: activeSignals, parked } = partitionSignals(signals(intel), snoozes);
  const hcm = intel.filter((a) => a.funnel === "hcm").slice(0, 6);

  // The move: top trusted, non-parked play not yet on the board. Parked ids come
  // straight from the partition (every play candidate clears the demand gate, so
  // it's also a signal).
  const parkedIds = new Set(parked.map((p) => p.intel.id));
  const candidates = intel.filter(
    (a) => a.play && isTrusted(a) && !parkedIds.has(a.id) && !onBoard.has(a.name),
  );
  const move = candidates[0] ?? null;
  const onDeck = candidates.slice(1, 5);

  const sop = stateOfPlay({ cards: dash.cards, commitments, activeSignals, onBoard });

  // "Start here" — the single most time-sensitive thing, with its reason.
  let start: { text: string; why: string } | null = null;
  const hotCommitment = commitments.find((d) => d.ageDays != null && d.ageDays >= COMMITMENT_WINDOW_DAYS);
  const firstUntriaged = activeSignals.find((a) => !onBoard.has(a.name));
  if (hotCommitment) {
    start = {
      text: `Close the aging commitment on ${hotCommitment.cardName} — ${hotCommitment.item}`,
      why: `it's ${hotCommitment.ageDays}d past its 5-day window`,
    };
  } else if (firstUntriaged) {
    start = {
      text: `Triage ${firstUntriaged.name}`,
      why: `a ${firstUntriaged.demand}-demand signal not yet on the board`,
    };
  } else if (move) {
    start = { text: `Make the move on ${move.name}`, why: `top Global-fit with a real play` };
  }

  return (
    <>
      <AppWayfinder current="Today" />
      <main className={styles.wrap}>
        <h1 className={styles.h1}>Today</h1>
        <p className={styles.sub}>
          The daily command surface. Cold calling isn&apos;t the motion — this is a channel sell
          through partners into the base you already serve. Two lead streams route here: the{" "}
          <b>PEO channel</b> (CSM-owned) and the <b>HCM funnel</b> (Eric&apos;s HCM logos + HRaaS +
          clients on our PrismHR HCM). Read → route → record.
        </p>

        {/* ── State of play ──────────────────────────────────────────────── */}
        <div className={styles.sop}>
          <div className={styles.sopStats}>
            <span>
              <b>{sop.openLoops}</b> loops open
            </span>
            <span className={sop.commitmentsPastWindow > 0 ? styles.sopHot : ""}>
              <b>{sop.commitmentsPastWindow}</b> past window
            </span>
            <span>
              <b>{sop.untriaged}</b> to triage
            </span>
            <span>
              <b>{sop.moved}</b> moved this week
            </span>
          </div>
          {start ? (
            <p className={styles.sopStart}>
              <span className={styles.sopStartLabel}>Start here:</span> {start.text}{" "}
              <span className={styles.sopWhy}>— {start.why}</span>
            </p>
          ) : (
            <p className={styles.sopStart}>
              <span className={styles.sopStartLabel}>Clear.</span> Nothing pressing — seed a new
              signal or advance a loop.
            </p>
          )}
        </div>

        {/* ── Band 1 · Signal in ─────────────────────────────────────────── */}
        <section className={styles.band}>
          <div className={styles.bandHead}>
            <span className={styles.bandNum}>1</span>
            <div>
              <h2 className={styles.bandTitle}>Signal in</h2>
              <p className={styles.bandSub}>
                What the base is telling you — real global-hiring demand. Seed one to the board, copy
                the partner line, or park it with a reason. Snapshot as of {researchGeneratedAt}.
              </p>
            </div>
          </div>
          <div className={styles.bandBody}>
            {activeSignals.length === 0 && (
              <p className={styles.muted}>
                No active signal. {parked.length > 0 ? "Some are parked below. " : ""}Demand is thin
                across the base — run deeper research from the Account Room.
              </p>
            )}
            {activeSignals.map((a) => (
              <div
                key={a.id}
                className={`${styles.signalRow} ${a.validation?.status === "flagged" ? styles.signalFlagged : ""}`}
              >
                <div className={styles.signalTop}>
                  <Link href={`/accounts?focus=${a.id}`}>{a.name}</Link>
                  <span className={`${styles.fit} ${fitClass(a.tier)}`}>{a.demand}</span>
                  {!isStrongSignal(a) && <span className={styles.emergingTag}>emerging</span>}
                  <PlayTag play={a.play} />
                  <FunnelChip funnel={a.funnel} />
                  <ValidationBadge v={a.validation} />
                  <span className={styles.signalCsm}>
                    {a.confidence} conf · {a.csm}
                  </span>
                </div>
                {a.summary && <p className={styles.signalSummary}>{a.summary}</p>}
                {a.countries.length > 0 && (
                  <div className={styles.countries}>
                    {a.countries.map((c) => (
                      <span key={c} className={styles.countryChip}>
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                <div className={styles.actRow}>
                  <SeedForm a={a} onBoard={onBoard.has(a.name)} label="Seed to board" />
                  <CopyLine text={partnerAngle(a)} label="Copy the line" />
                  <ParkControl id={a.id} />
                </div>
              </div>
            ))}

            {hcm.length > 0 && (
              <div className={styles.hcmStrip}>
                <span className={styles.hcmLabel}>HCM funnel — routes to you directly:</span>
                {hcm.map((a) => (
                  <Link key={a.id} href={`/accounts?focus=${a.id}`} className={styles.hcmChip}>
                    {a.name} <b>{a.score}</b> · {a.csm}
                  </Link>
                ))}
              </div>
            )}
            <Link href="/look-into" className={styles.hcmWarn}>
              ⚠ This HCM funnel is incomplete — the roster of PEO clients running on PrismHR HCM
              isn&apos;t loaded yet, so it looks smaller than it is. Look into →
            </Link>

            {parked.length > 0 && (
              <details className={styles.parkedList}>
                <summary>Parked ({parked.length})</summary>
                {parked.map(({ intel: a, snooze }) => (
                  <div key={a.id} className={styles.parkedRow}>
                    <Link href={`/accounts?focus=${a.id}`}>{a.name}</Link>
                    <span className={styles.parkedReason}>
                      “{snooze.reason}”
                      {snooze.snoozedUntil
                        ? ` · back ${snooze.snoozedUntil.slice(0, 10)}`
                        : " · until un-parked"}
                    </span>
                    <form action={unsnoozeSignal} className={styles.noteResolve}>
                      <input type="hidden" name="accountId" value={a.id} />
                      <button className={styles.noteResolveBtn}>Un-park</button>
                    </form>
                  </div>
                ))}
              </details>
            )}
          </div>
        </section>

        {/* ── Band 2 · Commitments ───────────────────────────────────────── */}
        <section className={styles.band}>
          <div className={styles.bandHead}>
            <span className={styles.bandNum}>2</span>
            <div>
              <h2 className={styles.bandTitle}>Commitments ({commitments.length})</h2>
              <p className={styles.bandSub}>
                What you&apos;ve committed to before an account can move — the recap, the availability
                request, the partner brief. Check one off here and it closes on the Dashboard node.
                Oldest first.
              </p>
            </div>
          </div>
          <div className={styles.bandBody}>
            {dash.status === "database-unavailable" && (
              <p className={styles.muted}>
                The execution ledger isn&apos;t connected — run <code>docs/dashboard-tables.sql</code>{" "}
                in Supabase and start moving nodes on the <Link href="/">Dashboard</Link>.
              </p>
            )}
            {dash.status === "active" && commitments.length === 0 && (
              <p className={styles.muted}>
                Nothing open on any in-flight node. Either you&apos;re clean, or nothing has been
                started — advance a node on the <Link href="/">Dashboard</Link>.
              </p>
            )}
            {commitments.slice(0, 12).map((d) => (
              <div key={`${d.cardId}-${d.nodeKey}-${d.index}`} className={styles.commitment}>
                <div className={styles.commitmentTop}>
                  <span className={styles.commitmentName}>{d.cardName}</span>
                  <span className={styles.commitmentNode}>{d.nodeLabel}</span>
                  {ageBadge(d.ageDays)}
                  <form action={toggleCheck} className={styles.commitmentClose}>
                    <input type="hidden" name="cardId" value={d.cardId} />
                    <input type="hidden" name="node" value={d.nodeKey} />
                    <input type="hidden" name="index" value={d.index} />
                    <input type="hidden" name="returnTo" value="/today" />
                    <button className={styles.closeBtn}>Close ✓</button>
                  </form>
                </div>
                <div className={styles.commitmentItem}>{d.item}</div>
                {d.note && <div className={styles.commitmentNote}>“{d.note}”</div>}
              </div>
            ))}
            {commitments.length > 12 && (
              <p className={styles.muted}>
                + {commitments.length - 12} more on the <Link href="/">Dashboard</Link>.
              </p>
            )}
          </div>
        </section>

        {/* ── Band 3 · Highest-leverage move ─────────────────────────────── */}
        <section className={styles.band}>
          <div className={styles.bandHead}>
            <span className={styles.bandNum}>3</span>
            <div>
              <h2 className={styles.bandTitle}>Highest-leverage move</h2>
              <p className={styles.bandSub}>
                The one account to touch now — top Global-fit with a real play, not on the board, not
                parked, not flagged. Lead with the partner. Not this one? Act on an on-deck
                alternative or park it.
              </p>
            </div>
          </div>
          <div className={styles.bandBody}>
            {!move && (
              <p className={styles.muted}>
                No account carries a qualified play right now. Deepen research or seed a partner from
                the <Link href="/accounts">Account Room</Link>.
              </p>
            )}
            {move && (
              <div className={styles.moveHero}>
                <div className={styles.moveTop}>
                  <Link href={`/accounts?focus=${move.id}`} className={styles.moveName}>
                    {move.name}
                  </Link>
                  <span className={`${styles.fit} ${fitClass(move.tier)}`}>{move.score}</span>
                  <PlayTag play={move.play} />
                  <FunnelChip funnel={move.funnel} />
                  <ValidationBadge v={move.validation} />
                  {move.competitors.length > 0 && (
                    <span className={styles.signalCsm}>vs {move.competitors.join(", ")}</span>
                  )}
                </div>
                {move.summary && <p className={styles.signalSummary}>{move.summary}</p>}
                <div className={styles.moveAsk}>
                  <strong>The line for {move.csm}:</strong> {partnerAngle(move)}
                </div>
                <div className={styles.actRow}>
                  <SeedForm a={move} onBoard={onBoard.has(move.name)} label="Act — seed & open" />
                  <CopyLine text={partnerAngle(move)} label="Copy the line" />
                  <ParkControl id={move.id} />
                </div>
              </div>
            )}
            {onDeck.length > 0 && (
              <div className={styles.onDeck}>
                <span className={styles.onDeckLabel}>On deck:</span>
                {onDeck.map((a) => (
                  <Link key={a.id} href={`/accounts?focus=${a.id}`} className={styles.onDeckChip}>
                    {a.name} <b>{a.score}</b>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Band 4 · Narrative forming ─────────────────────────────────── */}
        <section className={styles.band}>
          <div className={styles.bandHead}>
            <span className={styles.bandNum}>4</span>
            <div>
              <h2 className={styles.bandTitle}>Narrative forming</h2>
              <p className={styles.bandSub}>
                Voice of the base — the honest pattern in the data, and the line it&apos;s accruing
                toward your 1:1 with Aleks.
              </p>
            </div>
          </div>
          <div className={styles.bandBody}>
            <div className={styles.statRow}>
              <Stat n={`${nar.researched}/${nar.total}`} label="accounts researched" />
              <Stat n={nar.strongDemand} label="strong demand" />
              <Stat n={nar.emerging} label="emerging / hedged" />
              <Stat n={`${nar.displacement}/${nar.greenfield}`} label="displace / greenfield" />
              <Stat n={movedThisWeek(dash.cards)} label="moved this week" />
            </div>

            {nar.topCountries.length > 0 && (
              <div className={styles.narLine}>
                <span className={styles.narLabel}>Where the base points:</span>
                <div className={styles.countries}>
                  {nar.topCountries.map((c) => (
                    <span key={c.name} className={styles.countryChip}>
                      {c.name} <b>{c.count}</b>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={styles.narGrid}>
              <div className={styles.narCard}>
                <h4>The line up to Aleks</h4>
                <p>
                  “Demand across the base is thin but real — <b>{nar.strongDemand}</b> accounts carry
                  a solid global-hiring signal
                  {nar.emerging > 0 ? (
                    <>
                      , plus <b>{nar.emerging}</b> emerging (lower demand or confidence — worth a
                      partner conversation, not a forecast)
                    </>
                  ) : null}
                  . Split <b>{nar.displacement} displacement / {nar.greenfield} greenfield</b>. The
                  motion isn&apos;t volume, it&apos;s precision through partners — here&apos;s the one
                  I&apos;m converting this week.”
                </p>
              </div>
              <div className={styles.narCard}>
                <h4>Arm the partners</h4>
                <p>
                  At startup stage, the job is to make Eric and the CSMs dangerous on Global. Be
                  loud to Aleks and marketing on what we have, what we don&apos;t, and what we need —
                  capture it below so it&apos;s ready for the 1:1, not remembered on the spot.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Voice of the base & enablement gaps (capture) ──────────────── */}
        <h2 className={styles.h2}>Voice of the base &amp; enablement gaps</h2>
        <p className={styles.sub}>
          The running list you carry into the Aleks 1:1 and to marketing — what the base keeps
          asking for, what&apos;s missing to arm partners, and what you need from the org. Resolve an
          item once you&apos;ve raised it.
        </p>
        <div className={styles.notesWrap}>
          {!notes.available && (
            <p className={styles.muted}>
              Capture isn&apos;t connected yet — run <code>docs/dashboard-tables.sql</code> in
              Supabase to start logging.
            </p>
          )}
          {notes.available && (
            <>
              <form action={addFieldNote} className={styles.noteForm}>
                <select name="kind" aria-label="Note kind" defaultValue="gap">
                  {FIELD_NOTE_KINDS.map((k) => (
                    <option key={k.key} value={k.key}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <input
                  name="body"
                  required
                  maxLength={2000}
                  placeholder="e.g. 3rd account this month asking about contractor conversion — need a one-pager"
                  aria-label="Note body"
                />
                <NoteSubmit />
              </form>

              {notes.notes.length === 0 ? (
                <p className={styles.muted}>Nothing logged yet.</p>
              ) : (
                <div className={styles.noteList}>
                  {notes.notes.map((n) => {
                    const meta = FIELD_NOTE_KINDS.find((k) => k.key === n.kind);
                    return (
                      <div key={n.id} className={styles.noteItem}>
                        <span className={`${styles.noteKind} ${styles[`kind_${n.kind}`] ?? ""}`}>
                          {meta?.label ?? n.kind}
                        </span>
                        <span className={styles.noteBody}>{n.body}</span>
                        <form action={resolveFieldNote} className={styles.noteResolve}>
                          <input type="hidden" name="id" value={n.id} />
                          <button className={styles.noteResolveBtn} aria-label="Resolve note">
                            Resolve
                          </button>
                        </form>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── The daily loop ─────────────────────────────────────────────── */}
        <h2 className={styles.h2}>The three questions I run every day</h2>
        <div className={styles.cards}>
          <div className={styles.card}>
            <h3>1 · What changed in the base?</h3>
            <p className={styles.muted}>
              New global-hiring evidence, a partner flag, an inbound. <b>Read</b> the signal before
              anything else — Band 1 is the answer.
            </p>
          </div>
          <div className={styles.card}>
            <h3>2 · What do I owe, and who do I clear?</h3>
            <p className={styles.muted}>
              <b>Route</b> through the partner. Clear the commitments in Band 2, and never jump a
              client before the CSM has cleared them.
            </p>
          </div>
          <div className={styles.card}>
            <h3>3 · What language drums up the intent?</h3>
            <p className={styles.muted}>
              The partner question: what do I say to <b>gauge, drum up, or campaign</b> a
              client&apos;s interest in Global? <b>Record</b> the answer on the Dashboard node.
            </p>
          </div>
        </div>

        {/* ── 30 / 60 / 90 ───────────────────────────────────────────────── */}
        <h2 className={styles.h2}>30 / 60 / 90 — first-ever 1:1 with Aleks is Monday</h2>
        <div className={styles.plan}>
          <div className={styles.planCol}>
            <div className={styles.planNum}>First 30</div>
            <div className={styles.planTheme}>Learn the base · arm the partners</div>
            <ul>
              <li>Ship the Account Room as shared targeting intel partners can see.</li>
              <li>Sit with each partner — start with Eric — and map their books to Global fit.</li>
              <li>Publish the first enablement-gap list to Aleks + marketing.</li>
              <li>Land the first 2–3 partner-cleared discovery calls.</li>
            </ul>
          </div>
          <div className={styles.planCol}>
            <div className={styles.planNum}>By 60</div>
            <div className={styles.planTheme}>Convert signal to pipeline</div>
            <ul>
              <li>A handful of qualified Global opportunities in flight on the Dashboard.</li>
              <li>First tailored demos delivered — countries and worker types matched.</li>
              <li>A repeatable partner-brief motion (the same three questions every time).</li>
              <li>First “voice of the base” note to marketing.</li>
            </ul>
          </div>
          <div className={styles.planCol}>
            <div className={styles.planNum}>By 90</div>
            <div className={styles.planTheme}>Prove the motion</div>
            <ul>
              <li>First Global close or a deal in late-stage decision.</li>
              <li>A documented displacement + greenfield play partners can self-serve.</li>
              <li>A standing lunch-and-learn / SME webinar cadence.</li>
              <li>A weekly base-signal digest that Aleks can carry upward.</li>
            </ul>
          </div>
        </div>

        {/* ── Weekly 1:1 agenda ──────────────────────────────────────────── */}
        <h2 className={styles.h2}>Weekly 1:1 with Aleks — standing agenda</h2>
        <div className={styles.agenda}>
          <ol>
            <li>
              <b>Base-expansion pipeline</b> — what moved this week, what&apos;s next, where it&apos;s
              stuck.
            </li>
            <li>
              <b>Partner health</b> — who&apos;s engaged (Eric, the CSMs), who&apos;s cold, where I
              need her air cover.
            </li>
            <li>
              <b>Market signal</b> — the one thing the base is telling us (voice of the base, above).
            </li>
            <li>
              <b>Asks / air cover</b> — what I need from her or marketing to arm partners.
            </li>
            <li>
              <b>Enablement gaps</b> — what we have, what we don&apos;t, what we need to sell Global.
            </li>
            <li>
              <b>The narrative up</b> — the one line she carries to her leadership.
            </li>
          </ol>
          <p className={styles.muted}>
            PEPM = per employee, per month — the unit EOR and global payroll price on. Keep the deal
            math in those terms when you brief her.
          </p>
        </div>
      </main>
    </>
  );
}

function Stat({ n, label }: { n: number | string; label: string }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statNum}>{n}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
