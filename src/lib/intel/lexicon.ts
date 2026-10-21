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
    .replace(/(?<!\d[,.]?)\b\d[\d,.]*\s?(USD|EUR|GBP|CAD|dollars?|PEPM)\b/gi, "[—]")
    .replace(
      // Bare comma-grouped numbers are money UNLESS they're plainly a
      // quantity of people/things — "1,200 employees" is sizing intel the
      // HEADCOUNT extractor needs, not a figure to strip.
      /\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b(?!\s?(?:employees?|EEs?|workers?|contractors?|people|staff|seats?|hires?|heads?|headcount|clients?|locations?|worksites?))/gi,
      "[—]",
    );
}

/** The currencies people write by code or by word, after or before the
 *  figure, and the symbols that stand before or after it. */
const CODES =
  "USD|EUR|GBP|CAD|AUD|NZD|MXN|INR|BRL|COP|PHP|JPY|CHF|SGD|ZAR|ARS|CLP|PEN|DOP|CNY|HKD|SEK|NOK|DKK|PLN";
const CURRENCY_WORDS =
  "dollars?|euros?|pesos?|pounds?|reais|rupees?|bucks|francs?|yen|cents?";
const MONTHS =
  "Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?";
/** What a figure can count, written lowercase as prose writes it after a
 *  figure ("45 employees", "3 open roles"); a capitalized word after a
 *  figure is a label ("EOR 599 Contractors 49"). Only these keep a figure:
 *  a word this list does not name never does, whatever it ends in. The
 *  partners' Spanish, Portuguese and French count words are here too. */
const COUNT_NOUNS = new Set(
  (
    "employee employees ee ees fte ftes worker workers hire hires person people persons folks staff headcount heads " +
    "contractor contractors freelancer freelancers consultant consultants client clients customer customers partner partners " +
    "member members user users seat seats role roles position positions job jobs opening openings candidate candidates " +
    "developer developers engineer engineers designer designers manager managers admin admins analyst analysts " +
    "accountant accountants rep reps agent agents nurse nurses driver drivers technician technicians specialist specialists " +
    "assistant assistants associate associates teacher teachers caregiver caregivers " +
    "country countries entity entities state states province provinces city cities market markets location locations " +
    "worksite worksites site sites office offices branch branches subsidiary subsidiaries team teams " +
    "account accounts deal deals contract contracts case cases ticket tickets question questions thing things item items " +
    "option options plan plans call calls meeting meetings demo demos document documents doc docs form forms file files " +
    "page pages email emails message messages round rounds step steps phase phases " +
    "empleado empleados trabajador trabajadores persona personas colaborador colaboradores contratista contratistas " +
    "cliente clientes funcionario funcionarios funcionário funcionários pessoa pessoas employé employés salarié salariés " +
    "país países pais paises entidad entidades oficina oficinas " +
    "personne personnes company companies business businesses employer employers peo peos dependent dependents " +
    "applicant applicants req reqs store stores franchise franchises group groups brand brands vendor vendors carrier carriers"
  ).split(" "),
);
/** Time a figure counts: in the plural it counts ("3 months", "30 days"); in
 *  the singular only for one of it or joined by a hyphen ("1 month",
 *  "12-month"), since "599 month to month" and "649 year one" are prices. */
const TIME_PLURALS = new Set(
  "minutes hours days weeks months quarters years mins hrs wks mos yrs meses semanas días dias años anos horas mois semaines jours ans heures".split(
    " ",
  ),
);
const TIME_SINGULARS = new Set(
  "minute hour day week month quarter year min hr wk mo yr".split(" "),
);
/** Words that end a count's reach: a figure before them is a price or a rate
 *  ("599 a month", "649 in Brazil", "599 every month"). */
const STOPS = new Set(
  (
    "a an the per each every to for in at on of by from with and or is was are be as than over under across into via vs versus plus after before until last next this que por al par de du le la el " +
    // A number word, a determiner or a quantifier between a figure and a
    // time word: "599 six months ago", "3500 these days", "tous les mois".
    "these those some most many few several both all only just within ago one two three four five six seven eight nine ten eleven twelve " +
    "tous toutes les todos todas los las os as cada hace há dos dois deux trois"
  ).split(" "),
);
/** The words for numbers that spell an amount out ("sixty thousand"). */
const NUMBER_WORDS =
  "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|a|and";
