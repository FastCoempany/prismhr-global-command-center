// The Pipeline's saved edits (founder-decreed 2026-09-08: "the close date
// should survive a reload just as me editing lines make it into the downloaded
// doc file at any given time").
//
//   pipeline:<accountId> — one AccountNote row per account, holding every line
//     the operator changed or struck on that record. Newest wins, exactly like
//     actdraft: and seat: (src/lib/act/lane.ts).
//
// Why a store at all: the report is derived at render, so an edit had nowhere
// to live and every typed close date went back to the book's default on the
// next read. Persisting the OVERLAY rather than the record keeps that true —
// the app still derives what it can, and his correction sits on top of it,
// visible as his.
//
// A struck line is stored, not forgotten. "Nothing here should die by a
// mis-click" holds across reloads too, so the row keeps the strike and the
// drawer can still put it back.
//
// Money is redacted at the write site, like everywhere else. The Scratchpaper
// keeps figures because it routes nowhere by construction; these edits route
// into a Word file a teammate opens, which is exactly what the doctrine is for.

export const PIPELINE_EDIT_NS = "pipeline:";

/** A key maps to the operator's text, or to null when he struck the line. */
export type SavedEdits = Record<string, string | null>;

const HEAD = "✎ PIPELINE EDITS";
/** Struck lines are stored as this marker, so a strike survives a reload. */
const STRUCK = "␀STRUCK";
/** One line per edit; a body that grows past this is a mistake, not an edit. */
const MAX_EDITS = 200;
const MAX_LEN = 400;

/** `<field>:<index>\t<text>` per line, under a head that names the store. The
 *  key's account half is the row's own accountId, so it is not repeated. */
export function renderEditsBody(edits: SavedEdits): string {
  const lines = [HEAD];
  for (const [key, v] of Object.entries(edits ?? {}).slice(0, MAX_EDITS)) {
    const field = key.includes(":") ? key.slice(key.indexOf(":") + 1) : key;
    if (!field) continue;
    lines.push(`${field}\t${v === null ? STRUCK : v.slice(0, MAX_LEN)}`);
  }
  return lines.join("\n");
}

/** Read them back, keyed for the record they belong to. */
export function parseEditsBody(accountId: string, body: string): SavedEdits {
  const out: SavedEdits = {};
  const lines = (body ?? "").split("\n");
  if (lines[0]?.trim() !== HEAD) return out;
  for (const line of lines.slice(1)) {
    const tab = line.indexOf("\t");
    if (tab <= 0) continue;
    const field = line.slice(0, tab).trim();
    const value = line.slice(tab + 1);
    if (!field) continue;
    out[`${accountId}:${field}`] = value === STRUCK ? null : value;
  }
  return out;
}

/** The edits for one account, from the row the store holds. */
export function editsFrom(
  accountId: string,
  rows: readonly { body: string }[] | undefined,
): SavedEdits {
  const first = (rows ?? [])[0];
  return first ? parseEditsBody(accountId, first.body) : {};
}
