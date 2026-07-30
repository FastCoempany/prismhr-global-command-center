// Phase 13.6 · THE BRIDGES.
//
// Everything here is an OFFER. The room reads; it does not file a note, open an
// action, move a stage or write a battlecard. Each function below composes
// something the operator can act on in one click somewhere else — and that
// click happens in the other room, by hand (I.2).
//
// Four bridges:
//
//   · the prospect-question harvest (C7) — what real buyers asked, grouped, so
//     it can become a battlecard question; and the inverse, battlecard
//     questions no buyer has ever needed answered
//   · the gap bridge (C7) — an account inherits the questions its peers
//     provoked, so a deal starts with what comparable deals taught
//   · the account bridge — an entity that matches a book account offers a link
//     into that deal's row
//   · promotion — a claim, drafted into the Playbook's own voice, carrying its
//     provenance, ready for a human to paste and keep

import { askShapeRead } from "./playbook-in";

/** A prospect question as it comes out of the corpus. */
export type ProspectAsk = {
  claimId: string;
  text: string;
  shape: string;
  entities: string[];
  saidAt: string;
  docId: string;
  accountId: string;
  space: string;
};

const STOP = new Set([
  "what",
  "when",
  "where",
  "which",
  "does",
  "will",
  "have",
  "with",
  "from",
  "that",
  "this",
  "your",
  "their",
  "about",
  "would",
  "could",
  "there",
  "they",
  "them",
  "into",
  "much",
  "many",
  "long",
  "than",
  "then",
  "just",
  "like",
  "make",
  "need",
  "want",
  "know",
]);

function words(s: string): string[] {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));
}

/** A question's identity, independent of how it was phrased. Sorted significant
 *  words — so "how long until we're live?" and "when are we live by?" land in
 *  the same place only when they genuinely share substance. */
export function askKey(text: string): string {
  return [...new Set(words(text))].sort().join(" ");
}

/** Two asks are the same ask when they share most of their substance. Set at
 *  half deliberately: a question about payroll timing and a question about
 *  onboarding timing must NOT collapse into one battlecard. */
export function sameAsk(a: string, b: string, at = 0.5): boolean {
  const x = new Set(words(a));
  const y = new Set(words(b));
  if (x.size === 0 || y.size === 0) return false;
  const shared = [...x].filter((w) => y.has(w)).length;
  return shared / Math.min(x.size, y.size) >= at;
}

export type BattlecardProposal = {
  /** The clearest phrasing of the ask — the longest one, which is usually the
   *  one that carries the qualifier that mattered. */
  question: string;
  shape: string;
  /** What the shape says about the moment (C7). */
  read: string;
  entities: string[];
  /** How many DISTINCT documents it was asked in. One loud demo is not a
   *  pattern; three separate buyers is. */
  asked: number;
  firstAt: string;
  lastAt: string;
  claimIds: string[];
};

/** THE HARVEST. Group what buyers actually asked, drop anything the Playbook
 *  already asks, and rank by how many separate rooms it came up in.
 *
 *  Proposals only. The Playbook is written by hand (I.2). */
export function harvestBattlecards(
  asks: ProspectAsk[],
  playbookQuestions: string[],
  opts?: { minDocs?: number; cap?: number },
): { propose: BattlecardProposal[]; oursNotTheirs: string[] } {
  const minDocs = opts?.minDocs ?? 2;
  const cap = opts?.cap ?? 12;

  const groups: ProspectAsk[][] = [];
  for (const a of asks) {
    if (!a.text.trim()) continue;
    const hit = groups.find((g) => sameAsk(g[0].text, a.text));
    if (hit) hit.push(a);
    else groups.push([a]);
  }

  const propose = groups
    .map((g) => {
      const docs = new Set(g.map((a) => a.docId));
      const dates = g
        .map((a) => a.saidAt)
        .filter(Boolean)
        .sort();
      const clearest = [...g].sort((a, b) => b.text.length - a.text.length)[0];
      return {
        question: clearest.text,
        shape: clearest.shape,
        read: askShapeRead(clearest.shape, ""),
        entities: [...new Set(g.flatMap((a) => a.entities))].slice(0, 8),
        asked: docs.size,
        firstAt: dates[0] ?? "",
        lastAt: dates[dates.length - 1] ?? "",
        claimIds: g.map((a) => a.claimId),
      };
    })
    .filter((p) => p.asked >= minDocs)
    .filter((p) => !playbookQuestions.some((q) => sameAsk(q, p.question)))
    .sort((a, b) => b.asked - a.asked || b.lastAt.localeCompare(a.lastAt))
    .slice(0, cap);

  // The inverse, and the more interesting half: a battlecard question no buyer
  // has ever needed answered is a question of ours, not theirs.
  const oursNotTheirs = playbookQuestions
    .filter((q) => q.trim())
    .filter((q) => !asks.some((a) => sameAsk(a.text, q)))
    .slice(0, cap);

  return { propose, oursNotTheirs };
}

