import { getPrisma, hasDatabaseEnv } from "@/lib/db";

const ACCOUNT_PAGE_SIZE = 25;

export async function getProspectFieldData() {
  if (!hasDatabaseEnv()) {
    return {
      accountLimit: ACCOUNT_PAGE_SIZE,
      accounts: [],
      databaseReady: false,
      error:
        "Database environment variables are not available locally. Vercel can still build, but cloud data cannot be queried here.",
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
      }),
      prisma.territoryAccount.count(),
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
      error:
        "Prospect Field tables are not queryable yet. Apply the Prisma migration and verify Supabase env vars.",
      totalAccounts: 0,
      unknowns: [],
    };
  }
}
