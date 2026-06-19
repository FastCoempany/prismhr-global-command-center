import { HmlValue, PermissionState, SourceConfidence } from "@/generated/prisma/client";
import { readHmlRulesConfig } from "@/lib/hml-rules-config";

export type ProspectScoringInput = {
  boundaryRisk: HmlValue;
  channelSignal: HmlValue;
  complexitySignal: HmlValue;
  contractorSignal: HmlValue;
  hiringSignal: HmlValue;
  internationalSignal: HmlValue;
  permissionState: PermissionState;
  sourceConfidence: SourceConfidence;
};

export type ProspectScore = {
  boundarySafetyScore: number;
  evidenceScore: number;
  motionGate: "open" | "channel_only" | "blocked";
  motionGateLabel: string;
  qualificationScore: number;
  researchScore: number;
  scoreVersion: string;
};

type QualificationSignalKey =
  | "channelSignal"
  | "complexitySignal"
  | "contractorSignal"
  | "hiringSignal"
  | "internationalSignal";

type ProspectResearchScoreRules = {
  boundarySafetyScores: Record<HmlValue, number>;
  permissionStateScores: Record<PermissionState, number>;
  qualificationWeights: Record<QualificationSignalKey, number>;
  scoreVersion: string;
  signalFactors: Record<HmlValue, number>;
  sourceConfidenceScores: Record<SourceConfidence, number>;
};

type ProspectResearchScoreConfig = {
  boundary_safety_scores?: Partial<Record<HmlValue, number>>;
  permission_state_scores?: Partial<Record<PermissionState, number>>;
  qualification_weights?: Partial<Record<QualificationSignalKey, number>>;
  score_version?: string;
  signal_factors?: Partial<Record<HmlValue, number>>;
  source_confidence_scores?: Partial<Record<SourceConfidence, number>>;
};

type HmlRulesConfig = {
  app_scoring?: {
    prospect_field?: {
      research_score?: ProspectResearchScoreConfig;
    };
  };
};

const fallbackRules: ProspectResearchScoreRules = {
  boundarySafetyScores: {
    HIGH: 0,
    MEDIUM: 4,
    LOW: 8,
  },
  permissionStateScores: {
    RESEARCH_ONLY: 5,
    CSM_CONTEXT_NEEDED: 5,
    CSM_APPROVED_FOR_DISCUSSION: 10,
    CSM_APPROVED_FOR_INTRO: 10,
    PEO_ENGAGED: 10,
    PEO_CLIENT_ENGAGED: 10,
    DIRECT_CONTACT_ALLOWED: 10,
    DIRECT_CONTACT_NOT_ALLOWED: 5,
    HOLD_SENSITIVE: 0,
    OFF_LIMITS: 0,
    OWNERSHIP_UNCLEAR_REQUIRES_VERIFICATION: 5,
  },
  qualificationWeights: {
    channelSignal: 12,
    complexitySignal: 16,
    contractorSignal: 14,
    hiringSignal: 12,
    internationalSignal: 16,
  },
  scoreVersion: "v0.2-prospect-score",
  signalFactors: {
    HIGH: 1,
    MEDIUM: 0.55,
    LOW: 0,
  },
  sourceConfidenceScores: {
    CONFIRMED: 12,
    STRONG: 11,
    MEDIUM: 8,
    INFERRED: 7,
    LOW: 4,
    UNVERIFIED: 2,
    HYPOTHESIS: 0,
  },
};

const qualificationSignalKeys: QualificationSignalKey[] = [
  "channelSignal",
  "complexitySignal",
  "contractorSignal",
  "hiringSignal",
  "internationalSignal",
];

let cachedRules: ProspectResearchScoreRules | undefined;

function readProspectResearchScoreRules() {
  if (cachedRules) return cachedRules;

  const parsed = readHmlRulesConfig<HmlRulesConfig>();
  const configured = parsed.app_scoring?.prospect_field?.research_score ?? {};

  cachedRules = {
    boundarySafetyScores: {
      ...fallbackRules.boundarySafetyScores,
      ...configured.boundary_safety_scores,
    },
    permissionStateScores: {
      ...fallbackRules.permissionStateScores,
      ...configured.permission_state_scores,
    },
    qualificationWeights: {
      ...fallbackRules.qualificationWeights,
      ...configured.qualification_weights,
    },
    scoreVersion: configured.score_version ?? fallbackRules.scoreVersion,
    signalFactors: {
      ...fallbackRules.signalFactors,
      ...configured.signal_factors,
    },
    sourceConfidenceScores: {
      ...fallbackRules.sourceConfidenceScores,
      ...configured.source_confidence_scores,
    },
  };

  return cachedRules;
}

function scoreSignal(
  value: HmlValue,
  weight: number,
  signalFactors: Record<HmlValue, number>,
) {
  return Math.round((signalFactors[value] ?? 0) * weight);
}

export function prospectMotionGate(
  input: Pick<ProspectScoringInput, "boundaryRisk" | "permissionState">,
) {
  if (
    input.permissionState === PermissionState.OFF_LIMITS ||
    input.permissionState === PermissionState.HOLD_SENSITIVE ||
    input.boundaryRisk === HmlValue.HIGH
  ) {
    return {
      motionGate: "blocked" as const,
      motionGateLabel: "Blocked until boundary clears",
    };
  }

  if (
    input.permissionState === PermissionState.CSM_CONTEXT_NEEDED ||
    input.permissionState === PermissionState.DIRECT_CONTACT_NOT_ALLOWED ||
    input.permissionState === PermissionState.OWNERSHIP_UNCLEAR_REQUIRES_VERIFICATION ||
    input.permissionState === PermissionState.RESEARCH_ONLY
  ) {
    return {
      motionGate: "channel_only" as const,
      motionGateLabel: "Channel path needed",
    };
  }

  return {
    motionGate: "open" as const,
    motionGateLabel: "Permission path open",
  };
}

export function scoreProspectField(input: ProspectScoringInput): ProspectScore {
  const rules = readProspectResearchScoreRules();
  const qualificationScore = qualificationSignalKeys.reduce(
    (total, key) =>
      total +
      scoreSignal(input[key], rules.qualificationWeights[key], rules.signalFactors),
    0,
  );
  const safetyScore = rules.boundarySafetyScores[input.boundaryRisk];
  const sourceScore = rules.sourceConfidenceScores[input.sourceConfidence];
  const postureScore = rules.permissionStateScores[input.permissionState];
  const gate = prospectMotionGate(input);

  return {
    boundarySafetyScore: safetyScore,
    evidenceScore: sourceScore,
    motionGate: gate.motionGate,
    motionGateLabel: gate.motionGateLabel,
    qualificationScore,
    researchScore: qualificationScore + safetyScore + sourceScore + postureScore,
    scoreVersion: rules.scoreVersion,
  };
}
