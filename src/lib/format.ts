export function humanizeEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const contributingSignalLabels: Record<string, string> = {
  blocks_implementation: "Blocks implementation",
  boundary: "Boundary risk",
  boundary_risk: "Boundary risk",
  complexity: "Compliance complexity",
  contractor: "Contractor intensity",
  daily_serve: "Daily Serve",
  daily_serve_category: "Daily Serve category",
  daily_serve_outcome: "Daily Serve outcome",
  daily_serve_status: "Daily Serve status",
  due_in_days: "Due window",
  hiring: "Hiring velocity",
  international: "International activity",
  made_to: "Promise made to",
  motion_gate: "Safe motion",
  opportunity_impact: "Opportunity impact",
  overdue: "Overdue",
  permission: "Permission posture",
  protectiveness: "Protectiveness",
  qualification_score: "Qualification score",
  readiness: "Readiness",
  relationship_heat: "Relationship heat",
  research_score: "Research score",
  risk: "Risk",
  risk_flags: "Risk flags",
  rule: "Boundary rule",
  scope: "Scope",
  severity: "Severity",
  source_confidence: "Source confidence",
  stage: "Stage",
  status: "Status",
  unknown_category: "Unknown category",
};

const contributingSignalValues: Record<string, string> = {
  blocked: "Blocked until boundary clears",
  channel_only: "Channel path needed",
  false: "No",
  none: "None",
  open: "Permission path open",
  true: "Yes",
};

function humanizeSignalValue(value: string) {
  return contributingSignalValues[value] ?? humanizeEnum(value);
}

export function formatContributingSignal(signal: string) {
  const separatorIndex = signal.indexOf(":");

  if (separatorIndex === -1) {
    return humanizeEnum(signal);
  }

  const key = signal.slice(0, separatorIndex);
  const value = signal.slice(separatorIndex + 1);
  const label = contributingSignalLabels[key] ?? humanizeEnum(key);

  return `${label}: ${humanizeSignalValue(value)}`;
}
