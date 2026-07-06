import type { ReactNode } from "react";
import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { loadDashboard } from "@/lib/dashboard/data";
import { loadFieldNotes, FIELD_NOTE_KINDS } from "@/lib/field-notes/data";
import { loadSnoozes, loadValidations } from "@/lib/today/overlay";
import {
  accountIntel,
  applyValidations,
  cardNextStep,
  commitmentBrief,
  commitmentsFromCards,
  COMMITMENT_WINDOW_DAYS,
  firstNameOf,
  isStrongSignal,
  isTrusted,
  isWeekKickoff,
  movedThisWeek,
  narrative,
  outreachBrief,
  partitionSignals,
  partnerKickoff,
  partnerMessage,
  partnerWeekMessage,
  signals,
  stateOfPlay,
  triageBrief,
  type AccountIntel,
  type CardStep,
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

// A move on the morning list: a commitment to close, an outreach to send, or a
// signal to triage.
type Mv =
  | { kind: "commitment"; step: CardStep }
  | { kind: "outreach"; a: AccountIntel }
  | { kind: "triage"; a: AccountIntel };

// Bold directive with the account/card name emphasized.
function Emph({ text, term }: { text: string; term: string }) {
  const i = term ? text.indexOf(term) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className={styles.mvWho}>{term}</span>
      {text.slice(i + term.length)}
    </>
  );
}

