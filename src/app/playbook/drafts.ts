// The second record's draft queue (5.5, shipped 2026-08-20): support themes
// crossing the threshold, five or more cases on a theme, the top three
// book-wide, become DRAFT market facts awaiting the operator's hand. The
// Playbook's draft queue approves by hand and nothing auto-publishes (CLAUDE.md,
// the second ring): this is the queue's whole derivation, pure, with no store
// to write to, so reading the queue can never publish a draft. The one write
// is approveSecondDraft, the Approve button's form action (./actions.ts).
// Approved drafts (already a market fact) and dismissed ones leave the queue;
// the counts are arithmetic from the rollup builder, never model text.

import { knowledgeKey } from "@/lib/playbook/store";

export type SecondDraft = {
  key: string;
  text: string;
  accountId: string;
  accountName: string;
  /** The support theme the draft counts, and every account it counted, most
   *  cases first: the draft's door to its case list (the meat law, pass 12). */
  theme: string;
  accounts: { id: string; name: string; n: number }[];
};

/** The support themes the queue reads, per account: a label and its count. */
type ThemeStore = {
  support?: { themes: readonly { label: string; n: number }[] } | null;
};

export const DRAFT_MIN_CASES = 5;
export const DRAFT_TOP = 3;

export function secondRecordDrafts(input: {
  secondById: ReadonlyMap<string, ThemeStore>;
  /** The book's accounts by id; a theme off the book is not counted. */
  nameById: ReadonlyMap<string, string>;
  /** The knowledge keys of the market facts already filed. */
  marketKeys: ReadonlySet<string>;
  /** The keys the operator closed with ✕ (srdraft:<key>). */
  dismissed: ReadonlySet<string>;
}): SecondDraft[] {
  const agg = new Map<
    string,
    {
      label: string;
      n: number;
      accounts: Set<string>;
      byAccount: Map<string, number>;
      bestId: string;
      bestN: number;
    }
  >();
  for (const [id, sr] of input.secondById) {
    if (!input.nameById.has(id)) continue;
    for (const t of sr.support?.themes ?? []) {
      const key = t.label.toLowerCase();
      const cur = agg.get(key) ?? {
        label: t.label,
        n: 0,
        accounts: new Set<string>(),
        byAccount: new Map<string, number>(),
        bestId: id,
        bestN: 0,
      };
      cur.n += t.n;
      cur.accounts.add(id);
      cur.byAccount.set(id, (cur.byAccount.get(id) ?? 0) + t.n);
      if (t.n > cur.bestN) {
        cur.bestN = t.n;
        cur.bestId = id;
      }
      agg.set(key, cur);
    }
  }
  return [...agg.values()]
    .filter((a) => a.n >= DRAFT_MIN_CASES)
    .sort((a, b) => b.n - a.n)
    .slice(0, DRAFT_TOP)
    .map((a) => {
      const text = `Support traffic keeps hitting "${a.label}": ${a.n} cases across ${a.accounts.size} account${a.accounts.size === 1 ? "" : "s"} this window. Say how Global sits beside it.`;
      return {
        key: knowledgeKey(text),
        text,
        accountId: a.bestId,
        accountName: input.nameById.get(a.bestId) ?? "",
        theme: a.label,
        accounts: [...a.byAccount]
          .sort((x, y) => y[1] - x[1])
          .map(([id, n]) => ({ id, name: input.nameById.get(id) ?? id, n })),
      };
    })
    .filter((d) => !input.marketKeys.has(d.key) && !input.dismissed.has(d.key));
}
