// The single account read (the Chute brains refactor plan, §2.2; slice 10).
// One read per account per request that every surface consumes, built from
// the loaders' output and nothing else: pure, synchronous, no store of its
// own. Seven corpora and five whose-move spellings used to re-derive these
// facts from the same rows with different subsets and different clocks; this
// is the widest spelling the record supports, written once (pass 2 E), and
// the Ted doctrine's clause made code — a derived fact reads the WIDEST live
// source the app holds, never a private narrow one, and a fact's two stores
// merge by latest.
//
// The HomeRoom read it first (slice 10); Groundwork, the drawer, the Sendbook
// and whose move followed (slices 11a to 14), and Accounts is the one left
// (§2.2, the migration order). The old path, corpusFor, retired with its
// last caller (pass 8 housekeeping, #369); tests/record-read pins the read's
// intel to extractDealIntel over the room's own slice of the rows on every
// fixture the old path's suites held.

import { secondRecordFor, type SecondRecord } from "@/lib/activity/read";
import type { DashCardRow } from "@/lib/dashboard/data";
import { readOutcome } from "@/lib/dashboard/outcome";
import { DASH_NODES } from "@/lib/dashboard/stages";
import { effectiveAt } from "@/lib/intel/clock";
import type { DigestEntry } from "@/lib/intel/digest";
import { THEIR_PROMISE_RE, extractDealIntel } from "@/lib/intel/extract";
import { GLYPH_RE } from "@/lib/ingest/dialect";
import { HEADCOUNT, PRODUCT_TERMS, countriesIn, countryNear } from "@/lib/intel/lexicon";
import { isMeetingNote, meetingRead } from "@/lib/intel/meeting";
import { peopleFor, type ContactForPeople, type PersonRow } from "@/lib/intel/people";
import { MINE_RE, isHomeSideName, normPerson } from "@/lib/intel/provenance";
import { relationshipFor, type Relationship } from "@/lib/intel/relationship";
import type { DealIntel, ProductKey, SourcedFact } from "@/lib/intel/types";
import { dayBlown, owedByThem } from "@/lib/room/owed";
import { lastTouchRead, newestOutbound, targetOf } from "@/lib/room/touch";
import type { EntryHeadcount } from "@/lib/sf-timeline";
import { cardNextStep } from "@/lib/today/build";
import type { AccountNote } from "@/lib/today/overlay";
import { chicagoDay } from "@/lib/tz";
import {
  buildDocs,
  evidenceRung,
  type EvidenceRung,
  type RecordDoc,
  type TouchRow,
} from "./docs";
import { isTheirAcceptance, whoseMove, type WhoseMove } from "./whose-move";

/** The deal facts a Filing's read states on one entry (src/lib/sf-timeline.ts,
 *  TimelineEntry; slice 4). A row that carries them was read by the model,
 *  and its facts are taken over the regex (§2.1, §7 item 13). */
export type EntryFacts = {
  countries?: readonly string[];
  products?: readonly string[];
  headcounts?: readonly EntryHeadcount[];
};

/** A record row as the read takes it: the wide loader's row, and the facts
 *  its Filing stated for it when the caller has them. */
export type RecordNote = AccountNote & { facts?: EntryFacts | null };

export type AccountReadInput = {
  /** The account, with the book's seeds for it — the roster the people index
   *  joins for titles and emails, and the seeded primary contact the
   *  relationship falls back to. Seeds stand in only until the record speaks
   *  (the Ted doctrine). */
  account: {
    id: string;
    name: string;
    contacts?: readonly ContactForPeople[];
    contact?: { name?: string; email?: string };
  };
  /** The wide loader's folded rows for the account, every lane. */
  notes: readonly RecordNote[];
  /** The touch log — the whole log or the account's slice; the read keeps
   *  what names the account (outreach:<id> and the label match, as
   *  room/page.tsx read it). */
  touches: readonly (TouchRow & { status?: string })[];
  /** Every todo on the account, done included; the read keeps the account's.
   *  `filingId` links a loop to the filing that wrote it (§2.1), so the
   *  promise can cite the entry it came from. */
  todos: readonly {
    id: string;
    body: string;
    done: boolean;
    accountId: string;
    createdAt: string;
    filingId?: string;
  }[];
  /** The disposition markers; the hide filter reads `hide:note:<id>`. */
  dispositions: ReadonlyMap<string, unknown>;
  /** The second record for the account, folded by canonical id (E17;
   *  secondRecordFor, src/lib/activity/read.ts, does the fold). */
  secondRecord?: SecondRecord | null;
  /** csms ∪ homeSideFrom, declared, never optional (E9). */
  homeSide: readonly string[];
  /** The seed the record outranks. */
  digest?: DigestEntry | null;
  now: Date;
  /** The board's card for the account, when one exists, and the operator's
   *  node labels — the stage (E12) reads them and nothing else does. */
  board?: { card: DashCardRow; labels?: Record<string, string> } | null;
};

