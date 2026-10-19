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
 *  From line with a To line and a Subject line beneath it. Blank lines
 *  inside the block are skipped, because an HTML message turned to text puts
 *  one between every paragraph. */
export function forwardedOriginal(body: string): SentCopy | null {
  const lines = (body ?? "").replace(/\r/g, "").split("\n");
  const HEAD = /^\s*\*?(From|Sent|Date|To|Cc|Subject):\*?\s*(.*)$/i;
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\*?From:\*?\s/i.test(lines[i])) continue;
    const head: Record<string, string> = {};
    let j = i;
    for (; j < Math.min(lines.length, i + 16); j++) {
      if (!lines[j].trim()) continue;
      const m = HEAD.exec(lines[j]);
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

// ── The relay (2026-10-19) ───────────────────────────────────────────────
// Without Power Automate's Premium HTTP step, a flow mails a copy instead:
// the standard "Send an email (V2)" step to the inbound address the Sales
// Nav alerts already use, subject tagged, body opening with the original's
// header block. The inbound service posts it to /inbound/salesnav as it does
// every message, and that route hands a tagged one here.

/** The subject tag a relayed sent copy carries. */
export const RELAY_SENT_TAG = "[GW-SENT]";
/** The subject tag a relayed inbox copy carries. */
export const RELAY_INBOX_TAG = "[GW-IN]";
/** The subject tag a relayed calendar event carries. */
export const RELAY_CAL_TAG = "[GW-CAL]";

export type RelayKind = "sent" | "inbox" | "calendar";

/** Which relay a post is, read from its subject's tag, and the message it
 *  carries. Null when the post is not a relay or carries no header block. */
export function relayedCopy(f: Fields): { kind: RelayKind; copy: SentCopy } | null {
  const subject = text(get(f, "Subject", "subject"))
    .trim()
    .toUpperCase();
  const kind: RelayKind | null = subject.startsWith(RELAY_SENT_TAG)
    ? "sent"
    : subject.startsWith(RELAY_INBOX_TAG)
      ? "inbox"
      : subject.startsWith(RELAY_CAL_TAG)
        ? "calendar"
        : null;
  if (!kind) return null;
  const plain = text(get(f, "TextBody", "body-plain", "text", "plain", "stripped-text"));
  const html = text(get(f, "HtmlBody", "body-html", "html", "Body", "body"));
  const copy = forwardedOriginal(plain.trim() ? plain : htmlToText(html));
  return copy ? { kind, copy } : null;
}

/** A relayed sent copy, read from the inbound service's post: the tagged
 *  subject, then the original's header block in the body. Null when the post
 *  is not one. */
export function relayedSentCopy(f: Fields): SentCopy | null {
  const r = relayedCopy(f);
  return r?.kind === "sent" ? r.copy : null;
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
export function sentCopyText(c: SentCopy, label = "sent copy"): string {
  const head = [
    `OUTLOOK THREAD — ${label}`,
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

/** Our own side's mail domains. A send to a colleague, or a colleague's
 *  mail in the inbox, routes nothing, even when the book holds one of
 *  ours as an account's contact. */
export const OUR_DOMAINS: ReadonlySet<string> = new Set(["prismhr.com", "vensure.com"]);

const ours = (addr: string): boolean => OUR_DOMAINS.has(addr.split("@")[1] ?? "");

/** One address, routed by an exact address or a company domain alone. */
function routeAddress(a: string, roster: readonly RouteAccount[]): RouteHit | null {
  if (ours(a)) return null;
  const { best } = routeCapture(a, [...roster]);
  return best && (best.rung === "email" || best.rung === "domain") ? best : null;
}

/** The account the sent copy belongs to, read from its recipients alone and
 *  only by an address or a company domain: a body that mentions another
 *  company routes nothing, a send to our own side or a personal address
 *  routes nothing, and two accounts on one send tie and route nothing. */
export function routeSentCopy(
  c: SentCopy,
  roster: readonly RouteAccount[],
): RouteHit | null {
  // Each address routes on its own: two accounts among the recipients is a
  // tie, whichever one an exact address would have favored.
  const hits = new Map<string, RouteHit>();
  for (const a of addressesIn(`${c.to}; ${c.cc}`)) {
    const best = routeAddress(a, roster);
    if (!best) continue;
    const prior = hits.get(best.id);
    if (!prior || best.score > prior.score) hits.set(best.id, best);
  }
  return hits.size === 1 ? [...hits.values()][0] : null;
}

// ── The inbox copy (2026-10-19) ──────────────────────────────────────────
// A second flow relays the inbox the same way, tagged [GW-IN]: mail from an
// account's people files on that account, so replies owed, ↩ REPLIED and
// the live-motion exclusion read it without a drag to the Chute. It routes
// by the sender alone. A bulk or role sender (noreply, newsletters, the
// marketing desk) is machinery and routes nothing: a company's blast is
// never their voice, and it must not lift an account off the queue.

const ROLE_SENDER =
  /^(no-?reply|do-?not-?reply|donotreply|notifications?|notify|alerts?|news(letter)?s?|marketing|info|hello|team|support|help|billing|invoices?|accounts?|admin|mailer-daemon|postmaster|bounces?|updates|events?|webinars?|careers|jobs|hr|payroll|sales)([._+-].*)?$/i;

/** The account an inbox copy belongs to: its sender's exact address or
 *  company domain, never a role or bulk sender, never our own side. */
export function routeInboxCopy(
  c: SentCopy,
  roster: readonly RouteAccount[],
): RouteHit | null {
  const from = addressesIn(c.from)[0];
  if (!from || ROLE_SENDER.test(from.split("@")[0] ?? "")) return null;
  return routeAddress(from, roster);
}

// ── The calendar copy (2026-10-19) ───────────────────────────────────────
// A daily flow at the day's end relays each calendar event that started
// today, tagged [GW-CAL]: the organizer on the From line, the start on the
// Sent line, the attendees on To and Cc. An event with an account's people
// files on that account as a meeting held, so the live-motion exclusion,
// the touch clock and the recap read it with no note typed. It routes by
// the attendees, as the sent copy routes by recipients, and our own side
// never routes. An event that has not started yet, or one the calendar
// marks cancelled or declined, is not a meeting held and files nothing.

const CANCELLED_RE = /^\s*(cancel+ed|declined)\s*:/i;

const clock = (d: Date): string =>
  d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  });

/** The record row a calendar event files as: a logged meeting (✔) on the
 *  event's own start, with the people the account matched. Its head names
 *  the meeting and nothing else, so the meeting read never mistakes the
 *  event's own title ("Follow-up", "Prep") for a meeting in doubt; the
 *  title rides on the line beneath. Null, with the reason, when the event
 *  is not a meeting held. */
export function calendarMeeting(
  c: SentCopy,
  people: readonly { email: string; name: string }[],
  now: Date,
  operator: string,
): { at: Date; body: string; actors: string; recipients: string } | { skip: string } {
  if (CANCELLED_RE.test(c.subject))
    return { skip: "Cancelled or declined. Nothing filed." };
  // The calendar view hands its times in UTC without a zone mark
  // ("2026-10-19T19:00:00.0000000"); read a bare one as UTC.
  const raw = c.sent.trim();
  const at = new Date(
    /^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(raw)
      ? `${raw.replace(/(\.\d{3})\d+$/, "$1")}Z`
      : raw,
  );
  if (Number.isNaN(at.getTime())) return { skip: "No start time. Nothing filed." };
  if (at.getTime() > now.getTime()) return { skip: "Not started yet. Nothing filed." };
  const names = people.map((p) => p.name || p.email).filter(Boolean);
  const who = names[0] ?? "";
  const actors = `${operator} → ${who}${names.length > 1 ? ` +${names.length - 1}` : ""}`;
  const body = [
    `✔ OL ${clock(at)} — Meeting held · ${actors}`,
    c.subject ? `On the calendar: ${c.subject}` : "",
    `With: ${names.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
  return { at, body, actors, recipients: names.join(", ") };
}

/** The account a calendar event belongs to and the attendees that placed
 *  it there: the attendees routed one by one, exactly one account among
 *  them, our own side never. */
export function routeCalendarCopy(
  c: SentCopy,
  roster: readonly RouteAccount[],
): { hit: RouteHit; emails: string[] } | null {
  const hit = routeSentCopy(c, roster);
  if (!hit) return null;
  const emails = addressesIn(`${c.to}; ${c.cc}`).filter(
    (a) => routeAddress(a, roster)?.id === hit.id,
  );
  return { hit, emails };
}
