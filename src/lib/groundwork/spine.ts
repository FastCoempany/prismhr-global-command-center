// The Sales Nav spine (Concept C, ship order 2026-10-15): every Sales
// Navigator alert about a book account in the last seven days, newest first,
// under TODAY / YESTERDAY / THIS WEEK, in the fourth column on Groundwork.
//
// It reads the notes the grabs and the alert emails already file, and
// nothing else: the alerts feed and the alert emails (SALESNAV ALERTS), the
// intent alerts (SALESNAV INTENT), and the daily accounts grab, whose
// "Recently hired" badge and intent rise are events too. Each alert keeps
// the Sales Navigator pages its email carried (src/lib/ingest/
// salesnav-links.ts); an alert from the feed grab carries none, and its
// buttons fall back to a Sales Navigator search by name.
//
// The alerts that feed a queue rule (a post, a job move, an intent rise)
// carry the rule, so working one on the spine stamps the same move the
// queue reads, and the move leaves the waiting wing. The rest are read-only
// facts about an account: they get links and a ✕, never a draft, because no
// reason to write exists until something happened. Pure.

import { isSalesNav } from "@/lib/ingest/dialect";
import {
  companyIdOf,
  isLinkLine,
  readLinkLine,
  salesNavSearch,
} from "@/lib/ingest/salesnav-links";
import { redactMoney } from "@/lib/intel/lexicon";
import { personKey } from "@/lib/book/contacts";
import { userDayKey } from "@/lib/tz";
import {
  capturedOf,
  grabKind,
  intentRise,
  parseAlerts,
  peopleSignalsFor,
  relativeDays,
  sameCompany,
} from "./signals";
import type { QueueRuleId } from "./day";
import { KIND_RULE, type SpineKind } from "./spine-kinds";

type NoteLike = { body: string; source: string; createdAt: string };

export { KIND_GROUP, KIND_RULE, type SpineKind } from "./spine-kinds";

export type SpineLink = { label: string; href: string };

export type SpineItem = {
  /** Stable across reloads and across the two sources one alert can come
   *  through, so a ✕ holds. */
  key: string;
  kind: SpineKind;
  /** The mono kicker: "POSTED", "LEFT FOR NEXTEP", "INTENT ↑ HIGH". */
  label: string;
  accountId: string;
  account: string;
  who: string;
  title: string;
  /** The company a job alert names (where they went, or came from). */
  company: string;
  /** The alert in one plain sentence. */
  line: string;
  /** A post's opening words, when the alert carried them. */
  quote: string;
  /** ISO: when it happened, as near as the alert says. */
  at: string;
  /** "today" | "yesterday" | "week": the spine's three day kickers. */
  when: "today" | "yesterday" | "week";
  links: SpineLink[];
  rule: QueueRuleId | null;
};

export const SPINE_DAYS = 7;
/** Two sightings of one person's post this close together are one post. */
const POST_MERGE_HOURS = 36;
const DAY_MS = 86_400_000;

/** djb2, the wire's own hash, kept here so the client never imports the
 *  wire module. */
function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

const ROW_SEP = /^[ \t]*-{4,}[ \t]*$/m;

function rowsOf(body: string): { head: string; rows: string[] } {
  const t = (body ?? "").trim();
  const nl = t.indexOf("\n");
  const head = (nl >= 0 ? t.slice(0, nl) : t).trim();
  const rows = (nl >= 0 ? t.slice(nl + 1) : "")
    .split(ROW_SEP)
    .map((r) => r.trim())
    .filter(Boolean);
  return { head, rows };
}

const linesOf = (row: string): string[] =>
  row
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** When a row's alert happened: the capture moment minus the row's own
 *  "2 days", or the filing moment when the head carries none. */
function rowAt(head: string, row: string, filedAt: string): string {
  const cap = capturedOf(head);
  const base = Number.isNaN(cap) ? Date.parse(filedAt) : cap;
  const rel = linesOf(row)
    .map(relativeDays)
    .find((d) => d != null);
  const t = base - (rel ?? 0) * DAY_MS;
  return Number.isNaN(t) ? filedAt : new Date(t).toISOString();
}

