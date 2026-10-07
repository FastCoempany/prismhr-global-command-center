// The account's day sheet, assembled in Today's own dialect. Sheet rows are
// todos whose bodies carry tag markers (kind/delay/doneAt) and routing markers
// (AccountNote ids); delays and hides live as namespaced dispositions. The
// room must read exactly what Today wrote or the mechanics simply vanish —
// this lib is the single translation layer, and it is pure so the adversarial
// suite can feed it hostile bodies and day boundaries.

import { splitMarker, splitTags, visibleText } from "@/lib/today/route-notes";
import { sameLocalDayIso } from "@/lib/today/ledger";
import {
  isCloser,
  isMachineSender,
  isMachinery,
  readRelease,
  type Relief,
} from "@/lib/intel/closer";
import { effectiveAt } from "@/lib/intel/clock";
import { redactMoney } from "@/lib/intel/lexicon";
import { MINE_RE, normPerson } from "@/lib/intel/provenance";
import { parseSeatBody } from "@/lib/act/lane";
import { LEGACY_HEAD_START_RE } from "@/lib/ingest/dialect";
import { splitFallback } from "@/lib/room/deliverables";
import { clip } from "@/lib/room/move-line";
import { dayBlown } from "@/lib/room/owed";
import { settledByRecord } from "@/lib/room/settled";
import { recordSends } from "@/lib/sendbook/read";
import { chicagoDay } from "@/lib/tz";

export type SheetTodo = {
  id: string;
  body: string;
  done: boolean;
  accountId: string;
  remindAt: string;
  createdAt: string;
  updatedAt: string;
};
type SheetDisposition = { reason: string; updatedAt: string };
type AccountSheet = {
  // `wall` is the commitment's own date once it has passed, and `fallback` the
  // if/then that rode in with it — the app runs the contingency instead of
  // waiting for the operator to remember there was one. `edit` is the FULL
  // visible line: the display body is capped for the row, and an edit box fed
  // the capped body would silently truncate the stored line on save.
  open: {
    id: string;
    body: string;
    edit: string;
    wall?: string;
    // The wall belongs to a commitment the operator SPOKE — a paste-opened
    // promise whose date passed reads "PROMISED 8/21", not a generic wall:
    // the counterparty heard the day and the day ended (decreed 2026-08-22).
    // A typed line reads it too when it names its hearer (D28).
    promised?: boolean;
    fallback?: string;
    // The commitment's own date, wall passed or not — the stage ranks by it
    // so the row's instruction is the most urgent thing owed, never
    // whichever item the store happened to list first (decreed 2026-09-03).
    due?: string;
    // Why the record shows this already landed, when it does. The row says
    // so and the stage stops instructing it; the commitment itself stays
    // open until the operator closes it (decreed 2026-09-04).
    settled?: string;
  }[];
  /** How many open commitments the cap held back — 0 when all of them show. */
  openMore?: number;
  /** The held-back ones themselves, so the door opens without another query. */
  rest?: AccountSheet["open"];
  delayed: { id: string; body: string; edit: string; when: string }[];
  doneToday: { id: string; body: string; edit: string; at: string }[];
  /** Commitments the record shows they let go of (the closer rule: a promise
   *  closes by delivery or explicit release; pass 8 H6). Closed, so never
   *  open, never instructed, never PROMISED; listed so nothing vanishes
   *  without a trace. `why` says who released it and when. */
  released: { id: string; body: string; edit: string; why: string }[];
};

/** How many open commitments the register shows before the door. */
export const OPEN_SHOWN = 8;

/** The Act Lane's seat as the register takes it (ruled 2026-09-25, C8). */
export type SeatForSheet = {
  /** The account's seat:<id> rows, newest first, as the wide loader holds
   *  them; the newest is the seat. */
  rows: readonly { id: string; body: string; createdAt: string }[];
  /** The account is excluded from Groundwork's queue today — the board, the
   *  ledger's hand, a snooze, or the record's live motion. Only then does the
   *  seat leave the wing and read here. */
  excluded: boolean;
  /** Groundwork's worked stamp for the seat already stands today. */
  workedToday?: boolean;
};

