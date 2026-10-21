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
import { redactMoneyStrict } from "@/lib/intel/lexicon";
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

/** Control characters the table refuses (a NUL an HTML entity decoded to). */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Keep each entry's whole email; the count kept, 0 when the store is down.
 *  An empty text is kept too: it marks an email the filing looked for and
 *  could not pair with its message, so the row says that and never claims
 *  the email predates the store. One batch, and row by row when the batch
 *  is refused, so one text the table rejects never takes the others down. */
export async function keepEmailTexts(
  rows: readonly NewEmailText[],
  db?: EmailTextClient,
): Promise<number> {
  const data = rows
    .map((r) => ({
      noteId: r.noteId,
      accountId: r.accountId,
      ...(r.filingId ? { filingId: r.filingId } : {}),
      text: scrubSecrets(redactMoneyStrict((r.text ?? "").replace(CONTROL, ""))).trim(),
    }))
    .filter((r) => r.noteId && r.accountId);
  if (data.length === 0) return 0;
  let c: EmailTextClient;
  try {
    c = db ?? client();
    return (await c.emailText.createMany({ data, skipDuplicates: true })).count;
  } catch {
    // the batch was refused; each row on its own below
  }
  let kept = 0;
  for (const row of data) {
    try {
      kept += (
        await (db ?? client()).emailText.createMany({ data: [row], skipDuplicates: true })
      ).count;
    } catch {
      // this one row is lost; the row says the filing looked and found none
    }
  }
  return kept;
}

/** The whole emails the store holds for these notes, by note id; null when
 *  the store could not be read, which is not the same as holding nothing. */
async function readEmailTexts(
  noteIds: readonly string[],
  db?: EmailTextClient,
): Promise<Map<string, string> | null> {
  const ids = [...new Set(noteIds.filter(Boolean))];
  if (ids.length === 0) return new Map();
  try {
    const rows = await (db ?? client()).emailText.findMany({
      where: { noteId: { in: ids } },
      select: { noteId: true, text: true },
    });
    // Redacted on the way in; redacted again on the way out, as the evidence
    // route does, so a row written before a lexicon change still renders clean.
    return new Map(rows.map((r) => [r.noteId, redactMoneyStrict(r.text)]));
  } catch {
    return null;
  }
}

/** The whole emails the store holds for these notes, by note id. Empty when
 *  the store is down. */
export async function emailTextsFor(
  noteIds: readonly string[],
  db?: EmailTextClient,
): Promise<Map<string, string>> {
  return (await readEmailTexts(noteIds, db)) ?? new Map();
}

/** Why an email has no whole text, each reason true: filed before the store
 *  kept any (no row), filed since by a capture the filing could not pair
 *  with its message (an empty row), logged by the app itself with no
 *  capture to keep (an Act Lane send), or unread because the store could
 *  not be reached, which claims nothing. */
export type WholeMissing = "before" | "capture" | "record" | "unread";

/** The latest emails' whole text for the page, one batch for every row: the
 *  store's text by note, and for a note without one, why. `logged` marks an
 *  email the app wrote itself (src/lib/room/email-row.ts reads it off the
 *  note), never a missing filing, which every row filed before 2026-10-05
 *  lacks. */
export async function wholeEmailsFor(
  emails: readonly { id: string; logged: boolean }[],
  db?: EmailTextClient,
): Promise<Map<string, { whole: string | null; missing: WholeMissing | "" }>> {
  const texts = await readEmailTexts(
    emails.map((e) => e.id),
    db,
  );
  return new Map(
    emails.map((e) => {
      const text = texts?.get(e.id);
      const whole = text ? text : null;
      const missing: WholeMissing | "" = whole
        ? ""
        : e.logged
          ? "record"
          : texts === null
            ? "unread"
            : text !== undefined
              ? "capture"
              : "before";
      return [e.id, { whole, missing }];
    }),
  );
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
