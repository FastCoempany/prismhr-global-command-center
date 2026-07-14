// The PrismHR Global product canon — distilled from the released marketing
// collateral (GitHub release `prismmktgcollateral`, 7/14/2026: the EOR flyer,
// Contractor Solutions flyer, Talent flyer, and the "Expand Without Borders"
// deck). This is the app's source of truth for what the product IS: outreach
// drafts, demo prep, and Claude prompts ground themselves here instead of
// improvising product claims.

export type ProductTier = { name: string; forWho: string; includes: string[] };

export type Product = {
  key: "eor" | "contractors" | "payroll" | "talent";
  name: string;
  positioning: string;
  tiers: ProductTier[];
  keyFacts: string[];
};

export const PRODUCT_CANON: Product[] = [
  {
    key: "eor",
    name: "Global Employer of Record (EOR)",
    positioning:
      "Hire full-time talent internationally WITHOUT setting up a legal entity — PrismHR Global employs the worker through its local entities and carries the legal responsibility; the client manages the day-to-day work.",
    tiers: [
      {
        name: "EOR Core",
        forWho: "Clients who have already identified the talent they want to hire",
        includes: [
          "Employment through PrismHR Global's local legal entities",
          "Onboarding, payroll and benefits managed",
          "Employment contracts and compliance handled",
          "Client manages the employees; PrismHR Global is the legal employer",
        ],
      },
      {
        name: "EOR Plus",
        forWho: "Clients who also need recruiting support",
        includes: [
          "Everything in Core",
          "Source, recruit and hire qualified talent",
          "Local expertise accelerates hiring, recruitment through onboarding",
        ],
      },
      {
        name: "EOR Premium",
        forWho: "Clients needing a fully managed solution (select countries)",
        includes: [
          "Everything in Plus",
          "Managed staffing with local supervision",
          "Local HR administration, employee support, and workspaces",
        ],
      },
    ],
    keyFacts: [
      "175+ countries supported; owned-entity infrastructure in 44 countries",
      "EOR Premium countries — Americas: Argentina, Belize, Brazil, Canada, Chile, Colombia, Dominican Republic, Guatemala, Honduras, Jamaica, Mexico, Paraguay, Peru, US; EMEA: Egypt, Kenya, South Africa, Spain; APAC: India, Philippines",
    ],
  },
  {
    key: "contractors",
    name: "Global Contractor Solutions",
    positioning:
      "Compliantly engage and pay freelancers, contractors and 1099 workers across borders — with or without PrismHR Global standing in as the record-holder.",
    tiers: [
      {
        name: "Contractor Management",
        forWho: "Clients who keep the direct contractor relationship",
        includes: [
          "Streamlined international contractor onboarding workflows",
          "Pay contractors in local currencies",
          "W-8 / W-9 / 1099 documentation and reporting",
          "Simplified payments and ongoing administration",
        ],
      },
      {
        name: "Contractor of Record (COR/AOR)",
        forWho:
          "Clients needing extra compliance protection (expanding internationally, or high-compliance countries)",
        includes: [
          "PrismHR Global serves as the Contractor/Agent of Record",
          "Contractor agreements and compliant payments managed",
          "Worker-misclassification risk reduced",
          "Country-specific contractor regulation guidance",
        ],
      },
    ],
    keyFacts: [
      "Global Wallet: instant payouts in local currency or USD; virtual cards, multi-currency, crypto payouts, stock investments",
    ],
  },
  {
    key: "payroll",
    name: "Global Payroll",
    positioning:
      "Run compliant multi-country payroll for a client's OWN international employees (their entities) — distinct from EOR, where PrismHR Global is the legal employer because the client has no entity.",
    tiers: [],
    keyFacts: [
      "Localized payroll processing and tax filing per country",
      "Multi-currency support with exchange-rate automation",
      "Country-specific benefits and deductions",
      "Consolidated reporting across all regions (general ledger, gross-to-net, variance)",
      "Integrates with existing HCM or finance systems",
      "Global Dashboard: review, approve and pay by pay period, country and employee",
    ],
  },
  {
    key: "talent",
    name: "Global Talent Solutions",
    positioning:
      "Source, hire and (optionally) manage talent anywhere — recruiting expertise that transitions seamlessly into EOR when the hire is made.",
    tiers: [
      {
        name: "Talent Recruitment",
        forWho: "Clients who need recruiting expertise but keep day-to-day management",
        includes: [
          "Source qualified candidates across global talent markets (160+ recruiters worldwide)",
          "Target by country, industry and role; submittal within 24 hours",
          "Accelerated recruiting and hiring timelines",
          "Seamless transition into EOR when needed",
        ],
      },
      {
        name: "Talent Management",
        forWho: "Clients seeking a fully managed international workforce",
        includes: [
          "Everything in Talent Recruitment",
          "Workspace and housing arrangements where available",
          "Local HR administration and employee support",
        ],
      },
    ],
    keyFacts: [
      "Placement fees: contingent search 20–25% of first-year salary (15% for existing clients), 60-day replacement guarantee, Net 21; retained search adds a 50% non-refundable deposit; HireFinder subscription $999–$3,996/month by number of openings",
    ],
  },
];

// Platform-level facts that apply across the family.
export const CANON_FACTS: string[] = [
  "One platform for EOR, AOR/contractors and global payroll — a single vendor instead of stitched point solutions",
  "Workforce support across 175+ countries; onboarding across 165+ countries; owned entities in 44 countries",
  "For existing PrismHR customers, Global is built into their setup — a new tab, no integration work",
  "Global onboarding: country-specific contracts, benefits and documentation; built-in classification guidance; centralized status tracking",
  "Global Client Service Team per account: Global Account Manager + Global HR Specialist (compliance/local labor law) + Payroll Analyst",
  "Additional offerings: Global Benefits (175+ countries, no medical underwriting), immigration/visa services, IT asset management",
  "Scale: $100B in payroll processed, 2.2M+ worksite employees served, 90 brands in the Vensure family (PrismHR founded 1985, Vensure 2004)",
  "Market: EOR projected to grow from $4.2B (2021) to $6.8B (2028); 36% of employers report talent shortages",
];

export const CANON_SOURCE =
  "Release `prismmktgcollateral` (7/14/2026): PrismHR Global EOR flyer, Contractor Solutions flyer, Talent flyer, and the “Expand Without Borders” deck (54 slides).";

// A compact text block for grounding Claude prompts in the released canon.
export function canonForPrompt(): string {
  const products = PRODUCT_CANON.map((p) => {
    const tiers = p.tiers.length
      ? ` Tiers: ${p.tiers.map((t) => `${t.name} (${t.forWho.toLowerCase()})`).join("; ")}.`
      : "";
    return `- ${p.name}: ${p.positioning}${tiers}`;
  }).join("\n");
  return `${products}\nPlatform facts: ${CANON_FACTS.join(" · ")}`;
}
