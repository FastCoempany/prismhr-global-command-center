// The research pass. Company AND stakeholders, and the first run is the deep
// one — a real search over their own site, their job postings (which countries
// they're hiring into is the tell nobody publishes on purpose), news, funding,
// and the people named on the deal. One pass per account is cents; after that
// it's free to read, because the findings are filed as notes like everything
// else and the whole app can already see notes.
//
// Refreshing re-runs the pass and diffs against the last one, so the second look
// answers "what changed" instead of repeating itself.

import Anthropic from "@anthropic-ai/sdk";
import { claudeClient, claudeAvailable } from "@/lib/claude/health";
import { MODEL_RESEARCH } from "@/lib/intranet/doctrine";
import { DEMAND_GATE, getDemand, researchGeneratedAt } from "@/lib/book/research";
import { redactMoney } from "@/lib/intel/lexicon";
import { normPerson } from "@/lib/intel/provenance";

export const RESEARCH_NS = "research:";

export function researchNs(accountId: string): string {
  return `${RESEARCH_NS}${accountId}`;
}

/** The research chip reads the LATEST of both stores — the on-demand deep
 *  pass (research: notes) and the book-wide sweep — never whichever one the
 *  surface happened to read first (the Spring; the Ted doctrine's merge-by-
 *  latest). Undefined only when neither has touched the account. */
export function latestResearchAt(deep?: string, sweep?: string): string | undefined {
  const d = Date.parse(deep ?? "");
  const s = Date.parse(sweep ?? "");
  const hasDeep = !Number.isNaN(d);
  const hasSweep = !Number.isNaN(s);
  if (!hasDeep && !hasSweep) return undefined;
  if (hasDeep && (!hasSweep || d >= s)) return deep;
  return sweep;
}

// ── the demand both stores speak (pass 8 G7; pass 9 seam, S-12) ─────────────
// The book-wide sweep scores demand; the account's own pass names the signals
// it found and carries no score. The later of the two speaks, as the research
// chip reads the date: a later pass that found a signal reads as real demand
// and clears the gate on its own; a later pass that found none is silent, and
// the sweep stands in. The sweep's number still ranks where it agrees; below
// the gate it is an older read the pass overturned, and the composite rests on
// the desk score alone. One spelling: Groundwork's queue and the room's
// account intel (/partners, the sheet's signals) both read it, so the two
// never disagree on whether an account's demand is real.

/** The book-wide sweep's moment for one account, "" when the sweep never
 *  researched it — the same reading the Spring's research chip takes. */
export function sweepAtFor(accountId: string): string {
  return getDemand(accountId)?.researched && researchGeneratedAt
    ? `${researchGeneratedAt}T12:00:00Z`
    : "";
}

/** The account's own newest research pass (research:<account>): its moment
 *  and what it found. */
export type OwnPass = {
  at: string;
  signals: number;
  countries?: readonly string[];
  summary?: string;
};

export type ResearchDemand = {
  /** Demand clears the gate, by the sweep's score or a later pass's signal. */
  real: boolean;
  /** The score the composite reads; null when no sweep scored the account,
   *  or a later pass overturned a score below the gate. */
  score: number | null;
  confidence: "high" | "medium" | "low";
  /** The account's own pass is the later store and found a signal. */
  ownSpeaks: boolean;
};

export function researchDemand(
  accountId: string,
  own?: Pick<OwnPass, "at" | "signals"> | null,
): ResearchDemand {
  const sweep = getDemand(accountId);
  const score = sweep?.researched ? sweep.demandScore : null;
  const swept = (score ?? 0) >= DEMAND_GATE;
  const confidence = sweep?.confidence ?? "low";
  const ownAt = own?.at ?? "";
  const ownSpeaks =
    !!ownAt &&
    (own?.signals ?? 0) > 0 &&
    latestResearchAt(ownAt, sweepAtFor(accountId)) === ownAt;
  if (!ownSpeaks) return { real: swept, score, confidence, ownSpeaks };
  return { real: true, score: swept ? score : null, confidence, ownSpeaks };
}

/** Every account's newest research pass, from the notes the wide loader
 *  hands back (research:<account>, newest first). */
