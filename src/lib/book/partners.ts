// Internal PrismHR people aligned to accounts. Most are CSMs (from the book's
// "CSM Name"); others sit elsewhere in the motion. Eric Ronci (Enterprise Sales,
// HCM) brings net-new employers onto the PrismHR HCM platform and hands them to
// Global — so he's a partner even before he owns accounts here.

const PARTNER_ROLES: Record<string, string> = {
  "Eric Ronci": "Enterprise Sales, HCM",
};

// Partners with no accounts yet but who should still appear in the directory.
export const EXTRA_PARTNERS = ["Eric Ronci"];

export function partnerRole(name: string): string {
  if (PARTNER_ROLES[name]) return PARTNER_ROLES[name];
  if (name === "Unassigned" || name.trim() === "") return "Unassigned";
  return "CSM";
}
