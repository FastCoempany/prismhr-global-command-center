// V.3 · THE FOUNDATIONAL BANK.
//
// The index does not discover its own skeleton. This is the canonical host of
// subject parents and subtopics — the floor every filing is checked against
// first. Labels are concrete nouns that answer "what's in here" before a
// click (V.4). Parents change only by decree; subtopics may grow organically
// under them when content genuinely fits nothing here.
//
// Filing is text-only (V.2): these labels ARE the interface. No ids anywhere.

export type BankParent = {
  label: string;
  summary: string;
  subs: { label: string; summary: string }[];
};

export const BANK: BankParent[] = [
  {
    label: "Payroll operations",
    summary: "Running payroll: cycles, corrections, taxes, payments, payslips.",
    subs: [
      {
        label: "Payroll cycles & calendars",
        summary: "Cutoffs, frequencies, processing windows.",
      },
      {
        label: "Corrections & off-cycle runs",
        summary: "Fixing a run, mid-cycle changes, retro pay.",
      },
      {
        label: "Taxes & withholdings",
        summary: "Employer and employee taxes, filings, remittance.",
      },
      {
        label: "Payments & banking",
        summary: "How money moves: rails, currencies, funding, timing.",
      },
      {
        label: "Payslips & reporting",
        summary: "What employees and clients see each cycle.",
      },
    ],
  },
  {
    label: "Statutory pay & benefits",
    summary: "What law and custom require employers to provide, by country.",
    subs: [
      {
        label: "13th salary & bonuses",
        summary: "Mandatory extra pay: timing, installments, custom.",
      },
      {
        label: "Paid time off & leave",
        summary: "Vacation, sick, parental, public holidays.",
      },
      {
        label: "Social security & pensions",
        summary: "State and occupational contributions.",
      },
      {
        label: "Health & insurance benefits",
        summary: "Required and customary coverage.",
      },
      {
        label: "Severance & indemnities",
        summary: "What ending employment costs, and when.",
      },
    ],
  },
  {
    label: "Employment & contracts",
    summary: "How people are engaged: agreements, classification, endings.",
    subs: [
      {
        label: "Employment agreements",
        summary: "Contract forms, terms, probation, amendments.",
      },
      {
        label: "Contractor classification",
        summary: "Employee vs contractor lines, reclassification risk.",
      },
      {
        label: "Offboarding & termination rules",
        summary: "Notice, cause, process, by country.",
      },
      { label: "Work permits & visas", summary: "Right-to-work, sponsorship, mobility." },
    ],
  },
  {
    label: "EOR",
    summary: "Employer of record: how it works, moves, risks, and structure.",
    subs: [
      { label: "How EOR works", summary: "The model itself — who employs, who directs." },
      {
        label: "EOR transitions & conversions",
        summary: "Into and out of EOR; EOR to entity.",
      },
      {
        label: "EOR risk & liability",
        summary: "Where exposure sits and who carries it.",
      },
      {
        label: "EOR commercial structure",
        summary: "How EOR engagements are shaped and billed.",
      },
    ],
  },
  {
    label: "Contractor management",
    summary: "Engaging and paying contractors compliantly.",
    subs: [
      { label: "Contractor onboarding", summary: "Agreements, verification, setup." },
      { label: "Contractor payments", summary: "Invoicing, currencies, schedules." },
      {
        label: "Misclassification risk",
        summary: "Where contractor arrangements go wrong.",
      },
      {
        label: "Contractor conversions",
        summary: "Contractor to employee, and when to.",
      },
    ],
  },
  {
    label: "Platform & integrations",
    summary: "The product itself: capabilities, data, connections, security.",
    subs: [
      { label: "Platform capabilities", summary: "What the product does and doesn't." },
      {
        label: "Integrations & data flows",
        summary: "HRIS, accounting, APIs, files in and out.",
      },
      {
        label: "Security & certifications",
        summary: "Data protection, audits, compliance attestations.",
      },
      {
        label: "Product gaps & roadmap",
        summary: "What's missing, what's coming, what was promised.",
      },
    ],
  },
  {
    label: "Implementation & onboarding",
    summary: "From signature to first payroll: the path and its hazards.",
    subs: [
      {
        label: "Implementation timelines",
        summary: "How long it takes and what moves the number.",
      },
      {
        label: "SOW & handover",
        summary: "The documents and the baton-pass to delivery.",
      },
      {
        label: "Client-side dependencies",
        summary: "What only the client can do, and when it slips.",
      },
      { label: "Data migration & setup", summary: "Getting their data in, correctly." },
      { label: "Go-live & first payroll", summary: "The last mile and its checks." },
    ],
  },
  {
    label: "Pricing & commercial terms",
    summary: "How engagements are priced and papered. Figures never stored.",
    subs: [
      {
        label: "Pricing models",
        summary: "PEPM, bundles, tiers — the shapes, not the numbers.",
      },
      { label: "Billing & invoicing", summary: "How and when clients are charged." },
      {
        label: "Negotiations & concessions",
        summary: "What moves in a deal and what doesn't.",
      },
      {
        label: "Contract terms & renewals",
        summary: "Duration, exits, renewal mechanics.",
      },
    ],
  },
  {
    label: "Deals & selling",
    summary: "Live pipeline intelligence: strategy, objections, outcomes.",
    subs: [
      {
        label: "Deal strategy & next moves",
        summary: "How specific deals are being run.",
      },
      {
        label: "Objections & responses",
        summary: "What stalls deals and what answers it.",
      },
      {
        label: "Competitive positioning",
        summary: "How we win against named alternatives.",
      },
      { label: "Wins & losses", summary: "What closed, what died, and why." },
      {
        label: "Buyer questions",
        summary: "What prospects actually asked, kept verbatim.",
      },
    ],
  },
  {
    label: "Partners & channel",
    summary: "PEOs, referral partners, CSMs — the relationships deals ride on.",
    subs: [
      {
        label: "Partner programs & terms",
        summary: "Referral, resale, and how each works.",
      },
      {
        label: "Partner escalations",
        summary: "Where partner relationships strain and why.",
      },
      {
        label: "CSM relationships",
        summary: "Who chairs which accounts and how to work them.",
      },
    ],
  },
  {
    label: "Competitors & market",
    summary: "The world outside: rivals, trends, the industry's weather.",
    subs: [
      {
        label: "Competitor intelligence",
        summary: "What named rivals do, charge for, and fail at.",
      },
      { label: "Market trends", summary: "Where global employment is heading." },
      {
        label: "Regulatory changes",
        summary: "New law that changes the game, by country.",
      },
    ],
  },
  {
    label: "How we work",
    summary: "Our own organization: process, people, tools, policy.",
    subs: [
      {
        label: "Internal processes",
        summary: "How things are done here — the real steps of work.",
      },
      { label: "Roles & responsibilities", summary: "Who owns what." },
      { label: "Tools & systems", summary: "The stack we run on and how to use it." },
      { label: "Policies & decisions", summary: "What's been decided and stands." },
    ],
  },
];

/** The bank rendered for a prompt — labels and summaries, nothing else.
 *  Text-only filing (V.2): no ids, no codes, no numbers. */
export function bankPrompt(extra: { parent: string; label: string }[] = []): string {
  const grown = new Map<string, string[]>();
  for (const e of extra) {
    const list = grown.get(e.parent) ?? [];
    if (!list.includes(e.label)) list.push(e.label);
    grown.set(e.parent, list);
  }
  return BANK.map((p) => {
    const subs = [
      ...p.subs.map((s) => s.label),
      ...(grown.get(p.label) ?? []).filter(
        (l) => !p.subs.some((s) => s.label.toLowerCase() === l.toLowerCase()),
      ),
    ];
    return `${p.label}\n${subs.map((s) => `  · ${s}`).join("\n")}`;
  }).join("\n");
}

export function bankParentOf(label: string): BankParent | null {
  const l = (label ?? "").trim().toLowerCase();
  return BANK.find((p) => p.label.toLowerCase() === l) ?? null;
}

/** Where buyer questions live now that they are content, not categories (V.4). */
export const BUYER_QUESTIONS_PARENT = "Deals & selling";
export const BUYER_QUESTIONS_SUB = "Buyer questions";
