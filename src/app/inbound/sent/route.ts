// The sent-copy route (ship order 2026-10-19; CLAUDE.md, "The draft on the
// stage"): every email the operator sends comes back here, posted by a
// Power Automate flow on the Sent Items folder (docs/power-automate-sent-
// copy.md). A send to an account's people files on that account through the
// same pipeline a paste takes, and the record's send today stamps the move
// on Groundwork: Send needs no Worked it, and a send straight from Outlook
// stamps too. A send that names no book account by address or domain files
// nothing.
//
// The gate is a shared secret, because a flow carries no session:
// SENT_INBOUND_SECRET, sent as `Authorization: Bearer <secret>`, an
// `x-inbound-secret` header, or `?key=<secret>`. With the secret unset, or
// shorter than sixteen characters, the route refuses everything. It is not
// a page: it renders nothing. The answer carries counts and the rung,
// never a name, an address or a line of the email.

import { NextResponse, type NextRequest } from "next/server";
import { secretOk, type Fields } from "@/lib/ingest/inbound-email";
import { routeSentCopy, sentCopyOf, sentCopyText } from "@/lib/sent-copy";
import { joinedRoster } from "@/lib/ingest/route";
import { pasteCapture } from "@/lib/room/paste-core";
import { hasDatabaseEnv } from "@/lib/db";

export const dynamic = "force-dynamic";
// The pipeline's read runs inside the filing budget.
export const maxDuration = 300;

const MAX_BYTES = 2_000_000;

async function fieldsOf(req: NextRequest): Promise<Fields | null> {
  const type = req.headers.get("content-type") ?? "";
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return null;
  if (/application\/json/i.test(type) || /^\s*\{/.test(raw))
    return JSON.parse(raw) as Fields;
  if (/multipart\/form-data|application\/x-www-form-urlencoded/i.test(type)) {
    const form = await new Response(raw, {
      headers: { "content-type": type },
    }).formData();
    const f: Fields = {};
    for (const [k, v] of form.entries()) if (typeof v === "string") f[k] = v;
    return f;
  }
  return { Body: raw };
}

export async function POST(req: NextRequest) {
  if (!secretOk(req, "SENT_INBOUND_SECRET"))
    return NextResponse.json({ ok: false, reason: "Not authorized." }, { status: 401 });
  if (Number(req.headers.get("content-length") ?? "0") > MAX_BYTES)
    return NextResponse.json({ ok: false, reason: "Too large." }, { status: 413 });
  if (!hasDatabaseEnv())
    return NextResponse.json({ ok: false, reason: "No database." }, { status: 503 });

  let fields: Fields | null;
  try {
    fields = await fieldsOf(req);
  } catch {
    return NextResponse.json({ ok: false, reason: "Unreadable body." }, { status: 400 });
  }
  if (!fields)
    return NextResponse.json({ ok: false, reason: "Too large." }, { status: 413 });

  const copy = sentCopyOf(fields);
  // A post that is not a sent message answers 200 with nothing filed, so a
  // flow's test run reads the route as healthy.
  if (!copy)
    return NextResponse.json({ ok: true, filed: 0, reason: "No sent message in it." });
  const hit = routeSentCopy(copy, await joinedRoster());
  if (!hit)
    return NextResponse.json({
      ok: true,
      filed: 0,
      reason: "No book account by address or domain. Nothing filed.",
    });
  try {
    const r = await pasteCapture(
      hit.id,
      sentCopyText(copy),
      { door: "inbound" },
      async () => hasDatabaseEnv(),
    );
    return NextResponse.json({
      ok: r.ok,
      filed: r.filed,
      rung: hit.rung,
      ...(r.duplicate ? { duplicate: true } : {}),
      ...(r.mismatch ? { held: true } : {}),
      ...(!r.ok && r.reason ? { reason: r.reason } : {}),
    });
  } catch {
    return NextResponse.json({ ok: false, reason: "Filing failed." }, { status: 500 });
  }
}