const ROW_DELAY = "row-delay:";
const HIDE = "hide:";

// Does this todo belong to the account? Two roads in: the notetaker column
// (what the room's composer writes) or the routing marker referencing one of
// the account's own note rows (what Today's routing writes).
export function todoBelongsTo(
  t: Pick<SheetTodo, "body" | "accountId">,
  accountId: string,
  accountNoteIds: ReadonlySet<string>,
): boolean {
  if (!accountId) return false;
  if ((t.accountId ?? "") === accountId) return true;
  try {
    const refs = splitMarker(t.body ?? "").refs;
    return !!refs?.accountNoteIds?.some((id) => accountNoteIds.has(id));
  } catch {
    return false;
  }
}

const LINE_CAP = 140;

// The full visible line — what the edit box gets, so saving an untouched row
// never truncates the stored text.
function fullLine(body: string): string {
  try {
    return redactMoney(visibleText(body ?? ""))
      .split("\n")[0]
      .trim();
  } catch {
    return "";
  }
}

// The row's display line. Over the cap, the provenance tail ("· from 8/14
// paste") goes first — it is the least important segment — and whatever still
// overruns trims on a word boundary with an ellipsis, never mid-word.
function displayLine(body: string): string {
  const line = fullLine(body);
  if (line.length <= LINE_CAP) return line;
  const bare = line.replace(/\s+·\s+from\s.*$/i, "").trimEnd();
  if (bare.length <= LINE_CAP) return bare;
  // One spelling of "trim on a word boundary" app-wide (move-line.ts) — a
  // second copy is how the same line got cut two different ways.
  return clip(bare, LINE_CAP).text;
}

function tagsOf(body: string): {
  kind: string;
  doneAt: string;
  date: string;
  hearer: string;
} {
  try {
    const { kind, doneAt, date, hearer } = splitTags(splitMarker(body ?? "").text).tags;
    return { kind, doneAt, date, hearer };
  } catch {
    return { kind: "", doneAt: "", date: "", hearer: "" };
  }
}

// "10/3" for a yyyy-mm-dd day.
const passedMD = (day: string): string =>
  /^\d{4}-\d{2}-\d{2}$/.test(day)
    ? `${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`
    : "";

// M/D of a wall that has already passed — "" while the date is still ahead.
// The wall passes when its Chicago day ends, never at a UTC midnight: a
// commitment due today still stands at 8 PM Chicago (the closer rule: all
// days are Chicago days; pass 8 X5).
function passedWall(dateIso: string, now: Date): string {
  return dayBlown(dateIso, now) ? passedMD(dateIso) : "";
}

// ── who heard it (ruled 2026-09-25, D28; pass 8 H7) ─────────────────────────
// PROMISED needs a hearer. A paste-provenance line has one by construction; a
// typed line has one when it names the person it was promised to: the tag
// line's own hearer, or a person the account's record already knows, named
// in the line by first name or in full. The operator and a mailbox are never
// a hearer. Conservative: a name the record has never seen proves nothing,
// and the line stays a wall.

type RecordPerson = { first: string; full: string };

const nameRe = (name: string): RegExp =>
  new RegExp(`(?<![\\w'’-])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w'’-])`);