// The account alerts, by their first line: what the feed and the digest
// email write (the operator's own "Naomi Walsh shared a post" digest).
const ACCOUNT_KINDS: {
  re: RegExp;
  kind: SpineKind;
  line: (m: RegExpExecArray) => string;
}[] = [
  {
    re: /^(?:(?:suggested\s+)?account\s*:\s*)?employees at\s+(.+?)\s+are active\b/i,
    kind: "active",
    line: () => "Their employees are active on LinkedIn.",
  },
  {
    re: /^(?:(?:suggested\s+)?account\s*:\s*)?leadership at\s+(.+?)\s+(?:has been|is) active\b/i,
    kind: "active",
    line: () => "Their leadership is active on LinkedIn.",
  },
  {
    re: /^(?:(?:suggested\s+)?account\s*:\s*)?new post from\s+(.+?)\.?$/i,
    kind: "company-post",
    line: () => "Posted on LinkedIn.",
  },
  {
    re: /^(?:(?:suggested\s+)?account\s*:\s*)?(.+?)\s+posted a new\s+([a-z]+)/i,
    kind: "company-post",
    line: (m) => `Posted a new ${m[2]!.toLowerCase()}.`,
  },
  {
    re: /^(?:(?:suggested\s+)?account\s*:\s*)?(.+?)\s+is preparing for growth/i,
    kind: "growth",
    line: () => "Job openings accelerated in the last 90 days.",
  },
  {
    re: /^(?:(?:suggested\s+)?account\s*:\s*)?(.+?)\s+is hiring\b/i,
    kind: "growth",
    line: () => "Hiring, by Sales Navigator.",
  },
  {
    re: /^(?:(?:suggested\s+)?account\s*:\s*)?(.+?)\s+was mentioned in the news/i,
    kind: "company-post",
    line: () => "In the news.",
  },
];

const INTENT_ROW =
  /^(?:increase in buyer intent\s*[:·-]?\s*)?(.+?)\s+is now expressing\s+(high|moderate)\s+buyer intent\b/i;

const cap1 = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1).toLowerCase() : s);

