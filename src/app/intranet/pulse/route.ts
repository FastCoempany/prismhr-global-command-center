// The gadget's pulse, served as a plain GET. The poll used to be a server
// action, and every action response re-applies the current route — a 2-second
// cadence quietly knocked over any navigation the operator had just started
// (the stuck Playbook tab, caught 2026-08-19). A route handler never touches
// the router; the gadget reads it with fetch and the tabs stay clickable.

import { NextResponse } from "next/server";
import { intranetPulse } from "../actions";

export const dynamic = "force-dynamic";

export async function GET() {
  const pulse = await intranetPulse();
  return NextResponse.json(pulse, {
    headers: { "cache-control": "no-store" },
  });
}
