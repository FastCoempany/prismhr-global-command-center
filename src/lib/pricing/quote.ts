// The price desk (founder-decreed 2026-08-21): pricing questions pull from
// the Pricing page — the one sanctioned money surface — and never from the
// brain's stores, which are money-redacted by doctrine and can never hold a
// figure. The quote is arithmetic from src/lib/pricing, computed at read
// time, no model call. The ask ledger stores its money-redacted twin with a
// pointer back to the page (the bank routes; the paper's exception does not
// apply here).

import { addOns, billingNote, countries, offboardingFee, pricingGeneratedAt } from ".";

export type PriceQuote = { answer: string; matched: string[] };

const PRICE_RE =
  /\b(price|prices|pricing|priced|quote|quoted|cost|costs|rate|rates|fee|fees)\b|how much/i;

const fmt = (n: number) => `$${n.toLocaleString("en-US")}`;

/** Employee count from prose: "1 ee", "3 employees", "for 2 EEs". 1 when
 *  unstated — a quote question without a count is a per-employee question. */
function eeCount(q: string): number {
  const m = /(\d{1,4})\s*(?:ee|ees|employee|employees|head|heads|worker|workers)\b/.exec(
    q,
  );
  if (!m) return 1;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function priceQuoteFor(question: string): PriceQuote | null {
  const q = (question ?? "").toLowerCase();
  if (!q || !PRICE_RE.test(q)) return null;

  const hitCountries = countries.filter((c) => q.includes(c.country.toLowerCase()));
  const hitAddOns = addOns.filter((a) => q.includes(a.label.toLowerCase()));
  const n = eeCount(q);

  const lines: string[] = [];
  for (const c of hitCountries) {
    const per = `${c.country}: ${fmt(c.price)} per employee per month (${c.tier}).`;
    lines.push(n > 1 ? `${per} ${n} employees → ${fmt(c.price * n)}/month.` : per);
  }
  for (const a of hitAddOns) {
    const price = typeof a.price === "number" ? fmt(a.price) : a.price;
    lines.push(`${a.label}: ${price}${a.billing ? ` — ${a.billing}` : ""}.`);
  }

  if (lines.length === 0) {
    // A pricing question with no named country or add-on still answers from
    // the page — with the door, not a shrug. "eor"/"global" keeps it scoped
    // to real pricing asks instead of grabbing every "cost" in a sentence.
    if (!/\beor\b|\bglobal\b|\bcountry\b|\bcountries\b/.test(q)) return null;
    return {
      answer: `The Pricing page holds the rate for ${countries.length} countries. Name the country and the ask answers with its figure.`,
      matched: [],
    };
  }

  const setup = addOns.find((a) => /setup fee/i.test(a.label));
  if (hitCountries.length > 0 && setup && !hitAddOns.includes(setup)) {
    const price = typeof setup.price === "number" ? fmt(setup.price) : setup.price;
    lines.push(`${setup.label}: ${price}${setup.billing ? ` — ${setup.billing}` : ""}.`);
  }
  if (hitCountries.length > 0 && offboardingFee)
    lines.push(`Offboarding: ${fmt(offboardingFee)} per employee.`);
  if (billingNote) lines.push(billingNote);
  lines.push(`Rates from the Pricing page, ${pricingGeneratedAt}.`);

  return {
    answer: lines.join(" "),
    matched: [...hitCountries.map((c) => c.country), ...hitAddOns.map((a) => a.label)],
  };
}

/** The ledger's stored twin is redacted by doctrine; render surfaces call
 *  this to re-derive the figures from the pricing source at read time —
 *  money is never stored, always fresh (founder-decreed 2026-08-21). */
export function priceDeskDisplay(question: string, stored: string): string {
  return priceQuoteFor(question)?.answer ?? stored;
}
