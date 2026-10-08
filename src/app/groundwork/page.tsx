// Groundwork — the prospecting room, outbound only. Locked design: the
// winged stage (CLAUDE.md, decided 2026-08-10). One account center stage with
// an action line and a reason line; the day's worked stamps in the left wing;
// the waiting queue heat-mapped in the right wing with each trigger whispered
// beneath its name; the instrument capsule up top; the lower deck below (the
// wire · the institutions · State of play). Everything is derived per request
// from stores the rest of the app writes — this room authors nothing.

import Link from "next/link";
import { AppWayfinder } from "@/components/app-wayfinder";
import { getAppAccess } from "@/lib/auth";
import { hasDatabaseEnv } from "@/lib/db";
import { csms, getPeo, peos } from "@/lib/book";
import { contactCount, contactsFor } from "@/lib/book/contacts";
import { relationshipFor } from "@/lib/intel/relationship";
import type { DealIntel } from "@/lib/intel/types";
import { readAccount, secondRecordFor, type AccountRead } from "@/lib/record/read";
import { readFromStores } from "@/lib/record/stores";
import { hideNoteKey } from "@/lib/record/hide";
import { homeSideFrom } from "@/lib/pipeline/build";
import {
  RESEARCH_NS,
  latestResearchAt,
  parseResearchBody,
} from "@/lib/intel/deep-research";
import {
  isNamespacedAccountId,
  loadAccountNotes,
  loadDispositions,
  loadDoneTimes,
  loadSnoozes,
  loadTodos,
  loadTouches,
} from "@/lib/today/overlay";
import { clockShort, userDayKey } from "@/lib/tz";
import { sfAccountUrl } from "@/lib/salesforce";
import {
  buildQueue,
  heatOf,
  liveMotionIds,
  moveKey,
  secondOnlyMotionIds,
  sweepAtFor,
} from "@/lib/groundwork/day";
import { wingStamp, type ChannelTouch } from "@/lib/groundwork/stamp";
import {
  collisionFor,
  dropAgeDays,
  engagedNeverIntroduced,
  fetchSecondRecords,
  fetchStageRows,
  intentWarm,
  outreachGem,
  verifiedCold,
  DROP_STALE_DAYS,
  type SecondRecord,
} from "@/lib/activity/read";
import EvidenceChips, { CiteRows } from "./evidence-chips";
import {
  chipGems,
  collisionCite,
  csmPrepRows,
  prepKicker,
  spikeCites,
} from "@/lib/groundwork/chips";
import { seatWorked } from "@/lib/groundwork/worked";
import { loadDashboard } from "@/lib/dashboard/data";
import { readOutcome } from "@/lib/dashboard/outcome";
import { digestFor, digestForCardName } from "@/lib/intel/digest";
import { READOUT_READ_KEY, buildFile } from "@/lib/groundwork/file";
import { proximityMark } from "@/lib/groundwork/proximity";
import { multiTone } from "@/lib/room/multi";
import { isWire } from "@/lib/ingest/dialect";
import {
  intentFor,
  intentReadDue,
  ridingLaneDate,
  type IntentSignal,
} from "@/lib/groundwork/signals";
import {
  INST_NS,
  institutionCard,
  parseInstBody,
  type Institution,
} from "@/lib/groundwork/institutions";
import {
  WIRE_NS,
  orderWire,
  parseWireBody,
  sweepDue,
  wireAvailable,
  type WireItem,
} from "@/lib/groundwork/wire";
import { buildReadout, lint, readoutText } from "@/lib/groundwork/readout";
import {
  SENDBOOK_NS,
  buildSendbook,
  recordSends,
  weekStats,
  whoChipNames,
  type NoteLike as SendNote,
} from "@/lib/sendbook/read";
import { SEAT_NS, parseSeatBody } from "@/lib/act/lane";
import {
  attachWireToAccount,
  markReadoutRead,
  markWorked,
  runResearchNow,
  sweepWire,
  unWork,
} from "./actions";
import { ChannelAsk } from "./channel-ask";
import { SweepButton } from "./sweep-button";
import { CopyStamp } from "./copy-stamp";
import { Instrument } from "./instrument";
import styles from "./groundwork.module.css";

export const dynamic = "force-dynamic";

// A date in prose — month name spelled out, per the §3 bar. Day-only ISO reads
// in UTC noon; full timestamps read in Chicago.
const monthDay = (iso: string): string => {
  const dayOnly = iso.length === 10;
  const t = Date.parse(dayOnly ? `${iso}T12:00:00Z` : iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: dayOnly ? "UTC" : "America/Chicago",
  });
};