export function ownPassesFrom(
  notesById: ReadonlyMap<string, readonly { body: string; createdAt: string }[]>,
): Map<string, OwnPass> {
  const out = new Map<string, OwnPass>();
  for (const [id, notes] of notesById) {
    if (!id.startsWith(RESEARCH_NS)) continue;
    const accountId = id.slice(RESEARCH_NS.length);
    const newest = notes[0];
    if (!accountId || !newest) continue;
    const f = parseResearchBody(newest.body);
    out.set(accountId, {
      at: newest.createdAt,
      signals: f?.signals.length ?? 0,
      countries: f?.countries ?? [],
      summary: f?.summary ?? "",
    });
  }
  return out;
}

type ResearchFinding = {
  summary: string; // 2-4 plain sentences: what this company is and does
  signals: string[]; // hiring/expansion/compliance signals worth acting on
  countries: string[]; // countries named anywhere in the evidence
  people: { name: string; title: string; note: string }[];
  asks: string[]; // questions this research says are worth asking
  sources: { title: string; url: string }[];
};

const EMPTY_FINDING: ResearchFinding = {
  summary: "",
  signals: [],
  countries: [],
  people: [],
  asks: [],
  sources: [],
};

const SYSTEM = `You research a prospect company for a consultant who sells international employment services (employer of record, contractor management, and global payroll) to US staffing, PEO and HR service providers.

Use web search. Look at, in priority order:
1. The company's own site — what they do, who they serve, size, locations.
2. Their open job postings and careers page. WHICH COUNTRIES they are hiring into is the single most valuable signal available, because it predicts the need before the company articulates it. Note remote/international roles specifically.
3. Recent news, funding, acquisitions, new offices, leadership changes.
4. The named people you are given: current title, tenure, what they own, anything public they've said about growth, hiring, or operations.

Rules:
- Only report what a source actually supports. No inference presented as fact, no filler. An empty field beats a guessed one.
- Never state a dollar figure, price, funding amount, salary, or any currency amount. Headcounts and country counts are fine and wanted.
- "signals" are things that change how this deal should be worked ("posting two engineering roles in Poland", "opened a Mexico office in March"), not marketing copy.
- "asks" are questions worth asking THIS company given what you found — grounded in their countries and their model, never generic discovery.
- Keep every string under 220 characters.

End your reply with a single JSON object inside a \`\`\`json fence and nothing after it:
{"summary":"","signals":[],"countries":[],"people":[{"name":"","title":"","note":""}],"asks":[],"sources":[{"title":"","url":""}]}`;

const CAPS = { signals: 8, countries: 12, people: 8, asks: 6, sources: 10 };

export function parseFinding(raw: string): ResearchFinding {
  const fence = /```json\s*([\s\S]*?)```/i.exec(raw ?? "");
  const body = fence ? fence[1] : (raw ?? "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.trim());
  } catch {
    // A model that ignored the fence still usually emits one object.
    const i = body.indexOf("{");
    const j = body.lastIndexOf("}");
    if (i < 0 || j <= i) return { ...EMPTY_FINDING };
    try {
      parsed = JSON.parse(body.slice(i, j + 1));
    } catch {
      return { ...EMPTY_FINDING };
    }
  }
  if (!parsed || typeof parsed !== "object") return { ...EMPTY_FINDING };
  const r = parsed as Record<string, unknown>;
  const str = (v: unknown, cap = 220) =>
    typeof v === "string" ? redactMoney(v.trim()).slice(0, cap) : "";
  const list = (v: unknown, cap: number) =>
    Array.isArray(v)
      ? v
          .slice(0, cap)
          .map((x) => str(x))
          .filter((x) => x.length >= 3)
      : [];
  const out: ResearchFinding = {
    summary: str(r.summary, 700),
    signals: list(r.signals, CAPS.signals),
    countries: list(r.countries, CAPS.countries),
    people: [],
    asks: Array.isArray(r.asks)
      ? r.asks
          .slice(0, CAPS.asks)
          .map((x) => str(x))
          .filter((x) => x.length >= 8)
      : [],
    sources: [],
  };
  if (Array.isArray(r.people)) {
    for (const p of r.people.slice(0, CAPS.people)) {
      if (!p || typeof p !== "object") continue;
      const x = p as Record<string, unknown>;
      const name = normPerson(str(x.name, 80));
      if (!name) continue;
      out.people.push({ name, title: str(x.title, 90), note: str(x.note, 200) });
    }
  }
  if (Array.isArray(r.sources)) {
    for (const s of r.sources.slice(0, CAPS.sources)) {
      if (!s || typeof s !== "object") continue;
      const x = s as Record<string, unknown>;
      const url = str(x.url, 300);
      if (!/^https?:\/\//i.test(url)) continue;
      out.sources.push({ title: str(x.title, 140) || url, url });
    }
  }
  return out;
}

// The filed body. Human-readable first (it lands in the account's record and
// the intel corpus reads it), machine tail last so a refresh can diff.
export function researchBody(f: ResearchFinding, at: Date): string {
  const day = at.toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "numeric",
    day: "numeric",
    year: "2-digit",
  });
  const lines = [`⌕ Research — ${day}`];
  if (f.summary) lines.push(f.summary);
  if (f.signals.length) lines.push(`Signals: ${f.signals.join(" · ")}`);
  if (f.countries.length) lines.push(`Countries named: ${f.countries.join(", ")}`);
  if (f.people.length)
    lines.push(
      `People: ${f.people
        .map((p) => [p.name, p.title].filter(Boolean).join(" — "))
        .join(" · ")}`,
    );
  if (f.sources.length) lines.push(`Sources: ${f.sources.map((s) => s.url).join(" ")}`);
  return `${lines.join("\n")}\n⟪${JSON.stringify(f)}⟫`;
}

