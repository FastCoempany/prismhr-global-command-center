// The email in the HomeRoom row (ship order 2026-10-20; CLAUDE.md, The email
// in the row; docs/mockups/homeroom-email-row-2026-10-20.html, Concept A).
// Two reads, both pure, both from the stores the page already holds:
//
//   · the latest email — the newest email on the record in either direction,
//     read past sign-offs, calendar acceptances and machinery by the doc
//     read's own flags (src/lib/record/docs.ts), so a "thanks!" never takes
//     the column;
//   · the EARLIER lines — each record entry as a line a person can read: the
//     day and the clock from the note itself, who wrote to whom, and the
//     subject with the format code, the frozen "Today" and the reply and
//     external prefixes gone. The stored head keeps its grammar, because the
//     clock, the meeting read and the promote regex all parse it; only what
//     renders changes. Each line opens to what the account record history
//     holds for it: the read's synopsis and its Owed lines for an email, the
//     note's own body for anything else.
//
// "Ours" is the declared roster the read hands in (csms ∪ homeSideFrom, E2):
// an email the operator sent only to our own side is coordination, never a
// send to the account, so it neither takes the column nor answers anything,
// as a colleague's mail never does. An email's own words render under the
// strict money rule; any other note renders as the record wrote it.
//
// A moment is claimed only as far as the record holds it. A filed email's
// day is its own and its clock is its head's, read on Chicago's wall clock.
// An email whose head names a day and no clock sits at that day's Chicago
// noon and answers nothing on its own day. An entry filed with no day at all
// carries the filing's moment, which is never its own: it shows no day, the
// entries of one filing keep their capture order, and no two of them are
// twins.

import { LEGACY_HEAD_START_RE } from "@/lib/ingest/dialect";
import { commitmentKey } from "@/lib/ingest/fanout";
import { redactMoneyStrict } from "@/lib/intel/lexicon";
import { MINE_RE, isHomeSideName, splitRecipients } from "@/lib/intel/provenance";
import { threadSubject } from "@/lib/intel/email-whole";
import { knowledgeKey } from "@/lib/playbook/store";
import { owedSegments, theirLoopOf, withoutOwed } from "@/lib/room/owed";
import { cleanSubject, headParts, withSubject } from "@/lib/room/subject";
import type { RecordDoc } from "@/lib/record/docs";
import { splitMarker, splitTags } from "@/lib/today/route-notes";
import { USER_TZ, chicagoWallToUtc } from "@/lib/tz";

export { cleanSubject, withSubject };

/** A record row as the room's loader hands it (src/lib/today/overlay.ts). */
export type RowNote = {
  id: string;
  body: string;
  createdAt: string;
  actors?: string;
  recipients?: string | null;
  source?: string;
  filingId?: string | null;
  lane?: string;
};

type Doc = Pick<RecordDoc, "noteId" | "direction" | "closer" | "machinery">;

type Todo = {
  id: string;
  body: string;
  done: boolean;
  createdAt?: string;
  updatedAt?: string;
  filingId?: string;
};

/** One Owed segment of an opened email, as the record holds it. */
export type OwedLine = {
  /** Our side owes it. */
  mine: boolean;
  /** Who owes it as the record names them; "" when the line names nobody. */
  who: string;
  text: string;
  /** "Done 10/16." once the to-do or loop that tracks this promise is done,
   *  "Released." once their side released ours; "" while it is open or
   *  nothing tracks it. */
  closed: string;
};

/** The email facts a line or the latest email carries. */
export type EmailFacts = {
  dir: "in" | "out" | "";
  /** "you" for the operator; "" when the record names nobody. */
  from: string;
  to: string;
  /** Everyone else the recipients column names, the door +N opens. */
  others: string[];
  subject: string;
  /** The read's synopsis with its Owed lines taken out. */
  kept: string;
  /** The synopsis is the model's (its source carries -ai); otherwise the
   *  note holds what the rules filed. */
  read: boolean;
};

