// The rollup builder — pure arithmetic and verbatim quotation over a staged
// slice, NO model call, because the rollup feeds counts the operator will
// quote out loud (the covenant, §7): every number rendered anywhere in the
// app traces back to this file's arithmetic, never to generated text.

import type { ActivityLane } from "./classify";
import { stripThreadTokens } from "./parse";
import type { AccountSlice, StagedRow } from "./types";

export type ActorTally = { name: string; kind: string; lane: ActivityLane; n: number };

export type NotableThread = {
  subject: string; // rendered (thread tokens stripped)
  firstDay: string;
  lastDay: string;
  rows: number;
  /** "account-led" when an account person appears in it; else "internal". */
  led: "account-led" | "internal";
};

export type Rollup = {
  dropSha: string;
  dropDay: string;
  window: { from: string; to: string };
  lanes: Record<ActivityLane, number>;
  intent: { s: number; o: number; c: number };
  receipts: number;
  lastHuman: {
    day: string;
    how: string;
    who: string;
    kind: string;
    subject: string;
  } | null;
  /** The account's newest org-wide inbound (Last Email Received) — a
   *  calendar/datetime fact from the export's account-level column. */
  lastOrgInbound: string;
  actors: ActorTally[];
  threads: NotableThread[];
  /** Present only when no gems survived — the arithmetic honesty line. */
  verdict: string;
};

/** A row is human MOTION only when its lane says human/csm AND it is not an
 *  engagement receipt and not an automated sequence send. */
export function isHumanMotion(r: StagedRow): boolean {
  return (
    (r.lane === "human" || r.lane === "csm") && !r.fl.includes("r") && !r.fl.includes("a")
  );
}

const HOW_WORD = (r: StagedRow): string => {
  if (r.ct) return "call";
  if (r.fl.includes("e")) return "event";
  if (r.sub === "Email") return "email";
  return "task";
};

/** Find which known names a row's text mentions. Whole-word, case-sensitive
 *  on the capitalized form — deterministic, no fuzzy guessing. */
