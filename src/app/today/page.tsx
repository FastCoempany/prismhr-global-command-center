import type { ReactNode } from "react";
import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { loadDashboard } from "@/lib/dashboard/data";
import { loadFieldNotes, FIELD_NOTE_KINDS } from "@/lib/field-notes/data";
import {
  loadDoneKeys,
  loadPartnerNotes,
  loadSnoozes,
  loadTodos,
  loadTouches,
  loadValidations,
} from "@/lib/today/overlay";
import {
  followUpMessage,
  groupUpcomingByDay,
  outreachSubjectKey,
  partitionFollowUps,
  type Touch,
} from "@/lib/today/follow-ups";
import {
  accountIntel,
  aleksLineGuidance,
  applyValidations,
  armPartnersGuidance,
  cardNextStep,
  commitmentGuidance,
  commitmentsFromCards,
  COMMITMENT_WINDOW_DAYS,
  firstNameOf,
  isStrongSignal,
  isTrusted,
  partnerOutreachKey,
  morningDoneKey,
  movedThisWeek,
  narrative,
  outreachGuidance,
  partitionSignals,
  partnerKickoff,
  partnerWeekMessage,
  signals,
  stateOfPlay,
  triageGuidance,
  voiceOfBaseGuidance,
  type AccountIntel,
  type CardStep,
  type Guidance,
  type Validation,
} from "@/lib/today/build";
import { SfCheckpoint } from "@/components/sf";
import { ContactControl, EditableMessage, NoteSubmit } from "../today-client";
import { NotesPanel } from "../notes-client";
import { TodayTabs } from "../today-tabs";
import { addCard, toggleCheck } from "../dashboard/actions";
import {
  addFieldNote,
  addFollowUp,
  addTouchNote,
  bringFollowUpDue,
  delayFollowUp,
  deleteTouch,
  markReplied,
  resolveFieldNote,
  snoozeSignal,
  toggleTaskDone,
  unsnoozeSignal,
} from "./actions";
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
  if (v.status === "confirmed")
    return <span className={styles.valConfirmed}>✓ confirmed</span>;
  if (v.status === "flagged") return <span className={styles.valFlagged}>⚠ flagged</span>;
  return <span className={styles.valAdjusted}>adjusted → {v.adjustedDemand}</span>;
}

function fitClass(tier: "high" | "medium" | "low") {
  return tier === "high"
    ? styles.fitHigh
    : tier === "medium"
      ? styles.fitMedium
      : styles.fitLow;
}

