// The app applies its own additive migrations when the server starts.
//
// The plan (slice 3; §7, item 15) had the build script run `prisma migrate
// deploy`. Probed on two preview builds on 2026-10-05, Vercel's build sandbox
// cannot reach the database on either configured URL (P1001 on both ports), so
// a migration there would fail every deploy. The app's own connection is the
// one that provably reaches the database, so each slice's additive migration
// is listed here beside its file under prisma/migrations and applied by
// src/instrumentation.ts on startup. The ruling stands as given: the deploy
// runs the update and the merge carries it; nothing is run by hand.
//
// Every entry is a column add, idempotent by IF NOT EXISTS, and byte-equal to
// its file's statement (tests/db-migrate.test.ts pins both). The catalog is
// read first, so a column that already exists costs one SELECT and takes no
// lock on the table.

export type ColumnMigration = {
  /** The directory under prisma/migrations carrying the same statement. */
  migration: string;
  table: string;
  column: string;
  /** The statement: ALTER TABLE … ADD COLUMN IF NOT EXISTS …, as the file has it. */
  sql: string;
};

export const ADDITIVE: readonly ColumnMigration[] = [
  {
    migration: "20261005120000_account_note_door",
    table: "AccountNote",
    column: "door",
    sql: `ALTER TABLE "AccountNote" ADD COLUMN IF NOT EXISTS "door" TEXT NOT NULL DEFAULT '';`,
  },
];

/** The two raw methods the migrator needs; PrismaClient has both. */
export type RawClient = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};

export type MigrateReport = {
  applied: string[];
  present: string[];
  failed: { migration: string; error: string }[];
};

const COLUMN_EXISTS = `SELECT 1 AS n FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2`;

/** Apply every listed migration whose column is missing. Never throws: a
 *  database the server cannot reach is reported, and the server still starts. */
export async function applyAdditive(
  db: RawClient,
  list: readonly ColumnMigration[] = ADDITIVE,
): Promise<MigrateReport> {
  const report: MigrateReport = { applied: [], present: [], failed: [] };
  for (const m of list) {
    try {
      const rows = await db.$queryRawUnsafe<unknown[]>(COLUMN_EXISTS, m.table, m.column);
      if (rows.length > 0) {
        report.present.push(m.migration);
        continue;
      }
      await db.$executeRawUnsafe(m.sql.replace(/;\s*$/, ""));
      report.applied.push(m.migration);
    } catch (e) {
      report.failed.push({
        migration: m.migration,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return report;
}
