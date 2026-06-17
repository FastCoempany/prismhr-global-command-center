import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import {
  BoundaryRuleStatus,
  BoundaryRuleType,
  BoundarySeverity,
  FollowUpPromiseStatus,
  HmlCategory,
  HmlValue,
  InternalUnknownStatus,
  OpportunityStage,
  PermissionState,
  SourceConfidence,
  UnknownCategory,
} from "@/generated/prisma/client";

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
  categories?: Partial<
    Record<
      string,
      {
        recommended_actions?: Partial<Record<"High" | "Medium" | "Low", string>>;
      }
    >
  >;
  version?: string;
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

export type HmlClassificationDraft = {
  category: HmlCategory;
  classification: HmlValue;
  confidence: SourceConfidence;
  contributingSignals: string[];
  explanation: string;
  recommendedNextAction: string;
  ruleVersion: string;
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
let cachedConfig: HmlRulesConfig | undefined;

function readRulesConfig() {
  if (cachedConfig) return cachedConfig;

  const rulesPath = path.join(process.cwd(), "config", "hml-rules.yaml");
  cachedConfig = YAML.parse(fs.readFileSync(rulesPath, "utf8")) as HmlRulesConfig;
  return cachedConfig;
}

function readProspectFieldRules() {
  if (cachedRules) return cachedRules;

  const parsed = readRulesConfig();
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

function titleValue(value: HmlValue): "High" | "Medium" | "Low" {
  if (value === HmlValue.HIGH) return "High";
  if (value === HmlValue.MEDIUM) return "Medium";
  return "Low";
}

function categoryKey(category: HmlCategory) {
  const keys: Record<HmlCategory, string> = {
    [HmlCategory.BOUNDARY_RISK]: "boundary_off_limits_risk",
    [HmlCategory.CSM_RELATIONSHIP_HEAT]: "csm_relationship_heat",
    [HmlCategory.FOLLOW_UP_URGENCY]: "follow_up_urgency",
    [HmlCategory.INTERNAL_AMBIGUITY]: "internal_ambiguity_risk",
    [HmlCategory.OPPORTUNITY_MOMENTUM]: "opportunity_momentum",
    [HmlCategory.PEO_PROTECTIVENESS]: "peo_protectiveness_caution",
    [HmlCategory.PEO_READINESS]: "peo_readiness",
    [HmlCategory.SOURCE_CONFIDENCE]: "source_confidence",
    [HmlCategory.TERRITORY_ACCOUNT_POTENTIAL]: "territory_account_potential",
  };

  return keys[category];
}

function ruleVersion(suffix: string) {
  return `${readRulesConfig().version ?? "v0.1"}-${suffix}`;
}

function recommendedAction(
  category: HmlCategory,
  classification: HmlValue,
  fallback: string,
) {
  return (
    readRulesConfig().categories?.[categoryKey(category)]?.recommended_actions?.[
      titleValue(classification)
    ] ?? fallback
  );
}

function riskyPermission(permissionState: PermissionState) {
  const permissions: PermissionState[] = [
    PermissionState.CSM_CONTEXT_NEEDED,
    PermissionState.DIRECT_CONTACT_NOT_ALLOWED,
    PermissionState.HOLD_SENSITIVE,
    PermissionState.OFF_LIMITS,
    PermissionState.OWNERSHIP_UNCLEAR_REQUIRES_VERIFICATION,
    PermissionState.RESEARCH_ONLY,
  ];

  return permissions.includes(permissionState);
}

function approvedPermission(permissionState: PermissionState) {
  const permissions: PermissionState[] = [
    PermissionState.CSM_APPROVED_FOR_DISCUSSION,
    PermissionState.CSM_APPROVED_FOR_INTRO,
    PermissionState.PEO_ENGAGED,
    PermissionState.PEO_CLIENT_ENGAGED,
  ];

  return permissions.includes(permissionState);
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

export function classifyCsmRelationship(input: {
  nextSafestAction: string;
  permissionState: PermissionState;
  protectivenessLevel: HmlValue;
  relationshipHeat: HmlValue;
  sourceConfidence: SourceConfidence;
}): HmlClassificationDraft {
  let classification: HmlValue = input.relationshipHeat;

  if (
    input.protectivenessLevel === HmlValue.HIGH &&
    !approvedPermission(input.permissionState)
  ) {
    classification = HmlValue.LOW;
  } else if (
    input.relationshipHeat === HmlValue.HIGH &&
    approvedPermission(input.permissionState)
  ) {
    classification = HmlValue.HIGH;
  }

  return {
    category: HmlCategory.CSM_RELATIONSHIP_HEAT,
    classification,
    confidence: input.sourceConfidence,
    contributingSignals: [
      `relationship_heat:${input.relationshipHeat}`,
      `protectiveness:${input.protectivenessLevel}`,
      `permission:${input.permissionState}`,
    ],
    explanation: `${classification} relationship heat under ${ruleVersion("csm-relationship-heat")}: ${label(input.relationshipHeat)} heat, ${label(input.protectivenessLevel)} protectiveness, and ${label(input.permissionState)} permission.`,
    recommendedNextAction: recommendedAction(
      HmlCategory.CSM_RELATIONSHIP_HEAT,
      classification,
      input.nextSafestAction,
    ),
    ruleVersion: ruleVersion("csm-relationship-heat"),
  };
}

export function classifyPeoReadiness(input: {
  boundaryRisk: HmlValue;
  nextSafestAction: string;
  permissionState: PermissionState;
  readinessLevel: HmlValue;
  sourceConfidence: SourceConfidence;
}): HmlClassificationDraft {
  let classification: HmlValue = input.readinessLevel;

  if (riskyPermission(input.permissionState) || input.boundaryRisk === HmlValue.HIGH) {
    classification = HmlValue.LOW;
  } else if (input.readinessLevel === HmlValue.HIGH) {
    classification = HmlValue.HIGH;
  }

  return {
    category: HmlCategory.PEO_READINESS,
    classification,
    confidence: input.sourceConfidence,
    contributingSignals: [
      `readiness:${input.readinessLevel}`,
      `boundary:${input.boundaryRisk}`,
      `permission:${input.permissionState}`,
    ],
    explanation: `${classification} PEO readiness under ${ruleVersion("peo-readiness")}: ${label(input.readinessLevel)} readiness, ${label(input.boundaryRisk)} boundary risk, and ${label(input.permissionState)} permission.`,
    recommendedNextAction: recommendedAction(
      HmlCategory.PEO_READINESS,
      classification,
      input.nextSafestAction,
    ),
    ruleVersion: ruleVersion("peo-readiness"),
  };
}

export function classifyPeoProtectiveness(input: {
  boundaryRisk: HmlValue;
  nextSafestAction: string;
  permissionState: PermissionState;
  protectivenessLevel: HmlValue;
  sourceConfidence: SourceConfidence;
}): HmlClassificationDraft {
  let classification: HmlValue = input.protectivenessLevel;
  const sensitivePermissions: PermissionState[] = [
    PermissionState.DIRECT_CONTACT_NOT_ALLOWED,
    PermissionState.HOLD_SENSITIVE,
    PermissionState.OFF_LIMITS,
  ];

  if (
    input.boundaryRisk === HmlValue.HIGH ||
    sensitivePermissions.includes(input.permissionState)
  ) {
    classification = HmlValue.HIGH;
  }

  return {
    category: HmlCategory.PEO_PROTECTIVENESS,
    classification,
    confidence: input.sourceConfidence,
    contributingSignals: [
      `protectiveness:${input.protectivenessLevel}`,
      `boundary:${input.boundaryRisk}`,
      `permission:${input.permissionState}`,
    ],
    explanation: `${classification} PEO protectiveness under ${ruleVersion("peo-protectiveness")}: ${label(input.protectivenessLevel)} protectiveness, ${label(input.boundaryRisk)} boundary risk, and ${label(input.permissionState)} permission.`,
    recommendedNextAction: recommendedAction(
      HmlCategory.PEO_PROTECTIVENESS,
      classification,
      input.nextSafestAction,
    ),
    ruleVersion: ruleVersion("peo-protectiveness"),
  };
}

export function classifyOpportunityMomentum(input: {
  followUpDueAt?: Date | null;
  momentumLevel: HmlValue;
  nextStep: string;
  permissionState: PermissionState;
  riskFlags: string[];
  sourceConfidence: SourceConfidence;
  stage: OpportunityStage;
}): HmlClassificationDraft {
  const dueInDays = input.followUpDueAt
    ? Math.ceil((input.followUpDueAt.getTime() - Date.now()) / 86_400_000)
    : null;
  const activeStages: OpportunityStage[] = [
    OpportunityStage.ACTIVE_DISCOVERY,
    OpportunityStage.INTRO_READY,
    OpportunityStage.MEETING_BOOKED,
  ];
  const parkedStages: OpportunityStage[] = [
    OpportunityStage.CLOSED_LOST,
    OpportunityStage.PARKED,
    OpportunityStage.RESEARCH,
  ];
  const activeStage = activeStages.includes(input.stage);
  const parkedStage = parkedStages.includes(input.stage);
  let classification: HmlValue = input.momentumLevel;

  if (activeStage || (dueInDays !== null && dueInDays <= 1)) {
    classification = HmlValue.HIGH;
  } else if (parkedStage || input.riskFlags.length > 0) {
    classification = HmlValue.LOW;
  }

  if (riskyPermission(input.permissionState) && classification === HmlValue.HIGH) {
    classification = HmlValue.MEDIUM;
  }

  return {
    category: HmlCategory.OPPORTUNITY_MOMENTUM,
    classification,
    confidence: input.sourceConfidence,
    contributingSignals: [
      `stage:${input.stage}`,
      `momentum:${input.momentumLevel}`,
      `permission:${input.permissionState}`,
      `due_in_days:${dueInDays ?? "none"}`,
      `risk_flags:${input.riskFlags.length}`,
    ],
    explanation: `${classification} opportunity momentum under ${ruleVersion("opportunity-momentum")}: ${label(input.stage)} stage, ${dueInDays ?? "no"} day due window, ${input.riskFlags.length} risk flag(s), and ${label(input.permissionState)} permission.`,
    recommendedNextAction: recommendedAction(
      HmlCategory.OPPORTUNITY_MOMENTUM,
      classification,
      input.nextStep,
    ),
    ruleVersion: ruleVersion("opportunity-momentum"),
  };
}

export function classifyFollowUpUrgency(input: {
  dueAt: Date;
  madeTo: string;
  sourceConfidence: SourceConfidence;
  status?: FollowUpPromiseStatus;
}): HmlClassificationDraft {
  const dueInDays = Math.ceil((input.dueAt.getTime() - Date.now()) / 86_400_000);
  const overdue = dueInDays < 0;
  let classification: HmlValue = HmlValue.LOW;

  if (input.status && input.status !== FollowUpPromiseStatus.OPEN) {
    classification = HmlValue.LOW;
  } else if (overdue || dueInDays <= 1) {
    classification = HmlValue.HIGH;
  } else if (dueInDays <= 7) {
    classification = HmlValue.MEDIUM;
  }

  return {
    category: HmlCategory.FOLLOW_UP_URGENCY,
    classification,
    confidence: input.sourceConfidence,
    contributingSignals: [
      `due_in_days:${dueInDays}`,
      `overdue:${overdue}`,
      `made_to:${input.madeTo}`,
      `status:${input.status ?? FollowUpPromiseStatus.OPEN}`,
    ],
    explanation: `${classification} follow-up urgency under ${ruleVersion("follow-up-urgency")}: due in ${dueInDays} day(s), overdue ${overdue ? "yes" : "no"}, made to ${input.madeTo}.`,
    recommendedNextAction: recommendedAction(
      HmlCategory.FOLLOW_UP_URGENCY,
      classification,
      "Handle or schedule the promise.",
    ),
    ruleVersion: ruleVersion("follow-up-urgency"),
  };
}

export function classifyBoundaryRisk(input: {
  allowedAlternative?: string | null;
  ruleType: BoundaryRuleType;
  scopeType: string;
  severity: BoundarySeverity;
  sourceConfidence: SourceConfidence;
  status: BoundaryRuleStatus;
  title: string;
}): HmlClassificationDraft {
  let classification: HmlValue = HmlValue.LOW;

  if (input.status === BoundaryRuleStatus.ACTIVE) {
    if (
      input.severity === BoundarySeverity.BLOCKED ||
      input.ruleType === BoundaryRuleType.OFF_LIMITS
    ) {
      classification = HmlValue.HIGH;
    } else if (input.severity === BoundarySeverity.APPROVAL_REQUIRED) {
      classification = HmlValue.MEDIUM;
    }
  }

  return {
    category: HmlCategory.BOUNDARY_RISK,
    classification,
    confidence: input.sourceConfidence,
    contributingSignals: [
      `rule:${input.ruleType}`,
      `scope:${input.scopeType}`,
      `severity:${input.severity}`,
      `status:${input.status}`,
    ],
    explanation: `${classification} boundary risk under ${ruleVersion("boundary-risk")}: ${label(input.ruleType)} is ${label(input.status)} at ${label(input.severity)} severity: ${input.title}.`,
    recommendedNextAction: recommendedAction(
      HmlCategory.BOUNDARY_RISK,
      classification,
      input.allowedAlternative ?? "Resolve the boundary before motion.",
    ),
    ruleVersion: ruleVersion("boundary-risk"),
  };
}

export function classifyInternalAmbiguity(input: {
  blocksImplementation: boolean;
  category: UnknownCategory;
  confidence: SourceConfidence;
  question: string;
  riskLevel: HmlValue;
  status: InternalUnknownStatus;
}): HmlClassificationDraft {
  const open = input.status === InternalUnknownStatus.OPEN;
  const sensitiveCategories: UnknownCategory[] = [
    UnknownCategory.DATA_VISIBILITY,
    UnknownCategory.PERMISSION,
    UnknownCategory.PRICING_LEGAL,
    UnknownCategory.SCHEMA,
  ];
  const sensitiveDomain = sensitiveCategories.includes(input.category);
  let classification: HmlValue = HmlValue.LOW;

  if (
    open &&
    (input.blocksImplementation || sensitiveDomain || input.riskLevel === HmlValue.HIGH)
  ) {
    classification = HmlValue.HIGH;
  } else if (open) {
    classification = HmlValue.MEDIUM;
  }

  return {
    category: HmlCategory.INTERNAL_AMBIGUITY,
    classification,
    confidence: input.confidence,
    contributingSignals: [
      `unknown_category:${input.category}`,
      `blocks_implementation:${input.blocksImplementation}`,
      `risk:${input.riskLevel}`,
      `status:${input.status}`,
    ],
    explanation: `${classification} internal ambiguity under ${ruleVersion("internal-ambiguity")}: ${label(input.category)} unknown, risk ${label(input.riskLevel)}, blocking ${input.blocksImplementation ? "yes" : "no"}.`,
    recommendedNextAction: recommendedAction(
      HmlCategory.INTERNAL_AMBIGUITY,
      classification,
      input.question,
    ),
    ruleVersion: ruleVersion("internal-ambiguity"),
  };
}
