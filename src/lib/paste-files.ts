// The Drop's file readers — pure functions that turn a dropped file into the
// paste text the room's readers already understand. An .eml or .msg becomes an
// OUTLOOK THREAD capture (the head token the dialect detector and the AI read
// both key on); plain-text files pass through as they are. The sniffer names
// what the Drop is holding, so the operator sees the read before filing.
// Isomorphic on purpose: no DOM, no Node APIs — usable from the client and
// from tests alike.

import { HEADS, HEAD_LINE_RE, sniffHead } from "@/lib/ingest/dialect";

type PasteKind = "outlook" | "teams" | "salesnav" | "sf" | "transcript" | "note";

// What the Drop thinks it is holding, in plain words for the live chip. The
// head tokens are the dialect table's (src/lib/ingest/dialect.ts); a
// spreadsheet, a document and a typed note keep the SF token and fall through
// to the shape tests below like any other headless text.
export function sniffPaste(text: string): { kind: PasteKind; label: string } {
  const t = (text ?? "").trimStart();
  const { dialect } = sniffHead(t);
  if (dialect === "CT") return { kind: "transcript", label: "a call transcript" };
  if (dialect === "OL") return { kind: "outlook", label: "an Outlook thread" };
  if (dialect === "TM") return { kind: "teams", label: "a Teams chat" };
  if (dialect === "SN") return { kind: "salesnav", label: "a Sales Nav grab" };
  if (/^(From|Sent|Subject)\s*:/m.test(t) && /^Subject\s*:/m.test(t))
    return { kind: "outlook", label: "an email thread" };
  // Salesforce activity timelines lead entries with a kind word and a date.
  if (
    /\b(Logged? a Call|Email:|Task\b|List Email|Activity Timeline)\b/i.test(t) &&
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b|\b\d{1,2}\/\d{1,2}\b/.test(t)
  )
    return { kind: "sf", label: "Salesforce activity" };
  // Speaker-labeled lines read as a meeting or chat transcript.
  const lines = t.split("\n").filter((l) => l.trim());
  const speakerish = lines.filter((l) => /^[A-Z][\w.'-]+(\s[A-Z][\w.'-]+)?\s*:/.test(l));
  if (lines.length >= 6 && speakerish.length / lines.length > 0.4)
    return { kind: "transcript", label: "a transcript" };
  return { kind: "note", label: "notes" };
}

// ── The typed note's head (ruled 2026-09-25, D14; decided 2026-10-06) ──────
// A typed note is a paste. The ▢ composer's rich path files it under its own
// head, so the source column says "typed" (P3) and the read knows the
// operator wrote it. Only text that reads as notes is stamped: a thread or a
// chat pasted into the composer keeps its own dialect, and text that already
// carries a head keeps it. The ⚡ pane stamps nothing, because it cannot tell
// typing from pasting. The fingerprint skips the head line, so the same note
// re-filed through the ⚡ pane is still the same capture.
export const TYPED_NOTE_HEAD = `${HEADS.typed} — typed on the Drop`;

export function asTypedNote(text: string): string {
  const t = (text ?? "").trim();
  if (!t || sniffHead(t).head || sniffPaste(t).kind !== "note") return t;
  return `${TYPED_NOTE_HEAD}\n${t}`;
}

