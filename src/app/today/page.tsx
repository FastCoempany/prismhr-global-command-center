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
  loadPartnerNotes,
  loadSnoozes,
  loadTodos,
  loadTouches,
  loadValidations,
} from "@/lib/today/overlay";
import { DASH_NODES } from "@/lib/dashboard/stages";
import { AccountChip } from "./account-chip";
import { AtcRow, CurveballButton, type RailItem } from "./atc-rail";
import { CockpitDrawers } from "./cockpit-drawers";
import { DeckRow, type DeckKind } from "./deck-row";
import {
  daysSinceIso,
  followUpMessage,
  futureDatedTodos,
  groupUpcomingByDay,
  isDue,
  outreachSubjectKey,
  partitionFollowUps,
  roundupDue,
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
import { addCard, toggleCheck } from "../dashboard/actions";
import {
  addFieldNote,
  addFollowUp,
  addTouchNote,
  bringFollowUpDue,
  delayFollowUp,
  deleteTouch,
  markReplied,
  muteRoundupPartner,
  resolveFieldNote,
  setThreadStatus,
  snoozeSignal,
  toggleTaskDone,
  unmuteRoundupPartner,
  unsnoozeSignal,
} from "./actions";
import { DaySheet } from "./day-sheet";
import { PartnerNotes } from "./partner-notes";
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
  n,
  doneKey,
  done,
  touch,
  notes = [],
}: {
  mv: Mv;
  n: number;
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
    meta = `dashboard · ${s.nodeLabel}${
      s.ageDays != null ? ` · ${s.ageDays === 0 ? "today" : `${s.ageDays}d open`}` : ""
    }`;
    // The one button: mark the morning move done. Checking the step off on the
    // board itself stays in the expansion.
    primary = (
      <form action={toggleTaskDone} className={styles.valInline}>
        <input type="hidden" name="key" value={doneKey} />
        <button className={`${styles.atcBtn} ${styles.atcGo}`}>Mark done ✓</button>
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

  return (
    <DeckRow
      num={n}
      kind={kind}
      phrase={<Emph text={g.do} term={term} href={href} />}
      meta={meta}
      primaryLabel={primaryLabel}
      primaryHot={isOutreach}
      primary={primary}
    >
      {sfCheck}
      <GuidanceBody g={g} term={term} href={href} sayNode={sayNode}>
        {notes.length > 0 && <NotesOnFile notes={notes} />}
        {actions}
      </GuidanceBody>
    </DeckRow>
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
    weekday: "short",
    month: "short",
    day: "numeric",
  });
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
        <main className={styles.wrap}>
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
  const kickoffTotal = kickoff.reduce((n, k) => n + k.accounts.length, 0);
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
  const railDot = new Map(railItems.map((r) => [r.partner, r.dot]));

  // Cockpit partitions of the thread rows. Threads that are DUE render as
  // chase cards (from followUps.due, which also carries custom follow-ups),
  // so the rail skips them here to keep exactly one home per object.
  const dueKeys = new Set(followUps.due.map((t) => t.subjectKey));
  const replyRows = railItems.filter((r) => r.status === "replied");
  const freshRows = railItems.filter(
    (r) => r.status === "none" || r.status === "archived",
  );
  const waitingRows = railItems.filter(
    (r) =>
      (r.status === "awaiting" || r.status === "responded") && !dueKeys.has(r.subjectKey),
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

  return (
    <>
      <AppWayfinder current="Today" />
      <main className={styles.wrap}>
        <div className={`${styles.pageHead} ${styles.deskHead}`}>
          <h1 className={styles.h1}>Today</h1>
          <CurveballButton accounts={noteAccounts} />
          <span className={styles.deskHeadSf}>
            <SfCheckpoint when="standing" />
          </span>
        </div>

        {/* ── The Day Sheet: everything you type lands here and stays here. ── */}
        <DaySheet
          initialNotes={todos}
          accounts={noteAccounts}
          partners={kickoff.map((k) => k.partner)}
          dateLabel={todayLabel()}
        />

        {/* ── The cockpit: no tabs. DO on the left, TRACK on the right, BRIEF
               as a bar + drawers below. Every element of the old six tabs has
               a home here — nothing was dropped. ─────────────────────────── */}
        <div className={styles.cockpit}>
          {/* ══ LEFT — DO: everything that needs you, in one rail ══ */}
          <div className={styles.cockCol}>
            <div className={styles.cockCap}>
              <span>Do — everything that needs you</span>
              <span className={styles.cockCapR}>
                {doneMoves.length} of {activeItems.length} moves done · all on screen
              </span>
            </div>

            <div className={styles.atcRail}>
              {/* Replies waiting on you — your move. */}
              {replyRows.length > 0 && (
                <div className={`${styles.famStrip} ${styles.famReply}`}>
                  Your move — they&apos;re waiting on you
                  <span className={styles.famN}>({replyRows.length})</span>
                </div>
              )}
              {replyRows.map((r) => (
                <div className={styles.spineReply} key={r.subjectKey}>
                  <AtcRow it={r} />
                </div>
              ))}

              {/* Chases — check-ins that are DUE. The expansion is the full
                  follow-up card: what you sent, the log, the ready nudge,
                  delay, and log-what-happened. */}
              {followUps.due.length > 0 && (
                <div className={`${styles.famStrip} ${styles.famChase}`}>
                  Chase — check-ins due
                  <span className={styles.famN}>({followUps.due.length})</span>
                </div>
              )}
              {followUps.due.map((t) => (
                <div className={styles.spineChase} key={t.subjectKey}>
                  <DeckRow
                    num="!"
                    kind="chase"
                    phrase={t.kind === "custom" ? t.label : `Check-in due: ${t.label}`}
                    meta={
                      t.kind === "custom"
                        ? `due ${shortDate(t.followUpAt)}`
                        : `last contacted ${shortDate(t.contactedAt)} · due now`
                    }
                    primary={
                      <>
                        <form action={markReplied} className={styles.valInline}>
                          <input type="hidden" name="subjectKey" value={t.subjectKey} />
                          <button className={`${styles.atcBtn} ${styles.atcGo}`}>
                            {t.kind === "custom" ? "Done ✓" : "They replied ✓"}
                          </button>
                        </form>
                        {t.kind !== "custom" && (
                          <form action={setThreadStatus} className={styles.valInline}>
                            <input type="hidden" name="subjectKey" value={t.subjectKey} />
                            <input type="hidden" name="status" value="open" />
                            <button
                              className={styles.notWaitingBtn}
                              title="Not waiting on a reply — stop chasing; log the next exchange when it lands"
                            >
                              ↔ not waiting
                            </button>
                          </form>
                        )}
                      </>
                    }
                    primaryLabel="Nudge ▸"
                    primaryHot
                  >
                    <FollowUpDue t={t} />
                  </DeckRow>
                </div>
              ))}

              {/* Moves — send / decide / close, in order. All on screen. */}
              {(pendingMoves.length > 0 || heldItems.length > 0) && (
                <div className={`${styles.famStrip} ${styles.famMove}`}>
                  Moves — send · decide · close
                  <span className={styles.famN}>
                    ({pendingMoves.length}
                    {heldItems.length ? ` + ${heldItems.length} held` : ""} — all shown)
                  </span>
                </div>
              )}
              {pendingMoves.map((it, i) => (
                <div className={styles.spineMove} key={it.key}>
                  <MorningMove
                    mv={it.mv}
                    n={i + 1}
                    doneKey={it.key}
                    done={false}
                    touch={it.touch}
                    notes={
                      it.mv.kind === "commitment" ? [] : (acctNotes.get(it.mv.a.id) ?? [])
                    }
                  />
                </div>
              ))}
              {/* Deliberate holds — leadership said don't press. Dim ⏸ rows,
                  out of the numbering; the guidance owns the re-check date. */}
              {heldItems.map(({ mv, key }) => {
                if (mv.kind !== "commitment") return null;
                const hold = STEP_HOLDS[mv.step.cardName];
                return (
                  <div className={`${styles.spineMove} ${styles.waitDim}`} key={key}>
                    <DeckRow
                      num="⏸"
                      kind="close"
                      phrase={
                        <Emph
                          text={`${mv.step.cardName} — “${mv.step.item}” on hold`}
                          term={mv.step.cardName}
                          href="/"
                        />
                      }
                      meta={`dashboard · ${mv.step.nodeLabel} · ${hold.recheck}`}
                      primaryLabel="Open ▾"
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
                    </DeckRow>
                  </div>
                );
              })}

              {/* Roundups — the standing 2-day partner cadence. Fresh cards
                  surface here; past-cadence ones read as DUE, not optional. */}
              {sortedFresh.length > 0 && (
                <div className={`${styles.famStrip} ${styles.famRound}`}>
                  Roundups — 2-day partner cadence
                  <span className={styles.famN}>
                    ({cadenceDueCount} due · {sortedFresh.length} ready)
                  </span>
                </div>
              )}
              {sortedFresh.map((r) => (
                <div className={styles.spineRound} key={r.subjectKey}>
                  <AtcRow it={r} />
                </div>
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

              {/* Waiting on them + open-ended — cadence armed or deliberately off. */}
              {waitingRows.length + openRailRows.length + openOther.length > 0 && (
                <>
                  <div className={`${styles.famStrip} ${styles.famWait}`}>
                    Waiting on them · open-ended
                    <span className={styles.famN}>
                      ({waitingRows.length + openRailRows.length + openOther.length})
                    </span>
                  </div>
                  {waitingRows.map((r) => (
                    <div className={styles.waitDim} key={r.subjectKey}>
                      <AtcRow it={r} />
                    </div>
                  ))}
                  {openRailRows.map((r) => (
                    <div className={styles.waitDim} key={r.subjectKey}>
                      <AtcRow it={r} />
                    </div>
                  ))}
                  {openOther.map((t) => (
                    <div
                      className={`${styles.waitDim} ${styles.openRow}`}
                      key={t.subjectKey}
                    >
                      <span className={styles.atcDot} style={{ background: "#cbd5e1" }} />
                      <span className={styles.atcName}>{t.label}</span>
                      <span className={styles.atcPhrase}>
                        open-ended — not waiting on a reply
                      </span>
                      <form action={addTouchNote} className={styles.openExchange}>
                        <input type="hidden" name="subjectKey" value={t.subjectKey} />
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

              {/* Then, if there's time. */}
              {(laterTriage.length > 0 || dash.status === "active") && (
                <>
                  <div className={styles.deckGroupLab}>
                    Then, if there&apos;s time (
                    {laterTriage.length + (dash.status === "active" ? 1 : 0)})
                  </div>
                  {laterTriage.map((a) => (
                    <DeckRow
                      key={a.id}
                      num="·"
                      kind="decide"
                      phrase={
                        <Emph
                          text={`Decide on ${a.name} — seed it or park it`}
                          term={a.name}
                          href={`/accounts?focus=${a.id}`}
                        />
                      }
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
                    </DeckRow>
                  ))}
                  <DeckRow
                    num="·"
                    kind="note"
                    phrase="Log a voice-of-the-base note"
                    primaryLabel="Open ▸"
                  >
                    <GuidanceBody g={voiceOfBaseGuidance()} term="" href="#capture">
                      <div className={styles.gActions}>
                        <Link href="#capture" className={styles.mvOpen}>
                          Log it in the capture box ↓
                        </Link>
                      </div>
                    </GuidanceBody>
                  </DeckRow>
                </>
              )}

              {/* Done today. */}
              {doneMoves.length > 0 && (
                <>
                  <div className={styles.deckGroupLab}>Done ({doneMoves.length})</div>
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
                </>
              )}
            </div>
          </div>

          {/* ══ RIGHT — TRACK: the future, the cadence, the reference ══ */}
          <div className={styles.cockColR}>
            {/* Roundup cadence — every partner, every 2 days. Due partners are
                also hot rows in the rail; this is the at-a-glance meter. */}
            <div className={styles.cockSect}>
              <div className={styles.cockCap}>
                Roundups
                <span className={styles.cockCapR}>
                  every 2 days · {cadenceDueCount} due
                </span>
              </div>
              <div className={styles.cadPanel}>
                {cadenceVisible.map((c) => (
                  <div key={c.partner} className={styles.cadRow}>
                    <span
                      className={styles.cadDot}
                      style={{
                        background: c.due ? "#dc2626" : c.live ? "#eab308" : "#1a7f3c",
                      }}
                      title={
                        c.due
                          ? "New roundup due"
                          : c.live
                            ? "Conversation open — no new roundup stacks on a live thread"
                            : "Fresh — inside the 2-day cadence"
                      }
                    />
                    <b>{c.partner}</b>
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
                  </div>
                ))}
                {cadenceVisible.length === 0 && (
                  <p className={styles.muted}>
                    Nothing to round up — every account is in motion or parked.
                  </p>
                )}
                {cadenceHidden.length > 0 && (
                  <details className={styles.cadHiddenWrap}>
                    <summary>hidden ({cadenceHidden.length}) ▸</summary>
                    {cadenceHidden.map((c) => (
                      <div key={c.partner} className={styles.cadRow}>
                        <span
                          className={styles.cadDot}
                          style={{ background: "#cbd5e1" }}
                          title="Off the roundup list"
                        />
                        <b>{c.partner}</b>
                        <span className={styles.cadMeta}>
                          off the list · {c.sendable}/{c.total} accts
                        </span>
                        <form action={unmuteRoundupPartner} className={styles.valInline}>
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
              </div>
            </div>

            {/* Scheduled — upcoming check-ins + future-dated notes. Nothing
                here is ever due: due things are chases on the left. */}
            <div className={styles.cockSect}>
              <div className={styles.cockCap}>
                Scheduled
                <span className={styles.cockCapR}>
                  {followUps.upcoming.length} check-in
                  {followUps.upcoming.length === 1 ? "" : "s"}
                  {futureNotes.length > 0 ? ` · ${futureNotes.length} dated notes` : ""}
                </span>
              </div>
              <div className={styles.atcRail}>
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
                          {t.detail ? ` · ${t.detail}` : ""}
                          <span className={styles.next48when}>
                            {" "}
                            — {shortDate(t.followUpAt)}
                          </span>
                        </span>
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
                            ↑ Now
                          </button>
                        </form>
                        <form action={deleteTouch} className={styles.valInline}>
                          <input type="hidden" name="subjectKey" value={t.subjectKey} />
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
              </div>
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
                </details>
              )}
            </div>

            {/* Focus accounts — reference per partner (chips + notes strips). */}
            {kickoff.length > 0 && (
              <div className={styles.cockSect}>
                <div className={styles.cockCap}>
                  Focus accounts
                  <span className={styles.cockCapR}>
                    {kickoffTotal} accounts · {kickoffItems.length} partners
                  </span>
                </div>
                <div className={`${styles.atcRefGroup} ${styles.focusMini}`}>
                  <div className={styles.atcRefBody}>
                    {kickoffItems.map(({ k }) => (
                      <div key={k.partner} className={styles.kickoffPartner}>
                        <div className={styles.kickoffPartnerHead}>
                          <span
                            className={styles.atcDot}
                            style={{
                              background:
                                railDot.get(k.partner) === "green"
                                  ? "#22c55e"
                                  : railDot.get(k.partner) === "orange"
                                    ? "#e6701e"
                                    : railDot.get(k.partner) === "grey"
                                      ? "#cbd5e1"
                                      : "#eab308",
                            }}
                          />
                          <span className={styles.kickoffPartnerName}>{k.partner}</span>
                          <span className={styles.kickoffPartnerRole}>{k.role}</span>
                          <Link
                            href={`/partners#${encodeURIComponent(k.partner)}`}
                            className={styles.kickoffRoomLink}
                            title="Every outreach and note for this partner, timestamped"
                          >
                            Partner room →
                          </Link>
                          <div className={styles.kickoffAccts}>
                            {k.accounts.map((a) => {
                              const dashCard = dash.cards.find(
                                (c) => !c.archived && c.name === a.name,
                              );
                              const lastNoteAt =
                                acctNotes.get(a.id)?.[0]?.createdAt ?? null;
                              return (
                                <AccountChip
                                  key={a.id}
                                  account={{
                                    id: a.id,
                                    name: a.name,
                                    score: a.score,
                                    play: a.play,
                                  }}
                                  partner={k.partner}
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
                                />
                              );
                            })}
                          </div>
                        </div>
                        <PartnerNotes
                          partner={k.partner}
                          notes={(partnerNotes.get(k.partner) ?? []).map((n) => ({
                            id: n.id,
                            body: n.body,
                            createdAt: n.createdAt,
                          }))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ══ BRIEF — the bar + drawers (full width) ══ */}
          <div className={styles.cockWide}>
            <CockpitDrawers
              stats={
                <>
                  <span className={styles.bnum}>
                    <b>{sop.openLoops}</b>in flight
                  </span>
                  <span
                    className={
                      sop.commitmentsPastWindow > 0 ? styles.bnumHot : styles.bnum
                    }
                  >
                    <b>{sop.commitmentsPastWindow}</b>past window
                  </span>
                  <span className={styles.bnum}>
                    <b>{sop.untriaged}</b>to triage
                  </span>
                  <span className={styles.bnum}>
                    <b>{sop.moved}</b>moved this wk
                  </span>
                  <span className={styles.briefSep} />
                  <span className={styles.bnum}>
                    <b>
                      {nar.researched}/{nar.total}
                    </b>
                    researched
                  </span>
                  <span className={styles.bnum}>
                    <b>{nar.strongDemand}</b>strong
                  </span>
                  <span className={styles.bnum}>
                    <b>{nar.emerging}</b>emerging
                  </span>
                  <span className={styles.bnum}>
                    <b>
                      {nar.displacement}/{nar.greenfield}
                    </b>
                    displ/green
                  </span>
                  <span className={styles.bnum}>
                    <b>{hcmAll.length}</b>HCM
                  </span>
                  {nar.topCountries.length > 0 && (
                    <span className={styles.briefCountries}>
                      {nar.topCountries.map((c) => `${c.name} ${c.count}`).join(" · ")}
                    </span>
                  )}
                </>
              }
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
