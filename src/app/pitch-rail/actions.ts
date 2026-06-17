"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ApprovalStatus,
  CanonStatus,
  PitchAssetType,
  PitchAudience,
  ProductRelevance,
  SourceConfidence,
} from "@/generated/prisma/client";
import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

const approvalValues = new Set(Object.values(ApprovalStatus));
const assetTypeValues = new Set(Object.values(PitchAssetType));
const audienceValues = new Set(Object.values(PitchAudience));
const canonValues = new Set(Object.values(CanonStatus));
const confidenceValues = new Set(Object.values(SourceConfidence));
const productValues = new Set(Object.values(ProductRelevance));

class FormValidationError extends Error {}

function safeReturnTo(formData: FormData) {
  const value = formData.get("returnTo");
  if (typeof value !== "string" || value.startsWith("//")) {
    return "/pitch-rail";
  }

  try {
    const url = new URL(value, "http://field-signal.local");
    if (url.origin !== "http://field-signal.local") return "/pitch-rail";
    if (url.pathname !== "/pitch-rail") return "/pitch-rail";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/pitch-rail";
  }
}

function appendStatus(path: string, key: string, value: string) {
  const url = new URL(path, "http://field-signal.local");
  url.searchParams.delete("formError");
  url.searchParams.set(key, value);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

function formErrorRedirect(message: string, returnTo = "/pitch-rail"): never {
  redirect(appendStatus(returnTo, "formError", message));
}

function requiredString(
  formData: FormData,
  key: string,
  label: string,
  maxLength = 2000,
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
  maxLength = 2000,
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

function lineList(formData: FormData, key: string, label: string) {
  return (
    optionalString(formData, key, label, 3000)
      ?.split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 20) ?? []
  );
}

async function requireWriteAccess(returnTo: string) {
  if (!hasDatabaseEnv()) {
    formErrorRedirect("Pitch records are unavailable right now.", returnTo);
  }

  const access = await getAppAccess();

  if (access.status === "unauthenticated") {
    formErrorRedirect("Sign in before changing pitch records.", returnTo);
  }

  if (!access.canWrite) {
    formErrorRedirect("Write access is required to change pitch records.", returnTo);
  }

  return access;
}

function approvedByValue(
  formData: FormData,
  approvalStatus: ApprovalStatus,
  fallbackName: string,
) {
  return (
    optionalString(formData, "approvedBy", "Approved by", 200) ??
    (approvalStatus === ApprovalStatus.OWNER_APPROVED ? fallbackName : undefined)
  );
}

export async function createDiscoveryFramework(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const access = await requireWriteAccess(returnTo);

  try {
    const approvalStatus = requiredEnum(
      formData,
      "approvalStatus",
      "Approval status",
      approvalValues,
    );

    await getPrisma().discoveryFramework.create({
      data: {
        approvalStatus,
        approvedBy: approvedByValue(formData, approvalStatus, access.appUser.name),
        audience: requiredEnum(formData, "audience", "Audience", audienceValues),
        boundaryNotes: optionalString(formData, "boundaryNotes", "Boundary notes"),
        canonStatus: requiredEnum(formData, "canonStatus", "Canon status", canonValues),
        demoFocus: optionalString(formData, "demoFocus", "Demo focus"),
        discoveryQuestions: lineList(
          formData,
          "discoveryQuestions",
          "Discovery questions",
        ),
        disqualificationSignals: lineList(
          formData,
          "disqualificationSignals",
          "Disqualification signals",
        ),
        productRelevance: requiredEnum(
          formData,
          "productRelevance",
          "Product relevance",
          productValues,
        ),
        sourceConfidence: requiredEnum(
          formData,
          "sourceConfidence",
          "Source confidence",
          confidenceValues,
        ),
        title: requiredString(formData, "title", "Title", 180),
        triggerSignals: lineList(formData, "triggerSignals", "Trigger signals"),
        useCase: requiredString(formData, "useCase", "Use case"),
      },
    });
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("Discovery framework create failed", error);
    formErrorRedirect(
      "Could not save discovery framework. Check the fields and try again.",
      returnTo,
    );
  }

  revalidatePath("/opportunities");
  revalidatePath("/pitch-rail");
  redirect(appendStatus(returnTo, "frameworkCreated", "1"));
}

export async function createPitchAsset(formData: FormData) {
  const returnTo = safeReturnTo(formData);
  const access = await requireWriteAccess(returnTo);

  try {
    const approvalStatus = requiredEnum(
      formData,
      "approvalStatus",
      "Approval status",
      approvalValues,
    );

    await getPrisma().pitchAsset.create({
      data: {
        approvalStatus,
        approvedBy: approvedByValue(formData, approvalStatus, access.appUser.name),
        assetType: requiredEnum(formData, "assetType", "Asset type", assetTypeValues),
        audience: requiredEnum(formData, "audience", "Audience", audienceValues),
        canonStatus: requiredEnum(formData, "canonStatus", "Canon status", canonValues),
        content: requiredString(formData, "content", "Content", 4000),
        productRelevance: requiredEnum(
          formData,
          "productRelevance",
          "Product relevance",
          productValues,
        ),
        sourceConfidence: requiredEnum(
          formData,
          "sourceConfidence",
          "Source confidence",
          confidenceValues,
        ),
        title: requiredString(formData, "title", "Title", 180),
        usageNotes: optionalString(formData, "usageNotes", "Usage notes"),
      },
    });
  } catch (error) {
    if (error instanceof FormValidationError) {
      formErrorRedirect(error.message, returnTo);
    }

    console.error("Pitch asset create failed", error);
    formErrorRedirect(
      "Could not save pitch asset. Check the fields and try again.",
      returnTo,
    );
  }

  revalidatePath("/opportunities");
  revalidatePath("/pitch-rail");
  redirect(appendStatus(returnTo, "assetCreated", "1"));
}
