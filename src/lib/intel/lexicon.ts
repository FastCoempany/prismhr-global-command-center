// Extraction vocabulary — the deterministic eyes of the intel engine.
// Seeded from the intelligence/ corpus (7/27): real product terms, commercial
// terms, incumbents, urgency phrases, and headcount shapes as they actually
// appear in deal email and call-transcript text.

export const PRODUCT_TERMS: Record<
  "eor" | "contractor" | "contractor_plus" | "payroll" | "mpex" | "wallet" | "tlm",
  RegExp
> = {
  eor: /\b(EOR|employer of record)\b/i,
  // "contractor plus" must win over plain "contractor" — check it first.
  contractor_plus: /\b(contractor\s*plus|agent of record)\b/i,
  contractor: /\b(contractors?|1099s?)\b/i,
  payroll: /\b(payroll|payslips?|gross[- ]to[- ]net)\b/i,
  mpex: /\bMPEX\b/i,
  wallet: /\b(wallet|stablecoin|GCash)\b/i,
  tlm: /\b(TLM|time and labor|time[- ]tracking)\b/i,
};

export const COMMERCIAL_TERMS: Record<"resale" | "referral" | "deposit", RegExp> = {
  resale: /\b(resell(er|ers)?|resale|wholesale|marks?[- ]?up)\b/i,
  referral: /\breferral\b/i,
  deposit: /\b(deposit|escrow)\b/i,
};

// Competitor EORs / global providers as they appear in threads. "GP" only as
// a standalone word (Nate: "I think it's called GP") — never inside GPS etc.
export const INCUMBENTS: { name: string; re: RegExp }[] = [
  { name: "Globalization Partners", re: /\b(?:[Gg]lobalization [Pp]artners|G-P|GP)\b/ },
  { name: "Deel", re: /\bDeel\b/i },
  { name: "TriNet", re: /\bTriNet\b/i },
  { name: "Remote", re: /\bRemote\.com\b/i },
  { name: "Papaya", re: /\bPapaya\b/i },
  { name: "Oyster", re: /\bOyster\b/i },
  { name: "Velocity Global", re: /\bVelocity Global\b/i },
  { name: "Safeguard", re: /\bSafeguard\b/i },
];

export const URGENCY =
  /\b(time[- ]sensitive|deadline|by (early |late |end of )?(january|february|march|april|may|june|july|august|september|october|november|december)( \d{1,2})?|quarterly review|leadership (team|review|meeting)|asap|as quickly as possible)\b/i;

export const HEADCOUNT =
  /\b~?\s?(\d{1,4})\s*(?:independent\s+|international\s+|intl\s+)?(?:ee?s?\b|employees?\b|people\b|contractors?\b|workers?\b|folks\b)/i;

// Country detection: superset of the flags lib (which only carries art for a
// few) — aliases and adjectives included. Returns iso2 codes; CountryFlag
// falls back to a coded plate for countries without art.
const COUNTRY_ALIASES: Record<string, string> = {
  canada: "ca",
  canadian: "ca",
  ontario: "ca",
  toronto: "ca",
  bulgaria: "bg",
  bulgarian: "bg",
  mexico: "mx",
  mexican: "mx",
  "united kingdom": "gb",
  uk: "gb",
  britain: "gb",
  british: "gb",
  england: "gb",
  india: "in",
  indian: "in",
  philippines: "ph",
  philippine: "ph",
  filipino: "ph",
  "south africa": "za",
  "south african": "za",
  spain: "es",
  spanish: "es",
  germany: "de",
  german: "de",
  turkey: "tr",
  turkish: "tr",
  bahamas: "bs",
  morocco: "ma",
  moroccan: "ma",
  australia: "au",
  australian: "au",
  france: "fr",
  french: "fr",
  china: "cn",
  chinese: "cn",
  brazil: "br",
  brazilian: "br",
  colombia: "co",
  colombian: "co",
  argentina: "ar",
  poland: "pl",
  polish: "pl",
  portugal: "pt",
  portuguese: "pt",
  ireland: "ie",
  irish: "ie",
  netherlands: "nl",
  dutch: "nl",
  japan: "jp",
  japanese: "jp",
  singapore: "sg",
  "costa rica": "cr",
  vietnam: "vn",
  vietnamese: "vn",
};

const COUNTRY_RE = new RegExp(
  `\\b(${Object.keys(COUNTRY_ALIASES)
    .sort((a, b) => b.length - a.length)
    .join("|")})\\b`,
  "gi",
);

export function countriesIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(COUNTRY_RE)) {
    const code = COUNTRY_ALIASES[m[1].toLowerCase()];
    if (code && !out.includes(code)) out.push(code);
  }
  return out;
}

export const COUNTRY_NAME: Record<string, string> = {
  ca: "Canada",
  bg: "Bulgaria",
  mx: "Mexico",
  gb: "United Kingdom",
  in: "India",
  ph: "Philippines",
  za: "South Africa",
  es: "Spain",
  de: "Germany",
  tr: "Turkey",
  bs: "Bahamas",
  ma: "Morocco",
  au: "Australia",
  fr: "France",
  cn: "China",
  br: "Brazil",
  co: "Colombia",
  ar: "Argentina",
  pl: "Poland",
  pt: "Portugal",
  ie: "Ireland",
  nl: "Netherlands",
  jp: "Japan",
  sg: "Singapore",
  cr: "Costa Rica",
  vn: "Vietnam",
};

// Money never reaches a UI string — strip every dollar/currency form from a
// snippet before display (confidentiality rail #3 of the build spec).
export function redactMoney(s: string): string {
  return s
    .replace(/[$€£]\s?\d[\d,.]*\s?[kKmM]?\b/g, "[—]")
    .replace(/\b\d[\d,.]*\s?(USD|EUR|GBP|CAD|dollars?|PEPM)\b/gi, "[—]")
    .replace(/\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b/g, "[—]");
}
