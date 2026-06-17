"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CanonStatus,
  FollowUpPromiseStatus,
  HmlCategory,
  HmlValue,
  NoteSensitivity,
  NoteType,
  OpportunitySourceType,
  OpportunityStage,
  PermissionState,
  ProductRelevance,
  SourceConfidence,
} from "@/generated/prisma/client";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

const confidenceValues = new Set(Object.values(SourceConfidence));
const hmlValues = new Set(Object.values(HmlValue));
const noteSensitivityValues = new Set(Object.values(NoteSensitivity));
const noteTypeValues = new Set(Object.values(NoteType));
const permissionValues = new Set(Object.values(PermissionState));
const productValues = new Set(Object.values(ProductRelevance));
const sourceTypeValues = new Set(Object.values(OpportunitySourceType));
const stageValues = new Set(Object.values(OpportunityStage));

class FormValidationError extends Error {}

function safeReturnTo(formData: FormData) {
  const value = formData.get("returnTo");
  if (typeof value !== "string" || value.startsWith("//")) {
    return "/opportunities";
  }

  try {
    const url = new URL(value, "http://field-signal.local");
    if (url.origin !== "http://field-signal.local") return "/opportunities";
    if (url.pathname !== "/opportunities") return "/opportunities";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/opportunities";
  }
}

