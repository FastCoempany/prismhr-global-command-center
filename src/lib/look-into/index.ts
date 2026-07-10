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
    title: "The HCM funnel roster isn't loaded",
    why: "Today's “HCM funnel” shows only a sliver of the real population — the clients of our PEOs who run on PrismHR HCM, plus Eric's net-new HCM logos, aren't in the book at all, so the funnel looks tiny when it may be the biggest lead stream you own.",
    ask: "Find where that roster lives (a PrismHR HCM tenant export? a report someone runs?) and whether we can pull it in the way the PEO book was loaded. Start with Eric and whoever owns HCM client data.",
    category: "Data sources",
    priority: "high",
    surfacedIn: "Today · Signal in (HCM funnel strip)",
  },
  {
    id: "book-source-of-truth",
    title: "The PEO book is a one-time CSV, not a live source",
    why: "The 131 accounts came from a single CSV upload. As CSMs update owners, activity, and status in the real system, this book drifts out of date and nobody's notified.",
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
    title: "Does per-play / per-country partner collateral exist?",
    why: "The whole “arm the partners” motion assumes there are one-pagers per play and a country price cheat sheet a partner can use without you in the room. If those don't exist, that's the enablement gap to raise.",
    ask: "Ask marketing what Global partner collateral exists today; whatever's missing becomes a concrete ask for Aleks + marketing.",
    category: "Enablement",
    priority: "high",
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

export function lookIntoByCategory(): { category: LookIntoCategory; items: LookIntoItem[] }[] {
  const rank: Record<LookIntoPriority, number> = { high: 0, medium: 1, low: 2 };
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: LOOK_INTO.filter((i) => i.category === category).sort(
      (a, b) => rank[a.priority] - rank[b.priority],
    ),
  })).filter((g) => g.items.length > 0);
}

export const lookIntoHighCount = LOOK_INTO.filter((i) => i.priority === "high").length;
