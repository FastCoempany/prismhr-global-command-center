// The faces' read layer — one fetch, four parsed stores per account, and the
// pure derivations the rooms share. Everything here obeys the Ted doctrine:
// these reads MERGE with the first record at the call site by latest, never
// replace it, and no face recomputes what the run already verified. The
// heavy staging slices are NOT loaded here — they are the evidence store the
// drill route reads one account at a time (the covenant's import guard).

import { getPrisma } from "@/lib/db";
import type { Gem } from "./stores";
import {
  ACTIVITY_NS,
  GEMS_NS,
  INTENT_NS,
  SUPPORT_NS,
  STAGE_NS,
  parseGemsBody,
  parseIntentBody,
  parseRollupBody,
  parseStageBody,
  parseSupportBody,
} from "./stores";
import type { StagedRow } from "./types";
import type { Rollup, SupportTheme, IntentWindows } from "./rollup";

export type SecondRecord = {
  rollup: Rollup | null;
  gems: Gem[];
  support: {
    dropSha: string;
    total: number;
    spike: { day: string; n: number } | null;
    themes: SupportTheme[];
  } | null;
  intent: { dropSha: string; windows: IntentWindows; receipts: number } | null;
};

const empty = (): SecondRecord => ({
  rollup: null,
  gems: [],
  support: null,
  intent: null,
});

/** One query for the whole book's second record. Stage slices and the
 *  manifest never load here — a face that wants row bodies goes through the
 *  evidence route, one account at a time. */
export async function fetchSecondRecords(): Promise<Map<string, SecondRecord>> {
  const out = new Map<string, SecondRecord>();
  const prisma = getPrisma();
  const rows = await prisma.accountNote.findMany({
    where: {
      OR: [ACTIVITY_NS, GEMS_NS, SUPPORT_NS, INTENT_NS].map((ns) => ({
        accountId: { startsWith: ns },
      })),
    },
    orderBy: { createdAt: "desc" },
    select: { accountId: true, body: true },
  });
  const at = (id: string): SecondRecord => {
    const cur = out.get(id) ?? empty();
    out.set(id, cur);
    return cur;
  };
  for (const r of rows) {
    // STAGE_NS ("activity:stage:") shares the ACTIVITY_NS prefix — skip it
    // and the manifest before splitting.
    if (r.accountId.startsWith(STAGE_NS) || r.accountId === "activity:manifest") continue;
    if (r.accountId.startsWith(GEMS_NS)) {
      const sr = at(r.accountId.slice(GEMS_NS.length));
      if (sr.gems.length === 0) sr.gems = parseGemsBody(r.body);
    } else if (r.accountId.startsWith(SUPPORT_NS)) {
      const sr = at(r.accountId.slice(SUPPORT_NS.length));
      sr.support ??= parseSupportBody(r.body);
    } else if (r.accountId.startsWith(INTENT_NS)) {
      const sr = at(r.accountId.slice(INTENT_NS.length));
      sr.intent ??= parseIntentBody(r.body);
    } else if (r.accountId.startsWith(ACTIVITY_NS)) {
      const sr = at(r.accountId.slice(ACTIVITY_NS.length));
      sr.rollup ??= parseRollupBody(r.body);
    }
  }
  return out;
}

/** One account's staged rows — the evidence store, read one account at a
 *  time (the covenant: only the drill and the prep read bodies). */
