// The people the operator adds to a deal by hand, and the LinkedIn pages set
// by hand (the F26 face, release three; ship order 2026-11-04). One
// people:<accountId> note per account, newest wins, the way facts: keeps its
// overlay. The record's people come first (the Ted doctrine: the record
// outranks every seed); a person added here stands in until the record names
// them, and a LinkedIn page set here outranks the one a Sales Navigator alert
// carried, because the operator chose it. Pure: no store is read here.

export const PEOPLE_NS = "people:";
const HEAD = "✎ ROW PEOPLE";

export type HandPerson = { name: string; title: string; email: string; phone: string };
export type HandPeople = {
  added: HandPerson[];
  /** LinkedIn pages by the person's name key. */
  links: Record<string, string>;
};
export const NO_PEOPLE: HandPeople = { added: [], links: {} };

/** The first and last word of a name, lowercased: one person however the
 *  record spells the middle. */
export const nameKey = (name: string): string => {
  const w = (name ?? "")
    .toLowerCase()
    .replace(/[^a-z\s'-]+/g, " ")
    .split(/\s+/)
    .filter((x) => x.length > 1);
  return w.length < 2 ? (w[0] ?? "") : `${w[0]} ${w[w.length - 1]}`;
};

/** A LinkedIn page: a profile or a Sales Navigator lead, https only. */
export function linkedInUrl(raw: string): string | null {
  const s = (raw ?? "").trim();
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return null;
    if (u.hostname !== "www.linkedin.com" && u.hostname !== "linkedin.com") return null;
    if (!/^\/(?:in|sales\/lead|sales\/people)\/[^/]+/.test(u.pathname)) return null;
    return `https://www.linkedin.com${u.pathname}`;
  } catch {
    return null;
  }
}

const clean = (s: string, cap: number) =>
  (s ?? "")
    .replace(/[\t\n\r]+/g, " ")
    .trim()
    .slice(0, cap);

export function renderPeople(p: HandPeople): string {
  const lines = [HEAD];
  for (const a of p.added.slice(0, 20))
    lines.push(
      [
        "add",
        clean(a.name, 80),
        clean(a.title, 120),
        clean(a.email, 120),
        clean(a.phone, 40),
      ].join("\t"),
    );
  for (const [k, url] of Object.entries(p.links).slice(0, 40))
    lines.push(`li\t${k}\t${url}`);
  return lines.join("\n");
}

export function parsePeople(body: string | undefined): HandPeople {
  const out: HandPeople = { added: [], links: {} };
  const lines = (body ?? "").split("\n");
  if (lines[0]?.trim() !== HEAD) return out;
  for (const line of lines.slice(1)) {
    const [k, a = "", b = "", c = "", d = ""] = line.split("\t");
    if (k === "add" && nameKey(a))
      out.added.push({ name: a, title: b, email: c, phone: d });
    else if (k === "li" && a) {
      const url = linkedInUrl(b);
      if (url) out.links[a] = url;
    }
  }
  return out;
}

export const peopleFrom = (rows: readonly { body: string }[] | undefined): HandPeople =>
  parsePeople(rows?.[0]?.body);

export type PeopleChange =
  | { kind: "add"; person: HandPerson }
  | { kind: "remove"; name: string }
  | { kind: "linkedin"; name: string; url: string | null };

/** Apply one change. A change that does not read leaves the store as it was. */
export function applyPeopleChange(p: HandPeople, c: PeopleChange): HandPeople {
  const next: HandPeople = { added: [...p.added], links: { ...p.links } };
  if (c.kind === "add") {
    const person = {
      name: clean(c.person.name, 80),
      title: clean(c.person.title, 120),
      email: clean(c.person.email, 120),
      phone: clean(c.person.phone, 40),
    };
    const key = nameKey(person.name);
    if (!key) return p;
    next.added = [...next.added.filter((a) => nameKey(a.name) !== key), person];
  } else if (c.kind === "remove") {
    next.added = next.added.filter((a) => nameKey(a.name) !== nameKey(c.name));
  } else {
    const key = nameKey(c.name);
    if (!key) return p;
    if (c.url === null) delete next.links[key];
    else {
      const url = linkedInUrl(c.url);
      if (!url) return p;
      next.links[key] = url;
    }
  }
  return next;
}
