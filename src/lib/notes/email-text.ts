// The whole email's store (ship order 2026-10-20; CLAUDE.md, The email in the
// row): one EmailText row per filed email entry, keyed by its note, holding
// the email's own words. The paste pipeline writes it (src/lib/room/
// paste-core.ts), the HomeRoom reads it for the newest email on each row, and
// the filing's undo takes it back with the note.
//
// Money never reaches the table through this door, as it never reaches a note
// (src/lib/notes/write.ts): the text is redacted and scrubbed here, whatever
// the caller did upstream. A table of its own, so every reader of a note is
// untouched by it, and every call fails open: a database without the table
// loses the whole email, never the filing, the page or the undo.

import { getPrisma } from "@/lib/db";
import { redactMoney } from "@/lib/intel/lexicon";
import { scrubSecrets } from "@/lib/sf-timeline";

export type NewEmailText = {
  noteId: string;
  accountId: string;
  filingId?: string;
  text: string;
};

/** The slice of the Prisma client the store needs — a test hands in a stub. */
export type EmailTextClient = {
  emailText: {
    createMany(args: {
      data: { noteId: string; accountId: string; filingId?: string; text: string }[];
      skipDuplicates: true;
    }): Promise<{ count: number }>;
    findMany(args: {
      where: { noteId: { in: string[] } };
      select: { noteId: true; text: true };
    }): Promise<{ noteId: string; text: string }[]>;
    deleteMany(args: {
      where:
        | { accountId: string; noteId: { in: string[] } }
        | { accountId: string; filingId: string };
    }): Promise<{ count: number }>;
  };
};

const client = (): EmailTextClient => getPrisma() as unknown as EmailTextClient;

/** Keep each entry's whole email; the count kept, 0 when the store is down. */
export async function keepEmailTexts(
  rows: readonly NewEmailText[],
  db?: EmailTextClient,
): Promise<number> {
  const data = rows
    .map((r) => ({
      noteId: r.noteId,
      accountId: r.accountId,
      ...(r.filingId ? { filingId: r.filingId } : {}),
      text: scrubSecrets(redactMoney(r.text ?? "")).trim(),
    }))
    .filter((r) => r.noteId && r.accountId && r.text);
  if (data.length === 0) return 0;
  try {
    return (await (db ?? client()).emailText.createMany({ data, skipDuplicates: true }))
      .count;
  } catch {
    return 0;
  }
}

/** The whole emails the store holds for these notes, by note id. Empty when
 *  the store is down; the row then shows the synopsis and says why. */
export async function emailTextsFor(
  noteIds: readonly string[],
  db?: EmailTextClient,
): Promise<Map<string, string>> {
  const ids = [...new Set(noteIds.filter(Boolean))];
  if (ids.length === 0) return new Map();
  try {
    const rows = await (db ?? client()).emailText.findMany({
      where: { noteId: { in: ids } },
      select: { noteId: true, text: true },
    });
    // Redacted on the way in; redacted again on the way out, as the evidence
    // route does, so a row written before a lexicon change still renders clean.
    return new Map(rows.map((r) => [r.noteId, redactMoney(r.text)]));
  } catch {
    return new Map();
  }
}

/** Why an email has no whole text: filed before the store kept any, or filed
 *  since by a capture the matcher could not pair with its message (a
 *  Salesforce timeline, a body pasted without its header). */
export type WholeMissing = "before" | "capture";

/** The latest emails' whole text for the page, one batch for every row: the
 *  store's text by note, and for a note without one, why. The store's own
 *  first row dates when it began, so a filing older than that, or one the
 *  page cannot date, was filed before whole emails were kept. */
export async function wholeEmailsFor(
  emails: readonly { id: string; filingId: string }[],
): Promise<Map<string, { whole: string | null; missing: WholeMissing | "" }>> {
  const out = new Map<string, { whole: string | null; missing: WholeMissing | "" }>();
  if (emails.length === 0) return out;
  const texts = await emailTextsFor(emails.map((e) => e.id));
  const bare = emails.filter((e) => !texts.has(e.id));
  let since = Infinity;
  const filedAt = new Map<string, number>();
  if (bare.length) {
    try {
      const prisma = getPrisma();
      const first = await prisma.emailText.findFirst({
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });
      if (first) since = first.createdAt.getTime();
      const ids = [...new Set(bare.map((e) => e.filingId).filter(Boolean))];
      if (ids.length && first) {
        const rows = await prisma.filing.findMany({
          where: { id: { in: ids } },
          select: { id: true, createdAt: true },
        });
        for (const r of rows) filedAt.set(r.id, r.createdAt.getTime());
      }
    } catch {
      // the store is down: every bare email reads as filed before it
    }
  }
  for (const e of emails) {
    const whole = texts.get(e.id) ?? null;
    const at = filedAt.get(e.filingId);
    out.set(e.id, {
      whole,
      missing: whole ? "" : at !== undefined && at >= since ? "capture" : "before",
    });
  }
  return out;
}

/** Take back the whole emails of an undone filing: by its note ids, by its
 *  Filing row, or both, scoped to the account either way. The count taken. */
export async function dropEmailTexts(
  scope: { accountId: string; noteIds?: readonly string[]; filingId?: string },
  db?: EmailTextClient,
): Promise<number> {
  let n = 0;
  const ids = (scope.noteIds ?? []).filter(Boolean);
  try {
    const c = db ?? client();
    if (ids.length)
      n += (
        await c.emailText.deleteMany({
          where: { accountId: scope.accountId, noteId: { in: [...ids] } },
        })
      ).count;
    if (scope.filingId)
      n += (
        await c.emailText.deleteMany({
          where: { accountId: scope.accountId, filingId: scope.filingId },
        })
      ).count;
  } catch {
    // the store is down; the notes went, and nothing renders a whole email
    // without its note
  }
  return n;
}
