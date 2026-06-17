-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'VIEWER');

-- CreateEnum
CREATE TYPE "CanonStatus" AS ENUM ('CANON', 'HYPOTHESIS', 'INFERENCE', 'UNKNOWN', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "SourceConfidence" AS ENUM ('CONFIRMED', 'STRONG', 'MEDIUM', 'LOW', 'UNVERIFIED', 'INFERRED', 'HYPOTHESIS');

-- CreateEnum
CREATE TYPE "NoteSensitivity" AS ENUM ('PUBLIC_RESEARCH', 'INTERNAL_ONLY', 'PRIVATE_CSM_DEBRIEF', 'SENSITIVE_BOUNDARY', 'LEGAL_COMPLIANCE_SENSITIVE', 'SHAREABLE_SUMMARY');

-- CreateEnum
CREATE TYPE "PermissionStatus" AS ENUM ('RESEARCH_ONLY', 'CSM_CONTEXT_NEEDED', 'CSM_APPROVED_FOR_DISCUSSION', 'CSM_APPROVED_FOR_INTRO', 'PEO_ENGAGED', 'PEO_CLIENT_ENGAGED', 'DIRECT_CONTACT_ALLOWED', 'DIRECT_CONTACT_NOT_ALLOWED', 'HOLD_SENSITIVE', 'OFF_LIMITS', 'OWNERSHIP_UNCLEAR_REQUIRES_VERIFICATION');

-- CreateEnum
CREATE TYPE "HmlValue" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "TerritoryAccountStatus" AS ENUM ('RESEARCH_ONLY', 'WATCH', 'PARKED', 'READY_FOR_REVIEW', 'CONVERTED_TO_OPPORTUNITY');

-- CreateEnum
CREATE TYPE "ProductRelevance" AS ENUM ('EOR', 'CONTRACTOR_MANAGEMENT', 'CONTRACTOR_MANAGEMENT_PLUS', 'GLOBAL_PAYROLL', 'CROSS_BORDER_RECRUITING');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('PUBLIC_WEB', 'COMPANY_SITE', 'JOB_POSTING', 'LINKEDIN', 'NEWS', 'MANUAL_RESEARCH', 'INTERNAL_NOTE', 'USER_ASSERTION');

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('RESEARCH_NOTE', 'FIT_SIGNAL', 'BOUNDARY_NOTE', 'PRIVATE_DEBRIEF', 'SHAREABLE_SUMMARY');

-- CreateEnum
CREATE TYPE "UnknownCategory" AS ENUM ('SCHEMA', 'PERMISSION', 'HML', 'DATA_VISIBILITY', 'PRODUCT', 'PRICING_LEGAL', 'EXTERNAL_CHANNEL', 'TERRITORY', 'SOURCE_EVIDENCE');

-- CreateEnum
CREATE TYPE "InternalUnknownStatus" AS ENUM ('OPEN', 'DEFERRED', 'DECIDED', 'NO_LONGER_RELEVANT');

-- CreateEnum
CREATE TYPE "HmlCategory" AS ENUM ('TERRITORY_ACCOUNT_POTENTIAL', 'BOUNDARY_RISK', 'SOURCE_CONFIDENCE', 'INTERNAL_AMBIGUITY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OWNER',
    "isProductOwner" BOOLEAN NOT NULL DEFAULT false,
    "isCanonOwner" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerritoryAccount" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Chicago',
    "region" TEXT NOT NULL DEFAULT 'Chicagoland',
    "category" TEXT,
    "status" "TerritoryAccountStatus" NOT NULL DEFAULT 'RESEARCH_ONLY',
    "productRelevance" "ProductRelevance"[],
    "internationalSignal" "HmlValue" NOT NULL DEFAULT 'LOW',
    "contractorSignal" "HmlValue" NOT NULL DEFAULT 'LOW',
    "hiringSignal" "HmlValue" NOT NULL DEFAULT 'LOW',
    "complexitySignal" "HmlValue" NOT NULL DEFAULT 'LOW',
    "channelSignal" "HmlValue" NOT NULL DEFAULT 'LOW',
    "boundaryRisk" "HmlValue" NOT NULL DEFAULT 'LOW',
    "priorityScore" INTEGER,
    "fitSummary" TEXT NOT NULL,
    "nextSafestAction" TEXT NOT NULL,
    "permissionStatus" "PermissionStatus" NOT NULL DEFAULT 'RESEARCH_ONLY',
    "sourceConfidence" "SourceConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "canonStatus" "CanonStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastReviewedAt" TIMESTAMP(3),

    CONSTRAINT "TerritoryAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceEvidence" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL DEFAULT 'PUBLIC_WEB',
    "title" TEXT NOT NULL,
    "url" TEXT,
    "capturedClaim" TEXT NOT NULL,
    "sourceDate" TIMESTAMP(3),
    "staleAfter" TIMESTAMP(3),
    "confidence" "SourceConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "canonStatus" "CanonStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "noteType" "NoteType" NOT NULL DEFAULT 'RESEARCH_NOTE',
    "body" TEXT NOT NULL,
    "sensitivity" "NoteSensitivity" NOT NULL DEFAULT 'INTERNAL_ONLY',
    "sourceConfidence" "SourceConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "shareability" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionHistory" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "PermissionStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "setBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternalUnknown" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "category" "UnknownCategory" NOT NULL,
    "currentBestAnswer" TEXT,
    "sourceNeeded" TEXT,
    "confidence" "SourceConfidence" NOT NULL DEFAULT 'UNVERIFIED',
    "riskLevel" "HmlValue" NOT NULL DEFAULT 'MEDIUM',
    "status" "InternalUnknownStatus" NOT NULL DEFAULT 'OPEN',
    "blocksImplementation" BOOLEAN NOT NULL DEFAULT false,
    "relatedAccountId" TEXT,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InternalUnknown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HmlClassification" (
    "id" TEXT NOT NULL,
    "category" "HmlCategory" NOT NULL,
    "accountId" TEXT,
    "classification" "HmlValue" NOT NULL,
    "confidence" "SourceConfidence" NOT NULL,
    "explanation" TEXT NOT NULL,
    "contributingSignals" TEXT[],
    "recommendedNextAction" TEXT NOT NULL,
    "ruleVersion" TEXT NOT NULL DEFAULT 'v0.1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HmlClassification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "TerritoryAccount_companyName_idx" ON "TerritoryAccount"("companyName");

-- CreateIndex
CREATE INDEX "TerritoryAccount_status_idx" ON "TerritoryAccount"("status");

-- CreateIndex
CREATE INDEX "TerritoryAccount_permissionStatus_idx" ON "TerritoryAccount"("permissionStatus");

-- CreateIndex
CREATE INDEX "TerritoryAccount_sourceConfidence_idx" ON "TerritoryAccount"("sourceConfidence");

-- CreateIndex
CREATE INDEX "SourceEvidence_accountId_idx" ON "SourceEvidence"("accountId");

-- CreateIndex
CREATE INDEX "SourceEvidence_confidence_idx" ON "SourceEvidence"("confidence");

-- CreateIndex
CREATE INDEX "Note_accountId_idx" ON "Note"("accountId");

-- CreateIndex
CREATE INDEX "Note_sensitivity_idx" ON "Note"("sensitivity");

-- CreateIndex
CREATE INDEX "PermissionHistory_accountId_idx" ON "PermissionHistory"("accountId");

-- CreateIndex
CREATE INDEX "PermissionHistory_status_idx" ON "PermissionHistory"("status");

-- CreateIndex
CREATE INDEX "InternalUnknown_category_idx" ON "InternalUnknown"("category");

-- CreateIndex
CREATE INDEX "InternalUnknown_status_idx" ON "InternalUnknown"("status");

-- CreateIndex
CREATE INDEX "InternalUnknown_relatedAccountId_idx" ON "InternalUnknown"("relatedAccountId");

-- CreateIndex
CREATE INDEX "HmlClassification_category_idx" ON "HmlClassification"("category");

-- CreateIndex
CREATE INDEX "HmlClassification_accountId_idx" ON "HmlClassification"("accountId");

-- CreateIndex
CREATE INDEX "HmlClassification_classification_idx" ON "HmlClassification"("classification");

-- AddForeignKey
ALTER TABLE "TerritoryAccount" ADD CONSTRAINT "TerritoryAccount_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceEvidence" ADD CONSTRAINT "SourceEvidence_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TerritoryAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TerritoryAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionHistory" ADD CONSTRAINT "PermissionHistory_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TerritoryAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternalUnknown" ADD CONSTRAINT "InternalUnknown_relatedAccountId_fkey" FOREIGN KEY ("relatedAccountId") REFERENCES "TerritoryAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HmlClassification" ADD CONSTRAINT "HmlClassification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TerritoryAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
