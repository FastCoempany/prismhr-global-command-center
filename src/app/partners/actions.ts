"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CanonStatus,
  CsmPartnerStatus,
  FollowUpPromiseStatus,
  HmlCategory,
  HmlValue,
  NoteSensitivity,
  PermissionState,
  SourceConfidence,
} from "@/generated/prisma/client";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

const csmStatusValues = new Set(Object.values(CsmPartnerStatus));
const hmlValues = new Set(Object.values(HmlValue));
const permissionValues = new Set(Object.values(PermissionState));
const confidenceValues = new Set(Object.values(SourceConfidence));
const sensitivityValues = new Set(Object.values(NoteSensitivity));

class FormValidationError extends Error {}

function safeReturnTo(formData: FormData) {
  const value = formData.get("returnTo");
  if (typeof value !== "string" || value.startsWith("//")) {
    return "/partners";
  }

  try {
    const url = new URL(value, "http://field-signal.local");
    if (url.origin !== "http://field-signal.local") return "/partners";
    if (url.pathname !== "/partners") return "/partners";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/partners";
  }
}

function appendStatus(path: string, key: string, value: string) {
  const url = new URL(path, "http://field-signal.local");
  url.searchParams.delete("formError");
  url.searchParams.set(key, value);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function appendPartnerId(path: string, partnerId: string) {
  const url = new URL(path, "http://field-signal.local");
  url.searchParams.set("partnerId", partnerId);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function formErrorRedirect(message: string, returnTo = "/partners"): never {
  redirect(appendStatus(returnTo, "formError", message));
}

function requiredString(formData: FormData, key: string, label: string, maxLength = 500) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new FormValidationError(`${label} is required.`);
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new FormValidationError(`${label} must be ${maxLength} characters or fewer.`);
  }

  return trimmed;
}

function optionalString(
  formData: FormData,
  key: string,
  label: string,
  maxLength = 1200,
) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) return undefined;

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new FormValidationError(`${label} must be ${maxLength} characters or fewer.`);
  }

  return trimmed;
}

function requiredEnum<T extends string>(
  formData: FormData,
  key: string,
  label: string,
  allowed: Set<T>,
) {
  const value = formData.get(key);
  if (typeof value !== "string" || !allowed.has(value as T)) {
    throw new FormValidationError(`${label} must be a valid option.`);
  }

  return value as T;
}

function optionalDate(formData: FormData, key: string, label: string) {
  const value = optionalString(formData, key, label, 10);
  if (!value) return undefined;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new FormValidationError(`${label} must be a valid date.`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new FormValidationError(`${label} must be a valid date.`);
  }

  return parsed;
}

function requiredDate(formData: FormData, key: string, label: string) {
  const parsed = optionalDate(formData, key, label);
  if (!parsed) {
    throw new FormValidationError(`${label} is required.`);
  }
  return parsed;
}

function optionalHttpUrl(formData: FormData, key: string, label: string) {
  const value = optionalString(formData, key, label, 300);
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

function optionalEmail(formData: FormData, key: string, label: string) {
  const value = optionalString(formData, key, label, 254);
  if (!value) return undefined;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new FormValidationError(`${label} must be a valid email.`);
  }

  return value.toLowerCase();
}

async function requireWriteAccess(returnTo: string) {
  if (!hasDatabaseEnv()) {
    formErrorRedirect("Partner records are unavailable right now.", returnTo);
  }

  const access = await getAppAccess();

  if (access.status === "unauthenticated") {
    formErrorRedirect("Sign in before changing partner records.", returnTo);
  }

  if (!access.canWrite) {
    formErrorRedirect("Write access is required to change partner records.", returnTo);
  }

  return access;
}

async function optionalPartnerId(formData: FormData) {
  const partnerId = optionalString(formData, "csmPartnerId", "CSM partner", 200);
  if (!partnerId) return null;

  const partner = await getPrisma().cSMPartner.findUnique({
    select: {
      id: true,
    },
    where: {
      id: partnerId,
    },
  });

  if (!partner) {
    throw new FormValidationError("Selected CSM partner could not be found.");
  }

  return partner.id;
}

