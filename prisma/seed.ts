import nextEnv from "@next/env";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "../src/generated/prisma/client";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const connectionString = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];

if (!connectionString) {
  throw new Error("DIRECT_URL or DATABASE_URL is required to seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
  }),
});

async function main() {
  const ownerEmail = process.env["APP_OWNER_EMAIL"] ?? "antaeus@example.local";
  await prisma.user.upsert({
    where: {
      email: ownerEmail,
    },
    update: {
      isActive: true,
      isCanonOwner: true,
      isProductOwner: true,
      name: "Antaeus",
      role: UserRole.OWNER,
    },
    create: {
      email: ownerEmail,
      isActive: true,
      isCanonOwner: true,
      isProductOwner: true,
      name: "Antaeus",
      role: UserRole.OWNER,
    },
  });

  const placeholder = await prisma.territoryAccount.findFirst({
    where: {
      companyName: "Placeholder Chicagoland Prospect",
    },
  });

  if (placeholder) {
    await prisma.territoryAccount.delete({
      where: {
        id: placeholder.id,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
