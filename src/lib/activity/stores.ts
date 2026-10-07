// The Second Record's stores — namespaced AccountNote bodies, replaced
// forward per drop, never accreted. The text grammar IS the store: every
// renderer here has a parser, and the pair round-trips in tests, so a grammar
// change is a versioned change to both together.
//
// Values are sanitized on the way in ("·" and "|" are the grammar's own
// separators; newlines are line breaks), so a subject can never break a line
// it rides in.

import type { ActivityLane } from "./classify";
import type { IntentWindows, NotableThread, Rollup, SupportTheme } from "./rollup";
import type { AccountSlice, DropManifest } from "./types";

export const ACTIVITY_NS = "activity:";
export const GEMS_NS = "gems:";
export const SUPPORT_NS = "support:";
export const INTENT_NS = "intent:";
export const STAGE_NS = "activity:stage:";
/** A slice waits here until its drop's manifest verifies the whole upload;
 *  only then does it replace the slice under STAGE_NS (ruled 2026-09-25, D17:
 *  slices land in a pending drop, the manifest verifies the whole, then the
 *  drop swaps in, and a refused upload leaves the prior drop untouched). It
 *  sits under STAGE_NS on purpose: every read that keeps the heavy slices out
 *  of a page's query, the mirror's and the faces', already excludes that
 *  prefix, and the take-back's ACTIVITY_NS span clears it with the rest. */
export const STAGE_PENDING_NS = "activity:stage:pending:";
export const MANIFEST_ID = "activity:manifest";
/** The operator's acted stamps whose gems are not in the store right now
 *  (ruled 2026-09-25, D18: the acted stamp is the first record; it survives
 *  the take-back and re-attaches by gem key). Deliberately outside every
 *  SECOND_RECORD_SPANS prefix, so the take-back never reaches it. */
export const ACTED_NS = "acted:";

const ROLLUP_CAP = 4_000;
const GEMS_CAP = 2_600;
const SUPPORT_CAP = 2_400;
const INTENT_CAP = 1_200;

/** Every namespace the second record owns, and nothing else — the take-back's
 *  exact reach. ACTIVITY_NS deliberately covers the staged slices and the
 *  manifest too: all three share the prefix, and clearing the drop clears all
 *  three. Pinned by test against every other namespace in the app, because a
 *  prefix delete is only ever as safe as the prefixes it does not share. */
export const SECOND_RECORD_SPANS: { ns: string; label: string }[] = [
  { ns: ACTIVITY_NS, label: "rollups, staged rows and the manifest" },
  { ns: GEMS_NS, label: "gems" },
  { ns: SUPPORT_NS, label: "support themes" },
  { ns: INTENT_NS, label: "marketing tallies" },
];

/** activity:<id> holds the rollup — but activity:stage:<id> and
 *  activity:manifest live under the same prefix. This is the one test. */
export function isRollupNoteId(accountId: string): boolean {
  if (!accountId.startsWith(ACTIVITY_NS)) return false;
  const rest = accountId.slice(ACTIVITY_NS.length);
  return rest !== "" && rest !== "manifest" && !rest.includes(":");
}

/** Grammar-value sanitizer: the separators belong to the grammar. */
export const sv = (s: string): string =>
  (s ?? "").replace(/[·|]/g, "-").replace(/\s+/g, " ").trim();

const sha8 = (sha: string): string => (sha ?? "").slice(0, 8);

/** The grammar's placeholder for a slot the record cannot fill with a name. */
const NO_ONE = "—";

// ── the rollup grammar (activity:<id>) ──────────────────────────────────────

