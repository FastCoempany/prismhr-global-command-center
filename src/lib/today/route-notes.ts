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

// ---------------------------------------------------------------------------
// Note tags — date, urgency, today/later. Same no-schema trick as routing:
// the tags live INSIDE the body as their own marker line, kept at the end of
// the text portion (i.e. BEFORE any routing marker, which stays the last line).
//   ⚑[d:2026-07-18,u:high,w:later]

export type NoteTags = {
  date: string; // yyyy-mm-dd, or ""
  urgency: "" | "low" | "med" | "high";
  when: "" | "today" | "later";
  // A note that IS an action — it lives on the Today ledger, not the sheet.
  kind: "" | "action";
  // Why the action is delayed — free text, URI-encoded in the marker so commas
  // and brackets can't break the format. "" = not delayed.
  delay: string;
  // When the action was marked done — epoch millis as a string ("" = not done
  // via the ledger; the boolean done column still governs visibility).
  doneAt: string;
  // ISO-3166 alpha-2 country code the note/action is tied to ("" = none).
  country: string;
};

const TAG = "⚑";
export const NO_TAGS: NoteTags = {
  date: "",
  urgency: "",
  when: "",
  kind: "",
  delay: "",
  doneAt: "",
  country: "",
};

// Split a text (already stripped of any routing marker) into the visible note
// and its tags. Unknown or malformed values are ignored, the line still strips.
export function splitTags(text: string): { text: string; tags: NoteTags } {
  const i = text.lastIndexOf(`\n${TAG}[`);
  const startsWith = text.startsWith(`${TAG}[`);
  if (i < 0 && !startsWith) return { text, tags: { ...NO_TAGS } };
  const at = startsWith && i < 0 ? 0 : i + 1;
  const m = /^⚑\[([^\]]*)\]$/.exec(text.slice(at).trim());
  if (!m) return { text, tags: { ...NO_TAGS } };
  const tags: NoteTags = { ...NO_TAGS };
  for (const part of m[1].split(",")) {
    const [k, v = ""] = part.split(":");
    if (k === "d" && /^\d{4}-\d{2}-\d{2}$/.test(v)) tags.date = v;
    if (k === "u" && (v === "low" || v === "med" || v === "high")) tags.urgency = v;
    if (k === "w" && (v === "today" || v === "later")) tags.when = v;
    if (k === "k" && v === "a") tags.kind = "action";
    if (k === "dl" && v) {
      try {
        tags.delay = decodeURIComponent(v);
      } catch {
        // malformed encoding — drop rather than crash
      }
    }
    if (k === "dn" && /^\d{10,16}$/.test(v)) tags.doneAt = v;
    if (k === "c" && /^[a-z]{2}$/i.test(v)) tags.country = v.toLowerCase();
  }
  return { text: text.slice(0, at === 0 ? 0 : i).trimEnd(), tags };
}

export function withTags(text: string, tags: NoteTags): string {
  const parts = [
    tags.date ? `d:${tags.date}` : "",
    tags.urgency ? `u:${tags.urgency}` : "",
    tags.when ? `w:${tags.when}` : "",
    tags.kind === "action" ? "k:a" : "",
    tags.delay ? `dl:${encodeURIComponent(tags.delay)}` : "",
    tags.doneAt ? `dn:${tags.doneAt}` : "",
    tags.country ? `c:${tags.country.toLowerCase()}` : "",
  ].filter(Boolean);
  const clean = text.trimEnd();
  return parts.length ? `${clean}\n${TAG}[${parts.join(",")}]` : clean;
}

// The note as the eye should see it — both markers stripped. For compact
// displays outside the sheet (e.g. the Scheduled panel).
export function visibleText(body: string): string {
  return splitTags(splitMarker(body).text).text.trim();
}

// Words too generic to identify an account on their own. Anything that shows
// up across the PEO/HCM industry (or ordinary business writing) can never be a
// routing key by itself — "employee", "professionals", "leasing" and friends
// were spraying one note across half the book.
const STOP = new Set([
  "the",
  "and",
  "for",
  "inc",
  "llc",
  "llp",
  "dba",
  "fka",
  "group",
  "corp",
  "corporation",
  "company",
  "companies",
  "co",
  "hr",
  "payroll",
  "services",
  "service",
  "solutions",
  "solution",
  "staffing",
  "management",
  "managed",
  "employer",
  "employers",
  "employee",
  "employees",
  "employment",
  "professional",
  "professionals",
  "leasing",
  "outsourcing",
  "outsource",
  "resources",
  "resource",
  "consulting",
  "consultants",
  "partners",
  "partner",
  "workforce",
  "benefits",
  "benefit",
  "admin",
  "administrative",
  "business",
  "national",
  "american",
  "america",
  "first",
  "global",
  "international",
  "processing",
  "pros",
  "peo",
  "hcm",
  "one",
  "pay",
  "paymaster",
  "pro",
  "team",
  "works",
  "work",
]);

// Detect which accounts / partners a note is about — deliberately conservative:
// a wrong route costs trust, a missed route costs one click ("route ▸").
// An account matches on (1) its full name, or (2) a single DISTINCTIVE token —
// ≥5 chars, not an industry stop-word, and unique to that one account across
// the whole book (a token shared by several account names can never route).
// Partner first names match as whole words; a matched account pulls its CSM in.
// If more than MAX_ACCOUNT_ROUTES accounts match, the note is ambiguous and
// nothing routes — it stays plain for manual routing.
export const MAX_ACCOUNT_ROUTES = 2;

export function detectTargets(
  text: string,
  accounts: { id: string; name: string; csm: string }[],
  partners: string[],
): NoteTarget {
  const hay = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  const has = (phrase: string) =>
    phrase.length >= 3 && hay.includes(` ${phrase.toLowerCase()} `);

  const norm = (name: string) =>
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  // How many account names each candidate token appears in — a token that
  // occurs in 2+ names is ambiguous by construction and never routes.
  const tokenOwners = new Map<string, number>();
  for (const a of accounts) {
    for (const tok of new Set(norm(a.name).split(" "))) {
      tokenOwners.set(tok, (tokenOwners.get(tok) ?? 0) + 1);
    }
  }
  const distinctive = (tok: string) =>
    tok.length >= 5 && !STOP.has(tok) && tokenOwners.get(tok) === 1;

  const accHits: { id: string; name: string; csm: string }[] = [];
  for (const a of accounts) {
    const full = norm(a.name);
    let hit = has(full);
    if (!hit) {
      for (const tok of full.split(" ")) {
        if (distinctive(tok) && has(tok)) {
          hit = true;
          break;
        }
      }
    }
    if (hit) accHits.push(a);
  }

  // Too many matches = the note isn't about specific accounts; don't spray.
  const routedAccounts = accHits.length > MAX_ACCOUNT_ROUTES ? [] : accHits;

  const partnerHits = new Set<string>();
  for (const p of partners) {
    const first = p.split(" ")[0]?.toLowerCase() ?? "";
    if (first.length >= 3 && has(first)) partnerHits.add(p);
  }
  for (const a of routedAccounts)
    if (a.csm && a.csm !== "Unassigned") partnerHits.add(a.csm);

  return {
    accounts: routedAccounts.map((a) => ({ id: a.id, name: a.name })),
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
