// Phase 12 · TIME — superseded, disputed, aging.
//
// This exists because the first mockup said "older than a newer claim here",
// which told the operator nothing he could act on. What follows is the
// replacement: three states, each with language that names what to DO.
//
// The expensive part is deciding whether two claims are actually about the same
// point. That is a model call — but only after the mechanical pair proposal
// below has cut a 60-claim topic from 1,770 pairs to fewer than thirty.

import { AGE_DAYS, CONTRADICTION_MIN_DAYS, type ClaimKind } from "./doctrine";
import type { Claim } from "./types";

const DAY = 86_400_000;

export type TimeState =
  | { state: "current" }
  | { state: "superseded"; byId: string; line: string }
  | { state: "disputed"; withIds: string[]; line: string }
  | { state: "aging"; line: string };

/** Pairs worth arbitrating. All-pairs is quadratic and unaffordable; these four
 *  mechanical conditions do the cutting before any model sees anything. */
export function proposePairs(claims: Claim[]): [Claim, Claim][] {
  const out: [Claim, Claim][] = [];
  for (let i = 0; i < claims.length; i += 1) {
    for (let j = i + 1; j < claims.length; j += 1) {
      const a = claims[i];
      const b = claims[j];
      // 1 · they must share at least one entity — two claims about different
      //     countries are not in conflict, they are just both about payroll
      const shared = a.entities.some((e) =>
        b.entities.some((f) => f.toLowerCase() === e.toLowerCase()),
      );
      if (!shared) continue;
      // 2 · compatible kinds — a question never supersedes a fact
      if (!kindsComparable(a.kind, b.kind)) continue;
      // 3 · far enough apart that this is a change of position, not a
      //     conversation happening in real time
      const apart = Math.abs(Date.parse(a.saidAt) - Date.parse(b.saidAt));
      if (!Number.isFinite(apart) || apart < CONTRADICTION_MIN_DAYS * DAY) continue;
      out.push([a, b]);
    }
  }
  return out.slice(0, 60);
}

const COMPARABLE: Record<string, string[]> = {
  fact: ["fact", "decision", "process"],
  decision: ["decision", "fact", "opinion", "process"],
  process: ["process", "fact", "decision"],
  opinion: ["opinion", "decision"],
  commitment: ["commitment"],
  question: [],
  // A buyer's question is never in conflict with anything. It was asked; that
  // is all it claims (C7).
  "prospect-question": [],
};

export function kindsComparable(a: ClaimKind, b: ClaimKind): boolean {
  return (COMPARABLE[a] ?? []).includes(b);
}

/** Days after which a claim of this kind is worth confirming. A commitment goes
 *  stale in a month; a prospect question never does. */
export function ageLimit(kind: ClaimKind): number {
  return AGE_DAYS[kind] ?? 365;
}

function fmt(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", {
    month: "long",
    timeZone: "America/Chicago",
  });
}

function fmtShort(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
}

/** What a claim's age and relations mean, in words an operator can act on. */
export function readTime(
  claim: Claim,
  all: Map<string, Claim>,
  nowIso: string,
): TimeState {
  if (claim.supersededBy) {
    const newer = all.get(claim.supersededBy);
    if (newer)
      return {
        state: "superseded",
        byId: newer.id,
        line: `Updated ${fmtShort(newer.saidAt)} — see the newer line.`,
      };
  }
  if (claim.disputedWith.length) {
    const others = claim.disputedWith.map((id) => all.get(id)).filter(Boolean) as Claim[];
    if (others.length) {
      const who = [...new Set([claim.speaker, ...others.map((o) => o.speaker)])]
        .filter((s) => s && s !== "unknown")
        .slice(0, 2);
      // Naming the speakers here is provenance in service of an answer, not a
      // person index — the narrow exception C4 allows.
      const line =
        who.length === 2
          ? `${who[0]} and ${who[1]} landed on different framings.`
          : "The record disagrees with itself here.";
      return { state: "disputed", withIds: others.map((o) => o.id), line };
    }
  }
  const limit = ageLimit(claim.kind);
  if (Number.isFinite(limit)) {
    const age = (Date.parse(nowIso) - Date.parse(claim.saidAt)) / DAY;
    if (Number.isFinite(age) && age > limit) {
      return {
        state: "aging",
        line: `Said in ${fmt(claim.saidAt)} — worth confirming.`,
      };
    }
  }
  return { state: "current" };
}

/** A superseded claim never travels alone into synthesis — its superseder goes
 *  with it, so the model can see which is which rather than treating a March
 *  position as today's (F6). */
export function withSupersessions(claims: Claim[], all: Map<string, Claim>): Claim[] {
  const out = [...claims];
  const have = new Set(claims.map((c) => c.id));
  for (const c of claims) {
    if (!c.supersededBy || have.has(c.supersededBy)) continue;
    const newer = all.get(c.supersededBy);
    if (newer) {
      out.push(newer);
      have.add(newer.id);
    }
  }
  return out;
}

/** How many disputed pairs sit inside a candidate set — one of the triggers
 *  that escalates synthesis to the harder brain. */
export function disputeCount(claims: Claim[]): number {
  const ids = new Set(claims.map((c) => c.id));
  const seen = new Set<string>();
  let n = 0;
  for (const c of claims) {
    for (const other of c.disputedWith) {
      if (!ids.has(other)) continue;
      const key = [c.id, other].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      n += 1;
    }
  }
  return n;
}

/** The dismissal key for a verdict the operator waved off. Recorded, never
 *  re-proposed — the founder knows things the corpus doesn't. */
export function verdictDismissKey(aId: string, bId: string): string {
  return `intranet-verdict:${[aId, bId].sort().join(":")}`;
}