export function renderRollupBody(r: Rollup): string {
  const lines: string[] = [];
  lines.push(
    `⌗ ACTIVITY · drop ${sha8(r.dropSha)} · ${r.dropDay} · window ${r.window.from}→${r.window.to}`,
  );
  lines.push(
    `LANES · human ${r.lanes.human} · csm ${r.lanes.csm} · support ${r.lanes.support} · intent ${r.intent.s + r.intent.o + r.intent.c} (s ${r.intent.s} / o ${r.intent.o} / c ${r.intent.c}) · machinery ${r.lanes.machinery} · receipts ${r.receipts}`,
  );
  if (r.lastHuman)
    lines.push(
      // NO_ONE holds the slot when the row names nobody — a logged email files
      // under a mechanism, and the rollup blanks it rather than print it. An
      // empty slot would collapse the line past its own parser (2026-08-28).
      `LAST HUMAN · ${r.lastHuman.day} · ${sv(r.lastHuman.how)} · ${sv(r.lastHuman.who) || NO_ONE} (${r.lastHuman.kind}) · ${sv(r.lastHuman.subject)}`,
    );
  // The row's key rides on its own line, so a rollup written before it reads
  // exactly as it always has (S-17).
  if (r.lastHuman?.k) lines.push(`LAST HUMAN ROW · ${sv(r.lastHuman.k)}`);
  // Rows are the file's truth; emails are how many sends are behind them. The
  // line carries both only when they differ, so an account with no collapsed
  // repeats reads exactly as it always has.
  const em = r.emails ?? r.lanes;
  if (em.human !== r.lanes.human || em.csm !== r.lanes.csm)
    lines.push(`EMAILS · human ${em.human} · csm ${em.csm} · support ${em.support}`);
  if (r.lastOrgInbound) lines.push(`LAST ORG INBOUND · ${sv(r.lastOrgInbound)}`);
  // Their own word, attributed (D19) — absent when no row is.
  if (r.lastTheirs)
    lines.push(
      `LAST THEIRS · ${r.lastTheirs.day} · ${sv(r.lastTheirs.who)} · ${sv(r.lastTheirs.subject)}`,
    );
  for (const a of r.actors)
    lines.push(`ACTOR · ${a.lane} · ${sv(a.name)} (${a.kind}) ×${a.n}`);
  for (const t of r.threads)
    lines.push(
      `THREAD · ${t.firstDay}→${t.lastDay} · ${t.rows} rows · ${t.led} · ${sv(t.subject)}`,
    );
  if (r.verdict) lines.push(`VERDICT · ${sv(r.verdict)}`);
  return lines.join("\n").slice(0, ROLLUP_CAP);
}

export function parseRollupBody(body: string): Rollup | null {
  const lines = (body ?? "").split("\n");
  const head = /^⌗ ACTIVITY · drop (\S+) · (\S+) · window (\S+)→(\S+)$/.exec(
    lines[0] ?? "",
  );
  if (!head) return null;
  const out: Rollup = {
    dropSha: head[1],
    dropDay: head[2],
    window: { from: head[3], to: head[4] },
    lanes: { human: 0, csm: 0, support: 0, intent: 0, machinery: 0 },
    emails: { human: 0, csm: 0, support: 0, intent: 0, machinery: 0 },
    intent: { s: 0, o: 0, c: 0 },
    receipts: 0,
    lastHuman: null,
    lastOrgInbound: "",
    // A rollup written before the line existed reads null: nothing attributed,
    // nothing faked (D19).
    lastTheirs: null,
    actors: [],
    threads: [],
    verdict: "",
  };
  for (const line of lines.slice(1)) {
    let m: RegExpExecArray | null;
    if (
      (m =
        /^LANES · human (\d+) · csm (\d+) · support (\d+) · intent \d+ \(s (\d+) \/ o (\d+) \/ c (\d+)\) · machinery (\d+) · receipts (\d+)$/.exec(
          line,
        ))
    ) {
      out.lanes.human = Number(m[1]);
      out.lanes.csm = Number(m[2]);
      out.lanes.support = Number(m[3]);
      out.intent = { s: Number(m[4]), o: Number(m[5]), c: Number(m[6]) };
      out.lanes.machinery = Number(m[7]);
      out.receipts = Number(m[8]);
      out.lanes.intent = out.intent.s + out.intent.o + out.intent.c;
      // Absent EMAILS line = no collapse happened; emails equal rows.
      out.emails = { ...out.lanes };
    } else if ((m = /^EMAILS · human (\d+) · csm (\d+) · support (\d+)$/.exec(line))) {
      out.emails = {
        ...out.emails,
        human: Number(m[1]),
        csm: Number(m[2]),
        support: Number(m[3]),
      };
    } else if (
      (m = /^LAST HUMAN · (\S+) · ([^·]+) · (.+) \((\w+)\) · (.*)$/.exec(line))
    ) {
      out.lastHuman = {
        day: m[1],
        how: m[2].trim(),
        who: m[3].trim() === NO_ONE ? "" : m[3].trim(),
        kind: m[4],
        subject: m[5].trim(),
      };
    } else if ((m = /^LAST HUMAN ROW · (\S+)$/.exec(line))) {
      if (out.lastHuman) out.lastHuman.k = m[1];
    } else if ((m = /^LAST ORG INBOUND · (.+)$/.exec(line))) {
      out.lastOrgInbound = m[1].trim();
    } else if ((m = /^LAST THEIRS · (\S+) · ([^·]+) · (.*)$/.exec(line))) {
      out.lastTheirs = { day: m[1], who: m[2].trim(), subject: m[3].trim() };
    } else if ((m = /^ACTOR · (\w+) · (.+) \((\w+)\) ×(\d+)$/.exec(line))) {
      out.actors.push({
        lane: m[1] as ActivityLane,
        name: m[2].trim(),
        kind: m[3],
        n: Number(m[4]),
      });
    } else if (
      (m = /^THREAD · (\S+)→(\S+) · (\d+) rows · (account-led|internal) · (.*)$/.exec(
        line,
      ))
    ) {
      out.threads.push({
        firstDay: m[1],
        lastDay: m[2],
        rows: Number(m[3]),
        led: m[4] as NotableThread["led"],
        subject: m[5].trim(),
      });
    } else if ((m = /^VERDICT · (.+)$/.exec(line))) {
      out.verdict = m[1].trim();
    }
  }
  return out;
}

