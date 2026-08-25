// The relationship read: who this deal actually runs through. The book seeds
// a primary contact from the export, but an export is a guess about a company,
// not a relationship — the moment real communication files, the record
// outranks it. The relationship is the most-seen person in the operator's own
// threads, preferring people the account's roster can vouch for (a matched
// email means they work there — a colleague demoing on the call does not).
// Pure — testable.

import { peopleFor, type ContactForPeople, type NoteForPeople } from "@/lib/intel/people";

export type Relationship = {
  name: string;
  email: string;
  source: "record" | "book";
};

export function relationshipFor(
  notes: NoteForPeople[],
  contacts: ContactForPeople[],
  book: { name?: string; email?: string },
): Relationship {
  const people = peopleFor(notes, contacts, 12);
  const top =
    people.find((p) => p.inMine && p.email) ?? people.find((p) => p.inMine) ?? people[0];
  if (top) return { name: top.name, email: top.email, source: "record" };
  return {
    name: (book.name ?? "").trim(),
    email: (book.email ?? "").trim(),
    source: "book",
  };
}
