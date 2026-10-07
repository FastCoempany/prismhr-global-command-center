// The router on the server (the Chute brains refactor plan, §2.4 and slice
// 7). Routing runs here and the roster never ships to the browser (ruled
// 2026-09-25, D13 — CLAUDE.md, The Chute): a door hands the text to a server
// action, the action hands it here, and what goes back is the verdict and
// the picker's names, never an address, a domain or a person.
//
// The roster the rungs read is the book's joined with the record's (ruled
// 2026-09-25, C2): beside the book's contacts and domains, every actor and
// recipient the record holds for an account teaches the router that
// account's addresses, their domains and its people. The record speaks from
// its columns — AccountNote.actors and AccountNote.recipients — never from a
// body (Provenance is columns, P3/P4). The rungs stay pure rules
// (src/lib/route-capture.ts, unchanged); only the roster they read widens.
//
// An undo withdraws whatever the undone filing taught, by construction: the
// roster is rebuilt from the rows on every request, so a row the undo took
// back teaches nothing on the next one. Memoized per request with React's
// cache, so the guard's two rungs and the route cost one read.
//
// SERVER-ONLY: it reads the book's roster, which reads contacts.json, and the
// database. No client module imports it (the suite scans for that).

import { cache } from "react";
import { csms, peos } from "@/lib/book";
import { peopleIndex, personKey } from "@/lib/book/contacts";
import { routingRoster } from "@/lib/book/roster";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { isHomeSideName } from "@/lib/intel/provenance";
import { routeCapture, type RouteAccount, type RouteHit } from "@/lib/route-capture";

/** One row's columns, as the roster reads them: the account it files under
 *  and the two provenance columns that name people. Never a body. */
export type RosterRow = { accountId: string; actors: string; recipients: string };

/** The slice of the Prisma client the roster needs — a test hands in a
 *  stub, the way the Filing module takes its client. */
export type RosterClient = {
  accountNote: {
    findMany(args: {
      where: {
        accountId: { in: string[] };
        OR: ({ actors: { not: string } } | { recipients: { not: string } })[];
      };
      select: { accountId: true; actors: true; recipients: true };
      distinct: ("accountId" | "actors" | "recipients")[];
    }): Promise<RosterRow[]>;
  };
};

const EMAIL_RE = /[a-z0-9][a-z0-9._%+-]*@[a-z0-9.-]+\.[a-z]{2,}/gi;

// Our own side is on nearly every thread and identifies nobody — the same
// rule the router applies to prismhr.com addresses in a capture.
const HOME_ADDRESS_RE = /@prismhr\.com$/i;

/** The signals two columns carry: every address in them, lowercased, and
 *  every person named, as "first last" keys. An actors line reads "Kim
 *  Bartolotti → Lesha Cyphers +2"; a recipients line is comma-joined. The
 *  arrow, the comma and the overflow count separate the names; an address
 *  in angle brackets is an address, not a name. Pure. */
export function signalsOf(
  actors: string,
  recipients: string,
): { emails: string[]; people: string[] } {
  const text = `${actors ?? ""} , ${recipients ?? ""}`;
  const emails = [...new Set((text.match(EMAIL_RE) ?? []).map((e) => e.toLowerCase()))];
  const people = [
    ...new Set(
      text
        .replace(EMAIL_RE, " ")
        .replace(/[<>]/g, " ")
        .split(/\s*(?:→|,|\+\d+)\s*/)
        .map((n) => personKey(n))
        .filter(Boolean),
    ),
  ];
  return { emails, people };
}

type Signals = { emails: Set<string>; domains: Set<string>; people: Set<string> };

const fresh = (): Signals => ({
  emails: new Set(),
  domains: new Set(),
  people: new Set(),
});

/** The record's roster: per account, the addresses, domains and people its
 *  rows' columns teach, joined onto the book's roster. Pure rules:
 *
 *  - our own side teaches nothing — a prismhr.com address, the operator, a
 *    colleague the book names;
 *  - a signal the book binds to another account stays that account's — a
 *    Simploy person on a thread filed to Regis never makes Regis routable
 *    by that person (the misfile of 2026-09-03, which this would repeat);
 *  - a signal the record holds under more than one account identifies none
 *    of them, as the book's own roster already rules for its people;
 *  - a person the book binds to several accounts is left out here too.
 *
 *  What survives is unioned onto the book's own signals; the book's roster
 *  is never narrowed, only widened. */
