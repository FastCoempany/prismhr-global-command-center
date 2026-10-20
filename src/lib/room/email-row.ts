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
// as a colleague's mail never does. What renders is money-redacted again on
// the way out, by the rule an email's own words take.

import { LEGACY_HEAD_START_RE, LEGACY_SUBJECT_RE } from "@/lib/ingest/dialect";
import { redactMoneyStrict } from "@/lib/intel/lexicon";
import { MINE_RE, isHomeSideName, splitRecipients } from "@/lib/intel/provenance";
import { threadSubject } from "@/lib/intel/email-whole";
import { owedSegments, theirLoopOf, withoutOwed } from "@/lib/room/owed";
import type { RecordDoc } from "@/lib/record/docs";
import { splitMarker, splitTags } from "@/lib/today/route-notes";
import { USER_TZ, chicagoWallToUtc } from "@/lib/tz";

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

type Doc = Pick<
  RecordDoc,
  "noteId" | "direction" | "closer" | "machinery" | "at" | "text"
>;

type Todo = {
  id: string;
  body: string;
  done: boolean;
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
  /** "Done 10/16." once every to-do or loop the filing opened for that side
   *  is done; "" while any is open or the filing opened none. */
  closed: string;
};

/** The email facts a line or the latest email carries. */
export type EmailFacts = {
  dir: "in" | "out" | "";
  /** "you" for the operator. */
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
  /** The stored first line, the ✎ edit's source. */
  text: string;
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
  filingId: string;
};

// The full paste alphabet, as the room drew it: ✔ tasks and ☎ calls
// included, so filed activities never misrender as hand-typed notes.
const GLYPH_AT = /^[✉✓☰✎✔☎]/;
const GLYPH_STRIP = /^[✉✓☰✎⚡▢✔☎]\s?/;
/** The most of a note's own body one line ships; the account's record keeps
 *  the rest, one click on. */
export const BODY_CAP = 1500;

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

/** The day and the clock a person reads: a filed entry's own day and the
 *  clock its head wrote, never the noon anchor's hour; a note filed with a
 *  real moment reads that moment in Chicago. */
