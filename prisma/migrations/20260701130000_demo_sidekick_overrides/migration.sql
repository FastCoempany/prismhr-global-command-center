-- CreateTable
CREATE TABLE "DemoScreenOverride" (
    "id" TEXT NOT NULL,
    "screenId" TEXT NOT NULL,
    "say" TEXT,
    "what" TEXT,
    "capabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sp" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "de" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "branching" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoScreenOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DemoScreenOverride_screenId_key" ON "DemoScreenOverride"("screenId");