export default async function GroundworkPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; file?: string }>;
}) {
  const access = await getAppAccess();
  if (access.status === "unauthenticated") {
    return (
      <>
        <AppWayfinder current="Groundwork" />
        <main className={styles.wrap}>
          <p>
            Sign in to continue. <Link href="/login">Sign in</Link>.
          </p>
        </main>
      </>
    );
  }
  const canWrite = access.canWrite && hasDatabaseEnv();
  const now = new Date();

  const [notesMap, touches, doneTimes, dispositions, snoozes, todos] = await Promise.all([
    loadAccountNotes(),
    loadTouches(),
    loadDoneTimes(),
    loadDispositions(),
    loadSnoozes(),
    loadTodos(),
  ]);

  // Split the note map: real accounts feed the corpus; namespaces feed the
  // wire, the institutions program, and the deep-research backbone.
  const accountNotes = new Map<
    string,
    { body: string; source: string; createdAt: string; actors?: string }[]
  >();
  const wireItems: WireItem[] = [];
  const institutions: Institution[] = [];
  const researchByAccount = new Map<
    string,
    { at: string; line: string; signals: number }
  >();
  const sendTapsById = new Map<string, SendNote[]>();
  for (const [id, notes] of notesMap) {
    if (id.startsWith(SENDBOOK_NS)) {
      // The Channel Ask's tapped touches — the Sendbook's second door.
      const accountId = id.slice(SENDBOOK_NS.length);
      if (accountId)
        sendTapsById.set(
          accountId,
          notes.map((n) => ({ body: n.body, source: n.source, createdAt: n.createdAt })),
        );
      continue;
    }
    if (id.startsWith(WIRE_NS)) {
      const item = parseWireBody(notes[0]?.body ?? "");
      if (item) {
        // A malformed envelope may ship at:"" — the note's own clock stands in.
        if (!item.at) item.at = notes[0]?.createdAt ?? "";
        wireItems.push(item);
      }
      continue;
    }
    if (id.startsWith(INST_NS)) {
      const inst = parseInstBody(notes[0]?.body ?? "");
      if (inst) institutions.push(inst);
      continue;
    }
    if (id.startsWith(RESEARCH_NS)) {
      // The deep-research pass files as research:<account> — the newest note
      // is the account's live research read, and it feeds the queue brain.
      const accountId = id.slice(RESEARCH_NS.length);
      const newest = notes[0];
      if (accountId && newest) {
        const line =
          newest.body
            .split("\n")
            .map((l) => l.trim())
            .find((l) => l.length > 0) ?? "";
        researchByAccount.set(accountId, {
          at: newest.createdAt,
          line: line.slice(0, 160),
          // The signals the pass found: the queue's demand reads them beside
          // the sweep's score, the later store speaking (G7).
          signals: parseResearchBody(newest.body)?.signals.length ?? 0,
        });
      }
      continue;
    }
    if (isNamespacedAccountId(id)) continue;
    accountNotes.set(
      id,
      notes
        // ✕-parked entries leave every register view — here too.
        .filter((n) => !dispositions.has(hideNoteKey(n.id)))
        .map((n) => ({
          body: n.body,
          source: n.source,
          createdAt: n.createdAt,
          actors: n.actors,
        })),
    );
  }

  // A tapped touch is a logged touch (Ted doctrine: the drumbeat reads the
  // widest store) — synthesized at read time for the queue's clocks and for
  // the read's own touch log, never written into the touch log itself. The
  // read's whose-move verdict sees the same clock the drumbeat does (C3).
  const sendTapTouches = [...sendTapsById.entries()].flatMap(([id, notes]) =>
    notes.map((n) => ({
      subjectKey: `outreach:${id}`,
      label: "",
      contactedAt: n.createdAt,
      followUpAt: "",
      status: "awaiting",
      log: [] as { at: string; body: string }[],
    })),
  );
  const touchesForRead = [...touches, ...sendTapTouches];

  const touchesByAccount = new Map<string, typeof touchesForRead>();
  for (const t of touchesForRead) {
    const m = /^outreach:(.+)$/.exec(t.subjectKey);
    if (!m) continue;
    const list = touchesByAccount.get(m[1]) ?? [];
    list.push(t);
    touchesByAccount.set(m[1], list);
  }

  // Who counts as our side, read over the WHOLE book: the CSM column plus
  // everyone the record shows working across several accounts — the same
  // union the HomeRoom declares (E9), so the inbound test here tells a reply
  // that reached a colleague from a thread between two of the account's own
  // people, and an account person's mail that landed in a colleague's inbox
  // is a real inbound (ruled 2026-09-25, C6, amended 2026-10-05).
  const homeSide = [...csms, ...homeSideFrom(notesMap)];

  // The second record, parsed once for the whole book — rule fuel, the chips,
  // and the collision gate all read this one map. The fetch hands it back
  // already folded by canonical id (foldSecondRecords), so a drop keyed by a
  // shell id reads under the one account (E17), and a lookup by a book id is
  // the fold's own record. secondFolded is the same records keyed by the
  // book's accounts alone, for the reads and the exclusion; the queue's
  // lookups by book id read identical records from either map.
  const secondById: Map<string, SecondRecord> = await fetchSecondRecords().catch(
    () => new Map(),
  );
  const secondFolded = new Map<string, SecondRecord>();
  for (const p of peos) {
    const sr = secondRecordFor(secondById, p.id);
    if (sr) secondFolded.set(p.id, sr);
  }

  // The single account read (src/lib/record/read.ts; the Chute brains refactor
  // plan, §2.2, slice 11a): one read per account, built exactly as the
  // HomeRoom builds its own — the full rows with their actors and recipients,
  // the whole touch log and todo store, the declared roster, the seed — so
  // this room's intel is the room's intel on the same account. The narrow
  // corpus this replaced dropped the actors column and the roster, read a CT
  // send as nothing and a mail between two of their people as inbound (pass 2
  // B, rows 7 and 8). The read holds the hide filter, so the raw rows go in.
  const readById = new Map<string, AccountRead>();
  const intelById = new Map<string, DealIntel>();
  const intentById = new Map<string, IntentSignal>();
  for (const p of peos) {
    const rows = notesMap.get(p.id) ?? [];
    const acctTouches = touchesByAccount.get(p.id);
    if (rows.length || acctTouches?.length) {
      const acct = readAccount({
        account: {
          id: p.id,
          name: p.name,
          contacts: contactsFor(p.id),
          contact: { name: p.contactName, email: p.contactEmail },
        },
        notes: rows,
        touches: touchesForRead,
        todos,
        dispositions,
        secondRecord: secondFolded.get(p.id) ?? null,
        homeSide,
        digest: digestFor(p.id) ?? digestForCardName(p.name),
        now,
      });
      readById.set(p.id, acct);
      intelById.set(p.id, acct.intel);
    }
    const sig = intentFor(accountNotes.get(p.id), now);
    if (sig) intentById.set(p.id, sig);
  }
  // A record row filed under an id the book does not list still has a
  // register line; it gets the same read, assembled the same way.
  for (const id of accountNotes.keys())
    if (!readById.has(id))
      readById.set(
        id,
        readFromStores(
          { notesById: notesMap, touches: touchesForRead, todos, dispositions, homeSide },
          { id, name: getPeo(id)?.name ?? id },
          { now },
        ),
      );

  // The Sendbook's merged read — record sends + tapped touches, stepped and
  // laned. The wing subtext, the drumbeat synthetics, and the Tallyfoot all
  // read this one view, and the view reads the single account read: the same
  // docs, flags and second record /sendbook builds from, so the two registers
  // agree (pass 4 G4; slice 13).
  const sendbook = buildSendbook({ readsById: readById, tapsById: sendTapsById, now });
  const sendWeek = weekStats(sendbook, now);

  // The wire's newest hit per account — the wire-trigger rule's evidence.
  // BOTH stores (Ted doctrine): the sweep's auto-matches AND wire items the
  // operator filed onto the record — the filed note outlives the namespace.
  const wireAtById = new Map<string, string>();
  for (const w of wireItems) {
    for (const id of w.accountIds) {
      const cur = wireAtById.get(id);
      if (!cur || w.at > cur) wireAtById.set(id, w.at);
    }
  }
  for (const [id, notes] of accountNotes) {
    for (const n of notes) {
      if (!isWire(n.source)) continue;
      const cur = wireAtById.get(id);
      if (!cur || n.createdAt > cur) wireAtById.set(id, n.createdAt);
    }
  }
  const researchAtById = new Map<string, string>();
  const researchSignalsById = new Map<string, number>();
  for (const [id, r] of researchByAccount) {
    researchAtById.set(id, r.at);
    researchSignalsById.set(id, r.signals);
  }

  // What the board already knows: a deal at demo or later is the HomeRoom's
  // to work, and a stamped outcome is over. Groundwork prospects the book it
  // is NOT actively closing — those accounts leave the queue entirely.
  const excludedIds = new Set<string>();
  // Accounts holding ANY live board card — engaged-never-introduced fires
  // only where no deal exists at all, whatever its stage.
  const boardIds = new Set<string>();
  const dash = await loadDashboard();
  if (dash.status !== "unauthenticated" && dash.status !== "database-unavailable") {
    const idByName = new Map(peos.map((p) => [p.name.toLowerCase(), p.id]));
    const LATE = ["demo", "exec_summary", "proposal", "contract"] as const;
    for (const card of dash.cards) {
      const id =
        idByName.get(card.name.toLowerCase()) ??
        digestForCardName(card.name)?.accountId ??
        "";
      if (!id) continue;
      if (!card.archived) boardIds.add(id);
      // The outcome stamp survives archiving — a retired Closed Won/Lost
      // deal must never re-enter the book as a virgin prospect.
      if (readOutcome(card.notes)) {
        excludedIds.add(id);
        continue;
      }
      if (card.archived) continue;
      const late = LATE.some(
        (k) => card.states[k] === "active" || card.states[k] === "done",
      );
      if (late) excludedIds.add(id);
    }
  }
  // The disposition ledger holds too (Ted doctrine): not-mine is excluded
  // everywhere by decree, parked was shelved by the operator's own hand, and
  // a snoozed account was told to be quiet.
  for (const [id, d] of dispositions) {
    if (id.includes(":")) continue; // namespaced keys are not accounts
    if (d.status === "not-mine" || d.status === "parked") excludedIds.add(id);
  }
  for (const id of snoozes.keys()) if (!id.includes(":")) excludedIds.add(id);
  // An off-board account excluded for nothing but the second record's live
  // motion has no HomeRoom row (pass 8 call 1; C6), so its seat stays on the
  // wing while its rules stay out (C8).
  const seatStaysIds = new Set<string>();
  for (const id of secondOnlyMotionIds(accountNotes, intelById, now, secondFolded))
    if (!excludedIds.has(id) && !boardIds.has(id)) seatStaysIds.add(id);
  // The record's live motion excludes too: a recent inbound or a fresh
  // meeting on file means the deal is being WORKED — the HomeRoom's job,
  // whatever the lagging board says. Both records speak (C6): the export's
  // attributed inbound row excludes like a filed one; its account-level
  // datetime never does (D19).
  for (const id of liveMotionIds(accountNotes, intelById, now, secondFolded))
    excludedIds.add(id);

  // The Act Lane's seats (founder-decreed 2026-08-21): a move the operator
  // filed from the accounts sheet leads the wing until it is worked, taken
  // back, or the record shows the outbound after the seat. Worked is the
  // seated move's stamp on any day since the seat, a tap or a Copy: a seat
  // worked yesterday stays off the wing until its stamp is taken back
  // (seatWorked; pass 8 G2).
  const seats = new Map<string, { act: string; term: string; day: string }>();
  for (const [id, notes] of notesMap) {
    if (!id.startsWith(SEAT_NS)) continue;
    const accountId = id.slice(SEAT_NS.length);
    const seatNote = notes[0];
    if (!accountId || !seatNote) continue;
    const seat = parseSeatBody(seatNote.body);
    if (!seat) continue;
    // ✕ on the register parks the seat like any record entry (C8); a parked
    // seat stays off the wing until the Archive restores it.
    if (dispositions.has(hideNoteKey(seatNote.id))) continue;
    // The read's docs, so a ✕-parked send retires no seat (the one hide
    // filter, inside the read).
    const worked = seatWorked(
      accountId,
      seatNote.createdAt,
      doneTimes,
      recordSends(readById.get(accountId)?.docs ?? []),
    );
    if (!worked) seats.set(accountId, seat);
  }

  // Whose move it is, per account, from the read (field 4): the drumbeat
  // tells an answered thread from an open one by this verdict (slice 14).
  const moveById = new Map([...readById].map(([id, r]) => [id, r.whoseMove] as const));

  const { all: rankedAll } = buildQueue({
    accounts: peos,
    intelById,
    moveById,
    // The read's own last send and conversation (fields 2 and 16; G3, G4).
    readById,
    notesById: accountNotes,
    touches: touchesForRead,
    // The widest people count the app holds (Ted doctrine): the frozen SF
    // export AND the record's live thread roster — "find a second name" must
    // never fire under a green MULTI chip.
    contactCountById: (id: string) =>
      Math.max(contactCount(id), intelById.get(id)?.threads.people.length ?? 0),
    wireAtById,
    researchAtById,
    researchSignalsById,
    doneKeys: new Set(doneTimes.keys()),
    excludedIds,
    seatStaysIds,
    secondById,
    boardIds,
    seats,
    now,
  });

  const dayKey = userDayKey(now);

  // Worked moves leave the queue for the left wing; the rest stay live. The
  // wing reads the stamps themselves, so a stamp survives even if its rule
  // stops firing later in the day.
  // The stamp's subtext reads the Sendbook: the newest touch filed today for
  // that account says what was done — channel, step, who.
  const sendToday = new Map<string, ChannelTouch>();
  for (const l of sendbook.lines) {
    const t = Date.parse(l.at);
    if (Number.isNaN(t) || userDayKey(new Date(t)) !== dayKey) continue;
    if (!sendToday.has(l.accountId)) sendToday.set(l.accountId, l); // newest first
  }
  // When no channel line exists (a copy-stamp, a pre-register stamp), the
  // subtext carries the move's own specifics — the headline, the thread
  // subject, the quiet date, the CSM's name — never a bare label
  // (founder-decreed 2026-08-19: the subtext answers what it means). The
  // words per rule live in src/lib/groundwork/stamp.ts; this builds the facts.
  const threadSubjectOf = (id: string): string => {
    const l = sendbook.lines.find(
      (x) => x.accountId === id && x.from === "record" && x.clause,
    );
    return l ? l.clause : "";
  };
  const lastSendDateOf = (id: string): string => {
    const l = sendbook.lines.find((x) => x.accountId === id);
    return l ? monthDay(l.at) : "";
  };
  const wireHeadFor = (id: string): string => {
    let best: WireItem | null = null;
    for (const w of wireItems)
      if (w.accountIds.includes(id) && (!best || w.at > best.at)) best = w;
    return best?.headline ?? "";
  };
  const seatDayOf = (id: string): string => {
    const n = notesMap.get(`${SEAT_NS}${id}`)?.[0];
    return n ? (parseSeatBody(n.body)?.day ?? "") : "";
  };
  // The gem a stamp names: the one the record answered today, once the
  // operator's send has reached it, else the one still leading. The folded
  // second record, so a drop keyed by a shell id stamps under its account.
  const stampGem = (id: string) => {
    const sr = secondFolded.get(id);
    return (
      (sr?.gems ?? []).find(
        (g) => g.actedDay === dayKey && g.whoKind !== "colleague" && !!g.act,
      ) ?? outreachGem(sr)
    );
  };
  const ruleFacts = (id: string) => {
    const r = researchByAccount.get(id);
    // The age the move spoke: the newer of the account's own pass and the
    // sweep, as the queue reads it (G7). No own pass means the book-wide one.
    const researchAt = r ? (latestResearchAt(r.at, sweepAtFor(id)) ?? r.at) : "";
    const lane = ridingLaneDate(accountNotes.get(id), now);
    const gem = stampGem(id);
    return {
      wireHeadline: wireHeadFor(id),
      intentActivities: intentById.get(id)?.activities ?? null,
      ridingLaneCloses: lane ? monthDay(lane) : "",
      threadSubject: threadSubjectOf(id),
      lastSendDate: lastSendDateOf(id),
      csm: getPeo(id)?.csm ?? "",
      researchAgeDays: researchAt
        ? Math.floor((now.getTime() - Date.parse(researchAt)) / 86_400_000)
        : null,
      seatDay: seatDayOf(id),
      gemTerm: gem?.term ?? "",
      gemWho: gem?.who[0] ?? "",
      supportCases: engagedNeverIntroduced(secondFolded.get(id), now)?.cases ?? null,
    };
  };

  const doneToday: {
    name: string;
    at: string;
    sub: string;
    mk: string;
    accountId: string;
  }[] = [];
  for (const [key, at] of doneTimes) {
    const m = new RegExp(`^groundwork:${dayKey}:([^:]+):(.+)$`).exec(key);
    if (!m) continue;
    const name = getPeo(m[1])?.name;
    if (name)
      doneToday.push({
        name,
        at: clockShort(at),
        // The channel line leads when a touch is filed, else the rule's
        // words (D27, ship order 2026-10-06): one choice, pinned (wingStamp).
        sub: wingStamp(sendToday.get(m[1]), m[2], () => ruleFacts(m[1])),
        mk: `${m[1]}:${m[2]}`,
        accountId: m[1],
      });
  }
  doneToday.sort((a, b) => a.at.localeCompare(b.at));

  // The pre-answer rule (decreed 2026-08-19): an outbound the record already
  // holds today answers the Channel Ask before it opens — the chip row never
  // shows for an account whose send is on file.
  const recordSendToday = new Set<string>();
  for (const l of sendbook.lines) {
    const t = Date.parse(l.at);
    if (l.from === "record" && !Number.isNaN(t) && userDayKey(new Date(t)) === dayKey)
      recordSendToday.add(l.accountId);
  }

  const live = rankedAll.filter(
    (q) => !doneTimes.has(`groundwork:${dayKey}:${moveKey(q)}`),
  );
  const QUEUE_SHOW = 6;
  const liveTop = live.slice(0, QUEUE_SHOW);
  const overflow = Math.max(0, live.length - liveTop.length);

  const { focus, file: fileParam } = await searchParams;
  const stageItem =
    (focus && liveTop.find((q) => q.accountId === focus)) || liveTop[0] || null;
  const stageAccount = stageItem ? getPeo(stageItem.accountId) : undefined;
  const waiting = liveTop.filter((q) => q !== stageItem);
  const nextItem = stageItem
    ? liveTop[(liveTop.indexOf(stageItem) + 1) % liveTop.length]
    : null;
  const fileOpen = fileParam === "1";

  // The rows the stage's doors open to (the meat law; pass 8 G5): the support
  // spike's day, the colleague's thread behind the collision flag, and the
  // roundup brief's prep. The staged slice is read for this one account,
  // only when a door needs it; the doors carry row keys, and every excerpt
  // comes down from the evidence route on click.
  const stageSr = stageItem ? secondById.get(stageItem.accountId) : undefined;
  // The quiet flag reads both records (S-18; the direct doctrine): the
  // export's colleague row and a colleague's live thread in the operator's
  // own record, by latest, through the read's docs and declared roster.
  const stageCollision = stageItem
    ? collisionFor(stageSr, now, readById.get(stageItem.accountId))
    : null;
  const stageRows =
    stageItem &&
    stageSr &&
    ((stageItem.ruleId === "roundup-slot" && !!stageAccount?.csm) ||
      (!!stageCollision?.colleague && !stageCollision.colleague.noteId) ||
      !!stageSr.support?.spike)
      ? await fetchStageRows(stageItem.accountId).catch(() => [])
      : [];

  const file =
    stageItem && stageAccount
      ? buildFile(stageAccount, {
          queueItem: stageItem,
          intel: intelById.get(stageItem.accountId),
          intent: intentById.get(stageItem.accountId) ?? null,
          notes: accountNotes.get(stageItem.accountId) ?? [],
          touches: (touchesByAccount.get(stageItem.accountId) ?? []).map((t) => ({
            subjectKey: t.subjectKey,
            label: t.label,
            contactedAt: t.contactedAt,
          })),
          wire: wireItems,
          contacts: contactsFor(stageItem.accountId).map((c) => ({
            name: [c.first, c.last].filter(Boolean).join(" "),
            title: c.title,
          })),
          laneDate: ridingLaneDate(accountNotes.get(stageItem.accountId), now),
          research: researchByAccount.get(stageItem.accountId) ?? null,
          // The read's relationship — the record's most-seen person over the
          // book's seed; an account with no record reads the seed.
          relationship:
            readById.get(stageItem.accountId)?.relationship ??
            relationshipFor([], contactsFor(stageItem.accountId), {
              name: stageAccount.contactName,
              email: stageAccount.contactEmail,
            }),
          lastOutbound: readById.get(stageItem.accountId)?.lastOutbound?.at ?? "",
          second: (() => {
            const sr = stageSr;
            // With no export, the composed thing still carries the record's
            // quiet flag (S-18).
            if (!sr) return stageCollision ? { collision: stageCollision } : null;
            const gem = outreachGem(sr);
            // The roundup brief's prep (5.3): the CSM's own last five rows on
            // this account, each a door to its excerpt, from the staged slice
            // read above only when the slot is on stage.
            const csmPrep =
              stageItem.ruleId === "roundup-slot"
                ? csmPrepRows(stageRows, stageAccount.csm)
                : [];
            return {
              supportCases: engagedNeverIntroduced(sr, now)?.cases ?? sr.support?.total,
              gem: gem
                ? { act: gem.act, reason: gem.reason, term: gem.term, who: gem.who }
                : null,
              collision: stageCollision,
              csmPrep,
            };
          })(),
          now,
        })
      : null;

  const idToName = (id: string) => getPeo(id)?.name ?? id;

  // The readout — one builder for the drawer AND every file's pull tab. It
  // reads the UNCAPPED ranked list, so a file's paragraph always has its
  // right-hand side in the full readout. "Open conversation" means a live
  // thread — an archived one is closed, not open.
  const outreachAccountIds = new Set<string>();
  for (const t of touches) {
    const m = /^outreach:(.+)$/.exec(t.subjectKey);
    if (m && t.status !== "archived") outreachAccountIds.add(m[1]);
  }
  // The record's threads count too (Ted doctrine): a filed conversation is
  // as open as a logged one — the number spoken to Russ must not undercount.
  // Our side of it is the read's own last send (field 2), so a self-assigned
  // task opens no conversation (G3).
  for (const id of intelById.keys()) {
    const r = readById.get(id);
    if (r?.lastInbound || r?.lastOutbound) outreachAccountIds.add(id);
  }
  // And the Sendbook's tapped touches — a LinkedIn message is an open door.
  for (const id of sendTapsById.keys()) outreachAccountIds.add(id);
  const weekAgo = now.getTime() - 7 * 86_400_000;
  const partnerTouches = touches.filter(
    (t) =>
      t.subjectKey.startsWith("partner-outreach:") &&
      Date.parse(t.contactedAt) >= weekAgo,
  );
  // The dated week ahead — follow-ups on live threads plus decisions the
  // record carries, inside 7 days, phrased plainly.
  const withinWeek = (iso: string | null | undefined): boolean => {
    if (!iso) return false;
    const t = Date.parse(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
    if (Number.isNaN(t)) return false;
    const days = (t - now.getTime()) / 86_400_000;
    return days >= -0.5 && days <= 7;
  };
  const nextSevenDays: string[] = [];
  for (const t of touches) {
    const m = /^outreach:(.+)$/.exec(t.subjectKey);
    if (!m || t.status === "archived" || !withinWeek(t.followUpAt)) continue;
    nextSevenDays.push(`${idToName(m[1])} — dated follow-up ${monthDay(t.followUpAt)}`);
  }
  for (const [id, intel] of intelById) {
    const d = intel.timing?.value.dateIso;
    if (d && withinWeek(d))
      nextSevenDays.push(`${idToName(id)} — their decision is dated ${monthDay(d)}`);
  }
  // The second record's arithmetic for the readout — counts, never model text.
  const srStats = (() => {
    if (secondById.size === 0) return null;
    let active30 = 0;
    let cold = 0;
    for (const [id, sr] of secondById) {
      if (!peos.some((p) => p.id === id)) continue;
      const lh = sr.rollup?.lastHuman?.day ?? "";
      if (lh && (now.getTime() - Date.parse(`${lh}T12:00:00Z`)) / 86_400_000 <= 30)
        active30 += 1;
      if (verifiedCold(sr)) cold += 1;
    }
    return { active30, verifiedCold: cold };
  })();

  const readout = buildReadout({
    secondRecord: srStats,
    accounts: peos,
    queue: rankedAll,
    intelById,
    readById,
    intentById,
    outreachAccountIds,
    partnerUpdatesSent: partnerTouches.length,
    partnerUpdatesReplied: partnerTouches.filter(
      (t) => t.status === "replied" || t.status === "responded",
    ).length,
    nextSevenDays: nextSevenDays.slice(0, 6),
    now,
  });
  const readoutPayload = readoutText(readout);
  const lintIssues = lint(readoutPayload);
  const readoutReadAt = doneTimes.get(READOUT_READ_KEY);

  const nudge = intentReadDue(accountNotes, now);
  const wireOrdered = orderWire(wireItems);
  const wireIsDue = sweepDue(wireItems, now);
  const inst = institutionCard(institutions, now);
  // A wire timestamp: today's items carry the clock, older ones their date.
  const wireWhen = (at: string): string => {
    const t = Date.parse(at);
    if (Number.isNaN(t)) return "";
    const d = new Date(t);
    return userDayKey(d) === dayKey
      ? clockShort(at)
      : d.toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
          timeZone: "America/Chicago",
        });
  };
  const stageHref = (q: { accountId: string }, open?: boolean) =>
    `/groundwork?focus=${encodeURIComponent(q.accountId)}${open ? "&file=1" : ""}`;

  return (
    <>
      <AppWayfinder current="Groundwork" trail="Homeroom" />
      <main className={styles.wrap}>
        <Instrument />

        {nudge && (
          <div className={styles.due}>
            <span className={styles.dueBar} />
            <span>
              ▤ <b>Run the Sales Nav grab.</b> The intent read is due. The grab lives on
              the <Link href="/intake">Capture page</Link>. Paste the rows into the{" "}
              <Link href="/">HomeRoom</Link> Chute or an account&apos;s Drop. They file as
              a note and the queue re-ranks on who is reading us. Ten minutes.
            </span>
          </div>
        )}

        {/* ── The wings ─────────────────────────────────────────────── */}
        <div className={styles.wings}>
          <aside className={`${styles.wing} ${styles.wingL}`} aria-label="Done today">
            <span className={styles.wingKick}>Done today</span>
            {doneToday.length === 0 ? (
              <span className={styles.wingItem}>Nothing worked yet.</span>
            ) : (
              doneToday.map((d, i) => (
                <span key={i} className={`${styles.wingItem} ${styles.wingDone}`}>
                  <span className={styles.wingTick}>✓</span> {d.name}{" "}
                  <span className={styles.wingTm}>{d.at}</span>
                  {canWrite && (
                    <form
                      action={unWork.bind(null, d.mk, d.accountId)}
                      className={styles.wingUndoForm}
                    >
                      <button
                        className={styles.wingUndo}
                        type="submit"
                        title="Take it back. The move returns to the queue, and the tap it filed leaves the register. A filed email stays on the record."
                      >
                        ↺
                      </button>
                    </form>
                  )}
                  {d.sub && <span className={styles.wingSub}>{d.sub}</span>}
                </span>
              ))
            )}
          </aside>

          {/* ── Center stage ────────────────────────────────────────── */}
          <section className={styles.stage}>
            {stageItem && stageAccount ? (
              <>
                {stageItem.carried && (
                  <span
                    className={styles.stgCarry}
                    title="Surfaced yesterday and left unworked. A carried move ranks first among equals until it is worked."
                  >
                    left from yesterday
                  </span>
                )}
                <div className={styles.stgName}>
                  <Link
                    href={`/accounts?focus=${encodeURIComponent(stageItem.accountId)}`}
                  >
                    {stageItem.name}
                  </Link>
                  {proximityMark(stageAccount) && (
                    <span className={styles.prox}>{proximityMark(stageAccount)}</span>
                  )}
                </div>
                <h1 className={styles.stgAct}>{stageItem.action}</h1>
                <p className={styles.stgWhy}>{stageItem.reason}</p>
                {(() => {
                  const sr = stageSr;
                  const col = stageCollision;
                  // A colleague's thread in the operator's own record raises
                  // the flag with no export behind it (S-18), so the chip row
                  // can stand on the collision alone.
                  if (!sr && !col) return null;
                  const warm = sr ? intentWarm(sr, now) : null;
                  return (
                    <EvidenceChips
                      accountId={stageItem.accountId}
                      support={
                        sr?.support && sr.support.total > 0
                          ? {
                              total: sr.support.total,
                              spikeDay: sr.support.spike?.day ?? "",
                              spikeN: sr.support.spike?.n ?? 0,
                              spikeCites: spikeCites(
                                stageRows,
                                sr.support.spike?.day ?? "",
                              ),
                            }
                          : null
                      }
                      intent={
                        sr?.intent
                          ? {
                              opens30: sr.intent.windows.w30.o,
                              clicks30: sr.intent.windows.w30.c,
                              lastOpen: sr.intent.windows.lastOpen,
                              sends7: sr.intent.windows.w7?.s ?? 0,
                            }
                          : warm
                            ? {
                                opens30: warm.opens30,
                                clicks30: warm.clicks30,
                                lastOpen: warm.lastOpen,
                                sends7: 0,
                              }
                            : null
                      }
                      collision={
                        col
                          ? {
                              mktgSends7: col.mktgSends7,
                              // The record's entry opens to its own words; the
                              // export's row opens from the staged slice.
                              colleague: col.colleague
                                ? {
                                    ...col.colleague,
                                    cite: col.colleague.noteId
                                      ? null
                                      : collisionCite(stageRows, col.colleague),
                                  }
                                : null,
                            }
                          : null
                      }
                      // A colleague's gem produces nothing for the operator
                      // anywhere (C6 as amended; pass 8 G1).
                      gems={sr ? chipGems(sr.gems) : []}
                    />
                  );
                })()}
                <div className={styles.stgActs}>
                  {canWrite && stageItem.ruleId === "stale-above-gate" && (
                    <form
                      action={runResearchNow.bind(
                        null,
                        moveKey(stageItem),
                        stageItem.accountId,
                      )}
                    >
                      <button
                        className={styles.btnAccent}
                        type="submit"
                        title="Runs the deep pass on this account and stamps the move worked. Takes a minute."
                      >
                        Run it now
                      </button>
                    </form>
                  )}
                  {canWrite &&
                    (recordSendToday.has(stageItem.accountId) ? (
                      <form action={markWorked.bind(null, moveKey(stageItem))}>
                        <button
                          className={
                            stageItem.ruleId === "stale-above-gate"
                              ? styles.btn2nd
                              : styles.btnAccent
                          }
                          type="submit"
                          title="The record already holds today's send. This stamps the move worked."
                        >
                          Worked it
                        </button>
                      </form>
                    ) : (
                      <ChannelAsk
                        mk={moveKey(stageItem)}
                        accountId={stageItem.accountId}
                        // The record's people merged with the book's contacts;
                        // the row asks only when the merged set holds more
                        // than one name (ruled 2026-09-25, C18).
                        contacts={whoChipNames(
                          readById.get(stageItem.accountId)?.people ?? [],
                          contactsFor(stageItem.accountId),
                        )}
                        clause={stageItem.action}
                        accent={stageItem.ruleId !== "stale-above-gate"}
                      />
                    ))}
                  {canWrite && stageItem.ruleId !== "stale-above-gate" && (
                    <form action={runResearchNow.bind(null, null, stageItem.accountId)}>
                      <button
                        className={styles.btn2nd}
                        type="submit"
                        title="Runs the deep pass on this account. The move stays open. Takes a minute."
                      >
                        Run fresh research
                      </button>
                    </form>
                  )}
                  <Link className={styles.btn2nd} href={stageHref(stageItem, !fileOpen)}>
                    {fileOpen ? "Close the file" : "Open the file ▾"}
                  </Link>
                  {nextItem && nextItem !== stageItem && (
                    <Link className={styles.btnQuiet} href={stageHref(nextItem)}>
                      Not now
                    </Link>
                  )}
                </div>

                {fileOpen && file && (
                  <div className={styles.stgFile}>
                    <span className={styles.kick}>
                      The working file
                      {file.csm && file.csm !== "Unassigned"
                        ? ` · ${file.csm} is the partner manager`
                        : ""}
                      {file.sourcesLine ? ` · sources: ${file.sourcesLine}` : ""}
                    </span>
                    {file.story && <p className={styles.fileStory}>{file.story}</p>}
                    <div className={styles.draft}>
                      <span
                        className={styles.kick}
                        style={{ display: "block", marginBottom: 6 }}
                      >
                        The composed thing · to {file.composed.to}
                      </span>
                      {file.collisionLine && (
                        <span
                          className={styles.collideFlag}
                          title="Your note lands beside live motion. It informs; it never blocks."
                        >
                          ⚠ {file.collisionLine}
                        </span>
                      )}
                      {file.composed.payload}
                      {file.csmPrep.length > 0 && (
                        <details className={styles.prepFold}>
                          <summary>{prepKicker(file.csmPrep.length)} ▾</summary>
                          <div className={styles.prepLine}>
                            <CiteRows accountId={file.accountId} rows={file.csmPrep} />
                          </div>
                        </details>
                      )}
                    </div>
                    <div className={styles.people}>
                      {file.threadCount >= 1 && (
                        <span
                          className={[
                            styles.multi,
                            {
                              r: styles.multiRed,
                              y: styles.multiAmber,
                              g: styles.multiGreen,
                            }[multiTone(file.threadCount)],
                          ].join(" ")}
                          title={`${file.threadCount} ${file.threadCount === 1 ? "person carries" : "people carry"} this conversation`}
                        >
                          MULTI
                        </span>
                      )}
                      {file.people.map((person) => (
                        <span
                          key={person.name}
                          className={`${styles.chip} ${person.flag === "csm" ? styles.chipCsm : ""}`}
                        >
                          {person.name}
                          {person.title ? ` · ${person.title}` : ""}
                        </span>
                      ))}
                    </div>
                    {file.singleThread && (
                      <p className={styles.actNote}>
                        One person carries this conversation. The widening question is
                        inside the composed text.
                      </p>
                    )}
                    <div className={styles.acts}>
                      <CopyStamp
                        payload={file.composed.payload}
                        label={file.composed.label}
                        accent
                        action={
                          canWrite ? markWorked.bind(null, moveKey(stageItem)) : undefined
                        }
                      />
                      {file.composed.kind === "send-draft" && file.contactEmail && (
                        <a
                          className={styles.btn2nd}
                          href={`mailto:${encodeURIComponent(file.contactEmail)}?subject=${encodeURIComponent(
                            `${file.name} — from Groundwork`,
                          )}&body=${encodeURIComponent(file.composed.payload)}`}
                        >
                          Draft in your mail app
                        </a>
                      )}
                      {file.composed.kind === "ride-ask" &&
                        sfAccountUrl(file.accountId) && (
                          <a
                            className={styles.btn2nd}
                            href={sfAccountUrl(file.accountId) ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open the account in Salesforce. The owner&rsquo;s name is on
                            it.
                          </a>
                        )}
                      <Link
                        className={`${styles.btn2nd} ${styles.btnSmall}`}
                        href={`/accounts?focus=${encodeURIComponent(file.accountId)}`}
                      >
                        Open in Accounts
                      </Link>
                    </div>
                    <p className={styles.actNote}>
                      Copy puts the exact text on your clipboard and stamps the move.
                    </p>
                    <details className={styles.russ}>
                      <summary>
                        <span className={styles.russKick}>To Russ ▾</span>
                        <span>the paragraph he&rsquo;d hear about this account</span>
                        <span className={styles.russNote}>recomposes as you work</span>
                      </summary>
                      <div className={styles.russBody}>{file.russ}</div>
                    </details>
                    <div className={styles.hist}>
                      <span
                        className={styles.kick}
                        style={{ display: "block", marginBottom: 4 }}
                      >
                        The file&rsquo;s history
                      </span>
                      {file.history.length === 0 ? (
                        <p className={styles.histLine}>
                          Nothing on file yet. The first paste starts the record.
                        </p>
                      ) : (
                        file.history.map((h, i) => (
                          <div key={i} className={styles.histLine}>
                            <span className={styles.histAt}>
                              {h.atIso.slice(5, 10).replace("-", "/")}
                            </span>
                            <span>{h.line}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.stgClear}>
                The queue is clear. The next paste, read, or reply re-ranks everything.
              </div>
            )}
          </section>

          <aside
            className={`${styles.wing} ${styles.wingR}`}
            aria-label="Waiting, by heat"
          >
            <span className={styles.wingKick}>Waiting · by heat</span>
            {waiting.length === 0 ? (
              <span className={styles.wingItem}>No one behind this.</span>
            ) : (
              waiting.map((q) => (
                <Link
                  key={q.accountId}
                  className={styles.wingItem}
                  href={stageHref(q)}
                  title={`Ranked by the queue brain. The trigger: ${q.reason}`}
                >
                  <span className={`${styles.wingNm} ${styles[`h${heatOf(q)}`]}`}>
                    {q.name}
                  </span>
                  <span className={`${styles.tickHeat} ${styles[`tick${heatOf(q)}`]}`} />
                  {q.carried && (
                    <span
                      className={styles.wingCarry}
                      title="Surfaced yesterday and left unworked. The room never quietly forgets what it asked for."
                    >
                      {" "}
                      carried
                    </span>
                  )}
                  <span className={styles.wingWhy}>{q.reason}</span>
                </Link>
              ))
            )}
            {overflow > 0 && (
              <span className={styles.wingFoot}>And {overflow} more that can wait.</span>
            )}
          </aside>
        </div>

        {/* ── The lower deck ───────────────────────────────────────── */}
        <div className={styles.ldeck}>
          <div className={styles.ribbon}>
            <span className={styles.ribbonLabel}>Outside · the wire</span>
            <span className={styles.ribbonRule} />
            <span className={styles.ribbonCount}>
              {wireItems.length === 0 ? "no sweep yet" : `${wireItems.length} on file`}
            </span>
          </div>
          {wireOrdered.length === 0 ? (
            <div className={styles.empty}>
              The wire watches the outside: the EOR and PEO world, the named competitors,
              and every account name in the book. It files what matters with a
              one-sentence read. Nothing has been swept yet.
              {canWrite && wireAvailable() && (
                <form action={sweepWire} style={{ marginTop: 8 }}>
                  <SweepButton label="Run the first sweep" />
                </form>
              )}
            </div>
          ) : (
            <div className={styles.wire}>
              {wireOrdered.slice(0, 3).map((w) => (
                <div key={w.url} className={styles.wireItem}>
                  <span className={styles.wireSrc}>
                    {w.source} · {wireWhen(w.at) || w.at.slice(0, 10)}
                    {w.accountIds.slice(0, 2).map((id) => (
                      <span key={id} className={styles.wtag}>
                        {idToName(id)}
                      </span>
                    ))}
                  </span>
                  <span className={styles.wireHead}>
                    <a href={w.url} target="_blank" rel="noreferrer">
                      {w.headline}
                    </a>
                  </span>
                  <span className={styles.wireRead}>{w.read}</span>
                  {canWrite && w.accountIds.length > 0 && (
                    <div className={styles.wireActs}>
                      <form
                        action={attachWireToAccount.bind(
                          null,
                          w.accountIds[0],
                          w.headline,
                          w.source,
                          w.url,
                          w.read,
                        )}
                      >
                        <button
                          className={`${styles.btn2nd} ${styles.btnSmall}`}
                          type="submit"
                        >
                          File to {idToName(w.accountIds[0])}
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              ))}
              {canWrite && wireAvailable() && wireIsDue && (
                <form action={sweepWire}>
                  <SweepButton label="Sweep again. The last sweep is stale." small />
                </form>
              )}
            </div>
          )}

          <div className={styles.ribbon}>
            <span className={styles.ribbonLabel}>The institutions</span>
            <span className={styles.ribbonRule} />
            <span className={styles.ribbonCount}>
              {inst?.eventSoon ? "next 7 days" : "standing"}
            </span>
          </div>
          {inst ? (
            <div className={styles.instCard}>
              <b>{inst.inst.name}</b>
              {inst.inst.nextEventIso && inst.eventSoon
                ? ` — gathering ${monthDay(inst.inst.nextEventIso)}.`
                : "."}{" "}
              {inst.inst.note ?? ""}
            </div>
          ) : (
            <div className={styles.instCard}>
              No institution on the calendar yet. Start with a verification, not a
              membership. Verify the Global Chamber&rsquo;s Chicago chapter first: who
              convenes it, who attends, what membership asks. Education first, never a
              lead request.
            </div>
          )}

          <div className={styles.ribbon}>
            <span className={styles.ribbonLabel}>Standing by</span>
            <span className={styles.ribbonRule} />
            {lintIssues.length > 0 && (
              <span className={styles.ribbonCount}>
                {lintIssues.length} flag{lintIssues.length === 1 ? "" : "s"} for the
                reader
              </span>
            )}
          </div>
          <details className={styles.russ}>
            <summary>
              <span className={styles.russKick}>State of play ▾</span>
              <span>read this to Russ, any moment he asks</span>
              <span className={styles.russNote}>composes itself</span>
            </summary>
            <div className={styles.russBody}>
              {readout.sections.map((s) => (
                <div key={s.title} style={{ marginBottom: 10 }}>
                  <span className={styles.kick} style={{ display: "block" }}>
                    {s.title}
                  </span>
                  {s.paragraphs.map((para, i) => (
                    <p key={i} style={{ margin: "4px 0 8px" }}>
                      {para.text}
                    </p>
                  ))}
                </div>
              ))}
              <CopyStamp
                payload={readoutPayload}
                label="Copy the readout"
                action={canWrite ? markReadoutRead : undefined}
              />
              {readoutReadAt && (
                <p className={styles.actNote}>
                  Last read to Russ {monthDay(readoutReadAt)}.
                </p>
              )}
            </div>
          </details>
        </div>

        {/* ── The Tallyfoot — the Sendbook's door ──────────────────── */}
        <Link
          href="/sendbook"
          className={styles.tallyfoot}
          title="Open the Sendbook. Every touch you made is kept there."
        >
          {(() => {
            const age = dropAgeDays(secondById, now);
            return age != null && age > DROP_STALE_DAYS ? (
              <span className={styles.staleFoot}>
                SECOND RECORD · {Math.floor(age)} DAYS OLD · DROP THE FRESH EXPORT ·{" "}
              </span>
            ) : null;
          })()}
          {sendWeek.total === 0 ? (
            <>THIS WEEK · NOTHING WORKED YET · THE SENDBOOK →</>
          ) : (
            <>
              THIS WEEK · <b>{sendWeek.total} WORKED</b>
              {sendWeek.byChannel.map(([ch, n]) => ` · ${n} ${ch}`).join("")} ·{" "}
              <b>
                {sendWeek.accounts} ACCOUNT{sendWeek.accounts === 1 ? "" : "S"}
              </b>
              {sendWeek.replied > 0 ? ` · ${sendWeek.replied} REPLIED` : ""} · THE
              SENDBOOK →
            </>
          )}
        </Link>
      </main>
    </>
  );
}
