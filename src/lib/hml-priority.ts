import { HmlCategory, HmlValue, SourceConfidence } from "@/generated/prisma/client";

export type HmlPriorityItem = {
  category: HmlCategory;
  classification: HmlValue;
  confidence: SourceConfidence;
  explanation: string;
  href?: string;
  id: string;
  label: string;
  recommendedNextAction: string;
};

export type HmlPrioritySummary = {
  counts: Record<HmlValue, number>;
  items: HmlPriorityItem[];
  total: number;
};

type AccountWithLatestHml = {
  companyName: string;
  hmlClassifications: Array<{
    category: HmlCategory;
    classification: HmlValue;
    confidence: SourceConfidence;
    explanation: string;
    id: string;
    recommendedNextAction: string;
  }>;
  id: string;
};

export function emptyHmlCounts(): Record<HmlValue, number> {
  return {
    [HmlValue.HIGH]: 0,
    [HmlValue.MEDIUM]: 0,
    [HmlValue.LOW]: 0,
  };
}

export function hmlTone(value: HmlValue): "high" | "medium" | "low" {
  if (value === HmlValue.HIGH) return "high";
  if (value === HmlValue.MEDIUM) return "medium";
  return "low";
}

export function buildHmlSummaryFromAccounts(
  accounts: AccountWithLatestHml[],
): HmlPrioritySummary {
  const counts = emptyHmlCounts();
  const items: HmlPriorityItem[] = [];

  accounts.forEach((account) => {
    const latest = account.hmlClassifications[0];
    if (!latest) return;

    counts[latest.classification] += 1;

    items.push({
      category: latest.category,
      classification: latest.classification,
      confidence: latest.confidence,
      explanation: latest.explanation,
      href: `/prospect-field#account-${account.id}`,
      id: latest.id,
      label: account.companyName,
      recommendedNextAction: latest.recommendedNextAction,
    });
  });

  return {
    counts,
    items,
    total: items.length,
  };
}
