// The paste read: at the moment a capture is filed from the room (roomPaste,
// src/app/room/actions.ts), the raw text goes to Claude ONCE and comes back
// as clean, structured, dated entries plus signal flags ("mentions a new
// country", "reads like a stall"). One of the app's model calls, not its only
// one (the inventory: docs/architecture/dead-code-appendix.md §7). Everything
// downstream stays deterministic — this only ever REPLACES the paste-cleaning
// step, never the storage or render path. When ANTHROPIC_API_KEY is absent
// the app falls back to the rule-based parser and nothing here runs.

import { claudeClient, claudeAvailable } from "@/lib/claude/health";
import { sniffHead } from "@/lib/ingest/dialect";
import { ENTRY_CAP } from "@/lib/ingest/windows";
import { MODEL_READ } from "@/lib/intranet/doctrine";
import { COUNTRY_ALIASES, COUNTRY_NAME, redactMoney } from "@/lib/intel/lexicon";
import { normPerson } from "@/lib/intel/provenance";
import { countryIndex } from "@/lib/playbook/countries";
import { PRODUCTS } from "@/lib/playbook/products";
import type { EntryHeadcount, EntryPromise, TimelineEntry } from "@/lib/sf-timeline";

type ReadAction = {
  text: string;
  owner: "me" | "them";
  due: string; // YYYY-MM-DD or ""
  fallback: string; // the if/then riding the commitment, or ""
};
export type AiCleanResult = {
  entries: TimelineEntry[];
  signals: string[];
  // The full read — every field optional-by-emptiness so the timeline-only
  // dialects cost nothing extra.
  actions: ReadAction[];
  gaps: string[]; // what the record still can't answer for THIS deal
  competitorIntel: { fact: string; who: string }[]; // market facts, attributed
  lessons: string[]; // process lessons a future deal should remember
  outcome: { status: "none" | "lost" | "won"; phrase: string };
  accountName: string; // the company this paste is ABOUT ("" if unclear)
  // The deal facts ride on each entry (TimelineEntry in src/lib/sf-timeline.ts;
  // the plan's §2.1, §7 item 13): the model names them per entry and the
  // sanitizer clamps them to the lexicon, so the single read (slice 10) takes
  // the model's facts first and regex-mines only rows with no Filing. Until
  // then no surface reads them.
};

export function aiCleanAvailable(): boolean {
  return claudeAvailable();
}

const MAX_ENTRIES = ENTRY_CAP;
const MAX_SIGNALS = 8;
const MAX_ACTIONS = 6;
const MAX_GAPS = 5;
const MAX_INTEL = 4;
const MAX_LESSONS = 3;
const MAX_COUNTRIES = 12;
const MAX_PRODUCTS = 5;
const MAX_HEADCOUNTS = 8;
const MAX_PROMISES = 8;
// A header can carry a lot of people. Enough to hold a real distribution list
// without letting a reply grow the row without bound.
const MAX_RECIPIENTS = 30;

// ── The lexicon the deal facts are clamped to ───────────────────────────────
// Countries: the richest list the app holds is the Playbook's country index
// (every country on the pricing list plus the ones we get asked about, each
// with its aliases), joined with the extraction lexicon's aliases and
// adjectives (src/lib/intel/lexicon.ts) spelled onto the same names. A country
// neither knows is dropped, never stored. Products: the Playbook's five doors,
// by name, id and second name.
const normKey = (s: string): string =>
  (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^the /, "")
    .trim();

function buildCountryLexicon(): Map<string, string> {
  const map = new Map<string, string>();
  const put = (key: string, name: string) => {
    const k = normKey(key);
    if (k && !map.has(k)) map.set(k, name);
  };
  for (const row of countryIndex()) {
    put(row.name, row.name);
    // "Czech Republic/Czechia" answers to either half.
    for (const part of row.name.split("/")) put(part, row.name);
    // The alias column is space-joined — "uk britain england scotland wales",
    // "united arab emirates dubai abu dhabi" — so the whole string and each
    // word are keys; a word already taken by a name keeps the name.
    if (row.alias) {
      put(row.alias, row.name);
      for (const word of row.alias.split(/\s+/)) if (word.length > 1) put(word, row.name);
    }
  }
  // The extraction lexicon speaks in iso2 codes; its COUNTRY_NAME table turns
  // a code into a name, and the index's spelling of that name wins.
  for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) {
    const name = COUNTRY_NAME[code];
    if (!name) continue;
    put(alias, map.get(normKey(name)) ?? name);
  }
  return map;
}

