// The account's day sheet, assembled in Today's own dialect. Sheet rows are
// todos whose bodies carry tag markers (kind/delay/doneAt) and routing markers
// (AccountNote ids); delays and hides live as namespaced dispositions. The
// room must read exactly what Today wrote or the mechanics simply vanish —
// this lib is the single translation layer, and it is pure so the adversarial
// suite can feed it hostile bodies and day boundaries.

import { splitMarker, splitTags, visibleText } from "@/lib/today/route-notes";
import { sameLocalDayIso } from "@/lib/today/ledger";
import { redactMoney } from "@/lib/intel/lexicon";
import { splitFallback } from "@/lib/room/deliverables";
import { clip } from "@/lib/room/move-line";
import { settledByRecord } from "@/lib/room/settled";

export type SheetTodo = {
  id: string;
  body: string;
  done: boolean;
  accountId: string;
  remindAt: string;
  createdAt: string;
  updatedAt: string;
};
export type SheetDisposition = { reason: string; updatedAt: string };
export type AccountSheet = {
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
};

/** How many open commitments the register shows before the door. */
export const OPEN_SHOWN = 8;

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

function tagsOf(body: string): { kind: string; doneAt: string; date: string } {
  try {
    const { kind, doneAt, date } = splitTags(splitMarker(body ?? "").text).tags;
    return { kind, doneAt, date };
  } catch {
    return { kind: "", doneAt: "", date: "" };
  }
}

// M/D of a wall that has already passed — "" while the date is still ahead.
function passedWall(dateIso: string, now: Date): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return "";
  const t = Date.parse(`${dateIso}T23:59:59Z`);
  if (Number.isNaN(t) || t >= now.getTime()) return "";
  return new Date(`${dateIso}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "numeric",
    day: "numeric",
  });
}

function chicagoDay(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t)
    .toLocaleDateString("en-US", { timeZone: "America/Chicago", weekday: "short" })
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
   *  says so instead of nagging (decreed 2026-09-04). */
  notes: readonly { body: string; createdAt: string }[] = [],
): AccountSheet {
  const out: AccountSheet = { open: [], delayed: [], doneToday: [] };
  for (const t of todos) {
    if (!todoBelongsTo(t, accountId, accountNoteIds)) continue;
    if (dispositions.has(`${HIDE}todo:${t.id}`)) continue;
    const body = displayLine(t.body);
    if (!body) continue;
    const edit = fullLine(t.body);
    const { kind, doneAt, date } = tagsOf(t.body);
    const isAction = kind === "action";
    const remindT = t.remindAt ? Date.parse(t.remindAt) : NaN;
    const remindFuture = !Number.isNaN(remindT) && remindT > now.getTime();
    const delay = dispositions.get(`${ROW_DELAY}todo:${t.id}`);
    const delayedToday = !!delay && sameLocalDayIso(delay.updatedAt, now);

    if (!t.done) {
      if (remindFuture)
        out.delayed.push({ id: t.id, body, edit, when: chicagoDay(t.remindAt) });
      else if (isAction && delayedToday)
        out.delayed.push({ id: t.id, body, edit, when: "HELD" });
      else if (isAction) {
        const wall = passedWall(date, now);
        // The fallback reads from the FULL line — the display cap must never
        // swallow the contingency.
        const fallback = wall ? splitFallback(edit).fallback : "";
        const promised = !!wall && /·\s*from\s+\d{1,2}\/\d{1,2}\s+paste/i.test(edit);
        const landed = settledByRecord({ text: edit, at: t.createdAt }, notes);
        out.open.push({
          id: t.id,
          body,
          edit,
          ...(wall ? { wall } : {}),
          ...(promised ? { promised } : {}),
          ...(fallback ? { fallback } : {}),
          ...(date ? { due: date } : {}),
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
  };
}
