// The faces' read layer — one fetch, four parsed stores per account, and the
// pure derivations the rooms share. Everything here obeys the Ted doctrine:
// these reads MERGE with the first record at the call site by latest, never
// replace it, and no face recomputes what the run already verified. The
// heavy staging slices are NOT loaded here — they are the evidence store the
// drill route reads one account at a time (the covenant's import guard).

import { accountIdsOf, canonicalAccountId } from "@/lib/book/merge";
import { getPrisma } from "@/lib/db";
import { MINE_RE } from "@/lib/intel/provenance";
import type { Gem } from "./stores";
import {
  ACTIVITY_NS,
  GEMS_NS,
  INTENT_NS,
  MANIFEST_ID,
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

/** A stored row as the fold takes it: the key it was filed under and its body. */
export type StoredNote = { accountId: string; body: string };

// ── the fold by canonical id (E17) ──────────────────────────────────────────
// The stores key by the id they were filed under, and one company filed under
// two ids is one account to every surface (src/lib/book/merge.ts; the Ted
// doctrine: the two stores merge). So the raw tails fold here, once, before
// any face reads them: every key that resolves to an account is one of its
// parts, each namespace is taken from the freshest drop that holds it, and
// the account's own key is first among equals. This is the one spelling —
// the wide fetch, the one-account lookup and the narrow reads below all run
// through it, so no surface folds a second way.

type Part = { own: boolean; sr: SecondRecord };

const dropDayOf = (sr: SecondRecord): string =>
  sr.rollup?.dropDay ||
  sr.gems.reduce((m, g) => (g.createdDay > m ? g.createdDay : m), "") ||
  "";

/** The parts in the order the fold reads them: the freshest drop first, the
 *  account's own key before a duplicate's on the same day. */
function orderParts<P extends Part>(parts: readonly P[]): P[] {
  return [...parts].sort(
    (a, b) =>
      dropDayOf(b.sr).localeCompare(dropDayOf(a.sr)) || Number(b.own) - Number(a.own),
  );
}

/** The part a namespace is read from: the first, in fold order, that holds
 *  one. The gems note the hand stamp writes is found the same way, so what
 *  the operator stamps is what the face showed. */
export function pickPart<P extends Part>(
  parts: readonly P[],
  holds: (sr: SecondRecord) => boolean,
): P | null {
  return orderParts(parts).find((p) => holds(p.sr)) ?? null;
}

function foldParts(parts: readonly Part[]): SecondRecord | null {
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0].sr;
  return {
    rollup: pickPart(parts, (sr) => !!sr.rollup)?.sr.rollup ?? null,
    gems: pickPart(parts, (sr) => sr.gems.length > 0)?.sr.gems ?? [],
    support: pickPart(parts, (sr) => !!sr.support)?.sr.support ?? null,
    intent: pickPart(parts, (sr) => !!sr.intent)?.sr.intent ?? null,
  };
}

/** The four small stores, parsed from their rows and keyed by the raw tail —
 *  newest row per namespace per key, as the rows arrive newest first. */
