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
