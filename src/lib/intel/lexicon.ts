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
    "personne personnes"
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
  "a an the per each every to for in at on of by from with and or is was are be as than over under across into via vs versus plus after before until last next this que por al par de du le la el".split(
    " ",
  ),
);
/** The words for numbers that spell an amount out ("sixty thousand"). */
const NUMBER_WORDS =
  "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|a|and";
/** The plurals that make a spelled amount a count ("two hundred employees"). */
const COUNTED_AFTER =
  "employees|people|workers|hires|staff|contractors|clients|users|seats|heads|countries|locations";
/** Words just before a figure that say it counts people: a headcount, a
 *  team of so many, and a pace of hiring said straight on ("we hire 5 a
 *  month"). "Contractors: 49" and "hiring at 75000" are prices. */
const COUNTED_BEFORE =
  /(?:\bheadcount\s*(?:[:=]|of|is|at|around|about)?|\b(?:team|staff) of|\b(?:hire|hires|hiring))\s*$/i;
/** The words that make a percentage our price, not a share: before it in
 *  its sentence ("our markup is 12%") or just after it ("a 12% markup"). */
const PRICED_SHARE_BEFORE =
  /\b(?:markup|mark-up|margin|discount|commission|fees?|rates?|premium|surcharge|admin|charge[sd]?|charging|price[sd]?|pricing|takes?|adds?|uplift|on top)\b/i;
const PRICED_SHARE_AFTER =
  /^(?:[ \t]+[A-Za-z][\w'’-]*){0,2}?[ \t]+(?:markup|mark-up|margin|discount|commission|fees?|cut|surcharge|premium|uplift|rate|admin|on top)\b/i;
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
  const AMOUNT = "(?:\\d{1,3}(?:[ \\u00A0\\u202F]\\d{3})+|\\d(?:[\\d,.]*\\d)?)";
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
        `\\b(?:(?:\\d(?:[\\d,.]*\\d)?|${NUMBER_WORDS})[\\s-]+){0,5}(?:hundred|thousand|million|billion|grand)\\b(?:\\s(?:${CURRENCY_WORDS}))?(?!\\s(?:[\\w-]+\\s){0,2}?(?:${COUNTED_AFTER})\\b)`,
        "gi",
      ),
      "[—]",
    );

  // What is never money, held aside whole.
  s = s
    .replace(/https?:\/\/\S+|www\.\S+|[\w.%+-]+@[\w-]+(?:\.[\w-]+)+/g, hold)
    .replace(/\b\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?\b/g, hold)
    .replace(
      new RegExp(
        `\\b(?:${MONTHS})\\.?\\s\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s\\d{4})?\\b`,
        "g",
      ),
      hold,
    )
    .replace(
      new RegExp(
        `\\b\\d{1,2}(?:st|nd|rd|th)?\\s(?:of\\s)?(?:${MONTHS})\\b\\.?(?:,?\\s\\d{4})?`,
        "g",
      ),
      hold,
    )
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
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp]\.?[Mm]\.?)?/g, hold)
    .replace(/\b\d{1,2}\s?[AaPp]\.?[Mm]\.?(?![a-z])/g, hold)
    // An hour said bare after the word that sets it ("meet at 2?").
    .replace(
      /\b(?:at|by|around|before|after|until|till)\s(?:1[0-2]|[1-9])(?=[ \t]?(?:[.,;!?)]|$)|\s(?:or|today|tomorrow|tonight|on|o'clock|ET|CT|CST|CDT|EST|EDT|PT|PST|PDT|MT|central|eastern|pacific)\b)/gim,
      hold,
    )
    .replace(
      /\+\d[\d\s().-]{7,}\d|(?:\b1[\s.-])?\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g,
      hold,
    )
    .replace(/\b\d+(?:st|nd|rd|th)\b/g, hold)
    .replace(
      /\b(?:401\s?\(?k\)?|403\s?\(?b\)?|457\s?\(?b\)?|1099(?:-[A-Z]{1,4})?|1095-?[A-C]|94[01]|Section\s125)(?![\w])/gi,
      hold,
    )
    .replace(/\b[A-Z]-\d{1,3}[A-Z]{0,3}\b/g, hold)
    .replace(
      /\b(?:Day|Week|Phase|Step|Option|Tier|Level|Section|Form|Version|Room|Suite|Floor|Apt|Ext\.?|Article|Chapter|Page|Wave|Ticket)\s?#?\d[\d.]*\b/gi,
      hold,
    )
    .replace(
      /\b(?:No\.?|Number|Unit|Line|Item|Case|Ref|PO|Group|Batch|Q)\s?#?\d[\d.]*\b/g,
      hold,
    )
    .replace(/#\d+\b/g, hold)
    // A year, unless it is set as a rate or a price.
    .replace(
      new RegExp(
        `\\b(?:19|20)\\d{2}\\b(?!\\s?(?:k|K|M|MM|${RATE_UNITS}|monthly|annually|yearly|weekly|per\\b|a\\s(?:month|year|week|head)|an\\shour|\\/))`,
        "g",
      ),
      hold,
    );

  // Every figure left: kept when it counts or is a share that prices
  // nothing; taken otherwise. What decides reads words, never digits, so a
  // figure taken on the first pass changes nothing on the second.
  s = s.replace(
    /(?<![\w\uE001])(\d(?:[\d,.]*\d)?)(\s?(?:k|K|M|MM)\b)?(%)?(?![\w\uE000])/g,
    (m: string, n: string, mult: string, pct: string, at: number, whole: string) => {
      let after = whole.slice(at + m.length);
      if (pct) {
        const sentence =
          whole
            .slice(0, at)
            .split(/[.!?;\n]/)
            .pop() ?? "";
        return PRICED_SHARE_BEFORE.test(sentence) || PRICED_SHARE_AFTER.test(after)
          ? "[—]"
          : m;
      }
      if (!mult && COUNTED_BEFORE.test(whole.slice(Math.max(0, at - 40), at))) return m;
      // A range reads as one figure: what follows its far end decides.
      const range = /^[ \t]?(?:-|–|to)[ \t]?\d(?:[\d,.]*\d)?/.exec(after);
      if (range) after = after.slice(range[0].length);
      if (/^\s?(?:\/\s?[a-z]|monthly|annually|yearly|weekly)/i.test(after)) return "[—]";
      // What it counts stands on its own line, after a couple of words that
      // describe it at most ("45 full-time employees", "4-5 India admin
      // workers"), hyphen-joined or spaced.
      const joined = /^-[a-z]/.test(after);
      const words =
        after
          .match(
            /^(?:(?:[ \t\u00A0]+|-)[A-Za-z\u00C0-\u024F][\w'’\u00C0-\u024F]*){1,3}/,
          )?.[0]
          .replace(/^-/, "")
          .trim()
          .split(/[ \t\u00A0-]+/)
          .filter(Boolean) ?? [];
      for (const [i, w] of words.entries()) {
        const lw = w.toLowerCase();
        if (STOPS.has(lw)) return "[—]";
        const prose = w === lw || /^[A-Z]{2,4}s?$/.test(w);
        if (!prose) continue;
        if (COUNT_NOUNS.has(lw) || TIME_PLURALS.has(lw)) return m;
        if (TIME_SINGULARS.has(lw) && (n === "1" || (i === 0 && joined))) return m;
        // One of a thing takes the singular: "1 designer".
        if (i === 0 && n === "1" && !mult) return m;
      }
      return "[—]";
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
