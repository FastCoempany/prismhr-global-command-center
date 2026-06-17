import { HmlValue, PermissionState, SourceConfidence } from "@/generated/prisma/client";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

const ACCOUNT_PAGE_SIZE = 25;
const visibleAccountWhere = {
  NOT: [{ companyName: "Placeholder Chicagoland Prospect" }, { category: "Placeholder" }],
};
const hmlValues = new Set(Object.values(HmlValue));
const sourceConfidenceValues = new Set(Object.values(SourceConfidence));
const permissionValues = new Set(Object.values(PermissionState));
const freshnessValues = new Set<"fresh" | "stale" | "missing">([
  "fresh",
  "stale",
  "missing",
]);
const sortValues = new Set<"updated" | "company" | "priority" | "source" | "freshness">([
  "updated",
  "company",
  "priority",
  "source",
  "freshness",
]);

export type ProspectFieldSearchParams = {
  accountId?: string;
  confidence?: string;
  freshness?: string;
  hml?: string;
  permission?: string;
  q?: string;
  sort?: string;
};

type ProspectFieldFilters = {
  accountId?: string;
  confidence?: SourceConfidence;
  freshness?: "fresh" | "stale" | "missing";
  hml?: HmlValue;
  permission?: PermissionState;
  q?: string;
  sort: "updated" | "company" | "priority" | "source" | "freshness";
};

function parseEnum<T extends string>(value: string | undefined, allowed: Set<T>) {
  return value && allowed.has(value as T) ? (value as T) : undefined;
}

export function parseProspectFieldFilters(
  searchParams: ProspectFieldSearchParams,
): ProspectFieldFilters {
  return {
    accountId: searchParams.accountId,
    confidence: parseEnum(searchParams.confidence, sourceConfidenceValues),
    freshness: parseEnum(searchParams.freshness, freshnessValues),
    hml: parseEnum(searchParams.hml, hmlValues),
    permission: parseEnum(searchParams.permission, permissionValues),
    q: searchParams.q?.trim() || undefined,
    sort: parseEnum(searchParams.sort, sortValues) ?? "updated",
  };
}

export function buildProspectFieldPath(
  filters: ProspectFieldFilters,
  overrides: Partial<ProspectFieldFilters> = {},
) {
  const next = {
    ...filters,
    ...overrides,
  };
  const params = new URLSearchParams();

  if (next.accountId) params.set("accountId", next.accountId);
  if (next.confidence) params.set("confidence", next.confidence);
  if (next.freshness) params.set("freshness", next.freshness);
  if (next.hml) params.set("hml", next.hml);
  if (next.permission) params.set("permission", next.permission);
  if (next.q) params.set("q", next.q);
  if (next.sort !== "updated") params.set("sort", next.sort);

  const query = params.toString();
  return query ? `/prospect-field?${query}` : "/prospect-field";
}

function accountWhere(filters: ProspectFieldFilters) {
  const clauses: object[] = [visibleAccountWhere];
  const now = new Date();

  if (filters.q) {
    clauses.push({
      OR: [
        {
          companyName: {
            contains: filters.q,
          },
        },
        {
          city: {
            contains: filters.q,
          },
        },
        {
          category: {
            contains: filters.q,
          },
        },
      ],
    });
  }

  if (filters.permission) {
    clauses.push({
      permissionState: filters.permission,
    });
  }

  if (filters.confidence) {
    clauses.push({
      sourceConfidence: filters.confidence,
    });
  }

  if (filters.hml) {
    clauses.push({
      hmlClassifications: {
        some: {
          classification: filters.hml,
        },
      },
    });
  }

  if (filters.freshness === "stale") {
    clauses.push({
      evidence: {
        some: {
          staleAfter: {
            lte: now,
          },
        },
      },
    });
  }

  if (filters.freshness === "fresh") {
    clauses.push({
      evidence: {
        some: {
          OR: [
            {
              staleAfter: null,
            },
            {
              staleAfter: {
                gt: now,
              },
            },
          ],
        },
      },
    });
  }

  if (filters.freshness === "missing") {
    clauses.push({
      evidence: {
        none: {},
      },
    });
  }

  return {
    AND: clauses,
  };
}

