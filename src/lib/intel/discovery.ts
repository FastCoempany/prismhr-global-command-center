// The universal payroll discovery question bank — country-agnostic by design.
// Every question is distilled from the intelligence/ corpus: the 7/7
// SubcontractorHub demo, the Chassie 7/21 call, and the Advocate/ESC/Simploy/
// XCEL/Infiniti threads. The problems repeat account to account; only the
// countries change — so questions parameterize on {countries} at render.
//
// relayLine rule (doctrine point #3, made executable): the exact sentence to
// say to gauge / raise / campaign interest — a DIRECT question in the
// roundup voice. No preamble words, never a directive with a period.

import type { DashNodeKey } from "@/lib/dashboard/stages";
import { COUNTRY_NAME } from "./lexicon";

export type QCategory =
  | "footprint"
  | "classification"
  | "risk"
  | "incumbent"
  | "money"
  | "timing"
  | "commercial"
  | "platform";

export type QAudience = "exec" | "ops" | "partner";
export type QPhase = DashNodeKey;

export type DiscoveryQ = {
  id: string;
  category: QCategory;
  phase: QPhase;
  audience: QAudience;
  // Which product line the question belongs to, and how sophisticated the
  // buyer has to be for it to land. Absent = it applies however the deal is
  // shaped; the bank's original country-agnostic questions are all like that.
  product?: "eor" | "contractor" | "payroll" | "any";
  soph?: "naive" | "inhouse" | "displacement" | "any";
  question: string;
  why: string;
  listenFor: string[];
  followUp: string;
  relayLine: string;
};

const PHASE_ORDER: QPhase[] = [
  "investigate",
  "first_meeting",
  "needs_analysis",
  "demo",
  "exec_summary",
  "proposal",
  "contract",
];

