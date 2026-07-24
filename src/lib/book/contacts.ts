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