// ── The duplicate guard's fingerprint ───────────────────────────────────────
// The same capture filed to the same account must never enter the record
// twice. The fingerprint survives whitespace and casing drift (a re-export or
// a re-copy of the same thread), and two FNV-1a passes with different seeds
// keep accidental collisions out of range for a book this size.
//
// The same capture is the same normalized BODY (ruled 2026-09-25, D16 —
// CLAUDE.md, The Chute :305): a renamed file, the .eml and .msg of one mail,
// and a re-copy of one thread all fingerprint alike. The fingerprint
// normalizes exactly four things, and only in the fingerprint — the stored
// body is never rewritten:
//
// 1. The head line every producer writes — "OUTLOOK THREAD — dropped file
//    <name>", "CALL TRANSCRIPT — dropped file <name>", the bookmarklets'
//    "… - captured <date>" — is skipped: it carries the filename or the copy
//    moment, never the capture. The head grammar is the dialect table's own
//    token list (src/lib/ingest/dialect.ts, HEAD_LINE_RE).
// 2. A "Sent:" line's date is read as one instant (ISO), when the date names
//    its zone. emlToPaste writes the Date header as the client wrote it
//    ("Tue, 02 Sep 2026 09:44:00 -0500"); msgToPaste writes msgreader's UTC
//    string ("Tue, 02 Sep 2026 14:44:00 GMT"). One mail, two spellings of one
//    moment. A date without a zone (an Outlook quoted trail's "Tuesday,
//    September 2, 2026 9:44 AM") is left as written — reading it would depend
//    on the machine's clock, and a fingerprint never does.
// 3. A "To:" or "Cc:" line's recipient separator: the .eml header joins
//    addresses with a comma, msgreader's recipient list with a semicolon.
// 4. Casing and whitespace runs (in pasteFingerprint below), so a re-export
//    or a re-copy of one thread reads the same.
const SENT_LINE_RE = /^(sent:[ \t]*)(.+)$/gim;
const RECIPIENT_LINE_RE = /^((?:to|cc):[ \t]*)(.+)$/gim;
// A date that names its zone: an offset, or GMT / UTC / Z.
const ZONED_DATE_RE = /[+-]\d{4}\b|\b(?:GMT|UTC)\b|\dZ\b/;

/** The date of a Sent: line as one ISO instant, or as written when it names
 *  no zone or does not parse. */
function sentInstant(date: string): string {
  const d = date.trim();
  if (!ZONED_DATE_RE.test(d)) return d;
  const ms = Date.parse(d);
  return Number.isNaN(ms) ? d : new Date(ms).toISOString();
}

/** The capture without its producer's head line, its Sent: dates read as
 *  instants and its To:/Cc: separators agreed. */
function fingerprintBody(text: string): string {
  const t = (text ?? "").trimStart();
  const nl = t.indexOf("\n");
  const first = nl >= 0 ? t.slice(0, nl) : t;
  const body = HEAD_LINE_RE.test(first) ? (nl >= 0 ? t.slice(nl + 1) : "") : t;
  return body
    .replace(SENT_LINE_RE, (_, k: string, d: string) => `${k}${sentInstant(d)}`)
    .replace(
      RECIPIENT_LINE_RE,
      (_, k: string, v: string) => `${k}${v.replace(/;/g, ",")}`,
    );
}

export function pasteFingerprint(text: string): string {
  const norm = fingerprintBody(text).toLowerCase().replace(/\s+/g, " ").trim();
  const fnv = (seed: number): number => {
    let h = seed >>> 0;
    for (let i = 0; i < norm.length; i++) {
      h ^= norm.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
  };
  return `${fnv(0x811c9dc5).toString(16)}${fnv(0x1000193).toString(16)}${norm.length.toString(16)}`;
}

// ── RFC 822 (.eml) reading ──────────────────────────────────────────────────

type EmlMessage = {
  subject: string;
  from: string;
  to: string;
  cc: string;
  date: string;
  body: string;
};

// A binary string of bytes read as UTF-8; anything that isn't valid UTF-8
// (or already carries real text above the byte range) comes back untouched.
const utf8FromBinary = (bin: string): string => {
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    const c = bin.charCodeAt(i);
    if (c > 255) return bin;
    bytes[i] = c;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return bin;
  }
};

const decodeQP = (s: string): string =>
  utf8FromBinary(
    s
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))),
  );

const decodeB64 = (s: string): string => {
  try {
    return utf8FromBinary(atob(s.replace(/\s+/g, "")));
  } catch {
    return "";
  }
};

// Encoded-word headers (=?utf-8?B?...?= / =?utf-8?Q?...?=) read as their text.
const decodeHeaderWord = (s: string): string =>
  s.replace(/=\?[^?]+\?([BbQq])\?([^?]*)\?=/g, (_, enc: string, data: string) =>
    /b/i.test(enc) ? decodeB64(data) : decodeQP(data.replace(/_/g, " ")),
  );

export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type MimePart = { headers: Map<string, string>; body: string };

function splitHeadersBody(raw: string): MimePart {
  const norm = raw.replace(/\r\n/g, "\n");
  const cut = norm.indexOf("\n\n");
  const head = cut === -1 ? norm : norm.slice(0, cut);
  const body = cut === -1 ? "" : norm.slice(cut + 2);
  const headers = new Map<string, string>();
  // Unfold continuation lines, then split on ":".
  const unfolded = head.replace(/\n[ \t]+/g, " ");
  for (const line of unfolded.split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    if (!headers.has(key)) headers.set(key, line.slice(i + 1).trim());
  }
  return { headers, body };
}