export const DISCOVERY: DiscoveryQ[] = [
  // ── Footprint ──────────────────────────────────────────────────────────
  {
    id: "fp-where",
    category: "footprint",
    phase: "first_meeting",
    audience: "ops",
    question: "Where are your people today, and roughly how many in each country?",
    why: "The whole deal parameterizes on this — pricing, entities, compliance, demo content.",
    listenFor: ["country names", "rough counts", '"I\'d have to check" (nobody owns it)'],
    followUp: "Who could pull that list together for us this week?",
    relayLine:
      "Would you mind asking them which countries they have workers in today, and roughly how many in each?",
  },
  {
    id: "fp-status",
    category: "footprint",
    phase: "first_meeting",
    audience: "ops",
    question:
      "Are these folks employees or contractors — and who's the legal employer today?",
    why: "SubcontractorHub's 'contractors' in Bulgaria were another company's employees — that changed the whole onboarding path (notice periods).",
    listenFor: [
      "vendor relationships",
      "another company employs them",
      "no one is the employer",
    ],
    followUp: "If they're employed by a local company, what notice periods bind them?",
    relayLine:
      "Would you mind asking them whether their international workers are employees or contractors — and who legally employs them today?",
  },
  {
    id: "fp-paid",
    category: "footprint",
    phase: "first_meeting",
    audience: "ops",
    question:
      "How do they physically get paid today? — individual wires, a platform, a local entity",
    why: "Individual wires (SubcontractorHub paid ~25 people that way) mean fees, effort, and compliance signals — the fastest pain to name.",
    listenFor: [
      "individual wires",
      "wire fees",
      "spreadsheet process",
      "someone's side job",
      "one of them is on a card",
    ],
    followUp: "What does one payment run cost you in fees and hours?",
    relayLine:
      "Would you mind asking them how they physically pay their international people today — wires, a platform, or something else?",
  },
  // ── Classification ─────────────────────────────────────────────────────
  {
    id: "cl-control",
    category: "classification",
    phase: "needs_analysis",
    audience: "ops",
    question:
      "How much direction do you give the contractors day to day — and is the work open-ended?",
    why: "Nate's own words on the demo: 'borderline their employees.' Open-ended, directed work is the misclassification tell — and buyers minimize control when asked directly, so the clean-sounding answer needs a branch too.",
    listenFor: [
      "we manage them daily",
      "indefinite",
      "they only work for us",
      "they're pretty independent — why do you ask",
    ],
    followUp:
      "Would the contracts and the day-to-day records tell the same story, country by country?",
    relayLine:
      "Would you mind asking them how much day-to-day direction they give their contractors, and whether the work has an end date?",
  },
  {
    id: "cl-notice",
    category: "classification",
    phase: "needs_analysis",
    audience: "ops",
    question: "Are any of them on someone else's payroll with notice periods attached?",
    why: "Shane's Bulgaria probe — notice periods stretch every timeline promise; Bryce made us caveat exactly this in client docs.",
    listenFor: ["they're a vendor's staff", "we don't know", "they own the company"],
    followUp: "Who can confirm that before we set a start date?",
    relayLine:
      "Would you mind asking them whether any of these workers are on someone else's payroll with notice periods attached?",
  },
  {
    id: "cl-residence",
    category: "classification",
    phase: "needs_analysis",
    audience: "ops",
    question:
      "Does anyone live somewhere different than you think — or than their passport says?",
    why: "The Bulgarian living in Spain: employment happens where they LIVE, and work authorization there decides everything. Foreign nationals on permits carry the same question in payroll costume.",
    listenFor: [
      "remote inside the EU",
      "moved last year",
      "not sure where exactly",
      "two are on permits",
    ],
    followUp: "Do they hold work authorization where they live?",
    relayLine:
      "Would you mind asking them whether any of their international people live somewhere other than their home country?",
  },
  // ── Risk ───────────────────────────────────────────────────────────────
  {
    id: "rk-driver",
    category: "risk",
    phase: "first_meeting",
    audience: "exec",
    question: "What's making this urgent right now?",
    why: "Justin was 'hyper-focused' on IP in Bulgaria; the accounting team wanted fee relief. The exec's driver is the deal's engine — and no named driver means this is research, so qualify it as research.",
    listenFor: [
      "IP",
      "audit",
      "a client asked",
      "board pressure",
      "nothing urgent, just exploring",
    ],
    followUp: "If that landed tomorrow and you weren't ready, what would it cost you?",
    relayLine:
      "Would you mind asking them what's making international employment urgent for them right now?",
  },
  {
    id: "rk-ip",
    category: "risk",
    phase: "needs_analysis",
    audience: "exec",
    question: "Who owns the IP your international workers are creating today?",
    why: "EOR employment contracts carry IP language a contractor invoice never does — the exact wedge that moved SubcontractorHub. Whether a US-drafted assignment even holds where the worker lives is a local-law question, and some countries restrict how future or moral rights transfer at all.",
    listenFor: ["we assume we do", "never looked", "their company owns it"],
    followUp:
      "Has anyone checked that assignment holds up where those people actually live?",
    relayLine:
      "Would you mind asking them who owns the work their overseas developers produce under the current setup?",
  },
  {
    id: "rk-pe",
    category: "risk",
    phase: "needs_analysis",
    audience: "ops",
    question:
      "Have the wires into those countries ever drawn questions — from your finance team or a bank?",
    why: "Recurring transfers to individuals invite bank compliance queries and make the underlying arrangement visible, and finance feels the fees and the effort every cycle. The tax question itself turns on what the people do in-country, not on how they're paid — eor-pe-activity carries that one.",
    listenFor: [
      "bank questions",
      "compliance letter",
      "never thought about it",
      "why do you ask",
    ],
    followUp: "If a bank queried one of those wires tomorrow, who on your side answers?",
    relayLine:
      "Would you mind asking them whether their recurring international wires have ever drawn questions from a bank or their own finance team?",
  },
  // ── Incumbent ──────────────────────────────────────────────────────────
  {
    id: "in-who",
    category: "incumbent",
    phase: "first_meeting",
    audience: "ops",
    question: "Who handles global for you today, and how's that going?",
    why: "SubcontractorHub tried G-P through TriNet and 'they don't integrate' — the incumbent's failure is the opening.",
    listenFor: ["G-P", "Deel", "didn't integrate", "too expensive", "no support"],
    followUp: "What would have to be true for you to move?",
    relayLine:
      "Would you mind asking them who handles their international payroll or EOR today, and how that's going?",
  },
  {
    id: "in-renewal",
    category: "incumbent",
    phase: "needs_analysis",
    audience: "partner",
    question: "When does the current provider's contract renew?",
    why: "Renewal timing decides whether to open the conversation now or hold — the Infiniti/Nextep play.",
    listenFor: ["a date", "auto-renews", "month to month", "I'd have to check"],
    followUp: "Who owns that renewal decision?",
    relayLine:
      "Would you mind asking them when their current global provider's contract renews?",
  },
  // ── Money mechanics ────────────────────────────────────────────────────
  {
    id: "mo-fees",
    category: "money",
    phase: "needs_analysis",
    audience: "ops",
    question: "What do the wires and conversions cost you per payment run?",
    why: "Workers were eating conversion fees on their own pay; the company paid per-wire fees on ~25 people monthly. Concrete, monthly, fixable.",
    listenFor: ["per-wire fee", "workers complain", "we never added it up"],
    followUp: "Would one flat per-person fee with unlimited transfers change the math?",
    relayLine:
      "Would you mind asking them what their international payment runs cost in wire and conversion fees each month?",
  },
  {
    id: "mo-freq",
    category: "money",
    phase: "demo",
    audience: "ops",
    question:
      "If you could pay weekly without extra transfer cost, would that change anything?",
    why: "The wallet's unlimited-transfer model is a genuine differentiator for contractor-heavy teams — and an indifferent 'monthly's fine' is the most common real answer, so the card has to hear it.",
    listenFor: [
      "they ask for advances",
      "monthly only because of fees",
      "monthly's fine, nobody's asked",
    ],
    followUp: "Has any of them ever asked for an advance or an early payment?",
    relayLine:
      "Would you mind asking them whether flexible pay frequency for international workers would matter to their teams?",
  },
  // ── Timing ─────────────────────────────────────────────────────────────
  {
    id: "ti-date",
    category: "timing",
    phase: "first_meeting",
    audience: "exec",
    question:
      "What date are you working against — and what actually happens on that date?",
    why: "Chassie's Aug 6 wasn't a go-live; it was a leadership review needing a DIRECTION. Selling to the real event wins the real deadline.",
    listenFor: ["board/leadership meeting", "client promised date", "quarter end"],
    followUp: "What do you need in hand for that day — a decision, a price, a demo?",
    relayLine:
      "Would you mind asking them what date they're working against and what happens on it?",
  },
  {
    id: "ti-path",
    category: "timing",
    phase: "needs_analysis",
    audience: "exec",
    question: "If this slips two weeks, what breaks?",
    why: "Justin pushed hard on Sept 1; Bryce insisted on government-timing caveats. Knowing the slack prevents overpromising.",
    listenFor: ["nothing really", "a client walks", "we lose the hire"],
    followUp: "So is that date a commitment or a preference — and whose?",
    relayLine:
      "Would you mind asking them what actually breaks if this lands two weeks later than planned?",
  },
  // ── Commercial chair ───────────────────────────────────────────────────
  {
    id: "co-chair",
    // Lives at investigate since the twins retirement (2026-08-24): the chair
    // is settled before anything is quoted, and the retired x-partner-chair's
    // early seat folds in here.
    category: "commercial",
    phase: "investigate",
    audience: "partner",
    question:
      "Do you want to hold the client contract yourself, or refer it and we contract direct?",
    why: "Bryce flipped to referral to dodge the liability chain; Chassie wants resale to stay in the relationship. The chair defines the whole deal shape: whose name is on the agreement, who carries the funding obligation each cycle, and who keeps the markup.",
    listenFor: [
      "we want the relationship",
      "we don't want the risk",
      "what's the margin",
      "we're only making the introduction",
    ],
    followUp: "What does your client experience need to look like under each?",
    relayLine:
      "Would you mind asking them whether they'd rather hold the client contract themselves or have us contract directly and pay them a referral fee?",
  },
  {
    id: "co-credit",
    category: "commercial",
    phase: "proposal",
    audience: "partner",
    question: "When the client pays late, whose cash covers payroll that cycle?",
    why: "The deposit waiver exists INSIDE the partner structure; on referral, standard security applies — the exact friction that nearly stalled Advocate Pay.",
    listenFor: [
      "surprise at security terms",
      "our client won't like that",
      "we hadn't thought about late payment",
    ],
    followUp: "Want your counsel and ours on one call before signature?",
    relayLine:
      "Would you mind confirming with them who expects to carry the funding obligation, so the security terms don't surprise anyone at contract time?",
  },
  // ── Platform + scope ───────────────────────────────────────────────────
  {
    id: "pl-hcm",
    category: "platform",
    phase: "first_meeting",
    audience: "partner",
    question: "Which platform runs their domestic book — PrismHR, HCM, or Execupay?",
    why: "Drives the demo, the integration story, and the intake form's platform field.",
    listenFor: ["PrismHR", "iSolved", "something else entirely"],
    followUp: "Any plans to change platforms this year?",
    relayLine:
      "Would you mind confirming which platform runs their domestic payroll today?",
  },
  {
    id: "pl-scope",
    category: "platform",
    phase: "needs_analysis",
    audience: "ops",
    question:
      "Beyond payroll — do you need time and labor, expenses, or contractor tiers in scope?",
    why: "The intake form asks; better to know in discovery. ESC's TLM need was 'unknown' in the licensing memo — a gap that stalls pricing.",
    listenFor: ["hourly workers", "expense chaos", "TLM"],
    followUp: "Which of those is day-one versus later?",
    relayLine:
      "Would you mind asking them whether time tracking or expense management needs to be part of the picture?",
  },
  {
    id: "pl-operate",
    category: "platform",
    phase: "needs_analysis",
    audience: "partner",
    question:
      "Do they want to buy a global service, or run payroll themselves on licensed tech?",
    why: "ESC's real ask became MPEX licensing — operate, don't buy. Catching this early routes the deal to the right structure entirely.",
    listenFor: [
      "we want to run it",
      "licensing",
      "our own clients recurring",
      "I'd have to ask them",
    ],
    followUp: "How many client companies would they onboard per year?",
    relayLine:
      "Would you mind asking them whether they see themselves operating payroll on licensed technology or buying it as a service per client?",
  },
  // ── Multithreading (lives in timing category for gap math) ─────────────
  {
    id: "mt-exec",
    category: "timing",
    phase: "first_meeting",
    audience: "partner",
    question:
      "Who else feels this problem — who's the exec voice and who's the operator voice?",
    why: "The SubcontractorHub call split exactly this way (CEO on IP, accounting on fees). One-thread deals stall when that person goes quiet.",
    listenFor: ["only one name", "the CEO cares about X, ops cares about Y"],
    followUp: "Can we get both voices in the next meeting?",
    relayLine:
      "Would you mind asking them who else — on the executive side and the operations side — should be in this conversation?",
  },
  {
    id: "mt-decide",
    category: "commercial",
    phase: "demo",
    audience: "exec",
    question: "Who's in the room when this goes to a decision, and what will they ask?",
    why: "Chassie carries a direction to leadership; arming the internal champion with answers wins meetings we're not in.",
    listenFor: ["I present to leadership", "the CEO decides", "finance will push back"],
    followUp: "What one-pager would make that meeting easy for you?",
    relayLine:
      "Would you mind asking them who makes the final call and what that group will want to see?",
  },
  {
    id: "fp-growth",
    category: "footprint",
    phase: "needs_analysis",
    audience: "exec",
    question: "Where are you planning to hire next?",
    why: "Greenfield growth changes product fit (entities vs EOR) and gives the proposal a forward story. Executives are the only people who know which markets are already committed to a customer or a candidate and which are still speculative.",
    listenFor: ["new markets", "doubling the team", "hiring freeze"],
    followUp:
      "Which of those are already committed to a customer or a hire, rather than still a maybe?",
    relayLine:
      "Would you mind asking them where they plan to hire internationally over the next year?",
  },
  {
    id: "rk-scrape",
    category: "risk",
    phase: "needs_analysis",
    audience: "exec",
    question:
      "How confident are you that what reaches the workers matches what you're sending?",
    why: "Justin suspected wage scraping in Bulgaria — visibility the current intermediary arrangement can never give. A direct-wire buyer sees their own side clearly; the live thread there is the conversion spread the worker eats, which hands off to mo-fees.",
    listenFor: [
      "we can't see that",
      "we trust the local lead",
      "suspicions",
      "we wire them directly, so we're confident",
    ],
    followUp: "Would per-worker gross-to-net visibility settle it?",
    relayLine:
      "Would you mind asking them how much visibility they have into what their overseas workers actually receive?",
  },
  {
    id: "in-integrate",
    category: "incumbent",
    phase: "demo",
    audience: "ops",
    question: "How well does the current provider actually integrate with your stack?",
    why: "'They said they integrate, and essentially they don't' killed the G-P/TriNet path. Our one-platform story lands hardest here — and a buyer whose integration genuinely works needs a different door, not the same pitch.",
    listenFor: ["double entry", "csv exports", "no sync", "it actually works fine"],
    followUp: "What's the one thing you'd still change about the current setup?",
    relayLine:
      "Would you mind asking them how well their global provider actually integrates with their payroll platform?",
  },
];

