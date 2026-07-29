// STILL UNKNOWN — the ask-backs. Every paste read names the questions the
// record still cannot answer for THIS deal; they queue per account and the room
// shows a few at a time. Every scenario differs, so any ask can be waved off as
// irrelevant — and waving one off advances the carousel to the next ask rather
// than leaving a hole. When the queue runs dry the room offers to mint more.

import { createAccountNoteRow } from "@/lib/notes/write";
import { knowledgeKey } from "@/lib/playbook/store";
import type { AccountNote } from "@/lib/today/overlay";

export const GAP_NS = "gaps:";
export const GAP_DISMISS = "gap-dismiss:";
export const GAP_SHOW_CAP = 3;

export function gapNs(accountId: string): string {
  return `${GAP_NS}${accountId}`;
}

export function gapDismissKey(noteId: string): string {
  return `${GAP_DISMISS}${noteId}`;
}

export type Gap = {
  id: string;
  question: string;
  at: string; // ISO — newest asks are the most deal-relevant
};

export function gapBody(question: string): string {
  return `? ${question.trim()}`;
}

export function parseGapBody(body: string): string {
  return (body ?? "").replace(/^\?\s*/, "").trim();
}

// The carousel: newest-first queue minus everything waved off. `shown` is what
// the room renders; `queued` is how many more are waiting behind them, which is
// what tells the operator whether dismissing costs them anything.
export function readGaps(
  notesByAccount: Map<string, AccountNote[]>,
  accountId: string,
  dismissed: Set<string>,
  cap = GAP_SHOW_CAP,
): { shown: Gap[]; queued: number } {
  const rows = notesByAccount.get(gapNs(accountId)) ?? [];
  const live: Gap[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    if (dismissed.has(gapDismissKey(r.id))) continue;
    const question = parseGapBody(r.body);
    if (question.length < 8) continue;
    const key = knowledgeKey(question);
    if (seen.has(key)) continue;
    seen.add(key);
    live.push({ id: r.id, question, at: r.createdAt });
  }
  return { shown: live.slice(0, cap), queued: Math.max(0, live.length - cap) };
}

export async function fileGaps(opts: {
  accountId: string;
  questions: string[];
  known: Set<string>; // knowledgeKey() of asks already on file (live or waved off)
  at?: Date;
}): Promise<string[]> {
  const ids: string[] = [];
  for (const q of opts.questions) {
    const question = (q ?? "").trim();
    if (question.length < 8) continue;
    const key = knowledgeKey(question);
    if (!key || opts.known.has(key)) continue;
    opts.known.add(key);
    try {
      const row = await createAccountNoteRow({
        accountId: gapNs(opts.accountId),
        kind: "account",
        body: gapBody(question),
        lane: "background",
        source: "gap",
        at: opts.at,
      });
      ids.push(row.id);
    } catch {
      // Same doctrine as the playbook: a lost ask never fails a paste.
    }
  }
  return ids;
}
