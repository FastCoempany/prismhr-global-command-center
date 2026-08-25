// "Send it"'s reading pass, served as a plain POST route — same lesson as
// the catch-up loop and the pulse: Next blocks navigation while a server
// action is in flight, and a real read takes real time now. readCapture
// carries its own auth guard — this door adds nothing.

import { NextResponse } from "next/server";
import { readCapture } from "../runners";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { captureId?: string };
  const r = await readCapture((body.captureId ?? "").slice(0, 60));
  return NextResponse.json(r, { headers: { "cache-control": "no-store" } });
}
