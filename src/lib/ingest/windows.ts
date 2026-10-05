// Every window the ingest pipeline reads through, named in one place (the
// Chute brains refactor plan, §2.3 and slice 4). The vault keeps the file
// whole and the note keeps the text whole at any size; only the model's read
// is windowed, and every window that cut something is on the receipt (ruled
// 2026-09-25, D4 — CLAUDE.md, The Chute). A cap spelled inline in a caller is
// a window the receipt cannot see, so no caller keeps one.
//
// Pure on purpose: nothing here imports app code, so the browser's file
// reader, the server's transcriber and the pipeline all read one table.

/** The model's read of a capture: head-keep suits newest-first captures (SF,
 *  Outlook), and this is as much as one read takes of them. */
export const READ_WINDOW = 60000;

/** A call transcript is different: the decisions live at the END of the call
 *  and the whole conversation is the intelligence, so a tape gets a far
 *  higher ceiling — a three-hour call still fits. */
export const READ_WINDOW_TAPE = 400000;

/** The most text the document transcriber hands back from a PDF or an image. */
export const TRANSCRIBE_WINDOW = 60000;

/** The most bytes the transcriber sends the model — a PDF or an image past
 *  this is refused with a reason, never cut. */
export const TRANSCRIBE_BYTES = 8 * 1024 * 1024;

/** A spreadsheet as paste text: the character budget sheetToPaste spends
 *  before it says the sheet continues, so a 40k-row export cannot flood the
 *  read. */
export const SHEET_WINDOW = 30000;

/** A document (.docx) as paste text, when it does not read as a transcript —
 *  a transcript is never cut (src/app/room/read-file.ts). */
export const DOCX_WINDOW = 60000;

/** The most entries one read files, and the most the model is asked for. */
export const ENTRY_CAP = 40;

/** The least text the pipeline reads: under this a capture is nothing to
 *  file, and a transcription under it came back empty. */
export const TEXT_FLOOR = 20;

/** A window that cut something: what was cut, how much was read, how much
 *  arrived. Stored on the Filing row and read by the receipt (D4). */
export type Window = {
  /** The thing that was cut, as the receipt says it: "the paste", "the
   *  transcription", "the document". */
  what: string;
  read: number;
  of: number;
};

/** Cut `text` to `cap` characters. The window is returned only when something
 *  was cut, so a caller can collect windows and store none for a capture that
 *  fit. */
export function cut(
  what: string,
  text: string,
  cap: number,
): { text: string; window: Window | null } {
  const t = text ?? "";
  if (t.length <= cap) return { text: t, window: null };
  return { text: t.slice(0, cap), window: { what, read: cap, of: t.length } };
}

/** Every window on a result, read back from storage: anything that is not a
 *  window with a name and two counts is dropped, never rendered. */
export function windowsOf(raw: unknown): Window[] {
  if (!Array.isArray(raw)) return [];
  const out: Window[] = [];
  for (const w of raw) {
    if (!w || typeof w !== "object") continue;
    const x = w as Record<string, unknown>;
    if (
      typeof x.what === "string" &&
      typeof x.read === "number" &&
      typeof x.of === "number" &&
      Number.isFinite(x.read) &&
      Number.isFinite(x.of)
    )
      out.push({ what: x.what, read: x.read, of: x.of });
  }
  return out;
}

const count = (n: number): string => n.toLocaleString("en-US");

/** The receipt's windows sentences (D4): "Read 60,000 of 212,000 characters."
 *  — one sentence per window, naming its `what` only when there is more than
 *  one, so a receipt with one window stays the plain sentence. */
export function windowSentences(windows: readonly Window[] | undefined): string[] {
  const ws = windows ?? [];
  const many = ws.length > 1;
  return ws.map(
    (w) =>
      `Read ${count(w.read)} of ${count(w.of)} characters${many ? ` of ${w.what}` : ""}.`,
  );
}

/** The receipt's D7 sentence: the duplicate check failed open and the filing
 *  went ahead, and the receipt says so (ruled 2026-09-25, D7). */
export const DUPE_CHECK_SKIPPED = "The duplicate check didn't run.";

/** The sentences a filing's result adds to its receipt, in order: every
 *  window that cut something, then the duplicate check when it was skipped.
 *  Both doors read this, so the two receipts cannot drift. */
export function filingSentences(r: {
  windows?: readonly Window[];
  dupeCheck?: string;
}): string[] {
  const out = windowSentences(r.windows);
  if (r.dupeCheck === "skipped") out.push(DUPE_CHECK_SKIPPED);
  return out;
}
