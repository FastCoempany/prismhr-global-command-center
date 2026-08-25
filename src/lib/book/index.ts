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

// Deals that live outside the SF book export (direct/referral motions with no
// CSM chair) still deserve a seat in the Account Room — their notes, intel,
// and dashboard cards already key off these ids. Hand-authored; ids must match
// the digest's accountId so everything lines up.
const OFF_BOOK: Peo[] = [
  {
    id: "ADVOCATEPAY000001",
    name: "Advocate Pay",
    cloud: "",
    csm: "Unassigned", // direct referral deal — no CSM chair
    contactName: "Bryce Rowley",
    contactEmail: "bryce@advocatepay.com",
    size: 0,
    sizeBucket: "",
    industry: "Contractor payments",
    city: "",
    state: "",
    website: "advocatepay.com",
    lastActivity: "2026-07-21",
    fit: 85,
    fitTier: "high",
  },
  {
    // Added by request 2026-08-14, researched same day (see research.json).
    // Not in the SF export — a Kansas City CPEO, family-owned since 1988.
    id: "AXCETHR000000001",
    name: "Axcet HR Solutions",
    cloud: "",
    csm: "Unassigned",
    contactName: "Jerry Diddle", // founder & president — no live thread yet
    contactEmail: "",
    size: 0, // own WSE count undisclosed; honest zero over a guess
    sizeBucket: "",
    industry: "PEO/ASO",
    city: "Overland Park",
    state: "KS",
    website: "axcethr.com",
    lastActivity: "",
    fit: 40,
    fitTier: "low",
  },
];

export const peos = [...(book.peos as Peo[]), ...OFF_BOOK];
export const csms = book.csms as string[];

const byId = new Map(peos.map((p) => [p.id, p]));
export function getPeo(id: string): Peo | undefined {
  return byId.get(id);
}

export const industries = [...new Set(peos.map((p) => p.industry))].sort();
export const states = [...new Set(peos.map((p) => p.state).filter(Boolean))].sort();