// Questions appropriate for a stage: everything whose phase is at or before
// the deal's stage (early questions stay valid late; late ones don't fire early),
// ordered by gap match first, then phase recency. The optional bank lets
// ask-next pass a facet-filtered merge (DISCOVERY + product questions the deal
// has earned); the Playbook page keeps the default and appends PRODUCT_BANK
// itself, so passing the merge here AND appending there would double it.
export function questionsFor(opts: {
  phase: QPhase;
  gaps: QCategory[];
  countries: string[];
  bank?: readonly DiscoveryQ[];
}): DiscoveryQ[] {
  const maxIdx = PHASE_ORDER.indexOf(opts.phase);
  const names = opts.countries.map((c) => COUNTRY_NAME[c] ?? c.toUpperCase());
  // "those countries" reads correctly in both the second-person questions and
  // the third-person relays; "their countries" flipped the possessor mid-
  // sentence on every "do you own…" question (pass-two finding, 2026-08-24).
  const merged = names.length > 0 ? names.join(", ") : "those countries";
  return (opts.bank ?? DISCOVERY)
    .filter((q) => PHASE_ORDER.indexOf(q.phase) <= maxIdx)
    .map((q) => ({
      ...q,
      question: q.question.replaceAll("{countries}", merged),
      relayLine: q.relayLine.replaceAll("{countries}", merged),
    }))
    .sort((a, b) => {
      const ga = opts.gaps.includes(a.category) ? 0 : 1;
      const gb = opts.gaps.includes(b.category) ? 0 : 1;
      if (ga !== gb) return ga - gb;
      return PHASE_ORDER.indexOf(b.phase) - PHASE_ORDER.indexOf(a.phase);
    });
}