function partsByRawId(rows: readonly StoredNote[]): Map<string, SecondRecord> {
  const out = new Map<string, SecondRecord>();
  const at = (id: string): SecondRecord => {
    const cur = out.get(id) ?? empty();
    out.set(id, cur);
    return cur;
  };
  for (const r of rows) {
    // STAGE_NS ("activity:stage:") shares the ACTIVITY_NS prefix — skip it
    // and the manifest before splitting.
    if (r.accountId.startsWith(STAGE_NS) || r.accountId === MANIFEST_ID) continue;
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

/** The whole second record from its stored rows, folded: the map's keys are
 *  canonical ids, and a drop staged under a shell id reads under the account
 *  it belongs to. Pure — the fetch below hands it the query's rows. */
export function foldSecondRecords(
  rows: readonly StoredNote[],
): Map<string, SecondRecord> {
  const raw = partsByRawId(rows);
  const grouped = new Map<string, Part[]>();
  for (const [key, sr] of raw) {
    const canonical = canonicalAccountId(key);
    const list = grouped.get(canonical) ?? [];
    list.push({ own: key === canonical, sr });
    grouped.set(canonical, list);
  }
  const out = new Map<string, SecondRecord>();
  for (const [canonical, parts] of grouped) {
    const folded = foldParts(parts);
    if (folded) out.set(canonical, folded);
  }
  return out;
}

/** One account's second record from a map by id, folded by canonical id —
 *  whether the map is the fetch's (already folded) or one keyed by raw
 *  tails: every id that resolves to the account is looked up and the parts
 *  fold here, so a caller never has to know which map it holds. Null when no
 *  drop touched the account under any id. */
export function secondRecordFor(
  byId: ReadonlyMap<string, SecondRecord>,
  accountId: string,
): SecondRecord | null {
  const canonical = canonicalAccountId(accountId);
  if (!canonical) return null;
  const parts: Part[] = [];
  for (const key of accountIdsOf(canonical)) {
    const sr = byId.get(key);
    if (sr) parts.push({ own: key === canonical, sr });
  }
  return foldParts(parts);
}

/** The where for the four small stores — never the staged slices, which
 *  share the activity: prefix but are ~120KB each and must never ride a
 *  page's query (caught 2026-08-21: every page load was hauling ~15MB of
 *  slice bodies just to skip them in the loop), and never the manifest. */
const smallStoresWhere = (ids?: readonly string[]) => ({
  OR: [ACTIVITY_NS, GEMS_NS, SUPPORT_NS, INTENT_NS].map((ns) =>
    ids
      ? { accountId: { in: ids.map((id) => `${ns}${id}`) } }
      : { accountId: { startsWith: ns } },
  ),
  NOT: [{ accountId: { startsWith: STAGE_NS } }, { accountId: MANIFEST_ID }],
});

/** One query for the whole book's second record, folded by canonical id.
 *  Stage slices and the manifest never load here — a face that wants row
 *  bodies goes through the evidence route, one account at a time. */
export async function fetchSecondRecords(): Promise<Map<string, SecondRecord>> {
  const prisma = getPrisma();
  const rows = await prisma.accountNote.findMany({
    where: smallStoresWhere(),
    orderBy: { createdAt: "desc" },
    select: { accountId: true, body: true },
  });
  return foldSecondRecords(rows);
}

/** One account's second record, read narrow — the four small stores under
 *  every id that folds into the account, through the same fold as the wide
 *  fetch. The evidence route reads it where it used to read one namespace by
 *  one key (pass 2 C's narrow-read defect). */
export async function fetchSecondRecordFor(
  accountId: string,
): Promise<SecondRecord | null> {
  const canonical = canonicalAccountId(accountId);
  if (!canonical) return null;
  const prisma = getPrisma();
  const rows = await prisma.accountNote.findMany({
    where: smallStoresWhere(accountIdsOf(canonical)),
    orderBy: { createdAt: "desc" },
    select: { accountId: true, body: true },
  });
  return foldSecondRecords(rows).get(canonical) ?? null;
}

/** The gems note the hand stamp writes to (src/app/accounts/act-actions.ts):
 *  of the gems notes under every id that folds into the account, the one the
 *  fold reads — so the operator stamps the gem the face showed, never a
 *  twin under the other key. Null when no gems note exists under any id. */
export async function fetchGemsNoteFor(
  accountId: string,
): Promise<{ id: string; gems: Gem[] } | null> {
  const canonical = canonicalAccountId(accountId);
  if (!canonical) return null;
  const prisma = getPrisma();
  // The same four stores the fold reads, so the parts here order exactly as
  // they did on the face: a part's drop day comes from its rollup when it has
  // one, and a gems-only read would have dated it from the gems instead.
  const rows = await prisma.accountNote.findMany({
    where: smallStoresWhere(accountIdsOf(canonical)),
    orderBy: { createdAt: "desc" },
    select: { id: true, accountId: true, body: true },
  });
  const byRawId = partsByRawId(rows);
  // The newest gems note per key, as the rows arrive newest first; replace
  // forward keeps one per key, and a stray behind it is not read.
  const gemsNoteByKey = new Map<string, string>();
  for (const r of rows) {
    if (!r.accountId.startsWith(GEMS_NS)) continue;
    const key = r.accountId.slice(GEMS_NS.length);
    if (!gemsNoteByKey.has(key)) gemsNoteByKey.set(key, r.id);
  }
  const parts: (Part & { id: string })[] = [];
  for (const [key, id] of gemsNoteByKey) {
    const sr = byRawId.get(key);
    if (sr) parts.push({ id, own: key === canonical, sr });
  }
  const hit = pickPart(parts, (sr) => sr.gems.length > 0);
  return hit ? { id: hit.id, gems: hit.sr.gems } : null;
}

/** The staged rows of every slice that folds into one account, as one list:
 *  the account's own slice first, then a duplicate's, newest day first across
 *  them, one row per key. A gem's cite names a row key, and the drill has to
 *  find it whichever id the slice was staged under. Pure. */
export function foldStageRows(
  slices: readonly { own: boolean; rows: readonly StagedRow[] }[],
): StagedRow[] {
  const ordered = [...slices].sort((a, b) => Number(b.own) - Number(a.own));
  const seen = new Set<string>();
  const out: StagedRow[] = [];
  for (const s of ordered)
    for (const r of s.rows) {
      if (seen.has(r.k)) continue;
      seen.add(r.k);
      out.push(r);
    }
  // Stable: within a day the slice's own order (newest first) holds.
  return out.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
}

/** One account's staged rows — the evidence store, read one account at a
 *  time (the covenant: only the drill and the prep read bodies) — under every
 *  id that folds into the account (E17). */
export async function fetchStageRows(accountId: string): Promise<StagedRow[]> {
  const canonical = canonicalAccountId(accountId);
  if (!canonical) return [];
  const prisma = getPrisma();
  const rows = await prisma.accountNote.findMany({
    where: { accountId: { in: accountIdsOf(canonical).map((id) => `${STAGE_NS}${id}`) } },
    orderBy: { createdAt: "desc" },
    select: { accountId: true, body: true },
  });
  const seen = new Set<string>();
  const slices: { own: boolean; rows: StagedRow[] }[] = [];
  for (const r of rows) {
    // Replace-forward keeps one slice per key; a stray behind it is not read.
    if (seen.has(r.accountId)) continue;
    seen.add(r.accountId);
    const key = r.accountId.slice(STAGE_NS.length);
    slices.push({
      own: key === canonical,
      rows: parseStageBody(r.body)?.slice.rows ?? [],
    });
  }
  return foldStageRows(slices);
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
// the constants are placeholders reserved for founder tuning once a live
// distribution exists).

const INTENT_WARM_THRESHOLD = 6;
const INTENT_HALF_LIFE_DAYS = 10;

type IntentWarm = {
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
// sortable ISO-ish key. "" when the second record holds none. It silences
// the drumbeat and nothing else: a datetime is never their voice (D19), and
// who caught the reply is nobody's move (C6, amended 2026-10-05).

export function orgInboundKey(sr: SecondRecord | undefined): string {
  const v = sr?.rollup?.lastOrgInbound ?? "";
  const m = /^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/.exec(v);
  if (!m) return "";
  return m[2] ? `${m[1]}T${m[2]}:00` : `${m[1]}T12:00:00`;
}

// ── the collision guard (a gate, not a rule) ────────────────────────────────
// A live marketing cadence (sends inside 7 days) or a colleague's thread
// inside 7 days flags the composed thing. Informs, never blocks (the direct
// doctrine). The 7-day send window rides the intent grammar's 7D row; slices
// staged before that row existed read as no-cadence rather than guessing.

type Collision = {
  mktgSends7: number;
  colleague: { who: string; day: string } | null;
};

export function collisionFor(sr: SecondRecord | undefined, now: Date): Collision | null {
  const mktgSends7 = sr?.intent?.windows.w7?.s ?? 0;
  let colleague: Collision["colleague"] = null;
  const lh = sr?.rollup?.lastHuman;
  // Your own thread never collides with your own outreach.
  if (lh && lh.kind === "colleague" && !MINE_RE.test(lh.who)) {
    const age = ageDays(lh.day, now);
    if (age != null && age <= 7) colleague = { who: lh.who, day: lh.day };
  }
  if (mktgSends7 <= 0 && !colleague) return null;
  return { mktgSends7, colleague };
}

// ── engaged-never-introduced (rule table: 78) ───────────────────────────────
// Heavy support traffic, still warm, on an account nobody ever pitched.

const ENI_MIN_CASES = 8;
const ENI_FRESH_DAYS = 60;

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

// ── the THEIRS line (decreed 2026-08-20; ruled 2026-09-25, C16) ─────────────
// THEIRS is the account's people. The line carries only gems about an
// account person — "their voice" means the PEO's own people, never a
// colleague's log — so a colleague's gem has no seat on the line or the row
// (C16, amended 2026-10-05); an account with no live account-person gem has
// no THEIRS line at all. Acted gems have already left the arrival surface.

export type TheirsLine = {
  label: string;
  gems: Pick<Gem, "term" | "act" | "reason" | "whenDay" | "cites">[];
};

export function theirsLine(sr: SecondRecord | null | undefined): TheirsLine | null {
  const theirs = (sr?.gems ?? []).filter((g) => !g.actedDay && g.whoKind !== "colleague");
  if (theirs.length === 0) return null;
  const shown = theirs.slice(0, 3);
  const g = shown[0];
  const first = (g.who[0] ?? "").split(" ")[0].toUpperCase();
  const day = g.whenDay ? g.whenDay.slice(5).replace("-", "/") : "";
  const label = [
    first ? `${first}’S ${g.term}` : g.term,
    day,
    shown.length > 1 ? `+${shown.length - 1}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    label,
    gems: shown.map((x) => ({
      term: x.term,
      act: x.act,
      reason: x.reason,
      whenDay: x.whenDay,
      cites: x.cites,
    })),
  };
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
