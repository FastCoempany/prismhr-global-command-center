// The read rung's reason — the model's answer to one question (the Chute
// brains refactor plan, slice 5; D9 as amended 2026-10-05 — CLAUDE.md, The
// Chute; the founder's answer to §7 item 3).
//
// The read rung disputes when the company the read names is not the row's
// (src/lib/ingest/guard.ts). The rule's reason can only say that much. The
// model reads what the rule cannot: the capture's head and first part, the
// bound account's page data, the claimed account's, and the web, and answers
// whether the two are the same company under another name — a parent, a
// subsidiary, a trading name, a rebrand. When they are, the warning
// withdraws and the filing proceeds; a PEO that renamed itself is not a
// misfile. When they are not, the model's reason is the verdict's, nine
// words or fewer in plain words, naming both companies. When the call fails,
// or no key exists, the rule's reason stands: the model informs the verdict,
// it never blocks one.
//
// The call runs only when the read rung would dispute, never on every
// filing. Opus or better, always: the slot is MODEL_VERDICT on the one
// roster (src/lib/intranet/doctrine.ts). The model's reason is operator
// copy under the writing canon and goes through the same sanitizer the
// read's strings do, then the canon's lint; a line that fails either is
// rejected and the rule's reason stands.

import type Anthropic from "@anthropic-ai/sdk";
import { claudeClient, claudeAvailable } from "@/lib/claude/health";
import { MODEL_VERDICT } from "@/lib/intranet/doctrine";
import { lintReason } from "@/lib/activity/lint";
import { getPeo, peos } from "@/lib/book";
import { contactsFor } from "@/lib/book/contacts";
import { AKA } from "@/lib/book/merge";
import { extractCountries, getDemand } from "@/lib/book/research";
import { routingRoster } from "@/lib/book/roster";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { REASON_WORDS, type GuardVerdict } from "@/lib/ingest/guard";
import { researchNs } from "@/lib/intel/deep-research";
import { redactMoney } from "@/lib/intel/lexicon";

/** An account as the verdict call sees it: its name and a compact text of
 *  its page data — "" for a company the book does not hold. */
export type AccountPage = { name: string; page: string };

/** The slice of the model client the call needs — a test hands in a stub,
 *  the way the Filing module takes its client (src/lib/ingest/filing.ts). */
export type VerdictClient = {
  messages: {
    create(params: Anthropic.MessageCreateParamsNonStreaming): Promise<Anthropic.Message>;
  };
};

export type VerdictAnswer = {
  /** The same business under another name: the warning withdraws. */
  sameCompany: boolean;
  /** The model's reason after the sanitizer, or null when it was rejected
   *  and the rule's reason stands. */
  reason: string | null;
};

/** How much of the capture the verdict reads: its first 2,000 characters.
 *  Not a read window (D4): the note keeps the text whole, the read has its
 *  own windows, and this slice is the verdict's evidence alone. */
export const EXCERPT_CAP = 2_000;
/** How much page data each account brings, after redaction. */
export const PAGE_CAP = 2_000;
/** Web searches the verdict may spend, half the research pass's. */
const SEARCHES = 4;
const CONTACTS_SHOWN = 12;
const RESEARCH_LINES = 5;

const SYSTEM = `You settle one question for a sales record. The operator dropped a file on one account, and the record's rules read the file as a different company. Decide whether the file's company and the account it was dropped on are the same company.

Same company means the same business under another name: a trading name or DBA, a rebrand, a parent, a subsidiary, or a company one of them acquired or merged into. A different PEO, a competitor, a vendor, or a client of the PEO is not the same company. The accounts are PEOs and staffing firms, and their mail is often about their own clients; a client is a different company.

Read the file's head line and excerpt and both accounts' page data first. Use web search, at most four searches, only when the page data does not settle it, to check whether one company trades as, owns, or was renamed to the other.

Answer sameCompany true when the file's company and the account it was dropped on are the same company by that definition, and false otherwise. Give a reason of nine words or fewer in plain words a person would say, naming both companies by name. When false, say why the file looks like a different company than the one it was dropped on. When true, say how the two are the same company. No hedging words, no dashes, no figures, nothing you did not read in the file, the page data, or a search result.`;

const SCHEMA = {
  type: "object",
  properties: {
    sameCompany: {
      type: "boolean",
      description:
        "True when the file's company and the account it was dropped on are the same company under another name.",
    },
    reason: {
      type: "string",
      description: "Nine words or fewer, plain words, naming both companies by name.",
    },
  },
  required: ["sameCompany", "reason"],
  additionalProperties: false,
} as const;

