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
const NEG = /\b(no|not|n.t|without|zero|none|nor|lacks?|absence|unlike|neither|minimal)\b/i;

export type PlayType = "displacement" | "greenfield" | null;

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
  if (d.demandScore >= 40) {
    return { play: competitors.length ? "displacement" : "greenfield", competitors };
  }
  return { play: null, competitors };
}
