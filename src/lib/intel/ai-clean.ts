// The app's single LLM touchpoint: at the moment a paste is filed from
// Intake, the raw text goes to Claude ONCE and comes back as clean,
// structured, dated entries plus signal flags ("mentions a new country",
// "reads like a stall"). Everything downstream stays deterministic — this
// only ever REPLACES the paste-cleaning step, never the storage or render
// path. When ANTHROPIC_API_KEY is absent the app falls back to the
// rule-based parser and nothing here runs.

import Anthropic from "@anthropic-ai/sdk";
import { redactMoney } from "@/lib/intel/lexicon";
import { normPerson } from "@/lib/intel/provenance";
import type { TimelineEntry } from "@/lib/sf-timeline";

export type ReadAction = {
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
};

export function aiCleanAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const MAX_ENTRIES = 40;
const MAX_SIGNALS = 8;
const MAX_ACTIONS = 6;
const MAX_GAPS = 5;
const MAX_INTEL = 4;
const MAX_LESSONS = 3;

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
          timeLabel: { type: "string" },
          dayLabel: { type: "string" },
          dayIso: { type: "string" },
          body: { type: "string" },
        },
        required: [
          "kind",
          "subject",
          "from",
          "to",
          "others",
          "timeLabel",
          "dayLabel",
          "dayIso",
          "body",
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

const SYSTEM = `You clean raw pastes from a Salesforce activity timeline (or emails / meeting notes) into structured activity entries for a sales command center. The operator reads these entries to decide their next move — every entry must carry actionable substance, or not exist.

Rules:
- One entry per real activity (an email sent, a task, a logged call). Emails quoted inside another email are part of that email's body context, not separate entries — but DO surface their substance.
- DROP ENTIRELY — do not emit an entry for: a collapsed email header with no readable body (subject + names + timestamp only); marketing/CRM tracking artifacts (survey Sent/Opened/Clicked tasks, "stopped by the booth" lead scans, list-email receipts, HubSpot activity stubs); "[No subject]" or "emails are not shared" placeholders; auto-generated support-desk or LMS notifications — unless the text states a decision, blocker, or commitment that affects the deal. An entry whose body would be empty must be dropped, never emitted as a bare subject line.
- Long meeting summaries or transcripts: do NOT recap. Distill to the deal-relevant core — decisions made, stated preferences and constraints, objections, named people with their roles, explicit commitments with owners, and dates. Write it dense: "Prefers SmartPay/InsurePay (broker of record stays); eComp takes BoR — friction. Owed: SmartPay+InsurePay follow-up — @Lucas." beats a narrative paragraph.
- The paste may instead be an OUTLOOK THREAD capture (a whole email conversation from the reading pane, possibly stamped "OUTLOOK THREAD") or a TEAMS chat copy. Outlook thread: one entry per message, newest first, from/to read from each message's own header; quoted history that repeats down the thread belongs to the message that first said it — never duplicate it. Ignore Outlook chrome (folder panes, ribbon labels, "Reply/Reply all/Forward", read receipts). Teams chat: one entry per conversation-day, kind "call"; keep speakers named inline ("Bryce: can we push to Sept 1?"); distill to decisions, asks, and owed items.
- If the paste lists action items, keep them in the body as "Owed: <thing> — @<owner>" lines and surface the most deal-relevant as signals.
- Strip ALL chrome and noise: Lightning UI labels ("Show more actions", "Expand All", field names like "From Address"/"Text Body"/"Priority"), security banners, "external sender" warnings, thread:: tokens, record ids, Zoom/Teams invite blocks (dial-ins, meeting ids, passcodes), email signatures, legal disclaimers, support-desk boilerplate ("NEVER include SSN…", "Responses via email to this case…").
- body: the actual human substance only, concise, at most 600 characters. Never invent or embellish — omit rather than guess. NEVER write header lines into the body — no "From:", "To:", "Sent:", "Cc:", "Subject:", no "authored by", no "written by". Who wrote to whom belongs in the from/to fields; the app renders that itself. Inside the body, name a person only when the sentence needs them ("Bryce wants the deposit language cut").
- subject: the real subject with "RE:/FW:" kept but case-thread tokens removed.
- from / to: person names, normalized: first-person forms ("You", "me") become "Antaeus Coe" (the operator whose mailbox this is); "Last, First" renders as "First Last"; email-address tails in angle brackets drop. others: count of additional recipients ("and 1 other" → 1), else 0.
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
        body: str(x.body, 800),
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

// Which model reads this paste. A Salesforce timeline or an Outlook thread is
// shaped work — headers, subjects, dates — and the cheap model does it well.
// Freeform call notes are the opposite: no structure, all judgment, and the
// commitments hide inside prose ("need the demo by 7/30, if not use ESC").
// Those get the strong model, because a missed commitment there is a missed
// deliverable in the real world.
const SHAPED_HEAD =
  /^\s*(OUTLOOK THREAD|TEAMS CHAT|TEAMS THREAD)\b|^\s*(From|To|Sent|Subject|Cc)\s*:/im;
const SF_CHROME = /\b(Show more actions|Expand All|From Address|Text Body|thread::)\b/i;
const NOTE_SCENT =
  /\b(to\s*do|todo|action items?|next steps?|call (?:with|notes)|meeting (?:with|notes)|notes? from|debrief|recap)\b/i;

export function looksLikeNotes(raw: string): boolean {
  const text = (raw ?? "").trim();
  if (!text) return false;
  // Anything wearing mail or CRM clothing is shaped, whatever else it says.
  if (SHAPED_HEAD.test(text) || SF_CHROME.test(text)) return false;
  // Long walls of dialogue (transcripts) are notes-shaped too — they are pure
  // judgment — but a wall past this size costs more than the read is worth.
  if (text.length > 24_000) return false;
  const lines = text.split("\n").filter((l) => l.trim()).length;
  return NOTE_SCENT.test(text) || lines <= 40;
}

/** Opus or better, always — founder-decreed 2026-07-31. Haiku is never a
 *  model this app uses. The signature keeps its argument so callers and tests
 *  never notice the roster change. */
export function modelFor(raw: string): string {
  void raw;
  return "claude-opus-5";
}

// One call, one paste. Throws on API failure — the caller degrades to the
// rule-based parser. `now` is passed in so date resolution is testable.
// The client gets an explicit timeout sized to serverless hosting (the SDK
// default is ten minutes — the platform kills the function long before that),
// and a truncated generation is surfaced as a REAL error instead of the
// invalid-JSON parse failure it used to masquerade as.
export async function aiCleanTimeline(raw: string, now: Date): Promise<AiCleanResult> {
  const client = new Anthropic({ timeout: 55_000, maxRetries: 1 });
  const todayIso = now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  const model = modelFor(raw);
  // A full call transcript is the richest capture the app ever reads, and the
  // costliest to under-read: a live demo routinely leaves several promises on
  // the table, and each one the read misses is a deliverable missed in the
  // real world. Say so, explicitly, when the paste is a transcript.
  const ctHunt = /^CALL TRANSCRIPT\b/.test(raw.trimStart())
    ? `\n\nThis is a complete call transcript. Hunt every commitment made on the call: "I'll send", "we'll get you", "let me pull together", "I'll check with", a recap or follow-up owed, a question someone promises to answer later. Each is an action with its owner. A demo or discovery call routinely leaves three to six commitments; finding only one usually means some were missed — sweep the closing minutes especially, where owed items concentrate. Mine the whole call for gaps, competitor intel, and lessons too.`
    : "";
  const request = (maxTokens: number) =>
    client.messages.create({
      model,
      max_tokens: maxTokens,
      system: SYSTEM,
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
