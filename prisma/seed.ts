import nextEnv from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  ApprovalStatus,
  BoundaryRuleStatus,
  BoundaryRuleType,
  BoundaryScopeType,
  BoundarySeverity,
  CanonStatus,
  CsmPartnerStatus,
  DailyServeCategory,
  DailyServeOutcome,
  DailyServeStatus,
  EvidenceType,
  FollowUpPromiseStatus,
  HmlCategory,
  HmlValue,
  InternalUnknownStatus,
  NoteSensitivity,
  NoteType,
  OpportunitySourceType,
  OpportunityStage,
  PermissionState,
  PitchAssetType,
  PitchAudience,
  Prisma,
  PrismaClient,
  ProductRelevance,
  SourceConfidence,
  TerritoryAccountStatus,
  UnknownCategory,
  UserRole,
} from "../src/generated/prisma/client";
import {
  classifyBoundaryRisk,
  classifyCsmRelationship,
  classifyDailyServeOpportunityImpact,
  classifyDailyServeRelationshipImpact,
  classifyFollowUpUrgency,
  classifyInternalAmbiguity,
  classifyOpportunityMomentum,
  classifyPeoProtectiveness,
  classifyPeoReadiness,
  classifyProspectField,
  type HmlClassificationDraft,
} from "../src/lib/hml";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const connectionString = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
  }),
});

const dayMs = 24 * 60 * 60 * 1000;
const demoShareability = "demo_seed";
const researchRoot = "https://research.fieldsignal.example";
const legacyResearchRoot = "https://demo.fieldsignal.local";

const accountNames = [
  "Halsted Robotics Works",
  "Lakeshore Clinical Staffing",
  "Aurora Packaging Systems",
  "Northbrook SaaS Labs",
  "Elgin Precision Foods",
];
const partnerEmails = [
  "maya.chen@fieldsignal.example",
  "jordan.ellis@fieldsignal.example",
  "priya.shah@fieldsignal.example",
];
const legacyPartnerEmails = [
  "maya.chen@demo.fieldsignal.local",
  "jordan.ellis@demo.fieldsignal.local",
  "priya.shah@demo.fieldsignal.local",
];
const cleanupPartnerEmails = [...partnerEmails, ...legacyPartnerEmails];
const peoNames = [
  "Prairie Harbor PEO",
  "Midwest Works Alliance",
  "Lakefront People Partners",
];
const peoClientNames = [
  "Anonymized Medical Device Manufacturer",
  "Anonymized Logistics Client",
  "Anonymized Fintech Support Center",
  "Anonymized Food Production Group",
];
const frameworkTitles = [
  "Global Contractor Readiness Brief",
  "EOR Trigger Discovery Map",
  "Cross-Border Payroll Risk Screen",
];
const pitchAssetTitles = [
  "CSM-safe contractor complexity blurb",
  "PEO client discovery opener",
  "Global payroll watchout response",
  "Meeting prep note for trust path",
  "Contractor Management Plus use-case brief",
];
const opportunityNames = [
  "Halsted Robotics contractor compliance review",
  "Lakeshore clinical hiring context path",
  "Prairie Harbor global payroll readiness",
  "Northbrook SaaS expansion desk",
];
const followUpPromises = [
  "Send Maya a concise Halsted research brief for channel review.",
  "Confirm Jordan's preferred path for Lakeshore clinical staffing context.",
  "Prepare Priya's payroll readiness questions before the next PEO check-in.",
  "Review Aurora hold with owner before any account motion.",
];
const boundaryTitles = [
  "Aurora packaging review requires owner clearance",
  "Prairie Harbor intro path needs Maya context",
  "Lakeshore must stay channel-led",
  "Northbrook can move only through approved CSM path",
];
const dailyServeTitles = [
  "Contractor compliance watchout for Maya",
  "Chicagoland hiring trigger scan",
  "Payroll risk question for Prairie Harbor",
  "Northbrook meeting prep thread",
  "Aurora hold-safe research note",
];
const unknownQuestions = [
  "Can Aurora be stored by real client name if a CSM validates the account?",
  "Which CSM owns the Lakeshore clinical staffing intro path?",
  "What final wording should Contractor Management Plus use for PEO-led discovery?",
  "Should stale public evidence automatically lower source confidence?",
];
const evidenceTitles = [
  "Halsted hiring and contractor signals",
  "Halsted deployment complexity",
  "Lakeshore staffing demand",
  "Aurora boundary review",
  "Northbrook distributed hiring",
  "Elgin seasonal hiring",
];

type Tx = Prisma.TransactionClient;
type IdMap = Map<string, string>;
type SeedStats = {
  boundaryRules: number;
  csmPartners: number;
  dailyServes: number;
  discoveryFrameworks: number;
  evidence: number;
  followUpPromises: number;
  hmlClassifications: number;
  internalUnknowns: number;
  notes: number;
  opportunities: number;
  peoClients: number;
  peos: number;
  permissionHistory: number;
  pitchAssets: number;
  territoryAccounts: number;
  users: number;
};

type DeleteStats = Partial<Record<keyof SeedStats, number>>;

type AccountSeed = {
  boundaryRisk: HmlValue;
  category: string;
  channelSignal: HmlValue;
  city: string;
  companyName: string;
  complexitySignal: HmlValue;
  contractorSignal: HmlValue;
  evidence: Array<{
    capturedClaim: string;
    confidence: SourceConfidence;
    sourceDateOffset: number;
    staleAfterOffset: number;
    title: string;
    type: EvidenceType;
    urlPath: string;
  }>;
  fitSummary: string;
  hiringSignal: HmlValue;
  internationalSignal: HmlValue;
  nextSafestAction: string;
  note: string;
  permissionReason: string;
  permissionState: PermissionState;
  productRelevance: ProductRelevance[];
  sourceConfidence: SourceConfidence;
  status: TerritoryAccountStatus;
  website: string;
};

type PartnerSeed = {
  communicationCadence: string;
  dosAndDonts: string;
  email: string;
  name: string;
  nextSafestAction: string;
  note: string;
  permissionState: PermissionState;
  preferredFollowupMotion: string;
  preferredIntroMotion: string;
  privateDebriefRequired: boolean;
  protectivenessLevel: HmlValue;
  relationshipHeat: HmlValue;
  sourceConfidence: SourceConfidence;
  status: CsmPartnerStatus;
  trustSurfaceNotes: string;
};

type PeoSeed = {
  boundaryRisk: HmlValue;
  clientBaseNotes: string;
  csmPartnerEmail: string;
  globalFitSignals: string;
  industryFocus: string;
  name: string;
  nextSafestAction: string;
  note: string;
  offLimitsSummary?: string;
  permissionState: PermissionState;
  protectivenessLevel: HmlValue;
  publicResearchSummary: string;
  readinessLevel: HmlValue;
  sourceConfidence: SourceConfidence;
  website: string;
};

function daysFromNow(days: number) {
  return new Date(Date.now() + days * dayMs);
}

function scoreAccount(seed: AccountSeed) {
  return classifyProspectField({
    boundaryRisk: seed.boundaryRisk,
    channelSignal: seed.channelSignal,
    complexitySignal: seed.complexitySignal,
    contractorSignal: seed.contractorSignal,
    hiringSignal: seed.hiringSignal,
    internationalSignal: seed.internationalSignal,
    permissionState: seed.permissionState,
    sourceConfidence: seed.sourceConfidence,
  });
}

async function createHml(
  tx: Tx,
  draft: HmlClassificationDraft,
  target: Pick<
    Prisma.HmlClassificationUncheckedCreateInput,
    | "accountId"
    | "csmPartnerId"
    | "dailyServeId"
    | "internalUnknownId"
    | "opportunityId"
    | "peoId"
  >,
  stats: SeedStats,
) {
  await tx.hmlClassification.create({
    data: {
      ...draft,
      ...target,
    },
  });
  stats.hmlClassifications += 1;
}

async function createSourceConfidenceHml(
  tx: Tx,
  input: {
    accountId: string;
    accountName: string;
    confidence: SourceConfidence;
    evidenceCount: number;
    classification: HmlValue;
  },
  stats: SeedStats,
) {
  await tx.hmlClassification.create({
    data: {
      accountId: input.accountId,
      category: HmlCategory.SOURCE_CONFIDENCE,
      classification: input.classification,
      confidence: input.confidence,
      contributingSignals: [
        `source_confidence:${input.confidence}`,
        `evidence_count:${input.evidenceCount}`,
      ],
      explanation: `${input.classification} source confidence: ${input.accountName} has ${input.evidenceCount} source evidence item(s) at ${input.confidence.toLowerCase().replaceAll("_", " ")} confidence.`,
      recommendedNextAction:
        input.classification === HmlValue.HIGH
          ? "Use the evidence in the channel-safe brief."
          : "Strengthen source evidence before relying on the account.",
      ruleVersion: "v0.1-source-confidence",
    },
  });
  stats.hmlClassifications += 1;
}

