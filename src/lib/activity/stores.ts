// The Second Record's stores — namespaced AccountNote bodies, replaced
// forward per drop, never accreted. The text grammar IS the store: every
// renderer here has a parser, and the pair round-trips in tests, so a grammar
// change is a versioned change to both together (Appendix A).
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
export const MANIFEST_ID = "activity:manifest";

export const ROLLUP_CAP = 4_000;
export const GEMS_CAP = 2_600;
export const SUPPORT_CAP = 2_400;
export const INTENT_CAP = 1_200;

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
export const NO_ONE = "—";

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
  if (r.lastOrgInbound) lines.push(`LAST ORG INBOUND · ${sv(r.lastOrgInbound)}`);
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
    intent: { s: 0, o: 0, c: 0 },
    receipts: 0,
    lastHuman: null,
    lastOrgInbound: "",
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
    } else if ((m = /^LAST ORG INBOUND · (.+)$/.exec(line))) {
      out.lastOrgInbound = m[1].trim();
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

// ── staging and the manifest (data, not grammar — JSON in a marked block) ───

const BLOCK_RE = /⟪act⟫([\s\S]*?)⟪\/act⟫/;

export function renderStageBody(slice: AccountSlice, dropSha: string): string {
  return `⌗ STAGE · drop ${sha8(dropSha)} · ${sv(slice.name)} · rows ${slice.rows.length} · dropped ${slice.dropped}\n⟪act⟫${JSON.stringify({ dropSha, slice })}⟪/act⟫`;
}

export function parseStageBody(
  body: string,
): { dropSha: string; slice: AccountSlice } | null {
  const m = BLOCK_RE.exec(body ?? "");
  if (!m) return null;
  try {
    const raw = JSON.parse(m[1]) as { dropSha?: string; slice?: AccountSlice };
    if (!raw.dropSha || !raw.slice?.id) return null;
    return { dropSha: raw.dropSha, slice: raw.slice };
  } catch {
    return null;
  }
}

/** The run's book-keeping, stored beside the manifest: what still waits,
 *  what the run concluded, and the receipt the operator reads. */
export type RunState = {
  phase: "staging" | "ready" | "running" | "done" | "failed-coverage" | "refused";
  /** Account ids whose rows changed — need rollups + distillation. */
  distillQueue: string[];
  /** Account ids whose tally alone changed — arithmetic update, no model. */
  intentQueue: string[];
  /** Accounts covered so far this run: id → "gems" | "verdict" | "held"
   *  ("held" = the distiller was down; arithmetic covered, gems owed a
   *  re-judge on the next drop with the key back). */
  covered: Record<string, string>;
  /** Accounts that got their one re-distillation already (§3.7.2). */
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
  return `⌗ MANIFEST · drop ${sha8(m.dropSha)} · ${m.dropDay} · rows ${m.rowCount} · accounts ${m.accounts.length} · ${store.run.phase}\n⟪act⟫${JSON.stringify(store)}⟪/act⟫`;
}

export function parseManifestBody(body: string): ManifestStore | null {
  const m = BLOCK_RE.exec(body ?? "");
  if (!m) return null;
  try {
    const raw = JSON.parse(m[1]) as ManifestStore;
    if (!raw.manifest?.dropSha || !raw.run) return null;
    return raw;
  } catch {
    return null;
  }
}
