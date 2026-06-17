"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  BoundaryRuleStatus,
  BoundaryRuleType,
  BoundaryScopeType,
  BoundarySeverity,
  CanonStatus,
  HmlCategory,
  HmlValue,
  SourceConfidence,
} from "@/generated/prisma/client";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { humanizeEnum as label } from "@/lib/format";

const ruleTypeValues = new Set(Object.values(BoundaryRuleType));
const scopeTypeValues = new Set(Object.values(BoundaryScopeType));
const severityValues = new Set(Object.values(BoundarySeverity));
const statusValues = new Set(Object.values(BoundaryRuleStatus));
const confidenceValues = new Set(Object.values(SourceConfidence));

class FormValidationError extends Error {}

function safeReturnTo(formData: FormData) {
  const value = formData.get("returnTo");
  if (typeof value !== "string" || value.startsWith("//")) {
    return "/boundaries";
  }

  try {
    const url = new URL(value, "http://field-signal.local");
    if (url.origin !== "http://field-signal.local") return "/boundaries";
    if (url.pathname !== "/boundaries") return "/boundaries";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/boundaries";
  }
}

function appendStatus(path: string, key: string, value: string) {
  const url = new URL(path, "http://field-signal.local");
  url.searchParams.delete("formError");
  url.searchParams.set(key, value);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function appendBoundaryId(path: string, boundaryId: string) {
  const url = new URL(path, "http://field-signal.local");
  url.searchParams.set("boundaryId", boundaryId);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function formErrorRedirect(message: string, returnTo = "/boundaries"): never {
  redirect(appendStatus(returnTo, "formError", message));
}

function requiredString(
  formData: FormData,
  key: string,
  labelText: string,
  maxLength = 500,
) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new FormValidationError(`${labelText} is required.`);
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new FormValidationError(
      `${labelText} must be ${maxLength} characters or fewer.`,
    );
  }

  return trimmed;
}

function optionalString(
  formData: FormData,
  key: string,
  labelText: string,
  maxLength = 1200,
) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) return undefined;

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new FormValidationError(
      `${labelText} must be ${maxLength} characters or fewer.`,
    );
  }

  return trimmed;
}

function requiredEnum<T extends string>(
  formData: FormData,
  key: string,
  labelText: string,
  allowed: Set<T>,
) {
  const value = formData.get(key);
  if (typeof value !== "string" || !allowed.has(value as T)) {
    throw new FormValidationError(`${labelText} must be a valid option.`);
  }

  return value as T;
}

function optionalDate(formData: FormData, key: string, labelText: string) {
  const value = optionalString(formData, key, labelText, 10);
  if (!value) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new FormValidationError(`${labelText} must be a valid date.`);
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new FormValidationError(`${labelText} must be a valid date.`);
  }

  return parsed;
}

function requiredDate(formData: FormData, key: string, labelText: string) {
  const parsed = optionalDate(formData, key, labelText);
  if (!parsed) {
    throw new FormValidationError(`${labelText} is required.`);
  }
  return parsed;
}

async function requireWriteAccess(returnTo: string) {
  if (!hasDatabaseEnv()) {
    formErrorRedirect("Boundary records are unavailable right now.", returnTo);
  }

  const access = await getAppAccess();

  if (access.status === "unauthenticated") {
    formErrorRedirect("Sign in before changing boundary records.", returnTo);
  }

  if (!access.canWrite) {
    formErrorRedirect("Write access is required to change boundary records.", returnTo);
  }

  return access;
}