/** One account's alerts from its own notes, unwindowed and undeduped. */
function sightings(
  account: { id: string; name: string },
  notes: readonly NoteLike[],
  now: Date,
): Omit<SpineItem, "when">[] {
  const out: Omit<SpineItem, "when">[] = [];
  const push = (it: Omit<SpineItem, "when" | "key">, group: string) =>
    out.push({ ...it, key: hash(`${account.id}|${group}`) });

  for (const n of notes) {
    if (!isSalesNav(n.source)) continue;
    const kind = grabKind(n.body);
    const { head, rows } = rowsOf(n.body);
    const fromEmail = /\bfrom an alert email\b/i.test(head);

    if (kind === "alerts") {
      for (const row of rows) {
        const ls = linesOf(row).filter((l) => !isLinkLine(l));
        // Only an alert email files links (its own buttons, unwrapped); the
        // feed grab copies the screen's text, where a post could say anything.
        const links: SpineLink[] = fromEmail
          ? linesOf(row)
              .map(readLinkLine)
              .filter((l): l is SpineLink => l !== null)
          : [];
        const at = rowAt(head, row, n.createdAt);
        const [person] = parseAlerts(`${head}\n\n${row}`, n.createdAt);
        if (person) {
          let k: SpineKind = person.kind === "posted" ? "posted" : "new-in-seat";
          if (
            k === "new-in-seat" &&
            person.company &&
            !sameCompany(person.company, account.name)
          )
            k = "left";
          const day = userDayKey(person.at);
          push(
            {
              kind: k,
              label:
                k === "posted"
                  ? "Posted"
                  : k === "left"
                    ? `Left for ${person.company}`
                    : "New in seat",
              accountId: account.id,
              account: account.name,
              who: person.name,
              title: person.title,
              company: person.company,
              line:
                k === "posted"
                  ? "Shared a post on LinkedIn."
                  : k === "left"
                    ? `Took a role at ${person.company}.`
                    : person.title
                      ? `Started as ${person.title}.`
                      : "Started a new role here.",
              quote: redactMoney(person.snippet),
              at: person.at,
              links,
              rule: KIND_RULE[k] ?? null,
            },
            // A post is one person on one Chicago day, whichever door it came
            // through: the feed copies no link, the email does, and both are
            // one item with the link kept.
            k === "posted"
              ? `posted|${personKey(person.name) || person.name.toLowerCase()}|${day}`
              : `${k}|${personKey(person.name) || person.name.toLowerCase()}`,
          );
          continue;
        }
        const first = ls[0] ?? "";
        for (const a of ACCOUNT_KINDS) {
          const m = a.re.exec(first);
          if (!m) continue;
          // An account alert names a company: it is this account's only when
          // the company is this account (the router filed it here; a quoted
          // company inside a post never reaches this line).
          if (m[1] && !sameCompany(m[1], account.name)) break;
          const line = a.line(m);
          push(
            {
              kind: a.kind,
              label:
                a.kind === "active"
                  ? /leadership/i.test(first)
                    ? "Leadership active"
                    : "Employees active"
                  : a.kind === "growth"
                    ? "Growing"
                    : "Company post",
              accountId: account.id,
              account: account.name,
              who: "",
              title: "",
              company: "",
              line,
              quote: "",
              at,
              links,
              rule: null,
            },
            `${a.kind}|${line}|${userDayKey(at)}`,
          );
          break;
        }
      }
      continue;
    }

    if (kind === "intent") {
      for (const row of rows) {
        const ls = linesOf(row);
        const m = INTENT_ROW.exec(ls[0] ?? "");
        if (!m) continue;
        const at = rowAt(head, row, n.createdAt);
        push(
          {
            kind: "intent",
            label: `Intent · ${cap1(m[2]!)}`,
            accountId: account.id,
            account: account.name,
            who: "",
            title: "",
            company: "",
            line: `Buyer intent is ${cap1(m[2]!)}.`,
            quote: "",
            at,
            links: fromEmail
              ? ls.map(readLinkLine).filter((l): l is SpineLink => l !== null)
              : [],
            rule: "intent-warm",
          },
          `intent|${userDayKey(at)}`,
        );
      }
    }
  }

  // The daily accounts grab: an intent rise and the "Recently hired" badge
  // are events, read the way the queue reads them.
  const rise = intentRise([...notes], now);
  if (rise) {
    push(
      {
        kind: "intent",
        label: rise.from !== rise.to ? `Intent ↑ ${cap1(rise.to)}` : "Intent ↑",
        accountId: account.id,
        account: account.name,
        who: "",
        title: "",
        company: "",
        line:
          rise.from !== rise.to
            ? `Intent rose to ${cap1(rise.to)}${rise.toActivities != null ? ` · ${rise.toActivities} activities` : ""}.`
            : `Sales Nav activity rose to ${rise.toActivities}.`,
        quote: "",
        at: rise.at,
        links: [],
        rule: "intent-warm",
      },
      `intent|${userDayKey(rise.at)}`,
    );
  }
  for (const s of peopleSignalsFor([...notes], now, account.name)) {
    if (!s.seen) continue;
    push(
      {
        kind: "new-in-seat",
        label: "New in seat",
        accountId: account.id,
        account: account.name,
        who: s.name,
        title: s.title,
        company: "",
        line: "Sales Nav marks them recently hired.",
        quote: "",
        at: s.at,
        links: [],
        rule: "new-in-seat",
      },
      `new-in-seat|${personKey(s.name) || s.name.toLowerCase()}`,
    );
  }
  return out;
}

/** The fallback buttons for an alert that carried no link of its own: a
 *  Sales Navigator search by the person's name, and by the account's. An
 *  account link derives from a company id any of its links names. */
function withFallbacks(it: Omit<SpineItem, "when">): Omit<SpineItem, "when"> {
  const links = [...it.links];
  const has = (label: string) => links.some((l) => l.label === label);
  if (it.who && !has("Profile") && !has("InMail"))
    links.push({ label: "Find in Sales Nav", href: salesNavSearch("people", it.who) });
  if (!has("Account")) {
    const id = links.map((l) => companyIdOf(l.href)).find(Boolean);
    links.push(
      id
        ? { label: "Account", href: `https://www.linkedin.com/sales/company/${id}` }
        : { label: "Account", href: salesNavSearch("company", it.account) },
    );
  }
  return { ...it, links };
}

/** The spine: every alert on the given accounts inside the last SPINE_DAYS,
 *  one per key (two sightings of one alert merge, the newest moment and
 *  every link kept), newest first. Nothing dated after `now` speaks. */