function userPrompt(inp: {
  head: string;
  excerpt: string;
  bound: AccountPage;
  claim: AccountPage;
}): string {
  const page = (a: AccountPage, absent: string) =>
    a.page.trim() ? a.page.trim() : absent;
  return [
    `Dropped on: ${inp.bound.name}`,
    page(inp.bound, "(no page data on file)"),
    "",
    `Reads like: ${inp.claim.name}`,
    page(inp.claim, "(not an account in our book)"),
    "",
    "The file's head line:",
    inp.head.trim() || "(none)",
    "",
    "The file's first part:",
    inp.excerpt.slice(0, EXCERPT_CAP),
  ].join("\n");
}

// ── the sanitizer ───────────────────────────────────────────────────────────

// The app parses several body grammars out of note and todo text; a model
// reply must never be able to forge one (the read's sanitizer, src/lib/intel/
// ai-clean.ts, strips the same tokens).
const GRAMMAR = /[⟦⟧⟪⟫↯]|[⇢⚑]\s*\[/g;

const wordsOf = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;

/** The model's reason as the verdict may carry it, or null when it is
 *  rejected: empty, over nine words, carrying a figure, or failing the
 *  writing canon's lint. The lint's own count caps a gem's reason at eight;
 *  this reason has nine by decree, so that one fault is read here instead. */
export function cleanReason(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.replace(GRAMMAR, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/^["“'‘]+|["”'’]+$/g, "").trim();
  if (!s) return null;
  // A figure in the reason is a figure the room would render: the line
  // dies rather than carrying the redaction mark.
  if (redactMoney(s) !== s) return null;
  if (!/[.!?]$/.test(s)) s = `${s}.`;
  if (wordsOf(s.replace(/[.!]$/, "")) > REASON_WORDS) return null;
  const lint = lintReason(s);
  const faults = lint.faults.filter((f) => !/\bwords\b.*\bcap\b/.test(f));
  return faults.length === 0 ? s : null;
}

function parseAnswer(content: Anthropic.Message["content"]): VerdictAnswer | null {
  const texts = content.filter((b): b is Anthropic.TextBlock => b.type === "text");
  const tryParse = (s: string): VerdictAnswer | null => {
    try {
      const v = JSON.parse(s) as { sameCompany?: unknown; reason?: unknown };
      if (!v || typeof v !== "object" || typeof v.sameCompany !== "boolean") return null;
      return { sameCompany: v.sameCompany, reason: cleanReason(v.reason) };
    } catch {
      return null;
    }
  };
  // The structured answer is the last text block; a plain-text answer still
  // ends in one object.
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i]!.text.trim();
    const direct = tryParse(t);
    if (direct) return direct;
    const objects = t.match(/\{[^{}]*\}/g) ?? [];
    for (let j = objects.length - 1; j >= 0; j--) {
      const found = tryParse(objects[j]!);
      if (found) return found;
    }
  }
  return null;
}

// ── the call ────────────────────────────────────────────────────────────────

/** One question to the model: same company, or not, and why in nine words.
 *  Returns null when there is no key, the call fails, the reply is cut
 *  short, or nothing parses — the caller keeps the rule's reason. A test
 *  hands in a stub client; without one the call needs a live key. */
export async function verdictReason(
  inp: { head: string; excerpt: string; bound: AccountPage; claim: AccountPage },
  client?: VerdictClient,
): Promise<VerdictAnswer | null> {
  const c =
    client ??
    (claudeAvailable() ? claudeClient({ timeout: 90_000, maxRetries: 0 }) : null);
  if (!c) return null;
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userPrompt(inp) }];
  const ask = (structured: boolean) =>
    c.messages.create({
      model: MODEL_VERDICT,
      max_tokens: 4096,
      system: SYSTEM,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: SEARCHES }],
      messages,
      ...(structured
        ? { output_config: { format: { type: "json_schema", schema: SCHEMA } } }
        : {}),
    });
  try {
    // Structured output first. Should the API refuse the format beside the
    // search tool, the same ask runs once more as plain text and the answer
    // is read out of its last object.
    let structured = true;
    let msg = await ask(true).catch((e: unknown) => {
      if ((e as { status?: number })?.status !== 400) throw e;
      structured = false;
      return ask(false);
    });
    // A search run can come back paused rather than finished. Continue it
    // once, as the research pass does (src/lib/intel/deep-research.ts).
    if (msg.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: msg.content });
      msg = await ask(structured);
    }
    if (msg.stop_reason !== "end_turn" && msg.stop_reason !== "stop_sequence")
      return null;
    return parseAnswer(msg.content);
  } catch {
    return null;
  }
}

// ── the page data ───────────────────────────────────────────────────────────

/** The newest deep-research note's body for an account, or null: no
 *  database, no note, or a store that would not answer. */
async function latestResearchNote(accountId: string): Promise<string | null> {
  if (!hasDatabaseEnv()) return null;
  try {
    const rows = await getPrisma().accountNote.findMany({
      where: { accountId: researchNs(accountId) },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { body: true },
    });
    return rows[0]?.body ?? null;
  } catch {
    return null;
  }
}

/** The head lines of a research note: the summary and its signal lines,
 *  never the machine tail or the source list. */
