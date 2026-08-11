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
export type DropReader = "eml" | "msg" | "pdf" | "text" | "unsupported";

export function readerFor(filename: string): DropReader {
  const ext = (filename.split(".").pop() ?? "").toLowerCase();
  if (ext === "eml") return "eml";
  if (ext === "msg") return "msg";
  if (ext === "pdf") return "pdf";
  if (["txt", "md", "csv", "log", "json", "text"].includes(ext)) return "text";
  return "unsupported";
}
