import { getPrisma, hasDatabaseEnv } from "@/lib/db";

const ACCOUNT_PAGE_SIZE = 25;
const visibleAccountWhere = {
  NOT: [{ companyName: "Placeholder Chicagoland Prospect" }, { category: "Placeholder" }],
};

export async function getProspectFieldData() {
  if (!hasDatabaseEnv()) {
    return {
      accountLimit: ACCOUNT_PAGE_SIZE,
      accounts: [],
      databaseReady: false,
      error: "Prospect records cannot be loaded from this environment.",
      totalAccounts: 0,
      unknowns: [],
    };
  }

  try {
    const prisma = getPrisma();
    const [accounts, totalAccounts, unknowns] = await Promise.all([
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
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        take: ACCOUNT_PAGE_SIZE,
        where: visibleAccountWhere,
      }),
      prisma.territoryAccount.count({
        where: visibleAccountWhere,
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

    return {
      accountLimit: ACCOUNT_PAGE_SIZE,
      accounts,
      databaseReady: true,
      error: null,
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
      totalAccounts: 0,
      unknowns: [],
    };
  }
}
