// Institutions — the national-reach organizations program (plan §6), stored
// as inst:<slug> AccountNotes with a JSON tail, same envelope discipline as
// research and wire notes. Phase one reads and renders; the ladder's write
// actions grow with use.

export const INST_NS = "inst:";

export type InstitutionKind = "client-world" | "partner-world" | "home-turf";
export type InstitutionRung = "verify" | "attend" | "contribute" | "host" | "referral";

export type Institution = {
  slug: string;
  name: string;
  kind: InstitutionKind;
  rung: InstitutionRung;
  nextEventIso?: string; // date of the next known gathering
  note?: string; // one plain sentence of state
};

export function instNoteBody(inst: Institution): string {
  return `⚑ INSTITUTION ${inst.name} — rung: ${inst.rung}\n${inst.note ?? ""}\n⟪inst⟫${JSON.stringify(inst)}⟪/inst⟫`;
}

export function parseInstBody(body: string): Institution | null {
  const m = /⟪inst⟫([\s\S]*?)⟪\/inst⟫/.exec(body);
  if (!m) return null;
  try {
    const raw = JSON.parse(m[1]) as Partial<Institution>;
    if (!raw.slug || !raw.name) return null;
    return {
      slug: String(raw.slug),
      name: String(raw.name),
      kind: (raw.kind as InstitutionKind) ?? "client-world",
      rung: (raw.rung as InstitutionRung) ?? "verify",
      nextEventIso: raw.nextEventIso ? String(raw.nextEventIso) : undefined,
      note: raw.note ? String(raw.note) : undefined,
    };
  } catch {
    return null;
  }
}

// The card shows the next event inside 7 days, else the highest-rung
// institution's standing state, else null (the empty state names the first
// verification to run).
export function institutionCard(
  insts: Institution[],
  now: Date,
): { inst: Institution; eventSoon: boolean } | null {
  const withEvent = insts
    .filter((i) => i.nextEventIso)
    .map((i) => ({
      i,
      days: (Date.parse(`${i.nextEventIso}T12:00:00Z`) - now.getTime()) / 86_400_000,
    }))
    .filter((x) => x.days >= -0.5 && x.days <= 7)
    .sort((a, b) => a.days - b.days);
  if (withEvent.length > 0) return { inst: withEvent[0].i, eventSoon: true };
  const ladder: InstitutionRung[] = [
    "referral",
    "host",
    "contribute",
    "attend",
    "verify",
  ];
  for (const rung of ladder) {
    const found = insts.find((i) => i.rung === rung);
    if (found) return { inst: found, eventSoon: false };
  }
  return null;
}