function decodeBody(part: MimePart): string {
  const enc = (part.headers.get("content-transfer-encoding") ?? "").toLowerCase();
  let body = part.body;
  if (enc.includes("quoted-printable")) body = decodeQP(body);
  else if (enc.includes("base64")) body = decodeB64(body);
  const type = (part.headers.get("content-type") ?? "text/plain").toLowerCase();
  if (type.includes("text/html")) return htmlToText(body);
  return body.trim();
}

// The best readable body: walk multipart trees preferring text/plain, then
// text/html stripped to text. One or two levels of nesting covers real mail.
function bestBody(part: MimePart, depth = 0): string {
  const type = (part.headers.get("content-type") ?? "text/plain").toLowerCase();
  const bm = /boundary="?([^";\s]+)"?/i.exec(part.headers.get("content-type") ?? "");
  if (type.includes("multipart/") && bm && depth < 3) {
    const pieces = part.body
      .split(new RegExp(`--${bm[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:--)?`))
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => splitHeadersBody(p));
    const plain = pieces.find((p) =>
      (p.headers.get("content-type") ?? "").toLowerCase().includes("text/plain"),
    );
    if (plain) return decodeBody(plain);
    const html = pieces.find((p) =>
      (p.headers.get("content-type") ?? "").toLowerCase().includes("text/html"),
    );
    if (html) return decodeBody(html);
    for (const p of pieces) {
      const nested = bestBody(p, depth + 1);
      if (nested) return nested;
    }
    return "";
  }
  return decodeBody(part);
}

export function parseEml(raw: string): EmlMessage {
  const part = splitHeadersBody(raw);
  const h = (k: string) => decodeHeaderWord(part.headers.get(k) ?? "");
  return {
    subject: h("subject"),
    from: h("from"),
    to: h("to"),
    cc: h("cc"),
    date: h("date"),
    body: bestBody(part),
  };
}

