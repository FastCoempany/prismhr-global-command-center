// The full contact roster per account — every column of the 7/24 Salesforce
// contact reports (Anika's + Lesha's books), keyed by the app's account id.
// contacts.json is ~1.5MB, so this module must stay SERVER-ONLY: import it
// from pages/actions, never from a "use client" file — client code gets
// contacts via the getContacts server action, one account at a time.

import contacts from "./contacts.json";

export type BookContact = {
  id: string; // SF Contact record id (15-char from the report; "" if absent)
  first: string;
  last: string;
  title: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone: string;
  mobile: string;
  email: string;
  owner: string; // the CSM whose report the contact came from
};

const MAP = contacts as Record<string, BookContact[]>;

export function contactsFor(accountId: string): BookContact[] {
  return MAP[accountId] ?? [];
}

export function contactCount(accountId: string): number {
  return MAP[accountId]?.length ?? 0;
}

// Every person the book already knows, across all accounts — built once per
// server process and held. The follow-up read uses it to keep from asking
// whether a named contact should join the board: a person is not a deal.
// Which account a person belongs to — the fact the misfile guard was missing
// (the Simploy call filed to Regis, 2026-09-03: the book bound Chassie Smith
// to Simploy in two stores, the tape never said either company's name, and
// the guard read only company names). A name on exactly one account is a
// routing signal; a name on several identifies nobody.
let PEOPLE_INDEX: Map<string, string[]> | null = null;

/** Normalized full name → the account ids the book binds it to. */
export function peopleIndex(): ReadonlyMap<string, readonly string[]> {
  if (PEOPLE_INDEX) return PEOPLE_INDEX;
  const idx = new Map<string, string[]>();
  for (const [accountId, list] of Object.entries(MAP)) {
    for (const c of list) {
      const key = personKey(`${c.first ?? ""} ${c.last ?? ""}`);
      if (!key) continue;
      const at = idx.get(key);
      if (at) {
        if (!at.includes(accountId)) at.push(accountId);
      } else idx.set(key, [accountId]);
    }
  }
  PEOPLE_INDEX = idx;
  return idx;
}

/** The one spelling of a person's name used for matching — a first and a
 *  last, lowercased, punctuation and middle initials dropped. Anything that
 *  isn't two-plus real name words returns "" and never matches. */
export function personKey(name: string): string {
  const words = (name ?? "")
    .toLowerCase()
    .replace(/[^a-z\s'-]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
  if (words.length < 2) return "";
  return `${words[0]} ${words[words.length - 1]}`;
}

let ALL_PEOPLE: string[] | null = null;
export function knownPeople(): string[] {
  if (ALL_PEOPLE) return ALL_PEOPLE;
  const seen = new Set<string>();
  for (const list of Object.values(MAP)) {
    for (const c of list) {
      const full = `${c.first ?? ""} ${c.last ?? ""}`.trim();
      if (full.length > 2) seen.add(full);
    }
  }
  ALL_PEOPLE = [...seen];
  return ALL_PEOPLE;
}
