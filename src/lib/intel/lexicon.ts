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
  /\b(time[- ]sensitive|deadline|by (early |late |end of )?(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept?|october|oct|november|nov|december|dec)\b\.?( \d{1,2})?|quarterly review|leadership (team|review|meeting)|asap|as quickly as possible)\b/i;

// A headcount and its unit sit on ONE line, and the unit is a word.
//
// Before this, `\s*` crossed newlines and `ee?s?` accepted a lone "e", so an
// ordinary email signature read as a deal size (found 2026-09-08 on Trend
// Personnel, whose Philippines opportunity rendered "9292 workers"):
//
//     P: 312.221.9292
//     E: antaeus.coe@prismhr.com
//
// matched literally "9292\nE" — the phone's last four digits, the line break,
// and the E of the address line. Anika's direct-dial produced "4214" the same
// way. Three guards: digits inside a dotted or hyphenated run are part of a
// number, not a count; the gap to the unit cannot cross a line; and "EE" is
// two letters, never one.
export const HEADCOUNT =
  /(?<![\d.\-])\b~?[ \t]?(\d{1,4})[ \t]*(?:independent[ \t]+|international[ \t]+|intl[ \t]+)?(?:ees?\b|employees?\b|people\b|contractors?\b|workers?\b|folks\b)/i;