/** A fact with the doc it stands on and whether that doc is the tape, so a
 *  consumer can rank or exclude the tape without re-scanning (E18). */
export type TapedFact<T> = SourcedFact<T> & { tape: boolean };

type DealOutcome = NonNullable<ReturnType<typeof readOutcome>>;

/** One promise still open on their side (field 14's list). */
export type TheirPromise = {
  /** Who owes it, as the record names them; "" when it cannot say. */
  who: string;
  text: string;
  /** The loop's filing, the Owed line's note, the inbound's own moment. */
  at: string;
  /** The day they named, yyyy-mm-dd. */
  day?: string;
  /** The day ended with a hearer on record (D28). The colleague who relayed
   *  a promise heard it, so a relay with a day counts (the founder,
   *  2026-10-06). */
  promised?: boolean;
  /** Who heard it, as the record names them. */
  hearer?: string;
  /** The colleague the promise reached us through, as the record names
   *  them; absent when the account's own people said it to us. A relay is
   *  detected from the record alone: the entry it came from was sent by
   *  someone on our side, or the record names a colleague as the promiser,
   *  and then `who` is the account person the record names, else "" (the
   *  founder, 2026-10-06). The colleague is never the person who owes it. */
  via?: string;
  /** A loop the read filed (D10), a line of the cleaner's Owed block, or
   *  the newest inbound's own words. */
  kind: "loop" | "owed" | "inbound";
  /** The filed entry it came from and its rung of the evidence ladder; null
   *  when the record cannot point at one, never a guess. */
  entry: { at: string; noteId: string; rung: EvidenceRung } | null;
};

export type Stage = {
  step: {
    nodeKey: string;
    nodeLabel: string;
    item: string;
    index: number;
    ageDays: number | null;
  } | null;
  outcome: DealOutcome | null;
  /** Every gate on every stage checked, nothing stamped. */
  allGatesDone: boolean;
  /** The deal sits at demo or later — Groundwork prospects the book it is
   *  NOT actively closing (CLAUDE.md, Groundwork face). */
  late: boolean;
  /** On the board, not archived, no outcome stamped. */
  live: boolean;
};

