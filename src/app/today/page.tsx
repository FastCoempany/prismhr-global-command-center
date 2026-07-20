import type { ReactNode } from "react";
import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { loadDashboard } from "@/lib/dashboard/data";
import { loadFieldNotes, FIELD_NOTE_KINDS } from "@/lib/field-notes/data";
import type { AccountNote as AcctNote } from "@/lib/today/overlay";
import {
  loadAccountNotes,
  loadDispositions,
  loadDoneKeys,
  loadDoneTimes,
  loadPartnerNotes,
  loadSnoozes,
  loadTodos,
  loadTouches,
  loadValidations,
} from "@/lib/today/overlay";
import {
  sameLocalDayIso,
  sortEvents,
  splitAsk,
  type LedgerEvent,
} from "@/lib/today/ledger";
import { EdgeTray } from "./edge-tray";
import { SpineRail } from "./spine-rail";
import { DASH_NODES } from "@/lib/dashboard/stages";
import { AccountChip } from "./account-chip";
import { AtcRow, CurveballButton, type RailItem } from "./atc-rail";
import { CockpitDrawers } from "./cockpit-drawers";
import { type DeckKind } from "./deck-row";
import { LedgerRow } from "./led-row";
import { PastRow } from "./past-row";
import {
  daysSinceIso,
  followUpMessage,
  futureDatedTodos,
  groupUpcomingByDay,
  isDue,
  outreachSubjectKey,
  partitionFollowUps,
  roundupDue,
  ROUNDUP_CADENCE_DAYS,
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
  chipTone,
  partnerOutreachKey,
  morningDoneKey,
  movedThisWeek,
  narrative,
  outreachGuidance,
  partitionSignals,
  partnerKickoff,
  roundupBullets,
  roundupFrame,
  signals,
  stateOfPlay,
  STEP_HOLDS,
  holdGuidance,
  triageGuidance,
  voiceOfBaseGuidance,
  type AccountIntel,
  type CardStep,
  type Guidance,
} from "@/lib/today/build";
import { ALEKS_SESSIONS } from "@/lib/aleks/one-on-one";
import { SfCheckpoint } from "@/components/sf";
import { ContactControl, EditableMessage, NoteSubmit } from "../today-client";
import { clockShort, USER_TZ } from "@/lib/tz";
import { addCard, toggleCheck } from "../dashboard/actions";
import {
  addFieldNote,
  addFollowUp,
  addTouchNote,
  bringFollowUpDue,
  delayFollowUp,
  deleteTouch,
  markReplied,
  markResponded,
  muteRoundupPartner,
  resolveFieldNote,
  setPartnerLight,
  updateTouchAsk,
  setThreadStatus,
  snoozeSignal,
  toggleTaskDone,
  unmuteRoundupPartner,
  unsnoozeSignal,
} from "./actions";
import { DaySheet } from "./day-sheet";
import { visibleText } from "@/lib/today/route-notes";
import styles from "../command-center.module.css";

export const dynamic = "force-dynamic";

// One-time seed dropped into a new card's Discovery note on "Seed to dashboard".
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