const COUNTRY_LEXICON = buildCountryLexicon();

/** A country as the lexicon spells it, or "" when the lexicon does not know
 *  it. Exported so the suite can pin the clamp. */
export function canonCountry(name: string): string {
  return COUNTRY_LEXICON.get(normKey(name)) ?? "";
}

function buildProductLexicon(): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of PRODUCTS) {
    for (const key of [p.name, p.id, p.sub ?? ""]) {
      const k = normKey(key);
      if (k && !map.has(k)) map.set(k, p.name);
    }
  }
  return map;
}

const PRODUCT_LEXICON = buildProductLexicon();

/** A product as the Playbook names it, or "" when it is not one of the five. */
export function canonProduct(name: string): string {
  return PRODUCT_LEXICON.get(normKey(name)) ?? "";
}

// Structured-output schema — the API guarantees the reply parses to this.
const SCHEMA = {
  type: "object",
  properties: {
    entries: {
      type: "array",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", enum: ["email", "task", "call"] },
          subject: { type: "string" },
          from: { type: "string" },
          to: { type: "string" },
          others: { type: "integer" },
          recipients: { type: "array", items: { type: "string" } },
          timeLabel: { type: "string" },
          dayLabel: { type: "string" },
          dayIso: { type: "string" },
          body: { type: "string" },
          countries: { type: "array", items: { type: "string" } },
          products: { type: "array", items: { type: "string" } },
          headcounts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                what: { type: "string" },
                count: { type: "integer" },
              },
              required: ["what", "count"],
              additionalProperties: false,
            },
          },
          timing: { type: "string" },
          promises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                what: { type: "string" },
                by: { type: "string", enum: ["me", "them"] },
                hearer: { type: "string" },
                day: { type: "string" },
              },
              required: ["what", "by", "hearer", "day"],
              additionalProperties: false,
            },
          },
        },
        required: [
          "kind",
          "subject",
          "from",
          "to",
          "others",
          "recipients",
          "timeLabel",
          "dayLabel",
          "dayIso",
          "body",
          "countries",
          "products",
          "headcounts",
          "timing",
          "promises",
        ],
        additionalProperties: false,
      },
    },
    signals: { type: "array", items: { type: "string" } },
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          owner: { type: "string", enum: ["me", "them"] },
          due: { type: "string" },
          fallback: { type: "string" },
        },
        required: ["text", "owner", "due", "fallback"],
        additionalProperties: false,
      },
    },
    gaps: { type: "array", items: { type: "string" } },
    competitorIntel: {
      type: "array",
      items: {
        type: "object",
        properties: {
          fact: { type: "string" },
          who: { type: "string" },
        },
        required: ["fact", "who"],
        additionalProperties: false,
      },
    },
    lessons: { type: "array", items: { type: "string" } },
    outcome: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["none", "lost", "won"] },
        phrase: { type: "string" },
      },
      required: ["status", "phrase"],
      additionalProperties: false,
    },
    accountName: { type: "string" },
  },
  required: [
    "entries",
    "signals",
    "actions",
    "gaps",
    "competitorIntel",
    "lessons",
    "outcome",
    "accountName",
  ],
  additionalProperties: false,
} as const;