// Country detection: superset of the flags lib (which only carries art for a
// few) — aliases and adjectives included. Returns iso2 codes; CountryFlag
// falls back to a coded plate for countries without art.
export const COUNTRY_ALIASES: Record<string, string> = {
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
  // Puerto Rico is US soil and not a country, but it is a payroll jurisdiction
  // of its own — its own tax authority and filings, statutory severance
  // instead of at-will, retirement plans needing Treasury approval, workers'
  // comp only from the state fund. The record treats it as a place work
  // happens, and so must the scanner: Infiniti HR's live need was two staffing
  // clients hiring there, and the report could not see it at all (2026-09-08).
  // The bare initials are deliberately absent — "PR" is public relations far
  // more often than it is the island.
  "puerto rico": "pr",
  "puerto rican": "pr",
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

/** Every country mention with the character offset it sits at — so a fact can
 *  be bound to the country NEAREST it rather than to whichever country happens
 *  to appear first in the document. */
export function countryMentions(text: string): { code: string; at: number }[] {
  const out: { code: string; at: number }[] = [];
  for (const m of (text ?? "").matchAll(COUNTRY_RE)) {
    const code = COUNTRY_ALIASES[m[1].toLowerCase()];
    if (code) out.push({ code, at: m.index ?? 0 });
  }
  return out;
}

/** The country a fact at `at` belongs to: the nearest mention, preferring one
 *  that PRECEDES it, because English attaches a count to the thing just named
 *  ("Canada — 10 workers"). "" when the text names no country.
 *
 *  The XCEL HR read is the case this exists for. One sentence, two countries:
 *
 *    Immediate: Mexico (headcount TBD, must call client) and Canada —
 *    10 workers already live on payroll with a third party XLHR referred out
 *
 *  The ten are Canada's, and Mexico is explicitly TBD. Binding to the first
 *  country in the document put them on Mexico (2026-09-08). */
export function countryNear(text: string, at: number, maxGap = 240): string {
  const marks = countryMentions(text);
  if (!marks.length) return "";
  let best = "";
  let bestGap = Number.MAX_SAFE_INTEGER;
  for (const m of marks) {
    // A mention after the fact is only preferred when it is much closer, so
    // "Canada — 10 workers ... and Mexico" still reads as Canada's.
    const gap = m.at <= at ? at - m.at : (m.at - at) * 2;
    if (gap < bestGap) {
      bestGap = gap;
      best = m.code;
    }
  }
  return bestGap <= maxGap ? best : "";
}

// A country is IN PLAY when the record shows work to be done there — people to
// employ, pay or quote for. A country the account merely HAS something in is
// context.
//
// XCEL HR is the case. Its parent already owns payroll companies in the UK and
// India, so the record names the UK twice — "they have payrol comanies in uk
// and india for example" and "theres national retirement insurance etc in the
// uk for exmple?" — and neither is a deal. The report listed the United
// Kingdom beside Mexico and Canada as though it were one (2026-09-08).
//
// The test is positive evidence, never a blocklist: people, or a named intent
// toward the place. Anything else is a mention. A CLIENT in a country counts —
// in a PEO channel the client is the unit of demand, and Staff Leasing's real
// Canada opportunity ("cites Canada, incl. a Canadian client based in Fulton
// NY") had nothing else to stand on.
const DEMAND_NEAR =
  /\b(workers?|employees?|EEs?|staff|people|contractors?|headcount|hiring|hire[sd]?|onboard(?:ing|ed)?|relocat(?:e|ed|ing|ion)|placed?|payroll(?:ed)?\s+(?:there|them)|pric(?:e|ing)|quote[sd]?|proposal|coverage|cover(?:ing)?|expand(?:ing)?|opportunit(?:y|ies)|prospects?|clients?|requests?|need(?:s|ed)?|flagged|next\b|in play|win[- ]back)\b/i;

/** Does the SENTENCE holding the country at `at` show work to be done there?
 *
 *  A character window is too wide. XCEL HR's UK survived one because a note
 *  read "they need payroll. just to pay them. theres national retirement
 *  insurance etc in the uk for exmple?" — the "need" belongs to a different
 *  sentence about a different country, ninety characters away. Scoped to its
 *  own sentence the UK clause has no demand in it at all, which is right: it
 *  is a rhetorical aside about statutory rules. */
export function demandNear(text: string, at: number): boolean {
  const s = text ?? "";
  let from = at;
  while (from > 0 && !/[.!?\n]/.test(s[from - 1]!)) from--;
  let to = at;
  while (to < s.length && !/[.!?\n]/.test(s[to]!)) to++;
  return DEMAND_NEAR.test(s.slice(from, to));
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
  // Puerto Rico is US soil and not a country, but it is a payroll jurisdiction
  // of its own — its own tax authority and filings, statutory severance
  // instead of at-will, retirement plans needing Treasury approval, workers'
  // comp only from the state fund. The record treats it as a place work
  // happens, and so must the scanner: Infiniti HR's live need was two staffing
  // clients hiring there, and the report could not see it at all (2026-09-08).
  // The bare initials are not read — "PR" is public relations far more often
  // than it is the island.
  pr: "Puerto Rico",
};

// Money never reaches a UI string — strip every dollar/currency form from a
// snippet before display (confidentiality rail #3 of the build spec).
export function redactMoney(s: string): string {
  return s
    .replace(/[$€£]\s?\d[\d,.]*\s?[kKmM]?\b/g, "[—]")
    .replace(/\b\d[\d,.]*\s?(USD|EUR|GBP|CAD|dollars?|PEPM)\b/gi, "[—]")
    .replace(
      // Bare comma-grouped numbers are money UNLESS they're plainly a
      // quantity of people/things — "1,200 employees" is sizing intel the
      // HEADCOUNT extractor needs, not a figure to strip.
      /\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b(?!\s?(?:employees?|EEs?|workers?|contractors?|people|staff|seats?|hires?|heads?|headcount|clients?|locations?|worksites?))/gi,
      "[—]",
    );
}

const COUNTED =
  "employees?|EEs?|workers?|contractors?|people|staff|seats?|hires?|heads?|headcount|clients?|locations?|worksites?|users?|countries";

/** The currencies people write by code or by word, after or before the
 *  figure, and the symbols that stand before or after it. */
const CODES =
  "USD|EUR|GBP|CAD|AUD|NZD|MXN|INR|BRL|COP|PHP|JPY|CHF|SGD|ZAR|ARS|CLP|PEN|DOP|CNY|HKD|SEK|NOK|DKK|PLN";
const WORDS = "dollars?|euros?|pesos?|pounds?|reais|rupees?|bucks|francs?|yen";
// A figure: digits with their separators, never ending on one, and never cut
// short by a backtrack (the guard after each use keeps it whole).
const FIG = "\\d(?:[\\d,.]*\\d)?(?!\\d)";
const UNITS =
  "employee|EE|worker|head|hire|person|seat|user|contractor|month|mo|year|yr|week|hour|hr|pay period";

/** The money rule where a person's own words render: an email kept whole
 *  (ship order 2026-10-20; CLAUDE.md, The email in the row) talks prices the
 *  way people write them. Beyond redactMoney, these go: a figure with a
 *  currency code, word or symbol on either side ("USD 900", "499 euros",
 *  "1200€", "Rs. 40000"); a figure after a price word ("PEPM: 549", "the fee
 *  is 1500", "rate of 650"); a figure with a k, M or a word for thousands
 *  ("1.5k", "2 million"); a rate ("650 per employee per month", "599
 *  monthly"); a spelled-out amount ("twelve hundred dollars"); and both ends
 *  of a range once either end went ("599-649 PEPM"). A figure that counts
 *  people or places stays, and a 401k is a plan, never a figure. The
 *  stricter passes run first, so redactMoney's own pass never joins two
 *  lines before they read them. */
export function redactMoneyStrict(s: string): string {
  const counted = `(?!\\s?(?:${COUNTED})\\b)`;
  let t = (s ?? "")
    // A currency before the figure, by code or symbol.
    .replace(
      new RegExp(
        `(?:\\b(?:${CODES})|Rs\\.?|R\\$|C\\$|A\\$|NZ\\$|S\\$|[$€£¥₹₱₩])\\s?${FIG}(?:\\s?(?:k|K|M|MM)\\b)?`,
        "g",
      ),
      "[—]",
    )
    // A currency after the figure, by code, word or symbol.
    .replace(new RegExp(`\\b${FIG}\\s?(?:(?:${CODES}|${WORDS})\\b|[€£¥₹$])`, "gi"), "[—]")
    // A figure after a price word.
    .replace(
      new RegExp(
        `\\b(PEPM|PEPY|PEPW|PMPM|fees?|price[sd]?|pricing|rates?|costs?|quoted?|deposit|total|setup|salary|markup|margin)\\b([^\\d\\n]{0,24})${FIG}${counted}`,
        "gi",
      ),
      (_m, word: string, gap: string) => `${word}${gap}[—]`,
    )
    // A figure right after a product a price is quoted for ("EOR 599",
    // "contractor: 49"), unless it counts people.
    .replace(
      new RegExp(
        `\\b(EOR|COR|contractors?|payroll|GP)\\b([:\\s]{1,3})${FIG}${counted}`,
        "gi",
      ),
      (_m, word: string, gap: string) => `${word}${gap}[—]`,
    )
    // A spelled-out amount.
    .replace(
      new RegExp(
        `\\b(?:[a-z]+[\\s-]){0,4}(?:hundred|thousand|million)\\s(?:${WORDS})\\b`,
        "gi",
      ),
      "[—]",
    )
    // A figure with a k, M or a word for thousands.
    .replace(
      new RegExp(`\\b${FIG}\\s?(?:k|K|M|MM|million|thousand|grand)\\b${counted}`, "g"),
      (m) => (/^40[13]\s?k$/i.test(m) ? m : "[—]"),
    )
    // A rate: a figure per unit, monthly or yearly.
    .replace(
      new RegExp(
        `\\b${FIG}(?=\\s?(?:(?:per|\\/|an?|each)\\s?(?:${UNITS})|monthly|annually|yearly|weekly)\\b)`,
        "gi",
      ),
      "[—]",
    );
  t = redactMoney(t);
  // Both ends of a range go once either end went.
  for (let i = 0; i < 2; i++)
    t = t
      .replace(new RegExp(`\\b${FIG}(\\s?(?:-|–|to|and)\\s?)\\[—\\]`, "g"), "[—]$1[—]")
      .replace(new RegExp(`\\[—\\](\\s?(?:-|–|to)\\s?)${FIG}`, "g"), "[—]$1[—]");
  return t;
}
