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
  PermissionState,
  ProductRelevance,
  SourceConfidence,
  TerritoryAccountStatus,
} from "@/generated/prisma/client";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { classifyProspectField } from "@/lib/hml";
import { getAppAccess } from "@/lib/auth";

const hmlValues = new Set(Object.values(HmlValue));
const sourceConfidenceValues = new Set(Object.values(SourceConfidence));
const permissionValues = new Set(Object.values(PermissionState));
const evidenceValues = new Set(Object.values(EvidenceType));
const productValues = new Set(Object.values(ProductRelevance));

class FormValidationError extends Error {}

function formErrorRedirect(message: string): never {
  redirect(`/prospect-field?formError=${encodeURIComponent(message)}`);
}

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new FormValidationError(`${key} is required.`);
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

function optionalHttpUrl(formData: FormData, key: string, label: string) {
  const value = optionalString(formData, key);
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new Error("Unsupported protocol.");
    }
    return url.toString();
  } catch {
    throw new FormValidationError(`${label} must be a valid http or https URL.`);
  }
}

function selectedProducts(formData: FormData) {
  const selected = formData
    .getAll("productRelevance")
    .filter((value): value is string => typeof value === "string")
    .filter((value): value is ProductRelevance =>
      productValues.has(value as ProductRelevance),
    );

  if (selected.length === 0) {
    throw new FormValidationError("Select at least one product relevance.");
  }

  return selected;
}

export async function createTerritoryAccount(formData: FormData) {
  if (!hasDatabaseEnv()) {
    formErrorRedirect("Database environment variables are required to save records.");
  }

  const access = await getAppAccess();

  if (access.status === "unauthenticated") {
    formErrorRedirect("Sign in before creating records.");
  }

  if (!access.canWrite) {
    formErrorRedirect("Owner access is required to create prospect records.");
  }

  try {
    const sourceConfidence = enumValue(
      formData,
      "sourceConfidence",
      sourceConfidenceValues,
      SourceConfidence.UNVERIFIED,
    );
    const permissionState = enumValue(
      formData,
      "permissionState",
      permissionValues,
      PermissionState.RESEARCH_ONLY,
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
    const hml = classifyProspectField({
      boundaryRisk,
      channelSignal,
      complexitySignal,
      contractorSignal,
      hiringSignal,
      internationalSignal,
      sourceConfidence,
    });
    const nextSafestAction = requiredString(formData, "nextSafestAction");
    const fitSummary = requiredString(formData, "fitSummary");
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
        fitSummary,
        hiringSignal,
        internationalSignal,
        nextSafestAction,
        ownerId: access.appUser.id,
        permissionState,
        priorityScore: hml.priorityScore,
        productRelevance: selectedProducts(formData),
        sourceConfidence,
        status: TerritoryAccountStatus.RESEARCH_ONLY,
        website: optionalHttpUrl(formData, "website", "Website"),
        evidence: {
          create: {
            capturedClaim: requiredString(formData, "capturedClaim"),
            confidence: sourceConfidence,
            sourceDate: optionalDate(formData, "sourceDate"),
            staleAfter: optionalDate(formData, "staleAfter"),
            title: requiredString(formData, "evidenceTitle"),
            type: evidenceType,
            url: optionalHttpUrl(formData, "evidenceUrl", "Evidence URL"),
          },
        },
        hmlClassifications: {
          create: {
            category: HmlCategory.TERRITORY_ACCOUNT_POTENTIAL,
            classification: hml.classification,
            confidence: sourceConfidence,
            contributingSignals: hml.contributingSignals,
            explanation: hml.explanation,
            recommendedNextAction: hml.recommendedNextAction,
            ruleVersion: hml.ruleVersion,
          },
        },
        notes: {
          create: {
            body: fitSummary,
            noteType: NoteType.FIT_SIGNAL,
            sensitivity: NoteSensitivity.INTERNAL_ONLY,
            sourceConfidence,
          },
        },
        permissionHistory: {
          create: {
            reason: `Initial prospect posture: ${permissionState.toLowerCase().replaceAll("_", " ")}.`,
            setBy: access.appUser.email,
            state: permissionState,
          },
        },
      },
    });
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message);
    }

    console.error("Prospect Field save failed", error);
    formErrorRedirect("Could not save prospect. Check the fields and try again.");
  }

  revalidatePath("/prospect-field");
  redirect("/prospect-field?created=1");
}
