import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { DASH_NODES, isNodeState, type DashNodeKey, type NodeState } from "./stages";

export type DashCardRow = {
  id: string;
  name: string;
  subtitle: string | null;
  position: number;
  archived: boolean;
  states: Record<DashNodeKey, NodeState>;
  notes: Record<DashNodeKey, string>;
};

export type DashData = {
  status: "active" | "unauthenticated" | "database-unavailable";
  canWrite: boolean;
  cards: DashCardRow[];
  labels: Record<string, string>; // node-key -> custom label (overrides only)
};

function normStates(raw: unknown): Record<DashNodeKey, NodeState> {
  const src = (raw ?? {}) as Record<string, unknown>;
  const out = {} as Record<DashNodeKey, NodeState>;
  for (const n of DASH_NODES) out[n.key] = isNodeState(src[n.key]) ? (src[n.key] as NodeState) : "todo";
  return out;
}

function normNotes(raw: unknown): Record<DashNodeKey, string> {
  const src = (raw ?? {}) as Record<string, unknown>;
  const out = {} as Record<DashNodeKey, string>;
  for (const n of DASH_NODES) out[n.key] = typeof src[n.key] === "string" ? (src[n.key] as string) : "";
  return out;
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
    const cards: DashCardRow[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      subtitle: r.subtitle,
      position: r.position,
      archived: r.archived,
      states: normStates(r.states),
      notes: normNotes(r.notes),
    }));
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
