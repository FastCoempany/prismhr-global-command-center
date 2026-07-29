// The People index: every stakeholder who appears in an account's repository —
// my own threads AND the background traffic — rolled up into one row each.
// "They're the same people": the benefits manager filing support cases is the
// same person in the room when the Global demo happens. Pure — testable.

import { inferSubject } from "@/lib/intel/provenance";

export type NoteForPeople = {
  actors: string;
  lane: "mine" | "background";
  body: string;
  createdAt: string; // ISO
};

export type ContactForPeople = {
  first: string;
  last: string;
  title: string;
  email: string;
};

export type PersonRow = {
  name: string;
  title: string; // from the contact roster when matched, else ""
  email: string;
  count: number;
  lastSeen: string; // ISO of most recent appearance
  inMine: boolean; // appears in my threads
  inBackground: boolean; // appears in case/support traffic
  lastContext: string; // subject of the most recent activity they appear in
};

// Never index myself (in any rendering, including Outlook's "You"), the
// support queue's shared inbox, or empty fragments.
const SKIP_RE = /antaeus|^you$|^me$|customersupport@|no-?reply|donotreply/i;

function splitActors(actors: string): string[] {
  // "Last, First" pairs are ONE person — flip them before the comma split so
  // "Bartolotti, Kim → Cyphers, Lesha" doesn't shatter into four phantoms.
  const collapsed = (actors ?? "").replace(
    /\b([A-Z][\w'’.-]+),\s+([A-Z][\w'’.-]+)\b(?=\s*(?:→|;|\+|$))/g,
    "$2 $1",
  );
  return collapsed
    .split(/→|;|,|\band\b/)
    .map((s) => s.replace(/\+\d+\s*$/, "").trim())
    .filter((s) => s.length > 1 && !SKIP_RE.test(s));
}

const norm = (s: string) => s.trim().toLowerCase();

// Roll the account's notes up into people rows, joined against the contact
// roster (title/email) by full name or email. Sorted most-seen first.
export function peopleFor(
  notes: NoteForPeople[],
  contacts: ContactForPeople[],
  cap = 12,
): PersonRow[] {
  const byKey = new Map<string, PersonRow>();
  for (const n of notes) {
    for (const raw of splitActors(n.actors)) {
      const key = norm(raw);
      const row = byKey.get(key) ?? {
        name: raw,
        title: "",
        email: "",
        count: 0,
        lastSeen: "",
        inMine: false,
        inBackground: false,
        lastContext: "",
      };
      row.count++;
      if (n.lane === "mine") row.inMine = true;
      else row.inBackground = true;
      if (!row.lastSeen || n.createdAt > row.lastSeen) {
        row.lastSeen = n.createdAt;
        row.lastContext = inferSubject(n.body) || row.lastContext;
      }
      byKey.set(key, row);
    }
  }
  // Join the roster: exact full-name or email match fills title/email.
  for (const row of byKey.values()) {
    const k = norm(row.name);
    const c = contacts.find(
      (x) => norm(`${x.first} ${x.last}`) === k || (x.email && norm(x.email) === k),
    );
    if (c) {
      row.title = c.title;
      row.email = c.email;
      if (c.first) row.name = `${c.first} ${c.last}`.trim();
    }
  }
  return [...byKey.values()]
    .sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen))
    .slice(0, cap);
}
