// Groundwork's day, as the page and the overnight drafts both read it: every
// store the queue brain reads, read once, and the ranked queue built from
// them. Moved out of the page (2026-10-19) so the drafts job before the send
// band ranks the same moves the stage will show; the page derives everything
// else from what this hands back. Nothing here writes.

import { csms, getPeo, peos } from "@/lib/book";
import { contactCount, contactsFor } from "@/lib/book/contacts";
import type { DealIntel } from "@/lib/intel/types";
import { readAccount, secondRecordFor, type AccountRead } from "@/lib/record/read";
import { readFromStores } from "@/lib/record/stores";
import { hideNoteKey } from "@/lib/record/hide";
import { homeSideFrom } from "@/lib/pipeline/build";
import { RESEARCH_NS } from "@/lib/intel/deep-research";
import {
  isNamespacedAccountId,
  loadAccountNotes,
  loadDispositions,
  loadDoneTimes,
  loadSnoozes,
  loadTodos,
  loadTouches,
} from "@/lib/today/overlay";
import {
  buildQueue,
  ledgerExclusions,
  liveMotionIds,
  researchInputs,
  secondOnlyMotionIds,
} from "@/lib/groundwork/day";
import { fetchSecondRecords, type SecondRecord } from "@/lib/activity/read";
import { seatWorked, tapTouches } from "@/lib/groundwork/worked";
import { loadDashboard } from "@/lib/dashboard/data";
import { readOutcome } from "@/lib/dashboard/outcome";
import { digestFor, digestForCardName } from "@/lib/intel/digest";
import { isWire } from "@/lib/ingest/dialect";
import { intentFor, type IntentSignal } from "@/lib/groundwork/signals";
import { INST_NS, parseInstBody, type Institution } from "@/lib/groundwork/institutions";
import { WIRE_NS, parseWireBody, type WireItem } from "@/lib/groundwork/wire";
import {
  SENDBOOK_NS,
  buildSendbook,
  recordSends,
  weekStats,
  type NoteLike as SendNote,
} from "@/lib/sendbook/read";
import { SEAT_NS, parseSeatBody } from "@/lib/act/lane";

export async function loadGroundworkDay(now: Date) {
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
  // The deep-research backbone: the newest research:<account> note per
  // account, its moment and the signals it found (G7).
  const researchByAccount = researchInputs(notesMap);
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
    // The deep-research pass files as research:<account>; researchInputs
    // reads it for the queue brain below.
    if (id.startsWith(RESEARCH_NS)) continue;
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
  const sendTapTouches = tapTouches(sendTapsById);
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
  for (const id of ledgerExclusions(dispositions, snoozes.keys())) excludedIds.add(id);
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

  return {
    notesMap,
    touches,
    doneTimes,
    dispositions,
    snoozes,
    todos,
    accountNotes,
    boardIds,
    excludedIds,
    homeSide,
    institutions,
    intelById,
    intentById,
    moveById,
    readById,
    researchAtById,
    researchByAccount,
    researchSignalsById,
    seatStaysIds,
    seats,
    secondById,
    secondFolded,
    sendTapTouches,
    sendTapsById,
    sendWeek,
    sendbook,
    touchesByAccount,
    touchesForRead,
    wireAtById,
    wireItems,
    rankedAll,
  };
}

export type GroundworkDay = Awaited<ReturnType<typeof loadGroundworkDay>>;
