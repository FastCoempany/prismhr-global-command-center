// Account binding for the Operating Room's per-row composers. Every entry
// point (log box, paste pane, close button) is pre-bound to ONE account; these
// guards make that binding tamper-proof: an id must exist in the book, bodies
// are sanitized before storage, and nothing typed inside a note can re-route
// it. Pure — adversarially tested.

import { redactMoney } from "@/lib/intel/lexicon";
import { chicagoDay } from "@/lib/intranet/ledger";

export type KnownAccount = { id: string; name: string };

// The day's move, closed. Keyed by account AND the operator's own day, so the
// mark expires overnight on its own: tomorrow the read asks again, and a move
// left unworked comes back saying so. Namespaced like every other marker the
// app keeps in AccountDisposition (pastehash:, gap-dismiss:, done-filed:), so
// it costs no migration and never collides with a real account id.
export function moveDoneKey(accountId: string, now: Date = new Date()): string {
  return `move-done:${accountId}:${chicagoDay(now.toISOString())}`.slice(0, 191);
}

// Resolve a submitted account id against the book. Unknown, empty, padded,
// or look-alike ids are rejected — a row can only ever file to itself.
export function bindAccountId(
  raw: unknown,
  accounts: KnownAccount[],
): KnownAccount | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  if (!id || id.length > 40) return null;
  return accounts.find((a) => a.id === id) ?? null;
}

// Sanitize a typed log entry before it becomes an AccountNote body: money
// redacted, control characters stripped, whitespace collapsed at the edges,
// hard length cap. The text is DATA — nothing inside it (ids, "accountId:",
// glyph prefixes) changes where it files.
export function cleanLogBody(raw: unknown, cap = 2000): string {
  if (typeof raw !== "string") return "";
  const stripped = raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .trim();
  if (!stripped) return "";
  return redactMoney(stripped).slice(0, cap);
}

// --- The composer's grammar --------------------------------------------------
// The day sheet's capture language, per account: plain text is a note; a
// leading "▢ " (or "[] ") makes it an open action; "⏲ wed …" schedules one.
// Pure; the caller turns remindDay into a timestamp with nextRemindIso.

export type LogParse =
  | { kind: "note"; body: string }
  | { kind: "action"; body: string }
  | { kind: "scheduled"; body: string; remindDay: RemindDay };

export type RemindDay =
  | "today"
  | "tomorrow"
  | "mon"
  | "tue"
  | "wed"
  | "thu"
  | "fri"
  | "sat"
  | "sun";

const DAY_TOKENS: Record<string, RemindDay> = {
  today: "today",
  tomorrow: "tomorrow",
  tmrw: "tomorrow",
  mon: "mon",
  monday: "mon",
  tue: "tue",
  tues: "tue",
  tuesday: "tue",
  wed: "wed",
  weds: "wed",
  wednesday: "wed",
  thu: "thu",
  thur: "thu",
  thurs: "thu",
  thursday: "thu",
  fri: "fri",
  friday: "fri",
  sat: "sat",
  saturday: "sat",
  sun: "sun",
  sunday: "sun",
};

export function parseLogInput(raw: unknown): LogParse | null {
  const text = cleanLogBody(raw);
  if (!text) return null;
  // a bare marker with nothing behind it files nothing
  if (/^(?:▢|\[\s?\]|⏲)\s*$/.test(text)) return null;
  const action = /^(?:▢|\[\s?\])\s+(.+)$/s.exec(text);
  if (action) {
    const body = action[1].trim();
    return body ? { kind: "action", body } : null;
  }
  const sched = /^⏲\s+(\S+)\s+(.+)$/s.exec(text);
  if (sched) {
    const day = DAY_TOKENS[sched[1].toLowerCase()];
    const body = sched[2].trim();
    if (day && body) return { kind: "scheduled", body, remindDay: day };
    // an unrecognized ⏲ token stays a note — never guess a date
    return { kind: "note", body: text };
  }
  return { kind: "note", body: text };
}

const DAY_INDEX: Record<Exclude<RemindDay, "today" | "tomorrow">, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

// The reminder instant: 9am Chicago on the named day — today/tomorrow literal,
// weekdays roll to the NEXT such day (never today).
export function nextRemindIso(day: RemindDay, now: Date): string {
  const chicagoNow = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Chicago" }),
  );
  const target = new Date(chicagoNow);
  if (day === "today") {
    // as-is
  } else if (day === "tomorrow") {
    target.setDate(target.getDate() + 1);
  } else {
    const want = DAY_INDEX[day];
    let delta = (want - chicagoNow.getDay() + 7) % 7;
    if (delta === 0) delta = 7;
    target.setDate(target.getDate() + delta);
  }
  target.setHours(9, 0, 0, 0);
  // rebuild as an absolute instant: Chicago wall time ≈ UTC-5/6; store the wall
  // date at 14:00Z (covers CDT/CST within the hour either way — reminders are
  // day-granular in the UI)
  const iso = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}T14:00:00.000Z`;
  return iso;
}
