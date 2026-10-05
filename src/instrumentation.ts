// Next calls register() once when a server instance starts. The app's
// additive migrations run here, on the app's own connection; src/lib/db/
// migrate.ts says why the build does not run them. Node runtime only, never
// the edge and never the build's page collection, and it fails open: a
// database the server cannot reach is a request's problem to report, not a
// reason to refuse to start.

export async function register() {
  if (process.env["NEXT_RUNTIME"] !== "nodejs") return;
  if (process.env["NEXT_PHASE"] === "phase-production-build") return;
  const { getPrisma, hasDatabaseEnv } = await import("@/lib/db");
  if (!hasDatabaseEnv()) return;
  const { applyAdditive } = await import("@/lib/db/migrate");
  try {
    const report = await applyAdditive(getPrisma());
    for (const name of report.applied) console.log(`[migrate] applied ${name}`);
    for (const f of report.failed) console.warn(`[migrate] ${f.migration}: ${f.error}`);
  } catch (e) {
    console.warn(`[migrate] ${e instanceof Error ? e.message : String(e)}`);
  }
}
