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
// Every entry carries its file's statements in order, each idempotent by IF
// NOT EXISTS, byte-equal to the file (tests/db-migrate.test.ts pins both),
// and the presence checks that say the whole migration already landed. The
// catalog is read first, so a migration that is present costs one SELECT per
// check and takes no lock; one that is missing in any part runs every
// statement, and because each is idempotent a start that died halfway
// finishes on the next one (slice 4).

export type Presence = {
  table: string;
  /** Omitted: the check is that the table exists at all. */
  column?: string;
};

export type AdditiveMigration = {
  /** The directory under prisma/migrations carrying the same statements. */
  migration: string;
  /** Every one of these must be present for the migration to be skipped. */
  present: readonly Presence[];
  /** The statements, as the file has them, in the file's order. */
  statements: readonly string[];
};

export const ADDITIVE: readonly AdditiveMigration[] = [
  {
    migration: "20261005120000_account_note_door",
    present: [{ table: "AccountNote", column: "door" }],
    statements: [
      `ALTER TABLE "AccountNote" ADD COLUMN IF NOT EXISTS "door" TEXT NOT NULL DEFAULT '';`,
    ],
  },
  {
    migration: "20261005150000_filing",
    present: [
      { table: "Filing" },
      { table: "AccountNote", column: "filingId" },
      { table: "Todo", column: "filingId" },
    ],
    statements: [
      `CREATE TABLE IF NOT EXISTS "Filing" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "door" TEXT NOT NULL,
    "dialect" TEXT NOT NULL,
    "how" TEXT NOT NULL,
    "read" JSONB,
    "windows" JSONB NOT NULL,
    "dupeCheck" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "filedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Filing_pkey" PRIMARY KEY ("id")
);`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "Filing_accountId_fingerprint_key" ON "Filing"("accountId", "fingerprint");`,
      `CREATE INDEX IF NOT EXISTS "Filing_accountId_idx" ON "Filing"("accountId");`,
      `ALTER TABLE "AccountNote" ADD COLUMN IF NOT EXISTS "filingId" TEXT;`,
      `CREATE INDEX IF NOT EXISTS "AccountNote_filingId_idx" ON "AccountNote"("filingId");`,
      `ALTER TABLE "Todo" ADD COLUMN IF NOT EXISTS "filingId" TEXT;`,
      `CREATE INDEX IF NOT EXISTS "Todo_filingId_idx" ON "Todo"("filingId");`,
    ],
  },
  {
    // The vault's staging for a file that arrives in pieces (slice 7; D8 as
    // amended 2026-10-05). One table, no column on any existing one.
    migration: "20261005180000_vault_chunk",
    present: [{ table: "VaultChunk" }],
    statements: [
      `CREATE TABLE IF NOT EXISTS "VaultChunk" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VaultChunk_pkey" PRIMARY KEY ("id")
);`,
      `CREATE INDEX IF NOT EXISTS "VaultChunk_accountId_filename_idx" ON "VaultChunk"("accountId", "filename");`,
    ],
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

const TABLE_EXISTS = `SELECT 1 AS n FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1`;
const COLUMN_EXISTS = `SELECT 1 AS n FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = $1 AND column_name = $2`;

async function isPresent(db: RawClient, p: Presence): Promise<boolean> {
  const rows = p.column
    ? await db.$queryRawUnsafe<unknown[]>(COLUMN_EXISTS, p.table, p.column)
    : await db.$queryRawUnsafe<unknown[]>(TABLE_EXISTS, p.table);
  return rows.length > 0;
}

/** Apply every listed migration that is not wholly present. Never throws: a
 *  database the server cannot reach is reported, and the server still starts. */
export async function applyAdditive(
  db: RawClient,
  list: readonly AdditiveMigration[] = ADDITIVE,
): Promise<MigrateReport> {
  const report: MigrateReport = { applied: [], present: [], failed: [] };
  for (const m of list) {
    try {
      let whole = true;
      for (const p of m.present) {
        if (!(await isPresent(db, p))) {
          whole = false;
          break;
        }
      }
      if (whole) {
        report.present.push(m.migration);
        continue;
      }
      for (const sql of m.statements)
        await db.$executeRawUnsafe(sql.replace(/;\s*$/, ""));
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
