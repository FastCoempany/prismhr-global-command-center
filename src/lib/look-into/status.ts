import { getPrisma, hasDatabaseEnv } from "@/lib/db";

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
      map: new Map(rows.map((r) => [r.itemId, { resolved: r.resolved, note: r.note ?? undefined }])),
    };
  } catch {
    return { available: false, map: new Map() };
  }
}
