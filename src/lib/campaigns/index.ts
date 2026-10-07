import type { Stage } from "@/lib/command-center/types";

// Reusable outreach plays layered over the book. The copy is static reference
// content (like the catalog); only *which* play was applied to a PEO persists,
// via PeoState.nextAction + a PeoActivity log entry.
//
// The copy obeys the plain-speech law in full (CLAUDE.md): a draft a CSM or a
// prospect reads carries no rhetorical device, no slang, no pipeline talk and
// no claim the record doesn't hold, and each ask is an action line in the
// writing canon. tests/canon/act-lane.test.ts runs every line through the
// canon lint (src/lib/activity/lint.ts), so a device fails the build.

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
    name: "Ask the CSM for an introduction",
    stage: "NOT_TOUCHED",
    audience: "CSM",
    channel: "message",
    subject: "Intro to someone at {PEO}?",
    body: `Hi {CSMfirst},

I'd like to find out whether any of {PEO}'s clients hire or pay people outside the US. PrismHR Global covers employer of record, contractor compliance and global payroll, and it runs on the platform {PEO} already uses.

Could you introduce me to the right person at {PEO}, or tell me who that is? I'll keep the first note short.

Thanks,
Antaeus`,
    ask: "Ask {CSMfirst} for an intro",
    dueInDays: 3,
  },
  {
    id: "peo-value-nudge",
    name: "Note to the PEO once the CSM is briefed",
    stage: "CSM_BRIEFED",
    audience: "PEO",
    channel: "email",
    subject: "Helping {PEO} clients hire outside the US",
    body: `Hi {contactFirst},

{CSM} knows I'm reaching out. I work on the global side of PrismHR, and I help PEOs like {PEO} support clients who hire outside the US.

When a client wants to hire a developer in Poland or a contractor in Brazil, the hard parts are usually setting up a local entity, classifying the worker correctly and running local payroll. PrismHR Global takes those on as the employer of record and handles contractor compliance. It runs on the PrismHR platform you already use, and the client stays with you.

Do you have 20 minutes this week to talk through which of your clients this could help?

Best,
Antaeus`,
    ask: "Email {contactFirst} about hiring abroad",
    dueInDays: 4,
  },
  {
    id: "peo-client-intros",
    name: "Ask the PEO for two client introductions",
    stage: "PEO_ENGAGED",
    audience: "PEO",
    channel: "email",
    subject: "Any clients hiring outside the US?",
    body: `Hi {contactFirst},

Thanks for the time. Have any of your clients mentioned hiring outside the US or paying contractors abroad?

If one or two come to mind, could you introduce me? If it's easier, I can write a short note for you to forward. The first call with a client would be about where they want to hire and what they need there.

Thanks,
Antaeus`,
    ask: "Ask {contactFirst} for client intros",
    dueInDays: 5,
  },
  {
    id: "client-compliance-hook",
    name: "Note to a client about hiring abroad",
    stage: "CLIENT_CAMPAIGN",
    audience: "CLIENT",
    channel: "email",
    subject: "Hiring abroad without opening an entity",
    body: `Hi {contactFirst},

{PEO} connected us. If you're hiring or paying contractors outside the US, the hard part is staying compliant: classifying each worker correctly, withholding local payroll tax and providing the benefits each country requires.

PrismHR Global handles that as your employer of record and manages contractor compliance, so you can hire in another country without opening an entity there. It runs alongside the payroll you already have with {PEO}.

Would it help to see how it would work for the roles you're filling now?

Best,
Antaeus`,
    ask: "Send {contactFirst} the compliance note",
    dueInDays: 4,
  },
  {
    id: "client-demo-invite",
    name: "Demo invitation to a client",
    stage: "LEAD",
    audience: "CLIENT",
    channel: "email",
    subject: "20 minutes on hiring abroad without an entity",
    body: `Hi {contactFirst},

I'd like to show you how this works. In 20 minutes I'll walk through hiring one person in a country you're looking at: onboarding them, setting up a compliant local contract and running their first payroll.

What does your week look like? I'm happy to work around your calendar.

Thanks,
Antaeus`,
    ask: "Book a demo with {contactFirst}",
    dueInDays: 3,
  },
  {
    id: "client-demo-recap",
    name: "Recap and next step after the demo",
    stage: "DEMO",
    audience: "CLIENT",
    channel: "email",
    subject: "Recap and next step",
    body: `Hi {contactFirst},

Thanks for the time today. To recap, PrismHR Global lets you hire and pay people in other countries without setting up an entity there, with employer of record, contractor management and global payroll in one place.

If you pick one role in one country to start with, I'll send a short scope and pricing for that hire. Is there anything the person who signs off will want answered?

Best,
Antaeus`,
    ask: "Send {contactFirst} the recap",
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

// "Unassigned" is a seat in the book, never a person.
const realCsm = (csm: string) => {
  const t = (csm ?? "").trim();
  return /^unassigned$/i.test(t) ? "" : t;
};

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
 *  reads "the contact" and a missing CSM "the CSM", never the greeting's
 *  "there" ("Email there about global hiring" is no instruction). */
export function askText(tpl: string, ctx: MergeContext): string {
  const who = (ctx.contactName ?? "").trim() ? first(ctx.contactName) : "the contact";
  const csm = realCsm(ctx.csm);
  return mergeText(
    tpl
      .replace(/\{contactFirst\}/g, who)
      .replace(/\{CSMfirst\}/g, csm ? first(csm) : "the CSM"),
    { ...ctx, csm },
  );
}

/** A play's subject and body, merged for one account. With no CSM on the
 *  account the sentence that names the CSM drops, so a draft never claims a
 *  CSM who isn't there. */
export function kitText(
  kit: Pick<CampaignKit, "subject" | "body">,
  ctx: MergeContext,
): { subject: string; body: string } {
  const csm = realCsm(ctx.csm);
  const strip = (tpl: string) =>
    csm ? tpl : tpl.replace(/[^.\n]*\{CSM\}[^.\n]*\.[ \t]*/g, "");
  const c = { ...ctx, csm };
  return {
    subject: mergeText(strip(kit.subject), c),
    body: mergeText(strip(kit.body), c),
  };
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