/** The twenty fields of pass 2 E, in its order. */
export type AccountRead = {
  /** 1 · every store as docs, newest first, hidden rows flagged. */
  docs: RecordDoc[];
  /** 2 · the operator's newest send: the record's, or a logged touch with
   *  its message, whichever is later; never self-addressed, never a meeting,
   *  never ahead of today. */
  lastOutbound: { at: string; noteId: string; to: string } | null;
  /** 3 · their newest word to us, through the machinery and closer gates. */
  lastInbound: { at: string; who: string; promise: boolean; noteId: string } | null;
  /** 4 · whose move, from 2, 3, the meeting, the acceptance and the touch log. */
  whoseMove: WhoseMove;
  /** 5 · their voice, whoever's inbox caught it: the last warm moment keeps
   *  sign-offs and meetings and drops machinery and our own side; the last
   *  reply is a substantive inbound. "" when none. */
  warmth: { lastWarmAt: string; lastReplyAt: string };
  /** 6 · the newest meeting and who it was with. */
  lastMeeting: { at: string; who: string; noteId: string } | null;
  /** 7 · when we last touched: the record's outbound and the touch log
   *  merged by latest (C3). */
  lastTouch: { at: string; who: string; awaitingReply: boolean; source: string } | null;
  /** 8 · the note ids the operator ✕-parked. */
  hidden: Set<string>;
  /** 9 · the declared roster, handed to every test. */
  homeSide: readonly string[];
  /** 10 · today, Chicago. */
  today: { key: string; isToday: (iso: string) => boolean };
  /** 11 · the deal facts, extracted once over the visible docs. */
  intel: DealIntel;
  /** 12 · the board's position; null when the account has no card. */
  stage: Stage | null;
  /** 13 · who this deal runs through. */
  relationship: Relationship;
  /** 14 · what they said they would do, newest first: a loop or Owed line
   *  on their side, else the newest inbound's own promise. */
  theirPromise: {
    who: string;
    text: string;
    at: string;
    day?: string;
    promised?: boolean;
  } | null;
  /** 14 · the whole list theirPromise heads: every promise still open on
   *  their side, newest first, each with who heard it and the filed entry it
   *  came from. The HomeRoom's move line reads it (slice 18b). It is field
   *  14 grown, by the plan's own rule: a surface that needs a fact the read
   *  does not carry grows the read, never a private re-derivation (§2.2). */
  theirPromises: TheirPromise[];
  /** 15 · the newest invitation acceptance from their side: machinery, but
   *  proof the meeting exists. Our own side accepting books nothing, so it
   *  is never this fact; `who` is the person of theirs who accepted. */
  lastAccepted: { at: string; who: string; noteId: string } | null;
  /** 16 · any doc with a direction, or any touch. */
  conversationExists: boolean;
  /** 17 · the second record, folded by canonical id. */
  secondRecord: SecondRecord | null;
  /** 18 · the deal facts with the tape flag: the Filing's own per row when
   *  the row has one, the regex otherwise, the seed last. */
  countries: TapedFact<string>[];
  products: TapedFact<ProductKey>[];
  headcounts: TapedFact<{ n: number; country?: string }>[];
  /** 19 · everyone the record names, most-seen first, joined to the roster. */
  people: PersonRow[];
  /** 20 · the newest record entry's moment, "" on an empty record. */
  lastRecordAt: string;
};

const HIDE_NOTE = "hide:note:";

// ── the second record's fold (E17) ──────────────────────────────────────────
// The fold lives with the second record's read layer (src/lib/activity/read.ts)
// since slice 17, so the wide fetch, this lookup and the narrow reads share
// one spelling; it is re-exported here because this is where the pages and
// the stores import it from.
export { secondRecordFor };

// ── the stage (E12) ─────────────────────────────────────────────────────────
// The card's position as the surfaces already read it: the next gate as the
// commitment feed names it, the terminal stamp, every-gate-closed as the
// room's meter reads it, "late" as Groundwork's exclusion draws the line, and
// "live" as the Accounts sheet does.

const LATE_NODES = ["demo", "exec_summary", "proposal", "contract"] as const;

function stageOf(board: NonNullable<AccountReadInput["board"]>, now: Date): Stage {
  const { card } = board;
  const outcome = readOutcome(card.notes);
  const s = cardNextStep(card, board.labels ?? {}, now.getTime());
  const step = s
    ? {
        nodeKey: s.nodeKey,
        nodeLabel: s.nodeLabel,
        item: s.item,
        index: s.index,
        ageDays: s.ageDays,
      }
    : null;
  const allGatesDone =
    !outcome &&
    !step &&
    DASH_NODES.every((n) => {
      const checks = card.checks[n.key] ?? [];
      return n.checklist.every((_, idx) => checks[idx]);
    });
  const late =
    !!outcome ||
    LATE_NODES.some((k) => card.states[k] === "active" || card.states[k] === "done");
  return { step, outcome, allGatesDone, late, live: !card.archived && !outcome };
}

// ── the deal facts with the tape flag (E18) ─────────────────────────────────

function pushFact<T>(
  list: TapedFact<T>[],
  value: T,
  doc: { src: string; at: string },
  tape: boolean,
  eq: (a: T, b: T) => boolean,
): void {
  if (!list.some((f) => eq(f.value, value)))
    list.push({ value, src: doc.src, at: doc.at, tape });
}

/** The product key a Playbook product name reads as, through the lexicon:
 *  "contractor plus" before "contractor", as the extractor orders them. */
function productKeyOf(name: string): ProductKey | null {
  for (const key of Object.keys(PRODUCT_TERMS) as ProductKey[]) {
    if (key === "contractor" && PRODUCT_TERMS.contractor_plus.test(name)) continue;
    if (PRODUCT_TERMS[key].test(name)) return key;
  }
  return null;
}

const sameHc = (a: { n: number; country?: string }, b: { n: number; country?: string }) =>
  a.n === b.n && a.country === b.country;
