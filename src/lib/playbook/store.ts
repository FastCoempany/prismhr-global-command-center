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

import { getPrisma } from "@/lib/db";
import type { Door } from "@/lib/ingest/doors";
import { createAccountNoteRow, type AccountNoteData } from "@/lib/notes/write";
import type { AccountNote } from "@/lib/today/overlay";

export const PLAYBOOK_MARKET = "playbook:market";
export const PLAYBOOK_LESSONS = "playbook:lessons";

type PlaybookKind = "market" | "lesson";

type PlaybookEntry = {
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

/** The slice of the Prisma client the playbook needs — a test hands in a stub. */
export type PlaybookClient = {
  accountNote: {
    findMany(args: {
      where: { accountId: string };
      select: { body: true };
    }): Promise<{ body: string }[]>;
    create(args: { data: AccountNoteData }): Promise<{ id: string }>;
  };
};

/** What one register already knows, keyed for the dedupe. The namespace
 *  owns it (the plan's §2.5): a caller that already read the rows may pass
 *  `known` to filePlaybook and save the read. */
export async function knownPlaybook(
  kind: PlaybookKind,
  client: PlaybookClient = getPrisma(),
): Promise<Set<string>> {
  const rows = await client.accountNote
    .findMany({ where: { accountId: nsFor(kind) }, select: { body: true } })
    .catch(() => [] as { body: string }[]);
  return new Set(rows.map((r) => knowledgeKey(parsePlaybookBody(r.body).text)));
}

// File new knowledge, skipping anything the playbook already knows. Returns the
// note ids created so a paste receipt can name them.
export async function filePlaybook(opts: {
  kind: PlaybookKind;
  items: { text: string; who?: string }[];
  accountId: string;
  accountName: string;
  /** knowledgeKey() of what's already filed. Omitted, the register reads its
   *  own rows and dedupes against them. */
  known?: Set<string>;
  door: Door; // the filing's door — the fan-out passes it, an approval says "hand"
  at?: Date;
  /** The filing that taught it (slice 4): the fan-out passes it, an approval has none. */
  filingId?: string;
  client?: PlaybookClient;
}): Promise<string[]> {
  const ids: string[] = [];
  const client = opts.client ?? getPrisma();
  const known = opts.known ?? (await knownPlaybook(opts.kind, client));
  for (const item of opts.items) {
    const text = (item.text ?? "").trim();
    if (text.length < 12) continue;
    const key = knowledgeKey(text);
    if (!key || known.has(key)) continue;
    known.add(key);
    try {
      const row = await createAccountNoteRow(
        {
          accountId: nsFor(opts.kind),
          kind: "account",
          body: playbookBody(opts.kind, text, {
            a: opts.accountId,
            n: opts.accountName,
            w: (item.who ?? "").trim(),
          }),
          door: opts.door,
          lane: "background",
          source: "playbook",
          at: opts.at,
          filingId: opts.filingId,
        },
        client,
      );
      ids.push(row.id);
    } catch {
      // A knowledge line that won't file is not worth failing a paste over.
    }
  }
  return ids;
}
