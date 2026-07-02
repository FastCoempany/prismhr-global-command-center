import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { DASH_NODES, isNodeState, stateFromChecks, type DashNodeKey, type NodeState } from "./stages";

export type DashCardRow = {
  id: string;
  name: string;
  subtitle: string | null;
  position: number;
  archived: boolean;
  states: Record<DashNodeKey, NodeState>;
  notes: Record<DashNodeKey, string>;
  checks: Record<DashNodeKey, boolean[]>;
  checkNotes: Record<DashNodeKey, Record<number, string>>;
};

export type DashData = {
  status: "active" | "unauthenticated" | "database-unavailable";
  canWrite: boolean;
  cards: DashCardRow[];
  labels: Record<string, string>; // node-key -> custom label (overrides only)
};

function normNotes(raw: unknown): Record<DashNodeKey, string> {
  const src = (raw ?? {}) as Record<string, unknown>;
  const out = {} as Record<DashNodeKey, string>;
  for (const n of DASH_NODES) out[n.key] = typeof src[n.key] === "string" ? (src[n.key] as string) : "";
  return out;
}

function normChecks(raw: unknown): Record<DashNodeKey, boolean[]> {
  const src = (raw ?? {}) as Record<string, unknown>;
  const out = {} as Record<DashNodeKey, boolean[]>;
  for (const n of DASH_NODES) {
    const arr = Array.isArray(src[n.key]) ? (src[n.key] as unknown[]) : [];
    out[n.key] = n.checklist.map((_, i) => arr[i] === true);
  }
  return out;
}

function normCheckNotes(raw: unknown): Record<DashNodeKey, Record<number, string>> {
  const src = (raw ?? {}) as Record<string, unknown>;
  const out = {} as Record<DashNodeKey, Record<number, string>>;
  for (const n of DASH_NODES) {
    const m = (src[n.key] ?? {}) as Record<string, unknown>;
    const per: Record<number, string> = {};
    n.checklist.forEach((_, i) => {
      if (typeof m[i] === "string" && (m[i] as string).trim()) per[i] = m[i] as string;
    });
    out[n.key] = per;
  }
  return out;
}

// A node's authoritative lit state: derived from its checks, unless a manual
// override in `states` pushes it further (the override is the "for fun" poke).
function resolveState(
  stored: unknown,
  checks: boolean[],
  itemCount: number,
): NodeState {
  const derived = stateFromChecks(checks, itemCount);
  const override = isNodeState(stored) ? (stored as NodeState) : "todo";
  const rank = { todo: 0, active: 1, done: 2 } as const;
  return rank[override] > rank[derived] ? override : derived;
}

function normLabels(raw: unknown): Record<string, string> {
  const src = (raw ?? {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const n of DASH_NODES) {
    if (typeof src[n.key] === "string" && (src[n.key] as string).trim()) {
      out[n.key] = (src[n.key] as string).trim();
    }
  }
  return out;
}

export async function loadDashboard(): Promise<DashData> {
  const access = await getAppAccess();
  if (access.status !== "active" || !hasDatabaseEnv()) {
    return {
      status: access.status === "active" ? "database-unavailable" : access.status,
      canWrite: false,
      cards: [],
      labels: {},
    };
  }

  try {
    const prisma = getPrisma();
    const [rows, config] = await Promise.all([
      prisma.dashCard.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
      prisma.dashConfig.findUnique({ where: { id: "default" } }).catch(() => null),
    ]);
    const cards: DashCardRow[] = rows.map((r) => {
      const stored = (r.states ?? {}) as Record<string, unknown>;
      const checks = normChecks(r.checks);
      const states = {} as Record<DashNodeKey, NodeState>;
      for (const n of DASH_NODES) {
        states[n.key] = resolveState(stored[n.key], checks[n.key], n.checklist.length);
      }
      return {
        id: r.id,
        name: r.name,
        subtitle: r.subtitle,
        position: r.position,
        archived: r.archived,
        states,
        notes: normNotes(r.notes),
        checks,
        checkNotes: normCheckNotes(r.checkNotes),
      };
    });
    return {
      status: "active",
      canWrite: access.canWrite,
      cards,
      labels: normLabels(config?.labels),
    };
  } catch {
    // DashCard table not created yet — read-only until docs/dashboard-tables.sql runs.
    return { status: "database-unavailable", canWrite: false, cards: [], labels: {} };
  }
}
