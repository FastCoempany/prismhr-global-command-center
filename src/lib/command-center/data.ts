import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { peos, type Peo } from "@/lib/book";
import { digestForCardName } from "@/lib/intel/digest";
import {
  boardLift,
  priorityScore,
  type Approach,
  type Intent,
  type PeoRow,
  type Stage,
} from "./types";

export type { PeoRow, Stage } from "./types";
export { STAGES, stageLabel } from "./types";

export type CommandData = {
  status: "active" | "unauthenticated" | "database-unavailable";
  canWrite: boolean;
  rows: PeoRow[];
};

function baseRow(p: Peo): PeoRow {
  return {
    ...p,
    stage: "NOT_TOUCHED",
    approach: "NEEDS_CSM",
    intent: "UNKNOWN",
    priority: p.fit,
    nextAction: null,
    nextActionDate: null,
    notes: null,
  };
}

// The board's word outranks the hand-edited seed (Ted doctrine, extended by
// founder decree 2026-08-21): putting an account on the dashboard IS clearing
// it with the CSM and touching it. An account with a card never reads
// NOT_TOUCHED or NEEDS_CSM again — the stored state only ever ADVANCES the
// derived one, never drags it back to the defaults.
async function boardAccountIds(): Promise<Set<string>> {
  const out = new Set<string>();
  try {
    const cards = await getPrisma().dashCard.findMany({ select: { name: true } });
    const idByName = new Map(peos.map((p) => [p.name.toLowerCase(), p.id]));
    for (const c of cards) {
      const id =
        idByName.get(c.name.trim().toLowerCase()) ??
        digestForCardName(c.name)?.accountId ??
        "";
      if (id) out.add(id);
    }
  } catch {
    // No board readable — nothing lifts.
  }
  return out;
}

function liftForBoard(r: PeoRow, onBoard: Set<string>): PeoRow {
  if (!onBoard.has(r.id)) return r;
  const { stage, approach } = boardLift(r.stage, r.approach);
  if (stage === r.stage && approach === r.approach) return r;
  return { ...r, stage, approach };
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
    const [states, onBoard] = await Promise.all([
      getPrisma().peoState.findMany({
        select: {
          peoId: true,
          stage: true,
          approach: true,
          intent: true,
          nextAction: true,
          nextActionDate: true,
          notes: true,
        },
      }),
      boardAccountIds(),
    ]);
    const byId = new Map(states.map((s) => [s.peoId, s]));
    const rows = base.map((r) => {
      const s = byId.get(r.id);
      if (!s) return liftForBoard(r, onBoard);
      const intent = s.intent as Intent;
      return liftForBoard(
        {
          ...r,
          stage: s.stage as Stage,
          approach: s.approach as Approach,
          intent,
          priority: priorityScore(r.fit, intent),
          nextAction: s.nextAction,
          nextActionDate: s.nextActionDate
            ? s.nextActionDate.toISOString().slice(0, 10)
            : null,
          notes: s.notes,
        },
        onBoard,
      );
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
