import {
  ApprovalStatus,
  PitchAssetType,
  PitchAudience,
  ProductRelevance,
  SourceConfidence,
} from "@/generated/prisma/client";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

const LIBRARY_LIMIT = 30;
const approvalValues = new Set(Object.values(ApprovalStatus));
const assetTypeValues = new Set(Object.values(PitchAssetType));
const audienceValues = new Set(Object.values(PitchAudience));
const confidenceValues = new Set(Object.values(SourceConfidence));
const productValues = new Set(Object.values(ProductRelevance));

export type PitchRailSearchParams = {
  approval?: string;
  assetType?: string;
  audience?: string;
  confidence?: string;
  product?: string;
  q?: string;
};

export type PitchRailFilters = {
  approval?: ApprovalStatus;
  assetType?: PitchAssetType;
  audience?: PitchAudience;
  confidence?: SourceConfidence;
  product?: ProductRelevance;
  q?: string;
};

function parseEnum<T extends string>(value: string | undefined, allowed: Set<T>) {
  return value && allowed.has(value as T) ? (value as T) : undefined;
}

export function parsePitchRailFilters(
  searchParams: PitchRailSearchParams,
): PitchRailFilters {
  return {
    approval: parseEnum(searchParams.approval, approvalValues),
    assetType: parseEnum(searchParams.assetType, assetTypeValues),
    audience: parseEnum(searchParams.audience, audienceValues),
    confidence: parseEnum(searchParams.confidence, confidenceValues),
    product: parseEnum(searchParams.product, productValues),
    q: searchParams.q?.trim() || undefined,
  };
}

function frameworkWhere(filters: PitchRailFilters) {
  const clauses: object[] = [];

  if (filters.q) {
    clauses.push({
      OR: [
        {
          title: {
            contains: filters.q,
          },
        },
        {
          useCase: {
            contains: filters.q,
          },
        },
        {
          demoFocus: {
            contains: filters.q,
          },
        },
        {
          boundaryNotes: {
            contains: filters.q,
          },
        },
      ],
    });
  }

  if (filters.approval) clauses.push({ approvalStatus: filters.approval });
  if (filters.audience) clauses.push({ audience: filters.audience });
  if (filters.confidence) clauses.push({ sourceConfidence: filters.confidence });
  if (filters.product) clauses.push({ productRelevance: filters.product });

  return clauses.length > 0
    ? {
        AND: clauses,
      }
    : {};
}

function assetWhere(filters: PitchRailFilters) {
  const clauses: object[] = [];

  if (filters.q) {
    clauses.push({
      OR: [
        {
          title: {
            contains: filters.q,
          },
        },
        {
          content: {
            contains: filters.q,
          },
        },
        {
          usageNotes: {
            contains: filters.q,
          },
        },
      ],
    });
  }

  if (filters.approval) clauses.push({ approvalStatus: filters.approval });
  if (filters.assetType) clauses.push({ assetType: filters.assetType });
  if (filters.audience) clauses.push({ audience: filters.audience });
  if (filters.confidence) clauses.push({ sourceConfidence: filters.confidence });
  if (filters.product) clauses.push({ productRelevance: filters.product });

  return clauses.length > 0
    ? {
        AND: clauses,
      }
    : {};
}

export async function getPitchRailData(filters: PitchRailFilters) {
  if (!hasDatabaseEnv()) {
    return {
      assets: [],
      counts: {
        approvedAssets: 0,
        assets: 0,
        frameworks: 0,
        needsReview: 0,
      },
      databaseReady: false,
      error: "Pitch records cannot be loaded right now.",
      filters,
      frameworks: [],
      limit: LIBRARY_LIMIT,
    };
  }

  try {
    const prisma = getPrisma();
    const [frameworks, assets, frameworkCount, assetCount, approvedAssets, needsReview] =
      await Promise.all([
        prisma.discoveryFramework.findMany({
          orderBy: {
            updatedAt: "desc",
          },
          take: LIBRARY_LIMIT,
          where: frameworkWhere(filters),
        }),
        prisma.pitchAsset.findMany({
          orderBy: {
            updatedAt: "desc",
          },
          take: LIBRARY_LIMIT,
          where: assetWhere(filters),
        }),
        prisma.discoveryFramework.count({
          where: frameworkWhere(filters),
        }),
        prisma.pitchAsset.count({
          where: assetWhere(filters),
        }),
        prisma.pitchAsset.count({
          where: {
            approvalStatus: ApprovalStatus.OWNER_APPROVED,
          },
        }),
        prisma.pitchAsset.count({
          where: {
            approvalStatus: ApprovalStatus.NEEDS_OWNER_REVIEW,
          },
        }),
      ]);

    return {
      assets,
      counts: {
        approvedAssets,
        assets: assetCount,
        frameworks: frameworkCount,
        needsReview,
      },
      databaseReady: true,
      error: null,
      filters,
      frameworks,
      limit: LIBRARY_LIMIT,
    };
  } catch (error) {
    console.error("Pitch Rail load failed", error);

    return {
      assets: [],
      counts: {
        approvedAssets: 0,
        assets: 0,
        frameworks: 0,
        needsReview: 0,
      },
      databaseReady: false,
      error: "Pitch records cannot be loaded right now.",
      filters,
      frameworks: [],
      limit: LIBRARY_LIMIT,
    };
  }
}
