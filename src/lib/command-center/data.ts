import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { peos, type Peo } from "@/lib/book";
import type { PeoRow, Stage } from "./types";

export type { PeoRow, Stage } from "./types";
export { STAGES, stageLabel } from "./types";

export type CommandData = {
  status: "active" | "unauthenticated" | "database-unavailable";
  canWrite: boolean;
  rows: PeoRow[];
};

function baseRow(p: Peo): PeoRow {
  return { ...p, stage: "NOT_TOUCHED", nextAction: null, nextActionDate: null, notes: null };
}

export async function loadCommand(): Promise<CommandData> {
  const access = await getAppAccess();
  const base = peos.map(baseRow);

  if (access.status !== "active" || !hasDatabaseEnv()) {
    return {
      status: access.status === "active" ? "database-unavailable" : access.status,
      canWrite: false,
      rows: base,
    };
  }

  try {
    const states = await getPrisma().peoState.findMany({
      select: {
        peoId: true,
        stage: true,
        nextAction: true,
        nextActionDate: true,
        notes: true,
      },
    });
    const byId = new Map(states.map((s) => [s.peoId, s]));
    const rows = base.map((r) => {
      const s = byId.get(r.id);
      if (!s) return r;
      return {
        ...r,
        stage: s.stage as Stage,
        nextAction: s.nextAction,
        nextActionDate: s.nextActionDate ? s.nextActionDate.toISOString().slice(0, 10) : null,
        notes: s.notes,
      };
    });
    return { status: "active", canWrite: access.canWrite, rows };
  } catch {
    // PeoState table not created yet — degrade to a read-only book.
    return { status: "database-unavailable", canWrite: false, rows: base };
  }
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
