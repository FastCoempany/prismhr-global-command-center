// The inbound route's readers (2026-10-14; src/app/inbound/salesnav/
// route.ts): the shared-secret check, and an inbound service's post read as
// the email text the Sales Navigator converter takes. Pure, so the suite can
// hold every shape.

import { timingSafeEqual } from "node:crypto";
import { emlToPaste, msgToPaste } from "@/lib/paste-files";

/** Whether the request carries the configured secret. False when none is
 *  configured: an unset secret opens nothing. Each inbound route names its
 *  own secret: the Sales Nav alerts' by default, the sent copy's
 *  SENT_INBOUND_SECRET. */
export function secretOk(
  req: {
    headers: { get(name: string): string | null };
    nextUrl: { searchParams: { get(name: string): string | null } };
  },
  envName: "SALESNAV_INBOUND_SECRET" | "SENT_INBOUND_SECRET" = "SALESNAV_INBOUND_SECRET",
): boolean {
  const want = process.env[envName] ?? "";
  if (want.length < 16) return false;
  const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "")?.[1];
  const got =
    bearer ??
    req.headers.get("x-inbound-secret") ??
    req.nextUrl.searchParams.get("key") ??
    "";
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** An HTML email body as plain lines: block ends become line breaks, tags
 *  drop, the common entities decode. */
export function htmlToText(html: string): string {
  return (html ?? "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table|td)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

export type Fields = Record<string, unknown>;
const pick = (f: Fields, ...keys: string[]): string => {
  const lower = new Map(Object.entries(f).map(([k, v]) => [k.toLowerCase(), v]));
  for (const k of keys) {
    const v = lower.get(k.toLowerCase());
    if (typeof v === "string" && v.trim()) return v;
    if (v && typeof v === "object" && "content" in (v as Fields))
      return String((v as Fields).content ?? "");
  }
  return "";
};

/** The email as the converter reads it: From, Subject and Date lines over
 *  the body, the text part first and the HTML part when there is no text. */
export function emailText(f: Fields): string {
  const from = pick(f, "From", "from", "sender", "FromFull");
  const subject = pick(f, "Subject", "subject");
  const date = pick(f, "Date", "date", "receivedDateTime", "sentDateTime");
  const text = pick(f, "TextBody", "text", "body-plain", "stripped-text", "plain");
  const html = pick(f, "HtmlBody", "html", "body-html", "body", "Body");
  const body = text || htmlToText(html);
  const head = [
    from ? `From: ${from}` : "",
    subject ? `Subject: ${subject}` : "",
    date ? `Date: ${date}` : "",
  ].filter(Boolean);
  return [...head, "", body].join("\n");
}

// ── Forwarded attachments (2026-10-15) ──────────────────────────────────────
// The backfill road: select the old Sales Navigator alerts in Outlook,
// "Forward as attachment" to the inbound address, and each attached alert
// files at its own sent date. Postmark posts the attachments in its JSON as
// { Name, ContentType, Content (base64) }; a message attached by Outlook
// arrives as message/rfc822 (.eml), or as an Outlook item (.msg) the route
// reads with msgreader.

export type InboundAttachment = { name: string; type: string; content: string };

/** The message attachments in a post: .eml (message/rfc822) and .msg, at
 *  most MAX_ATTACHED. Anything else (an image, a PDF) is not an alert and is
 *  left alone. */
export const MAX_ATTACHED = 60;
export function messageAttachments(f: Fields): InboundAttachment[] {
  const list = (f.Attachments ?? f.attachments) as unknown;
  if (!Array.isArray(list)) return [];
  const out: InboundAttachment[] = [];
  for (const a of list) {
    if (!a || typeof a !== "object") continue;
    const o = a as Record<string, unknown>;
    const name = String(o.Name ?? o.name ?? "");
    const type = String(o.ContentType ?? o.contentType ?? o.content_type ?? "");
    const content = String(o.Content ?? o.content ?? "");
    if (!content) continue;
    const isEml = /message\/rfc822/i.test(type) || /\.eml$/i.test(name);
    const isMsg = /vnd\.ms-outlook/i.test(type) || /\.msg$/i.test(name);
    if (!isEml && !isMsg) continue;
    out.push({ name: name || (isMsg ? "attached.msg" : "attached.eml"), type, content });
    if (out.length >= MAX_ATTACHED) break;
  }
  return out;
}

/** An attached .eml as the text the Sales Navigator converter reads: the
 *  same reader a .eml dropped on the Chute takes. */
export function attachedEmlText(a: InboundAttachment): string {
  const raw = Buffer.from(a.content, "base64").toString("utf8");
  return emlToPaste(raw, a.name);
}

/** Any attached message as the text the Sales Navigator converter reads:
 *  .eml through attachedEmlText, .msg through msgreader the way the Chute
 *  reads a dropped .msg (src/app/room/read-file.ts). An attachment that will
 *  not read is empty text, so one bad item never sinks the batch. */
export async function attachedText(a: InboundAttachment): Promise<string> {
  try {
    const isMsg = /vnd\.ms-outlook/i.test(a.type) || /\.msg$/i.test(a.name);
    if (!isMsg) return attachedEmlText(a);
    const { default: MsgReader } = await import("@kenjiuno/msgreader");
    const buf = Buffer.from(a.content, "base64");
    const data = new MsgReader(
      buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
    ).getFileData();
    return msgToPaste(
      {
        subject: data.subject,
        senderName: data.senderName,
        senderEmail: data.senderEmail,
        recipients: (data.recipients ?? []).map((r) => ({
          name: r.name,
          email: r.email ?? r.smtpAddress,
        })),
        body: data.body,
        messageDeliveryTime: data.messageDeliveryTime,
      },
      a.name,
    );
  } catch {
    return "";
  }
}
