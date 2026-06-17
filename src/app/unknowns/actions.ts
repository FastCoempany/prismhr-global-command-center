"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  HmlValue,
  InternalUnknownStatus,
  SourceConfidence,
  UnknownCategory,
} from "@/generated/prisma/client";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { classifyInternalAmbiguity } from "@/lib/hml";

const categoryValues = new Set(Object.values(UnknownCategory));
const confidenceValues = new Set(Object.values(SourceConfidence));
const riskValues = new Set(Object.values(HmlValue));
const statusValues = new Set(Object.values(InternalUnknownStatus));
const visibleAccountWhere = {
  NOT: [{ companyName: "Placeholder Chicagoland Prospect" }, { category: "Placeholder" }],
};

class FormValidationError extends Error {}

function safeReturnTo(formData: FormData) {
  const value = formData.get("returnTo");
  if (typeof value !== "string" || value.startsWith("//")) {
    return "/unknowns";
  }

  try {
    const url = new URL(value, "http://field-signal.local");
    if (url.origin !== "http://field-signal.local") return "/unknowns";
    if (url.pathname !== "/unknowns") return "/unknowns";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/unknowns";
  }
}

function appendStatus(path: string, key: string, value: string) {
  const url = new URL(path, "http://field-signal.local");
  url.searchParams.delete("formError");
  url.searchParams.set(key, value);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function formErrorRedirect(message: string, returnTo = "/unknowns"): never {
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

function checkboxValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
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

async function requireWriteAccess(returnTo: string) {
  if (!hasDatabaseEnv()) {
    formErrorRedirect("Unknown records are unavailable right now.", returnTo);
  }

  const access = await getAppAccess();

  if (access.status === "unauthenticated") {
    formErrorRedirect("Sign in before changing unknowns.", returnTo);
  }

  if (!access.canWrite) {
    formErrorRedirect("Write access is required to change unknowns.", returnTo);
  }

  return access;
}

async function relatedAccountOrNull(formData: FormData) {
  const accountId = optionalString(formData, "relatedAccountId", "Related prospect", 200);
  if (!accountId) return null;

  const prisma = getPrisma();
  const account = await prisma.territoryAccount.findFirst({
    select: {
      id: true,
    },
    where: {
      AND: [
        visibleAccountWhere,
        {
          id: accountId,
        },
      ],
    },
  });

  if (!account) {
    throw new FormValidationError("Related prospect could not be found.");
  }

  return account;
}

async function relatedCsmPartnerOrNull(formData: FormData) {
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
    throw new FormValidationError("Related CSM partner could not be found.");
  }

  return partner;
}

async function relatedPeoOrNull(formData: FormData) {
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
    throw new FormValidationError("Related PEO could not be found.");
  }

  return peo;
}

async function relatedOpportunityOrNull(formData: FormData) {
  const opportunityId = optionalString(formData, "opportunityId", "Opportunity", 200);
  if (!opportunityId) return null;

  const opportunity = await getPrisma().opportunity.findUnique({
    select: {
      csmPartnerId: true,
      id: true,
      peoId: true,
      territoryAccountId: true,
    },
    where: {
      id: opportunityId,
    },
  });

  if (!opportunity) {
    throw new FormValidationError("Related opportunity could not be found.");
  }

  return opportunity;
}

async function relatedDailyServeOrNull(formData: FormData) {
  const dailyServeId = optionalString(formData, "dailyServeId", "Daily Serve", 200);
  if (!dailyServeId) return null;

  const dailyServe = await getPrisma().dailyServe.findUnique({
    select: {
      csmPartnerId: true,
      id: true,
      opportunityId: true,
      peoId: true,
      territoryAccountId: true,
    },
    where: {
      id: dailyServeId,
    },
  });

  if (!dailyServe) {
    throw new FormValidationError("Related Daily Serve could not be found.");
  }

  return dailyServe;
}

async function unknownLinks(formData: FormData) {
  const account = await relatedAccountOrNull(formData);
  const csmPartner = await relatedCsmPartnerOrNull(formData);
  const peo = await relatedPeoOrNull(formData);
  const opportunity = await relatedOpportunityOrNull(formData);
  const dailyServe = await relatedDailyServeOrNull(formData);
  const accountId = account?.id ?? null;
  const csmPartnerId = csmPartner?.id ?? null;
  const peoId = peo?.id ?? null;
  const opportunityId = opportunity?.id ?? null;
  const dailyServeId = dailyServe?.id ?? null;

  if (csmPartnerId && peo?.csmPartnerId && peo.csmPartnerId !== csmPartnerId) {
    throw new FormValidationError("Related PEO belongs to a different CSM.");
  }

  if (
    csmPartnerId &&
    opportunity?.csmPartnerId &&
    opportunity.csmPartnerId !== csmPartnerId
  ) {
    throw new FormValidationError("Related opportunity belongs to a different CSM.");
  }

  if (peoId && opportunity?.peoId && opportunity.peoId !== peoId) {
    throw new FormValidationError("Related opportunity belongs to a different PEO.");
  }

  if (
    accountId &&
    opportunity?.territoryAccountId &&
    opportunity.territoryAccountId !== accountId
  ) {
    throw new FormValidationError("Related opportunity belongs to a different prospect.");
  }

  if (
    csmPartnerId &&
    dailyServe?.csmPartnerId &&
    dailyServe.csmPartnerId !== csmPartnerId
  ) {
    throw new FormValidationError("Related Daily Serve belongs to a different CSM.");
  }

  if (peoId && dailyServe?.peoId && dailyServe.peoId !== peoId) {
    throw new FormValidationError("Related Daily Serve belongs to a different PEO.");
  }

  if (
    opportunityId &&
    dailyServe?.opportunityId &&
    dailyServe.opportunityId !== opportunityId
  ) {
    throw new FormValidationError(
      "Related Daily Serve belongs to a different opportunity.",
    );
  }

  if (
    accountId &&
    dailyServe?.territoryAccountId &&
    dailyServe.territoryAccountId !== accountId
  ) {
    throw new FormValidationError("Related Daily Serve belongs to a different prospect.");
  }

  return {
    accountId,
    csmPartnerId,
    dailyServeId,
    opportunityId,
    peoId,
  };
}

