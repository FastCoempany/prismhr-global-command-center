// The routing roster — the one build every door is to read: one Chute, one
// roster, the same routing wherever it mounts (ruled 2026-09-25, D1 —
// CLAUDE.md, The Chute :301). A door that builds its own roster reads fewer
// signals than this one, and a signal one door can read and another cannot
// is how the same capture gets two different answers; the row Drop once
// built nothing at all and filed wherever the operator dropped, unchecked.
// SERVER-ONLY: it reads contacts.json, which must never reach a bundle.

import { AKA } from "./merge";
import { peos } from "./index";
import { contactsFor, peopleIndex, personKey } from "./contacts";
import { domainOf, type RouteAccount } from "@/lib/route-capture";

let ROSTER: RouteAccount[] | null = null;

/** Every account the book knows, with the signals that identify it in a
 *  capture: contact emails, company domains, and the people bound to it
 *  alone. A person the book binds to several accounts identifies none of
 *  them and is left out. */
export function routingRoster(): RouteAccount[] {
  if (ROSTER) return ROSTER;
  const idx = peopleIndex();
  ROSTER = peos.map((p) => {
    const emails = [p.contactEmail, ...contactsFor(p.id).map((c) => c.email)]
      .map((e) => (e ?? "").toLowerCase().trim())
      .filter(Boolean);
    const domains = [
      domainOf(p.website),
      ...emails.map((e) => e.split("@")[1] ?? ""),
    ].filter(Boolean);
    const people = [
      personKey(p.contactName ?? ""),
      ...contactsFor(p.id).map((c) => personKey(`${c.first ?? ""} ${c.last ?? ""}`)),
    ].filter((k) => k && (idx.get(k) ?? []).length === 1);
    return {
      id: p.id,
      name: p.name,
      aka: AKA[p.id] ?? [],
      emails: [...new Set(emails)],
      domains: [...new Set(domains)],
      people: [...new Set(people)],
    };
  });
  return ROSTER;
}
