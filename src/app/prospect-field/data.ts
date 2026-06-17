import { getPrisma, hasDatabaseEnv } from "@/lib/db";

export async function getProspectFieldData() {
  if (!hasDatabaseEnv()) {
    return {
      accounts: [],
      databaseReady: false,
      error:
        "Database environment variables are not available locally. Vercel can still build, but cloud data cannot be queried here.",
      unknowns: [],
    };
  }

  try {
    const prisma = getPrisma();
    const [accounts, unknowns] = await Promise.all([
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
      accounts,
      databaseReady: true,
      error: null,
      unknowns,
    };
  } catch (error) {
    console.error("Prospect Field database load failed", error);

    return {
      accounts: [],
      databaseReady: false,
      error:
        "Prospect Field tables are not queryable yet. Apply the Prisma migration and verify Supabase env vars.",
      unknowns: [],
    };
  }
}
