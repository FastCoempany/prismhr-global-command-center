import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { LOOK_INTO } from "@/lib/look-into";

export type LookIntoStatusMap = Map<string, { resolved: boolean; note?: string }>;

// Resolution state for the curated Look-into items. Degrades to unavailable
// (nothing resolvable) if the table isn't migrated yet.
export async function loadLookIntoStatus(): Promise<{
  available: boolean;
  map: LookIntoStatusMap;
}> {
  if (!hasDatabaseEnv()) return { available: false, map: new Map() };
  try {
    const rows = await getPrisma().lookIntoStatus.findMany();
    return {
      available: true,
      map: new Map(
        rows.map((r) => [r.itemId, { resolved: r.resolved, note: r.note ?? undefined }]),
      ),
    };
  } catch {
    return { available: false, map: new Map() };
  }
}

// The nav badge: high-priority items still OPEN (resolution state applied) —
// so resolving an item actually clears it from the tab. Falls back to the full
// high count when the status table isn't available.
export async function openLookIntoHighCount(): Promise<number> {
  const { map } = await loadLookIntoStatus();
  return LOOK_INTO.filter(
    (i) => i.priority === "high" && map.get(i.id)?.resolved !== true,
  ).length;
}
