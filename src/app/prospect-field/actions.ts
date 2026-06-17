"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CanonStatus,
  EvidenceType,
  HmlCategory,
  HmlValue,
  NoteSensitivity,
  NoteType,
  PermissionStatus,
  ProductRelevance,
  SourceConfidence,
  TerritoryAccountStatus,
} from "@/generated/prisma/client";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

const hmlValues = new Set(Object.values(HmlValue));
const sourceConfidenceValues = new Set(Object.values(SourceConfidence));
const permissionValues = new Set(Object.values(PermissionStatus));
const evidenceValues = new Set(Object.values(EvidenceType));
const productValues = new Set(Object.values(ProductRelevance));

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function enumValue<T extends string>(
  formData: FormData,
  key: string,
  allowed: Set<T>,
  fallback: T,
) {
  const value = formData.get(key);
  return typeof value === "string" && allowed.has(value as T) ? (value as T) : fallback;
}

function optionalDate(formData: FormData, key: string) {
  const value = optionalString(formData, key);
  return value ? new Date(`${value}T00:00:00.000Z`) : undefined;
}

function selectedProducts(formData: FormData) {
  const selected = formData
    .getAll("productRelevance")
    .filter((value): value is string => typeof value === "string")
    .filter((value): value is ProductRelevance =>
      productValues.has(value as ProductRelevance),
    );

  return selected.length > 0 ? selected : [ProductRelevance.EOR];
}

function derivePriorityScore(signals: HmlValue[]) {
  return signals.reduce((score, signal) => {
    if (signal === HmlValue.HIGH) return score + 20;
    if (signal === HmlValue.MEDIUM) return score + 10;
    return score + 3;
  }, 0);
}

function deriveClassification(signals: HmlValue[], confidence: SourceConfidence) {
  const highCount = signals.filter((signal) => signal === HmlValue.HIGH).length;
  const lowCount = signals.filter((signal) => signal === HmlValue.LOW).length;
  const weakSource =
    confidence === SourceConfidence.LOW ||
    confidence === SourceConfidence.UNVERIFIED ||
    confidence === SourceConfidence.HYPOTHESIS;

  if (highCount >= 2 && !weakSource) return HmlValue.HIGH;
  if (lowCount === signals.length) return HmlValue.LOW;
  return HmlValue.MEDIUM;
}

export async function createTerritoryAccount(formData: FormData) {
  if (!hasDatabaseEnv()) {
    throw new Error("Database environment variables are required to save records.");
  }

  const sourceConfidence = enumValue(
    formData,
    "sourceConfidence",
    sourceConfidenceValues,
    SourceConfidence.UNVERIFIED,
  );
  const permissionStatus = enumValue(
    formData,
    "permissionStatus",
    permissionValues,
    PermissionStatus.RESEARCH_ONLY,
  );
  const internationalSignal = enumValue(
    formData,
    "internationalSignal",
    hmlValues,
    HmlValue.LOW,
  );
  const contractorSignal = enumValue(
    formData,
    "contractorSignal",
    hmlValues,
    HmlValue.LOW,
  );
  const hiringSignal = enumValue(formData, "hiringSignal", hmlValues, HmlValue.LOW);
  const complexitySignal = enumValue(
    formData,
    "complexitySignal",
    hmlValues,
    HmlValue.LOW,
  );
  const channelSignal = enumValue(formData, "channelSignal", hmlValues, HmlValue.LOW);
  const boundaryRisk = enumValue(formData, "boundaryRisk", hmlValues, HmlValue.LOW);
  const evidenceType = enumValue(
    formData,
    "evidenceType",
    evidenceValues,
    EvidenceType.PUBLIC_WEB,
  );
  const signals = [
    internationalSignal,
    contractorSignal,
    hiringSignal,
    complexitySignal,
    channelSignal,
  ];
  const classification = deriveClassification(signals, sourceConfidence);
  const prisma = getPrisma();

  await prisma.territoryAccount.create({
    data: {
      boundaryRisk,
      canonStatus: CanonStatus.HYPOTHESIS,
      category: optionalString(formData, "category"),
      channelSignal,
      city: optionalString(formData, "city") ?? "Chicago",
      companyName: requiredString(formData, "companyName"),
      complexitySignal,
      contractorSignal,
      fitSummary: requiredString(formData, "fitSummary"),
      hiringSignal,
      internationalSignal,
      nextSafestAction: requiredString(formData, "nextSafestAction"),
      permissionStatus,
      priorityScore: derivePriorityScore([...signals, boundaryRisk]),
      productRelevance: selectedProducts(formData),
      sourceConfidence,
      status: TerritoryAccountStatus.RESEARCH_ONLY,
      website: optionalString(formData, "website"),
      evidence: {
        create: {
          capturedClaim: requiredString(formData, "capturedClaim"),
          confidence: sourceConfidence,
          sourceDate: optionalDate(formData, "sourceDate"),
          staleAfter: optionalDate(formData, "staleAfter"),
          title: requiredString(formData, "evidenceTitle"),
          type: evidenceType,
          url: optionalString(formData, "evidenceUrl"),
        },
      },
      hmlClassifications: {
        create: {
          category: HmlCategory.TERRITORY_ACCOUNT_POTENTIAL,
          classification,
          confidence: sourceConfidence,
          contributingSignals: [
            `international:${internationalSignal}`,
            `contractor:${contractorSignal}`,
            `hiring:${hiringSignal}`,
            `complexity:${complexitySignal}`,
            `channel:${channelSignal}`,
          ],
          explanation: `${classification} because the account has recorded fit signals with ${sourceConfidence.toLowerCase().replaceAll("_", " ")} source confidence.`,
          recommendedNextAction: requiredString(formData, "nextSafestAction"),
        },
      },
      notes: {
        create: {
          body: requiredString(formData, "fitSummary"),
          noteType: NoteType.FIT_SIGNAL,
          sensitivity: NoteSensitivity.INTERNAL_ONLY,
          sourceConfidence,
        },
      },
      permissionHistory: {
        create: {
          reason: `Initial prospect posture: ${permissionStatus.toLowerCase().replaceAll("_", " ")}.`,
          setBy: "Field Signal",
          status: permissionStatus,
        },
      },
    },
  });

  revalidatePath("/prospect-field");
  redirect("/prospect-field");
}
