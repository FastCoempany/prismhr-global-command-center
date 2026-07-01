-- CreateEnum
CREATE TYPE "PeoStage" AS ENUM ('NOT_TOUCHED', 'CSM_BRIEFED', 'PEO_ENGAGED', 'CLIENT_CAMPAIGN', 'LEAD', 'DEMO', 'OPPORTUNITY', 'WON', 'PASSED');

-- CreateTable
CREATE TABLE "PeoState" (
    "id" TEXT NOT NULL,
    "peoId" TEXT NOT NULL,
    "stage" "PeoStage" NOT NULL DEFAULT 'NOT_TOUCHED',
    "nextAction" TEXT,
    "nextActionDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeoState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeoActivity" (
    "id" TEXT NOT NULL,
    "peoId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeoActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PeoState_peoId_key" ON "PeoState"("peoId");

-- CreateIndex
CREATE INDEX "PeoState_stage_idx" ON "PeoState"("stage");

-- CreateIndex
CREATE INDEX "PeoState_nextActionDate_idx" ON "PeoState"("nextActionDate");

-- CreateIndex
CREATE INDEX "PeoActivity_peoId_idx" ON "PeoActivity"("peoId");

-- AddForeignKey
ALTER TABLE "PeoActivity" ADD CONSTRAINT "PeoActivity_peoId_fkey" FOREIGN KEY ("peoId") REFERENCES "PeoState"("peoId") ON DELETE CASCADE ON UPDATE CASCADE;
