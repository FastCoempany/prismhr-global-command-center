import {
  BoundaryRuleStatus,
  BoundaryRuleType,
  BoundaryScopeType,
  BoundarySeverity,
  SourceConfidence,
} from "@/generated/prisma/client";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

const BOUNDARY_RULE_LIMIT = 40;
const OPTION_LIMIT = 100;
const ruleTypeValues = new Set(Object.values(BoundaryRuleType));
const scopeTypeValues = new Set(Object.values(BoundaryScopeType));
const severityValues = new Set(Object.values(BoundarySeverity));
const statusValues = new Set(Object.values(BoundaryRuleStatus));
const confidenceValues = new Set(Object.values(SourceConfidence));

export type BoundaryRulesSearchParams = {
  boundaryId?: string;
  confidence?: string;
  q?: string;
  review?: string;
  ruleType?: string;
  scopeType?: string;
  severity?: string;
  status?: string;
};

export type BoundaryRulesFilters = {
  boundaryId?: string;
  confidence?: SourceConfidence;
  q?: string;
  review?: "due";
  ruleType?: BoundaryRuleType;
  scopeType?: BoundaryScopeType;
  severity?: BoundarySeverity;
  status?: BoundaryRuleStatus;
};

function parseEnum<T extends string>(value: string | undefined, allowed: Set<T>) {
  return value && allowed.has(value as T) ? (value as T) : undefined;
}

export function parseBoundaryRulesFilters(
  searchParams: BoundaryRulesSearchParams,
): BoundaryRulesFilters {
  return {
    boundaryId: searchParams.boundaryId,
    confidence: parseEnum(searchParams.confidence, confidenceValues),
    q: searchParams.q?.trim() || undefined,
    review: searchParams.review === "due" ? "due" : undefined,
    ruleType: parseEnum(searchParams.ruleType, ruleTypeValues),
    scopeType: parseEnum(searchParams.scopeType, scopeTypeValues),
    severity: parseEnum(searchParams.severity, severityValues),
    status: parseEnum(searchParams.status, statusValues),
  };
}

export function buildBoundaryRulesPath(
  filters: BoundaryRulesFilters,
  overrides: Partial<BoundaryRulesFilters> = {},
) {
  const next = {
    ...filters,
    ...overrides,
  };
  const params = new URLSearchParams();

  if (next.boundaryId) params.set("boundaryId", next.boundaryId);
  if (next.confidence) params.set("confidence", next.confidence);
  if (next.q) params.set("q", next.q);
  if (next.review) params.set("review", next.review);
  if (next.ruleType) params.set("ruleType", next.ruleType);
  if (next.scopeType) params.set("scopeType", next.scopeType);
  if (next.severity) params.set("severity", next.severity);
  if (next.status) params.set("status", next.status);

  const query = params.toString();
  return query ? `/boundaries?${query}` : "/boundaries";
}

function boundaryRuleWhere(filters: BoundaryRulesFilters) {
  const clauses: object[] = [];
  const now = new Date();

  if (filters.q) {
    clauses.push({
      OR: [
        {
          title: {
            contains: filters.q,
          },
        },
        {
          description: {
            contains: filters.q,
          },
        },
        {
          reason: {
            contains: filters.q,
          },
        },
        {
          allowedAlternative: {
            contains: filters.q,
          },
        },
        {
          setBy: {
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

  if (filters.review === "due") {
    clauses.push({
      reviewAt: {
        lte: now,
      },
      status: BoundaryRuleStatus.ACTIVE,
    });
  }

  if (filters.ruleType) {
    clauses.push({
      ruleType: filters.ruleType,
    });
  }

  if (filters.scopeType) {
    clauses.push({
      scopeType: filters.scopeType,
    });
  }

  if (filters.severity) {
    clauses.push({
      severity: filters.severity,
    });
  }

  if (filters.status) {
    clauses.push({
      status: filters.status,
    });
  }

  return clauses.length > 0
    ? {
        AND: clauses,
      }
    : {};
}

const boundaryRuleInclude = {
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
      id: true,
      name: true,
    },
  },
  peoClient: {
    select: {
      displayName: true,
      id: true,
      isAnonymized: true,
      peo: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  territoryAccount: {
    select: {
      city: true,
      companyName: true,
      id: true,
    },
  },
};

async function findSelectedBoundaryRule(
  prisma: ReturnType<typeof getPrisma>,
  boundaryId: string,
) {
  return prisma.boundaryRule.findUnique({
    include: boundaryRuleInclude,
    where: {
      id: boundaryId,
    },
  });
}

export async function getBoundaryRulesData(filters: BoundaryRulesFilters) {
  if (!hasDatabaseEnv()) {
    return {
      counts: {
        active: 0,
        approvalRequired: 0,
        blocked: 0,
        reviewDue: 0,
        rules: 0,
      },
      csmOptions: [],
      databaseReady: false,
      error: "Boundary records cannot be loaded right now.",
      filters,
      limit: BOUNDARY_RULE_LIMIT,
      opportunityOptions: [],
      peoOptions: [],
      rules: [],
      selectedRule: null,
      territoryOptions: [],
    };
  }

  try {
    const prisma = getPrisma();
    const where = boundaryRuleWhere(filters);
    const now = new Date();
    const [
      rules,
      rulesCount,
      active,
      blocked,
      approvalRequired,
      reviewDue,
      csmOptions,
      peoOptions,
      opportunityOptions,
      territoryOptions,
    ] = await Promise.all([
      prisma.boundaryRule.findMany({
        include: boundaryRuleInclude,
        orderBy: [
          {
            severity: "desc",
          },
          {
            updatedAt: "desc",
          },
        ],
        take: BOUNDARY_RULE_LIMIT,
        where,
      }),
      prisma.boundaryRule.count({
        where,
      }),
      prisma.boundaryRule.count({
        where: {
          status: BoundaryRuleStatus.ACTIVE,
        },
      }),
      prisma.boundaryRule.count({
        where: {
          severity: BoundarySeverity.BLOCKED,
          status: BoundaryRuleStatus.ACTIVE,
        },
      }),
      prisma.boundaryRule.count({
        where: {
          severity: BoundarySeverity.APPROVAL_REQUIRED,
          status: BoundaryRuleStatus.ACTIVE,
        },
      }),
      prisma.boundaryRule.count({
        where: {
          reviewAt: {
            lte: now,
          },
          status: BoundaryRuleStatus.ACTIVE,
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
    const selectedBoundaryId = filters.boundaryId ?? rules[0]?.id;
    const selectedRule =
      (selectedBoundaryId
        ? await findSelectedBoundaryRule(prisma, selectedBoundaryId)
        : null) ??
      (rules[0] ? await findSelectedBoundaryRule(prisma, rules[0].id) : null);

    return {
      counts: {
        active,
        approvalRequired,
        blocked,
        reviewDue,
        rules: rulesCount,
      },
      csmOptions,
      databaseReady: true,
      error: null,
      filters,
      limit: BOUNDARY_RULE_LIMIT,
      opportunityOptions,
      peoOptions,
      rules,
      selectedRule,
      territoryOptions,
    };
  } catch (error) {
    console.error("Boundary Rules load failed", error);

    return {
      counts: {
        active: 0,
        approvalRequired: 0,
        blocked: 0,
        reviewDue: 0,
        rules: 0,
      },
      csmOptions: [],
      databaseReady: false,
      error: "Boundary records cannot be loaded right now.",
      filters,
      limit: BOUNDARY_RULE_LIMIT,
      opportunityOptions: [],
      peoOptions: [],
      rules: [],
      selectedRule: null,
      territoryOptions: [],
    };
  }
}