export function parseResearchBody(body: string): ResearchFinding | null {
  const m = /⟪(\{[\s\S]*\})⟫\s*$/.exec(body ?? "");
  if (!m) return null;
  try {
    return parseFinding(m[1]);
  } catch {
    return null;
  }
}

// What changed since the last pass — the only thing worth reading twice.
export function diffFindings(
  prev: ResearchFinding | null,
  next: ResearchFinding,
): string[] {
  if (!prev) return [];
  const out: string[] = [];
  const gone = <T>(a: T[], b: T[]) => a.filter((x) => !b.includes(x));
  const fresh = gone(next.signals, prev.signals);
  const dropped = gone(prev.signals, next.signals);
  const newCountries = gone(next.countries, prev.countries);
  const prevNames = prev.people.map((p) => p.name);
  const newPeople = next.people.filter((p) => !prevNames.includes(p.name));
  if (newCountries.length) out.push(`New countries: ${newCountries.join(", ")}`);
  for (const s of fresh.slice(0, 5)) out.push(`New: ${s}`);
  for (const p of newPeople.slice(0, 4))
    out.push(`New name: ${[p.name, p.title].filter(Boolean).join(" — ")}`);
  for (const s of dropped.slice(0, 3)) out.push(`Gone quiet: ${s}`);
  return out;
}

export function researchAvailable(): boolean {
  return claudeAvailable();
}

// One deep pass. Throws on API failure; the caller reports it rather than
// silently filing nothing.
export async function runResearch(input: {
  accountName: string;
  site?: string;
  people?: string[];
  countries?: string[];
  now: Date;
}): Promise<ResearchFinding> {
  // Sized to a long serverless budget, and no retry: a second full pass on
  // timeout would double a slow call into a certain one.
  const client = claudeClient({ timeout: 170_000, maxRetries: 0 });
  const known = [
    input.site ? `Their site: ${input.site}` : "",
    input.people?.length ? `People already on the deal: ${input.people.join(", ")}` : "",
    input.countries?.length
      ? `Countries the record already mentions: ${input.countries.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Today is ${input.now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })}.\n\nResearch this company: ${input.accountName}\n${known}`,
    },
  ];
  const ask = () =>
    client.messages.create({
      model: MODEL_RESEARCH,
      max_tokens: 8192,
      system: SYSTEM,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }],
      messages,
    });

  // A long search run can come back paused rather than finished. Continue it
  // once instead of filing a half-done pass; anything still unfinished after
  // that is an error the operator should see, not an empty finding.
  let msg = await ask();
  if (msg.stop_reason === "pause_turn") {
    messages.push({ role: "assistant", content: msg.content });
    msg = await ask();
  }
  if (msg.stop_reason === "max_tokens")
    throw new Error("the research pass ran long — try again");
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return parseFinding(text);
}
