// The Chute's router — pure and deterministic. Given the text a dropped file
// became and the book's roster, name the account it belongs to and say why.
// Signals, strongest first: a known contact's exact email address in the text;
// a company email domain in the text; the account's name in the text. Freemail
// domains and our own side never count. When the signals don't clear the bar,
// or two accounts tie, the router refuses — the operator picks, the app never
// files blind.

export type RouteAccount = {
  id: string;
  name: string;
  emails: string[]; // known contact emails, lowercase
  domains: string[]; // company domains, lowercase, no www
};

export type RouteHit = {
  id: string;
  name: string;
  score: number;
  why: string;
};

// Domains that identify a mailbox provider, not a company.
const FREEMAIL = new Set([
  "gmail.com",
  "outlook.com",
  "hotmail.com",
  "yahoo.com",
  "aol.com",
  "icloud.com",
  "live.com",
  "msn.com",
  "me.com",
  "proton.me",
  "protonmail.com",
]);

// Our own side appears in every thread — it routes nothing.
const HOME_DOMAINS = new Set(["prismhr.com"]);

const EMAIL_RE = /[a-z0-9][a-z0-9._%+-]*@[a-z0-9.-]+\.[a-z]{2,}/gi;

const normName = (s: string): string =>
  (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(inc|llc|corp|corporation|company|co|ltd|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const domainOf = (s: string): string =>
  (s ?? "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split(/[/?#\s]/)[0]
    .trim();

// Words too generic to identify a company on their own.
const BLAND = new Set([
  "group",
  "global",
  "services",
  "solutions",
  "partners",
  "payroll",
  "staffing",
  "management",
  "resources",
  "consulting",
  "employer",
  "american",
  "national",
  "united",
  "first",
]);

const AUTO_ROUTE_SCORE = 60;
const AUTO_ROUTE_GAP = 20;

// A book name's initials — the abbreviation people actually type ("ESC" for
// Employer Services Corporation). Computed from the raw name, suffixes and
// all, because the abbreviation keeps them. Three to five letters only:
// two-letter initials collide with ordinary words.
export function initialsOf(name: string): string {
  const words = (name ?? "").split(/[^A-Za-z]+/).filter(Boolean);
  if (words.length < 3) return "";
  const init = words.map((w) => w[0]!.toUpperCase()).join("");
  return init.length >= 3 && init.length <= 5 ? init : "";
}

export function routeCapture(
  text: string,
  roster: RouteAccount[],
): { best: RouteHit | null; candidates: RouteHit[] } {
  const raw = text ?? "";
  const lowered = raw.toLowerCase();
  const normedText = ` ${normName(raw)} `;

  const foundEmails = new Set((raw.match(EMAIL_RE) ?? []).map((e) => e.toLowerCase()));
  const foundDomains = new Set(
    [...foundEmails]
      .map((e) => e.split("@")[1] ?? "")
      .filter((d) => d && !FREEMAIL.has(d) && !HOME_DOMAINS.has(d)),
  );

  const hits: RouteHit[] = [];
  for (const a of roster) {
    let score = 0;
    let why = "";

    const emailHit = a.emails.find((e) => foundEmails.has(e));
    if (emailHit) {
      score = 100;
      why = `${emailHit} is ${a.name}'s contact`;
    } else {
      const domainHit = a.domains.find(
        (d) => d && !FREEMAIL.has(d) && !HOME_DOMAINS.has(d) && foundDomains.has(d),
      );
      if (domainHit) {
        score = 80;
        why = `${domainHit} address in the text`;
      } else {
        const n = normName(a.name);
        if (n && n.length >= 4 && normedText.includes(` ${n} `)) {
          score = 70;
          why = `named in the text`;
        } else {
          const head = n.split(" ")[0] ?? "";
          const init = initialsOf(a.name);
          if (
            head.length >= 5 &&
            !BLAND.has(head) &&
            new RegExp(`\\b${head}\\b`).test(lowered)
          ) {
            score = 55;
            why = `“${head}” appears in the text`;
          } else if (init && new RegExp(`\\b${init}\\b`).test(raw)) {
            // Initials are a candidate signal, never a filing signal — below
            // the auto-route bar by design (ESC fits more than one account).
            score = 50;
            why = `“${init}” matches the initials`;
          }
        }
      }
    }
    if (score > 0) hits.push({ id: a.id, name: a.name, score, why });
  }

  hits.sort((x, y) => y.score - x.score || x.name.localeCompare(y.name));
  const top = hits[0];
  const second = hits[1];
  const best =
    top &&
    top.score >= AUTO_ROUTE_SCORE &&
    (!second || top.score - second.score >= AUTO_ROUTE_GAP)
      ? top
      : null;
  return { best, candidates: hits.slice(0, 5) };
}