async function requiredCsmPartnerId(formData: FormData) {
  const csmPartnerId = requiredString(formData, "csmPartnerId", "CSM partner", 200);
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

async function requiredPeoId(formData: FormData) {
  const peoId = requiredString(formData, "peoId", "PEO", 200);
  const peo = await getPrisma().pEO.findUnique({
    select: {
      id: true,
    },
    where: {
      id: peoId,
    },
  });

  if (!peo) {
    throw new FormValidationError("Selected PEO could not be found.");
  }

  return peo.id;
}

async function requiredPeoClientId(formData: FormData) {
  const peoClientId = requiredString(formData, "peoClientId", "PEO client", 200);
  const peoClient = await getPrisma().pEOClient.findUnique({
    select: {
      id: true,
    },
    where: {
      id: peoClientId,
    },
  });

  if (!peoClient) {
    throw new FormValidationError("Selected PEO client could not be found.");
  }

  return peoClient.id;
}

async function requiredOpportunityId(formData: FormData) {
  const opportunityId = requiredString(formData, "opportunityId", "Opportunity", 200);
  const opportunity = await getPrisma().opportunity.findUnique({
    select: {
      id: true,
    },
    where: {
      id: opportunityId,
    },
  });

  if (!opportunity) {
    throw new FormValidationError("Selected opportunity could not be found.");
  }

  return opportunity.id;
}

async function requiredTerritoryAccountId(formData: FormData) {
  const territoryAccountId = requiredString(
    formData,
    "territoryAccountId",
    "Territory account",
    200,
  );
  const account = await getPrisma().territoryAccount.findFirst({
    select: {
      id: true,
    },
    where: {
      AND: [
        {
          id: territoryAccountId,
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

async function boundaryLinks(formData: FormData, scopeType: BoundaryScopeType) {
  const links = {
    csmPartnerId: null as string | null,
    opportunityId: null as string | null,
    peoClientId: null as string | null,
    peoId: null as string | null,
    territoryAccountId: null as string | null,
  };

  if (scopeType === BoundaryScopeType.CSM_PARTNER) {
    links.csmPartnerId = await requiredCsmPartnerId(formData);
  }

  if (scopeType === BoundaryScopeType.PEO) {
    links.peoId = await requiredPeoId(formData);
  }

  if (scopeType === BoundaryScopeType.PEO_CLIENT) {
    links.peoClientId = await requiredPeoClientId(formData);
  }

  if (scopeType === BoundaryScopeType.OPPORTUNITY) {
    links.opportunityId = await requiredOpportunityId(formData);
  }

  if (scopeType === BoundaryScopeType.TERRITORY_ACCOUNT) {
    links.territoryAccountId = await requiredTerritoryAccountId(formData);
  }

  return links;
}

function boundaryFields(formData: FormData, fallbackSetBy: string) {
  const effectiveFrom = requiredDate(formData, "effectiveFrom", "Effective from");
  const expiresAt = optionalDate(formData, "expiresAt", "Expires at");
  const reviewAt = optionalDate(formData, "reviewAt", "Review at");

  if (expiresAt && expiresAt < effectiveFrom) {
    throw new FormValidationError("Expires at must be after the effective date.");
  }

  return {
    allowedAlternative: optionalString(
      formData,
      "allowedAlternative",
      "Allowed alternative",
      1200,
    ),
    description: requiredString(formData, "description", "Description", 2000),
    effectiveFrom,
    expiresAt,
    reason: requiredString(formData, "reason", "Reason", 1200),
    reviewAt,
    ruleType: requiredEnum(formData, "ruleType", "Rule type", ruleTypeValues),
    scopeType: requiredEnum(formData, "scopeType", "Scope", scopeTypeValues),
    setBy: optionalString(formData, "setBy", "Set by", 200) ?? fallbackSetBy,
    severity: requiredEnum(formData, "severity", "Severity", severityValues),
    sourceConfidence: requiredEnum(
      formData,
      "sourceConfidence",
      "Source confidence",
      confidenceValues,
    ),
    title: requiredString(formData, "title", "Title", 160),
  };
}

function boundaryHmlValue(severity: BoundarySeverity, status: BoundaryRuleStatus) {
  if (status !== BoundaryRuleStatus.ACTIVE) return HmlValue.LOW;
  if (severity === BoundarySeverity.BLOCKED) return HmlValue.HIGH;
  if (severity === BoundarySeverity.APPROVAL_REQUIRED) return HmlValue.MEDIUM;
  return HmlValue.LOW;
}

function hmlTarget(links: {
  csmPartnerId: string | null;
  opportunityId: string | null;
  peoId: string | null;
  territoryAccountId: string | null;
}) {
  if (links.territoryAccountId) {
    return {
      accountId: links.territoryAccountId,
    };
  }
  if (links.opportunityId) {
    return {
      opportunityId: links.opportunityId,
    };
  }
  if (links.peoId) {
    return {
      peoId: links.peoId,
    };
  }
  if (links.csmPartnerId) {
    return {
      csmPartnerId: links.csmPartnerId,
    };
  }
  return null;
}

function revalidateBoundarySurfaces() {
  revalidatePath("/");
  revalidatePath("/boundaries");
  revalidatePath("/opportunities");
  revalidatePath("/partners");
  revalidatePath("/prospect-field");
  revalidatePath("/signal-feed");
}

export async function createBoundaryRule(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const access = await requireWriteAccess(returnTo);
  let createdBoundaryId: string | undefined;

  try {
    const fields = boundaryFields(formData, access.appUser.name);
    const links = await boundaryLinks(formData, fields.scopeType);
    const prisma = getPrisma();
    const status = BoundaryRuleStatus.ACTIVE;
    const classification = boundaryHmlValue(fields.severity, status);

    const rule = await prisma.$transaction(async (tx) => {
      const created = await tx.boundaryRule.create({
        data: {
          ...fields,
          ...links,
          canonStatus: CanonStatus.HYPOTHESIS,
          status,
        },
      });
      const target = hmlTarget(links);

      if (target) {
        await tx.hmlClassification.create({
          data: {
            ...target,
            category: HmlCategory.BOUNDARY_RISK,
            classification,
            confidence: fields.sourceConfidence,
            contributingSignals: [
              `rule:${fields.ruleType}`,
              `scope:${fields.scopeType}`,
              `severity:${fields.severity}`,
              `status:${status}`,
            ],
            explanation: `${label(fields.ruleType)} boundary is ${label(fields.severity).toLowerCase()}: ${fields.title}.`,
            recommendedNextAction:
              fields.allowedAlternative ?? "Resolve the boundary before motion.",
            ruleVersion: "boundary-rules-v0.1",
          },
        });
      }

      return created;
    });

    createdBoundaryId = rule.id;
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("Boundary rule create failed", error);
    formErrorRedirect(
      "Could not save boundary rule. Check the fields and try again.",
      returnTo,
    );
  }

  revalidateBoundarySurfaces();
  redirect(
    appendStatus(
      createdBoundaryId ? appendBoundaryId(returnTo, createdBoundaryId) : returnTo,
      "created",
      "1",
    ),
  );
}

export async function updateBoundaryRule(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const access = await requireWriteAccess(returnTo);
  let updatedBoundaryId: string | undefined;

  try {
    const boundaryId = requiredString(formData, "boundaryId", "Boundary rule id", 200);
    const fields = boundaryFields(formData, access.appUser.name);
    const status = requiredEnum(formData, "status", "Status", statusValues);
    const links = await boundaryLinks(formData, fields.scopeType);
    const prisma = getPrisma();
    const classification = boundaryHmlValue(fields.severity, status);

    await prisma.$transaction(async (tx) => {
      const updated = await tx.boundaryRule.update({
        data: {
          ...fields,
          ...links,
          status,
        },
        where: {
          id: boundaryId,
        },
      });
      const target = hmlTarget(links);

      if (target) {
        await tx.hmlClassification.create({
          data: {
            ...target,
            category: HmlCategory.BOUNDARY_RISK,
            classification,
            confidence: fields.sourceConfidence,
            contributingSignals: [
              `rule:${fields.ruleType}`,
              `scope:${fields.scopeType}`,
              `severity:${fields.severity}`,
              `status:${status}`,
            ],
            explanation: `${label(fields.ruleType)} boundary is ${label(status).toLowerCase()} at ${label(fields.severity).toLowerCase()} severity: ${fields.title}.`,
            recommendedNextAction:
              fields.allowedAlternative ?? "Resolve the boundary before motion.",
            ruleVersion: "boundary-rules-v0.1",
          },
        });
      }

      updatedBoundaryId = updated.id;
    });
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("Boundary rule update failed", error);
    formErrorRedirect(
      "Could not update boundary rule. Check the fields and try again.",
      returnTo,
    );
  }

  revalidateBoundarySurfaces();
  redirect(
    appendStatus(
      updatedBoundaryId ? appendBoundaryId(returnTo, updatedBoundaryId) : returnTo,
      "updated",
      "1",
    ),
  );
}
