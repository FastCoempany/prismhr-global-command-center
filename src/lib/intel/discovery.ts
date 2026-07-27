// The universal payroll discovery question bank — country-agnostic by design.
// Every question is distilled from the intelligence/ corpus: the 7/7
// SubcontractorHub demo, the Chassie 7/21 call, and the Advocate/ESC/Simploy/
// XCEL/Infiniti threads. The problems repeat account to account; only the
// countries change — so questions parameterize on {countries} at render.
//
// drumLine rule (doctrine point #3, made executable): the exact sentence to
// say to gauge / drum up / campaign interest — a DIRECT question in the
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
  question: string;
  why: string;
  listenFor: string[];
  followUp: string;
  drumLine: string;
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
    question:
      "Which countries do you have people in today, and roughly how many in each?",
    why: "The whole deal parameterizes on this — pricing, entities, compliance, demo content.",
    listenFor: ["country names", "rough counts", '"I\'d have to check" (nobody owns it)'],
    followUp: "Which of those countries is growing next year?",
    drumLine:
      "Would you mind asking them which countries they have workers in today, and roughly how many in each?",
  },
  {
    id: "fp-status",
    category: "footprint",
    phase: "first_meeting",
    audience: "ops",
    question:
      "In each country — are they employees or contractors, and who is their legal employer today?",
    why: "SubcontractorHub's 'contractors' in Bulgaria were another company's employees — that changed the whole onboarding path (notice periods).",
    listenFor: [
      "vendor relationships",
      "another company employs them",
      "no one is the employer",
    ],
    followUp: "If they're employed by a local company, what notice periods bind them?",
    drumLine:
      "Would you mind asking them whether their international workers are employees or contractors — and who legally employs them today?",
  },
  {
    id: "fp-paid",
    category: "footprint",
    phase: "first_meeting",
    audience: "ops",
    question:
      "How does money physically reach them today — individual wires, a platform, a local entity?",
    why: "Individual wires (SubcontractorHub paid ~25 people that way) mean fees, effort, and compliance signals — the fastest pain to name.",
    listenFor: [
      "individual wires",
      "wire fees",
      "spreadsheet process",
      "someone's side job",
    ],
    followUp: "What does one payment run cost you in fees and hours?",
    drumLine:
      "Would you mind asking them how they physically pay their international people today — wires, a platform, or something else?",
  },
  // ── Classification ─────────────────────────────────────────────────────
  {
    id: "cl-control",
    category: "classification",
    phase: "needs_analysis",
    audience: "ops",
    question:
      "How much direction and control do you exercise over the contractors — and is the work open-ended?",
    why: "Nate's own words on the demo: 'borderline their employees.' Open-ended, directed work is the misclassification tell.",
    listenFor: ["we manage them daily", "indefinite", "they only work for us"],
    followUp: "Has anyone assessed that risk country by country?",
    drumLine:
      "Would you mind asking them how much day-to-day direction they give their contractors, and whether the work has an end date?",
  },
  {
    id: "cl-notice",
    category: "classification",
    phase: "needs_analysis",
    audience: "ops",
    question:
      "If any of them are employed by a local company, what notice periods or obligations bind them before they could move?",
    why: "Shane's Bulgaria probe — notice periods stretch every timeline promise; Bryce made us caveat exactly this in client docs.",
    listenFor: ["they're a vendor's staff", "we don't know", "they own the company"],
    followUp: "Who can confirm that before we set a start date?",
    drumLine:
      "Would you mind asking them whether any of these workers are on someone else's payroll with notice periods attached?",
  },
  {
    id: "cl-residence",
    category: "classification",
    phase: "needs_analysis",
    audience: "ops",
    question:
      "Does anyone live in a different country than their nationality — or than where you think they are?",
    why: "The Bulgarian living in Spain: employment happens where they LIVE, and work authorization there decides everything.",
    listenFor: ["remote inside the EU", "moved last year", "not sure where exactly"],
    followUp: "Do they hold work authorization where they live?",
    drumLine:
      "Would you mind asking them whether any of their international people live somewhere other than their home country?",
  },
  // ── Risk ───────────────────────────────────────────────────────────────
  {
    id: "rk-driver",
    category: "risk",
    phase: "first_meeting",
    audience: "exec",
    question:
      "What makes this urgent right now — IP, compliance, an audit, a client demand?",
    why: "Justin was 'hyper-focused' on IP in Bulgaria; the accounting team wanted fee relief. The exec's driver is the deal's engine.",
    listenFor: ["IP", "audit", "a client asked", "board pressure", "we got scared by"],
    followUp: "If that risk landed tomorrow, what would it cost?",
    drumLine:
      "Would you mind asking them what's making international employment urgent for them right now?",
  },
  {
    id: "rk-ip",
    category: "risk",
    phase: "needs_analysis",
    audience: "exec",
    question:
      "Who owns the IP your international workers create under today's contracts?",
    why: "EOR employment contracts carry IP language a contractor invoice never does — the exact wedge that moved SubcontractorHub.",
    listenFor: ["we assume we do", "never looked", "their company owns it"],
    followUp: "Would your counsel want to layer your own IP agreement on top?",
    drumLine:
      "Would you mind asking them who owns the work their overseas developers produce under the current setup?",
  },
  {
    id: "rk-pe",
    category: "risk",
    phase: "needs_analysis",
    audience: "ops",
    question:
      "Are recurring wires into those countries something your finance team has flagged — banks and tax authorities see them too?",
    why: "Permanent-establishment exposure builds quietly from payment patterns; the wallet model exists to end that signal.",
    listenFor: ["bank questions", "compliance letter", "never thought about it"],
    followUp: "Has any bank ever queried those transfers?",
    drumLine:
      "Would you mind asking them whether anyone has looked at what their recurring international wires signal to local authorities?",
  },
  // ── Incumbent ──────────────────────────────────────────────────────────
  {
    id: "in-who",
    category: "incumbent",
    phase: "first_meeting",
    audience: "ops",
    question: "Who handles global for you today — and what's working and what isn't?",
    why: "SubcontractorHub tried G-P through TriNet and 'they don't integrate' — the incumbent's failure is the opening.",
    listenFor: ["G-P", "Deel", "didn't integrate", "too expensive", "no support"],
    followUp: "What would have to be true for you to move?",
    drumLine:
      "Would you mind asking them who handles their international payroll or EOR today, and how that's going?",
  },
  {
    id: "in-renewal",
    category: "incumbent",
    phase: "needs_analysis",
    audience: "partner",
    question: "When does the current provider's contract come up for renewal?",
    why: "Renewal timing decides whether to open the conversation now or hold — the Infiniti/Nextep play.",
    listenFor: ["a date", "auto-renews", "month to month"],
    followUp: "Who owns that renewal decision?",
    drumLine:
      "Would you mind asking them when their current global provider's contract renews?",
  },
  // ── Money mechanics ────────────────────────────────────────────────────
  {
    id: "mo-fees",
    category: "money",
    phase: "needs_analysis",
    audience: "ops",
    question:
      "What do the wires and conversions cost per payment — on your side and theirs?",
    why: "Workers were eating conversion fees on their own pay; the company paid per-wire fees on ~25 people monthly. Concrete, monthly, fixable.",
    listenFor: ["per-wire fee", "workers complain", "we never added it up"],
    followUp: "Would one flat per-person fee with unlimited transfers change the math?",
    drumLine:
      "Would you mind asking them what their international payment runs cost in wire and conversion fees each month?",
  },
  {
    id: "mo-freq",
    category: "money",
    phase: "demo",
    audience: "ops",
    question:
      "If you could pay weekly or monthly without extra transfer cost, would that change how you operate?",
    why: "The wallet's unlimited-transfer model is a genuine differentiator for contractor-heavy teams.",
    listenFor: ["they ask for advances", "monthly only because of fees"],
    followUp: "Which teams would you switch to weekly?",
    drumLine:
      "Would you mind asking them whether flexible pay frequency for international workers would matter to their teams?",
  },
  // ── Timing ─────────────────────────────────────────────────────────────
  {
    id: "ti-date",
    category: "timing",
    phase: "first_meeting",
    audience: "exec",
    question:
      "What's the date you're working against — and what actually happens on that date?",
    why: "Chassie's Aug 6 wasn't a go-live; it was a leadership review needing a DIRECTION. Selling to the real event wins the real deadline.",
    listenFor: ["board/leadership meeting", "client promised date", "quarter end"],
    followUp: "What do you need in hand for that day — a decision, a price, a demo?",
    drumLine:
      "Would you mind asking them what date they're working against and what happens on it?",
  },
  {
    id: "ti-path",
    category: "timing",
    phase: "needs_analysis",
    audience: "exec",
    question: "If the timeline slips two weeks, what breaks?",
    why: "Justin pushed hard on Sept 1; Bryce insisted on government-timing caveats. Knowing the slack prevents overpromising.",
    listenFor: ["nothing really", "a client walks", "we lose the hire"],
    followUp: "Should we stage a partial rollout for the critical group first?",
    drumLine:
      "Would you mind asking them what actually breaks if this lands two weeks later than planned?",
  },
  // ── Commercial chair ───────────────────────────────────────────────────
  {
    id: "co-chair",
    category: "commercial",
    phase: "needs_analysis",
    audience: "partner",
    question:
      "Do you want to hold the client contract yourself (resale, your markup) or refer it and we contract direct?",
    why: "Bryce flipped to referral to dodge the liability chain; Chassie wants resale to stay in the relationship. The chair defines the whole deal shape.",
    listenFor: [
      "we want the relationship",
      "we don't want the risk",
      "what's the margin",
    ],
    followUp: "What does your client experience need to look like under each?",
    drumLine:
      "Would you mind asking them whether they'd rather hold the client contract themselves or have us contract directly and pay them a referral fee?",
  },
  {
    id: "co-credit",
    category: "commercial",
    phase: "proposal",
    audience: "partner",
    question:
      "Who carries the funding credit — and is everyone clear on what security applies in each structure?",
    why: "The deposit waiver exists INSIDE the partner structure; on referral, standard security applies — the exact friction that nearly stalled Advocate Pay.",
    listenFor: ["surprise at security terms", "our client won't like that"],
    followUp: "Should we walk your counsel through the pass-through language?",
    drumLine:
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
    drumLine:
      "Would you mind confirming which platform runs their domestic payroll today?",
  },
  {
    id: "pl-scope",
    category: "platform",
    phase: "needs_analysis",
    audience: "ops",
    question:
      "Beyond payroll — do you need time and labor, expense management, or contractor tiers in scope?",
    why: "The intake form asks; better to know in discovery. ESC's TLM need was 'unknown' in the licensing memo — a gap that stalls pricing.",
    listenFor: ["hourly workers", "expense chaos", "TLM"],
    followUp: "Which of those is day-one versus later?",
    drumLine:
      "Would you mind asking them whether time tracking or expense management needs to be part of the picture?",
  },
  {
    id: "pl-operate",
    category: "platform",
    phase: "needs_analysis",
    audience: "partner",
    question:
      "Do they want to BUY a global service, or OPERATE payroll themselves on licensed technology?",
    why: "ESC's real ask became MPEX licensing — operate, don't buy. Catching this early routes the deal to the right structure entirely.",
    listenFor: ["we want to run it", "licensing", "our own clients recurring"],
    followUp: "How many client companies would they onboard per year?",
    drumLine:
      "Would you mind asking them whether they see themselves operating payroll on licensed technology or buying it as a service per client?",
  },
  // ── Multithreading (lives in timing category for gap math) ─────────────
  {
    id: "mt-exec",
    category: "timing",
    phase: "first_meeting",
    audience: "partner",
    question:
      "Who besides your main contact feels this problem — who's the executive voice and who's the operator voice?",
    why: "The SubcontractorHub call split exactly this way (CEO on IP, accounting on fees). One-thread deals stall when that person goes quiet.",
    listenFor: ["only one name", "the CEO cares about X, ops cares about Y"],
    followUp: "Can we get both voices in the next meeting?",
    drumLine:
      "Would you mind asking them who else — on the executive side and the operations side — should be in this conversation?",
  },
  {
    id: "mt-decide",
    category: "commercial",
    phase: "demo",
    audience: "exec",
    question:
      "When you take this to a decision, who's in the room and what will they ask?",
    why: "Chassie carries a direction to leadership; arming the internal champion with answers wins meetings we're not in.",
    listenFor: ["I present to leadership", "the CEO decides", "finance will push back"],
    followUp: "What one-pager would make that meeting easy for you?",
    drumLine:
      "Would you mind asking them who makes the final call and what that group will want to see?",
  },
  {
    id: "fp-growth",
    category: "footprint",
    phase: "needs_analysis",
    audience: "exec",
    question:
      "Where do you plan to hire next — new countries or deepening the ones you're in?",
    why: "Greenfield growth changes product fit (entities vs EOR) and gives the proposal a forward story.",
    listenFor: ["new markets", "doubling the team", "hiring freeze"],
    followUp: "What's the first role you'd hire there?",
    drumLine:
      "Would you mind asking them where they plan to hire internationally over the next year?",
  },
  {
    id: "rk-scrape",
    category: "risk",
    phase: "needs_analysis",
    audience: "exec",
    question:
      "How confident are you that pay actually reaching the workers matches what you're sending?",
    why: "Justin suspected wage scraping in Bulgaria — visibility into gross-to-net per worker is an EOR-only answer.",
    listenFor: ["we can't see that", "we trust the local lead", "suspicions"],
    followUp: "Would per-worker gross-to-net visibility settle it?",
    drumLine:
      "Would you mind asking them how much visibility they have into what their overseas workers actually receive?",
  },
  {
    id: "in-integrate",
    category: "incumbent",
    phase: "demo",
    audience: "ops",
    question:
      "What did integration with your current stack actually look like — and where did it fall short?",
    why: "'They said they integrate, and essentially they don't' killed the G-P/TriNet path. Our one-platform story lands hardest here.",
    listenFor: ["double entry", "csv exports", "no sync"],
    followUp: "What would one platform for domestic and global change for your team?",
    drumLine:
      "Would you mind asking them how well their global provider actually integrates with their payroll platform?",
  },
];

// Questions appropriate for a stage: everything whose phase is at or before
// the deal's stage (early questions stay valid late; late ones don't fire early),
// ordered by gap match first, then phase recency.
export function questionsFor(opts: {
  phase: QPhase;
  gaps: QCategory[];
  countries: string[];
}): DiscoveryQ[] {
  const maxIdx = PHASE_ORDER.indexOf(opts.phase);
  const names = opts.countries.map((c) => COUNTRY_NAME[c] ?? c.toUpperCase());
  const merged = names.length > 0 ? names.join(", ") : "their countries";
  return DISCOVERY.filter((q) => PHASE_ORDER.indexOf(q.phase) <= maxIdx)
    .map((q) => ({
      ...q,
      question: q.question.replaceAll("{countries}", merged),
      drumLine: q.drumLine.replaceAll("{countries}", merged),
    }))
    .sort((a, b) => {
      const ga = opts.gaps.includes(a.category) ? 0 : 1;
      const gb = opts.gaps.includes(b.category) ? 0 : 1;
      if (ga !== gb) return ga - gb;
      return PHASE_ORDER.indexOf(b.phase) - PHASE_ORDER.indexOf(a.phase);
    });
}
