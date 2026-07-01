-- CreateEnum
CREATE TYPE "DemoAudience" AS ENUM ('BOTH', 'SERVICE_PROVIDER', 'DIRECT_EMPLOYER');

-- CreateTable
CREATE TABLE "DemoAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "personaLabel" TEXT,
    "defaultAudience" "DemoAudience" NOT NULL DEFAULT 'BOTH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoNote" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "screenId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoPin" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "screenId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoPin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoPlaybook" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoPlaybook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoPlaybookItem" (
    "id" TEXT NOT NULL,
    "playbookId" TEXT NOT NULL,
    "screenId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoPlaybookItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoAccount_name_idx" ON "DemoAccount"("name");

-- CreateIndex
CREATE INDEX "DemoNote_accountId_idx" ON "DemoNote"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "DemoNote_accountId_screenId_key" ON "DemoNote"("accountId", "screenId");

-- CreateIndex
CREATE INDEX "DemoPin_accountId_idx" ON "DemoPin"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "DemoPin_accountId_screenId_key" ON "DemoPin"("accountId", "screenId");

-- CreateIndex
CREATE INDEX "DemoPlaybook_accountId_idx" ON "DemoPlaybook"("accountId");

-- CreateIndex
CREATE INDEX "DemoPlaybookItem_playbookId_idx" ON "DemoPlaybookItem"("playbookId");

-- AddForeignKey
ALTER TABLE "DemoNote" ADD CONSTRAINT "DemoNote_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "DemoAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoPin" ADD CONSTRAINT "DemoPin_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "DemoAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoPlaybook" ADD CONSTRAINT "DemoPlaybook_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "DemoAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoPlaybookItem" ADD CONSTRAINT "DemoPlaybookItem_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "DemoPlaybook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
