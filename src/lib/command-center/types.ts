import type { Peo } from "@/lib/book";

export type Stage =
  | "NOT_TOUCHED"
  | "CSM_BRIEFED"
  | "PEO_ENGAGED"
  | "CLIENT_CAMPAIGN"
  | "LEAD"
  | "DEMO"
  | "OPPORTUNITY"
  | "WON"
  | "PASSED";

export const STAGES: { key: Stage; label: string; pipeline: boolean }[] = [
  { key: "NOT_TOUCHED", label: "Not touched", pipeline: false },
  { key: "CSM_BRIEFED", label: "CSM briefed", pipeline: true },
  { key: "PEO_ENGAGED", label: "PEO engaged", pipeline: true },
  { key: "CLIENT_CAMPAIGN", label: "Client campaign", pipeline: true },
  { key: "LEAD", label: "Lead", pipeline: true },
  { key: "DEMO", label: "Demo", pipeline: true },
  { key: "OPPORTUNITY", label: "Opportunity", pipeline: true },
  { key: "WON", label: "Won", pipeline: false },
  { key: "PASSED", label: "Passed", pipeline: false },
];

export const stageLabel = (s: Stage) => STAGES.find((x) => x.key === s)?.label ?? s;

// --- Channel permission gate (feature 1) -------------------------------------
// What you're allowed to do with this PEO right now. The go-to-market motion is
// PEO-first: you reach the SMB through its PEO, and only after the CSM clears it.
export type Approach = "NEEDS_CSM" | "CHANNEL_OK" | "DIRECT_OK";

export const APPROACHES: { key: Approach; label: string; blurb: string }[] = [
  {
    key: "NEEDS_CSM",
    label: "Clear with CSM",
    blurb: "Brief the CSM. Direct outreach stays open.",
  },
  {
    key: "CHANNEL_OK",
    label: "OK to engage PEO",
    blurb: "The CSM is briefed. Work the PEO directly.",
  },
  {
    key: "DIRECT_OK",
    label: "Cleared for client outreach",
    blurb: "PEO engaged. Reach their clients directly.",
  },
];

export const approachLabel = (a: Approach) =>
  APPROACHES.find((x) => x.key === a)?.label ?? a;
export const approachBlurb = (a: Approach) =>
  APPROACHES.find((x) => x.key === a)?.blurb ?? "";

// True when a suggested next step would jump the channel — i.e. we haven't been
// cleared by the CSM yet. Today uses this to hold direct-motion suggestions.
export const isGated = (a: Approach) => a === "NEEDS_CSM";

// The board's word outranks the hand-edited seed (founder-decreed 2026-08-21):
// putting an account on the dashboard IS clearing it with the CSM and touching
// it. The stored state only ever ADVANCES the derived one — a card never drags
// a real stage back.
export function boardLift(
  stage: Stage,
  approach: Approach,
): { stage: Stage; approach: Approach } {
  return {
    stage: stage === "NOT_TOUCHED" ? "CSM_BRIEFED" : stage,
    approach: approach === "NEEDS_CSM" ? "CHANNEL_OK" : approach,
  };
}

// --- International-hiring intent signal (feature 2) ---------------------------
// How much cross-border hiring demand sits in the PEO's book. Layered on top of
// the structural fit score to re-rank toward where the real demand is.
export type Intent = "UNKNOWN" | "LOW" | "MEDIUM" | "HIGH";

export const INTENTS: { key: Intent; label: string }[] = [
  { key: "UNKNOWN", label: "Unknown" },
  { key: "LOW", label: "Low" },
  { key: "MEDIUM", label: "Medium" },
  { key: "HIGH", label: "High" },
];

export const intentLabel = (i: Intent) => INTENTS.find((x) => x.key === i)?.label ?? i;

const INTENT_BOOST: Record<Intent, number> = { HIGH: 15, MEDIUM: 7, LOW: -8, UNKNOWN: 0 };

// Blend structural fit (0–100) with the intent signal into a working priority.
export function priorityScore(fit: number, intent: Intent): number {
  return Math.max(0, Math.min(100, Math.round(fit + INTENT_BOOST[intent])));
}

export function priorityTier(priority: number): "high" | "medium" | "low" {
  if (priority >= 70) return "high";
  if (priority >= 45) return "medium";
  return "low";
}

// --- Suggested next action (feature 3) ---------------------------------------
// Fills the blank when an active PEO has no next step, keyed off its stage.
export function suggestedAction(row: {
  stage: Stage;
  name: string;
  csm: string;
}): string | null {
  switch (row.stage) {
    case "NOT_TOUCHED":
      return `Brief ${row.csm} on ${row.name}'s global-hiring angle`;
    case "CSM_BRIEFED":
      return `Ask ${row.csm} for a ${row.name} intro`;
    case "PEO_ENGAGED":
      return `Ask ${row.name} for two client intros`;
    case "CLIENT_CAMPAIGN":
      return `Chase replies and book the demo`;
    case "LEAD":
      return `Qualify the lead, book the demo`;
    case "DEMO":
      return `Send the recap and the proposal`;
    case "OPPORTUNITY":
      return `Confirm the timeline and close plan`;
    default:
      return null;
  }
}

export type PeoRow = Peo & {
  stage: Stage;
  approach: Approach;
  intent: Intent;
  priority: number; // blended fit + intent
  nextAction: string | null;
  nextActionDate: string | null; // YYYY-MM-DD
  notes: string | null;
};