export type RecordLine = {
  id: string;
  /** The stored first line, the ✎ edit's head. */
  text: string;
  /** What ✎ starts from: the stored subject, or the stored line, as the
   *  record holds it, never the display's redaction of it. */
  edit: string;
  struck: boolean;
  glyph: string;
  day: string;
  time: string;
  /** Who to whom for a filed activity, "" for a typed or stamped note. */
  who: string;
  /** What the line says: an email's subject, an activity's, or the note's
   *  first line with its glyph gone. */
  line: string;
  /** What the line opens to beyond the email facts: a note's own body. */
  body: string;
  email:
    | (EmailFacts & {
        owed: OwedLine[];
        /** An inbound a later send of ours answered, by that send's day. */
        answered: string;
        closer: boolean;
        twice: boolean;
      })
    | null;
};

export type LatestEmail = EmailFacts & {
  id: string;
  day: string;
  time: string;
  /** The app logged this send itself (the Act Lane), so no email was filed. */
  logged: boolean;
};

// The full paste alphabet, as the room drew it: ✔ tasks and ☎ calls
// included, so filed activities never misrender as hand-typed notes.
const GLYPH_AT = /^[✉✓☰✎✔☎]/;
const GLYPH_STRIP = /^[✉✓☰✎⚡▢✔☎]\s?/;
/** The most of a note's own body one line ships; the account's record keeps
 *  the rest, one click on. */
export const BODY_CAP = 1500;
/** The Act Lane's send (src/lib/act/lane.ts): "✉ <subject> — sent to <to>." */
const ACT_SENT = /^✉ (.*?) — sent to (.+?)\.?$/;
/** The placeholder the paste pipeline writes when the read names nobody. */
const UNATTRIBUTED = /^\(unattributed\)$/i;

// One formatter each, built once: the room reads a moment for every line of
// every row, and building one costs far more than using it.
const DAY_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: USER_TZ,
  month: "numeric",
  day: "numeric",
});
const TIME_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: USER_TZ,
  hour: "numeric",
  minute: "2-digit",
});
const KEY_FMT = new Intl.DateTimeFormat("en-CA", { timeZone: USER_TZ });
const MIN_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: USER_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** The noon-UTC day anchor the email path files at (src/lib/intel/clock.ts). */
function isNoonAnchor(ms: number): boolean {
  const d = new Date(ms);
  return (
    d.getUTCHours() === 12 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
  );
}

const CLOCK = /(\d{1,2}):(\d{2})\s*(AM|PM)/i;

/** The clock an entry head carries left of its em dash, in minutes of its
 *  day: every dialect's head (✉ OL, ✉ SF, ☎ SF, ✔ OL…), where the read's own
 *  clock (src/lib/intel/clock.ts) reads the Outlook head alone. Null when the
 *  first line is no entry head or names no clock in its slot. */
export function headMinutes(body: string): number | null {
  const head = (body ?? "").split("\n")[0] ?? "";
  if (!LEGACY_HEAD_START_RE.test(head)) return null;
  const m = CLOCK.exec(head.split("—")[0] ?? "");
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 1 || h > 12 || min > 59) return null;
  return ((h % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0)) * 60 + min;
}

