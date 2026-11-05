// The browser half of sending files (ship order 2026-10-22), shared by the
// Groundwork letter and the HomeRoom's Send files (release three of the F26
// face): fetch a file whole from the signed-in route a piece at a time, and
// hand the browser an Outlook draft to save. Browser-only: imported by client
// components alone.

import { attachmentById } from "@/lib/collateral/attachments";
import type { EmlFile } from "@/lib/groundwork/eml";

/** One file, fetched whole from the signed-in route a piece at a time (a
 *  function's response tops out under 5 MB). */
export async function fetchAttachment(id: string): Promise<EmlFile> {
  const file = attachmentById(id);
  if (!file) throw new Error("unknown file");
  const pieces: Uint8Array[] = [];
  for (let part = 0, parts = 1; part < parts; part++) {
    const res = await fetch(`/groundwork/attach/${encodeURIComponent(id)}?part=${part}`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`file ${id} part ${part}: ${res.status}`);
    parts = Number(res.headers.get("x-attach-parts") ?? "1") || 1;
    pieces.push(new Uint8Array(await res.arrayBuffer()));
  }
  const size = pieces.reduce((n, p) => n + p.length, 0);
  if (size !== file.bytes) throw new Error(`file ${id}: ${size} of ${file.bytes} bytes`);
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const p of pieces) {
    bytes.set(p, at);
    at += p.length;
  }
  return { name: file.name, mime: file.mime, bytes };
}

/** Hand the browser a draft to save; opened, Outlook shows it ready to send. */
export function downloadDraft(eml: string, who: string): void {
  const blob = new Blob([eml], { type: "message/rfc822" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  // Only what a file name cannot hold comes out; accents and apostrophes stay.
  const name = who.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").trim();
  a.download = `Note to ${name || "them"}.eml`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
