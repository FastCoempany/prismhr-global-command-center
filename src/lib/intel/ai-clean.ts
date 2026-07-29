// The app's single LLM touchpoint: at the moment a paste is filed from
// Intake, the raw text goes to Claude ONCE and comes back as clean,
// structured, dated entries plus signal flags ("mentions a new country",
// "reads like a stall"). Everything downstream stays deterministic — this
// only ever REPLACES the paste-cleaning step, never the storage or render
// path. When ANTHROPIC_API_KEY is absent the app falls back to the
// rule-based parser and nothing here runs.

import Anthropic from "@anthropic-ai/sdk";
import { redactMoney } from "@/lib/intel/lexicon";
import type { TimelineEntry } from "@/lib/sf-timeline";

export type AiCleanResult = { entries: TimelineEntry[]; signals: string[] };

export function aiCleanAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const MAX_ENTRIES = 40;
const MAX_SIGNALS = 8;

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
  },
  required: ["entries", "signals"],
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
- body: the actual human substance only, concise, at most 600 characters. Never invent or embellish — omit rather than guess.
- subject: the real subject with "RE:/FW:" kept but case-thread tokens removed.
- from / to: person or address names as written. others: count of additional recipients ("and 1 other" → 1), else 0.
- Dates: dayIso is YYYY-MM-DD resolved against today's date given in the message ("Today"/"Yesterday"/"Jul 30, 2025" all resolve). dayLabel is a short human label ("Jul 30" or "Today"). timeLabel like "5:27 PM", or "" if none. Unknown dates: dayIso "".
- kind: "email" for emails, "call" for logged calls, "task" for tasks/meetings/upcoming items.
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

// Defensive pass over the model's (already schema-valid) reply: coerce, cap,
// and money-redact everything before it reaches the client or the database.
export function sanitizeAiResult(raw: unknown): AiCleanResult {
  const out: AiCleanResult = { entries: [], signals: [] };
  if (!raw || typeof raw !== "object") return out;
  const r = raw as { entries?: unknown; signals?: unknown };
  const str = (v: unknown, cap: number) =>
    typeof v === "string" ? redactMoney(v.trim()).slice(0, cap) : "";
  if (Array.isArray(r.entries)) {
    for (const e of r.entries.slice(0, MAX_ENTRIES)) {
      if (!e || typeof e !== "object") continue;
      const x = e as Record<string, unknown>;
      const kind = x.kind === "task" || x.kind === "call" ? x.kind : "email";
      const iso = typeof x.dayIso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.dayIso);
      out.entries.push({
        kind,
        subject: str(x.subject, 200),
        from: str(x.from, 80),
        to: str(x.to, 80),
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
  out.entries = dropNoiseEntries(out.entries);
  return out;
}

// One call, one paste. Throws on API failure — the caller degrades to the
// rule-based parser. `now` is passed in so date resolution is testable.
export async function aiCleanTimeline(raw: string, now: Date): Promise<AiCleanResult> {
  const client = new Anthropic();
  const todayIso = now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  const msg = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 8192,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Today's date is ${todayIso} (America/Chicago).\n\nRaw paste:\n\n${raw}`,
      },
    ],
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
  });
  const text = msg.content.find((b) => b.type === "text");
  return sanitizeAiResult(JSON.parse(text?.type === "text" ? text.text : "{}"));
}
