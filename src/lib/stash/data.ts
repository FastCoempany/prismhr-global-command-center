import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import { csms } from "@/lib/book";
import { EXTRA_PARTNERS } from "@/lib/book/partners";

// A single un-routed capture as the Stash tray consumes it (ISO strings).
export type StashTrayItem = {
  id: string;
  body: string; // raw captured text
  micro: string; // one-line summary shown in the tray
  source: string; // provenance label, e.g. "selection"
  accountId: string; // "" when not tied to a book account
  createdAt: string; // ISO
};

// available=false means the tray can't be used yet (not signed in, no DB, or the
// StashItem table hasn't been migrated) — the dock hides itself entirely.
export type StashTray = {
  available: boolean;
  canWrite: boolean;
  items: StashTrayItem[];
  partners: string[]; // the partner roster, so captures can route to a name
};

const EMPTY: StashTray = { available: false, canWrite: false, items: [], partners: [] };

// The partner roster the dock routes to — the book's CSMs (minus Unassigned)
// plus standing extras. Static, so it costs nothing to include in every tray.
export function stashPartners(): string[] {
  return [
    ...new Set([...csms.filter((c) => c && c !== "Unassigned"), ...EXTRA_PARTNERS]),
  ];
}

// The un-routed captures waiting to be sorted, newest first. Defensive: any
// failure (unmigrated table, no DB) degrades to an unavailable, empty tray so the
// dock simply doesn't render rather than throwing.
export async function loadStashTray(): Promise<StashTray> {
  const access = await getAppAccess();
  if (access.status !== "active" || !hasDatabaseEnv()) return EMPTY;
  try {
    const rows = await getPrisma().stashItem.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return {
      available: true,
      canWrite: access.canWrite,
      partners: stashPartners(),
      items: rows.map((r) => ({
        id: r.id,
        body: r.body,
        micro: r.micro ?? "",
        source: r.source ?? "",
        accountId: r.accountId ?? "",
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch {
    return EMPTY;
  }
}