// ── the gem grammar (gems:<id>) ─────────────────────────────────────────────

export type GemCite = { k: string; day: string; who: string; subject: string };

export type Gem = {
  dropSha: string;
  verdict: "CONFIRMED";
  createdDay: string;
  /** "" = not acted; else the Chicago day the first record answered it. */
  actedDay: string;
  who: string[];
  whoKind: "colleague" | "account" | "mixed";
  term: string;
  what: string;
  whenDay: string;
  signal: string;
  act: string;
  reason: string;
  cites: GemCite[];
};

export function renderGemsBody(gems: Gem[]): string {
  const blocks = gems.slice(0, 3).map((g) => {
    const cite = g.cites
      .map((c) => `${c.k}|${c.day}|${sv(c.who)}|${sv(c.subject).slice(0, 60)}`)
      .join(" ;; ");
    return [
      `◆ GEM · drop ${sha8(g.dropSha)} · ${g.verdict} · created ${g.createdDay} · acted:${g.actedDay || "no"}`,
      `WHO · ${g.who.map(sv).join("; ")} · ${g.whoKind}`,
      `TERM · ${sv(g.term).toUpperCase()}`,
      `WHAT · ${sv(g.what).slice(0, 140)}`,
      `WHEN · ${g.whenDay}`,
      `SIGNAL · ${sv(g.signal).slice(0, 120)}`,
      `ACT · ${sv(g.act)}`,
      `WHY · ${sv(g.reason)}`,
      `CITE · ${cite}`,
    ].join("\n");
  });
  return blocks.join("\n\n").slice(0, GEMS_CAP);
}

export function parseGemsBody(body: string): Gem[] {
  const out: Gem[] = [];
  for (const block of (body ?? "").split(/\n\n+/)) {
    const lines = block.split("\n");
    const head = /^◆ GEM · drop (\S+) · CONFIRMED · created (\S+) · acted:(\S+)$/.exec(
      lines[0] ?? "",
    );
    if (!head) continue;
    const grab = (label: string): string => {
      const row = lines.find((l) => l.startsWith(`${label} · `));
      return row ? row.slice(label.length + 3).trim() : "";
    };
    const whoLine = grab("WHO");
    const wm = /^(.*) · (colleague|account|mixed)$/.exec(whoLine);
    const cites: GemCite[] = grab("CITE")
      .split(" ;; ")
      .map((e) => {
        const p = e.split("|");
        return p.length >= 4
          ? { k: p[0], day: p[1], who: p[2], subject: p.slice(3).join("|") }
          : null;
      })
      .filter((x): x is GemCite => x !== null);
    out.push({
      dropSha: head[1],
      verdict: "CONFIRMED",
      createdDay: head[2],
      actedDay: head[3] === "no" ? "" : head[3],
      who: (wm ? wm[1] : whoLine)
        .split("; ")
        .map((s) => s.trim())
        .filter(Boolean),
      whoKind: (wm ? wm[2] : "mixed") as Gem["whoKind"],
      term: grab("TERM"),
      what: grab("WHAT"),
      whenDay: grab("WHEN"),
      signal: grab("SIGNAL"),
      act: grab("ACT"),
      reason: grab("WHY"),
      cites,
    });
  }
  return out;
}

