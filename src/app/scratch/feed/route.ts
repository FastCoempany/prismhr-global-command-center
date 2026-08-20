// The pad's ask feed as a plain GET. The reload-net poll called the
// padAskFeed server action every 15 seconds, and every action response
// re-applies the current route — cancelling in-flight navigations
// (the stuck tabs, caught 2026-08-20). Same auth, same shape, no router.

import { NextResponse } from "next/server";
import { padAskFeed } from "../actions";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await padAskFeed(), {
    headers: { "cache-control": "no-store" },
  });
}
