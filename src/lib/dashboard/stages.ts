// The dashboard's node model. Hand-sewn moonshot board: node states are set by
// checking off each stage's mandatory items (all checked → the node lights up),
// with a direct node-click as a manual override. Nothing here derives from
// PeoState / the book / research — it's the owner's canvas.
//
// The checklist items encode Antaeus's actual motion as a Senior Global Business
// Consultant at PrismHR Global: a PARTNER-first, channel-gated sell. Partners
// (CSMs, HCM enterprise sales like Eric, etc.) own the account relationship and
// bring the PEO/ASO/HRaaS onto the platform; Antaeus is handed the client for
// the Global product (EOR / global payroll / contractor management). So the
// gates are about clearing the partner, understanding current cross-border
// state, matching a product, and protecting the relationship — not generic
// pipeline stages.

export type DashNodeKey =
  | "interested"
  | "csm_seeded"
  | "discovery"
  | "use_case"
  | "demo"
  | "decision";

export type DashNode = {
  key: DashNodeKey;
  label: string;
  heat: string; // the node's "lit" color on the grey→green ramp
  checklist: string[]; // mandatory gates — all checked lights the node
};

export const DASH_NODES: DashNode[] = [
  {
    key: "interested",
    label: "Interested",
    heat: "#8593ab",
    checklist: [
      "Trigger identified — a real reason this account is in play (partner flag, inbound, or a global-hiring signal in their book)",
      "Owner partner confirmed — who holds the relationship (CSM / HCM enterprise sales / etc.)",
      "Fit reviewed in the Account Room — profile + demand signal, displacement vs greenfield",
    ],
  },
  {
    key: "csm_seeded",
    label: "Partner engaged & seeded",
    heat: "#e0a93a",
    checklist: [
      "Partner briefed on the Global angle for this specific account",
      "Cleared by the partner to engage the client (permission to approach)",
      "Stakeholders mapped — who else at the account/partner needs to be in the room",
      "Relationship guardrails noted — the partner's do's and don'ts",
    ],
  },
  {
    key: "discovery",
    label: "Discovery — how they operate today",
    heat: "#ef9a3d",
    checklist: [
      "Legal entities where they're hiring? (which countries — or none)",
      "How they pay those workers today (method + any current provider)",
      "Employees or independent contractors? (misclassification risk)",
      "Incumbent check — already on a competitor EOR (Deel / G-P / etc.)? displacement vs greenfield",
    ],
  },
  {
    key: "use_case",
    label: "Use case & options",
    heat: "#e6701e",
    checklist: [
      "Use case matched to a PrismHR Global product line — EOR / global payroll / contractor management",
      "Options framed for how they want to move forward (in-house vs current path, phased)",
      "Compliance / misclassification risk surfaced and quantified",
      "Rough scope drafted — countries, headcount, and the value it unlocks",
    ],
  },
  {
    key: "demo",
    label: "Demo",
    heat: "#6fae3e",
    checklist: [
      "Partner/CSM confirmed client availability within 5 business days",
      "Right attendees confirmed — decision-maker + the person feeling the pain",
      "Demo tailored to their countries and worker types",
      "Demo delivered + recap sent",
    ],
  },
  {
    key: "decision",
    label: "Decision",
    heat: "#1a7f3c",
    checklist: [
      "Decision criteria and timeline confirmed",
      "Proposal / pricing delivered",
      "Yes/no reached — if yes, close plan agreed; if no, reason logged",
      "Partner debriefed on the outcome (protect the relationship for the next one)",
    ],
  },
];

export const DASH_NODE_KEYS = DASH_NODES.map((n) => n.key);
export const LAST_NODE = DASH_NODES.length - 1;

export function nodeChecklist(key: DashNodeKey): string[] {
  return DASH_NODES.find((n) => n.key === key)?.checklist ?? [];
}

// Node lit states. "done" = all mandatory items checked (or manual override).
export type NodeState = "todo" | "active" | "done";

export const isNodeState = (v: unknown): v is NodeState =>
  v === "todo" || v === "active" || v === "done";

export const stateWord = (s: NodeState) =>
  s === "done" ? "Done" : s === "active" ? "In progress" : "Not started";

// Derive a node's lit state from its checkbox array.
export function stateFromChecks(checks: boolean[], itemCount: number): NodeState {
  if (itemCount > 0 && checks.length >= itemCount && checks.slice(0, itemCount).every(Boolean))
    return "done";
  if (checks.some(Boolean)) return "active";
  return "todo";
}