/** The plurals that make a spelled amount a count ("two hundred employees"). */
const COUNTED_AFTER =
  "employees|people|workers|hires|staff|contractors|clients|users|seats|heads|countries|locations";
/** Words just before a figure that say it counts people: a headcount, or a
 *  team of so many, with nothing after the figure. "Contractors: 49" and
 *  "per hire 5000" are prices. */
const COUNTED_BEFORE =
  /(?:\bheadcount\s*(?:[:=]|of|is|at|around|about)?|\b(?:team|staff) of)\s*$/i;
/** Count words that are plural without an s. */
const PLURAL_ALWAYS = new Set(["people", "staff", "headcount", "folks", "personnel"]);
/** What turns a count word into a price label: a slash or a price word
 *  right after it ("599 employee/month", "499 partner cost", "908 employee
 *  side"). */
const PRICE_AFTER_NOUN =
  /^(?:[^\S\n]*\/|[^\S\n]*-?(?:facing|side|level)\b|[^\S\n]+(?:costs?|prices?|pricing|rates?|fees?|side|contributions?|wholesale|retail|salary|salaries|pay|wages?|bonus(?:es)?|budget|total|each|apiece|per|a|an|monthly|annually|yearly|weekly|level|tier|cut|margin|markup)\b)/i;
/** The words that make a percentage our price, not a share, singular or
 *  plural: before it in its sentence ("our markups are 12%") or just after
 *  it ("a 12% markup"). */
const PRICED_SHARE_BEFORE =
  /\b(?:mark-?ups?|margins?|discounts?|commissions?|fees?|rates?|premiums?|surcharges?|admin|charge[sd]?|charging|prices?|priced|pricing|takes?|adds?|uplifts?|on top|costs?|costing|bill(?:s|ed|ing)?|invoic(?:e|es|ed|ing)|quot(?:e|es|ed|ing)|referrals?|rev(?:enue)? share|splits?|payouts?|spreads?|load(?:ed)?|burden)\b/i;
