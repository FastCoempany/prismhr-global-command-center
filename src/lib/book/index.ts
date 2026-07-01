import book from "./book.json";

export type FitTier = "high" | "medium" | "low";

export type Peo = {
  id: string;
  name: string;
  cloud: string;
  csm: string;
  contactName: string;
  contactEmail: string;
  size: number;
  sizeBucket: string;
  industry: string;
  city: string;
  state: string;
  website: string;
  lastActivity: string;
  fit: number;
  fitTier: FitTier;
};

export const peos = book.peos as Peo[];
export const csms = book.csms as string[];

const byId = new Map(peos.map((p) => [p.id, p]));
export function getPeo(id: string): Peo | undefined {
  return byId.get(id);
}

export const industries = [...new Set(peos.map((p) => p.industry))].sort();
export const states = [...new Set(peos.map((p) => p.state).filter(Boolean))].sort();