function accountOrderBy(sort: ProspectFieldFilters["sort"]) {
  if (sort === "company") {
    return [
      {
        companyName: "asc" as const,
      },
    ];
  }

  if (sort === "priority") {
    return [
      {
        priorityScore: "desc" as const,
      },
      {
        updatedAt: "desc" as const,
      },
    ];
  }

  if (sort === "source") {
    return [
      {
        sourceConfidence: "asc" as const,
      },
      {
        updatedAt: "desc" as const,
      },
    ];
  }

  return [
    {
      updatedAt: "desc" as const,
    },
  ];
}

function sourceFreshnessRank(account: {
  evidence: Array<{
    staleAfter: Date | null;
  }>;
  updatedAt: Date;
}) {
  const latestEvidence = account.evidence[0];

  if (!latestEvidence) return 2;
  if (latestEvidence.staleAfter && latestEvidence.staleAfter.getTime() <= Date.now()) {
    return 1;
  }
  return 0;
}

async function findSelectedAccount(
  prisma: ReturnType<typeof getPrisma>,
  accountId: string,
) {
  return prisma.territoryAccount.findFirst({
    include: {
      evidence: {
        orderBy: {
          updatedAt: "desc" as const,
        },
        take: 8,
      },
      hmlClassifications: {
        orderBy: {
          createdAt: "desc" as const,
        },
        take: 5,
      },
      internalUnknowns: {
        orderBy: {
          updatedAt: "desc" as const,
        },
        take: 5,
        where: {
          status: "OPEN" as const,
        },
      },
      notes: {
        orderBy: {
          updatedAt: "desc" as const,
        },
        take: 5,
      },
      permissionHistory: {
        orderBy: {
          createdAt: "desc" as const,
        },
        take: 5,
      },
    },
    where: {
      AND: [
        visibleAccountWhere,
        {
          id: accountId,
        },
      ],
    },
  });
}

export async function getProspectFieldData(filters: ProspectFieldFilters) {
  if (!hasDatabaseEnv()) {
    return {
      accountLimit: ACCOUNT_PAGE_SIZE,
      accounts: [],
      databaseReady: false,
      error: "Prospect records cannot be loaded from this environment.",
      filters,
      selectedAccount: null,
      totalAccounts: 0,
      unknowns: [],
    };
  }

  try {
    const prisma = getPrisma();
    const where = accountWhere(filters);
    const [accountPage, totalAccounts, unknowns] = await Promise.all([
      prisma.territoryAccount.findMany({
        include: {
          evidence: {
            orderBy: {
              updatedAt: "desc",
            },
            take: 1,
          },
          hmlClassifications: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
          internalUnknowns: {
            where: {
              status: "OPEN",
            },
            take: 3,
          },
        },
        orderBy: accountOrderBy(filters.sort),
        take: ACCOUNT_PAGE_SIZE,
        where,
      }),
      prisma.territoryAccount.count({
        where,
      }),
      prisma.internalUnknown.findMany({
        orderBy: {
          updatedAt: "desc",
        },
        take: 5,
        where: {
          status: "OPEN",
        },
      }),
    ]);
    const accounts =
      filters.sort === "freshness"
        ? [...accountPage].sort((a, b) => {
            const freshnessDelta = sourceFreshnessRank(a) - sourceFreshnessRank(b);
            if (freshnessDelta !== 0) return freshnessDelta;
            return b.updatedAt.getTime() - a.updatedAt.getTime();
          })
        : accountPage;
    const selectedAccountId = filters.accountId ?? accounts[0]?.id;
    const selectedAccount =
      (selectedAccountId ? await findSelectedAccount(prisma, selectedAccountId) : null) ??
      (accounts[0] ? await findSelectedAccount(prisma, accounts[0].id) : null);

    return {
      accountLimit: ACCOUNT_PAGE_SIZE,
      accounts,
      databaseReady: true,
      error: null,
      filters,
      selectedAccount,
      totalAccounts,
      unknowns,
    };
  } catch (error) {
    console.error("Prospect Field database load failed", error);

    return {
      accountLimit: ACCOUNT_PAGE_SIZE,
      accounts: [],
      databaseReady: false,
      error: "Prospect records cannot be loaded right now.",
      filters,
      selectedAccount: null,
      totalAccounts: 0,
      unknowns: [],
    };
  }
}