function unknownData(formData: FormData) {
  return {
    blocksImplementation: checkboxValue(formData, "blocksImplementation"),
    category: requiredEnum(formData, "category", "Category", categoryValues),
    confidence: requiredEnum(formData, "confidence", "Confidence", confidenceValues),
    currentBestAnswer: optionalString(
      formData,
      "currentBestAnswer",
      "Current best answer",
    ),
    dueAt: optionalDate(formData, "dueAt", "Due date"),
    question: requiredString(formData, "question", "Question"),
    riskLevel: requiredEnum(formData, "riskLevel", "Risk", riskValues),
    sourceNeeded: optionalString(formData, "sourceNeeded", "Source needed"),
  };
}

export async function createInternalUnknown(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  await requireWriteAccess(returnTo);

  try {
    const prisma = getPrisma();
    const links = await unknownLinks(formData);
    const fields = unknownData(formData);
    const status = InternalUnknownStatus.OPEN;
    const ambiguitySignal = classifyInternalAmbiguity({
      blocksImplementation: fields.blocksImplementation,
      category: fields.category,
      confidence: fields.confidence,
      question: fields.question,
      riskLevel: fields.riskLevel,
      status,
    });

    await prisma.$transaction(async (tx) => {
      const unknown = await tx.internalUnknown.create({
        data: {
          ...fields,
          csmPartnerId: links.csmPartnerId,
          dailyServeId: links.dailyServeId,
          opportunityId: links.opportunityId,
          peoId: links.peoId,
          relatedAccountId: links.accountId,
          status,
        },
      });

      await tx.hmlClassification.create({
        data: {
          ...ambiguitySignal,
          accountId: links.accountId,
          csmPartnerId: links.csmPartnerId,
          dailyServeId: links.dailyServeId,
          internalUnknownId: unknown.id,
          opportunityId: links.opportunityId,
          peoId: links.peoId,
        },
      });
    });
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("Internal Unknown create failed", error);
    formErrorRedirect(
      "Could not save unknown. Check the fields and try again.",
      returnTo,
    );
  }

  revalidatePath("/");
  revalidatePath("/daily-serves");
  revalidatePath("/opportunities");
  revalidatePath("/partners");
  revalidatePath("/prospect-field");
  revalidatePath("/signal-feed");
  revalidatePath("/unknowns");
  redirect(appendStatus(returnTo, "created", "1"));
}

export async function updateInternalUnknown(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  await requireWriteAccess(returnTo);

  try {
    const prisma = getPrisma();
    const id = requiredString(formData, "id", "Unknown id", 200);
    const links = await unknownLinks(formData);
    const fields = unknownData(formData);
    const status = requiredEnum(formData, "status", "Status", statusValues);
    const existing = await prisma.internalUnknown.findUnique({
      select: {
        id: true,
      },
      where: {
        id,
      },
    });

    if (!existing) {
      throw new FormValidationError("Selected unknown could not be found.");
    }

    const ambiguitySignal = classifyInternalAmbiguity({
      blocksImplementation: fields.blocksImplementation,
      category: fields.category,
      confidence: fields.confidence,
      question: fields.question,
      riskLevel: fields.riskLevel,
      status,
    });

    await prisma.$transaction(async (tx) => {
      await tx.internalUnknown.update({
        data: {
          ...fields,
          csmPartnerId: links.csmPartnerId,
          dailyServeId: links.dailyServeId,
          opportunityId: links.opportunityId,
          peoId: links.peoId,
          relatedAccountId: links.accountId,
          status,
        },
        where: {
          id,
        },
      });

      await tx.hmlClassification.create({
        data: {
          ...ambiguitySignal,
          accountId: links.accountId,
          csmPartnerId: links.csmPartnerId,
          dailyServeId: links.dailyServeId,
          internalUnknownId: id,
          opportunityId: links.opportunityId,
          peoId: links.peoId,
        },
      });
    });
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("Internal Unknown update failed", error);
    formErrorRedirect(
      "Could not update unknown. Check the fields and try again.",
      returnTo,
    );
  }

  revalidatePath("/");
  revalidatePath("/daily-serves");
  revalidatePath("/opportunities");
  revalidatePath("/partners");
  revalidatePath("/prospect-field");
  revalidatePath("/signal-feed");
  revalidatePath("/unknowns");
  redirect(appendStatus(returnTo, "updated", "1"));
}
