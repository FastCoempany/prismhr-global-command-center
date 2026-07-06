// Salesforce is the system of record. The app is the operating layer on top —
// so everywhere you touch an account, it should remind you to check SF before and
// update SF after. This builds an account deep-link when possible.

// A real Salesforce record id is 15 or 18 case-sensitive alphanumeric chars and
// (for Accounts) starts with the "001" key prefix. Our manually-added accounts
// use synthetic ids (e.g. "ADVOCATEPAY000001"), which have no SF record yet.
export function isRealSfId(id: string): boolean {
  return /^001[a-zA-Z0-9]{12}([a-zA-Z0-9]{3})?$/.test(id.trim());
}

// A Lightning deep-link to the Account record, when the SF instance base URL is
// configured (NEXT_PUBLIC_SF_BASE_URL, e.g. "https://prismhr.lightning.force.com")
// and the id is a real SF id. Null otherwise — the UI falls back to a copyable id.
export function sfAccountUrl(id: string): string | null {
  const base = process.env.NEXT_PUBLIC_SF_BASE_URL?.trim().replace(/\/+$/, "");
  if (!base || !isRealSfId(id)) return null;
  return `${base}/lightning/r/Account/${id.trim()}/view`;
}