function appendStatus(path: string, key: string, value: string) {
  const url = new URL(path, "http://field-signal.local");
  url.searchParams.delete("formError");
  url.searchParams.set(key, value);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function appendOpportunityId(path: string, opportunityId: string) {
  const url = new URL(path, "http://field-signal.local");
  url.searchParams.set("opportunityId", opportunityId);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function formErrorRedirect(message: string, returnTo = "/opportunities"): never {
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

function selectedProducts(formData: FormData) {
  return formData
    .getAll("productInterest")
    .filter((value): value is string => typeof value === "string")
    .filter((value): value is ProductRelevance =>
      productValues.has(value as ProductRelevance),
    );
}

function riskFlags(formData: FormData) {
  return (
    optionalString(formData, "riskFlags", "Risk flags", 1200)
      ?.split(/\r?\n|,/)
      .map((flag) => flag.trim())
      .filter(Boolean)
      .slice(0, 12) ?? []
  );
}

async function requireWriteAccess(returnTo: string) {
  if (!hasDatabaseEnv()) {
    formErrorRedirect("Opportunity records are unavailable right now.", returnTo);
  }

  const access = await getAppAccess();

  if (access.status === "unauthenticated") {
    formErrorRedirect("Sign in before changing opportunity records.", returnTo);
  }

  if (!access.canWrite) {
    formErrorRedirect(
      "Write access is required to change opportunity records.",
      returnTo,
    );
  }

  return access;
}

async function optionalCsmPartnerId(formData: FormData) {
  const csmPartnerId = optionalString(formData, "csmPartnerId", "CSM partner", 200);
  if (!csmPartnerId) return null;

  const partner = await getPrisma().cSMPartner.findUnique({
    select: {
      id: true,
    },
    where: {
      id: csmPartnerId,
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

async function optionalTerritoryAccountId(formData: FormData) {
  const accountId = optionalString(
    formData,
    "territoryAccountId",
    "Territory account",
    200,
  );
  if (!accountId) return null;

  const account = await getPrisma().territoryAccount.findFirst({
    select: {
      id: true,
    },
    where: {
      AND: [
        {
          id: accountId,
        },
        {
          NOT: [
            { companyName: "Placeholder Chicagoland Prospect" },
            { category: "Placeholder" },
          ],
        },
      ],
    },
  });

  if (!account) {
    throw new FormValidationError("Selected territory account could not be found.");
  }

  return account.id;
}

async function requiredOpportunity(id: string) {
  const opportunity = await getPrisma().opportunity.findUnique({
    select: {
      csmPartnerId: true,
      id: true,
      peoId: true,
      territoryAccountId: true,
    },
    where: {
      id,
    },
  });

  if (!opportunity) {
    throw new FormValidationError("Selected opportunity could not be found.");
  }

  return opportunity;
}

function opportunityFields(formData: FormData) {
  return {
    followUpDueAt: optionalDate(formData, "followUpDueAt", "Follow-up due date"),
    momentumLevel: requiredEnum(formData, "momentumLevel", "Momentum", hmlValues),
    name: requiredString(formData, "name", "Opportunity name"),
    nextStep: requiredString(formData, "nextStep", "Next step"),
    nextStepOwner: optionalString(formData, "nextStepOwner", "Next step owner", 200),
    permissionState: requiredEnum(
      formData,
      "permissionState",
      "Permission",
      permissionValues,
    ),
    productInterest: selectedProducts(formData),
    riskFlags: riskFlags(formData),
    sourceConfidence: requiredEnum(
      formData,
      "sourceConfidence",
      "Source confidence",
      confidenceValues,
    ),
    sourceType: requiredEnum(formData, "sourceType", "Source type", sourceTypeValues),
    stage: requiredEnum(formData, "stage", "Stage", stageValues),
  };
}

export async function createOpportunity(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  await requireWriteAccess(returnTo);
  let createdOpportunityId: string | undefined;

  try {
    const csmPartnerId = await optionalCsmPartnerId(formData);
    const peoId = await optionalPeoId(formData, csmPartnerId);
    const territoryAccountId = await optionalTerritoryAccountId(formData);
    const fields = opportunityFields(formData);
    const prisma = getPrisma();
    const opportunity = await prisma.opportunity.create({
      data: {
        ...fields,
        canonStatus: CanonStatus.HYPOTHESIS,
        csmPartnerId,
        peoId,
        territoryAccountId,
        hmlClassifications: {
          create: {
            category: HmlCategory.OPPORTUNITY_MOMENTUM,
            classification: fields.momentumLevel,
            confidence: fields.sourceConfidence,
            contributingSignals: [
              `stage:${fields.stage}`,
              `permission:${fields.permissionState}`,
              `source:${fields.sourceType}`,
            ],
            explanation:
              "Opportunity momentum is manually set until meeting, promise, and stakeholder signals mature.",
            recommendedNextAction: fields.nextStep,
            ruleVersion: "opportunity-room-v0.1",
          },
        },
      },
    });
    createdOpportunityId = opportunity.id;
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("Opportunity create failed", error);
    formErrorRedirect(
      "Could not save opportunity. Check the fields and try again.",
      returnTo,
    );
  }

  revalidatePath("/");
  revalidatePath("/opportunities");
  revalidatePath("/signal-feed");
  redirect(
    appendStatus(
      createdOpportunityId
        ? appendOpportunityId(returnTo, createdOpportunityId)
        : returnTo,
      "created",
      "1",
    ),
  );
}

export async function updateOpportunity(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  await requireWriteAccess(returnTo);

  try {
    const opportunityId = requiredString(
      formData,
      "opportunityId",
      "Opportunity id",
      200,
    );
    await requiredOpportunity(opportunityId);
    const csmPartnerId = await optionalCsmPartnerId(formData);
    const peoId = await optionalPeoId(formData, csmPartnerId);
    const territoryAccountId = await optionalTerritoryAccountId(formData);
    const fields = opportunityFields(formData);
    const prisma = getPrisma();

    await prisma.$transaction([
      prisma.opportunity.update({
        data: {
          ...fields,
          csmPartnerId,
          peoId,
          territoryAccountId,
        },
        where: {
          id: opportunityId,
        },
      }),
      prisma.hmlClassification.create({
        data: {
          category: HmlCategory.OPPORTUNITY_MOMENTUM,
          classification: fields.momentumLevel,
          confidence: fields.sourceConfidence,
          contributingSignals: [
            `stage:${fields.stage}`,
            `permission:${fields.permissionState}`,
            `source:${fields.sourceType}`,
          ],
          explanation:
            "Opportunity momentum was refreshed from the current stage, permission, source, and next step.",
          opportunityId,
          recommendedNextAction: fields.nextStep,
          ruleVersion: "opportunity-room-v0.1",
        },
      }),
    ]);
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("Opportunity update failed", error);
    formErrorRedirect(
      "Could not update opportunity. Check the fields and try again.",
      returnTo,
    );
  }

  revalidatePath("/");
  revalidatePath("/opportunities");
  revalidatePath("/signal-feed");
  redirect(appendStatus(returnTo, "updated", "1"));
}

export async function createOpportunityNote(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  await requireWriteAccess(returnTo);

  try {
    const opportunityId = requiredString(
      formData,
      "opportunityId",
      "Opportunity id",
      200,
    );
    await requiredOpportunity(opportunityId);
    const prisma = getPrisma();

    await prisma.note.create({
      data: {
        body: requiredString(formData, "body", "Note", 3000),
        noteType: requiredEnum(formData, "noteType", "Note type", noteTypeValues),
        opportunityId,
        sensitivity: requiredEnum(
          formData,
          "sensitivity",
          "Sensitivity",
          noteSensitivityValues,
        ),
        sourceConfidence: requiredEnum(
          formData,
          "sourceConfidence",
          "Source confidence",
          confidenceValues,
        ),
      },
    });
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("Opportunity note create failed", error);
    formErrorRedirect("Could not save note. Check the fields and try again.", returnTo);
  }

  revalidatePath("/opportunities");
  redirect(appendStatus(returnTo, "noteCreated", "1"));
}

export async function createOpportunityFollowUp(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const access = await requireWriteAccess(returnTo);

  try {
    const opportunityId = requiredString(
      formData,
      "opportunityId",
      "Opportunity id",
      200,
    );
    const opportunity = await requiredOpportunity(opportunityId);
    const prisma = getPrisma();

    await prisma.followUpPromise.create({
      data: {
        csmPartnerId: opportunity.csmPartnerId,
        dueAt: requiredDate(formData, "dueAt", "Due date"),
        madeTo: requiredString(formData, "madeTo", "Made to"),
        opportunityId,
        ownerId: access.appUser.id,
        peoId: opportunity.peoId,
        promise: requiredString(formData, "promise", "Promise"),
        sensitivity: requiredEnum(
          formData,
          "sensitivity",
          "Sensitivity",
          noteSensitivityValues,
        ),
        sourceConfidence: requiredEnum(
          formData,
          "sourceConfidence",
          "Source confidence",
          confidenceValues,
        ),
        status: FollowUpPromiseStatus.OPEN,
        territoryAccountId: opportunity.territoryAccountId,
      },
    });
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("Opportunity follow-up create failed", error);
    formErrorRedirect(
      "Could not save follow-up promise. Check the fields and try again.",
      returnTo,
    );
  }

  revalidatePath("/");
  revalidatePath("/opportunities");
  redirect(appendStatus(returnTo, "promiseCreated", "1"));
}
