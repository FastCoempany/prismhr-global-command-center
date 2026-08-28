// One reader for every dropped file — the Drop (per row) and the Chute (the
// room's intake) both read through here. .eml/.msg/spreadsheets/.docx/plain
// text read in the browser; a PDF or an image goes through the caller's
// transcriber action (Claude reads it). HEIC converts to JPEG in the browser
// first where the browser can decode it. Returns paste text the room's
// readers understand, or the reason it couldn't.

import {
  emlToPaste,
  msgToPaste,
  parseTranscriptDoc,
  readerFor,
  sheetToPaste,
  transcriptDocToPaste,
  vttToPaste,
} from "@/lib/paste-files";

export type PdfReader = (
  fd: FormData,
) => Promise<{ ok: boolean; text?: string; reason?: string }>;

// HEIC/HEIF → JPEG where the browser can decode it (Safari and most Apple
// devices can; elsewhere the read fails honestly). Oversized images downscale
// so the read stays fast and cheap.
async function normalizeImage(f: File): Promise<File | null> {
  const ext = (f.name.split(".").pop() ?? "").toLowerCase();
  const needsConvert = ext === "heic" || ext === "heif";
  const tooBig = f.size > 4 * 1024 * 1024;
  if (!needsConvert && !tooBig) return f;
  try {
    const bmp = await createImageBitmap(f);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bmp.width * scale));
    canvas.height = Math.max(1, Math.round(bmp.height * scale));
    canvas.getContext("2d")?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", 0.85),
    );
    if (!blob) return needsConvert ? null : f;
    return new File([blob], f.name.replace(/\.(heic|heif)$/i, ".jpg"), {
      type: "image/jpeg",
    });
  } catch {
    return needsConvert ? null : f;
  }
}

export async function readFileToText(
  f: File,
  readPdf: PdfReader,
): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  const kind = readerFor(f.name);
  if (kind === "unsupported")
    return {
      ok: false,
      reason: `Can't read ${f.name}. Drop email, PDF, transcript, spreadsheet, document, image, or plain text.`,
    };
  try {
    let text = "";
    if (kind === "eml") text = emlToPaste(await f.text(), f.name);
    else if (kind === "vtt") text = vttToPaste(await f.text(), f.name);
    else if (kind === "text") {
      const raw = (await f.text()).trim();
      // Teams' transcript pastes into a plain text file just as often as it
      // saves as Word. Same recording, same read.
      const doc = parseTranscriptDoc(raw);
      text = doc ? transcriptDocToPaste(doc, f.name) : raw;
    } else if (kind === "sheet") {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      const sheets = wb.SheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json(wb.Sheets[name], {
          header: 1,
          raw: false,
        }) as unknown[][],
      }));
      text = sheetToPaste(sheets, f.name);
    } else if (kind === "docx") {
      const mammoth = await import("mammoth");
      const r = await mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() });
      const raw = (r.value ?? "").trim();
      // Teams exports the same recording as .vtt or as Word. A transcript
      // reads as a transcript either way — otherwise the call arrives as a
      // nameless document and the room learns nothing from it.
      const doc = parseTranscriptDoc(raw);
      // A transcript is never truncated — the close is at the end, and the
      // 8/27 call runs past 70,000 characters. The .vtt path has never
      // capped; the two captures of one recording behave alike.
      text = doc
        ? transcriptDocToPaste(doc, f.name)
        : `DOCUMENT — ${f.name}\n\n${raw}`.slice(0, 60000);
    } else if (kind === "image") {
      const img = await normalizeImage(f);
      if (!img)
        return {
          ok: false,
          reason: `${f.name} couldn't be decoded in this browser. Screenshot it as JPG or PNG instead.`,
        };
      const fd = new FormData();
      fd.append("file", img);
      const r = await readPdf(fd);
      if (!r.ok || !r.text)
        return {
          ok: false,
          reason: r.reason ?? "The image read failed. Paste the text instead.",
        };
      text = r.text;
    } else if (kind === "msg") {
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
