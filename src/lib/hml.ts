import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { HmlValue, SourceConfidence } from "@/generated/prisma/client";

type ProspectFieldRules = {
  rule_version?: string;
  priority_signal_scores?: Partial<Record<HmlValue, number>>;
  weak_source_confidence?: SourceConfidence[];
  classification?: {
    high?: {
      min_high_fit_signals?: number;
      requires_non_weak_source?: boolean;
    };
    low?: {
      requires_all_fit_signals_low?: boolean;
    };
    fallback?: HmlValue;
  };
  recommended_actions?: Partial<Record<HmlValue, string>>;
};

type HmlRulesConfig = {
  app_scoring?: {
    prospect_field?: ProspectFieldRules;
  };
};

type ResolvedProspectFieldRules = {
  rule_version: string;
  priority_signal_scores: Record<HmlValue, number>;
  weak_source_confidence: SourceConfidence[];
  classification: {
    high: {
      min_high_fit_signals: number;
      requires_non_weak_source: boolean;
    };
    low: {
      requires_all_fit_signals_low: boolean;
    };
    fallback: HmlValue;
  };
  recommended_actions: Record<HmlValue, string>;
};

export type ProspectFieldSignalSet = {
  internationalSignal: HmlValue;
  contractorSignal: HmlValue;
  hiringSignal: HmlValue;
  complexitySignal: HmlValue;
  channelSignal: HmlValue;
  boundaryRisk: HmlValue;
  sourceConfidence: SourceConfidence;
};

const fallbackRules: ResolvedProspectFieldRules = {
  rule_version: "v0.1-prospect-field",
  priority_signal_scores: {
    HIGH: 20,
    MEDIUM: 10,
    LOW: 3,
  },
  weak_source_confidence: [
    SourceConfidence.LOW,
    SourceConfidence.UNVERIFIED,
    SourceConfidence.HYPOTHESIS,
  ],
  classification: {
    high: {
      min_high_fit_signals: 2,
      requires_non_weak_source: true,
    },
    low: {
      requires_all_fit_signals_low: true,
    },
    fallback: HmlValue.MEDIUM,
  },
  recommended_actions: {
    HIGH: "Identify safe channel path before outreach.",
    MEDIUM: "Research and watch for triggers.",
    LOW: "Park with review date.",
  },
};

let cachedRules: ResolvedProspectFieldRules | undefined;

function readProspectFieldRules() {
  if (cachedRules) return cachedRules;

  const rulesPath = path.join(process.cwd(), "config", "hml-rules.yaml");
  const parsed = YAML.parse(fs.readFileSync(rulesPath, "utf8")) as HmlRulesConfig;
  const configured = parsed.app_scoring?.prospect_field ?? {};

  cachedRules = {
    rule_version: configured.rule_version ?? fallbackRules.rule_version,
    priority_signal_scores: {
      ...fallbackRules.priority_signal_scores,
      ...configured.priority_signal_scores,
    },
    weak_source_confidence:
      configured.weak_source_confidence ?? fallbackRules.weak_source_confidence,
    classification: {
      high: {
        ...fallbackRules.classification.high,
        ...configured.classification?.high,
      },
      low: {
        ...fallbackRules.classification.low,
        ...configured.classification?.low,
      },
      fallback:
        configured.classification?.fallback ?? fallbackRules.classification.fallback,
    },
    recommended_actions: {
      ...fallbackRules.recommended_actions,
      ...configured.recommended_actions,
    },
  };

  return cachedRules;
}

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

export function classifyProspectField(signals: ProspectFieldSignalSet) {
  const rules = readProspectFieldRules();
  const fitSignals = [
    signals.internationalSignal,
    signals.contractorSignal,
    signals.hiringSignal,
    signals.complexitySignal,
    signals.channelSignal,
  ];
  const priorityScore = [...fitSignals, signals.boundaryRisk].reduce(
    (score, signal) => score + rules.priority_signal_scores[signal],
    0,
  );
  const highFitSignalCount = fitSignals.filter(
    (signal) => signal === HmlValue.HIGH,
  ).length;
  const allFitSignalsLow = fitSignals.every((signal) => signal === HmlValue.LOW);
  const weakSource = rules.weak_source_confidence.includes(signals.sourceConfidence);
  const highRules = rules.classification.high;
  const lowRules = rules.classification.low;

  let classification = rules.classification.fallback;

  if (
    highFitSignalCount >= highRules.min_high_fit_signals &&
    (!highRules.requires_non_weak_source || !weakSource) &&
    signals.boundaryRisk !== HmlValue.HIGH
  ) {
    classification = HmlValue.HIGH;
  } else if (lowRules.requires_all_fit_signals_low && allFitSignalsLow) {
    classification = HmlValue.LOW;
  }

  return {
    classification,
    contributingSignals: [
      `international:${signals.internationalSignal}`,
      `contractor:${signals.contractorSignal}`,
      `hiring:${signals.hiringSignal}`,
      `complexity:${signals.complexitySignal}`,
      `channel:${signals.channelSignal}`,
      `boundary_risk:${signals.boundaryRisk}`,
      `source_confidence:${signals.sourceConfidence}`,
    ],
    explanation: `${classification} priority under ${rules.rule_version}: ${highFitSignalCount} high qualification signal(s), ${label(signals.sourceConfidence)} source confidence, and ${label(signals.boundaryRisk)} boundary risk.`,
    priorityScore,
    recommendedNextAction: rules.recommended_actions[classification],
    ruleVersion: rules.rule_version,
  };
}