export function namesInRow(r: StagedRow, names: Iterable<string>): string[] {
  const hay = `${r.s}\n${r.c ?? ""}`;
  const out: string[] = [];
  for (const n of names) {
    const t = (n ?? "").trim();
    if (t.length < 5 || !t.includes(" ")) continue; // two-word names only
    const esc = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(?<![A-Za-z])${esc}(?![A-Za-z])`).test(hay)) out.push(t);
  }
  return out;
}

const normSubject = (s: string): string =>
  stripThreadTokens(s)
    .replace(/^((re|fwd?|fw)\s*:\s*)+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export function buildRollup(inp: {
  slice: AccountSlice;
  dropSha: string;
  dropDay: string;
  window: { from: string; to: string };
  colleagues: Set<string>;
  accountPeople: Set<string>;
}): Rollup {
  const { slice } = inp;
  const rows = slice.rows;

  // Intent totals from the tally — arithmetic over what the browser counted.
  let s = 0,
    o = 0,
    c = 0;
  for (const d of Object.values(slice.tally.days)) {
    s += d.s;
    o += d.o;
    c += d.c;
  }

  // Last human motion — newest row that is genuinely a person moving.
  const motion = rows.filter(isHumanMotion).sort((x, y) => (x.d < y.d ? 1 : -1));
  let lastHuman: Rollup["lastHuman"] = null;
  if (motion.length > 0) {
    const r = motion[0];
    const accountNames = namesInRow(r, inp.accountPeople);
    const who = accountNames[0] ?? r.a;
    const kind = accountNames[0]
      ? "account"
      : inp.colleagues.has(r.a)
        ? "colleague"
        : "unresolved";
    lastHuman = {
      day: r.d,
      how: HOW_WORD(r),
      who,
      kind,
      subject: stripThreadTokens(r.s).slice(0, 90),
    };
  }

  // Actors: resolved people counted across non-receipt rows, top six.
  const tally = new Map<string, ActorTally>();
  for (const r of rows) {
    if (r.lane === "machinery" || r.fl.includes("r")) continue;
    const seen = new Set<string>();
    for (const name of namesInRow(r, inp.accountPeople)) {
      if (seen.has(name)) continue;
      seen.add(name);
      const key = `${name}|account`;
      const t = tally.get(key) ?? { name, kind: "account", lane: r.lane, n: 0 };
      t.n += 1;
      tally.set(key, t);
    }
    const a = (r.a ?? "").trim();
    if (a && inp.colleagues.has(a) && !seen.has(a)) {
      const key = `${a}|colleague`;
      const t = tally.get(key) ?? { name: a, kind: "colleague", lane: r.lane, n: 0 };
      t.n += 1;
      tally.set(key, t);
    }
  }
  const actors = [...tally.values()].sort((x, y) => y.n - x.n).slice(0, 6);

  // Notable threads: human/csm non-receipt rows grouped by normalized subject.
  const groups = new Map<string, { rows: StagedRow[]; subject: string }>();
  for (const r of rows) {
    if (r.lane !== "human" && r.lane !== "csm") continue;
    if (r.fl.includes("r")) continue;
    const key = normSubject(r.s);
    if (!key) continue;
    const g = groups.get(key) ?? { rows: [], subject: stripThreadTokens(r.s) };
    g.rows.push(r);
    groups.set(key, g);
  }
  const threads: NotableThread[] = [...groups.values()]
    .map((g) => {
      const days = g.rows.map((r) => r.d).sort();
      const led = g.rows.some((r) => namesInRow(r, inp.accountPeople).length > 0)
        ? ("account-led" as const)
        : ("internal" as const);
      return {
        subject: g.subject.slice(0, 90),
        firstDay: days[0],
        lastDay: days[days.length - 1],
        rows: g.rows.length,
        led,
      };
    })
    .sort((x, y) => {
      if (x.lastDay !== y.lastDay) return x.lastDay < y.lastDay ? 1 : -1;
      if (x.rows !== y.rows) return y.rows - x.rows;
      return x.led === "account-led" ? -1 : 1;
    })
    .slice(0, 6);

  return {
    dropSha: inp.dropSha,
    dropDay: inp.dropDay,
    window: inp.window,
    lanes: slice.laneCounts,
    intent: { s, o, c },
    receipts: slice.tally.receipts,
    lastHuman,
    lastOrgInbound: slice.meta.lastEmailReceivedKey,
    actors,
    threads,
    verdict: "",
  };
}

/** The honesty line for an account with no surviving gems — arithmetic
 *  sentences from the rollup, never model text (§3.7). */
export function verdictLine(r: Rollup): string {
  const human = r.lanes.human + r.lanes.csm;
  const blasts = r.intent.s + r.intent.o + r.intent.c;
  if (human === 0 && r.lanes.support === 0 && blasts > 0)
    return `machinery only — ${blasts} blast receipts, no human motion`;
  if (human === 0 && r.lanes.support > 0)
    return `support traffic only — ${r.lanes.support} case rows, no sales motion`;
  if (human === 0 && blasts === 0) return `no motion at all in the window`;
  if (!r.lastHuman) return `logging only — ${human} rows, none a person moving`;
  return `${human} human rows, latest ${r.lastHuman.day} — nothing actionable beyond the record's own read`;
}

// ── intent windows (the intent:<id> store's arithmetic) ─────────────────────

export type IntentWindows = {
  w30: { s: number; o: number; c: number };
  w60: { s: number; o: number; c: number };
  w90: { s: number; o: number; c: number };
  lastOpen: string;
  top: { campaign: string; o: number; c: number; last: string }[];
};

// ── support themes (the support:<id> store's arithmetic) ────────────────────
// No model: the theme label is the case subject with its machinery stripped —
// the case-number token, the reply prefixes, the thread tokens. Counts,
// dates, and examples are arithmetic; the spike is the busiest single day.

export type SupportTheme = {
  label: string;
  n: number;
  firstDay: string;
  lastDay: string;
  examples: string[]; // ≤4 rendered subjects
};

const themeLabelOf = (subject: string): string =>
  stripThreadTokens(subject)
    .replace(/^\s*Email:\s*/i, "")
    .replace(/^((re|fwd?|fw)\s*:\s*)+/i, "")
    .replace(/PrismHR Case\s*#?\d+\s*:?\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 70);

export function supportThemes(rows: StagedRow[]): {
  themes: SupportTheme[];
  total: number;
  spike: { day: string; n: number } | null;
} {
  const support = rows.filter((r) => r.lane === "support");
  const byLabel = new Map<string, { rows: StagedRow[] }>();
  const byDay = new Map<string, number>();
  for (const r of support) {
    byDay.set(r.d, (byDay.get(r.d) ?? 0) + 1);
    const label = themeLabelOf(r.s) || "untitled case traffic";
    const g = byLabel.get(label.toLowerCase()) ?? { rows: [] };
    g.rows.push(r);
    byLabel.set(label.toLowerCase(), g);
  }
  const themes: SupportTheme[] = [...byLabel.values()]
    .map((g) => {
      const days = g.rows.map((r) => r.d).sort();
      return {
        label: themeLabelOf(g.rows[0].s) || "untitled case traffic",
        n: g.rows.length,
        firstDay: days[0],
        lastDay: days[days.length - 1],
        examples: [
          ...new Set(g.rows.map((r) => stripThreadTokens(r.s).slice(0, 70))),
        ].slice(0, 4),
      };
    })
    .sort((a, b) => b.n - a.n || (a.lastDay < b.lastDay ? 1 : -1))
    .slice(0, 8);
  let spike: { day: string; n: number } | null = null;
  for (const [day, n] of byDay)
    if (!spike || n > spike.n || (n === spike.n && day > spike.day)) spike = { day, n };
  if (spike && spike.n < 3) spike = null; // one or two in a day is not a spike
  return { themes, total: support.length, spike };
}

export function intentWindows(
  tally: AccountSlice["tally"],
  todayKey: string,
): IntentWindows {
  const dayMs = 24 * 3600 * 1000;
  const t0 = Date.parse(`${todayKey}T00:00:00Z`);
  const zero = () => ({ s: 0, o: 0, c: 0 });
  const out: IntentWindows = {
    w30: zero(),
    w60: zero(),
    w90: zero(),
    lastOpen: "",
    top: [],
  };
  for (const [day, n] of Object.entries(tally.days)) {
    const t = Date.parse(`${day}T00:00:00Z`);
    if (Number.isNaN(t)) continue;
    const age = Math.floor((t0 - t) / dayMs);
    for (const [w, span] of [
      [out.w30, 30],
      [out.w60, 60],
      [out.w90, 90],
    ] as const) {
      if (age <= span) {
        w.s += n.s;
        w.o += n.o;
        w.c += n.c;
      }
    }
    if (n.o > 0 && day > out.lastOpen) out.lastOpen = day;
  }
  out.top = Object.entries(tally.camps)
    .map(([campaign, n]) => ({ campaign, o: n.o, c: n.c, last: n.lastOpen }))
    .filter((x) => x.o > 0 || x.c > 0)
    .sort((a, b) => b.o - a.o || b.c - a.c)
    .slice(0, 4);
  return out;
}