export function buildSpine(
  accounts: readonly { id: string; name: string }[],
  notesById: ReadonlyMap<string, readonly NoteLike[]>,
  now: Date,
): SpineItem[] {
  const today = userDayKey(now);
  const yesterday = userDayKey(new Date(now.getTime() - DAY_MS));
  const byKey = new Map<string, Omit<SpineItem, "when">>();
  for (const a of accounts) {
    const notes = notesById.get(a.id);
    if (!notes?.length) continue;
    for (const s of sightings(a, notes, now)) {
      const t = Date.parse(s.at);
      if (Number.isNaN(t) || t > now.getTime() + 60_000) continue;
      if ((now.getTime() - t) / DAY_MS > SPINE_DAYS) continue;
      const prior = byKey.get(s.key);
      if (!prior) {
        byKey.set(s.key, s);
        continue;
      }
      const newer = s.at > prior.at ? s : prior;
      const links = [...prior.links];
      for (const l of s.links) if (!links.some((k) => k.href === l.href)) links.push(l);
      byKey.set(s.key, {
        ...newer,
        quote: newer.quote || prior.quote || s.quote,
        title: newer.title || prior.title || s.title,
        links,
      });
    }
  }
  // One post seen twice across a day line (an email sent at 4 PM, the feed
  // grab next morning reading "17h") is one post: a person's sightings
  // within POST_MERGE_HOURS fold into the earliest, whose key stays put so a
  // ✕ holds, and every link is kept.
  const merged: Omit<SpineItem, "when">[] = [];
  const items = [...byKey.values()].sort((a, b) => a.at.localeCompare(b.at));
  for (const it of items) {
    const twin =
      it.kind === "posted"
        ? merged.find(
            (m) =>
              m.kind === "posted" &&
              m.accountId === it.accountId &&
              personKey(m.who) === personKey(it.who) &&
              Date.parse(it.at) - Date.parse(m.at) <= POST_MERGE_HOURS * 3_600_000,
          )
        : undefined;
    if (!twin) {
      merged.push(it);
      continue;
    }
    for (const l of it.links)
      if (!twin.links.some((k) => k.href === l.href)) twin.links.push(l);
    twin.at = it.at;
    twin.quote = twin.quote || it.quote;
    twin.title = twin.title || it.title;
  }
  return merged
    .map(withFallbacks)
    .map((it) => {
      const day = userDayKey(it.at);
      const when: SpineItem["when"] =
        day === today ? "today" : day === yesterday ? "yesterday" : "week";
      return {
        ...it,
        label: redactMoney(it.label),
        title: redactMoney(it.title),
        company: redactMoney(it.company),
        line: redactMoney(it.line),
        when,
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Whether the operator worked an alert: the move it feeds was stamped on
 *  the alert's day or after (the stamp store the queue reads). */
export function spineWorked(
  it: Pick<SpineItem, "accountId" | "rule" | "at">,
  stampKeys: Iterable<string>,
  now: Date,
): { worked: boolean; today: boolean } {
  if (!it.rule) return { worked: false, today: false };
  const since = userDayKey(it.at);
  let worked = false;
  let today = false;
  const todayKey = userDayKey(now);
  for (const k of stampKeys) {
    const m = /^groundwork:(\d{4}-\d{2}-\d{2}):(.+)$/.exec(k);
    if (!m || m[2] !== `${it.accountId}:${it.rule}` || m[1]! < since) continue;
    worked = true;
    if (m[1] === todayKey) today = true;
  }
  return { worked, today };
}

// ── The draft a pop-out opens ────────────────────────────────────────────

/** A composed note, split for the pop-out: who it goes to, the subject when
 *  it is an email, and the body the operator edits. */
export type SpineDraft = {
  to: string;
  email: string;
  subject: string;
  body: string;
  via: string;
};

/** The composer's payload ("To: …\nSubject: …\n\nbody") as its parts. */
export function splitPayload(payload: string): {
  to: string;
  subject: string;
  body: string;
} {
  const t = (payload ?? "").replace(/\r/g, "");
  const gap = t.indexOf("\n\n");
  const headLines = (gap >= 0 ? t.slice(0, gap) : "").split("\n");
  const pick = (k: string) =>
    headLines
      .find((l) => l.toLowerCase().startsWith(`${k}:`))
      ?.slice(k.length + 1)
      .trim() ?? "";
  const hasHead = headLines.some((l) => /^(to|subject):/i.test(l));
  return {
    to: hasHead ? pick("to") : "",
    subject: hasHead ? pick("subject") : "",
    body: (hasHead ? t.slice(gap + 2) : t).trim(),
  };
}
