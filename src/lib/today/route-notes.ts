// Day-sheet note routing — pure helpers. A captured note can be routed to the
// account page (an AccountNote) and/or the partner room (a PartnerNote); the
// receipt lives INSIDE the note body as a trailing marker line, so routing
// state survives with the note itself (no schema change, degrades gracefully).
//
// Marker format, always the last line of the body:
//   ⇢[a:<accountNoteId>,p:<partnerNoteId>] Simploy · Lesha
// The ids let "undo" delete exactly the rows this routing created; the tail is
// the human-readable receipt.

export type NoteTarget = {
  accounts: { id: string; name: string }[]; // routed to the account page
  partners: string[]; // routed to the partner room
};

export type RouteRefs = { accountNoteIds: string[]; partnerNoteIds: string[] };

const MARK = "⇢";

// Split a stored body into the visible text and its routing marker (if any).
export function splitMarker(body: string): {
  text: string;
  refs: RouteRefs | null;
  label: string;
} {
  const i = body.lastIndexOf(`\n${MARK}[`);
  const startsWith = body.startsWith(`${MARK}[`);
  if (i < 0 && !startsWith) return { text: body, refs: null, label: "" };
  const at = startsWith && i < 0 ? 0 : i + 1;
  const line = body.slice(at);
  const m = /^⇢\[([^\]]*)\]\s?(.*)$/.exec(line.trim());
  if (!m) return { text: body, refs: null, label: "" };
  const refs: RouteRefs = { accountNoteIds: [], partnerNoteIds: [] };
  for (const part of m[1].split(",")) {
    const [k, v] = part.split(":");
    if (k === "a" && v) refs.accountNoteIds.push(v);
    if (k === "p" && v) refs.partnerNoteIds.push(v);
  }
  return { text: body.slice(0, at === 0 ? 0 : i).trimEnd(), refs, label: m[2] ?? "" };
}

export function withMarker(text: string, refs: RouteRefs, label: string): string {
  const ids = [
    ...refs.accountNoteIds.map((id) => `a:${id}`),
    ...refs.partnerNoteIds.map((id) => `p:${id}`),
  ].join(",");
  return `${text.trimEnd()}\n${MARK}[${ids}] ${label}`;
}

// Words too generic to identify an account on their own.
const STOP = new Set([
  "the",
  "and",
  "inc",
  "llc",
  "group",
  "corp",
  "corporation",
  "company",
  "co",
  "hr",
  "payroll",
  "services",
  "solutions",
  "staffing",
  "management",
  "employer",
  "global",
  "one",
  "pay",
]);

// Detect which accounts / partners a note is about. Case-insensitive, whole-word
// matching against (1) full account names, (2) distinctive single tokens of the
// name (≥4 chars, not a stop word), and (3) partner first names. A matched
// account pulls its CSM partner in too — the note lands on both surfaces.
export function detectTargets(
  text: string,
  accounts: { id: string; name: string; csm: string }[],
  partners: string[],
): NoteTarget {
  const hay = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  const has = (phrase: string) =>
    phrase.length >= 3 && hay.includes(` ${phrase.toLowerCase()} `);

  const accHits: { id: string; name: string; csm: string }[] = [];
  for (const a of accounts) {
    const full = a.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    let hit = has(full);
    if (!hit) {
      for (const tok of full.split(" ")) {
        if (tok.length >= 4 && !STOP.has(tok) && has(tok)) {
          hit = true;
          break;
        }
      }
    }
    if (hit) accHits.push(a);
  }

  const partnerHits = new Set<string>();
  for (const p of partners) {
    const first = p.split(" ")[0]?.toLowerCase() ?? "";
    if (first.length >= 3 && has(first)) partnerHits.add(p);
  }
  for (const a of accHits) if (a.csm && a.csm !== "Unassigned") partnerHits.add(a.csm);

  return {
    accounts: accHits.map((a) => ({ id: a.id, name: a.name })),
    partners: [...partnerHits],
  };
}

// The human-readable receipt tail: "Simploy · Lesha".
export function routeLabel(t: NoteTarget): string {
  const names = [
    ...t.accounts.map((a) => a.name),
    ...t.partners.map((p) => p.split(" ")[0] ?? p),
  ];
  return names.join(" · ");
}
