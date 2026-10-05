// The app applies its own additive migrations at startup (src/lib/db/
// migrate.ts; the Chute brains refactor plan, slice 3's Migration line, and
// CLAUDE.md's ship pattern as amended 2026-10-05). Pinned here: every listed
// migration has its file under prisma/migrations and the file carries the
// same statements in the same order; every statement is idempotent; a
// migration wholly present costs its presence checks and no DDL; one missing
// in any part runs every statement; a database the server cannot reach is
// reported, never thrown. The slice 4 shape: an entry carries several
// statements and several presence checks, a table check against
// information_schema.tables and a column check against
// information_schema.columns.

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import {
  ADDITIVE,
  applyAdditive,
  type AdditiveMigration,
  type RawClient,
} from "../src/lib/db/migrate";

/** The file's statements: comment lines stripped, split on ";", trimmed,
 *  empties dropped — each with its ";" put back as the entry spells it. */
function fileStatements(migration: string): string[] {
  const text = readFileSync(
    join(cwd(), "prisma", "migrations", migration, "migration.sql"),
    "utf8",
  );
  return text
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => `${s};`);
}

type Fake = {
  db: RawClient;
  calls: { query: { sql: string; args: unknown[] }[]; execute: string[] };
};

/** A database whose catalog answers each presence check from `present`, in
 *  the order the checks are made; `fail` makes every query throw. */
function fake(present: boolean | boolean[], fail?: Error): Fake {
  const calls: Fake["calls"] = { query: [], execute: [] };
  const answers = Array.isArray(present) ? [...present] : null;
  const db: RawClient = {
    async $queryRawUnsafe<T>(sql: string, ...args: unknown[]) {
      calls.query.push({ sql, args });
      if (fail) throw fail;
      const hit = answers ? (answers.shift() ?? false) : (present as boolean);
      return (hit ? [{ n: 1 }] : []) as T;
    },
    async $executeRawUnsafe(sql: string) {
      calls.execute.push(sql);
      return 0;
    },
  };
  return { db, calls };
}

const ONE: AdditiveMigration = {
  migration: "20261005120000_account_note_door",
  present: [{ table: "AccountNote", column: "door" }],
  statements: [
    `ALTER TABLE "AccountNote" ADD COLUMN IF NOT EXISTS "door" TEXT NOT NULL DEFAULT '';`,
  ],
};

const TWO: AdditiveMigration = {
  migration: "20261005150000_filing",
  present: [{ table: "Filing" }, { table: "Todo", column: "filingId" }],
  statements: [
    `CREATE TABLE IF NOT EXISTS "Filing" ("id" TEXT NOT NULL);`,
    `ALTER TABLE "Todo" ADD COLUMN IF NOT EXISTS "filingId" TEXT;`,
  ],
};

const unsemi = (s: string) => s.replace(/;\s*$/, "");

describe("the additive list and its files agree", () => {
  test("every listed migration has its file, carrying the same statements in order", () => {
    assert.ok(ADDITIVE.length >= 2);
    for (const m of ADDITIVE) {
      assert.deepEqual(
        fileStatements(m.migration),
        m.statements.map((s) => s.trim()),
        m.migration,
      );
    }
  });

  test("every statement is idempotent and names a table a presence check covers", () => {
    for (const m of ADDITIVE) {
      assert.ok(m.present.length > 0, `${m.migration}: no presence check`);
      assert.ok(m.statements.length > 0, `${m.migration}: no statements`);
      const tables = new Set(m.present.map((p) => p.table));
      for (const sql of m.statements) {
        assert.match(sql, /\bIF NOT EXISTS\b/, `${m.migration}: ${sql}`);
        assert.equal(sql.split(";").filter((s) => s.trim()).length, 1, "one statement");
        const named = /(?:TABLE(?: IF NOT EXISTS)?|ON) "(\w+)"/.exec(sql)?.[1];
        assert.ok(named && tables.has(named), `${m.migration}: ${sql}`);
      }
    }
  });

  test("the slice 4 entry checks the table and both columns", () => {
    const filing = ADDITIVE.find((m) => m.migration === "20261005150000_filing");
    assert.ok(filing);
    assert.deepEqual(filing.present, [
      { table: "Filing" },
      { table: "AccountNote", column: "filingId" },
      { table: "Todo", column: "filingId" },
    ]);
    assert.equal(filing.statements.length, 7);
  });
});

describe("applyAdditive", () => {
  test("a column that exists costs one SELECT and no ALTER", async () => {
    const { db, calls } = fake(true);
    const report = await applyAdditive(db, [ONE]);
    assert.deepEqual(report, { applied: [], present: [ONE.migration], failed: [] });
    assert.equal(calls.query.length, 1);
    assert.match(calls.query[0].sql, /information_schema\.columns/);
    assert.deepEqual(calls.query[0].args, ["AccountNote", "door"]);
    assert.deepEqual(calls.execute, []);
  });

  test("a missing column is added with the file's statement", async () => {
    const { db, calls } = fake(false);
    const report = await applyAdditive(db, [ONE]);
    assert.deepEqual(report, { applied: [ONE.migration], present: [], failed: [] });
    assert.deepEqual(calls.execute, ONE.statements.map(unsemi));
  });

  test("a table check reads information_schema.tables; wholly present means every check passed", async () => {
    const { db, calls } = fake([true, true]);
    const report = await applyAdditive(db, [TWO]);
    assert.deepEqual(report, { applied: [], present: [TWO.migration], failed: [] });
    assert.equal(calls.query.length, 2);
    assert.match(calls.query[0].sql, /information_schema\.tables/);
    assert.deepEqual(calls.query[0].args, ["Filing"]);
    assert.match(calls.query[1].sql, /information_schema\.columns/);
    assert.deepEqual(calls.query[1].args, ["Todo", "filingId"]);
    assert.deepEqual(calls.execute, []);
  });

  test("a migration with two checks runs every statement when either is missing", async () => {
    // The table landed, the column did not: a start that died halfway.
    const half = fake([true, false]);
    const r1 = await applyAdditive(half.db, [TWO]);
    assert.deepEqual(r1, { applied: [TWO.migration], present: [], failed: [] });
    assert.deepEqual(half.calls.execute, TWO.statements.map(unsemi));
    // Nothing landed: the first check fails and the rest are not asked.
    const none = fake([false, true]);
    const r2 = await applyAdditive(none.db, [TWO]);
    assert.deepEqual(r2, { applied: [TWO.migration], present: [], failed: [] });
    assert.equal(none.calls.query.length, 1);
    assert.deepEqual(none.calls.execute, TWO.statements.map(unsemi));
  });

  test("a database the server cannot reach is reported, never thrown", async () => {
    const { db, calls } = fake(false, new Error("P1001: Can't reach database server"));
    const report = await applyAdditive(db, [ONE, TWO]);
    assert.deepEqual(report.applied, []);
    assert.deepEqual(report.present, []);
    assert.equal(report.failed.length, 2);
    assert.equal(report.failed[0]?.migration, ONE.migration);
    assert.equal(report.failed[1]?.migration, TWO.migration);
    assert.match(report.failed[0]?.error ?? "", /P1001/);
    assert.deepEqual(calls.execute, []);
  });
});
