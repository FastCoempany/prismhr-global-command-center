// The Pipeline Status report — one record per active account, assembled from
// the stores the room already loads (founder-decreed 2026-09-08, shipped to
// the HomeRoom's right margin 2026-09-08).
//
// The job: someone asks "where's your pipeline," and this is read aloud with
// nothing prepared. Every field traces to a row, a note or a book entry;
// nothing is silently blank, because a row of Unknowns is the finding.
//
// Pure. Every store arrives as an argument, so the whole report can be built
// in a test without a database — and the adversarial pass can feed it the
// book's real 1,323 notes and check each field against the record.

import { contactsFor } from "@/lib/book/contacts";
import { corpusFor, extractDealIntel } from "@/lib/intel/extract";
import { digestFor, digestForCardName } from "@/lib/intel/digest";
import { meetingRead, speakersIn } from "@/lib/intel/meeting";
import { peopleFor } from "@/lib/intel/people";
import { isHomeSideName, MINE_RE } from "@/lib/intel/provenance";
import { effectiveAt } from "@/lib/intel/clock";
import {
  COUNTRY_NAME,
  PRODUCT_TERMS,
  countryMentions,
  countryNear,
  demandNear,
  redactMoney,
} from "@/lib/intel/lexicon";
import { buildAccountSheet } from "@/lib/room/sheet-view";
import { moveFromCommitment } from "@/lib/room/move-line";
import { splitFallback } from "@/lib/room/deliverables";
import { owedByThem } from "@/lib/room/owed";
import {
  answeredSince,
  fyiFromSupport,
  gatedByThem,
  isOtherTeamWork,
  ownerClause,
  ownersFrom,
  theirTurnFrom,
  type ActorRead,
  type LaneOwner,
  type SupportRead,
} from "./report";
import { outcomesFrom } from "./report";

/** A value with the row it was read from. `derived` marks a value the app
 *  inferred rather than one a person stated — the provenance rule that keeps a
 *  close date named on a call apart from one the model guessed. */
export type Sourced = { v: string; src: string; derived?: boolean };

export type PipelineRecord = {
  id: string;
  account: string;
  csm: string;
  lastTouch: {
    date: string;
    kind: string;
    room: { name: string; title: string }[];
  } | null;
  /** Dated events — "1 discovery call held (6.29), 1 demo held (7.11)" in the
   *  account-planning doc's own shape. */
  events: { at: string; kind: string }[];
  model: Sourced | null;
  incumbent: Sourced | null;
  /** The unit he actually tracks: country × product, with the headcount the
   *  record attached to that country. One account is often several. */
  opportunities: { country: string; product: string; headcount: string; src: string }[];
  products: string[];
  outcomes: string[];
  outcomesSrc: string;
  /** Verbatim speech the record kept — load-bearing in his own updates. */
  theirWords: string[];
  ourNext: { text: string; full: string; opened: string; urgent: boolean }[];
  doneRecently: string[];
  theirSide: { who: string; text: string; at: string; src: string }[];
  /** Their turn comes first — his sends are not today's work. */
  gated: boolean;
  /** Another team's work inside PrismHR. FYI, never his next step. */
  handoffs: string[];
  unknowns: string[];
  stage: Sourced | null;
  closeDate: (Sourced & { passed: boolean }) | null;
  risks: { text: string; src: string }[];
  quietDays: number | null;
  contacts: { name: string; title: string }[];
  fyi: string;
  fyiWho: string;
  owners: LaneOwner[];
};

const PRODUCT: Record<string, string> = {
  eor: "EOR",
  contractor: "Contractor Mgmt",
  contractor_plus: "Contractor Mgmt+",
  payroll: "Global Payroll",
  mpex: "MPEX",
  wallet: "Wallet",
  tlm: "TLM",
  aor: "AOR",
  talent: "Talent",
};

/** The book's close date until the operator files a real one, per account. */
export const BOOK_CLOSE_DATE = "2026-12-25";

