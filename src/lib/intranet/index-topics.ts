import { BANK } from "./bank";
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

/** The rail's top level (V.4): the bank's subject parents in their decreed
 *  order, then anything else by weight. Parents are subject-matter heads —
 *  the counts belong to their subtopics, and the rail draws none here. */
export function railTopics(topics: Topic[]): Topic[] {
  const order = new Map(BANK.map((p, i) => [foldLabel(p.label), i]));
  return topics
    .filter((t) => t.status === "live" && !t.parentId)
    .sort((a, b) => {
      const ai = order.get(foldLabel(a.label)) ?? 99;
      const bi = order.get(foldLabel(b.label)) ?? 99;
      if (ai !== bi) return ai - bi;
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
