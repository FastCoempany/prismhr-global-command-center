// Sales Navigator's alert emails, read as grabs (2026-10-14).
//
// Sales Navigator mails the same alerts its Home tab shows: a lead shared a
// post, a lead moved jobs, an account's buyer intent rose. An email like that
// names a dozen accounts and is from LinkedIn, so the mail pipeline would
// route it to no one (linkedin.com is no account's domain) and hold it for a
// pick. This module turns it into what it is: the alerts grab the pipeline
// already splits (SALESNAV ALERTS, one row per alert, src/lib/ingest/grab.ts),
// plus a SALESNAV INTENT grab for the intent alerts, which the queue's intent
// read takes (src/lib/groundwork/signals.ts). Each row files on the account
// it names, and an alert that names no book account files nothing.
//
// Three doors hand it an email: the Chute (an .eml or .msg dropped), a Drop
// or the Chute's paste (the Outlook grab of the email), and the inbound
// route (src/app/inbound/salesnav/route.ts), where a mail rule forwards the
// alerts as they arrive.
//
// The email's exact layout is LinkedIn's and unverified here, so the reader
// is a line reader, not a template: an alert starts at a line that reads
// like one ("… shared a post", "… started a new position …", "… is now
// expressing High buyer intent …"), carries the next few lines with it, and
// stops at the next alert or at the footer. A line it does not recognize is
// never an alert. Pure; no model reads the email.

import { isGrab } from "./grab";
import { sniffHead } from "./dialect";
import { chicagoWallToUtc } from "@/lib/tz";

/** Whether a capture is a Sales Navigator alert email: FROM LinkedIn, by
 *  the From line of its own header (the first message, never a quoted
 *  one), about Sales Navigator, and carrying at least one alert line. A
 *  call, a Teams thread or a grab never is. An ordinary thread that merely
 *  mentions Sales Navigator, or quotes an alert a colleague forwarded, has
 *  someone else's From line and files as the thread it is (the Ted
 *  doctrine: the record keeps their real voice). */
export function isSalesNavEmail(
  text: string,
  opts: { forwarded?: boolean } = {},
): boolean {
  const t = (text ?? "").slice(0, 60_000);
  if (isGrab(t)) return false;
  const { dialect } = sniffHead(t);
  if (dialect !== "OL" && dialect !== "SF") return false;
  if (!fromLinkedIn(t, opts.forwarded)) return false;
  if (!/sales\s*navigator/i.test(t)) return false;
  return lines(t).some((l) => alertStart(l) !== null);
}

/** The capture's own From line, the first one in its header block, names a
 *  linkedin.com sender. `forwarded` is for the inbound route only, which a
 *  secret gates and only the operator's own mail rule feeds: a rule that
 *  FORWARDS an alert puts the operator on the outer From line and LinkedIn on
 *  the forwarded block's, so any From line near the top counts there. */
export function fromLinkedIn(text: string, forwarded = false): boolean {
  const head = lines(text).slice(0, forwarded ? 80 : 30);
  const froms = head.filter((l) => /^from\s*:/i.test(l));
  const look = forwarded ? froms : froms.slice(0, 1);
  return look.some((f) => /@(?:[\w-]+\.)*linkedin\.com\b/i.test(f));
}

const lines = (t: string): string[] =>
  t
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim());

// What starts an alert. Person alerts: a post, an article, a job move.
// Account alerts: intent, growth, a company post. The person phrasings are
// the feed's own (the July screenshots) plus LinkedIn's known job wording.
// A person's name as an alert line opens with it: two to five capitalized
// words. "Our client is hiring", "Maria changed jobs" and "she started a new
// position" never open an alert.
const NAME =
  "((?:\\p{Lu}[\\p{L}.'’-]*)(?:\\s+(?:\\p{Lu}[\\p{L}.'’-]*|de|da|del|la|van|von|der|di|le)){1,4})";
const LEAD = "^(?:(?:suggested\\s+)?lead\\s*:\\s*)?";
const PERSON_START = new RegExp(
  `${LEAD}${NAME}\\s+(?:shared|reshared|published)\\s+(?:a\\s+)?(?:post|article)\\b|${LEAD}${NAME}\\s+(?:started a new position|has a new position|has a new role|changed jobs|was recently hired|is in a new role)\\b`,
  "u",
);
const INTENT_START =
  /^(?:increase in buyer intent\s*[:·-]?\s*)?(.+?)\s+is now expressing\s+(high|moderate)\s+buyer intent\b/i;
const ACCOUNT_START =
  /^(?:(?:suggested\s+)?account\s*:\s*)?(.+?)\s+(?:is preparing for growth|posted a new\b|was mentioned in the news|is hiring)\b/i;

type Start = { kind: "person" | "intent" | "account" };

