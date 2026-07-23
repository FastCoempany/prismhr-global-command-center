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

// Stage keys mirror the REAL Salesforce opportunity stages for the
// "Service Provider Opportunity" record type (per Antaeus's org, 7/2026):
// Investigate → First Time Meeting → Needs Analysis → Demo → Executive
// Summary → Proposal → Contract. Terminal SF stages (Closed Won/Lost/Void,
// On Hold) aren't board columns — archive covers them. The checklists keep
// the partner-first motion; keys keep the board 1:1 with SF for the
// pre-filled New Opportunity links.
export type DashNodeKey =
  | "investigate"
  | "first_meeting"
  | "needs_analysis"
  | "demo"
  | "exec_summary"
  | "proposal"
  | "contract";

export type DashNode = {
  key: DashNodeKey;
  label: string;
  heat: string; // the node's "lit" color on the grey→green ramp
  checklist: string[]; // mandatory gates — all checked lights the node
};

export const DASH_NODES: DashNode[] = [
  {
    key: "investigate",
    label: "Investigate",
    heat: "#8593ab",
    checklist: [
      "Trigger identified — a real reason this account is in play (partner flag, inbound, or a global-hiring signal in their book)",
      "Owner partner confirmed — who holds the relationship (CSM / HCM enterprise sales / etc.)",
      "Fit reviewed in the Account Room — profile + demand signal, displacement vs greenfield",
    ],
  },
  {
    key: "first_meeting",
    label: "First Time Meeting",
    heat: "#e0a93a",
    checklist: [
      "Partner briefed on the Global angle for this specific account",
      "Cleared by the partner to engage the client (permission to approach)",
      "Stakeholders mapped — who else at the account/partner needs to be in the room",
      "Relationship guardrails noted — the partner's do's and don'ts",
      "First meeting with the client held",
    ],
  },
  {
    key: "needs_analysis",
    label: "Needs Analysis",
    heat: "#ef9a3d",
    checklist: [
      "Legal entities where they're hiring? (which countries — or none)",
      "How they pay those workers today (method + any current provider)",
      "Employees or independent contractors? (misclassification risk)",
      "Incumbent check — already on a competitor EOR (Deel / G-P / etc.)? displacement vs greenfield",
      "Use case matched to a PrismHR Global product line — EOR / global payroll / contractor management",
      "Options framed for how they want to move forward (in-house vs current path, phased)",
      "Compliance / misclassification risk surfaced and quantified",
      "Rough scope drafted — countries, headcount, and the value it unlocks",
    ],
  },
  {
    key: "demo",
    label: "Demo",
    heat: "#e6701e",
    checklist: [
      "Partner/CSM confirmed client availability within 5 business days",
      "Right attendees confirmed — decision-maker + the person feeling the pain",
      "Demo tailored to their countries and worker types",
      "Demo delivered + recap sent",
    ],
  },
  {
    key: "exec_summary",
    label: "Executive Summary",
    heat: "#93862f",
    checklist: [
      "Executive summary drafted — countries, headcount, risk, and the value it unlocks",
      "Reviewed with the partner before it goes to the client",
      "Delivered to the decision-maker + their reaction captured",
    ],
  },
  {
    key: "proposal",
    label: "Proposal",
    heat: "#6fae3e",
    checklist: [
      "Decision criteria and timeline confirmed",
      "Proposal / pricing delivered",
      "Internal pricing cleared before the number goes out",
    ],
  },
  {
    key: "contract",
    label: "Contract",
    heat: "#1a7f3c",
    checklist: [
      "Yes/no reached — if yes, close plan agreed; if no, reason logged",
      "Partner debriefed on the outcome (protect the relationship for the next one)",
      "Contract sent — signature tracked through Closed Won",
    ],
  },
];

// App stage → the EXACT Salesforce Stage picklist value (they're 1:1 now).
export const SF_STAGE: Record<DashNodeKey, string> = {
  investigate: "Investigate",
  first_meeting: "First Time Meeting",
  needs_analysis: "Needs Analysis",
  demo: "Demo",
  exec_summary: "Executive Summary",
  proposal: "Proposal",
  contract: "Contract",
};

// The SF stage a deal's board position implies — the furthest node that's been
// touched (active or done). Falls back to the first stage for untouched cards.
export function sfStageForStates(
  states: Partial<Record<string, string>> | null | undefined,
): string {
  let stage = SF_STAGE.investigate;
  if (!states) return stage;
  for (const n of DASH_NODES) {
    const s = states[n.key];
    if (s === "active" || s === "done") stage = SF_STAGE[n.key];
  }
  return stage;
}

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
  if (
    itemCount > 0 &&
    checks.length >= itemCount &&
    checks.slice(0, itemCount).every(Boolean)
  )
    return "done";
  if (checks.some(Boolean)) return "active";
  return "todo";
}

// --- Legacy-key migration ----------------------------------------------------
// The board's first life used motion-named keys (interested/csm_seeded/
// discovery/use_case/demo/decision). Stored card JSON still carries them; these
// pure remaps upgrade any raw record on READ (loaders and actions both call
// them), and the next write persists the new keys — the DB self-heals with no
// SQL migration. Rules: a new key already present always wins; discovery +
// use_case fold into needs_analysis (use_case items appended at index 4+);
// decision splits into proposal (items 0–1) and contract (items 2–3).

type RawRec = Record<string, unknown>;

const rec = (raw: unknown): RawRec =>
  raw && typeof raw === "object" ? { ...(raw as RawRec) } : {};

