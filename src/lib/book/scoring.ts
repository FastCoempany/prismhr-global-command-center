import type { Peo } from "./index";

// Global-fit "desk score" — how good a channel this PEO is for PrismHR Global,
// from firmographics alone (no external research). Four of the five signals in
// the model; the fifth (client-base global-hiring demand) is filled by research
// and folded in later. Weights sum to 100.
//
//   scale 35 · platform incumbency 25 · model fit 25 · relationship recency 15

const SIZE_PTS: Record<string, number> = {
  "Enterprise (10,000 & above)": 35,
  "Large (5,000 - 9,999)": 28,
  "Medium (2,000 - 4,999)": 21,
  "Small (501 - 1,999)": 14,
  "Start Up (0 - 500)": 8,
};

const MODEL_PTS: Record<string, number> = {
  "PEO/ASO": 25,
  ASO: 18,
  "Payroll Service Bureau": 14,
  Staffing: 12,
  "Accounting Services": 10,
  Insurance: 6,
  Corporate: 4,
  Unknown: 5,
};

const REFERENCE_ISO = "2026-07-02";

function scalePts(p: Peo): number {
  if (p.sizeBucket && SIZE_PTS[p.sizeBucket] != null) return SIZE_PTS[p.sizeBucket];
  // Fall back to the numeric size when the bucket is blank.
  if (p.size >= 10000) return 35;
  if (p.size >= 5000) return 28;
  if (p.size >= 2000) return 21;
  if (p.size >= 501) return 14;
  if (p.size > 0) return 8;
  return 4;
}

// A PrismHR Cloud Name means they're already on the platform — Global is a
// config-on attach, not a net-new sale. "N/A" is treated as no.
function isIncumbent(p: Peo): boolean {
  const c = (p.cloud ?? "").trim();
  return c.length > 0 && c.toUpperCase() !== "N/A";
}

function modelPts(p: Peo): number {
  return MODEL_PTS[p.industry] ?? 5;
}

function recencyPts(p: Peo): number {
  const raw = (p.lastActivity ?? "").trim();
  if (!raw) return 4;
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return 4;
  const days = (Date.parse(REFERENCE_ISO) - t) / 86_400_000;
  if (days <= 120) return 15;
  if (days <= 365) return 10;
  if (days <= 730) return 6;
  return 3;
}

export type DeskBreakdown = {
  scale: number;
  incumbency: number;
  model: number;
  recency: number;
};

export type DeskScore = {
  score: number; // 0–100
  tier: "high" | "medium" | "low";
  incumbent: boolean;
  breakdown: DeskBreakdown;
};

// Composite Global-fit. For this product the demand signal is the necessary
// condition — ease-of-landing (desk) only matters if there's something to sell —
// so demand leads the blend (60/40). Accounts we couldn't research fall back to
// the desk score alone.
export function compositeScore(
  desk: number,
  demand: number | null,
): { score: number; tier: "high" | "medium" | "low" } {
  const score = demand == null ? desk : Math.round(0.4 * desk + 0.6 * demand);
  const tier = score >= 70 ? "high" : score >= 45 ? "medium" : "low";
  return { score, tier };
}

export function deskScore(p: Peo): DeskScore {
  const breakdown: DeskBreakdown = {
    scale: scalePts(p),
    incumbency: isIncumbent(p) ? 25 : 0,
    model: modelPts(p),
    recency: recencyPts(p),
  };
  const score = breakdown.scale + breakdown.incumbency + breakdown.model + breakdown.recency;
  const tier = score >= 70 ? "high" : score >= 45 ? "medium" : "low";
  return { score, tier, incumbent: isIncumbent(p), breakdown };
}
