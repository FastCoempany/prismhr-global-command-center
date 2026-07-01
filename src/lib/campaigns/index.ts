import type { Approach, Stage } from "@/lib/command-center/types";

// Reusable outreach plays layered over the book. The copy is static reference
// content (like the catalog); only *which* play was applied to a PEO persists,
// via PeoState.nextAction + a PeoActivity log entry.

export type KitAudience = "CSM" | "PEO" | "CLIENT";
export type Channel = "email" | "call" | "message";

export type CampaignKit = {
  id: string;
  name: string;
  stage: Stage; // the stage this play moves you off of
  audience: KitAudience;
  channel: Channel;
  subject: string;
  body: string; // merge-field template
  ask: string; // becomes the next action (merge-field template)
  dueInDays: number;
};

// What each approach (channel permission gate) lets you reach. A NEEDS_CSM PEO
// only ever surfaces the CSM play — never a PEO- or client-facing one.
const ALLOWED: Record<Approach, KitAudience[]> = {
  NEEDS_CSM: ["CSM"],
  CHANNEL_OK: ["CSM", "PEO"],
  DIRECT_OK: ["CSM", "PEO", "CLIENT"],
};

export const KITS: CampaignKit[] = [
  {
    id: "csm-brief-intro",
    name: "CSM briefing → warm intro request",
    stage: "NOT_TOUCHED",
    audience: "CSM",
    channel: "message",
    subject: "{PEO} — quick global-hiring angle",
    body: `Hi {CSMfirst},

Looking at {PEO}'s book I think there's a clean global-payroll angle worth a warm intro. Odds are a few of their {industry} clients are already hiring internationally or running contractors abroad — that's exactly where PrismHR Global fits: EOR, contractor compliance, and consolidated global payroll, all on the platform they already sit on.

Could you make a quick intro to the right person at {PEO}, or point me to them? I'll keep it low-key and lead with value, not a pitch.

Thanks,
Antaeus`,
    ask: "Ask {CSM} for a warm intro to {PEO}",
    dueInDays: 3,
  },
  {
    id: "peo-value-nudge",
    name: "“Your book is hiring globally” value nudge",
    stage: "CSM_BRIEFED",
    audience: "PEO",
    channel: "email",
    subject: "Helping {PEO} clients hire internationally — no entity required",
    body: `Hi {contactFirst},

{CSM} suggested I reach out. I work on the global side of PrismHR — specifically helping PEOs like {PEO} support clients who are hiring outside the US.

When one of your SMB clients wants a developer in Poland or a contractor in Brazil, the usual blockers are entity setup, misclassification risk, and local payroll. PrismHR Global handles all of it as the employer of record and contractor-compliance layer — so it stays on your platform and your books, and you look like the hero.

Worth 20 minutes to look at how it maps to {PEO}'s book?

Best,
Antaeus`,
    ask: "Email {contactFirst} at {PEO} the global-hiring value angle",
    dueInDays: 4,
  },
  {
    id: "peo-client-intros",
    name: "Client-intro ask (2 named referrals)",
    stage: "PEO_ENGAGED",
    audience: "PEO",
    channel: "email",
    subject: "2 quick intros? Clients hiring across borders",
    body: `Hi {contactFirst},

Thanks for the time. Fastest way to show value: are there 1–2 clients in your book who've mentioned hiring internationally, or who already have contractors abroad?

If you can point me to a couple — or forward a short note — I'll keep it consultative and make you look good. No hard pitch, just a useful conversation for them.

Appreciate it,
Antaeus`,
    ask: "Ask {PEO} for 2 client intros hiring internationally",
    dueInDays: 5,
  },
  {
    id: "client-compliance-hook",
    name: "Cross-border compliance hook",
    stage: "CLIENT_CAMPAIGN",
    audience: "CLIENT",
    channel: "email",
    subject: "Hiring abroad without the entity headache",
    body: `Hi {contactFirst},

{PEO} connected us. If you're hiring or contracting outside the US, the hard part is staying compliant — worker classification, local payroll tax, statutory benefits.

PrismHR Global handles that as your employer of record and contractor-compliance layer, so you can hire in 100+ countries without opening a single entity. It runs alongside the payroll you already have with {PEO}.

Would it help to see how it'd work for the roles you're filling right now?

Best,
Antaeus`,
    ask: "Send {contactFirst} the cross-border compliance hook",
    dueInDays: 4,
  },
  {
    id: "client-demo-invite",
    name: "“Hire abroad without an entity” demo invite",
    stage: "LEAD",
    audience: "CLIENT",
    channel: "email",
    subject: "20 min — hire abroad without an entity",
    body: `Hi {contactFirst},

Want to show you exactly how this works. In 20 minutes I'll walk end-to-end through hiring someone internationally in PrismHR Global — onboarding, a compliant local contract, and the first payroll run — against a real country you care about.

What does your week look like? Happy to work around your calendar.

Thanks,
Antaeus`,
    ask: "Book a demo with {contactFirst}",
    dueInDays: 3,
  },
  {
    id: "client-demo-recap",
    name: "Post-demo recap + next step",
    stage: "DEMO",
    audience: "CLIENT",
    channel: "email",
    subject: "Recap + next step",
    body: `Hi {contactFirst},

Great talking today. Quick recap: PrismHR Global lets you hire and pay internationally without local entities — EOR, contractor management, and consolidated global payroll in one place.

Proposed next step: pick one role/country to run as a pilot, and I'll send a short scope and pricing for exactly that. Anything you'd want me to address for whoever signs off?

Best,
Antaeus`,
    ask: "Send {contactFirst} the demo recap + pilot proposal",
    dueInDays: 2,
  },
];

export type MergeContext = {
  name: string;
  csm: string;
  contactName: string;
  city: string;
  state: string;
  industry: string;
};

const first = (full: string) => (full || "").trim().split(/\s+/)[0] || "there";

export function mergeText(tpl: string, ctx: MergeContext): string {
  const map: Record<string, string> = {
    PEO: ctx.name || "the PEO",
    CSM: ctx.csm || "the CSM",
    CSMfirst: first(ctx.csm),
    contact: ctx.contactName || "there",
    contactFirst: first(ctx.contactName),
    city: ctx.city || "",
    state: ctx.state || "",
    industry: (ctx.industry || "").toLowerCase() || "their",
  };
  return tpl.replace(/\{(\w+)\}/g, (m, key) => (key in map ? map[key] : m));
}

// Gate-aware: plays for a PEO's current stage that its approach permits.
export function kitsFor(stage: Stage, approach: Approach): CampaignKit[] {
  const allowed = ALLOWED[approach];
  return KITS.filter((k) => k.stage === stage && allowed.includes(k.audience));
}

export const getKit = (id: string): CampaignKit | undefined => KITS.find((k) => k.id === id);
