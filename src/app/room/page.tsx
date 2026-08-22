import Link from "next/link";
import { DM_Serif_Display, JetBrains_Mono, Public_Sans } from "next/font/google";
import { AppWayfinder } from "@/components/app-wayfinder";
import { loadDashboard } from "@/lib/dashboard/data";
import { csms, peos } from "@/lib/book";
import { fetchSecondRecords } from "@/lib/activity/read";
import { EXTRA_PARTNERS } from "@/lib/book/partners";
import {
  isManual,
  openCandidates,
  readFollowUp,
  routedIds,
} from "@/lib/today/followup-brain";
import { contactsFor, knownPeople } from "@/lib/book/contacts";
import { peopleFor } from "@/lib/intel/people";
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
import { splitAsk } from "@/lib/today/ledger";
import { DASH_NODES } from "@/lib/dashboard/stages";
import { corpusFor, extractDealIntel } from "@/lib/intel/extract";
import { relationshipFor } from "@/lib/intel/relationship";
import { digestFor, digestForCardName } from "@/lib/intel/digest";
import { COUNTRY_NAME } from "@/lib/intel/lexicon";
import { suggestChecks } from "@/lib/intel/evidence";
import { daysBetween, meterRead, readDeal, type RoomRead } from "@/lib/room/engine";
import { lastTouchRead } from "@/lib/room/touch";
import { isMeetingNote } from "@/lib/intel/meeting";
import { buildStageRail } from "@/lib/room/stages-view";
import { buildAccountSheet } from "@/lib/room/sheet-view";
import { readLoss } from "@/lib/room/loss";
import { GAP_DISMISS, readGaps } from "@/lib/room/gaps";
import { researchNs } from "@/lib/intel/deep-research";
import { getDemand, researchGeneratedAt } from "@/lib/book/research";
import { readOutcome } from "@/lib/dashboard/outcome";
import { owedToMe } from "@/lib/room/owed";
import { GLOBAL_SCENT_RE } from "@/lib/intel/provenance";
import { askHref, peerQuestions, scopedAsk } from "@/lib/intranet/bridges";
import { sfAccountUrl } from "@/lib/salesforce";
import { prospectAsks } from "@/lib/intranet/store";
import { Chute } from "./chute";
import { domainOf } from "@/lib/route-capture";
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
  for (const card of data.cards) {
    if (card.archived) continue;
    const accountId =
      idByName.get(card.name.toLowerCase()) ??
      digestForCardName(card.name)?.accountId ??
      "";
    const peo = peoById.get(accountId);
    const rawNotes = accountId ? (notesById.get(accountId) ?? []) : [];
    // ✕-parked entries (hide:note: dispositions) leave every register view —
    // the note survives in the table, the row does not.
    const allNotes = rawNotes.filter((n) => !dispositions.has(`hide:note:${n.id}`));
    const mine = allNotes.filter((n) => n.lane === "mine");
    const backgroundTotal = allNotes.length - mine.length;

    const docs = corpusFor(accountId, card.name, {
      acctNotes: allNotes,
      todos: todos.filter((t) => accountId && t.accountId === accountId),
      touches: touches.filter(
        (t) =>
          (accountId && t.subjectKey === `outreach:${accountId}`) ||
          t.label.toLowerCase() === card.name.toLowerCase(),
      ),
    });
    const intel = extractDealIntel(
      docs,
      digestFor(accountId) ?? digestForCardName(card.name),
    );

    const prods = new Set(intel.products.map((p) => p.value));
    const shape = prods.has("eor")
      ? `EOR${prods.has("contractor") ? " +CP" : ""}${prods.has("wallet") ? " +W" : ""}`
      : prods.has("contractor")
        ? `CP${prods.has("wallet") ? " +W" : ""}`
        : "GP";

    const country = intel.countries[0]
      ? (COUNTRY_NAME[intel.countries[0].value] ?? intel.countries[0].value)
      : "";
    const meta = [
      intel.chair === "resale" ? "RESALE" : intel.chair === "referral" ? "REFERRAL" : "",
      intel.timing?.value.phrase ?? "",
      country,
    ]
      .filter(Boolean)
      .join(" · ")
      .toUpperCase()
      .slice(0, 72);

    const people = accountId ? peopleFor(allNotes, contactsFor(accountId), 6) : [];
    // MULTI reads the widest count the app holds: filed actors AND the
    // digest's thread roster — a record-quiet deal with a known room must
    // never render "nobody exists."
    const peopleCount = Math.max(people.length, intel.threads.people.length);
    const multiTone = peopleCount >= 3 ? "g" : peopleCount === 2 ? "y" : "r";

    // Who this deal runs through — the record's most-seen person outranks the
    // book's seeded primary the moment real communication files.
    const rel = relationshipFor(allNotes, accountId ? contactsFor(accountId) : [], {
      name: peo?.contactName,
      email: peo?.contactEmail,
    });

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

    const touch = accountId ? touchMap.get(`outreach:${accountId}`) : undefined;
    // The touch clock reads the LATEST of the outreach log and the record's
    // own outbound entries — a filed email is as real a touch as a logged
    // send, so the room never demands an answer the record proves was given.
    const touchRead = lastTouchRead(
      allNotes,
      touch
        ? {
            contactedAt: touch.contactedAt,
            awaitingReply: touch.status === "awaiting",
            who: firstName(rel.name) || "them",
          }
        : null,
    );
    const read: RoomRead = readDeal({
      accountName: card.name,
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
      lastInbound: intel.lastInbound
        ? {
            at: intel.lastInbound,
            // The person who actually wrote — the doc's own sender; the
            // relationship rollup only stands in when the doc is anonymous.
            who: firstName(intel.lastInboundWho) || firstName(rel.name) || "they",
            promise: intel.lastInboundPromise,
          }
        : null,
      // The newest meeting record — a meeting newer than any outbound makes
      // the recap the move, never a "wait" (Staff Leasing 1:00 PM, 8/18).
      lastMeeting: (() => {
        const m = allNotes.find((n) => isMeetingNote(n));
        return m ? { at: m.createdAt, who: firstName(rel.name) || "them" } : null;
      })(),
      lastRecordAt: allNotes[0]?.createdAt ?? "",
      allGatesDone,
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
    // same-day row delays, hides, and doneAt stamps.
    const noteIds = new Set(allNotes.map((n) => n.id));
    const sheet = buildAccountSheet(todos, accountId, noteIds, dispositions, now);
    const sheetOpen = sheet.open;
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
    const owedDismissed = new Set(
      [...dispositions.keys()].filter((k) => k.startsWith("owed:")),
    );
    const owed = accountId
      ? owedToMe(
          allNotes,
          owedDismissed,
          sheet.open.map((o) => o.body),
          now,
        ).map((o) => ({ noteId: o.noteId, key: o.key, text: o.text, src: o.src }))
      : [];

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
    const researchAt = researchRows[0]?.createdAt || bookResearchAt;

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

    const theirs = (() => {
      const sr = accountId ? secondById.get(accountId) : undefined;
      const live = (sr?.gems ?? []).filter((g) => !g.actedDay).slice(0, 3);
      if (live.length === 0) return null;
      const g = live[0];
      const first = (g.who[0] ?? "").split(" ")[0].toUpperCase();
      const day = g.whenDay ? g.whenDay.slice(5).replace("-", "/") : "";
      const label = [
        first ? `${first}’S ${g.term}` : g.term,
        day,
        live.length > 1 ? `+${live.length - 1}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return {
        label,
        gems: live.map((x) => ({
          term: x.term,
          act: x.act,
          reason: x.reason,
          whenDay: x.whenDay,
          cites: x.cites,
        })),
      };
    })();

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
      thin: read.thin,
      court: read.court,
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
  const manualTouches = touches.filter(
    (t) => isManual(t.subjectKey) && t.status !== "archived",
  );
  const knownOrgs = [...data.cards.map((c) => c.name), ...peos.map((p) => p.name)];
  const followUpRows: FollowUpRow[] = manualTouches
    .sort((a, b) => Date.parse(b.contactedAt) - Date.parse(a.contactedAt))
    .slice(0, 40)
    .map((t) => {
      const read = readFollowUp(
        t.label,
        peos.map((p) => ({ id: p.id, name: p.name })),
        [...csms, ...EXTRA_PARTNERS, ...knownPeople()],
      );
      return {
        subjectKey: t.subjectKey,
        label: t.label,
        armedAt: t.contactedAt,
        // Accounts this chase already filed itself against — shown as plain
        // provenance, not as a control.
        filed: routedIds(t.detail ?? "")
          .map((id) => peos.find((p) => p.id === id)?.name ?? "")
          .filter(Boolean),
        // The one open question: a name nobody on the board answers to.
        // The question is only asked about a name NOBODY already knows — not the
        // board, and not the book behind Accounts. Offering to add a company
        // that already has a record is how duplicates get made.
        newName: openCandidates(read, t.detail ?? "", knownOrgs)[0] ?? "",
      };
    });

  // Check-ins & chases: every due thread, with its named ask when one is set.
  const followUps = partitionFollowUps(
    touches.filter((t) => !isManual(t.subjectKey)),
    now.getTime(),
  );
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

  // The Chute's routing roster — every account the book knows, with the
  // signals that identify it in a dropped file: contact emails and company
  // domains. Built server-side; the contacts module never reaches the client.
  const chuteRoster = peos.map((p) => {
    const emails = [p.contactEmail, ...contactsFor(p.id).map((c) => c.email)]
      .map((e) => (e ?? "").toLowerCase().trim())
      .filter(Boolean);
    const domains = [
      domainOf(p.website),
      ...emails.map((e) => e.split("@")[1] ?? ""),
    ].filter(Boolean);
    return {
      id: p.id,
      name: p.name,
      emails: [...new Set(emails)],
      domains: [...new Set(domains)],
    };
  });

  return (
    <>
      <AppWayfinder current="HomeRoom" />
      <main
        className={`${styles.room} ${serif.variable} ${sans.variable} ${mono.variable}`}
      >
        <Chute roster={chuteRoster} canWrite={data.canWrite} />
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
        />
      </main>
    </>
  );
}