function ageBadge(ageDays: number | null) {
  if (ageDays == null) return null;
  const label = ageDays === 0 ? "today" : `${ageDays}d open`;
  const hot = ageDays >= COMMITMENT_WINDOW_DAYS;
  return (
    <span className={`${styles.ageBadge} ${hot ? styles.ageHot : ""}`}>{label}</span>
  );
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
function SeedForm({
  a,
  onBoard,
  label,
}: {
  a: AccountIntel;
  onBoard: boolean;
  label: string;
}) {
  if (onBoard) return <span className={styles.onDash}>On board ✓</span>;
  return (
    <form action={addCard}>
      <input type="hidden" name="name" value={a.name} />
      <input
        type="hidden"
        name="subtitle"
        value={`${a.csm}${a.industry ? ` · ${a.industry}` : ""}`}
      />
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
        <input
          name="reason"
          required
          maxLength={300}
          placeholder="Why park it?"
          aria-label="Reason"
        />
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

// The account/card name emphasized — and clickable when a href is given.
function Emph({ text, term, href }: { text: string; term: string; href?: string }) {
  const i = term ? text.indexOf(term) : -1;
  if (i < 0) return <>{text}</>;
  const mark = href ? (
    <Link href={href} className={styles.mvWhoLink}>
      {term}
    </Link>
  ) : (
    <span className={styles.mvWho}>{term}</span>
  );
  return (
    <>
      {text.slice(0, i)}
      {mark}
      {text.slice(i + term.length)}
    </>
  );
}

// The labeled, color-coded guidance body: DO THIS · HOW · SAY THIS · CONSIDER.
function GuidanceBody({
  g,
  term,
  href,
  children,
  sayNode,
}: {
  g: Guidance;
  term: string;
  href: string;
  children?: ReactNode;
  sayNode?: ReactNode; // overrides the default "Say this" block (e.g. a ContactControl)
}) {
  return (
    <div className={styles.gWrap}>
      <div className={styles.gDo}>
        <span className={styles.gDoLabel}>Do this</span>
        <span className={styles.gDoText}>
          <Emph text={g.do} term={term} href={href} />
        </span>
      </div>
      <div className={styles.gHow}>
        <span className={styles.gLabel}>How — step by step</span>
        <ol className={styles.gHowList}>
          {g.how.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ol>
      </div>
      {sayNode
        ? sayNode
        : g.say && (
            <div className={styles.gSay}>
              <span className={styles.gLabel}>Say this — edit anything, then copy</span>
              <EditableMessage text={g.say} />
            </div>
          )}
      {children}
      {g.consider && (
        <div className={styles.gConsider}>
          <span className={styles.gConsiderLabel}>Also consider</span>
          <span className={styles.gConsiderText}>{g.consider}</span>
        </div>
      )}
    </div>
  );
}

function moveTerm(mv: Mv): { term: string; href: string } {
  if (mv.kind === "commitment") return { term: mv.step.cardName, href: "/" };
  return { term: mv.a.name, href: `/accounts?focus=${mv.a.id}` };
}

// One fully-guided move: DO/HOW/SAY/CONSIDER + the real action panel + a
// uniform "Mark done ✓" you can always see the state of.
function MorningMove({
  mv,
  n,
  doneKey,
  done,
  touch,
}: {
  mv: Mv;
  n: number;
  doneKey: string;
  done: boolean;
  touch?: Touch;
}) {
  const { term, href } = moveTerm(mv);
  let g: Guidance;
  let chips: ReactNode = null;
  let actions: ReactNode = null;

  if (mv.kind === "outreach") {
    const a = mv.a;
    g = outreachGuidance(a);
    chips = (
      <>
        <span className={`${styles.fit} ${fitClass(a.tier)}`}>demand {a.demand}</span>
        <PlayTag play={a.play} />
        {a.competitors.length > 0 && (
          <span className={styles.mvOwner}>incumbent: {a.competitors.join(", ")}</span>
        )}
        <FunnelChip funnel={a.funnel} />
        <ValidationBadge v={a.validation} />
      </>
    );
  } else if (mv.kind === "triage") {
    const a = mv.a;
    g = triageGuidance(a);
    chips = (
      <>
        <span className={`${styles.fit} ${fitClass(a.tier)}`}>demand {a.demand}</span>
        {!isStrongSignal(a) && <span className={styles.emergingTag}>emerging</span>}
        <PlayTag play={a.play} />
        <FunnelChip funnel={a.funnel} />
        <ValidationBadge v={a.validation} />
      </>
    );
    actions = (
      <div className={styles.gActions}>
        <SeedForm a={a} onBoard={false} label="Seed to board" />
        <ParkControl id={a.id} />
      </div>
    );
  } else {
    const s = mv.step;
    g = commitmentGuidance(s);
    chips = (
      <>
        <span className={styles.mvOwner}>on the board · {s.nodeLabel}</span>
        {ageBadge(s.ageDays)}
      </>
    );
    actions = (
      <div className={styles.gActions}>
        <Link href="/" className={styles.mvOpen}>
          Open on the board
        </Link>
        <form action={toggleCheck} className={styles.commitmentClose}>
          <input type="hidden" name="cardId" value={s.cardId} />
          <input type="hidden" name="node" value={s.nodeKey} />
          <input type="hidden" name="index" value={s.index} />
          <input type="hidden" name="returnTo" value="/today" />
          <button className={styles.closeBtn}>Check the step off on the board</button>
        </form>
      </div>
    );
  }

  const isOutreach = mv.kind === "outreach";

  // Outreach completes by logging a contact (a Touch) — which also arms the
  // 2-day follow-up and captures the message — so its "Say this" slot is the
  // send control, and Undo removes the touch. Everything else uses a TaskDone key.
  const undoBtn = isOutreach ? (
    <form action={deleteTouch} className={styles.mvDoneForm}>
      <input type="hidden" name="subjectKey" value={outreachSubjectKey(mv.a.id)} />
      <button className={styles.mvUndoBtn}>Undo</button>
    </form>
  ) : (
    <form action={toggleTaskDone} className={styles.mvDoneForm}>
      <input type="hidden" name="key" value={doneKey} />
      <button className={styles.mvUndoBtn}>Undo</button>
    </form>
  );

  // Done → a compact struck line with Undo.
  if (done) {
    return (
      <div className={`${styles.mvMove} ${styles.mvDoneRow}`}>
        <div className={`${styles.mvNum} ${styles.mvNumDone}`}>✓</div>
        <div className={styles.mvDoneBody}>
          <span className={styles.mvDoneText}>
            <Emph text={g.do} term={term} href={href} />
          </span>
          {undoBtn}
        </div>
      </div>
    );
  }

  const sayNode = isOutreach ? (
    <div className={styles.gSay}>
      <span className={styles.gLabel}>
        Send this — edit, copy, send, then mark it sent
      </span>
      <ContactControl
        subjectKey={outreachSubjectKey(mv.a.id)}
        kind="account"
        label={mv.a.name}
        detail={`${mv.a.csm}${mv.a.play ? ` · ${mv.a.play}` : ""}`}
        defaultMessage={g.say ?? ""}
        sentLabel="Mark sent ✓ (sets a 2-day follow-up)"
        doneText="Sent ✓"
        editLabel={`Edit & copy the message to ${firstNameOf(mv.a.csm)}`}
        contacted={done}
        followUpLabel={touch ? shortDate(touch.followUpAt) : undefined}
      />
    </div>
  ) : undefined;

  const sfCheck =
    mv.kind === "outreach" ? (
      <SfCheckpoint when="before-outreach" id={mv.a.id} name={mv.a.name} strong />
    ) : mv.kind === "triage" ? (
      <SfCheckpoint when="triage" id={mv.a.id} name={mv.a.name} />
    ) : null;

  return (
    <div className={`${styles.mvMove} ${n === 1 ? styles.mvFirst : ""}`}>
      <div className={styles.mvNum}>{n}</div>
      <div className={styles.mvBody}>
        <div className={styles.mvTopRow}>
          <div className={styles.mvMeta}>{chips}</div>
          {!isOutreach && (
            <form action={toggleTaskDone} className={styles.mvDoneForm}>
              <input type="hidden" name="key" value={doneKey} />
              <button className={styles.mvDoneBtn}>Mark done ✓</button>
            </form>
          )}
        </div>
        {sfCheck}
        <GuidanceBody g={g} term={term} href={href} sayNode={sayNode}>
          {actions}
        </GuidanceBody>
      </div>
    </div>
  );
}

// A fully-guided block outside the numbered morning list: a header + optional
// chips, then the same DO/HOW/SAY/CONSIDER body. Used for "Then, if there's
// time" and the narrative-forming moves so those carry the same granularity.
function GuidedBlock({
  title,
  chips,
  g,
  term,
  href,
  children,
}: {
  title: string;
  chips?: ReactNode;
  g: Guidance;
  term: string;
  href: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.thenItem}>
      <div className={styles.thenHead}>
        <span className={styles.thenWhat}>{title}</span>
        {chips}
      </div>
      <GuidanceBody g={g} term={term} href={href}>
        {children}
      </GuidanceBody>
    </div>
  );
}

// Short, human date from an ISO string (pure — deterministic given the string).
function shortDate(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// A due follow-up: what you sent, any notes so far, a ready nudge to send, and
// the three ways to move it — replied (done), snooze, or log what happened.
function FollowUpDue({ t }: { t: Touch }) {
  const custom = t.kind === "custom";
  return (
    <div className={styles.fuCard}>
      <div className={styles.fuHead}>
        <span className={styles.fuWho}>
          {custom ? t.label : `Follow up with ${t.label}`}
          {!custom && t.detail ? (
            <span className={styles.fuDetail}> · {t.detail}</span>
          ) : null}
        </span>
        {!custom && (
          <span className={styles.fuAge}>Contacted {shortDate(t.contactedAt)}</span>
        )}
      </div>
      {custom && t.detail ? <p className={styles.fuNote}>{t.detail}</p> : null}
      {!custom && <SfCheckpoint when="followup" />}
      {!custom && t.message && (
        <details className={styles.fuSent}>
          <summary>What you sent</summary>
          <p className={styles.fuSentBody}>{t.message}</p>
        </details>
      )}
      {t.log.length > 0 && (
        <ul className={styles.fuLog}>
          {t.log.map((e, i) => (
            <li key={i}>
              <b>{shortDate(e.at)}</b> — {e.body}
            </li>
          ))}
        </ul>
      )}
      {!custom && (
        <>
          <div className={styles.fuSayLab}>Send a nudge — edit anything, then copy</div>
          <EditableMessage
            text={followUpMessage(t)}
            copyLabel={`Copy the nudge to ${firstNameOf(t.label)}`}
          />
        </>
      )}
      <div className={styles.fuActions}>
        <form action={markReplied}>
          <input type="hidden" name="subjectKey" value={t.subjectKey} />
          <button className={styles.fuReplied}>
            {custom ? "Done ✓" : "They replied ✓"}
          </button>
        </form>
        <details className={styles.fuDelay}>
          <summary className={styles.fuSnooze}>Delay ▾</summary>
          <div className={styles.fuDelayMenu}>
            <form action={delayFollowUp}>
              <input type="hidden" name="subjectKey" value={t.subjectKey} />
              <input type="hidden" name="when" value="today" />
              <button className={styles.fuDelayOpt}>Later today</button>
            </form>
            <form action={delayFollowUp}>
              <input type="hidden" name="subjectKey" value={t.subjectKey} />
              <input type="hidden" name="when" value="tomorrow" />
              <button className={styles.fuDelayOpt}>Tomorrow</button>
            </form>
          </div>
        </details>
        <form action={addTouchNote} className={styles.fuNoteForm}>
          <input type="hidden" name="subjectKey" value={t.subjectKey} />
          <input
            name="body"
            required
            maxLength={500}
            placeholder={
              custom ? "Add a note…" : "Log what happened (e.g. left a voicemail)…"
            }
            aria-label="Add a note"
          />
          <button className={styles.fuNoteBtn}>{custom ? "Note" : "Log & re-arm"}</button>
        </form>
      </div>
    </div>
  );
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  await searchParams;
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

  const [snoozes, validations, notes, doneKeys, touches, todos, partnerNotes] =
    await Promise.all([
      loadSnoozes(),
      loadValidations(),
      loadFieldNotes(),
      loadDoneKeys(),
      loadTouches(),
      loadTodos(),
      loadPartnerNotes(),
    ]);
  const touchMap = new Map(touches.map((t) => [t.subjectKey, t]));
  const followUps = partitionFollowUps(touches);

  const intel = applyValidations(accountIntel(), validations);
  // Accounts for the notetaker's per-note dropdown (alphabetical).
  const noteAccounts = [...intel]
    .map((a) => ({ id: a.id, name: a.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
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

  // Partner outreach: a standing roundup per partner — their top Global-fit
  // accounts plus a ready-to-send opener that names them. Always on Today so the
  // whole roster is teed up to work through, one message at a time.
  const kickoff = partnerKickoff(intel, parkedIds);
  const kickoffTotal = kickoff.reduce((n, k) => n + k.accounts.length, 0);
  // The "sent" mark is a logged Touch (so it carries the date, the message, and
  // an auto follow-up) — keyed by a stable per-partner string that persists.
  const kickoffItems = kickoff.map((k) => {
    const key = partnerOutreachKey(k.partner);
    const touch = touchMap.get(key);
    return { k, key, touch, done: !!touch };
  });
  const kickoffDoneCount = kickoffItems.filter((i) => i.done).length;

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
  const overdue = (s: CardStep) =>
    s.ageDays != null && s.ageDays >= COMMITMENT_WINDOW_DAYS;
  const pastWindow = cardSteps.filter(overdue);
  const otherSteps = cardSteps.filter((s) => !overdue(s));
  const triageList = activeSignals.filter(
    (a) => !onBoard.has(a.name) && a.id !== move?.id,
  );

  const allMoves: Mv[] = [
    ...pastWindow.map((step): Mv => ({ kind: "commitment", step })),
    ...(move ? [{ kind: "outreach", a: move } as Mv] : []),
    ...(triageList[0] ? [{ kind: "triage", a: triageList[0] } as Mv] : []),
    ...otherSteps.map((step): Mv => ({ kind: "commitment", step })),
  ];
  const mvId = (mv: Mv) =>
    mv.kind === "commitment"
      ? `card:${mv.step.cardId}:${mv.step.nodeKey}:${mv.step.index}`
      : `acct:${mv.a.id}`;
  // Outreach completes as a logged contact (Touch) so it feeds the follow-up
  // loop; everything else completes via a per-day TaskDone key.
  const items = allMoves.map((mv) => {
    if (mv.kind === "outreach") {
      const key = outreachSubjectKey(mv.a.id);
      const t = touchMap.get(key);
      return { mv, key, done: !!t, touch: t };
    }
    const key = morningDoneKey(mvId(mv));
    return { mv, key, done: doneKeys.has(key), touch: undefined as Touch | undefined };
  });
  const pendingMoves = items.filter((i) => !i.done);
  const doneMoves = items.filter((i) => i.done);
  const shownMoves = pendingMoves.slice(0, 4);
  const laterTriage = triageList.slice(triageList[0] ? 1 : 0);

  return (
    <>
      <AppWayfinder current="Today" />
      <main className={styles.wrap}>
        <h1 className={styles.h1}>Today</h1>
        <p className={styles.sub}>
          The daily command surface. Cold calling isn&apos;t the motion — this is a
          channel sell through partners into the base you already serve. Two lead streams
          route here: the <b>PEO channel</b> (CSM-owned) and the <b>HCM funnel</b>{" "}
          (Eric&apos;s HCM logos + HRaaS + clients on our PrismHR HCM). Read → route →
          record.
        </p>

        <SfCheckpoint when="standing" strong />

        {/* ── Sections, tabbed to keep any one view short ────────────────── */}
        <TodayTabs
          followUpsDue={followUps.due.length}
          notesCount={todos.length}
          morning={
            <>
              {/* ── Partner outreach (standing roundup) ────────────────────────── */}
              {kickoff.length > 0 && (
                <section className={styles.kickoff}>
                  <div className={styles.kickoffHead}>
                    <span className={styles.kickoffTag}>Partner outreach</span>
                    <h2 className={styles.kickoffTitle}>
                      Send each partner their account roundup
                    </h2>
                    <p className={styles.kickoffSub}>
                      One roundup per partner — {kickoff.length}{" "}
                      {kickoff.length === 1 ? "partner" : "partners"}, {kickoffTotal}{" "}
                      accounts teed up (each partner&apos;s top Global-fit from their
                      book). Open a partner&apos;s message, edit it, copy it, send it —
                      then mark them contacted.
                    </p>
                    <div className={styles.mvProgress}>
                      <span className={styles.mvProgressBar}>
                        <span
                          className={styles.mvProgressFill}
                          style={{
                            width: `${Math.round((kickoffDoneCount / Math.max(1, kickoffItems.length)) * 100)}%`,
                          }}
                        />
                      </span>
                      <span className={styles.mvProgressText}>
                        {kickoffDoneCount} of {kickoffItems.length} partners contacted
                      </span>
                    </div>
                    <SfCheckpoint when="kickoff" strong />
                  </div>
                  {kickoffItems.map(({ k, key, touch, done }) => (
                    <div
                      key={k.partner}
                      className={`${styles.kickoffPartner} ${done ? styles.kickoffDone : ""}`}
                    >
                      <div className={styles.kickoffPartnerHead}>
                        <span className={styles.kickoffPartnerName}>
                          {done && <span className={styles.kickoffCheck}>✓ </span>}
                          {k.partner}
                        </span>
                        <span className={styles.kickoffPartnerRole}>{k.role}</span>
                        <Link
                          href={`/partners#${encodeURIComponent(k.partner)}`}
                          className={styles.kickoffRoomLink}
                          title="Every outreach and note for this partner, timestamped"
                        >
                          Partner room →
                        </Link>
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
                      {(partnerNotes.get(k.partner) ?? []).length > 0 && (
                        <ul className={styles.kickoffNotes}>
                          {(partnerNotes.get(k.partner) ?? []).slice(0, 3).map((n) => (
                            <li key={n.id}>
                              <b>{shortDate(n.createdAt)}</b> — {n.body}
                            </li>
                          ))}
                          {(partnerNotes.get(k.partner) ?? []).length > 3 && (
                            <li className={styles.kickoffNotesMore}>
                              <Link href={`/partners#${encodeURIComponent(k.partner)}`}>
                                +{(partnerNotes.get(k.partner) ?? []).length - 3} more in
                                the partner room
                              </Link>
                            </li>
                          )}
                        </ul>
                      )}
                      <div className={styles.kickoffContact}>
                        <ContactControl
                          subjectKey={key}
                          kind="partner"
                          label={k.partner}
                          detail={`${k.accounts.length} account${k.accounts.length === 1 ? "" : "s"} teed up`}
                          defaultMessage={partnerWeekMessage(k.partner, k.accounts)}
                          sentLabel="Mark contacted ✓"
                          editLabel={`Edit & copy the roundup to ${firstNameOf(k.partner)}`}
                          contacted={done}
                          contactedLabel={
                            touch ? shortDate(touch.contactedAt) : undefined
                          }
                          followUpLabel={touch ? shortDate(touch.followUpAt) : undefined}
                          replied={touch?.status === "replied"}
                        />
                      </div>
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
                <div className={styles.mvCap}>
                  This morning
                  {items.length
                    ? ` · ${pendingMoves.length} to do${doneMoves.length ? `, ${doneMoves.length} done` : ""}`
                    : " · nothing pressing"}
                </div>

                {items.length > 0 && (
                  <div className={styles.mvProgress}>
                    <span className={styles.mvProgressBar}>
                      <span
                        className={styles.mvProgressFill}
                        style={{
                          width: `${Math.round((doneMoves.length / items.length) * 100)}%`,
                        }}
                      />
                    </span>
                    <span className={styles.mvProgressText}>
                      {doneMoves.length} of {items.length} done
                    </span>
                  </div>
                )}

                {items.length === 0 && (
                  <p className={styles.muted}>
                    Nothing needs you right now — no aging commitments, no untriaged
                    signals, no play waiting. Seed a signal from the{" "}
                    <Link href="/accounts">Account Room</Link> or advance a loop on the{" "}
                    <Link href="/">Dashboard</Link>.
                  </p>
                )}
                {items.length > 0 && pendingMoves.length === 0 && (
                  <p className={styles.mvAllDone}>
                    ✓ Everything for this morning is done. Nice work.
                  </p>
                )}

                {shownMoves.map((it, i) => (
                  <MorningMove
                    key={it.key}
                    mv={it.mv}
                    n={i + 1}
                    doneKey={it.key}
                    done={false}
                    touch={it.touch}
                  />
                ))}

                {pendingMoves.length > shownMoves.length && (
                  <p className={styles.muted}>
                    + {pendingMoves.length - shownMoves.length} more to do — mark these
                    done to reveal them.
                  </p>
                )}

                {(laterTriage.length > 0 || dash.status === "active") && (
                  <div className={styles.mvThen}>
                    <div className={styles.mvThenLab}>Then, if there&apos;s time</div>
                    {laterTriage.map((a) => (
                      <GuidedBlock
                        key={a.id}
                        title={`Decide on ${a.name}`}
                        chips={
                          <>
                            <span className={`${styles.fit} ${fitClass(a.tier)}`}>
                              demand {a.demand}
                            </span>
                            {!isStrongSignal(a) && (
                              <span className={styles.emergingTag}>emerging</span>
                            )}
                            <PlayTag play={a.play} />
                            <FunnelChip funnel={a.funnel} />
                            <ValidationBadge v={a.validation} />
                          </>
                        }
                        g={triageGuidance(a)}
                        term={a.name}
                        href={`/accounts?focus=${a.id}`}
                      >
                        <div className={styles.gActions}>
                          <SeedForm a={a} onBoard={false} label="Seed to board" />
                          <ParkControl id={a.id} />
                        </div>
                      </GuidedBlock>
                    ))}
                    <GuidedBlock
                      title="Log a voice-of-the-base note"
                      g={voiceOfBaseGuidance()}
                      term=""
                      href="#capture"
                    >
                      <div className={styles.gActions}>
                        <Link href="#capture" className={styles.mvOpen}>
                          Log it in Narrative ↓
                        </Link>
                      </div>
                    </GuidedBlock>
                  </div>
                )}

                {doneMoves.length > 0 && (
                  <details className={styles.mvDoneSection}>
                    <summary>Done this morning ({doneMoves.length})</summary>
                    {doneMoves.map((it) => (
                      <MorningMove
                        key={it.key}
                        mv={it.mv}
                        n={0}
                        doneKey={it.key}
                        done
                        touch={it.touch}
                      />
                    ))}
                  </details>
                )}
              </div>

              {/* ── HCM funnel + look-into flag (context, below the moves) ──────── */}
              {hcm.length > 0 && (
                <div className={styles.hcmStrip}>
                  <span className={styles.hcmLabel}>
                    HCM funnel — routes to you directly:
                  </span>
                  {hcm.map((a) => (
                    <Link
                      key={a.id}
                      href={`/accounts?focus=${a.id}`}
                      className={styles.hcmChip}
                    >
                      {a.name} <b>{a.score}</b> · {a.csm}
                    </Link>
                  ))}
                </div>
              )}
              <Link href="/look-into" className={styles.hcmWarn}>
                ⚠ This HCM funnel is incomplete — the roster of PEO clients running on
                PrismHR HCM isn&apos;t loaded yet, so it looks smaller than it is. Look
                into →
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
            </>
          }
          narrative={
            <>
              {/* ── Band 4 · Narrative forming ─────────────────────────────────── */}
              <section className={styles.band}>
                <div className={styles.bandHead}>
                  <span className={styles.bandNum}>4</span>
                  <div>
                    <h2 className={styles.bandTitle}>Narrative forming</h2>
                    <p className={styles.bandSub}>
                      Voice of the base — the honest pattern in the data, and the line
                      it&apos;s accruing toward your 1:1 with Aleks.
                    </p>
                  </div>
                </div>
                <div className={styles.bandBody}>
                  <div className={styles.statRow}>
                    <Stat
                      n={`${nar.researched}/${nar.total}`}
                      label="accounts researched"
                    />
                    <Stat n={nar.strongDemand} label="strong demand" />
                    <Stat n={nar.emerging} label="emerging / hedged" />
                    <Stat
                      n={`${nar.displacement}/${nar.greenfield}`}
                      label="displace / greenfield"
                    />
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

                  <div className={styles.narGuides}>
                    <GuidedBlock
                      title="Carry this into the Aleks 1:1"
                      g={aleksLineGuidance(nar, move)}
                      term={move?.name ?? ""}
                      href={move ? `/accounts?focus=${move.id}` : "#"}
                    />
                    <GuidedBlock
                      title="Arm the partners"
                      g={armPartnersGuidance(nar)}
                      term=""
                      href="#capture"
                    >
                      <div className={styles.gActions}>
                        <Link href="#capture" className={styles.mvOpen}>
                          Log a gap in the capture box ↓
                        </Link>
                      </div>
                    </GuidedBlock>
                  </div>
                </div>
              </section>

              {/* ── Voice of the base & enablement gaps (capture) ──────────────── */}
              <h2 id="capture" className={styles.h2}>
                Voice of the base &amp; enablement gaps
              </h2>
              <p className={styles.sub}>
                The running list you carry into the Aleks 1:1 and to marketing — what the
                base keeps asking for, what&apos;s missing to arm partners, and what you
                need from the org. Resolve an item once you&apos;ve raised it.
              </p>
              <div className={styles.notesWrap}>
                {!notes.available && (
                  <p className={styles.muted}>
                    Capture isn&apos;t connected yet — run{" "}
                    <code>docs/dashboard-tables.sql</code> in Supabase to start logging.
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
                              <span
                                className={`${styles.noteKind} ${styles[`kind_${n.kind}`] ?? ""}`}
                              >
                                {meta?.label ?? n.kind}
                              </span>
                              <span className={styles.noteBody}>{n.body}</span>
                              <form
                                action={resolveFieldNote}
                                className={styles.noteResolve}
                              >
                                <input type="hidden" name="id" value={n.id} />
                                <button
                                  className={styles.noteResolveBtn}
                                  aria-label="Resolve note"
                                >
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
            </>
          }
          plan={
            <>
              {/* ── The daily loop ─────────────────────────────────────────────── */}
              <h2 className={styles.h2}>The three questions I run every day</h2>
              <div className={styles.cards}>
                <div className={styles.card}>
                  <h3>1 · What changed in the base?</h3>
                  <p className={styles.muted}>
                    New global-hiring evidence, a partner flag, an inbound. <b>Read</b>{" "}
                    the signal before anything else — Band 1 is the answer.
                  </p>
                </div>
                <div className={styles.card}>
                  <h3>2 · What do I owe, and who do I clear?</h3>
                  <p className={styles.muted}>
                    <b>Route</b> through the partner. Clear the commitments in Band 2, and
                    never jump a client before the CSM has cleared them.
                  </p>
                </div>
                <div className={styles.card}>
                  <h3>3 · What language drums up the intent?</h3>
                  <p className={styles.muted}>
                    The partner question: what do I say to{" "}
                    <b>gauge, drum up, or campaign</b> a client&apos;s interest in Global?{" "}
                    <b>Record</b> the answer on the Dashboard node.
                  </p>
                </div>
              </div>

              {/* ── 30 / 60 / 90 ───────────────────────────────────────────────── */}
              <h2 className={styles.h2}>
                30 / 60 / 90 — first-ever 1:1 with Aleks is Monday
              </h2>
              <div className={styles.plan}>
                <div className={styles.planCol}>
                  <div className={styles.planNum}>First 30</div>
                  <div className={styles.planTheme}>
                    Learn the base · arm the partners
                  </div>
                  <ul>
                    <li>
                      Build out the Account Room — my private targeting intel on the whole
                      base.
                    </li>
                    <li>
                      Sit with each partner — start with Eric — and map their books to
                      Global fit.
                    </li>
                    <li>Take the first enablement-gap list to Aleks + marketing.</li>
                    <li>Land the first 2–3 partner-cleared discovery calls.</li>
                  </ul>
                </div>
                <div className={styles.planCol}>
                  <div className={styles.planNum}>By 60</div>
                  <div className={styles.planTheme}>Convert signal to pipeline</div>
                  <ul>
                    <li>
                      A handful of qualified Global opportunities in flight on the
                      Dashboard.
                    </li>
                    <li>
                      First tailored demos delivered — countries and worker types matched.
                    </li>
                    <li>
                      A repeatable partner-brief motion (the same three questions every
                      time).
                    </li>
                    <li>First “voice of the base” note to marketing.</li>
                  </ul>
                </div>
                <div className={styles.planCol}>
                  <div className={styles.planNum}>By 90</div>
                  <div className={styles.planTheme}>Prove the motion</div>
                  <ul>
                    <li>First Global close or a deal in late-stage decision.</li>
                    <li>
                      A documented displacement + greenfield play I can hand any partner.
                    </li>
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
                    <b>Base-expansion pipeline</b> — what moved this week, what&apos;s
                    next, where it&apos;s stuck.
                  </li>
                  <li>
                    <b>Partner health</b> — who&apos;s engaged (Eric, the CSMs),
                    who&apos;s cold, where I need her air cover.
                  </li>
                  <li>
                    <b>Market signal</b> — the one thing the base is telling us (voice of
                    the base, above).
                  </li>
                  <li>
                    <b>Asks / air cover</b> — what I need from her or marketing to arm
                    partners.
                  </li>
                  <li>
                    <b>Enablement gaps</b> — what we have, what we don&apos;t, what we
                    need to sell Global.
                  </li>
                  <li>
                    <b>The narrative up</b> — the one line she carries to her leadership.
                  </li>
                </ol>
                <p className={styles.muted}>
                  PEPM = per employee, per month — the unit EOR and global payroll price
                  on. Keep the deal math in those terms when you brief her.
                </p>
              </div>
            </>
          }
          followups={
            <div className={`${styles.fuCol} ${styles.fuColFollow}`}>
              <div className={styles.fuBandHead}>
                <span className={styles.fuTag}>Follow-ups</span>
                <h2 className={styles.fuTitle}>
                  {followUps.due.length > 0
                    ? `${followUps.due.length} due`
                    : "Nothing due right now"}
                </h2>
                <p className={styles.fuSub}>
                  Every contact you log sets a check-in — later today or tomorrow, never
                  on a weekend — or write your own below. They keep surfacing until you
                  close them.
                </p>
              </div>
              {followUps.due.map((t) => (
                <FollowUpDue key={t.subjectKey} t={t} />
              ))}
              {groupUpcomingByDay(followUps.upcoming).map((g) => (
                <details key={g.key} className={styles.fuDayGroup} open>
                  <summary className={styles.fuDayHead}>
                    {g.label}
                    <span className={styles.fuDayCount}>{g.items.length}</span>
                  </summary>
                  <ul className={styles.fuUpcomingList}>
                    {g.items.map((t) => (
                      <li key={t.subjectKey}>
                        <span className={styles.fuUpWho}>{t.label}</span>
                        {t.detail ? (
                          <span className={styles.fuUpDetail}> · {t.detail}</span>
                        ) : null}
                        <span className={styles.fuUpWhen}>
                          {" "}
                          — {shortDate(t.followUpAt)}
                        </span>
                        <span className={styles.fuUpActions}>
                          <form action={markReplied} className={styles.valInline}>
                            <input type="hidden" name="subjectKey" value={t.subjectKey} />
                            <button
                              className={styles.fuUpDone}
                              title="Close it — already done"
                            >
                              Done ✓
                            </button>
                          </form>
                          <form action={bringFollowUpDue} className={styles.valInline}>
                            <input type="hidden" name="subjectKey" value={t.subjectKey} />
                            <button
                              className={styles.fuUpBtn}
                              title="Bring the check-in to today"
                            >
                              Do now
                            </button>
                          </form>
                          <form action={deleteTouch} className={styles.valInline}>
                            <input type="hidden" name="subjectKey" value={t.subjectKey} />
                            <button
                              className={styles.fuUpDel}
                              title="Remove this follow-up"
                            >
                              Delete
                            </button>
                          </form>
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
              <form action={addFollowUp} className={styles.fuAdd}>
                <input
                  name="label"
                  required
                  maxLength={200}
                  placeholder="Add your own follow-up (who / what)…"
                  aria-label="Add a follow-up"
                />
                <select name="when" defaultValue="tomorrow" aria-label="When">
                  <option value="today">later today</option>
                  <option value="tomorrow">tomorrow</option>
                </select>
                <button className={styles.fuAddBtn}>Add</button>
              </form>
              {followUps.replied.length > 0 && (
                <div className={styles.fuDone}>
                  <div className={styles.fuDoneHead}>Done</div>
                  <ul className={styles.fuDoneList}>
                    {followUps.replied.map((t) => (
                      <li key={t.subjectKey}>
                        <span className={styles.fuUpWho}>{t.label}</span>
                        {t.detail ? (
                          <span className={styles.fuUpDetail}> · {t.detail}</span>
                        ) : null}
                        <span className={styles.fuUpWhen}>
                          {" "}
                          — contacted {shortDate(t.contactedAt)}
                        </span>
                        <span className={styles.fuUpActions}>
                          <form action={bringFollowUpDue} className={styles.valInline}>
                            <input type="hidden" name="subjectKey" value={t.subjectKey} />
                            <button
                              className={styles.fuUpBtn}
                              title="Reopen — bring it back due"
                            >
                              Reopen
                            </button>
                          </form>
                          <form action={deleteTouch} className={styles.valInline}>
                            <input type="hidden" name="subjectKey" value={t.subjectKey} />
                            <button className={styles.fuUpDel} title="Remove entirely">
                              Delete
                            </button>
                          </form>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          }
          notes={
            <div className={`${styles.fuCol} ${styles.fuColTodo}`}>
              <div className={styles.fuBandHead}>
                <span className={styles.todoTag}>Notes &amp; to-dos</span>
                <h2 className={styles.fuTitle}>Notetaker</h2>
                <p className={styles.fuSub}>
                  Live notes — autosaved as you type (browser + database). Link an
                  account, set a date, select any notes and copy them out.
                </p>
              </div>
              <NotesPanel initialNotes={todos} accounts={noteAccounts} />
            </div>
          }
        />
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
