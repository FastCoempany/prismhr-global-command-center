// The Drop's file readers — pure functions that turn a dropped file into the
// paste text the room's readers already understand. An .eml or .msg becomes an
// OUTLOOK THREAD capture (the head token the dialect detector and the AI read
// both key on); plain-text files pass through as they are. The sniffer names
// what the Drop is holding, so the operator sees the read before filing.
// Isomorphic on purpose: no DOM, no Node APIs — usable from the client and
// from tests alike.

export type PasteKind = "outlook" | "teams" | "salesnav" | "sf" | "transcript" | "note";

// What the Drop thinks it is holding, in plain words for the live chip.
export function sniffPaste(text: string): { kind: PasteKind; label: string } {
  const t = (text ?? "").trimStart();
  if (/^CALL TRANSCRIPT\b/.test(t))
    return { kind: "transcript", label: "a call transcript" };
  if (/^OUTLOOK THREAD\b/.test(t)) return { kind: "outlook", label: "an Outlook thread" };
  if (/^(TEAMS THREAD|TEAMS CHAT)\b/.test(t))
    return { kind: "teams", label: "a Teams chat" };
  if (/^SALESNAV\b/.test(t)) return { kind: "salesnav", label: "a Sales Nav grab" };
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

// ── The duplicate guard's fingerprint ───────────────────────────────────────
// The same capture filed to the same account must never enter the record
// twice. The fingerprint survives whitespace and casing drift (a re-export or
// a re-copy of the same thread), and two FNV-1a passes with different seeds
// keep accidental collisions out of range for a book this size.

export function pasteFingerprint(text: string): string {
  const norm = (text ?? "").toLowerCase().replace(/\s+/g, " ").trim();
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

export type EmlMessage = {
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

export function parseVtt(raw: string): string {
  // Block-based, per the WebVTT grammar: cues separate on blank lines, and a
  // cue is [optional identifier line] + [timing line] + [text lines]. Reading
  // block-wise is what keeps Teams' GUID cue identifiers out of the text —
  // everything up to and including the "-->" line is machinery, never words.
  const blocks = (raw ?? "").replace(/\r\n/g, "\n").split(/\n{2,}/);
  const out: { speaker: string; text: string }[] = [];
  let cur: { speaker: string; text: string } | null = null;
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim());
    if (lines.length === 0) continue;
    const head = lines[0].trim();
    if (/^WEBVTT/i.test(head) || /^(NOTE|STYLE|REGION)\b/.test(head)) continue;
    const timingAt = lines.findIndex((l) => l.includes("-->"));
    // No timing line = not a cue (a stray header block); nothing here is words.
    if (timingAt === -1) continue;
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
      if (cur && cur.speaker === speaker) cur.text += ` ${text}`;
      else {
        cur = { speaker, text };
        out.push(cur);
      }
    }
  }
  return out
    .map((c) => (c.speaker ? `${c.speaker}: ${c.text}` : c.text))
    .join("\n")
    .trim();
}

// The paste text a .vtt becomes — headed CALL TRANSCRIPT so the dialect
// detector, the rule parsers, and the AI read all know what they hold.
export function vttToPaste(raw: string, filename: string): string {
  return `CALL TRANSCRIPT — dropped file ${filename}\n\n${parseVtt(raw)}`.trim();
}

// ── Outlook .msg reading — fields come from the caller's msgreader pass ─────

export type MsgFields = {
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
export type DropReader =
  | "eml"
  | "msg"
  | "pdf"
  | "vtt"
  | "text"
  | "sheet"
  | "docx"
  | "image"
  | "unsupported";

// The one accept list both doors share — the row's Drop and the Chute must
// never disagree about what the app can swallow.
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

// A spreadsheet as paste text: sheet by sheet, tab-separated, capped hard so
// a 40k-row export can't flood the read. The reader downstream treats it as
// plain text intelligence like anything else.
export function sheetToPaste(
  sheets: { name: string; rows: unknown[][] }[],
  filename: string,
): string {
  const out: string[] = [`SPREADSHEET — ${filename}`];
  let budget = 30000;
  for (const s of sheets.slice(0, 4)) {
    out.push(`\n== sheet: ${s.name} ==`);
    for (const row of s.rows.slice(0, 400)) {
      const line = row
        .map((c) => (c == null ? "" : String(c).replace(/\s+/g, " ").trim()))
        .join("\t")
        .replace(/\t+$/g, "");
      if (!line.trim()) continue;
      budget -= line.length;
      if (budget <= 0) {
        out.push("[trimmed — the sheet continues]");
        return out.join("\n");
      }
      out.push(line);
    }
    if (s.rows.length > 400) out.push(`[${s.rows.length - 400} more rows trimmed]`);
  }
  return out.join("\n");
}