// The reader's contract — the system prompt every read runs under. Exported
// so the suite can pin its rules (the fulfillment rule among them) as the text
// the model is actually handed, never by scanning this file.
export const READER_CONTRACT = `You clean raw pastes from a Salesforce activity timeline (or emails / meeting notes) into structured activity entries for a sales command center. The operator reads these entries to decide their next move — every entry must carry actionable substance, or not exist.

Rules:
- One entry per real activity (an email sent, a task, a logged call). Emails quoted inside another email are part of that email's body context, not separate entries — but DO surface their substance.
- DROP ENTIRELY — do not emit an entry for: a collapsed email header with no readable body (subject + names + timestamp only); marketing/CRM tracking artifacts (survey Sent/Opened/Clicked tasks, "stopped by the booth" lead scans, list-email receipts, HubSpot activity stubs); "[No subject]" or "emails are not shared" placeholders; auto-generated support-desk or LMS notifications — unless the text states a decision, blocker, or commitment that affects the deal. An entry whose body would be empty must be dropped, never emitted as a bare subject line.
- Long meeting summaries or transcripts: do NOT recap. Distill to the deal-relevant core — decisions made, stated preferences and constraints, objections, named people with their roles, explicit commitments with owners, and dates. Write it dense: "Prefers SmartPay/InsurePay (broker of record stays); eComp takes BoR — friction. Owed: SmartPay+InsurePay follow-up — @Lucas." beats a narrative paragraph.
- The paste may instead be an OUTLOOK THREAD capture (a whole email conversation from the reading pane, possibly stamped "OUTLOOK THREAD") or a TEAMS chat copy. Outlook thread: one entry per message, newest first, from/to read from each message's own header; quoted history that repeats down the thread belongs to the message that first said it — never duplicate it. Ignore Outlook chrome (folder panes, ribbon labels, "Reply/Reply all/Forward", read receipts). Teams chat: one entry per conversation-day, kind "call"; keep speakers named inline ("Bryce: can we push to Sept 1?"); distill to decisions, asks, and owed items.
- A paste stamped "TYPED NOTE" is the operator's own notes, typed at the account's row: the operator wrote it, so "I" and "we" are the operator and our side. The stamp line itself is never an entry.
- If the paste lists action items, keep them in the body as "Owed: <thing> — @<owner>" lines and surface the most deal-relevant as signals.
- Strip ALL chrome and noise: Lightning UI labels ("Show more actions", "Expand All", field names like "From Address"/"Text Body"/"Priority"), security banners, "external sender" warnings, thread:: tokens, record ids, Zoom/Teams invite blocks (dial-ins, meeting ids, passcodes), email signatures, legal disclaimers, support-desk boilerplate ("NEVER include SSN…", "Responses via email to this case…").
- body: the actual human substance only, concise, at most 600 characters. Never invent or embellish — omit rather than guess. NEVER write header lines into the body — no "From:", "To:", "Sent:", "Cc:", "Subject:", no "authored by", no "written by". Who wrote to whom belongs in the from/to fields; the app renders that itself. Inside the body, name a person only when the sentence needs them ("Bryce wants the deposit language cut").
- subject: the real subject with "RE:/FW:" kept but case-thread tokens removed.
- recipients: EVERY person the message went to, To and Cc alike, as names normalized the same way — INCLUDING our own side. This is the one field where a @prismhr.com colleague or the operator must be listed; "to" below deliberately hides them and cannot answer "did this reach us". Order as the header had them. Empty array only when the header named no recipient at all.
- from / to: person names, normalized: first-person forms ("You", "me") become "Antaeus Coe" (the operator whose mailbox this is); "Last, First" renders as "First Last"; email-address tails in angle brackets drop. others: count of additional recipients ("and 1 other" → 1), else 0. WHEN A MESSAGE HAS SEVERAL RECIPIENTS, "to" names the person on the ACCOUNT'S side — never a @prismhr.com colleague, even when they lead the To line. Our own side (prismhr.com) is on nearly every thread and identifies nobody; a CSM who made an introduction is not who the operator is waiting on. Only when every recipient is @prismhr.com does "to" name a colleague. The count in others is unchanged either way.
- Dates: dayIso is YYYY-MM-DD resolved against today's date given in the message ("Today"/"Yesterday"/"Jul 30, 2025" all resolve). dayLabel is a short human label ("Jul 30" or "Today"). timeLabel like "5:27 PM", or "" if none. Unknown dates: dayIso "".
- kind: "email" for emails, "call" for logged calls, "task" for tasks/meetings/upcoming items.
- ATTRIBUTION IS SACRED. Threads quote earlier messages: attribute every statement to the author of the message where it FIRST appears — the latest sender did NOT say the quoted words below their reply. First-person statements ("I worked at…", "we required…") belong to the author of the message containing them. The operator is Antaeus Coe; he writes from his own mailbox, and he previously worked at Remote.com — so a line like "at Remote we required a deposit" inside HIS message is his own market knowledge, not a competitor speaking, and not a colleague's claim.
- actions: EXPLICIT commitments only — a "TO DO:" line, "I'll send…", a dated promise. owner "me" when the operator owes it, "them" when someone else does. due as YYYY-MM-DD only when actually stated. fallback carries an if/then riding the commitment ("if not, send the ESC demo — scrub proprietary"). NEVER invent an action from a musing ("we should probably…", "it might be worth…") — those are not commitments. THE FULFILLMENT RULE: before opening any commitment, read the REST of this document — a thread is a story in time, and a promise the same document later shows KEPT ("we'll get pricing together Monday" … three days later "Please see pricing attached") is history, never an open action. Only commitments the document leaves hanging become actions.
- gaps: up to ${MAX_GAPS} questions the record still cannot answer that would MOST advance this specific deal — grounded in its countries, products, and stage ("Do the India workers need benefits parity?" beats "what is the timeline"). Never generic discovery boilerplate.
- competitorIntel: market or competitor facts useful BEYOND this account — pricing models, deposit norms, competitor requirements, industry standards — each with WHO said it (attribution rule applies).
- lessons: process lessons a future deal should remember (what slowed, killed, or won this one). Empty unless the paste actually teaches one.
- outcome: "lost" when the paste STATES the deal is lost — the client's words (chose another vendor, walked away) OR the operator's own verdict ("close lost it", "mark it lost", "this one is dead, X's team owns it"); "won" only when signed/closed is stated; phrase = the exact evidence sentence, ≤120 chars. Otherwise "none" with "".
- accountName: the prospect/client company this paste is ABOUT (not the operator's own company, not a competitor) — "" when unclear.
- signals: 0-${MAX_SIGNALS} short flags a salesperson would want surfaced — a newly mentioned country or expansion, an implied or explicit deadline, hesitation or stalling tone, who actually holds the decision, a competitor or incumbent system named, escalation or frustration, an owed follow-up with its owner. Plain short sentences. Empty array if nothing notable.
- Each entry also carries the deal facts THAT entry states — on the message, call or task that said them, never pooled onto another entry, so every fact keeps who said it and when (the attribution rule applies). Most entries carry none; leave the arrays empty and timing "" then.
  - countries: every country this entry shows work to be done in — people to employ, pay, or quote for — by its plain English name ("Mexico", "United Kingdom", "Puerto Rico"). A country merely mentioned (an office they already have, a place someone is from) is NOT listed.
  - products: which of our five this entry is about, by name — employer of record, global payroll, contractor management, contractor of record, talent — only when the text says so or the need plainly is one.
  - headcounts: every number of people this entry states, as what they are and the count ("workers in Mexico" → 10, "contractors in the UK" → 3). Only numbers the text states; never estimate, never total.
  - timing: when they need it, in this entry's own words ("by January", "before the Q3 review", "no rush, next month"), or "" when the entry says nothing about when.
  - promises: the explicit commitments this entry makes, each with the person it was made TO — what was promised, by "me" (the operator) or "them", hearer = the name of the person who heard it ("" only when the text truly names no one), day = YYYY-MM-DD when a day was named for it, else "". The fulfillment rule applies here exactly as it does to actions: a promise the document later shows kept is history and is not listed.
- Order entries newest first. At most ${MAX_ENTRIES} entries.`;