export function joinRosters(
  book: readonly RouteAccount[],
  rows: readonly RosterRow[],
  home: (name: string) => boolean = (n) => isHomeSideName(n, csms),
): RouteAccount[] {
  const ids = new Set(book.map((a) => a.id));
  const idx = peopleIndex();

  // Who owns each signal already, by the book.
  const owners = new Map<string, Set<string>>();
  const own = (key: string, id: string) => {
    const s = owners.get(key) ?? new Set<string>();
    s.add(id);
    owners.set(key, s);
  };
  for (const a of book) {
    for (const e of a.emails) own(`e:${e}`, a.id);
    for (const d of a.domains) own(`d:${d}`, a.id);
    for (const p of a.people ?? []) own(`p:${p}`, a.id);
  }

  // What the record says, per account, before the ambiguity rule.
  const taught = new Map<string, Signals>();
  for (const r of rows) {
    if (!ids.has(r.accountId)) continue;
    const t = taught.get(r.accountId) ?? fresh();
    const { emails, people } = signalsOf(r.actors, r.recipients);
    for (const e of emails) {
      if (HOME_ADDRESS_RE.test(e)) continue;
      t.emails.add(e);
      const d = e.split("@")[1] ?? "";
      if (d) t.domains.add(d);
    }
    for (const p of people) {
      if ((idx.get(p) ?? []).length > 1) continue;
      if (home(p)) continue;
      t.people.add(p);
    }
    taught.set(r.accountId, t);
  }
  for (const [id, t] of taught) {
    for (const e of t.emails) own(`e:${e}`, id);
    for (const d of t.domains) own(`d:${d}`, id);
    for (const p of t.people) own(`p:${p}`, id);
  }

  // A record signal stays only when this account is its one owner.
  const alone = (key: string, id: string) => {
    const s = owners.get(key);
    return !!s && s.size === 1 && s.has(id);
  };
  return book.map((a) => {
    const t = taught.get(a.id);
    if (!t) return a;
    return {
      ...a,
      emails: [
        ...new Set([...a.emails, ...[...t.emails].filter((e) => alone(`e:${e}`, a.id))]),
      ],
      domains: [
        ...new Set([
          ...a.domains,
          ...[...t.domains].filter((d) => alone(`d:${d}`, a.id)),
        ]),
      ],
      people: [
        ...new Set([
          ...(a.people ?? []),
          ...[...t.people].filter((p) => alone(`p:${p}`, a.id)),
        ]),
      ],
    };
  });
}

/** The query the roster reads: the two columns of every row filed to a book
 *  account that names anyone, one row per distinct pair. Exported so the
 *  suite can pin that no body is selected. */
export function rosterQuery(
  ids: string[],
): Parameters<RosterClient["accountNote"]["findMany"]>[0] {
  return {
    where: {
      accountId: { in: ids },
      OR: [{ actors: { not: "" } }, { recipients: { not: "" } }],
    },
    select: { accountId: true, actors: true, recipients: true },
    distinct: ["accountId", "actors", "recipients"],
  };
}

/** The joined roster, read fresh: the book's joined with the record's. A
 *  database the server cannot reach, or none configured, leaves the book's
 *  roster standing alone — the rungs still run, on the book's signals. */
export async function readJoinedRoster(client?: RosterClient): Promise<RouteAccount[]> {
  const book = routingRoster();
  if (!client && !hasDatabaseEnv()) return book;
  try {
    const rows = await (client ?? getPrisma()).accountNote.findMany(
      rosterQuery(peos.map((p) => p.id)),
    );
    return joinRosters(book, rows);
  } catch {
    return book;
  }
}

/** The joined roster, once per request: the guard's two rungs and the route
 *  share one read. Outside a request (the suite) the cache is a pass-through
 *  and every call reads fresh. */
export const joinedRoster = cache(readJoinedRoster);

/** Route a capture's text over the joined roster. Pure rules, no model: the
 *  rungs are routeCapture's, unchanged. A caller holding a roster already
 *  hands it in; the doors' action lets this read the request's. */
export async function routeText(
  text: string,
  roster?: readonly RouteAccount[],
): Promise<{ best: RouteHit | null; candidates: RouteHit[] }> {
  const r = roster ?? (await joinedRoster());
  return routeCapture(text ?? "", [...r]);
}
