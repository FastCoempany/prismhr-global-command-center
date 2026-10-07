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

/** The most bytes the transcriber sends the model — a PDF or an image past
 *  this is refused with a reason, never cut. */
export const TRANSCRIBE_BYTES = 8 * 1024 * 1024;

// No reader keeps a window of its own (ruled 2026-10-07, pass 8 call 3): the
// transcription, the spreadsheet and the document are handed on whole, and
// the read windows above are the only cuts, on what goes to the model. The
// transport cuts nothing either: a text too heavy for one request travels in
// pieces and the server puts it back together whole (D4: the note keeps the
// text whole at any size), below.

/** The most a capture's text may weigh as one server action argument, in
 *  bytes of the encoded argument: the platform refuses a request over its
 *  cap, Vercel's 4.5 MB request limit, which next.config.ts's
 *  serverActions.bodySizeLimit ("4400kb") stays under. A text at or under it
 *  travels whole in one request; a text above it travels in pieces through
 *  the vault's chunk store, and the server assembles it before it files or
 *  routes (src/lib/ingest/carry.ts; D4, as the vault's files do under D8 as
 *  amended 2026-10-05). It cuts nothing: it only says which way the text
 *  goes. 4 MB leaves room under the cap for the action's other arguments and
 *  its encoding. */
export const TRANSPORT_BYTES = 4 * 1024 * 1024;

/** What one UTF-16 code unit costs once the text is JSON-encoded as UTF-8:
 *  the escapes JSON writes, then UTF-8's widths. A surrogate pair is costed
 *  on its high half (4 bytes for the pair) and its low half costs nothing;
 *  a lone surrogate is escaped as \uXXXX. */
function unitCost(text: string, i: number): number {
  const c = text.charCodeAt(i);
  if (c === 0x22 || c === 0x5c) return 2;
  if (c === 0x08 || c === 0x09 || c === 0x0a || c === 0x0c || c === 0x0d) return 2;
  if (c < 0x20) return 6;
  if (c < 0x80) return 1;
  if (c < 0x800) return 2;
  if (c >= 0xd800 && c <= 0xdbff) {
    const next = text.charCodeAt(i + 1);
    return next >= 0xdc00 && next <= 0xdfff ? 4 : 6;
  }
  if (c >= 0xdc00 && c <= 0xdfff) {
    const prev = text.charCodeAt(i - 1);
    return prev >= 0xd800 && prev <= 0xdbff ? 0 : 6;
  }
  return 3;
}

/** Whether a text travels whole as one request's argument (TRANSPORT_BYTES),
 *  costed as it travels: the encoded string's two quotes, JSON's escapes and
 *  UTF-8's widths. A text that does not fit goes in pieces, never cut. */
export function fitsTransport(text: string, bytes: number = TRANSPORT_BYTES): boolean {
  const t = text ?? "";
  // Every unit costs at most six bytes: a text this short fits whatever it
  // holds, and the count is skipped.
  if (t.length * 6 + 2 <= bytes) return true;
  let used = 2; // the encoded string's two quotes
  for (let i = 0; i < t.length; i++) {
    used += unitCost(t, i);
    if (used > bytes) return false;
  }
  return true;
}

/** The most entries one read files, and the most the model is asked for. */
export const ENTRY_CAP = 40;

/** The least text the pipeline reads: under this a capture is nothing to
 *  file, and a transcription under it came back empty. */
export const TEXT_FLOOR = 20;

/** A window that cut something: what was cut, how much was read, how much
 *  arrived. Stored on the Filing row and read by the receipt (D4). */
export type Window = {
  /** The thing that was cut, as the receipt says it: "the paste" for the
   *  model's read, or what a reader's own window names, should one report
   *  one. The transport names none: it cuts nothing (TRANSPORT_BYTES). */
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