/** Everyone the account's record names, as a line would name them. */
function recordPeople(notes: readonly { actors?: string }[]): RecordPerson[] {
  const out = new Map<string, RecordPerson>();
  for (const n of notes)
    for (const raw of (n.actors ?? "").split(/→|;|,/)) {
      const full = normPerson(raw.replace(/\+\d+\s*$/, "")).trim();
      if (!full || MINE_RE.test(full) || isMachineSender(full)) continue;
      const first = full.split(/\s+/)[0] ?? "";
      if (!/^[A-Z][a-z'’-]{2,}$/.test(first)) continue;
      out.set(full.toLowerCase(), { first, full });
    }
  return [...out.values()];
}

/** The person a typed line names as the one it was promised to, "" when it
 *  names nobody the record knows. */
function hearerNamed(line: string, people: readonly RecordPerson[]): string {
  const hit = people.find((p) => nameRe(p.full).test(line) || nameRe(p.first).test(line));
  return hit ? hit.full : "";
}

// ── a release or a reschedule (the closer rule; pass 8 H6) ──────────────────
// "A promise closes only by delivery or explicit release; 'no rush, next
// month' is a reschedule." A substantive message from their side, after the
// commitment was made, that lets it go closes it; one that pushes it out
// reschedules it: never PROMISED, still open, dayless or on the new day the
// message names. The message has to be a person writing (machinery and a
// sign-off never release anything), and it has to speak to THIS commitment:
// the line names the person who wrote it, or the sentence and the line share
// words of substance ("no rush on the census" against "Send the census"). A
// reschedule only softens, so one shared word is enough; a release closes,
// so it takes two ("no need for the census template"), and "we no longer
// need the Mexico pricing" never closes "Send the Mexico census". A bare "no
// rush" to someone the line never names releases nothing.

type ReliefFrom = { at: number; first: string; day: string; relief: Relief };

// Words too common to tie a sentence to a commitment.
const PLAIN = new Set(
  [
    "that this these those them they their there here with from your have will would",
    "could should please thanks thank just also still need needs send sent share give",
    "make take rush hurry time fine okay good great next week month later until till",
    "about what when then than been more some anymore before after back over into",
    "once worry",
  ]
    .join(" ")
    .split(" "),
);
const substance = (text: string): Set<string> =>
  new Set(
    (text.toLowerCase().match(/[a-z][a-z'’-]{3,}/g) ?? []).filter((w) => !PLAIN.has(w)),
  );

/** Every substantive message from their side that releases or reschedules
 *  something, oldest first. */
function reliefsIn(
  notes: readonly { body: string; createdAt: string; actors?: string }[],
): ReliefFrom[] {
  const out: ReliefFrom[] = [];
  for (const n of notes) {
    const body = n.body ?? "";
    if (!LEGACY_HEAD_START_RE.test(body)) continue;
    const full = normPerson(
      (n.actors ?? "")
        .split("→")[0]
        ?.replace(/\+\d+\s*$/, "")
        .trim() ?? "",
    ).trim();
    if (!full || MINE_RE.test(full) || isMachinery({ body, actors: n.actors })) continue;
    const said = body.split("\n").slice(1).join("\n");
    if (isCloser(said)) continue;
    // The head clock orders it against the commitment; the stored stamp
    // names its day, because the clock's shift is ordinal, not a wall clock.
    const at = Date.parse(effectiveAt(n.createdAt, body));
    const day = chicagoDay(n.createdAt);
    if (Number.isNaN(at) || !day) continue;
    const relief = readRelease(said, day);
    if (!relief) continue;
    out.push({ at, first: full.split(/\s+/)[0] ?? "", day, relief });
  }
  return out.sort((a, b) => a.at - b.at);
}

/** The newest release or reschedule that speaks to this commitment, made
 *  after it; null when none does. */
function reliefFor(
  line: string,
  madeAt: string,
  reliefs: readonly ReliefFrom[],
): ReliefFrom | null {
  const made = Date.parse(madeAt);
  if (Number.isNaN(made)) return null;
  const core = splitFallback(line).text.replace(/\s+·\s+from\s.*$/i, "");
  const words = substance(core);
  let hit: ReliefFrom | null = null;
  for (const r of reliefs) {
    if (r.at <= made) continue;
    const named = !!r.first && nameRe(r.first).test(core);
    const shared = [...substance(r.relief.sentence)].filter((w) => words.has(w)).length;
    if (named || shared >= (r.relief.kind === "release" ? 2 : 1)) hit = r;
  }
  return hit;
}

// The weekday of the reminder's Chicago day ("WED"), read off the one day key
// (src/lib/tz.ts) so the word and the day never disagree.
function chicagoWeekday(iso: string): string {
  const day = chicagoDay(iso);
  if (!day) return "";
  return new Date(`${day}T12:00:00Z`)
    .toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
    .toUpperCase();
}

// The three zones, per Today's ledger semantics: open actions (untouched by a
// same-day delay), scheduled rows (a future remindAt, or a delay that only
// counts for the day it was set), and actions completed today (doneAt stamp;
// an unstamped done falls back to its updatedAt day so nothing vanishes).
export function buildAccountSheet(
  todos: readonly SheetTodo[],
  accountId: string,
  accountNoteIds: ReadonlySet<string>,
  dispositions: ReadonlyMap<string, SheetDisposition>,
  now: Date,
  /** The account's record, so a commitment the record shows already landed
   *  says so instead of nagging (decreed 2026-09-04), and so a seat the
   *  record shows worked reads nowhere (C8). */
  notes: readonly {
    body: string;
    createdAt: string;
    source?: string;
    actors?: string;
  }[] = [],
  /** The Act Lane's seat, when the account holds one (C8). */
  seat: SeatForSheet | null = null,
): AccountSheet {
  const out: AccountSheet = { open: [], delayed: [], doneToday: [], released: [] };
  const people = recordPeople(notes);
  const reliefs = reliefsIn(notes);
  for (const t of todos) {
    if (!todoBelongsTo(t, accountId, accountNoteIds)) continue;
    if (dispositions.has(`${HIDE}todo:${t.id}`)) continue;
    const body = displayLine(t.body);
    if (!body) continue;
    const edit = fullLine(t.body);
    const { kind, doneAt, date, hearer } = tagsOf(t.body);
    const isAction = kind === "action";
    const remindT = t.remindAt ? Date.parse(t.remindAt) : NaN;
    const remindFuture = !Number.isNaN(remindT) && remindT > now.getTime();
    const delay = dispositions.get(`${ROW_DELAY}todo:${t.id}`);
    const delayedToday = !!delay && sameLocalDayIso(delay.updatedAt, now);

    if (!t.done) {
      if (remindFuture)
        out.delayed.push({ id: t.id, body, edit, when: chicagoWeekday(t.remindAt) });
      else if (isAction && delayedToday)
        out.delayed.push({ id: t.id, body, edit, when: "HELD" });
      else if (isAction) {
        // Their release closes it and their reschedule moves it (the closer
        // rule; pass 8 H6): a released commitment leaves the open list, and
        // a rescheduled one keeps the day they named, or none.
        const relief = reliefFor(edit, t.createdAt, reliefs);
        if (relief?.relief.kind === "release") {
          out.released.push({
            id: t.id,
            body,
            edit,
            why: `${relief.first || "They"} released it ${passedMD(relief.day)}.`,
          });
          continue;
        }
        const deferred = relief?.relief.kind === "defer";
        const dueDay = relief?.relief.kind === "defer" ? relief.relief.day : date;
        const wall = passedWall(dueDay, now);
        // The fallback reads from the FULL line — the display cap must never
        // swallow the contingency.
        const fallback = wall ? splitFallback(edit).fallback : "";
        // PROMISED needs a hearer (D28): the paste's by construction, the
        // tag line's, or a person of the record the typed line names. A day
        // they named themselves when they pushed it out was promised to
        // nobody, so it passes as a plain wall.
        const heard =
          /·\s*from\s+\d{1,2}\/\d{1,2}\s+paste/i.test(edit) ||
          !!hearer ||
          !!hearerNamed(splitFallback(edit).text, people);
        const promised = !!wall && !deferred && heard;
        const landed = settledByRecord({ text: edit, at: t.createdAt }, notes);
        out.open.push({
          id: t.id,
          body,
          edit,
          ...(wall ? { wall } : {}),
          ...(promised ? { promised } : {}),
          ...(fallback ? { fallback } : {}),
          ...(dueDay ? { due: dueDay } : {}),
          ...(landed ? { settled: landed.why } : {}),
        });
      }
      continue;
    }
    if (!isAction) continue;
    const stamp = Number(doneAt);
    const stampOk = doneAt !== "" && !Number.isNaN(stamp);
    const doneDay = stampOk
      ? sameLocalDayIso(new Date(stamp).toISOString(), now)
      : sameLocalDayIso(t.updatedAt, now);
    if (doneDay)
      out.doneToday.push({
        id: t.id,
        body,
        edit,
        at: stampOk ? new Date(stamp).toISOString() : t.updatedAt,
      });
  }
  // A seat follows its account (ruled 2026-09-25, C8): when the account is
  // excluded from Groundwork's queue, the Act Lane's seat leaves the wing and
  // reads here as the account's own action — until it is worked (the day's
  // stamp, or the record showing the outbound after it), taken back (✕ parks
  // it like any record entry), or the exclusion lifts and it returns to the
  // wing. The line is the operator's own act, ranked with the plain open
  // lines: the seat's day is when it was seated, never when it is due.
  const seatRow = seat?.excluded && !seat.workedToday ? seat.rows[0] : undefined;
  const seated = seatRow ? parseSeatBody(seatRow.body) : null;
  if (seatRow && seated && !dispositions.has(`${HIDE}note:${seatRow.id}`)) {
    const seatAt = Date.parse(seatRow.createdAt);
    const workedByRecord = recordSends(
      notes.map((n) => ({
        body: n.body,
        source: n.source ?? "",
        createdAt: n.createdAt,
        ...(n.actors ? { actors: n.actors } : {}),
      })),
    ).some((s) => Date.parse(s.at) > seatAt);
    if (!workedByRecord) {
      const held = dispositions.get(`${ROW_DELAY}todo:${seatRow.id}`);
      const line = { id: seatRow.id, body: seated.act, edit: seated.act };
      if (held && sameLocalDayIso(held.updatedAt, now))
        out.delayed.push({ ...line, when: "HELD" });
      else out.open.push(line);
    }
  }

  out.doneToday.sort((a, b) => {
    const at = Number(tagsOf(todos.find((t) => t.id === a.id)?.body ?? "").doneAt);
    const bt = Number(tagsOf(todos.find((t) => t.id === b.id)?.body ?? "").doneAt);
    return (Number.isNaN(at) ? 0 : at) - (Number.isNaN(bt) ? 0 : bt);
  });
  // The cap ranks before it cuts, and says what it held back (decreed
  // 2026-09-03). It used to slice the newest eight in store order and drop
  // the rest silently — nine open commitments across three accounts were
  // invisible on their own rows, which is how the register stopped reading
  // like the operator's work. A blown wall outranks a date, a date outranks
  // position, and whatever still doesn't fit is a door, never a disappearance.
  const ranked = [...out.open].sort((a, b) => {
    const rank = (o: (typeof out.open)[number]) =>
      o.settled ? 3 : o.wall ? 0 : o.due ? 1 : 2;
    const due = (o: (typeof out.open)[number]) => {
      const t = Date.parse(`${o.due ?? ""}T12:00:00Z`);
      return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER : t;
    };
    return rank(a) - rank(b) || due(a) - due(b);
  });
  return {
    open: ranked.slice(0, OPEN_SHOWN),
    openMore: Math.max(0, ranked.length - OPEN_SHOWN),
    rest: ranked.slice(OPEN_SHOWN),
    delayed: out.delayed.slice(0, 5),
    doneToday: out.doneToday.slice(0, 6),
    released: out.released,
  };
}