// Deterministic noise gate — belt to the prompt's suspenders, and the same
// gate the rule-based parser's output passes through. An entry survives only
// if it carries substance a decision could rest on.
const NOISE_SUBJECT =
  /^(clicked|opened|sent)\b.*\bsurvey\b|\bstopped by\b.*\bbooth\b|^\[no subject\]$|^emails? are not shared/i;

export function isNoiseEntry(e: TimelineEntry): boolean {
  const subject = (e.subject ?? "").trim();
  const body = (e.body ?? "").trim();
  if (NOISE_SUBJECT.test(subject)) return true;
  // A bare header — an email or task with no substance beneath the subject —
  // is chrome, not intelligence.
  if (!body && e.kind !== "call") return true;
  return false;
}

export function dropNoiseEntries(entries: TimelineEntry[]): TimelineEntry[] {
  return entries.filter((e) => !isNoiseEntry(e));
}

const EMPTY_READ: Omit<AiCleanResult, "entries" | "signals"> = {
  actions: [],
  gaps: [],
  competitorIntel: [],
  lessons: [],
  outcome: { status: "none", phrase: "" },
  accountName: "",
};

// Defensive pass over the model's (already schema-valid) reply: coerce, cap,
// and money-redact everything before it reaches the client or the database.
export function sanitizeAiResult(raw: unknown): AiCleanResult {
  const out: AiCleanResult = {
    entries: [],
    signals: [],
    ...structuredClone(EMPTY_READ),
  };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as {
    entries?: unknown;
    signals?: unknown;
    actions?: unknown;
    gaps?: unknown;
    competitorIntel?: unknown;
    lessons?: unknown;
    outcome?: unknown;
    accountName?: unknown;
  };
  // The app parses several body grammars out of note and todo text — routing
  // markers (⇢[…]), tag markers (⚑[…]), the playbook and research tails (⟦…⟧,
  // ⟪…⟫), the ask prefix, and the fallback glyph. A model reply must never be
  // able to forge one, so those tokens are stripped on the way in.
  const GRAMMAR = /[⟦⟧⟪⟫↯]|[⇢⚑]\s*\[/g;
  const str = (v: unknown, cap: number) =>
    typeof v === "string"
      ? redactMoney(v.replace(GRAMMAR, " ").trim()).slice(0, cap)
      : "";
  // The entry's deal facts, clamped to the lexicon: a country or product the
  // app does not know is dropped, a count is a non-negative integer, every
  // string goes through the same redaction and grammar strip as the rest.
  const canonList = (v: unknown, canon: (s: string) => string, cap: number): string[] => {
    if (!Array.isArray(v)) return [];
    const out: string[] = [];
    for (const x of v) {
      const name = canon(str(x, 80));
      if (name && !out.includes(name)) out.push(name);
      if (out.length >= cap) break;
    }
    return out;
  };
  const headcountsOf = (v: unknown): EntryHeadcount[] => {
    if (!Array.isArray(v)) return [];
    const out: EntryHeadcount[] = [];
    for (const h of v.slice(0, MAX_HEADCOUNTS)) {
      if (!h || typeof h !== "object") continue;
      const x = h as Record<string, unknown>;
      const what = str(x.what, 80);
      if (!what || typeof x.count !== "number" || !Number.isFinite(x.count)) continue;
      out.push({ what, count: Math.max(0, Math.min(99999, Math.round(x.count))) });
    }
    return out;
  };
  const promisesOf = (v: unknown): EntryPromise[] => {
    if (!Array.isArray(v)) return [];
    const out: EntryPromise[] = [];
    for (const p of v.slice(0, MAX_PROMISES)) {
      if (!p || typeof p !== "object") continue;
      const x = p as Record<string, unknown>;
      const what = str(x.what, 200);
      if (what.length < 6) continue;
      out.push({
        what,
        by: x.by === "them" ? "them" : "me",
        hearer: normPerson(str(x.hearer, 80)),
        day: typeof x.day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.day) ? x.day : "",
      });
    }
    return out;
  };
  if (Array.isArray(r.entries)) {
    for (const e of r.entries.slice(0, MAX_ENTRIES)) {
      if (!e || typeof e !== "object") continue;
      const x = e as Record<string, unknown>;
      const kind = x.kind === "task" || x.kind === "call" ? x.kind : "email";
      const iso = typeof x.dayIso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.dayIso);
      out.entries.push({
        kind,
        subject: str(x.subject, 200),
        from: normPerson(str(x.from, 80)),
        to: normPerson(str(x.to, 80)),
        others:
          typeof x.others === "number" && Number.isFinite(x.others)
            ? Math.max(0, Math.min(99, Math.round(x.others)))
            : 0,
        timeLabel: str(x.timeLabel, 20),
        dayLabel: str(x.dayLabel, 20),
        dayIso: iso ? (x.dayIso as string) : "",
        // The whole receiving side, normalized exactly like from/to. Missed on
        // the first pass — the field was added to the schema and the prompt and
        // then dropped here, so it never reached storage and the guard that
        // reads it saw "" forever (raised by review, 2026-09-15).
        recipients: Array.isArray(x.recipients)
          ? x.recipients
              .slice(0, MAX_RECIPIENTS)
              .map((n) => normPerson(str(n, 80)))
              .filter(Boolean)
          : [],
        body: str(x.body, 800),
        countries: canonList(x.countries, canonCountry, MAX_COUNTRIES),
        products: canonList(x.products, canonProduct, MAX_PRODUCTS),
        headcounts: headcountsOf(x.headcounts),
        timing: str(x.timing, 120),
        promises: promisesOf(x.promises),
      });
    }
  }
  if (Array.isArray(r.signals)) {
    out.signals = r.signals
      .slice(0, MAX_SIGNALS)
      .map((s) => str(s, 200))
      .filter(Boolean);
  }
  if (Array.isArray(r.actions)) {
    for (const a of r.actions.slice(0, MAX_ACTIONS)) {
      if (!a || typeof a !== "object") continue;
      const x = a as Record<string, unknown>;
      const text = str(x.text, 200);
      if (text.length < 6) continue;
      out.actions.push({
        text,
        owner: x.owner === "them" ? "them" : "me",
        due: typeof x.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.due) ? x.due : "",
        fallback: str(x.fallback, 200),
      });
    }
  }
  if (Array.isArray(r.gaps))
    out.gaps = r.gaps
      .slice(0, MAX_GAPS)
      .map((g) => str(g, 160))
      .filter((g) => g.length >= 8);
  if (Array.isArray(r.competitorIntel)) {
    for (const c of r.competitorIntel.slice(0, MAX_INTEL)) {
      if (!c || typeof c !== "object") continue;
      const x = c as Record<string, unknown>;
      const fact = str(x.fact, 240);
      if (fact.length >= 12)
        out.competitorIntel.push({ fact, who: normPerson(str(x.who, 60)) });
    }
  }
  if (Array.isArray(r.lessons))
    out.lessons = r.lessons
      .slice(0, MAX_LESSONS)
      .map((l) => str(l, 240))
      .filter((l) => l.length >= 12);
  if (r.outcome && typeof r.outcome === "object") {
    const o = r.outcome as Record<string, unknown>;
    out.outcome = {
      status: o.status === "lost" || o.status === "won" ? o.status : "none",
      phrase: str(o.phrase, 120),
    };
  }
  out.accountName = str(r.accountName, 80);
  out.entries = dropNoiseEntries(out.entries);
  return out;
}