// The paste text an .eml becomes — headed OUTLOOK THREAD so the dialect
// detector and the AI read treat it as the email capture it is.
export function emlToPaste(raw: string, filename: string): string {
  const m = parseEml(raw);
  const head = [
    `OUTLOOK THREAD — dropped file ${filename}`,
    m.from ? `From: ${m.from}` : "",
    m.to ? `To: ${m.to}` : "",
    m.cc ? `Cc: ${m.cc}` : "",
    m.date ? `Sent: ${m.date}` : "",
    m.subject ? `Subject: ${m.subject}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return `${head}\n\n${m.body}`.trim();
}

// ── WebVTT (.vtt) reading — call transcripts, the richest capture there is ──
// Teams and Zoom export call recordings as WebVTT: cue numbers, timing lines,
// and text — Teams wraps each line in a voice span (<v Speaker Name>…</v>).
// The reader strips the machinery, names the speakers, and merges a speaker's
// consecutive cues into one line, so the paste reads like the conversation.

/** The cues as speaker-and-text runs. Exported through parseVtt and
 *  vttToPaste; the paste needs to know whether the export named anyone. */
function parseVttRuns(raw: string): { speaker: string; text: string; key: string }[] {
  // Block-based, per the WebVTT grammar: cues separate on blank lines, and a
  // cue is [optional identifier line] + [timing line] + [text lines]. Reading
  // block-wise is what keeps Teams' GUID cue identifiers out of the text —
  // everything up to and including the "-->" line is machinery, never words.
  const blocks = (raw ?? "").replace(/\r\n/g, "\n").split(/\n{2,}/);
  const out: { speaker: string; text: string; key: string }[] = [];
  let cur: { speaker: string; text: string; key: string } | null = null;
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim());
    if (lines.length === 0) continue;
    const head = lines[0].trim();
    if (/^WEBVTT/i.test(head) || /^(NOTE|STYLE|REGION)\b/.test(head)) continue;
    const timingAt = lines.findIndex((l) => l.includes("-->"));
    // No timing line = not a cue (a stray header block); nothing here is words.
    if (timingAt === -1) continue;
    // The cue identifier is machinery in the text, but it carries the one
    // structure a speakerless export has left: Teams splits an utterance
    // across display cues and suffixes them -0, -1, -2 off a shared GUID. On
    // an anonymized export (no <v> tags at all — the 8/27 Infiniti recording)
    // that suffix is the only thing separating one utterance from the next.
    const cueKey = timingAt > 0 ? lines[timingAt - 1].trim().replace(/-\d+$/, "") : "";
    let within = 0;
    for (const line of lines.slice(timingAt + 1)) {
      const t = line.trim();
      if (!t) continue;
      // Some exporters skip the blank line between cues — a timing line inside
      // the text run is a new cue's machinery, never words.
      if (t.includes("-->")) continue;
      let speaker = "";
      let text = t;
      const v = /^<v\s+([^>]+?)\s*>/i.exec(t);
      if (v) {
        speaker = v[1].trim();
        text = t.replace(/^<v[^>]*>/i, "");
      }
      text = text.replace(/<[^>]+>/g, "").trim();
      if (!text) continue;
      // A speaker line without voice tags ("Dana Ellis: …") names itself.
      if (!speaker) {
        const m = /^([A-Z][\w.'-]+(?:\s[A-Z][\w.'-]+){0,3}):\s+(.*)$/.exec(text);
        if (m) {
          speaker = m[1];
          text = m[2];
        } else if (cur) {
          // A continuation line inside a voiced cue keeps its cue's speaker.
          speaker = cur.speaker;
        }
      }
      // A named speaker's consecutive cues merge, as they always have. With NO
      // speaker anywhere, "same speaker" would be true of every cue in the
      // file and the whole call collapsed into one line — 72,504 characters of
      // it on the 8/27 recording. Without a name to run on, the merge runs on
      // the cue identifier instead, and a cue's own continuation lines always
      // belong to it.
      const sameRun =
        cur !== null &&
        cur.speaker === speaker &&
        (speaker !== "" || within > 0 || (cueKey !== "" && cur.key === cueKey));
      if (sameRun) cur!.text += ` ${text}`;
      else {
        cur = { speaker, text, key: cueKey };
        out.push(cur);
      }
      within += 1;
    }
  }
  return out;
}

const runsToText = (runs: { speaker: string; text: string }[]): string =>
  runs
    .map((c) => (c.speaker ? `${c.speaker}: ${c.text}` : c.text))
    .join("\n")
    .trim();

export function parseVtt(raw: string): string {
  return runsToText(parseVttRuns(raw));
}

// The paste text a .vtt becomes — headed CALL TRANSCRIPT so the dialect
// detector, the rule parsers, and the AI read all know what they hold.
export function vttToPaste(raw: string, filename: string): string {
  const runs = parseVttRuns(raw);
  // A .vtt carries no calendar date of its own — only elapsed cue times. The
  // file name is where Teams puts the real moment, so the head carries it and
  // the filing clock can read it (2026-08-29).
  const recorded = recordedAtFromName(filename);
  // Teams can export a recording with every voice tag stripped. Saying so is
  // the honest read, and it is the same line the Word export earns — a name
  // guessed from the words would be a name invented.
  const anonymous = runs.length > 0 && runs.every((r) => !r.speaker);
  const head = [
    `CALL TRANSCRIPT — dropped file ${filename}`,
    recorded ? `Recorded: ${recorded}` : "",
    anonymous ? "Speakers: not labeled in this export" : "",
  ]
    .filter(Boolean)
    .join("\n");
  return `${head}\n\n${runsToText(runs)}`.trim();
}

// ── transcripts that arrive as documents (.docx) ────────────────────────────
// A call transcript is a call transcript whatever file it rides in. Teams'
// Stream player exports the SAME recording two ways: WebVTT, which the reader
// above understands richly, and a Word document, which until now read as a
// generic DOCUMENT and lost the call entirely (the 8/27 Global Payroll Prism
// call with Infiniti HR, 2026-08-28).
//
// The document form is a title line carrying the recording's stamp, then one
// line per cue prefixed with an elapsed timestamp and NO speaker — Stream
// drops the voice tags on the way to Word. So the reader keeps what is there
// and never invents what is not: the timestamps go, the words stay, and no
// line is attributed to anyone.

/** Teams stamps the recording's own moment into the file NAME as well as the
 *  title line: "<meeting>-YYYYMMDD_HHMMSS-Meeting Recording.vtt|.docx". The
 *  name is the only date a WebVTT export carries — its cues are elapsed time,
 *  not calendar time — so without this a call filed two days late reads as a
 *  call that happened today. */
const NAME_STAMP = /-(\d{4})(\d{2})(\d{2})[_-](\d{2})(\d{2})\d{2}-/;

/** Zoom names it "GMT20260903-170218_Recording.transcript.vtt" — no leading
 *  dash, and the stamp is UTC, which the GMT prefix says out loud. Teams'
 *  pattern above never matched it, so a Zoom call filed a day late read as a
 *  call that happened today (the Regis recording, 2026-09-04). */
const ZOOM_STAMP = /GMT(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/;

const p2 = (n: number): string => String(n).padStart(2, "0");

/** "YYYY-MM-DD HH:MM" from a recording's file name, or "".
 *
 *  Teams stamps its local wall clock and is taken as written. Zoom stamps
 *  UTC, so it is converted to the operator's own day before the date is
 *  taken — an 8pm Chicago call carries tomorrow's UTC date in its name, and
 *  reading that literally would file the call a day into the future. */
export function recordedAtFromName(filename: string): string {
  const name = filename ?? "";
  const m = NAME_STAMP.exec(name);
  if (m) return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`;
  const z = ZOOM_STAMP.exec(name);
  if (!z) return "";
  const utc = Date.UTC(
    Number(z[1]),
    Number(z[2]) - 1,
    Number(z[3]),
    Number(z[4]),
    Number(z[5]),
    Number(z[6]),
  );
  if (Number.isNaN(utc)) return "";
  // The Chicago wall clock of that moment — the day the operator was in.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(utc));
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? "";
  const hh = get("hour") === "24" ? "00" : get("hour");
  if (!get("year")) return "";
  return `${get("year")}-${get("month")}-${get("day")} ${p2(Number(hh))}:${get("minute")}`;
}

/** The day a CALL TRANSCRIPT capture says it was recorded, as YYYY-MM-DD, or
 *  "". Read from the head the two transcript readers write — never guessed
 *  from the words, and never from the filing moment. */
export function transcriptRecordedDay(paste: string): string {
  const head = (paste ?? "").slice(0, 400);
  const m = /^Recorded:\s*(\d{4}-\d{2}-\d{2})/m.exec(head);
  return m ? m[1] : "";
}

/** Teams names the recording "<meeting>-YYYYMMDD_HHMMSS-Meeting Recording". */
const RECORDING_TITLE =
  /^(.*?)-(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})\d{2}-Meeting Recording\s*$/;

