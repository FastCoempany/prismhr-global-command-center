import { HmlCategory, HmlValue, SourceConfidence } from "@/generated/prisma/client";
import { emptyHmlCounts } from "@/lib/hml-priority";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

const SIGNAL_LIMIT = 50;
const categoryValues = new Set(Object.values(HmlCategory));
const hmlValues = new Set(Object.values(HmlValue));
const confidenceValues = new Set(Object.values(SourceConfidence));
const visibleClassificationWhere = {
  NOT: {
    contributingSignals: {
      has: "placeholder_seed_record",
    },
  },
};

export type SignalFeedSearchParams = {
  category?: string;
  confidence?: string;
  hml?: string;
  q?: string;
};

type SignalFeedFilters = {
  category?: HmlCategory;
  confidence?: SourceConfidence;
  hml?: HmlValue;
  q?: string;
};

function parseEnum<T extends string>(value: string | undefined, allowed: Set<T>) {
  return value && allowed.has(value as T) ? (value as T) : undefined;
}

export function parseSignalFeedFilters(
  searchParams: SignalFeedSearchParams,
): SignalFeedFilters {
  return {
    category: parseEnum(searchParams.category, categoryValues),
    confidence: parseEnum(searchParams.confidence, confidenceValues),
    hml: parseEnum(searchParams.hml, hmlValues),
    q: searchParams.q?.trim() || undefined,
  };
}

function classificationWhere(filters: SignalFeedFilters) {
  const clauses: object[] = [visibleClassificationWhere];

  if (filters.category) {
    clauses.push({
      category: filters.category,
    });
  }

  if (filters.confidence) {
    clauses.push({
      confidence: filters.confidence,
    });
  }

  if (filters.hml) {
    clauses.push({
      classification: filters.hml,
    });
  }

  return {
    AND: clauses,
  };
}

function matchesSearch(
  signal: {
    account: { companyName: string } | null;
    contributingSignals: string[];
    explanation: string;
    recommendedNextAction: string;
  },
  q: string | undefined,
) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [
    signal.account?.companyName,
    signal.explanation,
    signal.recommendedNextAction,
    ...signal.contributingSignals,
  ]
    .filter(Boolean)
    .some((value) => value!.toLowerCase().includes(needle));
}

export async function getSignalFeedData(filters: SignalFeedFilters) {
  if (!hasDatabaseEnv()) {
    return {
      counts: emptyHmlCounts(),
      databaseReady: false,
      error: "Signal records cannot be loaded from this environment.",
      filters,
      limit: SIGNAL_LIMIT,
      signals: [],
      total: 0,
    };
  }

  try {
    const prisma = getPrisma();
    const records = await prisma.hmlClassification.findMany({
      include: {
        account: {
          select: {
            city: true,
            companyName: true,
            id: true,
            permissionState: true,
            sourceConfidence: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: SIGNAL_LIMIT,
      where: classificationWhere(filters),
    });
    const signals = records.filter((signal) => matchesSearch(signal, filters.q));
    const counts = emptyHmlCounts();

    signals.forEach((signal) => {
      counts[signal.classification] += 1;
    });

    return {
      counts,
      databaseReady: true,
      error: null,
      filters,
      limit: SIGNAL_LIMIT,
      signals,
      total: signals.length,
    };
  } catch (error) {
    console.error("Signal Feed load failed", error);

    return {
      counts: emptyHmlCounts(),
      databaseReady: false,
      error: "Signal records cannot be loaded right now.",
      filters,
      limit: SIGNAL_LIMIT,
      signals: [],
      total: 0,
    };
  }
}