const md = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;
const dayOf = (iso: string) => (iso ?? "").slice(0, 10);
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);

/** Verbatim speech. The apostrophe inside a contraction is not a quote mark —
 *  it only counts when a letter sits on both sides of it, or "can't this be in
 *  one place?" comes back as "t this be in one place?". */
const QUOTE_RE =
  /(?<!\w)['‘"“]((?:[^'’"“”\n]|(?<=[A-Za-z])['’](?=[A-Za-z])){12,160})['’"”](?!\w)/g;
export function quotesIn(body: string, cap = 3): string[] {
  const out: string[] = [];
  QUOTE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = QUOTE_RE.exec(body ?? ""))) {
    const q = m[1].trim();
    if (/^https?:/i.test(q) || /^[A-Z ]+$/.test(q)) continue;
    if (!out.includes(q)) out.push(q);
    if (out.length >= cap) break;
  }
  return out;
}

/** His own shorthand reaches the register with the pen on it. The report is
 *  read to other people; the glyph is his, not theirs.
 *
 *  Money is stripped here, on every free-text field the record carries. The
 *  register's own lines were already redacted by buildAccountSheet, but the
 *  call read's outcomes, the prospect's quoted words and the FYI line reach
 *  the report straight from the note body — and a report read to leadership
 *  is exactly the surface the money doctrine exists for. Caught by its own
 *  test, 2026-09-08. */
const clean = (s: string) =>
  redactMoney((s ?? "").replace(/^[✎✓·\s]+/, ""))
    .replace(/\s+/g, " ")
    .trim();

// A contact list read aloud cannot carry "Tom Boell, Tom" or a department
// name. A bare first name a fuller name already covers is the same person; a
// single word naming no person is not a contact at all.
const NOT_A_PERSON =
  /^(marketing|sales|support|info|billing|accounting|hr|payroll|noreply|team|admin)$/i;