// Folding two legacy stages into one: done only when BOTH were done (half the
// merged checklist finished is "active", not "done"); active when either was
// touched; absent when neither stored anything.
const foldStates = (a: unknown, b: unknown): string | undefined => {
  const av = typeof a === "string" ? a : undefined;
  const bv = typeof b === "string" ? b : undefined;
  if (av === undefined && bv === undefined) return undefined;
  if (av === "done" && bv === "done") return "done";
  if (av === "done" || av === "active" || bv === "done" || bv === "active")
    return "active";
  return "todo";
};

const bool4 = (v: unknown): boolean[] => {
  const arr = Array.isArray(v) ? v : [];
  return [0, 1, 2, 3].map((i) => arr[i] === true);
};

export function migrateStates(raw: unknown): Record<string, string> {
  const r = rec(raw);
  const out: Record<string, string> = {};
  const take = (nk: string, v: unknown) => {
    const cur = typeof r[nk] === "string" ? (r[nk] as string) : undefined;
    const legacy = typeof v === "string" ? (v as string) : undefined;
    const winner = cur ?? legacy;
    if (winner !== undefined) out[nk] = winner;
  };
  take("investigate", r["interested"]);
  take("first_meeting", r["csm_seeded"]);
  take("needs_analysis", foldStates(r["discovery"], r["use_case"]));
  take("demo", undefined);
  // A finished old "decision" means the deal cleared exec summary + proposal +
  // contract in the old model — light all three so migrated done deals stay done.
  take("exec_summary", r["decision"] === "done" ? "done" : undefined);
  take("proposal", r["decision"]);
  take("contract", r["decision"] === "done" ? "done" : undefined);
  return out;
}

export function migrateChecks(raw: unknown): Record<string, boolean[]> {
  const r = rec(raw);
  const out: Record<string, boolean[]> = {};
  const put = (nk: string, legacy: () => boolean[] | null) => {
    if (Array.isArray(r[nk])) out[nk] = (r[nk] as unknown[]).map((v) => v === true);
    else {
      const v = legacy();
      if (v) out[nk] = v;
    }
  };
  put("investigate", () =>
    Array.isArray(r["interested"]) ? bool4(r["interested"]).slice(0, 3) : null,
  );
  put("first_meeting", () =>
    Array.isArray(r["csm_seeded"]) ? bool4(r["csm_seeded"]) : null,
  );
  put("needs_analysis", () =>
    Array.isArray(r["discovery"]) || Array.isArray(r["use_case"])
      ? [...bool4(r["discovery"]), ...bool4(r["use_case"])]
      : null,
  );
  put("demo", () => null);
  put("exec_summary", () => null);
  put("proposal", () =>
    Array.isArray(r["decision"]) ? bool4(r["decision"]).slice(0, 2) : null,
  );
  put("contract", () =>
    Array.isArray(r["decision"]) ? bool4(r["decision"]).slice(2, 4) : null,
  );
  return out;
}

export function migrateNotes(raw: unknown): Record<string, string> {
  const r = rec(raw);
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const out: Record<string, string> = {};
  const put = (nk: string, legacy: string) => {
    const cur = s(r[nk]);
    const v = cur || legacy;
    if (v) out[nk] = v;
  };
  put("investigate", s(r["interested"]));
  put("first_meeting", s(r["csm_seeded"]));
  put(
    "needs_analysis",
    [s(r["discovery"]), s(r["use_case"])].filter(Boolean).join("\n\n"),
  );
  put("demo", "");
  put("proposal", s(r["decision"]));
  return out;
}

export function migrateActivated(raw: unknown): Record<string, string> {
  const r = rec(raw);
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const out: Record<string, string> = {};
  const put = (nk: string, legacy: string) => {
    const v = s(r[nk]) || legacy;
    if (v) out[nk] = v;
  };
  put("investigate", s(r["interested"]));
  put("first_meeting", s(r["csm_seeded"]));
  // Earlier of the two folded stages = when needs-analysis work truly began.
  const d = s(r["discovery"]);
  const u = s(r["use_case"]);
  put("needs_analysis", d && u ? (Date.parse(d) <= Date.parse(u) ? d : u) : d || u);
  put("demo", "");
  put("proposal", s(r["decision"]));
  return out;
}

export function migrateCheckNotes(raw: unknown): Record<string, Record<string, string>> {
  const r = rec(raw);
  const m = (v: unknown): Record<string, string> => {
    if (!v || typeof v !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v as RawRec))
      if (typeof val === "string" && val.trim()) out[k] = val;
    return out;
  };
  const shift = (notes: Record<string, string>, by: number, lo: number, hi: number) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(notes)) {
      const i = Number(k);
      if (Number.isInteger(i) && i >= lo && i <= hi) out[String(i + by)] = v;
    }
    return out;
  };
  const out: Record<string, Record<string, string>> = {};
  const put = (nk: string, legacy: Record<string, string>) => {
    const cur = m(r[nk]);
    const v = Object.keys(cur).length ? cur : legacy;
    if (Object.keys(v).length) out[nk] = v;
  };
  const dec = m(r["decision"]);
  put("investigate", m(r["interested"]));
  put("first_meeting", m(r["csm_seeded"]));
  put("needs_analysis", { ...m(r["discovery"]), ...shift(m(r["use_case"]), 4, 0, 3) });
  put("demo", m(r["demo"]));
  put("proposal", shift(dec, 0, 0, 1));
  put("contract", shift(dec, -2, 2, 3));
  return out;
}
