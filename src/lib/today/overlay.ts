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
        {
          reason: r.reason,
          snoozedUntil: r.snoozedUntil ? r.snoozedUntil.toISOString() : null,
        },
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

// A dated, time-stamped account note written from a partner-outreach chip —
// either yours ("mine") or what the partner said ("partner").
export type AccountNote = {
  id: string;
  accountId: string;
  partner: string;
  kind: "mine" | "partner" | "account";
  body: string;
  createdAt: string; // ISO
};

// All account notes, newest first, grouped by account id. Defensive: degrades to
// an empty map until the AccountNote table is migrated.
export async function loadAccountNotes(): Promise<Map<string, AccountNote[]>> {
  if (!hasDatabaseEnv()) return new Map();
  try {
    const rows = await getPrisma().accountNote.findMany({
      orderBy: { createdAt: "desc" },
    });
    const out = new Map<string, AccountNote[]>();
    for (const r of rows) {
      const note: AccountNote = {
        id: r.id,
        accountId: r.accountId,
        partner: r.partner,
        kind:
          r.kind === "partner" ? "partner" : r.kind === "account" ? "account" : "mine",
        body: r.body,
        createdAt: r.createdAt.toISOString(),
      };
      const list = out.get(r.accountId);
      if (list) list.push(note);
      else out.set(r.accountId, [note]);
    }
    return out;
  } catch {
    return new Map();
  }
}

// A dated, time-stamped partner note (from Stash routing or the Partner Room).
export type PartnerNote = {
  id: string;
  partner: string;
  body: string;
  source: string;
  createdAt: string; // ISO
};

// All partner notes, newest first, grouped by partner. Defensive: degrades to an
// empty map if the PartnerNote table hasn't been migrated yet.
export async function loadPartnerNotes(): Promise<Map<string, PartnerNote[]>> {
  if (!hasDatabaseEnv()) return new Map();
  try {
    const rows = await getPrisma().partnerNote.findMany({
      orderBy: { createdAt: "desc" },
    });
    const out = new Map<string, PartnerNote[]>();
    for (const r of rows) {
      const note: PartnerNote = {
        id: r.id,
        partner: r.partner,
        body: r.body,
        source: r.source,
        createdAt: r.createdAt.toISOString(),
      };
      const list = out.get(r.partner);
      if (list) list.push(note);
      else out.set(r.partner, [note]);
    }
    return out;
  } catch {
    return new Map();
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
      status: (["replied", "responded", "archived"] as const).includes(
        r.status as "replied" | "responded" | "archived",
      )
        ? (r.status as "replied" | "responded" | "archived")
        : "awaiting",
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

// Notes / to-dos (right column beside Follow-ups). Newest first. Column-safe: if
// the notetaker columns (accountId, remindAt) aren't migrated yet, fall back to
// the stable columns so EXISTING NOTES STILL LOAD (never silently vanish).
const TODO_STABLE = {
  id: true,
  body: true,
  done: true,
  position: true,
  createdAt: true,
} as const;
const TODO_ORDER = [{ done: "asc" }, { createdAt: "desc" }] as const;

export async function loadTodos(): Promise<Todo[]> {
  if (!hasDatabaseEnv()) return [];
  const prisma = getPrisma();
  try {
    const rows = await prisma.todo.findMany({
      orderBy: [...TODO_ORDER],
      select: { ...TODO_STABLE, accountId: true, remindAt: true },
    });
    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      done: r.done,
      accountId: r.accountId ?? "",
      remindAt: r.remindAt ? r.remindAt.toISOString() : "",
    }));
  } catch {
    try {
      const rows = await prisma.todo.findMany({
        orderBy: [...TODO_ORDER],
        select: TODO_STABLE,
      });
      return rows.map((r) => ({
        id: r.id,
        body: r.body,
        done: r.done,
        accountId: "",
        remindAt: "",
      }));
    } catch {
      return [];
    }
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
