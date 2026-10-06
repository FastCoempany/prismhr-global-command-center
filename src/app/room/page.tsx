import Link from "next/link";
import { DM_Serif_Display, JetBrains_Mono, Public_Sans } from "next/font/google";
import { AppWayfinder } from "@/components/app-wayfinder";
import { loadDashboard } from "@/lib/dashboard/data";
import { csms, peos } from "@/lib/book";
import { DROP_STALE_DAYS, fetchSecondRecords, theirsLine } from "@/lib/activity/read";
import { EXTRA_PARTNERS } from "@/lib/book/partners";
import { contactsFor, knownPeople } from "@/lib/book/contacts";
import {
  loadAccountNotes,
  loadDispositions,
  loadDoneKeys,
  loadSnoozes,
  loadTodos,
  loadTouches,
  loadValidations,
} from "@/lib/today/overlay";
import {
  accountIntel,
  applyValidations,
  cardNextStep,
  morningDoneKey,
  partnerKickoff,
  partnerOutreachKey,
  latestLineByAccount,
  roundupBullets,
  roundupFrame,
  signals,
  partitionSignals,
  triageDoneKey,
} from "@/lib/today/build";
import { partitionFollowUps, roundupDue } from "@/lib/today/follow-ups";
import { followUpRowsFor, knownOrgNames, splitTouches } from "@/lib/today/followup-rows";
import { splitAsk } from "@/lib/today/ledger";
import { DASH_NODES } from "@/lib/dashboard/stages";
import { readAccount, secondRecordFor } from "@/lib/record/read";
import { shortName } from "@/lib/ingest/guard";
import { digestFor, digestForCardName } from "@/lib/intel/digest";
import { COUNTRY_NAME } from "@/lib/intel/lexicon";
import { suggestChecks } from "@/lib/intel/evidence";
import { daysBetween, meterRead, readDeal, type RoomRead } from "@/lib/room/engine";
import { moveDoneKey } from "@/lib/room/bind";
import { buildStageRail } from "@/lib/room/stages-view";
import { buildAccountSheet } from "@/lib/room/sheet-view";
import { liveMotionIds } from "@/lib/groundwork/day";
import { groundworkDoneKey } from "@/lib/groundwork/file";
import { SEAT_NS } from "@/lib/act/lane";
import { readLoss } from "@/lib/room/loss";
import { GAP_DISMISS, readGaps } from "@/lib/room/gaps";
import { latestResearchAt, researchNs } from "@/lib/intel/deep-research";
import { getDemand, researchGeneratedAt } from "@/lib/book/research";
import { readOutcome } from "@/lib/dashboard/outcome";
import { owedToMe } from "@/lib/room/owed";
import { settledByRecord } from "@/lib/room/settled";
import { GLOBAL_SCENT_RE } from "@/lib/intel/provenance";
import { askHref, peerQuestions, scopedAsk } from "@/lib/intranet/bridges";
import { sfAccountUrl } from "@/lib/salesforce";
import { prospectAsks } from "@/lib/intranet/store";
import { Chute } from "./chute";
import { buildPipelineReport, homeSideFrom, rankPipeline } from "@/lib/pipeline/build";
import { collectPipelineAccounts, pipelineDayLabel } from "@/lib/pipeline/collect";
import {
  RoomClient,
  type CadenceRow,
  type CheckinRow,
  type FollowUpRow,
  type LaterRow,
  type RoomRow,
  type WarmRow,
} from "./room-client";
import styles from "./room.module.css";

export const dynamic = "force-dynamic";
// A distillation pass (activityRun via the Chute) runs to a 220s deadline —
// the platform's default window would kill it mid-account.
export const maxDuration = 300;

const serif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--f-serif",
});
const sans = Public_Sans({ subsets: ["latin"], variable: "--f-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--f-mono" });

const HEALTH_ORDER = { red: 0, amber: 1, green: 2, quiet: 3 } as const;

