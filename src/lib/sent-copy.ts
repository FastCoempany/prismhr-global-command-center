// The sent copy (ship order 2026-10-19; CLAUDE.md, "The draft on the
// stage"): the operator's sent email, posted by a Power Automate flow, is
// read here into the Outlook thread text the paste pipeline takes, and
// routed by its recipients alone. Pure, so the suite holds every shape.
//
// Two shapes arrive. The flow's HTTP action posts the message's own fields
// as JSON (To, Cc, Subject, Body, DateTimeSent). The flow's "Forward an
// email" action reaches an inbound mail service instead, which posts the
// forward; the original's header block sits inside the forwarded body.

import { htmlToText, type Fields } from "@/lib/ingest/inbound-email";
import { routeCapture, type RouteAccount, type RouteHit } from "@/lib/route-capture";

export type SentCopy = {
  from: string;
  to: string;
  cc: string;
  subject: string;
  sent: string;
  body: string;
};

const EMAIL_RE = /[a-z0-9][a-z0-9._%+-]*@[a-z0-9.-]+\.[a-z]{2,}/gi;

/** Every address a header line names, lowercase, each once. */
export function addressesIn(s: string): string[] {
  return [...new Set((s ?? "").match(EMAIL_RE)?.map((a) => a.toLowerCase()) ?? [])];
}

const get = (f: Fields, ...keys: string[]): unknown => {
  const lower = new Map(Object.entries(f).map(([k, v]) => [k.toLowerCase(), v]));
  for (const k of keys) {
    const v = lower.get(k.toLowerCase());
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

/** A recipients field as one header line: a string as it stands, or Graph's
 *  [{ emailAddress: { name, address } }] list. */
function recipientsLine(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (!Array.isArray(v)) return "";
  return v
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      const e = (o.emailAddress ?? o) as Record<string, unknown>;
      const name = String(e.name ?? e.Name ?? "").trim();
      const addr = String(e.address ?? e.Address ?? "").trim();
      return addr ? (name ? `${name} <${addr}>` : addr) : name;
    })
    .filter(Boolean)
    .join("; ");
}

const text = (v: unknown): string => (typeof v === "string" ? v : "");

/** The forwarded original's header block inside a forward's body: the first
 *  From line with a To line and a Subject line beneath it. */
export function forwardedOriginal(body: string): SentCopy | null {
  const lines = (body ?? "").replace(/\r/g, "").split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\*?From:\*?\s/i.test(lines[i])) continue;
    const head: Record<string, string> = {};
    let j = i;
    for (; j < Math.min(lines.length, i + 10); j++) {
      const m = /^\s*\*?(From|Sent|Date|To|Cc|Subject):\*?\s*(.*)$/i.exec(lines[j]);
      if (!m) break;
      head[m[1].toLowerCase()] = m[2].trim();
    }
    if (!head.to || head.subject === undefined) continue;
    return {
      from: head.from ?? "",
      to: head.to,
      cc: head.cc ?? "",
      subject: head.subject,
      sent: head.sent ?? head.date ?? "",
      body: lines.slice(j).join("\n").trim(),
    };
  }
  return null;
}

/** The post as the sent message it carries, or null when it carries none. */
export function sentCopyOf(f: Fields): SentCopy | null {
  const to = recipientsLine(get(f, "To", "toRecipients", "ToFull"));
  const html = text(get(f, "HtmlBody", "body-html", "html"));
  const plain = text(get(f, "TextBody", "body-plain", "text", "plain"));
  let body = text(get(f, "Body", "body", "bodyPreview"));
  if (body && /<[a-z][^>]*>/i.test(body)) body = htmlToText(body);
  body = (plain || body || htmlToText(html)).trim();
  const subject = text(get(f, "Subject", "subject")).trim();
  const from = recipientsLine(get(f, "From", "from", "sender", "FromFull"));
  const sent = text(
    get(f, "DateTimeSent", "sentDateTime", "receivedDateTime", "sentAt", "Date", "date"),
  ).trim();
  // A forward to an inbound mail service: the original is inside the body.
  if (/^\s*(fw|fwd):/i.test(subject) || !to) {
    const original = forwardedOriginal(body);
    if (original) return original;
  }
  if (!to || !body) return null;
  return {
    from,
    to,
    cc: recipientsLine(get(f, "Cc", "ccRecipients", "CcFull")),
    subject,
    sent,
    body,
  };
}

/** The sent copy as the Outlook thread the paste pipeline reads: the head
 *  a dropped .eml becomes, over the message's own words. */
export function sentCopyText(c: SentCopy): string {
  const head = [
    "OUTLOOK THREAD — sent copy",
    c.from ? `From: ${c.from}` : "",
    c.to ? `To: ${c.to}` : "",
    c.cc ? `Cc: ${c.cc}` : "",
    c.sent ? `Sent: ${c.sent}` : "",
    `Subject: ${c.subject || "(no subject)"}`,
  ]
    .filter(Boolean)
    .join("\n");
  return `${head}\n\n${c.body.trim()}`.trim();
}

/** The account the sent copy belongs to, read from its recipients alone and
 *  only by an address or a company domain: a body that mentions another
 *  company routes nothing, a send to our own side or a personal address
 *  routes nothing, and two accounts on one send tie and route nothing. */
export function routeSentCopy(
  c: SentCopy,
  roster: readonly RouteAccount[],
): RouteHit | null {
  const addrs = addressesIn(`${c.to}; ${c.cc}`);
  // Each address routes on its own: two accounts among the recipients is a
  // tie, whichever one an exact address would have favored.
  const hits = new Map<string, RouteHit>();
  for (const a of addrs) {
    const { best } = routeCapture(a, [...roster]);
    if (!best || (best.rung !== "email" && best.rung !== "domain")) continue;
    const prior = hits.get(best.id);
    if (!prior || best.score > prior.score) hits.set(best.id, best);
  }
  return hits.size === 1 ? [...hits.values()][0] : null;
}