async function optionalPeoId(formData: FormData, csmPartnerId: string | null) {
  const peoId = optionalString(formData, "peoId", "PEO", 200);
  if (!peoId) return null;

  const peo = await getPrisma().pEO.findUnique({
    select: {
      csmPartnerId: true,
      id: true,
    },
    where: {
      id: peoId,
    },
  });

  if (!peo) {
    throw new FormValidationError("Selected PEO could not be found.");
  }

  if (csmPartnerId && peo.csmPartnerId && peo.csmPartnerId !== csmPartnerId) {
    throw new FormValidationError("Selected PEO belongs to a different CSM partner.");
  }

  return peo.id;
}

export async function createCsmPartner(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const access = await requireWriteAccess(returnTo);
  let createdPartnerId: string | undefined;

  try {
    const relationshipHeat = requiredEnum(
      formData,
      "relationshipHeat",
      "Relationship heat",
      hmlValues,
    );
    const protectivenessLevel = requiredEnum(
      formData,
      "protectivenessLevel",
      "Protectiveness",
      hmlValues,
    );
    const permissionState = requiredEnum(
      formData,
      "permissionState",
      "Permission",
      permissionValues,
    );
    const sourceConfidence = requiredEnum(
      formData,
      "sourceConfidence",
      "Source confidence",
      confidenceValues,
    );
    const prisma = getPrisma();
    const partner = await prisma.cSMPartner.create({
      data: {
        canonStatus: CanonStatus.HYPOTHESIS,
        communicationCadence: optionalString(
          formData,
          "communicationCadence",
          "Communication cadence",
        ),
        dosAndDonts: optionalString(formData, "dosAndDonts", "Do and don't guidance"),
        email: optionalEmail(formData, "email", "Email"),
        name: requiredString(formData, "name", "Name"),
        nextSafestAction: requiredString(
          formData,
          "nextSafestAction",
          "Next safest action",
        ),
        ownerId: access.appUser.id,
        permissionState,
        preferredFollowupMotion: optionalString(
          formData,
          "preferredFollowupMotion",
          "Preferred follow-up motion",
        ),
        preferredIntroMotion: optionalString(
          formData,
          "preferredIntroMotion",
          "Preferred intro motion",
        ),
        privateDebriefRequired: formData.get("privateDebriefRequired") === "on",
        protectivenessLevel,
        relationshipHeat,
        sourceConfidence,
        status: requiredEnum(formData, "status", "Status", csmStatusValues),
        trustSurfaceNotes: optionalString(
          formData,
          "trustSurfaceNotes",
          "Trust surface notes",
        ),
        hmlClassifications: {
          create: {
            category: HmlCategory.CSM_RELATIONSHIP_HEAT,
            classification: relationshipHeat,
            confidence: sourceConfidence,
            contributingSignals: [
              `protectiveness:${protectivenessLevel}`,
              `permission:${permissionState}`,
            ],
            explanation:
              "Relationship heat is manually set until enough CSM motion is recorded.",
            recommendedNextAction: requiredString(
              formData,
              "nextSafestAction",
              "Next safest action",
            ),
            ruleVersion: "relationship-map-v0.1",
          },
        },
      },
    });
    createdPartnerId = partner.id;
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("CSM Partner create failed", error);
    formErrorRedirect(
      "Could not save CSM partner. Check the fields and try again.",
      returnTo,
    );
  }

  revalidatePath("/");
  revalidatePath("/partners");
  revalidatePath("/signal-feed");
  redirect(
    appendStatus(
      createdPartnerId ? appendPartnerId(returnTo, createdPartnerId) : returnTo,
      "created",
      "1",
    ),
  );
}