async function deleteDemoData(tx: Tx): Promise<DeleteStats> {
  const hmlClassifications = await tx.hmlClassification.deleteMany({
    where: {
      OR: [
        {
          contributingSignals: {
            has: "demo_seed",
          },
        },
        {
          account: {
            companyName: {
              in: accountNames,
            },
          },
        },
        {
          csmPartner: {
            email: {
              in: cleanupPartnerEmails,
            },
          },
        },
        {
          dailyServe: {
            title: {
              in: dailyServeTitles,
            },
          },
        },
        {
          internalUnknown: {
            question: {
              in: unknownQuestions,
            },
          },
        },
        {
          opportunity: {
            name: {
              in: opportunityNames,
            },
          },
        },
        {
          peo: {
            name: {
              in: peoNames,
            },
          },
        },
      ],
    },
  });
  const followUps = await tx.followUpPromise.deleteMany({
    where: {
      promise: {
        in: followUpPromises,
      },
    },
  });
  const dailyServes = await tx.dailyServe.deleteMany({
    where: {
      title: {
        in: dailyServeTitles,
      },
    },
  });
  const boundaries = await tx.boundaryRule.deleteMany({
    where: {
      title: {
        in: boundaryTitles,
      },
    },
  });
  const unknowns = await tx.internalUnknown.deleteMany({
    where: {
      question: {
        in: unknownQuestions,
      },
    },
  });
  const notes = await tx.note.deleteMany({
    where: {
      shareability: demoShareability,
    },
  });
  const evidence = await tx.sourceEvidence.deleteMany({
    where: {
      OR: [
        {
          AND: [
            {
              title: {
                in: evidenceTitles,
              },
            },
            {
              account: {
                companyName: {
                  in: accountNames,
                },
              },
            },
          ],
        },
        {
          AND: [
            {
              account: {
                companyName: {
                  in: accountNames,
                },
              },
            },
            {
              OR: [
                {
                  title: {
                    startsWith: "Research fixture:",
                  },
                },
                {
                  url: {
                    startsWith: researchRoot,
                  },
                },
                {
                  url: {
                    startsWith: legacyResearchRoot,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  });
  const opportunities = await tx.opportunity.deleteMany({
    where: {
      name: {
        in: opportunityNames,
      },
    },
  });
  const peoClients = await tx.pEOClient.deleteMany({
    where: {
      OR: [
        {
          displayName: {
            in: peoClientNames,
          },
        },
        {
          peo: {
            name: {
              in: peoNames,
            },
          },
        },
      ],
    },
  });
  const peos = await tx.pEO.deleteMany({
    where: {
      name: {
        in: peoNames,
      },
    },
  });
  const partners = await tx.cSMPartner.deleteMany({
    where: {
      email: {
        in: cleanupPartnerEmails,
      },
    },
  });
  const accounts = await tx.territoryAccount.deleteMany({
    where: {
      OR: [
        {
          companyName: {
            in: accountNames,
          },
        },
        {
          companyName: "Placeholder Chicagoland Prospect",
        },
      ],
    },
  });
  const frameworks = await tx.discoveryFramework.deleteMany({
    where: {
      title: {
        in: frameworkTitles,
      },
    },
  });
  const pitchAssets = await tx.pitchAsset.deleteMany({
    where: {
      title: {
        in: pitchAssetTitles,
      },
    },
  });

  return {
    boundaryRules: boundaries.count,
    csmPartners: partners.count,
    dailyServes: dailyServes.count,
    discoveryFrameworks: frameworks.count,
    evidence: evidence.count,
    followUpPromises: followUps.count,
    hmlClassifications: hmlClassifications.count,
    internalUnknowns: unknowns.count,
    notes: notes.count,
    opportunities: opportunities.count,
    peoClients: peoClients.count,
    peos: peos.count,
    pitchAssets: pitchAssets.count,
    territoryAccounts: accounts.count,
  };
}

const accountSeeds: AccountSeed[] = [
  {
    boundaryRisk: HmlValue.LOW,
    category: "Industrial automation",
    channelSignal: HmlValue.HIGH,
    city: "Chicago",
    companyName: "Halsted Robotics Works",
    complexitySignal: HmlValue.HIGH,
    contractorSignal: HmlValue.HIGH,
    evidence: [
      {
        capturedClaim:
          "Public job activity and site language indicate distributed technical hiring and contractor-heavy implementation work.",
        confidence: SourceConfidence.STRONG,
        sourceDateOffset: -6,
        staleAfterOffset: 45,
        title: "Halsted hiring and contractor signals",
        type: EvidenceType.PUBLIC_WEB,
        urlPath: "/halsted-robotics/hiring-signal",
      },
      {
        capturedClaim:
          "Public product language points to regulated field deployment and cross-border support needs.",
        confidence: SourceConfidence.MEDIUM,
        sourceDateOffset: -12,
        staleAfterOffset: 30,
        title: "Halsted deployment complexity",
        type: EvidenceType.COMPANY_SITE,
        urlPath: "/halsted-robotics/deployment-complexity",
      },
    ],
    fitSummary:
      "High-value Chicagoland prospect with contractor intensity, operational complexity, and a plausible channel path.",
    hiringSignal: HmlValue.MEDIUM,
    internationalSignal: HmlValue.MEDIUM,
    nextSafestAction:
      "Ask Maya for channel context and prepare a CSM-safe research brief before account motion.",
    note: "Halsted should be treated as a channel-led prospect: strong enough for research, not safe enough for unsponsored motion.",
    permissionReason:
      "Public research is sufficient for prep; CSM context is needed before any account motion.",
    permissionState: PermissionState.CSM_CONTEXT_NEEDED,
    productRelevance: [
      ProductRelevance.CONTRACTOR_MANAGEMENT_PLUS,
      ProductRelevance.EOR,
      ProductRelevance.GLOBAL_PAYROLL,
    ],
    sourceConfidence: SourceConfidence.STRONG,
    status: TerritoryAccountStatus.READY_FOR_REVIEW,
    website: `${researchRoot}/halsted-robotics`,
  },
  {
    boundaryRisk: HmlValue.MEDIUM,
    category: "Healthcare staffing",
    channelSignal: HmlValue.MEDIUM,
    city: "Evanston",
    companyName: "Lakeshore Clinical Staffing",
    complexitySignal: HmlValue.HIGH,
    contractorSignal: HmlValue.HIGH,
    evidence: [
      {
        capturedClaim:
          "Public research shows recurring clinical staffing demand and multi-state assignment language.",
        confidence: SourceConfidence.MEDIUM,
        sourceDateOffset: -18,
        staleAfterOffset: 20,
        title: "Lakeshore staffing demand",
        type: EvidenceType.JOB_POSTING,
        urlPath: "/lakeshore-clinical/staffing-demand",
      },
    ],
    fitSummary:
      "Useful staffing signal, but the relationship owner and safe channel path need to be established first.",
    hiringSignal: HmlValue.HIGH,
    internationalSignal: HmlValue.LOW,
    nextSafestAction:
      "Confirm Jordan's ownership and keep research in a channel-led posture.",
    note: "Lakeshore has real qualification signals, but the safe path depends on relationship ownership.",
    permissionReason:
      "Healthcare staffing context is sensitive enough to keep this research-only until ownership is clear.",
    permissionState: PermissionState.RESEARCH_ONLY,
    productRelevance: [
      ProductRelevance.CONTRACTOR_MANAGEMENT,
      ProductRelevance.CONTRACTOR_MANAGEMENT_PLUS,
    ],
    sourceConfidence: SourceConfidence.MEDIUM,
    status: TerritoryAccountStatus.WATCH,
    website: `${researchRoot}/lakeshore-clinical`,
  },
  {
    boundaryRisk: HmlValue.HIGH,
    category: "Packaging manufacturing",
    channelSignal: HmlValue.LOW,
    city: "Aurora",
    companyName: "Aurora Packaging Systems",
    complexitySignal: HmlValue.HIGH,
    contractorSignal: HmlValue.MEDIUM,
    evidence: [
      {
        capturedClaim:
          "Research record suggests contractor and production complexity, but owner clearance is required before naming or moving the account.",
        confidence: SourceConfidence.CONFIRMED,
        sourceDateOffset: -4,
        staleAfterOffset: 60,
        title: "Aurora boundary review",
        type: EvidenceType.INTERNAL_NOTE,
        urlPath: "/aurora-packaging/boundary-review",
      },
    ],
    fitSummary:
      "Strong product relevance held behind a hard boundary until owner clearance is recorded.",
    hiringSignal: HmlValue.MEDIUM,
    internationalSignal: HmlValue.HIGH,
    nextSafestAction:
      "Resolve owner clearance before this account is used in any operating motion.",
    note: "Aurora is intentionally held as a boundary-heavy prospect so blocked workflows are visible.",
    permissionReason: "Owner clearance is required before account name use or motion.",
    permissionState: PermissionState.HOLD_SENSITIVE,
    productRelevance: [
      ProductRelevance.EOR,
      ProductRelevance.GLOBAL_PAYROLL,
      ProductRelevance.CROSS_BORDER_RECRUITING,
    ],
    sourceConfidence: SourceConfidence.CONFIRMED,
    status: TerritoryAccountStatus.PARKED,
    website: `${researchRoot}/aurora-packaging`,
  },
  {
    boundaryRisk: HmlValue.LOW,
    category: "B2B SaaS",
    channelSignal: HmlValue.HIGH,
    city: "Northbrook",
    companyName: "Northbrook SaaS Labs",
    complexitySignal: HmlValue.MEDIUM,
    contractorSignal: HmlValue.MEDIUM,
    evidence: [
      {
        capturedClaim:
          "Public company profile shows distributed implementation hiring and global payroll questions.",
        confidence: SourceConfidence.STRONG,
        sourceDateOffset: -9,
        staleAfterOffset: 50,
        title: "Northbrook distributed hiring",
        type: EvidenceType.COMPANY_SITE,
        urlPath: "/northbrook-saas/distributed-hiring",
      },
    ],
    fitSummary:
      "Clean account for approved CSM-led discussion, especially around EOR and payroll expansion.",
    hiringSignal: HmlValue.HIGH,
    internationalSignal: HmlValue.HIGH,
    nextSafestAction:
      "Use the approved CSM path and prepare meeting context from the pitch rail.",
    note: "Northbrook gives the operating desk a cleaner high-priority path with permission already open through a CSM.",
    permissionReason:
      "CSM has approved a discussion path; continue to avoid any motion outside that channel.",
    permissionState: PermissionState.CSM_APPROVED_FOR_DISCUSSION,
    productRelevance: [ProductRelevance.EOR, ProductRelevance.GLOBAL_PAYROLL],
    sourceConfidence: SourceConfidence.STRONG,
    status: TerritoryAccountStatus.READY_FOR_REVIEW,
    website: `${researchRoot}/northbrook-saas`,
  },
  {
    boundaryRisk: HmlValue.LOW,
    category: "Food production",
    channelSignal: HmlValue.MEDIUM,
    city: "Elgin",
    companyName: "Elgin Precision Foods",
    complexitySignal: HmlValue.MEDIUM,
    contractorSignal: HmlValue.LOW,
    evidence: [
      {
        capturedClaim:
          "Research record suggests seasonal hiring, operational complexity, and no clear international signal yet.",
        confidence: SourceConfidence.LOW,
        sourceDateOffset: -44,
        staleAfterOffset: -3,
        title: "Elgin seasonal hiring",
        type: EvidenceType.PUBLIC_WEB,
        urlPath: "/elgin-foods/seasonal-hiring",
      },
    ],
    fitSummary:
      "Low-confidence watch account that needs fresher public evidence before it gets operating weight.",
    hiringSignal: HmlValue.MEDIUM,
    internationalSignal: HmlValue.LOW,
    nextSafestAction: "Refresh source evidence and keep the account in watch posture.",
    note: "Elgin exists to exercise stale evidence and low-confidence sorting in Prospect Field.",
    permissionReason:
      "Research-only posture remains appropriate until source confidence improves.",
    permissionState: PermissionState.RESEARCH_ONLY,
    productRelevance: [ProductRelevance.CONTRACTOR_MANAGEMENT],
    sourceConfidence: SourceConfidence.LOW,
    status: TerritoryAccountStatus.WATCH,
    website: `${researchRoot}/elgin-foods`,
  },
];

const partnerSeeds: PartnerSeed[] = [
  {
    communicationCadence: "Weekly operating check-in",
    dosAndDonts:
      "Do send concise research briefs. Do not surprise the account team with unreviewed account motion.",
    email: partnerEmails[0],
    name: "Maya Chen",
    nextSafestAction: "Send Maya the Halsted brief and ask for channel context.",
    note: "Maya is the high-trust partner for a warm but still permission-aware path.",
    permissionState: PermissionState.CSM_APPROVED_FOR_DISCUSSION,
    preferredFollowupMotion: "Short written brief with one explicit ask",
    preferredIntroMotion: "CSM-led context note first",
    privateDebriefRequired: true,
    protectivenessLevel: HmlValue.MEDIUM,
    relationshipHeat: HmlValue.HIGH,
    sourceConfidence: SourceConfidence.STRONG,
    status: CsmPartnerStatus.ACTIVE,
    trustSurfaceNotes:
      "Prefers compact, evidence-led context and clear boundary language.",
  },
  {
    communicationCadence: "Biweekly, async first",
    dosAndDonts:
      "Do ask for ownership context. Do not position research as a recommendation before the owner is clear.",
    email: partnerEmails[1],
    name: "Jordan Ellis",
    nextSafestAction:
      "Ask Jordan whether Lakeshore belongs to a protected relationship lane.",
    note: "Jordan keeps sensitive staffing records channel-led until ownership is confirmed.",
    permissionState: PermissionState.CSM_CONTEXT_NEEDED,
    preferredFollowupMotion: "One-line ownership question with a source link",
    preferredIntroMotion: "Ownership validation before account discussion",
    privateDebriefRequired: true,
    protectivenessLevel: HmlValue.HIGH,
    relationshipHeat: HmlValue.MEDIUM,
    sourceConfidence: SourceConfidence.MEDIUM,
    status: CsmPartnerStatus.WATCH,
    trustSurfaceNotes:
      "Protective of client context and sensitive staffing relationships.",
  },
  {
    communicationCadence: "Monthly planning review",
    dosAndDonts:
      "Do bring use-case maps. Do not skip PEO readiness context before client-specific discussion.",
    email: partnerEmails[2],
    name: "Priya Shah",
    nextSafestAction: "Prepare global payroll questions for Priya's PEO planning review.",
    note: "Priya anchors the PEO-led path and gives the operating desk a strong partner-to-PEO motion.",
    permissionState: PermissionState.CSM_APPROVED_FOR_INTRO,
    preferredFollowupMotion: "Agenda note with decision-ready options",
    preferredIntroMotion: "PEO planning context, then account-specific questions",
    privateDebriefRequired: false,
    protectivenessLevel: HmlValue.MEDIUM,
    relationshipHeat: HmlValue.HIGH,
    sourceConfidence: SourceConfidence.CONFIRMED,
    status: CsmPartnerStatus.ACTIVE,
    trustSurfaceNotes:
      "Comfortable with PEO context when the safest action and boundary posture are explicit.",
  },
];

const peoSeeds: PeoSeed[] = [
  {
    boundaryRisk: HmlValue.LOW,
    clientBaseNotes:
      "Mid-market manufacturing and technology clients with contractor and payroll complexity.",
    csmPartnerEmail: partnerEmails[0],
    globalFitSignals:
      "Several clients show contractor classification, implementation staffing, and distributed workforce questions.",
    industryFocus: "Manufacturing and field services",
    name: peoNames[0],
    nextSafestAction:
      "Ask Maya which Prairie Harbor client themes are safe for a planning discussion.",
    note: "Prairie Harbor creates a warm PEO room connected to Halsted and payroll readiness.",
    permissionState: PermissionState.CSM_APPROVED_FOR_DISCUSSION,
    protectivenessLevel: HmlValue.MEDIUM,
    publicResearchSummary:
      "PEO profile with strong contractor and payroll complexity fit.",
    readinessLevel: HmlValue.HIGH,
    sourceConfidence: SourceConfidence.STRONG,
    website: `${researchRoot}/prairie-harbor-peo`,
  },
  {
    boundaryRisk: HmlValue.MEDIUM,
    clientBaseNotes:
      "Healthcare, staffing, and light industrial clients where protected relationship context matters.",
    csmPartnerEmail: partnerEmails[1],
    globalFitSignals:
      "Client base may surface contractor management needs, but the path is ownership-sensitive.",
    industryFocus: "Healthcare staffing and light industrial",
    name: peoNames[1],
    nextSafestAction:
      "Hold client-specific motion until Jordan confirms relationship ownership.",
    note: "Midwest Works exercises cautious PEO readiness and protectiveness.",
    permissionState: PermissionState.CSM_CONTEXT_NEEDED,
    protectivenessLevel: HmlValue.HIGH,
    publicResearchSummary:
      "PEO profile with useful staffing signals and unresolved ownership boundaries.",
    readinessLevel: HmlValue.MEDIUM,
    sourceConfidence: SourceConfidence.MEDIUM,
    website: `${researchRoot}/midwest-works-alliance`,
  },
  {
    boundaryRisk: HmlValue.LOW,
    clientBaseNotes:
      "Software, fintech support, and services clients with multi-country workforce pressure.",
    csmPartnerEmail: partnerEmails[2],
    globalFitSignals:
      "Strong fit for global payroll and EOR education through PEO-led discovery.",
    industryFocus: "Technology services",
    name: peoNames[2],
    nextSafestAction:
      "Use Priya's planning review to test global payroll readiness questions.",
    note: "Lakefront People Partners provides the cleanest PEO-led global payroll scenario.",
    permissionState: PermissionState.PEO_ENGAGED,
    protectivenessLevel: HmlValue.MEDIUM,
    publicResearchSummary:
      "PEO profile with global workforce and payroll readiness signals.",
    readinessLevel: HmlValue.HIGH,
    sourceConfidence: SourceConfidence.CONFIRMED,
    website: `${researchRoot}/lakefront-people-partners`,
  },
];

async function seedFrameworksAndAssets(tx: Tx, stats: SeedStats) {
  const frameworks = new Map<string, string>();
  const assets = new Map<string, string>();
  const frameworkData: Prisma.DiscoveryFrameworkUncheckedCreateInput[] = [
    {
      approvalStatus: ApprovalStatus.OWNER_APPROVED,
      approvedBy: "Antaeus",
      audience: PitchAudience.CSM,
      boundaryNotes:
        "Use for research and CSM-led context only; never skip permission posture.",
      canonStatus: CanonStatus.CANON,
      demoFocus:
        "Expose contractor intensity, evidence quality, and safest channel path in one brief.",
      discoveryQuestions: [
        "Where is contractor classification becoming operationally risky?",
        "Which work is project-based, cross-border, or tied to implementation timelines?",
        "Who owns the safest channel path?",
      ],
      disqualificationSignals: [
        "No contractor workforce",
        "No permission owner",
        "Source evidence cannot be refreshed",
      ],
      productRelevance: ProductRelevance.CONTRACTOR_MANAGEMENT_PLUS,
      sourceConfidence: SourceConfidence.STRONG,
      title: frameworkTitles[0],
      triggerSignals: ["contractor:HIGH", "complexity:HIGH", "source_confidence:STRONG"],
      useCase: "CSM-safe discovery for contractor-heavy Chicagoland prospects.",
    },
    {
      approvalStatus: ApprovalStatus.OWNER_APPROVED,
      approvedBy: "Antaeus",
      audience: PitchAudience.CSM,
      boundaryNotes: "Keep EOR positioning tied to verified hiring or expansion signals.",
      canonStatus: CanonStatus.CANON,
      demoFocus:
        "Turn hiring, global activity, and payroll complexity into a safe EOR question set.",
      discoveryQuestions: [
        "Where is the company hiring outside its current operating footprint?",
        "Which roles need employment support instead of contractor support?",
        "What risk would make the current model break?",
      ],
      disqualificationSignals: [
        "Domestic-only hiring",
        "No hiring velocity",
        "Account owner blocks discussion",
      ],
      productRelevance: ProductRelevance.EOR,
      sourceConfidence: SourceConfidence.STRONG,
      title: frameworkTitles[1],
      triggerSignals: ["international:HIGH", "hiring:HIGH"],
      useCase: "EOR trigger discovery for approved CSM-led account paths.",
    },
    {
      approvalStatus: ApprovalStatus.NEEDS_OWNER_REVIEW,
      audience: PitchAudience.INTERNAL,
      boundaryNotes:
        "Internal screen only until pricing/legal language is owner-approved.",
      canonStatus: CanonStatus.HYPOTHESIS,
      demoFocus:
        "Separate payroll complexity from claims that require legal or pricing review.",
      discoveryQuestions: [
        "Which countries create payroll operating friction?",
        "Which payroll questions are public research versus private client context?",
        "What claims need owner approval before reuse?",
      ],
      disqualificationSignals: [
        "No cross-border payroll",
        "Only inferred evidence",
        "Unclear relationship owner",
      ],
      productRelevance: ProductRelevance.GLOBAL_PAYROLL,
      sourceConfidence: SourceConfidence.MEDIUM,
      title: frameworkTitles[2],
      triggerSignals: ["international:MEDIUM", "complexity:HIGH"],
      useCase: "Internal global payroll readiness screen.",
    },
  ];

  for (const data of frameworkData) {
    const created = await tx.discoveryFramework.create({ data });
    frameworks.set(created.title, created.id);
    stats.discoveryFrameworks += 1;
  }

  const assetData: Prisma.PitchAssetUncheckedCreateInput[] = [
    {
      approvalStatus: ApprovalStatus.OWNER_APPROVED,
      approvedBy: "Antaeus",
      assetType: PitchAssetType.CSM_SAFE_BLURB,
      audience: PitchAudience.CSM,
      canonStatus: CanonStatus.CANON,
      content:
        "This account appears to have enough public contractor and complexity signal to justify a channel-safe context check. The ask is not to move the account; it is to validate the safe path.",
      productRelevance: ProductRelevance.CONTRACTOR_MANAGEMENT_PLUS,
      sourceConfidence: SourceConfidence.STRONG,
      title: pitchAssetTitles[0],
      usageNotes:
        "Use when the CSM owns the trust path and the account is not yet intro-ready.",
    },
    {
      approvalStatus: ApprovalStatus.OWNER_APPROVED,
      approvedBy: "Antaeus",
      assetType: PitchAssetType.DISCOVERY_CHEAT_SHEET,
      audience: PitchAudience.PEO,
      canonStatus: CanonStatus.CANON,
      content:
        "When a PEO client has seasonal hiring, contractor projects, or cross-state work, ask which work patterns are becoming hard to support inside current HR operations.",
      productRelevance: ProductRelevance.CONTRACTOR_MANAGEMENT,
      sourceConfidence: SourceConfidence.STRONG,
      title: pitchAssetTitles[1],
      usageNotes:
        "Keep client names anonymized until the PEO or CSM gives explicit permission.",
    },
    {
      approvalStatus: ApprovalStatus.NEEDS_OWNER_REVIEW,
      assetType: PitchAssetType.OBJECTION_RESPONSE,
      audience: PitchAudience.CSM,
      canonStatus: CanonStatus.HYPOTHESIS,
      content:
        "Global payroll value should be framed as operational clarity, not a legal conclusion. Confirm wording before reuse in sensitive contexts.",
      productRelevance: ProductRelevance.GLOBAL_PAYROLL,
      sourceConfidence: SourceConfidence.MEDIUM,
      title: pitchAssetTitles[2],
      usageNotes: "Needs owner review before broad operator use.",
    },
    {
      approvalStatus: ApprovalStatus.OWNER_APPROVED,
      approvedBy: "Antaeus",
      assetType: PitchAssetType.MEETING_PREP_NOTE,
      audience: PitchAudience.CSM,
      canonStatus: CanonStatus.CANON,
      content:
        "Start with the relationship owner, source confidence, known boundary, and next safest action. Then discuss product relevance only after the trust path is clear.",
      productRelevance: ProductRelevance.EOR,
      sourceConfidence: SourceConfidence.CONFIRMED,
      title: pitchAssetTitles[3],
      usageNotes: "Use for Northbrook and other approved CSM-led discussions.",
    },
    {
      approvalStatus: ApprovalStatus.OWNER_APPROVED,
      approvedBy: "Antaeus",
      assetType: PitchAssetType.USE_CASE_BRIEF,
      audience: PitchAudience.CSM,
      canonStatus: CanonStatus.CANON,
      content:
        "Contractor Management Plus is strongest when contractor intensity, operating complexity, and evidence quality all point to a real workflow problem.",
      productRelevance: ProductRelevance.CONTRACTOR_MANAGEMENT_PLUS,
      sourceConfidence: SourceConfidence.STRONG,
      title: pitchAssetTitles[4],
      usageNotes:
        "Use after source confidence has been strengthened and permission posture is visible.",
    },
  ];

  for (const data of assetData) {
    const created = await tx.pitchAsset.create({ data });
    assets.set(created.title, created.id);
    stats.pitchAssets += 1;
  }

  return { assets, frameworks };
}

async function seedAccounts(tx: Tx, ownerId: string, stats: SeedStats) {
  const accounts: IdMap = new Map();

  for (const seed of accountSeeds) {
    const hml = scoreAccount(seed);
    const account = await tx.territoryAccount.create({
      data: {
        boundaryRisk: seed.boundaryRisk,
        canonStatus: CanonStatus.HYPOTHESIS,
        category: seed.category,
        channelSignal: seed.channelSignal,
        city: seed.city,
        companyName: seed.companyName,
        complexitySignal: seed.complexitySignal,
        contractorSignal: seed.contractorSignal,
        fitSummary: seed.fitSummary,
        hiringSignal: seed.hiringSignal,
        internationalSignal: seed.internationalSignal,
        lastReviewedAt: daysFromNow(-1),
        nextSafestAction: seed.nextSafestAction,
        ownerId,
        permissionState: seed.permissionState,
        priorityScore: hml.priorityScore,
        productRelevance: seed.productRelevance,
        region: "Chicagoland",
        sourceConfidence: seed.sourceConfidence,
        status: seed.status,
        website: seed.website,
      },
    });

    accounts.set(seed.companyName, account.id);
    stats.territoryAccounts += 1;

    await tx.sourceEvidence.createMany({
      data: seed.evidence.map((evidence) => ({
        accountId: account.id,
        canonStatus: CanonStatus.HYPOTHESIS,
        capturedClaim: evidence.capturedClaim,
        confidence: evidence.confidence,
        sourceDate: daysFromNow(evidence.sourceDateOffset),
        staleAfter: daysFromNow(evidence.staleAfterOffset),
        title: evidence.title,
        type: evidence.type,
        url: `${researchRoot}${evidence.urlPath}`,
      })),
    });
    stats.evidence += seed.evidence.length;

    await tx.note.create({
      data: {
        accountId: account.id,
        body: seed.note,
        noteType: NoteType.RESEARCH_NOTE,
        sensitivity: NoteSensitivity.INTERNAL_ONLY,
        shareability: demoShareability,
        sourceConfidence: seed.sourceConfidence,
      },
    });
    stats.notes += 1;

    await tx.permissionHistory.createMany({
      data: [
        {
          accountId: account.id,
          reason: "Research record opened from public source review.",
          setBy: "Antaeus",
          state: PermissionState.RESEARCH_ONLY,
        },
        {
          accountId: account.id,
          reason: seed.permissionReason,
          setBy: "Antaeus",
          state: seed.permissionState,
        },
      ],
    });
    stats.permissionHistory += 2;

    await tx.hmlClassification.create({
      data: {
        accountId: account.id,
        category: HmlCategory.TERRITORY_ACCOUNT_POTENTIAL,
        classification: hml.classification,
        confidence: seed.sourceConfidence,
        contributingSignals: hml.contributingSignals,
        explanation: hml.explanation,
        recommendedNextAction: hml.recommendedNextAction,
        ruleVersion: hml.ruleVersion,
      },
    });
    stats.hmlClassifications += 1;

    await createSourceConfidenceHml(
      tx,
      {
        accountId: account.id,
        accountName: seed.companyName,
        classification:
          seed.sourceConfidence === SourceConfidence.CONFIRMED ||
          seed.sourceConfidence === SourceConfidence.STRONG
            ? HmlValue.HIGH
            : seed.sourceConfidence === SourceConfidence.MEDIUM
              ? HmlValue.MEDIUM
              : HmlValue.LOW,
        confidence: seed.sourceConfidence,
        evidenceCount: seed.evidence.length,
      },
      stats,
    );
  }

  const leadAccountId = accounts.get("Halsted Robotics Works");
  if (!leadAccountId) {
    throw new Error("Lead demo account was not seeded.");
  }
  await tx.territoryAccount.update({
    data: {
      lastReviewedAt: new Date(),
    },
    where: {
      id: leadAccountId,
    },
  });

  return accounts;
}

async function seedPartners(tx: Tx, ownerId: string, stats: SeedStats) {
  const partners: IdMap = new Map();

  for (const seed of partnerSeeds) {
    const partner = await tx.cSMPartner.create({
      data: {
        canonStatus: CanonStatus.HYPOTHESIS,
        communicationCadence: seed.communicationCadence,
        dosAndDonts: seed.dosAndDonts,
        email: seed.email,
        lastReviewedAt: daysFromNow(-1),
        name: seed.name,
        nextSafestAction: seed.nextSafestAction,
        ownerId,
        permissionState: seed.permissionState,
        preferredFollowupMotion: seed.preferredFollowupMotion,
        preferredIntroMotion: seed.preferredIntroMotion,
        privateDebriefRequired: seed.privateDebriefRequired,
        protectivenessLevel: seed.protectivenessLevel,
        relationshipHeat: seed.relationshipHeat,
        sourceConfidence: seed.sourceConfidence,
        status: seed.status,
        trustSurfaceNotes: seed.trustSurfaceNotes,
      },
    });

    partners.set(seed.email, partner.id);
    stats.csmPartners += 1;

    await tx.note.create({
      data: {
        body: seed.note,
        csmPartnerId: partner.id,
        noteType: NoteType.PRIVATE_DEBRIEF,
        sensitivity: NoteSensitivity.PRIVATE_CSM_DEBRIEF,
        shareability: demoShareability,
        sourceConfidence: seed.sourceConfidence,
      },
    });
    stats.notes += 1;

    await createHml(
      tx,
      classifyCsmRelationship(seed),
      {
        csmPartnerId: partner.id,
      },
      stats,
    );
  }

  return partners;
}

async function seedPeos(tx: Tx, partnerIds: IdMap, stats: SeedStats) {
  const peos: IdMap = new Map();

  for (const seed of peoSeeds) {
    const peo = await tx.pEO.create({
      data: {
        boundaryRisk: seed.boundaryRisk,
        canonStatus: CanonStatus.HYPOTHESIS,
        clientBaseNotes: seed.clientBaseNotes,
        csmPartnerId: partnerIds.get(seed.csmPartnerEmail),
        globalFitSignals: seed.globalFitSignals,
        industryFocus: seed.industryFocus,
        lastReviewedAt: daysFromNow(-1),
        name: seed.name,
        nextSafestAction: seed.nextSafestAction,
        offLimitsSummary: seed.offLimitsSummary,
        permissionState: seed.permissionState,
        protectivenessLevel: seed.protectivenessLevel,
        publicResearchSummary: seed.publicResearchSummary,
        readinessLevel: seed.readinessLevel,
        sourceConfidence: seed.sourceConfidence,
        website: seed.website,
      },
    });

    peos.set(seed.name, peo.id);
    stats.peos += 1;

    await tx.note.create({
      data: {
        body: seed.note,
        noteType: NoteType.RESEARCH_NOTE,
        peoId: peo.id,
        sensitivity: NoteSensitivity.INTERNAL_ONLY,
        shareability: demoShareability,
        sourceConfidence: seed.sourceConfidence,
      },
    });
    stats.notes += 1;

    await createHml(
      tx,
      classifyPeoReadiness(seed),
      {
        peoId: peo.id,
      },
      stats,
    );
    await createHml(
      tx,
      classifyPeoProtectiveness(seed),
      {
        peoId: peo.id,
      },
      stats,
    );
  }

  return peos;
}

async function seedPeoClients(tx: Tx, peoIds: IdMap, stats: SeedStats) {
  const peoClients: IdMap = new Map();
  const peoClientData: Array<Prisma.PEOClientUncheckedCreateInput> = [
    {
      boundaryRisk: HmlValue.LOW,
      countries: ["United States", "Canada"],
      displayName: peoClientNames[0],
      industry: "Medical devices",
      isAnonymized: true,
      noteSensitivity: NoteSensitivity.SHAREABLE_SUMMARY,
      peoId: peoIds.get(peoNames[0])!,
      permissionState: PermissionState.CSM_CONTEXT_NEEDED,
      sourceConfidence: SourceConfidence.MEDIUM,
      useCaseFit: "Contractor compliance and cross-border implementation support.",
      workerTypes: ["Contractors", "Implementation specialists"],
    },
    {
      boundaryRisk: HmlValue.MEDIUM,
      countries: ["United States", "Mexico"],
      displayName: peoClientNames[1],
      industry: "Logistics",
      isAnonymized: true,
      noteSensitivity: NoteSensitivity.INTERNAL_ONLY,
      peoId: peoIds.get(peoNames[1])!,
      permissionState: PermissionState.CSM_CONTEXT_NEEDED,
      sourceConfidence: SourceConfidence.MEDIUM,
      useCaseFit: "Seasonal workforce and contractor management screen.",
      workerTypes: ["Seasonal workers", "Contractors"],
    },
    {
      boundaryRisk: HmlValue.LOW,
      countries: ["United States", "United Kingdom", "Ireland"],
      displayName: peoClientNames[2],
      industry: "Fintech support",
      isAnonymized: true,
      noteSensitivity: NoteSensitivity.SHAREABLE_SUMMARY,
      peoId: peoIds.get(peoNames[2])!,
      permissionState: PermissionState.PEO_CLIENT_ENGAGED,
      sourceConfidence: SourceConfidence.STRONG,
      useCaseFit: "Global payroll and EOR readiness conversation.",
      workerTypes: ["Support employees", "Remote hires"],
    },
    {
      boundaryRisk: HmlValue.LOW,
      countries: ["United States"],
      displayName: peoClientNames[3],
      industry: "Food production",
      isAnonymized: true,
      noteSensitivity: NoteSensitivity.INTERNAL_ONLY,
      peoId: peoIds.get(peoNames[0])!,
      permissionState: PermissionState.CSM_CONTEXT_NEEDED,
      sourceConfidence: SourceConfidence.LOW,
      useCaseFit: "Watch account for seasonal staffing and contractor language.",
      workerTypes: ["Seasonal workers"],
    },
  ];

  for (const data of peoClientData) {
    const created = await tx.pEOClient.create({ data });
    peoClients.set(created.displayName, created.id);
    stats.peoClients += 1;
  }

  return peoClients;
}

async function seedOpportunities(
  tx: Tx,
  ids: {
    accounts: IdMap;
    frameworks: IdMap;
    partners: IdMap;
    peoClients: IdMap;
    peos: IdMap;
  },
  stats: SeedStats,
) {
  const opportunities: IdMap = new Map();
  const opportunityData: Array<Prisma.OpportunityUncheckedCreateInput> = [
    {
      canonStatus: CanonStatus.HYPOTHESIS,
      csmPartnerId: ids.partners.get(partnerEmails[0]),
      discoveryFrameworkId: ids.frameworks.get(frameworkTitles[0]),
      followUpDueAt: daysFromNow(-1),
      momentumLevel: HmlValue.HIGH,
      name: opportunityNames[0],
      nextStep: "Send Maya the Halsted research brief and ask for channel context.",
      nextStepOwner: "Antaeus",
      peoId: ids.peos.get(peoNames[0]),
      permissionState: PermissionState.CSM_CONTEXT_NEEDED,
      productInterest: [
        ProductRelevance.CONTRACTOR_MANAGEMENT_PLUS,
        ProductRelevance.EOR,
      ],
      riskFlags: ["channel_context_required"],
      sourceConfidence: SourceConfidence.STRONG,
      sourceType: OpportunitySourceType.TERRITORY_ACCOUNT,
      stage: OpportunityStage.CSM_CONTEXT_NEEDED,
      territoryAccountId: ids.accounts.get(accountNames[0]),
    },
    {
      canonStatus: CanonStatus.HYPOTHESIS,
      csmPartnerId: ids.partners.get(partnerEmails[1]),
      discoveryFrameworkId: ids.frameworks.get(frameworkTitles[0]),
      followUpDueAt: daysFromNow(2),
      momentumLevel: HmlValue.MEDIUM,
      name: opportunityNames[1],
      nextStep:
        "Ask Jordan to verify whether Lakeshore sits in a protected relationship lane.",
      nextStepOwner: "Antaeus",
      peoId: ids.peos.get(peoNames[1]),
      permissionState: PermissionState.RESEARCH_ONLY,
      productInterest: [
        ProductRelevance.CONTRACTOR_MANAGEMENT,
        ProductRelevance.CONTRACTOR_MANAGEMENT_PLUS,
      ],
      riskFlags: ["owner_unknown"],
      sourceConfidence: SourceConfidence.MEDIUM,
      sourceType: OpportunitySourceType.CSM,
      stage: OpportunityStage.RESEARCH,
      territoryAccountId: ids.accounts.get(accountNames[1]),
    },
    {
      canonStatus: CanonStatus.HYPOTHESIS,
      csmPartnerId: ids.partners.get(partnerEmails[2]),
      discoveryFrameworkId: ids.frameworks.get(frameworkTitles[2]),
      followUpDueAt: daysFromNow(1),
      momentumLevel: HmlValue.HIGH,
      name: opportunityNames[2],
      nextStep:
        "Prepare Priya's global payroll readiness questions for the PEO planning review.",
      nextStepOwner: "Antaeus",
      peoClientId: ids.peoClients.get(peoClientNames[2]),
      peoId: ids.peos.get(peoNames[2]),
      permissionState: PermissionState.PEO_ENGAGED,
      productInterest: [ProductRelevance.GLOBAL_PAYROLL, ProductRelevance.EOR],
      riskFlags: [],
      sourceConfidence: SourceConfidence.CONFIRMED,
      sourceType: OpportunitySourceType.PEO,
      stage: OpportunityStage.MEETING_BOOKED,
    },
    {
      canonStatus: CanonStatus.HYPOTHESIS,
      csmPartnerId: ids.partners.get(partnerEmails[2]),
      discoveryFrameworkId: ids.frameworks.get(frameworkTitles[1]),
      followUpDueAt: daysFromNow(5),
      momentumLevel: HmlValue.HIGH,
      name: opportunityNames[3],
      nextStep:
        "Use the approved CSM path and align Northbrook meeting prep to EOR triggers.",
      nextStepOwner: "Antaeus",
      peoId: ids.peos.get(peoNames[2]),
      permissionState: PermissionState.CSM_APPROVED_FOR_DISCUSSION,
      productInterest: [ProductRelevance.EOR, ProductRelevance.GLOBAL_PAYROLL],
      riskFlags: [],
      sourceConfidence: SourceConfidence.STRONG,
      sourceType: OpportunitySourceType.TERRITORY_ACCOUNT,
      stage: OpportunityStage.INTRO_READY,
      territoryAccountId: ids.accounts.get(accountNames[3]),
    },
  ];

  for (const data of opportunityData) {
    const created = await tx.opportunity.create({ data });
    opportunities.set(created.name, created.id);
    stats.opportunities += 1;

    await tx.note.create({
      data: {
        body: `${created.name}: keep permission posture visible before discussing product motion.`,
        noteType: NoteType.RESEARCH_NOTE,
        opportunityId: created.id,
        sensitivity: NoteSensitivity.INTERNAL_ONLY,
        shareability: demoShareability,
        sourceConfidence: created.sourceConfidence,
      },
    });
    stats.notes += 1;

    await createHml(
      tx,
      classifyOpportunityMomentum({
        followUpDueAt: created.followUpDueAt,
        momentumLevel: created.momentumLevel,
        nextStep: created.nextStep,
        permissionState: created.permissionState,
        riskFlags: created.riskFlags,
        sourceConfidence: created.sourceConfidence,
        stage: created.stage,
      }),
      {
        opportunityId: created.id,
      },
      stats,
    );
  }

  return opportunities;
}

async function seedFollowUps(
  tx: Tx,
  ids: {
    accounts: IdMap;
    opportunities: IdMap;
    ownerId: string;
    partners: IdMap;
    peos: IdMap;
  },
  stats: SeedStats,
) {
  const followUpData: Array<
    Prisma.FollowUpPromiseUncheckedCreateInput & {
      hmlTarget: Pick<
        Prisma.HmlClassificationUncheckedCreateInput,
        "accountId" | "opportunityId" | "peoId"
      >;
    }
  > = [
    {
      csmPartnerId: ids.partners.get(partnerEmails[0]),
      dueAt: daysFromNow(-1),
      hmlTarget: {
        opportunityId: ids.opportunities.get(opportunityNames[0]),
      },
      madeTo: "Maya Chen",
      opportunityId: ids.opportunities.get(opportunityNames[0]),
      ownerId: ids.ownerId,
      overdueAt: daysFromNow(0),
      promise: followUpPromises[0],
      sensitivity: NoteSensitivity.INTERNAL_ONLY,
      sourceConfidence: SourceConfidence.STRONG,
      status: FollowUpPromiseStatus.OPEN,
      territoryAccountId: ids.accounts.get(accountNames[0]),
    },
    {
      csmPartnerId: ids.partners.get(partnerEmails[1]),
      dueAt: daysFromNow(2),
      hmlTarget: {
        opportunityId: ids.opportunities.get(opportunityNames[1]),
      },
      madeTo: "Jordan Ellis",
      opportunityId: ids.opportunities.get(opportunityNames[1]),
      ownerId: ids.ownerId,
      promise: followUpPromises[1],
      sensitivity: NoteSensitivity.INTERNAL_ONLY,
      sourceConfidence: SourceConfidence.MEDIUM,
      status: FollowUpPromiseStatus.OPEN,
      territoryAccountId: ids.accounts.get(accountNames[1]),
    },
    {
      csmPartnerId: ids.partners.get(partnerEmails[2]),
      dueAt: daysFromNow(1),
      hmlTarget: {
        opportunityId: ids.opportunities.get(opportunityNames[2]),
      },
      madeTo: "Priya Shah",
      opportunityId: ids.opportunities.get(opportunityNames[2]),
      ownerId: ids.ownerId,
      peoId: ids.peos.get(peoNames[2]),
      promise: followUpPromises[2],
      sensitivity: NoteSensitivity.SHAREABLE_SUMMARY,
      sourceConfidence: SourceConfidence.CONFIRMED,
      status: FollowUpPromiseStatus.OPEN,
    },
    {
      dueAt: daysFromNow(4),
      hmlTarget: {
        accountId: ids.accounts.get(accountNames[2]),
      },
      madeTo: "Owner review",
      ownerId: ids.ownerId,
      promise: followUpPromises[3],
      sensitivity: NoteSensitivity.SENSITIVE_BOUNDARY,
      sourceConfidence: SourceConfidence.CONFIRMED,
      status: FollowUpPromiseStatus.OPEN,
      territoryAccountId: ids.accounts.get(accountNames[2]),
    },
  ];

  for (const { hmlTarget, ...data } of followUpData) {
    const followUp = await tx.followUpPromise.create({
      data,
    });
    stats.followUpPromises += 1;

    await createHml(
      tx,
      classifyFollowUpUrgency({
        dueAt: followUp.dueAt,
        madeTo: followUp.madeTo,
        sourceConfidence: followUp.sourceConfidence,
        status: followUp.status,
      }),
      hmlTarget,
      stats,
    );
  }
}

async function seedBoundaries(
  tx: Tx,
  ids: {
    accounts: IdMap;
    opportunities: IdMap;
    partners: IdMap;
    peos: IdMap;
  },
  stats: SeedStats,
) {
  const boundaryData: Array<
    Prisma.BoundaryRuleUncheckedCreateInput & {
      hmlTarget: Pick<
        Prisma.HmlClassificationUncheckedCreateInput,
        "accountId" | "csmPartnerId" | "opportunityId" | "peoId"
      >;
    }
  > = [
    {
      allowedAlternative:
        "Keep Aurora parked until owner clearance determines safe naming and motion.",
      canonStatus: CanonStatus.CANON,
      description:
        "Aurora has useful fit signals, but the operating rule is owner clearance first.",
      effectiveFrom: daysFromNow(-2),
      hmlTarget: {
        accountId: ids.accounts.get(accountNames[2]),
      },
      reason:
        "Sensitive account context must be resolved before the record is operationally used.",
      reviewAt: daysFromNow(3),
      ruleType: BoundaryRuleType.HOLD_SENSITIVE,
      scopeType: BoundaryScopeType.TERRITORY_ACCOUNT,
      setBy: "Antaeus",
      severity: BoundarySeverity.BLOCKED,
      sourceConfidence: SourceConfidence.CONFIRMED,
      status: BoundaryRuleStatus.ACTIVE,
      territoryAccountId: ids.accounts.get(accountNames[2]),
      title: boundaryTitles[0],
    },
    {
      allowedAlternative:
        "Ask Maya for PEO context before using Prairie Harbor in a planning thread.",
      canonStatus: CanonStatus.HYPOTHESIS,
      description: "Prairie Harbor is warm, but Maya still owns the channel context.",
      effectiveFrom: daysFromNow(-1),
      hmlTarget: {
        peoId: ids.peos.get(peoNames[0]),
      },
      peoId: ids.peos.get(peoNames[0]),
      reason: "Protects the partner relationship while allowing research preparation.",
      reviewAt: daysFromNow(7),
      ruleType: BoundaryRuleType.APPROVAL_REQUIRED,
      scopeType: BoundaryScopeType.PEO,
      setBy: "Antaeus",
      severity: BoundarySeverity.APPROVAL_REQUIRED,
      sourceConfidence: SourceConfidence.STRONG,
      status: BoundaryRuleStatus.ACTIVE,
      title: boundaryTitles[1],
    },
    {
      allowedAlternative: "Ask Jordan for ownership context before account discussion.",
      canonStatus: CanonStatus.HYPOTHESIS,
      csmPartnerId: ids.partners.get(partnerEmails[1]),
      description:
        "Healthcare staffing context should remain channel-led until Jordan confirms ownership.",
      effectiveFrom: daysFromNow(-1),
      hmlTarget: {
        opportunityId: ids.opportunities.get(opportunityNames[1]),
      },
      opportunityId: ids.opportunities.get(opportunityNames[1]),
      reason: "Relationship ownership is not yet clear.",
      reviewAt: daysFromNow(5),
      ruleType: BoundaryRuleType.RELATIONSHIP_OWNER_REQUIRED,
      scopeType: BoundaryScopeType.OPPORTUNITY,
      setBy: "Antaeus",
      severity: BoundarySeverity.APPROVAL_REQUIRED,
      sourceConfidence: SourceConfidence.MEDIUM,
      status: BoundaryRuleStatus.ACTIVE,
      territoryAccountId: ids.accounts.get(accountNames[1]),
      title: boundaryTitles[2],
    },
    {
      allowedAlternative:
        "Use Priya's approved path and keep meeting prep source-backed.",
      canonStatus: CanonStatus.CANON,
      csmPartnerId: ids.partners.get(partnerEmails[2]),
      description: "Northbrook can be discussed only through the approved CSM path.",
      effectiveFrom: daysFromNow(-1),
      hmlTarget: {
        accountId: ids.accounts.get(accountNames[3]),
      },
      reason: "Keeps approved permission posture visible.",
      reviewAt: daysFromNow(14),
      ruleType: BoundaryRuleType.ALLOWED_ALTERNATIVE,
      scopeType: BoundaryScopeType.TERRITORY_ACCOUNT,
      setBy: "Antaeus",
      severity: BoundarySeverity.WARNING,
      sourceConfidence: SourceConfidence.STRONG,
      status: BoundaryRuleStatus.ACTIVE,
      territoryAccountId: ids.accounts.get(accountNames[3]),
      title: boundaryTitles[3],
    },
  ];

  for (const { hmlTarget, ...data } of boundaryData) {
    const boundary = await tx.boundaryRule.create({
      data,
    });
    stats.boundaryRules += 1;

    await createHml(
      tx,
      classifyBoundaryRisk({
        allowedAlternative: boundary.allowedAlternative,
        ruleType: boundary.ruleType,
        scopeType: boundary.scopeType,
        severity: boundary.severity,
        sourceConfidence: boundary.sourceConfidence,
        status: boundary.status,
        title: boundary.title,
      }),
      hmlTarget,
      stats,
    );
  }
}

async function seedDailyServes(
  tx: Tx,
  ids: {
    accounts: IdMap;
    assets: IdMap;
    opportunities: IdMap;
    ownerId: string;
    partners: IdMap;
    peos: IdMap;
  },
  stats: SeedStats,
) {
  const dailyServes: IdMap = new Map();
  const dailyServeData: Array<Prisma.DailyServeUncheckedCreateInput> = [
    {
      canonStatus: CanonStatus.HYPOTHESIS,
      category: DailyServeCategory.COMPLIANCE_WATCHOUT,
      content:
        "Halsted has enough contractor and complexity signal for a short channel-safe brief. Lead with evidence, not product pressure.",
      csmPartnerId: ids.partners.get(partnerEmails[0]),
      nextSafestAction: "Send Maya the brief and ask for channel context.",
      opportunityId: ids.opportunities.get(opportunityNames[0]),
      outcome: DailyServeOutcome.USED_BY_CSM,
      outcomeAt: daysFromNow(-1),
      ownerId: ids.ownerId,
      pitchAssetId: ids.assets.get(pitchAssetTitles[0]),
      relationshipImpact: HmlValue.HIGH,
      sentAt: daysFromNow(-1),
      sourceConfidence: SourceConfidence.STRONG,
      status: DailyServeStatus.SENT,
      territoryAccountId: ids.accounts.get(accountNames[0]),
      title: dailyServeTitles[0],
      usefulnessReason:
        "Gives a trusted CSM a compact way to validate account motion safely.",
    },
    {
      canonStatus: CanonStatus.HYPOTHESIS,
      category: DailyServeCategory.CLIENT_FIT_SIGNAL,
      content:
        "Review the Chicagoland watch list for hiring triggers with stale or weak evidence before giving them operating weight.",
      nextSafestAction: "Refresh Elgin and Lakeshore public source evidence.",
      outcome: DailyServeOutcome.PENDING,
      ownerId: ids.ownerId,
      opportunityImpact: HmlValue.MEDIUM,
      sourceConfidence: SourceConfidence.MEDIUM,
      status: DailyServeStatus.READY,
      territoryAccountId: ids.accounts.get(accountNames[4]),
      title: dailyServeTitles[1],
      usefulnessReason:
        "Keeps prospecting central while preventing weak evidence from driving priority.",
    },
    {
      canonStatus: CanonStatus.HYPOTHESIS,
      category: DailyServeCategory.DISCOVERY_QUESTION,
      content:
        "Which client payroll questions are safe for Priya to test in a PEO planning review without moving into client-specific claims?",
      csmPartnerId: ids.partners.get(partnerEmails[2]),
      nextSafestAction:
        "Use Priya's planning review to test the payroll readiness questions.",
      opportunityId: ids.opportunities.get(opportunityNames[2]),
      outcome: DailyServeOutcome.FORWARDED,
      outcomeAt: daysFromNow(-1),
      ownerId: ids.ownerId,
      peoId: ids.peos.get(peoNames[2]),
      pitchAssetId: ids.assets.get(pitchAssetTitles[3]),
      relationshipImpact: HmlValue.HIGH,
      sentAt: daysFromNow(-2),
      sourceConfidence: SourceConfidence.CONFIRMED,
      status: DailyServeStatus.SENT,
      title: dailyServeTitles[2],
      usefulnessReason:
        "Turns the PEO relationship into a permission-aware discovery path.",
    },
    {
      canonStatus: CanonStatus.CANON,
      category: DailyServeCategory.MEETING_PREP,
      content:
        "Northbrook meeting prep should start with permission posture, evidence quality, and EOR trigger questions.",
      csmPartnerId: ids.partners.get(partnerEmails[2]),
      nextSafestAction: "Use the approved CSM path and meeting-prep asset.",
      opportunityId: ids.opportunities.get(opportunityNames[3]),
      outcome: DailyServeOutcome.CREATED_NEXT_STEP,
      outcomeAt: daysFromNow(0),
      ownerId: ids.ownerId,
      peoId: ids.peos.get(peoNames[2]),
      pitchAssetId: ids.assets.get(pitchAssetTitles[3]),
      relationshipImpact: HmlValue.HIGH,
      sentAt: daysFromNow(-1),
      sourceConfidence: SourceConfidence.STRONG,
      status: DailyServeStatus.SENT,
      territoryAccountId: ids.accounts.get(accountNames[3]),
      title: dailyServeTitles[3],
      usefulnessReason:
        "Connects approved permission to a concrete next step for a high-priority prospect.",
    },
    {
      canonStatus: CanonStatus.CANON,
      category: DailyServeCategory.MEETING_PREP,
      content:
        "Aurora should remain parked behind owner clearance. The useful action is boundary review, not account motion.",
      nextSafestAction: "Review the hold with the owner and keep Aurora parked.",
      outcome: DailyServeOutcome.PENDING,
      ownerId: ids.ownerId,
      opportunityImpact: HmlValue.LOW,
      sourceConfidence: SourceConfidence.CONFIRMED,
      status: DailyServeStatus.HELD,
      territoryAccountId: ids.accounts.get(accountNames[2]),
      title: dailyServeTitles[4],
      usefulnessReason:
        "Makes the blocked-path behavior visible without creating unsafe motion.",
    },
  ];

  for (const data of dailyServeData) {
    const dailyServe = await tx.dailyServe.create({ data });
    dailyServes.set(dailyServe.title, dailyServe.id);
    stats.dailyServes += 1;

    await createHml(
      tx,
      classifyDailyServeRelationshipImpact({
        category: dailyServe.category,
        nextSafestAction: dailyServe.nextSafestAction,
        outcome: dailyServe.outcome,
        sourceConfidence: dailyServe.sourceConfidence,
        status: dailyServe.status,
        title: dailyServe.title,
      }),
      {
        dailyServeId: dailyServe.id,
      },
      stats,
    );
    await createHml(
      tx,
      classifyDailyServeOpportunityImpact({
        category: dailyServe.category,
        nextSafestAction: dailyServe.nextSafestAction,
        outcome: dailyServe.outcome,
        sourceConfidence: dailyServe.sourceConfidence,
        status: dailyServe.status,
        title: dailyServe.title,
      }),
      {
        dailyServeId: dailyServe.id,
      },
      stats,
    );
  }

  return dailyServes;
}

async function seedUnknowns(
  tx: Tx,
  ids: {
    accounts: IdMap;
    dailyServes: IdMap;
    opportunities: IdMap;
    partners: IdMap;
    peos: IdMap;
  },
  stats: SeedStats,
) {
  const unknownData: Array<Prisma.InternalUnknownUncheckedCreateInput> = [
    {
      blocksImplementation: true,
      category: UnknownCategory.DATA_VISIBILITY,
      confidence: SourceConfidence.CONFIRMED,
      currentBestAnswer:
        "Treat Aurora as sensitive until owner clearance determines naming and visibility rules.",
      dueAt: daysFromNow(3),
      question: unknownQuestions[0],
      relatedAccountId: ids.accounts.get(accountNames[2]),
      riskLevel: HmlValue.HIGH,
      sourceNeeded: "Owner decision on safe account naming and internal visibility.",
      status: InternalUnknownStatus.OPEN,
    },
    {
      blocksImplementation: false,
      category: UnknownCategory.PERMISSION,
      confidence: SourceConfidence.MEDIUM,
      currentBestAnswer:
        "Jordan is the likely relationship context owner, but confirmation is still needed.",
      csmPartnerId: ids.partners.get(partnerEmails[1]),
      dueAt: daysFromNow(2),
      opportunityId: ids.opportunities.get(opportunityNames[1]),
      question: unknownQuestions[1],
      relatedAccountId: ids.accounts.get(accountNames[1]),
      riskLevel: HmlValue.HIGH,
      sourceNeeded: "CSM ownership confirmation.",
      status: InternalUnknownStatus.OPEN,
    },
    {
      blocksImplementation: false,
      category: UnknownCategory.PRODUCT,
      confidence: SourceConfidence.MEDIUM,
      currentBestAnswer:
        "Use approved high-level value language, but keep packaging details owner-reviewed.",
      dueAt: daysFromNow(10),
      peoId: ids.peos.get(peoNames[0]),
      question: unknownQuestions[2],
      riskLevel: HmlValue.MEDIUM,
      sourceNeeded: "Owner-reviewed product language.",
      status: InternalUnknownStatus.DEFERRED,
    },
    {
      blocksImplementation: false,
      category: UnknownCategory.HML,
      confidence: SourceConfidence.LOW,
      currentBestAnswer:
        "For now, stale evidence is visible and sortable. Automatic score lowering remains a hypothesis.",
      dailyServeId: ids.dailyServes.get(dailyServeTitles[1]),
      dueAt: daysFromNow(14),
      question: unknownQuestions[3],
      relatedAccountId: ids.accounts.get(accountNames[4]),
      riskLevel: HmlValue.MEDIUM,
      sourceNeeded: "Usage review after operators inspect stale source behavior.",
      status: InternalUnknownStatus.OPEN,
    },
  ];

  for (const data of unknownData) {
    const unknown = await tx.internalUnknown.create({ data });
    stats.internalUnknowns += 1;

    await createHml(
      tx,
      classifyInternalAmbiguity({
        blocksImplementation: unknown.blocksImplementation,
        category: unknown.category,
        confidence: unknown.confidence,
        question: unknown.question,
        riskLevel: unknown.riskLevel,
        status: unknown.status,
      }),
      {
        internalUnknownId: unknown.id,
      },
      stats,
    );
  }
}

function emptyStats(): SeedStats {
  return {
    boundaryRules: 0,
    csmPartners: 0,
    dailyServes: 0,
    discoveryFrameworks: 0,
    evidence: 0,
    followUpPromises: 0,
    hmlClassifications: 0,
    internalUnknowns: 0,
    notes: 0,
    opportunities: 0,
    peoClients: 0,
    peos: 0,
    permissionHistory: 0,
    pitchAssets: 0,
    territoryAccounts: 0,
    users: 0,
  };
}

async function main() {
  const ownerEmail = process.env["APP_OWNER_EMAIL"] ?? "antaeus@example.local";
  const report = await prisma.$transaction(
    async (tx) => {
      const owner = await tx.user.upsert({
        where: {
          email: ownerEmail,
        },
        update: {
          isActive: true,
          isCanonOwner: true,
          isProductOwner: true,
          name: "Antaeus",
          role: UserRole.OWNER,
        },
        create: {
          email: ownerEmail,
          isActive: true,
          isCanonOwner: true,
          isProductOwner: true,
          name: "Antaeus",
          role: UserRole.OWNER,
        },
      });
      const deleted = await deleteDemoData(tx);
      const stats = emptyStats();
      stats.users = 1;

      const { assets, frameworks } = await seedFrameworksAndAssets(tx, stats);
      const accounts = await seedAccounts(tx, owner.id, stats);
      const partners = await seedPartners(tx, owner.id, stats);
      const peos = await seedPeos(tx, partners, stats);
      const peoClients = await seedPeoClients(tx, peos, stats);
      const opportunities = await seedOpportunities(
        tx,
        {
          accounts,
          frameworks,
          partners,
          peoClients,
          peos,
        },
        stats,
      );

      await seedFollowUps(
        tx,
        {
          accounts,
          opportunities,
          ownerId: owner.id,
          partners,
          peos,
        },
        stats,
      );
      await seedBoundaries(
        tx,
        {
          accounts,
          opportunities,
          partners,
          peos,
        },
        stats,
      );
      const dailyServes = await seedDailyServes(
        tx,
        {
          accounts,
          assets,
          opportunities,
          ownerId: owner.id,
          partners,
          peos,
        },
        stats,
      );
      await seedUnknowns(
        tx,
        {
          accounts,
          dailyServes,
          opportunities,
          partners,
          peos,
        },
        stats,
      );

      return {
        deleted,
        indexed: stats,
        ownerEmail: owner.email,
      };
    },
    {
      maxWait: 30_000,
      timeout: 60_000,
    },
  );

  console.log("Demo seed complete.");
  console.log(JSON.stringify(report, null, 2));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
