// What the record adds to an account's contacts (founder-decreed 2026-08-20):
// addresses on the account's domain from filed captures, and name-only people
// from the record's own traffic. Both read the account read (the Ted
// doctrine: a derived fact reads the widest live source, never a private
// narrow one): every row under every id the account folds into, hidden rows
// out (pass 8 X1), and the read's people, which leave out our own side by the
// declared roster (pass 8 call 7), so a colleague never joins as the
// account's contact. Pure; getContacts (./actions.ts) loads the read.

import type { BookContact } from "@/lib/book/contacts";
import { discoveredContacts } from "@/lib/book/live-contacts";
import type { AccountRead } from "@/lib/record/read";

export type ContactRow = BookContact & { fromRecord?: boolean; firstSeen?: string };

export const EMPTY_CONTACT: Omit<BookContact, "first" | "last" | "email"> = {
  id: "",
  title: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  phone: "",
  mobile: "",
  owner: "",
};

/** The rows the record adds, ahead of the roster: discovered addresses, then
 *  named people. `have` and `haveNames` are the roster's emails and names,
 *  lowercased; a person already on the roster never joins twice. */
export function recordContactRows(input: {
  read: Pick<AccountRead, "people" | "hidden">;
  notes: readonly { id: string; body: string; createdAt: string }[];
  domain: string;
  have: ReadonlySet<string>;
  haveNames: ReadonlySet<string>;
}): ContactRow[] {
  const { read } = input;
  const names = new Set(input.haveNames);
  const visible = input.notes.filter((n) => !read.hidden.has(n.id));
  const found: ContactRow[] = discoveredContacts(
    visible.map((n) => ({ body: n.body, createdAt: n.createdAt })),
    input.domain,
    new Set(input.have),
  );
  for (const f of found) names.add(`${f.first} ${f.last}`.trim().toLowerCase());

  // Name-only people from the record's traffic — a VTT voice, an actors
  // line, a filed thread — join without an email; the draft door stays shut
  // until an address arrives.
  const named: ContactRow[] = [];
  for (const p of read.people) {
    const key = p.name.trim().toLowerCase();
    if (!key || names.has(key)) continue;
    if (p.email && input.have.has(p.email.toLowerCase())) continue;
    // Two words minimum — "IT Help" style artifacts and single tokens stay out.
    if (p.name.trim().split(/\s+/).length < 2) continue;
    const parts = p.name.trim().split(/\s+/);
    named.push({
      ...EMPTY_CONTACT,
      first: parts[0],
      last: parts.slice(1).join(" "),
      title: p.title,
      email: p.email,
      fromRecord: true,
      firstSeen: p.lastSeen,
    });
    names.add(key);
  }
  return [...found, ...named];
}
