import {
  BoundaryRuleStatus,
  BoundarySeverity,
  DailyServeOutcome,
  DailyServeStatus,
  FollowUpPromiseStatus,
  HmlValue,
} from "@/generated/prisma/client";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import {
  emptyHmlCounts,
  type HmlPriorityItem,
  type HmlPrioritySummary,
} from "@/lib/hml-priority";

const DASHBOARD_SIGNAL_LIMIT = 8;
const DASHBOARD_ACCOUNT_LIMIT = 5;
const visibleAccountWhere = {
  NOT: [{ companyName: "Placeholder Chicagoland Prospect" }, { category: "Placeholder" }],
};
const visibleClassificationWhere = {
  NOT: {
    contributingSignals: {
      has: "placeholder_seed_record",
    },
  },
};

type DashboardData = {
  accounts: Array<{
    companyName: string;
    id: string;
    nextSafestAction: string;
    permissionState: string;
    sourceConfidence: string;
  }>;
  databaseReady: boolean;
  error: string | null;
  hmlSummary: HmlPrioritySummary;
  totalAccounts: number;
  totalActiveBoundaryRules: number;
  totalBlockedBoundaryRules: number;
  totalPendingDailyServeOutcomes: number;
  totalPositiveDailyServeOutcomes: number;
  totalSentDailyServes: number;
  totalOpenUnknowns: number;
  totalOverduePromises: number;
};

function emptyDashboardData(error: string | null): DashboardData {
  return {
    accounts: [],
    databaseReady: false,
    error,
    hmlSummary: {
      counts: emptyHmlCounts(),
      items: [],
      total: 0,
    },
    totalAccounts: 0,
    totalActiveBoundaryRules: 0,
    totalBlockedBoundaryRules: 0,
    totalPendingDailyServeOutcomes: 0,
    totalPositiveDailyServeOutcomes: 0,
    totalSentDailyServes: 0,
    totalOpenUnknowns: 0,
    totalOverduePromises: 0,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  if (!hasDatabaseEnv()) {
    return emptyDashboardData(
      "Dashboard records cannot be loaded from this environment.",
    );
  }

  try {
    const prisma = getPrisma();
    const now = new Date();
    const [
      classifications,
      groupedCounts,
      accounts,
      totalAccounts,
      totalOpenUnknowns,
      totalOverduePromises,
      totalActiveBoundaryRules,
      totalBlockedBoundaryRules,
      totalPendingDailyServeOutcomes,
      totalPositiveDailyServeOutcomes,
      totalSentDailyServes,
    ] = await Promise.all([
      prisma.hmlClassification.findMany({
        include: {
          account: {
            select: {
              companyName: true,
              id: true,
            },
          },
          csmPartner: {
            select: {
              id: true,
              name: true,
            },
          },
          opportunity: {
            select: {
              csmPartnerId: true,
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
          peo: {
            select: {
              csmPartnerId: true,
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: DASHBOARD_SIGNAL_LIMIT,
        where: visibleClassificationWhere,
      }),
      prisma.hmlClassification.groupBy({
        by: ["classification"],
        _count: {
          classification: true,
        },
        where: visibleClassificationWhere,
      }),
      prisma.territoryAccount.findMany({
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          companyName: true,
          id: true,
          nextSafestAction: true,
          permissionState: true,
          sourceConfidence: true,
        },
        take: DASHBOARD_ACCOUNT_LIMIT,
        where: visibleAccountWhere,
      }),
      prisma.territoryAccount.count({
        where: visibleAccountWhere,
      }),
      prisma.internalUnknown.count({
        where: {
          status: "OPEN",
        },
      }),
      prisma.followUpPromise.count({
        where: {
          dueAt: {
            lt: now,
          },
          status: FollowUpPromiseStatus.OPEN,
        },
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
      prisma.dailyServe.count({
        where: {
          outcome: DailyServeOutcome.PENDING,
        },
      }),
      prisma.dailyServe.count({
        where: {
          outcome: {
            in: [
              DailyServeOutcome.USED_BY_CSM,
              DailyServeOutcome.FORWARDED,
              DailyServeOutcome.REPLIED,
              DailyServeOutcome.CREATED_NEXT_STEP,
              DailyServeOutcome.CONVERTED_TO_OPPORTUNITY,
            ],
          },
        },
      }),
      prisma.dailyServe.count({
        where: {
          status: DailyServeStatus.SENT,
        },
      }),
    ]);

    const counts = emptyHmlCounts();
    groupedCounts.forEach((group) => {
      counts[group.classification] = group._count.classification;
    });

    const items: HmlPriorityItem[] = classifications.map((classification) => {
      const partnerId =
        classification.csmPartner?.id ??
        classification.peo?.csmPartnerId ??
        classification.opportunity?.csmPartnerId;

      return {
        category: classification.category,
        classification: classification.classification,
        confidence: classification.confidence,
        explanation: classification.explanation,
        href: classification.accountId
          ? `/prospect-field#account-${classification.accountId}`
          : classification.dailyServe?.id
            ? `/daily-serves?${new URLSearchParams({
                dailyServeId: classification.dailyServe.id,
              }).toString()}`
            : classification.opportunity?.id
              ? `/opportunities?${new URLSearchParams({
                  opportunityId: classification.opportunity.id,
                }).toString()}`
              : partnerId
                ? `/partners?${new URLSearchParams({ partnerId }).toString()}`
                : undefined,
        id: classification.id,
        label:
          classification.account?.companyName ??
          classification.csmPartner?.name ??
          classification.peo?.name ??
          classification.opportunity?.name ??
          classification.dailyServe?.title ??
          "Unlinked signal",
        recommendedNextAction: classification.recommendedNextAction,
      };
    });

    return {
      accounts,
      databaseReady: true,
      error: null,
      hmlSummary: {
        counts,
        items,
        total: counts[HmlValue.HIGH] + counts[HmlValue.MEDIUM] + counts[HmlValue.LOW],
      },
      totalAccounts,
      totalActiveBoundaryRules,
      totalBlockedBoundaryRules,
      totalPendingDailyServeOutcomes,
      totalPositiveDailyServeOutcomes,
      totalSentDailyServes,
      totalOpenUnknowns,
      totalOverduePromises,
    };
  } catch (error) {
    console.error("Dashboard load failed", error);
    return emptyDashboardData("Dashboard records cannot be loaded right now.");
  }
}
