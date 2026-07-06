// DB overlays for the interactive Today: parked signals and score validations.
// Read-only and defensive — any failure (table not migrated, no DB) degrades to
// an empty overlay so the surface still renders. Auth is already established by
// the page's loadDashboard() call before these run.

import { getPrisma, hasDatabaseEnv } from "@/lib/db";
import type { ClientHealth, Engagement } from "@/lib/engagement";
import type { Snooze, Validation, ValidationStatus } from "./build";
import type { Todo, Touch, TouchLogEntry } from "./follow-ups";

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

// Every completion mark (per-day / per-week task keys). Presence = done.
export async function loadDoneKeys(): Promise<Set<string>> {
  if (!hasDatabaseEnv()) return new Set();
  try {
    const rows = await getPrisma().taskDone.findMany({ select: { key: true } });
    return new Set(rows.map((r) => r.key));
  } catch {
    return new Set();
  }
}

// Normalize a JSON log column into typed entries, dropping anything malformed.
function normTouchLog(raw: unknown): TouchLogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e) => {
      const o = (e ?? {}) as Record<string, unknown>;
      return {
        at: typeof o.at === "string" ? o.at : "",
        body: typeof o.body === "string" ? o.body : "",
      };
    })
    .filter((e) => e.body.trim());
}

// Logged contacts + their follow-up cadence. Defensive: degrades to [] if the
// Touch table hasn't been migrated yet.
export async function loadTouches(): Promise<Touch[]> {
  if (!hasDatabaseEnv()) return [];
  try {
    const rows = await getPrisma().touch.findMany();
    return rows.map((r) => ({
      subjectKey: r.subjectKey,
      kind: r.kind === "account" ? "account" : r.kind === "custom" ? "custom" : "partner",
      label: r.label,
      detail: r.detail ?? "",
      message: r.message ?? "",
      contactedAt: r.contactedAt.toISOString(),
      followUpAt: r.followUpAt.toISOString(),
      intervalDays: r.intervalDays,
      status: r.status === "replied" ? "replied" : "awaiting",
      log: normTouchLog(r.log),
    }));
  } catch {
    return [];
  }
}

// Per-account engagement (CSM cadence / notes / health / SF-checked). Keyed by
// account id. Defensive → empty map if unmigrated.
export async function loadEngagements(): Promise<Map<string, Engagement>> {
  if (!hasDatabaseEnv()) return new Map();
  try {
    const rows = await getPrisma().accountEngagement.findMany();
    return new Map(
      rows.map((r) => [
        r.accountId,
        {
          cadence: r.cadence ?? "",
          meetingDay: r.meetingDay ?? "",
          nextMeeting: r.nextMeetingAt ? r.nextMeetingAt.toISOString().slice(0, 10) : "",
          clientHealth: (["green", "yellow", "red"].includes(r.clientHealth ?? "")
            ? r.clientHealth
            : "") as ClientHealth,
          csmNotes: r.csmNotes ?? "",
          sfChecked: r.sfCheckedAt != null,
          sfCheckedAt: r.sfCheckedAt ? r.sfCheckedAt.toISOString() : "",
        },
      ]),
    );
  } catch {
    return new Map();
  }
}

// Personal to-dos (right column beside Follow-ups). Defensive → [] if unmigrated.
// Open items first (by position, then newest), done items after.
export async function loadTodos(): Promise<Todo[]> {
  if (!hasDatabaseEnv()) return [];
  try {
    const rows = await getPrisma().todo.findMany({
      orderBy: [{ done: "asc" }, { position: "asc" }, { createdAt: "desc" }],
    });
    return rows.map((r) => ({ id: r.id, body: r.body, done: r.done }));
  } catch {
    return [];
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
