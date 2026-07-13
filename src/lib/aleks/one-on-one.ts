// The Aleks 1:1 room — a running record of each session: the brief brought in,
// the raw call notes, and what each note means for the work. Curated in code
// (like Look-into) so the record ships with the app; new sessions get appended
// here after each 1:1.

export type AleksCallNote = {
  note: string; // what was said, close to verbatim
  action?: string; // what it changes about how we work
};

export type AleksSession = {
  date: string; // ISO day
  label: string; // "Jul 13" — display
  callNotes: AleksCallNote[];
  // The brief carried in — the same three sections sent as the 1:1 notes.
  brief: { title: string; bullets: string[] }[];
};

export const ALEKS_SESSIONS: AleksSession[] = [
  {
    date: "2026-07-13",
    label: "Jul 13, 2026",
    callNotes: [
      {
        note: "XcelHR: let Anika lead on the timeline — they're implementing ~4 different Prism products right now, so whether now is a good time is her call.",
        action:
          "Take the call invite when she offers it, but don't push scheduling — her read on timing governs. Bullet on her roundup card updated to match.",
      },
      {
        note: "Simploy is a fantastic partner — a favorite of Aleks.",
        action:
          "Extra reason to run the 8/6 clock well; leadership is watching this one favorably. Logged as a research signal on the account.",
      },
      {
        note: "Advocate Pay / SubcontractorHub: give it some time so contracts get solidified on our side.",
        action:
          "Don't chase the client reaction aggressively this week — internal contract solidification comes first. Cadence eased on the thread.",
      },
      {
        note: "John Hebert's people are net-new employers going through HCM implementation.",
        action:
          "Confirms the read on Meridian + Payroll Solutions: fresh logos mid-onboarding — warm, education-first Global timing once implementation settles.",
      },
      {
        note: "Eduardo (SOLVO) is the reports/analyst guy — runs the business-intelligence reports with deep account detail, growth specs, etc. for Prism.",
        action:
          "He's the source for the account-visibility gaps (book refresh, HCM detail, growth data). Added to Look-into as the named lead.",
      },
      {
        note: "Aleks will schedule training on contracting once that's ready.",
        action: "Waiting on her — no action until the invite lands.",
      },
      {
        note: "When Shane's back (7/20) we'll figure out the process for SEs — when to pull them in, when not to.",
        action:
          "Queue for the week of 7/20; affects how demos and technical calls get staffed.",
      },
    ],
    brief: [
      {
        title: "Live conversations — where deals are actually moving",
        bullets: [
          "SubcontractorHub via Advocate Pay (furthest along — pricing + contracts stage): international roster in hand (Bulgaria “Frontier” group = primary W-2/EOR conversion; the rest stay 1099). Proposal is EOR CORE with the deposit waived. Pricing to Bryce 7/8; contracts out 7/10 with the IP-protection walkthrough Renee requested; confirmed final + client-shareable 7/13. Shane OOO 7/10–7/20 — I'm running point. Next: their reaction, then signature and Bulgaria onboarding.",
          "Simploy (fit 77 — hottest partner-channel account): Chassie (COO) inbound after LIVE; partner decision due 8/6. Her words: an integrated PrismHR option “would be ideal, assuming it's competitive on both price and functionality” — we're the preferred path if we're competitive. Discovery in: two internal contractors in India plus a client group with an India contractor on another provider; dual play — internal international expansion AND reselling global services to their clients. Pricing + new Global materials sent 7/13; call proposed Mon/Tue 1–3p. Demo follows.",
          "XcelHR (Anika's book): in new-product discussions since LIVE; Anika will bring me onto the next call with Bill, her main contact. Education-first segment, not a pitch.",
          "Book hygiene: PuzzleHR removed (Shane's account). Premier Payroll disqualified — acquired by Vensure 9/2025 (per John).",
        ],
      },
      {
        title: "Partner engagement — the roundup program",
        bullets: [
          "Standing roundup motion across seven partners (Lesha, Anika, Whitney, John, Eric, + new HCM-side partners Kathryn Maddox and Kellie Washington); every thread on reply/follow-up tracking. Three partners have replied with real intel.",
          "Whitney Dideon — met 7/13 (10a); she's the incoming Regional VP of HCM, ~3 weeks in seat. 4-account roundup delivered; she'll gauge as she connects with her clients (no formal meetings yet). She carries the HCM book (Cody Jensen's old accounts) — key long-game partner.",
          "John Hebert — replied 7/10: Premier Payroll acquired by Vensure 9/2025 → scrubbed to the exclusions ledger. His warning: “Vensure is like a vacuum sucking up other customers regularly” — flagged as standing book hygiene. His live angle: Meridian + Payroll Solutions, both in active HCM implementation.",
          "Anika — two replies: account-by-account read (Infiniti HR — monthly calls, SBR early fall, renewed 8/1; Nextep — bi-weekly calls, ~40k WSE growth goal, renews 9/1/2028; Genesis HR — child of Engage PEO; eEmployers — gauge next call; OnePoint — cold, include her) plus the XcelHR call invite. Consolidated reply is next.",
          "Lesha's roundup leads with the live Simploy thread; Eric's carries SubcontractorHub as shared status.",
        ],
      },
      {
        title: "Book coverage & what's next",
        bullets: [
          "HCM roster loaded from the 7/13 SF export: 19 active HCM clients mapped, 4 net-new accounts, 3 former customers excluded, ownership matched to SF; Cody Jensen's nine accounts carried under Whitney.",
          "Full book heat-scored; no-drop cadence on every thread (sent → reply logged → my response → archived; business-day check-ins).",
          "Next 48 hours: chase SubcontractorHub's reaction (closest to signature); lock the Simploy call; reply to Anika (XcelHR invite + Infiniti/Genesis angles); send remaining roundups.",
          "Asks: who tracks Vensure's customer acquisitions (sweep the book before more dead leads surface); refresh cadence for the SF HCM report + fuller export; confirm HCM data ownership with Cody inactive; conference-glasses shipping status for Chassie.",
        ],
      },
    ],
  },
];
