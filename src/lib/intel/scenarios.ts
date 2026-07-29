// The scenario library.
//
// Every deal differs, so a fixed question order is wrong for most of them. A
// scenario is a short declaration of the buyer's actual situation — which
// product line is in play, how much they already know, and how they run payroll
// at home — and it reshapes the card: which categories lead, which are noise,
// the traps to watch for, and the objections this particular buyer raises.
//
// The operator picks one, or the paste read proposes one from what the record
// says. Nothing here changes a deal's stage or writes anything; it only decides
// what the card offers first.

import type { Scenario } from "./bank";

export const SCENARIOS: Scenario[] = [
  {
    id: "sc-cold-start-naive",
    label: "Never hired outside the US",
    blurb:
      "Runs US payroll in-house, has never employed anyone abroad, and uses 'contractor' and 'EOR' interchangeably.",
    product: "any",
    sophistication: "naive",
    posture: "self_run",
    leadWith: ["footprint", "classification", "risk", "timing"],
    avoid: ["commercial", "incumbent"],
    traps: [
      "They treat employee-or-contractor as a choice they get to make; in most countries status follows the facts of the relationship — direction, set hours, exclusivity, open-ended work — not the title on the agreement.",
      "They assume a foreign hire can be added to the US payroll and left to handle their own taxes; paying from the US does not satisfy the withholding, social contribution, and filing obligations of the country where the person lives and works.",
      "They expect their US offer to travel — at-will termination, US-style PTO, a 401k. Most countries impose statutory notice, mandatory leave, and required social benefits that a contract cannot waive.",
      "They think EOR and contractor management are two prices for the same service. EOR puts the person on a local entity's payroll as an employee with statutory entitlements; contractor management pays an independent business and creates none of them.",
      "They assume nationality decides where employment sits. It is where the person actually lives and works, and whether they hold authorization to work there.",
    ],
    objections: [
      {
        objection: "Can we just pay them as a contractor and keep it simple?",
        counter:
          "Sometimes yes — where the person genuinely runs their own business and serves other clients. Where you set the hours and direct the work, the label does not hold, and the exposure lands on you rather than on them. Worth testing against how the work will actually be done before you choose.",
      },
      {
        objection: "This seems like a lot of machinery for one or two people.",
        counter:
          "The compliance machinery is the same for one person as for fifty — registrations, a local employment contract, statutory filings. That is the argument for EOR at low headcount: you rent the employer instead of building one you then have to maintain.",
      },
      {
        objection: "Why wouldn't we just open our own entity there?",
        counter:
          "If you plan to staff up and stay, an entity can be the right answer. It also brings registrations, local accounting and filings, sometimes a resident director, and an obligation that continues after the one hire leaves. Compare the structure before you commit to carrying it.",
      },
    ],
  },
  {
    id: "sc-wire-and-spreadsheet",
    label: "Contractors paid by wire",
    blurb:
      "Already pays international contractors directly — bank wires, invoices, and a spreadsheet somebody maintains on the side.",
    product: "contractor",
    sophistication: "inhouse",
    posture: "any",
    leadWith: ["classification", "risk", "money", "footprint"],
    avoid: ["commercial", "incumbent"],
    traps: [
      "A signed contractor agreement is not a defense by itself; many countries test substance — set hours, exclusivity, company equipment, a manager, indefinite duration — and can reclassify regardless of what the paper says.",
      "They believe paying from a US bank keeps the arrangement American. Recurring transfers into a country are visible to local banks and tax authorities and can support a claim that the company is operating there.",
      "The spreadsheet understates what the arrangement really costs, because the worker absorbs the conversion spread and the receiving-bank charges while the company only sees its own side.",
      "Invoices rarely carry IP assignment or confidentiality that hold up locally. In a number of jurisdictions the author keeps rights absent a written assignment valid under that country's law, so having paid for the work does not always mean owning it.",
      "Some of their 'contractors' may actually be employed by a local company that invoices them, which changes who can move them and what notice binds them first.",
      "The fragility is usually not the spreadsheet — it is that one person owns the process with no backup, no approval trail, and no record of who was paid what when a claim or an audit arrives.",
    ],
    objections: [
      {
        objection: "Nothing has broken — this works today.",
        counter:
          "It usually does work, right up until it does not. Misclassification and permanent-establishment questions surface through a terminated worker's claim, an authority letter, or a bank query — not gradually. The useful question is whether the current arrangement survives one of those.",
      },
      {
        objection: "Our contractors want to stay contractors.",
        counter:
          "Often genuinely true, and contractor management keeps them contractors while fixing the payment path, the agreements, and the IP language. Converting anyone to employment is a separate decision you would make on the facts, not a condition of cleaning this up.",
      },
      {
        objection: "You'd be adding a fee where we pay nothing today.",
        counter:
          "You are paying now — per-transfer bank charges, the conversion spread your workers absorb, and the hours of whoever runs the sheet. The comparison worth doing is structure against structure, not a fee against zero.",
      },
    ],
  },
  {
    id: "sc-competitor-eor",
    label: "Already on a competitor EOR",
    blurb:
      "Employees already sit with another global EOR, so the conversation is about what that provider isn't doing.",
    product: "eor",
    sophistication: "displacement",
    posture: "other_platform",
    leadWith: ["incumbent", "platform", "timing", "commercial"],
    avoid: ["classification", "risk"],
    traps: [
      "Moving employees between EOR providers is not a data migration. In most countries the outgoing local employer terminates and the incoming one hires, which can mean termination formalities, accrued-leave payout, a fresh probation, and reset seniority depending on the country.",
      "Notice periods run against the incumbent's local entity, so the termination date there and the start date here have to line up or the worker has a gap in pay and coverage.",
      "Changing employer mid-year can leave the worker with two part-year filings and a personal reconciliation. That lands on the employee, and it becomes your problem the moment they notice.",
      "'They said they integrate' is worth testing concretely — ask what actually syncs, in which direction, and how often, because CSV exports and re-keying are often what integration turned out to mean.",
      "Some of their countries may be served by the incumbent's own in-country partner rather than by the incumbent itself, which changes what is actually being transferred and who holds the local registrations.",
      "The complaint they open with is rarely the whole reason. Support responsiveness, invoice legibility, and conversion handling tend to surface only when you ask what the last thing to go wrong was.",
    ],
    objections: [
      {
        objection: "We just finished an implementation. We're not doing that again.",
        counter:
          "Fair, and I won't pretend the work is not real. That is an argument for timing a move to renewal rather than mid-term. What is worth scoping now is whether the thing frustrating you actually gets fixed, because it will still be there when renewal arrives.",
      },
      {
        objection: "Our current provider is cheaper.",
        counter:
          "Could be, and I am not going to argue a number I cannot see. What is worth comparing is the whole structure — what sits inside the recurring fee, what arrives as a pass-through, how conversion is handled, and what security or deposit stands behind it. That is usually where two comparisons stop matching.",
      },
      {
        objection: "Switching means re-papering every employee.",
        counter:
          "In most countries it does — new local contracts under a new employer, sequenced against notice at the outgoing one. That is a plan with dates rather than a surprise, and it is the reason to start before renewal instead of after.",
      },
    ],
  },
  {
    id: "sc-own-entities-local-books",
    label: "Own entities, local accountants",
    blurb:
      "Owns legal entities abroad and pays people through a different local accountant or bookkeeper in each country.",
    product: "payroll",
    sophistication: "inhouse",
    posture: "self_run",
    leadWith: ["platform", "footprint", "risk", "money"],
    avoid: ["classification", "commercial"],
    traps: [
      "They describe it as working because the payslips come out. The gaps are usually timing and evidence: when the numbers reach the group, whether filings actually went in on time, and who would find out if one did not.",
      "The accountant is often doing bookkeeping and statutory filing rather than payroll operations — no system of record, no worker self-service, no audit trail beyond email attachments.",
      "'We already have the entity' does not mean payroll can simply move. Registrations, filing authority, and sometimes a local signatory sit with whoever files today, and that has to be transferred deliberately.",
      "A mid-year cutover means part-year accumulations have to carry into the new system so year-end filings and the worker's payslips reconcile. The clean boundaries are the country's tax year, or at minimum a quarter end.",
      "Some of those entities exist only because of one or two people. Unwinding one in favor of EOR is a live option worth naming — but a dormant entity keeps its filing obligations until it is formally closed.",
      "Payroll data currently lives in a bookkeeper's inbox. Moving it into a system is an improvement they often have not considered, and in some regions the transfer itself carries requirements.",
    ],
    objections: [
      {
        objection: "Our local accountants know the rules better than any platform.",
        counter:
          "They often do, and that knowledge does not have to leave — in-country expertise still stands behind the filings. What changes is where the data lives, when you can see it, and whether you can answer a question about one worker without an email round trip.",
      },
      {
        objection: "We don't have a problem to solve. Payroll runs.",
        counter:
          "Then the case is not compliance, it is control — one calendar, one place to approve, one view of every country without waiting for a month-end summary. If that is worth nothing to you today, the honest answer is to wait until you add another country.",
      },
      {
        objection: "Consolidating means cutting people we have relationships with.",
        counter:
          "Not necessarily. Plenty of groups keep their local advisers for tax and statutory work and move only the payroll operation. Worth deciding which part of what they do is the part you actually value.",
      },
    ],
  },
  {
    id: "sc-partner-relay",
    label: "Partner asking for their client",
    blurb:
      "A CSM or service provider is asking on behalf of their own client, with no direct line to the client yet.",
    product: "any",
    sophistication: "any",
    posture: "through_partner",
    leadWith: ["commercial", "platform", "footprint", "timing"],
    avoid: ["classification"],
    traps: [
      "The partner's question is often not the client's question. 'They need EOR in Canada' regularly turns out to be one contractor, or a US person who moved, once the client is asked directly.",
      "The commercial chair decides the shape of the whole deal — who papers the client, whose name is on the invoice, who carries the funding obligation — and it is cheapest to settle before anything is quoted rather than at contract.",
      "Partners relay the client's words without the facts behind them. Nobody has asked where the worker lives, whether they hold authorization to work there, or who employs them today.",
      "Asking the partner classification or risk questions directly gets a guess. Those go out as relay lines for the client; the partner's own questions are about structure, timing, and their platform.",
      "A partner who wants to hold the client contract is also taking on the client's obligations to us. A partner who refers avoids that but gives up the markup. Neither is wrong, and assuming which one they want is what stalls the paper.",
      "If the client cannot be reached directly, the deal moves at the partner's cadence — worth agreeing early who asks the client what, and by when.",
    ],
    objections: [
      {
        objection:
          "Our client won't talk to a vendor directly. Everything goes through us.",
        counter:
          "That works, and it means the questions have to be tight enough to relay without me in the room. What it costs is speed, because every clarification becomes a round trip. Worth agreeing which few answers you will get first so we do not spend a week scoping the wrong thing.",
      },
      {
        objection: "Just send me pricing and I'll take it from there.",
        counter:
          "I can, and it will be wrong in a way that is hard to walk back — country, worker status, and headcount move it more than anything else. Give me those three per country and what comes back will survive your client's questions.",
      },
      {
        objection: "We don't want to be in the middle if something goes wrong abroad.",
        counter:
          "That is a real reason to refer rather than resell — you keep the relationship and we carry the employment obligation. The tradeoff is the markup and some control over the client experience. It is your choice to make, not the contract template's.",
      },
    ],
  },
  {
    id: "sc-one-urgent-hire",
    label: "One urgent hire, one country",
    blurb:
      "A named candidate in a single new country with a start date already floated, and nothing else global on the table.",
    product: "eor",
    sophistication: "any",
    posture: "on_prismhr",
    leadWith: ["timing", "footprint", "classification"],
    avoid: ["incumbent", "money"],
    traps: [
      "The date they name is usually the candidate's expectation rather than a feasible date. Onboarding abroad depends on registrations, a local employment contract in the right language, and in some countries authority timing nobody controls.",
      "Where the person will actually live and work decides everything, and it is not always the country in the job posting. A candidate relocating, or already living outside their nationality, changes the whole answer.",
      "Work authorization is a separate question from employment. An EOR can employ someone lawfully present and permitted to work; it is not a sponsorship route in every country, and assuming otherwise burns the timeline.",
      "A single hire feels like a contractor problem, but a full-time, directed, indefinite role is exactly the shape that fails a contractor test in most countries.",
      "The offer terms have to be local before they are signed — statutory notice, probation limits, mandatory benefits, required leave, and in some countries an extra payment cycle. Reissuing a US-style offer after the candidate has seen it costs trust.",
      "One hire usually signals more. If nobody asks where else they are recruiting, the deal stays a one-off.",
    ],
    objections: [
      {
        objection: "We need this person to start in a couple of weeks. Can you do that?",
        counter:
          "Sometimes, and it depends entirely on the country and how clean the candidate's situation is. What I will not do is confirm a date before we know where they live and what is required there, because a date I cannot hold costs you the candidate.",
      },
      {
        objection: "Isn't EOR overkill for one person?",
        counter:
          "For one person it is the opposite. The alternative is standing up a registered employer for a single headcount and maintaining it afterwards. EOR exists precisely for the case where the count is too small to justify your own entity.",
      },
      {
        objection: "Can't we just add them to our US payroll?",
        counter:
          "Not compliantly, if they live and work abroad. Their country expects withholding, social contributions, and filings from an employer registered there, and a US payslip satisfies none of it. It also leaves the worker personally exposed, which is how these arrangements come apart.",
      },
    ],
  },
  {
    id: "sc-compliance-scare",
    label: "A scare set this in motion",
    blurb:
      "The trigger was an event — an authority letter, a diligence question, a worker claim — and someone senior is watching.",
    product: "any",
    sophistication: "any",
    posture: "any",
    leadWith: ["risk", "classification", "timing", "footprint"],
    avoid: ["money", "platform"],
    traps: [
      "Fear makes buyers want a fix that reaches backwards. Going forward compliantly is something you can sell; curing a past period is a question for their counsel and a local adviser, and implying otherwise is how the deal dies at contract.",
      "The scare is usually narrower than the exposure. A letter about one worker in one country generally sits alongside the same arrangement in two others nobody has looked at yet.",
      "Converting a contractor to employment can itself draw attention to the earlier period. In some countries the worker or the authority can look back, so the timing and framing of a conversion belongs to their advisers, not to a hand-wave from us.",
      "'Our lawyer says we're fine' deserves one more question: fine on what basis, reviewed when, and for which countries. US counsel rarely opines on local employment status abroad.",
      "Panic buys badly. A frightened buyer accepts any timeline offered and then holds you to it, so honest sequencing matters more here than anywhere else.",
      "The person who got scared is often not the person who signs. The champion needs something they can carry into a room you will not be in.",
    ],
    objections: [
      {
        objection: "We need this cleaned up immediately.",
        counter:
          "Understood, and the part I can move fast on is the forward arrangement — a compliant employer of record from a date certain. What happened before that date is a conversation for your counsel and a local adviser, and I would rather say so now than discover it at contract.",
      },
      {
        objection: "Our counsel already says we're fine.",
        counter:
          "They may well be right, and it is worth having that confirmed in writing country by country, because employment status abroad turns on local tests. If the review covered one country and you have people in three, the answer only covers one.",
      },
      {
        objection: "If we change anything now, doesn't that admit there was a problem?",
        counter:
          "That is a fair question for your lawyers and I will not pretend to answer it. What I can say is that leaving the arrangement as it is does not make it quieter — the recurring payments and the ongoing relationship keep generating the same evidence.",
      },
    ],
  },
  {
    id: "sc-provider-sprawl",
    label: "A provider in every country",
    blurb:
      "Global payroll works country by country through a different vendor in each, with no consolidated view and no single owner.",
    product: "any",
    sophistication: "displacement",
    posture: "any",
    leadWith: ["incumbent", "platform", "timing", "money"],
    avoid: ["classification"],
    traps: [
      "Consolidation sounds like one project and is really a queue of country cutovers, each with its own notice to the outgoing provider, its own registration transfer, and its own clean calendar boundary.",
      "The country count they give you is usually wrong. Someone forgot the country where two people are paid by an entity's local bookkeeper, or the lone contractor paid on a card.",
      "Nobody owns the whole picture, so the person describing it is describing their slice. The tell is 'I'd have to check' on headcount or on who files in a given country.",
      "Some of those vendors may resell the same underlying in-country provider, so consolidating removes fewer real relationships than the list suggests.",
      "Exit terms vary across the vendor set — auto-renewal dates, notice windows, data-return obligations — and one badly timed exit leaves a country paying two providers or none.",
      "The consolidated view they want is sometimes reporting rather than payroll. Worth checking whether the real ask is one platform running payroll or one place to see it.",
      "A phased plan needs a first country chosen for a reason: the loudest pain, the cleanest data, or the nearest contract exit. Letting them pick alphabetically wastes the pilot.",
    ],
    objections: [
      {
        objection:
          "Each local provider knows their country. A single global provider can't match that.",
        counter:
          "In-country expertise does not disappear in a consolidated model, it sits behind one operating layer instead of inside a dozen separate relationships. What you gain is one calendar and one place to look. What you should test is depth in your two hardest countries, not the average.",
      },
      {
        objection: "We can't move a dozen countries at once.",
        counter:
          "You should not. This is a sequence — one country at a time at a clean boundary, ordered by contract exits and by where the pain is loudest. A plan that claims all of them at once is the one to distrust.",
      },
      {
        objection: "We tried consolidating before and it went badly.",
        counter:
          "Then it is worth knowing exactly where it broke. Usually it is a cutover with no parallel run, or part-year accumulations that did not carry across. Both are avoidable with sequencing, and they are the questions I would want answered before we agreed a date.",
      },
    ],
  },
];
