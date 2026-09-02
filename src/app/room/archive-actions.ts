"use server";

// The vault's one server involvement: hand an authed operator the grant the
// browser needs to speak to GitHub itself. The file NEVER passes through
// here — the server's request cap could not hold a recording, and a relay
// would be a second transfer of the same bytes for nothing. The token lives
// only in the environment and in this reply to a signed-in, can-write
// session; it is never rendered, logged, or bundled.

import { getAppAccess } from "@/lib/auth";
import type { ArchiveGrant } from "@/lib/github/archive";

export async function githubArchiveGrant(): Promise<
  { ok: true; grant: ArchiveGrant } | { ok: false; reason: string }
> {
  const access = await getAppAccess();
  if (access.status !== "active" || !access.canWrite)
    return { ok: false, reason: "Read-only session." };
  const repo = (process.env.GITHUB_ARCHIVE_REPO ?? "").trim();
  const token = (process.env.GITHUB_ARCHIVE_TOKEN ?? "").trim();
  if (!repo || !token)
    return {
      ok: false,
      reason:
        "The vault isn't configured — GITHUB_ARCHIVE_REPO and GITHUB_ARCHIVE_TOKEN.",
    };
  return { ok: true, grant: { repo, token } };
}
