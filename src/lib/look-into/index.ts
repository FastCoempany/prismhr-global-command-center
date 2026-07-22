// "Look into" — open loops to resolve *internally* so the command center
// reflects reality, not the assumptions it was bootstrapped on. These are
// structural: data that isn't loaded, sources that aren't canonical, systems
// that aren't wired, enablement that may not exist. They're curated here (not
// user-entered) because they're things the build itself knows are unresolved —
// the app flagging its own seams. Day-to-day asks belong in the Today capture;
// these are the "go find out internally" items.

export type LookIntoCategory =
  | "Data sources"
  | "Access & systems"
  | "Enablement"
  | "Process & validation";

export type LookIntoPriority = "high" | "medium" | "low";

export type LookIntoItem = {
  id: string;
  title: string;
  why: string; // why it matters / what's wrong today
  ask: string; // the concrete thing to find out, and roughly who from
  category: LookIntoCategory;
  priority: LookIntoPriority;
  surfacedIn: string; // where in the app this assumption bites
};

export const CATEGORY_ORDER: LookIntoCategory[] = [
  "Data sources",
  "Access & systems",
  "Enablement",
  "Process & validation",
];

export const LOOK_INTO: LookIntoItem[] = [
  {
    id: "hcm-funnel-roster",
    title: "Keep the HCM roster fresh (loaded 7/13)",
    why: "The HCM customer roster is now loaded from the 7/13 Salesforce export (19 active HCM clients + 3 former). Like the PEO book, it's a point-in-time snapshot — owners, stages, and risk levels will drift as SF changes, and several accounts are missing size/contact/cloud details the export didn't carry.",
    ask: "Get a refresh cadence for the SF HCM report (or a fuller export with size, contacts, and cloud names), and confirm HCM client-data ownership with Whitney Dideon, who carries the HCM book. Named lead (per Aleks, 7/13): Eduardo at SOLVO runs the business-intelligence reports with deep account detail and growth specs — get plugged into those.",
    category: "Data sources",
    priority: "medium",
    surfacedIn: "Today · HCM funnel strip",
  },
  {
    id: "vensure-acquisitions",
    title: "Vensure acquisitions quietly invalidate book accounts",
    why: "Premier Payroll turned out to have been acquired by Vensure in Sept 2025 — fully absorbed, managed by Vensure Success/Support/Services, out of our channel motion. Per John Hebert this is a pattern (“Vensure is like a vacuum sucking up other customers regularly”), so more book accounts may already be dead leads without anything in our data saying so.",
    ask: "Find who tracks Vensure's customer acquisitions internally (or get the list), sweep the book against it, and add the check to whatever refresh cadence the book gets.",
    category: "Data sources",
    priority: "high",
    surfacedIn: "Today · partner outreach (John Hebert thread)",
  },
  {
    id: "book-source-of-truth",
    title: "The PEO book is a one-time CSV, not a live source",
    why: "The book started as a single CSV upload and has since been reconciled by hand (HCM roster 7/13, ESC + Infiniti updates 7/14 — 136 accounts today). As CSMs update owners, activity, and status in the real system, this book drifts and nobody's notified.",
    ask: "Confirm the canonical internal source (a Salesforce report? a PrismHR export?) and whether we can refresh from it on a cadence instead of re-uploading by hand.",
    category: "Data sources",
    priority: "high",
    surfacedIn: "Account Room",
  },
  {
    id: "research-refresh-cadence",
    title: "Demand research is a point-in-time snapshot",
    why: "Global-hiring demand was researched once (last run shown on the Account Room). There's no refresh schedule, so signals silently go stale and new demand never surfaces.",
    ask: "Decide who owns re-running research and how often — quarterly, or triggered when an account changes. Confirm it's fine to keep using web research at that cadence.",
    category: "Data sources",
    priority: "medium",
    surfacedIn: "Account Room · demand / Today · Signal in",
  },
  {
    id: "pricing-maintenance",
    title: "EOR pricing came from an uploaded sheet",
    why: "The per-country EOR pricing and the $750 offboarding fee were loaded from a spreadsheet. If list prices or fees change and nobody tells us, the deal math in front of partners goes wrong.",
    ask: "Find the maintained internal price list and who owns it, so we know when to update — and confirm the offboarding fee and add-ons are current.",
    category: "Data sources",
    priority: "medium",
    surfacedIn: "Pricing",
  },
  {
    id: "salesforce-system-of-record",
    title: "Is this app the system of record, or should it sync to Salesforce?",
    why: "The book carries Salesforce 18-digit account IDs, but nothing reads or writes back. If Global stage/activity lives only here while the rest of the org works in Salesforce, the two will diverge.",
    ask: "Confirm with Aleks / ops whether Global pipeline should stay in this tool or feed Salesforce, before the two versions of the truth split.",
    category: "Access & systems",
    priority: "medium",
    surfacedIn: "Dashboard / Pipeline",
  },
  {
    id: "partner-directory",
    title: "The partner directory is derived, not authoritative",
    why: "Partners come from the book's “CSM Name” plus manual adds (Eric). There's no authoritative internal directory, so partners — current and future (Lesha, etc.) — can be missing or misnamed, which quietly breaks the funnel classification.",
    ask: "Get the real internal roster of CSMs / HCM sales aligned to these accounts, and a way to keep it current.",
    category: "Access & systems",
    priority: "medium",
    surfacedIn: "Account Room · partner rollup",
  },
  {
    id: "partner-collateral",
    title: "Per-play collateral exists (loaded 7/14) — country price sheet still missing",
    why: "Marketing collateral landed 7/14 (release `prismmktgcollateral`): EOR, Contractor Solutions, and Talent flyers plus the “Expand Without Borders” deck — now the app's product canon (src/lib/collateral/canon.ts). The Global Payroll flyer dropped later the same day and is ingested into the canon (PHRFLY-GLOBALPYRLL — partner-shareable, service-provider framing, no pricing). What a partner still can't do without you in the room is quote: there's no shareable per-country price cheat sheet, and internal Global Payroll pricing itself is unconfirmed (asked Aleks 7/14, live blocker on the ESC deal).",
    ask: "Global Payroll pricing model is confirmed (Aleks, 7/14): individually priced per country — quotes via Anthony Falzone (Head of Global Ops), copy Aleks; Canada quote for ESC requested 7/14. Remaining: a partner-shareable pricing explainer (even 'individually quoted per country' as a one-liner), and confirm the flyers are approved for partners to forward to their clients.",
    category: "Enablement",
    priority: "medium",
    surfacedIn: "Today · Arm the partners",
  },
  {
    id: "demo-environment",
    title: "Is there a real Global demo tenant?",
    why: "Demo Sidekick is a script/companion. It's unclear whether there's a live Global environment a partner can actually walk a client through, or only talking points.",
    ask: "Confirm what's demoable today and who owns the demo tenant, so the Demo node in the pipeline reflects reality.",
    category: "Enablement",
    priority: "low",
    surfacedIn: "Demo Sidekick",
  },
  {
    id: "outbound-approval-tooling",
    title: "Does the one-click approve/edit gate exist yet?",
    why: "The automation map assumes copy to partners goes out behind a one-step approve/edit gate. That workflow/tooling doesn't exist yet — it's an assumption, not a capability.",
    ask: "Decide whether to build that gate and get buy-in from Aleks before automating any partner-facing copy. See docs/automation-map.md.",
    category: "Process & validation",
    priority: "medium",
    surfacedIn: "Automation map",
  },
  {
    id: "csm-score-validation",
    title: "AI-researched scores haven't been CSM-validated",
    why: "Demand and fit scores come from web research, not the CSMs who actually know these accounts. Shown to partners as truth, a wrong score costs credibility.",
    ask: "Have the owning CSM sanity-check the top-scored accounts before they're treated as canon — it both catches misses and builds partner trust.",
    category: "Process & validation",
    priority: "medium",
    surfacedIn: "Account Room",
  },
];

export function lookIntoByCategory(): {
  category: LookIntoCategory;
  items: LookIntoItem[];
}[] {
  const rank: Record<LookIntoPriority, number> = { high: 0, medium: 1, low: 2 };
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: LOOK_INTO.filter((i) => i.category === category).sort(
      (a, b) => rank[a.priority] - rank[b.priority],
    ),
  })).filter((g) => g.items.length > 0);
}

export const lookIntoHighCount = LOOK_INTO.filter((i) => i.priority === "high").length;