/** An elapsed-time cue: "0:02", "31:45", "1:04:09" — then the words. */
const CUE_LINE = /^(\d{1,2}:)?\d{1,2}:\d{2}\s*(.*)$/;

type TranscriptDoc = {
  title: string;
  /** "YYYY-MM-DD HH:MM" in the recorder's own wall clock, or "". */
  startedAt: string;
  lines: string[];
};

/** Read a document as a transcript, or null when it plainly is not one. The
 *  bar is deliberate: a title stamp, or enough cue lines that no ordinary
 *  document could pass by accident. */
export function parseTranscriptDoc(raw: string): TranscriptDoc | null {
  const all = (raw ?? "").replace(/\r\n/g, "\n").split("\n");
  let title = "";
  let startedAt = "";
  let from = 0;
  for (let i = 0; i < Math.min(all.length, 5); i++) {
    const m = RECORDING_TITLE.exec(all[i].trim());
    if (!m) continue;
    title = m[1].trim();
    startedAt = `${m[2]}-${m[3]}-${m[4]} ${m[5]}:${m[6]}`;
    from = i + 1;
    break;
  }
  const lines: string[] = [];
  let cues = 0;
  for (const line of all.slice(from)) {
    const t = line.trim();
    if (!t) continue;
    const m = CUE_LINE.exec(t);
    if (m) {
      cues += 1;
      const words = m[2].trim();
      if (words) lines.push(words);
    } else lines.push(t);
  }
  if (!title && cues < 12) return null;
  if (cues === 0) return null;
  if (lines.length === 0) return null;
  return { title, startedAt, lines };
}

/** The paste text a transcript document becomes — the same CALL TRANSCRIPT
 *  head the .vtt path writes, so every reader downstream treats the two
 *  captures identically. */
