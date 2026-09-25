// The products — the Playbook's five doors, authored from the four product
// flyers (FILED · flyer) and from what partners actually say on the tapes.
// No account names, no person names, no figures.
//
// Three registers travel together: the products themselves, the cues (what a
// partner says about a product, and how we respond), and the between-us
// questions asked on every call whatever the product.

/** What a partner is actually worried about, the five that recur. */
type Issue = "compliance" | "control" | "speed" | "cost" | "oneplace";

/** The rung a line stands on. Strongest first; nothing is ever faked. */
export type Rung = "tape" | "filed" | "research" | "none";

/** [what it says, the rung, where it came from] */
export type Cite = [text: string, rung: Rung, source?: string];

type Solve = {
  /** The answer in one line. */
  head: string;
  /** The answer said properly. */
  body: string;
  /** The flyer's own bullets under it. */
  pts: string[];
  ev: Cite[];
};

export type Tier = { name: string; who: string; pts: string[] };

export type Product = {
  id: string;
  name: string;
  /** The flyer this reads from. */
  flyer: string;
  /** A second name the flyer uses. */
  sub?: string;
  /** The door on arrival: what it is, in one line. */
  door: string;
  /** The answer to "who legally employs the person doing the work?" that
   *  lands here. */
  fork: string;
  /** What it is, said plainly. */
  one: string;
  /** The same thing in the partner's own vocabulary. */
  lang: string;
  /** [other product, when it is that one instead] */
  notThis: [string, string][];
  solves: Record<Issue, Solve>;
  /** How it runs, in order. */
  how: string[];
  /** What we do. */
  we: string[];
  /** What they keep. */
  they: string[];
  /** The flyer's own tiers, where it has them. */
  tiers: Tier[];
  /** How long from paper to live. */
  time: string;
  /** What is in the price. Never a figure. */
  money: string;
  /** What to watch for before promising anything. */
  watch?: string;
  /** The questions to ask on this product. */
  ask: string[];
};

/** What they say about a product, and what we say back. */
export type Cue = {
  id: string;
  /** Product id. */
  p: string;
  issue: Issue;
  /** Their words. */
  cue: string;
  /** What it means, in six words or fewer. */
  gist: string;
  /** How we respond. */
  respond: string[];
  /** Indexes into the product's own ask list. */
  ask: number[];
  ev: Cite[];
  /** [other product, when this lands there instead] */
  also?: [string, string][];
  /** Countries this cue names — the wing pins them. */
  cty?: string[];
};

type BetweenQ = { q: string; a: string; ev: Cite[] };

export const ISSUES: Record<Issue, string> = {
  compliance: "Compliance",
  control: "Who employs them",
  speed: "How fast",
  cost: "What it costs",
  oneplace: "One place",
};
export const ISSUE_ORDER: Issue[] = [
  "compliance",
  "control",
  "speed",
  "cost",
  "oneplace",
];