const same = <T>(a: T, b: T) => a === b;

function factsOver(
  docs: readonly RecordDoc[],
  factsById: ReadonlyMap<string, EntryFacts>,
  seed: DealIntel | Partial<DealIntel> | undefined,
): Pick<AccountRead, "countries" | "products" | "headcounts"> {
  const countries: TapedFact<string>[] = [];
  const products: TapedFact<ProductKey>[] = [];
  const headcounts: TapedFact<{ n: number; country?: string }>[] = [];
  // The reads first, the tape after, so a fact both state is credited to the
  // read and a fact only the tape states carries the flag.
  const ordered = [...docs.filter((d) => !d.tape), ...docs.filter((d) => d.tape)];
  for (const doc of ordered) {
    const facts = doc.noteId ? factsById.get(doc.noteId) : undefined;
    if (facts) {
      // The Filing's own facts: the model named them per entry and the
      // sanitizer clamped them to the lexicon; the regex is not run on a row
      // the model already read (§2.1).
      for (const name of facts.countries ?? [])
        for (const c of countriesIn(name)) pushFact(countries, c, doc, false, same);
      for (const name of facts.products ?? []) {
        const key = productKeyOf(name);
        if (key) pushFact(products, key, doc, false, same);
      }
      for (const hc of facts.headcounts ?? []) {
        const country = countryNear(hc.what, 0) || undefined;
        pushFact(headcounts, { n: hc.count, country }, doc, false, sameHc);
      }
      continue;
    }
    for (const c of countriesIn(doc.text)) pushFact(countries, c, doc, doc.tape, same);
    for (const hc of doc.text.matchAll(new RegExp(HEADCOUNT.source, "gi")))
      pushFact(
        headcounts,
        { n: Number(hc[1]), country: countryNear(doc.text, hc.index ?? 0) },
        doc,
        doc.tape,
        sameHc,
      );
    // Every product the doc names — "contractor plus" before "contractor", as
    // the extractor orders them.
    for (const k of Object.keys(PRODUCT_TERMS) as ProductKey[]) {
      if (k === "contractor" && PRODUCT_TERMS.contractor_plus.test(doc.text)) continue;
      if (PRODUCT_TERMS[k].test(doc.text)) pushFact(products, k, doc, doc.tape, same);
    }
  }
  // The seed fills what no doc decided — a fallback, never a lock.
  for (const f of seed?.countries ?? []) pushFact(countries, f.value, f, false, same);
  for (const f of seed?.products ?? []) pushFact(products, f.value, f, false, same);
  for (const f of seed?.headcounts ?? []) pushFact(headcounts, f.value, f, false, sameHc);
  return { countries, products, headcounts };
}

// ── their promise (E14) ─────────────────────────────────────────────────────

const SENT_EDGE = /[.!?\n]/;

/** The sentence a match sits in. */
function sentenceAround(text: string, at: number): string {
  let from = at;
  while (from > 0 && !SENT_EDGE.test(text[from - 1]!)) from--;
  let to = at;
  while (to < text.length && !SENT_EDGE.test(text[to]!)) to++;
  return text.slice(from, to).replace(/\s+/g, " ").trim();
}

// ── the read ────────────────────────────────────────────────────────────────

