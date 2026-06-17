-- CreateEnum
CREATE TYPE "BoundaryScopeType" AS ENUM ('CSM_PARTNER', 'PEO', 'PEO_CLIENT', 'OPPORTUNITY', 'TERRITORY_ACCOUNT', 'EXTERNAL_CHANNEL', 'GLOBAL');

-- CreateEnum
CREATE TYPE "BoundaryRuleType" AS ENUM ('OFF_LIMITS', 'APPROVAL_REQUIRED', 'HOLD_SENSITIVE', 'DIRECT_CONTACT_NOT_ALLOWED', 'RELATIONSHIP_OWNER_REQUIRED', 'ALLOWED_ALTERNATIVE');

-- CreateEnum
CREATE TYPE "BoundarySeverity" AS ENUM ('WARNING', 'APPROVAL_REQUIRED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "BoundaryRuleStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUPERSEDED', 'REVOKED');

-- CreateTable
CREATE TABLE "BoundaryRule" (
    "id" TEXT NOT NULL,
    "scopeType" "BoundaryScopeType" NOT NULL,
    "csmPartnerId" TEXT,
    "peoId" TEXT,
    "peoClientId" TEXT,
    "opportunityId" TEXT,
    "territoryAccountId" TEXT,
    "ruleType" "BoundaryRuleType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "setBy" TEXT,
    "reason" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "reviewAt" TIMESTAMP(3),
    "severity" "BoundarySeverity" NOT NULL DEFAULT 'APPROVAL_REQUIRED',
    "allowedAlternative" TEXT,
    "status" "BoundaryRuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourceConfidence" "SourceConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "canonStatus" "CanonStatus" NOT NULL DEFAULT 'HYPOTHESIS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoundaryRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BoundaryRule_scopeType_idx" ON "BoundaryRule"("scopeType");

-- CreateIndex
CREATE INDEX "BoundaryRule_ruleType_idx" ON "BoundaryRule"("ruleType");

-- CreateIndex
CREATE INDEX "BoundaryRule_severity_idx" ON "BoundaryRule"("severity");

-- CreateIndex
CREATE INDEX "BoundaryRule_status_idx" ON "BoundaryRule"("status");

-- CreateIndex
CREATE INDEX "BoundaryRule_reviewAt_idx" ON "BoundaryRule"("reviewAt");

-- CreateIndex
CREATE INDEX "BoundaryRule_csmPartnerId_idx" ON "BoundaryRule"("csmPartnerId");

-- CreateIndex
CREATE INDEX "BoundaryRule_peoId_idx" ON "BoundaryRule"("peoId");

-- CreateIndex
CREATE INDEX "BoundaryRule_peoClientId_idx" ON "BoundaryRule"("peoClientId");

-- CreateIndex
CREATE INDEX "BoundaryRule_opportunityId_idx" ON "BoundaryRule"("opportunityId");

-- CreateIndex
CREATE INDEX "BoundaryRule_territoryAccountId_idx" ON "BoundaryRule"("territoryAccountId");

-- AddForeignKey
ALTER TABLE "BoundaryRule" ADD CONSTRAINT "BoundaryRule_csmPartnerId_fkey" FOREIGN KEY ("csmPartnerId") REFERENCES "CSMPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoundaryRule" ADD CONSTRAINT "BoundaryRule_peoId_fkey" FOREIGN KEY ("peoId") REFERENCES "PEO"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoundaryRule" ADD CONSTRAINT "BoundaryRule_peoClientId_fkey" FOREIGN KEY ("peoClientId") REFERENCES "PEOClient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoundaryRule" ADD CONSTRAINT "BoundaryRule_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoundaryRule" ADD CONSTRAINT "BoundaryRule_territoryAccountId_fkey" FOREIGN KEY ("territoryAccountId") REFERENCES "TerritoryAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