const clockLabel = (mins: number): string => {
  const h = Math.floor(mins / 60);
  return `${h % 12 || 12}:${String(mins % 60).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

/** A row's moment as far as the record holds it. */
type When = {
  day: string;
  time: string;
  /** For ordering one row's lines. */
  at: number;
  /** The Chicago day, yyyy-mm-dd; "" when the record holds none. */
  dayKey: string;
  /** The clock is the row's own. */
  clocked: boolean;
  /** Filed with no day: the stamp is the filing's moment, and `at` only
   *  places it (whensOf). */
  dateless: boolean;
};

function whenOfRow(createdAt: string, body: string): When {
  const ms = Date.parse(createdAt);
  const none = {
    day: "",
    time: "",
    at: NaN,
    dayKey: "",
    clocked: false,
    dateless: false,
  };
  if (Number.isNaN(ms)) return none;
  const mins = headMinutes(body);
  if (isNoonAnchor(ms)) {
    const d = new Date(ms);
    const [y, mo, dd] = [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()];
    const dayKey = `${y}-${String(mo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    return mins == null
      ? {
          day: `${mo}/${dd}`,
          time: "",
          at: chicagoWallToUtc(y, mo, dd, 12, 0),
          dayKey,
          clocked: false,
          dateless: false,
        }
      : {
          day: `${mo}/${dd}`,
          time: clockLabel(mins),
          at: chicagoWallToUtc(y, mo, dd, Math.floor(mins / 60), mins % 60),
          dayKey,
          clocked: true,
          dateless: false,
        };
  }
  // An entry head stamped at a real moment its own clock does not name was
  // filed with no day: the stamp is when it was filed. The calendar relay
  // stamps the meeting's own start, which its head names, so it stays.
  const head = (body ?? "").split("\n")[0] ?? "";
  if (LEGACY_HEAD_START_RE.test(head)) {
    const [hh = "0", mm = "0"] = MIN_FMT.format(ms).split(":");
    if (mins == null || mins !== (Number(hh) % 24) * 60 + Number(mm))
      return {
        day: "",
        time: mins == null ? "" : clockLabel(mins),
        at: ms,
        dayKey: "",
        clocked: false,
        dateless: true,
      };
  }
  return {
    day: DAY_FMT.format(ms),
    time: TIME_FMT.format(ms),
    at: ms,
    dayKey: KEY_FMT.format(ms),
    clocked: true,
    dateless: false,
  };
}

/** The day and the clock a person reads: a filed entry's own day and the
 *  clock its head wrote, never the noon anchor's hour; a note filed with a
 *  real moment reads that moment in Chicago; an entry filed with no day
 *  shows no day. */
export function whenOf(createdAt: string, body: string): { day: string; time: string } {
  const w = whenOfRow(createdAt, body);
  return { day: w.day, time: w.time };
}

/** The moment a line happened, for ordering one row's lines. */
export function momentOf(createdAt: string, body: string): number {
  return whenOfRow(createdAt, body).at;
}

/** How far below every dated moment a filing's undated entries sit when
 *  it dated none of them: past any moment the record can hold. */
const UNDATED_DROP = 4e12;

/** Every row's moment, read once. An entry a filing wrote with no day has
 *  only the filing's stamp, which is when it was filed, never when it was
 *  sent, so it never outranks a dated entry: it sits just below its own
 *  filing's oldest dated entry, or below every dated entry when its filing
 *  dated none, and the filing's undated entries keep their capture order
 *  (the pipeline files them newest first, so the later stamp is the older
 *  message). */
function whensOf(notes: readonly RowNote[]): Map<string, When> {
  const out = new Map<string, When>();
  const undated = new Map<string, { n: RowNote; ms: number }[]>();
  const oldestDated = new Map<string, number>();
  for (const n of notes) {
    const w = whenOfRow(n.createdAt, n.body);
    out.set(n.id, w);
    const filing = n.filingId || `note:${n.id}`;
    if (w.dateless)
      undated.set(filing, [...(undated.get(filing) ?? []), { n, ms: w.at }]);
    // Only an entry whose day the record holds anchors its filing's undated
    // entries: a marker or an archive the filing wrote is stamped at the
    // filing's own moment.
    else if (
      n.filingId &&
      !Number.isNaN(w.at) &&
      LEGACY_HEAD_START_RE.test(n.body.split("\n")[0] ?? "")
    )
      oldestDated.set(
        n.filingId,
        Math.min(oldestDated.get(n.filingId) ?? Infinity, w.at),
      );
  }
  for (const [filing, rows] of undated) {
    rows.sort((a, b) => a.ms - b.ms);
    const below = oldestDated.get(filing);
    const first = rows[0]!.ms;
    rows.forEach(({ n }, k) => {
      out.get(n.id)!.at =
        below !== undefined ? below - (k + 1) : first - UNDATED_DROP - k;
    });
  }
  return out;
}

const isMe = (name: string) => MINE_RE.test(name) || /^(you|me)$/i.test(name.trim());
const person = (name: string) => (isMe(name) ? "you" : name.trim());
const nameKey = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
const OUR_MAIL = /@(?:prismhr|vensure)\.com\b/i;

/** Who a row was sent to: the actors column's target, every name its
 *  recipients column keeps, and whether the actors line dropped some ("+N"
 *  with no list to say who). */
function targetsOf(n: RowNote): { names: string[]; dropped: boolean } {
  const actors = (n.actors ?? "").trim();
  const to = (actors.split("→")[1] ?? "")
    .replace(/\s*\+\d+\s*$/, "")
    .split(/[;,]/)
    .map((x) => x.trim())
    .filter(Boolean);
  const recipients = splitRecipients(n.recipients);
  return {
    names: [...to, ...recipients],
    dropped: /\+\d+\s*$/.test(actors) && recipients.length === 0,
  };
}

/** A send of ours reached the account: someone on it is not our side. A
 *  send only to colleagues is coordination (C6, C16). */
function reachesAccount(
  n: RowNote,
  homeSide: readonly string[],
  clientFirsts: ReadonlySet<string>,
): boolean {
  const { names, dropped } = targetsOf(n);
  if (dropped) return true;
  return names.some((x) => !ourSide(x, homeSide, clientFirsts));
}

/** One of ours: the operator, our domain, a name on the roster, or a
 *  roster name's first name alone, the way the record often names a
 *  colleague ("Lesha"), unless someone on the account's side of the record
 *  shares that first name ("Chris" for Chris Alvarez). A send counts as ours
 *  only when every target is, so the first-name allowance can only read
 *  past coordination mail. */
function ourSide(
  x: string,
  homeSide: readonly string[],
  clientFirsts: ReadonlySet<string> = new Set(),
): boolean {
  if (isMe(x) || OUR_MAIL.test(x) || isHomeSideName(x, homeSide)) return true;
  const one = x.trim().toLowerCase();
  return (
    !/\s/.test(one) &&
    !clientFirsts.has(one) &&
    homeSide.some((h) => (h.trim().split(/\s+/)[0] ?? "").toLowerCase() === one)
  );
}

/** The first names of the account's own people on the record: every full
 *  name an actors or recipients column holds that is not ours. */
function clientFirstsOf(
  all: readonly RowNote[],
  homeSide: readonly string[],
): Set<string> {
  const out = new Set<string>();
  for (const n of all) {
    const names = [
      ...(n.actors ?? "").replace(/\s*\+\d+\s*$/, "").split(/→|[;,]/),
      ...splitRecipients(n.recipients),
    ];
    for (const raw of names) {
      const x = raw.trim();
      const parts = x.split(/\s+/);
      if (parts.length < 2 || /@/.test(x) || ourSide(x, homeSide)) continue;
      out.add(parts[0].toLowerCase());
    }
  }
  return out;
}

/** Their email reached the operator: on the operator's own lane, or naming
 *  the operator among its recipients. A thread between their people and a
 *  colleague, or their support desk's traffic, is not the operator's mail. */
function reachedMe(n: RowNote): boolean {
  if (n.lane === "mine" || n.lane === undefined) return true;
  return targetsOf(n).names.some(isMe);
}

/** The dialects whose ✉ is an email; a chat line or a call's entry is not. */
const MAIL_HEAD = /^✉ (?!TM |CT )/;
const isEmail = (body: string) => body.startsWith("✉ ");

/** An address that spells a name: its local part is the whole name, or
 *  initial and surname, or first name and initial ("antaeus.coe@…",
 *  "acoe@…" for Antaeus Coe). */
function spells(address: string, name: string): boolean {
  const m = /^([^@\s<]+)@/.exec(address.trim().replace(/^.*</, ""));
  if (!m) return false;
  const local = m[1].toLowerCase().replace(/[^a-z]/g, "");
  const parts = name
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);
  if (!local || parts.length === 0) return false;
  const first = parts[0];
  const last = parts[parts.length - 1];
  return (
    local === parts.join("") ||
    (parts.length > 1 &&
      (local === `${first[0]}${last}` || local === `${first}${last[0]}`))
  );
}

