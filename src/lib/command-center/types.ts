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
    blurb: "Prep only — don't approach the PEO until the CSM clears the path.",
  },
  {
    key: "CHANNEL_OK",
    label: "OK to engage PEO",
    blurb: "CSM has cleared it — work the PEO directly.",
  },
  {
    key: "DIRECT_OK",
    label: "Cleared for client outreach",
    blurb: "PEO engaged — you may approach their SMB clients.",
  },
];

export const approachLabel = (a: Approach) => APPROACHES.find((x) => x.key === a)?.label ?? a;
export const approachBlurb = (a: Approach) => APPROACHES.find((x) => x.key === a)?.blurb ?? "";

// True when a suggested next step would jump the channel — i.e. we haven't been
// cleared by the CSM yet. Today uses this to hold direct-motion suggestions.
export const isGated = (a: Approach) => a === "NEEDS_CSM";

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
export function suggestedAction(row: { stage: Stage; name: string; csm: string }): string | null {
  switch (row.stage) {
    case "NOT_TOUCHED":
      return `Brief ${row.csm} on ${row.name}'s global-hiring angle`;
    case "CSM_BRIEFED":
      return `Ask ${row.csm} to introduce you to ${row.name}`;
    case "PEO_ENGAGED":
      return `Ask ${row.name} for 2 client intros hiring internationally`;
    case "CLIENT_CAMPAIGN":
      return `Follow up on client outreach and book a demo`;
    case "LEAD":
      return `Qualify the lead and schedule a demo`;
    case "DEMO":
      return `Send the demo recap and a next-step proposal`;
    case "OPPORTUNITY":
      return `Confirm the decision timeline and close plan`;
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
