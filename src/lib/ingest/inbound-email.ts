// The inbound route's readers (2026-10-14; src/app/inbound/salesnav/
// route.ts): the shared-secret check, and an inbound service's post read as
// the email text the Sales Navigator converter takes. Pure, so the suite can
// hold every shape.

import { timingSafeEqual } from "node:crypto";

/** Whether the request carries the configured secret. False when none is
 *  configured: an unset secret opens nothing. */
export function secretOk(req: {
  headers: { get(name: string): string | null };
  nextUrl: { searchParams: { get(name: string): string | null } };
}): boolean {
  const want = process.env.SALESNAV_INBOUND_SECRET ?? "";
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
