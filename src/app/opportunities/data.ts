import {
  BoundaryRuleStatus,
  HmlValue,
  OpportunitySourceType,
  OpportunityStage,
  PermissionState,
  SourceConfidence,
} from "@/generated/prisma/client";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

const OPPORTUNITY_LIMIT = 40;
const OPTION_LIMIT = 100;
const hmlValues = new Set(Object.values(HmlValue));
const permissionValues = new Set(Object.values(PermissionState));
const sourceTypeValues = new Set(Object.values(OpportunitySourceType));
const stageValues = new Set(Object.values(OpportunityStage));
const confidenceValues = new Set(Object.values(SourceConfidence));

export type OpportunityRoomsSearchParams = {
  confidence?: string;
  momentum?: string;
  opportunityId?: string;
  permission?: string;
  q?: string;
  sourceType?: string;
  stage?: string;
};

export type OpportunityRoomsFilters = {
  confidence?: SourceConfidence;
  momentum?: HmlValue;
  opportunityId?: string;
  permission?: PermissionState;
  q?: string;
  sourceType?: OpportunitySourceType;
  stage?: OpportunityStage;
};

function parseEnum<T extends string>(value: string | undefined, allowed: Set<T>) {
  return value && allowed.has(value as T) ? (value as T) : undefined;
}

export function parseOpportunityRoomsFilters(
  searchParams: OpportunityRoomsSearchParams,
): OpportunityRoomsFilters {
  return {
    confidence: parseEnum(searchParams.confidence, confidenceValues),
    momentum: parseEnum(searchParams.momentum, hmlValues),
    opportunityId: searchParams.opportunityId,
    permission: parseEnum(searchParams.permission, permissionValues),
    q: searchParams.q?.trim() || undefined,
    sourceType: parseEnum(searchParams.sourceType, sourceTypeValues),
    stage: parseEnum(searchParams.stage, stageValues),
  };
}

export function buildOpportunityRoomsPath(
  filters: OpportunityRoomsFilters,
  overrides: Partial<OpportunityRoomsFilters> = {},
) {
  const next = {
    ...filters,
    ...overrides,
  };
  const params = new URLSearchParams();

  if (next.confidence) params.set("confidence", next.confidence);
  if (next.momentum) params.set("momentum", next.momentum);
  if (next.opportunityId) params.set("opportunityId", next.opportunityId);
  if (next.permission) params.set("permission", next.permission);
  if (next.q) params.set("q", next.q);
  if (next.sourceType) params.set("sourceType", next.sourceType);
  if (next.stage) params.set("stage", next.stage);

  const query = params.toString();
  return query ? `/opportunities?${query}` : "/opportunities";
}

function opportunityWhere(filters: OpportunityRoomsFilters) {
  const clauses: object[] = [];

  if (filters.q) {
    clauses.push({
      OR: [
        {
          name: {
            contains: filters.q,
          },
        },
        {
          nextStep: {
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
          territoryAccount: {
            companyName: {
              contains: filters.q,
            },
          },
        },
      ],
    });
  }

  if (filters.confidence) {
    clauses.push({
      sourceConfidence: filters.confidence,
    });
  }

  if (filters.momentum) {
    clauses.push({
      momentumLevel: filters.momentum,
    });
  }

  if (filters.permission) {
    clauses.push({
      permissionState: filters.permission,
    });
  }

  if (filters.sourceType) {
    clauses.push({
      sourceType: filters.sourceType,
    });
  }

  if (filters.stage) {
    clauses.push({
      stage: filters.stage,
    });
  }

  return clauses.length > 0
    ? {
        AND: clauses,
      }
    : {};
}

async function findSelectedOpportunity(
  prisma: ReturnType<typeof getPrisma>,
  opportunityId: string,
) {
  return prisma.opportunity.findUnique({
    include: {
      boundaryRules: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 8,
        where: {
          status: BoundaryRuleStatus.ACTIVE,
        },
      },
      csmPartner: true,
      followUpPromises: {
        orderBy: {
          dueAt: "asc",
        },
        take: 8,
      },
      hmlClassifications: {
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      },
      notes: {
        orderBy: {
          updatedAt: "desc",
        },
        take: 8,
      },
      peo: true,
      territoryAccount: true,
    },
    where: {
      id: opportunityId,
    },
  });
}

export async function getOpportunityRoomsData(filters: OpportunityRoomsFilters) {
  if (!hasDatabaseEnv()) {
    return {
      counts: {
        active: 0,
        highMomentum: 0,
        openPromises: 0,
        opportunities: 0,
      },
      csmOptions: [],
      databaseReady: false,
      error: "Opportunity records cannot be loaded right now.",
      filters,
      limit: OPPORTUNITY_LIMIT,
      opportunities: [],
      peoOptions: [],
      selectedOpportunity: null,
      territoryOptions: [],
    };
  }

  try {
    const prisma = getPrisma();
    const where = opportunityWhere(filters);
    const [
      opportunities,
      opportunitiesCount,
      active,
      highMomentum,
      openPromises,
      csmOptions,
      peoOptions,
      territoryOptions,
    ] = await Promise.all([
      prisma.opportunity.findMany({
        include: {
          boundaryRules: {
            orderBy: {
              updatedAt: "desc",
            },
            take: 2,
            where: {
              status: BoundaryRuleStatus.ACTIVE,
            },
          },
          csmPartner: {
            select: {
              id: true,
              name: true,
            },
          },
          followUpPromises: {
            orderBy: {
              dueAt: "asc",
            },
            take: 2,
            where: {
              status: "OPEN",
            },
          },
          peo: {
            select: {
              csmPartnerId: true,
              id: true,
              name: true,
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
        take: OPPORTUNITY_LIMIT,
        where,
      }),
      prisma.opportunity.count({
        where,
      }),
      prisma.opportunity.count({
        where: {
          stage: {
            in: [
              OpportunityStage.QUALIFYING,
              OpportunityStage.INTRO_READY,
              OpportunityStage.MEETING_BOOKED,
              OpportunityStage.ACTIVE_DISCOVERY,
            ],
          },
        },
      }),
      prisma.opportunity.count({
        where: {
          momentumLevel: HmlValue.HIGH,
        },
      }),
      prisma.followUpPromise.count({
        where: {
          status: "OPEN",
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
    ]);
    const selectedOpportunityId = filters.opportunityId ?? opportunities[0]?.id;
    const selectedOpportunity =
      (selectedOpportunityId
        ? await findSelectedOpportunity(prisma, selectedOpportunityId)
        : null) ??
      (opportunities[0]
        ? await findSelectedOpportunity(prisma, opportunities[0].id)
        : null);

    return {
      counts: {
        active,
        highMomentum,
        openPromises,
        opportunities: opportunitiesCount,
      },
      csmOptions,
      databaseReady: true,
      error: null,
      filters,
      limit: OPPORTUNITY_LIMIT,
      opportunities,
      peoOptions,
      selectedOpportunity,
      territoryOptions,
    };
  } catch (error) {
    console.error("Opportunity Room load failed", error);

    return {
      counts: {
        active: 0,
        highMomentum: 0,
        openPromises: 0,
        opportunities: 0,
      },
      csmOptions: [],
      databaseReady: false,
      error: "Opportunity records cannot be loaded right now.",
      filters,
      limit: OPPORTUNITY_LIMIT,
      opportunities: [],
      peoOptions: [],
      selectedOpportunity: null,
      territoryOptions: [],
    };
  }
}
