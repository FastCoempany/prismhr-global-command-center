import research from "./research.json";

export type Evidence = { claim: string; url: string };
export type DemandRecord = {
  demandScore: number | null;
  confidence: "high" | "medium" | "low";
  signals: string[];
  evidence: Evidence[];
  summary: string;
  researched: boolean;
};

const byId = (research.byId ?? {}) as Record<string, DemandRecord>;

export const researchGeneratedAt = (research.generatedAt as string) ?? "";

export function getDemand(id: string): DemandRecord | undefined {
  return byId[id];
}

// --- Play type: displacement vs greenfield ----------------------------------
// Parse the research text for a named competitor EOR/global-payroll provider the
// account already relies on. If one is named (in a non-negated, non-checklist
// context) and demand is real, it's a *displacement* play — the pitch is "bring
// it in-house on the platform you already run," not "here's a new capability."
const COMPETITORS: { name: string; re: RegExp }[] = [
  { name: "Globalization Partners", re: /globalization partners|\bg-p\b/i },
  { name: "Deel", re: /\bdeel\b/i },
  { name: "Velocity Global", re: /velocity global/i },
  { name: "Papaya", re: /\bpapaya\b/i },
  { name: "Remote.com", re: /remote\.com/i },
  { name: "Oyster", re: /\boyster\b/i },
  { name: "Multiplier", re: /\bmultiplier\b/i },
  { name: "Safeguard Global", re: /safeguard global/i },
  { name: "Omnipresent", re: /\bomnipresent\b/i },
  { name: "Rippling", re: /\brippling\b/i },
  { name: "Skuad", re: /\bskuad\b/i },
  { name: "Playroll", re: /\bplayroll\b/i },
  { name: "Atlas HXM", re: /atlas hxm/i },
  { name: "TriNet", re: /\btrinet\b/i },
];

// Negation / uncertainty cues that flip "named a competitor" into "checked and
// found none".
// Negation / uncertainty cues. Word-negations OR any "…n't" contraction — the
// contraction arm requires an apostrophe so it can't false-match "net"/"nut".
const NEG = /\b(no|not|without|zero|none|nor|lacks?|absence|unlike|neither|minimal|cannot)\b|[a-z]+n['’]t/i;

// Light country extraction from the research text — surfaces "where" without a
// new research pass. Curated to common cross-border hiring destinations.
const COUNTRIES = [
  "Canada",
  "Mexico",
  "Brazil",
  "Argentina",
  "Colombia",
  "Chile",
  "Costa Rica",
  "United Kingdom",
  "UK",
  "Ireland",
  "Germany",
  "France",
  "Spain",
  "Portugal",
  "Netherlands",
  "Belgium",
  "Poland",
  "Ukraine",
  "Romania",
  "Bulgaria",
  "Italy",
  "Sweden",
  "India",
  "Philippines",
  "Vietnam",
  "China",
  "Japan",
  "Singapore",
  "Indonesia",
  "Malaysia",
  "Australia",
  "New Zealand",
  "Turkey",
  "Israel",
  "United Arab Emirates",
  "UAE",
  "Saudi Arabia",
  "South Africa",
  "Nigeria",
  "Kenya",
  "Egypt",
];

export function extractCountries(d: DemandRecord | undefined): string[] {
  if (!d) return [];
  const text = [d.summary, ...(d.signals ?? []), ...(d.evidence ?? []).map((e) => e.claim)].join(" ");
  const found: string[] = [];
  for (const c of COUNTRIES) {
    const re = new RegExp(`\\b${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(text) && !found.includes(c)) found.push(c);
  }
  // Normalize UK/UAE duplicates
  const norm = found.map((c) => (c === "UK" ? "United Kingdom" : c === "UAE" ? "United Arab Emirates" : c));
  return [...new Set(norm)].slice(0, 6);
}

// Homepages for the competitor EORs we detect — so their names can be linked.
const COMPETITOR_URLS: Record<string, string> = {
  "Globalization Partners": "https://www.g-p.com",
  Deel: "https://www.deel.com",
  "Velocity Global": "https://velocityglobal.com",
  Papaya: "https://www.papayaglobal.com",
  "Remote.com": "https://remote.com",
  Oyster: "https://www.oysterhr.com",
  Multiplier: "https://www.usemultiplier.com",
  "Safeguard Global": "https://www.safeguardglobal.com",
  Omnipresent: "https://www.omnipresent.com",
  Rippling: "https://www.rippling.com",
  Skuad: "https://www.skuad.io",
  Playroll: "https://www.playroll.com",
  "Atlas HXM": "https://www.atlashxm.com",
  TriNet: "https://www.trinet.com",
};

export function competitorUrl(name: string): string | undefined {
  return COMPETITOR_URLS[name];
}

export type PlayType = "displacement" | "greenfield" | null;

// The demand floor at which a researched account carries an actionable play (and
// counts as a real "signal in" on Today). Lowered from 40 → 30 to surface the
// borderline base — demand is thin, so a handful of mid-signal accounts are worth
// a partner conversation even if they're not slam-dunks. One source of truth for
// scoring, signals, and narrative math.
export const DEMAND_GATE = 30;

export function analyzePlay(d: DemandRecord | undefined): {
  play: PlayType;
  competitors: string[];
} {
  if (!d || !d.researched || d.demandScore == null) return { play: null, competitors: [] };
  const parts = [d.summary, ...(d.signals ?? []), ...(d.evidence ?? []).map((e) => e.claim)];
  const sentences = parts.flatMap((p) => String(p).split(/(?<=[.;:])\s+|\n/));
  const found = new Set<string>();
  for (const s of sentences) {
    // The prompt's own competitor checklist (Deel + Velocity Global + Papaya
    // together) is an echo, never a real finding.
    const triple = /\bdeel\b/i.test(s) && /velocity global/i.test(s) && /papaya/i.test(s);
    if (triple || NEG.test(s)) continue;
    for (const c of COMPETITORS) if (c.re.test(s)) found.add(c.name);
  }
  const competitors = [...found];
  if (d.demandScore >= DEMAND_GATE) {
    return { play: competitors.length ? "displacement" : "greenfield", competitors };
  }
  return { play: null, competitors };
}
