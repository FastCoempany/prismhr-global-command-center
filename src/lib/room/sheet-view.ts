// The account's day sheet, assembled in Today's own dialect. Sheet rows are
// todos whose bodies carry tag markers (kind/delay/doneAt) and routing markers
// (AccountNote ids); delays and hides live as namespaced dispositions. The
// room must read exactly what Today wrote or the mechanics simply vanish —
// this lib is the single translation layer, and it is pure so the adversarial
// suite can feed it hostile bodies and day boundaries.

import { splitMarker, splitTags, visibleText } from "@/lib/today/route-notes";
import { sameLocalDayIso } from "@/lib/today/ledger";
import { redactMoney } from "@/lib/intel/lexicon";

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
  open: { id: string; body: string }[];
  delayed: { id: string; body: string; when: string }[];
  doneToday: { id: string; body: string }[];
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

function displayLine(body: string): string {
  try {
    return redactMoney(visibleText(body ?? ""))
      .split("\n")[0]
      .trim()
      .slice(0, 140);
  } catch {
    return "";
  }
}

function tagsOf(body: string): { kind: string; doneAt: string } {
  try {
    const { kind, doneAt } = splitTags(splitMarker(body ?? "").text).tags;
    return { kind, doneAt };
  } catch {
    return { kind: "", doneAt: "" };
  }
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
): AccountSheet {
  const out: AccountSheet = { open: [], delayed: [], doneToday: [] };
  for (const t of todos) {
    if (!todoBelongsTo(t, accountId, accountNoteIds)) continue;
    if (dispositions.has(`${HIDE}todo:${t.id}`)) continue;
    const body = displayLine(t.body);
    if (!body) continue;
    const { kind, doneAt } = tagsOf(t.body);
    const isAction = kind === "action";
    const remindT = t.remindAt ? Date.parse(t.remindAt) : NaN;
    const remindFuture = !Number.isNaN(remindT) && remindT > now.getTime();
    const delay = dispositions.get(`${ROW_DELAY}todo:${t.id}`);
    const delayedToday = !!delay && sameLocalDayIso(delay.updatedAt, now);

    if (!t.done) {
      if (remindFuture)
        out.delayed.push({ id: t.id, body, when: chicagoDay(t.remindAt) });
      else if (isAction && delayedToday)
        out.delayed.push({ id: t.id, body, when: "HELD" });
      else if (isAction) out.open.push({ id: t.id, body });
      continue;
    }
    if (!isAction) continue;
    const stamp = Number(doneAt);
    const doneDay =
      doneAt && !Number.isNaN(stamp)
        ? sameLocalDayIso(new Date(stamp).toISOString(), now)
        : sameLocalDayIso(t.updatedAt, now);
    if (doneDay) out.doneToday.push({ id: t.id, body });
  }
  out.doneToday.sort((a, b) => {
    const at = Number(tagsOf(todos.find((t) => t.id === a.id)?.body ?? "").doneAt);
    const bt = Number(tagsOf(todos.find((t) => t.id === b.id)?.body ?? "").doneAt);
    return (Number.isNaN(at) ? 0 : at) - (Number.isNaN(bt) ? 0 : bt);
  });
  return {
    open: out.open.slice(0, 8),
    delayed: out.delayed.slice(0, 5),
    doneToday: out.doneToday.slice(0, 6),
  };
}