function firstName(s: string): string {
  return (s ?? "").trim().split(/\s+/)[0] ?? "";
}
export default async function RoomPage() {
  const data = await loadDashboard();
  if (data.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="HomeRoom" />
        <main className={styles.gate}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }

  const [notesById, touches, todos, dispositions, snoozes, validations, doneKeys] =
    await Promise.all([
      loadAccountNotes(),
      loadTouches(),
      loadTodos(),
      loadDispositions(),
      loadSnoozes(),
      loadValidations(),
      loadDoneKeys(),
    ]);
  const idByName = new Map(peos.map((p) => [p.name.toLowerCase(), p.id]));
  const peoById = new Map(peos.map((p) => [p.id, p]));
  const touchMap = new Map(touches.map((t) => [t.subjectKey, t]));
  const now = new Date();

  // Who counts as our side, read over the WHOLE book — the CSM column plus
  // everyone the record shows working across several accounts. The inbound
  // test needs it to tell a reply that reached us from a thread between two of
  // the account's own people (Infiniti HR, 2026-09-15). Built once here rather
  // than per row; the pipeline report below reuses it.
  const homeSide = homeSideFrom(notesById);
  const ourSide = [...csms, ...homeSide];

  // Phase 13.6 · the gap bridge. What prospects in comparable situations asked,
  // read once for the whole board. A deal inherits the questions its peers
  // provoked. Empty until the brain has read a demo — the room degrades quietly.
  const askedByPeers = await prospectAsks(600);

  // The second record, one query for the whole board — the THEIRS line reads
  // the verified gems; acted gems have already left the arrival surface.
  const secondById = await fetchSecondRecords().catch(
    () => new Map<string, never>() as Awaited<ReturnType<typeof fetchSecondRecords>>,
  );

  const rows: RoomRow[] = [];
  // The reads, kept by account for the pipeline report below: built once per
  // row here, read once more there, never built twice (§2.2; pass 4 G2).
  const reads = new Map<string, ReturnType<typeof readAccount>>();
  for (const card of data.cards) {
    if (card.archived) continue;
    const accountId =
      idByName.get(card.name.toLowerCase()) ??
      digestForCardName(card.name)?.accountId ??
      "";
    const peo = peoById.get(accountId);
    const rawNotes = accountId ? (notesById.get(accountId) ?? []) : [];
    // The single account read (src/lib/record/read.ts; the Chute brains
    // refactor plan, §2.2): one read of every store for this account, built
    // once per row. The registers, the move's inputs and the THEIRS line read
    // their facts from it; the drawer, the engine's court and the other
    // surfaces migrate onto it one slice at a time. The book's roster and the
    // seeded contact ride in as the seeds the record outranks.
    const acct = readAccount({
      account: {
        id: accountId,
        name: card.name,
        contacts: accountId ? contactsFor(accountId) : [],
        contact: { name: peo?.contactName, email: peo?.contactEmail },
      },
      notes: rawNotes,
      touches,
      todos,
      dispositions,
      // The second record, folded by canonical id: a drop keyed by a shell
      // id reads under the one account (E17).
      secondRecord: accountId ? secondRecordFor(secondById, accountId) : null,
      homeSide: ourSide,
      digest: digestFor(accountId) ?? digestForCardName(card.name),
      now,
      board: { card, labels: data.labels },
    });
    if (accountId) reads.set(accountId, acct);
    // ✕-parked entries (hide:note: dispositions) leave every register view —
    // the read holds the one filter; the note survives in the table, the row
    // does not.
    const allNotes = rawNotes.filter((n) => !acct.hidden.has(n.id));
    const mine = allNotes.filter((n) => n.lane === "mine");
    const backgroundTotal = allNotes.length - mine.length;

    // The docs the evidence rules read: the visible record, every store.
    const docs = acct.docs.filter((d) => !d.hidden);
    const intel = acct.intel;

    const prods = new Set(intel.products.map((p) => p.value));
    const shape = prods.has("eor")
      ? `EOR${prods.has("contractor") ? " +CP" : ""}${prods.has("wallet") ? " +W" : ""}`
      : prods.has("contractor")
        ? `CP${prods.has("wallet") ? " +W" : ""}`
        : "GP";

    const country = intel.countries[0]
      ? (COUNTRY_NAME[intel.countries[0].value] ?? intel.countries[0].value)
      : "";
    // Identity only: what the deal IS, not when it's due. The timing phrase used
    // to ride here, but it is whatever fragment the urgency regex matched in the
    // record — "deadline" on one row, a full sentence on the next — so the strip
    // read like an alarm on whichever account happened to have prose. The wall
    // still lands where the canon puts it: the move's own reason line, which
    // readDeal() writes from the same intel.timing below.
    const meta = [
      intel.chair === "resale" ? "RESALE" : intel.chair === "referral" ? "REFERRAL" : "",
      country,
    ]
      .filter(Boolean)
      .join(" · ")
      .toUpperCase()
      .slice(0, 72);

    const people = acct.people.slice(0, 6);
    // MULTI reads the widest count the app holds: filed actors AND the
    // digest's thread roster — a record-quiet deal with a known room must
    // never render "nobody exists."
    const peopleCount = Math.max(people.length, intel.threads.people.length);
    const multiTone = peopleCount >= 3 ? "g" : peopleCount === 2 ? "y" : "r";

    // Who this deal runs through — the record's most-seen person outranks the
    // book's seeded primary the moment real communication files.
    const rel = acct.relationship;

    let briefed = false;
    for (const node of DASH_NODES) {
      node.checklist.forEach((item, i) => {
        if (/partner (de)?brief/i.test(item) && card.checks[node.key]?.[i])
          briefed = true;
      });
    }
    // The notifier's own hand outranks the derived read (decreed 2026-08-19):
    // the operator can set "opp created" or done directly from the row.
    const briefedManual: "opp" | "done" | null = doneKeys.has(`briefed:${accountId}:opp`)
      ? "opp"
      : doneKeys.has(`briefed:${accountId}:done`)
        ? "done"
        : null;

    const step = cardNextStep(card, data.labels, now.getTime());
    const stageNode = step ? DASH_NODES.find((n) => n.key === step.nodeKey) : null;
    const doneInStage = stageNode
      ? (card.checks[stageNode.key] ?? []).filter(Boolean).length
      : 0;
    const totalInStage = stageNode?.checklist.length ?? 0;

    // Closed Won / Closed Lost — the terminal stamp, if the operator confirmed
    // one. A closed row keeps its place until it's retired; the meter says so.
    const outcome = readOutcome(card.notes);
    // Every gate on every stage checked but nothing stamped: finished work
    // waiting on the operator's call — the row stays loud, it never hollows.
    const allGatesDone =
      !outcome &&
      !step &&
      DASH_NODES.every((n) => {
        const checks = card.checks[n.key] ?? [];
        return n.checklist.every((_, idx) => checks[idx]);
      });

    // The touch clock reads the LATEST of the outreach log and the record's
    // own outbound entries — a filed email is as real a touch as a logged
    // send, so the room never demands an answer the record proves was given.
    // The read merges the two by latest (C3), with the whole declared roster
    // as our side, so a colleague leading a collapsed To line is never the
    // person we wait on (the Regis row, 2026-08-27; E9).
    const touchRead = acct.lastTouch;
    const noteIds = new Set(allNotes.map((n) => n.id));
    // A seat follows its account (ruled 2026-09-25, C8). Groundwork's queue
    // excludes an account on four facts — the board (a deal at demo or later,
    // or a stamped outcome: the read's stage), the ledger's hand (not-mine,
    // parked), a snooze, and the record's live motion on either record — and
    // the register asks the same four here, per row, so an excluded account's
    // seat reads on its TODAY register and nowhere else; the moment the
    // exclusion lifts it returns to the wing.
    const dispo = accountId ? dispositions.get(accountId)?.status : undefined;
    const excluded =
      !!accountId &&
      (!!acct.stage?.late ||
        dispo === "not-mine" ||
        dispo === "parked" ||
        snoozes.has(accountId) ||
        liveMotionIds(
          new Map([[accountId, allNotes]]),
          new Map([[accountId, acct.intel]]),
          now,
          acct.secondRecord ? new Map([[accountId, acct.secondRecord]]) : undefined,
        ).has(accountId));
    const sheet = buildAccountSheet(
      todos,
      accountId,
      noteIds,
      dispositions,
      now,
      allNotes,
      accountId
        ? {
            rows: notesById.get(`${SEAT_NS}${accountId}`) ?? [],
            excluded,
            workedToday: doneKeys.has(groundworkDoneKey(now, `${accountId}:seated`)),
          }
        : null,
    );
    // Owed-to-you lines the record holds, minus anything dismissed or already
    // open on the register — the same read the suggestions use.
    const owedDismissedForRead = new Set(
      [...dispositions.keys()].filter((k) => k.startsWith("owed:")),
    );
    const owedForRead = (
      accountId
        ? owedToMe(
            allNotes,
            owedDismissedForRead,
            sheet.open.map((o) => o.body),
            now,
          )
        : []
    ).filter((o) => {
      // A promise closes by delivery. The record holds the landing — the
      // counterparty's own acceptance — so the room stops asking for a thing
      // it can see was done (the Joseph Lyon invite, 2026-09-04).
      const src = allNotes.find((n) => n.id === o.noteId);
      return !settledByRecord({ text: o.text, at: src?.createdAt ?? "" }, allNotes);
    });

    // The newest meeting record is the read's (field 6): who the recap is
    // addressed to comes from the RECORD, in the order the record speaks —
    // the meeting's own actors, a sibling note for the same call, the
    // transcript's own speaker labels (decreed 2026-09-04) — with the whole
    // declared roster as our side. The relationship rollup is the last resort
    // it was always meant to be.
    const meetingForRead = acct.lastMeeting
      ? {
          at: acct.lastMeeting.at,
          who: firstName(acct.lastMeeting.who) || firstName(rel.name) || "them",
        }
      : null;

    // What they left the meeting owing — the read's theirPromise (field 14):
    // their loops the read filed (D10) and the record's Owed line, client's
    // side (the Simploy call, 2026-09-03). A colleague is never named as the
    // one who owes it: a relayed promise's owner is the account person the
    // record names, else "" (the founder, 2026-10-06). Day-matched to the
    // meeting in Chicago so an old debt never rides a new meeting.
    const theirBall = (() => {
      if (!meetingForRead || !acct.theirPromise) return null;
      const day = (iso: string) => {
        const t = Date.parse(iso);
        return Number.isNaN(t)
          ? ""
          : new Date(t).toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
      };
      const met = day(meetingForRead.at);
      if (!met || day(acct.theirPromise.at) < met) return null;
      const b = acct.theirPromise;
      return {
        who: firstName(b.who) || "they",
        text: b.text,
        ...(b.day ? { day: b.day } : {}),
        ...(b.promised ? { promised: true } : {}),
      };
    })();

    const read: RoomRead = readDeal({
      // The account as a person says it: the move names it when the record
      // cannot say who owes a promise.
      accountName: shortName(card.name),
      // Whose move it is, from the read (field 4): the engine writes the
      // sentence the rung calls for (§2.2, the fifth migration).
      whoseMove: acct.whoseMove,
      step: step
        ? {
            nodeKey: step.nodeKey,
            nodeLabel: step.nodeLabel,
            item: step.item,
            ageDays: step.ageDays,
          }
        : null,
      timing: intel.timing
        ? { phrase: intel.timing.value.phrase, dateIso: intel.timing.value.dateIso ?? "" }
        : null,
      lastTouch: touchRead
        ? {
            at: touchRead.at,
            awaitingReply: touchRead.awaitingReply,
            who: firstName(touchRead.who) || firstName(rel.name) || "them",
          }
        : null,
      lastInbound: acct.lastInbound
        ? {
            at: acct.lastInbound.at,
            // The person who actually wrote — the doc's own sender; the
            // relationship rollup only stands in when the doc is anonymous.
            who: firstName(acct.lastInbound.who) || firstName(rel.name) || "they",
            promise: acct.lastInbound.promise,
          }
        : null,
      lastMeeting: meetingForRead,
      // The newest invitation acceptance — machinery, so it opens no
      // reply-owed, but it is proof the meeting exists (HR Hawaii, 9/4).
      lastAccepted: acct.lastAccepted
        ? {
            at: acct.lastAccepted.at,
            who: firstName(acct.lastAccepted.who) || firstName(rel.name) || "they",
          }
        : null,
      theirBall,
      // Every promise still open on their side, the read's list (field 14):
      // the move line is the one place their promises show, and its door
      // lists them all (the face approved 2026-10-06).
      theirPromises: acct.theirPromises,
      lastRecordAt: acct.lastRecordAt,
      allGatesDone,
      // What is owed, register first then the record's own owed lines.
      openOwed: [
        // The full stored line, not the register's capped display body — the
        // stage builds its own instruction and must never inherit a cut.
        ...sheet.open
          .filter((o) => !o.settled)
          .map((o) => ({ text: o.edit, wall: !!o.wall, due: o.due })),
        ...owedForRead.map((o) => ({ text: o.text })),
      ],
      now,
    });

    // The stage rail + suggestions for the drawer.
    const dismissed = new Set<string>();
    const prefix = `sugg-dismiss:${card.id}:`;
    for (const key of dispositions.keys())
      if (key.startsWith(prefix)) dismissed.add(key.slice(prefix.length));
    const suggestions = suggestChecks(docs, card, dismissed).map((sg) => ({
      node: sg.node as string,
      index: sg.itemIdx,
      item: DASH_NODES.find((n) => n.key === sg.node)?.checklist[sg.itemIdx] ?? "",
      why: sg.reason.slice(0, 160),
    }));

    // The sheet, in Today's own dialect: k:a-tagged action todos, account
    // linkage via the notetaker column OR the routing marker's note ids,
    // same-day row delays, hides, and doneAt stamps. Built BEFORE the read —
    // the stage's move is chosen from what is owed, so the obligations have
    // to be in hand first (founder-decreed 2026-08-29).
    // The register shows the ranked eight and DOORS the rest — the cap used
    // to drop them without a word (decreed 2026-09-03).
    const sheetOpen = sheet.open;
    const sheetRest = sheet.rest ?? [];
    const sheetDelayed = sheet.delayed;
    const sheetDoneToday = sheet.doneToday.map((d) => ({
      id: d.id,
      body: d.body,
      at: new Date(Date.parse(d.at))
        .toLocaleTimeString("en-US", {
          timeZone: "America/Chicago",
          hour: "numeric",
          minute: "2-digit",
        })
        .toLowerCase()
        .replace(" ", ""),
    }));

    // The loss read — dismissals are keyed to the triggering note, so fresh
    // loss evidence resurfaces while a "keep salvaging" call stays honored.
    const lossDismissed = new Set<string>();
    const lossPrefix = `loss-dismiss:${card.id}:`;
    for (const key of dispositions.keys())
      if (key.startsWith(lossPrefix)) lossDismissed.add(key.slice(lossPrefix.length));
    // BOTH lanes: a loss stated in case traffic is still a loss (Ted
    // doctrine — the fate reads must see everything the corpus sees).
    const loss = readLoss(allNotes, lossDismissed, now);

    // Owed-to-you: the record's action items with the operator's name on them,
    // minus anything dismissed or already open on the register.
    const owed = owedForRead.map((o) => ({
      noteId: o.noteId,
      key: o.key,
      text: o.text,
      src: o.src,
    }));

    // STILL UNKNOWN — the asks the read queued for this deal, minus the ones
    // waved off as irrelevant. `queued` tells the operator whether dismissing
    // one costs them anything.
    // When the research pass last ran — the refresh control states it, because a
    // button that doesn't say when it last ran invites re-running it blindly.
    const researchRows = accountId ? (notesById.get(researchNs(accountId)) ?? []) : [];
    // The chip reads the LATEST of both research stores: the on-demand deep
    // pass (research: notes) and the book-wide sweep. "Never" only when
    // neither store has touched this account — the stamp must not claim
    // "never run" over a researched book record (founder-caught 2026-08-13).
    const bookResearchAt =
      accountId && getDemand(accountId)?.researched && researchGeneratedAt
        ? `${researchGeneratedAt}T12:00:00Z`
        : "";
    const researchAt = latestResearchAt(researchRows[0]?.createdAt, bookResearchAt) ?? "";

    const gapDismissed = new Set(
      [...dispositions.keys()].filter((k) => k.startsWith(GAP_DISMISS)),
    );
    const gaps = accountId
      ? readGaps(notesById, accountId, gapDismissed)
      : { shown: [], queued: 0 };

    // Comparability is the situation, not the name: same countries, same
    // product line, same industry. A question a peer buyer asked belongs here
    // even though nobody has asked it on this deal yet.
    const peers = peerQuestions(askedByPeers, {
      entities: [
        ...intel.countries.map((c) => COUNTRY_NAME[c.value] ?? c.value),
        ...prods,
        peo?.industry ?? "",
      ],
      excludeAccountId: accountId,
      cap: 2,
    });

    // The meter's read: position from the further of board truth and record
    // evidence, plus the why lines the hover bubble states.
    const meter = meterRead({
      outcome,
      step: step
        ? {
            nodeKey: step.nodeKey,
            nodeLabel: data.labels[step.nodeKey] ?? step.nodeLabel,
            item: step.item,
          }
        : null,
      doneInStage,
      totalInStage,
      allGatesDone,
      evidence: suggestions.map((s) => ({ nodeKey: s.node, why: s.why })),
      labels: data.labels,
    });

    // THEIRS is the account's people (ruled 2026-09-25, C16, amended
    // 2026-10-05): the line carries only gems about an account person, read
    // from the folded second record the read carries; a colleague's gem has
    // no seat on the line or the row.
    const theirs = theirsLine(acct.secondRecord);

    rows.push({
      accountId,
      theirs,
      cardId: card.id,
      name: card.name,
      meta,
      shape,
      multiTone,
      people: people.map((p) => ({
        name: p.name,
        line: [
          p.title,
          p.inMine && p.inBackground
            ? "your threads + case traffic"
            : p.inMine
              ? "your threads"
              : "case traffic",
          `×${p.count}`,
        ]
          .filter(Boolean)
          .join(" · "),
      })),
      briefed,
      briefedManual,
      sfUrl: accountId ? sfAccountUrl(accountId) : null,
      climb: {
        frac: meter.frac,
        capTone: outcome
          ? outcome.status === "won"
            ? "ok"
            : "risk"
          : read.health === "red"
            ? "risk"
            : read.health === "amber"
              ? "warn"
              : "ok",
        label: meter.label,
        why: meter.why,
      },
      outcome,
      gaps: gaps.shown,
      gapsQueued: gaps.queued,
      peers: peers.map((p) => ({
        question: p.question,
        shared: p.shared.join(" · "),
        // One click to the brain, pre-filled with the answer hunt. The ask box
        // never fires on arrival; the operator reads it first.
        findHref: askHref(
          `What did we answer when a buyer asked: "${p.question.slice(0, 200)}"`,
        ),
      })),
      askHref: askHref(scopedAsk(card.name, [...prods])),
      researchAt,
      stages: buildStageRail(card, data.labels),
      suggestions,
      move: read.move,
      moveFull: read.moveFull ?? "",
      thin: read.thin,
      outstanding: step
        ? {
            item: step.item,
            node: step.nodeKey,
            index: step.index,
            doneKey: morningDoneKey(
              `card:${card.id}:${step.nodeKey}:${step.index}`,
              now.getTime(),
            ),
            closedCount: doneInStage,
          }
        : null,
      sheetOpen,
      sheetRest,
      sheetDelayed,
      sheetDoneToday,
      record: mine.slice(0, 6).map((n) => ({
        id: n.id,
        t: new Date(Date.parse(n.createdAt)).toLocaleDateString("en-US", {
          timeZone: "America/Chicago",
          month: "numeric",
          day: "numeric",
        }),
        text: n.body.split("\n")[0].slice(0, 160),
        struck: n.body.startsWith("✓"),
      })),
      recordTotal: mine.length,
      backgroundTotal,
      loss,
      owed,
      health: read.health,
      rank: 0,
      workedToday: accountId ? dispositions.has(moveDoneKey(accountId, now)) : false,
      canWrite: data.canWrite,
    });
  }
  // A closed deal keeps its row but stops competing for attention: closed
  // sinks below everything live, whatever its health once was.
  rows.sort(
    (a, b) =>
      Number(!!a.outcome) - Number(!!b.outcome) ||
      HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health] ||
      a.name.localeCompare(b.name),
  );
  rows.forEach((r, i) => (r.rank = i));

  // ── The pull-tab drawers' data ────────────────────────────────────────────
  // Roundups: the whole engine, distilled — per partner: cadence state, the
  // per-account composer sections, and the default message.
  const intelList = applyValidations(accountIntel(), validations);
  const parkedIds = new Set<string>();
  for (const [id, d] of dispositions)
    if (d.status === "parked" || d.status === "not-mine") parkedIds.add(id);
  for (const id of snoozes.keys()) parkedIds.add(id);

  const kickoff = partnerKickoff(intelList, parkedIds);
  const mutedSet = new Set(
    [...dispositions.keys()]
      .filter((k) => k.startsWith("roundup-mute:"))
      .map((k) => k.slice("roundup-mute:".length)),
  );
  // The freshest filed line per account rides into every bullet with its
  // date — hand-written bullets age; the record doesn't.
  const latestByAccount = latestLineByAccount(notesById, dispositions);
  const cadence: CadenceRow[] = kickoff.map((k) => {
    const key = partnerOutreachKey(k.partner);
    const touch = touchMap.get(key);
    const bullets = roundupBullets(k.accounts, latestByAccount);
    const sections = k.accounts.map((a, i) => {
      const d = dispositions.get(a.id);
      const off = d?.status === "motion" || d?.status === "parked";
      return { id: a.id, name: a.name, bullet: bullets[i] ?? "", on: !off };
    });
    const frame = roundupFrame(k.partner);
    return {
      partner: k.partner,
      subjectKey: key,
      status: touch ? touch.status : "none",
      lastSent: touch ? touch.contactedAt : "",
      daysAgo: touch ? daysBetween(touch.contactedAt, now) : null,
      due: roundupDue(touch, now.getTime()),
      muted: mutedSet.has(k.partner),
      opener: frame.opener,
      closer: frame.closer,
      sections,
      total: k.accounts.length,
    };
  });

  // The follow-up list is the operator's own — chases he wrote by hand. It has
  // nothing to do with the check-in cadence (threads waiting on somebody else),
  // so it comes out of the touch pile first and never reaches that drawer.
  // The derivation is pure (src/lib/today/followup-rows.ts): the question is
  // only asked about a name NOBODY already knows — not the board, and not the
  // book behind Accounts. Offering to add a company that already has a record
  // is how duplicates get made.
  const { manual: manualTouches, cadence: cadenceTouches } = splitTouches(touches);
  const followUpRows: FollowUpRow[] = followUpRowsFor(
    manualTouches,
    peos.map((p) => ({ id: p.id, name: p.name })),
    [...csms, ...EXTRA_PARTNERS, ...knownPeople()],
    knownOrgNames(data.cards, peos),
  );

  // Check-ins & chases: every due thread, with its named ask when one is set.
  const followUps = partitionFollowUps(cadenceTouches, now.getTime());
  const checkins: CheckinRow[] = followUps.due.slice(0, 12).map((t) => {
    const ask = splitAsk(t.detail ?? "").ask;
    return {
      subjectKey: t.subjectKey,
      label: t.label,
      ask,
      quietDays: daysBetween(t.contactedAt, now),
      kind: t.kind,
    };
  });

  // The eye: warming signals (triage) + the unlinked later list.
  const onBoard = new Set(data.cards.filter((c) => !c.archived).map((c) => c.name));
  const { active } = partitionSignals(signals(intelList), snoozes, now.getTime());
  const warming: WarmRow[] = active
    .filter((a) => !onBoard.has(a.name) && !doneKeys.has(triageDoneKey(a.id)))
    .slice(0, 6)
    .map((a) => ({
      id: a.id,
      name: a.name,
      why: a.summary.slice(0, 140) || "Signal on file. Open the account to read it.",
      seedNote: "",
    }));
  // The eye also watches FILED intel, not just the frozen research: an
  // off-board account whose recent record carries the global scent warms
  // here even if research-time demand never saw it.
  const warmIds = new Set(warming.map((w) => w.id));
  const boardIds = new Set(rows.map((r) => r.accountId));
  const FRESH_DAYS = 14 * 86_400_000;
  for (const p of peos) {
    if (warming.length >= 10) break;
    if (boardIds.has(p.id) || warmIds.has(p.id) || onBoard.has(p.name)) continue;
    if (snoozes.has(p.id) || doneKeys.has(triageDoneKey(p.id))) continue;
    const notes = notesById.get(p.id) ?? [];
    const hit = notes.find(
      (n) =>
        now.getTime() - Date.parse(n.createdAt) < FRESH_DAYS &&
        GLOBAL_SCENT_RE.test(n.body),
    );
    if (!hit) continue;
    const line = hit.body
      .split("\n")[0]
      .replace(/^[✉✓☰✎⚡▢✔☎]\s?/, "")
      .slice(0, 110);
    warming.push({
      id: p.id,
      name: p.name,
      why: `On the record: “${line}”`,
      seedNote: "",
    });
  }
  const later: LaterRow[] = todos
    .filter((t) => !t.done && !t.accountId)
    .slice(0, 8)
    .map((t) => ({ id: t.id, body: t.body.split("\n")[0].slice(0, 140) }));

  // ── the Pipeline report ───────────────────────────────────────────────────
  // Built from the stores the loop already read, and from the reads it already
  // built. The second record's own drop day rides the header: a report older
  // than the sweep says so rather than rendering confidently wrong counts.
  const pipeReport = rankPipeline(
    buildPipelineReport({
      // One gathering, shared with the drawer's fresh pull — a second copy
      // written for the action is exactly the drift the spec forbids.
      accounts: collectPipelineAccounts({
        cards: data.cards,
        labels: data.labels,
        notesById,
        todos,
        dispositions,
        secondById,
        peos,
        now,
        // The loop's own reads, one per row (§2.2, the third migration): the
        // report reads its facts from them and builds nothing of its own, so
        // the pipeline is read once per /room load (pass 4 G2).
        readFor: (id) => reads.get(id),
      }),
      // The whole book, not the active slice — a colleague who works across
      // the book but appears on only two active accounts is still ours.
      homeSide,
      csms,
      me: "Antaeus Coe",
      now,
    }),
  );
  const pipeDayLabel = pipelineDayLabel(now);
  const pipeDrop = [...secondById.values()]
    .map((s) => s.rollup?.dropDay ?? "")
    .filter(Boolean)
    .sort()
    .pop();
  const pipeDropAge = pipeDrop
    ? (daysBetween(`${pipeDrop}T12:00:00Z`, now) ?? Number.MAX_SAFE_INTEGER)
    : Number.MAX_SAFE_INTEGER;
  const pipeStale = !pipeDrop
    ? "no second record"
    : pipeDropAge > DROP_STALE_DAYS
      ? `second record ${pipeDrop.slice(5)} — stale`
      : `second record ${pipeDrop.slice(5)}`;

  return (
    <>
      <AppWayfinder current="HomeRoom" />
      <main
        className={`${styles.room} ${serif.variable} ${sans.variable} ${mono.variable}`}
      >
        {/* The Chute routes on the server over the joined roster (C2, D12);
            no roster rides the page. */}
        <Chute canWrite={data.canWrite} />
        <RoomClient
          rows={rows}
          cadence={cadence}
          checkins={checkins}
          followUps={followUpRows}
          warming={warming}
          later={later}
          canWrite={data.canWrite}
          dbUnavailable={data.status === "database-unavailable"}
          boardNames={rows.map((r) => ({ id: r.accountId, name: r.name }))}
          pipeline={pipeReport}
          pipelineDay={pipeDayLabel}
          pipelineStale={pipeStale}
        />
      </main>
    </>
  );
}
