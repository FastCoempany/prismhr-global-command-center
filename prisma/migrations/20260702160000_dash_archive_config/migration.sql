-- AlterTable
ALTER TABLE "DashCard" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "DashCard_archived_idx" ON "DashCard"("archived");

-- CreateTable
CREATE TABLE "DashConfig" (
    "id" TEXT NOT NULL,
    "labels" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashConfig_pkey" PRIMARY KEY ("id")
);