/** THE GAP BRIDGE. Questions prospects in comparable situations asked, so a
 *  deal inherits what its peers provoked.
 *
 *  Comparability is entity overlap — same product line, same country, same
 *  scenario. A question from this account's own demos is excluded: the carousel
 *  is for what OTHER buyers asked, not an echo. */
export function peerQuestions(
  asks: ProspectAsk[],
  opts: { entities: string[]; excludeAccountId?: string; cap?: number },
): { question: string; shared: string[]; claimId: string; space: string }[] {
  const want = new Set(opts.entities.filter(Boolean).map((e) => e.toLowerCase().trim()));
  if (want.size === 0) return [];
  const cap = opts.cap ?? 3;

  const scored = asks
    .filter((a) => !opts.excludeAccountId || a.accountId !== opts.excludeAccountId)
    .map((a) => {
      const shared = a.entities.filter((e) => want.has(e.toLowerCase().trim()));
      return { a, shared };
    })
    .filter((s) => s.shared.length > 0)
    .sort(
      (x, y) => y.shared.length - x.shared.length || y.a.saidAt.localeCompare(x.a.saidAt),
    );

  // One question per shape at most — three flavours of the same worry is not
  // three questions.
  const out: { question: string; shared: string[]; claimId: string; space: string }[] =
    [];
  for (const s of scored) {
    if (out.some((o) => sameAsk(o.question, s.a.text))) continue;
    out.push({
      question: s.a.text,
      shared: s.shared,
      claimId: s.a.claimId,
      space: s.a.space,
    });
    if (out.length >= cap) break;
  }
  return out;
}

/** THE ACCOUNT BRIDGE. An entity that names a book account offers a link into
 *  that deal's row. Offers — the room never files anything there. */
export function accountsMentioned(
  entities: string[],
  book: { id: string; name: string }[],
  cap = 3,
): { id: string; name: string }[] {
  const norm = (s: string) =>
    (s ?? "")
      .toLowerCase()
      .replace(/\b(inc|llc|corp|corporation|company|co|ltd|group|holdings)\b/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const wanted = entities.map(norm).filter((s) => s.length > 2);
  const out: { id: string; name: string }[] = [];
  for (const acct of book) {
    const n = norm(acct.name);
    if (!n) continue;
    if (wanted.some((w) => w === n || w.includes(n) || n.includes(w))) {
      if (!out.some((o) => o.id === acct.id)) out.push({ id: acct.id, name: acct.name });
    }
    if (out.length >= cap) break;
  }
  return out;
}

/** ASK FROM ANYWHERE. The same brain, the question pre-scoped to an account's
 *  own vocabulary — still searching everything, just starting there (C1). */
export function scopedAsk(accountName: string, entities: string[] = []): string {
  const name = (accountName ?? "").trim();
  const extra = entities.filter(Boolean).slice(0, 3).join(", ");
  if (!name) return "";
  return `What do we know about ${name}${extra ? ` — ${extra}` : ""}?`;
}

export function askHref(question: string): string {
  return `/intranet?q=${encodeURIComponent(question.slice(0, 300))}`;
}

/** PROMOTION. A claim drafted into the Playbook's own voice, carrying its
 *  provenance so the promoted line still says where it came from.
 *
 *  This composes text. It does not write it anywhere — promotion is a
 *  deliberate human act in the Playbook (I.2), and the room imports no write
 *  action from it. */
export function promotionDraft(
  claim: { text: string; kind: string; speaker: string; saidAt: string },
  doc: { space: string; title: string; origin: string },
): { ns: "market" | "lessons"; line: string } {
  // A decision or a commitment taught us something on a deal; a fact about the
  // world is market knowledge.
  const ns: "market" | "lessons" =
    claim.kind === "decision" || claim.kind === "commitment" ? "lessons" : "market";
  const when = (claim.saidAt ?? "").slice(0, 10);
  const where = doc.space || doc.title || doc.origin;
  const tail = [where, when].filter(Boolean).join(", ");
  return {
    ns,
    line: `${claim.text.trim().replace(/\s+$/, "")}${tail ? ` (${tail})` : ""}`,
  };
}
