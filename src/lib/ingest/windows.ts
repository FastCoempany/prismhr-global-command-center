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
// one exception is the transport, below.

/** The most a capture's text may weigh on its way to the server, in bytes of
 *  the encoded argument. The text travels as a server action argument, and
 *  the platform refuses a request over its cap: Vercel's 4.5 MB request
 *  limit, which next.config.ts's serverActions.bodySizeLimit ("4400kb")
 *  stays under. A text above it used to fail its filing outright, so
 *  nothing fanned out. Under it, every reader hands on the text whole (pass
 *  8 call 3); above it, the reader windows the text to fit, records the
 *  window like any other (D4: it shows on the receipt's amber line) and
 *  files, and the vault still keeps the whole file. 4 MB leaves room under
 *  the cap for the action's other arguments and its encoding. */
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

/** The text cut to what the transport carries (TRANSPORT_BYTES), head kept,
 *  never splitting a surrogate pair. The window is returned only when
 *  something was cut, so a text under the limit passes whole. */
export function transportCut(
  what: string,
  text: string,
  bytes: number = TRANSPORT_BYTES,
): { text: string; window: Window | null } {
  const t = text ?? "";
  let used = 2; // the encoded string's two quotes
  for (let i = 0; i < t.length; i++) {
    const cost = unitCost(t, i);
    // A high surrogate that does not fit leaves with its low half, so the
    // cut never splits a pair.
    if (used + cost > bytes)
      return { text: t.slice(0, i), window: { what, read: i, of: t.length } };
    used += cost;
  }
  return { text: t, window: null };
}

/** The most entries one read files, and the most the model is asked for. */
export const ENTRY_CAP = 40;

/** The least text the pipeline reads: under this a capture is nothing to
 *  file, and a transcription under it came back empty. */
export const TEXT_FLOOR = 20;

/** A window that cut something: what was cut, how much was read, how much
 *  arrived. Stored on the Filing row and read by the receipt (D4). */
export type Window = {
  /** The thing that was cut, as the receipt says it: "the paste", or "the
   *  file" and "the text" when the transport cut a dropped file or a pasted
   *  text (TRANSPORT_BYTES). */
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
