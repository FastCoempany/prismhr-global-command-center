// Phase 7 · INDEX — topics that stay still.
//
// The central decision: the index is NEVER recomputed from scratch. It
// accumulates. A rail that looks different every morning is a rail nobody
// believes, and an index nobody believes is worse than no index at all.
//
// Three invariants, all tested:
//   I1 · a live topic leaves the rail only by merge, and a merge redirects
//   I2 · the same documents in a different order produce the same live set
//   I3 · a claim never silently leaves a topic
//
// Nothing here calls a model. Promotion, folding and counting are arithmetic;
// only the merge ARBITRATION of near-but-not-identical labels needs judgment,
// and that is a separate call the server action makes.

import { PROSPECT_TOPIC_LABEL, TOPIC_PROMOTE_AT } from "./doctrine";
import type { Topic } from "./types";

/** A proposal waiting for enough support to join the rail. */
export type Pending = {
  label: string;
  /** Distinct documents that have asked for this label. */
  docIds: string[];
  why: string;
  firstSeen: string;
  lastSeen: string;
};

// ── label folding ───────────────────────────────────────────────────────────
// "EOR risk", "EOR risks" and "Risks with EOR" are one topic. Mechanical first;
// the model only arbitrates what folding leaves ambiguous.

const LABEL_STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "of",
  "for",
  "with",
  "in",
  "on",
  "to",
  "about",
  "our",
  "their",
]);

/** Case, punctuation, plurals and connective words off; words sorted, so word
 *  order stops mattering. "Risks with EOR" and "EOR risk" fold identically. */
export function foldLabel(label: string): string {
  return (
    (label ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !LABEL_STOP.has(w))
      // Singularise, but never inside a word that simply ends in s ("process",
      // "status", "business") — a bad stem folds two real topics into one.
      .map((w) =>
        w.length > 3 && w.endsWith("s") && !/(ss|us|is)$/.test(w) ? w.slice(0, -1) : w,
      )
      .sort()
      .join(" ")
      .trim()
  );
}

export function sameLabel(a: string, b: string): boolean {
  const x = foldLabel(a);
  return Boolean(x) && x === foldLabel(b);
}

/** Labels that fold CLOSE but not identically — the only pairs worth spending a
 *  model call on. Everything identical is merged mechanically; everything
 *  distant is left alone. */
export function mergeCandidates(topics: Topic[]): [Topic, Topic][] {
  const live = topics.filter((t) => t.status === "live");
  const out: [Topic, Topic][] = [];
  for (let i = 0; i < live.length; i += 1) {
    for (let j = i + 1; j < live.length; j += 1) {
      const a = foldLabel(live[i].label);
      const b = foldLabel(live[j].label);
      if (!a || !b || a === b) continue;
      const aw = new Set(a.split(" "));
      const bw = new Set(b.split(" "));
      let shared = 0;
      for (const w of bw) if (aw.has(w)) shared += 1;
      const overlap = shared / Math.max(aw.size, bw.size);
      if (overlap >= 0.5) out.push([live[i], live[j]]);
    }
  }
  return out.slice(0, 40);
}

// ── the pending pool ────────────────────────────────────────────────────────
/** Record a proposal. Support is counted in DISTINCT documents — one loud
 *  document cannot promote a topic on its own. */
export function proposeTopic(
  pool: Pending[],
  proposal: { label: string; why: string },
  docId: string,
  nowIso: string,
): Pending[] {
  const next = pool.map((p) => ({ ...p, docIds: [...p.docIds] }));
  const hit = next.find((p) => sameLabel(p.label, proposal.label));
  if (hit) {
    if (!hit.docIds.includes(docId)) hit.docIds.push(docId);
    hit.lastSeen = nowIso;
    return next;
  }
  next.push({
    label: proposal.label.slice(0, 80),
    docIds: [docId],
    why: proposal.why.slice(0, 200),
    firstSeen: nowIso,
    lastSeen: nowIso,
  });
  return next;
}

/** Which pending labels have earned a place in the rail. Below the threshold a
 *  proposal stays invisible — that is what keeps the rail from filling with
 *  one-off noise from a single mention. */
export function readyToPromote(pool: Pending[]): Pending[] {
  return pool.filter((p) => p.docIds.length >= TOPIC_PROMOTE_AT);
}

/** Pending labels quiet for 90 days are archived — never deleted (C6), so the
 *  tally survives if the subject comes back. */
export function stalePending(pool: Pending[], nowIso: string, days = 90): Pending[] {
  const cut = Date.parse(nowIso) - days * 86_400_000;
  return pool.filter(
    (p) => p.docIds.length < TOPIC_PROMOTE_AT && Date.parse(p.lastSeen) < cut,
  );
}

// ── resolution ──────────────────────────────────────────────────────────────
/** Follow merge redirects to the surviving topic. Every id ever issued resolves
 *  forever (I1), so an old link, an old citation and an old answer all still
 *  land. Cycles are impossible by construction but guarded anyway. */
export function resolveTopic(topics: Topic[], id: string): Topic | null {
  const byId = new Map(topics.map((t) => [t.id, t]));
  let cur = byId.get(id) ?? null;
  let hops = 0;
  while (cur && cur.status === "merged" && cur.mergedInto && hops < 8) {
    cur = byId.get(cur.mergedInto) ?? null;
    hops += 1;
  }
  return cur;
}

/** The rail's top level: live topics with no parent, prospect questions first
 *  (C7 — the founder named it the window), then by weight. */
export function railTopics(topics: Topic[]): Topic[] {
  return topics
    .filter((t) => t.status === "live" && !t.parentId)
    .sort((a, b) => {
      const ap = a.label === PROSPECT_TOPIC_LABEL ? 0 : 1;
      const bp = b.label === PROSPECT_TOPIC_LABEL ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return b.claimCount - a.claimCount;
    });
}

export function childrenOf(topics: Topic[], parentId: string): Topic[] {
  return topics
    .filter((t) => t.status === "live" && t.parentId === parentId)
    .sort((a, b) => b.claimCount - a.claimCount);
}

/** Every descendant id, so retrieval on a topic reaches the whole branch. */
export function descendantIds(topics: Topic[], rootId: string): string[] {
  const out = [rootId];
  const queue = [rootId];
  let guard = 0;
  while (queue.length && guard < 500) {
    const cur = queue.shift() as string;
    for (const t of topics) {
      if (t.parentId === cur && t.status !== "merged" && !out.includes(t.id)) {
        out.push(t.id);
        queue.push(t.id);
      }
    }
    guard += 1;
  }
  return out;
}

/** A topic is fresh when it gained material today — the rail marks it, because
 *  a topic the brain just invented is exactly what an operator wants to catch
 *  early. */
export function isFresh(t: Topic, nowIso: string): boolean {
  const d = Date.parse(nowIso) - Date.parse(t.lastSeen);
  return Number.isFinite(d) && d < 86_400_000;
}

/** The global nag (I.7.2). One line about the corpus — never about a space,
 *  because only the operator knows which conversations are worth keeping. */
export function stalenessLine(lastCaptureIso: string, nowIso: string): string {
  if (!lastCaptureIso) return "Nothing captured yet.";
  const t = Date.parse(lastCaptureIso);
  const n = Date.parse(nowIso);
  if (Number.isNaN(t) || Number.isNaN(n)) return "";
  const days = Math.floor((n - t) / 86_400_000);
  const when = new Date(t).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });
  if (days <= 0) return `Last added ${when}.`;
  return `Nothing new since ${when} — ${days} day${days === 1 ? "" : "s"}.`;
}
