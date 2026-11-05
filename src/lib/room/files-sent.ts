// The files Send carries, as a record (the F26 face, release three; ship
// order 2026-11-04). A file that leaves in a downloaded Outlook draft has no
// trace in the sent copy the relay files, so the app records it at the
// moment the draft is in hand: one filessent:<accountId> note per send,
// naming the files by their catalog id, the day, and who it went to. The
// HomeRoom's "N Sent" opens the list, and an agreement's review copy counts
// as the agreement going out on the partner ladder. Pure: no store is read
// here.

import { attachmentById } from "@/lib/collateral/attachments";

export const FILES_NS = "filessent:";
const HEAD = "✎ FILES SENT";

export type FilesSent = { id: string; at: string; to: string; files: string[] };

const clean = (s: string, cap: number) =>
  (s ?? "")
    .replace(/[\t\n\r]+/g, " ")
    .trim()
    .slice(0, cap);

/** The note body for one send; only files the catalog knows are kept. */
export function renderFilesSent(files: readonly string[], to: string): string | null {
  const known = [...new Set(files)].filter((f) => !!attachmentById(f)).slice(0, 20);
  if (!known.length) return null;
  return [HEAD, `to\t${clean(to, 120)}`, ...known.map((f) => `file\t${f}`)].join("\n");
}

export function parseFilesSent(
  note: { id: string; body: string; createdAt: string } | undefined,
): FilesSent | null {
  const lines = (note?.body ?? "").split("\n");
  if (!note || lines[0]?.trim() !== HEAD) return null;
  let to = "";
  const files: string[] = [];
  for (const line of lines.slice(1)) {
    const [k, v = ""] = line.split("\t");
    if (k === "to") to = v;
    else if (k === "file" && attachmentById(v)) files.push(v);
  }
  return files.length ? { id: note.id, at: note.createdAt, to, files } : null;
}

/** Every send on file for an account, newest first. */
export const filesSentFrom = (
  rows: readonly { id: string; body: string; createdAt: string }[] | undefined,
): FilesSent[] =>
  (rows ?? [])
    .map((r) => parseFilesSent(r))
    .filter((x): x is FilesSent => !!x)
    .sort((a, b) => b.at.localeCompare(a.at));

export const isAgreementFile = (id: string): boolean =>
  attachmentById(id)?.group === "agreement";

/** The agreements' review copies that went out, each with its own line. */
export function agreementSends(
  sends: readonly FilesSent[],
): { at: string; line: string }[] {
  const out: { at: string; line: string }[] = [];
  for (const s of sends)
    for (const f of s.files)
      if (isAgreementFile(f))
        out.push({
          at: s.at,
          line: `You sent ${s.to || "them"} the ${attachmentById(f)!
            .label.replace(/,.*$/, "")
            .toLowerCase()} for review.`,
        });
  return out;
}
