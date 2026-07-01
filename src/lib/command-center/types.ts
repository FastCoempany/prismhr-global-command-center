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

export type PeoRow = Peo & {
  stage: Stage;
  nextAction: string | null;
  nextActionDate: string | null; // YYYY-MM-DD
  notes: string | null;
};
