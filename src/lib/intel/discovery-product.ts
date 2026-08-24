// The product-aware half of the question bank.
//
// DISCOVERY (discovery.ts) is the original country-agnostic bank, distilled
// from real deals. This file is the product-line depth the card never had: EOR,
// contractor management, and global payroll each ask different questions, and a
// buyer who has never run international payroll needs a different register than
// one already displacing a competitor. Every question carries `product` and
// `soph` so the battlecard can shape itself to the deal in front of it.
//
// Written and then adversarially reviewed on three lenses — technical accuracy
// (no rule asserted that isn't actually universal, no invented anecdotes or
// statistics), format doctrine (one question per question, no amounts, relay
// voice on every relay line), and coverage (empty category/phase/audience
// cells filled). Ids are permanent: a retired question is keyed by id, so
// renaming one un-retires it everywhere — asknext-done rows, intranet mirror
// refs, and /playbook?open= deep links all key on the id.
//
// The twins retirement (2026-08-24, pass-two program step 1): eight questions
// whose ground a DISCOVERY sibling already held were removed — x-payment-path
// (fp-paid), x-footprint-forward (fp-growth), x-partner-chair (co-chair),
// eor-own-entity (x-entity-own), gp-headcount (fp-where), gp-employer-reg
// (gp-nre), gp-nationality (cl-residence), cm-ip-assignment (rk-ip). Their
// unique ground was folded into the survivors; the intranet sweep marks their
// mirror docs gone. Never reuse a retired id.

import type { DiscoveryQ } from "./discovery";

