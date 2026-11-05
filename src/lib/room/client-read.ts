// The partner's client, as the model's read names it (the F26 face, release
// three; ship order 2026-11-04). The read names a client per entry; each
// filing that names one writes a clientread:<accountId> note, one line per
// entry, linked to its filing so the undo takes it back. The row reads the
// client the record names most often, newest on a tie, with a meter for how
// sure the record is: named in two or more entries with no hedge is sure,
// once with no hedge is likely, and a hedged line is unsure. A name set by
// hand outranks every read. Pure: no store is read here.

export const CLIENT_READ_NS = "clientread:";
const HEAD = "✎ CLIENT READ";

export type ClientSighting = { name: string; at: string; line: string; noteId: string };
export type ClientRead = {
  name: string;
  sure: "sure" | "likely" | "unsure";
  /** How many entries named it. */
  seen: number;
  day: string;
  line: string;
};

const clean = (s: string, cap: number) =>
  (s ?? "")
    .replace(/[\t\n\r]+/g, " ")
    .trim()
    .slice(0, cap);

/** One spelling of a company name for matching: lowercase, no punctuation,
 *  no legal suffix. */
export const companyKey = (name: string): string =>
  (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(
      /\b(?:inc|llc|ltd|limited|corp|corporation|co|company|gmbh|sa|plc|the)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

// Our own side is never anyone's client.
const OURS = /\b(?:prismhr|prism hr|vensure)\b/i;

/** The note body for one filing's sightings, or null when none is a client:
 *  the partner's own name and our own side are dropped. */
export function renderClientRead(
  entries: readonly {
    client?: string;
    dayIso?: string;
    body?: string;
    subject?: string;
  }[],
  partner: string,
  /** Each entry's own record note, so hiding that entry hides its sighting. */
  noteIdOf: (e: (typeof entries)[number]) => string | undefined = () => undefined,
): string | null {
  const own = companyKey(partner);
  const lines: string[] = [];
  for (const e of entries) {
    const name = clean(e.client ?? "", 80);
    const key = companyKey(name);
    if (!key || key === own || OURS.test(name)) continue;
    if (own && (key.includes(own) || own.includes(key))) continue;
    lines.push(
      [
        name,
        /^\d{4}-\d{2}-\d{2}$/.test(e.dayIso ?? "") ? e.dayIso : "",
        clean(e.body || e.subject || "", 200),
        clean(noteIdOf(e) ?? "", 64),
      ].join("\t"),
    );
  }
  return lines.length ? [HEAD, ...lines.slice(0, 12)].join("\n") : null;
}

export function parseClientRead(note: {
  body: string;
  createdAt: string;
}): ClientSighting[] {
  const lines = (note.body ?? "").split("\n");
  if (lines[0]?.trim() !== HEAD) return [];
  const out: ClientSighting[] = [];
  for (const l of lines.slice(1)) {
    const [name = "", day = "", line = "", noteId = ""] = l.split("\t");
    if (!companyKey(name)) continue;
    out.push({
      name: name.trim(),
      at: /^\d{4}-\d{2}-\d{2}$/.test(day) ? `${day}T17:00:00.000Z` : note.createdAt,
      line,
      noteId,
    });
  }
  return out;
}

// Words that say the speaker isn't sure the client is real or settled.
const HEDGE =
  /\b(?:maybe|might|possibly|potential(?:ly)?|prospective|not sure|i think|could be|perhaps|considering|exploring|if they|a prospect)\b/i;

const md = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-US", {
    timeZone: "America/Chicago",
    month: "numeric",
    day: "numeric",
  });

/** The client the record names most often, newest on a tie, with its meter. */
export function readClient(
  notes: readonly { body: string; createdAt: string }[],
  /** Record notes the operator hid: a sighting on one of them does not count. */
  hidden: ReadonlySet<string> = new Set(),
): ClientRead | null {
  const groups = new Map<string, ClientSighting[]>();
  for (const n of notes)
    for (const s of parseClientRead(n)) {
      if (s.noteId && hidden.has(s.noteId)) continue;
      const k = companyKey(s.name);
      groups.set(k, [...(groups.get(k) ?? []), s]);
    }
  let best: ClientSighting[] | null = null;
  for (const g of groups.values()) {
    g.sort((a, b) => b.at.localeCompare(a.at));
    if (
      !best ||
      g.length > best.length ||
      (g.length === best.length && g[0]!.at > best[0]!.at)
    )
      best = g;
  }
  if (!best) return null;
  const newest = best[0]!;
  const hedged = HEDGE.test(newest.line);
  return {
    name: newest.name,
    sure: hedged ? "unsure" : best.length >= 2 ? "sure" : "likely",
    seen: best.length,
    day: md(newest.at),
    line: newest.line,
  };
}