// "Seed to dashboard" / "Act" — reuses the Dashboard addCard action, returning here.
function SeedForm({
  a,
  onBoard,
  label,
}: {
  a: AccountIntel;
  onBoard: boolean;
  label: string;
}) {
  if (onBoard) return <span className={styles.onDash}>On dashboard ✓</span>;
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

// Kind-tag classes for Work-rail rows (shared by DeckRow and the done rows here).
const DECK_KIND_CLS: Record<DeckKind, string> = {
  send: "deckSend",
  decide: "deckDecide",
  close: "deckClose",
  note: "deckNote",
  chase: "deckChase",
  reply: "deckReply",
};

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
  doneKey,
  done,
  touch,
  notes = [],
}: {
  mv: Mv;
  doneKey: string;
  done: boolean;
  touch?: Touch;
  notes?: AcctNote[];
}) {
  const { term, href } = moveTerm(mv);
  let g: Guidance;
  let meta: string;
  let kind: DeckKind;
  let actions: ReactNode = null;
  let primary: ReactNode = null;
  let primaryLabel: string | undefined;

  if (mv.kind === "outreach") {
    const a = mv.a;
    g = outreachGuidance(a);
    kind = "send";
    meta = `demand ${a.demand ?? "—"}${a.play ? ` · ${a.play}` : ""} · ⟳ SF first`;
    primaryLabel = "Send ▸";
  } else if (mv.kind === "triage") {
    const a = mv.a;
    g = triageGuidance(a);
    kind = "decide";
    meta = `demand ${a.demand ?? "—"}${!isStrongSignal(a) ? " · emerging" : ""}${
      a.play ? ` · ${a.play}` : ""
    }`;
    primaryLabel = "Decide ▸";
    actions = (
      <div className={styles.gActions}>
        <SeedForm a={a} onBoard={false} label="Seed to dashboard" />
        <ParkControl id={a.id} />
        <form action={toggleTaskDone} className={styles.mvDoneForm}>
          <input type="hidden" name="key" value={doneKey} />
          <button className={styles.mvDoneBtn}>Mark done ✓</button>
        </form>
      </div>
    );
  } else {
    const s = mv.step;
    g = commitmentGuidance(s);
    kind = "close";
    meta = `dashboard · ${s.nodeLabel}`;
    // The one button: mark the morning move done. Checking the step off on the
    // board itself stays in the expansion.
    primary = (
      <form action={toggleTaskDone} className={styles.valInline}>
        <input type="hidden" name="key" value={doneKey} />
        <button className={`${styles.atcBtn} ${styles.atcGo}`}>Done ✓</button>
      </form>
    );
    actions = (
      <div className={styles.gActions}>
        <Link href="/" className={styles.mvOpen}>
          Open on the dashboard
        </Link>
        <form action={toggleCheck} className={styles.commitmentClose}>
          <input type="hidden" name="cardId" value={s.cardId} />
          <input type="hidden" name="node" value={s.nodeKey} />
          <input type="hidden" name="index" value={s.index} />
          <input type="hidden" name="returnTo" value="/today" />
          <button className={styles.closeBtn}>Check the step off on the dashboard</button>
        </form>
      </div>
    );
  }

  const isOutreach = mv.kind === "outreach";

  // Outreach completes by logging a contact (a Touch) — which also arms the
  // next check-in and captures the message — so its "Say this" slot is the
  // send control, and Undo removes the touch. Everything else uses a TaskDone key.
  const undoBtn = isOutreach ? (
    <form action={deleteTouch} className={styles.valInline}>
      <input type="hidden" name="subjectKey" value={outreachSubjectKey(mv.a.id)} />
      <button className={styles.atcBtn}>Undo</button>
    </form>
  ) : (
    <form action={toggleTaskDone} className={styles.valInline}>
      <input type="hidden" name="key" value={doneKey} />
      <button className={styles.atcBtn}>Undo</button>
    </form>
  );

  // Done → a struck one-liner that stays in the rail, with Undo.
  if (done) {
    return (
      <div className={styles.atcRowWrap}>
        <div className={`${styles.atcRow} ${styles.deckDoneRow}`}>
          <span className={`${styles.deckNum} ${styles.deckNumDone}`}>✓</span>
          <span className={`${styles.deckKind} ${styles[DECK_KIND_CLS[kind]]}`}>
            {kind}
          </span>
          <span className={`${styles.atcPhrase} ${styles.deckDoneText}`}>
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
        sentLabel="Mark sent ✓ (arms the next check-in)"
        doneText="Sent"
        editLabel={`Edit & copy the message to ${firstNameOf(mv.a.csm)}`}
        status={
          done && touch && touch.status !== "archived" && touch.status !== "open"
            ? touch.status
            : "none"
        }
        contactedLabel={touch ? shortDate(touch.contactedAt) : undefined}
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

  const kindWord =
    mv.kind === "outreach" ? "SEND" : mv.kind === "triage" ? "DECIDE" : "CLOSE";
  const tm =
    mv.kind === "commitment" && mv.step.ageDays != null && mv.step.ageDays > 0
      ? `${mv.step.ageDays}d`
      : "";
  return (
    <LedgerRow
      tm={tm}
      tone="open"
      kind={kindWord}
      text={<Emph text={g.do} term={term} href={href} />}
      textTitle={g.do}
      meta={meta}
      primaryLabel={primaryLabel ?? "Open ▸"}
      primaryHot={isOutreach}
      primary={primary}
    >
      {sfCheck}
      <GuidanceBody g={g} term={term} href={href} sayNode={sayNode}>
        {notes.length > 0 && <NotesOnFile notes={notes} />}
        {actions}
      </GuidanceBody>
    </LedgerRow>
  );
}

// The dated notes already on file for an account — expandable wherever the
// account is being worked, so the history is one click away, never a page away.
function NotesOnFile({ notes }: { notes: AcctNote[] }) {
  return (
    <details className={styles.fuSent}>
      <summary>Notes on file ({notes.length})</summary>
      <ul className={styles.fuLog}>
        {notes.slice(0, 6).map((n) => (
          <li key={n.id}>
            <b>{shortDate(n.createdAt)}</b>
            {n.kind === "partner" ? " — partner said: " : " — "}
            {n.body}
          </li>
        ))}
      </ul>
    </details>
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

// The Day Sheet's date line, e.g. "Tue, Jul 14" (default-param clock read).
function todayLabel(now: Date = new Date()): string {
  return now.toLocaleDateString("en-US", {
    timeZone: USER_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Short, human date from an ISO string (pure — deterministic given the string).
function shortDate(iso: string): string {
  // (rendered in the user's timezone — see USER_TZ)
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", {
    timeZone: USER_TZ,
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
          <span className={styles.fuAge}>Last contacted {shortDate(t.contactedAt)}</span>
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
        <main className={`${styles.wrap} ${styles.wrapWide}`}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const [
    snoozes,
    validations,
    notes,
    doneKeys,
    touches,
    todos,
    partnerNotes,
    acctNotes,
    dispositions,
    doneTimes,
  ] = await Promise.all([
    loadSnoozes(),
    loadValidations(),
    loadFieldNotes(),
    loadDoneKeys(),
    loadTouches(),
    loadTodos(),
    loadPartnerNotes(),
    loadAccountNotes(),
    loadDispositions(),
    loadDoneTimes(),
  ]);
  const touchMap = new Map(touches.map((t) => [t.subjectKey, t]));
  const followUps = partitionFollowUps(touches);

  // Not-mine accounts vanish from every Today surface — they live only in the
  // Account Room's exclusions ledger. Motion/parked stay visible (marked) but
  // drop out of the default roundup.
  const intel = applyValidations(accountIntel(), validations).filter(
    (a) => dispositions.get(a.id)?.status !== "not-mine",
  );
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
  const hcmAll = intel.filter((a) => a.funnel === "hcm");
  const hcm = hcmAll.slice(0, 6);

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
  // The "sent" mark is a logged Touch (so it carries the date, the message, and
  // an auto follow-up) — keyed by a stable per-partner string that persists.
  const kickoffItems = kickoff.map((k) => {
    const key = partnerOutreachKey(k.partner);
    const touch = touchMap.get(key);
    // An archived thread resets the card — a fresh roundup (from current
    // research) is ready to send, so the partner reads as not-yet-contacted.
    return { k, key, touch, done: !!touch && touch.status !== "archived" };
  });

  // The ATC rail: one urgency-ranked control line per partner. Phrase + dot are
  // composed here (server-side) so the rail component stays a dumb renderer.
  const railItems = kickoffItems
    .map(({ k, key, touch }) => {
      const status: RailItem["status"] = !touch
        ? "none"
        : touch.status === "archived"
          ? "archived"
          : touch.status;
      const due = !!touch && isDue(touch);
      // Composer rows: in-motion/parked accounts stay listed but default out of
      // the message; the default roundup is built from what's still checked.
      // Bullets come from the rotating builder so a message with several
      // same-play accounts never repeats a line.
      const bullets = roundupBullets(k.accounts);
      const sections = k.accounts.map((a, i) => {
        const d = dispositions.get(a.id);
        const mark =
          d?.status === "motion"
            ? ("motion" as const)
            : d?.status === "parked"
              ? ("parked" as const)
              : ("" as const);
        return { id: a.id, name: a.name, bullet: bullets[i], on: !mark, mark };
      });
      const sendAccts = k.accounts.filter((a) => sections.find((s) => s.id === a.id)?.on);
      const motionCount = sections.filter((s) => s.mark === "motion").length;
      const parkedCount = sections.filter((s) => s.mark === "parked").length;
      const nothingToSend =
        sendAccts.length === 0 && (status === "none" || status === "archived");
      const offPhrase = [
        motionCount ? `${motionCount} in motion` : "",
        parkedCount ? `${parkedCount} parked` : "",
      ]
        .filter(Boolean)
        .join(", ");
      // Every-2-days roundup cadence: a fresh card (never sent, or archived and
      // past the cadence) reads as DUE, not as passive availability.
      const cadenceDue =
        (status === "none" || status === "archived") &&
        !nothingToSend &&
        roundupDue(touch);
      const phrase =
        status === "replied"
          ? `Replied ${touch ? shortDate(touch.contactedAt) : ""} — your move`
          : status === "open"
            ? `Open-ended — not waiting on a reply${touch?.contactedAt ? ` · last exchange ${shortDate(touch.contactedAt)}` : ""}`
            : status === "responded"
              ? due
                ? "You replied — check-in due now"
                : `You replied · check-in ${touch ? shortDate(touch.followUpAt) : ""} — their move`
              : status === "awaiting"
                ? due
                  ? `Sent ${touch ? shortDate(touch.contactedAt) : ""} — check-in due now`
                  : `Sent ${touch ? shortDate(touch.contactedAt) : ""} · check-in ${touch ? shortDate(touch.followUpAt) : ""}`
                : nothingToSend
                  ? `${offPhrase || "No accounts"} — nothing to send`
                  : status === "archived"
                    ? cadenceDue
                      ? `New roundup due — last sent ${touch ? shortDate(touch.contactedAt) : ""}`
                      : `Fresh roundup ready — last sent ${touch ? shortDate(touch.contactedAt) : ""}`
                    : `New roundup due — never sent (${sendAccts.length}${offPhrase ? ` · ${offPhrase}` : ""})`;
      const dot: RailItem["dot"] =
        status === "replied"
          ? "green"
          : nothingToSend || status === "open"
            ? "grey"
            : due || status === "none" || cadenceDue
              ? "orange"
              : status === "archived"
                ? "grey"
                : "yellow";
      const rank =
        status === "replied"
          ? 0
          : due
            ? 1
            : nothingToSend || status === "open"
              ? 5
              : status === "none"
                ? 3
                : status === "archived"
                  ? 4
                  : 2;
      // The default message is stitched from the checked sections' bullets —
      // byte-identical with what the client composer rebuilds, so toggling an
      // account back on never shifts the other bullets' phrasing.
      const frame = roundupFrame(k.partner);
      const onBullets = sections.filter((s) => s.on).map((s) => s.bullet);
      const defaultMessage = onBullets.length
        ? `${frame.opener}\n\n${onBullets.join("\n")}\n\n${frame.closer}`
        : `${frame.opener}\n\n${frame.closer}`;
      return {
        rank,
        item: {
          partner: k.partner,
          role: k.role,
          subjectKey: key,
          status,
          due,
          phrase,
          dot,
          detail: `${sendAccts.length} of ${k.accounts.length} teed up`,
          defaultMessage,
          draftHref: `/partners#${encodeURIComponent(k.partner)}`,
          sendable: sendAccts.length,
          sections,
          frame,
          cadenceDue,
        } satisfies RailItem,
      };
    })
    .sort((a, b) => a.rank - b.rank)
    .map((r) => r.item);

  // Tab partitions of the thread rows — due threads render from
  // followUps.due; awaiting-but-not-due ones live in Upcoming/the trays.
  const replyRows = railItems.filter((r) => r.status === "replied");
  const freshRows = railItems.filter(
    (r) => r.status === "none" || r.status === "archived",
  );
  // Open notes with a future date join the Scheduled list on the right.
  const futureNotes = futureDatedTodos(todos);

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
  // Deliberate holds leave the numbered list entirely — they render as dim ⏸
  // rows with their own guidance, and never count against "moves done".
  const isHeld = (i: (typeof items)[number]) =>
    i.mv.kind === "commitment" && !!STEP_HOLDS[i.mv.step.cardName];
  const heldItems = items.filter(isHeld);
  const activeItems = items.filter((i) => !isHeld(i));
  const pendingMoves = activeItems.filter((i) => !i.done);
  const doneMoves = activeItems.filter((i) => i.done);
  const laterTriage = triageList.slice(triageList[0] ? 1 : 0);

  // Open-ended threads (nobody owes a reply): partner threads render as rail
  // rows; account/custom threads get their own light rows with "+ new exchange".
  const openRailRows = railItems.filter((r) => r.status === "open");
  const openOther = followUps.open.filter((t) => t.kind !== "partner");

  // Roundup cadence — every 2 days per partner. The panel is a status readout:
  // when the last roundup went out, how long ago, how many accounts it carried
  // vs. the partner's total. Partners with nothing left to round up (all
  // accounts in motion/parked) drop off the list entirely.
  // Muted partners come off the roundup list (panel + rail rows) until
  // restored from the panel's "hidden" reveal. Stored as namespaced
  // AccountDisposition rows, so the set falls out of the same load.
  const ROUNDUP_MUTE = "roundup-mute:";
  const mutedRoundups = new Set(
    [...dispositions.keys()]
      .filter((k) => k.startsWith(ROUNDUP_MUTE))
      .map((k) => k.slice(ROUNDUP_MUTE.length)),
  );
  // Attention lights — flipped on from the switches in the Roundups gutter.
  const PARTNER_LIGHT = "partner-light:";
  const litPartners = new Set(
    [...dispositions.keys()]
      .filter((k) => k.startsWith(PARTNER_LIGHT))
      .map((k) => k.slice(PARTNER_LIGHT.length)),
  );
  const sendableByPartner = new Map(railItems.map((r) => [r.partner, r.sendable]));
  const cadence = kickoffItems
    .map(({ k, touch }) => {
      // "N of M teed up" was stamped on the touch at send time — the honest
      // "how many went out" count; current sendable is the fallback.
      const sentMatch = touch?.detail ? /^(\d+) of \d+/.exec(touch.detail) : null;
      return {
        partner: k.partner,
        total: k.accounts.length,
        sendable: sendableByPartner.get(k.partner) ?? 0,
        sentCount: sentMatch ? Number(sentMatch[1]) : null,
        lastSent: touch ? touch.contactedAt : "",
        daysAgo: touch ? daysSinceIso(touch.contactedAt) : null,
        due: roundupDue(touch),
        live: !!touch && touch.status !== "archived",
      };
    })
    .filter((c) => c.sendable > 0 || c.live);
  const cadenceVisible = cadence.filter((c) => !mutedRoundups.has(c.partner));
  const cadenceHidden = cadence.filter((c) => mutedRoundups.has(c.partner));
  const cadenceDueCount = cadenceVisible.filter((c) => c.due).length;
  const sortedFresh = [...freshRows]
    .filter((r) => !mutedRoundups.has(r.partner))
    .sort((a, b) => Number(b.cadenceDue ?? false) - Number(a.cadenceDue ?? false));
  const dueRoundupRows = sortedFresh.filter((r) => r.cadenceDue);
  const dueRoundupLabel = cadenceVisible
    .filter((c) => c.due)
    .map((c) => `${firstNameOf(c.partner)} (${c.sendable} ready)`)
    .join(" · ");

  // Ledger ordering: SEND → DECIDE → CLOSE; due threads split into real
  // chases (custom to-dos + named asks) vs quiet check-ins (nothing owed).
  const MV_RANK = { outreach: 0, triage: 1, commitment: 2 } as const;
  const pendingLedger = [...pendingMoves].sort(
    (x, y) => MV_RANK[x.mv.kind] - MV_RANK[y.mv.kind],
  );
  const dueAsks = followUps.due.filter(
    (t) => t.kind === "custom" || splitAsk(t.detail).ask,
  );
  const dueChecks = followUps.due.filter(
    (t) => t.kind !== "custom" && !splitAsk(t.detail).ask,
  );

  // ── The ledger's past events — everything that happened today, assembled
  // from every timestamped store. Routed/mirrored sheet notes report through
  // their note rows, so plain captures are the only todo-sourced events.
  const nowD = new Date();
  const nameOf = new Map(intel.map((a) => [a.id, a.name]));
  const events: LedgerEvent[] = [];
  const seenBodies = new Set<string>();
  for (const [accId, list] of acctNotes) {
    for (const n of list) {
      if (!sameLocalDayIso(n.createdAt, nowD)) continue;
      const acct = nameOf.get(accId) ?? "account";
      events.push({
        at: n.createdAt,
        kind: "note",
        text: `${n.kind === "partner" ? "Partner said" : "Note"} → ${acct}: ${n.body.slice(0, 70)}`,
        src: { store: "acct", id: n.id, body: n.body },
      });
      seenBodies.add(n.body);
    }
  }
  for (const [partner, list] of partnerNotes) {
    for (const n of list) {
      if (!sameLocalDayIso(n.createdAt, nowD) || seenBodies.has(n.body)) continue;
      events.push({
        at: n.createdAt,
        kind: "note",
        text: `Partner note → ${partner}: ${n.body.slice(0, 70)}`,
        src: { store: "partner", id: n.id, body: n.body },
      });
    }
  }
  // Sheet notes checked off today bop up here as done events — the ✓ is the
  // ledger moment. (Plain captures stay on the sheet; capturing isn't an event.)
  for (const t of todos) {
    if (!t.done || !sameLocalDayIso(t.updatedAt, nowD)) continue;
    events.push({
      at: t.updatedAt,
      kind: "done",
      text: `Done — ${visibleText(t.body).slice(0, 70)}`,
      src: { store: "todo", id: t.id, body: visibleText(t.body) },
    });
  }
  for (const t of touches) {
    if (sameLocalDayIso(t.contactedAt, nowD))
      events.push({
        at: t.contactedAt,
        kind: "send",
        text: `${
          t.kind === "partner"
            ? "Roundup"
            : t.kind === "account"
              ? "Outreach"
              : "Follow-up"
        } sent → ${t.label}`,
      });
    for (const e of t.log) {
      if (sameLocalDayIso(e.at, nowD))
        events.push({
          at: e.at,
          kind: "done",
          text: `Logged — ${t.label}: ${e.body.slice(0, 60)}`,
          src: { store: "touchLog", id: t.subjectKey, at: e.at, body: e.body },
        });
    }
  }
  for (const it of doneMoves) {
    if (it.mv.kind === "outreach") continue; // its touch event covers it
    const at = doneTimes.get(it.key) ?? "";
    if (!at || !sameLocalDayIso(at, nowD)) continue;
    events.push({
      at,
      kind: "done",
      text:
        it.mv.kind === "triage"
          ? `Decided ${it.mv.a.name}`
          : `Move done — ${it.mv.step.cardName}: ${it.mv.step.item}`,
    });
  }
  const pastEvents = sortEvents(events);
  const pastRecent = pastEvents.slice(-9);
  const pastEarlier = pastEvents.slice(0, -9);

  // ── Upcoming — dimmed future ledger rows: check-ins, roundup windows,
  // dated notes. This IS scheduled; rows join the open list on their day.
  type UpRow = {
    at: string;
    text: string;
    kind: "check" | "window" | "note";
    subjectKey?: string;
    partner?: string;
  };
  const upRows: UpRow[] = [
    ...followUps.upcoming.map((t) => {
      const ask = splitAsk(t.detail).ask;
      return {
        at: t.followUpAt,
        text:
          t.kind === "custom"
            ? t.label
            : `Check in with ${t.label} — cadence${ask ? ` · owes: ${ask}` : ""}`,
        kind: "check" as const,
        subjectKey: t.subjectKey,
      };
    }),
    ...futureNotes.map((n) => ({
      at: n.remindAt,
      text: visibleText(n.body).slice(0, 80),
      kind: "note" as const,
    })),
    ...cadenceVisible
      .filter((c) => !c.due && !c.live && c.lastSent)
      .map((c) => ({
        at: new Date(
          Date.parse(c.lastSent) + ROUNDUP_CADENCE_DAYS * 86_400_000,
        ).toISOString(),
        text: `Roundup window opens — ${c.partner} (${c.sendable} ready)`,
        kind: "window" as const,
        partner: c.partner,
      })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const upShown = upRows.slice(0, 6);

  // ── Focus accounts, flat — every kickoff account in one strip, score-sorted.
  const focusAccounts = kickoff
    .flatMap((k) => k.accounts.map((a) => ({ a, partner: k.partner })))
    .sort((x, y) => y.a.score - x.a.score);

  return (
    <>
      <AppWayfinder current="Today" />
      <main className={`${styles.wrap} ${styles.wrapWide}`}>
        <div className={`${styles.pageHead} ${styles.deskHead}`}>
          <h1 className={styles.h1}>Today</h1>
          <CurveballButton accounts={noteAccounts} />
          <span className={styles.deskHeadSf}>
            <SfCheckpoint when="standing" />
          </span>
        </div>

        {/* ── The tab left (the day as a ledger), the Day Sheet right,
               roundups & scheduled off-page in the edge trays. ── */}
        {/* ── The spine: a quiet strip on the left margin (red dot when
               something is past window); click pulls the curtain. ── */}
        <SpineRail hot={sop.commitmentsPastWindow > 0}>
          <div className={styles.curtainBig}>
            {[
              [String(sop.openLoops), "in flight", "live dashboard loops", ""],
              [
                String(sop.commitmentsPastWindow),
                "past window",
                `commitments open ${COMMITMENT_WINDOW_DAYS}d+`,
                sop.commitmentsPastWindow > 0 ? "hot" : "",
              ],
              [String(sop.untriaged), "to triage", "signals undecided", ""],
              [String(sop.moved), "moved this wk", "stages advanced", ""],
              [`${nar.researched}/${nar.total}`, "researched", "book coverage", ""],
              [String(nar.strongDemand), "strong", "trusted strong demand", ""],
              [String(nar.emerging), "emerging", "clearing the gate", ""],
              [`${nar.displacement}/${nar.greenfield}`, "displ/green", "play split", ""],
              [String(nar.hcmFunnel), "HCM", "HCM-funnel accounts", ""],
            ].map(([v, l, why, hot]) => (
              <span className={styles.curtainStat} key={l}>
                <b className={hot ? styles.spineHot : ""}>{v}</b>
                <span>{l}</span>
                <i>{why}</i>
              </span>
            ))}
          </div>
          {nar.topCountries.length > 0 && (
            <>
              <div className={styles.curtainH}>Where demand points</div>
              <div className={styles.ctyBar}>
                {nar.topCountries.map((c, i) => (
                  <span
                    key={c.name}
                    style={{
                      flex: c.count,
                      background: [
                        "#2563eb",
                        "#1a7f3c",
                        "#e6701e",
                        "#7c3aed",
                        "#dc2626",
                        "#0ea5e9",
                      ][i % 6],
                    }}
                  />
                ))}
              </div>
              <div className={styles.ctyLeg}>
                {nar.topCountries.map((c) => `${c.name} ${c.count}`).join(" · ")}
              </div>
            </>
          )}
          <div className={styles.curtainH}>Rooms</div>
          <div className={styles.ctyLeg}>
            <a href="#rooms">Aleks room ▸</a> &nbsp;{" "}
            <a href="#rooms">Narrative &amp; capture ▸</a> &nbsp;{" "}
            <a href="#rooms">How I work ▸</a>
          </div>
        </SpineRail>

        <div className={styles.cockpit}>
          {/* ══ LEFT — Today's tab: everything that happened above the
                 now-line, everything open below it ══ */}
          <div className={styles.cockCol}>
            <div className={styles.cockCap}>
              <span>Today&apos;s tab — the day as a ledger</span>
              <span className={styles.cockCapR}>
                happened above the line · open below it · {doneMoves.length} of{" "}
                {activeItems.length} moves done
              </span>
            </div>

            <div className={styles.atcRail}>
              {/* Past — what already happened today, oldest first. */}
              {pastEarlier.length > 0 && (
                <details className={styles.lgEarlier}>
                  <summary>earlier today ({pastEarlier.length}) ▸</summary>
                  {pastEarlier.map((e, i) => (
                    <PastRow key={`pe-${i}`} e={e} timeLabel={clockShort(e.at)} />
                  ))}
                </details>
              )}
              {pastRecent.map((e, i) => (
                <PastRow key={`pr-${i}`} e={e} timeLabel={clockShort(e.at)} />
              ))}
              {pastEvents.length === 0 && (
                <div className={`${styles.lgRow} ${styles.lgPast}`}>
                  <span className={styles.lgTm}></span>
                  <span className={`${styles.lgDot} ${styles.lgDotDone}`} />
                  <span className={styles.lgTx}>
                    Nothing on the tab yet — it fills as the day happens.
                  </span>
                </div>
              )}
              <div className={styles.lgNow}>
                <span className={styles.lgNowLab}>now</span>
                <span className={styles.lgNowLn} />
              </div>
              <div className={styles.lgSub}>Open — needs you</div>
              {/* Replies waiting on you — your move first. */}
              {replyRows.map((r) => (
                <LedgerRow
                  key={r.subjectKey}
                  tone="open"
                  kind="REPLY"
                  text={
                    <>
                      <b>{r.partner}</b> replied — draft the response
                    </>
                  }
                  textTitle={`${r.partner} replied — draft the response`}
                  primary={
                    <>
                      <a
                        href={r.draftHref}
                        className={`${styles.atcBtn} ${styles.atcHot}`}
                      >
                        ✍ Draft the reply
                      </a>
                      <form action={markResponded} className={styles.valInline}>
                        <input type="hidden" name="subjectKey" value={r.subjectKey} />
                        <button className={styles.atcBtn}>I replied ✓</button>
                      </form>
                    </>
                  }
                >
                  <AtcRow it={r} />
                </LedgerRow>
              ))}

              {/* Moves — SEND, then DECIDE, then CLOSE. Uniform ledger rows. */}
              {pendingLedger.map((it) => (
                <MorningMove
                  key={it.key}
                  mv={it.mv}
                  doneKey={it.key}
                  done={false}
                  touch={it.touch}
                  notes={
                    it.mv.kind === "commitment" ? [] : (acctNotes.get(it.mv.a.id) ?? [])
                  }
                />
              ))}

              {/* Deliberate holds — leadership said don't press. Quiet rows. */}
              {heldItems.map(({ mv, key }) => {
                if (mv.kind !== "commitment") return null;
                const hold = STEP_HOLDS[mv.step.cardName];
                return (
                  <LedgerRow
                    key={key}
                    tone="check"
                    kind="⏸ HOLD"
                    text={`${mv.step.cardName} — “${mv.step.item}” on hold`}
                    textTitle={`${mv.step.cardName} — “${mv.step.item}” on hold`}
                    meta={`dashboard · ${mv.step.nodeLabel} · ${hold.recheck}`}
                    primaryLabel="Open ▸"
                  >
                    <GuidanceBody
                      g={holdGuidance(mv.step, hold)}
                      term={mv.step.cardName}
                      href="/"
                    >
                      <div className={styles.gActions}>
                        <Link href="/" className={styles.mvOpen}>
                          Open on the dashboard
                        </Link>
                        <form action={toggleCheck} className={styles.commitmentClose}>
                          <input type="hidden" name="cardId" value={mv.step.cardId} />
                          <input type="hidden" name="node" value={mv.step.nodeKey} />
                          <input type="hidden" name="index" value={mv.step.index} />
                          <input type="hidden" name="returnTo" value="/today" />
                          <button className={styles.closeBtn}>
                            Hold cleared — check the step off
                          </button>
                        </form>
                      </div>
                    </GuidanceBody>
                  </LedgerRow>
                );
              })}

              {/* Chases — something NAMED is owed (custom to-dos + asks). */}
              {dueAsks.map((t) => {
                const ask = splitAsk(t.detail).ask;
                const isCustom = t.kind === "custom";
                const late = daysSinceIso(t.followUpAt);
                const text = isCustom ? (
                  <>
                    <b>You</b> owe: <span className={styles.owe}>{t.label}</span>
                  </>
                ) : (
                  <>
                    <b>{firstNameOf(t.label)}</b> owes:{" "}
                    <span className={styles.owe}>{ask}</span>
                  </>
                );
                return (
                  <LedgerRow
                    key={t.subjectKey}
                    tm={
                      isCustom
                        ? late > 0
                          ? `${late}d late`
                          : "today"
                        : `${daysSinceIso(t.contactedAt)}d`
                    }
                    tone="owed"
                    text={text}
                    textTitle={isCustom ? t.label : `${t.label} owes: ${ask}`}
                    meta={
                      isCustom
                        ? `due ${shortDate(t.followUpAt)}`
                        : `asked ${shortDate(t.contactedAt)}`
                    }
                    primary={
                      <form action={markReplied} className={styles.valInline}>
                        <input type="hidden" name="subjectKey" value={t.subjectKey} />
                        <button className={`${styles.atcBtn} ${styles.atcGo}`}>
                          Done ✓
                        </button>
                      </form>
                    }
                  >
                    {!isCustom && (
                      <form action={updateTouchAsk} className={styles.askForm}>
                        <input type="hidden" name="subjectKey" value={t.subjectKey} />
                        <input
                          name="ask"
                          defaultValue={ask}
                          maxLength={300}
                          placeholder="What exactly do they owe you? Clear it to stand down."
                          aria-label="What they owe"
                        />
                        <button className={styles.atcBtn}>Set the ask ✓</button>
                      </form>
                    )}
                    {!isCustom && (
                      <div className={styles.gActions}>
                        <form action={setThreadStatus} className={styles.valInline}>
                          <input type="hidden" name="subjectKey" value={t.subjectKey} />
                          <input type="hidden" name="status" value="open" />
                          <button
                            className={styles.notWaitingBtn}
                            title="Not waiting on a reply — stop chasing"
                          >
                            ↔ not waiting
                          </button>
                        </form>
                      </div>
                    )}
                    <FollowUpDue t={t} />
                  </LedgerRow>
                );
              })}

              {/* Roundups join the tab as ONE row, only when due. */}
              {dueRoundupRows.length > 0 && (
                <LedgerRow
                  tone="open"
                  kind="ROUNDUP"
                  text={`due: ${dueRoundupLabel}`}
                  textTitle={`Roundup due — ${dueRoundupLabel}`}
                  primaryLabel="Open ▸"
                  primaryHot
                >
                  {dueRoundupRows.map((r) => (
                    <AtcRow it={r} key={r.subjectKey} />
                  ))}
                </LedgerRow>
              )}

              {/* Check-ins due — cadence, nothing owed. Quiet until an ask
                  is named; ✓ closes the loop. */}
              {dueChecks.length > 0 && (
                <div className={styles.lgSub}>Check-ins due — cadence, nothing owed</div>
              )}
              {dueChecks.map((t) => (
                <LedgerRow
                  key={t.subjectKey}
                  tm={`${daysSinceIso(t.contactedAt)}d`}
                  tone="check"
                  text={
                    <>
                      Check in with <b>{t.label}</b>
                    </>
                  }
                  textTitle={`Check in with ${t.label}`}
                  meta={`asked ${shortDate(t.contactedAt)}`}
                  primary={
                    <form action={markReplied} className={styles.valInline}>
                      <input type="hidden" name="subjectKey" value={t.subjectKey} />
                      <button className={styles.atcBtn} title="Loop closed">
                        ✓
                      </button>
                    </form>
                  }
                  primaryLabel="name the ask ▸"
                >
                  <form action={updateTouchAsk} className={styles.askForm}>
                    <input type="hidden" name="subjectKey" value={t.subjectKey} />
                    <input
                      name="ask"
                      maxLength={300}
                      placeholder="What exactly do they owe you? Naming it makes this a chase."
                      aria-label="What they owe"
                    />
                    <button className={styles.atcBtn}>Set the ask ✓</button>
                  </form>
                  <div className={styles.gActions}>
                    <form action={setThreadStatus} className={styles.valInline}>
                      <input type="hidden" name="subjectKey" value={t.subjectKey} />
                      <input type="hidden" name="status" value="open" />
                      <button
                        className={styles.notWaitingBtn}
                        title="Not waiting on a reply — stop chasing"
                      >
                        ↔ not waiting
                      </button>
                    </form>
                  </div>
                  <FollowUpDue t={t} />
                </LedgerRow>
              ))}

              {activeItems.length === 0 &&
                followUps.due.length === 0 &&
                replyRows.length === 0 &&
                freshRows.length === 0 && (
                  <p className={`${styles.muted} ${styles.deckEmpty}`}>
                    Nothing needs you right now — no aging commitments, no untriaged
                    signals, no play waiting. Seed a signal from the{" "}
                    <Link href="/accounts">Account Room</Link> or advance a loop on the{" "}
                    <Link href="/">Dashboard</Link>.
                  </p>
                )}
              {activeItems.length > 0 && pendingMoves.length === 0 && (
                <p className={`${styles.mvAllDone} ${styles.deckEmpty}`}>
                  ✓ Every move is done. Nice work.
                </p>
              )}

              {/* Then, if there's time. */}
              {(laterTriage.length > 0 || dash.status === "active") && (
                <>
                  <div className={styles.lgSub}>
                    Then, if there&apos;s time (
                    {laterTriage.length + (dash.status === "active" ? 1 : 0)})
                  </div>
                  {laterTriage.map((a) => (
                    <LedgerRow
                      key={a.id}
                      tone="check"
                      text={
                        <Emph
                          text={`Decide on ${a.name} — seed it or park it`}
                          term={a.name}
                          href={`/accounts?focus=${a.id}`}
                        />
                      }
                      textTitle={`Decide on ${a.name} — seed it or park it`}
                      meta={`demand ${a.demand ?? "—"}${!isStrongSignal(a) ? " · emerging" : ""}`}
                      primaryLabel="Decide ▸"
                    >
                      <GuidanceBody
                        g={triageGuidance(a)}
                        term={a.name}
                        href={`/accounts?focus=${a.id}`}
                      >
                        {(acctNotes.get(a.id) ?? []).length > 0 && (
                          <NotesOnFile notes={acctNotes.get(a.id) ?? []} />
                        )}
                        <div className={styles.gActions}>
                          <SeedForm a={a} onBoard={false} label="Seed to dashboard" />
                          <ParkControl id={a.id} />
                        </div>
                      </GuidanceBody>
                    </LedgerRow>
                  ))}
                  <LedgerRow
                    tone="check"
                    text="Log a voice-of-the-base note"
                    primaryLabel="Open ▸"
                  >
                    <GuidanceBody g={voiceOfBaseGuidance()} term="" href="#capture">
                      <div className={styles.gActions}>
                        <Link href="#capture" className={styles.mvOpen}>
                          Log it in the capture box ↓
                        </Link>
                      </div>
                    </GuidanceBody>
                  </LedgerRow>
                </>
              )}

              {/* Upcoming — dimmed future ledger rows. This IS scheduled:
                  rows join the open list on their day. */}
              {upShown.length > 0 && (
                <>
                  <div className={styles.lgSub}>Upcoming — joins the tab when due</div>
                  {upShown.map((u, i) => (
                    <div
                      className={`${styles.lgRow} ${styles.lgUp}`}
                      key={`up-${u.at}-${i}`}
                    >
                      <span className={styles.lgTm}>{shortDate(u.at)}</span>
                      <span className={`${styles.lgDot} ${styles.lgDotUp}`} />
                      <span className={styles.lgTx} title={u.text}>
                        {u.text}
                      </span>
                      <span className={styles.lgAct}>
                        {u.kind === "check" && u.subjectKey && (
                          <>
                            <form action={bringFollowUpDue} className={styles.valInline}>
                              <input
                                type="hidden"
                                name="subjectKey"
                                value={u.subjectKey}
                              />
                              <button className={styles.fuUpBtn} title="Pull it to today">
                                ↑ now
                              </button>
                            </form>
                            <form action={deleteTouch} className={styles.valInline}>
                              <input
                                type="hidden"
                                name="subjectKey"
                                value={u.subjectKey}
                              />
                              <button
                                className={styles.fuUpDel}
                                title="Remove this check-in"
                              >
                                ✕
                              </button>
                            </form>
                          </>
                        )}
                        {u.kind === "window" && u.partner && (
                          <form action={muteRoundupPartner} className={styles.valInline}>
                            <input type="hidden" name="partner" value={u.partner} />
                            <button
                              className={styles.fuUpDel}
                              title="Take this partner off the roundup list"
                            >
                              ✕
                            </button>
                          </form>
                        )}
                      </span>
                    </div>
                  ))}
                  {upRows.length > upShown.length && (
                    <div className={styles.lgMore}>
                      +{upRows.length - upShown.length} more in the Scheduled tray →
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Focus accounts — flat, score-sorted; notes are ACCOUNT-level,
                inside each chip's popover. */}
            {focusAccounts.length > 0 && (
              <div className={styles.focusStrip}>
                <div className={styles.cockCap}>
                  <span>Focus accounts</span>
                  <span className={styles.cockCapR}>
                    {focusAccounts.length} accounts · ranked roster · click a row — notes
                    are account-level
                  </span>
                </div>
                <div className={styles.focusCols}>
                  {focusAccounts.map(({ a, partner }) => {
                    const dashCard = dash.cards.find(
                      (c) => !c.archived && c.name === a.name,
                    );
                    const lastNoteAt = acctNotes.get(a.id)?.[0]?.createdAt ?? null;
                    return (
                      <AccountChip
                        key={a.id}
                        account={{
                          id: a.id,
                          name: a.name,
                          score: a.score,
                          play: a.play,
                        }}
                        partner={partner}
                        tone={chipTone(lastNoteAt)}
                        lastNoteAt={lastNoteAt}
                        card={
                          dashCard
                            ? {
                                id: dashCard.id,
                                stages: DASH_NODES.map((n) => ({
                                  key: n.key,
                                  label: n.label,
                                  state: dashCard.states[n.key] ?? "todo",
                                })),
                              }
                            : null
                        }
                        seedSubtitle={`${a.csm}${a.industry ? ` · ${a.industry}` : ""}`}
                        seedDiscovery={seedFor(a)}
                        disposition={dispositions.get(a.id) ?? null}
                        notes={(acctNotes.get(a.id) ?? []).map((n) => ({
                          id: n.id,
                          kind: n.kind,
                          body: n.body,
                          createdAt: n.createdAt,
                        }))}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ══ RIGHT — the Day Sheet owns the second column ══ */}
          <div className={styles.cockColR}>
            <div className={styles.cockCap}>
              <span>Day sheet</span>
              <span className={styles.cockCapR}>
                everything lands here · route from here
              </span>
            </div>
            <DaySheet
              initialNotes={todos}
              accounts={noteAccounts}
              partners={kickoff.map((k) => k.partner)}
              dateLabel={todayLabel()}
            />
          </div>

          {/* ══ EDGE TRAYS — roundups & scheduled live off-page, flying out
                 over it. Due items ALSO sit on the tab; the trays are the
                 full pictures. ══ */}
          <EdgeTray
            tabs={[
              {
                key: "roundups",
                label: "Roundups",
                count: cadenceVisible.length,
                hot: cadenceDueCount > 0,
                body: (
                  <div className={styles.trayBody}>
                    <p className={styles.trayHint}>
                      every 2 days per partner · due roundups also sit on the tab · flip a
                      light to mark &quot;tend to something here&quot;
                    </p>
                    {cadenceVisible.map((c) => (
                      <div
                        key={c.partner}
                        className={`${styles.cadRow} ${
                          litPartners.has(c.partner) ? styles.cadRowLit : ""
                        }`}
                      >
                        <span
                          className={styles.cadDot}
                          style={{
                            background: c.due
                              ? "#dc2626"
                              : c.live
                                ? "#eab308"
                                : "#1a7f3c",
                          }}
                        />
                        <b>{c.partner}</b>
                        {litPartners.has(c.partner) && (
                          <span
                            className={styles.cadBulb}
                            title="Your light is on — something to tend to here"
                          />
                        )}
                        {c.due && <span className={styles.cadDue}>DUE</span>}
                        <span className={styles.cadMeta}>
                          {c.lastSent
                            ? `sent ${shortDate(c.lastSent)} · ${c.daysAgo}d ago · ${
                                c.sentCount != null ? c.sentCount : c.sendable
                              }/${c.total} accts`
                            : `never sent · ${c.sendable}/${c.total} accts ready`}
                        </span>
                        <form action={muteRoundupPartner} className={styles.valInline}>
                          <input type="hidden" name="partner" value={c.partner} />
                          <button
                            className={styles.cadHide}
                            title="Remove from the roundup list — restore anytime under hidden"
                          >
                            ✕
                          </button>
                        </form>
                        <form action={setPartnerLight} className={styles.lightFormIn}>
                          <input type="hidden" name="partner" value={c.partner} />
                          <input
                            type="hidden"
                            name="on"
                            value={litPartners.has(c.partner) ? "0" : "1"}
                          />
                          <button
                            className={`${styles.lightSwitch} ${
                              litPartners.has(c.partner) ? styles.lightOn : ""
                            }`}
                            title={
                              litPartners.has(c.partner)
                                ? `Flip the light off — done tending to ${c.partner}`
                                : `Flip the light on — something to tend to for ${c.partner}`
                            }
                          >
                            <span className={styles.lightKnob} />
                          </button>
                        </form>
                      </div>
                    ))}
                    {cadenceHidden.length > 0 && (
                      <details className={styles.cadHiddenWrap}>
                        <summary>hidden ({cadenceHidden.length}) ▸</summary>
                        {cadenceHidden.map((c) => (
                          <div key={c.partner} className={styles.cadRow}>
                            <span
                              className={styles.cadDot}
                              style={{ background: "#cbd5e1" }}
                            />
                            <b>{c.partner}</b>
                            <span className={styles.cadMeta}>
                              off the list · {c.sendable}/{c.total} accts
                            </span>
                            <form
                              action={unmuteRoundupPartner}
                              className={styles.valInline}
                            >
                              <input type="hidden" name="partner" value={c.partner} />
                              <button
                                className={styles.cadRestore}
                                title="Put this partner back on the roundup list"
                              >
                                ↩ restore
                              </button>
                            </form>
                          </div>
                        ))}
                      </details>
                    )}
                    {(openRailRows.length > 0 || openOther.length > 0) && (
                      <>
                        <div className={styles.deckGroupLab}>
                          open-ended threads ({openRailRows.length + openOther.length})
                        </div>
                        {openRailRows.map((r) => (
                          <AtcRow it={r} key={r.subjectKey} />
                        ))}
                        {openOther.map((t) => (
                          <div className={styles.openRow} key={t.subjectKey}>
                            <span
                              className={styles.atcDot}
                              style={{ background: "#cbd5e1" }}
                            />
                            <span className={styles.atcName}>{t.label}</span>
                            <form action={addTouchNote} className={styles.openExchange}>
                              <input
                                type="hidden"
                                name="subjectKey"
                                value={t.subjectKey}
                              />
                              <input
                                name="body"
                                required
                                maxLength={500}
                                placeholder="+ new exchange — what happened?"
                                aria-label="Log a new exchange"
                              />
                              <button className={styles.atcBtn}>Log ✓</button>
                            </form>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                ),
              },
              {
                key: "scheduled",
                label: "Scheduled",
                count: followUps.upcoming.length + futureNotes.length,
                body: (
                  <div className={styles.trayBody}>
                    <p className={styles.trayHint}>
                      never due — due things join the tab on their day
                    </p>
                    {followUps.upcoming.length === 0 && futureNotes.length === 0 && (
                      <p className={`${styles.muted} ${styles.deckEmpty}`}>
                        Nothing scheduled — log an outreach or add a check-in below.
                      </p>
                    )}
                    {groupUpcomingByDay(followUps.upcoming).map((g) => (
                      <div key={g.key}>
                        <div className={styles.deckGroupLab}>
                          {g.label} ({g.items.length})
                        </div>
                        {g.items.map((t) => (
                          <div className={styles.next48row} key={t.subjectKey}>
                            <span className={styles.next48body}>
                              <b>{t.label}</b>
                              {splitAsk(t.detail).ask
                                ? ` · owes: ${splitAsk(t.detail).ask}`
                                : ""}
                              <span className={styles.next48when}>
                                {" "}
                                — {shortDate(t.followUpAt)}
                              </span>
                            </span>
                            <form action={markReplied} className={styles.valInline}>
                              <input
                                type="hidden"
                                name="subjectKey"
                                value={t.subjectKey}
                              />
                              <button
                                className={styles.fuUpDone}
                                title="Close it — already done"
                              >
                                Done ✓
                              </button>
                            </form>
                            <form action={bringFollowUpDue} className={styles.valInline}>
                              <input
                                type="hidden"
                                name="subjectKey"
                                value={t.subjectKey}
                              />
                              <button
                                className={styles.fuUpBtn}
                                title="Bring the check-in to today"
                              >
                                ↑ Now
                              </button>
                            </form>
                            <form action={deleteTouch} className={styles.valInline}>
                              <input
                                type="hidden"
                                name="subjectKey"
                                value={t.subjectKey}
                              />
                              <button
                                className={styles.fuUpDel}
                                title="Remove this follow-up"
                              >
                                ✕
                              </button>
                            </form>
                          </div>
                        ))}
                      </div>
                    ))}
                    {futureNotes.length > 0 && (
                      <>
                        <div className={styles.deckGroupLab}>
                          Dated notes ({futureNotes.length})
                        </div>
                        {futureNotes.map((n) => (
                          <div className={styles.next48row} key={n.id}>
                            <span className={styles.next48body}>
                              📝 {visibleText(n.body).slice(0, 90) || "(empty note)"}
                              <span className={styles.next48when}>
                                {" "}
                                — {shortDate(n.remindAt)}
                              </span>
                            </span>
                          </div>
                        ))}
                      </>
                    )}
                    <form action={addFollowUp} className={styles.fuAdd}>
                      <input
                        name="label"
                        required
                        maxLength={200}
                        placeholder="Add a check-in…"
                        aria-label="Add a follow-up"
                      />
                      <select name="when" defaultValue="tomorrow" aria-label="When">
                        <option value="today">later today</option>
                        <option value="tomorrow">tomorrow</option>
                      </select>
                      <button className={styles.fuAddBtn}>Add</button>
                    </form>
                    {followUps.replied.length > 0 && (
                      <details className={styles.fuDone}>
                        <summary className={styles.fuDoneHead}>
                          done ({followUps.replied.length}) ▸
                        </summary>
                        <ul className={styles.fuDoneList}>
                          {followUps.replied.map((t) => (
                            <li key={t.subjectKey}>
                              <span className={styles.fuUpWho}>{t.label}</span>
                              <span className={styles.fuUpWhen}>
                                {" "}
                                — contacted {shortDate(t.contactedAt)}
                              </span>
                              <span className={styles.fuUpActions}>
                                <form
                                  action={bringFollowUpDue}
                                  className={styles.valInline}
                                >
                                  <input
                                    type="hidden"
                                    name="subjectKey"
                                    value={t.subjectKey}
                                  />
                                  <button
                                    className={styles.fuUpBtn}
                                    title="Reopen — bring it back due"
                                  >
                                    Reopen
                                  </button>
                                </form>
                                <form action={deleteTouch} className={styles.valInline}>
                                  <input
                                    type="hidden"
                                    name="subjectKey"
                                    value={t.subjectKey}
                                  />
                                  <button
                                    className={styles.fuUpDel}
                                    title="Remove entirely"
                                  >
                                    Delete
                                  </button>
                                </form>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                ),
              },
            ]}
          />

          {/* ══ BRIEF — the bar + drawers (full width) ══ */}
          <div className={styles.cockWide} id="rooms">
            <CockpitDrawers
              stats={null}
              aleks={
                <>
                  {/* One home for everything Aleks: the prep line (from
                      Narrative), the standing agenda (from Plan), and the
                      session records. */}
                  <div className={styles.narGuides}>
                    <GuidedBlock
                      title="Carry this into the Aleks 1:1"
                      g={aleksLineGuidance(nar, move)}
                      term={move?.name ?? ""}
                      href={move ? `/accounts?focus=${move.id}` : "#"}
                    />
                  </div>
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
                        <b>Market signal</b> — the one thing the base is telling us (voice
                        of the base).
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
                        <b>The narrative up</b> — the one line she carries to her
                        leadership.
                      </li>
                    </ol>
                    <p className={styles.muted}>
                      PEPM = per employee, per month — the unit EOR and global payroll
                      price on. Keep the deal math in those terms when you brief her.
                    </p>
                  </div>
                  {ALEKS_SESSIONS.map((s) => (
                    <section key={s.date} className={styles.prCard}>
                      <div className={styles.pageHead}>
                        <h2 className={styles.h2}>1:1 with Aleks — {s.label}</h2>
                        <p className={styles.sub}>
                          Call notes with what each changes, then the brief as carried in.
                        </p>
                      </div>
                      <div className={styles.aleksNotes}>
                        {s.callNotes.map((n, i) => (
                          <div key={i} className={styles.aleksNote}>
                            <div className={styles.aleksNoteBody}>{n.note}</div>
                            {n.action && (
                              <div className={styles.aleksNoteAction}>→ {n.action}</div>
                            )}
                          </div>
                        ))}
                      </div>
                      <details className={styles.aleksBrief}>
                        <summary>The brief I brought in</summary>
                        {s.brief.map((sec) => (
                          <div key={sec.title} className={styles.aleksBriefSec}>
                            <div className={styles.aleksBriefTitle}>{sec.title}</div>
                            <ul>
                              {sec.bullets.map((b, i) => (
                                <li key={i}>{b}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </details>
                    </section>
                  ))}
                </>
              }
              narrative={
                <>
                  {/* ── Band 4 · Narrative forming ─────────────────────────── */}
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

                  {/* ── Voice of the base & enablement gaps (capture) ──────── */}
                  <h2 id="capture" className={styles.h2}>
                    Voice of the base &amp; enablement gaps
                  </h2>
                  <p className={styles.sub}>
                    The running list you carry into the Aleks 1:1 and to marketing — what
                    the base keeps asking for, what&apos;s missing to arm partners, and
                    what you need from the org. Resolve an item once you&apos;ve raised
                    it.
                  </p>
                  <div className={styles.notesWrap}>
                    {!notes.available && (
                      <p className={styles.muted}>
                        Capture isn&apos;t connected yet — run{" "}
                        <code>docs/dashboard-tables.sql</code> in Supabase to start
                        logging.
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

                  {/* ── HCM funnel + parked signals (reference) ────────────── */}
                  {hcm.length > 0 && (
                    <div className={styles.hcmStrip}>
                      <span className={styles.hcmLabel}>
                        HCM funnel ({hcmAll.length}) — top {hcm.length}, routes to you
                        directly:
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
              doctrine={
                <>
                  {/* ── The daily loop ─────────────────────────────────────── */}
                  <h2 className={styles.h2}>The three questions I run every day</h2>
                  <div className={styles.cards}>
                    <div className={styles.card}>
                      <h3>1 · What changed in the base?</h3>
                      <p className={styles.muted}>
                        New global-hiring evidence, a partner flag, an inbound.{" "}
                        <b>Read</b> the signal before anything else — the Do rail is the
                        answer.
                      </p>
                    </div>
                    <div className={styles.card}>
                      <h3>2 · What do I owe, and who do I clear?</h3>
                      <p className={styles.muted}>
                        <b>Route</b> through the partner. Clear the commitments and
                        chases, and never jump a client before the CSM has cleared them.
                      </p>
                    </div>
                    <div className={styles.card}>
                      <h3>3 · What language drums up the intent?</h3>
                      <p className={styles.muted}>
                        The partner question: what do I say to{" "}
                        <b>gauge, drum up, or campaign</b> a client&apos;s interest in
                        Global? <b>Record</b> the answer on the Dashboard node.
                      </p>
                    </div>
                  </div>

                  {/* ── 30 / 60 / 90 ───────────────────────────────────────── */}
                  <h2 className={styles.h2}>30 / 60 / 90</h2>
                  <div className={styles.plan}>
                    <div className={styles.planCol}>
                      <div className={styles.planNum}>First 30</div>
                      <div className={styles.planTheme}>
                        Learn the base · arm the partners
                      </div>
                      <ul>
                        <li>
                          Build out the Account Room — my private targeting intel on the
                          whole base.
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
                          First tailored demos delivered — countries and worker types
                          matched.
                        </li>
                        <li>
                          A repeatable partner-brief motion (the same three questions
                          every time).
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
                          A documented displacement + greenfield play I can hand any
                          partner.
                        </li>
                        <li>A standing lunch-and-learn / SME webinar cadence.</li>
                        <li>A weekly base-signal digest that Aleks can carry upward.</li>
                      </ul>
                    </div>
                  </div>
                </>
              }
            />
          </div>
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
