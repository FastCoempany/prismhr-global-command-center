// The fold engine — one store under the triptych's three faces (2026-08-13).
// Everything collapsed is a per-Chicago-day fact, exactly like the Chute's
// ledger: a new day arrives fully folded, stale accounts prune on hydrate.
// Each face brings only its own open-cardinality model:
//   register — boolean per account; many walls may stand open.
//   marquee  — ONE {accountId, pane} across the whole board; the spotlight.
//   jamb     — a door per account; many rows open; the workbench.

export type Face = "register" | "marquee" | "jamb";
export const FACES: Face[] = ["register", "marquee", "jamb"];
export const FACE_KEY = "room-face-v1";
export const FOLD_KEY = "room-fold-v1";

export type PaneKey = "today" | "owed" | "unknown" | "record";
export type DoorKey = "sheet" | "owed" | "unknown" | "record" | "drop";

// The one Chicago-day helper for every day-scoped store. Prefer this over
// private copies — the day boundary must be one fact app-wide.
export function chicagoDayOf(now: Date = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

type FoldShape = {
  day: string;
  register: Record<string, boolean>;
  marquee: { accountId: string; pane: PaneKey } | null;
  jamb: Record<string, DoorKey>;
};

const EMPTY: FoldShape = { day: "", register: {}, marquee: null, jamb: {} };

export function loadFold(now: Date = new Date()): FoldShape {
  try {
    const raw = localStorage.getItem(FOLD_KEY);
    if (!raw) return { ...EMPTY, day: chicagoDayOf(now) };
    const parsed = JSON.parse(raw) as Partial<FoldShape>;
    if (parsed.day !== chicagoDayOf(now)) return { ...EMPTY, day: chicagoDayOf(now) };
    return {
      day: parsed.day,
      register: parsed.register ?? {},
      marquee: parsed.marquee ?? null,
      jamb: parsed.jamb ?? {},
    };
  } catch {
    return { ...EMPTY, day: chicagoDayOf(now) };
  }
}

export function saveFold(state: FoldShape): void {
  try {
    localStorage.setItem(FOLD_KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked — the live view still works
  }
}

export function loadFace(): Face {
  try {
    const raw = localStorage.getItem(FACE_KEY);
    return FACES.includes(raw as Face) ? (raw as Face) : "register";
  } catch {
    return "register";
  }
}

export function saveFace(face: Face): void {
  try {
    localStorage.setItem(FACE_KEY, face);
  } catch {
    // storage blocked — the face just won't persist
  }
}