function researchHead(body: string | null): string {
  if (!body) return "";
  return body
    .replace(/⟪[\s\S]*⟫\s*$/, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^Sources:/i.test(l))
    .slice(0, RESEARCH_LINES)
    .join("\n");
}

/** An account's page data as compact text — the book's row, its other
 *  names, its domains and people, the sweep's read and the latest research
 *  note's head lines — redacted and capped. A test hands in its own
 *  research reader; the default reads the store. */
export async function accountPage(
  accountId: string,
  research: (accountId: string) => Promise<string | null> = latestResearchNote,
): Promise<AccountPage> {
  const p = getPeo(accountId);
  if (!p) return { name: "", page: "" };
  const roster = routingRoster().find((a) => a.id === p.id);
  const aka = AKA[p.id] ?? [];
  const people = [
    p.contactName
      ? `${p.contactName}${p.contactEmail ? ` <${p.contactEmail}>` : ""}`
      : "",
    ...contactsFor(p.id).map((c) =>
      [`${c.first ?? ""} ${c.last ?? ""}`.trim(), c.title, c.email && `<${c.email}>`]
        .filter(Boolean)
        .join(", "),
    ),
  ]
    .filter(Boolean)
    .slice(0, CONTACTS_SHOWN);
  const demand = getDemand(p.id);
  const countries = extractCountries(demand);
  const where = [p.city, p.state].filter(Boolean).join(", ");
  const lines = [
    `Name: ${p.name}`,
    aka.length ? `Also known as: ${aka.join(", ")}` : "",
    p.website ? `Site: ${p.website}` : "",
    roster?.domains.length ? `Email domains: ${roster.domains.join(", ")}` : "",
    where ? `Where: ${where}` : "",
    p.industry ? `Industry: ${p.industry}` : "",
    people.length ? `People: ${people.join("; ")}` : "",
    countries.length ? `Countries named: ${countries.join(", ")}` : "",
    demand?.summary ? `Research: ${demand.summary}` : "",
    researchHead(await research(p.id)),
  ].filter(Boolean);
  return { name: p.name, page: redactMoney(lines.join("\n")).slice(0, PAGE_CAP) };
}

const normName = (s: string): string =>
  (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** The claimed company's page: the book's account when the claim is one of
 *  its names — the book's own or one it is also known as — and the bare name
 *  when the book does not hold it (a PEO's client, most days). Exact names
 *  only: the guard's fuzzy match (accountMatches) lets a one-letter head
 *  token stand for a company, and a wrong page would mislead the model. */
export async function claimPage(
  claim: string,
  research?: (accountId: string) => Promise<string | null>,
): Promise<AccountPage> {
  const key = normName(claim);
  if (!key) return { name: claim, page: "" };
  const hit = peos.find(
    (p) => normName(p.name) === key || (AKA[p.id] ?? []).some((a) => normName(a) === key),
  );
  if (!hit) return { name: claim, page: "" };
  const page = await accountPage(hit.id, research);
  return {
    name: claim === hit.name ? hit.name : `${claim} (${hit.name} in the book)`,
    page: page.page,
  };
}

/** Both sides' page data for a verdict, from the book and the store. */
export async function verdictPages(
  bound: { id: string; name: string },
  claim: string,
): Promise<{ bound: AccountPage; claim: AccountPage }> {
  const [b, c] = await Promise.all([accountPage(bound.id), claimPage(claim)]);
  return { bound: b.name ? b : { name: bound.name, page: "" }, claim: c };
}

// ── the read rung, with the model's say ─────────────────────────────────────

/** The read rung's verdict after the model has spoken: null when the model
 *  finds the same company and the warning withdraws; the verdict with the
 *  model's reason when it finds a different one; the verdict as the rule
 *  built it when the model had no answer. */
export async function readRungVerdict(
  verdict: GuardVerdict,
  capture: { head: string; excerpt: string },
  bound: { id: string; name: string },
  deps: {
    client?: VerdictClient;
    pages?: (
      bound: { id: string; name: string },
      claim: string,
    ) => Promise<{ bound: AccountPage; claim: AccountPage }>;
  } = {},
): Promise<GuardVerdict | null> {
  let answer: VerdictAnswer | null = null;
  try {
    const pages = await (deps.pages ?? verdictPages)(bound, verdict.claim);
    answer = await verdictReason(
      {
        head: capture.head,
        excerpt: capture.excerpt.slice(0, EXCERPT_CAP),
        bound: pages.bound,
        claim: pages.claim,
      },
      deps.client,
    );
  } catch {
    answer = null;
  }
  if (!answer) return verdict;
  if (answer.sameCompany) return null;
  // The held box's grounds say whose reason this is (slice 18a): the model's
  // reads "Web check"; the rule's verdict stands untouched when it had none.
  return answer.reason
    ? { ...verdict, reason: answer.reason, reasonBy: "model" }
    : verdict;
}