/** From, to and everyone else, from the actors column with the head as its
 *  fallback, and the recipients column for the rest. */
function peopleOf(
  n: RowNote,
  headWho: string,
): { from: string; to: string; others: string[] } {
  const actors = (n.actors || headWho).replace(/\s*\+\d+\s*$/, "");
  const [rawFrom = "", rawTo = ""] = actors.split("→").map((s) => s.trim());
  const from = rawFrom && !UNATTRIBUTED.test(rawFrom) ? person(rawFrom) : "";
  const to = rawTo ? person(rawTo.split(/[;,]/)[0] ?? "") : "";
  const firstTo = rawTo.split(/[;,]/)[0] ?? "";
  const named = new Set([nameKey(rawFrom), nameKey(firstTo)]);
  const shown = [rawFrom, firstTo].filter(Boolean);
  const others: string[] = [];
  // The Act Lane joins addresses with ";", so each entry splits on it too.
  for (const r of splitRecipients(n.recipients).flatMap((x) =>
    x
      .split(";")
      .map((y) => y.trim())
      .filter(Boolean),
  )) {
    const k = nameKey(r);
    if (!k || named.has(k)) continue;
    // The operator already on the line, in any form, is not someone else;
    // nor is an address that spells a name already shown.
    if (isMe(r) && (from === "you" || to === "you")) continue;
    if (shown.some((x) => spells(r, x))) continue;
    named.add(k);
    others.push(isMe(r) ? "you" : r);
  }
  return { from, to, others };
}

