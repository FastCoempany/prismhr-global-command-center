// The country wing's door. A plain GET, never a server action, so naming a
// country mid-call can never knock over a navigation.
//
//   ?c=<country>  → the verdict, the lead lines, and the sixteen points
//
// The sheet is ~360KB and never travels with the page. The Playbook arrives
// carrying only the index — what the operator can type at — and the depth
// comes down one country at a time (click-depth law: arrival budgets are hard
// limits, and the intelligence moves a click down).

import { NextResponse } from "next/server";
import { getAppAccess } from "@/lib/auth";
import { countryCard } from "@/lib/playbook/countries";

export const dynamic = "force-dynamic";

const noStore = { headers: { "cache-control": "no-store" } };

export async function GET(req: Request) {
  // If the session cannot be resolved, refuse.
  const access = await getAppAccess().catch(() => null);
  if (access?.status !== "active")
    return NextResponse.json({ ok: false }, { status: 401, ...noStore });

  const name = (new URL(req.url).searchParams.get("c") ?? "").slice(0, 60);
  if (!name) return NextResponse.json({ ok: false }, { status: 400, ...noStore });

  const card = countryCard(name);
  if (!card) return NextResponse.json({ ok: false }, { status: 404, ...noStore });
  return NextResponse.json({ ok: true, card }, noStore);
}