function alertStart(line: string): Start | null {
  if (!line || line.length > 300) return null;
  if (INTENT_START.test(line)) return { kind: "intent" };
  if (PERSON_START.test(line)) return { kind: "person" };
  if (ACCOUNT_START.test(line)) return { kind: "account" };
  return null;
}

// The footer and the furniture: where an alert's lines stop, and lines that
// never belong to one.
const STOP =
  /^(?:unsubscribe|manage (?:your )?(?:alert|email|notification)|view (?:all|more)\b|see all\b|you are receiving|this email was (?:intended|sent)|©|linkedin corporation|help center|privacy policy|learn why we included this|increase in buyer intent\b)/i;
const FURNITURE =
  /^(?:view|view post|view profile|view insights|view growth insights|save|message|bookmark|dismiss|more|open|see more|·|\||-+|https?:\/\/\S+)$/i;

/** The email's sent moment as the grab's "captured …" stamp (en-US, the
 *  Chicago clock), from its Date: or Sent: header; null when it carries
 *  none, and the caller stamps the filing moment. */
export function sentStamp(text: string): string | null {
  const head = lines(text).slice(0, 40);
  for (const l of head) {
    const m = /^(?:date|sent)\s*:\s*(.+)$/i.exec(l);
    if (!m) continue;
    const raw = m[1]!.replace(/\s+at\s+/i, " ").trim();
    // A stamp with its own zone (RFC 2822's -0500, ISO's Z) reads as given.
    // Outlook's "Tuesday, October 13, 2026 12:30 AM" carries none: it is the
    // operator's clock, Chicago, whatever zone the server runs in.
    const zoned =
      /(?:[+-]\d{2}:?\d{2}|\bZ\b|\b(?:GMT|UTC|CST|CDT|EST|EDT|PST|PDT)\b)\s*$/i.test(raw);
    const t = zoned ? Date.parse(raw) : wallAsChicago(raw);
    if (!Number.isNaN(t)) return stamp(new Date(t));
  }
  return null;
}

/** A zoneless date string read as Chicago's wall clock: parsed as if UTC to
 *  take its fields, then placed on Chicago's offset for that day. */
function wallAsChicago(raw: string): number {
  const asUtc = Date.parse(`${raw} UTC`);
  if (Number.isNaN(asUtc)) return NaN;
  const d = new Date(asUtc);
  return chicagoWallToUtc(
    d.getUTCFullYear(),
    d.getUTCMonth() + 1,
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
    d.getUTCSeconds(),
  );
}

const stamp = (d: Date): string =>
  d.toLocaleString("en-US", { timeZone: "America/Chicago" });

/** The alerts in an email, each as its own block of lines. */
export function alertBlocks(text: string): { kind: Start["kind"]; lines: string[] }[] {
  const out: { kind: Start["kind"]; lines: string[] }[] = [];
  let cur: { kind: Start["kind"]; lines: string[] } | null = null;
  for (const l of lines(text)) {
    if (!l) continue;
    if (STOP.test(l)) {
      cur = null;
      continue;
    }
    const s = alertStart(l);
    if (s) {
      cur = { kind: s.kind, lines: [l] };
      out.push(cur);
      continue;
    }
    // An alert carries its company or title line, its time and the post's
    // opening words: three lines at most, furniture skipped.
    if (cur && cur.lines.length < 4 && !FURNITURE.test(l)) cur.lines.push(l);
  }
  return out;
}

/** The grabs an alert email files as: SALESNAV ALERTS for the person and
 *  account alerts, SALESNAV INTENT for the intent alerts, each with the
 *  email's own sent moment as its capture stamp. Empty when the capture is
 *  not one. */
export function grabsFromSalesNavEmail(
  text: string,
  now: Date = new Date(),
  opts: { forwarded?: boolean } = {},
): string[] {
  if (!isSalesNavEmail(text, opts)) return [];
  const when = sentStamp(text) ?? stamp(now);
  const blocks = alertBlocks(text);
  const join = (bs: typeof blocks) =>
    bs.map((b) => b.lines.join("\n")).join("\n\n----\n\n");
  const alerts = blocks.filter((b) => b.kind !== "intent");
  const intent = blocks.filter((b) => b.kind === "intent");
  const out: string[] = [];
  if (alerts.length)
    out.push(
      `SALESNAV ALERTS - captured ${when} - ${alerts.length} alerts - from an alert email\n\n${join(alerts)}`,
    );
  if (intent.length)
    out.push(
      `SALESNAV INTENT - captured ${when} - ${intent.length} accounts - from an alert email\n\n${join(intent)}`,
    );
  return out;
}

/** The grabs a capture files as: itself when it is a grab, the alert
 *  email's grabs when it is one, and nothing otherwise. The one question
 *  every door asks before it routes a capture whole. */
export function grabsFrom(text: string, now: Date = new Date()): string[] {
  const t = (text ?? "").trim();
  if (isGrab(t)) return [t];
  return grabsFromSalesNavEmail(t, now);
}