export const PRODUCT_BANK: DiscoveryQ[] = [
  {
    id: "eor-benefits-parity",
    // Money, not commercial (refiled 2026-08-24): statutory-vs-matched is a
    // cost-structure decision. Safe now that scenario avoid-lists demote
    // instead of hide — the urgent-hire trap still finds it.
    category: "money",
    phase: "needs_analysis",
    audience: "ops",
    product: "eor",
    soph: "inhouse",
    question:
      "Do you want these people on statutory-minimum benefits, or matched to what your US team gets?",
    why: 'Statutory coverage abroad often already provides health and pension through the state system — but "statutory" is not always free of employer-funded schemes: several countries mandate an occupational pension or auto-enrolment, and a collective agreement can require private medical cover. So a US-style package is duplicative in one country and table stakes in another. The answer decides whether supplemental benefits belong in scope at all, and whether the offer will actually compete for the candidate they want.',
    listenFor: [
      "whatever's required",
      "we want it to feel the same",
      "our recruiter says candidates expect more there",
      "we don't know what's standard there",
    ],
    followUp:
      "Which of your US benefits would feel wrong to withhold from someone doing the same job abroad?",
    relayLine:
      "Would you mind asking them whether they want their people in {countries} on local statutory benefits or on something closer to their US package?",
  },
  {
    id: "eor-confidentiality",
    category: "risk",
    phase: "proposal",
    audience: "exec",
    product: "eor",
    soph: "any",
    question:
      "Does your counsel need specific confidentiality or non-compete language in what these people sign?",
    why: "The employment contract is where enforceable confidentiality and any permitted post-employment restriction have to live, and enforceability is a local-law question — several countries will not uphold a non-compete unless the employee is compensated for it. If the client's protections currently sit in a US-law agreement with a contractor, they need re-papering. Counsel would far rather review that language while the proposal is live than after somebody leaves for a competitor.",
    listenFor: [
      "we have our own NDA",
      "we need a non-compete",
      "can you attach our addendum",
      "we've never thought about who signs what",
    ],
    followUp:
      "Can your counsel send the language they want, so we can check what each country will actually enforce?",
    relayLine:
      "Would you mind asking them whether their counsel wants specific confidentiality or restrictive terms written into the employment contracts for {countries}?",
  },
  {
    id: "eor-counsel",
    category: "risk",
    phase: "investigate",
    audience: "partner",
    product: "eor",
    soph: "naive",
    question:
      "Has their legal or tax adviser already looked at this, or are we the first opinion?",
    why: "If counsel is engaged, the deal runs on precision — they will come with questions about IP assignment, termination exposure, and corporate tax presence, and those questions are winnable. If nobody has looked, the client will underestimate every statutory obligation, and the sale is education before it is procurement. Same product, different pace, different first meeting.",
    listenFor: [
      "their GC is driving this",
      "an outside firm looked at it",
      "nobody's looked at it",
      "they're asking us what to do",
    ],
    followUp:
      "If counsel is involved, can we get their open questions in writing before the first meeting?",
    relayLine:
      "Would you mind asking them whether their legal or tax adviser has already weighed in on employing people in {countries}?",
  },
  {
    id: "eor-data-privacy",
    category: "platform",
    phase: "needs_analysis",
    audience: "ops",
    product: "eor",
    soph: "any",
    question: "Where does your employee data for {countries} live today?",
    why: "For people employed in Europe and a growing number of other jurisdictions, HR and payroll data carries obligations that land on the employer: a lawful basis, a privacy notice the employee actually receives, limits on transfers, and defined responsibilities split between client and provider. An employer-of-record arrangement divides those roles, so the client needs a named internal owner. When the answer is that a local manager keeps a spreadsheet, that is the finding.",
    listenFor: [
      "a shared drive",
      "in our HRIS",
      "the local manager keeps it",
      "nobody owns that",
    ],
    followUp:
      "Does your current privacy notice cover employees outside the US, and who would update it?",
    relayLine:
      "Would you mind asking them where employee data for {countries} is stored today?",
  },
  {
    id: "eor-entity-carry",
    category: "money",
    phase: "needs_analysis",
    audience: "exec",
    product: "eor",
    soph: "inhouse",
    question:
      "If you stood up your own entity in {countries}, who on your team would carry the local filings and accounting?",
    why: "The entity-versus-employer-of-record comparison is usually made on setup and lost on carry. An entity brings permanent obligations that do not scale down with headcount — bookkeeping to local standards, filings on a local calendar, sometimes a resident director or local representative, and a local-language paper trail. Those need a named owner even for one employee. Asking who would do the work makes the cost structure concrete without either of us quoting anything.",
    listenFor: [
      "we'd hire a local firm",
      "our controller would figure it out",
      "we never thought past registration",
      "nobody in that time zone",
    ],
    followUp:
      "How many people would you need in one country before carrying that overhead felt worth it?",
    relayLine:
      "Would you mind asking them who inside their company would handle the local accounting and statutory filings if they set up their own entity in {countries}?",
  },
  {
    id: "eor-exit-conversion",
    category: "commercial",
    phase: "contract",
    audience: "exec",
    product: "eor",
    soph: "any",
    question:
      "When you eventually move these people onto your own entity, what do you want to happen to their service history and contracts?",
    why: "Leaving an employer of record is a change of legal employer, and by default that reads as a termination by the provider and a fresh hire by the client's own entity. In several jurisdictions accrued service, leave balances and continuity of employment feed directly into future notice and severance entitlements, so unless the move is papered as a transfer that preserves continuity — and in a few countries a statutory transfer rule may do that automatically — the employee is quietly reset, and a reset employee has a grievance against the client. Raising it at contract signals confidence rather than lock-in, and it costs nothing while neither side is under pressure.",
    listenFor: [
      "we plan to have our own entity",
      "we'd just re-hire them",
      "we hadn't thought about leaving",
      "would the provider fight that",
    ],
    followUp:
      "Would you want the transfer terms written in now, while there's no pressure on either side?",
    relayLine:
      "Would you mind asking them what they'd want to happen to their people in {countries} if they later moved them onto their own entity?",
  },
  {
    id: "eor-legacy-terms",
    category: "classification",
    phase: "needs_analysis",
    audience: "ops",
    product: "eor",
    soph: "inhouse",
    question: "Can you show me what the people in {countries} actually signed?",
    why: "Moving someone onto an employer of record means issuing a new employment contract, and the old paper sets the floor. Existing documents can carry accrued service, a notice period, a bonus commitment, or restrictive terms, and several countries require a written contract in the local language — where that is missing, the usual consequence is that terms cannot be enforced against the employee, or that the employee can rely on whichever version favors them, rather than that nothing exists. Without the documents, nobody can tell the worker whether their terms are improving or quietly getting worse, and that uncertainty is the mechanism that stalls a conversion.",
    listenFor: [
      "a US contractor agreement",
      "nothing in writing",
      "English only",
      "their local company holds the paperwork",
    ],
    followUp: "Who can get those documents to us before we quote anyone a start date?",
    relayLine:
      "Would you mind asking them whether they can share what their people in {countries} actually signed?",
  },
  {
    id: "eor-onboard-inputs",
    category: "timing",
    phase: "demo",
    audience: "ops",
    product: "eor",
    soph: "any",
    question:
      "Who on your side chases candidates for documents, bank details, and signed contracts?",
    why: "Employer-of-record onboarding is a document race. Enrolling the person with the local tax and social security bodies, issuing the local contract, and hitting the first in-country payroll cut-off all wait on items only the worker can supply, and missing a cut-off pushes first pay to the next cycle. The mechanism is unforgiving in one specific way: nobody chases the worker unless someone is named to do it, so the fix is naming an owner before the clock starts rather than after it has run.",
    listenFor: [
      "the hiring manager, I guess",
      "we have an HR coordinator",
      "the candidate is slow to respond",
      "nobody — you'd deal with them directly",
    ],
    followUp:
      "Would you rather we chase the worker directly, or keep everything routed through your coordinator?",
    relayLine:
      "Would you mind asking them who on their side will chase candidates in {countries} for documents and bank details once an offer is out?",
  },
  {
    id: "eor-pe-activity",
    category: "risk",
    phase: "needs_analysis",
    audience: "exec",
    product: "eor",
    soph: "any",
    question:
      "What do your people in {countries} actually do — internal work, or selling and delivering to local customers?",
    why: "Permanent-establishment exposure turns more on activity than on headcount. Tax authorities commonly look at whether someone habitually negotiates or concludes contracts on the company's behalf, or whether the company maintains a fixed place of business locally. An employer of record removes the employment obligations, but it does not automatically settle the company's own corporate tax position, so this is the question that keeps me from promising a cure the structure cannot deliver.",
    listenFor: [
      "they close deals locally",
      "purely engineering",
      "they're customer-facing",
      "we lease space there",
    ],
    followUp:
      "Has your tax adviser looked at whether any of those roles create a taxable presence for the company itself?",
    relayLine:
      "Would you mind asking them what their people in {countries} do day to day — internal work, or selling and signing with local customers?",
  },
  {
    id: "eor-prior-promise",
    category: "timing",
    phase: "investigate",
    audience: "partner",
    product: "eor",
    soph: "any",
    question:
      "Has anyone already promised them a start date or a country list that I'd be inheriting?",
    why: "Employer-of-record onboarding is gated by things neither of us controls — enrolling the individual with the local tax and social security bodies, issuing a compliant local employment contract, obtaining local tax and bank identifiers, the first in-country payroll cut-off, and in some countries a work permit queue. A date offered before those are scoped becomes the client's expectation, and the first thing I do in the relationship is either honor an impossible commitment or break it.",
    listenFor: [
      "we told them first of the month",
      "they think it's a week",
      "no date yet",
      "the client already picked the countries",
    ],
    followUp:
      "Can we hold them to a range rather than a date until registration timing per country is confirmed?",
    relayLine:
      "Would you mind asking them what start date they have in mind for {countries}, so we can check it against in-country registration timing before anyone commits to it?",
  },
  {
    id: "eor-probation-notice",
    category: "classification",
    phase: "needs_analysis",
    audience: "ops",
    product: "eor",
    soph: "naive",
    question:
      "How much flexibility are you expecting on probation and notice in {countries}?",
    why: "At-will employment has no counterpart in most of the world. Probation is typically capped by statute or by collective agreement, so a shorter one is usually fine but the cap cannot be drafted past; notice usually scales with length of service and the statutory minimum can be improved but not reduced by agreement. Surfacing the expectation now prevents the offer stage from becoming the moment the client discovers the arrangement they assumed they were buying does not exist in that country.",
    listenFor: [
      "we do 90 days everywhere",
      "at-will",
      "we need to be able to exit fast",
      "whatever's standard there",
    ],
    followUp:
      "Which roles would you most want a long probation on, so we can check what each country actually permits?",
    relayLine:
      "Would you mind asking them what they're expecting on probation and notice periods for hires in {countries}?",
  },
  {
    id: "eor-statutory-extras",
    category: "money",
    phase: "needs_analysis",
    audience: "ops",
    product: "eor",
    soph: "naive",
    question:
      "Did the budget for these roles include employer contributions and mandated extras, or just salary?",
    why: "Employer cost abroad is salary plus statutory employer contributions plus, in a number of countries, mandated additional payments — a thirteenth-month salary, a holiday allowance, a severance fund accrual. A budget built on salary alone is structurally short before any provider fee enters the picture. The gap otherwise surfaces at the offer, when the client feels misled by whoever gave them the original number.",
    listenFor: [
      "we budgeted the salary",
      "same as a US hire",
      "the recruiter gave us a number",
      "what's a thirteenth month",
    ],
    followUp:
      "Would a country-by-country view of employer cost structure help you re-baseline before offers go out?",
    relayLine:
      "Would you mind asking them whether their budget for {countries} accounts for employer contributions and any locally mandated additional payments, or only salary?",
  },
  {
    id: "eor-termination-authority",
    category: "risk",
    phase: "contract",
    audience: "ops",
    product: "eor",
    soph: "any",
    question:
      "If a termination has to happen in {countries}, who on your side is allowed to say it to the employee?",
    why: "Where an employer of record is the legal employer, only that employer can terminate, and the local process runs in a sequence with a clock: written notice, sometimes a stated ground, sometimes a hearing or an authority notification. A manager who tells someone they are finished before the process begins can turn a clean exit into an unlawful dismissal claim. Agreeing the routing before signature is what prevents that on a bad Friday afternoon.",
    listenFor: [
      "the manager handles it",
      "HR would get looped in",
      "we move fast on this stuff",
      "we've never done it abroad",
    ],
    followUp:
      "Should the escalation path go into the onboarding pack your managers receive?",
    relayLine:
      "Would you mind asking them who on their side would be allowed to tell an employee abroad that a termination is happening?",
  },
  {
    id: "eor-termination-cost",
    category: "money",
    phase: "exec_summary",
    audience: "exec",
    product: "eor",
    soph: "naive",
    question:
      "If a hire doesn't work out six months in, whose budget covers the statutory exit cost?",
    why: "Termination abroad is a process with a price: notice worked or, where local law permits, paid in lieu; statutory severance where it applies; accrued leave paid out; and in some countries a stated ground or an authority notification before a dismissal is valid. Under an employer-of-record agreement that cost is normally the client's to fund, and some providers hold a reserve or deposit against it — either way it is not the provider's cost to absorb. If no budget owner exists, the first difficult exit becomes an argument with us instead of a decision they planned for.",
    listenFor: [
      "we'd just let them go",
      "at-will",
      "the hiring manager's budget",
      "nobody's modeled that",
    ],
    followUp:
      "Would you want exit exposure modeled country by country before these offers go out?",
    relayLine:
      "Would you mind asking them whose budget would absorb the exit cost if a hire in {countries} had to be let go after a few months?",
  },
  {
    id: "eor-work-auth",
    category: "classification",
    phase: "needs_analysis",
    audience: "ops",
    product: "eor",
    soph: "any",
    question:
      "Is anyone's right to work tied to a specific employer or permit in {countries}?",
    why: "Work authorization is often employer-specific: the permit names the sponsoring employer, so changing the legal employer can require a fresh application rather than a transfer, with a processing queue attached and sometimes a window in which the person cannot lawfully work. This is one of the few onboarding facts that can make a date impossible rather than merely tight, so it belongs in scoping rather than in onboarding.",
    listenFor: [
      "they're on a work permit",
      "they're a citizen there",
      "a local company sponsors them",
      "we assumed it moves with them",
    ],
    followUp:
      "Can we get each person's status and permit type confirmed before we set any start date?",
    relayLine:
      "Would you mind asking them whether any of their people in {countries} hold a work permit that's tied to a specific employer?",
  },
  {
    id: "eor-works-council",
    category: "risk",
    phase: "needs_analysis",
    audience: "exec",
    product: "eor",
    soph: "inhouse",
    question:
      "Are any of these roles under a union or collective agreement in {countries} — or is there a works council?",
    why: "In several European countries a sector-level agreement sets minimum pay grades, working time, and notice terms for an entire industry. Which agreement applies is not automatic under an employer of record: it can follow the client's sector or the provider's own registered activity, and in some countries employing through a third party sits under an agency-work regime with its own parity and licensing rules. Where an employee representative body exists, changing employment arrangements can require consultation on a calendar you cannot compress. That is a term-setting and timeline input, not a footnote, and clients rarely raise it unprompted.",
    listenFor: [
      "there's a sector agreement",
      "we don't know",
      "the local staff mentioned a council",
      "they're all individual contracts",
    ],
    followUp:
      "Who locally could confirm which agreement applies to these job classifications?",
    relayLine:
      "Would you mind asking them whether any of their roles in {countries} fall under a collective agreement, or whether there's an employee representative body involved?",
  },
  {
    id: "cm-aor-or-rail",
    category: "incumbent",
    phase: "investigate",
    audience: "partner",
    product: "contractor",
    soph: "displacement",
    question:
      "Does their current contractor provider actually contract the workers, or just move the money?",
    why: "\"Contractor management\" covers two very different products: a payment rail that hands the classification question straight back to the client, and an agent- or contractor-of-record arrangement where a third party contracts the worker and takes on part of the determination. Clients routinely believe they bought the second and are on the first. Knowing which before the meeting decides whether I open on cost and workflow or on exposure they don't know they're carrying.",
    listenFor: [
      "they just use it to pay people",
      "I've seen the invoices, never the contract",
      "I assumed it worked like the EOR",
      "no idea, honestly",
    ],
    followUp:
      "Can you find out whose name is on the agreement with the contractor before we meet?",
    relayLine:
      "Would you mind asking them whether their current contractor provider actually contracts the worker, or only processes the payments?",
  },
  {
    id: "cm-audit-file",
    category: "risk",
    phase: "exec_summary",
    audience: "exec",
    product: "contractor",
    soph: "any",
    question:
      "If an authority asked for everything on one contractor — agreement, invoices, proof of payment — could you hand it over this week?",
    why: "These disputes are largely decided on documentation, and a party that can't produce a coherent file argues from a weak position even when the underlying facts favor them. When contractor records are split across accounts payable, email and a manager's laptop, the file effectively does not exist. That's a separate exposure from whether the classification was right, and it's the one the client can close immediately.",
    listenFor: [
      "eventually, yes",
      "the person who ran that has left",
      "it's spread across a few places",
      "we'd have to reconstruct it",
    ],
    followUp: "Who would you put on that if it landed this week?",
    relayLine:
      "Would you mind asking them whether they could produce a complete file on a single international contractor — agreement, invoices and proof of payment — if an authority asked for it?",
  },
  {
    id: "cm-classification-liability",
    category: "commercial",
    phase: "contract",
    audience: "partner",
    product: "contractor",
    soph: "any",
    question:
      "Does your paper and ours say the same thing about who determines classification — and who carries it if that's wrong?",
    why: "Contractor management is the product where the compliance question gets assumed away instead of allocated. A partner who resells it can end up standing behind a determination they never made, and a client can sign believing the determination travelled with the invoice. Settling the allocation before signature is the difference between a contract conversation now and an argument after a reclassification.",
    listenFor: [
      "we assumed you were taking that on",
      "our MSA is silent on it",
      "counsel will want to see this",
      "we're only the referral here",
    ],
    followUp:
      "Do you want your counsel and ours on one call before this goes out for signature?",
    relayLine:
      "Would you mind asking them who they understand to be making the classification determination on each contractor, so the contract says the same thing everyone is assuming?",
  },
  {
    id: "cm-conversion-trigger",
    category: "timing",
    phase: "needs_analysis",
    audience: "partner",
    product: "contractor",
    soph: "any",
    question:
      "When one of their contractors becomes worth making permanent, does that come to you first?",
    why: "Growth is what breaks a contractor arrangement — the longer and closer the relationship gets, the harder it is to defend, and the moment the client wants someone permanent they need an actual employment route in that country. If that request never reaches the partner, the client's default is to leave the person as a contractor and let the exposure keep compounding. So this is a risk question and a referral route at the same time.",
    listenFor: [
      "they've never raised that with me",
      "they'd try to set up an entity",
      "I think they just keep them on",
      "they did ask about one country recently",
    ],
    followUp:
      "Has any one of them ever come up by name — someone the client said they wished they could just hire?",
    relayLine:
      "Would you mind asking them whether there's an international contractor they'd make a permanent employee today if the route were straightforward?",
  },
  {
    id: "cm-corridor-friction",
    category: "money",
    phase: "needs_analysis",
    audience: "ops",
    product: "contractor",
    soph: "inhouse",
    question: "Which countries give you trouble actually landing contractor payments?",
    why: "Corridors differ in concrete ways: some need local clearing details rather than an international format, some require a stated purpose of payment or a supporting invoice before funds move, and some limit what a personal account can receive in foreign currency. That friction is usually the hidden reason a client batches payments monthly instead of paying on the schedule they'd prefer — and to the worker, a stuck payment is indistinguishable from not being paid.",
    listenFor: [
      "the bank keeps asking for documents",
      "it gets returned sometimes",
      "they need it in local currency",
      "we only pay monthly because it's a hassle",
    ],
    followUp: "How long between you releasing a payment and the contractor seeing it?",
    relayLine:
      "Would you mind asking them which countries cause trouble getting contractor payments to land?",
  },
  {
    id: "cm-country-by-country",
    category: "classification",
    phase: "needs_analysis",
    audience: "exec",
    product: "contractor",
    soph: "inhouse",
    question:
      "Was the contractor agreement reviewed against each country's rules, or written once and reused everywhere?",
    why: 'Classification is decided country by country and jurisdictions weight the factors differently, so a single template stretched across a footprint is usually defensible in some of those countries and weak in others. That reframes the conversation from "are we compliant" — which nobody can answer in a meeting — to "which countries are we exposed in," which is a question with a real answer and an owner.',
    listenFor: [
      "same agreement for everyone",
      "counsel looked at it once, years ago",
      "we started from a template",
      "nobody has looked country by country",
    ],
    followUp: "Which country holds your longest-running contractor?",
    relayLine:
      "Would you mind asking them whether their contractor agreements were reviewed against each country's own rules, or written once and reused everywhere?",
  },
  {
    id: "cm-currency-absorb",
    category: "money",
    phase: "needs_analysis",
    audience: "ops",
    product: "contractor",
    soph: "inhouse",
    question: "What currency is each contractor's rate agreed in?",
    why: "If the rate is set in the client's currency and lands in a local account, the contractor absorbs both the conversion spread and every rate movement — which resurfaces later as repeated requests to reset the rate, or as quiet attrition. If it's set in local currency, the client's cost moves instead. Somebody is always absorbing it, and usually nobody decided who, which means the cost structure was never designed.",
    listenFor: [
      "we pay in dollars, that's on them",
      "they've asked to reset the rate twice",
      "we don't know what actually lands",
      "the receiving bank takes a cut",
    ],
    followUp:
      "Has anyone come back asking for a rate change because of the exchange rate?",
    relayLine:
      "Would you mind asking them which currency their contractors' rates are set in?",
  },
  {
    id: "cm-exclusivity",
    category: "classification",
    phase: "first_meeting",
    audience: "ops",
    product: "contractor",
    soph: "any",
    question: "Do any of these contractors work full time, just for you?",
    why: "Exclusivity and full-time hours weigh heavily in most countries' classification tests, and unlike questions about control the client can answer this precisely without pulling in counsel. One client and a full working week is the profile an authority examines first, and it is also the profile a worker can put in front of a tribunal or labour authority themselves — a route to challenge that the client does not control.",
    listenFor: [
      "they're basically full time for us",
      "we're their only client",
      "they do have other clients",
      "I'd have to ask the manager",
    ],
    followUp: "How long has the longest-running one been with you?",
    relayLine:
      "Would you mind asking them whether any of their international contractors work for them full time with no other clients?",
  },
  {
    id: "cm-invoice-chase",
    // Money, not platform (refiled 2026-08-24): the chase is workflow cost —
    // invisible labor concentrated on one person — which is the money story.
    category: "money",
    phase: "demo",
    audience: "ops",
    product: "contractor",
    soph: "inhouse",
    question:
      "Who ends up chasing the contractors who haven't sent an invoice each month?",
    why: "Contractor pay is gated on the worker submitting paperwork, which employee payroll does not depend on, so the run cannot close until someone collects. That chasing is invisible labor and it tends to concentrate on one person — naming them gives you an operator with a personal reason to want this fixed. The answer also reveals whether approval is recorded anywhere or happens verbally and disappears.",
    listenFor: [
      "that would be me",
      "some send nothing and we just pay the usual",
      "there's no real approval",
      "we hold the payment until it turns up",
    ],
    followUp: "What happens when the invoice is late — do they get paid anyway?",
    relayLine:
      "Would you mind asking them who ends up chasing their international contractors for missing invoices each month?",
  },
  {
    id: "cm-reclass-owner",
    category: "risk",
    phase: "exec_summary",
    audience: "exec",
    product: "contractor",
    soph: "any",
    question:
      "If an authority in {countries} decided a contractor had been an employee all along, who inside the company owns that?",
    why: "Reclassification typically looks backward over the engagement rather than forward, as far as the local limitation period allows, and it can carry unpaid employer contributions, missed statutory entitlements and termination protections with it — landing on whichever party engaged the person. No provider takes on that historic period; a new arrangement only fixes it going forward. Naming the internal owner converts a diffuse compliance worry into one executive's specific problem, and that is what makes an exec sponsor a fix rather than file it.",
    listenFor: [
      "I suppose that lands on me",
      "counsel would deal with it",
      "we've never modeled that",
      "isn't that covered somewhere?",
    ],
    followUp:
      "Would you rather that exposure sat with you, or with a party that takes on the employment relationship in-country?",
    relayLine:
      "Would you mind asking them who inside their business would own the outcome if an authority reclassified one of their overseas contractors as an employee?",
  },
  {
    id: "cm-roster-count",
    category: "footprint",
    phase: "investigate",
    audience: "partner",
    product: "contractor",
    soph: "any",
    question:
      "Do you know how many people they're paying as international contractors today?",
    why: "Contractor populations usually live in accounts payable rather than payroll, so they almost never surface in platform data or the CRM the way employees do. The count and the country mix decide whether this is a payment-workflow conversation or a classification conversation — two different meetings. And if nobody on our side can answer it, that gap is itself the reason to get in the room.",
    listenFor: [
      "AP pays those, not payroll",
      "only the employees are in the system",
      "a handful, I think",
      "nobody has ever asked",
    ],
    followUp:
      "Who on their side actually knows the full list — payroll, finance, or the hiring managers?",
    relayLine:
      "Would you mind asking them how many people they pay as contractors internationally?",
  },
  {
    id: "cm-system-of-record",
    category: "platform",
    phase: "first_meeting",
    audience: "ops",
    product: "contractor",
    soph: "inhouse",
    question:
      "Where do your international contractors live in your systems — with the employees, or somewhere separate?",
    why: "When contractors are paid out of accounts payable or a spreadsheet, there is no single roster, no consistent agreement version and no retained history — so the arrangement can be perfectly sound and still be impossible to evidence. The answer also tells you what they're actually shopping for: a system of record for a population they can't currently see, or just a cheaper way to send money.",
    listenFor: [
      "a spreadsheet",
      "accounts payable handles it",
      "each manager keeps their own list",
      "they're not in the HR system at all",
    ],
    followUp: "When a contractor stops working with you, who takes them off that list?",
    relayLine:
      "Would you mind asking them whether their international contractors are tracked in the same system as their employees, or somewhere separate?",
  },
  {
    id: "cm-tools-integration",
    category: "classification",
    phase: "needs_analysis",
    audience: "ops",
    product: "contractor",
    soph: "any",
    question:
      "Do the contractors use your equipment and report to your managers the way employees do?",
    why: "A company laptop, a company email address and a named internal manager are integration facts an authority can read straight out of the client's own records — they don't depend on anyone's characterization of the relationship. Genuine independence tends to show up as the contractor's own tools and their own method of working. So this asks about evidence the client has already created rather than about what they intended.",
    listenFor: [
      "we issue the laptop",
      "they're in our Slack every day",
      "they report to our engineering manager",
      "they work off their own setup",
    ],
    followUp:
      "Does the agreement say anything about how the work gets done, or only what gets delivered?",
    relayLine:
      "Would you mind asking them whether their international contractors use company equipment and accounts and report to internal managers the way employees do?",
  },
  {
    id: "cm-vat-invoicing",
    category: "money",
    phase: "proposal",
    audience: "ops",
    product: "contractor",
    soph: "inhouse",
    question:
      "Do any of your contractors invoice as a registered business and add VAT or GST?",
    why: "A contractor registered as a business abroad may have indirect-tax obligations, but where the client's buying entity sits decides the treatment: for cross-border business-to-business services the place of supply is usually the customer's country, so local VAT or GST often should not appear on an invoice to a US entity — and where it does, a US buyer normally cannot recover it. So tax on the invoice is something to read rather than just pay: it can mean the contractor is mis-invoicing, or that the client has a local buying entity and the treatment is correct. It cuts the other way too — an individual invoicing with no registration in a country that requires one is a sign the arrangement was never set up properly. Either way it changes the real cost of the engagement, so it belongs in the proposal rather than in a surprise after it.",
    listenFor: [
      "some invoices have tax on them",
      "we just pay the total on the invoice",
      "they're all individuals",
      "AP flags it and nobody knows what to do",
    ],
    followUp:
      "Does the invoice carry a tax registration number, or just a name and a total?",
    relayLine:
      "Would you mind asking them whether any of their international contractors invoice as a registered business with VAT or GST added?",
  },
  {
    id: "cm-what-is-signed",
    category: "classification",
    phase: "needs_analysis",
    audience: "ops",
    product: "contractor",
    soph: "any",
    question:
      "What's actually signed with each contractor — a real agreement, a purchase order, or an email thread?",
    why: "In any dispute or audit the written agreement is the first document requested, and international contractor relationships are frequently papered with nothing more than a rate agreed by email or a PO a manager raised. Whether a signed agreement exists per person is the difference between documentation cleanup and a full re-papering, which changes onboarding scope and timeline before anything else does.",
    listenFor: [
      "there's a template somewhere",
      "the hiring manager handled that one",
      "just purchase orders",
      "some of them, not all",
    ],
    followUp: "Are they all on the same version, or has it drifted with each hire?",
    relayLine:
      "Would you mind asking them what's actually signed with each international contractor — a real agreement, a purchase order, or just email?",
  },
  {
    id: "cm-withholding",
    category: "risk",
    phase: "needs_analysis",
    audience: "ops",
    product: "contractor",
    soph: "inhouse",
    question:
      "Has anyone checked whether paying contractors in {countries} puts a withholding or reporting obligation on you?",
    why: 'A contractor payment is not automatically outside every tax system. On the US side, a foreign contractor working abroad is normally documented with a W-8BEN or W-8BEN-E rather than a 1099, and US withholding or 1042-S reporting turns on whether the income is US-source — so "we issue a 1099" is usually the wrong instinct rather than a complete answer. Locally, depending on the country, the contractor\'s own registration status, and whether the client has any presence there, the payer can be required to withhold at source, register, or file a return listing the payments made. Clients tend to read "contractor" as "invoice in, nothing else owed," and that assumption is jurisdiction-specific rather than general — so the useful question is who made the call, not what the rule is.',
    listenFor: [
      "it's just an invoice",
      "our accountant said we're fine",
      "we issue a 1099 and that's it",
      "what obligation?",
    ],
    followUp: "Which advisor made that determination, and how recently?",
    relayLine:
      "Would you mind asking them whether anyone has checked if paying contractors in {countries} creates a withholding or reporting obligation on their side?",
  },
  {
    id: "gp-bonus-equity",
    category: "money",
    phase: "needs_analysis",
    audience: "ops",
    product: "payroll",
    soph: "any",
    question:
      "How do bonuses get paid in {countries} — on the regular run or off cycle, and is any of it stock-based?",
    why: "A bonus that rides the regular run is a pay element; a bonus paid off cycle is an extra payroll, with its own cut-off, funding event and remittances, and it has to be scoped as one. Share awards are the deeper trap: in many countries a vesting or exercise event is taxable through payroll, with employer withholding and reporting attached, and the client's equity plan usually lives with a US administrator that has never spoken to an in-country payroll. If equity exists and nobody owns that hand-off, the first vesting event becomes a scramble instead of a run.",
    listenFor: [
      "annual bonus in December",
      "sales comp pays quarterly",
      "some of them have options",
      "we run it whenever finance approves",
    ],
    followUp:
      "Who tells whoever runs payroll that a vesting or exercise event happened, and how quickly?",
    relayLine:
      "Would you mind asking them whether bonuses in {countries} pay with the regular run or off cycle, and whether any of their people hold share awards?",
  },
  {
    id: "gp-data-in",
    category: "platform",
    phase: "needs_analysis",
    audience: "ops",
    product: "payroll",
    soph: "any",
    question:
      "How does pay data actually reach whoever runs each payroll — a spreadsheet, an export, or a real feed?",
    why: "The input hand-off is where errors get introduced without anyone seeing them. A re-keyed spreadsheet drops changes made after it was sent, leaves no record of who altered what, and asks the client to trust an unverified transformation of their own data. The answer also tells me exactly what integration work an implementation requires and whether the HR system can credibly be the system of record.",
    listenFor: [
      "we email a sheet",
      "she keys it in",
      "each country wants a different template",
      "whatever format they ask for",
    ],
    followUp:
      "Which part of that hand-off breaks most often — new hires, leavers, or changes made after the cut-off?",
    relayLine:
      "Would you mind asking them how pay data gets to each country's payroll today, and whether it's re-keyed by hand anywhere along the way?",
  },
  {
    id: "gp-distribution",
    category: "platform",
    phase: "first_meeting",
    audience: "ops",
    product: "payroll",
    soph: "any",
    question:
      "On payday in {countries}, how do net pay and payslips actually reach your people?",
    why: "Distribution is where the arrangement shows its real shape. Net pay leaving a US account crosses a currency and puts the timing risk on the worker; a local bank account means an entity with signatories and filings sitting behind it; a provider disbursing means an agreement someone should be able to produce. Payslips are not a courtesy either — most countries mandate their content and some their language, and a worker who cannot get one struggles to rent a flat or file a return. Whoever touches payday last is also the person the workers already trust, which matters to how any transition gets announced.",
    listenFor: [
      "we wire from the US account",
      "there's a local account the accountant uses",
      "payslips go out by email, mostly",
      "people ask us where their payslip is",
    ],
    followUp:
      "Is there a local bank account in each country, or does everything leave the US?",
    relayLine:
      "Would you mind asking them how net pay and payslips reach their people in {countries} on payday today?",
  },
  {
    id: "gp-effort-cost",
    category: "money",
    phase: "exec_summary",
    audience: "exec",
    product: "payroll",
    soph: "inhouse",
    question: "How many hours a month does the international side eat across your team?",
    why: "The cost that moves an exec is rarely the provider's charge; it is a senior person's calendar and the error rate. Effort concentrates in one or two people — a controller, an HR lead — and rework never appears in any budget line, so it has never been counted. Framing the comparison in hours and corrections lets me make the case without discussing amounts at all, and the same answer exposes key-person risk.",
    listenFor: [
      "a few days every month",
      "mostly our controller",
      "there's always one correction",
      "we've never measured it",
    ],
    followUp: "If that person were unavailable for a full cycle, who could run it?",
    relayLine:
      "Would you mind asking them how many hours a month their international payroll takes across the team?",
  },
  {
    id: "gp-extra-periods",
    category: "money",
    phase: "exec_summary",
    audience: "exec",
    product: "payroll",
    soph: "naive",
    question:
      "Does your plan for {countries} account for mandated pay beyond twelve periods — a 13th month, holiday allowance, seniority pay?",
    why: "Some countries mandate pay beyond twelve equal periods, by law or by collective agreement, and several require it at a fixed time of year. A plan built on the US assumption of twelve periods is short by exactly that obligation. Because it accrues as people work, recognizing it only when it is paid distorts both monthly cost and the balance sheet. This is the exec-level structural point that makes a US-only buyer take country differences seriously.",
    listenFor: [
      "we budgeted twelve months",
      "13th month, is that real",
      "our accountant mentioned something",
      "we'll deal with it when it comes",
    ],
    followUp: "Who would own that accrual — your controller or the local accountant?",
    relayLine:
      "Would you mind asking them whether their plan for {countries} includes any mandated extra pay periods or allowances?",
  },
  {
    id: "gp-filing-owner",
    category: "risk",
    phase: "needs_analysis",
    audience: "ops",
    product: "payroll",
    soph: "inhouse",
    question:
      "Who holds each country's filing calendar — the deadlines that aren't the same date as payday?",
    why: "In-country obligations run on their own clock. Withholding remittances, social contribution declarations and periodic returns each carry deadlines separate from pay date, and penalties for missing them are usually automatic rather than negotiated. If that calendar lives in one person's head or inside a local accountant's practice, the client has no visibility and no way to prove compliance until a notice arrives in a language they don't read.",
    listenFor: [
      "our accountant just handles it",
      "it's on someone's calendar",
      "we find out when there's a penalty",
      "we've never seen a filing confirmation",
    ],
    followUp: "When was the last time you saw proof that a filing was actually accepted?",
    relayLine:
      "Would you mind asking them who tracks each country's statutory filing deadlines today?",
  },
  {
    id: "gp-first-cycle",
    category: "timing",
    phase: "first_meeting",
    audience: "ops",
    product: "payroll",
    soph: "any",
    question: "When does the first payroll have to land?",
    why: "Everything runs backward from that date: employer registrations where they are missing, parallel-run scope, the incumbent's notice, data collection, and the country's own cut-off — which sits days before pay date, not on it. A new hire with a promised start date makes the deadline hard rather than preferred, and a hard date discovered late is how an implementation opens with an apology. The date also arbitrates between a clean cutover at the start of a tax year and a mid-year takeover that has to carry the incumbent's year-to-date figures.",
    listenFor: [
      "first of next month",
      "we have new hires starting on the 1st",
      "whenever it's ready",
      "the current contract ends in the spring",
    ],
    followUp:
      "Is anything already promised against that date — an offer letter, a client commitment, a contract end?",
    relayLine:
      "Would you mind asking them what date the first payroll in {countries} has to land, and whether anything is already promised against it?",
  },
  {
    id: "gp-funding",
    category: "money",
    phase: "needs_analysis",
    audience: "ops",
    product: "payroll",
    soph: "inhouse",
    question:
      "How many days before payday does each country's payroll money have to be committed?",
    why: "Net pay and statutory remittances both have cut-offs that sit before pay date, and where funding crosses currencies the conversion adds its own lead time. Employer charges are often remitted separately from net pay on a different date entirely. A client who funds late learns it when employees are paid late, which in many countries is a legal exposure rather than a service inconvenience. The answer also reveals who in treasury must approve any change to the arrangement.",
    listenFor: [
      "we wire the day before",
      "treasury approves each one",
      "we hold local currency",
      "we've been late before",
    ],
    followUp: "Who can release funds if the usual approver is unavailable that week?",
    relayLine:
      "Would you mind asking them how many days before pay date each country's payroll has to be funded?",
  },
  {
    id: "gp-gl-map",
    // Platform, not money (refiled 2026-08-24): how payroll lands in the
    // finance system is integration, and the money filing buried it in the
    // own-entities scenario where it belongs near the top.
    category: "platform",
    phase: "needs_analysis",
    audience: "ops",
    product: "payroll",
    soph: "any",
    question:
      "Once a payroll runs in {countries}, how does it land in your finance system?",
    why: "Payroll is the largest recurring entry in most companies' accounts, and abroad it arrives as country-specific pay elements and employer charges that have no native match in a US chart of accounts. If someone hand-builds the journal every period, close is slow and the mapping is undocumented — and that person, usually in finance rather than HR, is often the one who actually feels the pain and can fund a change.",
    listenFor: [
      "our controller rebuilds the entry",
      "we book it as one lump",
      "the mapping lives in a spreadsheet",
      "cost by country isn't visible",
    ],
    followUp:
      "Can you see payroll cost by country and cost center today without rebuilding it by hand?",
    relayLine:
      "Would you mind asking them how each country's payroll gets into their accounting system?",
  },
  {
    id: "gp-leave",
    category: "platform",
    phase: "needs_analysis",
    audience: "ops",
    product: "payroll",
    soph: "any",
    question:
      "Where are leave balances tracked today — in-country by payroll, or centrally in your HR system?",
    why: "Statutory leave entitlement, accrual method, carry-over limits and payout on termination are country rules, and paid absence usually feeds the pay calculation directly. If a central HR system holds one company-wide policy, the balance it shows and the balance the in-country payroll uses will drift apart, and the gap tends to surface as a wrong final payment when someone leaves — which is the moment it becomes a claim rather than a correction.",
    listenFor: [
      "everyone's on our US policy",
      "the local accountant tracks it",
      "a spreadsheet per country",
      "we don't really track it abroad",
    ],
    followUp: "When someone leaves, who calculates what leave has to be paid out?",
    relayLine:
      "Would you mind asking them whether leave balances for their international employees are tracked in their HR system or by whoever runs payroll in-country?",
  },
  {
    id: "gp-net-check",
    category: "risk",
    phase: "needs_analysis",
    audience: "ops",
    product: "payroll",
    soph: "inhouse",
    question:
      "Before a payroll goes out in {countries}, how do you know the gross-to-net is right?",
    why: "In-country gross-to-net depends on banded contributions, caps and floors, local tax codes, dependent or family status, and rate changes that can land mid-year. In-house and accountant-run processes commonly verify by comparing net to the prior period, which catches a large swing and misses a wrong band, a stale rate, or a mistreated allowance. Those errors compound quietly until an annual reconciliation or an inspection makes them expensive.",
    listenFor: [
      "we compare to last month",
      "we trust the accountant's file",
      "the employee tells us",
      "nobody re-checks the math",
    ],
    followUp:
      "What was the last error you found, and how long had it been running before anyone noticed?",
    relayLine:
      "Would you mind asking them how they check that a country's gross-to-net is correct before the payroll goes out?",
  },
  {
    id: "gp-notice-period",
    category: "incumbent",
    phase: "first_meeting",
    audience: "ops",
    // Product "any" (2026-08-24): the incumbent's notice clause gates an EOR
    // displacement exactly as hard as a payroll one, and the competitor-EOR
    // scenario's product filter was locking out its own best-fitting question.
    product: "any",
    soph: "displacement",
    question:
      "What notice does the current provider hold you to — and have you already given it?",
    why: "The incumbent's notice period is the real go-live calendar, whatever the plan says. Notice not yet given means the clock has not started; notice already given means a hard end date exists and the transition inherits it, cooperative or not. Providers also behave differently after notice — data exports slow down, the assigned contact changes, goodwill drains — so whatever has to be extracted from them belongs at the start of that window, not the end. Which way the client answers decides whether timing is a choice we make or a wall we work back from.",
    listenFor: [
      "ninety days, I think",
      "we already sent the letter",
      "it auto-renewed on us",
      "we haven't looked at the contract",
    ],
    followUp: "Can you pull the exact notice clause before we set any dates?",
    relayLine:
      "Would you mind asking them what notice their current payroll provider requires, and whether they've already given it?",
  },
  {
    id: "gp-nre",
    category: "risk",
    phase: "first_meeting",
    audience: "ops",
    product: "payroll",
    soph: "naive",
    question:
      "Are you employing in {countries} through your own entity, or as a foreign employer on a non-resident registration?",
    why: "Some countries let a foreign company register as a non-resident employer and run a compliant local payroll with no entity at all; others do not recognize the route, and a few push employers toward it. Which door the client is standing in decides the whole setup: what registrations exist, who withholds and remits, and whether the arrangement is real. The trap is second-hand certainty — when a lawyer set the structure up, the payroll registrations are exactly the part a corporate filing does not include, so the claim has to be checked against registration numbers rather than taken from memory.",
    listenFor: [
      "our attorney set it up",
      "we're registered as a foreign employer",
      "what's a non-resident employer",
      "I'd have to find the paperwork",
      "the entity is set up, so yes",
    ],
    followUp:
      "Can you put your hands on the actual registration numbers per country, so we verify rather than assume?",
    relayLine:
      "Would you mind asking them whether they employ in {countries} through their own entity or under a foreign-employer registration?",
  },
  {
    id: "gp-parallel",
    category: "timing",
    phase: "proposal",
    audience: "ops",
    product: "payroll",
    soph: "any",
    question:
      "What would you need to see from a parallel run before signing off the first live payroll?",
    why: "Parallel-run scope is the largest hidden driver of an implementation timeline: one cycle or two, which countries, and whose figures are treated as truth when the two disagree. They can differ legitimately, because the incumbent calculation may have been wrong. Settling that while the plan is still being written prevents a go-live date everyone privately doubts, and it names who on their side has to do the comparing and how much time they actually have.",
    listenFor: [
      "we'd want two clean cycles side by side",
      "our controller has to tie it out",
      "whatever you normally do",
      "we just want to switch",
    ],
    followUp:
      "Who on your side would do that comparison, and how much of their week can they give it?",
    relayLine:
      "Would you mind asking them what they'd need to see in a parallel run before they'd approve going live in a country?",
  },
  {
    id: "gp-partner-visibility",
    category: "incumbent",
    phase: "demo",
    audience: "exec",
    product: "payroll",
    soph: "displacement",
    question:
      "Does your current provider run payroll in-country themselves, or hand it to local firms?",
    why: "Nearly every global provider relies on some in-country capability; the model determines how questions get answered. A chain of local firms means an escalation is relayed and a calculation question can take days, with no single register to look at. A single platform gives one system of record and one place to see the numbers, even where local filing agents sit behind it. Displacement turns on that difference in visibility and accountability, not on a feature list.",
    listenFor: [
      "we email our account manager",
      "answers take a week",
      "we don't know who's actually behind it",
      "one system for everything",
    ],
    followUp:
      "The last time you questioned a number, how long did an answer take and who gave it to you?",
    relayLine:
      "Would you mind asking them whether their current provider runs payroll in-country themselves or through local firms?",
  },
  {
    id: "gp-pay-frequency",
    category: "platform",
    phase: "needs_analysis",
    audience: "ops",
    product: "payroll",
    soph: "any",
    question: "How many pay cycles a month do you run in each of {countries}?",
    why: "Pay frequency abroad is often not the employer's choice: a number of countries set a minimum frequency or fixed payment windows by statute or collective agreement, so a US semi-monthly habit may be impossible to export and a monthly assumption may fall short of what a country requires. Every additional cycle is a full run — cut-off, approval, funding, remittance — so the count per country is a workload fact as well as a compliance one. Off-cycle habits hide here too: a client who just runs another payroll whenever something was missed is describing a process without a gate.",
    listenFor: [
      "monthly everywhere, we think",
      "the US is semi-monthly so they are too",
      "one country insists on a different date",
      "we run extras when something's missed",
    ],
    followUp: "Which of those frequencies did the country choose, and which did you?",
    relayLine:
      "Would you mind asking them how many pay cycles a month they run in each of {countries}?",
  },
  {
    id: "gp-pension",
    category: "risk",
    phase: "needs_analysis",
    audience: "ops",
    product: "payroll",
    soph: "any",
    question:
      "Who enrolls people in statutory benefits and the pension scheme in each country?",
    why: "Enrollment often sits with a body or provider outside payroll — a social fund, an occupational pension scheme, a mandated insurance — each holding its own membership records and schedules. When payroll deducts but an enrollment lapsed, or the scheme's records disagree with what was remitted, the employer carries the shortfall and the employee finds out at the worst possible moment. A reconciliation nobody performs is the usual finding.",
    listenFor: [
      "it was set up at the start",
      "the provider invoices us",
      "we assume it matches",
      "no one compares the two",
    ],
    followUp: "Has anyone compared the scheme's records to the payroll for a full year?",
    relayLine:
      "Would you mind asking them who handles statutory benefit and pension enrollment in each country?",
  },
  {
    id: "gp-signoff",
    category: "commercial",
    phase: "contract",
    audience: "exec",
    product: "payroll",
    soph: "any",
    question:
      "Who signs off that each country's payroll and filings are compliant — you, an accountant, or a local director?",
    why: "Statutory filings are made in the entity's name, and are usually signed or authorized by someone with local standing. Because the client remains the legal employer, obligations stay with them that no provider can assume. Before signature both sides need it written down: which filings the provider prepares and submits, which require their local director's authorization, and what stays theirs. Left vague, the gap is discovered during the first filing period, when there is no time to fix it.",
    listenFor: [
      "we assumed you'd handle all of it",
      "our local director signs",
      "the accountant is named on the filing",
      "nobody's sure who's on the hook",
    ],
    followUp:
      "Which filings do you expect to stay in your name even with a provider in place?",
    relayLine:
      "Would you mind asking them who authorizes statutory payroll filings in each country today, and whether that person expects to keep doing it?",
  },
  {
    id: "gp-us-lens",
    category: "platform",
    phase: "first_meeting",
    audience: "ops",
    product: "payroll",
    soph: "naive",
    question:
      "You run US payroll in-house — what do you expect to be different doing it in {countries}?",
    why: "It surfaces the gap between what a US-only team knows and what in-country payroll requires without lecturing them. US in-house payroll rests on one federal withholding scheme, state registrations, one currency, and self-service filing. In-country payroll typically adds registration as an employer with local tax and social bodies, mandated payslip content and language, employer social charges set by statute, and rules that can change mid-year. Their answer tells me whether this conversation needs teaching or comparing.",
    listenFor: [
      "it's probably similar",
      "just currency and taxes",
      "we'd need someone local",
      "we don't know what we don't know",
    ],
    followUp:
      "Who on your team would own the in-country obligations that have no US equivalent?",
    relayLine:
      "Would you mind asking them what they expect to be different about running payroll in {countries} compared with the US payroll they run themselves today?",
  },
  {
    id: "gp-variable",
    category: "risk",
    phase: "needs_analysis",
    audience: "ops",
    product: "payroll",
    soph: "any",
    question:
      "Which pay elements beyond base salary do you run in {countries} — overtime, allowances, commission?",
    why: "Fixed salary is the easy part. Overtime entitlement and premium rates are frequently set by statute or a collective agreement rather than company policy, and allowances and benefits in kind each carry their own treatment for tax and social contributions. Deciding how to treat a pay element is a compliance decision, and in most in-house or accountant-run processes nobody can say who made it or on what basis.",
    listenFor: [
      "we just add it to salary",
      "the accountant decides",
      "we don't pay overtime",
      "there's a collective agreement",
    ],
    followUp: "Is any of that governed by a collective agreement you can share with me?",
    relayLine:
      "Would you mind asking them which pay elements beyond base salary they run in {countries}?",
  },
  {
    id: "gp-who-runs",
    category: "incumbent",
    phase: "investigate",
    audience: "partner",
    product: "payroll",
    soph: "any",
    question: "Do you know who actually runs their payroll in each country today?",
    why: "Knowing this before the first meeting keeps me from selling a consolidation story to someone who already bought one. Who actually produces each country's payroll — an internal person, a local accountant, an aggregator, or a global provider — decides whether the conversation is a displacement, a cleanup, or a greenfield build, and each of those is a different meeting with different proof. It also names the incumbent whose notice terms and cooperation will set the transition calendar.",
    listenFor: [
      "their accountant handles it",
      "one provider for everything",
      "our controller does it herself",
      "I don't think anyone has asked",
    ],
    followUp: "Which of those countries would they call the hardest to close each month?",
    relayLine:
      "Would you mind asking them who runs each country's payroll today — an internal person, a local accountant, or an outside provider?",
  },
  {
    id: "gp-worker-mix",
    // Platform, not classification (refiled 2026-08-24): hourly-vs-salaried is
    // the payroll's operating shape, a different sense than the bank's
    // employee-vs-contractor meaning — and the classification filing hid it
    // from the payroll scenario it was written for.
    category: "platform",
    phase: "needs_analysis",
    audience: "ops",
    product: "payroll",
    soph: "any",
    question:
      "Are these all salaried roles, or are there hourly and shift workers on timesheets?",
    why: "A salaried population is a fixed gross with occasional changes; an hourly or shift population makes the payroll variable every cycle, and the variability has rules attached — overtime premiums, night and shift allowances, and rest-time limits are commonly set by statute or collective agreement rather than company policy, and blue-collar classifications are the ones sector agreements most often reach. Timesheets also make pay data operational: hours need a capture method, an approver, and a cut-off, and a late timesheet becomes a wrong or late payment. The mix decides how much of the payroll is calculation and how much is collection.",
    listenFor: [
      "all salaried",
      "the warehouse crew clocks in",
      "shifts rotate weekly",
      "managers approve hours in a spreadsheet",
    ],
    followUp: "How do approved hours reach whoever runs the payroll today, and by when?",
    relayLine:
      "Would you mind asking them whether their people in {countries} are all salaried, or whether some are hourly or shift workers on timesheets?",
  },
  {
    id: "gp-year-end",
    category: "risk",
    phase: "needs_analysis",
    audience: "ops",
    product: "payroll",
    soph: "inhouse",
    question:
      "What does year-end look like in each country — who produces the annual returns and employee statements?",
    why: "Annual obligations are where a year of small errors becomes visible: the annual reconciliation has to tie to what was remitted each period, and employees are typically entitled to a statutory statement of pay and withholding by a local deadline. A process that reliably gets monthly payroll out the door can still fail here, and the client often cannot tell until an employee is unable to file their own return.",
    listenFor: [
      "the accountant does something in January",
      "employees ask us for a form",
      "we had to file a correction",
      "no idea, honestly",
    ],
    followUp:
      "Did last year's annual filing tie to the periodic remittances without a correction?",
    relayLine:
      "Would you mind asking them who handles year-end filings and employee annual statements in each country, and whether last year went cleanly?",
  },
  {
    id: "x-budget-path",
    category: "money",
    phase: "needs_analysis",
    audience: "exec",
    product: "any",
    soph: "any",
    question: "Whose budget does the international side come out of?",
    why: "International spend is usually buried — inside a project line, inside a department's contractor spend, or inside the founder's discretion — and whoever owns that line owns the decision even if they have never been in the conversation. The route also predicts elapsed time: one owner with discretion is short, anything crossing procurement or a committee adds review cycles that have to start early rather than after agreement. This is about structure and route, never amounts.",
    listenFor: [
      "it sits under contractor spend",
      "each department funds their own",
      "procurement gets involved above a threshold",
      "I'd have to find out",
    ],
    followUp:
      "Has anything of this shape gone through that route before, and how long did it take?",
    relayLine:
      "Would you mind asking them whose budget the international people sit under?",
  },
  {
    id: "x-client-capacity",
    category: "platform",
    phase: "needs_analysis",
    audience: "ops",
    product: "any",
    soph: "any",
    question: "Who on your side is actually going to do the work of getting this live?",
    why: "Implementations stall on the client side, not the provider side. Gathering worker data, approving local terms, and answering in-country questions is real work, and it usually lands on one person who already has a full job. Naming that person and their genuine capacity before the plan is written is the difference between a timeline and a wish — and if nobody has been assigned, that gap is the first thing the plan has to fix.",
    listenFor: [
      "that would be me on top of everything else",
      "HR is one person",
      "we have an ops lead for it",
      "nobody's been assigned",
    ],
    followUp:
      "How much of that person's week can genuinely go to this in the first month?",
    relayLine:
      "Would you mind asking them who on their side would own getting international people onboarded, and how much time that person actually has?",
  },
  {
    id: "x-criteria",
    category: "commercial",
    phase: "needs_analysis",
    audience: "exec",
    product: "any",
    soph: "naive",
    question: "What are the two or three things that will actually decide this?",
    why: "Buyers new to this compare on the only axis they understand — cost structure — and then get blindsided by the axes that matter in operation: who carries employer liability, how fast a person can be onboarded compliantly in a specific country, whether it runs as one system alongside their domestic payroll. Hearing their criteria out loud tells me whether they have priced the risk axes at all, and which of the three product lines they believe they are buying, which is often not the one they need.",
    listenFor: [
      "whatever's cheapest, honestly",
      "how fast we can get someone on",
      "it all has to sit in one system",
      "whatever our lawyer is comfortable with",
    ],
    followUp:
      "And when does that decision need to happen — is something forcing the date?",
    relayLine:
      "Would you mind asking them what will actually decide this for them, and who else they're weighing it against?",
  },
  {
    id: "x-do-nothing",
    category: "risk",
    phase: "needs_analysis",
    audience: "exec",
    product: "any",
    soph: "inhouse",
    question: "If nothing changes for a year, what's the worst that happens?",
    why: "The honest answer separates a project from an itch. The do-nothing case here is rarely neutral: an exclusive long-term contractor accrues exposure quietly, a worker who wants local benefits can open the reclassification conversation without asking anyone's permission, an entity that is incorporated but unregistered piles up filing obligations, and a hire that cannot be papered locally simply goes somewhere else. If they cannot name a consequence, this is research and I should qualify it as research rather than forecast it.",
    listenFor: [
      "nothing really changes",
      "we'd lose the candidate",
      "our accountant is nervous about it",
      "someone would eventually ask questions",
    ],
    followUp:
      "And if that turned out wrong — say a contractor filed for local benefits — who'd be answering for it?",
    relayLine:
      "Would you mind asking them what happens if they leave the international side exactly as it is for another year?",
  },
  {
    id: "x-entity-own",
    category: "footprint",
    phase: "first_meeting",
    audience: "ops",
    product: "any",
    soph: "any",
    question: "Do you have a registered legal entity in {countries} today?",
    why: "Entity ownership is the second fork, and it decides the service outright. No entity and no appetite for one is employer of record; an entity they already run needs in-country payroll hung off their own registrations, which is different work on a different timeline. It also matters that an incorporated entity is not a payroll-ready entity — employer tax and social registrations, statutory remittance and filing obligations sit on top of incorporation, and buyers routinely find that gap only after they have promised someone a first pay date.",
    listenFor: [
      "our lawyer set something up",
      "we have a branch there",
      "just a rep office",
      "we never want entities",
      "we just incorporated",
    ],
    followUp:
      "Is that entity registered as an employer for payroll and social contributions yet, or only incorporated?",
    relayLine:
      "Would you mind asking them whether they own a legal entity in {countries}?",
  },
  {
    id: "x-evidence-demo",
    category: "risk",
    phase: "demo",
    audience: "ops",
    product: "any",
    soph: "any",
    question:
      "The day an auditor asks you a question, what would you want to pull out of the system?",
    why: "A demo that shows how the work gets done answers the wrong question for whoever is carrying the compliance worry; what they need to see is what the record looks like afterwards. Naming the artifact in advance — one worker's whole file, a filing confirmation, an approval trail, a payslip in the local language — turns the demo into a test they set themselves and surfaces the evidence they cannot produce today. It is also the cheapest way to learn whether anyone has ever asked them for it.",
    listenFor: [
      "show me a filing was actually accepted",
      "pull up one worker's whole history",
      "show me who approved a change",
      "nobody has ever asked us",
    ],
    followUp:
      "And if they asked next quarter, what would you actually be able to send today?",
    relayLine:
      "Would you mind asking them what they'd want to be able to pull out of a system the day an auditor or an authority asks them a question?",
  },
  {
    id: "x-incumbent-exit",
    category: "incumbent",
    phase: "needs_analysis",
    audience: "ops",
    product: "any",
    soph: "displacement",
    question: "Is there a signed agreement with whoever handles this today?",
    why: "When there is an incumbent global provider, the exit terms set the calendar, not the comparison. Notice periods, minimum commitments and per-worker terms decide whether a move is this quarter or next year. And where the incumbent is the legal employer, moving people means fresh local employment contracts plus decisions about accrued leave and recognized service — which in many countries drive notice and severance entitlements — so the workers have to agree to the move, not just the buyer.",
    listenFor: [
      "it auto-renews",
      "we're month to month",
      "we'd have to give notice",
      "I'm not sure who holds the contract",
    ],
    followUp:
      "Have you asked them what happens to the employees' accrued entitlements and service dates if you move?",
    relayLine:
      "Would you mind asking them whether they're under contract with their current international provider?",
  },
  {
    id: "x-intent-employee",
    category: "classification",
    phase: "first_meeting",
    audience: "ops",
    product: "any",
    soph: "naive",
    question:
      "Are you wanting the people in {countries} to be your employees, or are they going to be sort of project-based contractors?",
    why: 'This is the first fork between employer of record and contractor management, and intent settles it faster than the paperwork does. Most classification tests weigh control, integration, exclusivity and economic dependence over the label on the agreement, so a full-time, exclusive, open-ended "contractor" is exactly the shape that gets challenged later, commonly with employer contributions, back tax and statutory entitlements attached. Asking what they want the relationship to be avoids an argument about what they have called it.',
    listenFor: [
      "they're full time for us",
      "they have their own clients",
      "we call them contractors but",
      "whichever is cheaper",
    ],
    followUp:
      "Has any of them asked to be made an employee, or asked for local benefits?",
    relayLine:
      "Would you mind asking them whether the people they have in {countries} are meant to be employees, or are genuinely independent businesses serving other clients too?",
  },
  {
    id: "x-last-failure",
    category: "incumbent",
    phase: "first_meeting",
    audience: "ops",
    product: "any",
    soph: "displacement",
    question:
      "What was the last thing that actually went wrong with the current provider?",
    why: "The complaint a buyer opens with is a summary they have rehearsed; the last incident is a fact with a date, a person and a resolution, and that is usually where the real reason for shopping sits. It also shows how the incumbent behaves under pressure — who answered, how long it took, whether anyone owned it end to end. Without one concrete incident a displacement runs on generalized dissatisfaction, which never survives the incumbent's retention call.",
    listenFor: [
      "a payroll was wrong and nobody told us",
      "it took a week to get an answer",
      "we still don't know what happened",
      "nothing dramatic, it's just slow",
    ],
    followUp: "Did one person there own it end to end, or did you keep re-explaining it?",
    relayLine:
      "Would you mind asking them what the last thing to go wrong with their current international provider was, and how long it took to get sorted?",
  },
  {
    id: "x-one-view",
    category: "platform",
    phase: "exec_summary",
    audience: "exec",
    product: "any",
    soph: "any",
    question:
      "When you need headcount and cost by country in one place, where does that come from and how long does it take?",
    why: "Executives rarely feel the operational grind; they feel the wait for a number and their own doubt about whether it is right. If someone assembles it by hand from several sources, the real ask may be one place to see the picture rather than one place to run payroll, and those are different scopes on different timelines. The answer also names the view the written summary has to promise, which is the part people remember after the meeting.",
    listenFor: [
      "our controller pulls it together",
      "we ask each provider",
      "board reporting is painful",
      "we don't really have that view",
    ],
    followUp: "Who asks you for that, and what do they do with it when they get it?",
    relayLine:
      "Would you mind asking them where they get headcount and cost by country today, and how long it takes to pull together?",
  },
  {
    id: "x-pain-vs-power",
    category: "commercial",
    phase: "first_meeting",
    audience: "exec",
    product: "any",
    soph: "any",
    question: "Who's living with this problem week to week?",
    why: "With international pay these are almost never the same person. The pain sits with whoever chases the transfers, fields the worker's questions and reconciles at month end; the authority sits with finance or the founder, who sees a tidy line item and no incident. Deals stall precisely there — the person with the pain has no authority, and no language to turn a nuisance into an executive problem. Two names tell me who to arm and who to convince, and they are different jobs.",
    listenFor: [
      "that's me, honestly",
      "our controller handles it",
      "the owner would have to approve",
      "nobody really owns it",
    ],
    followUp:
      "What would the person doing the work need in hand to make that case upward?",
    relayLine: "Would you mind asking them who handles international pay week to week?",
  },
  {
    id: "x-partner-guardrails",
    category: "commercial",
    phase: "investigate",
    audience: "partner",
    product: "any",
    soph: "any",
    question:
      "Anything on this account I should stay away from — or anyone I shouldn't contact directly?",
    why: "In a partner-first motion the relationship is the partner's asset and mine is borrowed. A live renewal, an open service escalation, or a contact who reacts badly to being sold anything are all invisible from my side and all capable of costing the partner the account. Asking first also sets the working expectation that I report back through them rather than around them, which is the thing that earns the second referral.",
    listenFor: [
      "don't raise commercials yet",
      "they're mid-renewal",
      "everything goes through me",
      "there's an open service issue",
    ],
    followUp:
      "How do you want to hear back after the call — a note to you first, or all of us on one thread?",
    relayLine:
      "Would you mind asking them who on their side should be the first point of contact for anything international, and whether anyone else needs to be looped in before we talk?",
  },
  {
    id: "x-partner-history",
    category: "incumbent",
    phase: "investigate",
    audience: "partner",
    product: "any",
    soph: "any",
    question: "Has global come up with this client before?",
    why: "A previous attempt leaves residue. If pricing or a go-live was floated before, the client anchors on it and will measure me against a shape I never agreed to. If a provider failed them, the objection I have to clear is trust in the category rather than fit of the product. And if it has genuinely never come up, that tells me the pain is fresh and unbudgeted, which changes what the first meeting has to accomplish.",
    listenFor: [
      "we looked at it last year",
      "someone already gave them a figure",
      "they tried a provider and it fell apart",
      "it's never come up",
    ],
    followUp: "What stopped it last time — the structure, the timing, or the person?",
    relayLine:
      "Would you mind asking them whether they've looked at an international provider before, and what stopped it going ahead?",
  },
  {
    id: "x-partner-platform",
    category: "platform",
    phase: "investigate",
    audience: "partner",
    product: "any",
    soph: "any",
    question:
      "Once this is running, does your own system need to show their international people, or can that sit with us?",
    why: "The partner has a platform their client logs into every week, and a population that never appears in it becomes a gap the client notices before we do. Some partners want headcount and status flowing back so their own reporting stays whole; others would rather that population stay out of their support queue entirely. Settling it before anything is designed decides what integration work exists and who answers the client's first question about a worker.",
    listenFor: [
      "it has to show in our system",
      "we don't want those records",
      "can it export back to us",
      "we've never carried that population",
    ],
    followUp:
      "Who on your side would own that data coming back — support, implementation, or nobody yet?",
    relayLine:
      "Would you mind asking them whether they'd expect their international people to show up in the system they already use with you, or whether that can sit somewhere else?",
  },
  {
    id: "x-review-gates",
    category: "risk",
    phase: "exec_summary",
    audience: "ops",
    product: "any",
    soph: "any",
    question:
      "What reviews does a new vendor have to clear on your side — security, legal, data protection, insurance?",
    why: "These reviews run on their own calendar and start late unless somebody asks early. Employing or paying people abroad means employee personal data moving across borders, so legal review commonly wants a data processing agreement and a lawful transfer mechanism, security review may want a questionnaire or an audit report, and vendor onboarding forms and insurance certificates arrive at the same moment. Finding this at signature turns an agreed deal into a quarter of waiting.",
    listenFor: [
      "we have a security questionnaire",
      "legal reviews every vendor",
      "our own clients require it of us",
      "we don't really have a process",
    ],
    followUp:
      "Who owns that review, and can we start it in parallel rather than after agreement?",
    relayLine:
      "Would you mind asking them what security, legal or data protection review a new vendor has to clear on their side, and who owns it?",
  },
  {
    id: "x-scope-confirm",
    category: "commercial",
    phase: "exec_summary",
    audience: "exec",
    product: "any",
    soph: "any",
    question:
      "So the scope is these people, in {countries}, on this arrangement — and everyone else stays put?",
    why: "By this point scope has usually drifted from the first conversation: a country got added, a group of contractors got carved out, someone decided the entity in one market keeps running its own payroll. Reading it back as one sentence is the cheapest way to catch a mismatch, and it forces the buyer to say out loud which arrangement applies to which group — which is exactly the thing a written summary has to get right, because it is the thing that later becomes the agreement.",
    listenFor: [
      "actually, add this country",
      "those two stay as contractors",
      "we're closing that entity",
      "that's right, as written",
    ],
    followUp: "Is anyone reading this document who hasn't been in the conversation yet?",
    relayLine:
      "Would you mind asking them to confirm the scope — these people, in {countries}, on this arrangement, with everyone else staying as they are?",
  },
  {
    id: "x-sequence-first",
    category: "incumbent",
    phase: "proposal",
    audience: "ops",
    product: "any",
    soph: "displacement",
    question:
      "If we go one country at a time, which goes first — the loudest pain, the cleanest data, or the nearest contract exit?",
    why: "A multi-country move is a sequence, not a project, and the order decides whether the first cutover builds confidence or burns it. The three candidate orderings pull against each other: the loudest country proves value but is usually the messiest, the cleanest one proves the process, and the nearest exit date avoids a country paying two providers or none. A plan that defaults to alphabetical, or to whichever country the last meeting was about, produces a pilot nobody can generalize from.",
    listenFor: [
      "one of them renews in the spring",
      "start with the small one",
      "the country everyone complains about",
      "we assumed all of them together",
    ],
    followUp: "Which of those agreements renews first, and how much notice does it need?",
    relayLine:
      "Would you mind asking them which country they'd want moved first, and whether any of their current agreements renew before the others?",
  },
  {
    id: "x-signature-route",
    category: "commercial",
    phase: "contract",
    audience: "exec",
    product: "any",
    soph: "any",
    question:
      "Besides your usual signatory, does anything here need someone else's signature or approval?",
    why: "Global agreements often need more than one signature and nobody surfaces the second one until the first is done. The master agreement may be signed by a group or parent entity, while country-level documents — payroll registrations, local employment contracts, authorizations for a provider to act in-country — can require an officer of the local entity or the worker themselves. Asking whether a second signatory exists prevents the week where a fully agreed deal sits unexecuted because the person with authority is in another country.",
    listenFor: [
      "our CFO signs",
      "the parent company has to sign",
      "the board approves anything multi-year",
      "I sign everything myself",
    ],
    followUp:
      "What route does the document actually take — who sends it, who signs, who countersigns?",
    relayLine:
      "Would you mind asking them whether anyone other than their usual signatory has to sign or approve before this can be executed?",
  },
  {
    id: "x-triage-language",
    category: "footprint",
    phase: "investigate",
    audience: "partner",
    product: "any",
    soph: "naive",
    question:
      "Does your client already have people abroad, or is this the first time they're hiring internationally?",
    why: 'The client\'s own framing sorts the three product lines before I ever get in the room. "We need to hire abroad" with nothing on the ground is employer of record. "We already have people and payroll is painful" is either in-country payroll on an entity they own or a cleanup of whoever employs them now. "We pay a pile of overseas freelancers" is contractor management with a classification question sitting underneath it. Getting the framing from the partner first means the first meeting confirms instead of discovering.',
    listenFor: [
      "they want to hire someone",
      "they already have people there",
      "they pay freelancers overseas",
      "honestly I'm not sure what they need",
    ],
    followUp:
      "Which of their people did they name first — that one is usually the real trigger.",
    relayLine:
      "Would you mind asking them whether the need is hiring new people abroad, or fixing how they already pay the people they have?",
  },
  {
    id: "x-why-now",
    category: "timing",
    phase: "investigate",
    audience: "exec",
    product: "any",
    soph: "any",
    question: "Why are you looking into solving this now?",
    why: "International pay problems get tolerated for years before anyone calls, so the thing that broke the tolerance is the most useful fact in the deal — it names the deadline, the people who care, and usually the product. A hire abroad who needs a local contract points one way; a contractor asking for benefits points at classification; an entity that just got registered points at in-country payroll. Without a trigger I am selling to a wish rather than an event, and wishes do not survive a budget conversation.",
    listenFor: [
      "there's a hire we have no way to employ properly",
      "a contractor asked for benefits",
      "our accountant flagged it",
      "we've been meaning to for a while",
    ],
    followUp: "And by when does it need to be handled — is something forcing that date?",
    relayLine:
      "Would you mind asking them what changed recently that made international hiring or payment something they have to solve now?",
  },
  // ── The program questions (added 2026-08-24, pass-two program step 6) ─────
  // Round one proved the bank asks a PEO about one client's deal and never
  // about offering global to every client it serves. These are those
  // questions; sc-program-rollout leads commercial so they surface.
  {
    id: "x-prog-book",
    category: "commercial",
    phase: "first_meeting",
    audience: "partner",
    product: "any",
    soph: "any",
    question:
      "How many of your clients have people overseas today — not just the one who asked?",
    why: "One client asking is a deal; a dozen clients quietly paying people overseas is a program, and the partner has usually never counted. The count decides whether this is a one-off referral or a service they offer every client — two different agreements, two different prices of getting it wrong.",
    listenFor: [
      "just this one, as far as I know",
      "a handful have contractors",
      "we've never asked all our clients",
      "more than you'd think",
    ],
    followUp: "Who inside your team could actually pull that count together?",
    relayLine:
      "Would you mind asking them how many of their clients have international people today, beyond the one that raised it?",
  },
  {
    id: "x-prog-margin",
    category: "commercial",
    phase: "needs_analysis",
    audience: "partner",
    product: "any",
    soph: "any",
    question:
      "How do you want your side of the economics to work — a markup you set per client, or terms we agree once?",
    why: "A one-off referral can settle its economics per deal; a program cannot, because the partner's sellers need to quote without a phone call. Per-client markup keeps the partner in control and slows every quote; agreed program terms trade control for speed. Partners rarely know there is a choice until it is asked out loud.",
    listenFor: [
      "we'd want to set it ourselves",
      "just make it simple",
      "what do other partners do",
      "our sellers can't be doing math on calls",
    ],
    followUp:
      "Who on your side has to bless whatever we agree — sales leadership or finance?",
    relayLine:
      "Would you mind asking them whether they'd want their economics set client by client or agreed once for the whole program?",
  },
  {
    id: "x-prog-whitelabel",
    category: "commercial",
    phase: "needs_analysis",
    audience: "partner",
    product: "any",
    soph: "any",
    question:
      "Whose name do your clients see on this — yours with us behind it, or ours beside yours?",
    why: "White-label and co-brand are different products to the client even when the service is identical. A partner whose brand fronts the service owns the client's trust and the client's complaints; a named vendor beside them shares both. The answer shapes the paper, the support routing, and what the partner's own sellers say in the room — and partners usually have a strong preference nobody asked about.",
    listenFor: [
      "our clients only want to see us",
      "co-branded is fine",
      "depends on the client",
      "we hadn't thought about the name",
    ],
    followUp:
      "Does your client agreement today let you put another provider's service under your name?",
    relayLine:
      "Would you mind asking them whether their clients should see this under the partner's name or as a named provider beside them?",
  },
  {
    id: "x-prog-enablement",
    category: "platform",
    phase: "needs_analysis",
    audience: "partner",
    product: "any",
    soph: "any",
    question: "Who on your team would be talking about global with clients week to week?",
    why: "A program lives or dies on whether the partner's own people can open the subject without us in the room. If nobody is named, every international conversation waits for a joint call and the program never compounds. Naming the people also names what they need in hand — the one-pager, the questions to ask, the moment to hand off — which is the real enablement scope.",
    listenFor: [
      "our CSMs would carry it",
      "we'd route everything to you",
      "nobody's owned it before",
      "our sellers avoid the topic",
    ],
    followUp: "What would those people need in hand before they'd feel safe raising it?",
    relayLine:
      "Would you mind asking them who on their team would raise international with clients day to day?",
  },
  {
    id: "x-prog-support",
    category: "platform",
    phase: "needs_analysis",
    audience: "partner",
    product: "any",
    soph: "any",
    question:
      "When a client's international worker has a pay question, does that call land on your team or ours?",
    why: "First-line support is the program decision partners feel every week after go-live. Routing through the partner keeps their client relationship whole and puts a population in their queue they have never supported; routing direct keeps their queue clean and puts our name in front of their client monthly. Neither is wrong, and not deciding means the worker decides.",
    listenFor: [
      "everything comes through us",
      "we don't want those tickets",
      "depends what it's about",
      "our support has never seen payroll abroad",
    ],
    followUp:
      "What does your support team do today when a question is out of their depth?",
    relayLine:
      "Would you mind asking them whether client questions about international pay should route through their team or come straight to us?",
  },
  // ── EOR gaps (pass-two coverage findings): first-meeting and displacement ─
  {
    id: "eor-first-priority",
    category: "footprint",
    phase: "first_meeting",
    audience: "ops",
    product: "eor",
    soph: "any",
    question:
      "Which of the people are the priority — who needs to be set up most immediately?",
    why: "The first person carries the whole timeline: their country's registration pace, their document readiness, and whatever was promised to them set the date everyone else gets judged against. A deliberate first choice also reveals the real driver — a candidate about to walk, a client commitment, a compliance worry — which the country list alone never says.",
    listenFor: [
      "the new hire first — they're waiting",
      "whoever's most at risk",
      "all of them at once",
      "no real order, honestly",
    ],
    followUp: "What's already been promised to that first person?",
    relayLine:
      "Would you mind asking them which person needs to be employed first, and what's driving that order?",
  },
  {
    id: "eor-offer-stage",
    category: "timing",
    phase: "first_meeting",
    audience: "exec",
    product: "eor",
    soph: "any",
    question: "Where's the hiring at — offer out, accepted, or still interviewing?",
    why: "An accepted offer means a person is waiting and every week costs goodwill; an offer not yet out means the local terms can still be shaped before the candidate sees them, which is the cheap moment to get probation, notice, and benefits right. The stage decides whether this conversation is about speed or about doing it properly — rarely both.",
    listenFor: [
      "they've accepted, we're scrambling",
      "offer goes out this week",
      "still interviewing",
      "we lost one waiting already",
    ],
    followUp:
      "Has the candidate seen any terms yet, or can the offer still be shaped locally?",
    relayLine:
      "Would you mind asking them where the hiring stands — offer out, accepted, or still interviewing?",
  },
  {
    id: "eor-switch-people",
    category: "incumbent",
    phase: "needs_analysis",
    audience: "ops",
    product: "eor",
    soph: "displacement",
    question:
      "Have you told your people anything yet about moving off the current provider?",
    why: "Moving between EOR providers means the workers change legal employer, so they have to sign new local contracts — the move needs their consent, not just the buyer's. People told early and honestly sign; people surprised by new paper from a company they have never heard of stall, negotiate, or panic, and one refusal can hold the whole cutover. What has been said so far is the real starting position.",
    listenFor: [
      "they don't know yet",
      "we mentioned a change is coming",
      "one of them is nervous already",
      "they hate the current provider too",
    ],
    followUp: "Who do the workers trust most on your side to carry that message?",
    relayLine:
      "Would you mind asking them what their people have been told so far about a possible provider change?",
  },
  {
    id: "eor-switch-terms",
    category: "incumbent",
    phase: "needs_analysis",
    audience: "exec",
    product: "eor",
    soph: "displacement",
    question:
      "Do you know what your people would keep in a move — service dates, accrued leave, their current terms?",
    why: "In most countries the outgoing employer terminates and the incoming one hires, which by default resets seniority and pays out accrued leave — and in some places notice and severance entitlements ride on those service dates. A buyer who can say what carries over can sell the move to their own people; one who cannot is asking them to sign blind, and the workers know it.",
    listenFor: [
      "we assumed everything transfers",
      "nobody's looked at the contracts",
      "the leave balances are a mess",
      "one has real seniority there",
    ],
    followUp:
      "Can we get one person's current contract and leave balance as the worked example?",
    relayLine:
      "Would you mind asking them whether anyone has worked out what their people keep — service dates, accrued leave — if they move providers?",
  },
  // ── The naive contractor buyer (pass-two coverage finding) ────────────────
  {
    id: "cm-first-time",
    category: "classification",
    phase: "first_meeting",
    audience: "ops",
    product: "contractor",
    soph: "naive",
    question:
      "When you say contractor — real freelancers with other clients, or full-timers on invoices?",
    why: "New buyers use one word for two different arrangements, and everything downstream depends on which they mean. A genuine freelancer needs a payment path and clean paper; a full-timer on invoices is an employment relationship wearing the wrong costume, and the honest conversation is about making it right before someone else makes it expensive. Asking for the definition first keeps the meeting from answering the wrong question.",
    listenFor: [
      "they're basically full time",
      "real freelancers, several clients",
      "a bit of both honestly",
      "what's the difference",
    ],
    followUp: "Take the one you'd miss most if they left — which kind are they?",
    relayLine:
      "Would you mind asking them whether their contractors are genuine freelancers with other clients, or full-timers paid on invoices?",
  },
  // ── Round one's named gaps: visa, proof, consolidated billing ─────────────
  {
    id: "x-visa-need",
    category: "footprint",
    phase: "needs_analysis",
    audience: "ops",
    product: "any",
    soph: "any",
    question:
      "Does anyone need a visa or work authorization sorted before they can start?",
    why: "Sponsorship is the one requirement that can make a start date impossible rather than tight, and an employer of record is not a sponsorship route in every country. A candidate who needs a permit puts an authority's queue in the middle of the plan, and nobody controls that clock. Better to find the one person who needs it now than to discover them the week before go-live.",
    listenFor: [
      "everyone can already work there",
      "one needs sponsorship",
      "we assumed you'd handle visas",
      "we honestly don't know",
    ],
    followUp: "For that person — what do they hold today, and when does it run out?",
    relayLine:
      "Would you mind asking them whether anyone involved needs a visa or new work authorization before they could start?",
  },
  {
    id: "x-proof",
    category: "commercial",
    phase: "exec_summary",
    audience: "exec",
    product: "any",
    soph: "any",
    question: "What would you need to see from us before you'd back this internally?",
    why: "Every champion carries this to a room we are not in, and what convinces that room is rarely what convinced the champion. A named proof — a reference call with someone like them, a walkthrough of a live account, a completed security questionnaire — is deliverable this week; an unnamed doubt surfaces at contract as a stall nobody can answer. Asking for the proof list early turns diligence from an ambush into an agenda.",
    listenFor: [
      "a reference — someone like us",
      "our board will ask who else uses this",
      "security will want answers",
      "honestly, just a clean demo",
    ],
    followUp: "Who else reads what we send before it comes back signed?",
    relayLine:
      "Would you mind asking them what they'd need to see from us before they'd back this internally — references, a live account, security answers?",
  },
  {
    id: "x-billing-consolidation",
    category: "money",
    phase: "proposal",
    audience: "ops",
    product: "any",
    soph: "any",
    question:
      "How many separate invoices and currencies does international put in front of your finance team each month?",
    why: "A pile of per-country invoices in different currencies is a monthly tax on finance that nobody budgeted: reconciliation, conversion, and a close that waits on the slowest vendor. One consolidated bill is often the most concrete thing a proposal can promise — but some finance teams prefer the per-country detail for their own allocation, so the shape of the bill is theirs to choose, not ours to assume.",
    listenFor: [
      "one per country, it's a mess",
      "finance dreads month end",
      "we actually need the detail",
      "never counted",
    ],
    followUp:
      "Would one consolidated bill actually help your finance team, or do they need the per-country detail?",
    relayLine:
      "Would you mind asking them how many separate invoices and currencies international puts in front of their finance team each month?",
  },
];
