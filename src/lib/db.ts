import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function databaseUrl() {
  const url = process.env["DATABASE_URL"] ?? process.env["DIRECT_URL"];

  if (!url) {
    throw new Error("DATABASE_URL or DIRECT_URL is required.");
  }

  return url;
}

export function hasDatabaseEnv() {
  return Boolean(process.env["DATABASE_URL"] || process.env["DIRECT_URL"]);
}

export function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: databaseUrl(),
      }),
    });
  }

  return globalForPrisma.prisma;
}