/** The head's own parts, before any redaction: what ✎ starts from. */
function partsOf(n: RowNote): {
  head: string;
  rest: string;
  parts: { subject: string; who: string } | null;
} {
  const [head = "", ...rest] = n.body.split("\n");
  return { head, rest: rest.join("\n"), parts: headParts(head) };
}

/** The email facts of a filed email note. */
function factsOf(n: RowNote, doc: Doc | undefined): EmailFacts {
  const { head, rest, parts } = partsOf(n);
  const p = parts ?? { subject: head.replace(GLYPH_STRIP, ""), who: "" };
  const { from, to, others } = peopleOf(n, p.who);
  return {
    dir: doc?.direction ?? "",
    from,
    to,
    others,
    subject: redactMoneyStrict(cleanSubject(p.subject)),
    kept: redactMoneyStrict(withoutOwed(rest)),
    read: (n.source ?? "").endsWith("-ai"),
  };
}

/** M/D of a moment, Chicago. */
const dayOf = (ms: number): string => (Number.isNaN(ms) ? "" : DAY_FMT.format(ms));

/** The day a to-do was done: its own done tag, else its last change. */
function doneDay(t: Todo): string {
  return dayOf(doneAt(t));
}

/** The moment a to-do was done: its own done tag, else its last change. */
function doneAt(t: Todo): number {
  const tag = splitTags(splitMarker(t.body ?? "").text).tags.doneAt;
  return tag ? Number(tag) : Date.parse(t.updatedAt ?? "");
}

/** Each Owed segment with its state, closed by its own commitment: the one
 *  to-do or loop that tracks this promise, among those whose key is the
 *  segment's (the fan-out's own keys, so one promise filed twice is one
 *  promise). The row the note's own filing opened tracks it; failing that,
 *  the same-key row opened nearest at or after the note's moment, and an
 *  earlier one only when nothing newer exists, so a later promise in the
 *  same words never reopens one that was kept. It closes done, on the day
 *  that row's done tag holds, or released by their side. A colleague's
 *  promise is tracked by nothing here, and stays as the record wrote it. */
