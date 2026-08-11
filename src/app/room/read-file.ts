// One reader for every dropped file — the Drop (per row) and the Chute (the
// room's intake) both read through here. .eml/.msg/plain text read in the
// browser; a PDF goes through the caller's transcriber action. Returns paste
// text the room's readers understand, or the reason it couldn't.

import { emlToPaste, msgToPaste, readerFor } from "@/lib/paste-files";

export type PdfReader = (
  fd: FormData,
) => Promise<{ ok: boolean; text?: string; reason?: string }>;

export async function readFileToText(
  f: File,
  readPdf: PdfReader,
): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  const kind = readerFor(f.name);
  if (kind === "unsupported")
    return {
      ok: false,
      reason: `Can't read ${f.name}. Drop .eml, .msg, .pdf, or plain text.`,
    };
  try {
    let text = "";
    if (kind === "eml") text = emlToPaste(await f.text(), f.name);
    else if (kind === "text") text = (await f.text()).trim();
    else if (kind === "msg") {
      const { default: MsgReader } = await import("@kenjiuno/msgreader");
      const data = new MsgReader(await f.arrayBuffer()).getFileData();
      text = msgToPaste(
        {
          subject: data.subject,
          senderName: data.senderName,
          senderEmail: data.senderEmail,
          recipients: (data.recipients ?? []).map((r) => ({
            name: r.name,
            email: r.email ?? r.smtpAddress,
          })),
          body: data.body,
          messageDeliveryTime: data.messageDeliveryTime,
        },
        f.name,
      );
    } else {
      const fd = new FormData();
      fd.append("file", f);
      const r = await readPdf(fd);
      if (!r.ok || !r.text)
        return {
          ok: false,
          reason: r.reason ?? "The document read failed. Paste the text instead.",
        };
      text = r.text;
    }
    if (text.length < 20)
      return { ok: false, reason: `${f.name} came back empty. Paste the text instead.` };
    return { ok: true, text };
  } catch {
    return { ok: false, reason: `Reading ${f.name} failed. Paste the text instead.` };
  }
}
