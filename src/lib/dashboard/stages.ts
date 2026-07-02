// The dashboard's node model. This is a hand-sewn moonshot board: node states
// are set MANUALLY per card and stored in the isolated DashCard table. Nothing
// here derives from PeoState, the book, or any other part of the app.
// Node labels / heat colors / reference checklists are config — edit freely.

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
  checklist: string[]; // reference: the highest-level things that turn it green
};

export const DASH_NODES: DashNode[] = [
  {
    key: "interested",
    label: "Interested",
    heat: "#8593ab",
    checklist: [
      "Real trigger identified (PEO flag, inbound, or global-hiring signal)",
      "Right account confirmed — fit and international-hiring intent",
    ],
  },
  {
    key: "csm_seeded",
    label: "CSM engaged & seeded",
    heat: "#e0a93a",
    checklist: [
      "CSM briefed on the global-hiring angle",
      "Opportunity seeded — cleared to engage the client",
      "Stakeholders mapped — who else should be in the room",
    ],
  },
  {
    key: "discovery",
    label: "Discovery — how they operate today",
    heat: "#ef9a3d",
    checklist: [
      "Legal entities in the countries they're hiring in? (which ones)",
      "How are they paying those workers today?",
      "Classified as employees or independent contractors?",
    ],
  },
  {
    key: "use_case",
    label: "Use case & options",
    heat: "#e6701e",
    checklist: [
      "Use case matched to a PrismHR path — EOR, contractor management, or global payroll",
      "Options framed for how they want to move forward",
      "Compliance / misclassification risk flagged",
    ],
  },
  {
    key: "demo",
    label: "Demo",
    heat: "#6fae3e",
    checklist: [
      "CSM confirmed client availability within 5 business days",
      "Intro call scheduled",
      "Demo scheduled / delivered",
    ],
  },
  {
    key: "decision",
    label: "Decision",
    heat: "#1a7f3c",
    checklist: [
      "Yes / no decision reached",
      "If yes — next step to close agreed; if no — reason logged",
    ],
  },
];

export const DASH_NODE_KEYS = DASH_NODES.map((n) => n.key);
export const LAST_NODE = DASH_NODES.length - 1;

// Manual states you paint onto each node.
export type NodeState = "todo" | "active" | "done" | "action";

const NODE_STATES: { key: NodeState; label: string }[] = [
  { key: "todo", label: "Not started" },
  { key: "active", label: "In progress" },
  { key: "done", label: "Done" },
  { key: "action", label: "Needs you" },
];

export const isNodeState = (v: unknown): v is NodeState =>
  typeof v === "string" && NODE_STATES.some((s) => s.key === v);

export const stateWord = (s: NodeState) =>
  NODE_STATES.find((x) => x.key === s)?.label ?? s;
