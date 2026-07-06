// Salesforce is the system of record. The app is the operating layer on top —
// so everywhere you touch an account, it should remind you to check SF before and
// update SF after. This builds an account deep-link when possible.

// A real Salesforce record id is 15 or 18 case-sensitive alphanumeric chars and
// (for Accounts) starts with the "001" key prefix. Our manually-added accounts
// use synthetic ids (e.g. "ADVOCATEPAY000001"), which have no SF record yet.
export function isRealSfId(id: string): boolean {
  return /^001[a-zA-Z0-9]{12}([a-zA-Z0-9]{3})?$/.test(id.trim());
}

// The PrismHR Salesforce org's Lightning domain (public My Domain, not a secret).
// Overridable via NEXT_PUBLIC_SF_BASE_URL if the instance ever changes.
const DEFAULT_SF_BASE = "https://prismhr.lightning.force.com";

// A Lightning deep-link to the Account record for a real SF id. Null for
// synthetic ids (manually-added accounts) — the UI falls back to a "no record
// yet" note.
export function sfAccountUrl(id: string): string | null {
  const base = (process.env.NEXT_PUBLIC_SF_BASE_URL?.trim() || DEFAULT_SF_BASE).replace(/\/+$/, "");
  if (!base || !isRealSfId(id)) return null;
  return `${base}/lightning/r/Account/${id.trim()}/view`;
}
