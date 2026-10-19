// The inbound route (2026-10-14): Sales Navigator's alert emails, as they
// arrive. A mail rule in Outlook forwards each alert email to an inbound
// address; the inbound service posts it here; it files as the alerts grab
// it carries, each alert on the account it names, through the same split a
// paste takes (src/lib/ingest/salesnav-email.ts, src/lib/ingest/grab.ts).
//
// The gate is a shared secret, because a mail server carries no session:
// SALESNAV_INBOUND_SECRET or the Power Automate flows' one secret,
// SENT_INBOUND_SECRET, sent as `Authorization: Bearer <secret>`, an
// `x-inbound-secret` header, or `?key=<secret>` for services that can only
// call a URL. With the secret unset, or shorter than sixteen characters, the
// route refuses everything. It is not a page: it renders nothing, and the
// cookie gate every page takes cannot apply to a mail server.
//
// It takes the shapes the common inbound services post: JSON (Postmark's
// TextBody/HtmlBody, or plain text/html/from/subject/date keys, which a
// Power Automate flow can send), form posts (SendGrid's text/html, Mailgun's
// body-plain), or the raw message as text. Anything that is not a Sales
// Navigator alert email files nothing and says so. The answer carries
// counts only, never a name or a line of the email. A post that is not an
// alert answers 200 with nothing filed, so an inbound service's own check
// (Postmark's Check button sends a sample email) reads the route as healthy.
//
// The backfill (2026-10-15): a mail rule only acts on mail as it arrives, so
// older alerts come in by Outlook's "Forward as attachment". Each attached
// message (.eml or .msg, at most MAX_ATTACHED) is read like a dropped file
// and files at its own sent date. The body cap sits just under Vercel's
// request limit, so a batch of about fifteen digests fits in one post.

import { NextResponse, type NextRequest } from "next/server";
import {
  attachedText,
  emailText,
  messageAttachments,
  secretOk,
  type Fields,
} from "@/lib/ingest/inbound-email";
import { grabsFromSalesNavEmail } from "@/lib/ingest/salesnav-email";
import { fileGrabTexts } from "@/lib/ingest/grab-server";
import { hasDatabaseEnv } from "@/lib/db";
import { relayedCopy } from "@/lib/sent-copy";
import { fileSentCopy } from "@/lib/sent-copy-file";

export const dynamic = "force-dynamic";
// A backfill batch files dozens of accounts one after another.
export const maxDuration = 300;

const MAX_BYTES = 4_400_000;

/** The body, read up to MAX_BYTES and refused past it, whatever the
 *  Content-Length says or omits. */
async function readCapped(req: NextRequest): Promise<Uint8Array | null> {
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      return null;
    }
    parts.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.byteLength;
  }
  return out;
}

/** The post's own body and its attached messages, each as email text, and
 *  the post's fields when it carried any. */
async function readEmails(
  type: string,
  bytes: Uint8Array,
): Promise<{ texts: string[]; fields: Fields | null }> {
  const text = new TextDecoder().decode(bytes);
  let f: Fields | null = null;
  if (/application\/json/i.test(type)) f = JSON.parse(text) as Fields;
  else if (/multipart\/form-data|application\/x-www-form-urlencoded/i.test(type)) {
    const form = await new Response(new Blob([bytes as BlobPart]), {
      headers: { "content-type": type },
    }).formData();
    f = {};
    for (const [k, v] of form.entries()) if (typeof v === "string") f[k] = v;
  }
  if (!f) return { texts: [text], fields: null };
  const attached = await Promise.all(messageAttachments(f).map(attachedText));
  return { texts: [emailText(f), ...attached.filter(Boolean)], fields: f };
}

export async function POST(req: NextRequest) {
  if (!secretOk(req, ["SALESNAV_INBOUND_SECRET", "SENT_INBOUND_SECRET"]))
    return NextResponse.json({ ok: false, reason: "Not authorized." }, { status: 401 });
  const size = Number(req.headers.get("content-length") ?? "0");
  if (size > MAX_BYTES)
    return NextResponse.json({ ok: false, reason: "Too large." }, { status: 413 });
  if (!hasDatabaseEnv())
    return NextResponse.json({ ok: false, reason: "No database." }, { status: 503 });

  let texts: string[] = [];
  let fields: Fields | null = null;
  try {
    const bytes = await readCapped(req);
    if (!bytes)
      return NextResponse.json({ ok: false, reason: "Too large." }, { status: 413 });
    ({ texts, fields } = await readEmails(req.headers.get("content-type") ?? "", bytes));
  } catch {
    return NextResponse.json({ ok: false, reason: "Unreadable body." }, { status: 400 });
  }
  // The relay (2026-10-19): a sent copy or an inbox copy a flow mailed to
  // this inbound address, its subject tagged, files as the message it
  // carries (src/lib/sent-copy.ts), never as alerts.
  const relayed = fields ? relayedCopy(fields) : null;
  if (relayed) {
    try {
      return NextResponse.json({
        relay: relayed.kind,
        ...(await fileSentCopy(relayed.copy, relayed.kind)),
      });
    } catch {
      return NextResponse.json({ ok: false, reason: "Filing failed." }, { status: 500 });
    }
  }
  // The inbound route is the operator's own forward, behind the secret: a
  // LinkedIn From line inside the forwarded block counts.
  const now = new Date();
  let emails = 0;
  const grabs = texts.flatMap((t) => {
    const g = grabsFromSalesNavEmail(t, now, { forwarded: true });
    if (g.length) emails++;
    return g;
  });
  if (!grabs.length)
    return NextResponse.json({
      ok: true,
      filed: 0,
      reason: "Not a Sales Navigator alert email. Nothing filed.",
    });
  try {
    const r = await fileGrabTexts(grabs, "inbound", []);
    const g = "grab" in r ? r.grab : undefined;
    return NextResponse.json({
      ok: r.ok,
      emails,
      filed: r.filed,
      duplicates: g?.duplicates.length ?? 0,
      unmatched: g?.unmatched ?? 0,
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "Filing failed." }, { status: 500 });
  }
}
