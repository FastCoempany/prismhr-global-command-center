import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { DASH_NODES, isNodeState, type DashNodeKey, type NodeState } from "./stages";

export type DashCardRow = {
  id: string;
  name: string;
  subtitle: string | null;
  position: number;
  states: Record<DashNodeKey, NodeState>;
  notes: Record<DashNodeKey, string>;
};

export type DashData = {
  status: "active" | "unauthenticated" | "database-unavailable";
  canWrite: boolean;
  cards: DashCardRow[];
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

export async function loadDashboard(): Promise<DashData> {
  const access = await getAppAccess();
  if (access.status !== "active" || !hasDatabaseEnv()) {
    return {
      status: access.status === "active" ? "database-unavailable" : access.status,
      canWrite: false,
      cards: [],
    };
  }

  try {
    const rows = await getPrisma().dashCard.findMany({
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    const cards: DashCardRow[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      subtitle: r.subtitle,
      position: r.position,
      states: normStates(r.states),
      notes: normNotes(r.notes),
    }));
    return { status: "active", canWrite: access.canWrite, cards };
  } catch {
    // DashCard table not created yet — read-only until docs/dashboard-tables.sql runs.
    return { status: "database-unavailable", canWrite: false, cards: [] };
  }
}
