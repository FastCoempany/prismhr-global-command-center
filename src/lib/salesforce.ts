// Salesforce is the system of record. The app is the operating layer on top —
// so everywhere you touch an account, it should remind you to check SF before and
// update SF after. This builds account deep-links and pre-filled "write" links
// (New Opportunity / Log-a-call forms that open already filled in; nothing is
// saved to SF until you press Save there).

// A real Salesforce record id is 15 or 18 case-sensitive alphanumeric chars and
// (for Accounts) starts with the "001" key prefix. Our manually-added accounts
// use synthetic ids (e.g. "ADVOCATEPAY000001"), which have no SF record yet.
export function isRealSfId(id: string): boolean {
  return /^001[a-zA-Z0-9]{12}([a-zA-Z0-9]{3})?$/.test(id.trim());
}

// Manually-added accounts that turned out to have a real SF record after all —
// mapped here (from the 7/23 all-customers report) so the app's internal ids,
// which key every stored note and disposition, never have to change.
const SF_ID_OVERRIDES: Record<string, string> = {
  ADVOCATEPAY000001: "001Pb00003esmqHIAQ", // Advocate Pay LLC
  // From the 7/24 contact reports (15-char ids — valid in Lightning URLs):
  ADVANCEDBUIL00001: "001Pb00003PwUqf", // Advanced Builds
  ASPENHRLLC0000001: "0012A00002AekQQ", // AspenHR LLC
  BESTPEO0000000001: "001F000000w38J5", // BestPEO
  INNOVATIONSH00001: "0013k00003X76c9", // InnovationsHR
  INTEGRITYTRA00001: "0013k00002gipez", // Integrity Trade Services LLC
  IPOPAYROLLSE00001: "001F000001jPiF2", // IPO Payroll Services
  LIBERTYASSOC00001: "0013k00002o4NzI", // Liberty Associates Group LLC
  LSISTAFFING000001: "0012A00002YrvwC", // LSI Staffing
  ONTRACKSTAFF00001: "0012A00002Yrvxc", // OnTrack Staffing
  PENMACSTAFFI00001: "001F000000w38AA", // Penmac Staffing Services, Inc.
  R1RCMINC000000001: "0012A00002VHwpt", // R1 RCM, Inc.
  REALTIMEPEO000001: "001F000000w38Gn", // RealTime PEO
  STRATEGICEMP00001: "001F000000w38NX", // Strategic Employer Services
  THERESOURCE000001: "0012A00002Yrw8T", // The Resource
  TLCCOMPANIES00001: "001F000000w38Om", // TLC Companies
};

// The real SF record id behind an app account id — through the override map
// for synthetic ids. Null when there's genuinely no record.
export function resolveSfId(id: string): string | null {
  const real = SF_ID_OVERRIDES[id.trim()] ?? id.trim();
  return isRealSfId(real) ? real : null;
}

// The PrismHR Salesforce org's Lightning domain (public My Domain, not a secret).
// Overridable via NEXT_PUBLIC_SF_BASE_URL if the instance ever changes.
const DEFAULT_SF_BASE = "https://prismhr.lightning.force.com";

function sfBase(): string {
  return (process.env.NEXT_PUBLIC_SF_BASE_URL?.trim() || DEFAULT_SF_BASE).replace(
    /\/+$/,
    "",
  );
}

// A Lightning deep-link to the Account record for a real SF id. Null for
// synthetic ids (manually-added accounts) — the UI falls back to a "no record
// yet" note.
export function sfAccountUrl(id: string): string | null {
  const real = resolveSfId(id);
  return real ? `${sfBase()}/lightning/r/Account/${real}/view` : null;
}

// A contact record id (003 prefix, 15 or 18 chars).
export function isRealSfContactId(id: string): boolean {
  return /^003[a-zA-Z0-9]{12}([a-zA-Z0-9]{3})?$/.test(id.trim());
}

// Deep-link to a Contact record.
export function sfContactUrl(contactId: string): string | null {
  const id = (contactId ?? "").trim();
  return isRealSfContactId(id) ? `${sfBase()}/lightning/r/Contact/${id}/view` : null;
}

// Lightning's defaultFieldValues param: Field=Value pairs, comma-joined, each
// value URI-encoded so commas/spaces inside values survive.
function dfv(fields: Record<string, string>): string {
  return Object.entries(fields)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join(",");
}

// Close dates default to 60 days out (Antaeus's standing rule), computed at
// click-time in Chicago terms.
export function defaultCloseDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now.getTime() + 60 * 86_400_000));
}

// Opens SF's New Opportunity form PRE-FILLED — account linked, name typed,
// Type + Stage chosen (exact picklist values from the org), close date 60 days
// out. You review and press Save in Salesforce — the app never writes.
export function sfNewOppUrl(
  id: string,
  opts: {
    name?: string;
    type?: string;
    stage?: string;
    closeDate?: string;
    contactId?: string;
  } = {},
): string | null {
  const real = resolveSfId(id);
  if (!real) return null;
  const contact = isRealSfContactId(opts.contactId ?? "") ? opts.contactId! : "";
  const fields = dfv({
    AccountId: real,
    Name: opts.name ?? "",
    Type: opts.type ?? "",
    StageName: opts.stage ?? "",
    CloseDate: opts.closeDate ?? defaultCloseDate(), // YYYY-MM-DD
    // The form's "Account Contact" is a custom lookup whose API name we can't
    // read without Setup access — pass the id under the two likeliest names;
    // Lightning silently ignores fields the form doesn't have, so a miss just
    // leaves the lookup empty (pick by hand, as before).
    ContactId: contact,
    Account_Contact__c: contact,
  });
  return `${sfBase()}/lightning/o/Opportunity/new?defaultFieldValues=${fields}`;
}

// Opens SF's New Contact form PRE-FILLED and linked to the account — for the
// "the right contact doesn't exist yet" case: create it with one Save, then
// pick it on the opportunity.
export function sfNewContactUrl(
  id: string,
  opts: { firstName?: string; lastName?: string; email?: string } = {},
): string | null {
  const real = resolveSfId(id);
  if (!real) return null;
  const fields = dfv({
    AccountId: real,
    FirstName: opts.firstName ?? "",
    LastName: opts.lastName ?? "",
    Email: opts.email ?? "",
  });
  return `${sfBase()}/lightning/o/Contact/new?defaultFieldValues=${fields}`;
}

// Opens SF's New Task form PRE-FILLED and related to the account — the
// log-a-call flavor of writing: subject + comments arrive typed, you Save.
export function sfLogCallUrl(
  id: string,
  opts: { subject?: string; comments?: string } = {},
): string | null {
  const real = resolveSfId(id);
  if (!real) return null;
  const fields = dfv({
    WhatId: real,
    Subject: opts.subject ?? "",
    Description: opts.comments ?? "",
  });
  return `${sfBase()}/lightning/o/Task/new?defaultFieldValues=${fields}`;
}