// ── the acted ledger (acted:<id>) — D18 ─────────────────────────────────────
// The hand stamp and the acted sweep write actedDay into the gems body, which
// is the second record's own span. Two things used to throw it away: the
// take-back, which deletes every gems note, and every drop that re-distilled
// the account, which wrote fresh gems with no stamp on them. The stamp is the
// operator's, the first record, so neither may lose it. Before a gems note is
// replaced or removed, its stamps are read out; a fresh gem with the same key
// takes its stamp back, and a stamp whose gem is not in this drop waits here
// for a later drop that finds it.

/** One acted stamp, held by the gem's key. */
export type ActedStamp = { key: string; day: string };

const normKey = (s: string): string =>
  sv(s)
    .toLowerCase()
    .replace(/[^a-z0-9@.' -]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** The gem key: its term and its people, normalized and order-free. The hand
 *  stamp finds a gem by its term within the account (src/app/accounts/
 *  act-actions.ts); the people ride with it so a later gem that happens to
 *  reuse a term about someone else is a different gem. */
export function gemKey(g: Pick<Gem, "term" | "who">): string {
  const who = g.who.map(normKey).filter(Boolean).sort().join("; ");
  return `${normKey(g.term)} · ${who}`;
}

/** The stamps a gems body carries, keyed. */
export function actedStampsOf(gems: readonly Gem[]): ActedStamp[] {
  return gems.filter((g) => g.actedDay).map((g) => ({ key: gemKey(g), day: g.actedDay }));
}

export function renderActedBody(stamps: readonly ActedStamp[]): string {
  return stamps.map((s) => `✓ ACTED · ${s.day} · ${s.key}`).join("\n");
}

export function parseActedBody(body: string): ActedStamp[] {
  const out: ActedStamp[] = [];
  for (const line of (body ?? "").split("\n")) {
    const m = /^✓ ACTED · (\d{4}-\d{2}-\d{2}) · (.+)$/.exec(line.trim());
    if (m) out.push({ key: m[2].trim(), day: m[1] });
  }
  return out;
}

/** Stamp lists merged, one stamp per key; an earlier list wins a key. */
export function mergeActedStamps(
  ...lists: readonly (readonly ActedStamp[])[]
): ActedStamp[] {
  const out = new Map<string, ActedStamp>();
  for (const list of lists) for (const s of list) if (!out.has(s.key)) out.set(s.key, s);
  return [...out.values()];
}

/** Re-attach stamps to fresh gems by key (D18). A stamp re-attaches only when
 *  the gem it lands on carries no newer evidence than the stamp: a gem whose
 *  newest cited day is after the day the operator acted is new motion, and
 *  the old stamp does not answer it. Earlier stamps in the list win a key, so
 *  the caller puts the gems body it is replacing ahead of the ledger. Returns
 *  the gems, stamped, and every stamp that found no gem, to keep. */
export function reattachActed(
  gems: readonly Gem[],
  stamps: readonly ActedStamp[],
): { gems: Gem[]; left: ActedStamp[] } {
  const byKey = new Map(mergeActedStamps(stamps).map((s) => [s.key, s]));
  const used = new Set<string>();
  const out = gems.map((g) => {
    const key = gemKey(g);
    const s = byKey.get(key);
    if (!s) return g;
    used.add(key);
    if (g.actedDay) return g;
    if (g.whenDay && g.whenDay > s.day) return g;
    return { ...g, actedDay: s.day };
  });
  const left = [...byKey.values()].filter((s) => !used.has(s.key));
  return { gems: out, left };
}

// ── the support grammar (support:<id>) ──────────────────────────────────────

export function renderSupportBody(inp: {
  dropSha: string;
  total: number;
  spike: { day: string; n: number } | null;
  themes: SupportTheme[];
}): string {
  const lines = [
    `⌗ SUPPORT · drop ${sha8(inp.dropSha)} · ${inp.total} cases in window${
      inp.spike ? ` · spike ${inp.spike.day} (${inp.spike.n} in a day)` : ""
    }`,
    ...inp.themes.map(
      (t) =>
        `THEME · ${t.n} · ${t.firstDay}→${t.lastDay} · ${sv(t.label)} · e.g. ${t.examples.map(sv).join(" ;; ")}`,
    ),
  ];
  return lines.join("\n").slice(0, SUPPORT_CAP);
}

export function parseSupportBody(body: string): {
  dropSha: string;
  total: number;
  spike: { day: string; n: number } | null;
  themes: SupportTheme[];
} | null {
  const lines = (body ?? "").split("\n");
  const head =
    /^⌗ SUPPORT · drop (\S+) · (\d+) cases in window(?: · spike (\S+) \((\d+) in a day\))?$/.exec(
      lines[0] ?? "",
    );
  if (!head) return null;
  const themes: SupportTheme[] = [];
  for (const line of lines.slice(1)) {
    const m = /^THEME · (\d+) · (\S+)→(\S+) · (.+) · e\.g\. (.*)$/.exec(line);
    if (!m) continue;
    themes.push({
      n: Number(m[1]),
      firstDay: m[2],
      lastDay: m[3],
      label: m[4].trim(),
      examples: m[5]
        .split(" ;; ")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }
  return {
    dropSha: head[1],
    total: Number(head[2]),
    spike: head[3] ? { day: head[3], n: Number(head[4]) } : null,
    themes,
  };
}

// ── the intent grammar (intent:<id>) ────────────────────────────────────────

export function renderIntentBody(inp: {
  dropSha: string;
  windows: IntentWindows;
  receipts: number;
}): string {
  const w = inp.windows;
  const row = (label: string, x: { s: number; o: number; c: number }) =>
    `${label} · sent ${x.s} · opened ${x.o} · clicked ${x.c}`;
  const lines = [
    `⌗ INTENT · drop ${sha8(inp.dropSha)} · last open ${w.lastOpen || "never"}`,
    row("7D", w.w7),
    row("30D", w.w30),
    row("60D", w.w60),
    row("90D", w.w90),
    ...w.top.map(
      (t) => `TOP · o ${t.o} · c ${t.c} · last ${t.last || "-"} · ${sv(t.campaign)}`,
    ),
  ];
  if (inp.receipts > 0)
    lines.push(
      `RECEIPTS · ${inp.receipts} engagement receipts (Seismic, forms, automated sends)`,
    );
  return lines.join("\n").slice(0, INTENT_CAP);
}

export function parseIntentBody(body: string): {
  dropSha: string;
  windows: IntentWindows;
  receipts: number;
} | null {
  const lines = (body ?? "").split("\n");
  const head = /^⌗ INTENT · drop (\S+) · last open (\S+)$/.exec(lines[0] ?? "");
  if (!head) return null;
  const zero = () => ({ s: 0, o: 0, c: 0 });
  const out = {
    dropSha: head[1],
    windows: {
      w7: zero(),
      w30: zero(),
      w60: zero(),
      w90: zero(),
      lastOpen: head[2] === "never" ? "" : head[2],
      top: [] as IntentWindows["top"],
    },
    receipts: 0,
  };
  for (const line of lines.slice(1)) {
    let m: RegExpExecArray | null;
    if (
      (m = /^(7D|30D|60D|90D) · sent (\d+) · opened (\d+) · clicked (\d+)$/.exec(line))
    ) {
      const w =
        m[1] === "7D"
          ? out.windows.w7
          : m[1] === "30D"
            ? out.windows.w30
            : m[1] === "60D"
              ? out.windows.w60
              : out.windows.w90;
      w.s = Number(m[2]);
      w.o = Number(m[3]);
      w.c = Number(m[4]);
    } else if ((m = /^TOP · o (\d+) · c (\d+) · last (\S+) · (.*)$/.exec(line))) {
      out.windows.top.push({
        o: Number(m[1]),
        c: Number(m[2]),
        last: m[3] === "-" ? "" : m[3],
        campaign: m[4].trim(),
      });
    } else if ((m = /^RECEIPTS · (\d+) /.exec(line))) {
      out.receipts = Number(m[1]);
    }
  }
  return out;
}

// ── staging and the manifest (data, not grammar — a JSON body) ─────────────
// These two stores are JSON whole, with the human head as the first field,
// because they go through the one writer with `structured: true` (P4; slice
// 17): the redaction then reads string values only, and a row key, a
// checksum, a count or a numeric array is never mistaken for a figure. They
// used to ride as a text head over a ⟪act⟫-marked block, which no JSON parse
// could see through — a body redacted as text was one comma-grouped array
// away from a manifest that no longer parsed. Rows staged before this slice
// still carry the block, and the parsers read both.

const BLOCK_RE = /⟪act⟫([\s\S]*?)⟪\/act⟫/;

/** The JSON a stored body holds: the body itself when it is JSON whole, else
 *  the legacy marked block, else nothing. */
function storedJson<T>(body: string): T | null {
  const text = body ?? "";
  try {
    if (text.startsWith("{")) return JSON.parse(text) as T;
  } catch {
    // not JSON whole — the legacy block below
  }
  const m = BLOCK_RE.exec(text);
  if (!m) return null;
  try {
    return JSON.parse(m[1]) as T;
  } catch {
    return null;
  }
}

export function renderStageBody(slice: AccountSlice, dropSha: string): string {
  return JSON.stringify({
    head: `⌗ STAGE · drop ${sha8(dropSha)} · ${sv(slice.name)} · rows ${slice.rows.length} · dropped ${slice.dropped}`,
    dropSha,
    slice,
  });
}

export function parseStageBody(
  body: string,
): { dropSha: string; slice: AccountSlice } | null {
  const raw = storedJson<{ dropSha?: string; slice?: AccountSlice }>(body);
  if (!raw?.dropSha || !raw.slice?.id) return null;
  return { dropSha: raw.dropSha, slice: raw.slice };
}

/** The run's book-keeping, stored beside the manifest: what still waits,
 *  what the run concluded, and the receipt the operator reads. */
type RunState = {
  phase: "staging" | "ready" | "running" | "done" | "failed-coverage" | "refused";
  /** Account ids whose rows changed — need rollups + distillation. */
  distillQueue: string[];
  /** Account ids whose tally alone changed — arithmetic update, no model. */
  intentQueue: string[];
  /** Accounts covered so far this run: id → "gems" | "verdict" | "held"
   *  ("held" = the distiller was down; arithmetic covered, gems owed a
   *  re-judge on the next drop with the key back). */
  covered: Record<string, string>;
  /** Accounts that got their one re-distillation already. */
  retried: string[];
  /** Gem-candidate mortality this run: born vs died in refutation. */
  born: number;
  died: number;
  receipt: string[];
  /** The batches that actually arrived, for completeness verification. */
  batchesSeen: number[];
  startedAt: string;
  finishedAt: string;
};

export function emptyRunState(): RunState {
  return {
    phase: "staging",
    distillQueue: [],
    intentQueue: [],
    covered: {},
    retried: [],
    born: 0,
    died: 0,
    receipt: [],
    batchesSeen: [],
    startedAt: "",
    finishedAt: "",
  };
}

export type ManifestStore = {
  manifest: DropManifest;
  run: RunState;
  /** The prior drop's per-account sums + lane totals — change detection and
   *  lane-drift live off this, never off a re-read of old files. */
  prior: {
    dropSha: string;
    laneTotals: Record<ActivityLane, number>;
    accounts: { id: string; rowsSum: string; tallySum: string }[];
  } | null;
};

export function renderManifestBody(store: ManifestStore): string {
  const m = store.manifest;
  return JSON.stringify({
    head: `⌗ MANIFEST · drop ${sha8(m.dropSha)} · ${m.dropDay} · rows ${m.rowCount} · accounts ${m.accounts.length} · ${store.run.phase}`,
    manifest: store.manifest,
    run: store.run,
    prior: store.prior,
  });
}

export function parseManifestBody(body: string): ManifestStore | null {
  const raw = storedJson<Partial<ManifestStore>>(body);
  if (!raw?.manifest?.dropSha || !raw.run) return null;
  // The head is the body's label, not the store's: it is left behind here.
  return { manifest: raw.manifest, run: raw.run, prior: raw.prior ?? null };
}