// One move, rendered A2-style: the brief on the left, the exact thing to do
// (message / decision / step) on the right.
function MorningMove({ mv, n }: { mv: Mv; n: number }) {
  let term = "";
  let brief = { directive: "", narrative: "" };
  let chips: ReactNode = null;
  let aside: ReactNode = null;

  if (mv.kind === "outreach") {
    const a = mv.a;
    term = a.name;
    brief = outreachBrief(a);
    const message = partnerMessage(a);
    chips = (
      <>
        <span className={`${styles.fit} ${fitClass(a.tier)}`}>demand {a.demand}</span>
        <PlayTag play={a.play} />
        {a.competitors.length > 0 && (
          <span className={styles.mvOwner}>incumbent: {a.competitors.join(", ")}</span>
        )}
        <FunnelChip funnel={a.funnel} />
        <span className={styles.mvOwner}>owner: {a.csm}</span>
        <ValidationBadge v={a.validation} />
      </>
    );
    aside = (
      <>
        <div className={styles.mvAsideLab}>The message to {firstNameOf(a.csm)}, ready to send</div>
        <div className={styles.mvAsideText}>{message}</div>
        <div className={styles.actRow}>
          <CopyLine text={message} label="Copy the message" />
        </div>
      </>
    );
  } else if (mv.kind === "triage") {
    const a = mv.a;
    term = a.name;
    brief = triageBrief(a);
    chips = (
      <>
        <span className={`${styles.fit} ${fitClass(a.tier)}`}>demand {a.demand}</span>
        {!isStrongSignal(a) && <span className={styles.emergingTag}>emerging</span>}
        <PlayTag play={a.play} />
        <FunnelChip funnel={a.funnel} />
        <span className={styles.mvOwner}>owner: {a.csm}</span>
        <ValidationBadge v={a.validation} />
      </>
    );
    aside = (
      <>
        <div className={styles.mvAsideLab}>Your decision</div>
        <div className={styles.mvOpt}>
          <b>Seed</b>
          <span>— put it on the board with the research attached and start working it.</span>
        </div>
        <div className={styles.mvOpt}>
          <b>Park</b>
          <span>— set it aside with a written reason; it resurfaces later, not lost.</span>
        </div>
        <div className={styles.actRow}>
          <SeedForm a={a} onBoard={false} label="Seed to board" />
          <ParkControl id={a.id} />
        </div>
      </>
    );
  } else {
    const s = mv.step;
    term = s.cardName;
    brief = commitmentBrief(s);
    chips = (
      <>
        <span className={styles.mvOwner}>on the board · {s.nodeLabel}</span>
        {ageBadge(s.ageDays)}
      </>
    );
    aside = (
      <>
        <div className={styles.mvAsideLab}>The step to close</div>
        <div className={styles.mvAsideText}>
          “{s.item}” — closing it moves {s.cardName} toward its next stage.
        </div>
        <div className={styles.actRow}>
          <Link href="/" className={styles.mvOpen}>
            Open on the board
          </Link>
          <form action={toggleCheck} className={styles.commitmentClose}>
            <input type="hidden" name="cardId" value={s.cardId} />
            <input type="hidden" name="node" value={s.nodeKey} />
            <input type="hidden" name="index" value={s.index} />
            <input type="hidden" name="returnTo" value="/today" />
            <button className={styles.closeBtn}>Mark done ✓</button>
          </form>
        </div>
      </>
    );
  }

  return (
    <div className={`${styles.mvMove} ${n === 1 ? styles.mvFirst : ""}`}>
      <div className={styles.mvNum}>{n}</div>
      <div className={styles.mvSplit}>
        <div>
          <div className={styles.mvDirective}>
            <Emph text={brief.directive} term={term} />
          </div>
          <p className={styles.mvNarr}>{brief.narrative}</p>
          <div className={styles.mvMeta}>{chips}</div>
        </div>
        <aside className={styles.mvAside}>{aside}</aside>
      </div>
    </div>
  );
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const forceWeek = sp.week === "1";
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

  // Week kickoff (Sun/Mon, or forced via ?week=1): tee up ≥5 interactions per
  // partner with a real target.
  const showKickoff = forceWeek || isWeekKickoff();
  const kickoff = showKickoff ? partnerKickoff(intel, parkedIds) : [];
  const kickoffTotal = kickoff.reduce((n, k) => n + k.accounts.length, 0);

  const sop = stateOfPlay({ cards: dash.cards, commitments, activeSignals, onBoard });

  // ── Compose "This morning": an ordered list of thoroughly-written moves. ──
  // Order: aging commitments (urgent) → the outreach move → the top triage
  // decision → other in-flight steps. Cap the primary list; the rest go to
  // "then, if there's time".
  const cardSteps = dash.cards
    .filter((c) => !c.archived)
    .map((c) => cardNextStep(c, dash.labels))
    .filter((s): s is CardStep => s != null)
    .sort((x, y) => (y.ageDays ?? -1) - (x.ageDays ?? -1));
  const overdue = (s: CardStep) => s.ageDays != null && s.ageDays >= COMMITMENT_WINDOW_DAYS;
  const pastWindow = cardSteps.filter(overdue);
  const otherSteps = cardSteps.filter((s) => !overdue(s));
  const triageList = activeSignals.filter((a) => !onBoard.has(a.name) && a.id !== move?.id);

  const allMoves: Mv[] = [
    ...pastWindow.map((step): Mv => ({ kind: "commitment", step })),
    ...(move ? [{ kind: "outreach", a: move } as Mv] : []),
    ...(triageList[0] ? [{ kind: "triage", a: triageList[0] } as Mv] : []),
    ...otherSteps.map((step): Mv => ({ kind: "commitment", step })),
  ];
  const morning = allMoves.slice(0, 4);
  const laterTriage = triageList.slice(triageList[0] ? 1 : 0);

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

        {/* ── Week kickoff (Sun/Mon) ─────────────────────────────────────── */}
        {kickoff.length > 0 && (
          <section className={styles.kickoff}>
            <div className={styles.kickoffHead}>
              <span className={styles.kickoffTag}>Week kickoff</span>
              <h2 className={styles.kickoffTitle}>
                Line up at least 5 interactions per partner
              </h2>
              <p className={styles.kickoffSub}>
                It&apos;s the start of the week. {kickoff.length}{" "}
                {kickoff.length === 1 ? "partner has" : "partners have"} real Global targets —{" "}
                {kickoffTotal} accounts teed up. Send each partner their opener, then work the
                replies through the week.
              </p>
            </div>
            {kickoff.map((k) => (
              <div key={k.partner} className={styles.kickoffPartner}>
                <div className={styles.kickoffPartnerHead}>
                  <span className={styles.kickoffPartnerName}>{k.partner}</span>
                  <span className={styles.kickoffPartnerRole}>{k.role}</span>
                  <span className={styles.kickoffCount}>
                    {k.accounts.length} teed up
                    {k.accounts.length < 5 ? " · fewer than 5 in this book" : ""}
                  </span>
                </div>
                <div className={styles.kickoffAccts}>
                  {k.accounts.map((a) => (
                    <Link
                      key={a.id}
                      href={`/accounts?focus=${a.id}`}
                      className={styles.kickoffAcct}
                    >
                      {a.name} <b>{a.score}</b>
                      {a.play ? ` · ${a.play}` : ""}
                    </Link>
                  ))}
                </div>
                <CopyLine
                  text={partnerWeekMessage(k.partner, k.accounts)}
                  label={`Copy the week-opener to ${firstNameOf(k.partner)}`}
                />
              </div>
            ))}
          </section>
        )}

        {/* ── Right now (quiet status) ───────────────────────────────────── */}
        <div className={styles.sop}>
          <div className={styles.sopStats}>
            <span>
              <b>{sop.openLoops}</b> in flight
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
        </div>

        {/* ── This morning — your first moves, in order ──────────────────── */}
        <div className={styles.mvPanel}>
          <div className={styles.mvCap}>This morning · {morning.length ? `${morning.length} moves, in order` : "nothing pressing"}</div>

          {morning.length === 0 && (
            <p className={styles.muted}>
              Nothing needs you right now — no aging commitments, no untriaged signals, no play
              waiting. Seed a signal from the <Link href="/accounts">Account Room</Link> or advance a
              loop on the <Link href="/">Dashboard</Link>.
            </p>
          )}

          {morning.map((mv, i) => (
            <MorningMove
              key={mv.kind === "commitment" ? `${mv.step.cardId}-${mv.step.nodeKey}` : mv.a.id}
              mv={mv}
              n={i + 1}
            />
          ))}

          {(laterTriage.length > 0 || dash.status === "active") && (
            <div className={styles.mvThen}>
              <div className={styles.mvThenLab}>Then, if there&apos;s time</div>
              {laterTriage.length > 0 ? (
                <ul className={styles.mvThenList}>
                  {laterTriage.map((a) => (
                    <li key={a.id}>
                      Decide on{" "}
                      <Link href={`/accounts?focus=${a.id}`}>{a.name}</Link> — {a.demand}-demand{" "}
                      {a.play ?? "signal"}, {a.confidence} confidence.
                    </li>
                  ))}
                  <li>
                    Jot a <Link href="#capture">voice-of-the-base note</Link>{" "}
                    if you&apos;re noticing a pattern across the base — raw material for the Aleks
                    1:1.
                  </li>
                </ul>
              ) : (
                <p className={styles.muted}>
                  Nothing else waiting. If you&apos;re noticing a pattern across the base, log a{" "}
                  <Link href="#capture">voice-of-the-base note</Link> for the Aleks 1:1.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── HCM funnel + look-into flag (context, below the moves) ──────── */}
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
            <summary>Parked signals ({parked.length})</summary>
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
        <h2 id="capture" className={styles.h2}>Voice of the base &amp; enablement gaps</h2>
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
