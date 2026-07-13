// Internal PrismHR people aligned to accounts. Most are CSMs (from the book's
// "CSM Name"); others sit elsewhere in the motion. Eric Ronci (Enterprise Sales,
// HCM) brings net-new employers onto the PrismHR HCM platform and hands them to
// Global — so he's a partner even before he owns accounts here.

const PARTNER_ROLES: Record<string, string> = {
  "Eric Ronci": "Enterprise Sales, HCM",
  // Incoming Regional VP of HCM — ~3 weeks in seat as of 7/13 (met at the
  // meet-and-greet). Carries the inactive Cody Jensen's HCM book.
  "Whitney Dideon": "Regional VP, HCM",
  // HCM-side account owner from the 7/13 Salesforce HCM-customer export.
  // (Kellie Washington was briefly listed from that export — mistaken ID; she
  // owns no accounts and was removed 7/13.)
  "Kathryn Maddox": "CSM, HCM",
};

// Partners with no accounts yet but who should still appear in the directory.
export const EXTRA_PARTNERS = ["Eric Ronci"];

export function partnerRole(name: string): string {
  if (PARTNER_ROLES[name]) return PARTNER_ROLES[name];
  if (name === "Unassigned" || name.trim() === "") return "Unassigned";
  return "CSM";
}
