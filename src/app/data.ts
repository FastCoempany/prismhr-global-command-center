import { HmlValue } from "@/generated/prisma/client";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import {
  emptyHmlCounts,
  type HmlPriorityItem,
  type HmlPrioritySummary,
} from "@/lib/hml-priority";

const DASHBOARD_SIGNAL_LIMIT = 8;
const DASHBOARD_ACCOUNT_LIMIT = 5;

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
  totalOpenUnknowns: number;
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
    totalOpenUnknowns: 0,
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
    const [classifications, groupedCounts, accounts, totalAccounts, totalOpenUnknowns] =
      await Promise.all([
        prisma.hmlClassification.findMany({
          include: {
            account: {
              select: {
                companyName: true,
                id: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: DASHBOARD_SIGNAL_LIMIT,
        }),
        prisma.hmlClassification.groupBy({
          by: ["classification"],
          _count: {
            classification: true,
          },
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
        }),
        prisma.territoryAccount.count(),
        prisma.internalUnknown.count({
          where: {
            status: "OPEN",
          },
        }),
      ]);

    const counts = emptyHmlCounts();
    groupedCounts.forEach((group) => {
      counts[group.classification] = group._count.classification;
    });

    const items: HmlPriorityItem[] = classifications.map((classification) => ({
      category: classification.category,
      classification: classification.classification,
      confidence: classification.confidence,
      explanation: classification.explanation,
      href: classification.accountId
        ? `/prospect-field#account-${classification.accountId}`
        : undefined,
      id: classification.id,
      label: classification.account?.companyName ?? "Unlinked signal",
      recommendedNextAction: classification.recommendedNextAction,
    }));

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
      totalOpenUnknowns,
    };
  } catch (error) {
    console.error("Dashboard load failed", error);
    return emptyDashboardData("Dashboard records cannot be loaded right now.");
  }
}
