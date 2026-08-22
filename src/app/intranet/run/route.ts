// The catch-up pass, served as a plain POST route. It used to drive through
// a server action, and Next blocks every navigation while an action is in
// flight — with the key alive, sixty back-to-back reading passes locked the
// operator inside the intranet room (caught 2026-08-22; the pulse learned
// this same lesson on 2026-08-19). A route handler never touches the
// router; the room drives it with fetch and the tabs stay clickable.
// runBrain carries its own auth guard and run lock — this door adds nothing.

import { NextResponse } from "next/server";
import { runBrain } from "../runners";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { sweep?: boolean };
  const r = await runBrain(body.sweep === false ? { sweep: false } : undefined);
  return NextResponse.json(r, { headers: { "cache-control": "no-store" } });
}