export function tidyPeople(names: readonly string[]): string[] {
  const cleaned = (names ?? [])
    .map((n) =>
      (n ?? "")
        .replace(/["“”']/g, "")
        .replace(/[<>]/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    // "PHR", "SPHR", "CPA" — a credential trailing a signature, not a person.
    .filter((n) => n && !NOT_A_PERSON.test(n) && !/^[A-Z]{2,5}$/.test(n));
  const out: string[] = [];
  for (const n of cleaned) {
    const parts = n.toLowerCase().split(" ");
    const ends = `${parts[0]} ${parts[parts.length - 1]}`;
    if (
      out.some((o) => {
        const p = o.toLowerCase().split(" ");
        return (
          o.toLowerCase() === n.toLowerCase() ||
          `${p[0]} ${p[p.length - 1]}` === ends ||
          (parts.length === 1 && p[0] === parts[0]) ||
          (p.length === 1 && parts[0] === p[0])
        );
      })
    )
      continue;
    out.push(n);
  }
  return out;
}

/** One filed entry. Callers pass notes already stripped of ✕-parked rows
 *  (`hide:note:` dispositions) — the note survives in the table, the row does
 *  not, and the report must read exactly what the room reads. */
/** Which product each country is named beside. Reads the distilled entries and
 *  notes, never the raw tape — a demo walks through every product in the suite
 *  and would attach all of them to whichever country was on screen. */
/** The countries the record shows work in. Reads the same docs the countries
 *  themselves came from — the reads, never the raw tape. An empty set means the
 *  record is too thin to judge, and the caller keeps every country rather than
 *  showing none. */
function countriesInPlay(
  notes: readonly { body: string; source?: string }[],
): Set<string> {
  const out = new Set<string>();
  for (const n of notes) {
    if (/transcript/.test(n.source ?? "")) continue;
    for (const m of countryMentions(n.body ?? ""))
      if (demandNear(n.body ?? "", m.at)) out.add(m.code);
  }
  return out;
}

function productByCountry(
  notes: readonly { body: string; source?: string }[],
): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const n of notes) {
    if (/transcript/.test(n.source ?? "")) continue;
    for (const key of Object.keys(PRODUCT_TERMS) as (keyof typeof PRODUCT_TERMS)[]) {
      const re = new RegExp(PRODUCT_TERMS[key].source, "gi");
      for (const m of (n.body ?? "").matchAll(re)) {
        const c = countryNear(n.body, m.index ?? 0, 120);
        if (!c) continue;
        const at = out.get(c) ?? out.set(c, []).get(c)!;
        // Both, when the record names both. XCEL HR's Canada is a payroll
        // win-back and its Mexico is EOR, but the record also says "Canada +
        // Mexico EOR/Payroll pricing collateral" — naming both for both.
        // Choosing one there asserts something the record does not; two is the
        // honest reading, and the operator edits the line if he knows better.
        if (!at.includes(key) && at.length < 2) at.push(key);
      }
    }
  }
  return out;
}

export type PipelineNote = {
  id: string;
  createdAt: string;
  body: string;
  lane: "mine" | "background";
  actors?: string;
  source?: string;
  kind?: string;
};
export type PipelineTodo = {
  id: string;
  body: string;
  accountId: string;
  createdAt: string;
  remindAt: string;
  updatedAt: string;
  done: boolean;
};

export type PipelineAccount = {
  id: string;
  name: string;
  csm: string;
  /** The card's derived stage label, "" when the board says nothing. */
  stageLabel: string;
  notes: PipelineNote[];
  todos: PipelineTodo[];
  /** The gap ledger's open questions — where discovery has holes. */
  gaps: string[];
  /** A demo the board stamped or the record shows. Floors the stage. */
  demoOnRecord?: boolean;
  support: SupportRead;
  actors: readonly ActorRead[];
};

/** Who is ours, derived from the WIDEST record the app holds. A person who
 *  turns up as an actor on `min` or more different accounts is not any one
 *  client's person — they work here.
 *
 *  This must read the whole book, never the active slice. Ported into
 *  production it was derived from the eleven active accounts alone, and a
 *  PrismHR colleague who appears across the wider book but on only two active
 *  ones walked straight back into a client's room (Shane Jacobs, XCEL HR,
 *  caught 2026-09-08). The Ted doctrine is explicit: a derived fact reads the
 *  widest live source, never a private narrow one. */
export function homeSideFrom(
  notesByAccount: Iterable<readonly [string, readonly { actors?: string | null }[]]>,
  min = 3,
): Set<string> {
  const by = new Map<string, Set<string>>();
  for (const [id, list] of notesByAccount) {
    if (!id || id.includes(":")) continue; // namespaced stores are not accounts
    for (const n of list)
      for (const raw of (n.actors ?? "").split("→")) {
        const nm = raw
          .replace(/\+\d+\s*$/, "")
          .trim()
          .toLowerCase();
        if (!nm || !/^[a-z]+ [a-z'-]+$/.test(nm)) continue;
        (by.get(nm) ?? by.set(nm, new Set()).get(nm)!).add(id);
      }
  }
  return new Set([...by].filter(([, s]) => s.size >= min).map(([nm]) => nm));
}

export type PipelineInput = {
  accounts: readonly PipelineAccount[];
  /** Our own people, from homeSideFrom() over the whole book. Omitted, the
   *  builder falls back to deriving it from the accounts it was handed — which
   *  is narrower, and says so. */
  homeSide?: ReadonlySet<string>;
  /** The CSM roster — who on our side is not the client. */
  csms: readonly string[];
  /** The operator's own name; he is never FYI to himself. */
  me: string;
  now: Date;
};

const OPEN_CAP = 4;
const QUIET_RISK_DAYS = 21;

export function buildPipelineReport(input: PipelineInput): PipelineRecord[] {
  const today = dayOf(input.now.toISOString());

  // Who is ours. The CSM roster names a handful; the record names the rest —
  // a person who turns up as an actor on three or more different accounts is
  // not any one client's person (the Ted doctrine: derived facts read the
  // widest live source, never a private narrow one).
  const acctsByPerson = new Map<string, Set<string>>();
  for (const a of input.accounts)
    for (const n of a.notes)
      for (const raw of (n.actors ?? "").split("→")) {
        const nm = raw
          .replace(/\+\d+\s*$/, "")
          .trim()
          .toLowerCase();
        if (!nm || !/^[a-z]+ [a-z'-]+$/.test(nm)) continue;
        (acctsByPerson.get(nm) ?? acctsByPerson.set(nm, new Set()).get(nm)!).add(a.id);
      }
  // The caller's set is the whole book; the local one is the active slice, and
  // the union is what "ours" means. Reading the slice alone put a colleague
  // back in a client's room (Shane Jacobs, XCEL HR) after this was ported into
  // production.
  const OURS = new Set([
    ...(input.homeSide ?? []),
    ...[...acctsByPerson].filter(([, s]) => s.size >= 3).map(([nm]) => nm),
  ]);
  // A record often carries only a colleague's first name ("Anika"), and an
  // account with no CSM assigned has no name to compare it against.
  const CSM_FIRST = new Set(
    input.csms.map((c) => c.toLowerCase().split(" ")[0]).filter(Boolean),
  );
  const isHome = (n: string) => {
    const nm = (n ?? "").trim().toLowerCase();
    if (isHomeSideName(n, input.csms as string[]) || OURS.has(nm)) return true;
    return !nm.includes(" ") && CSM_FIRST.has(nm);
  };

  return input.accounts.map((a) => record(a, input, isHome, today));
}

function record(
  a: PipelineAccount,
  input: PipelineInput,
  isHome: (n: string) => boolean,
  today: string,
): PipelineRecord {
  const ns = a.notes
    .map((n) => ({ ...n, actors: n.actors ?? "", source: n.source ?? "" }))
    .sort(
      (x, y) =>
        Date.parse(effectiveAt(y.createdAt, y.body)) -
        Date.parse(effectiveAt(x.createdAt, x.body)),
    );
  const intel = extractDealIntel(
    corpusFor(a.id, a.name, {
      acctNotes: ns.map((n) => ({ ...n, kind: n.kind ?? "account" })),
      todos: a.todos.filter((t) => !t.done),
    }),
    digestFor(a.id) ?? digestForCardName(a.name),
  );
  const roster = contactsFor(a.id);
  const titleOf = (nm: string) => {
    const k = nm.toLowerCase().split(/\s+/)[0] ?? "";
    return (
      roster.find((c) => `${c.first} ${c.last}`.toLowerCase().includes(k))?.title ?? ""
    );
  };

  // The last meeting and who was in the room — names AND titles.
  const m = meetingRead(ns, isHome, () => true);
  const mNote = m ? ns.find((n) => n.id === m.note.id) : undefined;
  const inRoom = mNote
    ? tidyPeople([
        ...(m?.who ? [m.who] : []),
        ...speakersIn(mNote.body, isHome),
        ...(mNote.actors || "")
          .split("→")
          .map((s) => s.replace(/\+\d+\s*$/, "").trim())
          .filter(Boolean),
      ])
        .filter((p) => !isHome(p) && !MINE_RE.test(p))
        .slice(0, 5)
    : [];

  const events = ns
    .filter((n) => /transcript|call-ai|meeting/.test(n.source))
    .map((n) => ({
      at: dayOf(effectiveAt(n.createdAt, n.body)),
      kind: /transcript|call-ai/.test(n.source) ? "Call" : "Meeting",
    }))
    .filter((e, i, arr) => arr.findIndex((x) => x.at === e.at) === i)
    .slice(0, 4);

  const call = ns.find((n) => n.source === "call-ai");

  // Opportunities — country × product, with the headcount attached to that
  // country. One account is often several deals.
  const hcBy = new Map<string, { n: number; src: string }>();
  for (const h of intel.headcounts)
    if (h.value.country && !hcBy.has(h.value.country))
      hcBy.set(h.value.country, { n: h.value.n, src: h.src });
  const products = intel.products.map((p) => PRODUCT[p.value] ?? p.value);
  // The product belongs to the COUNTRY, not to the account. XCEL HR's Canada
  // is a managed-payroll win-back and its Mexico is EOR; taking the account's
  // first product for every row printed "Canada · EOR", which is the opposite
  // of what the record says. Where the record names no product beside a
  // country, the honest answer is Unknown rather than a borrowed one.
  const productAt = productByCountry(ns);
  // Only the countries with work to be done in them. A country the account
  // merely HAS something in is context: XCEL HR's parent already owns payroll
  // companies in the UK, which the report was listing beside Mexico and Canada
  // as though it were a deal.
  const inPlay = countriesInPlay(ns);
  const opportunities = intel.countries
    .filter((c) => !inPlay.size || inPlay.has(c.value))
    .slice(0, 4)
    .map((c) => {
      const hc = hcBy.get(c.value);
      const named = productAt.get(c.value) ?? [];
      return {
        country: COUNTRY_NAME[c.value] ?? c.value.toUpperCase(),
        product: named.map((k) => PRODUCT[k] ?? k).join(" / "),
        headcount: hc ? `${hc.n} ${hc.n === 1 ? "worker" : "workers"}` : "",
        src: c.src,
      };
    });

  // His own work vs another team's, ranked by when he made the promise. A
  // commitment a later meeting overtook is finished whatever the register says.
  const sheet = buildAccountSheet(
    a.todos as never,
    a.id,
    new Set<string>(),
    new Map(),
    input.now,
    ns,
  );
  const openedAt = new Map(a.todos.map((t) => [t.id, dayOf(t.createdAt)]));
  const lastMeetAt = m ? dayOf(m.at) : "";
  const open = [...sheet.open, ...(sheet.rest ?? [])]
    .map((o) => ({ ...o, opened: openedAt.get(o.id) ?? "" }))
    .sort((x, y) => (y.opened ?? "").localeCompare(x.opened ?? ""));

  const ourNext: PipelineRecord["ourNext"] = [];
  const handoffs: string[] = [];
  for (const o of open) {
    if (o.settled) continue;
    const raw = clean(splitFallback(o.edit).text);
    if (isOtherTeamWork(raw)) {
      const line = moveFromCommitment(raw).line;
      // "…recruitment specialist." and "…recruitment specialist for
      // international hiring support." are one handoff written twice.
      const stem = line
        .toLowerCase()
        .replace(/[^a-z ]/g, "")
        .split(" ")
        .slice(0, 6)
        .join(" ");
      if (
        !handoffs.some((h) =>
          h
            .toLowerCase()
            .replace(/[^a-z ]/g, "")
            .startsWith(stem),
        )
      )
        handoffs.push(line);
      continue;
    }
    const built = moveFromCommitment(raw);
    // A commitment a later meeting overtook is finished, whatever the register
    // still says — and it is not shown at all. This report is read aloud to a
    // room of forty-five; the only thing that belongs on it is where the
    // account stands (founder-decreed 2026-09-08).
    if (lastMeetAt && o.opened && o.opened < lastMeetAt) continue;
    if (ourNext.some((x) => x.text === built.line)) continue;
    ourNext.push({
      text: built.line,
      full: built.full,
      opened: o.opened,
      urgent: !!o.wall,
    });
  }

  // Their turn, both rungs: the call read's Owed line, then an inbound note's
  // own first person. Four of eleven accounts carry the second and not the
  // first.
  const theirSide = [
    ...owedByThem(ns, input.now).map((o) => ({
      who: o.who,
      text: clean(o.text),
      at: dayOf(o.at),
      src: `record ${md(o.at)}`,
    })),
    ...theirTurnFrom(ns, isHome).map((t) => ({ ...t, text: clean(t.text) })),
  ]
    .filter((t, i, arr) => arr.findIndex((x) => x.text === t.text) === i)
    // A promise they have since answered is finished. Trend Personnel was
    // gated all week on "I will check with our Sales Director" that a
    // colleague answered the next day.
    .filter((t) => !answeredSince(t.at, ns, isHome));

  // Nothing owed either way, and the last substantive word was his: the ball
  // is still theirs — they owe a reply. The room already keeps this signal;
  // the readout was silent about it and said "None set" on an account where
  // he had just asked a question.
  if (
    !theirSide.length &&
    intel.lastOutbound &&
    (!intel.lastInbound || intel.lastOutbound > intel.lastInbound)
  ) {
    // Who owes it: whoever he wrote to, else whoever last wrote to him. A
    // record that names a person should never render "They".
    const last = ns.find(
      (n) => dayOf(effectiveAt(n.createdAt, n.body)) === dayOf(intel.lastOutbound),
    );
    const to =
      (last?.actors ?? "")
        .split("→")[1]
        ?.replace(/\+\d+\s*$/, "")
        .trim() ?? "";
    const lastFrom =
      ns
        .map((n) => (n.actors ?? "").split("→")[0]?.trim() ?? "")
        .find((nm) => nm && !isHome(nm) && !MINE_RE.test(nm)) ?? "";
    const named = to && !isHome(to) && !MINE_RE.test(to) ? to : lastFrom;
    // Only when the record names the person. "They owe a reply" puts a word on
    // the line that no row stands behind, and the contamination pass is right
    // to call it out — a readout never says who without knowing who.
    if (named)
      theirSide.push({
        who: named.split(" ")[0],
        text: `reply to your ${md(intel.lastOutbound)} note`,
        at: dayOf(intel.lastOutbound),
        src: `record ${md(intel.lastOutbound)}`,
      });
  }

  // One close date for the whole book, and his to change (founder-decreed
  // 2026-09-08). Deriving it from whatever deadline phrase a note happened to
  // carry produced dates that were never close dates at all — a demo recording
  // he owed Shane, a prospect's internal review. A single stated default is
  // honest about being a placeholder, and the line is editable everywhere the
  // report renders.
  const closeIso = BOOK_CLOSE_DATE;
  const lastAt = ns[0] ? dayOf(effectiveAt(ns[0].createdAt, ns[0].body)) : "";
  const quietDays = lastAt ? daysBetween(lastAt, today) : null;

  // Risks — evidenced only, each carrying the fact it stands on. "No next
  // step" is not written here: every face already renders the None-set flag,
  // and a report that says the same thing twice reads padded.
  const risks: { text: string; src: string }[] = [];
  if (closeIso < today)
    risks.push({
      text: `Close date passed ${md(closeIso)} with the deal still open.`,
      src: "the book's date",
    });
  if (intel.incumbent)
    risks.push({
      text: `${intel.incumbent.value} holds the work today.`,
      src: intel.incumbent.src,
    });
  if (quietDays !== null && quietDays >= QUIET_RISK_DAYS)
    risks.push({ text: `Quiet ${quietDays} days.`, src: `record ${md(lastAt)}` });

  const owners = ownersFrom(a.actors, ["support", "csm"], 4, input.me);

  return {
    id: a.id,
    account: a.name,
    csm: a.csm,
    lastTouch: m
      ? {
          date: dayOf(m.at),
          kind: /transcript|call/.test(mNote?.source ?? "") ? "Call" : "Meeting",
          room: inRoom.map((p) => ({ name: p, title: titleOf(p) })),
        }
      : null,
    events,
    // Reseller unless the record says otherwise — it is the shape almost every
    // partner takes, and the line is editable when one does not.
    model:
      intel.chair === "undecided"
        ? { v: "Reseller", src: "the default", derived: true }
        : { v: intel.chair === "resale" ? "Reseller" : "Referral", src: "record" },
    incumbent: intel.incumbent
      ? { v: intel.incumbent.value, src: intel.incumbent.src }
      : null,
    opportunities,
    products,
    outcomes: call ? outcomesFrom(call.body).map(clean) : [],
    outcomesSrc: call ? `call read ${md(effectiveAt(call.createdAt, call.body))}` : "",
    theirWords: call ? quotesIn(call.body).map(clean) : [],
    ourNext: ourNext.slice(0, OPEN_CAP),
    doneRecently: a.todos
      .filter((t) => t.done)
      .slice(0, 2)
      .map(
        (t) => moveFromCommitment(clean(splitFallback(t.body.split("\n")[0]).text)).line,
      ),
    theirSide,
    gated: gatedByThem(theirSide, ourNext),
    handoffs,
    unknowns: a.gaps.slice(0, 4).map(clean),
    stage: stageOf(a),
    closeDate: {
      v: BOOK_CLOSE_DATE,
      derived: true,
      passed: BOOK_CLOSE_DATE < today,
      src: "the book's date",
    },
    risks,
    quietDays,
    // Everyone who was in the room IS a contact. The last-meeting line used to
    // carry five names the contacts line never mentioned, which reads as two
    // different accounts (founder-caught 2026-09-08).
    contacts: tidyPeople(
      [...inRoom, ...peopleFor(ns, roster, 12).map((p) => p.name)].filter((n) => {
        // The CSM is not a contact (never merge the two), and the record
        // often carries only her first name.
        const csm = (a.csm ?? "").toLowerCase();
        const first = csm.split(" ")[0] ?? "";
        const nm = (n ?? "").toLowerCase();
        if (csm && (nm === csm || nm === first || nm.startsWith(`${first} `)))
          return false;
        return !!n && !isHome(n) && !MINE_RE.test(n);
      }),
    )
      .slice(0, 8)
      .map((n) => ({ name: n, title: titleOf(n) })),
    fyi: clean(fyiFromSupport(a.support)),
    fyiWho: ownerClause(owners.slice(0, 2)),
    owners,
  };
}

// The board's own ladder. A demo that happened means the deal is past showing
// and into asking, so the stage reads Proposal at minimum however far behind
// the board's own stamps have fallen (founder-decreed 2026-09-08).
const STAGE_LADDER = [
  "Investigate",
  "First Time Meeting",
  "Needs Analysis",
  "Demo",
  "Executive Summary",
  "Proposal",
  "Contract",
];
const PROPOSAL = STAGE_LADDER.indexOf("Proposal");

function stageOf(a: PipelineAccount): Sourced | null {
  const at = STAGE_LADDER.indexOf(a.stageLabel);
  if (a.demoOnRecord && at < PROPOSAL)
    return {
      v: "Proposal",
      src: a.stageLabel ? `demo held · board says ${a.stageLabel}` : "demo held",
      derived: true,
    };
  return a.stageLabel ? { v: a.stageLabel, src: "board" } : null;
}

/** Sorted by what needs him most: a blown promise, then a deal whose turn is
 *  live, then quiet. Reading order is fixed and identical for every record,
 *  which is what lets one be read aloud without preparing. */
export function rankPipeline(rows: readonly PipelineRecord[]): PipelineRecord[] {
  const score = (r: PipelineRecord) => {
    let s = 0;
    if (r.ourNext.some((n) => n.urgent)) s -= 100;
    if (r.theirSide.length) s -= 40;
    if (r.lastTouch) s -= 30;
    if (!r.ourNext.length) s -= 10;
    s += Math.min(r.quietDays ?? 99, 60);
    return s;
  };
  return [...rows].sort(
    (a, b) => score(a) - score(b) || a.account.localeCompare(b.account),
  );
}
