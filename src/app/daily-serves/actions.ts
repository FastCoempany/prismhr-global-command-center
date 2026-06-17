"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ApprovalStatus,
  CanonStatus,
  DailyServeCategory,
  DailyServeOutcome,
  DailyServeStatus,
  PitchAudience,
  SourceConfidence,
} from "@/generated/prisma/client";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import {
  classifyDailyServeOpportunityImpact,
  classifyDailyServeRelationshipImpact,
} from "@/lib/hml";

const canonValues = new Set(Object.values(CanonStatus));
const categoryValues = new Set(Object.values(DailyServeCategory));
const confidenceValues = new Set(Object.values(SourceConfidence));
const outcomeValues = new Set(Object.values(DailyServeOutcome));
const statusValues = new Set(Object.values(DailyServeStatus));

class FormValidationError extends Error {}

function safeReturnTo(formData: FormData) {
  const value = formData.get("returnTo");
  if (typeof value !== "string" || value.startsWith("//")) {
    return "/daily-serves";
  }

  try {
    const url = new URL(value, "http://field-signal.local");
    if (url.origin !== "http://field-signal.local") return "/daily-serves";
    if (url.pathname !== "/daily-serves") return "/daily-serves";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/daily-serves";
  }
}

function appendStatus(path: string, key: string, value: string) {
  const url = new URL(path, "http://field-signal.local");
  url.searchParams.delete("formError");
  url.searchParams.set(key, value);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function appendDailyServeId(path: string, dailyServeId: string) {
  const url = new URL(path, "http://field-signal.local");
  url.searchParams.set("dailyServeId", dailyServeId);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function formErrorRedirect(message: string, returnTo = "/daily-serves"): never {
  redirect(appendStatus(returnTo, "formError", message));
}

function requiredString(
  formData: FormData,
  key: string,
  label: string,
  maxLength = 1200,
) {
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
  if (typeof value !== "string" || value.trim().length === 0) return null;

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

async function requireWriteAccess(returnTo: string) {
  if (!hasDatabaseEnv()) {
    formErrorRedirect("Daily Serve records are unavailable right now.", returnTo);
  }

  const access = await getAppAccess();

  if (access.status === "unauthenticated") {
    formErrorRedirect("Sign in before changing Daily Serve records.", returnTo);
  }

  if (!access.canWrite) {
    formErrorRedirect(
      "Write access is required to change Daily Serve records.",
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

async function optionalOpportunity(formData: FormData) {
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
    throw new FormValidationError("Selected opportunity could not be found.");
  }

  return opportunity;
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

async function optionalPitchAssetId(formData: FormData) {
  const pitchAssetId = optionalString(formData, "pitchAssetId", "Pitch asset", 200);
  if (!pitchAssetId) return null;

  const pitchAsset = await getPrisma().pitchAsset.findFirst({
    select: {
      id: true,
    },
    where: {
      approvalStatus: ApprovalStatus.OWNER_APPROVED,
      audience: PitchAudience.CSM,
      id: pitchAssetId,
    },
  });

  if (!pitchAsset) {
    throw new FormValidationError("Selected pitch asset is not an approved CSM asset.");
  }

  return pitchAsset.id;
}

function sentAtValue(status: DailyServeStatus, existing: Date | null = null) {
  if (existing) return existing;
  return status === DailyServeStatus.SENT ? new Date() : null;
}

function outcomeAtValue(outcome: DailyServeOutcome, existing: Date | null = null) {
  if (existing) return existing;
  return outcome === DailyServeOutcome.PENDING ? null : new Date();
}

function revalidateDailyServePaths() {
  revalidatePath("/");
  revalidatePath("/daily-serves");
  revalidatePath("/opportunities");
  revalidatePath("/partners");
  revalidatePath("/signal-feed");
}

async function createDailyServeSignals(
  tx: Pick<
    ReturnType<typeof getPrisma>,
    "cSMPartner" | "hmlClassification" | "opportunity"
  >,
  dailyServe: {
    category: DailyServeCategory;
    csmPartnerId: string | null;
    id: string;
    nextSafestAction: string;
    opportunityId: string | null;
    outcome: DailyServeOutcome;
    peoId: string | null;
    sourceConfidence: SourceConfidence;
    status: DailyServeStatus;
    territoryAccountId: string | null;
    title: string;
  },
) {
  const relationshipSignal = classifyDailyServeRelationshipImpact(dailyServe);
  const opportunitySignal = classifyDailyServeOpportunityImpact(dailyServe);
  const links = {
    accountId: dailyServe.territoryAccountId,
    csmPartnerId: dailyServe.csmPartnerId,
    dailyServeId: dailyServe.id,
    opportunityId: dailyServe.opportunityId,
    peoId: dailyServe.peoId,
  };

  await tx.hmlClassification.create({
    data: {
      ...relationshipSignal,
      ...links,
    },
  });

  if (dailyServe.csmPartnerId) {
    await tx.cSMPartner.update({
      data: {
        relationshipHeat: relationshipSignal.classification,
      },
      where: {
        id: dailyServe.csmPartnerId,
      },
    });
  }

  if (dailyServe.opportunityId) {
    await tx.hmlClassification.create({
      data: {
        ...opportunitySignal,
        ...links,
      },
    });

    await tx.opportunity.update({
      data: {
        momentumLevel: opportunitySignal.classification,
      },
      where: {
        id: dailyServe.opportunityId,
      },
    });
  }
}

async function dailyServeFields(formData: FormData) {
  const opportunity = await optionalOpportunity(formData);
  const selectedCsmPartnerId = await optionalCsmPartnerId(formData);
  const csmPartnerId = selectedCsmPartnerId ?? opportunity?.csmPartnerId ?? null;
  const selectedPeoId = await optionalPeoId(formData, csmPartnerId);
  const peoId = selectedPeoId ?? opportunity?.peoId ?? null;
  const selectedTerritoryAccountId = await optionalTerritoryAccountId(formData);
  const territoryAccountId =
    selectedTerritoryAccountId ?? opportunity?.territoryAccountId ?? null;

  if (
    opportunity?.csmPartnerId &&
    selectedCsmPartnerId &&
    opportunity.csmPartnerId !== selectedCsmPartnerId
  ) {
    throw new FormValidationError(
      "Selected opportunity belongs to a different CSM partner.",
    );
  }

  if (opportunity?.peoId && selectedPeoId && opportunity.peoId !== selectedPeoId) {
    throw new FormValidationError("Selected opportunity belongs to a different PEO.");
  }

  return {
    canonStatus: requiredEnum(formData, "canonStatus", "Canon status", canonValues),
    category: requiredEnum(formData, "category", "Category", categoryValues),
    content: requiredString(formData, "content", "Serve content", 4000),
    csmPartnerId,
    nextSafestAction: requiredString(
      formData,
      "nextSafestAction",
      "Next safest action",
      1200,
    ),
    opportunityId: opportunity?.id ?? null,
    outcome: requiredEnum(formData, "outcome", "Outcome", outcomeValues),
    peoId,
    pitchAssetId: await optionalPitchAssetId(formData),
    sourceConfidence: requiredEnum(
      formData,
      "sourceConfidence",
      "Source confidence",
      confidenceValues,
    ),
    status: requiredEnum(formData, "status", "Status", statusValues),
    territoryAccountId,
    title: requiredString(formData, "title", "Title", 180),
    usefulnessReason: requiredString(
      formData,
      "usefulnessReason",
      "Usefulness reason",
      1200,
    ),
  };
}

export async function createDailyServe(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const access = await requireWriteAccess(returnTo);
  let createdDailyServeId: string | undefined;

  try {
    const fields = await dailyServeFields(formData);
    const prisma = getPrisma();

    await prisma.$transaction(async (tx) => {
      const dailyServe = await tx.dailyServe.create({
        data: {
          ...fields,
          ownerId: access.appUser.id,
          outcomeAt: outcomeAtValue(fields.outcome),
          sentAt: sentAtValue(fields.status),
        },
      });
      createdDailyServeId = dailyServe.id;

      if (fields.outcome !== DailyServeOutcome.PENDING) {
        await createDailyServeSignals(tx, dailyServe);
      }
    });
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("Daily Serve create failed", error);
    formErrorRedirect(
      "Could not save Daily Serve. Check the fields and try again.",
      returnTo,
    );
  }

  revalidateDailyServePaths();
  redirect(
    appendStatus(
      createdDailyServeId ? appendDailyServeId(returnTo, createdDailyServeId) : returnTo,
      "created",
      "1",
    ),
  );
}

export async function updateDailyServeOutcome(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  await requireWriteAccess(returnTo);

  try {
    const dailyServeId = requiredString(formData, "dailyServeId", "Daily Serve id", 200);
    const status = requiredEnum(formData, "status", "Status", statusValues);
    const outcome = requiredEnum(formData, "outcome", "Outcome", outcomeValues);
    const prisma = getPrisma();

    await prisma.$transaction(async (tx) => {
      const existing = await tx.dailyServe.findUnique({
        where: {
          id: dailyServeId,
        },
      });

      if (!existing) {
        throw new FormValidationError("Selected Daily Serve could not be found.");
      }

      const dailyServe = await tx.dailyServe.update({
        data: {
          outcome,
          outcomeAt: outcomeAtValue(outcome, existing.outcomeAt),
          sentAt: sentAtValue(status, existing.sentAt),
          status,
        },
        where: {
          id: dailyServeId,
        },
      });

      if (outcome !== DailyServeOutcome.PENDING) {
        await createDailyServeSignals(tx, dailyServe);
      }
    });
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("Daily Serve outcome update failed", error);
    formErrorRedirect(
      "Could not update Daily Serve outcome. Check the fields and try again.",
      returnTo,
    );
  }

  revalidateDailyServePaths();
  redirect(appendStatus(returnTo, "outcomeUpdated", "1"));
}