export const PRODUCTS: Product[] = [
  {
    id: "eor",
    name: "Employer of record",
    flyer: "PrismHR Global Employer of Record",
    door: "We employ them. Nobody needs a company there.",
    fork: "Nobody employs them there yet, and the client doesn’t want a company there.",
    one: "We become the legal employer for a person in another country, through our own entity there. The client manages the person’s work. We carry the employment.",
    lang: "Your PEO, with us as the only employer instead of a co-employer.",
    notThis: [
      [
        "payroll",
        "the client already has a registered, banked company there and wants to stay the employer",
      ],
      ["cmgmt", "the person genuinely runs their own business and invoices"],
      ["cor", "they invoice, and someone should stand behind the classification"],
      ["talent", "there is no person yet"],
    ],
    solves: {
      compliance: {
        head: "The employment is ours to get right.",
        body: "The employment contract is written under that country’s law. Withholding, social contributions, statutory leave, the filings and year end all sit with us. Nothing outside the US is at-will, there is no offer letter, and unlimited PTO doesn’t exist there, and we say so before the client promises any of it.",
        pts: [
          "Handle employment contracts and compliance",
          "Manage onboarding, payroll and benefits",
        ],
        ev: [
          ["Handle employment contracts and compliance.", "filed", "flyer"],
          [
            "'None of this is at-will. It's always an employment contract.' 'Unlimited PTO doesn't exist outside the US.'",
            "tape",
            "7/7",
          ],
          [
            "Statutory leave and hours tracking are on us as the employer.",
            "tape",
            "8/27",
          ],
        ],
      },
      control: {
        head: "No company to open, and nothing to maintain.",
        body: "Opening a company abroad means registration, payroll registration, a bank account, local accounting and an obligation that outlives the hire. Employer of record removes the reason. The client keeps day-to-day management. We’re the employer on paper and in the country.",
        pts: [
          "Employ workers through local legal entities",
          "Clients manage employees while PrismHR Global serves as the legal employer",
        ],
        ev: [
          [
            "Employ workers through local legal entities; clients manage employees while PrismHR Global serves as the legal employer.",
            "filed",
            "flyer",
          ],
          [
            "'It may not even make sense for them to open up another entity. That's super expensive no matter where you're doing it.'",
            "tape",
            "9/10",
          ],
        ],
      },
      speed: {
        head: "About two weeks from the paper and the person’s details.",
        body: "Two weeks runs from the signed agreement and the employee’s information to their start date, and that window covers the in-country registration and the contract. The one thing that stretches it is the person’s own notice period if they’re employed somewhere today.",
        pts: [],
        ev: [
          [
            "Two weeks from signed agreement and employee info, not first contact; a person's own notice can stretch it.",
            "tape",
            "8/27",
          ],
          ["The same, in writing to a partner.", "filed", "8/28"],
        ],
      },
      cost: {
        head: "One invoice: salary, the country’s employer costs, our fee.",
        body: "Employer costs are real in most countries: pension and social contributions, in some places a mandated extra month’s pay. The platform’s gauge shows what a hire really costs there before anyone commits. A one-month reserve per employee is held and refunded at the end of employment.",
        pts: [],
        ev: [
          [
            "The employer-cost gauge, shown live; the deposit of one month of salary, taxes and fees, refundable.",
            "tape",
            "8/27",
          ],
          [
            "'All that free health care, it's not free. They're paying for it.'",
            "tape",
            "7/7",
          ],
        ],
      },
      oneplace: {
        head: "One platform, one click from Prism.",
        body: "The client sees the person, their pay, leave, expenses and documents in one place, beside contractors and payroll people. The partner sees every client’s global people from the service-provider view.",
        pts: [],
        ev: [
          [
            "The service-provider view across clients; the worker's own login.",
            "tape",
            "8/27",
          ],
        ],
      },
    },
    how: [
      "The client picks the person and tells us the country, the pay and the start date.",
      "We issue the employment contract under local law and register the person in country.",
      "The person gets their own login: payslips, leave, expenses, documents.",
      "We run payroll on the country’s cycle, file with the authorities, and administer statutory leave and benefits.",
      "Reimbursements go through us, not the client’s system, so they’re taxed right.",
      "At the end, we handle notice and severance under local rules.",
    ],
    we: [
      "Employment contract under local law",
      "Payroll, withholding, social contributions",
      "Statutory leave, holidays, benefits administration",
      "Filings and year end",
      "Work-authorization checks; visa help in some countries",
      "Notice and severance at the end",
    ],
    they: [
      "Day-to-day management and direction of the work",
      "Pay and title decisions",
      "Approvals: time off, expenses, hours where the country requires them",
    ],
    tiers: [
      {
        name: "EOR Core",
        who: "For clients ready to hire identified talent globally",
        pts: [
          "Employ workers through local legal entities",
          "Manage onboarding, payroll and benefits",
          "Handle employment contracts and compliance",
          "Clients manage employees while PrismHR Global serves as the legal employer",
        ],
      },
      {
        name: "EOR Plus",
        who: "For clients needing recruiting support",
        pts: [
          "Everything in EOR Core",
          "Source, recruit and hire qualified talent",
          "Accelerate hiring with local expertise",
          "Simplify hiring from recruitment through onboarding",
        ],
      },
      {
        name: "EOR Premium",
        who: "For clients needing a fully managed solution",
        pts: [
          "Everything in EOR Plus",
          "Managed staffing with local supervision",
          "Local HR administration and employee support",
          "Available in select countries",
        ],
      },
    ],
    time: "About two weeks from the signed agreement and the person’s details.",
    money:
      "A per-employee-per-month fee that varies by country, a setup fee per person for the in-country work, and a one-month reserve refunded at the end. Salary and employer costs pass through on top. The partner prices it for the client.",
    ask: [
      "Where does the person live and work day to day, not where are they from?",
      "Do they have the right to work there?",
      "Has anyone promised them a start date, a salary, benefits or a title?",
      "Are they working for someone else today, and what’s their notice?",
      "How many people, and roughly what is each of them paid today?",
    ],
  },
  {
    id: "payroll",
    name: "Global payroll",
    flyer: "PrismHR Global Payroll",
    door: "The client already has a company there. We run the payroll.",
    fork: "The client’s own company there employs them.",
    one: "The client already has a registered company in the country, with payroll registration and a bank account there. They stay the employer. We run the payroll and hand the bank what it needs to pay everyone.",
    lang: "Your ASO.",
    notThis: [
      ["eor", "there is no company there, or they’d rather not keep the filings at all"],
      ["cmgmt", "the people invoice as their own business"],
      ["cor", "they invoice, and someone should stand behind the classification"],
      ["talent", "there is no person yet"],
    ],
    solves: {
      compliance: {
        head: "Country-specific tax and statutory rules, calculated right every cycle.",
        body: "We do the gross-to-net for that country: withholding, social contributions, statutory extras like a thirteenth month where one exists. The filings and the taxes stay the client’s, because they’re the employer. If they’d rather not keep the filings at all, that’s employer of record.",
        pts: [
          "Manage country-specific tax, statutory and compliance requirements",
          "Deliver accurate, on-time payroll with localized expertise",
        ],
        ev: [
          [
            "Manage country-specific tax, statutory and compliance requirements.",
            "filed",
            "flyer",
          ],
          [
            "'If they're the employer, they're responsible for the taxes and filings. We do the payroll processing.'",
            "tape",
            "9/3",
          ],
        ],
      },
      control: {
        head: "They keep the employer relationship.",
        body: "Nothing changes about who employs the person. What changes is who does the calculations and prepares what the bank and the authorities need. Before assuming it’s payroll, check how they pay and classify people today. It is sometimes less compliant than it looks.",
        pts: [],
        ev: [
          [
            "'Double-check how they're paying them right now, how they're classifying them right now.'",
            "tape",
            "9/3",
          ],
        ],
      },
      speed: {
        head: "Two to three months to go live.",
        body: "In-country payroll is a bigger build than employer of record: registrations checked, the bank connected, the first cycle run in parallel. Say the number early so nobody promises a first-of-the-month that can’t happen.",
        pts: [],
        ev: [
          [
            "Global payroll two to three months, because in-country payroll is a much bigger build.",
            "tape",
            "8/27",
          ],
        ],
      },
      cost: {
        head: "Our fee only. The salaries and taxes are already theirs.",
        body: "The payroll invoice is our fee. Salaries and employer costs leave from the client’s own account in country. There is no employment deposit, because we aren’t the employer.",
        pts: [],
        ev: [["'The payroll invoices are just our fees.'", "tape", "8/27"]],
      },
      oneplace: {
        head: "Every country’s payroll on one platform, one set of reports.",
        body: "Multi-currency, centralized reporting, and payroll data that can feed the client’s HR and finance systems. The partner sees it beside employer-of-record and contractor people for the same client.",
        pts: [
          "Process payroll across 175+ countries through a centralized platform",
          "Support employees and contractors with multi-currency payroll",
          "Integrate payroll data with HR and finance systems",
          "Generate centralized reporting and payroll insights",
          "Scale payroll operations as clients expand internationally",
        ],
        ev: [
          [
            "Centralized platform, multi-currency, reporting, integration with HR and finance systems.",
            "filed",
            "flyer",
          ],
        ],
      },
    },
    how: [
      "Confirm the three things: a registered company, payroll registration, a bank account there.",
      "Load the people, the pay and the country’s rules.",
      "Each cycle we calculate gross to net, prepare the bank file and the filings paperwork, and the client approves.",
      "The client funds from its own account and the bank pays everyone.",
      "Reports come out centralized, one place across countries.",
    ],
    we: [
      "Gross-to-net calculations per country",
      "Bank files and payment preparation",
      "Statutory calculations: contributions, extras, leave accruals",
      "Centralized reporting; data to HR and finance systems",
    ],
    they: [
      "The employment and the contracts",
      "The filings and the taxes, as the employer",
      "Funding from their own account",
      "Benefits decisions",
    ],
    tiers: [],
    time: "Two to three months.",
    money:
      "Our fee per employee per month, by country. No employment deposit. Salaries and employer costs stay in the client’s own account.",
    ask: [
      "Is the company registered for payroll there, separately from being incorporated?",
      "Does it hold a bank account there that salaries leave from?",
      "Who does the local filings today?",
      "How many people, and roughly what are they paid?",
      "What payroll cycle do they run today?",
    ],
  },
  {
    id: "cmgmt",
    name: "Contractor management",
    flyer: "PrismHR Global Contractor Solutions",
    door: "The client keeps the contractor relationship. We onboard, pay and keep the paperwork.",
    fork: "They invoice as their own business, and the client wants to keep holding the contract.",
    one: "The client holds the contract with each contractor. We onboard them, pay them in their currency, and keep the tax documentation straight.",
    lang: "Your 1099 work, under a foreign test.",
    notThis: [
      [
        "cor",
        "the client wants someone else to hold the contract and stand behind the classification",
      ],
      [
        "eor",
        "someone sets their hours and directs their day, and they work for one client with no end date",
      ],
      ["payroll", "the client’s own company there employs them"],
      ["talent", "there is no person yet"],
    ],
    solves: {
      speed: {
        head: "Immediate.",
        body: "Once a contractor is in the system and has entered their own details, they can be paid. There is no in-country registration to wait for.",
        pts: ["Onboard international contractors with streamlined workflows"],
        ev: [
          [
            "'Contractors are immediate' once in the system with their information entered.",
            "tape",
            "8/27",
          ],
        ],
      },
      cost: {
        head: "No more per-person wires.",
        body: "Funds go into the contractor’s wallet in dollars. They withdraw in the currency they want, or spend on a virtual card. The international wire fee per person goes away.",
        pts: [
          "Pay contractors in local currencies",
          "Simplify contractor payments and ongoing administration",
        ],
        ev: [
          [
            "The wallet: withdraw in any currency, a virtual card; the client stops paying wire fees.",
            "tape",
            "7/7 · 9/10",
          ],
          ["Pay contractors in local currencies.", "filed", "flyer"],
        ],
      },
      compliance: {
        head: "The documentation is handled, and the classification is checked first.",
        body: "W-8, W-9 and 1099 documentation and reporting. Standard contractor agreements. And before anyone signs, the questions that tell you whether this person is a contractor in that country, because the paper doesn’t settle it. If the answer leans employee, the compliant answer for that person is employer of record, on the same platform.",
        pts: ["Support W-8, W-9 and 1099 documentation and reporting"],
        ev: [
          ["Support W-8, W-9 and 1099 documentation and reporting.", "filed", "flyer"],
          [
            "'Sometimes they think, if I say it's a contractor, it must be so. That's not the case.'",
            "tape",
            "8/27",
          ],
        ],
      },
      control: {
        head: "The client stays the contracting party.",
        body: "Nothing changes about who the contractor works for or who holds the agreement. We advise on classification. The client decides.",
        pts: [],
        ev: [
          ["For clients managing their own independent contractors.", "filed", "flyer"],
          [
            "'We would advise what's best for that country. Ultimately it's the client's decision.'",
            "tape",
            "7/7",
          ],
        ],
      },
      oneplace: {
        head: "Contractors beside employees, one platform.",
        body: "The same view holds the client’s contractors, employer-of-record people and payroll people, and the partner sees all of it across clients.",
        pts: [],
        ev: [
          [
            "Workers grouped as contractors, EOR and payroll in one view.",
            "tape",
            "8/27",
          ],
        ],
      },
    },
    how: [
      "The client adds the contractor. The contractor enters their own details and banking.",
      "Standard contract templates are there. The client’s own can be used.",
      "Invoices and payments run through the platform. The wallet holds the funds.",
      "Year-end documentation comes out of the same place.",
    ],
    we: [
      "Onboarding workflows",
      "Payment in local currency; the wallet",
      "W-8, W-9 and 1099 documentation and reporting",
      "Classification guidance per country",
    ],
    they: [
      "The contract with the contractor",
      "The direction of the work",
      "The classification decision, with our advice",
    ],
    tiers: [
      {
        name: "Contractor Management",
        who: "For clients managing their own independent contractors",
        pts: [
          "Onboard international contractors with streamlined workflows",
          "Pay contractors in local currencies",
          "Support W-8, W-9 and 1099 documentation and reporting",
          "Simplify contractor payments and ongoing administration",
        ],
      },
    ],
    time: "Immediate.",
    money:
      "A fee per contractor for the payments and the administration. Nothing held in reserve.",
    ask: [
      "Who sets their hours and directs their day?",
      "Do they work for anyone else?",
      "Is there an end date, or a project?",
      "How are they paid today, and in what currency?",
      "What did they sign, and with whom?",
    ],
  },
  {
    id: "cor",
    name: "Contractor of record",
    flyer: "PrismHR Global Contractor Solutions",
    sub: "Contractor Plus on the platform",
    door: "We hold the contract and stand behind the classification.",
    fork: "They invoice, and the client wants someone else to hold the contract and stand behind the classification.",
    one: "We become the contracting party with each contractor, under an agreement written for their country. We classify them before we sign, we pay them compliantly, and we carry the classification liability.",
    lang: "Their contractors, on our paper, with the misclassification risk on us.",
    notThis: [
      [
        "cmgmt",
        "the client is fine holding the contract and just needs the payments and paperwork done",
      ],
      ["eor", "the person fails the country’s test and is really an employee"],
      ["payroll", "the client’s own company there employs them"],
      ["talent", "there is no person yet"],
    ],
    solves: {
      compliance: {
        head: "The misclassification exposure moves to us. Here is how.",
        body: "Every country has its own test for who is really an employee: who sets the hours, who directs the day, whether the person works for anyone else, whether there is an end date. A contractor label doesn’t pass that test on its own. Under contractor of record we run the test for that country before anyone signs, and we won’t put our name on a contractor agreement for someone the country would call an employee. The agreement is written for that country. The payments and the tax documentation are compliant by construction. The offboarding is ours. If the country ever looks, the contracting party is a company whose job is to get this right. Anyone who fails the test is offered employer of record instead, on the same platform, so the client is never told to keep doing the thing that’s exposed.",
        pts: [
          "PrismHR Global serves as the Contractor of Record",
          "Manage contractor agreements and compliant payments",
          "Reduce worker misclassification risk",
          "Help clients navigate country-specific contractor regulations",
        ],
        ev: [
          [
            "Serves as the contractor of record; manages contractor agreements and compliant payments; reduces worker misclassification risk; navigates country-specific contractor regulations.",
            "filed",
            "flyer",
          ],
          [
            "'We're going to make sure that classification is accurate. We're not going to sign our name to a contract for a contractor if we know they really should be classified as an employee.'",
            "tape",
            "8/27",
          ],
          [
            "'There are real consequences, fines, penalties, if the government finds out.' We advise; the client decides.",
            "tape",
            "7/7",
          ],
        ],
      },
      control: {
        head: "The client still directs the work.",
        body: "The relationship on the ground doesn’t change. What changes is whose name is on the contract and who answers for its compliance.",
        pts: [],
        ev: [["For clients needing additional compliance protection.", "filed", "flyer"]],
      },
      speed: {
        head: "Immediate, once the classification check is done.",
        body: "The check is a handful of questions per person. After it, onboarding and payment run the same day as plain contractor management.",
        pts: [],
        ev: [
          ["Contractors immediate; Contractor Plus is 'one step more'.", "tape", "8/27"],
        ],
      },
      cost: {
        head: "A higher fee than plain contractor payments, for the liability we carry.",
        body: "The rate is higher because we’re taking on the responsibility for the classification. Some clients want exactly that. No reserve is held.",
        pts: [],
        ev: [
          [
            "'The rates are higher because we're taking on more responsibility and liability for that classification.'",
            "tape",
            "8/27",
          ],
        ],
      },
      oneplace: {
        head: "Same platform, same wallet, same view.",
        body: "Contractors on our paper sit beside the client’s own contractors and its employees, in one place.",
        pts: [],
        ev: [["One platform for contractors, EOR and payroll.", "tape", "8/27"]],
      },
    },
    how: [
      "The client tells us who the contractors are, where they are, and what they do.",
      "We run the classification for that country, person by person, and say plainly which ones hold up as contractors.",
      "For those who do, we issue a contractor agreement in our name, written for the country, and the person signs with us.",
      "Payments run through the platform in their currency. Documentation and reporting are ours.",
      "For anyone who leans employee, we say so and offer employer of record for that person.",
    ],
    we: [
      "The contractor agreement, in our name, written for the country",
      "The classification check before signing",
      "Compliant payments and tax documentation",
      "Country-specific contractor rules",
      "Offboarding",
    ],
    they: [
      "The direction of the work and the day-to-day relationship",
      "The decision on anyone who leans employee: employ them through us, or not",
    ],
    tiers: [
      {
        name: "Contractor of Record (COR)",
        who: "For clients needing additional compliance protection",
        pts: [
          "PrismHR Global serves as the Contractor of Record",
          "Manage contractor agreements and compliant payments",
          "Reduce worker misclassification risk",
          "Help clients navigate country-specific contractor regulations",
        ],
      },
    ],
    time: "Immediate after the classification check.",
    money:
      "A higher per-contractor fee than contractor management, for the liability. Nothing held in reserve.",
    watch:
      "It can’t turn an employee into a contractor. Say that before they hear it from a contract we won’t sign.",
    ask: [
      "Which countries are they in, and how many in each?",
      "Who sets their hours and directs their day?",
      "Do they work for anyone else?",
      "Is there an end date, or a project?",
      "How long has each of them been engaged, and what did they sign, with whom?",
      "How are they paid today: fixed amounts on a schedule, or against invoices?",
    ],
  },
  {
    id: "talent",
    name: "Talent",
    flyer: "PrismHR Global Talent Solutions",
    door: "They need the person too. We find them. They pick. We employ them.",
    fork: "Nobody yet. They need finding first.",
    one: "The client doesn’t have a person yet. We source candidates in the country, they interview and pick, and the hire can move straight into employer of record.",
    lang: "A recruiter with the employer already attached.",
    notThis: [
      ["eor", "they already have a specific person"],
      ["cmgmt", "they have a contractor already and just need them paid"],
      ["payroll", "the client’s own company there employs people already"],
    ],
    solves: {
      speed: {
        head: "Local recruiters in the market shorten the search.",
        body: "Sourcing runs in the country, targeted by country, industry and role, with market knowledge of what the role pays and how hiring works there.",
        pts: [
          "Source qualified candidates across global talent markets",
          "Target candidates based on country, industry and role",
          "Accelerate recruiting and hiring timelines",
        ],
        ev: [
          [
            "Source qualified candidates across global talent markets; target by country, industry and role; accelerate timelines.",
            "filed",
            "flyer",
          ],
        ],
      },
      control: {
        head: "They choose. They manage.",
        body: "Candidates come with a resume and a video. The client interviews and picks, and directs the work day to day. The staffing arm is a different thing: a seat we run, with our management on attendance. Talent finds a person the client employs through us.",
        pts: [],
        ev: [
          [
            "'They will send you a resume and a video of that individual.'",
            "tape",
            "9/10",
          ],
          [
            "Staffing gives the client a seat we run; Global employs a person the client picked.",
            "tape",
            "9/10",
          ],
        ],
      },
      compliance: {
        head: "The hire lands as an employee under local law.",
        body: "When the person is picked, employer of record takes over: the contract, payroll, benefits, the filings. There is no gap where the new hire is paid some other way.",
        pts: ["Transition seamlessly into Employer of Record services when needed"],
        ev: [
          [
            "Transition seamlessly into Employer of Record services when needed.",
            "filed",
            "flyer",
          ],
        ],
      },
      oneplace: {
        head: "For a team, a fully managed option.",
        body: "Talent Management adds workspace and housing arrangements where available, local HR administration and employee support, and help with local employment practices and cultural considerations.",
        pts: [
          "Support workspace and housing arrangements where available",
          "Provide local HR administration and employee support",
          "Help navigate local employment practices and cultural considerations",
        ],
        ev: [
          [
            "Talent Management: workspace and housing where available, local HR administration, employee support, local practices.",
            "filed",
            "flyer",
          ],
        ],
      },
      cost: {
        head: "Priced per person. The employment cost is the country’s.",
        body: "Recruiting is priced per hire. Once employed, the person costs what an employee costs there: salary, the country’s employer charges, our employer-of-record fee.",
        pts: [],
        ev: [
          ["'They will provide you with the cost for that individual.'", "tape", "9/10"],
        ],
      },
    },
    how: [
      "The client describes the role: country, skills, language, seniority.",
      "We source and shortlist. Resumes and videos come back.",
      "They interview and choose.",
      "The hire moves into employer of record and starts on the platform.",
    ],
    we: [
      "Sourcing in the country",
      "Shortlists with resumes and videos",
      "Market guidance on the role and its pay",
      "The employment, once they choose",
    ],
    they: [
      "The role and the requirements",
      "The interviews and the choice",
      "Day-to-day management",
    ],
    tiers: [
      {
        name: "Global Talent Recruitment",
        who: "For clients looking to recruit top talent globally",
        pts: [
          "Source qualified candidates across global talent markets",
          "Target candidates based on country, industry and role",
          "Accelerate recruiting and hiring timelines",
          "Transition seamlessly into Employer of Record services when needed",
        ],
      },
      {
        name: "Global Talent Management",
        who: "For clients seeking a fully managed international workforce",
        pts: [
          "Everything in Talent Recruitment",
          "Support workspace and housing arrangements where available",
          "Provide local HR administration and employee support",
          "Help navigate local employment practices and cultural considerations",
        ],
      },
    ],
    time: "The search runs at the market’s pace. Employment starts about two weeks after they choose.",
    money: "A recruiting fee per hire, then employer-of-record pricing for the person.",
    ask: [
      "Do they have a specific person in mind, or a profile?",
      "Why that country: time zone, cost, a person, a market?",
      "One person or a team?",
      "Do they want the person on their own systems day to day?",
    ],
  },
];

