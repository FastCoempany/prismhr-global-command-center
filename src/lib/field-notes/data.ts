import { getAppAccess } from "@/lib/auth";
import { getPrisma, hasDatabaseEnv } from "@/lib/db";

export type FieldNoteKind = "gap" | "voice" | "ask";

export type FieldNoteRow = {
  id: string;
  kind: FieldNoteKind;
  body: string;
  createdAt: string; // ISO
};

export const FIELD_NOTE_KINDS: { key: FieldNoteKind; label: string; hint: string }[] = [
  { key: "gap", label: "Enablement gap", hint: "What we don't have yet to arm partners" },
  { key: "voice", label: "Voice of the base", hint: "A pattern the base keeps showing" },
  { key: "ask", label: "Ask", hint: "What I need from Aleks / marketing / product" },
];

export function asFieldNoteKind(v: string): FieldNoteKind {
  return v === "voice" || v === "ask" ? v : "gap";
}

export type FieldNotesData = {
  available: boolean; // false when the DB/table isn't reachable yet
  canWrite: boolean;
  notes: FieldNoteRow[];
};

export async function loadFieldNotes(): Promise<FieldNotesData> {
  const access = await getAppAccess();
  if (access.status !== "active" || !hasDatabaseEnv()) {
    return { available: false, canWrite: false, notes: [] };
  }
  try {
    const rows = await getPrisma().fieldNote.findMany({
      where: { resolved: false },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return {
      available: true,
      canWrite: access.canWrite,
      notes: rows.map((r) => ({
        id: r.id,
        kind: asFieldNoteKind(r.kind),
        body: r.body,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  } catch {
    // FieldNote table not created yet — degrade to an empty, unavailable list.
    return { available: false, canWrite: false, notes: [] };
  }
}
