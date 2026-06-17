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

function safeReturnTo(formData: FormData) {
  const value = formData.get("returnTo");
  if (typeof value !== "string" || value.startsWith("//")) {
    return "/prospect-field";
  }

  try {
    const url = new URL(value, "http://field-signal.local");
    if (url.origin !== "http://field-signal.local") return "/prospect-field";
    if (url.pathname !== "/prospect-field") return "/prospect-field";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/prospect-field";
  }
}

function appendStatus(path: string, key: string, value: string) {
  const url = new URL(path, "http://field-signal.local");
  url.searchParams.delete("formError");
  url.searchParams.set(key, value);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function appendAccountId(path: string, accountId: string) {
  const url = new URL(path, "http://field-signal.local");
  url.searchParams.set("accountId", accountId);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function formErrorRedirect(message: string, returnTo = "/prospect-field"): never {
  redirect(appendStatus(returnTo, "formError", message));
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
  if (!value) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime())) {
    throw new FormValidationError(`${key} must be a valid date.`);
  }

  return parsed;
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

async function requireWriteAccess(returnTo: string) {
  if (!hasDatabaseEnv()) {
    formErrorRedirect("Prospect records are unavailable right now.", returnTo);
  }

  const access = await getAppAccess();

  if (access.status === "unauthenticated") {
    formErrorRedirect("Sign in before changing records.", returnTo);
  }

  if (!access.canWrite) {
    formErrorRedirect("Write access is required to change prospect records.", returnTo);
  }

  return access;
}

export async function createTerritoryAccount(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const access = await requireWriteAccess(returnTo);
  let createdAccountId: string | undefined;

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

    const createdAccount = await prisma.territoryAccount.create({
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
    createdAccountId = createdAccount.id;
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("Prospect Field save failed", error);
    formErrorRedirect(
      "Could not save prospect. Check the fields and try again.",
      returnTo,
    );
  }

  revalidatePath("/");
  revalidatePath("/prospect-field");
  revalidatePath("/signal-feed");
  redirect(
    appendStatus(
      createdAccountId ? appendAccountId(returnTo, createdAccountId) : returnTo,
      "created",
      "1",
    ),
  );
}

export async function updateTerritoryAccountPosture(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const access = await requireWriteAccess(returnTo);

  try {
    const accountId = requiredString(formData, "accountId");
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
    const fitSummary = requiredString(formData, "fitSummary");
    const nextSafestAction = requiredString(formData, "nextSafestAction");
    const prisma = getPrisma();

    await prisma.$transaction(async (tx) => {
      const current = await tx.territoryAccount.findUnique({
        where: {
          id: accountId,
        },
      });

      if (!current) {
        throw new FormValidationError("Selected prospect could not be found.");
      }

      const hml = classifyProspectField({
        boundaryRisk: current.boundaryRisk,
        channelSignal: current.channelSignal,
        complexitySignal: current.complexitySignal,
        contractorSignal: current.contractorSignal,
        hiringSignal: current.hiringSignal,
        internationalSignal: current.internationalSignal,
        sourceConfidence,
      });

      await tx.territoryAccount.update({
        data: {
          fitSummary,
          lastReviewedAt: new Date(),
          nextSafestAction,
          permissionState,
          priorityScore: hml.priorityScore,
          sourceConfidence,
        },
        where: {
          id: accountId,
        },
      });

      if (current.permissionState !== permissionState) {
        await tx.permissionHistory.create({
          data: {
            accountId,
            reason: `Updated prospect posture: ${permissionState.toLowerCase().replaceAll("_", " ")}.`,
            setBy: access.appUser.email,
            state: permissionState,
          },
        });
      }

      await tx.hmlClassification.create({
        data: {
          accountId,
          category: HmlCategory.TERRITORY_ACCOUNT_POTENTIAL,
          classification: hml.classification,
          confidence: sourceConfidence,
          contributingSignals: hml.contributingSignals,
          explanation: hml.explanation,
          recommendedNextAction: hml.recommendedNextAction,
          ruleVersion: hml.ruleVersion,
        },
      });
    });
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("Prospect Field update failed", error);
    formErrorRedirect(
      "Could not update prospect. Check the fields and try again.",
      returnTo,
    );
  }

  revalidatePath("/");
  revalidatePath("/prospect-field");
  revalidatePath("/signal-feed");
  redirect(appendStatus(returnTo, "updated", "1"));
}

export async function createSourceEvidence(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  await requireWriteAccess(returnTo);

  try {
    const accountId = requiredString(formData, "accountId");
    const confidence = enumValue(
      formData,
      "evidenceConfidence",
      sourceConfidenceValues,
      SourceConfidence.UNVERIFIED,
    );
    const type = enumValue(
      formData,
      "evidenceType",
      evidenceValues,
      EvidenceType.PUBLIC_WEB,
    );
    const prisma = getPrisma();

    await prisma.$transaction([
      prisma.sourceEvidence.create({
        data: {
          accountId,
          capturedClaim: requiredString(formData, "capturedClaim"),
          confidence,
          sourceDate: optionalDate(formData, "sourceDate"),
          staleAfter: optionalDate(formData, "staleAfter"),
          title: requiredString(formData, "evidenceTitle"),
          type,
          url: optionalHttpUrl(formData, "evidenceUrl", "Evidence URL"),
        },
      }),
      prisma.territoryAccount.update({
        data: {
          lastReviewedAt: new Date(),
        },
        where: {
          id: accountId,
        },
      }),
    ]);
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("Prospect Field evidence save failed", error);
    formErrorRedirect(
      "Could not add source evidence. Check the fields and try again.",
      returnTo,
    );
  }

  revalidatePath("/");
  revalidatePath("/prospect-field");
  redirect(appendStatus(returnTo, "evidenceAdded", "1"));
}
