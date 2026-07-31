// The wire's watch registry — versioned in code so a sweep is reproducible.
// Three layers: the category terms of the world we sell in, the competitor
// watchlist (superset, with the research module's negation discipline living
// at match time), and EVERY account name in the book, derived from the book
// module at import so the list can never drift from the roster.

import { peos } from "@/lib/book";

export const CATEGORY_TERMS = [
  "EOR",
  "employer of record",
  "contractor management",
  "contractor of record",
  "agent of record",
  "PEO",
  "ASO",
  "international hiring",
  "global hiring",
  "global hiring compliance",
  "international payroll",
  "global payroll",
  "worker misclassification",
  "permanent establishment",
  "co-employment",
];

export const COMPETITOR_TERMS = [
  "Deel",
  "Rippling",
  "Remote.com",
  "Globalization Partners",
  "G-P",
  "Velocity Global",
  "Pebl",
  "Papaya Global",
  "Oyster HR",
  "Multiplier",
  "Safeguard Global",
  "Omnipresent",
  "Skuad",
  "Playroll",
  "Atlas HXM",
  "TriNet",
];

export const FAMILY_TERMS = [
  "PrismHR",
  "Vensure",
  "Engage PEO",
  "iSolved",
  "Justworks",
  "NAPEO",
];

// Names that collide with common words or other companies — the sweep prompt
// carries the qualifier so "Remote work is here to stay" never matches the
// company, and "Axios" the account never matches the news site.
export const DISAMBIGUATION: Record<string, string> = {
  "Remote.com": "the HR company Remote (remote.com), not remote work generally",
  Oyster: "Oyster the employment platform (oysterhr.com)",
  Axios: "Axios Inc the Michigan HR company, not the news outlet",
  Sequoia: "Sequoia the HR/PEO firm, not Sequoia Capital",
  QPS: "QPS Employment Group (Wisconsin staffing), not the UK QPS Group",
  "Allied Global": "Allied Global Services (Kansas staffing), not the Guatemala BPO",
};

// Every account name, straight from the roster. Namespaced pseudo-ids never
// appear here because peos is the real book.
export function accountTerms(): string[] {
  return peos.map((p) => p.name);
}

// Prompt-size guard for the sweep. The whole roster fits today (150 names);
// if the book ever outgrows this, the sweep logs the truncation honestly
// rather than silently watching a subset.
export const ACCOUNT_TERM_CAP = 200;

export function registrySummary(): {
  category: number;
  competitors: number;
  family: number;
  accounts: number;
} {
  return {
    category: CATEGORY_TERMS.length,
    competitors: COMPETITOR_TERMS.length,
    family: FAMILY_TERMS.length,
    accounts: accountTerms().length,
  };
}