// Does the model's account claim agree with the row the operator is filing
// to? Empty claim = no objection. Fuzzy on purpose: "Simploy" matches
// "Simploy, Inc." and "Advocate Pay — SubcontractorHub" matches "Advocate
// Pay LLC" by first significant token.
export function accountMatches(claim: string, bound: string): boolean {
  const norm = (s: string) =>
    (s ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .replace(/\b(inc|llc|corp|corporation|company|co|ltd|the)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const c = norm(claim);
  const b = norm(bound);
  if (!c || !b) return true;
  if (b.includes(c) || c.includes(b)) return true;
  const ct = c.split(" ")[0];
  const bt = b.split(" ")[0];
  return !!ct && !!bt && (ct === bt || b.includes(ct) || c.includes(bt));
}

// One call, one paste. Throws on API failure — the caller degrades to the
// rule-based parser. `now` is passed in so date resolution is testable.
// The client gets an explicit timeout sized to serverless hosting (the SDK
// default is ten minutes — the platform kills the function long before that),
// and a truncated generation is surfaced as a REAL error instead of the
// invalid-JSON parse failure it used to masquerade as.
export async function aiCleanTimeline(raw: string, now: Date): Promise<AiCleanResult> {
  const client = claudeClient({ timeout: 55_000, maxRetries: 1 });
  const todayIso = now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  // Opus or better, always — founder-decreed 2026-07-31. One roster, one slot.
  const model = MODEL_READ;
  // A full call transcript is the richest capture the app ever reads, and the
  // costliest to under-read: a live demo routinely leaves several promises on
  // the table, and each one the read misses is a deliverable missed in the
  // real world. Say so, explicitly, when the paste is a transcript.
  const ctHunt =
    sniffHead(raw).dialect === "CT"
      ? `\n\nThis is a complete call transcript. Hunt every commitment made on the call: "I'll send", "we'll get you", "let me pull together", "I'll check with", a recap or follow-up owed, a question someone promises to answer later. Each is an action with its owner. A demo or discovery call routinely leaves three to six commitments; finding only one usually means some were missed — sweep the closing minutes especially, where owed items concentrate. Mine the whole call for gaps, competitor intel, and lessons too.`
      : "";
  const request = (maxTokens: number) =>
    client.messages.create({
      model,
      max_tokens: maxTokens,
      system: READER_CONTRACT,
      messages: [
        {
          role: "user",
          content: `Today's date is ${todayIso} (America/Chicago).${ctHunt}\n\nRaw paste:\n\n${raw}`,
        },
      ],
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
    });
  // 40 dense entries can run past 8k output tokens; ask high, fall back if
  // the model tier rejects the ceiling.
  const msg = await request(16384).catch((e: unknown) => {
    const status = (e as { status?: number })?.status;
    if (status === 400) return request(8192);
    throw e;
  });
  if (msg.stop_reason === "max_tokens")
    throw new Error("paste too large for one clean — split it and try again");
  const text = msg.content.find((b) => b.type === "text");
  return sanitizeAiResult(JSON.parse(text?.type === "text" ? text.text : "{}"));
}