export async function createPeoRecord(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  await requireWriteAccess(returnTo);
  let partnerId: string | null = null;

  try {
    partnerId = await optionalPartnerId(formData);
    const readinessLevel = requiredEnum(
      formData,
      "readinessLevel",
      "PEO readiness",
      hmlValues,
    );
    const protectivenessLevel = requiredEnum(
      formData,
      "protectivenessLevel",
      "PEO protectiveness",
      hmlValues,
    );
    const boundaryRisk = requiredEnum(
      formData,
      "boundaryRisk",
      "Boundary risk",
      hmlValues,
    );
    const permissionState = requiredEnum(
      formData,
      "permissionState",
      "Permission",
      permissionValues,
    );
    const sourceConfidence = requiredEnum(
      formData,
      "sourceConfidence",
      "Source confidence",
      confidenceValues,
    );
    const nextSafestAction = requiredString(
      formData,
      "nextSafestAction",
      "Next safest action",
    );
    const prisma = getPrisma();

    await prisma.pEO.create({
      data: {
        boundaryRisk,
        canonStatus: CanonStatus.HYPOTHESIS,
        clientBaseNotes: optionalString(formData, "clientBaseNotes", "Client base notes"),
        csmPartnerId: partnerId,
        globalFitSignals: optionalString(
          formData,
          "globalFitSignals",
          "Global fit signals",
        ),
        industryFocus: optionalString(formData, "industryFocus", "Industry focus"),
        name: requiredString(formData, "name", "PEO name"),
        nextSafestAction,
        offLimitsSummary: optionalString(
          formData,
          "offLimitsSummary",
          "Off-limits summary",
        ),
        permissionState,
        protectivenessLevel,
        publicResearchSummary: optionalString(
          formData,
          "publicResearchSummary",
          "Public research summary",
        ),
        readinessLevel,
        sourceConfidence,
        website: optionalHttpUrl(formData, "website", "Website"),
        hmlClassifications: {
          create: [
            {
              category: HmlCategory.PEO_READINESS,
              classification: readinessLevel,
              confidence: sourceConfidence,
              contributingSignals: [
                `protectiveness:${protectivenessLevel}`,
                `boundary:${boundaryRisk}`,
                `permission:${permissionState}`,
              ],
              explanation:
                "PEO readiness is manually set until enough relationship motion is recorded.",
              recommendedNextAction: nextSafestAction,
              ruleVersion: "relationship-map-v0.1",
            },
            {
              category: HmlCategory.PEO_PROTECTIVENESS,
              classification: protectivenessLevel,
              confidence: sourceConfidence,
              contributingSignals: [
                `boundary:${boundaryRisk}`,
                `permission:${permissionState}`,
              ],
              explanation:
                "PEO protectiveness is manually set until off-limits and CSM context mature.",
              recommendedNextAction: nextSafestAction,
              ruleVersion: "relationship-map-v0.1",
            },
          ],
        },
      },
    });
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("PEO create failed", error);
    formErrorRedirect("Could not save PEO. Check the fields and try again.", returnTo);
  }

  revalidatePath("/");
  revalidatePath("/partners");
  revalidatePath("/signal-feed");
  redirect(
    appendStatus(
      partnerId ? appendPartnerId(returnTo, partnerId) : returnTo,
      "peoCreated",
      "1",
    ),
  );
}

export async function createFollowUpPromise(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const access = await requireWriteAccess(returnTo);
  let partnerId: string | null = null;

  try {
    partnerId = await optionalPartnerId(formData);
    const peoId = await optionalPeoId(formData, partnerId);
    const dueAt = requiredDate(formData, "dueAt", "Due date");
    const sensitivity = requiredEnum(
      formData,
      "sensitivity",
      "Sensitivity",
      sensitivityValues,
    );
    const sourceConfidence = requiredEnum(
      formData,
      "sourceConfidence",
      "Source confidence",
      confidenceValues,
    );
    const prisma = getPrisma();

    await prisma.followUpPromise.create({
      data: {
        csmPartnerId: partnerId,
        dueAt,
        madeTo: requiredString(formData, "madeTo", "Made to"),
        ownerId: access.appUser.id,
        peoId,
        promise: requiredString(formData, "promise", "Promise"),
        sensitivity,
        sourceConfidence,
        status: FollowUpPromiseStatus.OPEN,
      },
    });
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("Follow-up promise create failed", error);
    formErrorRedirect(
      "Could not save follow-up promise. Check the fields and try again.",
      returnTo,
    );
  }

  revalidatePath("/");
  revalidatePath("/partners");
  redirect(
    appendStatus(
      partnerId ? appendPartnerId(returnTo, partnerId) : returnTo,
      "promiseCreated",
      "1",
    ),
  );
}
