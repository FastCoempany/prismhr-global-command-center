import {
  ApprovalStatus,
  DailyServeCategory,
  DailyServeOutcome,
  DailyServeStatus,
  InternalUnknownStatus,
  PitchAudience,
  SourceConfidence,
} from "@/generated/prisma/client";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

const DAILY_SERVE_LIMIT = 40;
const OPTION_LIMIT = 100;
const categoryValues = new Set(Object.values(DailyServeCategory));
const confidenceValues = new Set(Object.values(SourceConfidence));
const outcomeValues = new Set(Object.values(DailyServeOutcome));
const statusValues = new Set(Object.values(DailyServeStatus));

const positiveOutcomes = [
  DailyServeOutcome.USED_BY_CSM,
  DailyServeOutcome.FORWARDED,
  DailyServeOutcome.REPLIED,
  DailyServeOutcome.CREATED_NEXT_STEP,
  DailyServeOutcome.CONVERTED_TO_OPPORTUNITY,
];

export type DailyServesSearchParams = {
  category?: string;
  confidence?: string;
  csmPartnerId?: string;
  dailyServeId?: string;
  outcome?: string;
  q?: string;
  status?: string;
};

export type DailyServesFilters = {
  category?: DailyServeCategory;
  confidence?: SourceConfidence;
  csmPartnerId?: string;
  dailyServeId?: string;
  outcome?: DailyServeOutcome;
  q?: string;
  status?: DailyServeStatus;
};

function parseEnum<T extends string>(value: string | undefined, allowed: Set<T>) {
  return value && allowed.has(value as T) ? (value as T) : undefined;
}

export function parseDailyServesFilters(
  searchParams: DailyServesSearchParams,
): DailyServesFilters {
  return {
    category: parseEnum(searchParams.category, categoryValues),
    confidence: parseEnum(searchParams.confidence, confidenceValues),
    csmPartnerId: searchParams.csmPartnerId,
    dailyServeId: searchParams.dailyServeId,
    outcome: parseEnum(searchParams.outcome, outcomeValues),
    q: searchParams.q?.trim() || undefined,
    status: parseEnum(searchParams.status, statusValues),
  };
}

export function buildDailyServesPath(
  filters: DailyServesFilters,
  overrides: Partial<DailyServesFilters> = {},
) {
  const next = {
    ...filters,
    ...overrides,
  };
  const params = new URLSearchParams();

  if (next.category) params.set("category", next.category);
  if (next.confidence) params.set("confidence", next.confidence);
  if (next.csmPartnerId) params.set("csmPartnerId", next.csmPartnerId);
  if (next.dailyServeId) params.set("dailyServeId", next.dailyServeId);
  if (next.outcome) params.set("outcome", next.outcome);
  if (next.q) params.set("q", next.q);
  if (next.status) params.set("status", next.status);

  const query = params.toString();
  return query ? `/daily-serves?${query}` : "/daily-serves";
}

function dailyServeWhere(filters: DailyServesFilters) {
  const clauses: object[] = [];

  if (filters.q) {
    clauses.push({
      OR: [
        {
          title: {
            contains: filters.q,
          },
        },
        {
          content: {
            contains: filters.q,
          },
        },
        {
          usefulnessReason: {
            contains: filters.q,
          },
        },
        {
          nextSafestAction: {
            contains: filters.q,
          },
        },
        {
          csmPartner: {
            name: {
              contains: filters.q,
            },
          },
        },
        {
          opportunity: {
            name: {
              contains: filters.q,
            },
          },
        },
      ],
    });
  }

  if (filters.category) clauses.push({ category: filters.category });
  if (filters.confidence) clauses.push({ sourceConfidence: filters.confidence });
  if (filters.csmPartnerId) clauses.push({ csmPartnerId: filters.csmPartnerId });
  if (filters.outcome) clauses.push({ outcome: filters.outcome });
  if (filters.status) clauses.push({ status: filters.status });

  return clauses.length > 0
    ? {
        AND: clauses,
      }
    : {};
}

async function findSelectedDailyServe(
  prisma: ReturnType<typeof getPrisma>,
  dailyServeId: string,
) {
  return prisma.dailyServe.findUnique({
    include: {
      csmPartner: true,
      hmlClassifications: {
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
      internalUnknowns: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 5,
        where: {
          status: InternalUnknownStatus.OPEN,
        },
      },
      opportunity: true,
      peo: true,
      pitchAsset: true,
      territoryAccount: true,
    },
    where: {
      id: dailyServeId,
    },
  });
}

