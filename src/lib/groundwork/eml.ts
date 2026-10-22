// An unsent Outlook draft that carries files (ship order
// 2026-10-22: Send in Outlook attaches what the picker ticks). A mailto
// link carries no files, so with a file ticked the stage downloads this
// instead: X-Unsent opens it in Outlook as a draft with To, Subject, the
// words and the files in place. Pure, so the browser builds it and the
// suite reads the same bytes. The words and every file go base64, so no
// line runs past what mail allows, and a non-ASCII subject or name is
// encoded the way mail expects (RFC 2047).

export type EmlFile = { name: string; mime: string; bytes: Uint8Array };

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Base64 of the bytes, in one pass. */
export function base64(bytes: Uint8Array): string {
  const out: string[] = [];
  let line = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    line +=
      B64[(n >> 18) & 63] +
      B64[(n >> 12) & 63] +
      (i + 1 < bytes.length ? B64[(n >> 6) & 63] : "=") +
      (i + 2 < bytes.length ? B64[n & 63] : "=");
    if (line.length >= 4096) {
      out.push(line);
      line = "";
    }
  }
  out.push(line);
  return out.join("");
}

/** Base64 cut into the 76-character lines mail carries. */
export function wrap76(b64: string): string {
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 76) lines.push(b64.slice(i, i + 76));
  return lines.join("\r\n");
}

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

/** A header word as mail carries it: plain when it is ASCII, else RFC 2047
 *  encoded words of at most 45 bytes each. */
export function headerWord(s: string): string {
  const clean = s.replace(/[\r\n]+/g, " ");
  if (/^[\x20-\x7e]*$/.test(clean)) return clean;
  const words: string[] = [];
  let chunk = "";
  for (const ch of clean) {
    if (utf8(chunk + ch).length > 45) {
      words.push(`=?UTF-8?B?${base64(utf8(chunk))}?=`);
      chunk = "";
    }
    chunk += ch;
  }
  if (chunk) words.push(`=?UTF-8?B?${base64(utf8(chunk))}?=`);
  return words.join("\r\n ");
}

/** A file name as a MIME parameter, quoted. */
const param = (s: string): string => `"${headerWord(s).replace(/"/g, "'")}"`;

/** The draft: To, Subject, the words, and the files, as Outlook opens an
 *  unsent message. `stamp` names the moment and makes the boundary and the
 *  Message-ID one's own. */
export function draftWithFiles(input: {
  to: { name: string; email: string };
  subject: string;
  body: string;
  files: readonly EmlFile[];
  stamp: Date;
}): string {
  const tag = input.stamp.getTime().toString(36);
  const boundary = `=_prismhr_${tag}`;
  const to = input.to.email
    ? input.to.name
      ? `${headerWord(input.to.name)} <${input.to.email}>`
      : input.to.email
    : "";
  const head = [
    ...(to ? [`To: ${to}`] : []),
    `Subject: ${headerWord(input.subject)}`,
    `Date: ${input.stamp.toUTCString().replace("GMT", "+0000")}`,
    `Message-ID: <${tag}.draft@prismhr-global>`,
    "X-Unsent: 1",
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];
  const parts = [
    [
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "Content-Transfer-Encoding: base64",
      "",
      wrap76(base64(utf8(input.body.replace(/\r?\n/g, "\r\n")))),
    ].join("\r\n"),
    ...input.files.map((f) =>
      [
        `--${boundary}`,
        `Content-Type: ${f.mime}; name=${param(f.name)}`,
        `Content-Disposition: attachment; filename=${param(f.name)}`,
        "Content-Transfer-Encoding: base64",
        "",
        wrap76(base64(f.bytes)),
      ].join("\r\n"),
    ),
  ];
  return `${head.join("\r\n")}\r\n\r\n${parts.join("\r\n")}\r\n--${boundary}--\r\n`;
}
