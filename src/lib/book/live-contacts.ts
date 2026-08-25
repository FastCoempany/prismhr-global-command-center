// The record grows the roster (founder-decreed 2026-08-20): a person who
// arrives in a filed capture — a VTT, an .eml, a note — with an address on
// the account's own domain joins the Contacts view, derived at read time,
// never written to a store (Ted doctrine: the record outranks the seed, and
// a derived fact re-derives). The frozen SF export stays untouched.

import { MINE_RE } from "@/lib/intel/provenance";
import type { BookContact } from "@/lib/book/contacts";

export type LiveContact = BookContact & { fromRecord: true; firstSeen: string };

type NoteLike = { body: string; createdAt: string };

// "Melanie Dreyer, CPA" <mdreyer@trendhr.com> · Jen Hardesty <jennifer@...>
// · bare mailto: tails. The name is whatever rides directly before the
// address; a bare address still files with the mailbox word as the name.
const PAIR_RE =
  /(?:"([^"\n]{2,60})"|([A-Z][\w.'-]{1,25}(?: [A-Z][\w.'&-]{1,25}){0,3}))?\s*<([\w.+'-]+@[\w.-]+\.\w{2,})>/g;

const cleanName = (raw: string): { first: string; last: string } => {
  // Drop credential tails ("Melanie Dreyer, CPA") and collapse spacing.
  const base = raw.split(",")[0].trim().replace(/\s+/g, " ");
  const parts = base.split(" ").filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
};

export function domainOfAccount(website: string, contactEmail: string): string {
  const fromEmail = contactEmail.split("@")[1]?.toLowerCase().trim() ?? "";
  if (fromEmail) return fromEmail;
  return (website ?? "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .trim();
}

export function discoveredContacts(
  notes: NoteLike[],
  domain: string,
  rosterEmails: Set<string>,
): LiveContact[] {
  if (!domain) return [];
  const byEmail = new Map<string, LiveContact>();
  for (const n of notes) {
    for (const m of n.body.matchAll(PAIR_RE)) {
      const email = m[3].toLowerCase();
      if (!email.endsWith(`@${domain}`)) continue;
      if (rosterEmails.has(email)) continue;
      const rawName = (m[1] ?? m[2] ?? "").trim();
      if (MINE_RE.test(rawName) || MINE_RE.test(email)) continue;
      const { first, last } = rawName
        ? cleanName(rawName)
        : { first: email.split("@")[0], last: "" };
      const prior = byEmail.get(email);
      // A named sighting outranks a bare address; the earliest date keeps.
      if (prior && (prior.last || !last)) continue;
      byEmail.set(email, {
        id: "",
        first,
        last,
        title: "",
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        phone: "",
        mobile: "",
        email,
        owner: "",
        fromRecord: true,
        firstSeen: prior?.firstSeen ?? n.createdAt,
      });
    }
  }
  return [...byEmail.values()].sort((a, b) =>
    `${a.first} ${a.last}`.localeCompare(`${b.first} ${b.last}`),
  );
}
