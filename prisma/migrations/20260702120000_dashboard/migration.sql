-- CreateTable
CREATE TABLE "DashCard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "states" JSONB,
    "notes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DashCard_position_idx" ON "DashCard"("position");
