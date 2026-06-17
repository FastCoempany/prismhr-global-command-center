-- AlterTable
ALTER TABLE "HmlClassification" ADD COLUMN     "internalUnknownId" TEXT;

-- AlterTable
ALTER TABLE "InternalUnknown" ADD COLUMN     "csmPartnerId" TEXT,
ADD COLUMN     "dailyServeId" TEXT,
ADD COLUMN     "opportunityId" TEXT,
ADD COLUMN     "peoId" TEXT;

-- CreateIndex
CREATE INDEX "HmlClassification_internalUnknownId_idx" ON "HmlClassification"("internalUnknownId");

-- CreateIndex
CREATE INDEX "InternalUnknown_csmPartnerId_idx" ON "InternalUnknown"("csmPartnerId");

-- CreateIndex
CREATE INDEX "InternalUnknown_peoId_idx" ON "InternalUnknown"("peoId");

-- CreateIndex
CREATE INDEX "InternalUnknown_opportunityId_idx" ON "InternalUnknown"("opportunityId");

-- CreateIndex
CREATE INDEX "InternalUnknown_dailyServeId_idx" ON "InternalUnknown"("dailyServeId");

-- AddForeignKey
ALTER TABLE "InternalUnknown" ADD CONSTRAINT "InternalUnknown_csmPartnerId_fkey" FOREIGN KEY ("csmPartnerId") REFERENCES "CSMPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalUnknown" ADD CONSTRAINT "InternalUnknown_peoId_fkey" FOREIGN KEY ("peoId") REFERENCES "PEO"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalUnknown" ADD CONSTRAINT "InternalUnknown_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalUnknown" ADD CONSTRAINT "InternalUnknown_dailyServeId_fkey" FOREIGN KEY ("dailyServeId") REFERENCES "DailyServe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HmlClassification" ADD CONSTRAINT "HmlClassification_internalUnknownId_fkey" FOREIGN KEY ("internalUnknownId") REFERENCES "InternalUnknown"("id") ON DELETE SET NULL ON UPDATE CASCADE;
