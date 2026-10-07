// The one spelling of the ✕-park disposition. A ✕-parked record row is a
// `hide:note:<id>` disposition: the note survives in the table and leaves
// every derived fact (the account read's `hidden` set, §2.2). The prefix had
// two spellings, an export of the second record's read layer and a private
// copy in the account read (pass 9 seam, S-11); it lives here, in a module
// with no imports, so the server reads and the client-side sheet rules
// (src/app/accounts/rules.ts) import one binding.

export const HIDE_NOTE_PREFIX = "hide:note:";

/** The disposition key that parks one record row. */
export const hideNoteKey = (noteId: string): string => `${HIDE_NOTE_PREFIX}${noteId}`;