export async function fetchStageRows(accountId: string): Promise<StagedRow[]> {
  const prisma = getPrisma();
  const rows = await prisma.accountNote.findMany({
    where: { accountId: `${STAGE_NS}${accountId}` },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  if (rows.length === 0) return [];
  return parseStageBody(rows[0].body)?.slice.rows ?? [];
}

const DAY = 86_400_000;

const ageDays = (dayKey: string, now: Date): number | null => {
  if (!dayKey) return null;
  const t = Date.parse(`${dayKey.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(t)) return null;
  return (now.getTime() - t) / DAY;
};

// ── intent-warm (rule table: 84) ────────────────────────────────────────────
// Score = 3·clicks + 1·opens over 30 days, recency-decayed with a 10-day
// half-life anchored on the last open (the aggregate windows carry no per-day
// series; the last-open anchor is the decay the store can honestly support —
// §10 reserves the constants for founder tuning after live distribution).

export const INTENT_WARM_THRESHOLD = 6;
export const INTENT_HALF_LIFE_DAYS = 10;

export type IntentWarm = {
  score: number;
  opens30: number;
  clicks30: number;
  lastOpen: string;
};

export function intentWarm(sr: SecondRecord | undefined, now: Date): IntentWarm | null {
  const w = sr?.intent?.windows;
  if (!w) return null;
  const raw = 3 * w.w30.c + w.w30.o;
  if (raw <= 0) return null;
  const age = ageDays(w.lastOpen, now);
  const decay = age == null ? 0 : Math.pow(0.5, Math.max(0, age) / INTENT_HALF_LIFE_DAYS);
  const score = raw * decay;
  if (score < INTENT_WARM_THRESHOLD) return null;
  return { score, opens30: w.w30.o, clicks30: w.w30.c, lastOpen: w.lastOpen };
}

// ── verified cold (never-touched-incumbent's modifier) ──────────────────────
// Zero account-person motion on the second record across the whole window:
// no actor of kind "account" ever surfaced, and no notable thread was
// account-led. Machinery receipts don't warm; a colleague logging their own
// motion doesn't either — cold means THEY never spoke.

export function verifiedCold(sr: SecondRecord | undefined): boolean {
  const r = sr?.rollup;
  if (!r) return false;
  if (r.actors.some((a) => a.kind === "account")) return false;
  if (r.threads.some((t) => t.led === "account-led")) return false;
  if (r.lastHuman?.kind === "account") return false;
  return true;
}

// ── the org-wide answered check (silence-bump / cold-revival hardening) ─────
// The widest inbound the app holds: the rollup's LAST ORG INBOUND, as a
// sortable ISO-ish key. "" when the second record holds none.

export function orgInboundKey(sr: SecondRecord | undefined): string {
  const v = sr?.rollup?.lastOrgInbound ?? "";
  const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/.exec(v);
  if (!m) return "";
  return m[2] ? `${m[1]}T${m[2]}:00` : `${m[1]}T12:00:00`;
}

/** The colleague most likely holding that inbound — the rollup's last human
 *  when it names a colleague. "" when the record can't say who. */
export function orgInboundHolder(sr: SecondRecord | undefined): string {
  const lh = sr?.rollup?.lastHuman;
  return lh && lh.kind === "colleague" ? lh.who : "";
}

// ── the collision guard (a gate, not a rule) ────────────────────────────────
// A live marketing cadence (sends inside 7 days) or a colleague's thread
// inside 7 days flags the composed thing. Informs, never blocks (the direct
// doctrine). The 7-day send window rides the intent grammar's 7D row; slices
// staged before that row existed read as no-cadence rather than guessing.

export type Collision = {
  mktgSends7: number;
  colleague: { who: string; day: string } | null;
};

export function collisionFor(sr: SecondRecord | undefined, now: Date): Collision | null {
  const mktgSends7 = sr?.intent?.windows.w7?.s ?? 0;
  let colleague: Collision["colleague"] = null;
  const lh = sr?.rollup?.lastHuman;
  if (lh && lh.kind === "colleague") {
    const age = ageDays(lh.day, now);
    if (age != null && age <= 7) colleague = { who: lh.who, day: lh.day };
  }
  if (mktgSends7 <= 0 && !colleague) return null;
  return { mktgSends7, colleague };
}

// ── engaged-never-introduced (rule table: 78) ───────────────────────────────
// Heavy support traffic, still warm, on an account nobody ever pitched.

export const ENI_MIN_CASES = 8;
export const ENI_FRESH_DAYS = 60;

export function engagedNeverIntroduced(
  sr: SecondRecord | undefined,
  now: Date,
): { cases: number; lastDay: string } | null {
  const s = sr?.support;
  if (!s || s.total < ENI_MIN_CASES) return null;
  const lastDay = s.themes.reduce((max, t) => (t.lastDay > max ? t.lastDay : max), "");
  const age = ageDays(lastDay, now);
  if (age == null || age > ENI_FRESH_DAYS) return null;
  return { cases: s.total, lastDay };
}

// ── gems as queue evidence ──────────────────────────────────────────────────
// A verified, un-acted gem whose act points at account people (outreach, not
// coordination) is wire-class evidence. The queue never renders a gem the
// harness didn't verify — these parsed from gems: notes ARE the survivors.

export function outreachGem(sr: SecondRecord | undefined): Gem | null {
  for (const g of sr?.gems ?? []) {
    if (g.actedDay) continue;
    if (g.whoKind === "colleague") continue;
    if (!g.act) continue;
    return g;
  }
  return null;
}

/** The newest coordination gem — the THEIRS door's strongest line when no
 *  outreach gem leads. */
export function anyLiveGem(sr: SecondRecord | undefined): Gem | null {
  for (const g of sr?.gems ?? []) if (!g.actedDay) return g;
  return sr?.gems?.[0] ?? null;
}

// ── drop staleness (the Tallyfoot's quiet pressure line) ────────────────────

export const DROP_STALE_DAYS = 10;

export function dropAgeDays(srById: Map<string, SecondRecord>, now: Date): number | null {
  let newest = "";
  for (const sr of srById.values()) {
    const d = sr.rollup?.dropDay ?? "";
    if (d > newest) newest = d;
  }
  return ageDays(newest, now);
}