export function readAccount(input: AccountReadInput): AccountRead {
  const { account, now } = input;
  const id = account.id;
  const name = account.name.toLowerCase();

  // The hide filter runs here, once, on the one grammar that survived the
  // scaffold (`hide:note:`; §2.2). The note survives in the table and in
  // `docs`, flagged; it leaves every derived fact below.
  const hidden = new Set<string>();
  for (const n of input.notes)
    if (input.dispositions.has(`${HIDE_NOTE}${n.id}`)) hidden.add(n.id);
  const visible = input.notes.filter((n) => !hidden.has(n.id));

  // The account's own slice of the shared stores, as the room read them.
  const todos = input.todos.filter((t) => id && t.accountId === id);
  const touches = input.touches.filter(
    (t) => (id && t.subjectKey === `outreach:${id}`) || t.label.toLowerCase() === name,
  );
  // The log's newest entry for the account. The table keeps one row per
  // subject, but Groundwork hands the Channel Ask's taps in beside it as
  // touches of their own (a tapped touch is a logged touch), and the clock
  // reads the latest of them (C3).
  const outreach = id
    ? touches
        .filter((t) => t.subjectKey === `outreach:${id}`)
        .sort((a, b) => Date.parse(b.contactedAt) - Date.parse(a.contactedAt))[0]
    : undefined;

  const homeSide = input.homeSide;
  const isHome = (n: string): boolean => isHomeSideName(n, homeSide);
  const digest = input.digest ?? undefined;

  const docs = buildDocs({
    notes: input.notes,
    todos,
    touches,
    digest,
    homeSide,
    hidden,
  });
  const live = docs.filter((d) => !d.hidden);
  const liveNotes = live.filter((d) => d.noteId);

  // 11 · the deal facts, over exactly the docs the old corpus held.
  const intel = extractDealIntel(live, digest);

  // 13 · who this deal runs through — the record's most-seen person outranks
  // the book's seeded primary the moment real communication files. The
  // read's declared home side goes with it, so a colleague who turns up on
  // more threads than anyone at the account is never the relationship (ruled
  // 2026-10-07, pass 8 call 7).
  const contacts = [...(account.contacts ?? [])];
  const relationship = relationshipFor(
    visible,
    contacts,
    { name: account.contact?.name, email: account.contact?.email },
    isHome,
  );

  // 19 · everyone the record names on the account's side, by the same roster.
  const people = peopleFor(visible, contacts, 12, isHome);

  // 7 · the touch clock: the record's own outbound and the touch log, by
  // latest. Our own side never becomes the person we wait on when the send
  // also went to the account (the Regis row, 2026-08-27); a send dated ahead
  // of today is not a touch already made (Trend, 2026-09-23).
  const lastTouch = lastTouchRead(
    visible,
    outreach
      ? {
          contactedAt: outreach.contactedAt,
          awaitingReply: outreach.status === "awaiting",
          who: relationship.name,
        }
      : null,
    isHome,
    now,
  );

  // 2 · the operator's newest send: the record's, or a logged touch with its
  // message, whichever is later (E2).
  const lastOutbound = (() => {
    const out = newestOutbound(visible, { now });
    const outAt = out ? effectiveAt(out.createdAt, out.body) : "";
    const sent = touches
      .filter((t) => t.message && Date.parse(t.contactedAt) <= now.getTime())
      .map((t) => t.contactedAt)
      .sort()
      .pop();
    if (!outAt && !sent) return null;
    if (outAt && (!sent || Date.parse(outAt) >= Date.parse(sent)))
      // newestOutbound hands back the row it was given, so the id is there.
      return {
        at: outAt,
        noteId: (out as RecordNote).id,
        to: targetOf(out!.actors, isHome),
      };
    return { at: sent!, noteId: "", to: "" };
  })();

  // 3 · their newest word to us, as the extractor read it, with its row.
  const lastInbound = intel.lastInbound
    ? {
        at: intel.lastInbound,
        who: intel.lastInboundWho,
        promise: intel.lastInboundPromise,
        noteId:
          live.find((d) => d.direction === "in" && d.at === intel.lastInbound)?.noteId ??
          "",
      }
    : null;

  // 6 · the newest meeting and who it was with. The roster's rung needs the
  // book's contacts for the account, which the read holds when the caller
  // hands them (meetingRead's third rung).
  const lastMeeting = (() => {
    const m = meetingRead(visible, isHome, (n) =>
      contacts.some(
        (c) =>
          `${c.first ?? ""} ${c.last ?? ""}`.trim().toLowerCase() ===
          n.trim().toLowerCase(),
      ),
    );
    if (!m) return null;
    const row = visible.find((n) => n.id === m.note.id);
    return {
      at: row ? effectiveAt(row.createdAt, row.body) : m.at,
      who: m.who,
      noteId: m.note.id ?? "",
    };
  })();

  // 15 · the newest acceptance from their side, at its own moment. Our own
  // side accepting books nothing (CLAUDE.md, the Sendbook, BOOKED): a
  // colleague on the invite accepting read "Wait for the meeting. Joseph
  // accepted." under the relationship's name (pass 8 H2), so the fact and
  // the rung read one test.
  const lastAccepted = (() => {
    const a = live.find((d) => isTheirAcceptance(d));
    return a ? { at: a.at, who: a.sender, noteId: a.noteId } : null;
  })();

  // 4 · whose move, over the same docs with the same touch log.
  const move = whoseMove(docs, todos, now, {
    touch: outreach
      ? {
          contactedAt: outreach.contactedAt,
          awaitingReply: outreach.status === "awaiting",
          who: relationship.name,
        }
      : null,
    isHomeSide: isHome,
  });

  // 5 · their voice. A sign-off warms and a meeting warms; machinery and our
  // own side never do (C4, C5). A reply is a substantive inbound.
  const warmth = (() => {
    let lastWarmAt = "";
    let lastReplyAt = "";
    for (const d of liveNotes) {
      const meeting = isMeetingNote({ body: d.text, source: d.source });
      const theirs = !!d.sender && !d.senderIsHome && !d.machinery;
      if ((meeting || theirs) && d.at > lastWarmAt) lastWarmAt = d.at;
      if (d.direction === "in" && !meeting && d.at > lastReplyAt) lastReplyAt = d.at;
    }
    return { lastWarmAt, lastReplyAt };
  })();

  // 14 · what they said they would do: their loops and Owed lines (D10, the
  // Simploy call), and the newest inbound's own promise, newest first. A
  // colleague is never the ball-holder. A promise that reached us through a
  // colleague is the account's, relayed (the founder, 2026-10-06): the move
  // chases the client, because the ask-your-colleague move is retired (C6 as
  // amended 2026-10-05) and going through the CSM stays the operator's own
  // choice (the direct doctrine).
  const theirPromises = (() => {
    const docByNote = new Map(live.filter((d) => d.noteId).map((d) => [d.noteId, d]));
    const entryOf = (noteId: string): TheirPromise["entry"] => {
      const d = docByNote.get(noteId);
      return d ? { at: d.at, noteId, rung: evidenceRung(d) } : null;
    };
    // The colleague a promise reached us through, read from the record with
    // no model call: the promiser the record names is on our side (a loop's
    // `by` can name the colleague who carried it), or the entry it came from
    // was sent by someone on our side (the doc's senderIsHome, from the
    // declared roster). The operator is never a via: the relay reaches the
    // operator.
    const firstLower = (n: string): string =>
      ((n ?? "").trim().split(/\s+/)[0] ?? "").toLowerCase();
    const viaOf = (who: string, entry: TheirPromise["entry"]): string => {
      const named = normPerson(who ?? "").trim();
      if (named && isHome(named) && !MINE_RE.test(named)) return named;
      const d = entry ? docByNote.get(entry.noteId) : undefined;
      if (!d?.senderIsHome) return "";
      const sender = normPerson(d.sender.replace(/\+\d+\s*$/, "")).trim();
      return sender && !MINE_RE.test(sender) ? sender : "";
    };
    // A loop cites the filing that wrote it, by the column (§2.1): the
    // entry the person who owes it wrote, else the filing's tape or first
    // record entry. A row with no filing, or a filing with no visible entry,
    // cites nothing rather than a guess.
    const loopEntry = (
      filingId: string | undefined,
      who: string,
    ): TheirPromise["entry"] => {
      if (!filingId) return null;
      const rows = visible.filter((n) => n.filingId === filingId);
      const said = who.trim().toLowerCase();
      const by = said
        ? rows.find(
            (n) =>
              (n.actors ?? "")
                .split("→")[0]
                ?.replace(/\+\d+\s*$/, "")
                .trim()
                .toLowerCase() === said,
          )
        : undefined;
      const pick =
        by ??
        rows.find((n) => docByNote.get(n.id)?.tape) ??
        rows.find((n) => GLYPH_RE.test(n.body ?? ""));
      return pick ? entryOf(pick.id) : null;
    };
    const todoById = new Map(todos.map((t) => [t.id, t]));
    const open: TheirPromise[] = owedByThem(visible, now, todos).flatMap(
      (o): TheirPromise[] => {
        // A line naming the operator is the operator's own debt, and the
        // register carries it; it is never a promise of theirs.
        if (MINE_RE.test(normPerson(o.who ?? ""))) return [];
        // owedByThem keys a loop by its todo and an Owed line by its note.
        const loop = todoById.get(o.noteId);
        const entry = loop ? loopEntry(loop.filingId, o.who) : entryOf(o.noteId);
        const via = viaOf(o.who, entry);
        // The record names a colleague as the one who owes it: by the roster,
        // or by the first name the relaying colleague goes by ("— @Lesha"),
        // which the roster's full names cannot match.
        const colleague =
          isHome(o.who) ||
          (!!via && !!firstLower(o.who) && firstLower(o.who) === firstLower(via));
        // The cleaner's Owed line names the one who owes it ("— @Chassie"),
        // so a colleague named there owes it: internal work, never a promise
        // of theirs, relayed or not, and the ask-your-colleague move is
        // retired (C6 as amended 2026-10-05).
        if (colleague && !loop) return [];
        // When a loop the read filed on their side (D10) names a colleague,
        // it named the one who carried it: the colleague is the via, never
        // the owner, so the owner falls back to "" and the move names the
        // account.
        const who = colleague ? "" : o.who;
        // PROMISED needs a hearer (D28), and the colleague who relayed a
        // dated promise heard the day.
        const promised = !!o.promised || (!!via && !!o.day && dayBlown(o.day, now));
        return [
          {
            who,
            text: o.text,
            at: o.at,
            ...(o.day ? { day: o.day } : {}),
            ...(promised ? { promised: true } : {}),
            ...(o.hearer ? { hearer: o.hearer } : {}),
            ...(via ? { via } : {}),
            kind: loop ? "loop" : "owed",
            entry,
          },
        ];
      },
    );
    if (lastInbound?.promise) {
      const doc = live.find((d) => d.noteId === lastInbound.noteId);
      // The sentence they wrote, from the body after the head; the head's
      // subject only when the body holds no promise of its own.
      const text = doc?.text ?? "";
      const cut = text.indexOf("\n");
      const body = cut >= 0 ? text.slice(cut + 1) : "";
      const inBody = THEIR_PROMISE_RE.exec(body);
      const inHead = inBody ? null : THEIR_PROMISE_RE.exec(text);
      // Who heard it: the person the message was addressed to.
      const hearer =
        (doc?.actors.split("→")[1] ?? "")
          .split(/[;,]/)[0]
          ?.replace(/\+\d+\s*$/, "")
          .trim() ?? "";
      const entry = entryOf(lastInbound.noteId);
      // A loop the read filed off this same entry already says it, with the
      // day and the hearer: one promise is one line, never two.
      const twice =
        !!entry &&
        open.some((p) => p.kind === "loop" && p.entry?.noteId === entry.noteId);
      // It carries no via: a home-side sender's mail is never inbound (docOf),
      // so the newest inbound is always the account's own people speaking.
      if (!twice)
        open.push({
          who: lastInbound.who,
          text: inBody
            ? sentenceAround(body, inBody.index)
            : inHead
              ? sentenceAround(text, inHead.index)
              : "",
          at: lastInbound.at,
          ...(hearer ? { hearer } : {}),
          kind: "inbound",
          entry,
        });
    }
    open.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
    return open;
  })();
  // The head, in the shape the drawer and the meeting move have always read.
  const theirPromise = theirPromises[0]
    ? {
        who: theirPromises[0].who,
        text: theirPromises[0].text,
        at: theirPromises[0].at,
        ...(theirPromises[0].day ? { day: theirPromises[0].day } : {}),
        ...(theirPromises[0].promised ? { promised: true } : {}),
      }
    : null;

  // 18 · the facts with the tape flag, the Filing's own first.
  const factsById = new Map<string, EntryFacts>();
  for (const n of visible) if (n.facts) factsById.set(n.id, n.facts);
  const facts = factsOver(live, factsById, digest?.intelSeed);

  // 20 · the newest entry's moment.
  let lastRecordAt = "";
  for (const d of liveNotes) if (d.at > lastRecordAt) lastRecordAt = d.at;

  const key = chicagoDay(now);

  return {
    docs,
    lastOutbound,
    lastInbound,
    whoseMove: move,
    warmth,
    lastMeeting,
    lastTouch,
    hidden,
    homeSide,
    today: { key, isToday: (iso: string) => chicagoDay(iso) === key },
    intel,
    stage: input.board ? stageOf(input.board, now) : null,
    relationship,
    theirPromise,
    theirPromises,
    lastAccepted,
    conversationExists: live.some((d) => !!d.direction) || touches.length > 0,
    secondRecord: input.secondRecord ?? null,
    countries: facts.countries,
    products: facts.products,
    headcounts: facts.headcounts,
    people,
    lastRecordAt,
  };
}
