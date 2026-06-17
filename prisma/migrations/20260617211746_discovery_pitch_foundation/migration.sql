-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('DRAFT', 'NEEDS_OWNER_REVIEW', 'OWNER_APPROVED', 'RETIRED');

-- CreateEnum
CREATE TYPE "PitchAudience" AS ENUM ('CSM', 'PEO', 'PEO_CLIENT', 'INTERNAL', 'EXTERNAL_CHANNEL');

-- CreateEnum
CREATE TYPE "PitchAssetType" AS ENUM ('CSM_SAFE_BLURB', 'DISCOVERY_CHEAT_SHEET', 'OBJECTION_RESPONSE', 'EMAIL_LANGUAGE', 'MEETING_PREP_NOTE', 'USE_CASE_BRIEF');

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "discoveryFrameworkId" TEXT;

-- CreateTable
CREATE TABLE "DiscoveryFramework" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "productRelevance" "ProductRelevance" NOT NULL,
    "audience" "PitchAudience" NOT NULL DEFAULT 'CSM',
    "useCase" TEXT NOT NULL,
    "triggerSignals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "discoveryQuestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disqualificationSignals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "demoFocus" TEXT,
    "boundaryNotes" TEXT,
    "sourceConfidence" "SourceConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "canonStatus" "CanonStatus" NOT NULL DEFAULT 'HYPOTHESIS',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscoveryFramework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PitchAsset" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "productRelevance" "ProductRelevance" NOT NULL,
    "assetType" "PitchAssetType" NOT NULL,
    "audience" "PitchAudience" NOT NULL DEFAULT 'CSM',
    "content" TEXT NOT NULL,
    "usageNotes" TEXT,
    "sourceConfidence" "SourceConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "canonStatus" "CanonStatus" NOT NULL DEFAULT 'HYPOTHESIS',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PitchAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscoveryFramework_productRelevance_idx" ON "DiscoveryFramework"("productRelevance");

-- CreateIndex
CREATE INDEX "DiscoveryFramework_audience_idx" ON "DiscoveryFramework"("audience");

-- CreateIndex
CREATE INDEX "DiscoveryFramework_approvalStatus_idx" ON "DiscoveryFramework"("approvalStatus");

-- CreateIndex
CREATE INDEX "DiscoveryFramework_sourceConfidence_idx" ON "DiscoveryFramework"("sourceConfidence");

-- CreateIndex
CREATE INDEX "PitchAsset_productRelevance_idx" ON "PitchAsset"("productRelevance");

-- CreateIndex
CREATE INDEX "PitchAsset_assetType_idx" ON "PitchAsset"("assetType");

-- CreateIndex
CREATE INDEX "PitchAsset_audience_idx" ON "PitchAsset"("audience");

-- CreateIndex
CREATE INDEX "PitchAsset_approvalStatus_idx" ON "PitchAsset"("approvalStatus");

-- CreateIndex
CREATE INDEX "PitchAsset_sourceConfidence_idx" ON "PitchAsset"("sourceConfidence");

-- CreateIndex
CREATE INDEX "Opportunity_discoveryFrameworkId_idx" ON "Opportunity"("discoveryFrameworkId");

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_discoveryFrameworkId_fkey" FOREIGN KEY ("discoveryFrameworkId") REFERENCES "DiscoveryFramework"("id") ON DELETE SET NULL ON UPDATE CASCADE;