function owedOf(
  n: RowNote,
  moment: number,
  todos: readonly Todo[],
  released: ReadonlySet<string>,
  homeSide: readonly string[],
): OwedLine[] {
  const segs = owedSegments(partsOf(n).rest);
  if (segs.length === 0) return [];
  return segs.map((s) => {
    const key = knowledgeKey(s.text);
    const colleague = !s.mine && !!s.who && isHomeSideName(s.who, homeSide);
    const same = colleague
      ? []
      : todos.filter((t) => {
          const loop = theirLoopOf(t.body);
          return s.mine
            ? !loop && commitmentKey(t.body) === key
            : !!loop && knowledgeKey(loop.text) === key;
        });
    const opened = (t: Todo) => Date.parse(t.createdAt ?? "");
    const at = Number.isNaN(moment) ? Date.parse(n.createdAt) : moment;
    const tracking =
      (n.filingId ? same.find((t) => t.filingId === n.filingId) : undefined) ??
      same.filter((t) => opened(t) >= at).sort((a, b) => opened(a) - opened(b))[0] ??
      same
        // An earlier row tracks this promise only if it was still open when
        // the promise was made: a delivery before it cannot be its delivery.
        .filter((t) => !(opened(t) >= at) && (!t.done || doneAt(t) >= at))
        .sort((a, b) => (opened(b) || 0) - (opened(a) || 0))[0];
    const closed = !tracking
      ? ""
      : tracking.done
        ? `Done ${doneDay(tracking)}.`
        : released.has(tracking.id)
          ? "Released."
          : "";
    return {
      ...s,
      text: redactMoneyStrict(s.text),
      closed: closed.replace(/^Done \.$/, "Done."),
    };
  });
}

type Shared = {
  docById: Map<string, Doc>;
  whens: Map<string, When>;
  clientFirsts: Set<string>;
};

function share(
  all: readonly RowNote[],
  docs: readonly Doc[],
  homeSide: readonly string[],
): Shared {
  return {
    docById: new Map(docs.filter((d) => d.noteId).map((d) => [d.noteId, d])),
    whens: whensOf(all),
    clientFirsts: clientFirstsOf(all, homeSide),
  };
}

/** The latest email, from what share() read once. */
function pickLatest(
  notes: readonly RowNote[],
  homeSide: readonly string[],
  { docById, whens, clientFirsts }: Shared,
): LatestEmail | null {
  // An entry filed with no day is a candidate only when no dated email is.
  let best: { n: RowNote; at: number; dateless: boolean } | null = null;
  const candidates: { n: RowNote; at: number; dateless: boolean }[] = [];
  for (const n of notes) {
    const d = docById.get(n.id);
    if (!d || !MAIL_HEAD.test(n.body) || d.closer || d.machinery) continue;
    const ok =
      d.direction === "out"
        ? reachesAccount(n, homeSide, clientFirsts)
        : d.direction === "in" && reachedMe(n);
    if (!ok) continue;
    const w = whens.get(n.id);
    const at = w?.at ?? NaN;
    if (!w || Number.isNaN(at)) continue;
    const better = !best
      ? true
      : best.dateless !== w.dateless
        ? best.dateless
        : at > best.at;
    candidates.push({ n, at, dateless: w.dateless });
    if (better) best = { n, at, dateless: w.dateless };
  }
  if (!best) return null;
  // The Act Lane logs a send the moment it opens mail; the copy the relay
  // files of that same email claims only its minute, so it can read a few
  // seconds older. The filed copy, which carries the whole email, wins.
  if (logged(best.n)) {
    const subject = threadSubject(cleanSubject(partsOf(best.n).parts?.subject ?? ""));
    const at = best.at;
    // The same email: one subject, one recipient, sent in the stub's minute
    // or within half an hour after it, the nearest first.
    const sent = targetsOf(best.n).names;
    const copy = candidates
      .filter(
        (c) =>
          !logged(c.n) &&
          !c.dateless &&
          docById.get(c.n.id)?.direction === "out" &&
          c.at >= at - 60_000 &&
          c.at <= at + 30 * 60_000 &&
          threadSubject(cleanSubject(partsOf(c.n).parts?.subject ?? "")) === subject &&
          targetsOf(c.n).names.some((x) =>
            sent.some((y) => nameKey(x) === nameKey(y) || spells(x, y) || spells(y, x)),
          ),
      )
      .sort((a, b) => Math.abs(a.at - at) - Math.abs(b.at - at))[0];
    if (copy) best = copy;
  }
  const n = best.n;
  const w = whens.get(n.id)!;
  return {
    id: n.id,
    day: w.day,
    time: w.time,
    logged: logged(n),
    ...factsOf(n, docById.get(n.id)),
  };
}