export function transcriptDocToPaste(doc: TranscriptDoc, filename: string): string {
  const recorded = doc.startedAt || recordedAtFromName(filename);
  const head = [
    `CALL TRANSCRIPT — dropped file ${filename}`,
    doc.title ? `Meeting: ${doc.title}` : "",
    recorded ? `Recorded: ${recorded}` : "",
    // Stream's Word export carries no voice tags. Saying so is the honest
    // read; a name guessed from the words would be a name invented.
    "Speakers: not labeled in this export",
  ]
    .filter(Boolean)
    .join("\n");
  return `${head}\n\n${doc.lines.join("\n")}`.trim();
}

// ── Outlook .msg reading — fields come from the caller's msgreader pass ─────

type MsgFields = {
  subject?: string;
  senderName?: string;
  senderEmail?: string;
  recipients?: { name?: string; email?: string }[];
  body?: string;
  messageDeliveryTime?: string;
};

export function msgToPaste(fields: MsgFields, filename: string): string {
  const from = [fields.senderName, fields.senderEmail && `<${fields.senderEmail}>`]
    .filter(Boolean)
    .join(" ");
  const to = (fields.recipients ?? [])
    .map((r) => [r.name, r.email && `<${r.email}>`].filter(Boolean).join(" "))
    .filter(Boolean)
    .join("; ");
  const head = [
    `OUTLOOK THREAD — dropped file ${filename}`,
    from ? `From: ${from}` : "",
    to ? `To: ${to}` : "",
    fields.messageDeliveryTime ? `Sent: ${fields.messageDeliveryTime}` : "",
    fields.subject ? `Subject: ${fields.subject}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const body = (fields.body ?? "").trim();
  return `${head}\n\n${body}`.trim();
}

// File-type dispatch for the Drop: which reader a filename gets.
type DropReader =
  | "eml"
  | "msg"
  | "pdf"
  | "vtt"
  | "text"
  | "sheet"
  | "docx"
  | "image"
  | "unsupported";

// The accept list both doors read. The rule (ruled 2026-09-25, D2 — CLAUDE.md,
// The Chute :301): the doors agree on everything but the weekly export — the
// Chute probes a .csv for the activity report and hands it to the second
// record; the Drop refuses a .csv and says it goes in the Chute. Anything
// else on this list files the same way from either door.
export const DROP_ACCEPT =
  ".eml,.msg,.pdf,.vtt,.txt,.md,.csv,.log,.json,.xlsx,.xls,.docx,.png,.jpg,.jpeg,.webp,.gif,.heic,.heif";

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif", "heic", "heif"]);

export function readerFor(filename: string): DropReader {
  const ext = (filename.split(".").pop() ?? "").toLowerCase();
  if (ext === "eml") return "eml";
  if (ext === "msg") return "msg";
  if (ext === "pdf") return "pdf";
  if (ext === "vtt") return "vtt";
  if (ext === "xlsx" || ext === "xls") return "sheet";
  if (ext === "docx") return "docx";
  if (IMAGE_EXTS.has(ext)) return "image";
  if (["txt", "md", "csv", "log", "json", "text"].includes(ext)) return "text";
  return "unsupported";
}

// A spreadsheet as paste text: sheet by sheet, tab-separated, every sheet and
// every row. The reader hands the text on whole (ruled 2026-10-07, pass 8
// call 3: every reader hands on the text whole, and only what goes to a model
// is windowed). roomPaste windows its own read of a long sheet and the
// receipt says so (D4); the note and the vault keep it whole. The reader
// downstream treats it as plain text intelligence like anything else.
type Sheet = { name: string; rows: unknown[][] };

const rowLine = (row: unknown[]): string =>
  row
    .map((c) => (c == null ? "" : String(c).replace(/\s+/g, " ").trim()))
    .join("\t")
    .replace(/\t+$/g, "");

export function sheetToPaste(sheets: Sheet[], filename: string): { text: string } {
  const out: string[] = [`SPREADSHEET — ${filename}`];
  for (const s of sheets) {
    out.push(`\n== sheet: ${s.name} ==`);
    for (const row of s.rows) {
      const line = rowLine(row);
      if (line.trim()) out.push(line);
    }
  }
  return { text: out.join("\n") };
}
