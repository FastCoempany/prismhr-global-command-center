// The cure for amnesia. Every paste read yields two kinds of knowledge that
// do NOT belong to the deal it came from: market facts (what a competitor
// requires, what the industry does, what a deposit norm is) and process
// lessons (what slowed this one down, what killed it, what won it). Filed
// against the deal, that knowledge dies with the deal.
//
// So it is filed against a namespace instead. AccountNote.accountId carries no
// foreign key, so "playbook:market" is a perfectly good home — the same
// zero-migration idiom the namespaced disposition keys already use. The book's
// pages iterate real accounts, so these rows are invisible everywhere until the
// Playbook renders them on purpose.

import { createAccountNoteRow } from "@/lib/notes/write";
import type { AccountNote } from "@/lib/today/overlay";

export const PLAYBOOK_MARKET = "playbook:market";
export const PLAYBOOK_LESSONS = "playbook:lessons";

export type PlaybookKind = "market" | "lesson";

export type PlaybookEntry = {
  id: string;
  kind: PlaybookKind;
  text: string;
  who: string; // who said it (attribution travels with the fact)
  accountId: string; // the deal that taught it
  accountName: string;
  at: string; // ISO
};

const GLYPH: Record<PlaybookKind, string> = { market: "◆", lesson: "❖" };

function nsFor(kind: PlaybookKind): string {
  return kind === "market" ? PLAYBOOK_MARKET : PLAYBOOK_LESSONS;
}

// Provenance rides in a machine-readable tail so the visible sentence stays a
// sentence. Readers strip the tail; the operator never sees it.
type Tail = { a: string; n: string; w: string };

export function playbookBody(kind: PlaybookKind, text: string, tail: Tail): string {
  return `${GLYPH[kind]} ${text} ⟦${JSON.stringify(tail)}⟧`;
}

export function parsePlaybookBody(body: string): { text: string; tail: Tail } {
  const raw = (body ?? "").trim();
  const m = raw.match(/^(.*?)\s*⟦(\{.*\})⟧\s*$/s);
  const text = (m ? m[1] : raw).replace(/^[◆❖]\s*/, "").trim();
  let tail: Tail = { a: "", n: "", w: "" };
  if (m) {
    try {
      const p = JSON.parse(m[2]) as Partial<Tail>;
      tail = {
        a: typeof p.a === "string" ? p.a : "",
        n: typeof p.n === "string" ? p.n : "",
        w: typeof p.w === "string" ? p.w : "",
      };
    } catch {
      // A mangled tail costs the provenance, never the fact.
    }
  }
  return { text, tail };
}

// Same knowledge, said twice, is one piece of knowledge. Normalized compare so
// "At Remote, a deposit was required." and "at remote a deposit was required"
// don't both take up a line in the Playbook.
export function knowledgeKey(text: string): string {
  return (text ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

// Read the playbook out of the notes map every page already loads — no extra
// query, no new table.
export function readPlaybook(notesByAccount: Map<string, AccountNote[]>): {
  market: PlaybookEntry[];
  lessons: PlaybookEntry[];
} {
  const take = (kind: PlaybookKind): PlaybookEntry[] =>
    (notesByAccount.get(nsFor(kind)) ?? []).map((n) => {
      const { text, tail } = parsePlaybookBody(n.body);
      return {
        id: n.id,
        kind,
        text,
        who: tail.w,
        accountId: tail.a,
        accountName: tail.n,
        at: n.createdAt,
      };
    });
  return { market: take("market"), lessons: take("lesson") };
}

// File new knowledge, skipping anything the playbook already knows. Returns the
// note ids created so a paste receipt can name them.
export async function filePlaybook(opts: {
  kind: PlaybookKind;
  items: { text: string; who?: string }[];
  accountId: string;
  accountName: string;
  known: Set<string>; // knowledgeKey() of what's already filed
  at?: Date;
}): Promise<string[]> {
  const ids: string[] = [];
  for (const item of opts.items) {
    const text = (item.text ?? "").trim();
    if (text.length < 12) continue;
    const key = knowledgeKey(text);
    if (!key || opts.known.has(key)) continue;
    opts.known.add(key);
    try {
      const row = await createAccountNoteRow({
        accountId: nsFor(opts.kind),
        kind: "account",
        body: playbookBody(opts.kind, text, {
          a: opts.accountId,
          n: opts.accountName,
          w: (item.who ?? "").trim(),
        }),
        lane: "background",
        source: "playbook",
        at: opts.at,
      });
      ids.push(row.id);
    } catch {
      // A knowledge line that won't file is not worth failing a paste over.
    }
  }
  return ids;
}