/** A send the Act Lane logged, with no email of its own on file. */
const logged = (n: RowNote): boolean =>
  ACT_SENT.test(n.body.split("\n")[0] ?? "") || n.source === "act-lane";

/** The record's lines, from what share() read once. */
function pickLines(
  input: {
    notes: readonly RowNote[];
    all: readonly RowNote[];
    todos: readonly Todo[];
    released: ReadonlySet<string>;
    homeSide: readonly string[];
    limit: number;
  },
  { docById, whens, clientFirsts }: Shared,
): RecordLine[] {
  const when = (n: RowNote): When => whens.get(n.id) ?? whenOfRow(n.createdAt, n.body);
  const byAt = (a: RowNote, b: RowNote) => when(b).at - when(a).at;
  const ordered = [...input.notes].sort(byAt);
  const shown = ordered.slice(0, input.limit);

  // The operator's sends that reached the account, for "answered": a
  // sign-off answers nothing and machinery never replies (the closer rule;
  // C5).
  const sends = input.all
    .filter((n) => {
      const d = docById.get(n.id);
      return (
        MAIL_HEAD.test(n.body) &&
        d?.direction === "out" &&
        !d.closer &&
        !d.machinery &&
        reachesAccount(n, input.homeSide, clientFirsts)
      );
    })
    .map(when);
  // A send answers an inbound only when the record says it came after: both
  // clocks their own and the send's later, or the send on a later day. A day
  // with no clock answers nothing on its own day.
  const answeredBy = (w: When): string => {
    const after = sends
      .filter((s) =>
        s.clocked && w.clocked
          ? s.at > w.at
          : !!s.dayKey && !!w.dayKey && s.dayKey > w.dayKey,
      )
      .sort((a, b) => a.at - b.at)[0];
    return after ? after.day || dayOf(after.at) : "";
  };

  // The same email filed twice, on either lane: one sender, one recipient,
  // one subject, one moment, and the same words when the head carried no
  // clock. One filing never holds a twin of its own (the read never writes
  // a message twice). When both copies show, the first stays clean and the
  // second says so; a copy whose twin sits on the other lane, or past the
  // shown few, says so alone. The keys read the head alone, so only a
  // clockless pair costs a read of the words.
  const keyOf = (n: RowNote): string => {
    const { parts } = partsOf(n);
    const p = peopleOf(n, parts?.who ?? "");
    const w = when(n);
    return [
      nameKey(p.from),
      nameKey(p.to),
      threadSubject(cleanSubject(parts?.subject ?? "")),
      w.dayKey,
      w.time,
    ].join("|");
  };
  const words = (n: RowNote) =>
    withoutOwed(partsOf(n).rest).toLowerCase().replace(/\s+/g, " ");
  const twins = (n: RowNote, q: RowNote): boolean =>
    n.id !== q.id &&
    !(n.filingId && q.filingId === n.filingId) &&
    // A clock with no day is no moment: those need the same words.
    ((when(n).time !== "" && when(n).dayKey !== "") ||
      (words(n) !== "" && words(n) === words(q)));
  const groups = new Map<string, RowNote[]>();
  for (const n of input.all)
    if (isEmail(n.body)) groups.set(keyOf(n), [...(groups.get(keyOf(n)) ?? []), n]);
  const shownAt = new Map(shown.map((n, i) => [n.id, i]));
  const twice = new Set<string>();
  for (const n of shown) {
    if (!isEmail(n.body)) continue;
    const partners = (groups.get(keyOf(n)) ?? []).filter((q) => twins(n, q));
    if (partners.length === 0) continue;
    const shownPartners = partners.filter((q) => shownAt.has(q.id));
    const first = shownPartners.every((q) => shownAt.get(q.id)! > shownAt.get(n.id)!);
    if (!(shownPartners.length > 0 && first)) twice.add(n.id);
  }

  return shown.map((n): RecordLine => {
    const { head, rest, parts } = partsOf(n);
    const glyph = GLYPH_AT.exec(n.body)?.[0] ?? "✎";
    const w = when(n);
    const struck = n.body.startsWith("✓");
    const stored = parts ? parts.subject.trim() : head.replace(GLYPH_STRIP, "").trim();
    // ✎ starts from what is stored, with the figures the line hides hidden
    // in the box too, by the rule the line renders by.
    const edit = redactMoneyStrict(stored);
    if (isEmail(n.body)) {
      const doc = docById.get(n.id);
      const f = factsOf(n, doc);
      return {
        id: n.id,
        text: head.slice(0, 500),
        edit,
        struck,
        glyph,
        day: w.day,
        time: w.time,
        who: "",
        line: f.subject,
        body: "",
        email: {
          ...f,
          owed: owedOf(
            n,
            w.dateless ? Date.parse(n.createdAt) : w.at,
            input.todos,
            input.released,
            input.homeSide,
          ),
          answered:
            f.dir === "in" && !doc?.closer && !doc?.machinery ? answeredBy(w) : "",
          closer: !!doc?.closer,
          twice: twice.has(n.id),
        },
      };
    }
    // A call's synopsis, a chat and a tape talk prices the way an email
    // does, so the strict rule reads them too.
    const body = redactMoneyStrict(rest.trim());
    const people = parts ? peopleOf(n, parts.who) : null;
    // A call's or a task's entry head carries the pipeline's subject, so it
    // reads clean as an email's does.
    const line = parts ? cleanSubject(parts.subject) : stored;
    return {
      id: n.id,
      text: head.slice(0, 500),
      edit,
      struck,
      glyph,
      day: w.day,
      time: w.time,
      who: people?.from ? `${people.from}${people.to ? ` → ${people.to}` : ""}` : "",
      line: redactMoneyStrict(line),
      body: body.length > BODY_CAP ? `${body.slice(0, BODY_CAP).trimEnd()}…` : body,
      email: null,
    };
  });
}

