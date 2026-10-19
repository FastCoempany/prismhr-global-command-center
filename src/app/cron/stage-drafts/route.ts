// The drafts job (ship order 2026-10-19): Vercel's cron calls this before
// the send band on weekdays (vercel.json), and every email move the stage
// and the waiting wing will show gets its note written. The gate is Vercel's
// own: CRON_SECRET, sent as `Authorization: Bearer <secret>`. With the
// secret unset, or shorter than sixteen characters, the route refuses
// everything. It is not a page: it renders nothing, and the answer carries
// counts only.

import { NextResponse, type NextRequest } from "next/server";
import { hasDatabaseEnv } from "@/lib/db";
import { loadGroundworkDay } from "@/lib/groundwork/load";
import { runDrafts } from "@/lib/groundwork/draft-run";
import { cronOk } from "@/lib/cron";

export const dynamic = "force-dynamic";
// Six drafts, three at a time, each a model call of up to two minutes.
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!cronOk(req.headers.get("authorization"), process.env.CRON_SECRET))
    return NextResponse.json({ ok: false, reason: "Not authorized." }, { status: 401 });
  if (!hasDatabaseEnv())
    return NextResponse.json({ ok: false, reason: "No database." }, { status: 503 });
  const now = new Date();
  try {
    const day = await loadGroundworkDay(now);
    const r = await runDrafts(day, now);
    return NextResponse.json({ ok: true, ...r });
  } catch {
    return NextResponse.json({ ok: false, reason: "The run failed." }, { status: 500 });
  }
}
