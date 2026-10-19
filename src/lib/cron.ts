// The cron gate: Vercel's cron sends `Authorization: Bearer <CRON_SECRET>`.
// An unset or short secret opens nothing. Pure, so the suite holds it.

import { timingSafeEqual } from "node:crypto";

export function cronOk(header: string | null, want: string | undefined): boolean {
  const secret = want ?? "";
  if (secret.length < 16) return false;
  const got = /^Bearer\s+(.+)$/i.exec(header ?? "")?.[1] ?? "";
  const a = Buffer.from(got);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
