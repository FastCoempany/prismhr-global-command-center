import pricing from "./pricing.json";

export type PriceCountry = { country: string; price: number; tier: string };
export type AddOn = { label: string; price: number | string; billing: string };

export const countries = pricing.countries as PriceCountry[];
export const addOns = pricing.addOns as AddOn[];
export const offboardingFee = pricing.offboardingFee as number;
export const offboardingNote = pricing.offboardingNote as string;
export const billingNote = pricing.billingNote as string;
export const currency = pricing.currency as string;
export const pricingGeneratedAt = pricing.generatedAt as string;

// Distinct tiers in country order (Tier 1 cheapest → Tier 3).
export const tiers = [...new Set(countries.map((c) => c.tier))].sort();

export function fmtPrice(p: number | string): string {
  return typeof p === "number" ? `$${p.toLocaleString()}` : p;
}