export async function getDailyServesData(filters: DailyServesFilters) {
  if (!hasDatabaseEnv()) {
    return {
      counts: {
        dailyServes: 0,
        pending: 0,
        positive: 0,
        sent: 0,
      },
      csmOptions: [],
      databaseReady: false,
      dailyServes: [],
      error: "Daily Serve records cannot be loaded right now.",
      filters,
      limit: DAILY_SERVE_LIMIT,
      opportunityOptions: [],
      peoOptions: [],
      pitchAssetOptions: [],
      selectedDailyServe: null,
      territoryOptions: [],
    };
  }

  try {
    const prisma = getPrisma();
    const where = dailyServeWhere(filters);
    const [
      dailyServes,
      dailyServesCount,
      pending,
      positive,
      sent,
      csmOptions,
      peoOptions,
      opportunityOptions,
      territoryOptions,
      pitchAssetOptions,
    ] = await Promise.all([
      prisma.dailyServe.findMany({
        include: {
          csmPartner: {
            select: {
              id: true,
              name: true,
            },
          },
          opportunity: {
            select: {
              id: true,
              name: true,
            },
          },
          peo: {
            select: {
              csmPartnerId: true,
              id: true,
              name: true,
            },
          },
          pitchAsset: {
            select: {
              id: true,
              title: true,
            },
          },
          territoryAccount: {
            select: {
              city: true,
              companyName: true,
              id: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: DAILY_SERVE_LIMIT,
        where,
      }),
      prisma.dailyServe.count({
        where,
      }),
      prisma.dailyServe.count({
        where: {
          outcome: DailyServeOutcome.PENDING,
        },
      }),
      prisma.dailyServe.count({
        where: {
          outcome: {
            in: positiveOutcomes,
          },
        },
      }),
      prisma.dailyServe.count({
        where: {
          status: DailyServeStatus.SENT,
        },
      }),
      prisma.cSMPartner.findMany({
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
        },
        take: OPTION_LIMIT,
      }),
      prisma.pEO.findMany({
        orderBy: {
          name: "asc",
        },
        select: {
          csmPartnerId: true,
          id: true,
          name: true,
        },
        take: OPTION_LIMIT,
      }),
      prisma.opportunity.findMany({
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          csmPartnerId: true,
          id: true,
          name: true,
          peoId: true,
          territoryAccountId: true,
        },
        take: OPTION_LIMIT,
      }),
      prisma.territoryAccount.findMany({
        orderBy: {
          companyName: "asc",
        },
        select: {
          city: true,
          companyName: true,
          id: true,
        },
        take: OPTION_LIMIT,
        where: {
          NOT: [
            { companyName: "Placeholder Chicagoland Prospect" },
            { category: "Placeholder" },
          ],
        },
      }),
      prisma.pitchAsset.findMany({
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          id: true,
          title: true,
        },
        take: OPTION_LIMIT,
        where: {
          approvalStatus: ApprovalStatus.OWNER_APPROVED,
          audience: PitchAudience.CSM,
        },
      }),
    ]);
    const selectedDailyServeId = filters.dailyServeId ?? dailyServes[0]?.id;
    const selectedDailyServe =
      (selectedDailyServeId
        ? await findSelectedDailyServe(prisma, selectedDailyServeId)
        : null) ??
      (dailyServes[0] ? await findSelectedDailyServe(prisma, dailyServes[0].id) : null);

    return {
      counts: {
        dailyServes: dailyServesCount,
        pending,
        positive,
        sent,
      },
      csmOptions,
      databaseReady: true,
      dailyServes,
      error: null,
      filters,
      limit: DAILY_SERVE_LIMIT,
      opportunityOptions,
      peoOptions,
      pitchAssetOptions,
      selectedDailyServe,
      territoryOptions,
    };
  } catch (error) {
    console.error("Daily Serves load failed", error);

    return {
      counts: {
        dailyServes: 0,
        pending: 0,
        positive: 0,
        sent: 0,
      },
      csmOptions: [],
      databaseReady: false,
      dailyServes: [],
      error: "Daily Serve records cannot be loaded right now.",
      filters,
      limit: DAILY_SERVE_LIMIT,
      opportunityOptions: [],
      peoOptions: [],
      pitchAssetOptions: [],
      selectedDailyServe: null,
      territoryOptions: [],
    };
  }
}
