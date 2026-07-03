// DB overlays for the interactive Today: parked signals and score validations.
// Read-only and defensive — any failure (table not migrated, no DB) degrades to
// an empty overlay so the surface still renders. Auth is already established by
// the page's loadDashboard() call before these run.

import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import type { Snooze, Validation, ValidationStatus } from "./build";

function asStatus(s: string): ValidationStatus {
  return s === "flagged" || s === "adjusted" ? s : "confirmed";
}

export async function loadSnoozes(): Promise<Map<string, Snooze>> {
  if (!hasDatabaseEnv()) return new Map();
  try {
    const rows = await getPrisma().signalSnooze.findMany();
    return new Map(
      rows.map((r) => [
        r.accountId,
        { reason: r.reason, snoozedUntil: r.snoozedUntil ? r.snoozedUntil.toISOString() : null },
      ]),
    );
  } catch {
    return new Map();
  }
}

export async function loadValidations(): Promise<Map<string, Validation>> {
  if (!hasDatabaseEnv()) return new Map();
  try {
    const rows = await getPrisma().scoreValidation.findMany();
    return new Map(
      rows.map((r) => [
        r.accountId,
        {
          status: asStatus(r.status),
          note: r.note ?? undefined,
          adjustedDemand: r.adjustedDemand ?? undefined,
        },
      ]),
    );
  } catch {
    return new Map();
  }
}
