-- CreateEnum
CREATE TYPE "DailyServeCategory" AS ENUM ('PEO_TALKING_POINT', 'CLIENT_FIT_SIGNAL', 'PRODUCT_EXPLAINER', 'USE_CASE_BLURB', 'DISCOVERY_QUESTION', 'COMPLIANCE_WATCHOUT', 'OBJECTION_RESPONSE', 'MEETING_PREP', 'FOLLOW_UP_LANGUAGE');

-- CreateEnum
CREATE TYPE "DailyServeStatus" AS ENUM ('DRAFT', 'READY', 'SENT', 'HELD', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DailyServeOutcome" AS ENUM ('PENDING', 'USED_BY_CSM', 'FORWARDED', 'REPLIED', 'CREATED_NEXT_STEP', 'CONVERTED_TO_OPPORTUNITY', 'NO_RESPONSE', 'NOT_USEFUL');

-- CreateTable
CREATE TABLE "DailyServe" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "DailyServeCategory" NOT NULL,
    "status" "DailyServeStatus" NOT NULL DEFAULT 'DRAFT',
    "outcome" "DailyServeOutcome" NOT NULL DEFAULT 'PENDING',
    "content" TEXT NOT NULL,
    "usefulnessReason" TEXT NOT NULL,
    "nextSafestAction" TEXT NOT NULL,
    "ownerId" TEXT,
    "csmPartnerId" TEXT,
    "peoId" TEXT,
    "opportunityId" TEXT,
    "territoryAccountId" TEXT,
    "pitchAssetId" TEXT,
    "sourceConfidence" "SourceConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "canonStatus" "CanonStatus" NOT NULL DEFAULT 'HYPOTHESIS',
    "relationshipImpact" "HmlValue" NOT NULL DEFAULT 'MEDIUM',
    "opportunityImpact" "HmlValue" NOT NULL DEFAULT 'MEDIUM',
    "sentAt" TIMESTAMP(3),
    "outcomeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyServe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyServe_ownerId_idx" ON "DailyServe"("ownerId");

-- CreateIndex
CREATE INDEX "DailyServe_csmPartnerId_idx" ON "DailyServe"("csmPartnerId");

-- CreateIndex
CREATE INDEX "DailyServe_peoId_idx" ON "DailyServe"("peoId");

-- CreateIndex
CREATE INDEX "DailyServe_opportunityId_idx" ON "DailyServe"("opportunityId");

-- CreateIndex
CREATE INDEX "DailyServe_territoryAccountId_idx" ON "DailyServe"("territoryAccountId");

-- CreateIndex
CREATE INDEX "DailyServe_pitchAssetId_idx" ON "DailyServe"("pitchAssetId");

-- CreateIndex
CREATE INDEX "DailyServe_category_idx" ON "DailyServe"("category");

-- CreateIndex
CREATE INDEX "DailyServe_status_idx" ON "DailyServe"("status");

-- CreateIndex
CREATE INDEX "DailyServe_outcome_idx" ON "DailyServe"("outcome");

-- CreateIndex
CREATE INDEX "DailyServe_sentAt_idx" ON "DailyServe"("sentAt");

-- CreateIndex
CREATE INDEX "DailyServe_outcomeAt_idx" ON "DailyServe"("outcomeAt");

-- AddForeignKey
ALTER TABLE "DailyServe" ADD CONSTRAINT "DailyServe_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyServe" ADD CONSTRAINT "DailyServe_csmPartnerId_fkey" FOREIGN KEY ("csmPartnerId") REFERENCES "CSMPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyServe" ADD CONSTRAINT "DailyServe_peoId_fkey" FOREIGN KEY ("peoId") REFERENCES "PEO"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyServe" ADD CONSTRAINT "DailyServe_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyServe" ADD CONSTRAINT "DailyServe_territoryAccountId_fkey" FOREIGN KEY ("territoryAccountId") REFERENCES "TerritoryAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyServe" ADD CONSTRAINT "DailyServe_pitchAssetId_fkey" FOREIGN KEY ("pitchAssetId") REFERENCES "PitchAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
