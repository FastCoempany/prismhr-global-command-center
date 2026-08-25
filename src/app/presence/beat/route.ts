// The unload beacon's landing. A reload kills in-flight fetches, so the
// engine's last unbanked seconds rode pagehide into the void and the clock
// snapped back a minute on every ctrl+R (caught 2026-08-20). sendBeacon is
// the one delivery the browser guarantees during unload — it posts here,
// same auth as every presence write.

import { NextResponse } from "next/server";
import { presenceLog, presenceToday } from "../actions";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const b = (await req.json()) as { a?: number; p?: number };
    await presenceLog(Number(b?.a) || 0, Number(b?.p) || 0);
  } catch {
    // a malformed beacon drops; the next minute flush carries the time
  }
  return new NextResponse(null, { status: 204 });
}

// The engine's seed read, as a plain GET for the same reason: a server-action
// call re-applies the current route, and every page mounts the engine.
export async function GET() {
  return NextResponse.json(await presenceToday(), {
    headers: { "cache-control": "no-store" },
  });
}