export function whenOf(createdAt: string, body: string): { day: string; time: string } {
  const ms = Date.parse(createdAt);
  if (Number.isNaN(ms)) return { day: "", time: "" };
  const d = new Date(ms);
  if (isNoonAnchor(ms)) {
    const mins = headMinutes(body);
    const day = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
    if (mins == null) return { day, time: "" };
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return {
      day,
      time: `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`,
    };
  }
  return {
    day: d.toLocaleDateString("en-US", {
      timeZone: USER_TZ,
      month: "numeric",
      day: "numeric",
    }),
    time: d.toLocaleTimeString("en-US", {
      timeZone: USER_TZ,
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

/** The moment a line happened, for ordering one row's lines: a filed email
 *  at its head's clock on its own day, read as Chicago's wall clock, and any
 *  other note at its stamp. The read's effective moment shifts around the
 *  noon anchor (src/lib/intel/clock.ts), which orders emails among
 *  themselves but not against a stamp made at a real moment, and EARLIER
 *  holds both: a 3 PM email sorted above an 11 AM worked move. */
export function momentOf(createdAt: string, body: string): number {
  const ms = Date.parse(createdAt);
  if (Number.isNaN(ms) || !isNoonAnchor(ms)) return ms;
  const mins = headMinutes(body);
  if (mins == null) return ms;
  const d = new Date(ms);
  return chicagoWallToUtc(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    Math.floor(mins / 60),
    mins % 60,
  );
}

/** A subject as a person reads it: the external tags, the marks and the reply
 *  and forward prefixes gone, the words as written. */
export function cleanSubject(s: string): string {
  let t = (s ?? "")
    .replace(/\[\s*(?:EXTERNAL|EXT|External Email)\s*\]/gi, " ")
    .replace(/❗/g, " ");
  for (;;) {
    const next = t.replace(
      /^[\s!*:|-]*(?:re|fw|fwd|aw|sv|wg|external)\s*(?:\[\d+\])?\s*:\s*/i,
      "",
    );
    if (next === t) break;
    t = next;
  }
  return t.replace(/\s+/g, " ").trim() || "No subject";
}

/** The entry head's subject and who, when the line is one. */
function headParts(head: string): { subject: string; who: string } | null {
  // The Act Lane's send (src/lib/act/lane.ts): "✉ <subject> — sent to <to>."
  const sent = /^✉ (.*?) — sent to (.+?)\.?$/.exec(head);
  if (sent) return { subject: sent[1], who: "" };
  if (!LEGACY_HEAD_START_RE.test(head)) return null;
  const m = LEGACY_SUBJECT_RE.exec(head);
  if (m) {
    const dot = head.lastIndexOf(" · ");
    return { subject: m[1], who: dot >= 0 ? head.slice(dot + 3).trim() : "" };
  }
  const dash = head.indexOf("— ");
  return dash >= 0 ? { subject: head.slice(dash + 2), who: "" } : null;
}

/** The stored first line with a new subject in its slot: ✎ on a filed
 *  activity edits the subject a person reads, and the head keeps its
 *  glyph, format code, clock and who, which the readers parse. A line that
 *  is not an entry head is the edit itself. */
export function withSubject(head: string, subject: string): string {
  const s = subject.replace(/\s+/g, " ").trim();
  const sent = /^✉ .*?( — sent to .+)$/.exec(head);
  if (sent) return `✉ ${s}${sent[1]}`;
  if (!headParts(head)) return s;
  const dash = head.indexOf("— ");
  const dot = head.lastIndexOf(" · ");
  return dot > dash
    ? `${head.slice(0, dash + 2)}${s}${head.slice(dot)}`
    : `${head.slice(0, dash + 2)}${s}`;
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
function reachesAccount(n: RowNote, homeSide: readonly string[]): boolean {
  const { names, dropped } = targetsOf(n);
  if (dropped) return true;
  return names.some((x) => !isMe(x) && !OUR_MAIL.test(x) && !isHomeSideName(x, homeSide));
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

/** From, to and everyone else, from the actors column with the head as its
 *  fallback, and the recipients column for the rest. */
function peopleOf(
  n: RowNote,
  headWho: string,
): { from: string; to: string; others: string[] } {
  const actors = (n.actors || headWho).replace(/\s*\+\d+\s*$/, "");
  const [rawFrom = "", rawTo = ""] = actors.split("→").map((s) => s.trim());
  const from = rawFrom ? person(rawFrom) : "";
  const to = rawTo ? person(rawTo.split(/[;,]/)[0] ?? "") : "";
  const named = new Set([nameKey(rawFrom), nameKey(rawTo.split(/[;,]/)[0] ?? "")]);
  const others: string[] = [];
  for (const r of splitRecipients(n.recipients)) {
    const k = nameKey(r);
    if (!k || named.has(k)) continue;
    named.add(k);
    others.push(isMe(r) ? "you" : r);
  }
  return { from, to, others };
}

/** The email facts of a filed email note. */
function factsOf(n: RowNote, doc: Doc | undefined): EmailFacts {
  const [head = "", ...rest] = n.body.split("\n");
  const parts = headParts(head) ?? { subject: head.replace(GLYPH_STRIP, ""), who: "" };
  const { from, to, others } = peopleOf(n, parts.who);
  return {
    dir: doc?.direction ?? "",
    from,
    to,
    others,
    subject: redactMoneyStrict(cleanSubject(parts.subject)),
    kept: redactMoneyStrict(withoutOwed(rest.join("\n"))),
    read: (n.source ?? "").endsWith("-ai"),
  };
}

const isEmail = (body: string) => body.startsWith("✉ ");

/** M/D of a todo's last change, Chicago. */
const changedDay = (iso?: string): string => {
  const t = Date.parse(iso ?? "");
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", {
    timeZone: USER_TZ,
    month: "numeric",
    day: "numeric",
  });
};

/** Each Owed segment with its state: closed only when the filing opened
 *  work for that side and every piece of it is done (the closer rule: a
 *  promise closes by delivery, never by a later message). */
function owedOf(n: RowNote, todos: readonly Todo[]): OwedLine[] {
  const segs = owedSegments(n.body.split("\n").slice(1).join("\n"));
  if (segs.length === 0) return [];
  const filed = n.filingId ? todos.filter((t) => t.filingId === n.filingId) : [];
  const closedFor = (mine: boolean): string => {
    const side = filed.filter((t) => (theirLoopOf(t.body) ? !mine : mine));
    if (side.length === 0 || side.some((t) => !t.done)) return "";
    // The day it was done, from the row's own done tag; the row's last
    // change only when the tag is absent, because an edit moves that.
    const last = side
      .map((t) => {
        const tag = splitTags(splitMarker(t.body ?? "").text).tags.doneAt;
        return tag ? new Date(Number(tag)).toISOString() : (t.updatedAt ?? "");
      })
      .sort()
      .pop();
    const day = changedDay(last);
    return day ? `Done ${day}.` : "Done.";
  };
  return segs.map((s) => ({
    ...s,
    text: redactMoneyStrict(s.text),
    closed: closedFor(s.mine),
  }));
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
  /** Our side, declared (csms ∪ homeSideFrom). */
  homeSide: readonly string[];
  limit: number;
}): RecordLine[] {
  const docById = new Map(input.docs.filter((d) => d.noteId).map((d) => [d.noteId, d]));
  const all = input.all ?? input.notes;
  // Each row's moment, read once: the sort compares them many times over.
  const moment = new Map(all.map((n) => [n.id, momentOf(n.createdAt, n.body)]));
  for (const n of input.notes)
    if (!moment.has(n.id)) moment.set(n.id, momentOf(n.createdAt, n.body));
  const at = (n: RowNote) => moment.get(n.id) ?? Date.parse(n.createdAt);
  const ordered = [...input.notes].sort((a, b) => at(b) - at(a));
  // The operator's sends that reached the account, oldest first, for
  // "answered": a sign-off answers nothing and machinery never replies (the
  // closer rule; C5).
  const sends = all
    .filter((n) => {
      const d = docById.get(n.id);
      return (
        MAIL_HEAD.test(n.body) &&
        d?.direction === "out" &&
        !d.closer &&
        !d.machinery &&
        reachesAccount(n, input.homeSide)
      );
    })
    .map(at)
    .sort((a, b) => a - b);
  // The same email filed twice: one sender, one recipient, one subject, one
  // moment, and the same words when the head carried no clock. The newest
  // copy leads.
  const seen = new Map<string, string>();
  const twice = new Set<string>();
  for (const n of ordered) {
    if (!isEmail(n.body)) continue;
    const f = factsOf(n, docById.get(n.id));
    const w = whenOf(n.createdAt, n.body);
    const key = [
      nameKey(f.from),
      nameKey(f.to),
      threadSubject(f.subject),
      w.day,
      w.time,
    ].join("|");
    const words = f.kept.toLowerCase().replace(/\s+/g, " ");
    const prior = seen.get(key);
    if (prior === undefined) seen.set(key, words);
    else if (w.time || (words && prior === words)) twice.add(n.id);
  }

  return ordered.slice(0, input.limit).map((n): RecordLine => {
    const [head = "", ...rest] = n.body.split("\n");
    const glyph = GLYPH_AT.exec(n.body)?.[0] ?? "✎";
    const { day, time } = whenOf(n.createdAt, n.body);
    const struck = n.body.startsWith("✓");
    if (isEmail(n.body)) {
      const doc = docById.get(n.id);
      const f = factsOf(n, doc);
      const when = at(n);
      const answer =
        f.dir === "in" && !doc?.closer && !doc?.machinery
          ? sends.find((x) => x > when)
          : undefined;
      return {
        id: n.id,
        text: head.slice(0, 500),
        struck,
        glyph,
        day,
        time,
        who: "",
        line: f.subject,
        body: "",
        email: {
          ...f,
          owed: owedOf(n, input.todos),
          answered:
            answer !== undefined ? changedDay(new Date(answer).toISOString()) : "",
          closer: !!doc?.closer,
          twice: twice.has(n.id),
        },
      };
    }
    const parts = headParts(head);
    const body = redactMoneyStrict(rest.join("\n").trim());
    const people = parts ? peopleOf(n, parts.who) : null;
    return {
      id: n.id,
      text: head.slice(0, 500),
      struck,
      glyph,
      day,
      time,
      who: people?.from ? `${people.from}${people.to ? ` → ${people.to}` : ""}` : "",
      line: redactMoneyStrict(
        parts ? parts.subject.trim() : head.replace(GLYPH_STRIP, "").trim(),
      ),
      body: body.length > BODY_CAP ? `${body.slice(0, BODY_CAP).trimEnd()}…` : body,
      email: null,
    };
  });
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
  const docById = new Map(input.docs.filter((d) => d.noteId).map((d) => [d.noteId, d]));
  let best: { n: RowNote; at: number } | null = null;
  for (const n of input.notes) {
    const d = docById.get(n.id);
    if (!d || !MAIL_HEAD.test(n.body) || d.closer || d.machinery) continue;
    const ok =
      d.direction === "out"
        ? reachesAccount(n, input.homeSide)
        : d.direction === "in" && reachedMe(n);
    if (!ok) continue;
    const at = momentOf(n.createdAt, n.body);
    if (!best || at > best.at) best = { n, at };
  }
  if (!best) return null;
  const n = best.n;
  const { day, time } = whenOf(n.createdAt, n.body);
  return {
    id: n.id,
    day,
    time,
    filingId: n.filingId ?? "",
    ...factsOf(n, docById.get(n.id)),
  };
}