export const CUES: Cue[] = [
  // employer of record
  {
    id: "e1",
    p: "eor",
    issue: "control",
    cue: "We’ve got a client who wants to hire someone in the Philippines. They don’t have anything set up there.",
    gist: "A specific person, no company there.",
    respond: [
      "Say the fork out loud: who legally employs the person decides the product. Nobody yet, and no company wanted there: employer of record.",
      "Type the country on the left the moment it’s named. Read the lead lines back.",
      "Ask where the person lives and works day to day, not where they’re from.",
      "Ask whether the client has promised a start date, pay or a title. Two weeks runs from the signed agreement and the person’s details.",
      "Don’t quote off the description. Send the list, and offer to join the client call.",
    ],
    ask: [0, 1, 2],
    ev: [
      [
        "A client asked about hiring someone in the Philippines; nothing set up.",
        "tape",
        "9/10",
      ],
      ["Brazil, Germany, Mexico prospects with people on the ground.", "tape", "8/27"],
      [
        "'Most of what our partners are coming to us with is employer of record.'",
        "tape",
        "9/3",
      ],
    ],
    also: [["talent", "if they don’t have a person yet"]],
    cty: ["Philippines"],
  },
  {
    id: "e2",
    p: "eor",
    issue: "compliance",
    cue: "They pay a team over there as contractors, but honestly they work like employees. The CEO wants them on W-2 for the IP.",
    gist: "Contractors who are really employees.",
    respond: [
      "Say the test plainly: who sets their hours and directs their day, do they work for anyone else, is there an end date. The paper doesn’t settle it; the country tests the facts.",
      "Employer of record puts it right: an employment contract under that country’s law, with the IP language in it.",
      "If they sit inside a local vendor company today, that company’s notice terms bind first. Ask who owns it.",
      "Contractors and employees run side by side on the same platform. Sort it person by person.",
    ],
    ask: [3],
    ev: [
      [
        "'Borderline their employees, because it's not project-based.' The CEO: W-2 for IP reasons.",
        "tape",
        "7/7",
      ],
      [
        "Two India contractors to reclassify; the level of direction puts them in a gray area.",
        "tape",
        "7/21 notes",
      ],
    ],
    also: [["cor", "for the ones who genuinely run their own business"]],
  },
  {
    id: "e3",
    p: "eor",
    issue: "compliance",
    cue: "One of our people moved to Portugal and she’s still on our payroll. Are we even paying her right?",
    gist: "Moved abroad, still on a US payroll.",
    respond: [
      "Say internal when it’s the partner’s own person. Same fix either way.",
      "Three questions: still on the US payroll, how long and are they staying, right to work there.",
      "Past a few months, withholding and contributions belong where they live. Paying from a US account doesn’t make it domestic.",
      "Moving them to contractor to keep it simple usually makes it worse. The work didn’t change.",
      "One person is the fastest first deal a partner can do. Offer to run it.",
    ],
    ask: [0, 1],
    ev: [
      [
        "'We had an employee that moved to Portugal, and she's still working for us. Are we paying her correctly? I don't know.'",
        "tape",
        "9/3",
      ],
      ["A client's relocated employee, sent to an outside provider.", "tape", "8/27"],
      ["One in the UK paid to a US bank account.", "tape", "7/7"],
    ],
    also: [],
    cty: ["Portugal"],
  },
  {
    id: "e4",
    p: "eor",
    issue: "cost",
    cue: "I think they’re dissolving the entity there. Or opening a new one. I’m not sure which.",
    gist: "An entity in flux.",
    respond: [
      "Say the one true thing before the facts are in: opening a company abroad is expensive everywhere and may not be needed at all.",
      "Entity in flux stops the product decision. Find out whether the entity survives. Both answers have a product.",
      "If it survives, registered, payroll-registered and banked: payroll. If it goes: employer of record, and nothing has to be built.",
    ],
    ask: [],
    ev: [
      [
        "'They're actually dissolving an entity and opening up a brand new entity.' 'It may not even make sense for them to open up another entity.'",
        "tape",
        "9/10",
      ],
    ],
    also: [["payroll", "if the entity survives and is registered and banked"]],
  },
  {
    id: "e5",
    p: "eor",
    issue: "oneplace",
    cue: "The client’s been with another provider for about a year. It’s a separate site, separate invoices.",
    gist: "Winning back people on another provider.",
    respond: [
      "Ask the term first. Month to month: open now. Fixed: work back from the end date and the notice.",
      "Ask for the invoices or the agreement if the relationship allows. Quote from the number, not against a guess.",
      "Lead with one place for everything: one provider, one invoice, one login, the partner’s relationship. A standalone provider can’t offer that.",
      "A takeover means the incumbent’s notice, a new contract from us, and tenure and leave carried over. Four to eight weeks, most of it their notice.",
    ],
    ask: [],
    ev: [
      [
        "'It's a different site, separate invoices. Can't this just be in one place?' Month to month; the invoices shared.",
        "tape",
        "9/2",
      ],
      [
        "Switch mechanics: notice, new contract, continuity of service, accrued entitlements.",
        "research",
        "peoplemanagingpeople · deel · justworks · bipo",
      ],
    ],
    also: [],
  },
  {
    id: "e6",
    p: "eor",
    issue: "speed",
    cue: "They’d only move on January first. Companies that size wait for the tax year.",
    gist: "A start date set by the tax year, or a promise.",
    respond: [
      "Don’t ask why January first. Work back from it: paper and details by mid-December, the incumbent’s notice served before that.",
      "A promised start date is the deadline. Two weeks runs from the signed agreement and the person’s details.",
      "The person’s own notice elsewhere is theirs, not ours. Ask if they’re working for someone today.",
    ],
    ask: [2, 3],
    ev: [
      [
        "'Because of tax restart implications, they wait until January first.'",
        "tape",
        "9/3",
      ],
      [
        "'Is the employee currently working for another company? In Italy those notice periods are long.'",
        "tape",
        "8/27",
      ],
    ],
    also: [],
  },
  {
    id: "e7",
    p: "eor",
    issue: "control",
    cue: "Can our lawyers review the IP language? And are there stipends over there we don’t know about?",
    gist: "The client is on the call.",
    respond: [
      "Speak to the client. Land the credit on the partner. Never a price the partner hasn’t seen.",
      "IP sits in both documents: the agreement with the partner, and the employment contract under local law. Their own IP agreement can be added.",
      "Benefits are paid through employer social charges. Nothing is free. Stipends are by country: type it on the left, and if it isn’t on file say so and get it to them today.",
      "No at-will, no unlimited PTO, no offer letter. An employment contract.",
      "A team employed by a local company that invoices the client has notice periods to honour first. Ask who owns that company.",
    ],
    ask: [0, 1, 2],
    ev: [
      [
        "'There's two parts of the contract, and within that there's IP protection.' 'Mexico has specific stipends for housing and food. Anything for the UK or Bulgaria?'",
        "tape",
        "7/7",
      ],
    ],
    also: [],
    cty: ["Bulgaria", "Mexico"],
  },
  {
    id: "e8",
    p: "eor",
    issue: "compliance",
    cue: "They’re all Bulgarian, so they’re all employed in Bulgaria, right?",
    gist: "Nationality versus where they live.",
    respond: [
      "Where they live and work decides the employer, not their passport. One of them may live somewhere else.",
      "Citizen or resident there: straightforward. On a visa: check what it allows. Nothing: immigration before payroll. We can help in some countries, and it depends on the country.",
    ],
    ask: [0, 1],
    ev: [
      [
        "'I think one lives in Spain.' 'Where they live is where they'd need to be employed.'",
        "tape",
        "7/7",
      ],
      [
        "'We can sponsor work permits and visas, but it depends on the country.'",
        "tape",
        "8/27",
      ],
    ],
    also: [],
    cty: ["Bulgaria", "Spain"],
  },
  // global payroll
  {
    id: "p1",
    p: "payroll",
    issue: "control",
    cue: "They already have an entity there. We just need someone to run the payroll.",
    gist: "A company there, with people.",
    respond: [
      "Three things or it isn’t payroll we can run: a registered company, payroll registration, a bank account there. Clients say entity and mean incorporated.",
      "They stay the employer and keep the filings. We run the calculations and hand the bank what it needs. Their ASO.",
      "Two to three months to live. Say it early.",
      "Ask who does the local filings today. When nobody can name who files, usually nobody does. That’s the moment to mention employer of record.",
    ],
    ask: [0, 1, 2],
    ev: [
      [
        "'Not just a registered entity, but also payroll registration, and a bank account down there.'",
        "tape",
        "9/3",
      ],
      [
        "'Is EOR the only option?' In-country payroll exists if the client has an entity.",
        "filed",
        "7/20",
      ],
    ],
    also: [["eor", "if any of the three is missing"]],
  },
  {
    id: "p2",
    p: "payroll",
    issue: "compliance",
    cue: "Their current PEO already pays those people through the platform, so it must be doable.",
    gist: "Already paid from here, with workarounds.",
    respond: [
      "Running someone on mainland payroll doesn’t make them compliant there. Withholding, the year-end form, unemployment and workers’ comp belong to the place they work.",
      "Stay on the facts of the jurisdiction. Never discuss another customer.",
      "Ask who files the withholding and where the year-end forms go. If they can name it, good. If not, that’s the opening.",
      "Type the place on the left. Its own card carries what’s different there.",
    ],
    ask: [2],
    ev: [
      [
        "'They can't be. Not correctly, but…' The room guessing about a competitor.",
        "tape",
        "9/3",
      ],
      ["A partner live with manual tax filing outside the system.", "tape", "8/27"],
    ],
    also: [],
    cty: ["Puerto Rico"],
  },
  {
    id: "p3",
    p: "payroll",
    issue: "compliance",
    cue: "If the client stays the employer, would you go through with the tax filings and everything?",
    gist: "Would you do the filings?",
    respond: [
      "No. On payroll the client keeps the filings and the taxes. We calculate and submit the paperwork to the bank. On employer of record all of that goes away.",
      "Then check how they’re paying and classifying today. It’s sometimes less compliant than it looks.",
    ],
    ask: [2],
    ev: [
      [
        "'Would you go through with the tax filings?' 'No. We do the payroll processing.'",
        "tape",
        "9/3",
      ],
    ],
    also: [["eor", "if they’d rather not keep the filings at all"]],
  },
  {
    id: "p4",
    p: "payroll",
    issue: "oneplace",
    cue: "Our Canadian clients would bank out of their own accounts. Does it work like our ASO?",
    gist: "A neighbouring country, ASO-style.",
    respond: [
      "Yes, it’s their ASO. We have our own payroll tech in Canada. Semi-monthly there.",
      "Their model breaks at the bank: they can only move money US to US. Walk through how funds reach the country and the agencies before anything else.",
      "Year-end forms and benefits are by country. Type it on the left.",
    ],
    ask: [0, 1, 3],
    ev: [
      [
        "A partner's working model for Canada: clients bank from their own accounts; the partner remits; the T4; how funds physically reach the agencies.",
        "filed",
        "7/21–22",
      ],
    ],
    also: [],
    cty: ["Canada"],
  },
  {
    id: "p5",
    p: "payroll",
    issue: "cost",
    cue: "I don’t know if they’ve got both entities still.",
    gist: "An entity in flux.",
    respond: [
      "It can’t be quoted until it lands. Say so.",
      "Say the true thing while they find out: opening another may not be needed at all.",
      "Both answers have a product. Entity survives: payroll. Entity goes: employer of record.",
    ],
    ask: [0, 1],
    ev: [
      [
        "'They're dissolving an entity and opening up a brand new entity.'",
        "tape",
        "9/10",
      ],
    ],
    also: [["eor", "if the entity goes"]],
  },
  {
    id: "p6",
    p: "payroll",
    issue: "speed",
    cue: "There’s a proposal process. Can you run payroll for their operation over there, or is it employer of record only?",
    gist: "A big head count, a proposal.",
    respond: [
      "Both exist. Payroll if they have a registered, banked company there. Employer of record if they don’t, or don’t want the filings.",
      "A big head count goes to a scoped conversation: head count, salaries, countries, entity status. No RFP.",
      "Two to three months for payroll. Say it now so the proposal doesn’t promise a date that can’t happen.",
    ],
    ask: [0, 1, 3],
    ev: [
      [
        "'Is EOR the only option?' A partner in a proposal for a client's operation abroad.",
        "filed",
        "7/20 · 9/2",
      ],
      ["A partner's client needing payroll for a few hundred people.", "filed", "7/16"],
    ],
    also: [["eor", "if there’s no company there"]],
  },
  // contractor management
  {
    id: "c1",
    p: "cmgmt",
    issue: "cost",
    cue: "We’ve got about twenty-five people we pay by international wire. Every one of them costs us a wire fee.",
    gist: "Paying by wire from the US.",
    respond: [
      "Contractor management: we onboard them, the contracts are standard, they’re paid in local currency through the platform, and the wallet replaces the wires.",
      "Contractors are immediate once they’re in the system.",
      "Ask the classification questions before anyone signs anything.",
    ],
    ask: [0, 1, 2, 3],
    ev: [
      [
        "'Twenty-five or so international employees that I pay directly. We do an international banking wire. We're paying wire fees for each.'",
        "tape",
        "7/7",
      ],
      [
        "'People pay people in Poland from the US all the time, non-compliantly.'",
        "tape",
        "9/10",
      ],
    ],
    also: [["cor", "if they want someone else to hold the contracts"]],
  },
  {
    id: "c2",
    p: "cmgmt",
    issue: "compliance",
    cue: "Around the legality of it, we’re probably borderline. It’s not project-based.",
    gist: "Are they really contractors?",
    respond: [
      "The country doesn’t care what the paper says. Who sets their hours, who directs their day, do they work for anyone else, is there an end date.",
      "Say the consequence plainly: fines and penalties, and the exposure lands on whoever directs the work.",
      "We advise. The client decides.",
      "Those who lean employee get employer of record. The genuine contractors stay contractors. Same platform.",
    ],
    ask: [0, 1, 2],
    ev: [
      [
        "'We are probably borderline their employees, because it's not project-based.'",
        "tape",
        "7/7",
      ],
      [
        "'There are real consequences, fines, penalties, if the government finds out.'",
        "tape",
        "7/7",
      ],
    ],
    also: [
      ["cor", "if they want us to hold the contract and stand behind it"],
      ["eor", "for anyone who fails the test"],
    ],
  },
  {
    id: "c3",
    p: "cmgmt",
    issue: "oneplace",
    cue: "We’re only doing their W-2s. They’ve got a lot of vendors, though.",
    gist: "The partner has never touched contractor payments.",
    respond: [
      "It’s their 1099 work under a foreign test. Bring the client’s contractor payments under the partner’s umbrella.",
      "It’s a piece the partner isn’t earning on today. Say that plainly.",
      "Start with the classification questions. Some of those vendors are people.",
    ],
    ask: [0, 1, 2],
    ev: [
      [
        "'We're only doing their W-2s.' 'We could also bring in their contractor stuff under your umbrella.'",
        "tape",
        "9/10",
      ],
    ],
    also: [],
  },
  {
    id: "c4",
    p: "cmgmt",
    issue: "speed",
    cue: "They’re on another platform for the contractors today. I’m not sure exactly which service.",
    gist: "Moving off an incumbent platform.",
    respond: [
      "Find out what the people actually signed and with whom. The paper decides whether anything has to be served.",
      "Contractors move immediately. There is no in-country registration to wait for.",
      "Get the invoices. They say the product, the head count and the price.",
    ],
    ask: [3, 4],
    ev: [
      [
        "'I'm pretty sure EOR. But don't put that in stone yet, let me double check.' Invoices in hand.",
        "tape",
        "9/2",
      ],
    ],
    also: [],
  },
  {
    id: "c5",
    p: "cmgmt",
    issue: "cost",
    cue: "How do the contractors actually get their money?",
    gist: "How they get paid.",
    respond: [
      "Funds land in the wallet in dollars. They withdraw in the currency they want, or spend on a virtual card.",
      "No per-person wire fees. Invoices and payments run in the platform, and year-end documentation comes out of the same place.",
    ],
    ask: [3],
    ev: [["The wallet: any currency, a virtual card, no wires.", "tape", "7/7 · 9/10"]],
    also: [],
  },
  // contractor of record
  {
    id: "r1",
    p: "cor",
    issue: "compliance",
    cue: "She asked if we have a contractor of record. She’s worried about compliance.",
    gist: "“Do you have a contractor of record?”",
    respond: [
      "Yes. We call it Contractor Plus. We hold the contract with the contractor, we classify them per country before we sign, and the agreement is written for that country.",
      "Say what it solves: the contracting party is us, so the classification exposure sits with the party whose job is to get it right. The paperwork, the payments and the offboarding are ours.",
      "Say what it doesn’t: it can’t turn an employee into a contractor. Anyone who fails the test gets employer of record.",
      "Ask which countries and how many in each. Type each on the left.",
    ],
    ask: [0, 1, 2, 3, 4, 5],
    ev: [
      [
        "'Do you have a contractor of record available? If so, that would work best for us.' A client's new CFO, relayed.",
        "tape",
        "9/10",
      ],
      ["Contractor management plus: misclassification protection.", "tape", "7/21 notes"],
    ],
    also: [["eor", "for anyone who leans employee"]],
  },
  {
    id: "r2",
    p: "cor",
    issue: "compliance",
    cue: "They’ll stay contractors. That’s how the client wants it.",
    gist: "Contractors on purpose.",
    respond: [
      "Fine, if the country agrees. Who sets their hours, who directs their day, do they work for anyone else, is there an end date.",
      "We won’t sign our name to a contractor agreement for someone who should be an employee. Say that before they hear it from a contract we won’t sign.",
      "If they pay the same amount on the same day every month, that’s one of the things a country looks at.",
      "The people who hold up stay contractors on our paper. The ones who don’t get employer of record. Same platform, no gap.",
    ],
    ask: [1, 2, 3, 4, 5],
    ev: [
      ["'The contractors in Poland will remain contractors.'", "tape", "9/10"],
      [
        "'We're not going to sign our name to a contract for a contractor if they really should be classified as an employee.'",
        "tape",
        "8/27",
      ],
    ],
    also: [["eor", "for the ones who fail the test"]],
  },
  {
    id: "r3",
    p: "cor",
    issue: "compliance",
    cue: "Two of them are in Ukraine. That’s a knockout, right?",
    gist: "Contractors in a conflict country.",
    respond: [
      "We price Ukraine. Confirm the specifics for those people before you promise a start date. It isn’t a no.",
      "The hard no is the comprehensively sanctioned list, and those countries aren’t on the price list at all.",
      "Type it on the left. The card says what to confirm.",
    ],
    ask: [0],
    ev: [
      ["'This might be a knockout, I'm not sure.'", "tape", "9/10"],
      [
        "Ukraine priced with sixteen points; comprehensive sanctions elsewhere.",
        "research",
        "country sheet · OFAC summaries",
      ],
    ],
    also: [],
    cty: ["Ukraine"],
  },
  {
    id: "r4",
    p: "cor",
    issue: "speed",
    cue: "They’re paying them through a payroll tool right now. How fast can they move?",
    gist: "The switch from a payroll tool.",
    respond: [
      "Immediate after the classification check. There is no in-country registration to wait for.",
      "The one thing to check first is what each of them signed and with whom today, so nothing gets served late.",
      "Ask how they’re paid today. Fixed amounts on a schedule look like a salary to the country.",
    ],
    ask: [4, 5],
    ev: [["Contractors immediate; Contractor Plus one step more.", "tape", "8/27"]],
    also: [],
  },
  {
    id: "r5",
    p: "cor",
    issue: "cost",
    cue: "Why would we pay more for this than just paying the contractors?",
    gist: "Why it costs more.",
    respond: [
      "Because we’re carrying the classification liability. The rate is higher for that responsibility.",
      "Contractor management pays and papers people the client contracts with. Contractor of record puts our name on the contract and our judgment behind the classification.",
      "Some clients want exactly that. Others are fine holding the contract. Both run on the same platform.",
    ],
    ask: [],
    ev: [
      [
        "'The rates are higher for that because we're taking on more responsibility and liability for that classification, but some companies want to make sure they're being classified properly.'",
        "tape",
        "8/27",
      ],
    ],
    also: [["cmgmt", "if the client is fine holding the contract"]],
  },
  // talent
  {
    id: "t1",
    p: "talent",
    issue: "control",
    cue: "They want someone in the Philippines. I’m not sure why there specifically.",
    gist: "Someone in a country, nobody picked.",
    respond: [
      "Ask why that country, and whether they have a person in mind. The reason is usually the whole deal.",
      "A person picked: that’s employer of record. No person: talent. We source to the requirement; resumes and videos come back; they pick.",
      "Two or three people works better than one. They want to be part of a team.",
    ],
    ask: [0, 1, 2],
    ev: [
      [
        "'I'm not sure why they were specifically interested in the Philippines.'",
        "tape",
        "9/10",
      ],
    ],
    also: [["eor", "if they already have a person"]],
    cty: ["Philippines"],
  },
  {
    id: "t2",
    p: "talent",
    issue: "control",
    cue: "What’s the difference between this and your staffing thing? It sounds similar.",
    gist: "The staffing arm versus this.",
    respond: [
      "Staffing gives the client a seat we run: our facility, our tech, our management on attendance. The client directs the work.",
      "Talent finds a person the client employs through us, on their own systems, as their own employee.",
      "The line is who the person works for on paper. Ask whether they want the person on their own systems day to day.",
    ],
    ask: [3],
    ev: [
      [
        "'If they already have somebody picked, that's where Global comes in.' The staffing arm sources, houses and manages attendance.",
        "tape",
        "9/10",
      ],
    ],
    also: [],
  },
  {
    id: "t3",
    p: "talent",
    issue: "speed",
    cue: "They need a very specific kind of person and can’t find them here.",
    gist: "Niche talent.",
    respond: [
      "Describe the profile. We find them in the country where they exist, with recruiters who know that market.",
      "When they choose, employer of record takes over the same week.",
    ],
    ask: [0, 1],
    ev: [
      [
        "The niche-talent example: a specific profile, found in the one part of the world where it exists.",
        "tape",
        "9/3 · 7/21 notes",
      ],
    ],
    also: [],
  },
  {
    id: "t4",
    p: "talent",
    issue: "oneplace",
    cue: "We might want to hire a few people abroad ourselves. Can you help find them?",
    gist: "The partner’s own hiring.",
    respond: [
      "Yes. Say internal, and treat it like a client’s.",
      "It’s a different person on our side. Make the introduction the same day.",
      "Their own hire is the fastest way to have done it once before a client asks.",
    ],
    ask: [0, 2],
    ev: [
      [
        "A partner asked about recruitment support for its own international hires.",
        "tape",
        "7/21 notes",
      ],
    ],
    also: [],
  },
  {
    id: "t5",
    p: "talent",
    issue: "cost",
    cue: "They’re thinking a small team over there, mostly for the time zone.",
    gist: "A team, not a person.",
    respond: [
      "Time zone is a staffing conversation. A specific person is employer of record. Cost is a different pitch. Don’t guess at the product.",
      "For a team: Talent Management adds workspace and housing where available, local HR administration and employee support.",
      "Ask whether they want the team on their own systems, or a seat we run.",
    ],
    ask: [1, 2, 3],
    ev: [
      [
        "'Philippines is interesting because it has a very similar time zone?' 'I'm not sure why.'",
        "tape",
        "9/10",
      ],
      [
        "Talent Management: workspace and housing where available, local HR administration.",
        "filed",
        "flyer",
      ],
    ],
    also: [],
  },
];

