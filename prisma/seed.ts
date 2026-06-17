import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  CanonStatus,
  EvidenceType,
  HmlCategory,
  HmlValue,
  NoteSensitivity,
  NoteType,
  PermissionState,
  PrismaClient,
  ProductRelevance,
  SourceConfidence,
  TerritoryAccountStatus,
  UserRole,
} from "../src/generated/prisma/client";

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
  const antaeus = await prisma.user.upsert({
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

  const existing = await prisma.territoryAccount.findFirst({
    where: {
      companyName: "Placeholder Chicagoland Prospect",
    },
  });

  if (existing) {
    await prisma.hmlClassification.updateMany({
      data: {
        ruleVersion: "v0.1-prospect-field",
      },
      where: {
        accountId: existing.id,
        contributingSignals: {
          has: "placeholder_seed_record",
        },
      },
    });
  } else {
    await prisma.territoryAccount.create({
      data: {
        boundaryRisk: HmlValue.LOW,
        canonStatus: CanonStatus.HYPOTHESIS,
        category: "Placeholder",
        channelSignal: HmlValue.MEDIUM,
        city: "Chicago",
        companyName: "Placeholder Chicagoland Prospect",
        complexitySignal: HmlValue.MEDIUM,
        contractorSignal: HmlValue.MEDIUM,
        fitSummary:
          "Placeholder record for validating Prospect Field workflow shape. Replace with sourced public research before use.",
        hiringSignal: HmlValue.MEDIUM,
        internationalSignal: HmlValue.MEDIUM,
        nextSafestAction: "Record a real public source before making any recommendation.",
        ownerId: antaeus.id,
        permissionState: PermissionState.RESEARCH_ONLY,
        priorityScore: 50,
        productRelevance: [ProductRelevance.EOR, ProductRelevance.CONTRACTOR_MANAGEMENT],
        sourceConfidence: SourceConfidence.HYPOTHESIS,
        status: TerritoryAccountStatus.RESEARCH_ONLY,
        evidence: {
          create: {
            canonStatus: CanonStatus.HYPOTHESIS,
            capturedClaim: "Seed data only. This is not a real prospecting claim.",
            confidence: SourceConfidence.HYPOTHESIS,
            title: "Placeholder source evidence",
            type: EvidenceType.USER_ASSERTION,
          },
        },
        hmlClassifications: {
          create: {
            category: HmlCategory.TERRITORY_ACCOUNT_POTENTIAL,
            classification: HmlValue.MEDIUM,
            confidence: SourceConfidence.HYPOTHESIS,
            contributingSignals: ["placeholder_seed_record"],
            explanation:
              "Medium because this is a placeholder seed record for validating workflow structure only.",
            recommendedNextAction:
              "Replace placeholder with sourced public research before action.",
            ruleVersion: "v0.1-prospect-field",
          },
        },
        notes: {
          create: {
            body: "Seed note. No real customer, company, or relationship data.",
            noteType: NoteType.RESEARCH_NOTE,
            sensitivity: NoteSensitivity.INTERNAL_ONLY,
            sourceConfidence: SourceConfidence.HYPOTHESIS,
          },
        },
        permissionHistory: {
          create: {
            reason: "Seed records begin as research-only.",
            setBy: "seed",
            state: PermissionState.RESEARCH_ONLY,
          },
        },
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
