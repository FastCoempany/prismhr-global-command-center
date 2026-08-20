// The wire — outside signals, filed as ordinary notes so downstream stays
// deterministic. A sweep is the app's one sanctioned external fetch (a Claude
// web-search pass, the deep-research template); items land immutable under the
// wire: namespace, deduped by URL hash, each carrying a one-sentence read in
// the plan-§3 voice. No RSS, no scheduler: the page checks staleness on entry
// and the operator runs the sweep behind one click.

import Anthropic from "@anthropic-ai/sdk";
import { peos } from "@/lib/book";
import { redactMoney } from "@/lib/intel/lexicon";
import {
  ACCOUNT_TERM_CAP,
  CATEGORY_TERMS,
  COMPETITOR_TERMS,
  DISAMBIGUATION,
  FAMILY_TERMS,
  accountTerms,
} from "./wire-keywords";

export const WIRE_NS = "wire:";
export const WIRE_STALE_HOURS = 12;

export type WireItem = {
  headline: string;
  source: string; // outlet name, e.g. "HR Dive"
  url: string;
  at: string; // ISO the sweep filed it
  keywords: string[];
  accountIds: string[]; // matched book accounts
  read: string; // one sentence: why this matters here
};

// djb2 — stable, dependency-free URL hash for the namespace key.
export function urlHash(url: string): string {
  let h = 5381;
  for (let i = 0; i < url.length; i++) h = ((h << 5) + h + url.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

export function wireNoteBody(item: WireItem): string {
  const head = `⚡ WIRE ${item.source} — ${item.headline}`;
  return `${head}\n${item.read}\n⟪wire⟫${JSON.stringify(item)}⟪/wire⟫`;
}

export function parseWireBody(body: string): WireItem | null {
  const m = /⟪wire⟫([\s\S]*?)⟪\/wire⟫/.exec(body);
  if (!m) return null;
  try {
    const raw = JSON.parse(m[1]) as Partial<WireItem>;
    if (!raw.headline || !raw.url || !raw.source) return null;
    return {
      headline: String(raw.headline),
      source: String(raw.source),
      url: String(raw.url),
      at: String(raw.at ?? ""),
      keywords: Array.isArray(raw.keywords) ? raw.keywords.map(String) : [],
      accountIds: Array.isArray(raw.accountIds) ? raw.accountIds.map(String) : [],
      read: String(raw.read ?? ""),
    };
  } catch {
    return null;
  }
}

// Match a headline+summary against the book roster by name. Corporate tails
// (", Inc.", " LLC") come off before matching — news never prints them — and
// the boundary check uses lookarounds, because \b fails at names that end in
// punctuation. Case-insensitive; names must still land as whole words.
const matchableName = (name: string): string =>
  name
    .replace(/[,.]?\s+(inc|llc|l\.l\.c|ltd|co|corp|corporation|company)\.?$/i, "")
    .trim();

export function matchAccounts(text: string): string[] {
  const hits: string[] = [];
  for (const p of peos) {
    const base = matchableName(p.name) || p.name;
    const esc = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`(?<![A-Za-z0-9])${esc}(?![A-Za-z0-9])`, "i").test(text))
      hits.push(p.id);
  }
  return hits;
}

export function wireAvailable(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function newestWireIso(items: WireItem[]): string | null {
  let newest: string | null = null;
  for (const i of items) if (!newest || i.at > newest) newest = i.at;
  return newest;
}

export function sweepDue(items: WireItem[], now: Date): boolean {
  const newest = newestWireIso(items);
  if (!newest) return true;
  return now.getTime() - Date.parse(newest) > WIRE_STALE_HOURS * 3_600_000;
}

// Account-matched first, then newest.
export function orderWire(items: WireItem[]): WireItem[] {
  return [...items].sort((a, b) => {
    const am = a.accountIds.length > 0 ? 1 : 0;
    const bm = b.accountIds.length > 0 ? 1 : 0;
    if (bm !== am) return bm - am;
    return b.at.localeCompare(a.at);
  });
}

const SYSTEM = `You run the outside-news watch for a PrismHR Global business
consultant. Sweep recent news (last 7 days preferred) from reputable outlets —
SHRM, HR Dive, Staffing Industry Analysts, Bloomberg Law/Tax, Reuters,
TechCrunch, HR Executive, NAPEO's PEO Insider — for items matching this watch
registry, and return ONLY a fenced json block:

\`\`\`json
{"items":[{"headline":"...","source":"HR Dive","url":"https://...","keywords":["..."],"accounts":["exact account name if one is the subject"],"read":"one plain sentence on why this matters to the consultant's book"}]}
\`\`\`

Rules for the read sentence: plain words a peer who wasn't there would follow;
name the mechanism, not a vibe; never a dollar figure. Only items you actually
found at a real URL; 4 to 8 items; skip anything that merely mentions a word
without mattering.`;

export async function runWireSweep(now: Date): Promise<WireItem[]> {
  // The sweep needs the room the platform gives it: six searches plus the
  // synthesis ran ~121s and the old 120s client timeout killed it one second
  // short, every time, silently (caught 2026-08-20). The function cap is 300s.
  const client = new Anthropic({ timeout: 240_000, maxRetries: 0 });
  const disambig = Object.entries(DISAMBIGUATION)
    .map(([k, v]) => `${k} = ${v}`)
    .join("; ");
  const accounts = accountTerms().slice(0, ACCOUNT_TERM_CAP);
  const prompt = `Today is ${now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })}.

Watch registry —
Category terms: ${CATEGORY_TERMS.join(", ")}.
Competitors: ${COMPETITOR_TERMS.join(", ")}.
Our family: ${FAMILY_TERMS.join(", ")}.
Account names to watch for as news subjects (companies in the consultant's book): ${accounts.join("; ")}.
Disambiguation: ${disambig}.`;

  const ask = () =>
    client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      system: SYSTEM,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
      messages: [{ role: "user", content: prompt }],
    });
  let msg = await ask();
  if (msg.stop_reason === "pause_turn") {
    msg = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      system: SYSTEM,
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: msg.content },
        { role: "user", content: "Finish the json block." },
      ],
    });
  }
  const text = msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const fence = /```json\s*([\s\S]*?)```/.exec(text);
  if (!fence) return [];
  let parsed: { items?: unknown[] } = {};
  try {
    parsed = JSON.parse(fence[1]);
  } catch {
    return [];
  }
  const items: WireItem[] = [];
  for (const raw of parsed.items ?? []) {
    const r = raw as Record<string, unknown>;
    const headline = redactMoney(String(r.headline ?? "").trim()).slice(0, 220);
    const url = String(r.url ?? "").trim();
    const source = String(r.source ?? "")
      .trim()
      .slice(0, 60);
    if (!headline || !url || !source) continue;
    if (!/^https?:\/\//i.test(url)) continue;
    const read = redactMoney(String(r.read ?? "").trim()).slice(0, 500);
    const named = Array.isArray(r.accounts) ? r.accounts.map(String).join(" · ") : "";
    items.push({
      headline,
      source,
      url,
      at: now.toISOString(),
      keywords: Array.isArray(r.keywords) ? r.keywords.map(String).slice(0, 8) : [],
      accountIds: matchAccounts(`${headline} ${named}`),
      read,
    });
  }
  return items;
}
