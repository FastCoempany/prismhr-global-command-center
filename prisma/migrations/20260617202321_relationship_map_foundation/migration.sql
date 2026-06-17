-- CreateEnum
CREATE TYPE "CsmPartnerStatus" AS ENUM ('ACTIVE', 'WATCH', 'PARKED');

-- CreateEnum
CREATE TYPE "OpportunitySourceType" AS ENUM ('CSM', 'PEO', 'PEO_CLIENT', 'TERRITORY_ACCOUNT', 'EXTERNAL_CHANNEL', 'MANUAL_RESEARCH');

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('RESEARCH', 'CSM_CONTEXT_NEEDED', 'QUALIFYING', 'INTRO_READY', 'MEETING_BOOKED', 'ACTIVE_DISCOVERY', 'PARKED', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "FollowUpPromiseStatus" AS ENUM ('OPEN', 'DEFERRED', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "HmlCategory" ADD VALUE 'CSM_RELATIONSHIP_HEAT';
ALTER TYPE "HmlCategory" ADD VALUE 'PEO_READINESS';
ALTER TYPE "HmlCategory" ADD VALUE 'PEO_PROTECTIVENESS';
ALTER TYPE "HmlCategory" ADD VALUE 'OPPORTUNITY_MOMENTUM';
ALTER TYPE "HmlCategory" ADD VALUE 'FOLLOW_UP_URGENCY';

-- AlterTable
ALTER TABLE "HmlClassification" ADD COLUMN     "csmPartnerId" TEXT,
ADD COLUMN     "opportunityId" TEXT,
ADD COLUMN     "peoId" TEXT;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "csmPartnerId" TEXT,
ADD COLUMN     "opportunityId" TEXT,
ADD COLUMN     "peoId" TEXT;

-- CreateTable
CREATE TABLE "CSMPartner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "status" "CsmPartnerStatus" NOT NULL DEFAULT 'ACTIVE',
    "relationshipHeat" "HmlValue" NOT NULL DEFAULT 'MEDIUM',
    "protectivenessLevel" "HmlValue" NOT NULL DEFAULT 'MEDIUM',
    "communicationCadence" TEXT,
    "preferredIntroMotion" TEXT,
    "preferredFollowupMotion" TEXT,
    "privateDebriefRequired" BOOLEAN NOT NULL DEFAULT true,
    "dosAndDonts" TEXT,
    "trustSurfaceNotes" TEXT,
    "permissionState" "PermissionState" NOT NULL DEFAULT 'CSM_CONTEXT_NEEDED',
    "sourceConfidence" "SourceConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "canonStatus" "CanonStatus" NOT NULL DEFAULT 'HYPOTHESIS',
    "nextSafestAction" TEXT NOT NULL,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastReviewedAt" TIMESTAMP(3),

    CONSTRAINT "CSMPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PEO" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "csmPartnerId" TEXT,
    "publicResearchSummary" TEXT,
    "industryFocus" TEXT,
    "clientBaseNotes" TEXT,
    "globalFitSignals" TEXT,
    "readinessLevel" "HmlValue" NOT NULL DEFAULT 'MEDIUM',
    "protectivenessLevel" "HmlValue" NOT NULL DEFAULT 'MEDIUM',
    "boundaryRisk" "HmlValue" NOT NULL DEFAULT 'MEDIUM',
    "permissionState" "PermissionState" NOT NULL DEFAULT 'CSM_CONTEXT_NEEDED',
    "sourceConfidence" "SourceConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "canonStatus" "CanonStatus" NOT NULL DEFAULT 'HYPOTHESIS',
    "offLimitsSummary" TEXT,
    "nextSafestAction" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastReviewedAt" TIMESTAMP(3),

    CONSTRAINT "PEO_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PEOClient" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "peoId" TEXT NOT NULL,
    "industry" TEXT,
    "countries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "workerTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "useCaseFit" TEXT,
    "permissionState" "PermissionState" NOT NULL DEFAULT 'CSM_CONTEXT_NEEDED',
    "sourceConfidence" "SourceConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "boundaryRisk" "HmlValue" NOT NULL DEFAULT 'MEDIUM',
    "noteSensitivity" "NoteSensitivity" NOT NULL DEFAULT 'INTERNAL_ONLY',
    "isAnonymized" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PEOClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" "OpportunitySourceType" NOT NULL DEFAULT 'MANUAL_RESEARCH',
    "csmPartnerId" TEXT,
    "peoId" TEXT,
    "peoClientId" TEXT,
    "territoryAccountId" TEXT,
    "productInterest" "ProductRelevance"[] DEFAULT ARRAY[]::"ProductRelevance"[],
    "stage" "OpportunityStage" NOT NULL DEFAULT 'RESEARCH',
    "nextStep" TEXT NOT NULL,
    "nextStepOwner" TEXT,
    "followUpDueAt" TIMESTAMP(3),
    "permissionState" "PermissionState" NOT NULL DEFAULT 'CSM_CONTEXT_NEEDED',
    "momentumLevel" "HmlValue" NOT NULL DEFAULT 'MEDIUM',
    "riskFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceConfidence" "SourceConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "canonStatus" "CanonStatus" NOT NULL DEFAULT 'HYPOTHESIS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpPromise" (
    "id" TEXT NOT NULL,
    "promise" TEXT NOT NULL,
    "madeTo" TEXT NOT NULL,
    "ownerId" TEXT,
    "csmPartnerId" TEXT,
    "peoId" TEXT,
    "opportunityId" TEXT,
    "territoryAccountId" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpPromiseStatus" NOT NULL DEFAULT 'OPEN',
    "sensitivity" "NoteSensitivity" NOT NULL DEFAULT 'INTERNAL_ONLY',
    "sourceConfidence" "SourceConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "overdueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpPromise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CSMPartner_email_key" ON "CSMPartner"("email");

-- CreateIndex
CREATE INDEX "CSMPartner_name_idx" ON "CSMPartner"("name");

-- CreateIndex
CREATE INDEX "CSMPartner_status_idx" ON "CSMPartner"("status");

-- CreateIndex
CREATE INDEX "CSMPartner_permissionState_idx" ON "CSMPartner"("permissionState");

-- CreateIndex
CREATE INDEX "CSMPartner_relationshipHeat_idx" ON "CSMPartner"("relationshipHeat");

-- CreateIndex
CREATE INDEX "PEO_name_idx" ON "PEO"("name");

-- CreateIndex
CREATE INDEX "PEO_csmPartnerId_idx" ON "PEO"("csmPartnerId");

-- CreateIndex
CREATE INDEX "PEO_permissionState_idx" ON "PEO"("permissionState");

-- CreateIndex
CREATE INDEX "PEO_readinessLevel_idx" ON "PEO"("readinessLevel");

-- CreateIndex
CREATE INDEX "PEO_protectivenessLevel_idx" ON "PEO"("protectivenessLevel");

-- CreateIndex
CREATE INDEX "PEOClient_peoId_idx" ON "PEOClient"("peoId");

-- CreateIndex
CREATE INDEX "PEOClient_permissionState_idx" ON "PEOClient"("permissionState");

-- CreateIndex
CREATE INDEX "PEOClient_boundaryRisk_idx" ON "PEOClient"("boundaryRisk");

-- CreateIndex
CREATE INDEX "Opportunity_stage_idx" ON "Opportunity"("stage");

-- CreateIndex
CREATE INDEX "Opportunity_csmPartnerId_idx" ON "Opportunity"("csmPartnerId");

-- CreateIndex
CREATE INDEX "Opportunity_peoId_idx" ON "Opportunity"("peoId");

-- CreateIndex
CREATE INDEX "Opportunity_peoClientId_idx" ON "Opportunity"("peoClientId");

-- CreateIndex
CREATE INDEX "Opportunity_territoryAccountId_idx" ON "Opportunity"("territoryAccountId");

-- CreateIndex
CREATE INDEX "Opportunity_permissionState_idx" ON "Opportunity"("permissionState");

-- CreateIndex
CREATE INDEX "Opportunity_momentumLevel_idx" ON "Opportunity"("momentumLevel");

-- CreateIndex
CREATE INDEX "FollowUpPromise_ownerId_idx" ON "FollowUpPromise"("ownerId");

-- CreateIndex
CREATE INDEX "FollowUpPromise_csmPartnerId_idx" ON "FollowUpPromise"("csmPartnerId");

-- CreateIndex
CREATE INDEX "FollowUpPromise_peoId_idx" ON "FollowUpPromise"("peoId");

-- CreateIndex
CREATE INDEX "FollowUpPromise_opportunityId_idx" ON "FollowUpPromise"("opportunityId");

-- CreateIndex
CREATE INDEX "FollowUpPromise_territoryAccountId_idx" ON "FollowUpPromise"("territoryAccountId");

-- CreateIndex
CREATE INDEX "FollowUpPromise_status_idx" ON "FollowUpPromise"("status");

-- CreateIndex
CREATE INDEX "FollowUpPromise_dueAt_idx" ON "FollowUpPromise"("dueAt");

-- CreateIndex
CREATE INDEX "HmlClassification_csmPartnerId_idx" ON "HmlClassification"("csmPartnerId");

-- CreateIndex
CREATE INDEX "HmlClassification_peoId_idx" ON "HmlClassification"("peoId");

-- CreateIndex
CREATE INDEX "HmlClassification_opportunityId_idx" ON "HmlClassification"("opportunityId");

-- CreateIndex
CREATE INDEX "Note_csmPartnerId_idx" ON "Note"("csmPartnerId");

-- CreateIndex
CREATE INDEX "Note_peoId_idx" ON "Note"("peoId");

-- CreateIndex
CREATE INDEX "Note_opportunityId_idx" ON "Note"("opportunityId");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_csmPartnerId_fkey" FOREIGN KEY ("csmPartnerId") REFERENCES "CSMPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_peoId_fkey" FOREIGN KEY ("peoId") REFERENCES "PEO"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CSMPartner" ADD CONSTRAINT "CSMPartner_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PEO" ADD CONSTRAINT "PEO_csmPartnerId_fkey" FOREIGN KEY ("csmPartnerId") REFERENCES "CSMPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PEOClient" ADD CONSTRAINT "PEOClient_peoId_fkey" FOREIGN KEY ("peoId") REFERENCES "PEO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_csmPartnerId_fkey" FOREIGN KEY ("csmPartnerId") REFERENCES "CSMPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_peoId_fkey" FOREIGN KEY ("peoId") REFERENCES "PEO"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_peoClientId_fkey" FOREIGN KEY ("peoClientId") REFERENCES "PEOClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_territoryAccountId_fkey" FOREIGN KEY ("territoryAccountId") REFERENCES "TerritoryAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpPromise" ADD CONSTRAINT "FollowUpPromise_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpPromise" ADD CONSTRAINT "FollowUpPromise_csmPartnerId_fkey" FOREIGN KEY ("csmPartnerId") REFERENCES "CSMPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpPromise" ADD CONSTRAINT "FollowUpPromise_peoId_fkey" FOREIGN KEY ("peoId") REFERENCES "PEO"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpPromise" ADD CONSTRAINT "FollowUpPromise_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpPromise" ADD CONSTRAINT "FollowUpPromise_territoryAccountId_fkey" FOREIGN KEY ("territoryAccountId") REFERENCES "TerritoryAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HmlClassification" ADD CONSTRAINT "HmlClassification_csmPartnerId_fkey" FOREIGN KEY ("csmPartnerId") REFERENCES "CSMPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HmlClassification" ADD CONSTRAINT "HmlClassification_peoId_fkey" FOREIGN KEY ("peoId") REFERENCES "PEO"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HmlClassification" ADD CONSTRAINT "HmlClassification_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