/** Both reads for one row, every moment read once (the page's call). */
export function emailRow(input: {
  /** The lane the row shows (EARLIER). */
  notes: readonly RowNote[];
  /** Every visible row, both lanes. */
  all: readonly RowNote[];
  docs: readonly Doc[];
  todos: readonly Todo[];
  /** The to-dos their side released (the sheet's own read). */
  released?: ReadonlySet<string>;
  /** Our side, declared (csms ∪ homeSideFrom). */
  homeSide: readonly string[];
  limit: number;
}): { record: RecordLine[]; latest: LatestEmail | null } {
  const shared = share(input.all, input.docs, input.homeSide);
  return {
    record: pickLines({ ...input, released: input.released ?? new Set() }, shared),
    latest: pickLatest(input.all, input.homeSide, shared),
  };
}

/** The record's lines for the row: the newest `limit` entries of the lane
 *  the row shows, in the order the record happened. */
export function recordLines(input: {
  notes: readonly RowNote[];
  /** Every visible row, both lanes: an answer or a twin outside the lane
   *  the row shows still counts. Defaults to `notes`. */
  all?: readonly RowNote[];
  docs: readonly Doc[];
  todos: readonly Todo[];
  released?: ReadonlySet<string>;
  /** Our side, declared (csms ∪ homeSideFrom). */
  homeSide: readonly string[];
  limit: number;
}): RecordLine[] {
  const all = input.all ?? input.notes;
  return pickLines(
    { ...input, all, released: input.released ?? new Set() },
    share(all, input.docs, input.homeSide),
  );
}

/** The newest email on the record, either direction: a sign-off, a calendar
 *  acceptance and any other machinery are read past, as is a line whose
 *  direction the doc read cannot name (a colleague's coordination mail, an
 *  unattributed entry), a send of ours that reached only our own side, their
 *  mail that never reached the operator, and a chat or call line. Null when
 *  the record holds no email. */
export function latestEmail(input: {
  notes: readonly RowNote[];
  docs: readonly Doc[];
  /** Our side, declared (csms ∪ homeSideFrom). */
  homeSide: readonly string[];
}): LatestEmail | null {
  return pickLatest(
    input.notes,
    input.homeSide,
    share(input.notes, input.docs, input.homeSide),
  );
}
