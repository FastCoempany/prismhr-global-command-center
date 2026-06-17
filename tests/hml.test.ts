import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  BoundaryRuleStatus,
  BoundaryRuleType,
  BoundarySeverity,
  HmlCategory,
  HmlValue,
  InternalUnknownStatus,
  OpportunityStage,
  PermissionState,
  SourceConfidence,
  UnknownCategory,
} from "@/generated/prisma/client";
import {
  classifyBoundaryRisk,
  classifyInternalAmbiguity,
  classifyOpportunityMomentum,
  classifyPeoReadiness,
  classifyProspectField,
} from "@/lib/hml";

describe("HML prospect field rules", () => {
  test("promotes sourced high qualification signals when boundary risk is not high", () => {
    const result = classifyProspectField({
      boundaryRisk: HmlValue.LOW,
      channelSignal: HmlValue.MEDIUM,
      complexitySignal: HmlValue.HIGH,
      contractorSignal: HmlValue.HIGH,
      hiringSignal: HmlValue.MEDIUM,
      internationalSignal: HmlValue.LOW,
      sourceConfidence: SourceConfidence.STRONG,
    });

    assert.equal(result.classification, HmlValue.HIGH);
    assert.equal(result.recommendedNextAction, "Identify safe channel path before motion.");
    assert.match(result.explanation, /2 high qualification signal/);
  });

  test("does not promote weakly sourced records to high priority", () => {
    const result = classifyProspectField({
      boundaryRisk: HmlValue.LOW,
      channelSignal: HmlValue.HIGH,
      complexitySignal: HmlValue.HIGH,
      contractorSignal: HmlValue.HIGH,
      hiringSignal: HmlValue.MEDIUM,
      internationalSignal: HmlValue.MEDIUM,
      sourceConfidence: SourceConfidence.HYPOTHESIS,
    });

    assert.equal(result.classification, HmlValue.MEDIUM);
  });

  test("parks all-low qualification signals as low priority", () => {
    const result = classifyProspectField({
      boundaryRisk: HmlValue.LOW,
      channelSignal: HmlValue.LOW,
      complexitySignal: HmlValue.LOW,
      contractorSignal: HmlValue.LOW,
      hiringSignal: HmlValue.LOW,
      internationalSignal: HmlValue.LOW,
      sourceConfidence: SourceConfidence.CONFIRMED,
    });

    assert.equal(result.classification, HmlValue.LOW);
  });

  test("blocks high priority when boundary risk is high", () => {
    const result = classifyProspectField({
      boundaryRisk: HmlValue.HIGH,
      channelSignal: HmlValue.HIGH,
      complexitySignal: HmlValue.HIGH,
      contractorSignal: HmlValue.HIGH,
      hiringSignal: HmlValue.HIGH,
      internationalSignal: HmlValue.HIGH,
      sourceConfidence: SourceConfidence.CONFIRMED,
    });

    assert.equal(result.classification, HmlValue.MEDIUM);
  });
});

describe("HML permission and boundary gates", () => {
  test("downgrades PEO readiness when permission is research only", () => {
    const result = classifyPeoReadiness({
      boundaryRisk: HmlValue.LOW,
      nextSafestAction: "Ask for CSM context.",
      permissionState: PermissionState.RESEARCH_ONLY,
      readinessLevel: HmlValue.HIGH,
      sourceConfidence: SourceConfidence.STRONG,
    });

    assert.equal(result.category, HmlCategory.PEO_READINESS);
    assert.equal(result.classification, HmlValue.LOW);
  });

  test("keeps active opportunity momentum from becoming high when permission is risky", () => {
    const result = classifyOpportunityMomentum({
      momentumLevel: HmlValue.HIGH,
      nextStep: "Confirm the relationship-safe path.",
      permissionState: PermissionState.CSM_CONTEXT_NEEDED,
      riskFlags: [],
      sourceConfidence: SourceConfidence.STRONG,
      stage: OpportunityStage.MEETING_BOOKED,
    });

    assert.equal(result.category, HmlCategory.OPPORTUNITY_MOMENTUM);
    assert.equal(result.classification, HmlValue.MEDIUM);
  });

  test("raises active off-limits boundary rules as high risk", () => {
    const result = classifyBoundaryRisk({
      ruleType: BoundaryRuleType.OFF_LIMITS,
      scopeType: "PEO",
      severity: BoundarySeverity.BLOCKED,
      sourceConfidence: SourceConfidence.CONFIRMED,
      status: BoundaryRuleStatus.ACTIVE,
      title: "Do not move until CSM clears it.",
    });

    assert.equal(result.category, HmlCategory.BOUNDARY_RISK);
    assert.equal(result.classification, HmlValue.HIGH);
  });
});

describe("HML internal ambiguity rules", () => {
  test("raises blocking internal unknowns as high priority", () => {
    const result = classifyInternalAmbiguity({
      blocksImplementation: true,
      category: UnknownCategory.SCHEMA,
      confidence: SourceConfidence.MEDIUM,
      question: "Which record owns the permission state?",
      riskLevel: HmlValue.MEDIUM,
      status: InternalUnknownStatus.OPEN,
    });

    assert.equal(result.category, HmlCategory.INTERNAL_AMBIGUITY);
    assert.equal(result.classification, HmlValue.HIGH);
  });

  test("keeps decided unknowns low even if the former domain was sensitive", () => {
    const result = classifyInternalAmbiguity({
      blocksImplementation: false,
      category: UnknownCategory.PERMISSION,
      confidence: SourceConfidence.CONFIRMED,
      question: "Decided permission policy.",
      riskLevel: HmlValue.HIGH,
      status: InternalUnknownStatus.DECIDED,
    });

    assert.equal(result.classification, HmlValue.LOW);
  });
});