export const BETWEEN: BetweenQ[] = [
  {
    q: "Do we hand the client off to you, or are we the middleman?",
    a: "Either. Resale: you hold the client contract and mark up. Referral: we contract direct and pay you a fee for the life of it. Most partners choose resale to keep the relationship. Standalone providers take the global work and come back for the domestic book.",
    ev: [
      [
        "Resale draws from the partner; referral contracts with the client.",
        "tape",
        "8/27",
      ],
      [
        "'The traditional model in this space is all referral. They cut you guys out.'",
        "tape",
        "9/10",
      ],
    ],
  },
  {
    q: "How do we price it? Can you send pricing before we talk?",
    a: "Your markup over our price. It depends on the product and the country, so it is never one number. A number without the situation is a number nobody can use, so we send what pricing needs and ask for the situation with it.",
    ev: [
      [
        "'So how do we price it?' 'Very subjective, depends on the product and the country.'",
        "tape",
        "9/2",
      ],
      ["A partner asking for pricing after the first call.", "filed", "9/10"],
    ],
  },
  {
    q: "Who does the setup, and how do we get paid for teaching clients?",
    a: "You create the client in a few fields. The client enters its own banking. We do the in-country work. Your time comes back through the markup and a setup fee you can mark up or add to.",
    ev: [
      [
        "'The setup, is that something we'd be responsible for?' 'How do we make our money back for the time we spend teaching clients?'",
        "tape",
        "8/27",
      ],
    ],
  },
  {
    q: "Who funds the payroll, and when? What if a client bounces?",
    a: "The tenth is the approval cutoff. We draw mid-month so the money lands in country before payday. A one-month reserve per employee covers a bounce and is refunded at the end of employment. Puerto Rico runs on the domestic rhythm.",
    ev: [["Funding cadence and the deposit, on tape.", "tape", "8/27"]],
  },
  {
    q: "Is this an amendment to our agreement, or something separate?",
    a: "An amendment to what you already have. Read it for redlines. The indemnities are conduct-based and mirror into the client template.",
    ev: [
      ["'Is this an amendment or a separate agreement?'", "tape", "8/27"],
      ["The reseller sidebar on indemnities and the deposit waiver.", "filed", "7/21"],
    ],
  },
  {
    q: "How fast can you start?",
    a: "Contractors immediately. Employer of record about two weeks from a signed agreement and the person’s details. Global payroll two to three months. A person’s own notice can stretch any of them.",
    ev: [
      [
        "'How fast can you start?' Contractors immediate, EOR two weeks, payroll two to three months.",
        "tape",
        "8/27",
      ],
    ],
  },
  {
    q: "Is it all one screen for the client?",
    a: "A separate platform, one click from Prism. One login. Unified reporting is coming, and there is no date to promise.",
    ev: [
      ["'Does it open a new tab?' SSO, one click.", "tape", "9/3"],
      [
        "Global data stays in the global system today; a unified report center is planned.",
        "filed",
        "7/20",
      ],
    ],
  },
  {
    q: "Is this actually yours, or are you reselling someone else’s?",
    a: "Ours. We built it, and we operate with our own entities in country.",
    ev: [["'It's 100% ours, we built it from scratch.'", "tape", "9/10"]],
  },
  {
    q: "My sales team wants a slide. We’re not ready to talk to clients yet.",
    a: "You’ll have one: two lines and the four things, in your language, with a name to call before anyone quotes. And sign the paper now, so the next ask doesn’t go out the door while you get ready.",
    ev: [
      [
        "'They are so eager to add an extra slide.' 'I had to give him something.'",
        "tape",
        "9/2",
      ],
      ["Collateral exists for exactly this.", "tape", "9/3"],
    ],
  },
  {
    q: "What do you need from us to quote?",
    a: "Head count now and expected, salaries, the country, and whether there’s a company there. No RFP.",
    ev: [
      [
        "'All we need is current headcount, anticipated headcount, and salaries. No RFP.'",
        "filed",
        "8/28",
      ],
    ],
  },
];

const PBY = new Map(PRODUCTS.map((p) => [p.id, p]));

export function product(id: string): Product | undefined {
  return PBY.get(id);
}

export function cuesFor(productId: string): Cue[] {
  return CUES.filter((c) => c.p === productId);
}

export function cue(id: string): Cue | undefined {
  return CUES.find((c) => c.id === id);
}
