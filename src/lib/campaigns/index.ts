import type { Stage } from "@/lib/command-center/types";

// Reusable outreach plays layered over the book. The copy is static reference
// content (like the catalog); only *which* play was applied to a PEO persists,
// via PeoState.nextAction + a PeoActivity log entry.

type KitAudience = "CSM" | "PEO" | "CLIENT";
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

// The Approach is a fact, never a gate (ruled 2026-09-25, C19): NEEDS_CSM,
// CHANNEL_OK and DIRECT_OK record whether the CSM was briefed and whether
// client outreach is cleared, and no play is withheld by them. Every stage
// that has plays has a direct one (a PEO- or client-facing play), and that
// play is the default seed; the CSM play rides beside it as the alternative.

export const KITS: CampaignKit[] = [
  {
    id: "peo-first-touch",
    name: "First note to the PEO",
    stage: "NOT_TOUCHED",
    audience: "PEO",
    channel: "email",
    subject: "Global hiring for {PEO}'s clients",
    body: `Hi {contactFirst},

I work on the global side of PrismHR. I help PEOs like {PEO} support clients who want to hire or pay people outside the US.

When a client wants to hire a developer in Poland or a contractor in Brazil, the hard parts are usually setting up a local entity, classifying the worker correctly and running local payroll. PrismHR Global takes those on as the employer of record and handles contractor compliance, and it runs on the PrismHR platform you already use.

Do you have 20 minutes this week to talk through how it could work for {PEO}'s clients?

Best,
Antaeus`,
    ask: "Email {contactFirst} about global hiring",
    dueInDays: 4,
  },
  {
    id: "csm-brief-intro",
    name: "CSM briefing → warm intro request",
    stage: "NOT_TOUCHED",
    audience: "CSM",
    channel: "message",
    subject: "{PEO} — quick global-hiring angle",
    body: `Hi {CSMfirst},

There's a clean global-payroll angle in {PEO}'s book. A few of their {industry} clients are already hiring internationally or running contractors abroad — that's exactly where PrismHR Global fits: EOR, contractor compliance, and consolidated global payroll, all on the platform they already sit on.

Could you make a quick intro to the right person at {PEO}, or point me to them? I'll keep it low-key and lead with value, not a pitch.

Thanks,
Antaeus`,
    ask: "Ask {CSM} to intro {PEO}",
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

Do you have 20 minutes this week to map it to {PEO}'s book?

Best,
Antaeus`,
    ask: "Email {contactFirst} the global-hiring angle",
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
    ask: "Ask {PEO} for two client intros",
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
    ask: "Send {contactFirst} the recap and proposal",
    dueInDays: 2,
  },
];

type MergeContext = {
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

/** A play's ask as an action line: the same merge, but a missing contact
 *  reads "the contact", never the greeting's "there" ("Email there about
 *  global hiring" is no instruction). */
export function askText(tpl: string, ctx: MergeContext): string {
  const who = (ctx.contactName ?? "").trim() ? first(ctx.contactName) : "the contact";
  return mergeText(tpl.replace(/\{contactFirst\}/g, who), ctx);
}

// Every play for the stage, the direct play first (C19). The Approach is not
// an argument: nothing it records can withhold a play.
export function kitsFor(stage: Stage): CampaignKit[] {
  const plays = KITS.filter((k) => k.stage === stage);
  return [
    ...plays.filter((k) => k.audience !== "CSM"),
    ...plays.filter((k) => k.audience === "CSM"),
  ];
}

/** The stage's direct play: the default seed at every stage, NOT_TOUCHED
 *  included. Undefined only past the plays (OPPORTUNITY, WON, PASSED). */
export function defaultPlay(stage: Stage): CampaignKit | undefined {
  return kitsFor(stage).find((k) => k.audience !== "CSM");
}

/** The stage's plays as the drilldown lists them. The CSM play is the
 *  alternative and carries the quiet flag when the CSM's thread is live
 *  (the direct doctrine): it informs, and it never hides or reorders a play. */
export function playsFor(
  stage: Stage,
  csmThreadFlag: string,
): { kit: CampaignKit; flag: string }[] {
  return kitsFor(stage).map((kit) => ({
    kit,
    flag: kit.audience === "CSM" ? csmThreadFlag : "",
  }));
}

/** The applied play's next action, naming the person the account read finds
 *  the relationship runs through (the Ted doctrine; hidden rows never feed
 *  it, pass 8 X1). */
export function playNextAction(
  kit: CampaignKit,
  ctx: MergeContext,
  relationshipName: string,
): string {
  return askText(kit.ask, { ...ctx, contactName: relationshipName }).slice(0, 400);
}

export const getKit = (id: string): CampaignKit | undefined =>
  KITS.find((k) => k.id === id);
