// The intelligence corpus, distilled per account — day-one intelligence for
// every surface before any new paste arrives. Facts are dated one-liners,
// money-redacted at authoring time (rule: no dollar figures, ever).
// Source: intelligence/ on main, ingested 7/27/2026. Refresh by committing
// new files there and re-distilling in session.

import type { DashNodeKey } from "@/lib/dashboard/stages";
import type { DealIntel } from "./types";

export type DigestEntry = {
  accountId: string;
  names: string[]; // account + dashboard-card aliases (prefix-matched)
  asOf: string; // date of distillation
  facts: string[]; // dated, redacted one-liners, newest first
  stage: DashNodeKey; // best-evidence stage
  intelSeed: Partial<DealIntel>;
};

const d = (src: string, at: string) => ({ src: `digest ${src}`, at });

export const DIGEST: DigestEntry[] = [
  {
    accountId: "ADVOCATEPAY000001",
    names: ["Advocate Pay", "Advocate Pay — SubcontractorHub"],
    asOf: "2026-07-27",
    facts: [
      "7/21 — Referral agreement + MSSA addendum sent to Bryce (Aleks cc'd); deposit reinstated under referral structure",
      "7/20 — Bryce chose REFERRAL over reseller: PrismHR contracts SubcontractorHub directly; Advocate Pay stays advisor",
      "7/15 — Implementation one-pager edits from Bryce: government-timing + notice-period caveats required on all timeline language",
      "7/7 — Demo delivered to SubcontractorHub (Justin/Jessica Brach, Nate, Renee, Elissa): Bulgaria EOR for IP is priority one; wire-fee relief second",
      "7/7 — Footprint: ~25 intl contractors — Bulgaria (IP focus), India (Justin owns 90% of that org), Philippines, Mexico, South Africa, 1 UK; one Bulgarian lives in Spain",
      "7/7 — Incumbent context: tried G-P via TriNet — integration failed; Sept 1 aggressive go-live target, staggered Bulgaria-first rollout possible",
    ],
    stage: "contract",
    intelSeed: {
      countries: [
        { value: "bg", ...d("demo", "2026-07-07") },
        { value: "in", ...d("demo", "2026-07-07") },
        { value: "ph", ...d("demo", "2026-07-07") },
        { value: "mx", ...d("demo", "2026-07-07") },
        { value: "za", ...d("demo", "2026-07-07") },
        { value: "gb", ...d("demo", "2026-07-07") },
        { value: "es", ...d("demo", "2026-07-07") },
      ],
      headcounts: [{ value: { n: 25 }, ...d("demo", "2026-07-07") }],
      products: [
        { value: "eor", ...d("demo", "2026-07-07") },
        { value: "contractor", ...d("demo", "2026-07-07") },
        { value: "wallet", ...d("demo", "2026-07-07") },
      ],
      chair: "referral",
      incumbent: { value: "Globalization Partners", ...d("demo", "2026-07-07") },
      timing: {
        value: { phrase: "Sept 1 target (aggressive)", dateIso: "2026-09-01" },
        ...d("demo", "2026-07-07"),
      },
      threads: {
        people: [
          "Bryce Rowley",
          "Andy Aziz",
          "Justin Brach",
          "Jessica Brach",
          "Nate Price",
          "Renee",
        ],
        execSeen: true,
        opsSeen: true,
      },
    },
  },
  {
    accountId: "001F000000w38ItIAI",
    names: ["Employer Services Corporation", "ESC"],
    asOf: "2026-07-27",
    facts: [
      "7/21 — Russ Jones personally scheduling the Canada call with Rachael Brown + Hatton (Wed/Thu/Fri options given)",
      "7/17 — Aleks → Rick Torrence: MPEX LICENSING structure ask — 2 independent Canadian entities, ~300 Ontario EEs to start, 4–5 companies/yr growth, employees-first with some contractor interest, TLM unknown",
      "7/16 — SECOND ESC track: Rachael Brown (VP Sales) has a separate prospect — Ontario branch ~25 EEs of ~120 total, time-sensitive",
      "7/15-21 — Hatton track: wants to OPERATE payroll on licensed tech, not buy per-client service; five money-flow questions drove the demo agenda",
    ],
    stage: "needs_analysis",
    intelSeed: {
      countries: [{ value: "ca", ...d("threads", "2026-07-17") }],
      headcounts: [
        { value: { n: 300, country: "ca" }, ...d("licensing memo", "2026-07-17") },
        { value: { n: 25, country: "ca" }, ...d("Rachael thread", "2026-07-16") },
      ],
      products: [
        { value: "mpex", ...d("licensing memo", "2026-07-17") },
        { value: "payroll", ...d("threads", "2026-07-16") },
      ],
      chair: "undecided",
      threads: {
        people: ["C. Hatton Humphrey", "Rachael Brown"],
        execSeen: true,
        opsSeen: false,
      },
    },
  },
  {
    accountId: "001F000000w38BOIAY",
    names: ["Simploy"],
    asOf: "2026-07-27",
    facts: [
      "7/21 — Chassie call: 2 India contractors to reclassify (gray-zone control); direction due to leadership AUG 6 (quarterly EOR review — a decision, not a go-live)",
      "7/21 — Chassie prefers RESALE (stay in the client relationship); has been referring global needs to G-P with no rev share",
      "7/21 — Demo set for week of 7/28 (Tue/Wed) with Katie (Dir Ops) + possibly CEO Carson; OWED: calendar options + recruitment-specialist intro",
      "7/9 — At least one Simploy client also has an India contractor on another provider",
    ],
    stage: "demo",
    intelSeed: {
      countries: [{ value: "in", ...d("call", "2026-07-21") }],
      headcounts: [{ value: { n: 2, country: "in" }, ...d("call", "2026-07-21") }],
      products: [
        { value: "eor", ...d("call", "2026-07-21") },
        { value: "contractor_plus", ...d("call", "2026-07-21") },
      ],
      chair: "resale",
      incumbent: { value: "Globalization Partners", ...d("call", "2026-07-21") },
      timing: {
        value: { phrase: "Aug 6 leadership review", dateIso: "2026-08-06" },
        ...d("call", "2026-07-21"),
      },
      threads: {
        people: ["Chassie Smith", "Katie", "Carson"],
        execSeen: true,
        opsSeen: true,
      },
    },
  },
  {
    accountId: "001F000000w38GlIAI",
    names: ["XCEL HR", "XCELHR"],
    asOf: "2026-07-27",
    facts: [
      "7/27 — Bill Laffey (VP) asked for a call THIS WEEK — Wednesday any time or Friday; wants relationship mechanics + pricing shape for an existing client/partner",
      "7/27 — Short-term Mexico opportunity behind it; he's pre-wiring how to pitch his client",
      "7/1 — Shane framed EOR + contractor support; Mexico is the country in play",
    ],
    stage: "first_meeting",
    intelSeed: {
      countries: [{ value: "mx", ...d("thread", "2026-07-27") }],
      products: [
        { value: "eor", ...d("thread", "2026-07-01") },
        { value: "contractor", ...d("thread", "2026-07-01") },
      ],
      chair: "undecided",
      timing: {
        value: { phrase: "call requested this week (Wed/Fri)", dateIso: "2026-07-29" },
        ...d("thread", "2026-07-27"),
      },
      threads: { people: ["Bill Laffey"], execSeen: true, opsSeen: false },
    },
  },
  {
    accountId: "001F000000w38OIIAY",
    names: ["Infiniti HR"],
    asOf: "2026-07-27",
    facts: [
      "7/8 — Play: consolidate their G-P global layer onto the PrismHR platform they already run domestically; renewal timing is the trigger — Anika asked for her read",
    ],
    stage: "investigate",
    intelSeed: {
      products: [{ value: "eor", ...d("thread", "2026-07-08") }],
      incumbent: { value: "Globalization Partners", ...d("thread", "2026-07-08") },
      chair: "undecided",
      threads: { people: [], execSeen: false, opsSeen: false },
    },
  },
  {
    accountId: "001F000000w38OpIAI",
    names: ["Nextep, Inc.", "Nextep"],
    asOf: "2026-07-27",
    facts: [
      "7/8 — Same play as Infiniti: domestic on PrismHR, global via G-P — consolidation angle; renewal timing unknown",
    ],
    stage: "investigate",
    intelSeed: {
      products: [{ value: "eor", ...d("thread", "2026-07-08") }],
      incumbent: { value: "Globalization Partners", ...d("thread", "2026-07-08") },
      chair: "undecided",
      threads: { people: [], execSeen: false, opsSeen: false },
    },
  },
  {
    accountId: "001F000000w38JqIAI",
    names: ["Genesis HR Solutions, Inc.", "Genesis HR Solutions"],
    asOf: "2026-07-27",
    facts: [
      "7/8 — Early signal: hiring across borders with NO EOR in place — a clean greenfield introduction, not a switch",
    ],
    stage: "investigate",
    intelSeed: {
      chair: "undecided",
      threads: { people: [], execSeen: false, opsSeen: false },
    },
  },
  {
    accountId: "001F000000w38OsIAI",
    names: ["eEmployers Solutions, Inc.", "eEmployers"],
    asOf: "2026-07-27",
    facts: [
      "7/8 — No specific global signal yet; profile fits — gauge where they hire and how they pay international workers before working it",
    ],
    stage: "investigate",
    intelSeed: {
      chair: "undecided",
      threads: { people: [], execSeen: false, opsSeen: false },
    },
  },
];

export function digestFor(accountId: string): DigestEntry | undefined {
  return DIGEST.find((e) => e.accountId === accountId);
}

// Dashboard cards are keyed by NAME — match exact book name or any digest
// alias as a case-insensitive prefix ("Advocate Pay — SubcontractorHub").
export function digestForCardName(cardName: string): DigestEntry | undefined {
  const n = cardName.trim().toLowerCase();
  return DIGEST.find((e) =>
    e.names.some((a) => n === a.toLowerCase() || n.startsWith(a.toLowerCase())),
  );
}
