import {
  HmlValue,
  InternalUnknownStatus,
  SourceConfidence,
  UnknownCategory,
} from "@/generated/prisma/client";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

const UNKNOWN_LIMIT = 60;
const ACCOUNT_OPTION_LIMIT = 100;
const RELATED_OPTION_LIMIT = 100;
const visibleAccountWhere = {
  NOT: [{ companyName: "Placeholder Chicagoland Prospect" }, { category: "Placeholder" }],
};
const categoryValues = new Set(Object.values(UnknownCategory));
const confidenceValues = new Set(Object.values(SourceConfidence));
const riskValues = new Set(Object.values(HmlValue));
const statusValues = new Set([...Object.values(InternalUnknownStatus), "ALL"] as const);
const blockingValues = new Set(["blocking", "not-blocking"] as const);

type StatusFilter = InternalUnknownStatus | "ALL";
type BlockingFilter = "blocking" | "not-blocking";

export type UnknownsSearchParams = {
  blocking?: string;
  category?: string;
  confidence?: string;
  q?: string;
  risk?: string;
  status?: string;
};

export type UnknownsFilters = {
  blocking?: BlockingFilter;
  category?: UnknownCategory;
  confidence?: SourceConfidence;
  q?: string;
  risk?: HmlValue;
  status: StatusFilter;
};

function parseEnum<T extends string>(value: string | undefined, allowed: Set<T>) {
  return value && allowed.has(value as T) ? (value as T) : undefined;
}

export function parseUnknownsFilters(
  searchParams: UnknownsSearchParams,
): UnknownsFilters {
  return {
    blocking: parseEnum(searchParams.blocking, blockingValues),
    category: parseEnum(searchParams.category, categoryValues),
    confidence: parseEnum(searchParams.confidence, confidenceValues),
    q: searchParams.q?.trim() || undefined,
    risk: parseEnum(searchParams.risk, riskValues),
    status: parseEnum(searchParams.status, statusValues) ?? InternalUnknownStatus.OPEN,
  };
}

export function buildUnknownsPath(
  filters: UnknownsFilters,
  overrides: Partial<UnknownsFilters> = {},
) {
  const next = {
    ...filters,
    ...overrides,
  };
  const params = new URLSearchParams();

  if (next.blocking) params.set("blocking", next.blocking);
  if (next.category) params.set("category", next.category);
  if (next.confidence) params.set("confidence", next.confidence);
  if (next.q) params.set("q", next.q);
  if (next.risk) params.set("risk", next.risk);
  if (next.status !== InternalUnknownStatus.OPEN) params.set("status", next.status);

  const query = params.toString();
  return query ? `/unknowns?${query}` : "/unknowns";
}

function unknownWhere(filters: UnknownsFilters) {
  const clauses: object[] = [];

  if (filters.status !== "ALL") {
    clauses.push({
      status: filters.status,
    });
  }

  if (filters.blocking === "blocking") {
    clauses.push({
      blocksImplementation: true,
    });
  }

  if (filters.blocking === "not-blocking") {
    clauses.push({
      blocksImplementation: false,
    });
  }

  if (filters.category) {
    clauses.push({
      category: filters.category,
    });
  }

  if (filters.confidence) {
    clauses.push({
      confidence: filters.confidence,
    });
  }

  if (filters.risk) {
    clauses.push({
      riskLevel: filters.risk,
    });
  }

  if (filters.q) {
    clauses.push({
      OR: [
        {
          question: {
            contains: filters.q,
          },
        },
        {
          currentBestAnswer: {
            contains: filters.q,
          },
        },
        {
          sourceNeeded: {
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
          peo: {
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
        {
          dailyServe: {
            title: {
              contains: filters.q,
            },
          },
        },
        {
          relatedAccount: {
            companyName: {
              contains: filters.q,
            },
          },
        },
      ],
    });
  }

  return clauses.length > 0
    ? {
        AND: clauses,
      }
    : {};
}

export async function getUnknownsData(filters: UnknownsFilters) {
  if (!hasDatabaseEnv()) {
    return {
      accountOptions: [],
      counts: {
        blockingOpen: 0,
        highRiskOpen: 0,
        open: 0,
        visible: 0,
      },
      databaseReady: false,
      dailyServeOptions: [],
      error: "Unknown records cannot be loaded right now.",
      filters,
      limit: UNKNOWN_LIMIT,
      csmOptions: [],
      opportunityOptions: [],
      peoOptions: [],
      unknowns: [],
    };
  }

  try {
    const prisma = getPrisma();
    const where = unknownWhere(filters);
    const [
      unknowns,
      visible,
      open,
      blockingOpen,
      highRiskOpen,
      accountOptions,
      csmOptions,
      peoOptions,
      opportunityOptions,
      dailyServeOptions,
    ] = await Promise.all([
      prisma.internalUnknown.findMany({
        include: {
          csmPartner: {
            select: {
              id: true,
              name: true,
            },
          },
          dailyServe: {
            select: {
              id: true,
              title: true,
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
          relatedAccount: {
            select: {
              city: true,
              companyName: true,
              id: true,
              permissionState: true,
              sourceConfidence: true,
            },
          },
        },
        orderBy: [
          {
            blocksImplementation: "desc",
          },
          {
            updatedAt: "desc",
          },
        ],
        take: UNKNOWN_LIMIT,
        where,
      }),
      prisma.internalUnknown.count({
        where,
      }),
      prisma.internalUnknown.count({
        where: {
          status: InternalUnknownStatus.OPEN,
        },
      }),
      prisma.internalUnknown.count({
        where: {
          blocksImplementation: true,
          status: InternalUnknownStatus.OPEN,
        },
      }),
      prisma.internalUnknown.count({
        where: {
          riskLevel: HmlValue.HIGH,
          status: InternalUnknownStatus.OPEN,
        },
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
        take: ACCOUNT_OPTION_LIMIT,
        where: visibleAccountWhere,
      }),
      prisma.cSMPartner.findMany({
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
        },
        take: RELATED_OPTION_LIMIT,
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
        take: RELATED_OPTION_LIMIT,
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
        take: RELATED_OPTION_LIMIT,
      }),
      prisma.dailyServe.findMany({
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          csmPartnerId: true,
          id: true,
          opportunityId: true,
          peoId: true,
          territoryAccountId: true,
          title: true,
        },
        take: RELATED_OPTION_LIMIT,
      }),
    ]);

    return {
      accountOptions,
      counts: {
        blockingOpen,
        highRiskOpen,
        open,
        visible,
      },
      csmOptions,
      databaseReady: true,
      dailyServeOptions,
      error: null,
      filters,
      limit: UNKNOWN_LIMIT,
      opportunityOptions,
      peoOptions,
      unknowns,
    };
  } catch (error) {
    console.error("Internal Unknowns load failed", error);

    return {
      accountOptions: [],
      counts: {
        blockingOpen: 0,
        highRiskOpen: 0,
        open: 0,
        visible: 0,
      },
      databaseReady: false,
      dailyServeOptions: [],
      error: "Unknown records cannot be loaded right now.",
      filters,
      limit: UNKNOWN_LIMIT,
      csmOptions: [],
      opportunityOptions: [],
      peoOptions: [],
      unknowns: [],
    };
  }
}
