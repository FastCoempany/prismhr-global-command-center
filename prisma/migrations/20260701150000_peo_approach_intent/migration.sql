-- CreateEnum
CREATE TYPE "PeoApproach" AS ENUM ('NEEDS_CSM', 'CHANNEL_OK', 'DIRECT_OK');

-- CreateEnum
CREATE TYPE "PeoIntent" AS ENUM ('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "PeoState" ADD COLUMN "approach" "PeoApproach" NOT NULL DEFAULT 'NEEDS_CSM',
ADD COLUMN "intent" "PeoIntent" NOT NULL DEFAULT 'UNKNOWN';

-- CreateIndex
CREATE INDEX "PeoState_approach_idx" ON "PeoState"("approach");
