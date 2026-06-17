-- AlterTable
ALTER TABLE "HmlClassification" ADD COLUMN     "dailyServeId" TEXT;

-- CreateIndex
CREATE INDEX "HmlClassification_dailyServeId_idx" ON "HmlClassification"("dailyServeId");

-- AddForeignKey
ALTER TABLE "HmlClassification" ADD CONSTRAINT "HmlClassification_dailyServeId_fkey" FOREIGN KEY ("dailyServeId") REFERENCES "DailyServe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