const PRICED_SHARE_AFTER =
  /^(?:(?:[ \t]+[A-Za-z][\w'’-]*){0,2}?[ \t]+(?:mark-?ups?|margins?|discounts?|commissions?|fees?|cut|surcharges?|premiums?|uplifts?|rates?|admin|on top|referrals?|rev(?:enue)? share|splits?|spreads?|load|burden)\b|[ \t]+(?:of|on)[ \t]+(?:the[ \t]+)?(?:gross|salary|salaries|payroll|wages|revenue|first-year|base|billing|invoice)\b)/i;
/** Does a price word stand before a position in its own sentence? A
 *  sentence starts after a ; or a line break, or after a stop that a space
 *  and a capital follow; a decimal point, "U.S." or "approx." ends nothing,
 *  so the same sentence reads the same on a second pass. One replace pass
 *  asks about one text many times, so the sentence starts and the price
 *  words are found once and kept for the next ask. */
const pricedOf = new Map<RegExp, { text: string; starts: number[]; hits: number[] }>();
function lastAtOrBefore(list: readonly number[], at: number): number {
  let lo = -1;
  let hi = list.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (list[mid] <= at) lo = mid;
    else hi = mid - 1;
  }
  return lo < 0 ? -1 : list[lo];
}
function pricedBefore(
  text: string,
  at: number,
  re: RegExp = PRICED_SHARE_BEFORE,
): boolean {
  let index = pricedOf.get(re);
  if (index?.text !== text) {
    const starts = [0];
    for (const hit of text.matchAll(/[!?](?=\s)|\.(?=\s+[A-Z(])|[;\n]/g))
      starts.push(hit.index + 1);
    const hits: number[] = [];
    for (const hit of text.matchAll(new RegExp(re.source, "gi")))
      hits.push(hit.index + hit[0].length);
    index = { text, starts, hits };
    pricedOf.set(re, index);
  }
  const hit = lastAtOrBefore(index.hits, at);
  return hit >= 0 && hit >= lastAtOrBefore(index.starts, at);
}
/** A figure from 1900 to 2099 is a year only where it is said as one:
 *  after a word that only ever sets a year ("in 2009", "since 2019", "Q3
 *  2026", "FY 2026", "the fall of 2026"), beside a month, as a run of
 *  consecutive years ("2025-2026", "2026/27"), or before a word a year leads
 *  ("the 2026 renewal"), and never in a sentence that talks price. A round
 *  figure in a price's place ("a fee of 2000", "2000 net", "1950-2050") is
 *  a figure like any other. */
const YEAR_BEFORE =
  /(?:\b(?:in|since|until|during|early|late|mid|as of|back in|(?:end|start|beginning|middle|half|quarter|fall|spring|summer|autumn|winter) of|class of|desde|depuis|FY|Q[1-4]|H[12])|©|\(c\)|copyright)[^\S\n]*$/i;
const YEAR_AFTER =
  /^[^\S\n]+(?:plan year|renewal|roadmap|open enrollment|enrollment|tax year|fiscal year|calendar year|census|Q[1-4]|H[12])\b(?![^\S\n]+(?:fees?|prices?|pricing|costs?|rates?|quotes?)\b)/i;
/** Price talk in a sentence keeps a year-shaped figure a figure. */
const YEAR_PRICE_WORDS =
  /\b(?:fees?|salar(?:y|ies)|sueldos?|salários?|salarios?|salaires?|pay|paid|pays|wages?|quot(?:e|es|ed)|cotiz\w*|costs?|prices?|pricing|budget|bonus|deposit|charge[sd]?|bill(?:s|ed)?|invoice[sd]?|offer(?:ed)?|asking|rate|total|comes? to|PEPM|precios?|costos?|tarifas?|honorarios|remunera\w*|r[ée]mun[ée]ration|preç(?:o|os)|custos?|prix|coûts?|tarifs?|mensual(?:es)?|mensais|cobr\w*|pag(?:a|an|ar|o|amos)|gan(?:a|aba|ha|hava))\b/i;
const YEAR_RATE = new RegExp(
  `^\\s?(?:k\\b|K\\b|M\\b|MM\\b|PEPM|PEPY|PMPM|PEPW|PEPA|PUPM|monthly|annually|yearly|weekly|per\\b|a\\s(?:month|year|week|head)|an\\s(?:hour|employee)|\\/\\s?[A-Za-z]|al mes|por mes|por mês|par mois|mensual|mensuales|mensais|mensuel|net\\b|gross\\b|bruto|brutos|brut|each\\b|apiece)`,
  "i",
);
/** A run of digits with letters glued to it, at most three on a side. */
const GLUED =
  /(?<![\p{L}\p{N}_,.])(?:\p{L}{1,3}\d(?:[\d,.]*\d)?(?: \d{3})*(?:\p{L}{1,3}\d*)?|\d(?:[\d,.]*\d)?(?: \d{3})*\p{L}{1,3}\d*)(?![\p{L}\p{N}_])/gu;
/** Names with a digit in them, which carry no money. */
const GLUED_NAMES =
  /^(?:Q[1-4]|H[12]|W-?[2489]s?|I-?9s?|H-?1B|[LOE]-?[123]|B2[BC]|P2P|SOC-?[12]|ISO\d+|[2-9]FA|24x7|[MO]365|Office365|[2-9][DGK]|COVID-?19|Y2K|FY\d{2,4}|v\d+(?:\.\d+)*|mp[34]|1099s|401ks)$/i;
/** An hour of the clock, the meridiem and the zones a time is said in. */
const HOUR = "(?:1[0-2]|0?[1-9])";
const MERIDIEM = "[AaPp]\\.?[Mm]\\.?";
const ZONES =
  "ET|CT|PT|MT|EST|EDT|CST|CDT|PST|PDT|MST|MDT|CET|CEST|GMT|UTC|BST|AST|central|eastern|pacific|mountain";
/** Words that make a sentence about meeting, where a bare hour is a time. */
const MEETING =
  /\b(?:meet|meeting|call|chat|talk|sync|demo|free|available|works?|catch up|zoom|teams|today|tomorrow|tonight|monday|tuesday|wednesday|thursday|friday|morning|afternoon|evening|lunch)\b/i;
/** The words that lead a phone number on its line. */
const PHONE_CUE =
  /(?:\b(?:call|cell|mobile|phone|tel|telephone|office|direct|fax|whatsapp|text)\b[^\n]{0,30}|(?:^|\s)[MTPCDOF]:\s*)$/i;
/** The partners' month names: Spanish, Portuguese and French. */
const MONTHS_X =
  "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|janeiro|fevereiro|março|maio|junho|julho|setembro|outubro|novembro|dezembro|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre";
/** A figure, or a range or an alternative of two read as one. */
const FIGURE = new RegExp(
  `(?<![\\w${String.fromCharCode(0xe001)}])(\\d(?:[\\d,.]*\\d)?)(?:[ \\t]?(?:-|–|to|or|and)[ \\t]?(\\d(?:[\\d,.]*\\d)?))?(\\s?(?:k|K|M|MM)\\b)?(%)?(?![\\w${String.fromCharCode(0xe000)}])`,
  "g",
);
/** A word after a figure, or a held form or a dotted abbreviation that
 *  describes the word after it ("45 W-2 employees", "12 U.S. employees"). */
const WORD = new RegExp(
  `(?:[^\\S\\n]+|-)(?:${String.fromCharCode(0xe000)}[a-z]+${String.fromCharCode(0xe001)}|(?:[A-Z]\\.){2,}|([\\p{L}][\\p{L}\\p{M}\\w'’]*))`,
  "uy",
);
/** The words that make a count's noun phrase a price label. */
const PHRASE_PRICE = new Set(
  "fee fees cost costs price prices pricing rate rates deposit deposits discount discounts credit credits stipend stipends allowance allowances charge charges invoice invoices payment payments bonus bonuses salary salaries pay wage wages budget total retainer premium surcharge markup margin spend comp compensation side contribution contributions wholesale retail apiece each per".split(
    " ",
  ),
);
/** Is the noun phrase after a count word a price: a slash or a price word
 *  right after it, or a price word anywhere in the next few words before a
 *  stop ("a 1500 client setup fee", "a 2000 year end bonus")? */
function pricedPhrase(tail: string): boolean {
  if (PRICE_AFTER_NOUN.test(tail)) return true;
  const words =
    /^(?:[^\S\n]+[\p{L}][\p{L}\p{M}\w'’-]*){1,4}/u.exec(tail)?.[0].trim().split(/\s+/) ??
    [];
  for (const w of words) {
    const lw = w.toLowerCase();
    if (STOPS.has(lw)) return false;
    if (PHRASE_PRICE.has(lw) || lw.split("-").some((p) => PHRASE_PRICE.has(p)))
      return true;
  }
  return false;
}
/** The price units a figure is set in: always money. */
const RATE_UNITS = "PEPM|PEPY|PMPM|PEPW|PEPA|PUPM";

/** The money rule where a person's own words render: an email kept whole
 *  (ship order 2026-10-20; CLAUDE.md, The email in the row) talks prices in
 *  more ways than any list of price forms can name, so this rule names what
 *  is not money and takes the rest. Every figure goes except a date, a time,
 *  a year, a phone number, an ordinal, a numbered label or form ("Day 1",
 *  "Tier 2", "W-2", "401k", "#4471"), a share that prices nothing, and a
 *  count, which is a figure followed on its own line by a word from the list
 *  of what a figure can count ("45 employees", "3 weeks", "4-5 India admin
 *  workers", "a 2-week trial") or set after a word that counts ("headcount
 *  45", "we hire 5 a month"). A
 *  figure with a currency on either side, spelled out as an amount, or set
 *  as a rate ("599 a month", "599 PEPM") always goes. Running it twice
 *  changes nothing. */
export function redactMoneyStrict(input: string): string {
  const held: string[] = [];
  const hold = (m: string): string => {
    let i = held.push(m) - 1;
    let tag = "";
    do {
      tag = String.fromCharCode(97 + (i % 26)) + tag;
      i = Math.floor(i / 26) - 1;
    } while (i >= 0);
    return `\uE000${tag}\uE001`;
  };
  const AMOUNT =
    "(?<!\\d[,.]?)(?:\\d{1,3}(?:[ \\u00A0\\u202F]\\d{3})+|\\d(?:[\\d,.]*\\d)?)";
  let s = redactMoney((input ?? "").replace(/[\uE000\uE001]/g, ""))
    // A figure with a currency on either side, by code, word or symbol.
    .replace(
      new RegExp(
        `(?:\\b(?:${CODES})|Rs\\.?|R\\$|C\\$|A\\$|NZ\\$|S\\$|[$€£¥₹₱₩])\\s?${AMOUNT}(?:\\s?(?:k|K|M|MM)\\b)?`,
        "g",
      ),
      "[—]",
    )
    .replace(
      new RegExp(
        `\\b${AMOUNT}(?:\\s?(?:k|K|M|MM))?\\s?(?:(?:${CODES}|${CURRENCY_WORDS})\\b|[€£¥₹$])`,
        "gi",
      ),
      "[—]",
    )
    // A figure set in a price unit, written apart or run together.
    .replace(new RegExp(`\\b${AMOUNT}\\s?(?:${RATE_UNITS})\\b`, "gi"), "[—]")
    // An amount spelled out, in words or in part, unless it counts ("two
    // hundred employees", "2 million users").
    .replace(
      new RegExp(
        `(?<!\\d[,.]?)\\b(?:(?:\\d(?:[\\d,.]*\\d)?|${NUMBER_WORDS})[\\s-]+){0,5}(?:hundred|thousand|million|billion|grand|lakhs?|lacs?|crores?)\\b(?:\\s(?:${CURRENCY_WORDS}))?(?!\\s(?:[\\w-]+\\s){0,2}?(?:${COUNTED_AFTER})\\b)`,
        "gi",
      ),
      "[—]",
    );

  // What is never money, held aside whole.
  s = s
    .replace(/https?:\/\/\S+|www\.\S+|[\w.%+-]+@[\w-]+(?:\.[\w-]+)+/g, hold)
    .replace(/\b\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?\b/g, hold)
    // A month and its day, with its year when one follows that is a year
    // and not a figure in its place ("Oct 1, 8500 gross" keeps only Oct 1).
    .replace(
      new RegExp(
        `\\b(?:(?:${MONTHS})\\.?\\s\\d{1,2}(?:st|nd|rd|th)?|\\d{1,2}(?:st|nd|rd|th)?\\s(?:of\\s)?(?:${MONTHS})\\b\\.?)(?:(,?\\s)(\\d{4})\\b)?`,
        "g",
      ),
      (
        m: string,
        sep: string | undefined,
        year: string | undefined,
        at: number,
        whole: string,
      ) => {
        if (!year) return hold(m);
        const day = m.slice(0, m.length - year.length - (sep ?? "").length);
        const after = whole.slice(at + m.length, at + m.length + 48);
        const isYear =
          /^(?:19|20)\d{2}$/.test(year) &&
          !YEAR_RATE.test(after) &&
          !pricedBefore(whole, at, YEAR_PRICE_WORDS);
        return isYear ? hold(m) : `${hold(day)}${sep ?? ""}${year}`;
      },
    )
    // A run of consecutive years said as one ("2025-2026", "2026/27").
    .replace(
      /\b((?:19|20)\d{2})[^\S\n]?(?:-|–|\/|to)[^\S\n]?((?:19|20)?\d{2})\b/g,
      (m: string, a: string, b: string) => {
        const from = Number(a);
        const to = b.length === 2 ? Math.floor(from / 100) * 100 + Number(b) : Number(b);
        return to > from && to - from <= 5 ? hold(m) : m;
      },
    )
    // A month and its year ("October 2026"), never one set as a rate.
    .replace(
      new RegExp(`\\b(?:${MONTHS})\\.?,?\\s(?:19|20)\\d{2}\\b`, "g"),
      (m: string, at: number, whole: string) =>
        YEAR_RATE.test(whole.slice(at + m.length, at + m.length + 48)) ? m : hold(m),
    )
    // A year said as one, never one set as a rate or in price talk.
    .replace(/\b(?:19|20)\d{2}\b/g, (m: string, at: number, whole: string) => {
      const after = whole.slice(at + m.length, at + m.length + 48);
      if (YEAR_RATE.test(after)) return m;
      if (pricedBefore(whole, at, YEAR_PRICE_WORDS)) return m;
      // "desde 1950 hasta 2300" is a range of figures, not a year.
      if (/^[^\S\n]*(?:hasta|até|a|to|-|–)[^\S\n]*\d/i.test(after)) return m;
      return YEAR_BEFORE.test(whole.slice(Math.max(0, at - 32), at)) ||
        YEAR_AFTER.test(after)
        ? hold(m)
        : m;
    })
    // A day and month: by slash with or without its year, by dot or dash
    // only with it, since "4.5 per head" is a price.
    .replace(
      /\b(\d{1,2})(?:\/(\d{1,2})(?:\/\d{2,4})?|([.-])(\d{1,2})\3\d{2,4})\b/g,
      (m, a: string, b?: string, _sep?: string, c?: string) => {
        const [x, y] = [Number(a), Number(b ?? c)];
        const date =
          (x >= 1 && x <= 12 && y >= 1 && y <= 31) ||
          (y >= 1 && y <= 12 && x >= 1 && x <= 31);
        return date ? hold(m) : m;
      },
    )
    // A time range or alternative said as one ("2-3pm", "10:30 or 11",
    // "between 1 and 3 pm").
    .replace(
      new RegExp(
        `\\b${HOUR}(?::[0-5]\\d)?[^\\S\\n]?(?:-|–|to|or|and)[^\\S\\n]?${HOUR}(?::[0-5]\\d)?[^\\S\\n]?(?:${MERIDIEM}|${ZONES})(?![a-z])`,
        "gi",
      ),
      hold,
    )
    .replace(
      new RegExp(
        `\\b${HOUR}(?::[0-5]\\d)?[^\\S\\n]?(?:-|–|or|and)[^\\S\\n]?${HOUR}:[0-5]\\d\\b|\\b${HOUR}:[0-5]\\d[^\\S\\n]?(?:-|–|or|and)[^\\S\\n]?${HOUR}\\b(?!:)`,
        "g",
      ),
      hold,
    )
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp]\.?[Mm]\.?)?/g, hold)
    // An hour before am or pm, never "49 pm" for per month, and never in
    // price talk.
    .replace(
      new RegExp(`\\b${HOUR}[^\\S\\n]?${MERIDIEM}(?![a-z])`, "g"),
      (m: string, at: number, whole: string) =>
        pricedBefore(whole, at, YEAR_PRICE_WORDS) ||
        /^\s?(?:per|each|a head)\b/i.test(whole.slice(at + m.length))
          ? m
          : hold(m),
    )
    // A bare hour before a zone ("4 ET").
    .replace(new RegExp(`\\b${HOUR}[^\\S\\n]?(?:${ZONES})\\b`, "g"), hold)
    // An hour said bare after the word that sets it ("meet at 2?"), only in
    // a sentence about meeting and never in one about price.
    .replace(
      /\b(?:at|by|around|before|after|until|till|from|between)\s(?:1[0-2]|[1-9])(?:\s?(?:or|and|to|-|–)\s?(?:1[0-2]|[1-9]))?\b(?![,.]?\d)(?!\s?(?:per|each|an? (?:hour|head|month|year|week|day))\b)/gim,
      (m: string, at: number, whole: string) => {
        // The sentence's own words, read by its starts, and the few words
        // after the hour, so a second pass reads the same sentence.
        const soon = whole
          .slice(at + m.length)
          .split(/[.!?;\n]/)[0]
          .split(/\s+/)
          .slice(0, 6)
          .join(" ");
        const meeting = pricedBefore(whole, at, MEETING) || MEETING.test(`${m} ${soon}`);
        return meeting && !pricedBefore(whole, at, YEAR_PRICE_WORDS) ? hold(m) : m;
      },
    )
    // The partners' dates and clocks ("15 de enero de 2027", "3 novembre",
    // "14h", "a las 10", "às 10h30").
    .replace(
      new RegExp(
        `\\b\\d{1,2}(?:º|er)?\\s(?:de\\s)?(?:${MONTHS_X})\\b(?:\\s(?:de\\s)?(?:19|20)\\d{2}\\b)?`,
        "gi",
      ),
      hold,
    )
    .replace(/\b(?:[01]?\d|2[0-3])h(?:[0-5]\d)?\b/g, hold)
    .replace(/(?:\ba las|\bàs|\bà)\s(?:[01]?\d|2[0-3])(?:[:h][0-5]\d)?\b/gi, hold)
    // A phone: dashed, dotted, in parentheses or with its country code, its
    // extension with it. One joined by spaces stays only alone on its line
    // or after a phone word; a price grid ("599 500 2000") is no phone.
    .replace(
      /(?:\+\d[\d ().-]{7,}\d|(?:\b1[.-])?\(\d{3}\)[ .-]?\d{3}[ .-]\d{4}\b|(?:\b1[.-])?\b\d{3}[.-]\d{3}[.-]\d{4}\b)(?:[ ]?(?:x|ext\.?)[ ]?\d{1,5}\b)?/g,
      hold,
    )
    .replace(/\b\d{3} \d{3} \d{4}\b/g, (m: string, at: number, whole: string) => {
      // The line around it, read no further than a line could run.
      const back = whole.slice(Math.max(0, at - 160), at);
      const cut = back.lastIndexOf("\n");
      const lead = cut >= 0 ? back.slice(cut + 1) : back;
      const fwd = whole.slice(at + m.length, at + m.length + 160);
      const alone =
        (cut >= 0 || at <= 160) &&
        !lead.trim() &&
        !fwd.split("\n")[0].trim() &&
        (fwd.includes("\n") || at + m.length + 160 >= whole.length);
      // Figures and taken figures read alike, so a second pass measures the
      // same distance to the phone word.
      return alone || PHONE_CUE.test(lead.replace(/\[—\]|\d+/g, "#")) ? hold(m) : m;
    })
    .replace(/\b\d+(?:st|nd|rd|th)\b/g, hold)
    .replace(
      /\b(?:401\s?\(?k\)?|403\s?\(?b\)?|457\s?\(?b\)?|Section\s125)(?![\w])/gi,
      hold,
    )
    // A form number is a form only said as one ("1099-NEC", "1099
    // contractors", "Form 940"); "Their fee is 941" is a price.
    .replace(
      /\b(?:1099|1095|94[01])(?:-[A-Z]{1,4}\b|(?=\s(?:forms?|filings?|contractors?|workers?|employees?|status|reporting|returns?|income)\b))/gi,
      hold,
    )
    .replace(/\b[A-Z]-\d{1,3}[A-Z]{0,3}\b/g, hold)
    // A numbered label, capitalized, its number short ("Day 1", "Tier 2",
    // "Ticket 4471"); "entry level 3500" is a salary.
    .replace(
      /\b(?:Day|Week|Phase|Step|Option|Tier|Level|Floor|Wave|Chapter|Version)\s?#?\d{1,2}(?:\.\d{1,2})?\b(?![,.]?\d)/g,
      hold,
    )
    .replace(
      /\b(?:Section|Article|Page|Room|Suite|Apt|Ext\.?|Ticket|Form|Case|Item|No\.?|Number|Unit|Line|Ref|PO|Group|Batch)\s?#?\d{1,8}\b/g,
      hold,
    )
    .replace(/\b(?:case|ticket)\s(?:number\s|#\s?)?\d{5,}\b/gi, hold)
    .replace(/\bQ[1-4]\b/g, hold)
    .replace(/#\d+\b/g, hold)
    .replace(/\bv\d+(?:\.\d+)+\b/gi, hold)
    .replace(/\bCOVID-19\b/gi, hold);

  // A figure glued to letters: a currency or a unit run into it
  // ("P25,000", "RM5000", "9000zł", "599ea", "60kpa", "599x12") goes; a name
  // with a digit in it ("Q3", "B2B", "SOC2", "M365") stays.
  s = s.replace(GLUED, (m: string, ...rest: unknown[]) => {
    const whole = rest[rest.length - 1] as string;
    const at = rest[rest.length - 2] as number;
    if (whole.charCodeAt(at - 1) === 0xe001 || whole.charCodeAt(at + m.length) === 0xe000)
      return m;
    // A bare multiplier ("1.5k") is the figure pass's to read with what follows.
    if (GLUED_NAMES.test(m) || /^\d(?:[\d,.]*\d)?(?:k|K|M|MM)$/.test(m)) return m;
    const digits = (/\d[\d,. ]*/.exec(m)?.[0] ?? "").replace(/\D/g, "");
    const unit = /\d(\p{L})/u.exec(m)?.[1] ?? "";
    return digits.length >= 2 || /^[kKmM]$/.test(unit) ? "[—]" : m;
  });

  // Every figure left, a range or an alternative read as one ("45-50",
  // "2 or 3"): kept when it counts or is a share that prices nothing; taken
  // otherwise. What decides reads words, never digits, and a range gets one
  // verdict, so a figure taken on the first pass changes nothing on the
  // second.
  s = s.replace(
    FIGURE,
    (
      m: string,
      n: string,
      end: string | undefined,
      mult: string,
      pct: string,
      at: number,
      whole: string,
    ) => {
      const take = () => m.replace(/\d(?:[\d,.]*\d)?(?:\s?(?:k|K|M|MM)\b)?%?/g, "[—]");
      const far = end ?? n;
      let after = whole.slice(at + m.length);
      if (pct)
        return pricedBefore(whole, at) || PRICED_SHARE_AFTER.test(after) ? take() : m;
      if (/^\s?(?:\/\s?[a-z]|monthly|annually|yearly|weekly)/i.test(after)) return take();
      // A headcount or a team of so many, with nothing after the figure and no
      // price in its sentence ("cost per headcount is 650" is a price).
      const before = whole.slice(Math.max(0, at - 40), at);
      if (
        !mult &&
        COUNTED_BEFORE.test(before) &&
        !/\bper\s+headcount\b/i.test(before) &&
        !pricedBefore(whole, at, YEAR_PRICE_WORDS) &&
        /^[^\S\n]*(?:[.,;:!?)]|\n|$)/.test(after)
      )
        return m;
      // "50+ employees" counts as 50 does.
      after = after.replace(/^\+/, "");
      // What it counts stands on its own line, after a couple of words that
      // describe it at most ("45 full-time employees", "4-5 India admin
      // workers", "45 W-2 employees", "12 U.S. employees"), hyphen-joined or
      // spaced, and no price follows it ("499 partner cost", "599
      // employee/month", "320 employee, 680 employer").
      const joined = /^-[a-z]/.test(after);
      let pos = 0;
      for (let i = 0; i < 3; i++) {
        WORD.lastIndex = pos;
        const hit = WORD.exec(after);
        if (!hit) break;
        pos = WORD.lastIndex;
        const w = hit[1];
        // A held form or a dotted abbreviation describes what follows.
        if (!w) continue;
        const lw = w.toLowerCase();
        if (STOPS.has(lw)) return take();
        const prose = w === lw || /^[A-Z]{2,4}s?$/.test(w);
        if (!prose) continue;
        const tail = after.slice(pos);
        if (TIME_PLURALS.has(lw)) return m;
        const describes = () => {
          const next = /^[^\S\n]+([\p{L}][\p{L}\p{M}\w'’-]*)/u.exec(tail)?.[1] ?? "";
          return !!next && !STOPS.has(next.toLowerCase()) && !pricedPhrase(tail);
        };
        // Time in the singular counts for one of it, joined by a hyphen, or
        // describing what follows ("a 90 day notice period"); "599 month to
        // month" and "649 year one" are prices.
        if (TIME_SINGULARS.has(lw))
          return far === "1" || (i === 0 && joined) || describes() ? m : take();
        if (COUNT_NOUNS.has(lw)) {
          if (pricedPhrase(tail)) return take();
          if (lw.endsWith("s") || PLURAL_ALWAYS.has(lw) || far === "1") return m;
          // A singular count describes what follows it ("a 50 person
          // company"); alone, it labels a price ("320 employee, 680
          // employer").
          return describes() ? m : take();
        }
        // One of a thing takes the singular: "1 designer".
        if (i === 0 && far === "1" && !mult) return m;
      }
      return take();
    },
  );
  return s
    .replace(/\uE000([a-z]+)\uE001/g, (_m, tag: string) => {
      let i = 0;
      for (const c of tag) i = i * 26 + (c.charCodeAt(0) - 96);
      return held[i - 1] ?? "";
    })
    .replace(/\[—\](?:[ \t]?(?:-|–)[ \t]?\[—\])+/g, "[—]");
}
